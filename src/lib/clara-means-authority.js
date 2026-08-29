import {
  getExpenses,
  getTransfers,
  getWallets,
  getWalletTransactions,
} from "@/lib/financeRepository";
import { getIncomeSourceActivityLog, getIncomeSources } from "@/lib/incomeHubRepository";
import {
  DEBT_OBLIGATION_STORE,
  getDebtObligations,
  getMonthlyDebtPayment,
} from "@/lib/debtObligationStore";
import {
  DEBT_OBLIGATION_RECORD_KIND,
  getDebtDueDay,
  getDebtObligationMode,
  isActiveDebtObligation,
} from "@/lib/debtObligationMath";
import { getLocalRecords } from "@/lib/localFinanceStore";
import { getRecurrenceOccurrences } from "@/lib/recurringCashFlowRepository";
import {
  CLARA_MONEY_SCHEDULE_SOURCE,
  getClaraMoneyScheduleStorageKey,
  readClaraMoneyRoutine,
} from "@/lib/clara-money-schedule-repository";
import {
  addFinancialDays,
  enumerateFinancialDates,
  financialDateKey,
  financialWeekdayIndex,
  normalizeFinancialDateKey,
} from "@/lib/clara-financial-day";
import {
  calculateMeansScoreState,
  meansCrossCheckAnchorStorageKey,
  meansCycleBaselineStorageKey,
  parseMeansBaseline,
  resolveAdaptiveMeansBaselineState,
} from "@/lib/clara-means-cycle-baseline";
import { getWalletBalance } from "@/utils/financialEngine";

const INCOME_HUB_CASH_IN_TYPE = "add_money";
const EPSILON = 0.000001;

const clean = (value) => String(value ?? "").trim();
const lower = (value) => clean(value).toLowerCase();
const nonNegative = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};
const signed = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function ownerIdentity(profile = {}) {
  return clean(
    profile?.id ||
      profile?.user_id ||
      profile?.userId ||
      profile?.email ||
      profile?.user?.id ||
      profile?.user?.email ||
      "local-user"
  ) || "local-user";
}

function isDeletedFinanceRecord(record = {}) {
  return Boolean(record?.deletedAt || record?.deleted_at);
}

export function isMeansNeutralMoneyLentWallet(wallet = {}) {
  const type = lower(wallet?.type || wallet?.wallet_type || wallet?.walletType);
  return ["money_lent", "money-lent", "lent", "receivable"].includes(type);
}

export function calculateMeansAvailableWalletMoney(
  wallets = [],
  walletTransactions = [],
  transfers = []
) {
  const safeTransactions = (Array.isArray(walletTransactions) ? walletTransactions : []).filter(
    (record) => !isDeletedFinanceRecord(record)
  );
  const safeTransfers = (Array.isArray(transfers) ? transfers : []).filter(
    (record) => !isDeletedFinanceRecord(record)
  );

  return (Array.isArray(wallets) ? wallets : [])
    .filter((wallet) => !isDeletedFinanceRecord(wallet))
    .reduce(
      (sum, wallet) =>
        sum +
        (isMeansNeutralMoneyLentWallet(wallet)
          ? 0
          : getWalletBalance(wallet, safeTransactions, safeTransfers)),
      0
    );
}

function sourceRecurrence(source = {}) {
  return (
    source?.incomeRecurrence ||
    source?.income_recurrence ||
    source?.recurrenceRule ||
    source?.recurrence_rule ||
    null
  );
}

function isTimingCandidate(source = {}) {
  if (lower(source?.stability) !== "stable") return false;
  if (source?.usualIncomeDateEnabled === false || source?.usual_income_date_enabled === false) {
    return false;
  }
  if (source?.useForBudgetTiming === false || source?.use_for_budget_timing === false) return false;
  return Boolean(sourceRecurrence(source) || readExplicitCustomCycle(source));
}

