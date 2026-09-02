import {
  getDebtBalance,
  getDebtDueDay,
  getDebtTitleValue,
  getMonthlyDebtPayment,
  isActiveDebtObligation,
} from "./debtObligationMath.js";
import {
  getRecurrenceOccurrences,
  toLocalDateKey,
} from "./recurringCashFlowRepository.js";
import { isFinancialOccurrenceOnOrAfterCreation } from "./clara-financial-day.js";
import { isSavingsGoalActive } from "./savingsGoalLifecycle.js";

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
    ).filter((date) => isFinancialOccurrenceOnOrAfterCreation(record, date));
  }

  const oneTimeDate = toLocalDateKey(record.dueDate || record.due_date || "");
  return oneTimeDate && isFinancialOccurrenceOnOrAfterCreation(record, oneTimeDate)
    ? [oneTimeDate]
    : [];
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

      const title = getDebtTitleValue(record);
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
