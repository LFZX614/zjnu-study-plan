const fs=require('fs'),path=require('path'),assert=require('assert/strict'),http=require('http');
const {chromium}=require('C:/Users/hyun0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../dist'),plan=JSON.parse(fs.readFileSync(path.join(root,'plan.json'),'utf8')),old=JSON.parse(fs.readFileSync(path.join(__dirname,'plan-before-reorder.json'),'utf8'));
const prof=new Set(['古代文学','现当代文学','外国文学','文学理论','现代汉语']);
const tasks=plan.days.flatMap(d=>d.tasks),before=old.days.flatMap(d=>d.tasks),find=s=>tasks.find(t=>t.title===s&&t.type!=='复习回顾');
assert.equal(plan.textbookOrderVersion,2);
for(const t of before.filter(t=>t.type!=='复习回顾'))assert(tasks.some(x=>x.id===t.id),`Lost ID ${t.id}`);
for(const d of plan.days.filter(d=>d.date>='2026-11-06')){
 for(const c of prof)assert(d.tasks.filter(t=>t.course===c&&t.role==='必做').length<=3,`Too many core tasks ${d.date} ${c}`);
 for(const t of d.tasks.filter(t=>prof.has(t.course)&&t.role==='必做'))assert(!d.rest&&d.subjects.includes(t.course));
 assert(d.tasks.filter(t=>t.staticReview&&t.id.startsWith('reorder-review-')).length<=4);
}
const today=plan.days.find(d=>d.date==='2026-11-06');
assert.deepEqual(today.tasks.filter(t=>t.course==='现当代文学'&&t.role==='必做').map(t=>t.title).sort(),['徐志摩《再别康桥》的意境美和音韵美','三美主张','新月诗派'].sort());
assert(!today.tasks.some(t=>t.course==='现当代文学'&&/七月|九叶|左翼|艾青|雨巷|十四行集/.test(t.title)));
for(const [s,unit]of [['七月诗派','B092'],['九叶诗人','B092'],['《茶馆》','B093'],['阳羡词派','B076'],['浙西词派','B076'],['常州词派','B085'],['文学意蕴的层次','B120'],['艺术发现','B117'],['多余人形象','B107'],['自然主义','B108']])assert.equal(find(s).study.unit,unit,s);
for(const t of tasks.filter(t=>t.sourceTaskIds))for(const sid of t.sourceTaskIds){const source=tasks.find(x=>x.id===sid);assert(source&&source.date<t.date);assert(t.reviewItems.some(i=>i.key===source.memoryKey));}
assert(!tasks.some(t=>prof.has(t.course)&&t.role==='必做'&&t.date>'2026-12-09'));
// Each subject's individual chapter questions must progress forward across dates.
for(const c of prof){const chapterTasks=tasks.filter(t=>t.course===c&&t.date>='2026-11-06'&&t.type!=='复习回顾'&&!t.study?.crossChapter&&t.study?.order<999&&t.role!=='已背验收'&&t.previousDate).sort((a,b)=>a.date.localeCompare(b.date)||(a.study.order-b.study.order));let last=-1;for(const t of chapterTasks){assert(t.study.order>=last,`Chronology regression ${c} ${t.date} ${t.title}`);last=t.study.order;}}
const server=http.createServer((q,r)=>{const url=new URL(q.url,'http://localhost');const f=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.json':'application/json','.css':'text/css'})[path.extname(f)]||'text/plain');r.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const errors=[],p=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-11-06T14:00:00+08:00')});
 const july=find('七月诗派'),poem=find('徐志摩《再别康桥》的意境美和音韵美'),retired=plan.archivedTasks.find(t=>t.date==='2026-11-07');
 const seed={records:{[july.id]:{done:true,completedOn:'2026-11-05',scheduledOn:'2026-11-06',updatedAt:'2026-11-06T03:00:00Z'},[retired.id]:{done:true,completedOn:'2026-11-07',scheduledOn:'2026-11-07',updatedAt:'2026-11-07T03:00:00Z'}},custom:[],notes:{[july.id]:'保留这条笔记'},moves:{[july.id]:{date:'2026-11-06',updatedAt:'2026-11-05T00:00:00Z'},[poem.id]:{date:'2026-12-18',updatedAt:'2026-11-05T00:00:00Z'}},memory:{[poem.memoryKey]:{date:'2026-12-18',confirmed:false,title:poem.title,taskId:poem.id}},checks:{[retired.id]:{old:true}},sessions:{sample:{minutes:30}},legacy:[],theme:'dark'};
 await p.addInitScript(s=>{if(!localStorage.getItem('anshang-daily-v1'))localStorage.setItem('anshang-daily-v1',JSON.stringify(s))},seed);
 const base='http://127.0.0.1:'+server.address().port;await p.goto(base+'/?date=2026-11-06');await p.getByRole('heading',{name:'现当代文学',exact:true}).waitFor();
 let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert.equal(s.notes[july.id],'保留这条笔记');assert(s.records[july.id].done);assert(s.records[retired.id].done);assert.equal(s.sessions.sample.minutes,30);assert(s.checks[retired.id].old);assert.equal(s.moves[poem.id].date,'2026-11-06');assert(!s.memory[poem.memoryKey]);assert(s.reorderSnapshots[0].plannedMemory[poem.memoryKey]);
 const core=await p.locator('[data-course="现当代文学"] .chapter-group > .task:not(.done) .task-title').allTextContents();assert(core.some(t=>t.includes('再别康桥')));assert(!core.some(t=>t==='七月诗派'));
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Completing a task creates confirmed memory, rebases the first recall and persists.
 await p.locator(`[data-detail="${poem.id}"]`).click();await p.locator('#completed-on').fill('2026-11-06');await p.locator('#detail-complete').click();
 s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert.equal(s.memory[poem.memoryKey].date,'2026-11-06');assert(s.memory[poem.memoryKey].confirmed);
 const actual=await p.evaluate(key=>allTasks().find(t=>t.memorySource===key&&t.interval===1),poem.memoryKey);assert.equal(actual.date,'2026-11-07');
 // Saturated actual memories are rescheduled, never displayed above the daily cap.
 const budgets=await p.evaluate(()=>{for(let i=0;i<12;i++)state.memory['q:stress'+i]={date:'2026-11-06',confirmed:true,title:'测试'+i,course:'现当代文学',type:'名词解释'};const out={};for(const t of allTasks())if(t.type==='复习回顾'&&t.date>='2026-11-06'&&!done(t)&&['古代文学','现当代文学','外国文学','文学理论','现代汉语'].includes(t.course))out[t.date]=(out[t.date]||0)+1;return out});for(const n of Object.values(budgets))assert(n<=4);
 const groupResult=await p.evaluate(()=>{const t=allTasks().find(t=>t.reorderSourceReviewIds&&t.interval===1);state.checks[t.id]=Object.fromEntries(t.reviewItems.map(i=>[i.key,true]));state.notes[t.id]='合并复习笔记';const ok=completeTask(t);return {ok,done:t.reorderSourceReviewIds.every(id=>state.records[id]?.done),notes:t.reorderSourceReviewIds.every(id=>state.notes[id]?.includes('合并复习笔记'))};});assert.deepEqual(groupResult,{ok:true,done:true,notes:true});
 await p.reload();await p.getByRole('heading',{name:'现当代文学',exact:true}).waitFor();s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert(s.records[poem.id].done);assert.equal(s.notes[july.id],'保留这条笔记');
 await p.goto(base+'/?date=2026-11-07');await p.getByRole('heading',{name:'古代文学',exact:true}).waitFor();assert.equal(await p.locator(`[data-detail="${retired.id}"]`).count(),1);
 assert.deepEqual(errors,[]);await p.screenshot({path:path.join(__dirname,'reorder-mobile.png'),fullPage:true});console.log('PASS: ID/wording preservation; chronology; corrected chapter locations; today scope; rotation/rest; per-course core limit; recall capacity; migration; notes/checks/sessions; completed history; actual-day rebasing; mobile layout.');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
