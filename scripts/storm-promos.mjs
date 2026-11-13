import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Compose the game's existing authored artwork into separate store illustrations.
// No gameplay screenshots or third-party weapon renders are used here.
const out = resolve('artifacts/yandex');
await mkdir(out, { recursive: true });
const data = async (path, type) => `data:image/${type};base64,${(await readFile(path)).toString('base64')}`;
const armory = await data('public/storm/art/armory.webp', 'webp');
const gold = await data('public/storm/cases/gold.png', 'png');
const neon = await data('public/storm/cases/neon.png', 'png');
const emblem = await data('public/storm/art/emblem.png', 'png');
const browser = await chromium.launch();
const page = await browser.newPage();
const materials = [];
async function render(name, width, height, content) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#0a101a;color:#fff;font-family:Arial,sans-serif}main{position:relative;width:${width}px;height:${height}px;overflow:hidden}img{position:absolute;object-fit:contain}h1,p{margin:0;position:relative}</style></head><body><main>${content}</main></body></html>`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
  await writeFile(resolve(out, `${name}.html`), await page.content());
  await page.screenshot({ path: resolve(out, `${name}.png`), omitBackground: false });
  materials.push({ file: `${name}.png`, width, height, kind: 'store illustration', sources: ['authored game artwork'] });
}
try {
  await render('icon-512', 512, 512, `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#a76421 0%,#182235 53%,#080c15 90%)"></div><div style="position:absolute;inset:26px;border:2px solid #b88b46;border-radius:70px;transform:rotate(-6deg)"></div><img src="${gold}" style="width:470px;height:420px;left:21px;top:65px;filter:drop-shadow(0 20px 18px #000b)"><img src="${emblem}" style="width:145px;height:145px;left:183px;top:12px;filter:drop-shadow(0 3px 12px #ffc15f80)">`);
  for (const lang of ['ru', 'en']) {
    const title = lang === 'ru' ? 'Шторм батл' : 'Storm Battle';
    const subtitle = lang === 'ru' ? 'Соревнование за лучший дроп' : 'Race for the best drop';
    await render(`cover-${lang}-800x470`, 800, 470, `<img src="${armory}" style="inset:0;width:800px;height:470px;object-fit:cover"><div style="position:absolute;inset:0;background:linear-gradient(90deg,#080d18ed 0%,#080d18b0 40%,#080d1810 80%)"></div><img src="${neon}" style="width:290px;height:290px;right:14px;bottom:12px;transform:rotate(8deg);filter:drop-shadow(0 14px 14px #000b)"><img src="${emblem}" style="width:76px;height:76px;left:36px;top:37px"><div style="position:absolute;left:40px;top:163px;width:440px"><h1 style="font-size:58px;line-height:1.04;letter-spacing:-2px;text-shadow:0 3px 20px #000;font-weight:900">${title}</h1><p style="margin-top:20px;font-size:22px;line-height:1.35;max-width:330px;color:#e4c993">${subtitle}</p></div><div style="position:absolute;left:40px;bottom:42px;width:72px;height:4px;background:#e8b95c"></div>`);
  }
  await writeFile(resolve(out, 'promo-manifest.json'), JSON.stringify({ materials, note: 'Separate compositions made from authored game art. Gameplay media is captured separately.' }, null, 2));
  console.log('Created icon and RU/EN covers in artifacts/yandex.');
} finally { await browser.close(); }
