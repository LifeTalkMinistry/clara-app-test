from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "src/runtime/installClaraOrbGreeting.js"
DEBT_STORE = ROOT / "src/lib/debtObligationStore.js"

runtime = RUNTIME.read_text(encoding="utf-8")
debt_store = DEBT_STORE.read_text(encoding="utf-8")

# Preserve completed/paid debt records for the cycle plan without changing the active-debt UI API.
old_debt_reader = '''export async function getDebtObligations(localUserId) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const records = await getLocalRecords(DEBT_OBLIGATION_STORE, safeLocalUserId);
  return sortByNewest(
    (records || []).map(normalizeDebtRecord).filter(isActiveDebtObligation)
  );
}
'''
new_debt_reader = '''export async function getDebtObligationPlanRecords(localUserId) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const records = await getLocalRecords(DEBT_OBLIGATION_STORE, safeLocalUserId);
  return sortByNewest(
    (records || [])
      .map(normalizeDebtRecord)
      .filter((record) => {
        const status = String(record?.status || "").trim().toLowerCase();
        const deletedAt = record?.deletedAt || record?.deleted_at;
        return (
          !deletedAt &&
          !["deleted", "archived", "cancelled", "canceled"].includes(status)
        );
      })
  );
}

export async function getDebtObligations(localUserId) {
  const records = await getDebtObligationPlanRecords(localUserId);
  return records.filter(isActiveDebtObligation);
}
'''
if old_debt_reader in debt_store:
    debt_store = debt_store.replace(old_debt_reader, new_debt_reader, 1)
elif "export async function getDebtObligationPlanRecords" not in debt_store:
    raise SystemExit("Debt store reader shape changed; refusing unsafe Means patch")
DEBT_STORE.write_text(debt_store, encoding="utf-8")

# Use the v6 cycle anchor storage namespace so malformed v5 values cannot survive this repair.
runtime = runtime.replace(
    'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v5";',
    'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v6";',
    1,
)

old_debt_import = '''  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtObligations,
  getMonthlyDebtPayment,
} from "@/lib/debtObligationStore";'''
new_debt_import = '''  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtObligationPlanRecords,
  getDebtObligations,
  getMonthlyDebtPayment,
} from "@/lib/debtObligationStore";'''
if old_debt_import in runtime:
    runtime = runtime.replace(old_debt_import, new_debt_import, 1)
elif "getDebtObligationPlanRecords" not in runtime:
    raise SystemExit("Means debt import shape changed")

# futureRoutineAmount already starts tomorrow. Replace only the computation line so harmless
# explanatory comments around this code cannot make the patch brittle.
old_money_schedule_line = "  const moneyScheduleUpcoming = Math.max(0, rawMoneyScheduleUpcoming - assumedToday);"
new_money_schedule_line = "  const moneyScheduleUpcoming = rawMoneyScheduleUpcoming;"
if old_money_schedule_line in runtime:
    runtime = runtime.replace(old_money_schedule_line, new_money_schedule_line, 1)
elif new_money_schedule_line not in runtime:
    raise SystemExit("Money Schedule upcoming computation changed")

