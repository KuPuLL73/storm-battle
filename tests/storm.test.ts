import test from "node:test";
import assert from "node:assert/strict";
import {
  StormGame,
  CASES,
  oddsFor,
  CASE_RTP,
  CASE_PROFIT_CHANCE,
  pick,
  caseStats,
  skin,
  FREE_INTERVAL,
  levelFor,
  LEVEL_XP,
  canOpenQuantity,
} from "../src/storm/engine.ts";

test("New discoveries, records and unlocked levels are committed with the drop", () => {
  const g = new StormGame(undefined, () => 1 - 1e-10);
  g.state.xp = 40;
  const p = g.open("street");
  assert.deepEqual(p.newSkinIds, [11]);
  assert.equal(p.newBest, true);
  assert.equal(p.previousLevel, 1);
  assert.equal(g.level, 2);
  const restored = new StormGame(g.snapshot());
  assert.deepEqual(restored.state.pending, p);
  g.dismiss();
  g.state.coins = 100;
  const next = g.open("street");
  assert.deepEqual(next.newSkinIds, []);
  assert.equal(next.newBest, false);
  assert.equal(next.previousLevel, 2);
});
test("A damaged pending battle is discarded while committed coins and inventory survive", () => {
  const g = new StormGame(undefined, () => 0.1);
  g.battle("street");
  const saved = g.snapshot();
  const restored = new StormGame({
    ...saved,
    pending: { ...saved.pending!, botDrops: null },
  });
  assert.equal(restored.state.pending, null);
  assert.equal(restored.state.coins, saved.coins);
  assert.deepEqual(restored.state.inventory, saved.inventory);
  const proper = new StormGame(saved);
  saved.pending!.playerDrops![0] = 34;
  assert.notDeepEqual(
    proper.state.pending!.playerDrops,
    saved.pending!.playerDrops,
  );
});
test("Old or malformed optional result badges cannot break save restoration", () => {
  const g = new StormGame(undefined, () => 0.2);
  g.open("street");
  const saved = g.snapshot();
  const restored = new StormGame({
    ...saved,
    pending: { ...saved.pending!, newSkinIds: { bad: true } },
  });
  assert.deepEqual(restored.state.pending?.newSkinIds, []);
  assert.deepEqual(restored.state.inventory, saved.inventory);
});

