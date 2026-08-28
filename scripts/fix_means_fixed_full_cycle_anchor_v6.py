from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "src/runtime/installClaraOrbGreeting.js"
BASELINE = ROOT / "src/lib/clara-means-cycle-baseline.js"
TESTS = ROOT / "tests/means-score-context-baseline-regression.test.mjs"

runtime = RUNTIME.read_text(encoding="utf-8")

legacy_history_block = r'''function readDebtPaymentHistory(record = {}) {
  const source = Array.isArray(record?.paymentHistory)
    ? record.paymentHistory
    : Array.isArray(record?.payment_history)
      ? record.payment_history
      : [];
  return source.filter(Boolean);
}

function plannedDebtPaidInsideCycle(records = [], cycleStart = "", cycleEnd = "") {
  return (Array.isArray(records) ? records : []).reduce((total, record) => {
    const monthlyPayment = Math.max(0, Number(getMonthlyDebtPayment(record) || 0));
    if (!(monthlyPayment > 0)) return total;

    const paidByOccurrence = new Map();
    readDebtPaymentHistory(record).forEach((payment) => {
      const paidDate = String(payment?.paidAt || payment?.paid_at || "").slice(0, 10);
      const dueDate = String(payment?.dueDate || payment?.due_date || "").slice(0, 10);
      if (!paidDate || paidDate < cycleStart || paidDate >= cycleEnd) return;
      if (!dueDate || dueDate < cycleStart || dueDate >= cycleEnd) return;

      const amount = Math.max(0, Number(payment?.amount || 0));
      if (!(amount > 0)) return;
      paidByOccurrence.set(dueDate, (paidByOccurrence.get(dueDate) || 0) + amount);
    });

    let plannedPaid = 0;
    paidByOccurrence.forEach((paidAmount) => {
      // Only the amount CLARA had already scheduled is neutral. Paying extra toward
      // principal is a real additional outflow and must still reduce Means Score.
      plannedPaid += Math.min(paidAmount, monthlyPayment);
    });
    return total + plannedPaid;
  }, 0);
}

'''
if legacy_history_block in runtime:
    runtime = runtime.replace(legacy_history_block, "", 1)
elif "function plannedDebtPaidInsideCycle" in runtime or "function readDebtPaymentHistory" in runtime:
    raise SystemExit("Unexpected paid-debt history helper shape")

old_resolver = r'''function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  upcoming,
  requiredRunwayCandidate,
  assumedSpent,
  debtObligations,
  planFingerprint,
}) {
  // Rebuild the cycle anchor only from currently declared/predicted cycle context.
  // Never backfill already-paid debt from payment history: that silently makes old
  // transactions part of the user's hidden 100 and can double-count realized outflow.
  const reconstructedRequiredRunway = Math.max(
    Number(requiredRunwayCandidate || 0),
    Number(upcoming || 0),
    0
  );
  const fallbackState = resolveMeansCycleBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: reconstructedRequiredRunway,
    assumedSpent,
  });

  if (typeof window === "undefined" || !window.localStorage) {
    return fallbackState.baseline;
  }

  const key = meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd);
  let stored = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    stored = null;
  }

  const resolved = resolveMeansCycleBaselineState({
    stored,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: reconstructedRequiredRunway,
    assumedSpent,
  });

  if (resolved.shouldPersist) {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...resolved.baseline,
          refreshedAt: new Date().toISOString(),
          refreshReason: resolved.reason,
        })
      );
    } catch {
      // Means must remain available even if localStorage is temporarily unavailable.
    }
  }

  return resolved.baseline;
}
'''
new_resolver = r'''function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  plannedRequiredRunway,
  assumedSpent,
  planFingerprint,
}) {
  // PLAN owns the user's personal 100. For a fresh cycle this is the declared/predicted
  // requirement still represented by the plan, plus legitimate elapsed routine assumed
  // spending captured by resolveMeansCycleBaselineState. Realized transactions are never
  // read here and therefore cannot reconstruct or inflate the denominator.
  const authoritativePlannedRunway = Math.max(0, Number(plannedRequiredRunway || 0));
  const fallbackState = resolveMeansCycleBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: authoritativePlannedRunway,
    assumedSpent,
  });

  if (typeof window === "undefined" || !window.localStorage) {
    return fallbackState.baseline;
  }

  const key = meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd);
  let stored = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    stored = null;
  }

  const resolved = resolveMeansCycleBaselineState({
    stored,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: authoritativePlannedRunway,
    assumedSpent,
  });

  if (resolved.shouldPersist) {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...resolved.baseline,
          refreshedAt: new Date().toISOString(),
          refreshReason: resolved.reason,
        })
      );
    } catch {
      // Means must remain available even if localStorage is temporarily unavailable.
    }
  }

  return resolved.baseline;
}
'''
if old_resolver in runtime:
    runtime = runtime.replace(old_resolver, new_resolver, 1)
elif new_resolver not in runtime:
    raise SystemExit("Means locked baseline resolver shape changed")

