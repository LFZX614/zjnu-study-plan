// Explicit daily lessons and recall; keep the original storage and cloud contract.
const clearCourses=new Set(['古代文学','现当代文学','外国文学','文学理论','现代汉语']);
state={clearLearning:{},clearCoverage:{},clearChecks:{},clearMeta:{},...state};
const clearInitBase=initV2;
initV2=function(){clearInitBase();for(const k of ['clearLearning','clearCoverage','clearChecks','clearMeta'])state[k]||={};};
const clearDoneBase=done;
done=function(t){if(t.clearType==='lesson'||t.clearType==='precheck'){const p=state.clearLearning?.[t.id];return !!p?.active&&p.level>=2&&(t.units||[]).every(u=>state.clearCoverage?.[u.id]?.covered);}if(t.clearType==='review')return false;return clearDoneBase(t);};
const clearAllBase=allTasks;
allTasks=function(){
 const today=localDate();let list=clearAllBase().filter(t=>!t.memorySource||!clearCourses.has(t.course)||state.memory[t.memorySource]?.confirmed);
 const ids=new Set(list.map(t=>t.id));
 for(const t of plan.archivedTasks||[])if((state.records[t.id]?.done||state.notes[t.id])&&!ids.has(t.id)){list.push({...adjusted(t),date:state.records[t.id]?.scheduledOn||state.records[t.id]?.completedOn||t.date,role:'原学习记录'});ids.add(t.id);}
 for(const source of plan.flat.filter(t=>['lesson','precheck'].includes(t.clearType))){const p=state.clearLearning[source.id];if(!p?.active)continue;
  if(p.nextDue){const id='clear-recall:'+source.id+':'+p.attempts;list.push({...source,id,date:p.nextDue<today?today:p.nextDue,clearSource:source.id,clearType:'review',type:'复习回顾',role:p.level<2?'薄弱点复测':'到期间隔回忆',dueDate:p.nextDue,title:source.title,detail:'先合书提取，再核对；本组对应教材基础一并检查。实际回忆结果决定下次时间。'});}
  for(const h of p.history||[])if(h.kind==='review'&&!ids.has(h.id)){list.push({...source,id:h.id,date:h.date,clearSource:source.id,clearType:'history',type:'复习回顾',role:'历史回忆记录',detail:'本次回忆表现：'+['没想起','提示后想起','独立说出','能迁移作答'][h.level]+'。记录保留，当前掌握状态以最新回测为准。'});ids.add(h.id);}
 }
 return list;
};
const clearGetBase=getTask;
getTask=function(id){return clearGetBase(id)||(plan.archivedTasks||[]).find(t=>t.id===id);};
function clearSource(t){return plan.flat.find(x=>x.id===(t.clearSource||t.id))||t;}
function clearLabel(t){if(t.clearType==='final')return done(t)?'本次训练已完成':'整卷／订正／回测';if(t.clearType==='history')return '历史尝试';const p=state.clearLearning[t.clearSource||t.id];return !p?.active?'待学习／核查':p.level<2?'回忆不稳，需补学':done(clearSource(t))?'已独立提取，继续复习':'主干已提取，教材基础待补';}
function clearEvidenceHTML(qs){return !qs?.length?'<p class="tiny">本卡含教材框架或理解任务，不声称每个设问均在原卷直接出现。</p>':`<details class="clear-evidence method-block"><summary>本范围相关真题 · ${qs.length}组（不等于今天另背${qs.length}题）</summary><p class="tiny">下列是对应章节的题库，未必与本日主干完全同题。重点主干精背，其余保留提纲与基础核查；有遗漏再补强。</p>${qs.map(q=>`<div class="clear-source"><b>${esc(q.tier==='A'?'重点深化':'曾考掌握')} · ${esc(q.title)}</b><p class="tiny">${esc(plan.clearPlan.methods[q.tier])}</p>${q.evidence.map(e=>`<div>${e.year} · ${esc(e.paper)} · ${esc(e.kind)} · ${esc(e.id)}<br>${esc(e.loc)} · 来源${esc(e.source)}<br>${esc(e.text)}</div>`).join('')}</div>`).join('')}</details>`;}
function clearUnitList(t,interactive=false){const source=clearSource(t),checked=state.clearChecks[t.id]||{};return (source.units||[]).map(u=>`<div class="clear-unit">${interactive?`<label><input type="checkbox" data-clear-unit="${esc(u.id)}" ${checked[u.id]?'checked':''}><span>`:''}<b>${esc(u.book)}｜${esc(u.chapter)}</b>${(source.previousIds||[]).includes(u.id)?'<small>已学核查：先测，未学或不会的再补</small>':''}<small>${esc(u.focus)}</small>${interactive?'</span></label>':''}</div>`).join('');}
const clearOpenBase=openTask;
openTask=function(id){const t=getTask(id);if(!t?.clearType)return clearOpenBase(id);currentTask=t;const source=clearSource(t),history=t.clearType==='history';
 $('#task-content').innerHTML=`<div class="eyebrow">${esc(t.course)} · ${esc(t.role)}</div><h2>${esc(t.title)}</h2><p class="clear-status">${esc(clearLabel(t))}</p>${t.clearType==='review'?`<p>原学习日：${esc(source.date)}；到期日：${esc(t.dueDate)}。先合书提取再核对。</p>`:''}<h3>① 重点要会什么</h3><p>${esc(source.main||source.title)}</p><h3>② 教材读哪里、基础查什么</h3><p class="tiny">每个勾选表示已独立说清本项基础；未学／不会的保留待补。一次打卡不能代替逐项核查。</p>${clearUnitList(t,!history)}${source.basics?`<h3>③ 配套识记与例证</h3><p>${esc(source.basics)}</p>`:''}${source.scope?`<p class="tiny">联系：${esc(source.scope)}</p>`:''}${source.note?`<p class="clear-alert">${esc(source.note)}</p>`:''}${history?`<p>${esc(t.detail)}</p>`:`<div class="clear-assess method-block"><h3>④ 完成后合书检查</h3><label><input type="checkbox" id="clear-recalled"> 已先合书回答主干，再核对缺漏</label><label>本次回忆表现<select id="clear-rating"><option value="">请选择实际表现</option><option value="0">没想起／主要错误</option><option value="1">提示后才想起</option><option value="2">独立说出主干与例证</option><option value="3">能比较、迁移并作答</option></select></label><p class="tiny">不会也可以记录本次尝试，不计为记牢。薄弱项会安排复测；教材基础未通过则保留待补。</p></div>`}<label>笔记与待续位置<textarea id="task-note" placeholder="记下未完成的章、节、分点或例证。">${esc(state.notes[t.id]||'')}</textarea></label>${!history?`<label>实际学习／回忆日期<input type="date" id="completed-on" value="${localDate()}"></label><div class="dialog-actions"><button class="secondary" id="save-note">保存笔记</button><button class="primary" id="clear-submit">记录本次学习与回忆</button></div><div class="move-section"><h3>调整这次任务日期</h3><p class="tiny">移动未学任务不会产生已学记录；后续回忆从实际学习日起算。</p><input type="date" id="move-date" value="${esc(t.date)}"><button class="secondary" id="preview-move">查看改期影响</button><div id="move-preview"></div></div>`:''}${clearEvidenceHTML(source.questionRefs)}`;
 if(!$('#task-dialog').open)$('#task-dialog').showModal();
};
function clearRecord(t){
 if(!$('#clear-recalled')?.checked||$('#clear-rating')?.value===''){toast('请先合书核查，并选择本次回忆表现');return false;}
 const date=completedDate();if(date>localDate()){toast('实际完成日期不能晚于今天');return false;}
 const source=clearSource(t),previous=state.clearLearning[source.id]||{},history=previous.history||[];
 if(history.some(h=>h.date>date)){toast('这项已有更晚的回忆记录，请使用实际最新日期，避免倒排复习');return false;}
 const level=Number($('#clear-rating').value),stamp=new Date().toISOString(),checks=state.clearChecks[t.id]||{};
 for(const u of source.units||[])if(checks[u.id])state.clearCoverage[u.id]={covered:true,firstCovered:state.clearCoverage[u.id]?.firstCovered||date,lastChecked:date,updatedAt:stamp};
 const basics=(source.units||[]).every(u=>state.clearCoverage[u.id]?.covered);
 const independent=level>=2;
 const firstSuccess=previous.firstSuccess||(independent?date:null);
 let stage=previous.stage||0;
 if(!independent)stage=0;else if(firstSuccess&&previous.firstSuccess&&previous.lastSuccess!==date&&t.clearType==='review')stage=Math.min(stage+1,4);
 const gaps=[1,2,4,7,14];let nextDue=shift(date,independent?gaps[stage]:1);
 if(!independent&&t.clearType==='review')nextDue=date;
 if(nextDue>plan.clearPlan.end)nextDue=date<plan.clearPlan.end?plan.clearPlan.end:independent?null:date;
 const event={id:t.id,date,level,kind:t.clearType==='review'?'review':'learn',basics};
 const p={active:true,level,stage,firstAttempt:previous.firstAttempt||date,firstSuccess,lastSuccess:independent?date:previous.lastSuccess||null,attempts:(previous.attempts||0)+1,nextDue,history:[...history,event],updatedAt:stamp};
 state.clearLearning[source.id]=p;
 state.records[t.id]={done:t.clearType==='review'||(independent&&basics),recallLevel:level,completedOn:date,scheduledOn:t.date,scopeVersion:4,updatedAt:stamp};
 if(t.clearType==='review')state.records[source.id]={...state.records[source.id],done:independent&&basics,recallLevel:level,updatedAt:stamp};
 state.notes[t.id]=$('#task-note').value;
 save();$('#task-dialog').close();render();toast(independent?(basics?'已记录独立提取，后续回忆已安排':'主干已记录，教材基础仍有待补项'):'已记录尝试，保留薄弱点复测');return true;
}
const clearToggleBase=toggle;
toggle=function(id){const t=getTask(id);if(t?.clearType)return openTask(id);return clearToggleBase(id);};
const clearPreviewBase=previewHTML;
previewHTML=function(moves){return moves.map(m=>{const t=getTask(m.id);if(!t?.clearType)return clearPreviewBase([m]);return `<div class="move-preview-item"><b>${esc(t.title)}</b><p>${esc(t.date)} → ${esc(m.date)}</p><p class="tiny">${t.clearType==='review'?'只移动本次回忆；实际回测结果决定后续节点。':'移动本次学习目标；已完成的历史和笔记保留。未学内容不会生成已学回忆。'}</p></div>`;}).join('');};
const clearApplyMovesBase=applyMoves;
applyMoves=function(moves){for(const m of moves){const t=getTask(m.id);if(t?.clearType==='review'&&validDate(m.date)){const p=state.clearLearning[t.clearSource];if(p){p.nextDue=m.date;p.updatedAt=new Date().toISOString();}}}clearApplyMovesBase(moves);};
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.clearUnit&&currentTask){const id=currentTask.id;state.clearChecks[id]={...state.clearChecks[id],[el.dataset.clearUnit]:el.checked,updatedAt:new Date().toISOString()};save();}});
document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;if(el.dataset.clearReview)openTask(el.dataset.clearReview);if(el.id==='clear-submit'){e.preventDefault();clearRecord(currentTask);}if(el.id==='clear-weak'){view='plan';sourceDate=plan.clearPlan.start;courseFilter='all';render();}if(el.id==='clear-coverage-link')changeView('books');});
function clearCardHTML(t){const source=clearSource(t),p=state.clearLearning[source.id];return `<article class="clear-card" data-clear-card="${esc(t.id)}"><div class="clear-status">${esc(t.role)} · ${esc(clearLabel(t))}</div><h3>${esc(t.title)}</h3>${t.clearType==='review'?`<p class="tiny">到期日 ${esc(t.dueDate)} · 原学习日 ${esc(source.date)} · 提取主干、例证，并核查对应教材基础</p>`:''}${t.clearType==='history'?`<p>${esc(t.detail)}</p>`:`${source.units?.length?`<h4>教材位置与基础范围</h4>${clearUnitList(t)}`:''}${source.basics?`<h4>配套识记与例证</h4><p>${esc(source.basics)}</p>`:''}${source.note?`<p class="tiny">${esc(source.note)}</p>`:''}<p class="tiny">完成标准：主干能独立作答，基础逐项能解释、对应或举例。未过项明确保留。</p>`}<button class="secondary" data-detail="${esc(t.id)}">${t.clearType==='history'?'查看这次记录':'打开任务 · 核查与记笔记'}</button>${p?.nextDue?`<small class="clear-status"> 下次回忆 ${esc(p.nextDue)}</small>`:''}</article>`;}
const clearSectionBase=section;
section=function(course){if(!clearCourses.has(course)||!plan.clearPlan||selected<plan.clearPlan.start)return clearSectionBase(course);const all=tasks().filter(t=>t.course===course),visible=all.filter(matches),reviews=visible.filter(t=>t.clearType==='review'||t.type==='复习回顾'&&t.clearType!=='history'),history=visible.filter(t=>t.clearType==='history'||t.role==='原学习记录'),learning=visible.filter(t=>!reviews.includes(t)&&!history.includes(t));
 if(!visible.length)return '';
 const html=t=>t.clearType?clearCardHTML(t):taskHTML(t);
 return `<section class="subject" style="--course:${colors[course]}" data-course="${esc(course)}"><div class="subject-header"><span class="course-line"></span><h2>${esc(course)}</h2><span class="subject-count">${all.filter(done).length}/${all.length}</span><button class="add" data-add="${esc(course)}" aria-label="为${esc(course)}添加任务">＋</button></div>${reviews.length?`<h3>先做：到期回忆与薄弱点复测</h3>${reviews.map(html).join('')}`:''}${learning.length?`<h3>当天学习与核查</h3>${learning.map(html).join('')}`:''}${history.length?`<details><summary>历史学习与回忆记录 · ${history.length}项</summary>${history.map(html).join('')}</details>`:''}${!all.length?'<p class="clear-empty">今日没有预设新学；到期回忆仍可跨科出现。</p>':''}</section>`;
};
const clearRenderBase=render;
render=function(){clearRenderBase();if(!plan?.clearPlan)return;
 if(view==='today'){
  const pending=plan.flat.filter(t=>['lesson','precheck'].includes(t.clearType)&&adjusted(t).date<localDate()&&!done(t)),due=tasks().filter(t=>t.clearType==='review'),attempted=plan.flat.filter(t=>t.clearType==='lesson'&&state.clearLearning[t.id]?.active).length;
  const banner=`<section class="clear-banner"><b>全量框架＋重点记牢＋考前完整复习</b><p>先回忆到期内容，再做当天主干和教材基础；不规定单题用时。末尾单元与补漏安排到12月11日，12月12—18日做真题、订正和回测。</p><p>本日到期回忆 ${due.length}组 · 主干已有学习记录 ${attempted}/62组 · ${pending.length?'有'+pending.length+'组过期待续':'未出现过期待续组'}。</p>${pending.length?'<p class="clear-alert">过期待续不会自动算完，也不会静默塞进今天。先补薄弱项，再调整新增，避免只追赶日期。</p>':''}<p class="tiny">未来日期只展示学习目标和已实际产生的回忆；尚未学习的内容不会冒充到期复习。间隔起点为1、3、7、14天，按实际日期及遗忘表现调整；周日保留轻量回忆。</p><div class="clear-tools"><button class="secondary" id="clear-weak">查看待续与调整计划</button><button class="secondary" id="clear-coverage-link">教材与真题核查</button><a href="clear-daily-plan.md" target="_blank" rel="noopener">完整逐日清单</a></div></section>`;
  $('#task-list')?.insertAdjacentHTML('beforebegin',banner+(due.length?`<section class="clear-banner"><h2>先做这些回忆（跨科）</h2><p class="tiny">先看题目合书回忆，再打开核查；薄弱项优先。</p>${due.map(t=>`<p><button class="text-button" data-clear-review="${esc(t.id)}">${esc(t.course)} · ${esc(t.title)}</button></p>`).join('')}</section>`:''));const note=$('#main .section-note');if(note)note.textContent='学习尝试、独立回忆、教材基础覆盖分别记录。未完成项留待续；晚学内容按考前剩余日期安排回测，不假称完成足14天巩固。';
  const resources=$('#main .materials-links');if(resources){const detail=document.createElement('details');detail.className='clear-banner';detail.innerHTML='<summary>补充资料：PDF与配套练习</summary>';resources.replaceWith(detail);detail.appendChild(resources);}
 }
 if(view==='home')$('#main').insertAdjacentHTML('afterbegin','<section class="clear-banner"><b>当前安排：全量框架＋重点记牢＋考前完整复习</b><p>任务完成数不是掌握证明。到“每日清单”完成具体任务，到“教材梳理”检查漏章与真题依据。</p></section>');
};
renderBooks=function(){if(!plan.clearPlan)return;const units=plan.clearPlan.units,qs=plan.clearPlan.questions,books=[...new Set(units.map(u=>u.book))];
 $('#main').innerHTML=`<div class="eyebrow">TEXTBOOK & EXAM MAP</div><h1>教材逐项核查，重点有真题依据。</h1><p class="subtext">12册教材 · ${units.length}个章节／对照单元 · 389条真题记录、349组问法。覆盖表示基础通过核查，记牢另看实际回忆。</p><p>${esc(plan.clearPlan.sourceNote)}</p><p><a href="clear-coverage.md" target="_blank" rel="noopener">查看完整教材与真题对应清单</a> · <a href="clear-reviews.md" target="_blank" rel="noopener">复习与模拟安排</a></p>${books.map(book=>{const us=units.filter(u=>u.book===book);return `<section class="book"><h3>${esc(book)}</h3><p>基础已核查 ${us.filter(u=>state.clearCoverage[u.id]?.covered).length}/${us.length}</p><details><summary>逐章查看教材位置、基础要求和状态</summary>${us.map(u=>{const t=plan.flat.find(t=>t.units?.some(x=>x.id===u.id)),date=t?adjusted(t).date:u.date;return `<div class="clear-unit"><b>${esc(u.chapter)}</b><small>${esc(u.focus)}</small><p class="tiny">${state.clearCoverage[u.id]?.covered?'基础核查已通过；最近核查 '+esc(state.clearCoverage[u.id].lastChecked):'待核查'} · 主干状态：${t?esc(clearLabel(t)):'待安排'}</p><button class="text-button" data-date="${esc(date)}">${esc(date)} · 前往当天任务</button></div>`;}).join('')}</details></section>`;}).join('')}<section class="book"><h2>查真题与分层依据</h2><p>${esc(plan.clearPlan.methods.A)}<br>${esc(plan.clearPlan.methods.B)}</p><label>搜索题干、年份或题号<input class="clear-search" id="clear-question-search" placeholder="例如：新月、史记、2024"></label><div id="clear-question-results"></div></section>${materialsLinks()}`;
 const paint=()=>{const value=$('#clear-question-search').value.trim().toLowerCase(),found=qs.filter(q=>!value||[q.title,...q.evidence.map(e=>e.year+' '+e.id+' '+e.text)].join(' ').toLowerCase().includes(value));$('#clear-question-results').innerHTML=`<p>匹配 ${found.length}组；展开查看原题与来源。</p>`+found.slice(0,40).map(q=>`<details class="clear-source"><summary>${esc(q.tier==='A'?'重点深化':'曾考掌握')} · ${esc(q.title)}</summary><p>对应日期 ${esc(q.rangeDate)} · 教材单元 ${esc(q.unit)}</p>${q.evidence.map(e=>`<p>${e.year} · ${esc(e.paper)} · ${esc(e.id)} · 来源${esc(e.source)}<br>${esc(e.loc)}<br>${esc(e.text)}</p>`).join('')}</details>`).join('')+(found.length>40?'<p class="tiny">先显示40组，请输入关键词缩小范围，或打开完整对应清单。</p>':'');};paint();$('#clear-question-search').addEventListener('input',paint);
};
const clearBooksPaint=renderBooks;
renderBooks=function(){clearBooksPaint();if(plan.clearPlan&&$('#clear-question-results'))$('#clear-question-results').insertAdjacentHTML('beforebegin','<details><summary>真题来源代号与年份口径</summary><ul>'+Object.entries(plan.clearPlan.sources).map(([k,v])=>'<li>'+esc(k)+'：'+esc(v)+'</li>').join('')+'</ul><p class="tiny">题型B：填空／识记；N：名词解释；S：简答；L：论述／分析；R：文学评论。</p></details>');};
const clearSettingsBase=renderSettings;
renderSettings=function(){clearSettingsBase();const rows=$('#main').querySelectorAll('.setting-row'),last=rows[rows.length-1];if(last)last.innerHTML='<div><h3>全量框架、重点记忆与间隔回忆</h3><p>专业课不设置单题分钟数。回忆从实际学习日起排，遗忘后缩短间隔。周日保留轻量回忆。</p><p>学习尝试、主干独立提取和教材基础分别保存；旧记录、笔记和改期保留。完整清单收尾至12月18日。</p></div>';};
