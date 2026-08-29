import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";
import { financialDateKey } from "../src/lib/clara-financial-day.js";
import { isDebtOccurrencePaid } from "../src/lib/debtOccurrenceState.js";

const CYCLE = { start: "2026-08-25", end: "2026-09-10" };

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

function occurrence(id, date, amount, extra = {}) {
  return { id, date, amount, kind: "money_schedule", ...extra };
}

function resolve({ stored = null, today = "2026-08-28", occurrences = [], extra = 0, carry = 0, cycle = CYCLE } = {}) {
  return resolveAdaptiveMeansBaselineState({
    stored,
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    today,
    occurrences,
    extraCurrentCycleActual: extra,
    carriedObligations: carry,
  });
}

function score(current, baseline) {
  return calculateMeansScoreState({ effectiveCurrentMoney: current, requiredRunway: baseline }).score;
}

test("01 fresh cycle with no plan keeps required runway at zero", () => {
  assert.equal(resolve().requiredRunway, 0);
});

test("02 one scheduled requirement establishes the personal 100 baseline", () => {
  assert.equal(resolve({ occurrences: [occurrence("food", "2026-09-01", 10000)] }).requiredRunway, 10000);
});

test("03 wallet equal to the full-cycle requirement scores exactly 100", () => {
  assert.equal(score(10000, 10000), 100);
});

test("04 wallet below the full-cycle requirement scores below 100", () => {
  assert.equal(score(8000, 10000), 80);
});

test("05 adding a future Money Schedule requirement immediately expands 100", () => {
  const first = resolve({ occurrences: [occurrence("base", "2026-09-01", 8000)] });
  const next = resolve({
    stored: first.baseline,
    occurrences: [occurrence("base", "2026-09-01", 8000), occurrence("future", "2026-09-05", 2000)],
  });
  assert.equal(next.requiredRunway, 10000);
});

test("06 reducing or deleting a future Money Schedule requirement immediately shrinks 100", () => {
  const first = resolve({
    occurrences: [occurrence("base", "2026-09-01", 8000), occurrence("future", "2026-09-05", 2000)],
  });
  const next = resolve({ stored: first.baseline, occurrences: [occurrence("base", "2026-09-01", 8000)] });
  assert.equal(next.requiredRunway, 8000);
});

test("07 editing today's schedule after the Manila day begins cannot rewrite protected 100", () => {
  const first = resolve({ today: "2026-08-28", occurrences: [occurrence("today", "2026-08-28", 1200)] });
  const next = resolve({ stored: first.baseline, today: "2026-08-28", occurrences: [occurrence("today", "2026-08-28", 200)] });
  assert.equal(next.requiredRunway, 1200);
});

test("08 editing or deleting a past scheduled occurrence cannot rewrite protected 100", () => {
  const first = resolve({ today: "2026-08-28", occurrences: [occurrence("past", "2026-08-27", 900)] });
  const next = resolve({ stored: first.baseline, today: "2026-08-29", occurrences: [] });
  assert.equal(next.requiredRunway, 900);
});

test("09 Assumed Spent day activation uses Manila financial day, not client-local day", async () => {
  assert.equal(financialDateKey(new Date("2026-08-28T16:00:00.000Z")), "2026-08-29");
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /date > today/);
  assert.match(authority, /availableNow - assumedSpent/);
});

test("10 Cross-Check adjustment updates wallet truth and resets Assumed Spent only after success", async () => {
  const reconciliation = await source("../src/lib/weeklyMoneyCheckReconciliationRepository.js");
  assert.match(reconciliation, /type:\s*"weekly_cross_check_adjustment"/);
  assert.match(reconciliation, /category:\s*"Cross-Check Adjustment"/);
  assert.match(reconciliation, /const result = await runLocalFinanceTransaction/);
  assert.match(reconciliation, /resetMeansAssumedSpent\(safeLocalUserId/);
});

test("11 honest no-delta Cross-Check still resets Assumed Spent", async () => {
  const reconciliation = await source("../src/lib/weeklyMoneyCheckReconciliationRepository.js");
  assert.match(reconciliation, /if \(!candidates\.length\) \{[\s\S]*resetMeansAssumedSpent/);
  assert.match(reconciliation, /adjustedWallets:\s*0/);
});

test("12 a wallet expense lowers Means without rewriting 100", () => {
  assert.equal(score(9000, 10000), 90);
  assert.equal(score(7000, 10000), 70);
});

test("13 adding actual wallet money raises Means without rewriting 100", () => {
  assert.equal(score(10000, 10000), 100);
  assert.equal(score(15000, 10000), 150);
});

test("14 Savings Goal create edit delete is Means-neutral", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.doesNotMatch(authority, /getSavingsGoals/);
  assert.match(authority, /savingsGoalUpcoming:\s*0/);
  assert.match(authority, /savingsProtected:\s*0/);
});

test("15 Emergency Fund create edit delete is Means-neutral", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.doesNotMatch(authority, /getEmergencyFund/);
  assert.match(authority, /emergencyProtected:\s*0/);
});

