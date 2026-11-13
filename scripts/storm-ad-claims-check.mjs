import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const key = "storm-battle.save.v1";
const browser = await chromium.launch();
const errors = [],
  checks = [];
const saved = (p) =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)).data.run, key);
async function page(sdk) {
  const p = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    locale: "ru-RU",
  });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(
    ({ key, sdk }) => {
      const seed = sessionStorage.getItem("claim-seed");
      if (seed) {
        const s = JSON.parse(localStorage.getItem(key));
        Object.assign(s.data.run, JSON.parse(seed));
        localStorage.setItem(key, JSON.stringify(s));
        sessionStorage.removeItem("claim-seed");
      }
      if (sdk)
        window.YaGames = {
          init: async () => ({
            environment: { i18n: { lang: "ru" } },
            features: {
              LoadingAPI: { ready() {} },
              GameplayAPI: { start() {}, stop() {} },
            },
            adv: {
              showRewardedVideo({ callbacks }) {
                window.adCalls = (window.adCalls || 0) + 1;
                window.adCallbacks = callbacks;
                callbacks.onOpen();
              },
            },
            serverTime: () => Date.now(),
          }),
        };
    },
    { key, sdk },
  );
  await p.goto(url + (sdk ? "/?platform=1" : "/"), {
    waitUntil: "networkidle",
  });
  return p;
}
async function seed(p, data) {
  await p.evaluate(
    (data) => sessionStorage.setItem("claim-seed", JSON.stringify(data)),
    data,
  );
  await p.reload({ waitUntil: "networkidle" });
}
const nav = (p, route) =>
  p.locator(`.navigation [data-nav="${route}"]`).click();
const idle = (p) => expect(p.locator("#app")).not.toHaveClass(/busy/);
async function result(p, earned) {
  await p.evaluate((earned) => {
    if (earned) {
      window.adCallbacks.onRewarded();
      window.adCallbacks.onRewarded();
    }
    window.adCallbacks.onClose();
    window.adCallbacks.onClose();
  }, earned);
  await idle(p);
}
try {
  const local = await page(false);
  await nav(local, "bonuses");
  await expect(local.locator('[data-ad="daily"]')).toBeDisabled();
  await local.waitForTimeout(1100);
  await expect(local.locator('[data-ad="daily"]')).toBeDisabled();
  const initial = await saved(local);
  await local.locator('[data-action="daily"]').click();
  assert.equal((await saved(local)).coins, initial.coins + 50);
  await local.close();
  checks.push(
    "Ordinary daily reward works without SDK; doubling stays disabled after timer refresh",
  );

  const p = await page(true);
  await nav(p, "bonuses");
  const contrast = await p.locator('[data-ad="daily"]').evaluate((button) => {
    const style = getComputedStyle(button);
    const luminance = (color) => {
      const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const values = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => a - b);
    return (values[1] + 0.05) / (values[0] + 0.05);
  });
  assert.ok(contrast >= 4.5, `Daily ad label contrast is ${contrast}`);
  const before = await saved(p);
  await p.locator('[data-ad="daily"]').click();
  await result(p, false);
  assert.equal((await saved(p)).coins, before.coins);
  assert.equal((await saved(p)).dailyAt, 0);
  await expect(p.locator('[data-action="daily"]')).toBeEnabled();
  await p.locator('[data-ad="daily"]').click();
  await result(p, true);
  const daily = await saved(p);
  assert.equal(daily.coins, before.coins + 100);
  assert.equal(daily.xp, before.xp);
  assert.equal(daily.receipts.length, before.receipts.length + 1);
  await p.reload({ waitUntil: "networkidle" });
  await nav(p, "bonuses");
  await expect(p.locator('[data-ad="daily"]')).toBeDisabled();
  await expect(p.locator('[data-action="daily"]')).toBeDisabled();
  assert.equal((await saved(p)).coins, daily.coins);
  checks.push(
    "Daily close gives no reward or cooldown; successful doubled reward persists once despite duplicate callbacks",
  );

  await seed(p, { aimHits: 50 });
  await nav(p, "tasks");
  const taskStart = await saved(p);
  await p.locator('[data-quest-ad="aim"]').click();
  await p.evaluate(() => window.adCallbacks.onError(new Error("no inventory")));
  await idle(p);
  assert.equal((await saved(p)).coins, taskStart.coins);
  await expect(p.locator('[data-quest="aim"]')).toBeEnabled();
  await p.locator('[data-quest="aim"]').click();
  assert.equal((await saved(p)).coins, taskStart.coins + 150);
  await expect(p.locator('[data-quest-ad="aim"]')).toHaveCount(0);
  await p.locator('[data-quest-ad="clicks"]').click();
  await result(p, true);
  const tasks = await saved(p);
  assert.equal(tasks.coins, taskStart.coins + 350);
  assert.equal(tasks.xp, taskStart.xp);
  assert.equal(tasks.questClaims.filter((id) => id === "clicks").length, 1);
  await p.reload({ waitUntil: "networkidle" });
  await nav(p, "tasks");
  await expect(p.locator('[data-quest="clicks"]')).toBeDisabled();
  assert.equal((await saved(p)).coins, tasks.coins);
  checks.push(
    "Failed task ad leaves ordinary claim; earned ad doubles only coins once and survives reload",
  );

  await seed(p, { questClaims: [] });
  for (const width of [1280, 390, 320]) {
    await p.setViewportSize({ width, height: 900 });
    await nav(p, "tasks");
    const fits = await p
      .locator(".quest-card .claim-actions button")
      .evaluateAll((buttons) =>
        buttons.every((b) => {
          const r = b.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth && r.height >= 32;
        }),
      );
    assert.ok(fits, `claim buttons fit ${width}px`);
  }
  await p.screenshot({
    path: "artifacts/storm/optional-ad-claims-mobile.png",
    fullPage: true,
  });
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.screenshot({
    path: "artifacts/storm/optional-ad-claims-desktop.png",
    fullPage: true,
  });
  checks.push("Ordinary and optional ad claims fit 1280, 390 and 320px widths");
  await p.close();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/storm/ad-claims-report.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        url,
        passed: checks.length,
        checks,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(checks.map((c) => "PASS " + c).join("\n"));
} finally {
  await browser.close();
}
