import assert from "node:assert/strict";
import test from "node:test";

import {
  legacyMeansCycleBaselineV6StorageKey,
  meansCycleBaselineStorageKey,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

test("V7 and legacy V6 owner keys remain deterministic and separate", () => {
  const cycleStart = "2026-08-25";
  const cycleEnd = "2026-09-10";
  const v7Key = meansCycleBaselineStorageKey("authenticated-user", cycleStart, cycleEnd);
  const v6Key = legacyMeansCycleBaselineV6StorageKey("authenticated-user", cycleStart, cycleEnd);

  assert.match(v7Key, /clara:means-cycle-baseline:v7:authenticated-user:2026-08-25:2026-09-10$/);
  assert.match(v6Key, /clara:means-cycle-baseline:v6:authenticated-user:2026-08-25:2026-09-10$/);
  assert.notEqual(v7Key, v6Key);
});

test("same-cycle legacy owner state cannot reconstruct a V7 anchor from an ambiguous scalar", () => {
  const cycleStart = "2026-08-25";
  const cycleEnd = "2026-09-10";
  const state = resolveAdaptiveMeansBaselineState({
    stored: {
      version: 3,
      requiredRunway: 10403,
      cycleStart,
      cycleEnd,
    },
    cycleStart,
    cycleEnd,
    today: "2026-08-28",
    occurrences: [
      { id: "current-plan", kind: "money_schedule", date: "2026-09-01", amount: 8000 },
    ],
  });

  assert.equal(state.cycle100Anchor, 0);
  assert.equal(state.remainingPlannedSpending, 8000);
  assert.equal(state.anchorState, "migration_unresolved");
  assert.equal(state.migrationUnresolved, true);
  assert.equal(state.shouldPersist, false);
});
