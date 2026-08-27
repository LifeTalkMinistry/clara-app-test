from pathlib import Path

RUNTIME = Path("src/runtime/installClaraOrbGreeting.js")
MONEY_REPOSITORY = Path("src/lib/clara-money-schedule-repository.js")
SCHEDULE_PANEL = Path("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx")
PACKAGE = Path("package.json")
V2_MARKER = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v2";'

def replace_once(source, old, new, label):
    if old not in source:
        raise SystemExit(f"Could not find {label}; refusing unsafe patch.")
    return source.replace(old, new, 1)

runtime = RUNTIME.read_text()
if V2_MARKER not in runtime:
    runtime = replace_once(
        runtime,
        'import { isDebtOccurrencePaid } from "@/lib/debtOccurrenceState";\n',
        'import { isDebtOccurrencePaid } from "@/lib/debtOccurrenceState";\nimport {\n  calculateMeansScoreState,\n  resolveMeansCycleBaselineState,\n  stableMeansPlanFingerprint,\n} from "@/lib/clara-means-cycle-baseline";\n',
        'Means baseline helper import anchor',
    )

    runtime = replace_once(
        runtime,
        'import {\n  CLARA_MONEY_ROUTINE_UPDATED_EVENT,\n  getClaraMoneyScheduleStorageKey,\n  readClaraMoneyRoutine,\n} from "@/lib/clara-money-schedule-repository";',
        'import {\n  CLARA_MONEY_ROUTINE_UPDATED_EVENT,\n  CLARA_MONEY_SCHEDULE_UPDATED_EVENT,\n  getClaraMoneyScheduleStorageKey,\n  readClaraMoneyRoutine,\n} from "@/lib/clara-money-schedule-repository";',
        'Money Schedule import block',
    )

    runtime = replace_once(
        runtime,
        'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v1";',
        V2_MARKER,
        'Means baseline storage prefix',
    )

    fingerprint_helpers = r'''function isInactiveSavingsPlanGoal(goal = {}) {
  const status = normalizeLower(goal?.completion_status ?? goal?.completionStatus ?? goal?.status);
  return Boolean(
    goal?.deletedAt ||
      goal?.deleted_at ||
      goal?.archived === true ||
      goal?.is_archived === true ||
      goal?.isArchived === true ||
      goal?.cancelled === true ||
      goal?.canceled === true ||
      ["deleted", "archived", "cancelled", "canceled"].includes(status)
  );
}

function buildMeansPlanFingerprint({
  owner,
  cycleStart,
  cycleEnd,
  debtObligations = [],
  savingsGoals = [],
} = {}) {
  const routine = readClaraMoneyRoutine(owner);
  const routinePlan =
    routine && routine.active !== false && Array.isArray(routine.days)
      ? routine.days
          .map((day) => ({
            weekdayIndex: Number(day?.weekdayIndex ?? day?.weekday_index),
            totalCentavos: Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)),
          }))
          .filter((day) => Number.isInteger(day.weekdayIndex) && day.totalCentavos > 0)
          .sort((a, b) => a.weekdayIndex - b.weekdayIndex)
      : [];

  const schedulePlan = parseScheduleEvents(owner)
    .map((event) => {
      const date = String(event?.date || "").slice(0, 10);
      const direction = String(event?.direction || "out").trim().toLowerCase();
      const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
      const source = normalizeLower(event?.source);
      const savingsGoalProjection =
        source === SAVINGS_GOAL_SCHEDULE_SOURCE || event?.savingsGoalId || event?.savings_goal_id;
      const debtProjection =
        source === DEBT_OBLIGATION_SCHEDULE_SOURCE || event?.debtObligationId || event?.debt_obligation_id;
      if (!date || date < cycleStart || date >= cycleEnd) return null;
      if (
        direction !== "out" ||
        event?.affectsMoney === false ||
        savingsGoalProjection ||
        debtProjection ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return null;
      }
      return {
        id: String(event?.id || "").trim(),
        date,
        amount: Math.max(0, amount),
      };
    })
    .filter(Boolean)
    .sort((a, b) => `${a.date}:${a.id}:${a.amount}`.localeCompare(`${b.date}:${b.id}:${b.amount}`));

  const debtPlan = buildDebtObligationScheduleProjection(debtObligations)
    .map((event) => {
      const date = String(event?.date || "").slice(0, 10);
      const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
      if (!date || date < cycleStart || date >= cycleEnd || !Number.isFinite(amount) || amount <= 0) {
        return null;
      }
      return {
        debtId: String(event?.debtObligationId || event?.debt_obligation_id || "").trim(),
        date,
        amount: Math.max(0, amount),
      };
    })
    .filter(Boolean)
    .sort((a, b) => `${a.date}:${a.debtId}:${a.amount}`.localeCompare(`${b.date}:${b.debtId}:${b.amount}`));

  // Saved/progress/completion fields are intentionally excluded. Funding or using an
  // already-known goal is realization, while target/date/delete edits are plan changes.
  const savingsPlan = (Array.isArray(savingsGoals) ? savingsGoals : [])
    .filter((goal) => !isInactiveSavingsPlanGoal(goal))
    .map((goal) => ({
      id: String(goal?.id || goal?.goal_id || goal?.goalId || "").trim(),
      date: savingsGoalDate(goal),
      target: savingsGoalMoney(
        goal?.target_amount,
        goal?.targetAmount,
        goal?.goal_amount,
        goal?.goalAmount,
        goal?.target,
        goal?.amount
      ),
    }))
    .filter((goal) => goal.id && goal.date && goal.date < cycleEnd && goal.target > 0)
    .sort((a, b) => `${a.date}:${a.id}:${a.target}`.localeCompare(`${b.date}:${b.id}:${b.target}`));

  return stableMeansPlanFingerprint({
    cycleStart,
    cycleEnd,
    routine: routinePlan,
    schedule: schedulePlan,
    debt: debtPlan,
    savings: savingsPlan,
  });
}

'''
    anchor = 'function meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd) {'
    if anchor not in runtime:
        raise SystemExit('Could not find Means baseline key helper anchor.')
    runtime = runtime.replace(anchor, fingerprint_helpers + anchor, 1)

    start = runtime.find('function resolveLockedMeansCycleBaseline({')
    end = runtime.find('\nfunction realizedBuyCheckMeansOffset', start)
    if start < 0 or end < 0:
        raise SystemExit('Could not isolate locked Means baseline resolver.')
    resolver = r'''function resolveLockedMeansCycleBaseline({
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

  // Reconstruct already-realized planned debt so fulfillment cannot shrink the
  // authoritative requirement. New plan information is handled by the fingerprint.
  const reconstructedRequiredRunway = Math.max(
    Number(upcoming || 0) + plannedDebtAlreadyPaid,
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
    runtime = runtime[:start] + resolver + runtime[end:]

    upcoming_anchor = '  const upcoming = debtUpcoming + savingsGoalUpcoming + moneyScheduleUpcoming + otherScheduledUpcoming;\n\n'
    plan_block = '''  const upcoming = debtUpcoming + savingsGoalUpcoming + moneyScheduleUpcoming + otherScheduledUpcoming;\n  const planFingerprint = buildMeansPlanFingerprint({\n    owner,\n    cycleStart: cycleStartDate,\n    cycleEnd: cycleEndDate,\n    debtObligations,\n    savingsGoals,\n  });\n\n'''
    runtime = replace_once(runtime, upcoming_anchor, plan_block, 'Means upcoming aggregate')

    runtime = replace_once(
        runtime,
        '    assumedSpent,\n    debtObligations,\n  });',
        '    assumedSpent,\n    debtObligations,\n    planFingerprint,\n  });',
        'Means baseline invocation',
    )

    score_start = runtime.find('  const requiredRunway = Math.max(0, Number(cycleBaseline.requiredRunway || 0));')
    score_end = runtime.find('\n\n  return {', score_start)
    if score_start < 0 or score_end < 0:
        raise SystemExit('Could not isolate Means score calculation block.')
    score_block = '''  const requiredRunway = Math.max(0, Number(cycleBaseline.requiredRunway || 0));\n  const { score, scoreRoom, plannedAssumedSinceLock } = calculateMeansScoreState({\n    financialRunway,\n    upcoming,\n    requiredRunway,\n    assumedSpent,\n    assumedSpentAtLock: cycleBaseline.assumedSpentAtLock,\n    realizedPlannedOffset: realizedPlannedBuyCheckOffset,\n  });'''
    runtime = runtime[:score_start] + score_block + runtime[score_end:]

    runtime = replace_once(
        runtime,
        '    requiredRunway,\n    scoreRoom,',
        '    requiredRunway,\n    planFingerprint,\n    scoreRoom,',
        'Means snapshot baseline fields',
    )

    runtime = replace_once(
        runtime,
        '  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);',
        '  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n  window.addEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);\n  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);',
        'Means refresh listener block',
    )
    runtime = replace_once(
        runtime,
        '      window.removeEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n      window.removeEventListener("clara:schedule:create-event", handleFinanceRefresh);',
        '      window.removeEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n      window.removeEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);\n      window.removeEventListener("clara:schedule:create-event", handleFinanceRefresh);',
        'Means refresh listener cleanup block',
    )

RUNTIME.write_text(runtime)

money_repository = MONEY_REPOSITORY.read_text()
if 'export const CLARA_MONEY_SCHEDULE_UPDATED_EVENT = "clara:money-schedule-updated";' not in money_repository:
    money_repository = replace_once(
        money_repository,
        'export const CLARA_SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";\nexport const CLARA_MONEY_SCHEDULE_SOURCE = "orb-money-schedule";',
        'export const CLARA_SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";\nexport const CLARA_MONEY_SCHEDULE_UPDATED_EVENT = "clara:money-schedule-updated";\nexport const CLARA_MONEY_SCHEDULE_SOURCE = "orb-money-schedule";',
        'Money Schedule event constant anchor',
    )
    money_repository = replace_once(
        money_repository,
        '''  if (!currentEvents.some((item) => String(item?.id) === String(event.id))) {\n    window.localStorage.setItem(storageKey, JSON.stringify([...currentEvents, event]));\n  }\n\n  // If the Calendar is already mounted elsewhere, hand it the same event so its\n''',
        '''  if (!currentEvents.some((item) => String(item?.id) === String(event.id))) {\n    window.localStorage.setItem(storageKey, JSON.stringify([...currentEvents, event]));\n    window.dispatchEvent(\n      new CustomEvent(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, {\n        detail: { ownerId: getRecurringCashFlowOwnerId(user), reason: "append", eventId: event.id },\n      })\n    );\n  }\n\n  // If the Calendar is already mounted elsewhere, hand it the same event so its\n''',
        'Money Schedule append persistence block',
    )
