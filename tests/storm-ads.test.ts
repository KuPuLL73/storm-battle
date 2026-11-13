import test from "node:test";
import assert from "node:assert/strict";
import { StormGame, CASES, LEVEL_XP, CASE_XP } from "../src/storm/engine.ts";
import { AdBreakPolicy } from "../src/storm/ad-policy.ts";

test("Selected ad case: unlocked, single, cheap, global cooldown, atomic receipt and RNG", () => {
  const g = new StormGame(undefined, () => 0.1);
  g.state.xp = LEVEL_XP[9];
  const cheap = CASES.filter((c) => c.price <= 500);
  assert.ok(cheap.length > 1);
  const coins = g.state.coins,
    xp = g.state.xp;
  assert.throws(() => g.open(cheap[0].id, 1, "caseAd", 1000, ""), /receipt/);
  assert.throws(
    () => g.open(CASES.find((c) => c.price > 500)!.id, 1, "caseAd", 1000, "x"),
    /case/,
  );
  assert.throws(() => g.open(cheap[0].id, 2, "caseAd", 1000, "x"), /case/);
  g.open(cheap[0].id, 1, "caseAd", 1000, "earned");
  assert.equal(g.state.coins, coins);
  assert.equal(g.state.xp, xp + CASE_XP);
  g.dismiss();
  const restored = new StormGame(g.snapshot());
  const before = restored.snapshot();
  assert.throws(
    () => restored.open(cheap[1].id, 1, "caseAd", 1001, "other"),
    /cooldown/,
  );
  assert.throws(
    () => restored.open(cheap[1].id, 1, "caseAd", 181000, "earned"),
    /receipt/,
  );
  assert.deepEqual(restored.snapshot(), before);
  restored.open(cheap[1].id, 1, "caseAd", 181000, "new");
  const broken = new StormGame(undefined, () => NaN),
    b = broken.snapshot();
  assert.throws(
    () => broken.open("street", 1, "caseAd", 1000, "rng"),
    /random/,
  );
  assert.deepEqual(broken.snapshot(), b);
  const locked = new StormGame();
  assert.throws(
    () =>
      locked.open(
        CASES.find((c) => c.level > 1 && c.price <= 500)!.id,
        1,
        "caseAd",
        1000,
        "lock",
      ),
    /locked/,
  );
});

test("Loss recovery is capped, once per result, survives reload and never restores XP or items", () => {
  const g = new StormGame(undefined, () => 0.99);
  const p = g.upgrade([1], 2);
  assert.equal(p.success, false);
  const before = g.snapshot(),
    amount = Math.floor(p.sourceValue * 0.15);
  assert.equal(g.recoveryQuote(1000), amount);
  assert.throws(() => g.recoverLoss(p.id, 1000, ""), /receipt/);
  assert.deepEqual(g.snapshot(), before);
  assert.equal(g.recoverLoss(p.id, 1000, "recovery"), amount);
  assert.equal(g.state.coins, before.coins + amount);
  assert.equal(g.state.xp, before.xp);
  assert.deepEqual(g.state.inventory, before.inventory);
  const restored = new StormGame(g.snapshot());
  assert.equal(restored.recoveryQuote(999999), 0);
  assert.throws(
    () => restored.recoverLoss(p.id, 999999, "duplicate"),
    /cooldown/,
  );
  g.state.pending!.adRecoveryClaimed = false;
  g.state.pending!.sourceValue = 100000;
  assert.equal(g.recoveryQuote(300999), 0);
  assert.equal(g.recoveryQuote(301000), 500);
  assert.throws(
    () => g.recoverLoss(p.id + 1, 301000, "wrong-result"),
    /cooldown/,
  );
  g.dismiss();
  assert.equal(g.recoveryQuote(999999), 0);
});

test("Wheel coin/ticket bonus is single and persistent; XP segments cannot be doubled", () => {
  for (let i = 0; i < 8; i++) {
    const g = new StormGame(undefined, () => (i + 0.1) / 8),
      p = g.wheel(1000),
      before = g.snapshot();
    if (i === 4 || i === 5) {
      assert.equal(g.wheelBonusQuote(), null);
      assert.throws(() => g.boostWheel(p.id, "xp"), /cooldown/);
      continue;
    }
    assert.throws(() => g.boostWheel(p.id, ""), /receipt/);
    assert.deepEqual(g.snapshot(), before);
    const bonus = g.boostWheel(p.id, "wheel");
    assert.equal(g.state.xp, before.xp);
    assert.equal(g.state.coins, before.coins + bonus.coins);
    assert.equal(g.state.tickets, before.tickets + bonus.tickets);
    const restored = new StormGame(g.snapshot());
    assert.equal(restored.wheelBonusQuote(), null);
    assert.throws(() => restored.boostWheel(p.id, "again"), /cooldown/);
  }
});

test("Interstitial is time gated without a result-count requirement", () => {
  const policy = new AdBreakPolicy(1000);
  assert.equal(policy.due(180999, 0), false);
  assert.equal(policy.due(181000, 0), true);
  assert.equal(policy.due(181000, 100000), false);
  assert.equal(policy.due(NaN, 0), false);
  assert.equal(policy.due(500000, 320001), false);
  assert.equal(policy.due(500000, 320000), true);
});
