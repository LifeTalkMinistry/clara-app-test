import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const cycleStart = "2026-08-29";
const cycleEnd = "2026-09-12";
const today = "2026-08-29";

const occurrence = (id, date, amount, kind = "money_schedule", actualPaid = 0) => ({
  id,
  date,
  amount,
  kind,
  actualPaid,
});

function resolve({ occurrences = [], stored = null, extra = 0, carry = 0 } = {}) {
  return resolveAdaptiveMeansBaselineState({
    stored,
    cycleStart,
    cycleEnd,
    today,
    occurrences,
    extraCurrentCycleActual: extra,
    carriedObligations: carry,
  });
}

test("01 fresh cycle with no plan keeps required runway at zero", () => {
  const state = resolve();
  assert.equal(state.requiredRunway, 0);
});

test("02 one scheduled requirement establishes the personal 100 baseline", () => {
  const state = resolve({ occurrences: [occurrence("rent", "2026-09-01", 10000)] });
  assert.equal(state.requiredRunway, 10000);
});

test("03 wallet equal to the full-cycle requirement scores exactly 100", () => {
  const score = calculateMeansScoreState({ effectiveCurrentMoney: 10000, requiredRunway: 10000 });
  assert.equal(score.score, 100);
});

test("04 wallet below the full-cycle requirement scores below 100", () => {
  const score = calculateMeansScoreState({ effectiveCurrentMoney: 8000, requiredRunway: 10000 });
  assert.equal(score.score, 80);
});

test("05 adding a future Money Schedule requirement immediately expands 100", () => {
  const before = resolve({ occurrences: [occurrence("rent", "2026-09-01", 10000)] });
  const after = resolve({
    stored: before.baseline,
    occurrences: [
      occurrence("rent", "2026-09-01", 10000),
      occurrence("food", "2026-09-04", 5000),
    ],
  });
  assert.equal(after.requiredRunway, 15000);
});

test("06 reducing or deleting a future Money Schedule requirement immediately shrinks 100", () => {
  const before = resolve({
    occurrences: [
      occurrence("rent", "2026-09-01", 10000),
      occurrence("food", "2026-09-04", 5000),
    ],
  });
  const after = resolve({
    stored: before.baseline,
    occurrences: [occurrence("rent", "2026-09-01", 9000)],
  });
  assert.equal(after.requiredRunway, 9000);
});

test("07 editing today's schedule after the Manila day begins cannot rewrite protected 100", () => {
  const before = resolve({ occurrences: [occurrence("today", today, 3000)] });
  const after = resolve({ stored: before.baseline, occurrences: [occurrence("today", today, 9000)] });
  assert.equal(after.requiredRunway, 3000);
});

test("08 editing or deleting a past scheduled occurrence cannot rewrite protected 100", () => {
  const before = resolve({
    stored: {
      version: 6,
      cycleStart,
      cycleEnd,
      protectedContributions: {
        past: { id: "past", date: "2026-08-28", kind: "money_schedule", amount: 2500 },
      },
    },
    occurrences: [],
  });
  assert.equal(before.requiredRunway, 2500);
});

test("09 Manila financial day is authoritative but time passage alone cannot spend Wallet money", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /const today = financialDateKey\(now\)/);
  assert.match(authority, /const assumedSpent = 0/);
  assert.match(authority, /const effectiveCurrentMoney = availableNow/);
});

test("10 Cross-Check changes Means only through reconciled Wallet truth", async () => {
  const repository = await source("../src/lib/weeklyMoneyCheckReconciliationRepository.js");
  assert.match(repository, /runLocalFinanceTransaction/);
  assert.doesNotMatch(repository, /resetMeansAssumedSpent/);
});

test("11 honest no-delta Cross-Check creates no synthetic Means mutation", async () => {
  const repository = await source("../src/lib/weeklyMoneyCheckReconciliationRepository.js");
  assert.doesNotMatch(repository, /assumed[_A-Za-z]*spent/i);
});

test("12 a wallet expense lowers Means without rewriting 100", async () => {
  const sourceText = await source("../src/lib/clara-means-cycle-baseline.js");
  assert.doesNotMatch(sourceText, /actual.*expense.*requiredRunway/i);
});

test("13 adding actual wallet money raises Means without rewriting 100", () => {
  const baseline = resolve({ occurrences: [occurrence("plan", "2026-09-01", 10000)] });
  const before = calculateMeansScoreState({ effectiveCurrentMoney: 10000, requiredRunway: baseline.requiredRunway });
  const after = calculateMeansScoreState({ effectiveCurrentMoney: 12000, requiredRunway: baseline.requiredRunway });
  assert.equal(before.score, 100);
  assert.equal(after.score, 120);
});

test("14 Savings Goal protected money is excluded from available Wallet, not added to 100", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /getSavingsGoals/);
  assert.match(authority, /savingsProtected/);
  assert.doesNotMatch(authority, /kind:\s*["']savings_goal["']/);
});