test("Case odds sum to one with 88% average return and a 35% profitable drop chance", () => {
  for (const c of CASES) {
    const odds = oddsFor(c);
    assert.ok(odds.every((x) => Number.isFinite(x) && x > 0));
    if (!c.fixed)
      assert.ok(
        Math.abs(
          odds.reduce(
            (sum, p, i) => sum + (skin(c.pool[i]).price > c.price ? p : 0),
            0,
          ) - CASE_PROFIT_CHANCE,
        ) < 1e-10,
        c.id,
      );

    assert.ok(Math.abs(odds.reduce((a, b) => a + b, 0) - 1) < 1e-10);
    assert.ok(
      Math.abs(
        odds.reduce((s, p, i) => s + p * skin(c.pool[i]).price, 0) / c.price -
          CASE_RTP,
      ) < (c.fixed ? 0.002 : 1e-9),
    );
  }
});
test("Paid opening commits once, persists its result and cannot be rerolled before acknowledgement", () => {
  const g = new StormGame(undefined, () => 0.1),
    p = g.open("street");
  assert.equal(g.state.coins, 100);
  assert.equal(g.state.inventory.length, 5);
  assert.equal(g.state.opened, 1);
  const saved = g.snapshot(),
    restored = new StormGame(saved, () => 0.99);
  assert.deepEqual(restored.state.pending, p);
  assert.throws(() => restored.open("street"), /busy/);
  assert.equal(restored.state.coins, 100);
  restored.dismiss();
  assert.equal(restored.state.inventory.length, 5);
});
test("Locked, unaffordable, invalid quantity and invalid RNG openings do not consume balance", () => {
  const g = new StormGame();
  assert.throws(() => g.open("storm"), /locked/);
  assert.throws(() => g.open("street", 5), /quantity-locked/);
  assert.throws(() => g.open("street", 2), /quantity-locked/);
  assert.throws(() => g.open("street", 4), /^Error: quantity$/);
  g.state.xp = LEVEL_XP[7];
  assert.throws(() => g.open("street", 5), /funds/);
  assert.equal(g.state.coins, 150);
  const bad = new StormGame(undefined, () => NaN);
  assert.throws(() => bad.open("street"), /random/);
  assert.equal(bad.state.coins, 150);
});
test("Free cases scale to unlocked progression and respect the ten minute interval", () => {
  const g = new StormGame(undefined, () => 0.2);
  g.state.xp = 200;
  assert.equal(g.currentCase.id, "redline");
  g.open("redline", 1, "free", 1000, "free-1");
  assert.equal(g.state.freeAt, 1000 + FREE_INTERVAL);
  assert.equal(g.state.coins, 150);
  g.dismiss();
  assert.throws(() => g.open("redline", 1, "free", 1001, "free-2"), /cooldown/);
  g.open("redline", 1, "free", 1000 + FREE_INTERVAL, "free-2");
});
test("Upgrade succeeds exactly inside displayed chance, consumes inputs once and adds target", () => {
  const g = new StormGame(undefined, () => 0.1);
  const q = g.quote([1], 2);
  assert.equal(q.stake, 20);
  assert.ok(Math.abs(q.chance - (20 / 45) * 0.95) < 1e-10);
  const p = g.upgrade([1], 2);
  assert.equal(p.success, true);
  assert.ok(!g.state.inventory.some((i) => i.uid === 1));
  assert.equal(g.state.inventory.filter((i) => i.skinId === 2).length, 1);
  assert.equal(g.state.upgradeWins, 1);
  assert.throws(() => g.upgrade([2], 3), /busy/);
});
test("Losing an upgrade removes selected skins and extra coins without changing unrelated inventory", () => {
  const g = new StormGame(undefined, () => 0.999);
  const p = g.upgrade([1], 3, 5);
  assert.equal(p.success, false);
  assert.equal(g.state.coins, 145);
  assert.deepEqual(g.state.inventory, [
    { uid: 2, skinId: 1 },
    { uid: 3, skinId: 35 },
    { uid: 4, skinId: 36 },
  ]);
  assert.equal(g.state.upgradeAttempts, 1);
  assert.equal(g.state.upgradeWins, 0);
  assert.equal(p.skinIds.length, 0);
});
test("Duplicate selections, an invalid target and overspending do not mutate an upgrade", () => {
  const g = new StormGame(),
    before = g.snapshot();
  assert.throws(() => g.upgrade([1, 1], 2), /selection/);
  assert.throws(() => g.upgrade([1], 0), /target/);
  assert.throws(() => g.upgrade([1], 3, 999), /funds/);
  assert.deepEqual(g.snapshot(), before);
});
test("Sale cannot duplicate rewards and a rewarded 50% bonus has no ceiling", () => {
  const g = new StormGame();
  const price = g.sell([1], "ad-1");
  assert.equal(price, 30);
  assert.equal(g.state.coins, 180);
  assert.throws(() => g.sell([1]), /selection/);
  assert.throws(() => g.sell([2], "ad-1"), /receipt/);
  assert.equal(g.state.inventory.length, 3);
  g.state.inventory.push({ uid: 50, skinId: 34 });
  assert.equal(
    g.sell([50], "ad-2"),
    skin(34).price + Math.floor(skin(34).price * 0.5),
  );
});
test("Legacy active earnings use bounded aim income and do not scale with case prices", () => {
  const g = new StormGame();
  g.state.coins = 0;
  assert.equal(g.earn(1000), 4);
  assert.equal(g.earn(1001), 0);
  assert.equal(g.state.coins, 4);
  g.state.xp = 1800;
  assert.equal(g.earn(2000), 4);
  g.adBonus("boost", "video-1", 2000);
  assert.equal(g.earn(2400), 8);
});
test("Ad receipts are single use, and an extra ticket does not reset the free timer", () => {
  const g = new StormGame(undefined, () => 0.1);
  g.state.freeAt = 99999;
  g.adBonus("ticket", "video-1");
  assert.throws(() => g.adBonus("ticket", "video-1"), /receipt/);
  assert.equal(g.state.tickets, 1);
  g.open("street", 1, "ticket");
  assert.equal(g.state.freeAt, 99999);
  assert.equal(g.state.tickets, 0);
  assert.equal(g.state.coins, 150);
});
test("Daily gifts and bonus wheel cannot be claimed repeatedly; pending wheel survives reload", () => {
  const g = new StormGame(undefined, () => 0.8);
  g.daily(1000);
  assert.throws(() => g.daily(1001), /cooldown/);
  g.wheel(1000);
  assert.equal(g.state.tickets, 1);
  const h = new StormGame(g.snapshot());
  assert.equal(h.state.pending?.kind, "wheel");
  h.dismiss();
  assert.throws(() => h.wheel(1001), /cooldown/);
  assert.equal(h.state.tickets, 1);
});
test("Three round bot battles use equal case pools and a tie returns only the player drops", () => {
  const g = new StormGame(undefined, () => 0.1);
  const p = g.battle("street");
  assert.deepEqual(p.playerDrops, p.botDrops);
  assert.equal(p.skinIds.length, 3);
  assert.equal(g.state.coins, 0);
  assert.equal(g.state.battleWins, 0);
  assert.equal(g.state.battles, 1);
});
test("Damaged saved values cannot inject prices, duplicate UIDs or NaN balances", () => {
  const g = new StormGame({
    version: 1,
    coins: NaN,
    xp: -1,
    inventory: [
      { uid: 1, skinId: 0, price: 999999 },
      { uid: 1, skinId: 34 },
      { uid: 2, skinId: 80000 },
    ],
  });
  assert.equal(g.state.coins, 0);
  assert.equal(g.level, 1);
  assert.equal(g.inventoryValue, 20);
  assert.equal(g.state.inventory.length, 1);
  assert.ok(g.state.nextUid > 1);
  assert.equal(levelFor(1800), 6);
});

