const fs=require('fs'),path=require('path'),assert=require('assert/strict'),http=require('http');
const {chromium}=require('C:/Users/hyun0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../dist'),plan=JSON.parse(fs.readFileSync(path.join(root,'plan.json'),'utf8')),base=JSON.parse(fs.readFileSync(path.join(__dirname,'clear-base-plan.json'),'utf8'));
const tasks=plan.days.flatMap(d=>d.tasks),cards=tasks.filter(t=>t.clearType),lessons=cards.filter(t=>t.clearType==='lesson');
assert.equal(plan.textbookOrderVersion,4);assert.equal(lessons.length,62);assert.equal(plan.clearPlan.units.length,206);assert.equal(new Set(plan.clearPlan.units.map(u=>u.book)).size,12);
for(const t of lessons){assert(t.examItems?.length,t.id);assert(t.examTypes.includes(t.type));assert(t.title.startsWith('【'));}
assert.deepEqual(lessons.find(t=>t.id==='clear-2026-11-06-O').examItems.map(q=>q.type),['名词解释','简答题']);
for(const u of plan.clearPlan.units)assert.equal(cards.filter(t=>t.units.some(x=>x.id===u.id)).length,1,'coverage '+u.id);
const evidence=plan.clearPlan.questions.flatMap(q=>q.evidence.map(e=>e.id));assert.equal(evidence.length,389);assert.equal(new Set(evidence).size,389);assert.equal(plan.clearPlan.questions.length,349);
const retained=new Set([...tasks,...plan.archivedTasks].map(t=>t.id));for(const t of [...base.days.flatMap(d=>d.tasks),...(base.archivedTasks||[])])assert(retained.has(t.id),'lost '+t.id);
const nonpro=t=>!['古代文学','现当代文学','外国文学','文学理论','现代汉语'].includes(t.course);
assert.deepEqual(tasks.filter(nonpro),base.days.flatMap(d=>d.tasks).filter(nonpro),'politics/English changed');
for(const t of cards){assert(!('minutes'in t));assert(!/\d+分钟/.test(t.detail));}
assert(!fs.readFileSync(path.join(root,'app-v2.js'),'utf8').includes('每科最多3项必做'));
const server=http.createServer((q,r)=>{const u=new URL(q.url,'http://localhost'),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.json':'application/json','.css':'text/css','.pdf':'application/pdf'})[path.extname(f)]||'text/plain;charset=utf-8');r.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const url='http://127.0.0.1:'+server.address().port,errors=[];
 const p=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-11-07T14:00:00+08:00')});
 await p.goto(url+'/?date=2026-11-06');await p.getByText('全量框架＋重点记牢＋考前完整复习',{exact:true}).waitFor();
 await p.locator('#type-filter').selectOption('名词解释');assert.equal(await p.locator('[data-clear-card="clear-2026-11-06-O"] .clear-exam-item').count(),1);assert.equal(await p.locator('[data-clear-card="clear-2026-11-06-O"] .clear-exam-item h3').innerText(),'新月诗派');
 await p.locator('#type-filter').selectOption('简答题');assert((await p.locator('[data-clear-card="clear-2026-11-06-O"] .clear-exam-item h3').innerText()).includes('三美'));
 await p.locator('#type-filter').selectOption('分析题');assert.equal(await p.locator('[data-clear-card="clear-2026-11-06-O"]').count(),0);assert.equal(await p.locator('[data-clear-card="clear-2026-11-06-H"]').count(),1);
 await p.goto(url+'/?date=2026-11-07');await p.getByText('全量框架＋重点记牢＋考前完整复习',{exact:true}).waitFor();
 const id='clear-2026-11-07-C',source=lessons.find(t=>t.id===id);
 assert((await p.locator('[data-clear-card="'+id+'"]').innerText()).includes('司马相如与西汉辞赋'));
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await p.evaluate(()=>allTasks().filter(t=>t.clearType==='review').length),0,'unlearned reviews must not be generated');
 await p.locator('[data-detail="'+id+'"]').click();await p.locator('#clear-submit').click();assert(await p.locator('#task-dialog').evaluate(d=>d.open),'must require assessment');
 const assess=async(level,units=true)=>{if(units)for(const el of await p.locator('[data-clear-unit]').all())await el.check();await p.locator('#clear-recalled').check();await p.locator('#clear-rating').selectOption(String(level));await p.locator('#clear-submit').click();};
 await p.locator('#task-note').fill('史记已有基础，汉赋主干能够分期并配作品。');await assess(2);
 let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert.equal(s.clearLearning[id].nextDue,'2026-11-08');assert.equal(s.clearLearning[id].stage,0);for(const u of source.units)assert(s.clearCoverage[u.id].covered);
 await p.clock.setFixedTime(new Date('2026-11-08T14:00:00+08:00'));await p.goto(url+'/?date=2026-11-08');await p.getByText('全量框架＋重点记牢＋考前完整复习',{exact:true}).waitFor();
 let review=await p.evaluate(id=>allTasks().find(t=>t.clearType==='review'&&t.clearSource===id),id);assert.equal(review.date,'2026-11-08');
 await p.locator('[data-detail="'+review.id+'"]').click();await assess(0,false);
 s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert.equal(s.clearLearning[id].nextDue,'2026-11-08');assert.equal(s.clearLearning[id].level,0);assert(!await p.evaluate(id=>done(getTask(id)),id));
 review=await p.evaluate(id=>allTasks().find(t=>t.clearType==='review'&&t.clearSource===id),id);await p.locator('[data-detail="'+review.id+'"]').click();await assess(2);
 s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert.equal(s.clearLearning[id].nextDue,'2026-11-10');assert.equal(s.clearLearning[id].stage,1);assert.equal(s.clearLearning[id].history.length,3);
 await p.clock.setFixedTime(new Date('2026-11-12T14:00:00+08:00'));await p.goto(url+'/?date=2026-11-12');await p.getByText('全量框架＋重点记牢＋考前完整复习',{exact:true}).waitFor();
 review=await p.evaluate(id=>allTasks().find(t=>t.clearType==='review'&&t.clearSource===id),id);assert.equal(review.dueDate,'2026-11-10');assert.equal(review.date,'2026-11-12','overdue retrieval must surface today');
 await p.locator('[data-detail="'+review.id+'"]').click();await assess(2);
 s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert.equal(s.clearLearning[id].nextDue,'2026-11-16');assert.equal(s.clearLearning[id].stage,2,'actual day intervals');
 // A main answer alone cannot silently mark textbook coverage complete.
 const other='clear-2026-11-12-T';await p.locator('[data-detail="'+other+'"]').click();await assess(2,false);assert(!await p.evaluate(id=>done(getTask(id)),other));
 // Moving an unlearned lesson does not create a recall.
 await p.evaluate(()=>{applyMoves([{id:'clear-2026-11-13-H',date:'2026-11-14'}])});assert(!await p.evaluate(()=>allTasks().some(t=>t.clearType==='review'&&t.clearSource==='clear-2026-11-13-H')));
 // Legacy completion, notes and moves must survive; opening them cannot imply new mastery.
 const old=plan.archivedTasks.find(t=>t.course==='现当代文学');await p.evaluate(old=>{state.records[old.id]={done:true,updatedAt:'2026-11-06T01:00:00Z'};state.notes[old.id]='原学习笔记保留';state.moves[old.id]={date:'2026-11-11',updatedAt:'2026-11-06T01:00:00Z'};save();render();},old);
 assert(await p.evaluate(id=>allTasks().some(t=>t.id===id),old.id));
 await p.locator('#bottom-nav [data-view="books"]').click();for(const b of new Set(plan.clearPlan.units.map(u=>u.book)))assert.equal(await p.getByRole('heading',{name:b,exact:true}).count(),1);
 await p.locator('#clear-question-search').fill('新月');assert((await p.locator('#clear-question-results').innerText()).includes('新月'));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.screenshot({path:path.join(__dirname,'clear-books-mobile.png'),fullPage:true});
 await p.evaluate(()=>changeView('settings'));const dl=p.waitForEvent('download');await p.locator('#export').click();const backup=path.join(__dirname,'clear-backup-test.json');await(await dl).saveAs(backup);
 const fresh=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Shanghai'});fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(url+'/#settings');await fresh.locator('#import-file').setInputFiles(backup);await fresh.getByText('备份已合并，包含改期与专题进度',{exact:true}).waitFor();
 const restored=await fresh.evaluate(()=>JSON.parse(localStorage.getItem('anshang-daily-v1')));assert.deepEqual(restored.clearLearning[id],s.clearLearning[id]);assert(restored.clearCoverage[source.units[0].id].covered);assert.equal(restored.notes[old.id],'原学习笔记保留');assert.equal(restored.moves[old.id].date,'2026-11-11');
 // Old cloud snapshots missing new fields initialise safely.
 assert(await fresh.evaluate(()=>{delete state.clearLearning;delete state.clearCoverage;delete state.clearChecks;initV2();return Object.keys(state.clearLearning).length===0;}));
 await p.goto(url+'/?date=2026-11-07');await p.getByText('全量框架＋重点记牢＋考前完整复习',{exact:true}).waitFor();await p.locator('[data-detail="pol-session-2026-11-07"]').click();await p.locator('#single-corrected').fill('100');await p.locator('#save-session').click();assert.equal(await p.evaluate(()=>state.politics.progress[plan.politics.currentTopicId].singleCorrected),100);
 // All dates and core navigation render on mobile; materials remain available.
 for(const date of ['2026-11-06','2026-11-20','2026-12-05','2026-12-10','2026-12-12','2026-12-18']){await p.evaluate(d=>{selected=d;view='today';render()},date);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),date);}
 for(const viewName of ['home','calendar','plan','books','settings'])await p.evaluate(v=>{view=v;render()},viewName);
 for(const name of ['theory-activity','foreign-ancient']){const pdf=await p.request.get(url+'/materials/'+name+'.pdf');assert.equal(pdf.status(),200);assert.equal((await pdf.body()).subarray(0,4).toString(),'%PDF');}
 await p.evaluate(()=>{selected='2026-11-07';view='today';render()});await p.screenshot({path:path.join(__dirname,'clear-today-mobile.png'),fullPage:true});
 await fresh.goto(url+'/?date=2026-11-07');await fresh.getByText('全量框架＋重点记牢＋考前完整复习',{exact:true}).waitFor();await fresh.screenshot({path:path.join(__dirname,'clear-today-desktop.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: 12 books/206 units; 389 evidence records/349 groups; original task retention; unchanged politics/English; clear mobile/desktop cards; no fixed question times; no fake unlearned reviews; next-day failure repair; actual-day intervals; incomplete basics guard; overdue recall; moves; backup restore; cloud initialisation; navigation and PDFs.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
