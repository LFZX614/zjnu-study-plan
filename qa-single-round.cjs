const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/hyun0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const root = path.resolve('dist');
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    if (error) return res.writeHead(404).end();
    const types = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css'};
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      timeout: 20000
    });
    const page = await browser.newPage({viewport: {width: 390, height: 844}, timezoneId: 'Asia/Shanghai'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time: new Date('2026-11-05T14:00:00+08:00')});
    await page.addInitScript(value => {
      if (!localStorage.getItem('zjnu-checkin-v7')) localStorage.setItem('zjnu-checkin-v7', JSON.stringify(value));
    }, seed);
    await page.goto('http://127.0.0.1:' + server.address().port + '/?date=2026-11-07', {timeout: 15000});
    await page.getByRole('heading', {name: '中世纪文学与但丁', exact: true}).waitFor();
    await page.getByRole('heading', {name: '汉赋与汉乐府', exact: true}).waitFor();
    await page.getByRole('heading', {name: '[复习] 阿喀琉斯与奥德修斯的英雄形象比较', exact: true}).waitFor();
    assert.equal(await page.getByRole('heading', {name: '文艺复兴文学', exact: true}).count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('button', {name: '☷ 分配与使用说明'}).click();
    await page.getByRole('heading', {name: '一轮覆盖与间隔回顾', exact: true}).waitFor();
    const content = await page.locator('#content').innerText();
    assert(content.includes('84'));
    assert(content.includes('12月10日'));
    await page.screenshot({path: 'qa-single-round-mobile.png', fullPage: true});
    await page.reload();
    await page.getByRole('heading', {name: '一轮覆盖与间隔回顾', exact: true}).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('zjnu-checkin-v7')).progressProfile), 'progress-2026-11-05-v1');
    assert.deepEqual(errors, []);
    const uncalibrated = await browser.newPage({timezoneId: 'Asia/Shanghai'});
    await uncalibrated.clock.install({time: new Date('2026-11-05T14:00:00+08:00')});
    await uncalibrated.goto('http://127.0.0.1:' + server.address().port + '/?date=2026-11-05');
    await uncalibrated.getByRole('heading', {name: '请先导入已确认的五科进度', exact: true}).waitFor();
    await uncalibrated.locator('#import-file').setInputFiles(process.argv[2]);
    await uncalibrated.getByRole('button', {name: '合并这份备份', exact: true}).click();
    await uncalibrated.getByRole('heading', {name: '[复习] 秦汉散文与史记', exact: true}).waitFor();
    assert.equal(await uncalibrated.getByRole('heading', {name: '现代汉语概说', exact: true}).count(), 0);
    assert.equal(await uncalibrated.getByRole('heading', {name: '文学革命与现代社团', exact: true}).count(), 0);
    assert.equal(await uncalibrated.getByRole('heading', {name: '[复习] 先秦诸子与历史散文', exact: true}).count(), 0);
    await uncalibrated.close();
    console.log('Mobile browser, November 7 tasks, coverage, reload and JS errors verified.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