old_candidate = r'''  const requiredRunwayCandidate = calculateCycleRequiredRunway({
    income,
    availableNow,
    upcoming,
  });

  // Means Score uses one locked measuring stick for the whole payday-to-payday window.
  // Paying a commitment CLARA already predicted must be neutral: cash and remaining
  // commitments fall together, so the user's real room has not changed.
  const financialRunway = availableNow + emergencyProtected;
  const cycleBaseline = resolveLockedMeansCycleBaseline({
    owner,
    cycleStart: cycleStartDate,
    cycleEnd: cycleEndDate,
    upcoming,
    requiredRunwayCandidate,
    assumedSpent,
    debtObligations,
    planFingerprint,
  });'''
new_candidate = r'''  const plannedRequiredRunway = calculateCycleRequiredRunway({ upcoming });

  // Means Score uses one locked measuring stick for the whole payday-to-payday window.
  // Realized outflows only change financialRunway. A paid/completed commitment may leave
  // Upcoming, but that realization cannot shrink or rebuild the already-locked 100.
  const financialRunway = availableNow + emergencyProtected;
  const cycleBaseline = resolveLockedMeansCycleBaseline({
    owner,
    cycleStart: cycleStartDate,
    cycleEnd: cycleEndDate,
    plannedRequiredRunway,
    assumedSpent,
    planFingerprint,
  });'''
if old_candidate in runtime:
    runtime = runtime.replace(old_candidate, new_candidate, 1)
elif new_candidate not in runtime:
    raise SystemExit("Means baseline call-site shape changed")

old_score_call = r'''  const { score, scoreRoom, plannedAssumedSinceLock, fullyCovered } = calculateMeansScoreState({
    financialRunway,
    upcoming,
    requiredRunway,
    assumedSpent,
    assumedSpentAtLock: cycleBaseline.assumedSpentAtLock,
    realizedPlannedOffset: realizedPlannedBuyCheckOffset,
  });'''
new_score_call = r'''  const { score, scoreRoom, plannedAssumedSinceLock, fullyCovered } = calculateMeansScoreState({
    financialRunway,
    requiredRunway,
  });'''
if old_score_call in runtime:
    runtime = runtime.replace(old_score_call, new_score_call, 1)
elif new_score_call not in runtime:
    raise SystemExit("Means score call-site shape changed")

if "plannedDebtPaidInsideCycle" in runtime or "readDebtPaymentHistory" in runtime:
    raise SystemExit("Realized debt-payment history still exists in Means baseline runtime")
if "requiredRunwayCandidate" in runtime:
    raise SystemExit("Wallet-era Means baseline candidate still exists")

RUNTIME.write_text(runtime, encoding="utf-8")

baseline = BASELINE.read_text(encoding="utf-8")
old_comment = '''  // Assumed spent is scheduled routine value that has already crossed into the elapsed
  // part of the cycle. It is still part of the user's declared cycle requirement.
  // Actual payments/transactions are intentionally excluded from reconstruction.
  const fullCycleRequiredRunway = normalizedRequired + normalizedAssumed;'''
new_comment = '''  // Deterministic migration/new-cycle strategy: use only the authoritative planned-cycle
  // requirement available now plus elapsed routine that belongs to that declared plan.
  // Do not synthesize missing history from wallet balances, transactions, debt payments,
  // completed obligations, or any other realized state.
  const fullCycleRequiredRunway = normalizedRequired + normalizedAssumed;'''
if old_comment in baseline:
    baseline = baseline.replace(old_comment, new_comment, 1)
elif new_comment not in baseline:
    raise SystemExit("Means migration comment shape changed")
BASELINE.write_text(baseline, encoding="utf-8")

