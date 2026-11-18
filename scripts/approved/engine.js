(function(root){
 const plus=(s,n)=>new Date(Date.parse(s+'T12:00:00Z')+n*86400000).toISOString().slice(0,10),weekday=s=>new Date(s+'T12:00:00Z').getUTCDay();
 const rotation={1:['古代文学','现当代文学'],2:['现当代文学','文学理论'],3:['古代文学','现代汉语'],4:['外国文学','文学理论'],5:['现当代文学','现代汉语'],6:['古代文学','外国文学'],0:[]};
 const professional=c=>Object.values(rotation).some(cs=>cs.includes(c));
 const choiceTitle=q=>'1000题｜'+q.subject+'｜'+q.title;
 function finishChoice(data,politics,title,now){
  const current=politics.approvedChapterName||data.choiceDefault;
  if((politics.approvedMaterial||'1000题')!=='1000题'||politics.approvedChoiceComplete||title!==current)return null;
  const index=data.choiceQueue.findIndex(q=>choiceTitle(q)===current);if(index<0)return null;
  const chapter=data.choiceQueue[index],next=data.choiceQueue[index+1];
  return{...politics,approvedChapterName:next?choiceTitle(next):current,approvedChoiceComplete:!next,approvedChapterCompletions:{...politics.approvedChapterCompletions,[chapter.id]:{title:current,complete:true,updatedAt:now}},updatedAt:now};
 }
 const edited=(t,s)=>{const e=s.taskEdits?.[t.id];if(!e||e.reset)return{...t};const x={...t};for(const k of ['title','course','book','chapter','scope'])if(typeof e[k]==='string')x[k]=e[k];if(e.type)x.type=x.displayType=e.type;if(e.scope)x.detail=e.scope;return x;};
 function build(data,state,today){
  const records=state.records||{},moves=state.moves||{},deleted=state.deletedTasks||{};
  const done=t=>!!records[t.id]?.done,gone=t=>!!deleted[t.id]?.deleted||!!deleted[t.sourceTask]?.deleted||!!deleted[t.sourceTaskId]?.deleted;
  const flat=data.days.flatMap(d=>d.tasks.map(t=>edited({...t,plannedDate:d.date},state))),activeIds=new Set(flat.map(t=>t.id));
  const extras=[...(data.candidates||[]),...(data.legacyTasks||[])].filter(t=>!activeIds.has(t.id)&&(records[t.id]?.done||moves[t.id]||state.taskEdits?.[t.id]&&!state.taskEdits[t.id].reset));
  const all=[...flat,...extras.map(t=>edited({...t,history:!(t.candidate||moves[t.id]?.date>=today||state.taskEdits?.[t.id]&&!state.taskEdits[t.id].reset),plannedDate:t.plannedDate||t.date||today},state)),...(state.custom||[]).map(t=>edited({...t,plannedDate:t.date||today,custom:true},state))];
  const unique=[...new Map(all.map(t=>[t.id,t])).values()],out=[],pending=[],reviews=[],warnings=[];
  const currentChoice=state.politics?.approvedChapterName||data.choiceDefault;
  for(const t of unique){
   if(gone(t))continue;
   const rec=records[t.id],manual=!!moves[t.id],expiredManual=manual&&moves[t.id].date<today&&!done(t)&&!t.history;
   if(t.reviewProposal&&!manual&&!done(t))continue;
   if(t.dailyHabit&&t.plannedDate<today&&!manual&&!done(t))continue;
   const item={...t,date:moves[t.id]?.date||(done(t)?rec.scheduledOn||rec.completedOn:t.plannedDate)||today,manual,blocked:(t.requiredTaskIds||[]).filter(id=>!records[id]?.done)};
   if(t.choiceSlot&&!done(t)&&!state.taskEdits?.[t.id]?.title){const material=state.politics?.approvedMaterial||'1000题';item.title=material==='1000题'?(state.politics?.approvedChoiceComplete?'1000题｜章节队列已完成，回看错题':currentChoice):material+'｜当前卷选择题';if(material!=='1000题')item.scope='在原来的半小时内完成'+material+'当前卷的选择题练习与订正，不另加1000题。卷次按实际位置；本次勾选不代表整卷已做完。';}
   if(done(t)&&rec.snapshot&&!state.taskEdits?.[t.id]?.title)item.title=rec.snapshot.title||item.title;
   item.origin=manual?(expiredManual?'过期改期未完，继续接续':'手动改期加入'):'原计划';item.previousManualDate=expiredManual?moves[t.id].date:null;
   if(done(item)||item.history||(manual&&!expiredManual)||item.custom){out.push(item);continue;}
   if(t.type==='复习')reviews.push(item);else pending.push(item);
  }
  // New learning advances in the reviewed daily blocks, never by fictitious
  // minute estimates. One unfinished block uses the next day of that subject.
  const roots=unique.filter(t=>t.phase==='first'&&!t.history&&!gone(t));
  for(const t of roots){if(!done(t))continue;const anchor=records[t.id].completedOn||today;
   for(const interval of (data.reviewIntervals||[1,3,7,14])){const id='v3:auto:'+t.sourceId+':'+interval,record=records[id],due=plus(anchor,interval);
    const child=edited({...t,id,type:'复习',displayType:'复习',phase:'auto-review',plannedDate:due,date:moves[id]?.date||(record?.done?record.scheduledOn||record.completedOn:due),sourceTask:t.id,sourceTaskId:t.id,interval,reviewQuestionType:t.type,knownReview:false,reviewProposal:false,choiceSlot:false,dailyHabit:false,practiceLane:null,scope:'合书回忆本题的要点，再核对遗漏。原题型：【'+t.type+'】。\n'+(t.scope||'')+'\n第'+interval+'天候选回忆，依据实际完成日生成；不用重抄原答案。',manual:!!moves[id],blocked:[]},state);
    if(gone(child))continue;
    if(record?.done||child.manual)out.push(child);else reviews.push(child);
   }
  }
  // Undoing a source removes only its future reminders, never completed history.
  const knownIds=new Set([...out,...reviews].map(t=>t.id));for(const[id,r]of Object.entries(records))if(r.done&&id.startsWith('v3:auto:')&&!knownIds.has(id)&&r.snapshot&&!gone(r.snapshot))out.push({...r.snapshot,id,date:moves[id]?.date||r.scheduledOn||r.completedOn,history:true});
  const learning=pending.filter(t=>t.phase==='first'),others=pending.filter(t=>t.phase!=='first');
  const byCourse=new Map();for(const t of learning){if(!byCourse.has(t.course))byCourse.set(t.course,[]);byCourse.get(t.course).push(t);}
  const substantive=t=>t.type==='论述题'?'L':['简答题','分析题','评论题'].includes(t.type)?'S':null;
  const fits=(items,t)=>{const L=items.filter(x=>substantive(x)==='L').length,S=items.filter(x=>substantive(x)==='S').length,k=substantive(t);if(k==='L')return L===0&&S<=1||L===1&&S===0;if(k==='S')return L===0&&S<3||L===1&&S===0;return items.filter(x=>!substantive(x)).length<4&&(t.type!=='课本梳理'||items.filter(x=>x.type==='课本梳理').length<2);};
  for(const [course,queue]of byCourse){queue.sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)||(a.order||0)-(b.order||0));let date=today,guard=0;
   while(queue.length&&guard++<730){const allowed=professional(course)?(data.rotationByDate?.[date]||rotation[weekday(date)]).includes(course):weekday(date)!==0;if(!allowed){date=plus(date,1);continue;}
    const assigned=out.filter(t=>t.date===date&&t.course===course&&t.phase==='first');let n=0;
    while(queue.length){const t=queue[0];const started=assigned.length>0;if(t.plannedDate>date&&(!started||assigned.some(x=>x.type==='论述题')&&assigned.filter(x=>substantive(x)).length>=2||assigned.filter(x=>substantive(x)==='S').length>=3))break;if(!fits(assigned,t))break;
     const laterPrerequisite=(t.requiredTaskIds||[]).some(id=>!records[id]?.done&&out.some(x=>x.id===id&&x.date>date));if(laterPrerequisite)break;
     queue.shift();const item={...t,date,rescheduled:date!==t.plannedDate,originalDue:t.plannedDate,origin:t.previousManualDate?'过期改期未完，继续接续':date<t.plannedDate?'按实际进度接续':date>t.plannedDate?'未完成顺延':'原计划'};out.push(item);assigned.push(item);n++;
    }
    date=plus(date,1);
   }
   for(const t of queue){out.push({...t,date,origin:'待接续'});warnings.push({id:t.id,date,kind:'deadline',text:'任务等待接续，请核对前置安排。'});}
  }
  const lanes=new Map();for(const t of others){if(t.practiceLane){if(!lanes.has(t.practiceLane))lanes.set(t.practiceLane,[]);lanes.get(t.practiceLane).push(t);}else out.push({...t,date:t.plannedDate<today?today:t.plannedDate});}
  for(const lane of lanes.values()){let next=today;for(const t of lane.sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate))){let date=[t.plannedDate,next,today].sort().at(-1);while(weekday(date)===0)date=plus(date,1);out.push({...t,date,rescheduled:date!==t.plannedDate,originalDue:t.plannedDate});next=plus(date,1);}}
  // Recall has its own finite daily slots. An overflow is visible as a deferred
  // recall, rather than piling every past reminder on today's screen.
  const loads=new Map();for(const t of out.filter(t=>t.type==='复习'&&!done(t))){const key=t.date+':'+(t.course==='政治'?'政治':'专业课');loads.set(key,(loads.get(key)||0)+1);}
  for(const t of reviews.sort((a,b)=>(a.interval===1?0:1)-(b.interval===1?0:1)||a.date.localeCompare(b.date)||(a.interval||0)-(b.interval||0)||(a.order||0)-(b.order||0))){let date=t.date<today?today:t.date,guard=0;if(out.some(w=>w.phase==='writing'&&!w.blocked?.length&&w.date===date&&w.replacesRecallIds?.includes(t.sourceTask)))continue;const kind=t.course==='政治'?'政治':'专业课';while(guard++<370){const cap=kind==='政治'?(weekday(date)===0?1:3):(weekday(date)===0?4:10),key=date+':'+kind;if((loads.get(key)||0)<cap){loads.set(key,(loads.get(key)||0)+1);break;}date=plus(date,1);}out.push({...t,date,rescheduled:date!==t.plannedDate,originalDue:t.plannedDate,afterPlan:date>data.end});if(t.plannedDate<=data.end&&date>data.end)warnings.push({id:t.id,date,kind:'review-deadline',text:'原到期在计划范围内的回忆已因积压顺延到计划之后，需要减量或改期。'});}
  for(const t of out)if(!done(t)&&t.date>data.end&&t.type!=='复习')warnings.push({id:t.id,date:t.date,kind:'deadline',text:'未完成任务已顺延到原计划结束之后，请减少新增或手动调整。'});
  const manualDays=[...new Set(out.filter(t=>t.manual&&!done(t)&&professional(t.course)).map(t=>t.date))];for(const date of manualDays){const current=out.filter(t=>t.date===date&&!done(t)&&professional(t.course)&&t.type!=='复习');if(new Set(current.map(t=>t.course+':'+(t.blockId||t.id))).size>new Set(current.map(t=>t.course)).size)warnings.push({date,kind:'manual-overlap',text:'手动安排叠加了不同学习日的内容，请核对今天的总量；所选日期会保留。'});}
  // Closed-book practice replaces selected recall, never adds another essay.
  for(const date of new Set(out.map(t=>t.date))){if(![2,6,0].includes(weekday(date)))continue;const limit=weekday(date)===0?2:1;const eligible=out.filter(t=>t.date===date&&t.type==='复习'&&professional(t.course)&&!done(t)&&/简答|论述|分析|评论/.test(t.reviewQuestionType||t.originalType||''));for(const t of eligible.slice(0,limit)){t.closedBook=true;t.scope='本次复习用闭卷书写替代口头回忆，写后对照底本订正，不另外追加一题。\n'+t.scope;}}
  const rank=t=>t.type==='复习'?0:1;out.sort((a,b)=>a.date.localeCompare(b.date)||rank(a)-rank(b)||(a.order||0)-(b.order||0));
  return{tasks:[...new Map(out.map(t=>[t.id,t])).values()],warnings,loads:Object.fromEntries(loads)};
 }
 const api={build,plus,rotation,edited,finishChoice,choiceTitle};if(typeof module!=='undefined')module.exports=api;root.ApprovedStudy=api;
})(globalThis);
