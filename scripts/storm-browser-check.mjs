import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const key = "storm-battle.save.v1";
await mkdir("artifacts/storm", { recursive: true });
const browser = await chromium.launch();
const report = [];
const saved = (p) =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)).data.run, key);
// Isolated browser contexts only; seed prerequisite progression for locked features.
async function configure(p, values) {
  await p.evaluate(
    (values) =>
      sessionStorage.setItem("storm-test-seed", JSON.stringify(values)),
    values,
  );
  await p.reload({ waitUntil: "networkidle" });
}
const navigate = (p, route) =>
  p.locator(`.navigation [data-nav="${route}"]`).click();
async function fresh(
  viewport = { width: 1440, height: 1000 },
  locale = "ru-RU",
) {
  const p = await browser.newPage({ viewport, locale });
  await p.addInitScript((key) => {
    const seed = sessionStorage.getItem("storm-test-seed");
    if (!seed) return;
    sessionStorage.removeItem("storm-test-seed");
    const envelope = JSON.parse(localStorage.getItem(key));
    Object.assign(envelope.data.run, JSON.parse(seed));
    localStorage.setItem(key, JSON.stringify(envelope));
  }, key);
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  await p.goto(url, { waitUntil: "networkidle" });
  return p;
}
async function check(name, fn) {
  await fn();
  report.push(name);
  console.log("PASS", name);
}
try {
  await check(
    "Desktop catalog, four starters, authored art and locked case inspection",
    async () => {
      const p = await fresh();
      assert.equal((await saved(p)).inventory.length, 4);
      await expect(p.locator(".case-card")).toHaveCount(33);
      await expect(p.locator(".case-drop-preview")).toHaveCount(0);
      await p.locator('[data-case="dragon50"]').click();
      await expect(p.locator('[data-action="open"]')).toBeDisabled();
      await expect(p.locator(".drop-odds")).toHaveCount(2);
      assert.deepEqual(await p.locator(".drop-odds").allTextContents(), [
        "50,00%",
        "50,00%",
      ]);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Opening is committed once before the reel and survives a reload",
    async () => {
      const p = await fresh();
      await p.locator('[data-case="street"]').click();
      await p.locator('[data-action="open"]').click();
      const before = await saved(p);
      assert.equal(before.coins, 100);
      assert.equal(before.opened, 1);
      assert.equal(before.pending.kind, "case");
      await p.reload({ waitUntil: "networkidle" });
      await expect(p.locator("#modal")).toBeVisible();
      const after = await saved(p);
      assert.deepEqual(after.pending, before.pending);
      assert.equal(after.inventory.length, 5);
      await p.locator('[data-result="keep"]').click();
      assert.equal((await saved(p)).pending, null);
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Aim training upgrades, hit income, misses, pause and no holding income",
    async () => {
      const p = await fresh();
      await navigate(p, "bonuses");
      await expect(p.locator("h1")).toHaveText("Аимка");
      await expect(p.locator(".earn-pad,[data-farm-mode]")).toHaveCount(0);
      await expect(p.locator('[data-aim-upgrade="reward"]')).toBeDisabled();
      await configure(p, { coins: 1500 });
      await navigate(p, "bonuses");
      await p.locator('[data-aim-upgrade="reward"]').click();
      assert.equal((await saved(p)).farmLevel, 2);
      assert.equal((await saved(p)).coins, 1100);
      for (let i = 0; i < 5; i++) {
        await p.locator(".aim-target").click();
        await p.waitForTimeout(365);
      }
      const hit = await saved(p);
      assert.equal(hit.aimHits, 5);
      assert.equal(hit.coins, 1131);
      assert.equal(hit.aimBestStreak, 5);
      await p.locator(".aim-arena").click({ position: { x: 10, y: 100 } });
      await expect(p.locator("[data-aim-streak]")).toHaveText("0");
      const balance = (await saved(p)).coins;
      const r = await p.locator(".aim-arena").boundingBox();
      await p.mouse.move(r.x + 12, r.y + 100);
      await p.mouse.down();
      await p.waitForTimeout(700);
      await p.mouse.up();
      assert.equal((await saved(p)).coins, balance);
      await p.evaluate(() => dispatchEvent(new Event("blur")));
      await p.locator(".aim-target").click();
      assert.equal((await saved(p)).coins, balance);
      await p.evaluate(() => dispatchEvent(new Event("focus")));
      await p.locator('[data-aim-upgrade="target"]').click();
      assert.equal((await saved(p)).aimSizeLevel, 2);
      await expect(p.locator(".aim-target")).toHaveCSS("width", "65px");
      await p.screenshot({ path: "artifacts/storm/desktop-aim.png" });
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Contracts consume exactly the selected inputs, display an outcome and persist once",
    async () => {
      const p = await fresh();
      await navigate(p, "contracts");
      for (const uid of [1, 2, 3])
        await p
          .locator(`.contract-workspace [data-contract-select="${uid}"]`)
          .click();
      await expect(p.locator('[data-action="contract"]')).toBeEnabled();
      await p.screenshot({ path: "artifacts/storm/desktop-contract.png" });
      await p.locator('[data-action="contract"]').click();
      await expect(p.locator("#modal")).toBeVisible();
      const state = await saved(p);
      assert.equal(state.contracts, 1);
      assert.equal(state.inventory.length, 2);
      assert.equal(state.pending.kind, "contract");
      await p.locator('[data-result="keep"]').click();
      await p.reload({ waitUntil: "networkidle" });
      assert.equal((await saved(p)).contracts, 1);
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Upgrade inputs, target filters, chance shortcuts and persisted resolution",
    async () => {
      const p = await fresh();
      await navigate(p, "upgrade");
      await p.locator('[data-select="1"]').click();
      await p.locator('[data-chance="50"]').click();
      const chance = Number(
        (await p.locator("#chance-value").textContent())
          .replace("%", "")
          .replace(",", "."),
      );
      assert.ok(chance >= 1 && chance <= 80);
      await p.locator("#min-price").fill("1000");
      const prices = await p.locator("#target-list .money").allTextContents();
      assert.ok(prices.length > 0);
      await p.locator("#skin-search").fill("Vulcan");
      await expect(p.locator("#target-list .skin-card")).toHaveCount(1);
      await p.locator("#skin-search").fill("");
      await p.locator("#min-price").fill("");
      await p.locator('[data-action="upgrade"]').click();
      const before = await saved(p);
      assert.equal(before.upgradeAttempts, 1);
      assert.ok(!before.inventory.some((i) => i.uid === 1));
      await p.reload({ waitUntil: "networkidle" });
      await expect(p.locator("#modal")).toBeVisible();
      assert.deepEqual((await saved(p)).pending, before.pending);
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Configurable bot battle reveals each round and uses the same fixed result after reload",
    async () => {
      const p = await fresh();
      await navigate(p, "battles");
      await p.locator("#battle-case").selectOption("budget");
      await p.locator("#battle-rounds").selectOption("2");
      await p.screenshot({ path: "artifacts/storm/desktop-battles.png" });
      await p.locator('[data-action="battle"]').click();
      const state = await saved(p);
      assert.equal(state.coins, 80);
      assert.equal(state.pending.playerDrops.length, 2);
      await expect(p.locator("#modal h2")).toHaveText("Раунд 1 / 2");
      await expect(p.locator("#modal .reel-track")).toHaveCount(2);
      await p.evaluate(() => dispatchEvent(new Event("blur")));
      await p.screenshot({ path: "artifacts/storm/desktop-battle-live.png" });
      await p.locator('[data-action="skip"]').click();
      await expect(p.locator("#modal h2")).toHaveText("Раунд 2 / 2");
      await p.locator('[data-action="skip"]').click();
      await expect(p.locator('[data-result="keep"]')).toBeVisible();
      await p.screenshot({ path: "artifacts/storm/desktop-battle-result.png" });
      assert.equal((await saved(p)).battles, 1);
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Completed tasks require a claim and never pay twice",
    async () => {
      const p = await fresh();
      await navigate(p, "bonuses");
      for (let i = 0; i < 50; i++) {
        await p.locator(".aim-target").click();
        await p.waitForTimeout(365);
      }
      assert.equal((await saved(p)).aimHits, 50);
      const beforeClaim = (await saved(p)).coins;
      await navigate(p, "tasks");
      await p.locator('[data-quest="clicks"]').click();
      assert.equal((await saved(p)).coins, beforeClaim + 100);
      await expect(p.locator('[data-quest="clicks"]')).toBeDisabled();
      await p.reload({ waitUntil: "networkidle" });
      assert.equal((await saved(p)).coins, beforeClaim + 100);
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Local preview has no fake ad payout; production SDK callbacks award once only",
    async () => {
      const local = await fresh();
      await navigate(local, "bonuses");
      await expect(
        local.locator('.aim-extra-points [data-ad="coins"]'),
      ).toBeDisabled();
      await expect(local.locator('[data-action="free"]')).toBeDisabled();
      await local.waitForTimeout(1100);
      await expect(local.locator('[data-action="free"]')).toBeDisabled();
      await local.close();
      const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      p.errors = [];
      p.on("pageerror", (e) => p.errors.push(e.message));
      await p.addInitScript(() => {
        window.sdkEvents = [];
        window.YaGames = {
          init: async () => ({
            environment: { i18n: { lang: "ru" } },
            features: {
              LoadingAPI: { ready: () => window.sdkEvents.push("ready") },
              GameplayAPI: {
                start: () => window.sdkEvents.push("start"),
                stop: () => window.sdkEvents.push("stop"),
              },
            },
            adv: {
              showRewardedVideo: ({ callbacks }) => {
                window.adCallbacks = callbacks;
                callbacks.onOpen();
              },
            },
            serverTime: () => Date.now(),
          }),
        };
      });
      await p.goto(url + "/?platform=1", { waitUntil: "networkidle" });
      await navigate(p, "bonuses");
      const start = (await saved(p)).coins;
      await p.locator('.aim-extra-points [data-ad="coins"]').click();
      await p.evaluate(() => window.adCallbacks.onClose());
      await p.waitForTimeout(100);
      assert.equal((await saved(p)).coins, start);
      await p.locator('.aim-extra-points [data-ad="coins"]').click();
      await p.evaluate(() => {
        window.adCallbacks.onRewarded();
        window.adCallbacks.onRewarded();
        window.adCallbacks.onClose();
        window.adCallbacks.onClose();
      });
      await p.waitForTimeout(100);
      assert.equal((await saved(p)).coins, start + 200);
      const prior = await saved(p);
      await p.locator('[data-action="free"]').click();
      await p.evaluate(() => window.adCallbacks.onClose());
      await p.waitForTimeout(100);
      assert.equal((await saved(p)).opened, prior.opened);
      assert.equal((await saved(p)).freeAt, prior.freeAt);
      await p.locator('[data-action="free"]').click();
      await p.evaluate(() => {
        window.adCallbacks.onRewarded();
        window.adCallbacks.onRewarded();
        window.adCallbacks.onClose();
        window.adCallbacks.onClose();
      });
      await expect(p.locator(".storm-reel")).toHaveCount(1);
      const rewarded = await saved(p);
      assert.equal(rewarded.opened, prior.opened + 1);
      assert.equal(rewarded.coins, prior.coins);
      assert.ok(rewarded.freeAt > Date.now());
      await p.reload({ waitUntil: "networkidle" });
      assert.deepEqual((await saved(p)).pending, rewarded.pending);
      await p.locator('[data-result="keep"]').click();
      await navigate(p, "cases");
      await expect(p.locator('[data-action="free"]')).toBeDisabled();
      assert.ok(await p.evaluate(() => window.sdkEvents.includes("ready")));
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Mobile navigation, every main screen, English copy and no horizontal overflow",
    async () => {
      const p = await fresh({ width: 390, height: 844 });
      for (const route of [
        "cases",
        "upgrade",
        "contracts",
        "battles",
        "inventory",
        "bonuses",
        "tasks",
      ]) {
        await navigate(p, route);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          route,
        );
        const button = p.locator(`.navigation [data-nav="${route}"]`),
          r = await button.boundingBox();
        assert.ok(r.x >= 0 && r.x + r.width <= 390, route + " nav visible");
        await p.screenshot({ path: `artifacts/storm/mobile-${route}.png` });
      }
      await navigate(p, "upgrade");
      await p.locator('[data-action="pick-source"]').click();
      await p.locator('[data-modal-source="1"]').click();
      await p.locator(".picker-done").click();
      await p.locator('[data-action="pick-target"]').click();
      await p.locator("#modal-target-search").fill("Cyrex");
      await p.locator('#modal-target-list [data-target="2"]').click();
      await expect(p.locator("#modal")).not.toBeVisible();
      await expect(p.locator('[data-action="upgrade"]')).toBeEnabled();
      await navigate(p, "bonuses");
      await p.locator(".aim-target").click();
      assert.equal((await saved(p)).aimHits, 1);
      await p.locator('[data-action="settings"]').click();
      await p.locator('[data-setting="language"]').click();
      await p.locator("#modal .picker-done").click();
      await expect(p.locator("html")).toHaveAttribute("lang", "en");
      await expect(p.locator("h1")).toHaveText("Aim trainer");
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );

  await check(
    "Three simultaneous case reels pause together and keep the true winner centered after rotation",
    async () => {
      const p = await fresh();
      await p.locator('[data-action="first-case"]').click();
      await expect(p.locator('[data-result="keep"]')).toBeVisible({
        timeout: 6500,
      });
      await p.screenshot({
        path: "artifacts/storm/desktop-opening-result.png",
      });
      await p.locator('[data-result="sell"]').click();
      // Level five unlocks three-case opening; starter balance covers its cost.
      await p.close();
      const q = await fresh();
      await configure(q, { xp: 1000 });
      await q.locator('[data-case="street"]').click();
      await q.locator('[data-quantity="3"]').click();
      await q.locator('[data-action="open"]').click();
      await expect(q.locator(".storm-reel")).toHaveCount(3);
      const state = await saved(q);
      assert.equal(state.opened, 3);
      assert.equal(state.coins, 50);
      assert.equal(state.inventory.length, 7);
      await expect(q.locator(".drop-strip")).toHaveCount(0);
      await q.evaluate(() => dispatchEvent(new Event("blur")));
      assert.deepEqual(
        await q
          .locator(".reel-track")
          .evaluateAll((tracks) =>
            tracks.map((el) => el.getAnimations()[0].playState),
          ),
        ["paused", "paused", "paused"],
      );
      await q.setViewportSize({ width: 390, height: 844 });
      await q.locator(".reel-track").evaluateAll((tracks) => {
        for (const el of tracks) {
          const a = el.getAnimations()[0],
            t = a.effect.getTiming();
          a.pause();
          a.currentTime = Number(t.duration) + t.delay - 1;
        }
      });
      await q.waitForTimeout(50);
      const centers = await q.locator(".storm-reel").evaluateAll((lanes) =>
        lanes.map((el) => {
          const winner = el
              .querySelector(".committed-drop")
              .getBoundingClientRect(),
            window = el.querySelector(".reel-window").getBoundingClientRect();
          return Math.abs(
            winner.x + winner.width / 2 - window.x - window.width / 2,
          );
        }),
      );
      assert.ok(
        centers.every((x) => x < 1.5),
        JSON.stringify(centers),
      );
      assert.deepEqual(
        await q
          .locator(".committed-drop")
          .evaluateAll((els) => els.map((e) => Number(e.dataset.skin))),
        state.pending.skinIds,
      );
      await q.screenshot({ path: "artifacts/storm/mobile-batch-opening.png" });
      await q.locator('[data-action="skip"]').click();
      await expect(q.locator("#modal .result-skin")).toHaveCount(3);
      assert.deepEqual((await saved(q)).pending, state.pending);
      assert.deepEqual(q.errors, []);
      await q.close();
    },
  );
  await check(
    "Five case drops display all five reels and a level unlock notification",
    async () => {
      const p = await fresh();
      await configure(p, { xp: 6390, coins: 500 });
      await p.locator('[data-case="budget"]').click();
      await p.locator('[data-quantity="5"]').click();
      await p.locator('[data-action="open"]').click();
      await expect(p.locator(".storm-reel")).toHaveCount(5);
      await p.evaluate(() => dispatchEvent(new Event("blur")));
      await p.locator(".reel-track").evaluateAll((tracks) =>
        tracks.forEach((el) => {
          const a = el.getAnimations()[0];
          a.currentTime = 1800;
        }),
      );
      await p.screenshot({ path: "artifacts/storm/desktop-batch-opening.png" });
      await p.locator('[data-action="skip"]').click();
      await expect(p.locator("#modal .result-skin")).toHaveCount(5);
      await expect(p.locator(".level-unlock")).toContainText("Новый уровень 9");
      assert.equal((await saved(p)).opened, 5);
      await p.locator('[data-result="catalog"]').click();
      await expect(p.locator(".case-card.locked")).toHaveCount(0);
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "A missing balance has an earning goal and repeat opening sells only the previous result",
    async () => {
      const p = await fresh();
      await p.locator('[data-case="street"]').click();
      await p.locator('[data-action="open"]').click();
      await p.locator('[data-action="skip"]').click();
      const first = await saved(p);
      const value = await p.locator("#modal .result-skin .money").textContent();
      const sale = Number(value.replace(/[^0-9]/g, ""));
      await p.locator('[data-result="sell-repeat"]').click();
      const second = await saved(p);
      assert.equal(second.opened, 2);
      assert.equal(second.coins, first.coins + sale - 50);
      assert.ok(
        !second.inventory.some((i) => first.pending.uids.includes(i.uid)),
      );
      assert.ok(second.inventory.some((i) => i.uid === 1));
      await p.locator('[data-action="skip"]').click();
      await p.locator('[data-result="keep"]').click();
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "An unaffordable opening has a live earning goal and returns to the chosen quantity",
    async () => {
      const p = await fresh();
      await configure(p, { xp: 4400 });
      await p.locator('[data-case="street"]').click();
      await p.locator('[data-quantity="5"]').click();
      await expect(p.locator('[data-action="earn-needed"]')).toBeVisible();
      await p.locator('[data-action="earn-needed"]').click();
      await expect(p.locator(".farm-goal")).toBeVisible();
      const goal = await p.locator("[data-goal-missing]").textContent();
      assert.ok(goal.includes("Осталось"));
      await expect(p.locator('[data-action="return-case"]')).toBeDisabled();
      // Earn the missing amount through the real click action (no save injection).
      for (
        let i = 0;
        i < 120 &&
        (await p.locator('[data-action="return-case"]').isDisabled());
        i++
      ) {
        await p.locator(".aim-target").click();
        await p.waitForTimeout(365);
      }
      await expect(p.locator('[data-action="return-case"]')).toBeEnabled();
      await p.locator('[data-action="return-case"]').click();
      await expect(p.locator('[data-action="open"]')).toBeEnabled();
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "RTP panel is removed while individual drop odds remain visible",
    async () => {
      const p = await fresh();
      await p.locator('[data-case="street"]').click();
      await expect(p.locator(".case-odds-summary")).toHaveCount(0);
      assert.ok((await p.locator(".drop-odds").count()) > 0);
      await p.screenshot({ path: "artifacts/storm/desktop-case-odds.png" });
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Settings persist language and orientation and support both phone layouts",
    async () => {
      const p = await fresh({ width: 390, height: 844 });
      await p.locator('[data-action="settings"]').click();
      // Simulate an unsupported orientation API without requiring device rotation.
      await p.evaluate(() =>
        Object.defineProperty(screen.orientation, "lock", {
          configurable: true,
          value: undefined,
        }),
      );
      await p.locator('[data-orientation="landscape"]').click();
      await expect(p.locator(".orientation-result")).toContainText(
        "Поверни телефон",
      );
      await p.locator('[data-setting="language"]').click();
      assert.equal((await saved(p)).orientation, "landscape");
      assert.equal((await saved(p)).language, "en");
      await p.screenshot({ path: "artifacts/storm/mobile-settings.png" });
      await p.locator("#modal .picker-done").click();
      await p.reload({ waitUntil: "networkidle" });
      await expect(p.locator("html")).toHaveAttribute("lang", "en");
      await navigate(p, "bonuses");
      await p.setViewportSize({ width: 844, height: 390 });
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await p.locator(".aim-target").click();
      assert.equal((await saved(p)).aimHits, 1);
      await p.screenshot({ path: "artifacts/storm/mobile-landscape-aim.png" });
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await check(
    "Generated art loads, lobby presets keep opponent identity and rules describe simulation",
    async () => {
      const p = await fresh();
      const coin = p.locator(".wallet .coin-mark");
      await expect(coin).toHaveJSProperty("naturalWidth", 128);
      for (const file of [
        "armory.webp",
        "reward.webp",
        "emblem.png",
        "player.webp",
        "daily.webp",
        "wheel.webp",
        "ticket.webp",
        "inventory.webp",
        "upgrade.webp",
        "aim.png",
        "avatars.png",
        "coin.png",
      ]) {
        const response = await p.request.get(url + "/storm/art/" + file);
        assert.equal(response.status(), 200);
        assert.ok(response.headers()["content-type"].startsWith("image/"));
      }
      await p.screenshot({ path: "artifacts/storm/desktop-cases.png" });
      await navigate(p, "battles");
      await expect(p.locator(".lobby-card")).toHaveCount(3);
      await p.locator(".lobby-rules summary").click();
      await expect(p.locator(".lobby-rules p")).toContainText("симуляция");
      await p.locator('[data-battle-preset="street"]').click();
      assert.equal((await saved(p)).pending.opponentId, "fox");
      await expect(p.locator("#modal")).toContainText("StormFox");
      await p.reload({ waitUntil: "networkidle" });
      await expect(p.locator("#modal")).toContainText("StormFox");
      assert.deepEqual(p.errors, []);
      await p.close();
    },
  );
  await writeFile(
    "artifacts/storm/browser-report.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        url,
        passed: report.length,
        checks: report,
      },
      null,
      2,
    ),
  );
  console.log(`${report.length} browser scenarios passed`);
} finally {
  await browser.close();
}
