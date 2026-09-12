import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

const cycle = { cycleStart: "2026-09-01", cycleEnd: "2026-09-30", today: "2026-09-13" };

test("skipped debt occurrence removes Remaining Plan without pretending Wallet moved", () => {
  const planned = resolveAdaptiveMeansBaselineState({
    ...cycle,
    occurrences: [{
      id: "debt:chatgpt:2026-09-10",
      requirementKey: "debt:chatgpt:2026-09-10",
      sourceId: "chatgpt",
      sourceType: "debt",
      kind: "debt",
      date: "2026-09-10",
      amount: 1100,
    }],
  });
  const before = calculateMeansScoreState({
    availableWalletMoney: 5000,
    remainingPlannedSpending: planned.remainingPlannedSpending,
    cycle100Anchor: planned.cycle100Anchor,
  });
  const skipped = resolveAdaptiveMeansBaselineState({
    ...cycle,
    stored: planned.baseline,
    occurrences: [{
      id: "debt:chatgpt:2026-09-10",
      requirementKey: "debt:chatgpt:2026-09-10",
      sourceId: "chatgpt",
      sourceType: "debt",
      kind: "debt",
      date: "2026-09-10",
      amount: 1100,
      waivedAmount: 1100,
      actualPaid: 0,
    }],
  });
  const after = calculateMeansScoreState({
    availableWalletMoney: 5000,
    remainingPlannedSpending: skipped.remainingPlannedSpending,
    cycle100Anchor: skipped.cycle100Anchor,
  });

  assert.equal(planned.remainingPlannedSpending, 1100);
  assert.equal(skipped.remainingPlannedSpending, 0);
  assert.equal(skipped.cycle100Anchor, 1100);
  assert.equal(before.availableWalletMoney, 5000);
  assert.equal(after.availableWalletMoney, 5000);
  assert.equal(after.score > before.score, true);
});

test("Skip implementation stays separate from payment history and wallet mutation", async () => {
  const store = await readFile(new URL("../src/lib/debtObligationStore.js", import.meta.url), "utf8");
  const authority = await readFile(new URL("../src/lib/clara-means-authority.js", import.meta.url), "utf8");
  const card = await readFile(new URL("../src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx", import.meta.url), "utf8");

  assert.match(store, /skipDebtOccurrenceForCycle/);
  assert.match(store, /skippedOccurrences/);
  assert.match(authority, /waivedAmount: isDebtOccurrenceSkipped/);
  assert.match(card, /"Pay"/);
  assert.match(card, /"Skip"/);
});