test("16 Money Lent create edit delete is Means-neutral and excluded as a special container", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /isMeansNeutralMoneyLentWallet/);
  assert.match(authority, /moneyLentUnavailable:\s*0/);
});

test("17 an obligation occurrence due inside the cycle enters the baseline immediately", () => {
  const state = resolve({ occurrences: [occurrence("debt:a:2026-09-01", "2026-09-01", 1200, { kind: "debt" })] });
  assert.equal(state.requiredRunway, 1200);
});

test("18 partial payment below the planned occurrence keeps that occurrence open", () => {
  const record = {
    paymentHistory: [{ amount: 700, dueDate: "2026-08-28", paidAt: "2026-08-28T01:00:00.000Z" }],
    lastPaidAt: "2026-08-28T01:00:00.000Z",
  };
  assert.equal(isDebtOccurrencePaid(record, "2026-08-28"), false);
  const state = resolve({ occurrences: [occurrence("debt:a:2026-08-28", "2026-08-28", 1200, { kind: "debt", actualPaid: 700 })] });
  assert.equal(state.requiredRunway, 1200);
});

test("19 multiple partial payments can aggregate to satisfy exactly one occurrence", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  assert.match(payment, /sumOccurrencePayments\(paymentHistory, dueDate\)/);
  assert.match(payment, /occurrencePaidAmount >= expectedOccurrenceAmount/);
  assert.match(payment, /occurrenceSatisfied[\s\S]*appendPaidDebtOccurrence/);
});

test("20 exact occurrence payment preserves obligation and due-date identity", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  assert.match(payment, /debt_obligation_id:\s*safeDebtId/);
  assert.match(payment, /due_date:\s*dueDate \|\| null/);
  assert.match(payment, /debt_payment_id:\s*paymentId/);
});

test("21 overpay expands only the current occurrence baseline and does not roll to the next", () => {
  const current = resolve({ occurrences: [occurrence("debt:a:2026-08-28", "2026-08-28", 1200, { kind: "debt", actualPaid: 1500 })] });
  assert.equal(current.requiredRunway, 1500);
  const withNext = resolve({ stored: current.baseline, occurrences: [
    occurrence("debt:a:2026-08-28", "2026-08-28", 1200, { kind: "debt", actualPaid: 1500 }),
    occurrence("debt:a:2026-09-05", "2026-09-05", 1200, { kind: "debt", actualPaid: 0 }),
  ] });
  assert.equal(withNext.requiredRunway, 2700);
});

test("22 paying a future-cycle occurrence early counts as current-cycle actual exactly once", () => {
  const state = resolve({ occurrences: [occurrence("plan", "2026-09-01", 8000)], extra: 1200 });
  assert.equal(state.requiredRunway, 9200);
});

test("23 a later cycle excludes an occurrence already fully paid before that cycle", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /amountPaidBeforeCycle/);
  assert.match(authority, /paidBeforeCycle \+ EPSILON >= planned\) return false/);
  assert.match(authority, /currentCycleFutureDebtActual/);
});

test("24 obligation payment uses the chosen wallet while source-card identity remains debt-owned", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  assert.match(payment, /const walletId = clean\(options\.walletId/);
  assert.match(payment, /const wallet = await tx\.get\(WALLET_STORE, walletId\)/);
  assert.match(payment, /balance:\s*currentWalletBalance - paymentAmount/);
  assert.match(payment, /debt_obligation_id:\s*safeDebtId/);
});

