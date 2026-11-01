import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PlannerView } from '../src/pages/admin/Planner'
import { emptyPlanner } from '../src/lib/planner'
import type { PlannerData } from '../src/lib/planner'
import '../src/index.css'
const seed = emptyPlanner()
seed.venues = [{ id:'gym',name:'Gimnasio · Belgrano',color:'#0f766e' },{id:'home',name:'Domicilio · Núñez',color:'#7c3aed'},{id:'online',name:'Online',color:'#0369a1'}]
const names = ['Lucía Martínez','Carolina López','Mariana Ruiz','Sofía Pérez','Ana Fernández','Valentina García']
const students = names.map((name,i)=>({id:String(i),full_name:name,name,email:null,role:'consulta',active:true}))
seed.weeklyPlan = { classes: [
  [0,0,8*60,'gym'],[1,0,10*60,'gym'],[2,0,17*60,'home'],[3,1,9*60,'online'],[4,1,11*60,'gym'],[5,1,16*60,'home'],
  [0,2,8*60,'gym'],[2,2,10*60,'gym'],[1,2,17*60,'home'],[3,3,9*60,'online'],[4,3,11*60,'gym'],[5,3,16*60,'home'],[0,4,8*60,'gym'],[2,4,10*60,'gym']
].map(([student,day,start,venue],i)=>({ id:`class-${i}`,studentId:String(student),title:names[Number(student)],day:Number(day),start:Number(start),duration:60,venueId:String(venue),notes:'' })) }
export function Preview(){
  const [data,setData] = useState<PlannerData>(()=>{try{return JSON.parse(localStorage.getItem('xim-planner-demo')||'null')||seed}catch{return seed}})
  const [error,setError]=useState('')
  return <PlannerView planner={{data,loading:false,busy:false,error,reload:async()=>{},save:async(next)=>{try{localStorage.setItem('xim-planner-demo',JSON.stringify(next));setData(next);return true}catch{setError('No se pudo guardar el ejemplo en este navegador.');return false}}}} studentSource={{students:students as unknown as ReturnType<typeof import('../src/hooks/useStudents').useStudents>['students'],error:null}} />
}
createRoot(document.getElementById('root')!).render(<Preview/> )
