'use strict';
const E=window.StudyEngine,STORE='zjnu-checkin-v7',OLD='zjnu-study-v1';
let DATA,S,selectedDate,view='today',courseFilter='',onlyOpen=false,storageOK=true,points=null,searchText='',searchCourse='',searchMode='questions',searchPage=0,noteTimer=null;
const $=s=>document.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function today(){const p=new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>p.find(x=>x.type===k).value;return`${v('year')}-${v('month')}-${v('day')}`;}
function label(ds){if(ds==='queue')return'待安排';const d=DATA.days.find(x=>x.date===ds);return`${Number(ds.slice(5,7))}月${Number(ds.slice(8))}日${d?' 周'+'一二三四五六日'[d.weekday]:''}`;}
function clamp(ds){return ds<DATA.start?DATA.start:ds>DATA.end?DATA.end:ds;}
function load(){let raw;try{raw=localStorage.getItem(STORE);S=raw?E.normalize(JSON.parse(raw),DATA):E.fresh();}catch{S=E.fresh();storageOK=false;try{if(raw)localStorage.setItem(STORE+'-recovery',raw);}catch{}}try{const old=JSON.parse(localStorage.getItem(OLD)||'null');if(old?.notes&&!raw)for(const[k,v]of Object.entries(old.notes))if(DATA.days.some(d=>d.date===k)&&typeof v==='string')S.dayNotes[k]=v;}catch{}selectedDate=S.selectedDate||clamp(today());S.selectedDate=selectedDate;}
function save(){clearTimeout(noteTimer);try{localStorage.setItem(STORE,JSON.stringify(S));storageOK=true;}catch{storageOK=false;}paintSave();}
function paintSave(){const el=$('#save-state');if(!el)return;el.textContent=storageOK?'记录已保存到本机':'保存失败，请立即导出备份';el.classList.toggle('save-error',!storageOK);}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function openModal(html){save();$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}function closeModal(){$('#dialog').close();}
function find(id){return DATA.tasks.find(t=>t.id===id);}
function currentDay(){return DATA.days.find(d=>d.date===selectedDate);}
function autoApply(){const migration=S.carryPolicy!=='single-round-v3';E.auto(DATA,S,today());save();if(migration)toast('已更新一轮覆盖与间隔回顾，请导入已确认的五科进度。');}
function setDate(ds){if(!DATA.days.some(d=>d.date===ds))return;save();selectedDate=ds;S.selectedDate=ds;save();render();}
function go(v){save();view=['today','calendar','backlog','knowledge','plan','backup'].includes(v)?v:'today';history.replaceState(null,'','#'+view);render();window.scrollTo({top:0,behavior:'smooth'});}
function nav(){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const queued=DATA.tasks.filter(t=>t.category==='professional'&&!E.done(S,t)&&E.due(S,t)==='queue').length;$('#queue-count').textContent='';}
function render(){if(!DATA)return;nav();$('#content').innerHTML=({today:renderToday,calendar:renderCalendar,backlog:renderBacklog,knowledge:renderKnowledge,plan:renderPlan,backup:renderBackup}[view]||renderToday)();paintSave();paintTimer();}
function controls(){return`<div class="date-controls"><button class="btn small" data-action="prev" aria-label="前一天" ${selectedDate===DATA.start?'disabled':''}>‹</button><input id="date-picker" type="date" value="${selectedDate}" min="${DATA.start}" max="${DATA.end}" aria-label="选择计划日期"><button class="btn small" data-action="next" aria-label="后一天" ${selectedDate===DATA.end?'disabled':''}>›</button><button class="btn small" data-action="today">${today()<DATA.start?'明天':'今天'}</button></div>`;}
function heading(title,sub){return`<div class="heading-row"><div><div class="eyebrow">岸上 / 每日学习打卡</div><h1>${title}</h1><p class="subtitle">${sub}</p></div></div>`;}
function questionsFor(t){return t.questions||(t.reviewOf?find(t.reviewOf):t)?.questions;}
function questionKey(q){return q.kind+'｜'+q.title;}
function cardQuestions(t){
 const q=questionsFor(t);
 if(!q)return '';
 const all=q.priority.concat(q.extra);
 const learned=t.reviewOf?[]:all.filter(x=>E.questionDone(DATA,S,t.course,x.title));
 const checked=E.rec(S,t).checkedQuestions||[];
 const list=items=>'<ol>'+items.map(x=>{
  const previous=learned.includes(x);
  return `<li><label class="question-check"><input type="checkbox" data-question-index="${all.indexOf(x)}" ${previous||checked.includes(questionKey(x))?'checked':''} ${previous?'disabled':''}><span><span class="pill gray">${esc(x.kind)}</span> ${esc(x.title)}</span></label></li>`;
 }).join('')+'</ol>';
 const pending=all.filter(x=>!learned.includes(x));
 let main=q.priority.filter(x=>!learned.includes(x));
 if(!main.length)main=pending.slice(0,2);
 const extra=pending.filter(x=>!main.includes(x));
 const title=t.reviewOf?'闭卷回忆这些题':t.level==='C'?'今天先查这几题':'本专题未完成的题';
 return '<div class="question-list">'+(t.book?'<p class="muted">'+esc(t.book)+' · 教材顺序</p>':'')+
  (main.length?'<strong>'+title+'</strong>'+list(main):'<p>列出的题目已有完成记录，可闭卷验收后勾选专题。</p>')+
  (extra.length?'<details><summary>更多考法 · '+extra.length+'题</summary>'+list(extra)+'</details>':'')+
  (learned.length?'<details><summary>旧记录已完成 · '+learned.length+'题</summary>'+list(learned)+'</details>':'')+'</div>';
}
function dailyTaskText(t){
 const detail=t.title.replace(/^(下午|晚间)[：:]/,'');
 if(t.originalDate==='2026-11-04'){
  if(t.kind==='附加题型')return {title:'英语一完形填空 1 篇',detail:'完成一整篇英语一真题完形填空，订正并记录错因。'};
  if(t.kind==='新词')return {title:'学习新词 100–200 个'};
  if(t.kind==='网课')return {title:'政治网课：马原 1 节',detail:'徐涛网课，从上次停下的位置接着看。'};
  if(t.kind==='回顾')return {title:'政治背诵：马原专题一至三'};
 }
 if(t.kind==='旧词'||t.kind==='新词')return {title:detail};
 if(t.kind==='阅读')return {title:detail.startsWith('重做')?'英语一阅读：重做旧真题 1 篇':'英语一真题阅读 1 篇',detail};
 if(t.kind==='选择题'){
  const count=detail.replace('肖1000题','').match(/(\d+)[题道]/)?.[1];
  return {title:'肖1000题：'+(/^(重做|只看)/.test(detail)?'旧错题':'练习与订正')+(count?' '+count+' 题':''),
   detail:detail+' 把错因整理进笔记。'};
 }
 if(t.kind==='网课'){
  const review=/回看|只看/.test(detail.split('；')[0]);
  const count=detail.match(/(\d+)节/)?.[1];
  return {title:'政治网课：'+(review?'回看已学内容':'接着看当前章节')+(count?' '+count+' 节':''),detail};
 }
 if(t.kind==='背诵')return {title:'政治背诵：'+detail.replace(/^(肖秀荣)?背诵手册[：:]/,'').split(/[。；]/)[0],detail};
 if(t.kind==='回顾')return {title:'政治回顾：'+(detail.startsWith('不新增背诵')?'口头回想 2 个核心点':detail.split(/[；。]/)[0]),detail};
 return {title:(t.kind==='附加题型'?'附加练习：':'')+detail.split(/[；。]/)[0],detail};
}
function taskCard(t){const r=E.rec(S,t),isDone=E.done(S,t),scheduled=E.due(S,t),moved=scheduled!==t.originalDate;const professional=t.category==='professional';const daily=professional||t.category==='reading'?null:dailyTaskText(t);const title=t.reviewOf?'[复习] '+t.title:daily?.title||t.title;let meta=professional?(t.reviewDay?(moved?'往周复盘补做':'本日原定复盘'):`${t.phase===1?'主干推进':'复习候选'}`):t.habit?'每日任务':'专项训练';if(t.module)meta=t.reviewOf?(t.legacy?'旧打卡 · ':'')+(t.fixedDate?'约定回顾':'第'+t.interval+'天节点'):r.inProgress&&!isDone?'续学 · 学习中':'新学 · 专题首遍';const at=r.completedAt?new Date(r.completedAt).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'}):'';const notePlaceholder=t.kind==='网课'?'例如：徐涛马原第几章第几节，看到哪里；今天没懂的点…':t.course==='政治'?'例如：1000题章节、题号；手册背到哪里；易错选项…':t.course==='英语一'?'例如：真题年份与篇号、错题原因、单词或作文修改…':'例如：笔记页码、漏掉的要点、易混点、下次要补的例证…';
return`<article class="task-card ${isDone?'done':''} ${moved?'carried':''}" data-task-id="${t.id}"><button class="task-check" data-check="${t.id}" aria-label="${isDone?'撤销完成':'完成'}：${esc(title)}" aria-pressed="${isDone}">${isDone?'✓':''}</button><div><div class="task-meta"><span class="pill">${esc(t.kind)}</span><span class="pill gray">${esc(meta)}</span>${moved?`<span class="pill amber">${professional?(isDone?'已完成记录':'补做移入'):'已顺延'}</span>`:''}</div><h3>${esc(title)}</h3>${daily?.detail&&daily.detail!==title?`<details class="muted"><summary>做法与订正要求</summary><p>${esc(daily.detail)}</p></details>`:''}${cardQuestions(t)}${t.guide?'<p class="muted">'+esc(t.guide)+'</p>':''}${t.reviewOf?'<p class="muted">先合上资料回忆要点，再核对遗漏。'+(E.reviewReady(DATA,S,t)?'':'首遍完成后可以打卡。')+'</p>':''}${moved?`<div class="origin">原定 ${esc(label(t.originalDate))} → ${esc(label(scheduled))}</div>`:''}<div class="task-actions">${t.module&&!t.reviewOf&&!isDone?`<button class="quiet small" data-progress="${t.id}">${r.inProgress?'取消学习中':'标记学习中'}</button>`:''}${isDone?`<span class="complete-label">✓ 已完成${r.learnedBefore?' · 首遍日期待补':''}${at?' · '+esc(at):''}</span>`:`<button class="btn small" data-defer="${t.id}">顺延${professional?'到有空位的工作日':'到下一天'}</button><button class="quiet small" data-move="${t.id}">选择日期</button>`}${moved?`<button class="quiet small" data-original="${t.id}">恢复原日期</button>`:''}</div><label class="task-note-label" for="note-${t.id}"><span>任务备注</span><span class="note-status">${r.note?'已保存':'自动保存'}</span></label><textarea id="note-${t.id}" class="task-note ${r.note?'has-note':''}" data-note="${t.id}" rows="2" maxlength="20000" placeholder="${esc(notePlaceholder)}">${esc(r.note||'')}</textarea></div></article>`;}
function compareTextbookOrder(a,b){
 const chapter=t=>(t.reviewOf?find(t.reviewOf):t)?.bookOrder??Infinity;
 const first=chapter(a),second=chapter(b);
 if(first!==second)return first-second;
 return (a.interval||0)-(b.interval||0)||a.order-b.order;
}
function groups(tasks){if(!tasks.length)return'<div class="empty">当前筛选下没有任务。可以切换科目或显示已完成任务。</div>';const dayCourses=currentDay()?.subjects||[];const rank=course=>dayCourses.includes(course)?dayCourses.indexOf(course):dayCourses.length;const courses=[...new Set(tasks.map(t=>t.course))].sort((a,b)=>rank(a)-rank(b));return courses.map(c=>{const list=tasks.filter(t=>t.course===c),politicsOrder=['网课','选择题','背诵','回顾'];if(c==='政治')list.sort((a,b)=>politicsOrder.indexOf(a.kind)-politicsOrder.indexOf(b.kind));else if(list[0].category==='professional')list.sort(compareTextbookOrder);const complete=list.filter(t=>E.done(S,t)).length;return`<section class="task-group"><div class="group-heading"><h2>${esc(c)}</h2><span>完成 ${complete} / ${list.length}</span></div>${list.map(taskCard).join('')}</section>`;}).join('');}
function sundaySections(tasks,all){
 const bucket=t=>t.category!=='professional'?'daily':t.originalDate!==selectedDate?'catchup':'review';
 const sections=[
  ['catchup','未完成任务补做','这里只列尚未打卡完成的欠题；完成后移入下方“已完成记录”，不再占用补做列表。'],
  ['review','本日原定复盘','这些是原计划的复盘任务，和之前首次学习的完成记录分开；先补欠，有余力再复盘。'],
  ['daily','英语与政治','按当天安排完成。']
 ];
 const scope=all.filter(t=>!courseFilter||t.course===courseFilter);
 return sections.map(([key,title,description])=>{
  const total=scope.filter(t=>bucket(t)===key),visible=tasks.filter(t=>bucket(t)===key&&(key==='daily'||!E.done(S,t)));if(key==='daily'&&!total.length)return'';
  const complete=total.filter(t=>E.done(S,t)).length;
  return `<section data-task-section="${key}"><div class="panel"><div class="group-heading"><h2>${title}</h2><span>完成 ${complete} / ${total.length}</span></div><p>${description}</p></div>${visible.length?groups(visible):'<div class="empty">'+(total.length?'当前筛选下没有未完成任务。':'今天没有这类任务。')+'</div>'}</section>`;
 }).join('')+(!onlyOpen&&scope.some(t=>t.category==='professional'&&E.done(S,t))?`<details data-task-section="completed"><summary>已完成记录 · ${scope.filter(t=>t.category==='professional'&&E.done(S,t)).length}项（展开查看）</summary><p class="muted">已完成任务只保留在这里，可查看备注或撤销完成，不再列入补做和待复盘列表。</p>${groups(scope.filter(t=>t.category==='professional'&&E.done(S,t)))}</details>`:'');
}
function restDay(tasks){const seen=new Set();const learned=DATA.tasks.filter(t=>t.category==='professional'&&E.done(S,t)&&E.rec(S,t).completedAt&&E.rec(S,t).completedAt.slice(0,10)<=selectedDate&&E.rec(S,t).completedAt.slice(0,10)>=new Date(new Date(selectedDate+'T12:00:00Z').getTime()-6*86400000).toISOString().slice(0,10)).filter(t=>{const k=t.course+'|'+t.title;if(seen.has(k))return false;seen.add(k);return true;}).slice(-2);return '<section class="panel"><h2>自愿回忆 · 可以跳过</h2><p>'+ (learned.length?learned.map(t=>esc(t.course+'：'+t.title)).join('<br>'):'本周暂无已打卡题目，今天安心休息。')+'</p><p>只回忆要点即可，疲惫时直接休息，不用补做。</p></section>'+groups(tasks.filter(t=>t.category!=='professional'||selectedDate<'2026-11-03'));}
function renderToday(){const d=currentDay(),all=E.tasksFor(DATA,S,selectedDate),p=E.stat(DATA,S,selectedDate),totalDone=DATA.tasks.filter(t=>E.done(S,t)).length,assess=E.assess(DATA,S,selectedDate),index=DATA.days.indexOf(d)+1;let tasks=all.filter(t=>(!courseFilter||t.course===courseFilter)&&(!onlyOpen||!E.done(S,t)));const movedOut=DATA.tasks.filter(t=>t.originalDate===selectedDate&&E.due(S,t)!==selectedDate).length;
if(!S.confirmedProgress){
 return heading('请先导入已确认的五科进度','校准各科已学范围后，从未完成的小节续学，避免重复安排已背内容。')+
 '<section class="panel"><p>请导入「岸上-五科实际进度与一轮复习导入.json」，新学与回顾会按你确认的进度重新计算。</p><button class="btn primary" data-action="import">导入五科进度</button></section>'+
 groups(tasks.filter(t=>t.category!=='professional'));
}
let html=`<div class="heading-row"><div><div class="eyebrow">${esc(label(selectedDate))} / 减量计划</div><h1>${today()<DATA.start?'从明天，开始打卡。':selectedDate===today()?'今天，一项一项完成。':'把这一页，慢慢完成。'}</h1><p class="subtitle">新学每天最多3个模块；回顾先闭卷，每项约3—5分钟，每天回顾合计最多20分钟。实际打卡后重新计算间隔。</p></div>${controls()}</div><section class="hero"><div><span class="pill">${d.light?'轻量复盘日':d.weekday===6?'周日休息':'按容量推进'}</span><h2>${d.weekday===6?'今天留给休息':esc(d.subjects.join(' ＋ '))}</h2><p>一轮覆盖全部重难点，短时回顾单独计量；周日休息。</p></div><div class="hero-number">${String(index).padStart(2,'0')}<small> / 51</small></div></section><div class="stats"><div class="stat"><span class="label">今天完成</span><strong>${p.complete}<small> / ${p.total} 项</small></strong><div class="progress"><span style="width:${p.percent}%"></span></div></div><div class="stat"><span class="label">移入 / 移出</span><strong>${assess.carried}<small> / ${movedOut} 项</small></strong><span class="label">顺延保留原日期</span></div><div class="stat"><span class="label">累计完成记录</span><strong>${totalDone}<small> 项</small></strong><span class="label">原题库含后两轮候选，不要求清空</span></div></div>`;
if(today()<DATA.start)html+='<div class="notice">计划从10月29日开始，当前展示明天的任务，今天不要求补打卡。</div>';
if(assess.heavy)html+=`<div class="notice warn">${d.heavyEnglish?'今天有英语分段综合训练，自动补背不会再往今天追加。':'今天有多份论述任务。主科先背框架，辅科以概念和例证为主；已经熟练的复盘题抽背通过即可。'}</div>`;
if(d.weekday===6)html+=`<div class="notice">今天不安排专业课新背或补欠。至少留半天完整休息；下方已背内容仅供自愿回忆，不打卡、不形成欠账。作品阅读可自由回看一段，不计入今天的任务。</div>`;
if(selectedDate==='2026-11-03')html+='<div class="notice">今天专题安排：现当代文学以现代新诗为主，另安排自叙传抒情小说，文学理论照常。</div>'; else html+='<div class="notice">导入已确认的五科进度后续学，12月10日前完成首遍。第1、3、7、14天为回顾目标，按每天20分钟额度分散；先保证新学后的首次回顾，旧内容每天最多1项。<button class="quiet small" data-action="go-plan">查看规则 →</button></div>';
html+=`<div class="toolbar"><div class="filters"><select id="course-filter" aria-label="筛选科目"><option value="">全部科目</option>${['古代文学','现当代文学','外国文学','文学理论','现代汉语','英语一','政治','作品阅读'].map(c=>`<option ${courseFilter===c?'selected':''}>${c}</option>`).join('')}</select><label class="check-label"><input id="only-open" type="checkbox" ${onlyOpen?'checked':''}>只看未完成</label></div><div class="row"><button class="btn small" data-action="defer-day">本日未完另行安排</button><button class="quiet small" data-action="undo" ${S.undo?.length?'':'disabled'}>撤销上一步</button></div></div>${d.weekday===6?restDay(tasks):selectedDate<'2026-11-04'?groups(tasks):[['新学与续学',t=>t.category==='professional'&&!t.reviewOf],['到期复习',t=>t.reviewOf&&E.reviewReady(DATA,S,t)],['预计回顾 · 首遍完成后校准',t=>t.reviewOf&&!E.reviewReady(DATA,S,t)],['英语一',t=>t.category==='english'],['政治',t=>t.category==='politics'],['作品阅读 · 10–15 分钟',t=>t.category==='reading']].map(([title,match])=>'<section><h2>'+title+'</h2>'+groups(tasks.filter(match))+'</section>').join('')}<section class="panel"><h3>当天补充记录</h3><textarea class="task-note day-note" data-day-note="${selectedDate}" maxlength="20000" placeholder="记今天整体进度或明天最要紧的一件事。每项任务自己的批注写在对应卡片下方。">${esc(S.dayNotes[selectedDate]||'')}</textarea><p class="backup-note">打卡和备注保存在当前浏览器。换手机或浏览器时，请先导出，再导入备份。</p></section>`;return html;}
function renderCalendar(){let html=heading('51天，每一步都看得见。','点击日期进入当天打卡；格子显示调整后的任务进度，顺延不会丢失原记录。');for(const month of ['2026-10','2026-11','2026-12']){const ds=DATA.days.filter(d=>d.date.startsWith(month));html+=`<h2 class="month-heading">${Number(month.slice(5))}月</h2><div class="calendar-grid">${'一二三四五六日'.split('').map(x=>`<div class="weekday">周${x}</div>`).join('')}${'<span class="blank"></span>'.repeat(ds[0].weekday)}`;for(const d of ds){const p=E.stat(DATA,S,d.date),moved=DATA.tasks.filter(t=>t.originalDate===d.date&&E.due(S,t)!==d.date).length;html+=`<button class="calendar-day ${selectedDate===d.date?'active':''} ${d.light?'light':''}" data-date="${d.date}" aria-label="${esc(label(d.date))} 完成${p.complete}项，共${p.total}项"><strong>${Number(d.date.slice(8))}</strong><small>${d.weekday===6?'休息日':d.subjects.map(x=>({'古代文学':'古代','现当代文学':'现当代','外国文学':'外国','文学理论':'文论','现代汉语':'现汉'}[x])).join('＋')}</small><small>减量计划 · ${p.complete}/${p.total}</small>${moved?`<small>移出${moved}项</small>`:''}<div class="progress"><span style="width:${p.percent}%"></span></div></button>`;}html+='</div>';}return html;}
function renderBacklog(){const pending=DATA.tasks.filter(t=>t.module&&!E.done(S,t)&&E.due(S,t)==='queue'&&(!t.reviewOf||E.reviewReady(DATA,S,t)));return heading('待安排','考前额度不足的专题和复习节点保留在这里。')+groups(pending);}
function renderKnowledge(){const list=searchMode==='questions'?DATA.questions:(points||[]),filtered=list.filter(q=>{const c=q.subjectName||q.subject;return(!searchCourse||c===searchCourse)&&(!searchText||JSON.stringify(q).toLowerCase().includes(searchText.toLowerCase()));}),per=20,start=searchPage*per;let html=heading('考点与真题，仍然在这里。','保留原有真题记录与笔记考点库。每日打卡题是最新文档的整合问法，不因此认定为原卷逐字题干。');html+=`<form id="search-form" class="toolbar"><div class="filters"><select name="mode" aria-label="查询类型"><option value="questions" ${searchMode==='questions'?'selected':''}>真题记录</option><option value="points" ${searchMode==='points'?'selected':''}>笔记考点</option></select><select name="course" aria-label="查询科目"><option value="">全部专业课</option>${['古代文学','现当代文学','外国文学','文学理论','现代汉语'].map(c=>`<option ${searchCourse===c?'selected':''}>${c}</option>`).join('')}</select><input name="text" placeholder="搜索作家、题目或概念" value="${esc(searchText)}" aria-label="搜索考点"><button class="btn primary" type="submit">查询</button></div></form><p class="muted">找到${filtered.length}条${searchMode==='points'&&!points?'，正在读取笔记考点…':''}</p><div class="search-results">`;
html+=filtered.slice(start,start+per).map(q=>`<article class="result-card"><span class="pill">${esc(q.subjectName||q.subject)}</span> <span class="pill gray">${esc(searchMode==='questions'?`${q.year||'年份待核'} · ${({'N':'名词解释','S':'简答','L':'论述','B':'基础识记','R':'评论'}[q.kind]||q.kind)}`:q.grade||'笔记整理')}</span><p>${esc(q.text)}</p><small>${esc(searchMode==='questions'?`${q.id} · ${q.topic} · ${q.year_status||''} · ${q.loc||''}`:`${q.topic} · ${q.source} · ${q.loc}`)}</small></article>`).join('');html+=`</div><div class="pagination"><button class="btn small" data-action="search-prev" ${searchPage===0?'disabled':''}>上一页</button><span>${searchPage+1} / ${Math.max(1,Math.ceil(filtered.length/per))}</span><button class="btn small" data-action="search-next" ${start+per>=filtered.length?'disabled':''}>下一页</button></div>`;return html;}
function renderPlan(){
 const first=DATA.tasks.filter(t=>t.module&&!t.reviewOf),pending=first.filter(t=>!E.done(S,t));
 const queued=pending.filter(t=>E.due(S,t)==='queue');
 const last=pending.filter(t=>E.due(S,t)!=='queue').map(t=>E.due(S,t)).sort().at(-1);
 return heading('一轮覆盖与间隔回顾','导入实际进度后，按教材顺序续学。')+
 '<section class="panel"><h2>首遍与截止日</h2><p>共 '+first.length+' 个模块，已学 '+(first.length-pending.length)+' 个，剩余 '+pending.length+' 个。'+(queued.length?'有 '+queued.length+' 个超出当前容量，需要调整。':'剩余模块均已排入日历，预计首遍结束于 '+esc(label(last||today()))+'。')+'</p><p>12 月 10 日前完成剩余首遍，12 月 11—18 日主要用于回顾与补漏。新学严格按当天两门主科安排，每天最多 3 个模块，单科按教材顺序推进；若落后则启用最后一周补漏位置，最迟排到12月17日。大专题需用提纲和例证完成，不以题数代替实际学习。</p></section>'+
 '<section class="panel"><h2>间隔回顾</h2><p>首遍当天闭卷自测，再按实际完成日后的第 1、3、7、14 天安排短时回顾。每项约 3—5 分钟，每天合计最多 20 分钟。昨天刚学完的第1天回顾优先；旧内容从次日起每天最多穿插1项。周日休息，节点移到下一个有空位的工作日。考后的节点省略，12 月 10 日学完的模块仍可在考前完成第 1、3、7 天回顾。</p><p>未来的回顾卡先按预计学习日显示；首遍实际打卡后重新计算。近期节点优先，时间不足的较远节点留作后续薄弱点回顾。已背但日期不详的内容以 11 月 5 日作为回顾起点，完成日期保持待补。复习答不出时用任务备注记薄弱点，下一次先回忆该点。</p></section>';
}
function hasLegacy(){
 try{return Boolean(localStorage.getItem(OLD));}
 catch{return false;}
}
function renderBackup(){const records=Object.values(S.records),notes=records.filter(r=>r.note).length,complete=records.filter(r=>r.done).length;return heading('把学习记录，好好留下。','不需要登录。记录属于当前浏览器，换设备时用备份转移；网站不会把批注上传到公开仓库。')+`<section class="panel"><h2>当前记录</h2><p>已完成 ${complete} 项任务，${notes} 项任务有备注。当前计划10月29日至12月18日，共51天。</p><div class="row"><button class="btn primary" data-action="export">导出全部打卡与备注</button><button class="btn" data-action="import">导入备份</button></div><p class="backup-note">请把下载的JSON文件保存在自己能找到的位置。无痕模式、清理网站数据或更换浏览器，都可能使本机记录不可用。</p></section><section class="panel"><h2>旧版记录</h2><p>${hasLegacy()?'检测到旧版学习记录，原记录已经保留。由于最新题单的日期与题目改变，旧打卡不会直接转成新题的完成状态。旧的日期笔记可在“当天补充记录”中继续查看。':'本浏览器没有检测到旧版记录。新旧版本使用各自记录，旧数据不会被新版覆盖。'}</p><button class="btn" data-action="export-old" ${hasLegacy()?'':'disabled'}>导出旧版原始记录</button></section><section class="panel"><h2>自动顺延设置</h2><label class="check-label"><input id="auto-carry" type="checkbox" ${S.settings.autoCarry?'checked':''}>跨天按减量额度重新分配</label><p class="backup-note">开启后未完成内容重新分配至有容量的工作日；关闭后保留日期。周日始终不接收新背或补欠。</p></section>`;}
function download(name,object){save();const blob=new Blob([JSON.stringify(object,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function exportAll(){if(!DATA||!S)return;download(`岸上打卡备份-${today()}.json`,{...S,exportedAt:new Date().toISOString()});toast('备份已开始下载，包含全部任务备注。');}
function moveDialog(t){const min=E.nextDay(E.due(S,t)==='queue'?selectedDate:E.due(S,t)),suggest=E.slots(DATA,S,t,min),valid=DATA.days.filter(d=>E.allowed(DATA,t,d.date,S));openModal(`<h2>调整任务日期</h2><p>${esc(t.course)} · ${esc(t.title)}</p><p class="backup-note">原定 ${esc(label(t.originalDate))}。只改变这一次的日期，备注与完成记录保留。</p><select id="move-target" class="field" aria-label="目标日期"><option value="queue" ${suggest==='queue'?'selected':''}>保留待安排，不放入日期</option>${valid.map(d=>`<option value="${d.date}" ${d.date===suggest?'selected':''}>${esc(label(d.date))}${d.heavyEnglish?' · 英语任务较集中':''}</option>`).join('')}</select><button class="btn primary" data-confirm-move="${t.id}">保存新日期</button>`);}
function flushNotes(){if(noteTimer)save();}
document.addEventListener('input',ev=>{const el=ev.target;if(el.matches('[data-note]')){const id=el.dataset.note;if(!find(id))return;S.records[id]={...(S.records[id]||{}),note:el.value};el.classList.toggle('has-note',!!el.value);const status=el.parentElement.querySelector('.note-status');if(status)status.textContent='正在保存…';clearTimeout(noteTimer);noteTimer=setTimeout(()=>{save();if(status)status.textContent=storageOK?'已保存':'保存失败，请备份';},250);}else if(el.matches('[data-day-note]')){S.dayNotes[el.dataset.dayNote]=el.value;clearTimeout(noteTimer);noteTimer=setTimeout(save,250);}});
document.addEventListener('focusout',ev=>{if(ev.target.matches('[data-note],[data-day-note]'))save();});
document.addEventListener('change',ev=>{const el=ev.target;if(el.id==='date-picker')setDate(el.value);if(el.id==='course-filter'){courseFilter=el.value;render();}if(el.id==='only-open'){onlyOpen=el.checked;render();}if(el.id==='auto-carry'){S.settings.autoCarry=el.checked;S.lastAutoDate=null;save();if(el.checked)autoApply();render();}});
document.addEventListener('change',ev=>{
 const input=ev.target;
 if(!input.matches('[data-question-index]'))return;
 const t=find(input.closest('[data-task-id]').dataset.taskId);
 const q=questionsFor(t);
 const question=q?.priority.concat(q.extra)[Number(input.dataset.questionIndex)];
 if(!question)return;
 const record=E.rec(S,t),key=questionKey(question);
 const checked=new Set(record.checkedQuestions||[]);
 if(input.checked)checked.add(key);else checked.delete(key);
 S.records[t.id]={...record,checkedQuestions:[...checked]};
 save();
});
document.addEventListener('submit',async ev=>{if(ev.target.id!=='search-form')return;ev.preventDefault();const f=new FormData(ev.target);searchText=String(f.get('text')||'').trim();searchCourse=String(f.get('course')||'');searchMode=String(f.get('mode')||'questions');searchPage=0;if(searchMode==='points'&&!points){render();try{const r=await fetch('points.json?v=11-light');if(!r.ok)throw Error();points=await r.json();}catch{toast('笔记考点暂时读取失败，请稍后重试。');}}render();});
document.addEventListener('click',ev=>{const el=ev.target.closest('button,a[data-action],a.brand');if(!el||!DATA)return;try{
 if(el.matches('a.brand')){ev.preventDefault();go('today');return;}
 if(el.matches('[data-view]')){go(el.dataset.view);return;}
 if(el.matches('[data-date]')){setDate(el.dataset.date);go('today');return;}
 if(el.matches('[data-check]')){flushNotes();const t=find(el.dataset.check);if(t.reviewOf&&!E.reviewReady(DATA,S,t)&&!E.done(S,t)){toast('请先完成对应专题的首遍。');return;}E.setDone(S,t,!E.done(S,t));if(t.module){S.lastAutoDate=null;autoApply();}save();render();return;}
 if(el.matches('[data-progress]')){flushNotes();const t=find(el.dataset.progress),r=E.rec(S,t);S.records[t.id]={...r,inProgress:!r.inProgress};S.lastAutoDate=null;autoApply();render();return;}
 if(el.matches('[data-defer]')){const t=find(el.dataset.defer),from=E.due(S,t),min=E.nextDay(from==='queue'?selectedDate:from);const result=E.defer(DATA,S,[t.id],min);save();render();toast(result[0]?.target==='queue'?'考前没有合适空位，已保留在待安排区。':`已顺延到${label(result[0].target)}，备注保留。`);return;}
 if(el.matches('[data-move]')){moveDialog(find(el.dataset.move));return;}
 if(el.matches('[data-confirm-move]')){const t=find(el.dataset.confirmMove),target=$('#move-target').value;const patch=E.move(DATA,S,t,target,'手动指定日期',new Date().toISOString());if(patch)S.undo=(S.undo||[]).concat({label:'调整日期',patches:[patch]}).slice(-15);save();closeModal();render();toast('日期已更新，备注保留。');return;}
 if(el.matches('[data-original]')){const t=find(el.dataset.original),patch=E.move(DATA,S,t,t.originalDate,'恢复原日期',new Date().toISOString());if(patch)S.undo=(S.undo||[]).concat({label:'恢复原日期',patches:[patch]}).slice(-15);save();render();return;}
 if(el.classList.contains('dialog-close')){closeModal();return;}
 const action=el.dataset.action;
 if(action==='prev'||action==='next'){const i=DATA.days.findIndex(d=>d.date===selectedDate),d=DATA.days[i+(action==='next'?1:-1)];if(d)setDate(d.date);}
 if(action==='today')setDate(clamp(today()));
 if(action==='undo'){const label=E.undo(S);save();render();toast(label?'已撤销：'+label:'没有可撤销的操作。');}
 if(action==='defer-day'){const ids=E.tasksFor(DATA,S,selectedDate).filter(t=>t.category==='professional'&&!E.done(S,t)).map(t=>t.id);if(!ids.length){toast('当天没有未完成的专业课题目。');return;}const result=E.defer(DATA,S,ids,E.nextDay(selectedDate),'整天未完成背诵顺延');save();render();toast(`已处理${result.length}项，${result.filter(x=>x.target==='queue').length}项保留待安排；可撤销。`);}
 if(action==='schedule-queue'){S.lastAutoDate=null;const ids=DATA.tasks.filter(t=>t.category==='professional'&&!E.done(S,t)&&(E.due(S,t)==='queue'||E.due(S,t)<today())).map(t=>t.id);E.defer(DATA,S,ids,clamp(today()),'重新安排待补');save();render();toast('已按工作日容量安排，周日留空。');}
 if(action==='go-plan')go('plan');
 if(action==='export')exportAll();if(action==='import')$('#import-file').click();
 if(action==='export-old'){try{download('岸上旧版学习记录.json',JSON.parse(localStorage.getItem(OLD)));}catch{toast('旧记录读取失败，未修改原数据。');}}
 if(action==='search-prev'&&searchPage>0){searchPage--;render();}
 if(action==='search-next'){searchPage++;render();}
 if(action==='confirm-import'){const incoming=window.pendingImport;if(!incoming)return;for(const[id,r]of Object.entries(incoming.records)){const local=S.records[id];if(!local)S.records[id]=r;else S.records[id]={...r,...local,done:!!(local.done||r.done),note:local.note||r.note||'',inProgress:!!(local.inProgress||r.inProgress),checkedQuestions:[...new Set([...(r.checkedQuestions||[]),...(local.checkedQuestions||[])])],completedAt:local.done&&local.completedAt?local.completedAt:r.completedAt||local.completedAt||null,...(!local.done&&(r.done||r.moves?.at(-1)?.to===r.dueDate)?{dueDate:r.dueDate,moves:r.moves}:{})};}for(const[k,v]of Object.entries(incoming.dayNotes))if(!S.dayNotes[k])S.dayNotes[k]=v;window.pendingImport=null;if(incoming.confirmedProgress)S.confirmedProgress=incoming.confirmedProgress;S.carryPolicy=null;S.progressProfile=null;S.lastAutoDate=null;save();closeModal();autoApply();render();toast('备份已合并，本机已有备注保留。');}
 }catch(error){toast(error.message||'操作暂未完成，请先导出备份。');}});
$('#quick-export').addEventListener('click',exportAll);
$('#import-file').addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>25*1024*1024)throw Error('备份过大，请确认文件。');const incoming=E.normalize(JSON.parse(await file.text()),DATA);window.pendingImport=incoming;openModal(`<h2>合并学习备份</h2><p>这份备份包含${Object.values(incoming.records).filter(x=>x.done).length}项完成记录、${Object.values(incoming.records).filter(x=>x.note).length}项任务备注。</p><p>本机已有备注与日期安排保留，缺少的记录从备份补入；完成状态取两份中已完成的一份。</p><div class="row"><button class="btn" data-action="export">先导出本机备份</button><button class="btn primary" data-action="confirm-import">合并这份备份</button></div>`);}catch(e){toast(e.message||'备份无法读取，当前记录没有改变。');}finally{ev.target.value='';}});
function paintTimer(){const b=$('#focus-btn');if(!b)return;if(!S?.timer){b.textContent='专注90分钟';return;}const left=Math.max(0,Math.ceil((S.timer.end-Date.now())/1000));b.textContent=`${S.timer.mode==='focus'?'专注':'休息'} ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} · 点击停止`;if(left===0){const m=S.timer.mode;S.timer=null;save();toast(m==='focus'?'90分钟到了，起身休息约15分钟。':'休息结束，按精力继续下一项。');}}
$('#focus-btn').addEventListener('click',()=>{if(S.timer){S.timer=null;save();paintTimer();return;}openModal('<h2>按自己的节奏专注</h2><p>约90分钟学习后休息一次，不自动开始下一轮。</p><div class="row"><button class="btn primary" id="start-focus">专注90分钟</button><button class="btn" id="start-break">休息15分钟</button></div>');$('#start-focus').onclick=()=>startTimer('focus',90);$('#start-break').onclick=()=>startTimer('break',15);});
function startTimer(mode,min){S.timer={mode,end:Date.now()+min*60000};save();closeModal();paintTimer();}
window.addEventListener('pagehide',flushNotes);document.addEventListener('visibilitychange',()=>{if(document.hidden)flushNotes();else if(DATA){autoApply();render();}});window.addEventListener('storage',ev=>{if(ev.key!==STORE||!ev.newValue||document.activeElement?.tagName==='TEXTAREA')return;try{S=E.normalize(JSON.parse(ev.newValue),DATA);selectedDate=S.selectedDate||selectedDate;render();}catch{}});
(async()=>{try{const r=await fetch('data.json?v=11-light');if(!r.ok)throw Error('任务数据暂时无法读取。');DATA=await r.json();const plan=await fetch('spaced-plan-v3.json?v=single-round-5');if(!plan.ok)throw Error('专题安排暂时无法读取。');const reading=await fetch('reading-plan.json?v=1');if(!reading.ok)throw Error('作品阅读安排暂时无法读取。');DATA.tasks.push(...await plan.json(),...await reading.json());DATA.spaced=true;E.prepare(DATA);const profile=await fetch('progress-profile.json?v=single-round-5');if(!profile.ok)throw Error('进度校对暂时无法读取。');DATA.progressProfile=await profile.json();if(DATA.revision!==E.REV)throw Error('页面正在更新，请刷新一次。');load();const preview=new URLSearchParams(location.search).get('date');if(DATA.days.some(d=>d.date===preview))selectedDate=preview;view=location.hash.slice(1)||'today';autoApply();render();setInterval(()=>{paintTimer();if(S.settings.autoCarry&&S.lastAutoDate!==today()){autoApply();render();}},1000);}catch(e){$('#content').innerHTML=`<section class="panel"><h1>暂时没能打开清单</h1><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">刷新重试</button> <a href="当前逐日规划.html">打开文字清单</a></section>`;}})();

