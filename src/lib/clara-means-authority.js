import {
  getEmergencyFund,
  getExpenses,
  getSavingsGoals,
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
  resolveAdaptiveMeansBaselineState,
} from "@/lib/clara-means-cycle-baseline";
import {
  readMeansCycleBaseline,
  persistMeansCycleBaseline,
} from "@/lib/clara-means-baseline-repository";
import {
  getWalletProtectedAmounts,
  isActiveWalletForMoneySemantics,
  isMoneyLentWallet,
} from "@/lib/clara-wallet-money-semantics";
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
  return isMoneyLentWallet(wallet);
}

function resolvedWalletRows(wallets = [], walletTransactions = [], transfers = []) {
  const safeTransactions = (Array.isArray(walletTransactions) ? walletTransactions : []).filter(
    (record) => !isDeletedFinanceRecord(record)
  );
  const safeTransfers = (Array.isArray(transfers) ? transfers : []).filter(
    (record) => !isDeletedFinanceRecord(record)
  );

  return (Array.isArray(wallets) ? wallets : [])
    .filter((wallet) => !isDeletedFinanceRecord(wallet))
    .map((wallet) => {
      const resolvedBalance = getWalletBalance(wallet, safeTransactions, safeTransfers);
      return {
        ...wallet,
        balance: resolvedBalance,
        currentBalance: resolvedBalance,
        current_balance: resolvedBalance,
        wallet_balance: resolvedBalance,
        available_balance: resolvedBalance,
      };
    });
}

export function calculateMeansAvailableWalletState(
  wallets = [],
  walletTransactions = [],
  transfers = [],
  { emergencyFund = null, savingsGoals = [] } = {}
) {
  const rows = resolvedWalletRows(wallets, walletTransactions, transfers);

  return rows.reduce(
    (totals, wallet) => {
      const balance = signed(wallet?.currentBalance ?? wallet?.balance);

      if (wallet?.isEmergencyReserveWallet || wallet?.protected_reserve) {
        return {
          ...totals,
          emergencyProtected: totals.emergencyProtected + Math.max(balance, 0),
        };
      }

      if (!isActiveWalletForMoneySemantics(wallet)) return totals;

      if (isMoneyLentWallet(wallet)) {
        return {
          ...totals,
          moneyLentUnavailable: totals.moneyLentUnavailable + Math.max(balance, 0),
        };
      }

      const protectedAmounts = getWalletProtectedAmounts({
        wallet,
        emergencyFund,
        savingsGoals,
        wallets: rows,
      });
      const availableContribution = balance - nonNegative(protectedAmounts.totalProtectedAmount);

      return {
        availableNow: totals.availableNow + availableContribution,
        grossWalletMoney: totals.grossWalletMoney + balance,
        moneyLentUnavailable: totals.moneyLentUnavailable,
        emergencyProtected:
          totals.emergencyProtected + nonNegative(protectedAmounts.emergencyProtectedAmount),
        savingsProtected:
          totals.savingsProtected + nonNegative(protectedAmounts.savingsProtectedAmount),
        otherProtected:
          totals.otherProtected + nonNegative(protectedAmounts.otherProtectedAmount),
      };
    },
    {
      availableNow: 0,
      grossWalletMoney: 0,
      moneyLentUnavailable: 0,
      emergencyProtected: 0,
      savingsProtected: 0,
      otherProtected: 0,
    }
  );
}

