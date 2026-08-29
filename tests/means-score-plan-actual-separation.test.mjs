import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolveAdaptiveMeansBaselineState } from "../src/lib/clara-means-cycle-baseline.js";

function resolve(actualPaid = 0) {
  return resolveAdaptiveMeansBaselineState({
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    today: "2026-08-29",
    occurrences: [
      {
        id: "debt:sample:2026-08-29",
        kind: "debt",
        date: "2026-08-29",
        amount: 1000,
        actualPaid,
      },
    ],
  });
}

test("actual debt amount cannot size the denominator", () => {
  assert.equal(resolve(0).requiredRunway, 1000);
  assert.equal(resolve(400).requiredRunway, 1000);
  assert.equal(resolve(1400).requiredRunway, 1000);
});

test("current authority contains no future-actual or overdue-carry denominator builder", async () => {
  const authority = await readFile(new URL("../src/lib/clara-means-authority.js", import.meta.url), "utf8");
  assert.doesNotMatch(authority, /currentCycleFutureDebtActual/);
  assert.doesNotMatch(authority, /confirmedCarriedDebt/);
});
