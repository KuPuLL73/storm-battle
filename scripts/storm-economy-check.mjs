import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const key = "storm-battle.save.v1";
const browser = await chromium.launch();
const checks = [],
  errors = [];
async function page(sdk = false) {
  const p = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "ru-RU",
  });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(
    ({ key, sdk }) => {
      const seed = sessionStorage.getItem("storm-economy-seed");
      if (seed) {
        sessionStorage.removeItem("storm-economy-seed");
        const envelope = JSON.parse(localStorage.getItem(key));
        Object.assign(envelope.data.run, JSON.parse(seed));
        localStorage.setItem(key, JSON.stringify(envelope));
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
                window.rewardedCalls = (window.rewardedCalls || 0) + 1;
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
const saved = (p) =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)).data.run, key);
async function seed(p, data) {
  await p.evaluate(
    (data) =>
      sessionStorage.setItem("storm-economy-seed", JSON.stringify(data)),
    data,
  );
  await p.reload({ waitUntil: "networkidle" });
}
const aim = (p) => p.locator('.navigation [data-nav="bonuses"]').click();
try {
  const p = await page();
  await aim(p);
  await expect(p.locator('[data-aim-upgrade="reward"]')).toBeDisabled();
  await seed(p, { coins: 5000 });
  await aim(p);
  await p.locator('[data-aim-upgrade="reward"]').click();
  assert.equal((await saved(p)).coins, 4600);
  await expect(p.locator('[data-aim-upgrade="reward"]')).toBeDisabled();
  await expect(
    p.locator(".aim-upgrade-card").first().locator(".aim-unlock"),
  ).toContainText("2");
  await p.waitForTimeout(1100);
  await expect(p.locator('[data-aim-upgrade="reward"]')).toBeDisabled();
  await seed(p, {
    xp: 780,
    coins: 94599,
    farmLevel: 14,
    aimSizeLevel: 10,
    aimComboLevel: 5,
    aimIncome: 192681,
  });
  await aim(p);
  await expect(p.locator("[data-aim-value]")).toContainText("30");
  await expect(
    p.locator(".aim-upgrade-card").first().locator(".upgrade-preview"),
  ).toContainText("30 → 32");
  await expect(p.locator('[data-aim-upgrade="reward"]')).toBeDisabled();
  await p.locator(".aim-target").click();
  assert.equal((await saved(p)).coins, 94629);
  assert.equal((await saved(p)).xp, 780);
  assert.equal((await saved(p)).farmLevel, 14);
  await p.screenshot({ path: "artifacts/storm/rebalanced-aim.png" });
  const icons = p.locator(".navigation img.nav-art");
  await expect(icons).toHaveCount(7);
  await expect(p.locator(".navigation svg")).toHaveCount(0);
  const iconSources = await icons.evaluateAll(async (imgs) => {
    await Promise.all(imgs.map((img) => img.decode()));
    return imgs.map((img) => ({ src: img.src, width: img.naturalWidth }));
  });
  assert.equal(new Set(iconSources.map((i) => i.src)).size, 7);
  assert.ok(iconSources.every((i) => i.width === 96));
  await expect(p.locator('[data-action="settings"] img')).toHaveAttribute(
    "src",
    /settings\.webp$/,
  );
  await p.locator('[data-action="settings"]').click();
  await expect(p.locator("#modal")).toBeVisible();
  await p.locator("#modal .picker-done").click();
  for (const width of [390, 320]) {
    await p.setViewportSize({ width, height: 844 });
    const buttons = await p
      .locator(".navigation button")
      .evaluateAll((buttons) =>
        buttons.map((b) => {
          const r = b.getBoundingClientRect();
          return { left: r.left, right: r.right };
        }),
      );
    assert.ok(buttons.every((b) => b.left >= 0 && b.right <= width));
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
  }
  await p.screenshot({ path: "artifacts/storm/rebalanced-mobile.png" });
  checks.push(
    "Existing aim save receives bounded payouts; upgrade locks survive timer refresh; generated icons load and fit desktop/mobile",
  );
  await seed(p, { giftAt: [0, 0, 0] });
  await aim(p);
  for (const button of await p.locator("[data-gift]").all()) {
    await expect(button).toBeDisabled();
    await expect(button).toContainText("за рекламу");
  }
  await p.waitForTimeout(1100);
  for (const button of await p.locator("[data-gift]").all())
    await expect(button).toBeDisabled();
  checks.push(
    "Locally expired gifts remain disabled when rewarded ads are unavailable",
  );
  await p.close();

  const ad = await page(true);
  await aim(ad);
  await expect(ad.locator('[data-gift="0"]')).toBeDisabled();
  await seed(ad, { giftAt: [0, 0, 0] });
  await aim(ad);
  const before = await saved(ad);
  await ad.locator('[data-gift="0"]').click();
  await ad.evaluate(() => window.adCallbacks.onClose());
  await expect(ad.locator("#app")).not.toHaveClass(/busy/);
  assert.deepEqual((await saved(ad)).inventory, before.inventory);
  assert.deepEqual((await saved(ad)).giftAt, [0, 0, 0]);
  await ad.locator('[data-gift="0"]').click();
  await ad.evaluate(() => {
    window.adCallbacks.onRewarded();
    window.adCallbacks.onRewarded();
    window.adCallbacks.onClose();
    window.adCallbacks.onClose();
  });
  await expect(ad.locator("#app")).not.toHaveClass(/busy/);
  const after = await saved(ad);
  assert.equal(after.inventory.length, before.inventory.length + 1);
  assert.equal(after.receipts.length, before.receipts.length + 1);
  assert.ok(after.giftAt[0] > Date.now());
  assert.equal(after.giftAt[1], 0);
  assert.equal(after.coins, before.coins);
  assert.equal(after.xp, before.xp);
  await ad.reload({ waitUntil: "networkidle" });
  await aim(ad);
  assert.deepEqual((await saved(ad)).inventory, after.inventory);
  assert.deepEqual((await saved(ad)).giftAt, after.giftAt);
  await expect(ad.locator('[data-gift="0"]')).toBeDisabled();
  await ad.locator('[data-gift="1"]').click();
  await ad.evaluate(() => window.adCallbacks.onError(new Error("no ad")));
  await expect(ad.locator("#app")).not.toHaveClass(/busy/);
  assert.deepEqual((await saved(ad)).inventory, after.inventory);
  assert.equal((await saved(ad)).giftAt[1], 0);
  await ad.locator(".timed-gifts").scrollIntoViewIfNeeded();
  await ad.screenshot({ path: "artifacts/storm/rewarded-gifts.png" });
  checks.push(
    "Timed gifts require successful SDK reward, reject closed/failed ads, ignore duplicate callbacks and persist one item/cooldown on reload",
  );
  await ad.close();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/storm/economy-browser-report.json",
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
