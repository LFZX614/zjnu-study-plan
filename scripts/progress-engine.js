(function(root){
 const plus=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)},weekday=s=>new Date(s+'T12:00:00Z').getUTCDay();
 const rotation={1:['古代文学','现当代文学'],2:['现当代文学','文学理论'],3:['古代文学','现代汉语'],4:['外国文学','文学理论'],5:['现当代文学','现代汉语'],6:['古代文学','外国文学'],0:[]};
 const professional=c=>!['政治','英语'].includes(c);
 function build(data,state,today){
  const records=state.records||{},moves=state.moves||{},deleted=state.deletedTasks||{},completed=t=>!!records[t.id]?.done;
  const flat=data.days.flatMap(d=>d.tasks.map(t=>({...t,plannedDate:d.date}))),learn=new Map(flat.filter(t=>t.phase==='first'||t.course==='政治'&&t.type==='记忆').map(t=>[t.sourceId,t]));
  const baseline=new Map(data.coverage.filter(r=>r.first&&r.first<data.days[0].date).map(r=>[r.id,r.first]));
  const dateOf=id=>{const t=learn.get(id);return t?(records[t.id]?.done?records[t.id].completedOn||today:null):baseline.get(id)||null};
  const list=[],intervals=[1,3,7,14];
  for(const t of flat){if(deleted[t.id]?.deleted)continue;
   if(['review1','review2','rolling'].includes(t.phase)&&learn.has(t.sourceId)&&!completed(t))continue;
   const politicalRecall=t.sourceId?.match(/^pol-recall-(.+)-(1|3|7|14)$/);if(politicalRecall&&learn.has(politicalRecall[1])&&!completed(t))continue;
   if(t.parentId&&deleted['v3:learn:'+t.parentId]?.deleted)continue;
   list.push({...t,title:t.course==='政治'&&t.title.startsWith('1000题')?(records[t.id]?.snapshot?.title||state.politics?.v3ChapterName||data.days[0].tasks.find(x=>x.title.startsWith('1000题'))?.title||t.title):t.title,date:moves[t.id]?.date||records[t.id]?.scheduledOn||t.plannedDate,manual:!!moves[t.id],blocked:(t.prerequisites||[]).filter(r=>!dateOf(r.id)).map(r=>r.id)});
  }
  for(const t of learn.values()){
   if(!completed(t)||deleted[t.id]?.deleted)continue;const anchor=records[t.id].completedOn||today;
   for(const interval of intervals){const id='v3:auto:'+t.sourceId+':'+interval,record=records[id],date=plus(anchor,interval);
    // A completed child remains in history after undo. An uncompleted child only
    // exists while its source is complete, and follows the current source date.
    list.push({...t,id,date:moves[id]?.date||(record?.done?record.scheduledOn||record.completedOn:date),plannedDate:date,manual:!!moves[id],phase:'auto-review',displayType:'复习',type:'复习',estimate:interval===1?Math.min(5,t.estimate):Math.min(20,Math.max(5,Math.round(t.estimate/2))),sourceTask:t.id,interval,blocked:[],scope:'合书回忆本任务范围，再核对遗漏。第'+interval+'天回忆；按实际完成日期生成，延期后保留原到期日。',due:date});
   }
  }
  // Retain completed generated reviews even when their source completion is undone.
  for(const [id,r] of Object.entries(records))if(r.done&&id.startsWith('v3:auto:')&&!list.some(t=>t.id===id)&&r.snapshot)list.push({...r.snapshot,id,date:r.scheduledOn||r.completedOn,history:true});
  list.push(...(state.custom||[]).filter(t=>!deleted[t.id]?.deleted).map(t=>({...t,date:moves[t.id]?.date||t.date,manual:!!moves[t.id],estimate:t.estimate||20,blocked:[]})));
  const loads=new Map(),out=[],warnings=[];const cap=(date,c)=>professional(c)?weekday(date)===0?180:450:c==='政治'?weekday(date)===0?75:90:weekday(date)===0?45:90;
  const loadKey=(date,c)=>professional(c)?date:date+':'+c;
  const rank=t=>t.displayType==='复习'||['auto-review','writing','prediction-writing'].includes(t.phase)?0:1;
  const firstTimes=new Map();
  const fixed=list.filter(t=>completed(t)||t.manual),pending=list.filter(t=>!completed(t)&&!t.manual);
  function insert(t){out.push(t);if(!completed(t)){const key=loadKey(t.date,t.course);loads.set(key,(loads.get(key)||0)+(t.estimate||0));}if(t.phase==='first')firstTimes.set(t.sourceId,t.date);}
  for(const t of fixed)insert(t);
  pending.sort((a,b)=>a.date.localeCompare(b.date)||rank(a)-rank(b)||(a.order||0)-(b.order||0));
  for(const t of pending){let date=t.date;const overdue=date<today;
   if(overdue){date=today;if(professional(t.course)&&rank(t)===1){while(!rotation[weekday(date)].includes(t.course))date=plus(date,1);}}
   let n=0;while(n++<180){const same=!professional(t.course)||rank(t)===0||rotation[weekday(date)].includes(t.course);const room=(loads.get(loadKey(date,t.course))||0)+(t.estimate||0)<=cap(date,t.course);if(same&&room)break;date=plus(date,1);}
   insert({...t,date,originalDue:t.due||t.plannedDate,rescheduled:date!==t.date});
  }
  for(const [key,load]of loads){const date=key.slice(0,10),course=key.slice(11)||'专业课';if(load>cap(date,course))warnings.push({date,kind:'capacity',text:'手动安排超过'+course+'预算，请减少新增或改期。'});}
  for(const t of out)if(!completed(t)&&t.date>data.end)warnings.push({date:t.date,id:t.id,kind:'deadline',text:'此任务已排到原考前计划范围之后，需要调整任务量。'});
  out.sort((a,b)=>a.date.localeCompare(b.date)||rank(a)-rank(b)||(a.order||0)-(b.order||0));
  return {tasks:out,warnings,loads:Object.fromEntries(loads)};
 }
 const api={build,plus,rotation};if(typeof module!=='undefined')module.exports=api;root.StudyProgress=api;
})(globalThis);
