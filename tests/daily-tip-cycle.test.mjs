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

test("the first quote of a new cycle never immediately repeats the previous cycle", () => {
  const storage = new MemoryStorage();
  let lastCommitted = null;

  for (let day = 1; day <= 30; day += 1) {
    lastCommitted = commitDailyTipAssignment({
      storage,
      userId: "u1",
      dayKey: `cycle-a-${day}`,
      tips,
    });
  }

  const nextCycle = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "cycle-b-1",
    tips,
  });

  assert.notEqual(nextCycle.tipId, lastCommitted.tipId);
});

test("editing quote copy does not reset an in-progress cycle", () => {
  const storage = new MemoryStorage();
  const stableTips = Array.from({ length: 30 }, (_, index) => ({
    id: `daily-money-tip-${String(index + 1).padStart(3, "0")}`,
    text: `Original tip ${index + 1}`,
  }));

  for (let day = 1; day <= 7; day += 1) {
    commitDailyTipAssignment({
      storage,
      userId: "u1",
      dayKey: `copy-${day}`,
      tips: stableTips,
    });
  }

  const editedTips = stableTips.map((tip, index) =>
    index === 4 ? { ...tip, text: "A clearer, more reflective version." } : tip,
  );
  const next = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "copy-8",
    tips: editedTips,
  });
  const stored = JSON.parse(storage.getItem(dailyTipCycleStorageKey("u1")));

  assert.equal(next.cycleDay, 8);
  assert.equal(stored.usedTipIds.length, 7);
});

test("version 3 cycle state migrates without losing already-read quote IDs", () => {
  const storage = new MemoryStorage();
  const catalog = buildDailyTipCatalog(tips);
  const usedTipIds = catalog.slice(0, 5).map((tip) => tip.id);
  const order = catalog.map((tip) => tip.id);

  storage.setItem(
    dailyTipCycleStorageKey("u1"),
    JSON.stringify({
      version: 3,
      userId: "u1",
      cycleNumber: 0,
      catalogSignature: "legacy-signature-containing-old-copy",
      order,
      usedTipIds,
      assignments: usedTipIds.map((tipId, index) => ({
        dayKey: `legacy-${index + 1}`,
        cycleDay: index + 1,
        tipId,
        committedAt: "2026-08-01T00:00:00.000Z",
      })),
      pending: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-05T00:00:00.000Z",
    }),
  );

  const next = resolveDailyTipAssignment({
    storage,
    userId: "u1",
    dayKey: "legacy-6",
    tips,
  });
  const migrated = JSON.parse(storage.getItem(dailyTipCycleStorageKey("u1")));

  assert.equal(next.cycleDay, 6);
  assert.equal(migrated.version, 4);
  assert.deepEqual(migrated.usedTipIds, usedTipIds);
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
