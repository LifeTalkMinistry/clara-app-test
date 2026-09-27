import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLegacyFutureDebtMigrationCompatibility,
  reconcileFinancialContextMigration,
} from "../src/lib/clara-financial-context-migration.js";

const cycle = {
  sourceId: "income-master",
  cycleStart: "2026-09-20",
  cycleEnd: "2026-10-05",
};

function snapshot({ remainingPlannedSpending, compatibilityEvidence = undefined } = {}) {
  const availableWalletMoney = 5000;
  const cycle100Anchor = 5000;
  const wallBill = availableWalletMoney - remainingPlannedSpending;
  return {
    migrationVersion: 1,
    localVaultId: "vault",
    activeCycle: cycle,
    availableWalletMoney,
    remainingPlannedSpending,
    cycle100Anchor,
    anchorState: "anchored",
    wallBill,
    meansScore: Math.round(100 + ((wallBill / cycle100Anchor) * 100)),
    compatibilityEvidence,
  };
}

test("legacy future-due Debt authority drift is accepted only for its exact proven plan delta", () => {
  const debtId = "transfer:destination:debt-1";
  const requirements = [
    {
      requirementKey: `debt:${debtId}:2026-09-25`,
      sourceType: "debt",
      sourceId: debtId,
      date: "2026-09-25",
      plannedAmount: 1500,
      fulfilledAmount: 1500,
      remainingAmount: 0,
    },
  ];
  const evidence = buildLegacyFutureDebtMigrationCompatibility(
    [
      {
        id: debtId,
        recordKind: "debt_obligation",
        paymentHistory: [
          {
            id: "legacy-payment",
            source: "legacy_mark_paid",
            amount: 1500,
            dueDate: "2026-10-25",
            actualPaymentDate: "2026-09-26",
          },
        ],
      },
    ],
    requirements
  );

  assert.deepEqual(evidence, {
    code: "legacy_future_debt_occurrence_authority_upgrade",
    affectedRequirementCount: 1,
    affectedPlanAmount: 1500,
  });

  const result = reconcileFinancialContextMigration({
    source: snapshot({ remainingPlannedSpending: 1500 }),
    destination: snapshot({
      remainingPlannedSpending: 0,
      compatibilityEvidence: { legacyFutureDebtOccurrence: evidence },
    }),
    unresolved: [],
  });

  assert.equal(result.status, "success");
  assert.equal(result.reconciliation.remainingPlanMatch, false);
  assert.equal(result.compatibilityAdjustment?.code, "legacy_future_debt_occurrence_authority_upgrade");
  assert.equal(result.compatibilityAdjustment?.affectedPlanAmount, 1500);
});

test("generic Remaining Plan mismatch stays fail-closed without proven legacy debt evidence", () => {
  const result = reconcileFinancialContextMigration({
    source: snapshot({ remainingPlannedSpending: 1500 }),
    destination: snapshot({ remainingPlannedSpending: 0 }),
    unresolved: [],
  });
  assert.equal(result.status, "failed");
  assert.equal(result.compatibilityAdjustment, null);
});

test("legacy debt evidence cannot authorize a different financial delta", () => {
  const evidence = {
    code: "legacy_future_debt_occurrence_authority_upgrade",
    affectedRequirementCount: 1,
    affectedPlanAmount: 1500,
  };
  const result = reconcileFinancialContextMigration({
    source: snapshot({ remainingPlannedSpending: 2000 }),
    destination: snapshot({
      remainingPlannedSpending: 0,
      compatibilityEvidence: { legacyFutureDebtOccurrence: evidence },
    }),
    unresolved: [],
  });
  assert.equal(result.status, "failed");
  assert.equal(result.compatibilityAdjustment, null);
});
