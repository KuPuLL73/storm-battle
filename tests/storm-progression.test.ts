import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  StormGame,
  CASES,
  LEVEL_XP,
  canOpenQuantity,
  skin,
} from "../src/storm/engine.ts";
import { caseArtwork } from "../src/storm/case-art.ts";

test("Every collector level has multiple cases and each case has an installed illustration", () => {
  assert.equal(CASES.length, 33);
  for (let level = 1; level <= 10; level++) {
    assert.ok(
      CASES.filter((c) => c.level === level).length >= 3,
      `level ${level}`,
    );
  }
  for (const c of CASES)
    assert.ok(existsSync(`public/${caseArtwork(c.id)}`), c.id);
});

test("Multi-opening locks reject transactions until levels 3, 5 and 8 without spending anything", () => {
  for (const [count, unlock] of [
    [2, 3],
    [3, 5],
    [5, 8],
  ]) {
    const g = new StormGame(undefined, () => 0.25);
    g.state.coins = 1000;
    g.state.xp = LEVEL_XP[unlock - 1] - 1;
    const before = g.snapshot();
    assert.equal(canOpenQuantity(g.level, count), false);
    assert.throws(() => g.open("street", count), /quantity-locked/);
    assert.deepEqual(g.snapshot(), before);
    g.state.xp++;
    const result = g.open("street", count);
    assert.equal(result.skinIds.length, count);
    assert.equal(g.state.opened, count);
    assert.equal(g.state.coins, 1000 - 50 * count + (count >= 3 ? 50 : 0));
    const restored = new StormGame(g.snapshot());
    assert.deepEqual(restored.state.pending, result);
  }
});

test("Old saves receive unclaimed premium cases, and each expensive reward survives reload exactly once", () => {
  const g = new StormGame({
    ...new StormGame().snapshot(),
    xp: 9000,
    levelRewards: undefined,
  });
  assert.deepEqual(g.availableLevelRewards, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  let current = g;
  let previousMinimum = 0;
  for (let level = 2; level <= 10; level++) {
    const pool = current.levelRewardPool(level);
    const minimum = Math.min(...pool.map((id) => skin(id).price));
    assert.ok(minimum > previousMinimum);
    previousMinimum = minimum;
    const before = current.snapshot();
    const p = current.claimLevelReward(level);
    assert.equal(current.state.coins, before.coins);
    assert.equal(current.state.xp, before.xp);
    assert.equal(current.state.inventory.length, before.inventory.length + 1);
    assert.ok(pool.includes(p.skinIds[0]));
    assert.equal(p.kind, "levelReward");
    assert.equal(p.rewardLevel, level);
    const restored = new StormGame(current.snapshot());
    assert.deepEqual(restored.state.pending, p);
    assert.throws(() => restored.claimLevelReward(level), /busy/);
    restored.dismiss();
    const done = restored.snapshot();
    assert.throws(() => restored.claimLevelReward(level), /locked/);
    assert.deepEqual(restored.snapshot(), done);
    current = restored;
  }
  assert.deepEqual(current.availableLevelRewards, []);
});

test("Locked rewards, full inventory and invalid randomness cannot consume premium rewards", () => {
  const g = new StormGame();
  const start = g.snapshot();
  assert.throws(() => g.claimLevelReward(2), /locked/);
  assert.deepEqual(g.snapshot(), start);
  g.state.xp = 50;
  g.state.inventory = Array.from({ length: 200 }, (_, i) => ({
    uid: i + 1,
    skinId: 0,
  }));
  const full = g.snapshot();
  assert.throws(() => g.claimLevelReward(2), /capacity/);
  assert.deepEqual(g.snapshot(), full);
  const bad = new StormGame({ ...start, xp: 50 }, () => NaN);
  const before = bad.snapshot();
  assert.throws(() => bad.claimLevelReward(2), /random/);
  assert.deepEqual(bad.snapshot(), before);
});
