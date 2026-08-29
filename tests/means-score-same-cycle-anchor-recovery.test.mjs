import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

test("same-cycle legacy scalar state cannot be fabricated into a V7 Cycle 100 Anchor", () => {
  const state = resolveAdaptiveMeansBaselineState({
    stored: {
      version: 5,
      requiredRunway: 1820,
      assumedSpentAtLock: 280,
      cycleStart: "2026-08-25",
      cycleEnd: "2026-09-10",
    },
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    today: "2026-08-28",
    occurrences: [
      { id: "plan:a", kind: "money_schedule", date: "2026-08-28", amount: 2400 },
      { id: "plan:b", kind: "money_schedule", date: "2026-09-01", amount: 8000 },
    ],
  });

  assert.equal(state.cycle100Anchor, 0);
  assert.equal(state.requiredRunway, 0);
  assert.equal(state.remainingPlannedSpending, 10400);
  assert.equal(state.anchorState, "migration_unresolved");
  assert.equal(state.migrationUnresolved, true);
  assert.equal(state.shouldPersist, false);

  const score = calculateMeansScoreState({
    availableWalletMoney: 5569,
    remainingPlannedSpending: state.remainingPlannedSpending,
    cycle100Anchor: state.cycle100Anchor,
  });

  assert.equal(score.score, null);
  assert.equal(score.coverageState, "no_anchor");
});