# Full-cycle plan helpers are deliberately date-stable: elapsed days and paid occurrences remain
# part of the cycle's original measuring stick.
helper_anchor = '''function futureScheduledAmount(user, cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey()) {'''
helpers = r'''function fullCycleRoutineAmount(user, cycleStart, cycleEnd) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;
  const startMatch = String(cycleStart || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const endMatch = String(cycleEnd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!startMatch || !endMatch) return 0;

  const byWeekday = new Map(
    routine.days.map((day) => [
      Number(day?.weekdayIndex ?? day?.weekday_index),
      Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100,
    ])
  );
  const cursor = new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3]));
  const end = new Date(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3]));
  let total = 0;
  while (cursor < end) {
    total += byWeekday.get(cursor.getDay()) || 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

function fullCycleScheduledAmount(user, cycleStart, cycleEnd) {
  return parseScheduleEvents(user).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
    const source = normalizeLower(event?.source);
    const savingsProjection =
      source === SAVINGS_GOAL_SCHEDULE_SOURCE || event?.savingsGoalId || event?.savings_goal_id;
    const debtProjection =
      source === DEBT_OBLIGATION_SCHEDULE_SOURCE ||
      event?.debtObligationId ||
      event?.debt_obligation_id;
    if (!date || date < cycleStart || date >= cycleEnd) return sum;
    if (direction !== "out" || event?.affectsMoney === false || savingsProjection || debtProjection) {
      return sum;
    }
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}

function buildMeansDebtPlanEntries(records = [], cycleStart = "", cycleEnd = "") {
  const source = Array.isArray(records) ? records : [];
  const projected = buildDebtObligationScheduleProjection(source)
    .filter((event) => {
      const date = String(event?.date || "").slice(0, 10);
      return date && date >= cycleStart && date < cycleEnd;
    })
    .map((event) => ({
      debtId: String(event?.debtObligationId || event?.debt_obligation_id || ""),
      date: String(event?.date || "").slice(0, 10),
      amount: Math.max(0, Number(event?.amount || 0)),
    }));

  const projectedKeys = new Set(projected.map((entry) => `${entry.debtId}:${entry.date}`));
  const completed = source.flatMap((record) => {
    const status = String(record?.status || "").trim().toLowerCase();
    if (status !== "completed") return [];
    const debtId = String(record?.id || record?.debt_id || record?.debtId || "").trim();
    const date = String(
      record?.lastPaidOccurrenceDate || record?.last_paid_occurrence_date || record?.dueDate || record?.due_date || ""
    ).slice(0, 10);
    if (!debtId || !date || date < cycleStart || date >= cycleEnd) return [];
    const key = `${debtId}:${date}`;
    if (projectedKeys.has(key)) return [];
    return [{ debtId, date, amount: Math.max(0, Number(getMonthlyDebtPayment(record) || 0)) }];
  });

  return [...projected, ...completed].sort((a, b) =>
    `${a.date}:${a.debtId}:${a.amount}`.localeCompare(`${b.date}:${b.debtId}:${b.amount}`)
  );
}

function fullCycleDebtObligationAmount(records = [], cycleStart = "", cycleEnd = "") {
  return buildMeansDebtPlanEntries(records, cycleStart, cycleEnd).reduce(
    (sum, entry) => sum + Math.max(0, Number(entry.amount || 0)),
    0
  );
}

function fullCycleSavingsGoalAmount(goals = [], cycleStart = "", cycleEnd = "") {
  return (Array.isArray(goals) ? goals : []).reduce((sum, goal) => {
    if (isInactiveSavingsPlanGoal(goal)) return sum;
    const date = savingsGoalDate(goal);
    if (!date || date < cycleStart || date >= cycleEnd) return sum;
    const target = savingsGoalMoney(
      goal?.target_amount,
      goal?.targetAmount,
      goal?.goal_amount,
      goal?.goalAmount,
      goal?.target,
      goal?.amount
    );
    const saved = savingsGoalMoney(
      goal?.saved_amount,
      goal?.savedAmount,
      goal?.current_amount,
      goal?.currentAmount,
      goal?.saved,
      goal?.progress_amount,
      goal?.progressAmount,
      goal?.amount_saved
    );
    return sum + Math.max(target - saved, 0);
  }, 0);
}

'''
if "function fullCycleRoutineAmount" not in runtime:
    if helper_anchor not in runtime:
        raise SystemExit("Could not find full-cycle helper insertion point")
    runtime = runtime.replace(helper_anchor, helpers + helper_anchor, 1)

