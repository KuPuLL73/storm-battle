import test from "node:test";
import assert from "node:assert/strict";
import {
  StormGame,
  CASES,
  CASE_RTP,
  CASE_PROFIT_CHANCE,
  CASE_XP,
  AIM_HIT_INTERVAL,
  LEVEL_XP,
  caseStats,
  skin,
} from "../src/storm/engine.ts";

test("Daily doubling is one atomic claim with a fresh receipt and unchanged XP", () => {
  const g = new StormGame();
  const coins = g.state.coins,
    xp = g.state.xp,
    amount = g.currentCase.price;
  assert.throws(() => g.daily(1000, ""), /receipt/);
  assert.equal(g.state.dailyAt, 0);
  assert.equal(g.state.coins, coins);
  assert.equal(g.daily(1000, "daily-earned"), amount * 2);
  assert.equal(g.state.coins, coins + amount * 2);
  assert.equal(g.state.xp, xp);
  const restored = new StormGame(g.snapshot()),
    before = restored.snapshot();
  assert.throws(() => restored.daily(1001, "another-video"), /cooldown/);
  assert.throws(
    () => restored.daily(restored.state.dailyAt, "daily-earned"),
    /receipt/,
  );
  assert.deepEqual(restored.snapshot(), before);
  assert.equal(restored.daily(restored.state.dailyAt), amount);
});

test("Task doubling consumes the task once, validates eligibility, and shares receipt protection", () => {
  const g = new StormGame();
  assert.throws(() => g.claimTask("aim", "not-eligible"), /cooldown/);
  assert.deepEqual(g.state.receipts, []);
  g.state.aimHits = 50;
  const before = g.snapshot();
  assert.throws(() => g.claimTask("aim", ""), /receipt/);
  assert.deepEqual(g.snapshot(), before);
  assert.equal(g.claimTask("aim", "task-earned"), 300);
  assert.equal(g.state.coins, before.coins + 300);
  assert.equal(g.state.xp, before.xp);
  const restored = new StormGame(g.snapshot()),
    claimed = restored.snapshot();
  assert.throws(() => restored.claimTask("aim", "other-video"), /cooldown/);
  assert.throws(() => restored.claimTask("clicks", "task-earned"), /receipt/);
  assert.throws(() => restored.daily(1000, "task-earned"), /receipt/);
  assert.deepEqual(restored.snapshot(), claimed);
  assert.equal(restored.claimTask("clicks"), 100);
});

test("Repeated paid case resale cannot generate currency on average, including 50/50 cases", () => {
  assert.ok(CASE_RTP <= 0.9);
  assert.ok(CASE_PROFIT_CHANCE <= 0.4);
  for (const c of CASES) {
    const stats = caseStats(c);
    assert.ok(stats.rtp > 0.85 && stats.rtp <= 0.9, c.id);
    assert.ok(
      c.pool.some((id) => skin(id).price > c.price),
      c.id,
    );
    assert.ok(
      c.pool.some((id) => skin(id).price < c.price),
      c.id,
    );
  }
});

test("Aim rewards stay bounded across all collector tiers, upgrades and long streaks", () => {
  for (const xp of LEVEL_XP) {
    const g = new StormGame();
    g.state.xp = xp;
    for (let level = 1; level <= 20; level++) {
      g.state.farmLevel = level;
      g.state.aimComboLevel = 8;
      g.state.aimStreak = 10000;
      assert.ok(g.aimReward(1000) <= 61);
      const ordinary = g.aimReward(1000);
      g.state.boostUntil = 2000;
      assert.equal(g.aimReward(1000), ordinary * 2);
      assert.ok(g.aimReward(1000) <= 122);
      g.state.boostUntil = 0;
    }
    g.state.farmLevel = 1;
    g.state.aimStreak = 0;
    assert.equal(g.aimReward(1000), 4);
  }
});