test("25 debt payment history is immutable in Transaction Hub", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  const card = await source("../src/components/fresh/transaction-hub/ui/TransactionCard.jsx");
  assert.match(payment, /non_editable:\s*true/);
  assert.match(card, /const isNonEditable = Boolean\(raw\.non_editable \|\| raw\.nonEditable \|\| isDebtPayment\)/);
  assert.match(card, /!isNonEditable \?/);
});

test("26 obligation payment mutations are atomic across debt wallet and transaction history", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  assert.match(payment, /runLocalFinanceTransaction\([\s\S]*DEBT_OBLIGATION_STORE[\s\S]*WALLET_STORE[\s\S]*WALLET_TRANSACTION_STORE/);
  assert.match(payment, /await tx\.putRaw\(DEBT_OBLIGATION_STORE/);
  assert.match(payment, /await tx\.putRaw\(WALLET_STORE/);
  assert.match(payment, /await tx\.putRaw\(WALLET_TRANSACTION_STORE/);
});

test("27 completed debt stops generating future planned occurrences", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /if \(isActiveDebtObligation\(record\)\) return true/);
  assert.match(authority, /Completed obligations remain visible to the cycle in which their payment happened/);
});

test("28 confirmed Still Unpaid carry enters the new cycle baseline", () => {
  const state = resolve({ occurrences: [occurrence("plan", "2026-09-01", 8000)], carry: 500 });
  assert.equal(state.requiredRunway, 8500);
});

test("29 Paid Already or Ask Me Later cannot silently add arbitrary overdue carry", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /\["confirmed", "still_unpaid", "carried"\]\.includes\(status\)/);
  assert.doesNotMatch(authority, /\["paid_already"[\s\S]*still_unpaid/);
  assert.doesNotMatch(authority, /\["ask_me_later"[\s\S]*still_unpaid/);
});

test("30 genuine cycle rollover creates a new cycle baseline instead of carrying the old protected map", () => {
  const old = resolve({ occurrences: [occurrence("old", "2026-08-28", 10000)] });
  const next = resolve({
    stored: old.baseline,
    today: "2026-09-10",
    cycle: { start: "2026-09-10", end: "2026-09-25" },
    occurrences: [occurrence("new", "2026-09-12", 12000)],
  });
  assert.equal(next.requiredRunway, 12000);
  assert.deepEqual(next.protectedOccurrences, {});
});

test("31 negative effective current money is allowed to produce a negative Means Score", () => {
  assert.equal(score(-1000, 10000), -10);
});

test("32 Manila remains authoritative even when the client timezone is behind", () => {
  assert.equal(financialDateKey(new Date("2026-08-29T00:30:00+08:00")), "2026-08-29");
  assert.equal(financialDateKey(new Date("2026-08-28T16:30:00Z")), "2026-08-29");
});

test("33 migration ignores ambiguous legacy scalar locks instead of preserving known-invalid Means inputs", () => {
  const state = resolve({
    stored: { version: 5, cycleStart: CYCLE.start, cycleEnd: CYCLE.end, requiredRunway: 99999 },
    occurrences: [occurrence("legitimate", "2026-09-01", 8000)],
  });
  assert.equal(state.requiredRunway, 8000);
  assert.equal(state.baseline.version, 6);
});

test("34 runtime uses one canonical Means authority and contains no legacy duplicate score engine", async () => {
  const runtime = await source("../src/runtime/installClaraOrbGreeting.js");
  assert.match(runtime, /buildCanonicalMeansSnapshot/);
  assert.doesNotMatch(runtime, /resolveLockedMeansCycleBaseline/);
  assert.doesNotMatch(runtime, /plannedDebtPaidInsideCycle/);
  assert.doesNotMatch(runtime, /futureSavingsGoalAmount/);
});

test("35 finance events refresh Means and no recurring polling loop owns correctness", async () => {
  const runtime = await source("../src/runtime/installClaraOrbGreeting.js");
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /clara:means-assumed-spent-reset/);
  assert.match(runtime, /clara-finance-updated/);
  assert.doesNotMatch(runtime, /setInterval\([^)]*refreshMeans/);
});