function isExplicitMaster(source = {}) {
  return Boolean(
    source?.isMasterPayCycle === true ||
      source?.is_master_pay_cycle === true ||
      source?.masterPayCycle === true ||
      source?.master_pay_cycle === true ||
      source?.isMaster === true ||
      source?.is_master === true
  );
}

function readExplicitCustomCycle(source = {}) {
  const config =
    source?.customMasterPayCycle ||
    source?.custom_master_pay_cycle ||
    source?.masterPayCycleConfig ||
    source?.master_pay_cycle_config ||
    source?.customCycle ||
    source?.custom_cycle ||
    {};
  const start = normalizeFinancialDateKey(
    source?.customCycleStart ||
      source?.custom_cycle_start ||
      source?.masterCycleStart ||
      source?.master_cycle_start ||
      config?.start ||
      config?.cycleStart ||
      config?.cycle_start
  );
  const end = normalizeFinancialDateKey(
    source?.customCycleEnd ||
      source?.custom_cycle_end ||
      source?.masterCycleEnd ||
      source?.master_cycle_end ||
      config?.end ||
      config?.cycleEnd ||
      config?.cycle_end
  );
  if (!start || !end || start >= end) return null;
  return { start, end };
}

export function resolveMeansMasterPayCycle(incomeSources = [], now = new Date()) {
  const today = financialDateKey(now);
  if (!today) return null;
  const searchStart = addFinancialDays(today, -62);
  const searchEnd = addFinancialDays(today, 62);
  const candidates = (Array.isArray(incomeSources) ? incomeSources : []).filter(isTimingCandidate);
  const explicitMasters = candidates.filter(isExplicitMaster);
  const ordered = explicitMasters.length ? explicitMasters : candidates;
  const cycles = [];

  ordered.forEach((source, index) => {
    const customCycle = readExplicitCustomCycle(source);
    if (customCycle && customCycle.start <= today && today < customCycle.end) {
      cycles.push({
        start: customCycle.start,
        end: customCycle.end,
        sourceId: clean(source?.id),
        explicitMaster: isExplicitMaster(source),
        customCycle: true,
        sourceOrder: index,
      });
      return;
    }

    const recurrence = sourceRecurrence(source);
    if (!recurrence) return;
    const occurrences = getRecurrenceOccurrences(
      recurrence,
      searchStart,
      searchEnd,
      { kind: "income" }
    ).sort();
    const previous = [...occurrences].reverse().find((date) => date <= today) || "";
    const next = occurrences.find((date) => date > today) || "";
    if (!previous || !next) return;
    cycles.push({
      start: previous,
      end: next,
      sourceId: clean(source?.id),
      explicitMaster: isExplicitMaster(source),
      sourceOrder: index,
    });
  });

  if (!cycles.length) return null;
  if (explicitMasters.length) return cycles[0];

  // Backward compatibility until every existing account has an explicit Master Pay Cycle:
  // preserve the established next-payday behavior, but once a master flag exists only it wins.
  return cycles.sort((left, right) =>
    left.end.localeCompare(right.end) || left.sourceOrder - right.sourceOrder
  )[0];
}

function readScheduleEvents(owner) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(getClaraMoneyScheduleStorageKey(owner)) || "[]"
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildRoutineOccurrences(owner, cycleStart, cycleEnd) {
  const routine = readClaraMoneyRoutine(owner);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return [];
  const routineId = clean(routine.id) || "routine";
  const byWeekday = new Map(
    routine.days.map((day) => [
      Number(day?.weekdayIndex ?? day?.weekday_index),
      nonNegative(day?.totalCentavos ?? day?.total_centavos) / 100,
    ])
  );

  return enumerateFinancialDates(cycleStart, cycleEnd)
    .map((date) => ({
      id: `money-routine:${routineId}:${date}`,
      date,
      kind: "money_schedule",
      amount: byWeekday.get(financialWeekdayIndex(date)) || 0,
      source: "money_routine",
    }))
    .filter((entry) => entry.amount > 0);
}