test("Aim upgrade prices have meaningful payback time and cannot bypass collector level locks", () => {
  const g = new StormGame();
  g.state.coins = 1e9;
  let previousCost = 0;
  for (let level = 1; level < 20; level++) {
    g.state.farmLevel = level;
    const q = g.aimUpgradeQuote("reward");
    assert.ok(q.cost > previousCost);
    previousCost = q.cost;
    assert.ok(q.cost / (g.aimBaseRewardAt(level + 1) - g.aimBaseReward) >= 200);
    if (q.unlockLevel > 1) {
      g.state.xp = LEVEL_XP[q.unlockLevel - 1] - 1;
      const before = g.snapshot();
      assert.throws(() => g.aimUpgrade("reward"), /locked/);
      assert.throws(() => g.farmUpgrade(), /locked/);
      assert.deepEqual(g.snapshot(), before);
    }
    g.state.xp = LEVEL_XP[q.unlockLevel - 1];
    const balance = g.state.coins;
    g.aimUpgrade("reward");
    assert.equal(g.state.coins, balance - q.cost);
  }
});

test("Missing and timing out targets cannot bypass the hit rate limit", () => {
  const g = new StormGame();
  assert.equal(g.aim(1000), 4);
  g.missAim();
  assert.equal(g.aim(1001), 0);
  g.expireAim(20000);
  assert.equal(g.aim(1002), 0);
  assert.equal(g.aim(1000 + AIM_HIT_INTERVAL), 4);
  const before = g.snapshot();
  assert.equal(g.aim(NaN), 0);
  assert.equal(g.aim(Infinity), 0);
  assert.deepEqual(g.snapshot(), before);
});

test("Rebalance preserves an existing player's wallet, items, XP and purchased upgrades", () => {
  const saved = {
    ...new StormGame().snapshot(),
    xp: 780,
    coins: 94599,
    farmLevel: 14,
    aimSizeLevel: 10,
    aimComboLevel: 5,
    aimIncome: 192681,
  };
  const g = new StormGame(saved);
  assert.equal(g.level, 4);
  assert.equal(g.aimReward(1000), 30);
  assert.deepEqual(g.snapshot(), saved);
  const h = new StormGame(g.snapshot());
  assert.equal(h.aimReward(1000), 30);
  assert.equal(h.state.coins, 94599);
});

test("Case, battle, trade and wheel XP awards retain the established level progression", () => {
  assert.equal(CASE_XP, 10);
  const g = new StormGame(undefined, () => 0.2);
  assert.equal(g.open("street").bonusXp, 10);
  g.dismiss();
  g.state.coins = 1000;
  assert.equal(g.battle("street", 2).bonusXp, 20);
  g.dismiss();
  assert.equal(g.contract([1, 2, 3]).bonusXp, 20);
  g.dismiss();
  assert.equal(new StormGame(undefined, () => 0.2).upgrade([1], 2).bonusXp, 12);
  const wheel = new StormGame(undefined, () => 0.6);
  assert.equal(wheel.wheel(1000).bonusXp, 10);
  assert.deepEqual(
    LEVEL_XP,
    [0, 50, 200, 500, 1000, 1800, 2900, 4400, 6400, 9000],
  );
});

test("Timed gifts require a new rewarded receipt and commit it with the item and cooldown", () => {
  const g = new StormGame();
  g.state.giftAt = [1000, 1000, 1000];
  const before = g.snapshot();
  assert.throws(() => g.gift(0, 999, "gift-video"), /cooldown/);
  assert.throws(() => g.gift(0, 1000), /receipt/);
  assert.deepEqual(g.snapshot(), before);
  const id = g.gift(0, 1000, "gift-video");
  assert.equal(g.state.inventory.length, before.inventory.length + 1);
  assert.equal(g.state.inventory.at(-1)?.skinId, id);
  assert.equal(g.state.giftAt[0], 301000);
  const restored = new StormGame(g.snapshot()),
    after = restored.snapshot();
  assert.throws(() => restored.gift(1, 1000, "gift-video"), /receipt/);
  assert.throws(() => restored.gift(0, 301000, "gift-video"), /receipt/);
  assert.deepEqual(restored.snapshot(), after);
  restored.state.inventory = Array.from({ length: 200 }, (_, i) => ({
    uid: i + 1,
    skinId: 0,
  }));
  const full = restored.snapshot();
  assert.throws(() => restored.gift(1, 1000, "capacity-video"), /capacity/);
  assert.deepEqual(restored.snapshot(), full);
});
