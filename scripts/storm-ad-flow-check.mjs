import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { StormGame } from "../src/storm/engine.ts";
const url = process.env.GAME_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch(),
  checks = [],
  errors = [];
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
p.on("pageerror", (e) => errors.push(e.message));
const key = "storm-battle.save.v1";
await p.addInitScript(
  ({ key }) => {
    const seed = sessionStorage.getItem("seed");
    if (seed) {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          data: {
            bestScore: 0,
            bestWave: 0,
            wins: 0,
            sound: false,
            music: false,
            run: JSON.parse(seed),
          },
        }),
      );
      sessionStorage.removeItem("seed");
    }
    window.YaGames = {
      init: async () => ({
        environment: { i18n: { lang: "ru" } },
        features: {
          LoadingAPI: { ready() {} },
          GameplayAPI: { start() {}, stop() {} },
        },
        adv: {
          showRewardedVideo({ callbacks }) {
            window.reward = callbacks;
            window.rewardCalls = (window.rewardCalls || 0) + 1;
            callbacks.onOpen();
          },
          showFullscreenAdv({ callbacks }) {
            window.full = callbacks;
            window.fullCalls = (window.fullCalls || 0) + 1;
            callbacks.onOpen();
          },
        },
        serverTime: () => Date.now(),
      }),
    };
  },
  { key },
);
await p.clock.install();
const save = () =>
  p.evaluate((key) => JSON.parse(localStorage.getItem(key)).data.run, key);
const nav = (route) => p.locator(`.navigation [data-nav="${route}"]`).click();
const seed = async (state) => {
  await p.evaluate(
    (s) => sessionStorage.setItem("seed", JSON.stringify(s)),
    state,
  );
  await p.reload({ waitUntil: "networkidle" });
};
const reward = async (earned) => {
  await p.evaluate((earned) => {
    if (earned) {
      window.reward.onRewarded();
      window.reward.onRewarded();
    }
    window.reward.onClose();
    window.reward.onClose();
  }, earned);
  await expect(p.locator("#app")).not.toHaveClass(/busy/);
};
try {
  await p.goto(url + "/?platform=1", { waitUntil: "networkidle" });
  const g = new StormGame();
  g.state.coins = 100000;
  g.state.fast = true;
  await seed(g.snapshot());
  await p.locator('[data-case="street"]').click();
  const before = await save();
  await p.locator('[data-ad="caseAd"]').click();
  await reward(false);
  assert.equal((await save()).caseAdAt, 0);
  assert.equal((await save()).coins, before.coins);
  await p.locator('[data-ad="caseAd"]').click();
  await reward(true);
  await expect(p.locator('[data-result="keep"]')).toBeVisible({
    timeout: 10000,
  });
  let after = await save();
  assert.equal(after.opened, 1);
  assert.equal(after.xp, before.xp + 10);
  assert.equal(after.coins, before.coins);
  await p.locator('[data-result="keep"]').click();
  await expect(p.locator('[data-ad="caseAd"]')).toBeDisabled();
  checks.push(
    "Selected ad case: cancelled ad costs nothing, successful duplicate callbacks open once, normal XP and shared cooldown",
  );
  for (const width of [1280, 390, 320]) {
    await p.setViewportSize({ width, height: 900 });
    const fits = await p.locator('[data-ad="caseAd"]').evaluate((b) => {
      const r = b.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth;
    });
    assert.ok(fits, `caseAd fits ${width}`);
  }
  await p.setViewportSize({ width: 1280, height: 900 });
  const failed = new StormGame(undefined, () => 0.99);
  failed.upgrade([1], 2);
  await seed(failed.snapshot());
  await expect(p.locator('[data-ad="recovery"]')).toBeVisible();
  const loss = await save();
  await p.locator('[data-ad="recovery"]').click();
  await reward(false);
  assert.equal((await save()).coins, loss.coins);
  await p.locator('[data-ad="recovery"]').click();
  await reward(true);
  after = await save();
  assert.equal(after.coins, loss.coins + 3);
  assert.equal(after.xp, loss.xp);
  await expect(p.locator('[data-ad="recovery"]')).toHaveCount(0);
  await p.reload({ waitUntil: "networkidle" });
  await expect(p.locator('[data-ad="recovery"]')).toHaveCount(0);
  checks.push(
    "Loss recovery: cancellation keeps offer; earned partial return once, no XP, same pending result after reload",
  );
  for (const roll of [0.1, 0.8, 0.55]) {
    const wheel = new StormGame(undefined, () => roll);
    wheel.wheel(Date.now());
    await seed(wheel.snapshot());
    const start = await save();
    if (roll === 0.55) {
      await expect(p.locator('[data-ad="wheelBonus"]')).toHaveCount(0);
      continue;
    }
    await p.locator('[data-ad="wheelBonus"]').click();
    await reward(true);
    after = await save();
    assert.equal(after.xp, start.xp);
    assert.equal(after.coins, start.coins + start.pending.bonusCoins);
    assert.equal(after.tickets, start.tickets + (roll === 0.8 ? 1 : 0));
    await expect(p.locator('[data-ad="wheelBonus"]')).toHaveCount(0);
  }
  checks.push(
    "Wheel: extra coins or ticket awarded once; XP outcome has no advertised multiplier",
  );
  const play = new StormGame();
  play.state.coins = 100000;
  play.state.fast = true;
  await seed(play.snapshot());
  await nav("inventory");
  assert.equal(await p.evaluate(() => window.fullCalls || 0), 0);
  await p.clock.setSystemTime(Date.now() + 185000);
  await nav("cases");
  assert.equal(await p.evaluate(() => window.fullCalls || 0), 1);
  await p.evaluate(() => window.full.onClose(true));
  await expect(p.locator("#app")).not.toHaveClass(/busy/);
  await p.locator('[data-case="street"]').click();
  await p.locator('[data-action="open"]').click();
  await p.locator('[data-result="keep"]').click({ timeout: 10000 });
  assert.equal(await p.evaluate(() => window.fullCalls || 0), 1);
  await p.clock.setSystemTime(Date.now() + 370000);
  await p.locator('[data-action="open"]').click();
  await p.locator('[data-result="keep"]').click({ timeout: 10000 });
  assert.equal(await p.evaluate(() => window.fullCalls || 0), 2);
  await p.evaluate(() => window.full.onClose(false));
  await expect(p.locator("#app")).not.toHaveClass(/busy/);
  await nav("bonuses");
  await p.clock.setSystemTime(Date.now() + 555000);
  await p.clock.runFor(1000);
  await expect(p.locator("#ad-countdown")).toContainText("2");
  assert.equal(await p.evaluate(() => window.fullCalls || 0), 2);
  await p.clock.runFor(1000);
  await expect(p.locator("#ad-countdown")).toContainText("1");
  await p.clock.runFor(1000);
  assert.equal(await p.evaluate(() => window.fullCalls || 0), 3);
  await p.evaluate(() => window.full.onClose(true));
  await expect(p.locator("#app")).not.toHaveClass(/busy/);
  await p.reload({ waitUntil: "networkidle" });
  await nav("inventory");
  assert.equal(await p.evaluate(() => window.fullCalls || 0), 0);
  checks.push(
    "Time-gated navigation and result continuation have no five-result requirement; long aim session pauses for a two-second countdown, resumes and persists quiet interval",
  );
  assert.deepEqual(errors, []);
  await p.screenshot({ path: "artifacts/storm/ad-flow-0.1.3.jpg" });
  await writeFile(
    "artifacts/storm/ad-flow-check.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
}
