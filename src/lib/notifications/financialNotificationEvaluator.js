import { buildClaraBudgetSnapshot } from "@/lib/clara-budget-snapshot";
import {
  getSavingsSaved,
  getSavingsTarget,
} from "@/components/dashboard/dashboardFinanceSelectors";
import {
  buildNotificationContract,
  isNotificationEventAllowed,
} from "@/lib/notifications/notificationRegistry";
import {
  createNotification,
  getNotificationByDedupeKey,
} from "@/lib/notifications/localNotificationRepository";

const SAVINGS_MILESTONES = [25, 50, 75, 100];
const WEEKLY_REVIEW_EVENT_TYPE = "weekly_review_ready";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function numberFrom(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Math.max(numberFrom(value), 0));
}

function cleanKey(value, fallback = "item") {
  const clean = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || fallback;
}

function budgetPeriodKey(snapshot) {
  const start = String(snapshot?.monthRange?.start || "").slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(start)) return start;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function createBudgetNotifications({ userId, preferences, budgets, expenses }) {
  if (!preferences.moneyAlerts) return [];

  const snapshot = buildClaraBudgetSnapshot({ budgets, expenses });
  if (!snapshot?.hasDeclaredBudget || !Array.isArray(snapshot.categories)) return [];

  const periodKey = budgetPeriodKey(snapshot);
  const created = [];

  for (const category of snapshot.categories) {
    const allocated = numberFrom(category.allocated);
    const spent = numberFrom(category.spent);
    if (allocated <= 0 || spent <= 0) continue;

    const percent = (spent / allocated) * 100;
    const categoryName = String(category.name || category.title || "Budget").trim() || "Budget";
    const categoryKey = cleanKey(category.id || category.key || categoryName, "budget");

    if (percent >= 100 && isNotificationEventAllowed("budget_exceeded", preferences)) {
      const dedupeKey = `budget_exceeded:${categoryKey}:${periodKey}`;
      const notification = buildNotificationContract({
        eventType: "budget_exceeded",
        dedupeKey,
        title: `${categoryName} budget exceeded`,
        body: `You have spent ${money(spent - allocated)} beyond your ${categoryName} budget this month.`,
        userId,
        destination: "/budgets",
        metadata: {
          budgetId: category.id || null,
          categoryName,
          periodKey,
          percentUsed: Math.round(percent),
        },
      });
      const result = await createNotification(notification);
      if (result.created) created.push(result.notification);
      continue;
    }

    if (percent >= 80 && isNotificationEventAllowed("budget_near_limit", preferences)) {
      const dedupeKey = `budget_near_limit:${categoryKey}:${periodKey}`;
      const notification = buildNotificationContract({
        eventType: "budget_near_limit",
        dedupeKey,
        title: `${categoryName} budget is getting close`,
        body: `You have used ${Math.round(percent)}% of your ${categoryName} budget. ${money(allocated - spent)} remains.`,
        userId,
        destination: "/budgets",
        metadata: {
          budgetId: category.id || null,
          categoryName,
          periodKey,
          percentUsed: Math.round(percent),
        },
      });
      const result = await createNotification(notification);
      if (result.created) created.push(result.notification);
    }
  }

  return created;
}

function goalIdentity(goal, index) {
  return cleanKey(
    goal?.id || goal?.goal_id || goal?.local_id || goal?.name || goal?.title || `goal-${index + 1}`,
    `goal-${index + 1}`
  );
}

