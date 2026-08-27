import "./installClaraOrbChatHandoff";
import "./installClaraOrbCommandChatRouting";
import "./installClaraBuyCheckKeyboardGuard";
import "./installClaraOrbViewportOwnershipGuard";
import { fetchCanonicalClaraProfile, resolveCanonicalFirstName } from "@/lib/canonical-clara-profile";
import {
  FINANCE_DATA_UPDATED_EVENT,
  getEmergencyFund,
  getExpenses,
  getSavingsGoals,
  getWallets,
} from "@/lib/financeRepository";
import {
  getIncomeSourceActivityLog,
  getIncomeSources,
} from "@/lib/incomeHubRepository";
import {
  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtObligations,
  getMonthlyDebtPayment,
} from "@/lib/debtObligationStore";
import {
  DEBT_OBLIGATION_SCHEDULE_SOURCE,
  buildDebtObligationScheduleProjection,
} from "@/lib/financialCardScheduleProjection";
import { getRecurrenceOccurrences } from "@/lib/recurringCashFlowRepository";
import { buildCanonicalWalletState } from "@/lib/clara-wallet-money-semantics";
import { isSavingsGoalActive } from "@/lib/savingsGoalLifecycle";
import { MEANS_SNAPSHOT_UPDATED_EVENT } from "@/lib/clara-means-boundary";
import { isDebtOccurrencePaid } from "@/lib/debtOccurrenceState";
import {
  calculateCycleRequiredRunway,
  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "@/lib/clara-means-cycle-baseline";
import {
  CLARA_MONEY_ROUTINE_UPDATED_EVENT,
  CLARA_MONEY_SCHEDULE_UPDATED_EVENT,
  getClaraMoneyScheduleStorageKey,
  readClaraMoneyRoutine,
} from "@/lib/clara-money-schedule-repository";
import {
  firstValidNumber,
  getPHMonthKey,
  getTransactionDate,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";

const RUNTIME_KEY = "__claraOrbGreetingRuntime__";
const PRODUCTION_GREETING_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-visual-offset] > div:first-child > p';
const TUTORIAL_GREETING_SELECTOR =
  '[data-clara-tutorial-orb-intro="true"] [data-clara-orb-visual-offset] > div:first-child > p';
const TUTORIAL_ROOT_SELECTOR = '[data-clara-tutorial-orb-intro="true"]';
const ORB_COMPOSITION_SELECTOR = '[data-clara-orb-composition="true"]';
const ORB_LAUNCHER_SELECTOR = '[data-clara-orb-launcher="true"]';
const ORB_IDLE_COPY_SELECTOR = ".clara-orb-idle-copy";
const MEANS_METRIC_ATTR = "data-clara-orb-means-metric";
const MEANS_PLACEHOLDER_ATTR = "data-clara-orb-means-placeholder";
const MEANS_CONTEXT_KEY = "__claraCanonicalMeansSnapshot__";
const INCOME_HUB_UPDATED_EVENT = "clara-income-hub-updated";
const INCOME_HUB_CASH_IN_TYPE = "add_money";
const SAVINGS_GOAL_SCHEDULE_SOURCE = "savings_goal_card_projection";
const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v3";

function resolveGreetingLabel() {
  return (
    document.querySelector(TUTORIAL_GREETING_SELECTOR) ||
    document.querySelector(PRODUCTION_GREETING_SELECTOR)
  );
}

function resolveTutorialIdentity(label) {
  const tutorialRoot = label?.closest?.(TUTORIAL_ROOT_SELECTOR);
  if (!tutorialRoot) return null;

  return {
    firstName: String(tutorialRoot.dataset.claraTutorialOrbName || "").trim(),
  };
}

function isOrbCommandModeVisible(label) {
  const composition = label?.closest?.(ORB_COMPOSITION_SELECTOR);
  const launcher = composition?.querySelector?.(ORB_LAUNCHER_SELECTOR);
  return launcher?.dataset?.orbCommandVisible === "true";
}

function clearGreetingPresentation(label) {
  if (!label) return;

  delete label.dataset.claraOrbUserGreeting;
  delete label.dataset.claraOrbGreetingScope;
  label.style.fontSize = "";
  label.style.fontWeight = "";
  label.style.lineHeight = "";
  label.style.letterSpacing = "";
  label.style.textTransform = "";
  label.style.color = "";
}

function money(value) {
  const amount = Number(value || 0);
  return `₱${Math.max(0, amount).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function endOfCurrentMonthKey() {
  const now = new Date();
  return localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function addLocalDaysKey(dateKey, days) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + Number(days || 0));
  return localDateKey(date);
}

function formatHorizonDate(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "the next payday";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function parseScheduleEvents(user) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const key = getClaraMoneyScheduleStorageKey(user);
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function routineAmountForDate(user, value = new Date()) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const day = routine.days.find(
    (entry) => Number(entry?.weekdayIndex ?? entry?.weekday_index) === date.getDay()
  );
  return Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100;
}

function assumedRoutineSpent(user, cycleStart = localDateKey()) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;

  const byWeekday = new Map(
    routine.days.map((day) => [
      Number(day?.weekdayIndex ?? day?.weekday_index),
      Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100,
    ])
  );

  const startMatch = String(cycleStart || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!startMatch) return 0;

  // Money Schedule is assumed consumed at 12:00 AM when its calendar day begins.
  // Therefore the current day belongs to Assumed spent, while futureRoutineAmount starts tomorrow.
  const cursor = new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let total = 0;

  while (cursor <= today) {
    total += byWeekday.get(cursor.getDay()) || 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function futureRoutineAmount(user, horizonEnd = endOfCurrentMonthKey()) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;

  const byWeekday = new Map(
    routine.days.map((day) => [
      Number(day?.weekdayIndex ?? day?.weekday_index),
      Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100,
    ])
  );

  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const horizonMatch = String(horizonEnd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const end = horizonMatch
    ? new Date(Number(horizonMatch[1]), Number(horizonMatch[2]) - 1, Number(horizonMatch[3]))
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let total = 0;

  while (cursor < end) {
    total += byWeekday.get(cursor.getDay()) || 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function futureScheduledAmount(user, cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return parseScheduleEvents(user).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
    const source = normalizeLower(event?.source);
    const savingsGoalProjection =
      source === SAVINGS_GOAL_SCHEDULE_SOURCE || event?.savingsGoalId || event?.savings_goal_id;
    const debtProjection =
      source === DEBT_OBLIGATION_SCHEDULE_SOURCE ||
      event?.debtObligationId ||
      event?.debt_obligation_id;
    if (!date || date < cycleStart || date >= horizonEnd) return sum;
    if (
      direction !== "out" ||
      event?.affectsMoney === false ||
      savingsGoalProjection ||
      debtProjection
    ) {
      return sum;
    }
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}

function futureDebtObligationAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return buildDebtObligationScheduleProjection(records).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
    if (!date || date <= today || date >= horizonEnd) return sum;
    if (direction !== "out") return sum;
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}

function debtLastPaidDate(record = {}) {
  return String(
    record?.lastPaidAt ||
      record?.last_paid_at ||
      record?.paidAt ||
      record?.paid_at ||
      ""
  ).slice(0, 10);
}

function overdueUnpaidDebtAmount(records = [], cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();
  const recordMap = new Map(
    (Array.isArray(records) ? records : []).map((record) => [
      String(record?.id || record?.debt_id || record?.debtId || "").trim(),
      record,
    ])
  );
  const latestDueByDebt = new Map();

  buildDebtObligationScheduleProjection(records).forEach((event) => {
    const debtId = String(event?.debtObligationId || event?.debt_obligation_id || "").trim();
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    if (!debtId || !date || direction !== "out") return;
    if (date < cycleStart || date > today || date >= horizonEnd) return;

    const current = latestDueByDebt.get(debtId);
    if (!current || date > current.date) latestDueByDebt.set(debtId, { ...event, date });
  });

  let total = 0;
  latestDueByDebt.forEach((event, debtId) => {
    const record = recordMap.get(debtId) || {};
    if (isDebtOccurrencePaid(record, event.date)) return;

    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
    total += Number.isFinite(amount) ? Math.max(0, amount) : 0;
  });

  return total;
}

function savingsGoalDate(goal = {}) {
  return String(
    goal?.planned_use_date ||
      goal?.plannedUseDate ||
      goal?.due_date ||
      goal?.dueDate ||
      goal?.target_date ||
      goal?.targetDate ||
      ""
  ).slice(0, 10);
}

function savingsGoalMoney(...values) {
  for (const value of values) {
    const amount = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
    if (Number.isFinite(amount)) return Math.max(0, amount);
  }
  return 0;
}

function futureSavingsGoalAmount(goals = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return (Array.isArray(goals) ? goals : []).reduce((sum, goal) => {
    if (!isSavingsGoalActive(goal)) return sum;

    const date = savingsGoalDate(goal);
    if (!date || date >= horizonEnd) return sum;

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

function getOwnerIdentity(profile = {}) {
  return (
    profile?.id ||
    profile?.user_id ||
    profile?.userId ||
    profile?.email ||
    profile?.user?.id ||
    profile?.user?.email ||
    "local-user"
  );
}

function walletBalance(wallet = {}) {
  return Math.max(
    0,
    firstValidNumber(
      wallet?.balance,
      wallet?.current_balance,
      wallet?.wallet_balance,
      wallet?.available_balance,
      wallet?.starting_balance
    )
  );
}

function isMoneyLentWallet(wallet = {}) {
  const type = normalizeLower(wallet?.type || wallet?.wallet_type || wallet?.walletType);
  return ["money_lent", "money-lent", "lent", "receivable"].includes(type);
}

function currentAvailableMoney(wallets = []) {
  return (Array.isArray(wallets) ? wallets : []).reduce(
    (sum, wallet) => (isMoneyLentWallet(wallet) ? sum : sum + walletBalance(wallet)),
    0
  );
}

function currentMoneyLentUnavailable(wallets = []) {
  return (Array.isArray(wallets) ? wallets : []).reduce(
    (sum, wallet) => (isMoneyLentWallet(wallet) ? sum + walletBalance(wallet) : sum),
    0
  );
}

function stableIncomeMinimum(source = {}) {
  return Math.max(
    0,
    firstValidNumber(
      source?.minimumStableIncome,
      source?.minimum_stable_income,
      source?.minimumExpectedIncome,
      source?.minimum_expected_income,
      source?.expectedAmount,
      source?.expected_amount,
      source?.recurringAmount,
      source?.recurring_amount,
      source?.monthlyAmount,
      source?.monthly_amount
    )
  );
}

function stableIncomeRecurrence(source = {}) {
  return source?.incomeRecurrence || source?.income_recurrence || null;
}

function resolveMeansPayCycle(incomeSources = []) {
  const today = localDateKey();
  const searchStart = addLocalDaysKey(today, -62);
  const searchEnd = addLocalDaysKey(today, 62);
  const cycles = [];

  (Array.isArray(incomeSources) ? incomeSources : []).forEach((source) => {
    if (normalizeLower(source?.stability) !== "stable") return;
    if (source?.useForBudgetTiming === false || source?.use_for_budget_timing === false) return;
    const recurrence = stableIncomeRecurrence(source);
    if (!recurrence) return;
    const occurrences = getRecurrenceOccurrences(recurrence, searchStart, searchEnd, { kind: "income" }).sort();
    const previous = [...occurrences].reverse().find((date) => date <= today) || "";
    const next = occurrences.find((date) => date > today) || "";
    if (previous && next) cycles.push({ start: previous, end: next });
  });

  if (!cycles.length) return null;
  return cycles.sort((a, b) => a.end.localeCompare(b.end))[0];
}

function payCycleIncomeFromSources(incomeSources = [], cycleStart = "", cycleEnd = "") {
  return (Array.isArray(incomeSources) ? incomeSources : []).reduce((sourceSum, source) => {
    const actualIncome = getIncomeSourceActivityLog(source).reduce((activitySum, activity) => {
      if (normalizeLower(activity?.type) !== INCOME_HUB_CASH_IN_TYPE) return activitySum;
      const date = localDateKey(getTransactionDate(activity));
      if (!date || date < cycleStart || date >= cycleEnd) return activitySum;
      return activitySum + Math.max(0, firstValidNumber(activity?.amount));
    }, 0);
    return sourceSum + actualIncome;
  }, 0);
}

function payCycleSpent(expenses = [], cycleStart = "") {
  const today = localDateKey();
  return (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const date = localDateKey(getTransactionDate(expense));
    if (!date || date < cycleStart || date > today) return sum;
    return sum + Math.abs(Number(expense?.amount || 0));
  }, 0);
}

function parseMonthKey(monthKey) {
  const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function countWeekdayInMonth(year, monthIndex, dayOfWeek) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return 0;
  const end = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= end; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === dayOfWeek) count += 1;
  }
  return count;
}

function countBiweeklyInMonth(year, monthIndex, startDate) {
  const anchor = new Date(`${String(startDate || "").slice(0, 10)}T00:00:00`);
  if (Number.isNaN(anchor.getTime())) return 0;

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const stepMs = 14 * 24 * 60 * 60 * 1000;
  let cursor = new Date(anchor);

  while (cursor > monthStart) cursor = new Date(cursor.getTime() - stepMs);
  while (cursor < monthStart) cursor = new Date(cursor.getTime() + stepMs);

  let count = 0;
  while (cursor <= monthEnd) {
    count += 1;
    cursor = new Date(cursor.getTime() + stepMs);
  }
  return count;
}

function projectedStableIncomeForMonth(source, currentMonthKey) {
  if (normalizeLower(source?.stability) !== "stable") return 0;

  const minimum = stableIncomeMinimum(source);
  const recurrence = stableIncomeRecurrence(source);
  const month = parseMonthKey(currentMonthKey);
  if (!(minimum > 0) || !recurrence || !month) return 0;

  const type = normalizeLower(recurrence?.type || recurrence?.recurrence || recurrence?.frequency);
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  let paydays = 0;

  if (type === "weekly") {
    paydays = countWeekdayInMonth(
      month.year,
      month.monthIndex,
      Number(recurrence?.dayOfWeek ?? recurrence?.day_of_week)
    );
  } else if (type === "biweekly") {
    paydays = countBiweeklyInMonth(
      month.year,
      month.monthIndex,
      recurrence?.startDate || recurrence?.start_date
    );
  } else if (type === "twice_monthly") {
    const days = Array.isArray(recurrence?.days) ? recurrence.days : [];
    const todayDay =
      currentMonthKey === getPHMonthKey()
        ? Number(
            new Intl.DateTimeFormat("en-PH", {
              timeZone: "Asia/Manila",
              day: "numeric",
            }).format(new Date())
          )
        : 1;
    paydays = [...new Set(days.map(Number))].filter(
      (day) =>
        Number.isInteger(day) &&
        day >= 1 &&
        day <= daysInMonth &&
        day >= todayDay
    ).length;
  } else if (type === "monthly") {
    paydays = 1;
  }

  return minimum * paydays;
}

function currentMonthIncomeFromSources(incomeSources, currentMonthKey) {
  return (Array.isArray(incomeSources) ? incomeSources : []).reduce((sourceSum, source) => {
    const actualIncome = getIncomeSourceActivityLog(source).reduce((activitySum, activity) => {
      if (normalizeLower(activity?.type) !== INCOME_HUB_CASH_IN_TYPE) return activitySum;
      const date = getTransactionDate(activity);
      if (!date || getPHMonthKey(date) !== currentMonthKey) return activitySum;
      return activitySum + Math.max(0, firstValidNumber(activity?.amount));
    }, 0);

    const reliableExpectedIncome = projectedStableIncomeForMonth(source, currentMonthKey);

    return sourceSum + Math.max(actualIncome, reliableExpectedIncome);
  }, 0);
}

function readDebtPaymentHistory(record = {}) {
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

function isInactiveSavingsPlanGoal(goal = {}) {
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

function meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd) {
  const ownerKey = encodeURIComponent(String(owner || "local-user").trim() || "local-user");
  return `${MEANS_CYCLE_BASELINE_STORAGE_PREFIX}:${ownerKey}:${cycleStart}:${cycleEnd}`;
}

function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  upcoming,
  requiredRunwayCandidate,
  assumedSpent,
  debtObligations,
  planFingerprint,
}) {
  const plannedDebtAlreadyPaid = plannedDebtPaidInsideCycle(
    debtObligations,
    cycleStart,
    cycleEnd
  );

  // 100 is the full predicted amount needed for this pay cycle. Keep already-realized
  // planned debt inside the floor so fulfilling a known obligation cannot make the
  // measuring stick artificially smaller.
  const reconstructedRequiredRunway = Math.max(
    Number(requiredRunwayCandidate || 0),
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

function realizedBuyCheckMeansOffset(expenses = [], cycleStart = "", cycleEnd = "") {
  const today = localDateKey();
  return (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const date = localDateKey(getTransactionDate(expense));
    if (!date || date < cycleStart || date >= cycleEnd) return sum;
    const amount = Math.max(0, Number(expense?.means_accounted_amount || 0));
    const source = normalizeLower(expense?.means_accounted_source);
    if (!(amount > 0) || !source || source === "unplanned") return sum;

    // One-off scheduled events stop needing an offset after their planned
    // date leaves Upcoming. Weekly routine items remain represented as
    // Assumed spent, so their offset remains valid for the whole cycle.
    const offsetUntil = String(expense?.means_accounted_until || "").slice(0, 10);
    if (source === "money_schedule_event" && offsetUntil && today > offsetUntil) return sum;
    return sum + amount;
  }, 0);
}

async function buildMeansSnapshot(profile = {}) {
  const owner = getOwnerIdentity(profile);
  const [expenses, incomeSources, savingsGoals, debtObligations, wallets, emergencyFund] = await Promise.all([
    getExpenses(owner).catch(() => []),
    getIncomeSources(owner).catch(() => []),
    getSavingsGoals(owner).catch(() => []),
    getDebtObligations(owner).catch(() => []),
    getWallets(owner).catch(() => []),
    getEmergencyFund(owner).catch(() => null),
  ]);
  const payCycle = resolveMeansPayCycle(incomeSources);
  if (!payCycle) return null;

  const cycleStartDate = payCycle.start;
  const cycleEndDate = payCycle.end;
  const spent = payCycleSpent(expenses, cycleStartDate);
  const realizedPlannedBuyCheckOffset = realizedBuyCheckMeansOffset(expenses, cycleStartDate, cycleEndDate);
  const income = payCycleIncomeFromSources(incomeSources, cycleStartDate, cycleEndDate);
  const canonicalWalletState = buildCanonicalWalletState({
    wallets,
    emergencyFund,
    savingsGoals,
  });
  const walletTotals = canonicalWalletState.walletTotals || {};
  const availableNow = Math.max(0, Number(walletTotals.spendableBalance || 0));
  const moneyLentUnavailable = Math.max(0, Number(walletTotals.moneyLentUnavailableAmount || 0));
  const emergencyProtected = Math.max(0, Number(walletTotals.emergencyProtectedAmount || 0));
  const savingsProtected = Math.max(0, Number(walletTotals.savingsProtectedAmount || 0));
  const otherProtected = Math.max(0, Number(walletTotals.otherProtectedAmount || 0));
  if (
    !(income > 0) &&
    !(availableNow > 0) &&
    !(moneyLentUnavailable > 0) &&
    !(emergencyProtected > 0) &&
    !(savingsProtected > 0)
  ) return null;

  const assumedSpent = assumedRoutineSpent(owner, cycleStartDate);
  const assumedToday = routineAmountForDate(owner, new Date());
  const rawMoneyScheduleUpcoming = futureRoutineAmount(owner, cycleEndDate);
  // At 12:00 AM today's routine becomes assumed spent. Hand that same amount out of
  // the remaining Money Schedule immediately so it cannot sit in both past and future.
  const moneyScheduleUpcoming = Math.max(0, rawMoneyScheduleUpcoming - assumedToday);
  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);
  const savingsGoalUpcoming = futureSavingsGoalAmount(savingsGoals, cycleEndDate);
  const debtUpcoming =
    futureDebtObligationAmount(debtObligations, cycleEndDate) +
    overdueUnpaidDebtAmount(debtObligations, cycleStartDate, cycleEndDate);
  const upcoming = debtUpcoming + savingsGoalUpcoming + moneyScheduleUpcoming + otherScheduledUpcoming;
  const planFingerprint = buildMeansPlanFingerprint({
    owner,
    cycleStart: cycleStartDate,
    cycleEnd: cycleEndDate,
    debtObligations,
    savingsGoals,
  });

  const projectedSpending = upcoming;
  const projectedRoom = availableNow - upcoming;
  const requiredRunwayCandidate = calculateCycleRequiredRunway({
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
  });
  const requiredRunway = Math.max(0, Number(cycleBaseline.requiredRunway || 0));
  const { score, scoreRoom, plannedAssumedSinceLock } = calculateMeansScoreState({
    financialRunway,
    upcoming,
    requiredRunway,
    assumedSpent,
    assumedSpentAtLock: cycleBaseline.assumedSpentAtLock,
    realizedPlannedOffset: realizedPlannedBuyCheckOffset,
  });

  return {
    hasIncomePayCycle: true,
    score,
    income,
    spent,
    assumedSpent,
    assumedToday,
    upcoming,
    savingsGoalUpcoming,
    debtUpcoming,
    moneyScheduleUpcoming,
    otherScheduledUpcoming,
    cycleStartDate,
    cycleEndDate,
    horizonDate: cycleEndDate,
    availableNow,
    financialRunway,
    requiredRunway,
    planFingerprint,
    scoreRoom,
    plannedAssumedSinceLock,
    realizedPlannedBuyCheckOffset,
    moneyLentUnavailable,
    emergencyProtected,
    savingsProtected,
    otherProtected,
    projectedSpending,
    projectedRoom,
  };
}

function statusForScore(score) {
  if (score >= 10000) return "Diamond";
  if (score >= 5000) return "Gold";
  if (score >= 2000) return "Silver";
  if (score >= 1000) return "Bronze";
  if (score >= 500) return "Vanguard";
  if (score >= 400) return "Level IV";
  if (score >= 300) return "Level III";
  if (score >= 200) return "Level II";
  if (score >= 101) return "Below Your Means";
  if (score === 100) return "Within Your Means";
  if (score >= 1) return "Above Your Means";
  return "In Deficit";
}

function metricTone(score) {
  if (score > 100) return "#67e8c8";
  if (score === 100) return "#e7eefc";
  if (score >= 0) return "#f4d36a";
  return "#ff7f8d";
}

function ensureMeansPlaceholder(idleCopy) {
  const placeholder = idleCopy?.querySelector?.(`[${MEANS_PLACEHOLDER_ATTR}="true"]`);
  if (!placeholder || placeholder.dataset.claraMeansPremiumPlaceholder === "true") {
    return placeholder;
  }

  placeholder.dataset.claraMeansPremiumPlaceholder = "true";
  placeholder.style.marginTop = "9px";
  placeholder.style.fontSize = "initial";
  placeholder.style.fontWeight = "initial";
  placeholder.style.letterSpacing = "initial";
  placeholder.style.color = "inherit";
  placeholder.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 11px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
      <strong style="display:inline-grid;place-items:center;min-width:27px;height:23px;padding:0 6px;border:1px solid rgba(255,255,255,.07);border-radius:999px;background:rgba(255,255,255,.035);font-size:11px;font-weight:900;line-height:1;color:rgba(255,255,255,.58)">—</strong>
      <span style="font-size:8px;font-weight:900;line-height:1;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.34)">Means score</span>
    </span>
  `;

  return placeholder;
}

function ensureMeansMetric(label, snapshot, onToggle) {
  const composition = label?.closest?.(ORB_COMPOSITION_SELECTOR);
  const idleCopy = composition?.querySelector?.(ORB_IDLE_COPY_SELECTOR);
  if (!idleCopy) return null;

  const tapCopy = idleCopy.querySelector("p");
  if (tapCopy) tapCopy.style.display = "none";
  ensureMeansPlaceholder(idleCopy);

  let root = idleCopy.querySelector(`[${MEANS_METRIC_ATTR}="true"]`);

  if (!root) {
    root = document.createElement("button");
    root.type = "button";
    root.setAttribute(MEANS_METRIC_ATTR, "true");
    root.setAttribute("aria-expanded", "false");
    root.style.display = "block";
    root.style.width = "100%";
    root.style.margin = "9px auto 0";
    root.style.padding = "0";
    root.style.border = "0";
    root.style.background = "transparent";
    root.style.color = "inherit";
    root.style.textAlign = "center";
    root.style.cursor = "pointer";
    root.style.WebkitTapHighlightColor = "transparent";
    root.addEventListener("click", onToggle);
    idleCopy.appendChild(root);
  }

  const expanded = root.getAttribute("aria-expanded") === "true";
  const renderSignature = snapshot
    ? [
        "ready",
        snapshot.score,
        Math.round(snapshot.income),
        Math.round(snapshot.spent),
        Math.round(snapshot.assumedSpent || 0),
        Math.round(snapshot.assumedToday || 0),
        Math.round(snapshot.upcoming),
        Math.round(snapshot.savingsGoalUpcoming || 0),
        Math.round(snapshot.debtUpcoming || 0),
        Math.round(snapshot.moneyScheduleUpcoming || 0),
        Math.round(snapshot.otherScheduledUpcoming || 0),
        snapshot.cycleStartDate || "",
        snapshot.cycleEndDate || "",
        Math.round(snapshot.availableNow || 0),
        Math.round(snapshot.financialRunway || 0),
        Math.round(snapshot.requiredRunway || 0),
        Math.round(snapshot.scoreRoom || 0),
        Math.round(snapshot.plannedAssumedSinceLock || 0),
        Math.round(snapshot.moneyLentUnavailable || 0),
        Math.round(snapshot.emergencyProtected || 0),
        Math.round(snapshot.savingsProtected || 0),
        Math.round(snapshot.otherProtected || 0),
        snapshot.horizonDate || "",
        Math.round(snapshot.projectedRoom),
        expanded ? 1 : 0,
      ].join(":")
    : `waiting:${expanded ? 1 : 0}`;
  if (root.dataset.claraMeansRenderSignature === renderSignature) return root;
  root.dataset.claraMeansRenderSignature = renderSignature;

  if (!snapshot) {
    root.setAttribute(
      "aria-label",
      expanded
        ? "Means Score details. Waiting for a valid Income Hub pay cycle."
        : "Means Score. Waiting for a valid Income Hub pay cycle. Tap for details."
    );
    root.innerHTML = `
      <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 10px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
        <strong style="display:inline-grid;place-items:center;min-width:29px;height:23px;padding:0 6px;border:1px solid rgba(255,255,255,.07);border-radius:999px;background:rgba(255,255,255,.035);font-size:11px;font-weight:900;line-height:1;color:rgba(255,255,255,.58)">—</strong>
        <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1">
          <span style="font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26)">Means score</span>
          <span style="font-size:9px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.52)">Waiting for income timing</span>
        </span>
        <span style="margin-left:1px;font-size:9px;line-height:1;color:rgba(255,255,255,.25);transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
      </span>
      <span data-clara-means-expanded="true" style="display:${expanded ? "block" : "none"};width:min(300px,78vw);margin:10px auto 1px;padding:12px;border:1px solid rgba(112,157,229,.13);border-radius:15px;background:linear-gradient(180deg,rgba(9,21,50,.72),rgba(4,11,31,.66));box-shadow:0 14px 34px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);text-align:left">
        <strong style="display:block;font-size:10px;font-weight:900;letter-spacing:-.01em;color:rgba(255,255,255,.76)">No valid Income Hub pay cycle detected yet.</strong>
        <span style="display:block;margin-top:5px;font-size:9.5px;font-weight:650;line-height:1.5;color:rgba(255,255,255,.40)">Set a stable income schedule in Income Hub so CLARA can use payday-to-payday boundaries. CLARA will not substitute a calendar-month boundary.</span>
        <span style="display:block;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.06);font-size:8.5px;font-weight:700;color:rgba(255,255,255,.22);text-align:center">100 = living within your means</span>
      </span>
    `;
    return root;
  }

  const tone = metricTone(snapshot.score);
  root.setAttribute(
    "aria-label",
    `Means Score ${snapshot.score}. ${statusForScore(snapshot.score)}. ${expanded ? "Tap to collapse details." : "Tap for details."}`
  );
  root.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 10px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
      <strong style="display:inline-grid;place-items:center;min-width:29px;height:23px;padding:0 6px;border:1px solid ${tone}33;border-radius:999px;background:${tone}0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 0 14px ${tone}12;font-size:11px;font-weight:900;line-height:1;color:${tone}">${snapshot.score}</strong>
      <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1">
        <span style="font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26)">Means score</span>
        <span style="font-size:9px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.62)">${statusForScore(snapshot.score)}</span>
      </span>
      <span style="margin-left:1px;font-size:9px;line-height:1;color:rgba(255,255,255,.25);transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
    </span>
    <span data-clara-means-expanded="true" style="display:${expanded ? "block" : "none"};width:min(300px,78vw);margin:10px auto 1px;padding:11px 12px;border:1px solid rgba(112,157,229,.13);border-radius:15px;background:linear-gradient(180deg,rgba(9,21,50,.72),rgba(4,11,31,.66));box-shadow:0 14px 34px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);text-align:left">
      <span style="display:flex;justify-content:space-between;gap:16px;font-size:10px;color:rgba(255,255,255,.38)"><span>Income this pay cycle</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.income)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.50)"><span>Money in hand</span><strong style="color:rgba(255,255,255,.86)">${money(snapshot.availableNow)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Actual spent</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.spent)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Assumed spent</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.assumedSpent || 0)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:10px;color:rgba(255,255,255,.44)"><span>Upcoming commitments</span><strong style="color:rgba(255,255,255,.78)">${money(snapshot.upcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Debt / obligations</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.debtUpcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Savings goals</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.savingsGoalUpcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Money Schedule</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.moneyScheduleUpcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Other scheduled events</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.otherScheduledUpcoming)}</strong></span>
      ${(snapshot.emergencyProtected || snapshot.savingsProtected || snapshot.otherProtected) > 0 ? `<span style="display:block;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05)">
        ${snapshot.emergencyProtected > 0 ? `<span style="display:flex;justify-content:space-between;gap:16px;font-size:9.5px;color:rgba(255,255,255,.30)"><span>Emergency Fund · protected</span><strong style="color:rgba(255,255,255,.50)">${money(snapshot.emergencyProtected)}</strong></span>` : ""}
        ${snapshot.savingsProtected > 0 ? `<span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;font-size:9.5px;color:rgba(255,255,255,.30)"><span>Savings · protected</span><strong style="color:rgba(255,255,255,.50)">${money(snapshot.savingsProtected)}</strong></span>` : ""}
        ${snapshot.otherProtected > 0 ? `<span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;font-size:9.5px;color:rgba(255,255,255,.30)"><span>Other protected money</span><strong style="color:rgba(255,255,255,.50)">${money(snapshot.otherProtected)}</strong></span>` : ""}
      </span>` : ""}
      ${snapshot.moneyLentUnavailable > 0 ? `<span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:9.5px;color:rgba(255,255,255,.30)"><span>Money lent · not available</span><strong style="color:rgba(255,255,255,.50)">${money(snapshot.moneyLentUnavailable)}</strong></span>` : ""}
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.07);font-size:10px;color:rgba(255,255,255,.48)"><span>Room until ${formatHorizonDate(snapshot.cycleEndDate)}</span><strong style="color:${snapshot.projectedRoom >= 0 ? "#67e8c8" : "#ff7f8d"}">${snapshot.projectedRoom >= 0 ? "" : "−"}${money(Math.abs(snapshot.projectedRoom))}</strong></span>
      <span style="display:flex;align-items:center;justify-content:center;gap:5px;margin-top:7px;font-size:8.5px;font-weight:700;color:rgba(255,255,255,.22);text-align:center">
        <span>100 = living within your means</span>
        <button type="button" data-clara-means-info-toggle="true" aria-label="How the Means Score is calculated" aria-expanded="false" style="display:inline-grid;place-items:center;width:15px;height:15px;padding:0;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.36);font-size:9px;font-weight:800;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent">i</button>
      </span>
      <span data-clara-means-info-copy="true" style="display:none;margin-top:7px;padding:7px 8px;border:1px solid rgba(255,255,255,.05);border-radius:9px;background:rgba(255,255,255,.018);font-size:8.5px;font-weight:650;line-height:1.45;color:rgba(255,255,255,.30);text-align:center">This score uses one Income Hub pay-cycle window: ${formatHorizonDate(snapshot.cycleStartDate)} through ${formatHorizonDate(snapshot.cycleEndDate)}. Actual spent is based on recorded expenses. Assumed spent is the Money Schedule amount whose scheduled days have already begun in the current pay cycle. Upcoming commitments contain only the remaining future Money Schedule plus unresolved Debt / Obligations, Savings Goals, and other scheduled events before the next payday. Protected or lent money is already excluded from money in hand and is not subtracted twice.</span>
    </span>
  `;

  const infoToggle = root.querySelector?.('[data-clara-means-info-toggle="true"]');
  if (infoToggle && infoToggle.dataset.claraMeansInfoBound !== "true") {
    infoToggle.dataset.claraMeansInfoBound = "true";
    infoToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const infoCopy = root.querySelector?.('[data-clara-means-info-copy="true"]');
      if (!infoCopy) return;
      const nextOpen = infoToggle.getAttribute("aria-expanded") !== "true";
      infoToggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      infoCopy.style.display = nextOpen ? "block" : "none";
    });
  }

  return root;
}

function installClaraOrbGreeting() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();
  let queued = false;
  let activeLabel = null;
  let firstName = "";
  let loaded = false;
  let request = null;
  let destroyed = false;
  let canonicalProfile = null;
  let meansSnapshot = null;
  let meansRequest = null;

  const publishMeansSnapshot = (snapshot) => {
    const published = snapshot ? { ...snapshot, capturedAt: Date.now() } : null;
    window[MEANS_CONTEXT_KEY] = published;
    window.dispatchEvent(
      new CustomEvent(MEANS_SNAPSHOT_UPDATED_EVENT, {
        detail: { snapshot: published },
      })
    );
  };

  const toggleMeansMetric = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const root = event.currentTarget;
    const nextExpanded = root.getAttribute("aria-expanded") !== "true";
    root.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
    if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);
    if (!meansSnapshot) refreshMeans();
  };

  const refreshMeans = () => {
    if (!canonicalProfile || meansRequest || destroyed) return;
    meansRequest = buildMeansSnapshot(canonicalProfile)
      .then((snapshot) => {
        if (destroyed) return;
        meansSnapshot = snapshot;
        publishMeansSnapshot(snapshot);
        if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);
      })
      .catch((error) => {
        if (destroyed) return;
        console.warn("CLARA Orb Means Score unavailable:", error);
        meansSnapshot = null;
        publishMeansSnapshot(null);
        if (activeLabel) ensureMeansMetric(activeLabel, null, toggleMeansMetric);
      })
      .finally(() => {
        meansRequest = null;
      });
  };

  const render = () => {
    const label = resolveGreetingLabel();
    if (!label) {
      activeLabel = null;
      firstName = "";
      loaded = false;
      return null;
    }

    if (label !== activeLabel) {
      activeLabel = label;
      const tutorialIdentity = resolveTutorialIdentity(label);
      firstName = tutorialIdentity?.firstName || "";
      loaded = Boolean(tutorialIdentity);
    }

    if (isOrbCommandModeVisible(label)) {
      clearGreetingPresentation(label);
      return null;
    }

    const nextText = firstName ? `Hi ${firstName}!` : "Hi!";
    if (label.textContent !== nextText) label.textContent = nextText;
    label.dataset.claraOrbUserGreeting = "true";
    label.dataset.claraOrbGreetingScope = resolveTutorialIdentity(label) ? "tutorial" : "production";
    label.style.fontSize = "18px";
    label.style.fontWeight = "900";
    label.style.lineHeight = "1.1";
    label.style.letterSpacing = "-0.02em";
    label.style.textTransform = "none";
    label.style.color = "rgba(255, 255, 255, 0.96)";

    if (!resolveTutorialIdentity(label)) {
      ensureMeansMetric(label, meansSnapshot, toggleMeansMetric);
    }
    return label;
  };

  const load = () => {
    if (!activeLabel || loaded || request) return;
    const requestedLabel = activeLabel;
    request = fetchCanonicalClaraProfile()
      .then((profile) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        canonicalProfile = profile || null;
        firstName = resolveCanonicalFirstName(profile);
        loaded = true;
        render();
        refreshMeans();
      })
      .catch((error) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        console.warn("CLARA Orb canonical profile greeting unavailable:", error);
        loaded = true;
        render();
      })
      .finally(() => {
        request = null;
      });
  };

  const sync = () => {
    queued = false;
    if (render()) load();
  };

  const queueSync = () => {
    if (queued || destroyed) return;
    queued = true;
    window.requestAnimationFrame(sync);
  };

  const handleFinanceRefresh = () => {
    meansSnapshot = null;
    refreshMeans();
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-orb-command-visible"],
  });
  window.addEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(INCOME_HUB_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(DEBT_OBLIGATIONS_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);
  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      window.removeEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(INCOME_HUB_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(DEBT_OBLIGATIONS_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener("clara:schedule:create-event", handleFinanceRefresh);
      clearGreetingPresentation(activeLabel);
      activeLabel = null;
      request = null;
      meansRequest = null;
      canonicalProfile = null;
      meansSnapshot = null;
      publishMeansSnapshot(null);
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbGreeting();