import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const exports = {}
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/planner.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Map,Set,Error})
const { emptyPlanner, weekEvents, applyDraft, conflicts, findSlots, monday, addDays } = exports
const lesson = (overrides={})=>({id:'a',studentId:'s',title:'Ana',venueId:'gym',date:'2026-11-02',start:600,duration:60,repeat:'weekly',notes:'',...overrides})
const data = (...lessons)=>({...emptyPlanner(),lessons})
test('semana local empieza lunes, cruza meses y años sin desfase',()=>{
 assert.equal(monday('2026-11-01'),'2026-10-26')
 assert.equal(addDays('2026-12-31',1),'2027-01-01')
})
test('rutina semanal respeta comienzo, fin y clases de única vez',()=>{
 const p=data(lesson({until:'2026-11-09'}),lesson({id:'b',date:'2026-11-04',repeat:'once'}))
 assert.equal(weekEvents(p,'2026-10-26').length,0)
 assert.equal(weekEvents(p,'2026-11-02').length,2)
 assert.equal(weekEvents(p,'2026-11-09').length,1)
 assert.equal(weekEvents(p,'2026-11-16').length,0)
})
test('clase mensual conserva día y omite meses sin ese día',()=>{
 const p=data(lesson({date:'2026-01-31',repeat:'monthly'}))
 assert.equal(weekEvents(p,'2026-02-23').length,0)
 assert.equal(weekEvents(p,'2026-03-30')[0].date,'2026-03-31')
})
test('mover, agregar y quitar en borrador no modifica agenda hasta aplicar y no altera próxima semana',()=>{
 const p=data(lesson(),lesson({id:'b',start:720}))
 const original=weekEvents(p,'2026-11-02')
 const moved={...original[0],date:'2026-11-03',start:660}
 const added={...lesson({id:'new',date:'2026-11-04',repeat:'once'}),key:'new:2026-11-04'}
 p.drafts['2026-11-02']={original,events:[moved,added]}
 assert.equal(weekEvents(p,'2026-11-02')[0].start,600)
 const next=applyDraft(p,'2026-11-02')
 assert.equal(weekEvents(next,'2026-11-02').length,2)
 assert.equal(weekEvents(next,'2026-11-02')[0].date,'2026-11-03')
 assert.equal(weekEvents(next,'2026-11-09').length,2)
 assert.equal(weekEvents(next,'2026-11-09')[0].start,600)
 assert.equal(next.drafts['2026-11-02'],undefined)
 assert.equal(p.lessons[0].date,'2026-11-02')
})
test('override movido a otra semana aparece una sola vez en destino',()=>{
 const p=data(lesson({repeat:'once'}));const old=weekEvents(p,'2026-11-02')[0]
 p.overrides[old.key]={...old,date:'2026-11-10'}
 assert.equal(weekEvents(p,'2026-11-02').length,0)
 assert.equal(weekEvents(p,'2026-11-09').length,1)
})
test('borrador obsoleto no pisa una clase editada luego en agenda confirmada',()=>{
 const p=data(lesson());const original=weekEvents(p,'2026-11-02')
 p.drafts['2026-11-02']={original,events:[{...original[0],start:700}]}
 p.overrides[original[0].key]={...original[0],start:800}
 assert.throws(()=>applyDraft(p,'2026-11-02'),/agenda confirmada cambió/)
})
test('clases nuevas confirmadas después de crear borrador se conservan',()=>{
 const p=data(lesson());const original=weekEvents(p,'2026-11-02')
 p.drafts['2026-11-02']={original,events:[{...original[0],start:700}]}
 p.lessons.push(lesson({id:'b',start:900}))
 assert.equal(weekEvents(applyDraft(p,'2026-11-02'),'2026-11-02').length,2)
})
test('avisos detectan superposición, traslado y clases contenidas, nunca días diferentes',()=>{
 const a={...lesson(),key:'a'}, b={...lesson({id:'b',start:630,venueId:'home'}),key:'b'}
 assert.equal(conflicts([a,b],30).length,1)
 assert.equal(conflicts([a,{...b,start:675}],30).length,1)
 assert.equal(conflicts([a,{...b,start:690}],30).length,0)
 assert.equal(conflicts([a,{...b,start:660,venueId:'gym'}],30).length,0)
 assert.equal(conflicts([a,{...b,date:'2026-11-03'}],30).length,0)
 const long={...a,duration:180}
 assert.equal(conflicts([long,b,{...b,key:'c',start:720}],30).length,2)
})
test('búsqueda respeta días, sede, duración, traslados y excluye clase editada',()=>{
 const events=weekEvents(data(lesson()),'2026-11-02')
 const slots=findSlots(events,'2026-11-02',[0],600,780,60,'home',30)
 assert.equal(slots[0].start,690)
 assert.ok(slots.every(s=>s.date==='2026-11-02' && s.start+60<=780))
 assert.equal(findSlots(events,'2026-11-02',[0],600,660,60,'gym',30).length,0)
 assert.equal(findSlots(events,'2026-11-02',[0],600,660,60,'gym',30,events[0].key)[0].start,600)
})
test('grupos superpuestos se distribuyen en columnas visibles y los huecos recuperan ancho',()=>{
 const a={...lesson(),key:'a',duration:180},b={...lesson(),key:'b'},c={...lesson({start:630}),key:'c'},d={...lesson({start:900}),key:'d'}
 const layout=exports.layoutEvents([a,b,c,d])
 assert.equal(layout.a.columns,3)
 assert.equal(new Set([layout.a.column,layout.b.column,layout.c.column]).size,3)
 assert.equal(layout.d.columns,1)
})
test('persistencia JSONB con distinto orden de claves no genera cambios ni conflictos falsos',()=>{
 const p=data(lesson());const original=weekEvents(p,'2026-11-02')
 const fromDatabase=Object.fromEntries(Object.entries(original[0]).reverse())
 assert.equal(exports.changed(original[0],fromDatabase),false)
 p.drafts['2026-11-02']={original:[fromDatabase],events:[{...fromDatabase,start:700}]}
 assert.equal(weekEvents(applyDraft(p,'2026-11-02'),'2026-11-02')[0].start,700)
})
test('sede queda libre al anular clases puntuales o todas las ocurrencias de una serie',()=>{
 const p=data(lesson({repeat:'once'}))
 assert.equal(exports.venueHasClasses(p,'gym'),true)
 p.overrides['a:2026-11-02']=null
 assert.equal(exports.venueHasClasses(p,'gym'),false)
 p.lessons[0]=lesson({until:'2026-11-09'})
 assert.equal(exports.venueHasClasses(p,'gym'),true)
 p.overrides['a:2026-11-09']=null
 assert.equal(exports.venueHasClasses(p,'gym'),false)
 p.lessons[0]=lesson()
 assert.equal(exports.venueHasClasses(p,'gym'),true)
})
test('cambiar la sede de una clase puntual libera la original y protege el destino',()=>{
 const p=data(lesson({repeat:'once'}))
 p.overrides['a:2026-11-02']={...lesson({repeat:'once',venueId:'other'}),key:'a:2026-11-02'}
 assert.equal(exports.venueHasClasses(p,'gym'),false)
 assert.equal(exports.venueHasClasses(p,'other'),true)
})
