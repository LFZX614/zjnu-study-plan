(function(root,factory){const E=factory();if(typeof module==='object'&&module.exports)module.exports=E;else root.StudyEngine=E;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const REV='checkin-v7-doc51';
const CARRY_POLICY='sunday-v1';
function fresh(){return{schema:1,revision:REV,records:{},selectedDate:null,settings:{autoCarry:true},undo:[],carryPolicy:null,lastAutoDate:null,dayNotes:{},timer:null};}
function normalize(input,data){const s=fresh(),known=new Set(data.tasks.map(t=>t.id)),dates=new Set(data.days.map(d=>d.date));if(!input||input.schema!==1||input.revision!==REV)throw Error('这不是当前51天打卡版本的备份。');
 for(const[id,r]of Object.entries(input.records||{})){if(!known.has(id)||!r||typeof r!=='object')continue;const note=typeof r.note==='string'?r.note.slice(0,20000):'';s.records[id]={note,done:r.done===true,completedAt:typeof r.completedAt==='string'?r.completedAt.slice(0,40):null};if(dates.has(r.dueDate)||r.dueDate==='queue')s.records[id].dueDate=r.dueDate;s.records[id].moves=Array.isArray(r.moves)?r.moves.slice(-30).filter(m=>m&&typeof m.from==='string'&&typeof m.to==='string').map(m=>({from:m.from.slice(0,10),to:m.to.slice(0,10),at:String(m.at||'').slice(0,40),reason:String(m.reason||'').slice(0,80)})):[];}
 s.carryPolicy=input.carryPolicy===CARRY_POLICY?CARRY_POLICY:null;s.settings.autoCarry=input.settings?.autoCarry!==false;s.selectedDate=dates.has(input.selectedDate)?input.selectedDate:null;s.lastAutoDate=typeof input.lastAutoDate==='string'?input.lastAutoDate:null;
 for(const[k,v]of Object.entries(input.dayNotes||{}))if(dates.has(k)&&typeof v==='string')s.dayNotes[k]=v.slice(0,20000);
 if(input.timer&&Number.isFinite(input.timer.end)&&['focus','break'].includes(input.timer.mode))s.timer={end:input.timer.end,mode:input.timer.mode};return s;}
const rec=(s,t)=>s.records[t.id]||{};
const due=(s,t)=>rec(s,t).dueDate||t.originalDate;
const done=(s,t)=>rec(s,t).done===true;
const cost=t=>t.kind==='论述题'?3:t.kind==='简答题'||t.kind==='分析题'?2:1;
function allowed(data,t,date){const d=data.days.find(x=>x.date===date);if(!d)return false;if(t.category!=='professional')return true;return date===t.originalDate||d.weekday===6;}
function tasksFor(data,s,date){return data.tasks.filter(t=>due(s,t)===date).sort((a,b)=>{const ac=a.originalDate!==date,bc=b.originalDate!==date;return Number(bc)-Number(ac)||a.originalDate.localeCompare(b.originalDate)||a.order-b.order;});}
function stat(data,s,date){const ts=tasksFor(data,s,date),complete=ts.filter(t=>done(s,t)).length;return{total:ts.length,complete,percent:ts.length?Math.round(100*complete/ts.length):0};}
function slots(data,s,t,minDate){const d=data.days.find(d=>d.date>=minDate&&(t.category!=='professional'||d.weekday===6));return d?d.date:'queue';}
function remember(s,label,patches){if(!patches.length)return;s.undo=(s.undo||[]).concat({label,patches}).slice(-15);}
function move(data,s,t,target,reason,at){if(target!=='queue'&&!allowed(data,t,target))throw Error('专业课补做请选择周日；也可以恢复原日期。');const old=rec(s,t),from=due(s,t);if(from===target)return null;const patch={id:t.id,dueDate:old.dueDate??null,moves:old.moves||[]};s.records[t.id]={...old,dueDate:target,moves:[...(old.moves||[]),{from,to:target,reason,at}].slice(-30)};return patch;}
function defer(data,s,ids,minDate,reason='手动顺延',at=new Date().toISOString()){
 const patches=[],results=[];for(const id of ids){const t=data.tasks.find(x=>x.id===id);if(!t||done(s,t))continue;const target=slots(data,s,t,minDate);const patch=move(data,s,t,target,reason,at);if(patch)patches.push(patch);results.push({id,target});}remember(s,'顺延任务',patches);return results;}
function auto(data,s,today,at=new Date().toISOString()){
 if(!s.settings.autoCarry||today<data.start)return[];
 const migrate=s.carryPolicy!==CARRY_POLICY;
 if(!migrate&&s.lastAutoDate===today)return[];
 // Old weekday assignments are consolidated once. A Sunday remains active until it ends.
 const ids=data.tasks.filter(t=>t.category==='professional'&&!done(s,t)&&(
  due(s,t)==='queue'||due(s,t)<today||(migrate&&t.originalDate<today)
 )).sort((a,b)=>a.originalDate.localeCompare(b.originalDate)||a.order-b.order).map(t=>t.id);
 const result=defer(data,s,ids,today,migrate?'按周日补做规则归拢':'未完成自动顺延至周日',at);
 s.carryPolicy=CARRY_POLICY;s.lastAutoDate=today;return result;
}
function setDone(s,t,value,at=new Date().toISOString()){const r=rec(s,t);remember(s,value?'标记完成':'撤销完成',[{id:t.id,done:r.done||false,completedAt:r.completedAt||null}]);s.records[t.id]={...r,done:value,completedAt:value?at:null};}
function undo(s){const action=s.undo?.pop();if(!action)return null;for(const p of action.patches){const r={...(s.records[p.id]||{})};if('done'in p){r.done=p.done;r.completedAt=p.completedAt;}if('dueDate'in p){if(p.dueDate===null)delete r.dueDate;else r.dueDate=p.dueDate;r.moves=p.moves;}s.records[p.id]=r;}return action.label;}
function nextDay(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function assess(data,s,date){const ts=tasksFor(data,s,date).filter(t=>t.category==='professional'&&!done(s,t));const essays=ts.filter(t=>t.kind==='论述题').length;const extra=data.days.find(d=>d.date===date)?.heavyEnglish;return{essays,heavy:essays>=2||extra,carried:ts.filter(t=>t.originalDate!==date).length};}
return{REV,fresh,normalize,rec,due,done,cost,allowed,tasksFor,stat,slots,move,defer,auto,setDone,undo,nextDay,assess};
});

