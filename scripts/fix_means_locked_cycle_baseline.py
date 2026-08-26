from pathlib import Path

TARGET = Path("src/runtime/installClaraOrbGreeting.js")
source = TARGET.read_text()

MARKER = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v1";'
if MARKER in source:
    print("Means locked-cycle baseline already installed.")
    raise SystemExit(0)

source = source.replace(
    '  DEBT_OBLIGATIONS_UPDATED_EVENT,\n  getDebtObligations,\n} from "@/lib/debtObligationStore";',
    '  DEBT_OBLIGATIONS_UPDATED_EVENT,\n  getDebtObligations,\n  getMonthlyDebtPayment,\n} from "@/lib/debtObligationStore";',
    1,
)

constant_anchor = 'const SAVINGS_GOAL_SCHEDULE_SOURCE = "savings_goal_card_projection";\n'
if constant_anchor not in source:
    raise SystemExit("Could not find Means constants anchor.")
source = source.replace(
    constant_anchor,
    constant_anchor + 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v1";\n',
    1,
)

helper_anchor = 'async function buildMeansSnapshot(profile = {}) {'
if helper_anchor not in source:
    raise SystemExit("Could not find buildMeansSnapshot anchor.")

helpers = r'''function readDebtPaymentHistory(record = {}) {
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

function meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd) {
  const ownerKey = encodeURIComponent(String(owner || "local-user").trim() || "local-user");
  return `${MEANS_CYCLE_BASELINE_STORAGE_PREFIX}:${ownerKey}:${cycleStart}:${cycleEnd}`;
}

function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  upcoming,
  assumedSpent,
  debtObligations,
}) {
  const plannedDebtAlreadyPaid = plannedDebtPaidInsideCycle(
    debtObligations,
    cycleStart,
    cycleEnd
  );

  // Migration-safe reconstruction: if the fix lands after a scheduled debt payment,
  // add only that already-planned payment back to the current requirement. This
  // restores the same denominator CLARA was using immediately before the payment.
  const reconstructedRequiredRunway = Math.max(
    Number(upcoming || 0) + plannedDebtAlreadyPaid,
    0
  );
  const fallback = {
    requiredRunway: reconstructedRequiredRunway,
    assumedSpentAtLock: Math.max(0, Number(assumedSpent || 0)),
    cycleStart,
    cycleEnd,
  };

  if (typeof window === "undefined" || !window.localStorage) return fallback;

  const key = meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    if (
      parsed &&
      parsed.cycleStart === cycleStart &&
      parsed.cycleEnd === cycleEnd &&
      Number.isFinite(Number(parsed.requiredRunway)) &&
      Number(parsed.requiredRunway) >= 0
    ) {
      return {
        requiredRunway: Math.max(0, Number(parsed.requiredRunway)),
        assumedSpentAtLock: Math.max(0, Number(parsed.assumedSpentAtLock || 0)),
        cycleStart,
        cycleEnd,
      };
    }
  } catch {
    // Replace malformed local state with a clean cycle lock below.
  }

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ ...fallback, lockedAt: new Date().toISOString() })
    );
  } catch {
    // Means must remain available even if localStorage is temporarily unavailable.
  }
  return fallback;
}

'''
source = source.replace(helper_anchor, helpers + helper_anchor, 1)

old_score_block = '''  const projectedSpending = upcoming;\n  const projectedRoom = availableNow - upcoming;\n\n  // Means Score is an uncapped financial-runway index.\n  // 100 means the user has exactly the resources required to reach the next payday.\n  // Emergency Fund increases financial runway, but remains protected from ordinary spending.\n  const financialRunway = availableNow + emergencyProtected;\n  const requiredRunway = upcoming;\n  const score =\n    requiredRunway > 0\n      ? Math.round((financialRunway / requiredRunway) * 100)\n      : financialRunway > 0\n        ? 100\n        : 0;\n'''
new_score_block = '''  const projectedSpending = upcoming;\n  const projectedRoom = availableNow - upcoming;\n\n  // Means Score uses one locked measuring stick for the whole payday-to-payday window.\n  // Paying a commitment CLARA already predicted must be neutral: cash and remaining\n  // commitments fall together, so the user's real room has not changed.\n  const financialRunway = availableNow + emergencyProtected;\n  const cycleBaseline = resolveLockedMeansCycleBaseline({\n    owner,\n    cycleStart: cycleStartDate,\n    cycleEnd: cycleEndDate,\n    upcoming,\n    assumedSpent,\n    debtObligations,\n  });\n  const requiredRunway = Math.max(0, Number(cycleBaseline.requiredRunway || 0));\n\n  // Money Schedule becomes \"assumed spent\" as time passes without directly mutating\n  // the wallet. Neutralize only the amount assumed after this cycle was locked so time\n  // progression alone cannot manufacture a higher score.\n  const plannedAssumedSinceLock = Math.max(\n    0,\n    assumedSpent - Math.max(0, Number(cycleBaseline.assumedSpentAtLock || 0))\n  );\n  const scoreRoom = financialRunway - upcoming - plannedAssumedSinceLock;\n  const score =\n    requiredRunway > 0\n      ? Math.round(((requiredRunway + scoreRoom) / requiredRunway) * 100)\n      : financialRunway > 0\n        ? 100\n        : 0;\n'''
if old_score_block not in source:
    raise SystemExit("Could not find current Means score block; refusing unsafe patch.")
source = source.replace(old_score_block, new_score_block, 1)

return_anchor = '''    availableNow,\n    financialRunway,\n    requiredRunway,\n    moneyLentUnavailable,\n'''
return_replacement = '''    availableNow,\n    financialRunway,\n    requiredRunway,\n    scoreRoom,\n    plannedAssumedSinceLock,\n    moneyLentUnavailable,\n'''
if return_anchor not in source:
    raise SystemExit("Could not find Means snapshot return anchor.")
source = source.replace(return_anchor, return_replacement, 1)

signature_anchor = '''        Math.round(snapshot.financialRunway || 0),\n        Math.round(snapshot.requiredRunway || 0),\n        Math.round(snapshot.moneyLentUnavailable || 0),\n'''
signature_replacement = '''        Math.round(snapshot.financialRunway || 0),\n        Math.round(snapshot.requiredRunway || 0),\n        Math.round(snapshot.scoreRoom || 0),\n        Math.round(snapshot.plannedAssumedSinceLock || 0),\n        Math.round(snapshot.moneyLentUnavailable || 0),\n'''
if signature_anchor not in source:
    raise SystemExit("Could not find Means render signature anchor.")
source = source.replace(signature_anchor, signature_replacement, 1)

TARGET.write_text(source)
print("Installed locked pay-cycle Means baseline.")