function isDerivedNonMeansScheduleEvent(event = {}) {
  const source = lower(event?.source);
  return Boolean(
    source === "savings_goal_card_projection" ||
      source === "debt_obligation_card_projection" ||
      event?.savingsGoalId ||
      event?.savings_goal_id ||
      event?.debtObligationId ||
      event?.debt_obligation_id
  );
}

function buildOneOffMoneyScheduleOccurrences(owner, cycleStart, cycleEnd) {
  return readScheduleEvents(owner)
    .map((event, index) => {
      const date = normalizeFinancialDateKey(event?.date);
      const direction = lower(event?.direction || "out");
      const source = lower(event?.source);
      const amount = nonNegative(event?.amount);
      const id = clean(event?.id) || `event-${index}`;
      if (!date || date < cycleStart || date >= cycleEnd) return null;
      if (direction !== "out" || event?.affectsMoney === false || amount <= 0) return null;
      if (isDerivedNonMeansScheduleEvent(event)) return null;
      if (source && source !== lower(CLARA_MONEY_SCHEDULE_SOURCE)) return null;
      return {
        id: `money-schedule:${id}:${date}`,
        date,
        kind: "money_schedule",
        amount,
        source: "money_schedule_event",
      };
    })
    .filter(Boolean);
}

export function buildMeansMoneyScheduleOccurrences(owner, cycleStart, cycleEnd) {
  return [
    ...buildRoutineOccurrences(owner, cycleStart, cycleEnd),
    ...buildOneOffMoneyScheduleOccurrences(owner, cycleStart, cycleEnd),
  ];
}

function debtRecordId(record = {}) {
  return clean(record?.id || record?.debt_id || record?.debtId);
}

function readDebtPayments(record = {}) {
  const history = Array.isArray(record?.paymentHistory)
    ? record.paymentHistory
    : Array.isArray(record?.payment_history)
      ? record.payment_history
      : [];
  return history.filter(Boolean);
}

function paymentDueDate(payment = {}) {
  return normalizeFinancialDateKey(payment?.dueDate || payment?.due_date);
}

function paymentActualDate(payment = {}) {
  return financialDateKey(
    payment?.actualPaymentDate ||
      payment?.actual_payment_date ||
      payment?.paymentDate ||
      payment?.payment_date ||
      payment?.paidAt ||
      payment?.paid_at ||
      payment?.createdAt ||
      payment?.created_at
  );
}

function debtOccurrenceDates(record = {}, cycleStart, cycleEnd) {
  const dueDay = Number(getDebtDueDay(record) || 0);
  if (dueDay > 0) {
    return getRecurrenceOccurrences(
      { type: "monthly", startDate: cycleStart, dayOfMonth: dueDay },
      cycleStart,
      addFinancialDays(cycleEnd, -1),
      { kind: "bill" }
    ).filter((date) => date >= cycleStart && date < cycleEnd);
  }
  const oneTime = normalizeFinancialDateKey(record?.dueDate || record?.due_date);
  return oneTime && oneTime >= cycleStart && oneTime < cycleEnd ? [oneTime] : [];
}

function cumulativeActualForOccurrence(record = {}, dueDate = "") {
  return readDebtPayments(record).reduce(
    (sum, payment) => paymentDueDate(payment) === dueDate
      ? sum + nonNegative(payment?.amount)
      : sum,
    0
  );
}

function amountPaidBeforeCycle(record = {}, dueDate = "", cycleStart = "") {
  return readDebtPayments(record).reduce((sum, payment) => {
    if (paymentDueDate(payment) !== dueDate) return sum;
    const actualDate = paymentActualDate(payment);
    if (!actualDate || actualDate >= cycleStart) return sum;
    return sum + nonNegative(payment?.amount);
  }, 0);
}

function shouldIncludeDebtOccurrence(record, dueDate, cycleStart) {
  const planned = nonNegative(getMonthlyDebtPayment(record));
  if (!(planned > 0)) return false;
  const paidBeforeCycle = amountPaidBeforeCycle(record, dueDate, cycleStart);
  if (paidBeforeCycle + EPSILON >= planned) return false;
  if (isActiveDebtObligation(record)) return true;

  // Completed obligations remain visible to the cycle in which their payment happened,
  // so an early/current payment cannot make a represented requirement disappear.
  return readDebtPayments(record).some((payment) => {
    if (paymentDueDate(payment) !== dueDate) return false;
    const actualDate = paymentActualDate(payment);
    return Boolean(actualDate && actualDate >= cycleStart);
  });
}