MONEY_REPOSITORY.write_text(money_repository)

schedule_panel = SCHEDULE_PANEL.read_text()
if 'CLARA_MONEY_SCHEDULE_UPDATED_EVENT' not in schedule_panel:
    import_anchor = 'import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";\n'
    schedule_panel = replace_once(
        schedule_panel,
        import_anchor,
        import_anchor + 'import { CLARA_MONEY_SCHEDULE_UPDATED_EVENT } from "@/lib/clara-money-schedule-repository";\n',
        'Schedule panel Money Schedule event import anchor',
    )
    schedule_panel = replace_once(
        schedule_panel,
        '''    window.localStorage.setItem(\n      getStorageKey(user),\n      JSON.stringify(persistedEvents)\n    );\n''',
        '''    window.localStorage.setItem(\n      getStorageKey(user),\n      JSON.stringify(persistedEvents)\n    );\n    window.dispatchEvent(\n      new CustomEvent(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, {\n        detail: { ownerId: getRecurringCashFlowOwnerId(user), reason: "persist" },\n      })\n    );\n''',
        'Schedule panel persistence block',
    )
SCHEDULE_PANEL.write_text(schedule_panel)

package = PACKAGE.read_text()
test_token = 'tests/wallet-money-semantics.test.mjs'
new_test_token = 'tests/means-score-context-baseline-regression.test.mjs'
if new_test_token not in package:
    package = replace_once(
        package,
        test_token,
        f'{test_token} {new_test_token}',
        'package test script insertion point',
    )
PACKAGE.write_text(package)

print('Installed plan-aware Means baseline v2 and canonical Money Schedule refresh event.')