TESTS.write_text(r'''import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateCycleRequiredRunway,
  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";

function plan(amount, id = "primary") {
  return stableMeansPlanFingerprint({
    routine: [],
    schedule: [{ id, date: "2026-09-01", amount }],
    debt: [],
    savings: [],
  });
}

function freshBaseline({
  amount,
  assumedSpent = 0,
  cycleStart = "2026-08-25",
  cycleEnd = "2026-09-10",
  fingerprint = plan(amount),
}) {
  return resolveMeansCycleBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    planFingerprint: fingerprint,
    requiredRunway: amount,
    assumedSpent,
  }).baseline;
}

function preserve({ baseline, plannedRequiredRunway, assumedSpent = 0, fingerprint = baseline.planFingerprint }) {
  return resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: baseline.cycleStart,
    cycleEnd: baseline.cycleEnd,
    planFingerprint: fingerprint,
    requiredRunway: plannedRequiredRunway,
    assumedSpent,
  });
}

function score(financialRunway, baseline) {
  return calculateMeansScoreState({
    financialRunway,
    requiredRunway: baseline.requiredRunway,
  }).score;
}

test("new cycle 100 is plan-owned and ignores income/current wallet inputs", () => {
  const plannedRequiredRunway = calculateCycleRequiredRunway({
    income: 15100,
    availableNow: 7388,
    upcoming: 3121,
  });
  assert.equal(plannedRequiredRunway, 3121);

  const baseline = freshBaseline({ amount: plannedRequiredRunway, assumedSpent: 280 });
  assert.equal(baseline.requiredRunway, 3401);
});

test("same-cycle 100 does not change after spending", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const afterSpend = preserve({
    baseline,
    plannedRequiredRunway: 10000,
  });

  assert.equal(afterSpend.shouldPersist, false);
  assert.equal(afterSpend.reason, "cycle_anchor_locked");
  assert.equal(afterSpend.baseline.requiredRunway, 10000);
  assert.equal(score(20000, baseline), 200);
  assert.equal(score(18000, afterSpend.baseline), 180);
});

test("same-cycle 100 does not change after a debt payment", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const afterDebtPayment = preserve({
    baseline,
    // The paid occurrence disappeared from CURRENT remaining commitments.
    plannedRequiredRunway: 8000,
    fingerprint: plan(8000, "after-payment"),
  });

  assert.equal(afterDebtPayment.baseline.requiredRunway, 10000);
  assert.equal(score(15000, baseline), 150);
  assert.equal(score(13000, afterDebtPayment.baseline), 130);
});

test("already-paid debt history cannot inflate or create the 100", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");

  assert.doesNotMatch(runtime, /plannedDebtPaidInsideCycle/);
  assert.doesNotMatch(runtime, /plannedDebtAlreadyPaid/);
  assert.doesNotMatch(runtime, /readDebtPaymentHistory/);
  assert.match(runtime, /const plannedRequiredRunway = calculateCycleRequiredRunway\(\{ upcoming \}\);/);
  assert.doesNotMatch(runtime, /income\s*-\s*\([^\n]*available/);
});

test("removing a completed upcoming obligation cannot increase score by shrinking 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const afterCompletion = preserve({
    baseline,
    plannedRequiredRunway: 7000,
    fingerprint: plan(7000, "completed-obligation-removed"),
  });

  assert.equal(afterCompletion.baseline.requiredRunway, 10000);
  assert.equal(score(15000, baseline), 150);
  assert.equal(score(15000, afterCompletion.baseline), 150);
});

test("adding cash raises the score against the same fixed 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score(10000, baseline), 100);
  assert.equal(score(12000, baseline), 120);
});

test("spending cash lowers the score against the same fixed 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score(20000, baseline), 200);
  assert.equal(score(18000, baseline), 180);
  assert.equal(score(13000, baseline), 130);
  assert.equal(score(9000, baseline), 90);
});

test("same-cycle plan/context changes cannot move the fixed 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const changed = preserve({
    baseline,
    plannedRequiredRunway: 12000,
    assumedSpent: 5000,
    fingerprint: plan(12000, "changed"),
  });

  assert.equal(changed.shouldPersist, false);
  assert.equal(changed.reason, "cycle_anchor_locked");
  assert.equal(changed.baseline.requiredRunway, 10000);
});

test("a genuinely new pay cycle establishes a new 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const nextCycle = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    planFingerprint: plan(12000, "new-cycle"),
    requiredRunway: 12000,
    assumedSpent: 0,
  });

  assert.equal(nextCycle.shouldPersist, true);
  assert.equal(nextCycle.reason, "new_cycle_or_stale_baseline");
  assert.equal(nextCycle.baseline.requiredRunway, 12000);
});

test("stale baseline migration uses deterministic planned-cycle data, not realized history", () => {
  const migrated = resolveMeansCycleBaselineState({
    stored: {
      version: 4,
      requiredRunway: 7859,
      assumedSpentAtLock: 280,
      cycleStart: "2026-08-25",
      cycleEnd: "2026-09-10",
      planFingerprint: plan(7859, "stale-transaction-inflated"),
      paymentHistory: [{ amount: 5000, paidAt: "2026-08-27" }],
    },
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    planFingerprint: plan(3121, "authoritative-current-plan"),
    requiredRunway: 3121,
    assumedSpent: 280,
  });

  assert.equal(migrated.shouldPersist, true);
  assert.equal(migrated.reason, "new_cycle_or_stale_baseline");
  assert.equal(migrated.baseline.requiredRunway, 3401);
  assert.notEqual(migrated.baseline.requiredRunway, 7859);
});

test("runtime/store wiring remains intact for financial context updates", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const scheduleRepository = await readFile(new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url), "utf8");
  const schedulePanel = await readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /clara:means-cycle-baseline:v5/);
  assert.match(runtime, /FINANCE_DATA_UPDATED_EVENT/);
  assert.match(runtime, /INCOME_HUB_UPDATED_EVENT/);
  assert.match(runtime, /DEBT_OBLIGATIONS_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /"clara:schedule:create-event"/);
  assert.match(scheduleRepository, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(schedulePanel, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
});
''', encoding="utf-8")

print("Prepared plan-owned immutable Means baseline repair and regression coverage.")