export function buildMeansDebtOccurrences(records = [], cycleStart, cycleEnd) {
  return (Array.isArray(records) ? records : []).flatMap((record) => {
    const id = debtRecordId(record);
    const planned = nonNegative(getMonthlyDebtPayment(record));
    if (!id || !(planned > 0)) return [];
    return debtOccurrenceDates(record, cycleStart, cycleEnd)
      .filter((dueDate) => shouldIncludeDebtOccurrence(record, dueDate, cycleStart))
      .map((dueDate) => ({
        id: `debt:${id}:${dueDate}`,
        debtId: id,
        date: dueDate,
        kind: "debt",
        amount: planned,
        actualPaid: cumulativeActualForOccurrence(record, dueDate),
        source: "debt_obligation",
      }));
  });
}

export function calculateMeansOutstandingDebtCommitments(
  debtOccurrences = [],
  carriedObligations = 0
) {
  const occurrenceRemaining = (Array.isArray(debtOccurrences) ? debtOccurrences : [])
    .filter((entry) => entry?.kind === "debt")
    .reduce((sum, entry) => {
      const planned = nonNegative(entry?.amount);
      const actualPaid = nonNegative(entry?.actualPaid ?? entry?.actual_paid);
      return sum + Math.max(planned - actualPaid, 0);
    }, 0);
  return occurrenceRemaining + nonNegative(carriedObligations);
}

function currentCycleFutureDebtActual(records = [], cycleStart, cycleEnd) {
  return (Array.isArray(records) ? records : []).reduce((total, record) =>
    total + readDebtPayments(record).reduce((sum, payment) => {
      const actualDate = paymentActualDate(payment);
      const dueDate = paymentDueDate(payment);
      if (!actualDate || !dueDate) return sum;
      if (actualDate < cycleStart || actualDate >= cycleEnd) return sum;
      if (dueDate < cycleEnd) return sum;
      return sum + nonNegative(payment?.amount);
    }, 0), 0);
}

function confirmedCarriedDebt(records = [], cycleStart) {
  return (Array.isArray(records) ? records : []).reduce((total, record) => {
    const source = Array.isArray(record?.carriedOccurrences)
      ? record.carriedOccurrences
      : Array.isArray(record?.carried_occurrences)
        ? record.carried_occurrences
        : [];
    return total + source.reduce((sum, entry) => {
      const targetCycle = normalizeFinancialDateKey(
        entry?.cycleStart || entry?.cycle_start || entry?.carriedIntoCycle || entry?.carried_into_cycle
      );
      const status = lower(entry?.status || entry?.resolution);
      if (targetCycle !== cycleStart || !["confirmed", "still_unpaid", "carried"].includes(status)) {
        return sum;
      }
      return sum + nonNegative(
        entry?.remainingAmount ?? entry?.remaining_amount ?? entry?.amount
      );
    }, 0);
  }, 0);
}

async function readAllDebtRecords(owner) {
  try {
    const records = await getLocalRecords(DEBT_OBLIGATION_STORE, owner);
    return (Array.isArray(records) ? records : []).filter((record) =>
      !record?.deletedAt &&
      !record?.deleted_at &&
      (record?.recordKind === DEBT_OBLIGATION_RECORD_KIND ||
        record?.kind === DEBT_OBLIGATION_RECORD_KIND ||
        record?.recordType === DEBT_OBLIGATION_RECORD_KIND)
    );
  } catch {
    return getDebtObligations(owner).catch(() => []);
  }
}

function readStoredBaseline(owner, cycleStart, cycleEnd) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return parseMeansBaseline(
      window.localStorage.getItem(meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd))
    );
  } catch {
    return null;
  }
}

