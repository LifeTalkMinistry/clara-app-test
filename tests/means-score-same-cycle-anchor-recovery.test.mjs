import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

test("same-cycle legacy scalar anchors cannot overwrite the live protected v6 plan", () => {
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

  assert.equal(state.requiredRunway, 10400);
  assert.equal(state.baseline.version, 6);

  const score = calculateMeansScoreState({
    effectiveCurrentMoney: 5569,
    requiredRunway: state.requiredRunway,
  }).score;

  assert.equal(score, 54);
  assert.notEqual(score, 306);
});
