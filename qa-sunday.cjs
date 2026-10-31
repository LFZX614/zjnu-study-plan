const {chromium}=require('C:/Users/hyun0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const D=JSON.parse(fs.readFileSync('./dist/data.json','utf8')),E=require('./dist/engine.js');
(async()=>{
 const root=path.resolve('dist');const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}const file=p===root?path.join(root,'index.html'):p;fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-01T08:00:00+08:00')});
 const sample=D.tasks.find(t=>t.category==='professional'&&t.originalDate==='2026-10-29'),finished=D.tasks.find(t=>t.category==='professional'&&t.id!==sample.id);
 const state=E.fresh();state.selectedDate='2026-11-01';state.lastAutoDate='2026-11-01';state.records[sample.id]={note:'待补例证',done:false,dueDate:'2026-11-05',moves:[]};state.records[finished.id]={done:true,note:'已完成备注',completedAt:'2026-10-30T00:00:00Z'};
 await context.addInitScript(seed=>{if(!localStorage.getItem('zjnu-checkin-v7'))localStorage.setItem('zjnu-checkin-v7',JSON.stringify(seed));},state);
 await page.goto(url);await page.locator(`[data-note="${sample.id}"]`).waitFor();
 let current=await page.evaluate(()=>JSON.parse(localStorage.getItem('zjnu-checkin-v7')));assert.equal(current.records[sample.id].dueDate,'2026-11-01');assert.equal(current.records[sample.id].note,'待补例证');assert(current.records[finished.id].done);
 assert.equal(await page.locator(`[data-task-id="${sample.id}"]`).count(),1);assert(await page.locator('body').innerText().then(x=>x.includes('周日没完成的继续移到下个周日')));
 await page.locator(`[data-note="${sample.id}"]`).fill('补充后的批注');await page.waitForTimeout(350);await page.reload();await page.locator(`[data-note="${sample.id}"]`).waitFor();assert.equal(await page.locator(`[data-note="${sample.id}"]`).inputValue(),'补充后的批注');
 await page.locator(`[data-defer="${sample.id}"]`).click();current=await page.evaluate(()=>JSON.parse(localStorage.getItem('zjnu-checkin-v7')));assert.equal(current.records[sample.id].dueDate,'2026-11-08');
 await page.locator('[data-action="undo"]').click();assert.equal(await page.locator(`[data-note="${sample.id}"]`).inputValue(),'补充后的批注');
 await page.locator(`[data-check="${sample.id}"]`).click();await page.reload();await page.locator(`[data-task-id="${sample.id}"]`).waitFor();assert.equal(await page.locator(`[data-check="${sample.id}"]`).getAttribute('aria-pressed'),'true');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'qa-sunday-mobile.png',fullPage:false});
 await page.locator('[data-view="plan"]').click();assert(await page.locator('body').innerText().then(x=>x.includes('不设两项上限')));
 await page.locator('[data-view="backlog"]').click();assert(await page.locator('body').innerText().then(x=>x.includes('周日未完成的继续排到下个周日')));
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-view="today"]').click();await page.screenshot({path:'qa-sunday-desktop.png',fullPage:false});
 await page.clock.setSystemTime(new Date('2026-11-02T08:00:00+08:00'));await page.clock.runFor(1100);
 current=await page.evaluate(()=>JSON.parse(localStorage.getItem('zjnu-checkin-v7')));assert.equal(current.lastAutoDate,'2026-11-02');assert.equal(current.records[sample.id].dueDate,'2026-11-01');
 const still=D.tasks.find(t=>t.category==='professional'&&t.originalDate==='2026-10-30');assert.equal(current.records[still.id].dueDate,'2026-11-08');
 assert.deepEqual(errors,[]);console.log('PASS: mobile and desktop UI, old state migration, notes/reload, defer/undo, completion persistence, Sunday copy, midnight rollover, no overflow or page errors.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