function persistBaseline(owner, cycleStart, cycleEnd, baseline) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd),
      JSON.stringify(baseline)
    );
  } catch {
    // Means remains usable when browser storage is temporarily unavailable.
  }
}

export function readMeansCrossCheckAnchor(owner) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(meansCrossCheckAnchorStorageKey(owner)) || "null"
    );
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function resetMeansAssumedSpent(owner, { completedAt = new Date() } = {}) {
  const safeOwner = clean(owner) || "local-user";
  const financialDate = financialDateKey(completedAt);
  const anchor = {
    version: 1,
    completedAt: completedAt instanceof Date ? completedAt.toISOString() : new Date(completedAt).toISOString(),
    financialDate,
  };
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(meansCrossCheckAnchorStorageKey(safeOwner), JSON.stringify(anchor));
    } catch {
      // A successful wallet reconciliation remains valid even if this convenience cache is blocked.
    }
    window.dispatchEvent(
      new CustomEvent("clara:means-assumed-spent-reset", {
        detail: { ownerId: safeOwner, financialDate },
      })
    );
  }
  return anchor;
}

function assumedSpentAfterCrossCheck(owner, cycleStart, today, contributions = []) {
  const anchor = readMeansCrossCheckAnchor(owner);
  const anchorDate = normalizeFinancialDateKey(anchor?.financialDate);
  const resetThrough = anchorDate && anchorDate >= cycleStart
    ? anchorDate
    : addFinancialDays(cycleStart, -1);

  return contributions.reduce((sum, entry) => {
    if (entry?.kind !== "money_schedule") return sum;
    const date = normalizeFinancialDateKey(entry?.date);
    if (!date || date <= resetThrough || date > today) return sum;
    return sum + nonNegative(entry?.plannedAmount ?? entry?.amount);
  }, 0);
}

function amountScheduledTodayAfterReset(owner, cycleStart, today, contributions = []) {
  const anchor = readMeansCrossCheckAnchor(owner);
  const anchorDate = normalizeFinancialDateKey(anchor?.financialDate);
  if (anchorDate && anchorDate >= today) return 0;
  return contributions.reduce((sum, entry) =>
    entry?.kind === "money_schedule" && normalizeFinancialDateKey(entry?.date) === today
      ? sum + nonNegative(entry?.plannedAmount ?? entry?.amount)
      : sum,
  0);
}

function activityDate(activity = {}) {
  return financialDateKey(
    activity?.date ||
      activity?.transaction_date ||
      activity?.createdAt ||
      activity?.created_at ||
      activity?.updatedAt ||
      activity?.updated_at
  );
}

function incomeReceivedForDisplay(sources = [], cycleStart, cycleEnd) {
  return (Array.isArray(sources) ? sources : []).reduce((total, source) =>
    total + getIncomeSourceActivityLog(source).reduce((sum, activity) => {
      if (lower(activity?.type) !== INCOME_HUB_CASH_IN_TYPE) return sum;
      const date = activityDate(activity);
      if (!date || date < cycleStart || date >= cycleEnd) return sum;
      return sum + nonNegative(activity?.amount);
    }, 0), 0);
}

function expenseDate(expense = {}) {
  return financialDateKey(
    expense?.date ||
      expense?.transaction_date ||
      expense?.createdAt ||
      expense?.created_at ||
      expense?.updatedAt ||
      expense?.updated_at
  );
}

function actualSpentForDisplay(expenses = [], cycleStart, today) {
  return (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const date = expenseDate(expense);
    if (!date || date < cycleStart || date > today) return sum;
    return sum + Math.abs(signed(expense?.amount));
  }, 0);
}

