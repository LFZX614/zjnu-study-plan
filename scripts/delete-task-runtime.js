state={deletedTasks:{},...state};
const deleteInitBase=initV2;initV2=function(){deleteInitBase();state.deletedTasks||={};};
function deletionSource(t){return t.clearSource||t.sourceTaskId||(t.memorySource&&state.memory[t.memorySource]?.taskId)||t.id;}
function taskIsDeleted(t){return !!state.deletedTasks?.[t.id]?.deleted||!!state.deletedTasks?.[deletionSource(t)]?.deleted;}
const deleteAllBase=allTasks;allTasks=function(){return deleteAllBase().filter(t=>!taskIsDeleted(t));};
const deleteOpenBase=openTask;
openTask=function(id){deleteOpenBase(id);const t=currentTask;if(!t||t.id!==id)return;const sourceId=deletionSource(t),original=plan.flat.find(x=>x.id===sourceId)||t;
 $('#task-content').insertAdjacentHTML('beforeend',`<div class="move-section" id="delete-task-section"><h3>删除计划中的任务</h3><p class="tiny">${sourceId!==t.id?'删除原题及其自动复习提醒。':'删除此任务及其自动复习提醒。'}笔记和学习记录保留，可在“备份与设置 → 已删除的任务”恢复。</p><button class="secondary" id="delete-task" data-source="${esc(sourceId)}">${sourceId!==t.id?'删除原题及复习':'删除此任务'}</button><div id="delete-task-confirm"></div></div>`);
};
const deleteSettingsBase=renderSettings;
renderSettings=function(){deleteSettingsBase();state.deletedTasks||={};const deleted=Object.entries(state.deletedTasks).filter(([id,v])=>v?.deleted);$('#main').insertAdjacentHTML('beforeend',`<section class="book" id="deleted-task-list"><h2>已删除的任务</h2><p class="tiny">共${deleted.length}项。恢复后继续保留原笔记、打卡及复习进度。</p>${deleted.map(([id,t])=>`<div class="clear-unit"><b>${esc(t.title)}</b><p class="tiny">${esc(t.course)} · 原安排 ${esc(t.date||'未指定')}</p><button class="secondary" data-restore-task="${esc(id)}">恢复此任务</button></div>`).join('')}</section>`);};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.id==='delete-task'){$('#delete-task-confirm').innerHTML='<p>确认从你的计划中删除这项任务及其自动复习？</p><button class="primary" id="confirm-delete-task">确认删除</button> <button class="secondary" id="cancel-delete-task">取消</button>';}
 if(b.id==='cancel-delete-task')$('#delete-task-confirm').innerHTML='';
 if(b.id==='confirm-delete-task'){const t=currentTask,id=deletionSource(t),source=plan.flat.find(x=>x.id===id)||state.custom.find(x=>x.id===id)||t;state.deletedTasks||={};state.deletedTasks[id]={deleted:true,title:source.title,course:source.course,date:source.date,updatedAt:new Date().toISOString()};save();$('#task-dialog').close();render();toast('任务已删除，可到备份与设置恢复');}
 if(b.dataset.restoreTask){const id=b.dataset.restoreTask;if(state.deletedTasks?.[id]){state.deletedTasks[id]={...state.deletedTasks[id],deleted:false,updatedAt:new Date().toISOString()};save();render();toast('任务已恢复，笔记和学习记录仍保留');}}
});