test("Starter collection has four distinct items and can immediately create a contract", () => {
  const g = new StormGame(undefined, () => 0.5);
  assert.equal(g.state.inventory.length, 4);
  const ids = g.state.inventory.slice(0, 3).map((x) => x.uid),
    q = g.contractQuote(ids);
  const before = g.state.coins;
  const p = g.contract(ids);
  assert.equal(p.kind, "contract");
  assert.equal(g.state.contracts, 1);
  assert.equal(g.state.coins, before);
  assert.equal(g.state.inventory.length, 2);
  assert.ok(q.pool.some((s) => s.id === p.skinIds[0]));
  assert.deepEqual(new StormGame(g.snapshot()).state.pending, p);
});
test("A contract validates all input and RNG before consuming items or coins", () => {
  const g = new StormGame(undefined, () => NaN),
    saved = g.snapshot();
  assert.throws(() => g.contract([1, 2]), /selection/);
  assert.throws(() => g.contract([1, 1, 2]), /selection/);
  assert.throws(() => g.contract([1, 2, 3], 151), /funds/);
  assert.throws(() => g.contract([1, 2, 3]), /random/);
  assert.deepEqual(g.snapshot(), saved);
});
test("Old farm upgrades migrate to aim rewards while holding pays nothing", () => {
  const g = new StormGame(),
    before = g.tapValue,
    cost = g.farmCost;
  g.state.coins = 1000;
  g.farmUpgrade();
  assert.equal(g.state.coins, 1000 - cost);
  assert.ok(g.tapValue > before);
  assert.equal(g.aim(1000), g.aimBaseReward);
  assert.equal(g.aim(1001), 0);
  for (let i = 0; i < 29; i++) assert.equal(g.farmTick(1000, true), 0);
  assert.equal(g.farmTick(1000, true), 0);
  assert.equal(g.state.holdBonuses, 0);
  g.farmTick(1000, false);
  assert.equal(g.state.holdMs, 0);
  const prev = g.state.farmMs;
  g.farmTick(999999);
  assert.equal(g.state.farmMs - prev, 1500);
});
test("Point ads are awarded once, tasks require completion and cannot pay twice", () => {
  const g = new StormGame();
  g.adBonus("coins", "points-1");
  assert.equal(g.state.coins, 350);
  assert.throws(() => g.adBonus("coins", "points-1"), /receipt/);
  assert.throws(() => g.claimTask("clicks"), /cooldown/);
  for (let i = 0; i < 50; i++) g.earn(1000 + i * 400);
  assert.equal(g.claimTask("clicks"), 100);
  assert.throws(() => g.claimTask("clicks"), /cooldown/);
  const h = new StormGame(g.snapshot());
  assert.throws(() => h.claimTask("clicks"), /cooldown/);
});
test("Periodic skins require waiting, scale with level and persist their cooldown", () => {
  const g = new StormGame();
  g.state.giftAt = [1000, 2000, 3000];
  assert.throws(() => g.gift(0, 999, "gift-early"), /cooldown/);
  const id = g.gift(0, 1000, "gift-ready");
  assert.ok(g.state.inventory.some((x) => x.skinId === id));
  assert.equal(g.state.giftAt[0], 301000);
  assert.throws(() => g.gift(0, 1001, "gift-next"), /cooldown/);
  const h = new StormGame(g.snapshot());
  assert.throws(() => h.gift(0, 1001, "gift-next"), /cooldown/);
  g.state.xp = 1800;
  assert.ok(skin(g.giftSkin(0)).price > skin(id).price);
});
test("Flexible bot matches support mixed cases, preserve equal odds and reject invalid rounds atomically", () => {
  const g = new StormGame(undefined, () => 0.2),
    before = g.snapshot();
  assert.throws(() => g.battle("street", 4), /quantity/);
  assert.deepEqual(g.snapshot(), before);
  g.battle("street", 2, ["street", "budget"]);
  assert.equal(g.state.coins, 65);
  assert.equal(g.state.pending?.playerDrops?.length, 2);
  assert.deepEqual(g.state.pending?.battleCases, ["street", "budget"]);
  assert.equal(g.state.pending?.skinIds.length, 2);
});
test("Theme promises match real drop pools and 50/50 cases have exactly two equal outcomes", () => {
  for (const c of CASES.filter((c) => c.fixed)) {
    assert.equal(c.pool.length, 2);
    assert.deepEqual(oddsFor(c), [0.5, 0.5]);
  }
  const find = (id: string) => CASES.find((c) => c.id === id)!;
  assert.ok(find("knives").pool.every((id) => skin(id).type === "knife"));
  assert.ok(find("gloves").pool.every((id) => skin(id).type === "gloves"));
  assert.ok(
    find("beast").pool.every((id) => skin(id).nameEn === "Hyper Beast"),
  );
  assert.ok(find("asiimov").pool.every((id) => skin(id).nameEn === "Asiimov"));
  assert.ok(
    find("snipers").pool.every((id) =>
      ["AWP", "SSG 08", "SCAR-20", "G3SG1"].includes(skin(id).weapon),
    ),
  );
});

