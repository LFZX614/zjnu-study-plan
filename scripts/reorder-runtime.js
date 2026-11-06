// Apply the new generic plan without changing personal completion, notes or sessions.
function applyTextbookReorder(){
 if(!plan?.reorder||state.reorderRevision===plan.reorder.revision)return;
 const affected=new Set(plan.reorder.sourceTaskIds),now=new Date().toISOString();
 state.reorderSnapshots||=[];
 state.reorderSnapshots.push({revision:plan.reorder.revision,at:now,moves:JSON.parse(JSON.stringify(state.moves)),plannedMemory:Object.fromEntries(Object.entries(state.memory).filter(([k,m])=>m&&!m.confirmed))});
 state.reorderSnapshots=state.reorderSnapshots.slice(-3);
 for(const t of plan.flat){
  if(!affected.has(t.id)||done(t))continue;
  if(state.moves[t.id])state.moves[t.id]={date:t.date,updatedAt:now,reorderRevision:plan.reorder.revision};
 }
 for(const[key,m]of Object.entries(state.memory)){
  const source=plan.flat.find(t=>t.memoryKey===key);
  if(m?.confirmed){if(source)state.memory[key]={...m,study:source.study};continue;}
  if(source&&affected.has(source.id))delete state.memory[key];
 }
 state.reorderRevision=plan.reorder.revision;save();
}
const textbookInitBase=initV2;
initV2=function(){textbookInitBase();applyTextbookReorder();};
const textbookRenderBase=render;
render=function(){applyTextbookReorder();textbookRenderBase();
 const note=$('#main .section-note');
 if(view==='today'&&note)note.textContent='11月6日已按教材重排：每科最多3项必做，关联查漏选做。新学按实际完成日建立回顾；待回顾合计最多20分钟，容量不足顺延。预计12月9日前完成核心清单，12月10日起回顾与补漏。';
 if(view==='today'&&!$('#reorder-plan-link'))$('#main').insertAdjacentHTML('beforeend','<p id="reorder-plan-link" class="section-note"><a href="reordered-plan.md" target="_blank" rel="noopener">查看五科重排总清单（11月6日版）</a></p>');
};
const textbookAllBase=allTasks;
allTasks=function(){
 const today=localDate(),professionalCourses=new Set(['古代文学','现当代文学','外国文学','文学理论','现代汉语']);
 let items=textbookAllBase().map(t=>{
  const source=t.memorySource&&plan.flat.find(x=>x.memoryKey===t.memorySource);
  if(source)t={...t,study:source.study};
  if(done(t)&&state.records[t.id]?.completedOn&&professionalCourses.has(t.course))return {...t,date:state.records[t.id].scheduledOn||state.records[t.id].completedOn};
  return t;
 });
 // Completed retired reviews remain visible on their historical day.
 for(const t of plan.archivedTasks||[])if(done(t))items.push({...adjusted(t),date:state.records[t.id]?.scheduledOn||t.date,role:t.role+' · 原记录'});
 items=items.flatMap(t=>{
  if(t.sourceTaskIds&&t.staticReview&&!done(t)&&t.date<=today){
   const reviewItems=t.reviewItems.filter(i=>state.memory[i.key]?.confirmed||t.sourceTaskIds.some(id=>done({id})&&plan.flat.find(x=>x.id===id)?.memoryKey===i.key));
   return reviewItems.length?[{...t,reviewItems}]:[];
  }
  return [t];
 });
 let scheduled=items.filter(t=>professionalCourses.has(t.course)&&t.type==='复习回顾'&&!done(t)&&t.date>=today);
 const pendingIds=new Set(scheduled.map(t=>t.id)),result=items.filter(t=>!pendingIds.has(t.id));
 // Actual completions retain per-question memory, while the displayed recall
 // groups up to three questions from the same subject, date and interval.
 const actualGroups=new Map(),ungrouped=[];
 for(const t of scheduled){if(!t.memorySource){ungrouped.push(t);continue;}const key=t.date+'|'+t.course+'|'+t.interval;if(!actualGroups.has(key))actualGroups.set(key,[]);actualGroups.get(key).push(t);}
 scheduled=ungrouped;
 for(const ts of actualGroups.values()){
  ts.sort((a,b)=>a.id.localeCompare(b.id));
  for(let i=0;i<ts.length;i+=3){const chunk=ts.slice(i,i+3);if(chunk.length===1){scheduled.push(chunk[0]);continue;}
   const reviewItems=chunk.flatMap(t=>t.reviewItems||[]),keys=chunk.map(t=>t.id).join('|');let hash=2166136261;for(const c of keys)hash=Math.imul(hash^c.charCodeAt(0),16777619);
   scheduled.push({...chunk[0],id:'reorder-actual-'+(hash>>>0).toString(16),title:chunk.map(t=>t.title).join('；'),memorySource:null,reviewItems,reorderSourceReviewIds:chunk.map(t=>t.id),detail:'闭卷复述这组已学内容的提纲，最多5分钟。逐项核对后完成；薄弱点写入笔记。'});
  }
 }
 const load=new Map(),oldLoad=new Map();
 scheduled.sort((a,b)=>Number(a.interval!==1)-Number(b.interval!==1)||a.date.localeCompare(b.date)||(a.interval||0)-(b.interval||0));
 for(const t of scheduled){
  let date=t.date,tries=0;
  const old=t.role==='旧内容回顾';
  while(tries++<180){
   const rest=new Date(date+'T12:00:00').getDay()===0;
   if(!rest&&(load.get(date)||0)<4&&(!old||!oldLoad.get(date)))break;
   date=shift(date,1);
  }
  load.set(date,(load.get(date)||0)+1);if(old)oldLoad.set(date,1);
  result.push({...t,date,reviewMinutes:5,detail:(t.detail||'')+(date!==t.date?'\n为控制每日回顾在20分钟内，本次顺延。':'')});
 }
 return result;
};
const textbookCompleteBase=completeTask;
completeTask=function(t){
 if(t.sourceTaskIds&&!t.sourceTaskIds.every(id=>done({id}))){toast('请先完成对应的新学内容，再进行这组回顾');return false;}
 const ok=textbookCompleteBase(t);
 if(ok&&t.reorderSourceReviewIds){for(const id of t.reorderSourceReviewIds){state.records[id]={...state.records[t.id],done:true};if(state.notes[t.id])state.notes[id]=[state.notes[id],state.notes[t.id]].filter(Boolean).join('\n');}save();render();}
 return ok;
};
