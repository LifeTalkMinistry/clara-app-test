import { getSavingsGoals } from "@/lib/financeRepository";
import { getDebtObligations, getDebtTitle } from "@/lib/debtObligationStore";
import {
  getDebtBalance,
  getDebtDueDay,
  getMonthlyDebtPayment,
  isActiveDebtObligation,
} from "@/lib/debtObligationMath";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  getRecurrenceOccurrences,
  getRecurringCashFlowOwnerId,
  toLocalDateKey,
} from "@/lib/recurringCashFlowRepository";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const LEGACY_SCHEDULE_STORAGE_KEY = "clara_lifeos_schedule_events_v1";

export const SAVINGS_GOAL_SCHEDULE_SOURCE = "savings_goal_card_projection";
export const DEBT_OBLIGATION_SCHEDULE_SOURCE = "debt_obligation_card_projection";

const SAVINGS_GOAL_ID_PREFIX = "savings-goal-schedule-";
const DEBT_OBLIGATION_ID_PREFIX = "debt-obligation-schedule-";

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanMoney(value) {
  const amount = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function formatMoney(value) {
  return cleanMoney(value).toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  });
}

function getScheduleStorageKey(user) {
  return `${SCHEDULE_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

function getLegacyOwnerScheduleStorageKey(user) {
  return `${SCHEDULE_STORAGE_PREFIX}_${user?.id || user?.email || "guest"}`;
}

function readPersistedScheduleEvents(user) {
  if (typeof window === "undefined" || !window.localStorage) return [];

  const storageKey = getScheduleStorageKey(user);
  const legacyOwnerStorageKey = getLegacyOwnerScheduleStorageKey(user);
  const raw =
    window.localStorage.getItem(storageKey) ||
    (legacyOwnerStorageKey !== storageKey
      ? window.localStorage.getItem(legacyOwnerStorageKey)
      : null) ||
    window.localStorage.getItem(LEGACY_SCHEDULE_STORAGE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getSavingsGoalDate(goal = {}) {
  return toLocalDateKey(
    goal.planned_use_date ||
      goal.plannedUseDate ||
      goal.due_date ||
      goal.dueDate ||
      goal.target_date ||
      goal.targetDate ||
      ""
  );
}

function getSavingsGoalTitle(goal = {}) {
  return (
    cleanText(goal.title || goal.name || goal.goal_name || goal.goalName) ||
    "Savings Goal"
  );
}

function getSavingsGoalTarget(goal = {}) {
  return cleanMoney(
    goal.target_amount ??
      goal.targetAmount ??
      goal.goal_amount ??
      goal.goalAmount ??
      goal.target ??
      goal.amount
  );
}

function getSavingsGoalSaved(goal = {}) {
  return cleanMoney(
    goal.saved_amount ??
      goal.savedAmount ??
      goal.current_amount ??
      goal.currentAmount ??
      goal.saved ??
      goal.progress_amount ??
      goal.progressAmount ??
      goal.amount_saved
  );
}

function isSavingsGoalActive(goal = {}) {
  const status = cleanText(goal.status).toLowerCase();
  return !(
    goal.deletedAt ||
    goal.deleted_at ||
    goal.is_archived === true ||
    goal.isArchived === true ||
    ["deleted", "archived", "cancelled", "canceled"].includes(status)
  );
}

export function buildSavingsGoalScheduleProjection(goals = []) {
  return (Array.isArray(goals) ? goals : [])
    .filter(isSavingsGoalActive)
    .map((goal) => {
      const id = cleanText(goal.id || goal.goal_id || goal.goalId);
      const date = getSavingsGoalDate(goal);
      if (!id || !date) return null;

      const title = getSavingsGoalTitle(goal);
      const target = getSavingsGoalTarget(goal);
      const saved = getSavingsGoalSaved(goal);
      const remaining = Math.max(target - saved, 0);
      const note =
        target > 0
          ? remaining > 0
            ? `${title} is planned for ${date}. ₱${formatMoney(saved)} is already saved and ₱${formatMoney(remaining)} remains before the ₱${formatMoney(target)} target.`
            : `${title} is planned for ${date}. The ₱${formatMoney(target)} target is already funded, so protect that money until the planned use date.`
          : `${title} is planned for ${date}. Keep this future use visible before optional spending.`;

      return {
        id: `${SAVINGS_GOAL_ID_PREFIX}${id}-${date}`,
        title,
        date,
        time: "",
        type: "Money",
        amount: target > 0 ? target : "",
        direction: "out",
        note,
        impactBreakdown: [
          {
            direction: "out",
            amount: target,
            savedAmount: saved,
            remainingAmount: remaining,
            source: "savings_goal",
          },
        ],
        source: SAVINGS_GOAL_SCHEDULE_SOURCE,
        savingsGoalId: id,
        savings_goal_id: id,
        derived: true,
        editable: false,
      };
    })
    .filter(Boolean);
}

function getDebtProjectionRange(referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  return {
    start: toLocalDateKey(new Date(safeNow.getFullYear(), 0, 1)),
    end: toLocalDateKey(new Date(safeNow.getFullYear() + 1, 11, 31)),
  };
}

function getDebtOccurrenceDates(record = {}, referenceDate = new Date()) {
  const dueDay = getDebtDueDay(record);
  const range = getDebtProjectionRange(referenceDate);

  if (dueDay) {
    return getRecurrenceOccurrences(
      {
        type: "monthly",
        startDate: range.start,
        dayOfMonth: dueDay,
      },
      range.start,
      range.end,
      { kind: "bill" }
    );
  }

  const oneTimeDate = toLocalDateKey(record.dueDate || record.due_date || "");
  return oneTimeDate ? [oneTimeDate] : [];
}

export function buildDebtObligationScheduleProjection(
  records = [],
  { referenceDate = new Date() } = {}
) {
  return (Array.isArray(records) ? records : [])
    .filter(isActiveDebtObligation)
    .flatMap((record) => {
      const id = cleanText(record.id || record.debt_id || record.debtId);
      if (!id) return [];

      const title = getDebtTitle(record);
      const monthlyPayment = getMonthlyDebtPayment(record);
      const balance = getDebtBalance(record);
      if (monthlyPayment <= 0) return [];

      return getDebtOccurrenceDates(record, referenceDate).map((date) => ({
        id: `${DEBT_OBLIGATION_ID_PREFIX}${id}-${date}`,
        title: `${title} payment`,
        date,
        time: "",
        type: "Bill",
        amount: monthlyPayment,
        direction: "out",
        note:
          balance > 0
            ? `${title} requires ₱${formatMoney(monthlyPayment)} on ${date}. Remaining documented balance: ₱${formatMoney(balance)}.`
            : `${title} requires ₱${formatMoney(monthlyPayment)} on ${date}. This is an ongoing monthly obligation.`,
        impactBreakdown: [
          {
            direction: "out",
            amount: monthlyPayment,
            remainingBalance: balance,
            source: "debt_obligation",
          },
        ],
        source: DEBT_OBLIGATION_SCHEDULE_SOURCE,
        debtObligationId: id,
        debt_obligation_id: id,
        derived: true,
        editable: false,
      }));
    });
}

export function isFinancialCardScheduleProjection(event = {}) {
  const id = cleanText(event.id);
  const source = cleanText(event.source).toLowerCase();
  return (
    id.startsWith(SAVINGS_GOAL_ID_PREFIX) ||
    id.startsWith(DEBT_OBLIGATION_ID_PREFIX) ||
    source === SAVINGS_GOAL_SCHEDULE_SOURCE ||
    source === DEBT_OBLIGATION_SCHEDULE_SOURCE
  );
}

export async function syncFinancialCardSchedulesIntoCalendar(user = null) {
  if (typeof window === "undefined" || !window.localStorage) {
    return { changed: false, savingsGoalEvents: [], debtEvents: [] };
  }

  const financeLocalUserId = getEffectiveDemoFinanceLocalUserId();
  const [savingsGoals, debtObligations] = await Promise.all([
    getSavingsGoals(financeLocalUserId),
    getDebtObligations(financeLocalUserId),
  ]);

  const savingsGoalEvents = buildSavingsGoalScheduleProjection(savingsGoals);
  const debtEvents = buildDebtObligationScheduleProjection(debtObligations);
  const currentEvents = readPersistedScheduleEvents(user);
  const retainedEvents = currentEvents.filter(
    (event) => !isFinancialCardScheduleProjection(event)
  );
  const nextEvents = [...retainedEvents, ...savingsGoalEvents, ...debtEvents];
  const currentJson = JSON.stringify(currentEvents);
  const nextJson = JSON.stringify(nextEvents);
  const changed = currentJson !== nextJson;

  if (changed) {
    window.localStorage.setItem(getScheduleStorageKey(user), nextJson);
  }

  return {
    changed,
    savingsGoalEvents,
    debtEvents,
    financeLocalUserId,
    scheduleOwnerId: getRecurringCashFlowOwnerId(user),
  };
}
