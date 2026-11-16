(function(root){
 const plus=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)},weekday=s=>new Date(s+'T12:00:00Z').getUTCDay();
 const rotation={1:['古代文学','现当代文学'],2:['现当代文学','文学理论'],3:['古代文学','现代汉语'],4:['外国文学','文学理论'],5:['现当代文学','现代汉语'],6:['古代文学','外国文学'],0:[]};
 const professional=c=>['古代文学','现当代文学','外国文学','文学理论','现代汉语'].includes(c);
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 function applyEdits(t,state){
  const e=state.taskEdits?.[t.id];if(!e||e.reset)return {...t};
  const out={...t};for(const k of ['title','course','book','chapter','scope'])if(typeof e[k]==='string')out[k]=e[k];
  if(typeof e.type==='string'){out.type=e.type;out.displayType=e.type;}
  if(typeof e.scope==='string')out.detail=e.scope;
  return out;
 }
 function build(data,state,today){
  const records=state.records||{},moves=state.moves||{},deleted=state.deletedTasks||{},completed=t=>!!records[t.id]?.done;
  const gone=t=>!!deleted[t.id]?.deleted||!!deleted[t.sourceTask]?.deleted||!!deleted[t.sourceTaskId]?.deleted;
  const flat=data.days.flatMap(d=>d.tasks.map(t=>applyEdits({...t,plannedDate:d.date},state)));
  const ids=new Set(flat.map(t=>t.id)),legacy=(data.legacyTasks||[]).filter(t=>!ids.has(t.id)&&completed(t)).map(t=>applyEdits({...t,date:records[t.id]?.scheduledOn||records[t.id]?.completedOn||t.plannedDate,history:true},state));
  const learn=new Map([...flat,...legacy].filter(t=>t.phase==='first'||t.course==='政治'&&t.type==='记忆').map(t=>[t.sourceId,t]));
  const baseline=new Map((data.coverage||[]).filter(r=>r.first&&r.first<data.days[0].date).map(r=>[r.id,r.first]));
  const dateOf=id=>{const t=learn.get(id);return t?(records[t.id]?.done?records[t.id].completedOn||today:null):baseline.get(id)||null};
  const list=[],intervals=[1,3,7,14];
  for(const t of [...flat,...legacy]){
   if(gone(t))continue;
   if(['review1','review2','rolling'].includes(t.phase)&&learn.has(t.sourceId)&&!completed(t))continue;
   const recall=t.sourceId?.match(/^pol-recall-(.+)-(1|3|7|14)$/);if(recall&&learn.has(recall[1])&&!completed(t))continue;
   if(t.parentId&&deleted['v3:learn:'+t.parentId]?.deleted)continue;
   const political=t.course==='政治'&&t.title.startsWith('1000题');
   list.push({...t,title:political?(records[t.id]?.snapshot?.title||state.politics?.v3ChapterName||t.title):t.title,date:moves[t.id]?.date||records[t.id]?.scheduledOn||t.date||t.plannedDate,manual:!!moves[t.id],blocked:(t.prerequisites||[]).filter(r=>!dateOf(r.id)).map(r=>r.id)});
  }
  for(const t of learn.values()){
   if(!completed(t)||gone(t))continue;const anchor=records[t.id].completedOn||today;
   for(const interval of intervals){const id='v3:auto:'+t.sourceId+':'+interval,record=records[id],date=plus(anchor,interval);
    const child=applyEdits({...t,id,date:moves[id]?.date||(record?.done?record.scheduledOn||record.completedOn:date),plannedDate:date,manual:!!moves[id],phase:'auto-review',displayType:'复习',type:'复习',estimate:interval===1?Math.min(5,t.estimate||5):Math.min(20,Math.max(5,Math.round((t.estimate||10)/2))),sourceTask:t.id,interval,blocked:[],scope:'合书回忆本任务范围，再核对遗漏。第'+interval+'天回忆；按实际完成日期生成，延期后保留原到期日。',due:date},state);
    if(!gone(child))list.push(child);
   }
  }
  for(const[id,r]of Object.entries(records))if(r.done&&id.startsWith('v3:auto:')&&!list.some(t=>t.id===id)&&r.snapshot&&!gone(r.snapshot))list.push(applyEdits({...r.snapshot,id,date:r.scheduledOn||r.completedOn,history:true},state));
  list.push(...(state.custom||[]).filter(t=>!gone(t)).map(t=>({...applyEdits(t,state),date:moves[t.id]?.date||t.date,manual:!!moves[t.id],estimate:t.estimate||20,blocked:[]})));
  const loads=new Map(),out=[],warnings=[],courseFloor=new Map();const cap=(date,c)=>professional(c)?weekday(date)===0?180:450:c==='政治'?weekday(date)===0?75:90:weekday(date)===0?45:90;
  const loadKey=(date,c)=>professional(c)?date:date+':'+c;
  const rank=t=>t.displayType==='复习'||['auto-review','writing','prediction-writing','consolidation'].includes(t.phase)?0:1;
  const allowed=(date,c)=>rotation[weekday(date)].includes(c)||(data.days.find(d=>d.date===date)?.approvedCourses||[]).includes(c);
  const fixed=list.filter(t=>completed(t)||t.manual),pending=list.filter(t=>!completed(t)&&!t.manual);
  function insert(t){out.push(t);if(!completed(t)){const key=loadKey(t.date,t.course);loads.set(key,(loads.get(key)||0)+(t.estimate||0));}}
  for(const t of fixed)insert(t);
  pending.sort((a,b)=>a.date.localeCompare(b.date)||rank(a)-rank(b)||(a.order||0)-(b.order||0));
  for(const t of pending){let date=t.date;if(date<today)date=today;
   const ordered=t.revision&&['first','reading'].includes(t.phase)&&professional(t.course);
   if(ordered&&courseFloor.get(t.course)>date)date=courseFloor.get(t.course);
   let n=0;while(n++<180){const same=!professional(t.course)||rank(t)===0||allowed(date,t.course);const room=!!t.revision||(loads.get(loadKey(date,t.course))||0)+(t.estimate||0)<=cap(date,t.course);if(same&&room)break;date=plus(date,1);}
   insert({...t,date,originalDue:t.due||t.plannedDate,rescheduled:date!==t.date});
   if(ordered)courseFloor.set(t.course,date);
  }
  for(const[key,load]of loads){const date=key.slice(0,10),course=key.slice(11)||'专业课';if(load>cap(date,course))warnings.push({date,kind:'capacity',text:'当天'+course+'任务量超过原预算，请按实际完成校准或手动改期。'});}
  for(const t of out)if(!completed(t)&&t.date>data.end)warnings.push({date:t.date,id:t.id,kind:'deadline',text:'此任务已排到原考前计划范围之后，需要调整任务量。'});
  out.sort((a,b)=>a.date.localeCompare(b.date)||rank(a)-rank(b)||(a.order||0)-(b.order||0));
  return{tasks:out,warnings,loads:Object.fromEntries(loads)};
 }
 const api={build,plus,rotation,applyEdits,validDate};if(typeof module!=='undefined')module.exports=api;root.StudyProgress=api;
})(globalThis);