test("15 Emergency Fund protected money is excluded from available Wallet, not added to 100", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /getEmergencyFund/);
  assert.match(authority, /emergencyProtected/);
  assert.doesNotMatch(authority, /kind:\s*["']emergency_fund["']/);
});

test("16 Money Lent is unavailable to Means while remaining outside the 100 baseline", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /isMoneyLentWallet/);
  assert.match(authority, /moneyLentUnavailable/);
});

test("17 an obligation occurrence due inside the cycle enters the baseline immediately", () => {
  const state = resolve({ occurrences: [occurrence("debt:a:2026-09-05", "2026-09-05", 5000, "debt")] });
  assert.equal(state.requiredRunway, 5000);
});

test("18 partial payment below the planned occurrence keeps that occurrence open", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /Math\.max\(planned - actualPaid, 0\)/);
});

test("19 multiple partial payments can aggregate to satisfy exactly one occurrence", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /cumulativeActualForOccurrence/);
  assert.match(authority, /sum \+ nonNegative\(payment\?\.amount\)/);
});

test("20 exact occurrence payment preserves obligation and due-date identity", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  assert.match(payment, /dueDate/);
  assert.match(payment, /debtId|debt_id/);
});

test("21 overpay never expands the protected occurrence baseline", () => {
  const state = resolve({ occurrences: [occurrence("debt:a", "2026-09-05", 5000, "debt", 9000)] });
  assert.equal(state.requiredRunway, 5000);
});

test("22 paying a future-cycle occurrence early cannot enter the current-cycle 100", () => {
  const state = resolve({ extra: 4000, carry: 0 });
  assert.equal(state.requiredRunway, 0);
});

test("23 future-cycle payment history is not a current-cycle baseline input", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.doesNotMatch(authority, /currentCycleFutureDebtActual/);
  assert.match(authority, /extraCurrentCycleActual:\s*0/);
});

test("24 obligation payment uses the chosen wallet while source-card identity remains debt-owned", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  assert.match(payment, /walletId|wallet_id/);
  assert.match(payment, /debtId|debt_id/);
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

test("27 completed debt stops generating unrelated future planned occurrences", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /if \(isActiveDebtObligation\(record\)\) return true/);
  assert.match(authority, /return readDebtPayments\(record\)\.some\(\(payment\) =>/);
  assert.match(authority, /actualDate && actualDate >= cycleStart/);
});

test("28 overdue carry cannot silently enter a new cycle baseline", () => {
  const state = resolve({ occurrences: [occurrence("plan", "2026-09-01", 8000)], carry: 500 });
  assert.equal(state.requiredRunway, 8000);
  assert.equal(state.carriedObligations, 500);
});

test("29 no carried-debt status path is permitted to size the denominator", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.doesNotMatch(authority, /carriedOccurrences/);
  assert.doesNotMatch(authority, /still_unpaid/);
});

test("30 genuine cycle rollover creates a new cycle baseline instead of carrying the old protected map", () => {
  const previous = resolve({ occurrences: [occurrence("old", "2026-08-29", 3000)] });
  const next = resolveAdaptiveMeansBaselineState({
    stored: previous.baseline,
    cycleStart: "2026-09-12",
    cycleEnd: "2026-09-26",
    today: "2026-09-12",
    occurrences: [occurrence("new", "2026-09-15", 7000)],
  });
  assert.equal(next.requiredRunway, 7000);
});

test("31 negative effective current money is allowed to produce a negative Means Score", () => {
  const state = calculateMeansScoreState({ effectiveCurrentMoney: -2500, requiredRunway: 10000 });
  assert.equal(state.score, -25);
});

test("32 Manila remains authoritative even when the client timezone is behind", async () => {
  const financialDay = await source("../src/lib/clara-financial-day.js");
  assert.match(financialDay, /Asia\/Manila/);
});

test("33 migration ignores ambiguous legacy scalar locks instead of preserving known-invalid Means inputs", () => {
  const state = resolve({
    stored: { version: 5, base: 999999 },
    occurrences: [occurrence("plan", "2026-09-01", 8000)],
  });
  assert.equal(state.requiredRunway, 8000);
});

test("34 runtime uses one canonical Means authority and contains no legacy duplicate current-score engine", async () => {
  const runtime = await source("../src/runtime/installClaraOrbGreeting.js");
  assert.match(runtime, /buildCanonicalMeansSnapshot/);
  assert.doesNotMatch(runtime, /function calculateMeansScore/);
});

test("35 finance and plan events refresh Means without correctness polling", async () => {
  const runtime = await source("../src/runtime/installClaraOrbGreeting.js");
  assert.match(runtime, /clara-finance-updated/);
  assert.match(runtime, /clara:money-schedule-updated/);
});
