import assert from "node:assert/strict";
import test from "node:test";

import {
  meansCycleBaselineStorageKey,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

test("v6 owner key is deterministic and does not reconstruct 100 from another owner's legacy scalar", () => {
  const cycleStart = "2026-08-25";
  const cycleEnd = "2026-09-10";
  const key = meansCycleBaselineStorageKey("authenticated-user", cycleStart, cycleEnd);
  assert.match(key, /clara:means-cycle-baseline:v6:authenticated-user:2026-08-25:2026-09-10$/);

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

  assert.equal(state.requiredRunway, 8000);
  assert.equal(state.baseline.version, 6);
});
