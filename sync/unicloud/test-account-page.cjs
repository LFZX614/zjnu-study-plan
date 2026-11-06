const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/hyun0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({acceptDownloads:true});let requests=0;
  await page.route('**/*',async route=>{requests++;if(route.request().url()==='https://account.test/')return route.fulfill({contentType:'text/html',body:fs.readFileSync('sync/unicloud/账号设置.html','utf8')});throw Error('Unexpected network request')});
  await page.goto('https://account.test/');await page.evaluate(()=>{const original=URL.createObjectURL;URL.createObjectURL=function(blob){window.testConfigBlob=blob;return original.call(this,blob)};HTMLAnchorElement.prototype.click=function(){window.testDownloadName=this.download}});const password='Test-only-Password8';
  await page.locator('[name=password]').fill(password);await page.locator('[name=confirmation]').fill('Wrong-confirmation8');await page.locator('button').click();assert((await page.locator('#message').innerText()).includes('不一致'));
  await page.locator('[name=confirmation]').fill(password);await page.locator('button').click();await page.waitForFunction(()=>window.testConfigBlob&&window.testDownloadName);
  const raw=await page.evaluate(()=>window.testConfigBlob.text()),config=JSON.parse(raw);assert.equal(await page.evaluate(()=>window.testDownloadName),'study-sync-env.json');
  assert.equal(config.format,'study-sync-config-v1');assert.equal(config.username,'study');assert(!raw.includes(password));assert.equal(config.hash,crypto.pbkdf2Sync(password,Buffer.from(config.salt,'hex'),600000,32,'sha256').toString('hex'));
  assert.equal(await page.locator('[name=password]').inputValue(),'');assert.equal(requests,1);
  console.log('Account setup verified: confirmation check, correct password verifier, generated file contains no password, no outbound network requests. OS download was not tested.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
