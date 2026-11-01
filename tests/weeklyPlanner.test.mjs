import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const load=(path,modules={})=>{
 const exports={}
 vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:key=>modules[key],Date,Map,Set,Error})
 return exports
}
const old=load('src/lib/planner.ts')
const {readWeeklyPlan,confirmWeeklyDraft,weeklyConflicts,weeklySlots}=load('src/lib/weeklyPlanner.ts',{'./planner':old})
const item=(extra={})=>({id:'a',day:0,studentId:'s',title:'Ana',venueId:'v',start:600,duration:60,notes:'',...extra})
test('nuevo esquema vacío permanece vacío aunque haya datos antiguos',()=>{
 const p={...old.emptyPlanner(),weeklyPlan:{classes:[]}}
 p.lessons=[{...item(),date:'2026-11-02',repeat:'weekly'}]
 assert.equal(readWeeklyPlan(p),p.weeklyPlan)
})
test('compatibilidad respeta anulaciones, adapta lunes a viernes y conserva originales',()=>{
 const p=old.emptyPlanner()
 p.lessons=[{...item(),date:'2026-11-02',repeat:'once'},{...item({id:'b'}),date:'2026-11-04',repeat:'once'},{...item({id:'c'}),date:'2026-11-07',repeat:'once'}]
 p.overrides['a:2026-11-02']=null
 const before=JSON.stringify(p)
 const converted=readWeeklyPlan(p)
 assert.equal(converted.classes.length,1)
 assert.equal(converted.classes[0].day,2)
 assert.equal('date' in converted.classes[0],false)
 assert.equal(JSON.stringify(p),before)
})
test('aplicar borrador preserva clases agregadas y rechaza modificaciones conflictivas',()=>{
 const plan={classes:[item(),item({id:'b',day:4})],draft:{original:[item()],classes:[item({day:2})]}}
 const applied=confirmWeeklyDraft(plan)
 assert.equal(applied.classes.length,2)
 assert.equal(applied.classes.find(c=>c.id==='a').day,2)
 assert.equal(applied.draft,undefined)
 plan.classes[0].start=660
 assert.throws(()=>confirmWeeklyDraft(plan),/armado actual cambió/)
})
test('avisos y huecos usan días sin fechas e incluyen margen de traslado',()=>{
 const classes=[item(),item({id:'b',start:670,venueId:'other'}),item({id:'c',day:1,start:620})]
 assert.equal(weeklyConflicts(classes,30).length,1)
 assert.match(weeklyConflicts(classes,30)[0].message,/Lunes/)
 const slots=weeklySlots(classes,[0],660,800,30,'v',30)
 assert.ok(slots.length)
 assert.ok(slots.every(s=>s.day===0&&s.start>=760))
 assert.equal(weeklySlots(classes,[0],600,660,60,'v',30,'a').length,0)
})
test('actividad sin sede bloquea huecos y superposiciones sin inventar traslados',()=>{
 const activity=item({id:'walk',kind:'activity',venueId:'',start:660,duration:30})
 assert.equal(weeklyConflicts([item(),activity],30).length,0)
 assert.equal(weeklyConflicts([item(),{...activity,start:650}],30).length,1)
 const slots=weeklySlots([activity],[0],660,720,30,'v',30)
 assert.equal(slots[0].start,690)
 const plan={classes:[item()],draft:{original:[item()],classes:[item({kind:'activity'})]}}
 assert.equal(confirmWeeklyDraft(plan).classes[0].kind,'activity')
})