async function createSavingsNotifications({ userId, preferences, savingsGoals }) {
  if (!preferences.goalsAndReviews || !Array.isArray(savingsGoals)) return [];

  const created = [];

  for (let index = 0; index < savingsGoals.length; index += 1) {
    const goal = savingsGoals[index];
    const saved = getSavingsSaved(goal);
    const target = getSavingsTarget(goal);
    if (target <= 0 || saved <= 0) continue;

    const percent = Math.min((saved / target) * 100, 100);
    const reached = [...SAVINGS_MILESTONES].reverse().find((milestone) => percent >= milestone);
    if (!reached) continue;

    const goalKey = goalIdentity(goal, index);
    const goalName = String(goal?.name || goal?.title || "Savings goal").trim() || "Savings goal";
    const eventType = reached === 100 ? "savings_goal_completed" : "savings_goal_milestone";
    if (!isNotificationEventAllowed(eventType, preferences)) continue;

    const dedupeKey = `${eventType}:${goalKey}:${reached}`;
    const existing = await getNotificationByDedupeKey(userId, dedupeKey);
    if (existing) continue;

    const notification = buildNotificationContract({
      eventType,
      dedupeKey,
      title: reached === 100 ? `${goalName} completed` : `${goalName} reached ${reached}%`,
      body:
        reached === 100
          ? `You reached your ${money(target)} goal. Keep protecting the progress you built.`
          : `You have saved ${money(saved)} toward your ${money(target)} target.`,
      userId,
      destination: "/savings-goals",
      metadata: {
        goalId: goal?.id || null,
        goalName,
        milestone: reached,
        percentComplete: Math.round(percent),
      },
    });

    const result = await createNotification(notification);
    if (result.created) created.push(result.notification);
  }

  return created;
}

function safeTimezone(value) {
  const timezone = String(value || "").trim() || "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "UTC";
  }
}

function weeklyDateParts(timezone, date = new Date()) {
  const safeZone = safeTimezone(timezone);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone,
    weekday: "short",
  }).format(date);

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    dayIndex: Math.max(WEEKDAY_LABELS.indexOf(weekday), 0),
  };
}

function addDays(dateKey, amount) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function weeklyRange(dateKey, dayIndex) {
  const daysSinceMonday = dayIndex === 0 ? 6 : dayIndex - 1;
  const weekStartKey = addDays(dateKey, -daysSinceMonday);
  const weekEndKey = addDays(weekStartKey, 6);
  return { weekStartKey, weekEndKey };
}

function reviewDay(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : 0;
}

function reviewTimeMinutes(value) {
  const match = String(value || "20:00").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 20 * 60;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return 20 * 60;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 20 * 60;
  return hours * 60 + minutes;
}

function weeklyExpenseDateKey(expense, timezone) {
  const value = expense?.date
    || expense?.created_at
    || expense?.createdAt
    || expense?.spent_at
    || expense?.logged_at
    || expense?.transaction_date
    || expense?.transactionDate;
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return weeklyDateParts(timezone, parsed).dateKey;
}

function weeklyExpenseAmount(expense) {
  return numberFrom(
    expense?.amount
    ?? expense?.total
    ?? expense?.value
    ?? expense?.expense_amount
    ?? expense?.spent_amount
    ?? expense?.price
  );
}

function weeklyExpenseCategory(expense) {
  return String(
    expense?.budget_category
    || expense?.expense_category
    || expense?.category
    || expense?.budgetCategory
    || expense?.category_name
    || expense?.type
    || "Uncategorized"
  ).trim() || "Uncategorized";
}

function weeklyExpenseStatus(expense) {
  return String(
    expense?.planning_status
    || expense?.budget_status
    || expense?.plan_status
    || expense?.budgetStatus
    || expense?.status
    || weeklyExpenseCategory(expense)
    || ""
  ).toLowerCase();
}

function weeklyBudgetStatus(budgets, expenses) {
  try {
    const snapshot = buildClaraBudgetSnapshot({ budgets, expenses });
    if (!snapshot?.hasDeclaredBudget) return "no_declared_budget";
    const categories = Array.isArray(snapshot.categories) ? snapshot.categories : [];
    return {
      hasDeclaredBudget: true,
      categoryCount: categories.length,
      exceededCount: categories.filter((item) => numberFrom(item.spent) > numberFrom(item.allocated)).length,
    };
  } catch {
    return "unavailable";
  }
}

