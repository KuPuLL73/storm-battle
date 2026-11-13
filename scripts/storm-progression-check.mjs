import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const key = "storm-battle.save.v1";
const browser = await chromium.launch();
const p = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  locale: "ru-RU",
});
await p.addInitScript((key) => {
  const seed = sessionStorage.getItem("storm-test-seed");
  if (!seed) return;
  sessionStorage.removeItem("storm-test-seed");
  const envelope = JSON.parse(localStorage.getItem(key));
  const values = JSON.parse(seed);
  Object.assign(envelope.data.run, values);
  if (values.oldSave) delete envelope.data.run.levelRewards;
  delete envelope.data.run.oldSave;
  localStorage.setItem(key, JSON.stringify(envelope));
}, key);
const errors = [],
  failures = [],
  checks = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/sdk.js"))
    failures.push(`${r.status()} ${r.url()}`);
});
const state = () =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)).data.run, key);
async function seed(values) {
  await p.evaluate(
    (values) =>
      sessionStorage.setItem("storm-test-seed", JSON.stringify(values)),
    values,
  );
  await p.reload({ waitUntil: "networkidle" });
}
async function images() {
  const missing = await p.locator("img").evaluateAll(async (imgs) => {
    for (const img of imgs) img.loading = "eager";
    await Promise.allSettled(imgs.map((img) => img.decode()));
    return imgs.filter((img) => !img.naturalWidth).map((img) => img.src);
  });
  assert.deepEqual(missing, []);
}
try {
  await p.goto(url, { waitUntil: "networkidle" });
  await expect(p.locator(".case-card")).toHaveCount(33);
  await expect(p.locator(".catalog-level")).toHaveCount(10);
  await images();
  await p.locator('[data-case="street"]').click();
  for (const quantity of [2, 3, 5])
    await expect(p.locator(`[data-quantity="${quantity}"]`)).toBeDisabled();
  await seed({ coins: 1000, xp: 49 });
  await p.locator('[data-case="street"]').click();
  await p.locator('[data-action="open"]').click();
  await p.locator('[data-action="skip"]').click();
  await expect(p.locator(".level-unlock")).toContainText("Новый уровень 2");
  await p.locator('[data-result="keep"]').click();
  await p.locator('.navigation [data-nav="cases"]').click();
  await p.locator('[data-level-reward="2"]').click();
  await expect(p.locator("#modal h2")).toHaveText("Сундук за уровень 2");
  const earned = await state();
  assert.deepEqual(earned.levelRewards, [2]);
  assert.equal(earned.inventory.length, 6);
  await p.screenshot({ path: "artifacts/storm/desktop-level-reward.png" });
  await p.reload({ waitUntil: "networkidle" });
  assert.deepEqual((await state()).pending, earned.pending);
  await p.locator('[data-result="keep"]').click();
  await expect(p.locator('[data-level-reward="2"]')).toBeDisabled();
  checks.push(
    "Real level-up reveals expensive premium reward; reload preserves same item, claim and inventory",
  );

  // Old saves have no levelRewards field; previous levels must remain claimable.
  await seed({ xp: 1800, oldSave: true });
  for (const level of [2, 3, 4, 5, 6])
    await expect(p.locator(`[data-level-reward="${level}"]`)).toBeEnabled();
  await expect(p.locator('[data-level-reward="7"]')).toBeDisabled();
  checks.push("Old six-level save receives all five earned premium cases");

  for (const [xp, count, other] of [
    [200, 2, 3],
    [1000, 3, 5],
    [4400, 5, null],
  ]) {
    await seed({ xp, coins: 1000 });
    await p.locator('[data-case="street"]').click();
    await expect(p.locator(`[data-quantity="${count}"]`)).toBeEnabled();
    if (other)
      await expect(p.locator(`[data-quantity="${other}"]`)).toBeDisabled();
    await p.locator(`[data-quantity="${count}"]`).click();
    await p.locator('[data-action="open"]').click();
    await expect(p.locator(".storm-reel")).toHaveCount(count);
    await p.locator('[data-action="skip"]').click();
    await expect(p.locator("#modal .result-skin")).toHaveCount(count);
    await p.locator('[data-result="keep"]').click();
  }
  checks.push("Two, three and five actual reels unlock at levels 3, 5 and 8");

  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await p.setViewportSize(size);
    for (const route of [
      "cases",
      "upgrade",
      "contracts",
      "battles",
      "inventory",
      "bonuses",
      "tasks",
    ]) {
      await p.locator(`.navigation [data-nav="${route}"]`).click();
      await images();
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${size.width} ${route}`,
      );
      if (size.width === 1440 || size.width === 390)
        await p.screenshot({
          path: `artifacts/storm/redesign-${size.width}-${route}.png`,
        });
    }
  }
  checks.push(
    "All seven screens at desktop, portrait, landscape and 320px; every image loads; no page overflow",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await writeFile(
    "artifacts/storm/progression-browser-report.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        url,
        passed: checks.length,
        checks,
        errors,
        failures,
      },
      null,
      2,
    ),
  );
  console.log("PASS", checks.join("\nPASS "));
} finally {
  await browser.close();
}
