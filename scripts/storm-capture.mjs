import { chromium } from '@playwright/test';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const out = resolve('artifacts/yandex');
const url = process.env.GAME_URL || 'http://127.0.0.1:4173/';
await mkdir(resolve(out, 'recording'), { recursive: true });
const browser = await chromium.launch();
const media = [];
const nav = (p, route) => p.locator(`.navigation [data-nav="${route}"]`).click();
async function shot(p, name, width, height) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    const visible = [...document.images].filter(i => {
      const r = i.getBoundingClientRect();
      return r.width && r.height && r.bottom > 0 && r.top < innerHeight;
    });
    await Promise.race([Promise.all(visible.map(i => i.decode().catch(() => {}))), new Promise(r => setTimeout(r, 3000))]);
    if (visible.some(i => !i.complete || !i.naturalWidth)) throw new Error('A visible image did not load.');
  });
  const file = `${name}.jpg`;
  await p.screenshot({ path: resolve(out, file), type: 'jpeg', quality: 94 });
  media.push({ file, width, height, bytes: (await stat(resolve(out, file))).size });
}
try {
  for (const lang of ['ru', 'en']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: `${lang}-${lang === 'ru' ? 'RU' : 'US'}`, recordVideo: { dir: resolve(out, 'recording'), size: { width: 1280, height: 720 } } });
    const p = await ctx.newPage();
    p.setDefaultTimeout(12000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.locator('#loading').waitFor({ state: 'hidden' });
    // Start from a new player's actual balance and inventory. No seeded rewards,
    // manipulated odds, edited balances, or invented UI in public media.
    const start = Date.now();
    await shot(p, `desktop-${lang}-01-cases`, 1280, 720);
    await p.waitForTimeout(650);
    await p.locator('[data-case="street"]').click();
    await p.locator('[data-action="open"]').click();
    await p.locator('[data-result="keep"]').waitFor({ state: 'visible' });
    await p.waitForTimeout(600);
    await p.locator('[data-result="keep"]').click();
    await nav(p, 'inventory');
    await shot(p, `desktop-${lang}-02-inventory`, 1280, 720);
    await p.waitForTimeout(900);
    await nav(p, 'upgrade');
    await p.locator('[data-action="pick-source"]').click();
    await p.locator('#modal [data-modal-source]').first().click();
    await p.locator('#modal [data-action="close"]').last().click();
    await shot(p, `desktop-${lang}-03-upgrade`, 1280, 720);
    await p.waitForTimeout(1000);
    await nav(p, 'battles');
    await p.waitForTimeout(1000);
    await nav(p, 'bonuses');
    for (let i = 0; i < 8; i++) {
      await p.locator('[data-action="aim"]').click();
      await p.waitForTimeout(400);
    }
    await p.waitForTimeout(Math.max(200, 22000 - (Date.now() - start)));
    if (errors.length) throw new Error(errors.join('\n'));
    const source = await p.video().path();
    await ctx.close();
    if (source) {
      const filename = `gameplay-${lang}-1280x720.mp4`;
      const result = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-sseof', '-22', '-i', source, '-t', '22', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-movflags', '+faststart', '-an', resolve(out, filename)], { encoding: 'utf8', windowsHide: true });
      if (result.status !== 0) throw new Error(result.stderr || String(result.error));
      media.push({ file: filename, width: 1280, height: 720, durationSeconds: 22, audio: false, bytes: (await stat(resolve(out, filename))).size });
    }
    const mobile = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang === 'ru' ? 'ru-RU' : 'en-US' });
    const m = await mobile.newPage();
    m.setDefaultTimeout(12000);
    await m.goto(url, { waitUntil: 'networkidle' });
    await m.locator('#loading').waitFor({ state: 'hidden' });
    await m.locator('[data-case="street"]').tap();
    await shot(m, `mobile-${lang}-01-case`, 720, 1280);
    await nav(m, 'inventory');
    await shot(m, `mobile-${lang}-02-inventory`, 720, 1280);
    await mobile.close();
  }
  await writeFile(resolve(out, 'media-manifest.json'), JSON.stringify({ url, media, note: 'Unaltered gameplay from fresh isolated profiles. Mobile browser emulation; physical devices still need testing. Video has no audio.' }, null, 2));
  console.log('Captured 10 screenshots and RU/EN 22-second gameplay MP4s in artifacts/yandex.');
} finally { await browser.close(); }
