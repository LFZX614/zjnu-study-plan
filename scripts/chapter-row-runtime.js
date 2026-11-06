// Display and assess each row independently while retaining original IDs and notes.
function initialiseChapterRows(){
 const migration=plan?.clearPlan?.rowMigration;if(!migration)return;
 let changed=!state.clearMeta?.[migration.revision];const first=changed;
 const stamp=new Date().toISOString();
 state.clearMeta||={};state.clearMeta[migration.revision]||={updatedAt:stamp};
 const poem='clear-2026-11-09-O';if(first&&state.moves[poem]&&!state.records[poem]?.done)state.moves[poem]={...state.moves[poem],date:'2026-11-06',updatedAt:stamp};
 if(changed)save();
}
const chapterInitBase=initV2;initV2=function(){chapterInitBase();initialiseChapterRows();};
const chapterDoneBase=done;
done=function(t){if(t.rowKind==='chapter'&&t.units?.length){const p=state.clearLearning?.[t.id];return (!p?.active||p.level>=2)&&t.units.every(u=>state.clearCoverage?.[u.id]?.covered);}return chapterDoneBase(t);};
const chapterOpenBase=openTask;
openTask=function(id){chapterOpenBase(id);const t=currentTask;if(!t?.rowKind)return;
 const source=clearSource(t),heading=[...$('#task-content').querySelectorAll('h3')].find(h=>/①/.test(h.textContent));
 if(heading&&!source.examItems?.length){heading.textContent=source.rowKind==='chapter'?'① 本节梳理要求':'① 本项学习要求';heading.insertAdjacentHTML('afterend','<p>'+esc(source.main||source.title)+'</p>');}
 if(source.displayUnit)$('#task-content').querySelector('h2')?.insertAdjacentHTML('afterend',`<p class="task-book-location">${esc(source.displayUnit.book)}<br>${esc(source.displayUnit.chapter)}</p>`);
 if(source.lessonId&&source.lessonId!==source.id&&state.notes[source.lessonId])$('#task-content').insertAdjacentHTML('beforeend','<details class="method-block"><summary>原任务笔记</summary><p>'+esc(state.notes[source.lessonId])+'</p></details>');
};
function chapterRowsHTML(items){
 const groups=new Map();for(const t of items){const u=clearSource(t).displayUnit||t.units?.[0],key=u?.id||t.study?.unit||'other';if(!groups.has(key))groups.set(key,{unit:u,items:[]});groups.get(key).items.push(t);}
 return [...groups.values()].map(g=>`<section class="chapter-row-group" data-chapter="${esc(g.unit?.id||'other')}"><div class="chapter-heading"><div><small>${esc(g.unit?.book||'本日学习')}</small><h3>${esc(g.unit?.chapter||'综合与补漏')}</h3></div></div>${['chapter','question','facts','prior','other'].map(kind=>{const ts=g.items.filter(t=>(t.clearType==='review'?'prior':t.rowKind||'other')===kind);if(!ts.length)return '';return `<h4 class="chapter-row-label">${({chapter:'课本梳理',question:'新学题目',facts:'配套基础',prior:'复习回顾',other:'学习任务'})[kind]}</h4>${ts.map(t=>`<div class="chapter-task-row" data-row-id="${esc(t.id)}" data-row-kind="${esc(kind)}">${taskHTML(t)}<details class="chapter-row-details"><summary>查看要求</summary><p>${esc(clearSource(t).main||t.detail||t.title)}</p><button class="text-button" data-detail="${esc(t.id)}">打开打卡与笔记</button></details></div>`).join('')}`;}).join('')}</section>`).join('');
}
const chapterSectionBase=section;
section=function(course){if(!clearCourses.has(course)||selected<plan.clearPlan.start)return chapterSectionBase(course);
 const items=tasks().filter(t=>t.course===course&&matches(t));if(!items.length)return '';
 const history=items.filter(t=>t.clearType==='history'||t.role==='原学习记录'),active=items.filter(t=>!history.includes(t)),reviews=active.filter(t=>t.type==='复习回顾'),learning=active.filter(t=>t.type!=='复习回顾');
 return `<section class="subject" style="--course:${colors[course]}" data-course="${esc(course)}"><div class="subject-header"><span class="course-line"></span><h2>${esc(course)}</h2><span class="subject-count">${active.filter(done).length}/${active.length}</span><button class="add" data-add="${esc(course)}">＋</button></div>${reviews.length?`<div class="chapter-review-area"><h3>先复习 · 到期回忆与已学核查</h3>${chapterRowsHTML(reviews)}</div>`:''}${learning.length?`<div class="chapter-new-area"><h3>新学与教材梳理</h3>${chapterRowsHTML(learning)}</div>`:''}${history.length?`<details><summary>历史记录 · ${history.length}项</summary>${history.map(taskHTML).join('')}</details>`:''}</section>`;
};
const chapterRenderBase=render;
render=function(){initialiseChapterRows();chapterRenderBase();if(view!=='today')return;
 const banner=[...$('#main').querySelectorAll('.clear-banner')].find(el=>el.querySelector('b')?.textContent==='全量框架＋重点记牢＋考前完整复习');if(banner){const title='全量框架＋重点记牢＋考前完整复习';banner.innerHTML=`<b>${esc(title)}</b><p class="tiny">教材章节分组 · 一题一行 · 梳理与复习分开 · 不规定单题用时</p><details><summary>计划与复习说明</summary><p class="tiny">先做到期回忆，再推进当天内容。回忆按实际学习日期及表现安排；不会的保留复测。12月12—18日留给真题、订正与补漏。</p><button class="text-button" id="clear-weak">查看待续与调整计划</button> · <a href="clear-daily-plan.md" target="_blank">完整清单</a></details>`;}
};
