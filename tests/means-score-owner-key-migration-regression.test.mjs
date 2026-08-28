import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMeansScoreState,
  repairMalformedMeansBaselineStorage,
} from "../src/lib/clara-means-cycle-baseline.js";

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }
  get length() {
    return this.values.size;
  }
  key(index) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test("restores same-cycle v3 fixed 100 even when owner storage key changed", () => {
  const cycleStart = "2026-08-25";
  const cycleEnd = "2026-09-10";
  const currentKey = `clara:means-cycle-baseline:v5:authenticated-user:${cycleStart}:${cycleEnd}`;
  const legacyKey = `clara:means-cycle-baseline:v3:local-user:${cycleStart}:${cycleEnd}`;
  const storage = new MemoryStorage({
    [currentKey]: JSON.stringify({
      version: 5,
      requiredRunway: 1820,
      assumedSpentAtLock: 280,
      cycleStart,
      cycleEnd,
      refreshReason: "new_cycle_or_stale_baseline",
    }),
    [legacyKey]: JSON.stringify({
      version: 3,
      requiredRunway: 10403,
      assumedSpentAtLock: 0,
      cycleStart,
      cycleEnd,
    }),
  });

  assert.equal(repairMalformedMeansBaselineStorage(storage), 1);

  const repaired = JSON.parse(storage.getItem(currentKey));
  assert.equal(repaired.requiredRunway, 10403);
  assert.equal(repaired.restoredFromStorageKey, legacyKey);

  const score = calculateMeansScoreState({
    financialRunway: 5569,
    requiredRunway: repaired.requiredRunway,
  }).score;
  assert.equal(score, 54);
  assert.notEqual(score, 306);
});
