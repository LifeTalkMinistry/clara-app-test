import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyTipCatalog,
  commitDailyTipAssignment,
  dailyTipCycleStorageKey,
  resolveDailyTipAssignment,
} from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyTipCycle.js";

const tips = Array.from({ length: 30 }, (_, index) => `Tip ${index + 1}`);

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test("30 committed streak days use 30 unique quote IDs", () => {
  const storage = new MemoryStorage();
  const ids = [];

  for (let day = 1; day <= 30; day += 1) {
    const dayKey = `2026-07-${String(day).padStart(2, "0")}`;
    const preview = resolveDailyTipAssignment({ storage, userId: "u1", dayKey, tips });
    const committed = commitDailyTipAssignment({ storage, userId: "u1", dayKey, tips });

    assert.equal(preview.tipId, committed.tipId);
    assert.equal(committed.cycleDay, day);
    ids.push(committed.tipId);
  }

  assert.equal(new Set(ids).size, 30);
});

test("a missed day does not consume or change the pending quote", () => {
  const storage = new MemoryStorage();
  const firstPreview = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "2026-07-01",
    tips,
  });
  const laterPreview = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "2026-07-04",
    tips,
  });

  assert.equal(firstPreview.tipId, laterPreview.tipId);
  assert.equal(laterPreview.cycleDay, 1);
});

test("same committed day always resolves to its attached quote ID", () => {
  const storage = new MemoryStorage();
  const committed = commitDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "2026-07-03",
    tips,
  });
  const reloaded = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "2026-07-03",
    tips,
  });

  assert.equal(committed.tipId, reloaded.tipId);
  assert.equal(reloaded.committed, true);
});

test("old IDs are released only after all 30 are committed", () => {
  const storage = new MemoryStorage();

  for (let day = 1; day <= 30; day += 1) {
    commitDailyTipAssignment({ storage, userId: "u1", dayKey: `day-${day}`, tips });
  }

  const day30 = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "day-30",
    tips,
  });
  const nextCycle = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "day-31",
    tips,
  });

  assert.equal(day30.cycleNumber, 0);
  assert.equal(nextCycle.cycleNumber, 1);
  assert.equal(nextCycle.cycleDay, 1);

  const stored = JSON.parse(storage.getItem(dailyTipCycleStorageKey("u1")));
  assert.equal(stored.usedTipIds.length, 0);
});

test("stored cycle contains exactly the current catalog IDs", () => {
  const storage = new MemoryStorage();
  resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "2026-07-01",
    tips,
  });

  const cycle = JSON.parse(storage.getItem(dailyTipCycleStorageKey("u1")));
  assert.deepEqual(
    new Set(cycle.order),
    new Set(buildDailyTipCatalog(tips).map((tip) => tip.id)),
  );
});