# Plan fingerprints must survive realization. A final debt payment changes status to completed,
# but it does not remove that planned occurrence from the cycle fingerprint.
old_fp_signature = '''function buildMeansPlanFingerprint({
  owner,
  cycleStart,
  cycleEnd,
  debtObligations = [],
  savingsGoals = [],
} = {}) {'''
new_fp_signature = '''function buildMeansPlanFingerprint({
  owner,
  cycleStart,
  cycleEnd,
  debtPlanRecords = [],
  savingsGoals = [],
} = {}) {'''
if old_fp_signature in runtime:
    runtime = runtime.replace(old_fp_signature, new_fp_signature, 1)
elif new_fp_signature not in runtime:
    raise SystemExit("Means plan fingerprint signature changed")

start = runtime.find("  const debtPlan = buildDebtObligationScheduleProjection(debtObligations)")
if start != -1:
    end = runtime.find("\n\n  const savingsPlan", start)
    if end == -1:
        raise SystemExit("Means debt plan fingerprint end not found")
    runtime = runtime[:start] + '''  const debtPlan = buildMeansDebtPlanEntries(debtPlanRecords, cycleStart, cycleEnd);''' + runtime[end:]
elif "const debtPlan = buildMeansDebtPlanEntries(debtPlanRecords" not in runtime:
    raise SystemExit("Means debt fingerprint shape changed")

# Fetch the all-status debt plan records alongside the active records used by Upcoming.
old_promise = '''  const [expenses, incomeSources, savingsGoals, debtObligations, wallets, emergencyFund] = await Promise.all([
    getExpenses(owner),
    getIncomeSources(owner),
    getSavingsGoals(owner),
    getDebtObligations(owner),
    getWallets(owner),
    getEmergencyFund(owner),
  ]);'''
new_promise = '''  const [
    expenses,
    incomeSources,
    savingsGoals,
    debtObligations,
    debtPlanRecords,
    wallets,
    emergencyFund,
  ] = await Promise.all([
    getExpenses(owner),
    getIncomeSources(owner),
    getSavingsGoals(owner),
    getDebtObligations(owner),
    getDebtObligationPlanRecords(owner),
    getWallets(owner),
    getEmergencyFund(owner),
  ]);'''
if old_promise in runtime:
    runtime = runtime.replace(old_promise, new_promise, 1)
elif "getDebtObligationPlanRecords(owner)" not in runtime:
    raise SystemExit("Means financial Promise shape changed")

runtime = runtime.replace(
    '''    debtObligations,
    savingsGoals,
  });''',
    '''    debtPlanRecords,
    savingsGoals,
  });''',
    1,
)

# The denominator is now the COMPLETE cycle plan, not today's remaining commitments.
old_planned = '''  const plannedRequiredRunway = calculateCycleRequiredRunway({ upcoming });'''
new_planned = '''  const fullCycleRoutinePlanned = fullCycleRoutineAmount(owner, cycleStartDate, cycleEndDate);
  const fullCycleScheduledPlanned = fullCycleScheduledAmount(owner, cycleStartDate, cycleEndDate);
  const fullCycleDebtPlanned = fullCycleDebtObligationAmount(
    debtPlanRecords,
    cycleStartDate,
    cycleEndDate
  );
  const fullCycleSavingsPlanned = fullCycleSavingsGoalAmount(
    savingsGoals,
    cycleStartDate,
    cycleEndDate
  );
  const fullCyclePlannedRequirement =
    fullCycleRoutinePlanned +
    fullCycleScheduledPlanned +
    fullCycleDebtPlanned +
    fullCycleSavingsPlanned;
  const plannedRequiredRunway = calculateCycleRequiredRunway({
    upcoming: fullCyclePlannedRequirement,
  });'''
if old_planned in runtime:
    runtime = runtime.replace(old_planned, new_planned, 1)
elif "const fullCyclePlannedRequirement" not in runtime:
    raise SystemExit("Means planned runway callsite changed")

RUNTIME.write_text(runtime, encoding="utf-8")
print("Installed Means full-cycle plan-delta anchor v7.")