export async function evaluateWeeklyMoneyReviewNotification({
  userId,
  preferences,
  budgets = [],
  expenses = [],
  savingsGoals = [],
  walletTransactions = [],
  emergencyFund = null,
} = {}) {
  if (!userId) return [];
  if (preferences?.weeklyMoneyReview === false) return [];
  if (!isNotificationEventAllowed(WEEKLY_REVIEW_EVENT_TYPE, preferences)) return [];

  const timezone = safeTimezone(preferences?.timezone);
  const today = weeklyDateParts(timezone);
  if (today.dayIndex !== reviewDay(preferences?.weeklyMoneyReviewDay)) return [];
  if (today.minutes < reviewTimeMinutes(preferences?.weeklyMoneyReviewTime)) return [];

  const { weekStartKey, weekEndKey } = weeklyRange(today.dateKey, today.dayIndex);
  if (!weekStartKey || !weekEndKey) return [];

  const totalsByCategory = new Map();
  let totalSpentThisWeek = 0;
  let unplannedOrUndocumentedSpent = 0;

  (Array.isArray(expenses) ? expenses : []).forEach((expense) => {
    if (!expense || typeof expense !== "object") return;
    if (expense.deletedAt || expense.deleted_at) return;
    const dateKey = weeklyExpenseDateKey(expense, timezone);
    if (!dateKey || dateKey < weekStartKey || dateKey > weekEndKey) return;
    const amount = weeklyExpenseAmount(expense);
    if (amount <= 0) return;
    const category = weeklyExpenseCategory(expense);
    totalSpentThisWeek += amount;
    totalsByCategory.set(category, (totalsByCategory.get(category) || 0) + amount);
    if (/unplanned|undocumented/.test(weeklyExpenseStatus(expense))) {
      unplannedOrUndocumentedSpent += amount;
    }
  });

  const biggestCategory = [...totalsByCategory.entries()].sort((left, right) => right[1] - left[1])[0] || ["None yet", 0];
  const savingsSummary = (Array.isArray(savingsGoals) ? savingsGoals : []).reduce(
    (summary, goal) => ({
      savingsSaved: summary.savingsSaved + getSavingsSaved(goal),
      savingsTarget: summary.savingsTarget + getSavingsTarget(goal),
    }),
    { savingsSaved: 0, savingsTarget: 0 }
  );
  const body = unplannedOrUndocumentedSpent > 0
    ? `You spent ${money(totalSpentThisWeek)} this week, including ${money(unplannedOrUndocumentedSpent)} outside your plan. Review your leaks and next move.`
    : totalSpentThisWeek > 0
      ? `You spent ${money(totalSpentThisWeek)} this week. Biggest category: ${biggestCategory[0]}. Review your leaks, progress, and next move.`
      : "CLARA needs more records, but your weekly money check is ready when you are.";

  const notification = buildNotificationContract({
    eventType: WEEKLY_REVIEW_EVENT_TYPE,
    dedupeKey: `${WEEKLY_REVIEW_EVENT_TYPE}:${weekStartKey}:${weekEndKey}`,
    title: "Your Weekly Money Review is ready",
    body,
    userId,
    destination: "/dashboard",
    metadata: {
      weekStartKey,
      weekEndKey,
      totalSpentThisWeek,
      biggestCategoryName: biggestCategory[0],
      biggestCategoryAmount: biggestCategory[1],
      unplannedOrUndocumentedSpent,
      budgetStatus: weeklyBudgetStatus(budgets, expenses),
      savingsSaved: savingsSummary.savingsSaved,
      savingsTarget: savingsSummary.savingsTarget,
      reviewKind: "weekly_money_review",
    },
  });

  const result = await createNotification(notification);
  return result.created ? [result.notification] : [];
}

export async function evaluateFinancialNotifications({
  userId,
  preferences,
  budgets = [],
  expenses = [],
  savingsGoals = [],
} = {}) {
  if (!userId) return [];

  const [budgetNotifications, savingsNotifications] = await Promise.all([
    createBudgetNotifications({ userId, preferences, budgets, expenses }),
    createSavingsNotifications({ userId, preferences, savingsGoals }),
  ]);

  return [...budgetNotifications, ...savingsNotifications];
}