export async function buildCanonicalMeansSnapshot({ profile = {}, now = new Date() } = {}) {
  const owner = ownerIdentity(profile);
  const [
    incomeSources,
    wallets,
    walletTransactions,
    transfers,
    debtRecords,
    expenses,
  ] = await Promise.all([
    getIncomeSources(owner).catch(() => []),
    getWallets(owner).catch(() => []),
    getWalletTransactions(owner).catch(() => []),
    getTransfers(owner).catch(() => []),
    readAllDebtRecords(owner),
    getExpenses(owner).catch(() => []),
  ]);
  const payCycle = resolveMeansMasterPayCycle(incomeSources, now);
  if (!payCycle) return null;

  const today = financialDateKey(now);
  const cycleStartDate = payCycle.start;
  const cycleEndDate = payCycle.end;
  const moneyScheduleOccurrences = buildMeansMoneyScheduleOccurrences(
    owner,
    cycleStartDate,
    cycleEndDate
  );
  const debtOccurrences = buildMeansDebtOccurrences(
    debtRecords,
    cycleStartDate,
    cycleEndDate
  );
  const occurrences = [...moneyScheduleOccurrences, ...debtOccurrences];
  const extraCurrentCycleActual = currentCycleFutureDebtActual(
    debtRecords,
    cycleStartDate,
    cycleEndDate
  );
  const carriedObligations = confirmedCarriedDebt(debtRecords, cycleStartDate);
  const stored = readStoredBaseline(owner, cycleStartDate, cycleEndDate);
  const baselineState = resolveAdaptiveMeansBaselineState({
    stored,
    cycleStart: cycleStartDate,
    cycleEnd: cycleEndDate,
    today,
    occurrences,
    extraCurrentCycleActual,
    carriedObligations,
  });
  persistBaseline(owner, cycleStartDate, cycleEndDate, baselineState.baseline);

  const availableNow = calculateMeansAvailableWalletMoney(
    wallets,
    walletTransactions,
    transfers
  );
  const assumedSpent = assumedSpentAfterCrossCheck(
    owner,
    cycleStartDate,
    today,
    baselineState.contributions
  );
  const assumedToday = amountScheduledTodayAfterReset(
    owner,
    cycleStartDate,
    today,
    baselineState.contributions
  );
  const effectiveCurrentMoney = availableNow - assumedSpent;
  const scoreState = calculateMeansScoreState({
    effectiveCurrentMoney,
    requiredRunway: baselineState.requiredRunway,
  });

  const futureContributions = baselineState.contributions.filter(
    (entry) => normalizeFinancialDateKey(entry?.date) > today
  );
  const moneyScheduleUpcoming = futureContributions
    .filter((entry) => entry.kind === "money_schedule")
    .reduce((sum, entry) => sum + nonNegative(entry.amount), 0);
  const debtUpcoming = calculateMeansOutstandingDebtCommitments(
    debtOccurrences,
    baselineState.carriedObligations
  );
  const upcoming = moneyScheduleUpcoming + debtUpcoming;
  const income = incomeReceivedForDisplay(incomeSources, cycleStartDate, cycleEndDate);
  const spent = actualSpentForDisplay(expenses, cycleStartDate, today);

  return {
    hasIncomePayCycle: true,
    masterPayCycleSourceId: payCycle.sourceId || null,
    score: scoreState.score,
    income,
    spent,
    assumedSpent,
    assumedToday,
    upcoming,
    savingsGoalUpcoming: 0,
    debtUpcoming,
    moneyScheduleUpcoming,
    otherScheduledUpcoming: 0,
    cycleStartDate,
    cycleEndDate,
    horizonDate: cycleEndDate,
    availableNow,
    effectiveCurrentMoney,
    financialRunway: effectiveCurrentMoney,
    requiredRunway: baselineState.requiredRunway,
    scoreRoom: scoreState.scoreRoom,
    plannedAssumedSinceLock: 0,
    moneyLentUnavailable: 0,
    emergencyProtected: 0,
    savingsProtected: 0,
    otherProtected: 0,
    projectedSpending: baselineState.requiredRunway,
    projectedRoom: scoreState.scoreRoom,
    baselineContributions: baselineState.contributions,
    extraCurrentCycleActual: baselineState.extraCurrentCycleActual,
    carriedObligations: baselineState.carriedObligations,
  };
}