export function calculateMeansAvailableWalletMoney(
  wallets = [],
  walletTransactions = [],
  transfers = [],
  options = {}
) {
  return calculateMeansAvailableWalletState(
    wallets,
    walletTransactions,
    transfers,
    options
  ).availableNow;
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

function financialDayDistance(start, end) {
  const left = normalizeFinancialDateKey(start);
  const right = normalizeFinancialDateKey(end);
  if (!left || !right) return 0;
  const [ly, lm, ld] = left.split("-").map(Number);
  const [ry, rm, rd] = right.split("-").map(Number);
  return Math.round(
    (Date.UTC(ry, rm - 1, rd) - Date.UTC(ly, lm - 1, ld)) / 86400000
  );
}

function resolveRepeatingCustomCycle(customCycle, today) {
  if (!customCycle) return null;
  const lengthDays = financialDayDistance(customCycle.start, customCycle.end);
  if (!(lengthDays > 0)) return null;
  if (today < customCycle.start) return null;

  const elapsedDays = Math.max(0, financialDayDistance(customCycle.start, today));
  const cycleIndex = Math.floor(elapsedDays / lengthDays);
  const start = addFinancialDays(customCycle.start, cycleIndex * lengthDays);
  const end = addFinancialDays(start, lengthDays);
  return start <= today && today < end ? { start, end, lengthDays } : null;
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
    const repeatingCustom = resolveRepeatingCustomCycle(readExplicitCustomCycle(source), today);
    if (repeatingCustom) {
      cycles.push({
        start: repeatingCustom.start,
        end: repeatingCustom.end,
        cycleLengthDays: repeatingCustom.lengthDays,
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

  // Migration compatibility only. Product UI persists an explicit Master for new/edited setups.
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
      requirementKey: `money-routine:${routineId}:${date}`,
      sourceId: routineId,
      date,
      kind: "money_schedule",
      sourceType: "money_schedule",
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
      const requirementKey = `money-schedule:${id}:${date}`;
      return {
        id: requirementKey,
        requirementKey,
        sourceId: id,
        date,
        kind: "money_schedule",
        sourceType: "money_schedule",
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
      .map((dueDate) => {
        const requirementKey = `debt:${id}:${dueDate}`;
        return {
          id: requirementKey,
          requirementKey,
          debtId: id,
          sourceId: id,
          date: dueDate,
          kind: "debt",
          sourceType: "debt",
          amount: planned,
          actualPaid: cumulativeActualForOccurrence(record, dueDate),
          fulfilledBeforeCycle: amountPaidBeforeCycle(record, dueDate, cycleStart),
          source: "debt_obligation",
        };
      });
  });
}

export function calculateMeansOutstandingDebtCommitments(
  debtOccurrences = [],
  _legacyCarriedObligations = 0
) {
  return (Array.isArray(debtOccurrences) ? debtOccurrences : [])
    .filter((entry) => entry?.kind === "debt")
    .reduce((sum, entry) => {
      const planned = nonNegative(entry?.amount);
      const actualPaid = nonNegative(entry?.actualPaid ?? entry?.actual_paid);
      return sum + Math.max(planned - actualPaid, 0);
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

function explicitRequirementKey(record = {}) {
  return clean(
    record?.meansRequirementKey ||
      record?.means_requirement_key ||
      record?.plannedRequirementKey ||
      record?.planned_requirement_key ||
      record?.requirementKey ||
      record?.requirement_key
  );
}

function transactionDate(transaction = {}) {
  return financialDateKey(
    transaction?.transaction_date ||
      transaction?.transactionDate ||
      transaction?.date ||
      transaction?.created_at ||
      transaction?.createdAt
  );
}

function buildExplicitExpenseFulfillmentMap(
  expenses = [],
  walletTransactions = [],
  cycleStart = "",
  cycleEnd = ""
) {
  const expenseById = new Map(
    (Array.isArray(expenses) ? expenses : [])
      .filter((expense) => !isDeletedFinanceRecord(expense))
      .map((expense) => [clean(expense?.id), expense])
      .filter(([id]) => Boolean(id))
  );
  const totals = new Map();
  const seenExpenseIds = new Set();

  (Array.isArray(walletTransactions) ? walletTransactions : []).forEach((transaction) => {
    if (isDeletedFinanceRecord(transaction)) return;
    const expenseId = clean(transaction?.expense_id || transaction?.expenseId);
    if (!expenseId || seenExpenseIds.has(expenseId)) return;
    const expense = expenseById.get(expenseId);
    if (!expense) return;
    const requirementKey = explicitRequirementKey(expense) || explicitRequirementKey(transaction);
    if (!requirementKey) return;
    const date = transactionDate(transaction) || expenseDate(expense);
    if (!date || date < cycleStart || date >= cycleEnd) return;
    const amount = Math.abs(signed(transaction?.amount));
    if (!(amount > 0)) return;

    seenExpenseIds.add(expenseId);
    totals.set(requirementKey, (totals.get(requirementKey) || 0) + amount);
  });

  return totals;
}

function applyExplicitScheduleFulfillment(occurrences = [], fulfillmentMap = new Map()) {
  return (Array.isArray(occurrences) ? occurrences : []).map((occurrence) => {
    const requirementKey = clean(occurrence?.requirementKey || occurrence?.id);
    const explicitMatched = nonNegative(fulfillmentMap.get(requirementKey));
    if (!(explicitMatched > 0)) return occurrence;
    return {
      ...occurrence,
      actualPaid: nonNegative(occurrence?.actualPaid) + explicitMatched,
      explicitMatchedFulfillment: explicitMatched,
    };
  });
}

export async function buildCanonicalMeansSnapshot({ profile = {}, now = new Date() } = {}) {
  const owner = ownerIdentity(profile);
  const [
    incomeSources,
    wallets,
    walletTransactions,
    transfers,
    savingsGoals,
    emergencyFund,
    debtRecords,
    expenses,
  ] = await Promise.all([
    getIncomeSources(owner).catch(() => []),
    getWallets(owner).catch(() => []),
    getWalletTransactions(owner).catch(() => []),
    getTransfers(owner).catch(() => []),
    getSavingsGoals(owner).catch(() => []),
    getEmergencyFund(owner).catch(() => null),
    readAllDebtRecords(owner),
    getExpenses(owner).catch(() => []),
  ]);
  const payCycle = resolveMeansMasterPayCycle(incomeSources, now);
  if (!payCycle) return null;

  const today = financialDateKey(now);
  const cycleStartDate = payCycle.start;
  const cycleEndDate = payCycle.end;
  const explicitFulfillment = buildExplicitExpenseFulfillmentMap(
    expenses,
    walletTransactions,
    cycleStartDate,
    cycleEndDate
  );
  const moneyScheduleOccurrences = applyExplicitScheduleFulfillment(
    buildMeansMoneyScheduleOccurrences(owner, cycleStartDate, cycleEndDate),
    explicitFulfillment
  );
  const debtOccurrences = buildMeansDebtOccurrences(
    debtRecords,
    cycleStartDate,
    cycleEndDate
  );
  const occurrences = [...moneyScheduleOccurrences, ...debtOccurrences];
  const stored = await readMeansCycleBaseline({
    owner,
    cycleStart: cycleStartDate,
    cycleEnd: cycleEndDate,
  });
  const baselineState = resolveAdaptiveMeansBaselineState({
    stored,
    cycleStart: cycleStartDate,
    cycleEnd: cycleEndDate,
    today,
    occurrences,
  });

  if (baselineState.shouldPersist) {
    await persistMeansCycleBaseline({
      owner,
      cycleStart: cycleStartDate,
      cycleEnd: cycleEndDate,
      baseline: baselineState.baseline,
    }).catch(() => null);
  }

  const walletState = calculateMeansAvailableWalletState(
    wallets,
    walletTransactions,
    transfers,
    { emergencyFund, savingsGoals }
  );
  const availableNow = walletState.availableNow;
  const remainingPlannedSpending = nonNegative(baselineState.remainingPlannedSpending);
  const cycle100Anchor = nonNegative(baselineState.cycle100Anchor);

  const assumedSpent = 0;
  const assumedToday = 0;
  const effectiveCurrentMoney = availableNow;
  const scoreState = calculateMeansScoreState({
    availableWalletMoney: availableNow,
    remainingPlannedSpending,
    cycle100Anchor,
  });

  const requirements = Array.isArray(baselineState.requirements)
    ? baselineState.requirements
    : [];
  const moneyScheduleUpcoming = requirements
    .filter((entry) => entry.kind === "money_schedule")
    .reduce((sum, entry) => sum + nonNegative(entry.remainingAmount), 0);
  const debtUpcoming = requirements
    .filter((entry) => entry.kind === "debt")
    .reduce((sum, entry) => sum + nonNegative(entry.remainingAmount), 0);
  const upcoming = remainingPlannedSpending;
  const income = incomeReceivedForDisplay(incomeSources, cycleStartDate, cycleEndDate);
  const spent = actualSpentForDisplay(expenses, cycleStartDate, today);

  return {
    hasIncomePayCycle: true,
    masterPayCycleSourceId: payCycle.sourceId || null,
    masterPayCycleExplicit: Boolean(payCycle.explicitMaster),
    customCycle: Boolean(payCycle.customCycle),
    cycleLengthDays: payCycle.cycleLengthDays || null,
    score: scoreState.score,
    meansScore: scoreState.score,
    rawMeansScore: scoreState.rawScore,
    meansScoreResolved: scoreState.anchorResolved,
    meansScoreState: scoreState.coverageState,
    meansScoreUnavailableReason: baselineState.migrationUnresolved
      ? "legacy_anchor_migration_unresolved"
      : scoreState.anchorResolved
        ? null
        : "cycle_100_anchor_unresolved",
    anchorState: baselineState.anchorState,
    migrationUnresolved: Boolean(baselineState.migrationUnresolved),
    legacyMeansVersion: baselineState.legacyVersion || null,
    income,
    spent,
    assumedSpent,
    assumedToday,
    upcoming,
    remainingPlannedSpending,
    savingsGoalUpcoming: 0,
    debtUpcoming,
    moneyScheduleUpcoming,
    otherScheduledUpcoming: Math.max(
      remainingPlannedSpending - debtUpcoming - moneyScheduleUpcoming,
      0
    ),
    cycleStartDate,
    cycleEndDate,
    horizonDate: cycleEndDate,
    availableNow,
    availableWalletMoney: availableNow,
    grossWalletMoney: walletState.grossWalletMoney,
    effectiveCurrentMoney,
    financialRunway: effectiveCurrentMoney,
    cycle100Anchor,
    // Compatibility alias: requiredRunway now means the fixed V7 Cycle 100 Anchor only.
    requiredRunway: cycle100Anchor,
    wallBill: scoreState.wallBill,
    openingWallBill: scoreState.wallBill,
    closingWallBill: scoreState.wallBill,
    scoreRoom: scoreState.wallBill,
    plannedAssumedSinceLock: 0,
    moneyLentUnavailable: walletState.moneyLentUnavailable,
    emergencyProtected: walletState.emergencyProtected,
    savingsProtected: walletState.savingsProtected,
    otherProtected: walletState.otherProtected,
    projectedSpending: remainingPlannedSpending,
    projectedRoom: scoreState.wallBill,
    baselineContributions: requirements,
    planRequirements: requirements,
    explicitMatchedFulfillment: [...explicitFulfillment.entries()].map(
      ([requirementKey, amount]) => ({ requirementKey, amount })
    ),
    extraCurrentCycleActual: 0,
    carriedObligations: 0,
  };
}