test("Actual case picking follows the profitable drop probability, including unchanged 50/50 outcomes", () => {
  const trials = 20000;
  for (const c of CASES) {
    let wins = 0;
    for (let i = 0; i < trials; i++)
      if (skin(pick(c, (i + 0.5) / trials)).price > c.price) wins++;
    assert.ok(
      Math.abs(wins / trials - (c.fixed ? 0.5 : CASE_PROFIT_CHANCE)) <=
        c.pool.length / trials,
      c.id,
    );
    assert.ok(
      Math.abs(
        caseStats(c).profitChance - (c.fixed ? 0.5 : CASE_PROFIT_CHANCE),
      ) < 1e-10,
      c.id,
    );
  }
});
test("Displayed case profile does not silently alter contracts", () => {
  const g = new StormGame(),
    q = g.contractQuote([1, 2, 3]);
  const expected = q.pool.reduce((sum, s, i) => sum + s.price * q.odds[i], 0);
  assert.ok(Math.abs(expected / q.stake - 0.96) < 1e-9);
});

test("Free opening requires a unique rewarded receipt and failed attempts do not mutate anything", () => {
  const g = new StormGame(undefined, () => 0.2),
    before = g.snapshot();
  assert.throws(() => g.open("street", 1, "free", 1000), /receipt/);
  assert.deepEqual(g.snapshot(), before);
  g.open("street", 1, "free", 1000, "ad-free-1");
  g.dismiss();
  const after = g.snapshot();
  assert.throws(
    () => g.open("street", 1, "free", 1000 + FREE_INTERVAL, "ad-free-1"),
    /receipt/,
  );
  assert.deepEqual(g.snapshot(), after);
  const bad = new StormGame(undefined, () => NaN),
    untouched = bad.snapshot();
  assert.throws(
    () => bad.open("street", 1, "free", 1000, "invalid-rng"),
    /random/,
  );
  assert.deepEqual(bad.snapshot(), untouched);
});
test("Aim streaks increase rewards, reject double hits and reset on a miss or timeout", () => {
  const g = new StormGame();
  for (let i = 0; i < 5; i++) g.aim(1000 + i * 400);
  assert.equal(g.state.aimHits, 5);
  assert.equal(g.state.aimStreak, 5);
  assert.equal(g.aimMultiplier, 1.05);
  assert.equal(g.state.aimBestStreak, 5);
  assert.equal(g.aim(2601), 0);
  assert.equal(g.state.aimStreak, 5);
  g.missAim();
  assert.equal(g.aimMultiplier, 1);
  assert.equal(g.state.aimStreak, 0);
  g.aim(3000);
  g.expireAim(3000 + g.aimComboWindow + 1);
  assert.equal(g.state.aimStreak, 0);
  assert.equal(new StormGame(g.snapshot()).state.aimBestStreak, 5);
  assert.equal(new StormGame(g.snapshot()).state.aimIncome, g.state.aimIncome);
});
test("Three aim upgrades spend coins once and preserve purchased levels in old and new saves", () => {
  const legacy = new StormGame({ version: 1, farmLevel: 7 });
  assert.equal(legacy.state.farmLevel, 7);
  assert.equal(legacy.state.aimSizeLevel, 1);
  const g = new StormGame();
  g.state.coins = 10000;
  for (const kind of ["reward", "target", "combo"] as const) {
    const q = g.aimUpgradeQuote(kind),
      balance = g.state.coins;
    g.aimUpgrade(kind);
    assert.equal(g.state.coins, balance - q.cost);
    assert.equal(g.aimUpgradeQuote(kind).level, q.level + 1);
  }
  const h = new StormGame(g.snapshot());
  assert.equal(h.state.farmLevel, 2);
  assert.equal(h.state.aimSizeLevel, 2);
  assert.equal(h.state.aimComboLevel, 2);
  h.state.coins = 0;
  h.state.xp = LEVEL_XP[1];
  const before = h.snapshot();
  assert.throws(() => h.aimUpgrade("target"), /funds/);
  assert.deepEqual(h.snapshot(), before);
  h.state.aimSizeLevel = 10;
  assert.throws(() => h.aimUpgrade("target"), /locked/);
});
test("Aim booster doubles only active hit rewards and never earns passive coins", () => {
  const g = new StormGame();
  const base = g.aimReward(1000);
  g.adBonus("boost", "boost-aim", 1000);
  assert.equal(g.aim(1000), base * 2);
  const balance = g.state.coins;
  for (let i = 0; i < 40; i++) g.farmTick(1000, true);
  assert.equal(g.state.coins, balance);
  g.missAim();
  assert.equal(g.aim(62000), base);
});
test("Settings and chosen battle opponent survive reload alongside existing progress", () => {
  const g = new StormGame(undefined, () => 0.2);
  g.state.orientation = "landscape";
  g.state.language = "en";
  g.battle("street", 1, undefined, "neon");
  const h = new StormGame(g.snapshot());
  assert.equal(h.state.orientation, "landscape");
  assert.equal(h.state.language, "en");
  assert.equal(h.state.pending?.opponentId, "neon");
  assert.equal(h.state.coins, 100);
  assert.equal(h.state.inventory.length, g.state.inventory.length);
});

test("Real epoch cooldowns and boosters survive reload without truncating timestamps", () => {
  const now = 1792334000000,
    g = new StormGame(undefined, () => 0.1);
  g.open("street", 1, "free", now, "real-epoch-free");
  g.dismiss();
  g.daily(now);
  g.wheel(now);
  g.dismiss();
  g.adBonus("boost", "real-epoch-boost", now);
  g.state.giftAt = [now, now + 1000, now + 2000];
  g.gift(0, now, "epoch-gift");
  const h = new StormGame(g.snapshot());
  for (const key of ["freeAt", "dailyAt", "wheelAt", "boostUntil"] as const)
    assert.equal(h.state[key], g.state[key], key);
  assert.deepEqual(h.state.giftAt, g.state.giftAt);
  assert.throws(
    () => h.open("street", 1, "free", now + 1, "second-video"),
    /cooldown/,
  );
  assert.throws(() => h.daily(now + 1), /cooldown/);
  assert.throws(() => h.wheel(now + 1), /cooldown/);
  assert.throws(() => h.gift(0, now + 1, "epoch-next-gift"), /cooldown/);
  assert.equal(h.aimReward(now + 1), 8);
});
