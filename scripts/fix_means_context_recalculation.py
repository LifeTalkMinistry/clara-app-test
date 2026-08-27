from pathlib import Path

TARGET = Path("src/runtime/installClaraOrbGreeting.js")
source = TARGET.read_text()

V1 = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v1";'
V2 = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v2";'

if V2 in source and "buildMeansPlanFingerprint" in source:
    print("Means context recalculation lifecycle already installed.")
    raise SystemExit(0)

if V1 not in source:
    raise SystemExit("Could not find v1 Means baseline marker; refusing unsafe patch.")
source = source.replace(V1, V2, 1)

helper_anchor = '''function meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd) {\n'''
if helper_anchor not in source:
    raise SystemExit("Could not find Means baseline storage helper anchor.")

helpers = r'''function canonicalMeansPlanValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalMeansPlanValue).sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalMeansPlanValue(value[key]);
        return result;
      }, {});
  }
  return value ?? null;
}

function buildMeansPlanFingerprint({
  owner,
  cycleStart,
  cycleEnd,
  savingsGoals,
  debtObligations,
}) {
  const routine = readClaraMoneyRoutine(owner);
  const routinePlan = routine && routine.active !== false
    ? {
        active: true,
        days: (Array.isArray(routine.days) ? routine.days : []).map((day) => ({
          weekdayIndex: Number(day?.weekdayIndex ?? day?.weekday_index),
          totalCentavos: Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)),
        })),
      }
    : { active: false, days: [] };

  const schedulePlan = parseScheduleEvents(owner)
    .filter((event) => {
      const date = String(event?.date || "").slice(0, 10);
      const direction = String(event?.direction || "out").trim().toLowerCase();
      const source = normalizeLower(event?.source);
      const savingsProjection =
        source === SAVINGS_GOAL_SCHEDULE_SOURCE || event?.savingsGoalId || event?.savings_goal_id;
      const debtProjection =
        source === DEBT_OBLIGATION_SCHEDULE_SOURCE ||
        event?.debtObligationId ||
        event?.debt_obligation_id;
      return (
        date &&
        date >= cycleStart &&
        date < cycleEnd &&
        direction === "out" &&
        event?.affectsMoney !== false &&
        !savingsProjection &&
        !debtProjection
      );
    })
    .map((event) => ({
      id: String(event?.id || event?.eventId || event?.event_id || ""),
      date: String(event?.date || "").slice(0, 10),
      amount: Math.max(0, Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, "")) || 0),
      direction: String(event?.direction || "out").trim().toLowerCase(),
    }));

  const savingsPlan = (Array.isArray(savingsGoals) ? savingsGoals : [])
    .filter((goal) => isSavingsGoalActive(goal))
    .map((goal) => ({
      id: String(goal?.id || goal?.goal_id || goal?.goalId || ""),
      date: savingsGoalDate(goal),
      target: savingsGoalMoney(
        goal?.target_amount,
        goal?.targetAmount,
        goal?.goal_amount,
        goal?.goalAmount,
        goal?.target,
        goal?.amount
      ),
    }));

  const debtPlan = (Array.isArray(debtObligations) ? debtObligations : []).map((record) => ({
    id: String(record?.id || record?.debt_id || record?.debtId || ""),
    monthlyPayment: Math.max(0, Number(getMonthlyDebtPayment(record) || 0)),
    dueDate: String(
      record?.dueDate ||
        record?.due_date ||
        record?.nextDueDate ||
        record?.next_due_date ||
        record?.paymentDate ||
        record?.payment_date ||
        ""
    ).slice(0, 10),
    dueDay: Number(record?.dueDay ?? record?.due_day ?? record?.paymentDay ?? record?.payment_day ?? 0),
    recurrence: record?.recurrence || record?.paymentRecurrence || record?.payment_recurrence || null,
    startDate: String(record?.startDate || record?.start_date || "").slice(0, 10),
    endDate: String(record?.endDate || record?.end_date || "").slice(0, 10),
  }));

  return JSON.stringify(
    canonicalMeansPlanValue({
      cycleStart,
      cycleEnd,
      routinePlan,
      schedulePlan,
      savingsPlan,
      debtPlan,
    })
  );
}

'''
source = source.replace(helper_anchor, helpers + helper_anchor, 1)

old_function = r'''function resolveLockedMeansCycleBaseline({
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

new_function = r'''function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  upcoming,
  assumedSpent,
  debtObligations,
  planFingerprint,
}) {
  const plannedDebtAlreadyPaid = plannedDebtPaidInsideCycle(
    debtObligations,
    cycleStart,
    cycleEnd
  );

  // Reconstruct the current authoritative requirement while preserving amounts from
  // debt payments CLARA had already planned. A context mutation creates a new lock;
  // simple realization of the same plan keeps the prior lock untouched.
  const reconstructedRequiredRunway = Math.max(
    Number(upcoming || 0) + plannedDebtAlreadyPaid,
    0
  );
  const fallback = {
    requiredRunway: reconstructedRequiredRunway,
    assumedSpentAtLock: Math.max(0, Number(assumedSpent || 0)),
    planFingerprint: String(planFingerprint || ""),
    cycleStart,
    cycleEnd,
  };

  if (typeof window === "undefined" || !window.localStorage) return fallback;

  const key = meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    const validStoredBaseline =
      parsed &&
      parsed.cycleStart === cycleStart &&
      parsed.cycleEnd === cycleEnd &&
      Number.isFinite(Number(parsed.requiredRunway)) &&
      Number(parsed.requiredRunway) >= 0;

    if (validStoredBaseline && String(parsed.planFingerprint || "") === fallback.planFingerprint) {
      return {
        requiredRunway: Math.max(0, Number(parsed.requiredRunway)),
        assumedSpentAtLock: Math.max(0, Number(parsed.assumedSpentAtLock || 0)),
        planFingerprint: fallback.planFingerprint,
        cycleStart,
        cycleEnd,
      };
    }
  } catch {
    // Replace malformed or pre-v2 local state with the current authoritative plan.
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

if old_function not in source:
    raise SystemExit("Could not find current v1 Means baseline function; refusing unsafe patch.")
source = source.replace(old_function, new_function, 1)

resolver_anchor = '''  const cycleBaseline = resolveLockedMeansCycleBaseline({\n    owner,\n    cycleStart: cycleStartDate,\n    cycleEnd: cycleEndDate,\n    upcoming,\n    assumedSpent,\n    debtObligations,\n  });\n'''
resolver_replacement = '''  const planFingerprint = buildMeansPlanFingerprint({\n    owner,\n    cycleStart: cycleStartDate,\n    cycleEnd: cycleEndDate,\n    savingsGoals,\n    debtObligations,\n  });\n  const cycleBaseline = resolveLockedMeansCycleBaseline({\n    owner,\n    cycleStart: cycleStartDate,\n    cycleEnd: cycleEndDate,\n    upcoming,\n    assumedSpent,\n    debtObligations,\n    planFingerprint,\n  });\n'''
if resolver_anchor not in source:
    raise SystemExit("Could not find Means baseline callsite; refusing unsafe patch.")
source = source.replace(resolver_anchor, resolver_replacement, 1)

TARGET.write_text(source)
print("Installed Means context-aware pay-cycle baseline v2.")
