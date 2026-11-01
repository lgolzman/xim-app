import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
function harness() {
 const load=(file,modules,globals={})=>{
  const exports={}
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  vm.runInNewContext(code,{exports,require:key=>modules[key],Date,Map,Set,Error,...globals})
  return exports
 }
 const lib=load('src/lib/planner.ts',{})
 const weeklyLib=load('src/lib/weeklyPlanner.ts',{'./planner':lib})
 const data=lib.emptyPlanner()
 data.venues=[{id:'v',name:'Gimnasio',color:'#0f766e'}]
 data.weeklyPlan={classes:[{id:'a',day:0,studentId:'s',title:'Ana',venueId:'v',start:600,duration:60,notes:''}]}
 const planner={data,busy:false,loading:false,error:'',reload:async()=>{},save:async next=>{planner.data=next;return true}}
 const states=[];let index=0
 const jsxs=(type,props)=>({type,props})
 let nextId=0
 const component=load('src/pages/admin/Planner.tsx',{
  react:{useCallback:callback=>callback,useState:initial=>{const slot=index++;if(!(slot in states))states[slot]=typeof initial==='function'?initial():initial;return[states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value}]}},
  'react/jsx-runtime':{jsx:jsxs,jsxs,Fragment:'Fragment'},
  '../../components/layout/Layout':{Layout:'Layout'},'../../components/ui/Modal':{Modal:'Modal'},
  '../../context/AuthContext':{},'../../hooks/useStudents':{},'../../hooks/usePlanner':{},
  '../../lib/planner':lib,'../../lib/weeklyPlanner':weeklyLib,'./planner.css':{},
 },{crypto:{randomUUID:()=> `new-${nextId++}`},window:{confirm:()=>true},document:{elementFromPoint:()=>({closest:()=>({dataset:{plannerDay:'1'},getBoundingClientRect:()=>({top:-210})})})}})
 let tree
 const render=()=>{index=0;tree=component.PlannerView({planner,studentSource:{students:[],error:null}});return tree}
 function all(node){if(!node || typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(all);return[node,...all(node.props?.children)]}
 const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):''
 const button=label=>all(tree).find(n=>n.type==='button'&&text(n)===label)
 const event=()=>all(tree).find(n=>n.type==='button'&&n.props.className?.includes('pl-event '))
 render()
 return {planner,lib,render,all:()=>all(tree),button,event,text}
}
const flush=async h=>{await new Promise(setImmediate);h.render()}
function drag(h){
 h.event().props.onPointerDown({button:0,pointerId:1,clientX:10,clientY:95,currentTarget:{setPointerCapture(){},getBoundingClientRect:()=>({top:90})}})
 h.render();h.event().props.onPointerUp({pointerId:1,clientX:200,clientY:125})
}
function field(h,label){return h.all().find(n=>n.type==='label'&&h.text(n).startsWith(label)&&(label!=='Sede'||n.props.children.some(c=>c?.type==='select'&&c.props.required))).props.children.find(n=>n&&typeof n==='object'&&['input','select'].includes(n.type))}
test('grilla laboral sin fechas ni fines de semana; 24 horas con escala compacta',()=>{
 const h=harness()
 const headers=h.all().filter(n=>n.props?.className==='pl-day-header')
 assert.deepEqual(headers.map(h.text),['Lunes1 h','Martes0 h','Miércoles0 h','Jueves0 h','Viernes0 h'])
 const times=h.all().find(n=>n.props?.className==='pl-times')
 assert.equal(times.props.style.height,720)
 assert.equal(h.text(times.props.children[0]),'00:00')
 assert.equal(h.text(times.props.children[23]),'23:00')
 const node={scrollTop:0};h.all().find(n=>n.props?.className==='pl-scroll').props.ref(node)
 assert.equal(node.scrollTop,210)
 assert.equal(h.event().props.style.height,30)
 h.button('＋ Agregar clase').props.onClick();h.render()
 assert.equal(h.all().some(n=>n.type==='input'&&n.props.type==='date'),false)
 assert.equal(h.all().some(n=>n.type==='label'&&h.text(n).startsWith('Repetición')),false)
})
test('arrastrar modifica el armado actual directamente',async()=>{
 const h=harness();drag(h);await flush(h)
 assert.equal(h.planner.data.weeklyPlan.classes[0].day,1)
 assert.equal(h.planner.data.weeklyPlan.classes[0].start,660)
 assert.equal(h.planner.data.weeklyPlan.draft,undefined)
})
test('borrador guardado permite comparar, retomar y aplicar movimientos',async()=>{
 const h=harness();h.button('Probar cambios').props.onClick();await flush(h)
 drag(h);await flush(h)
 assert.equal(h.planner.data.weeklyPlan.classes[0].start,600)
 assert.equal(h.planner.data.weeklyPlan.draft.classes[0].start,660)
 h.button('Armado actual').props.onClick();h.render()
 assert.equal(h.event().props.style.top,300)
 h.button('Retomar borrador').props.onClick();await flush(h)
 h.button('Aplicar cambios').props.onClick();await flush(h)
 assert.equal(h.planner.data.weeklyPlan.classes[0].start,660)
 assert.equal(h.planner.data.weeklyPlan.draft,undefined)
})
test('descartar mantiene armado original',async()=>{
 const h=harness();h.button('Probar cambios').props.onClick();await flush(h)
 drag(h);await flush(h);h.button('Descartar').props.onClick();await flush(h)
 assert.equal(h.planner.data.weeklyPlan.classes[0].start,600)
 assert.equal(h.planner.data.weeklyPlan.draft,undefined)
})
test('abrir con teclado y mover con clic en la grilla',async()=>{
 const h=harness();h.event().props.onKeyDown({key:'Enter',preventDefault(){}});h.render()
 h.button('Mover en la grilla').props.onClick();h.render()
 const column=h.all().find(n=>n.props?.['data-planner-day']===2)
 const target={getBoundingClientRect:()=>({top:-110})}
 column.props.onClick({target,currentTarget:target,clientY:242.5});await flush(h)
 assert.equal(h.planner.data.weeklyPlan.classes[0].day,2)
 assert.equal(h.planner.data.weeklyPlan.classes[0].start,705)
})
for(const draft of [false,true]) test(`alta lunes, miércoles y viernes sin fechas (${draft?'borrador':'actual'})`,async()=>{
 const h=harness()
 if(draft){h.button('Probar cambios').props.onClick();await flush(h)}
 h.button('＋ Agregar clase').props.onClick();h.render()
 field(h,'Nombre de la clase').props.onChange({target:{value:'Nueva clase'}});h.render()
 field(h,'Sede').props.onChange({target:{value:'v'}});h.render()
 for(const day of [2,4]){
  const group=h.all().find(n=>n.type==='fieldset')
  group.props.children[2].props.children[day].props.children[0].props.onChange({target:{checked:true}});h.render()
 }
 h.all().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush(h)
 const p=h.planner.data.weeklyPlan
 const added=(draft?p.draft.classes:p.classes).filter(item=>item.title==='Nueva clase')
 assert.deepEqual(Array.from(added,item=>item.day),[0,2,4])
 assert.equal(new Set(added.map(item=>item.id)).size,3)
 assert.ok(added.every(item=>item.start===540&&item.duration===60&&!('date' in item)&&!('repeat' in item)))
 assert.equal(p.classes.length,draft?1:4)
})
test('borrar clase libera sede; no quedan referencias de fechas anuladas',async()=>{
 const h=harness()
 h.event().props.onKeyDown({key:'Enter',preventDefault(){}});h.render()
 h.button('Eliminar clase').props.onClick();await flush(h)
 assert.equal(h.planner.data.weeklyPlan.classes.length,0)
 h.button('Administrar sedes').props.onClick();h.render()
 const remove=h.all().find(n=>n.props?.['aria-label']==='Eliminar sede Gimnasio')
 assert.equal(remove.props.disabled,false)
 remove.props.onClick();await flush(h)
 assert.equal(h.planner.data.venues.length,0)
})
test('borradores protegen sedes aunque se quite una clase del armado actual',async()=>{
 const h=harness();h.button('Probar cambios').props.onClick();await flush(h)
 h.planner.data.weeklyPlan.classes=[];h.render()
 h.button('Administrar sedes').props.onClick();h.render()
 assert.equal(h.all().find(n=>n.props?.['aria-label']==='Eliminar sede Gimnasio').props.disabled,true)
})
test('actividad sin alumno ni sede ocupa horario, se guarda y se elimina como actividad',async()=>{
 const h=harness()
 h.button('＋ Agregar actividad').props.onClick();h.render()
 assert.equal(h.all().some(n=>n.type==='label'&&h.text(n).startsWith('Alumno (')),false)
 field(h,'Nombre de la clase').props.onChange({target:{value:'Pasear al perro'}});h.render()
 h.all().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush(h)
 const activity=h.planner.data.weeklyPlan.classes.find(item=>item.kind==='activity')
 assert.ok(activity)
 assert.equal(activity.venueId,'')
 assert.equal(activity.studentId,'')
 assert.equal(activity.day,0)
 const block=h.all().find(n=>n.type==='button'&&n.props.className?.includes('pl-activity'))
 assert.ok(block)
 block.props.onKeyDown({key:'Enter',preventDefault(){}});h.render()
 h.button('Eliminar actividad').props.onClick();await flush(h)
 assert.equal(h.planner.data.weeklyPlan.classes.some(item=>item.kind==='activity'),false)
})
