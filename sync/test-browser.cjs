const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/hyun0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const rows={},errors=[];let conflict=false,expired=false;const domestic=process.argv.includes('--domestic');
 try{
  async function device(){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.hostname==='cloud.test'){
     const data=req.postDataJSON(),uid=req.headers().authorization?.split(' ')[1]||data?.token;let result;
     if(domestic&&expired&&data?.action!=='login')return route.fulfill({status:401,json:{message:'登录已过期，请重新登录'}});
     if(url.pathname.includes('/auth/')||data?.action==='login'){const username=data.email||data.username;result={user:{id:username,email:username},access_token:username,refresh_token:'refresh',expires_at:9999999999}}
     else if(data?.action==='logout')result={ok:true};
     else if(url.pathname.includes('/rpc/')||data?.action==='sync'){
      const row=rows[uid]||{data:{},revision:0};
      if(conflict){conflict=false;row.data.notes.concurrent='另一台设备';row.revision++}
      if(row.revision!==data.expected_revision)result={ok:false,...row};
      else{rows[uid]={data:data.progress,revision:row.revision+1};result={ok:true,...rows[uid]}}
     }else result=domestic?(rows[uid]||{data:{},revision:0}):(rows[uid]?[rows[uid]]:[]);
     return route.fulfill({json:result,headers:{'Access-Control-Allow-Origin':'*'}});
    }
    if(url.hostname!=='study.test')return route.abort();
    if(url.pathname==='/cloud-config.js')return route.fulfill({contentType:'text/javascript',body:domestic?'window.STUDY_CLOUD_CONFIG={provider:"unicloud",url:"https://cloud.test/study-sync"}':'window.STUDY_CLOUD_CONFIG={url:"https://cloud.test",key:"public-test-key"}'});
    const file=path.join(process.cwd(),'dist',url.pathname==='/'?'index.html':url.pathname);
    if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
    return route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});
   });
   await page.goto('https://study.test/?date=2026-11-06#settings');await page.locator('#cloud-login').waitFor();return page;
  }
  async function login(p,email){await p.locator('#cloud-login [name=email]').fill(email);await p.locator('#cloud-login [name=password]').fill('Test-only-Password8');await p.locator('#cloud-login [value=login]').click();await p.locator('[data-cloud=merge]').waitFor()}
  const a=await device(),b=await device();
  await a.evaluate(()=>{state.notes.phone='手机笔记';state.clearLearning['clear-2026-11-07-C']={active:true,level:2,stage:0,nextDue:'2026-11-08',updatedAt:'2026-11-07T06:00:00Z'};state.clearCoverage.B010={covered:true,lastChecked:'2026-11-07',updatedAt:'2026-11-07T06:00:00Z'};state.clearChecks['clear-2026-11-07-C']={B010:true,updatedAt:'2026-11-07T06:00:00Z'};save()});await login(a,'owner@example.test');await a.locator('[data-cloud=merge]').click();await a.waitForFunction(()=>document.querySelector('[data-cloud-status]').textContent.startsWith('已同步'));
  await b.evaluate(()=>{state.notes.computer='电脑笔记';save()});await login(b,'owner@example.test');await b.locator('[data-cloud=merge]').click();await b.waitForFunction(()=>state.notes.phone==='手机笔记');
  assert.equal(await b.evaluate(()=>state.clearLearning['clear-2026-11-07-C'].nextDue),'2026-11-08');assert(await b.evaluate(()=>state.clearCoverage.B010.covered&&state.clearChecks['clear-2026-11-07-C'].B010));
  await b.evaluate(()=>{state.clearLearning['clear-2026-11-07-C']={...state.clearLearning['clear-2026-11-07-C'],level:1,nextDue:'2026-11-08',updatedAt:'2026-11-08T06:00:00Z'};save()});await b.locator('[data-cloud=sync]').click();await b.waitForFunction(()=>document.querySelector('[data-cloud-status]').textContent.startsWith('已同步'));
  await a.locator('[data-cloud=sync]').click();await a.waitForFunction(()=>state.notes.computer==='电脑笔记');
  assert.equal(await a.evaluate(()=>state.clearLearning['clear-2026-11-07-C'].level),1,'latest recall rating must sync back');
  conflict=true;await a.evaluate(()=>{state.notes.phone='修改后的笔记';save()});await a.locator('[data-cloud=sync]').click();await a.waitForFunction(()=>state.notes.concurrent==='另一台设备');assert.equal(rows['owner@example.test'].data.notes.phone,'修改后的笔记');
  await a.evaluate(()=>{state.notes.phone='';state.checks.test={a:false};save()});await a.locator('[data-cloud=sync]').click();await a.waitForFunction(()=>document.querySelector('[data-cloud-status]').textContent.startsWith('已同步'));
  await b.locator('[data-cloud=sync]').click();await b.waitForFunction(()=>state.notes.phone==='');
  assert(await a.evaluate(()=>!!localStorage.getItem(KEY+'-cloud-recovery')));
  await a.locator('[data-cloud=logout]').click();await a.locator('#cloud-login').waitFor();
  await a.locator('#cloud-login [name=email]').fill('different@example.test');await a.locator('#cloud-login [name=password]').fill('Test-only-Password8');await a.locator('#cloud-login [value=login]').click();await a.locator('[data-cloud=pull]').waitFor();assert.equal(await a.locator('[data-cloud=merge]').count(),0);assert(!rows['different@example.test']);
  if(domestic){
   await b.evaluate(()=>{state.notes.offline='登录过期时的本机修改';save()});expired=true;await b.locator('[data-cloud=sync]').click();await b.locator('#cloud-login').waitFor();
   assert.equal(await b.evaluate(()=>state.notes.offline),'登录过期时的本机修改');expired=false;
   await b.locator('#cloud-login [name=email]').fill('owner@example.test');await b.locator('#cloud-login [name=password]').fill('Test-only-Password8');await b.locator('#cloud-login [value=login]').click();
   await b.waitForFunction(()=>document.querySelector('[data-cloud-status]').textContent.startsWith('已同步'));assert.equal(rows['owner@example.test'].data.notes.offline,'登录过期时的本机修改');
  }
  assert.deepEqual(errors,[]);assert(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log((domestic?'Domestic':'Supabase')+' browser checks passed against simulated cloud: two devices, first merge, revision conflict retry, cleared note, snapshots, account isolation, mobile width.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
