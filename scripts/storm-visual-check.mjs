import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const url = process.env.GAME_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch();
const p = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  locale: "ru-RU",
});
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto(url, { waitUntil: "networkidle" });
  await p.screenshot({ path: "artifacts/storm/desktop-cases.png" });
  await p.locator('.navigation [data-nav="battles"]').click();
  await expect(p.locator(".lineup-player .player-portrait")).toHaveJSProperty(
    "naturalWidth",
    128,
  );
  await expect(p.locator(".lineup-player .opponent-avatar").last()).toHaveCSS(
    "background-image",
    /avatars\.png/,
  );
  await expect(p.locator(".lineup-player .opponent-avatar").last()).toHaveCSS(
    "background-size",
    "300% 200%",
  );
  await p.screenshot({ path: "artifacts/storm/desktop-battles.png" });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator('[data-action="settings"]').click();
  await p.evaluate(() => {
    window.orientationCalls = [];
    document.documentElement.requestFullscreen = async () => {
      window.orientationCalls.push("fullscreen");
    };
    Object.defineProperty(screen.orientation, "lock", {
      configurable: true,
      value: async (value) => window.orientationCalls.push(value),
    });
  });
  await p.locator('[data-orientation="landscape"]').click();
  await expect(p.locator(".orientation-result")).toHaveText(
    "Ориентация закреплена.",
  );
  assert.deepEqual(await p.evaluate(() => window.orientationCalls), [
    "fullscreen",
    "landscape",
  ]);
  await p.evaluate(() =>
    Object.defineProperty(screen.orientation, "lock", {
      configurable: true,
      value: undefined,
    }),
  );
  await p.locator('[data-orientation="portrait"]').click();
  await expect(p.locator(".orientation-result")).toContainText(
    "Поверни телефон",
  );
  await p.screenshot({ path: "artifacts/storm/mobile-settings.png" });
  await p.locator("#modal .picker-done").click();
  await p.locator('.navigation [data-nav="bonuses"]').click();
  await p.screenshot({ path: "artifacts/storm/mobile-bonuses.png" });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.setViewportSize({ width: 844, height: 390 });
  await p.locator(".aim-target").click();
  await p.screenshot({ path: "artifacts/storm/mobile-landscape-aim.png" });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/storm/visual-report.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        url,
        passed: true,
        checks: [
          "Lineup avatar image and atlas size",
          "Desktop catalog and lobby screenshots",
          "Settings accessible on portrait phone",
          "Supported orientation calls fullscreen and locks requested orientation (mock)",
          "Unsupported orientation gives manual rotation hint",
          "Portrait and landscape aim layout without horizontal overflow",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Final visual and orientation checks passed");
} finally {
  await browser.close();
}
