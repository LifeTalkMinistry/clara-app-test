import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  addFinancialDays,
  financialDateKey,
  financialWeekdayIndex,
} from "../src/lib/clara-financial-day.js";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("financial-day authority is pinned to Asia/Manila", () => {
  // 2026-08-28 16:30 UTC is already Aug 29 in Manila.
  assert.equal(financialDateKey(new Date("2026-08-28T16:30:00.000Z")), "2026-08-29");
  assert.equal(addFinancialDays("2026-08-31", 1), "2026-09-01");
  assert.equal(financialWeekdayIndex("2026-08-30"), 0);
});

test("ORB runtime delegates Means math to the canonical authority", async () => {
  const runtime = await source("../src/runtime/installClaraOrbGreeting.js");

  assert.match(runtime, /buildCanonicalMeansSnapshot/);
  assert.doesNotMatch(runtime, /resolveLockedMeansCycleBaseline/);
  assert.doesNotMatch(runtime, /resolveMeansCycleBaselineState/);
  assert.doesNotMatch(runtime, /plannedDebtPaidInsideCycle/);
  assert.doesNotMatch(runtime, /futureSavingsGoalAmount/);
  assert.doesNotMatch(runtime, /emergencyProtected\s*=/);
  assert.doesNotMatch(runtime, /moneyLentUnavailable\s*=/);
});

test("canonical authority excludes Savings Goal, Emergency Fund, and Money Lent tracking from Means math", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");

  assert.doesNotMatch(authority, /getSavingsGoals/);
  assert.doesNotMatch(authority, /getEmergencyFund/);
  assert.match(authority, /isMeansNeutralMoneyLentWallet/);
  assert.match(authority, /effectiveCurrentMoney\s*=\s*availableNow\s*-\s*assumedSpent/);
  assert.match(authority, /calculateMeansScoreState\(\{/);
});

test("Cross-Check remains the wallet truth owner and only resets Assumed Spent after success", async () => {
  const reconciliation = await source("../src/lib/weeklyMoneyCheckReconciliationRepository.js");

  assert.match(reconciliation, /weekly_cross_check_adjustment/);
  assert.match(reconciliation, /Cross-Check Adjustment/);
  assert.match(reconciliation, /resetMeansAssumedSpent/);
  assert.doesNotMatch(reconciliation, /requiredRunway/);
});

test("Debt payment owner preserves per-occurrence payment history and linked Transaction Hub audit", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");

  assert.match(payment, /paymentHistory/);
  assert.match(payment, /sumOccurrencePayments/);
  assert.match(payment, /type:\s*"debt_payment"/);
  assert.match(payment, /debt_obligation_id/);
  assert.match(payment, /non_editable:\s*true/);
});

test("Money Schedule updates and Means assumption resets refresh the ORB snapshot without polling", async () => {
  const runtime = await source("../src/runtime/installClaraOrbGreeting.js");

  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /clara:means-assumed-spent-reset/);
  assert.doesNotMatch(runtime, /setInterval\([^)]*refreshMeans/);
});
