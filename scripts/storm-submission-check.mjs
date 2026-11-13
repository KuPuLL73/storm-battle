import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

// Exercise the actual built files at a nested URL and the real dynamic SDK
// loading path. This is a controlled SDK contract check, not Yandex acceptance.
let sdkRequests = 0;
let failSDK = false;
let cloud;
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/sdk.js') {
    sdkRequests++;
    if (failSDK) { res.writeHead(503).end('temporarily unavailable'); return; }
    res.setHeader('Content-Type', 'application/javascript');
    res.end(`window.__events=[];window.__handlers={};window.__cloud=${JSON.stringify(cloud ?? null)};window.YaGames={init:async()=>{window.__events.push('init');return{environment:{i18n:{lang:'en'}},on:(e,f)=>window.__handlers[e]=f,features:{LoadingAPI:{ready:()=>window.__events.push({ready:true,loading:!!document.querySelector('#loading'),cases:document.querySelectorAll('.case-card').length})},GameplayAPI:{start:()=>window.__events.push('start'),stop:()=>window.__events.push('stop')}},getPlayer:async()=>({getData:async()=>window.__cloud?{stormBattleV1:window.__cloud}:{},setData:async(data)=>{window.__cloud=data.stormBattleV1;window.__events.push('saved')}}),adv:{showRewardedVideo:({callbacks})=>{window.__ad=callbacks;callbacks.onOpen()}}}}};`);
    return;
  }
  const relative = path.startsWith('/candidate/') ? path.slice('/candidate/'.length) || 'index.html' : null;
  if (!relative || relative.includes('..')) { res.writeHead(404).end(); return; }
  try {
    const bytes = await readFile(resolve('dist', relative));
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
    res.setHeader('Content-Type', types[extname(relative)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/candidate/`;
const browser = await chromium.launch();
const checks = [];
const errors = [];
try {
  const seed = await browser.newPage({ locale: 'ru-RU' });
  await seed.goto(url, { waitUntil: 'networkidle' });
  cloud = await seed.evaluate(() => JSON.parse(localStorage.getItem('storm-battle.save.v1')));
  cloud.updatedAt = Date.now() + 1000;
  cloud.data.run.coins = 765;
  cloud.data.run.language = 'auto';
  await seed.close();
  const p = await browser.newPage({ locale: 'ru-RU' });
  p.on('pageerror', e => errors.push(e.message));
  const failedAssets = [];
  p.on('response', r => { if (r.status() >= 400) failedAssets.push(r.url()); });
  await p.goto(url + '?platform=1', { waitUntil: 'networkidle' });
  await expect(p.locator('.navigation [data-nav="cases"]')).toHaveText('Cases');
  await expect(p.locator('#loading')).toHaveCount(0);
  assert.equal(sdkRequests, 1);
  assert.deepEqual(await p.evaluate(() => window.__events.find(e => e?.ready)), { ready: true, loading: false, cases: 33 });
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('storm-battle.save.v1')).data.run.coins), 765);
  assert.equal(await p.evaluate(() => document.documentElement.lang), 'en');
  assert.deepEqual(failedAssets, []);
  checks.push('Nested production URL: JS/CSS/art load; /sdk.js dynamically loads once; SDK language overrides browser; ready follows visible UI; newer cloud save restored.');
  await p.evaluate(() => window.__handlers.game_api_pause());
  assert.equal(await p.evaluate(() => window.__events.at(-1)), 'stop');
  await p.evaluate(() => window.__handlers.game_api_resume());
  assert.equal(await p.evaluate(() => window.__events.at(-1)), 'start');
  await p.locator('.navigation [data-nav="bonuses"]').click();
  await p.locator('.aim-extra-points [data-ad="coins"]').click();
  assert.equal(await p.evaluate(() => window.__events.at(-1)), 'stop');
  // Closing the ad cannot resume while the platform is still paused.
  await p.evaluate(() => { window.__handlers.game_api_pause(); window.__ad.onClose(); });
  assert.equal(await p.evaluate(() => window.__events.at(-1)), 'stop');
  await p.evaluate(() => window.__handlers.game_api_resume());
  assert.equal(await p.evaluate(() => window.__events.at(-1)), 'start');
  await p.waitForFunction(() => window.__events.includes('saved'));
  assert.equal(await p.evaluate(() => window.__cloud.data.run.coins), 765);
  checks.push('SDK pause/resume and ad pause overlap correctly; close without reward pays nothing; cloud write uses stormBattleV1.');
  await p.close();
  failSDK = true;
  const retry = await browser.newPage();
  retry.on('pageerror', e => errors.push(e.message));
  await retry.goto(url + '?platform=1');
  await expect(retry.locator('#retry-boot')).toBeVisible();
  failSDK = false;
  await retry.locator('#retry-boot').click();
  await expect(retry.locator('.case-card')).toHaveCount(33);
  await expect(retry.locator('#retry-boot')).toHaveCount(0);
  checks.push('SDK script failure offers a working retry; successful retry restores a playable catalog.');
  await retry.close();
  assert.deepEqual(errors, []);
  await writeFile('artifacts/storm/submission-browser-report.json', JSON.stringify({ checks, errors, sdkRequests, note: 'SDK controlled locally; actual draft and physical devices still need verification.' }, null, 2));
  checks.forEach(c => console.log('PASS', c));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
