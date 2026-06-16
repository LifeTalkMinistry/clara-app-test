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
import { evaluateScheduleNotifications } from "@/lib/notifications/scheduleNotificationEvaluator";

const SAVINGS_MILESTONES = [25, 50, 75, 100];

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

export async function evaluateFinancialNotifications({
  userId,
  preferences,
  budgets = [],
  expenses = [],
  savingsGoals = [],
} = {}) {
  if (!userId) return [];

  const [budgetNotifications, savingsNotifications, scheduleNotifications] = await Promise.all([
    createBudgetNotifications({ userId, preferences, budgets, expenses }),
    createSavingsNotifications({ userId, preferences, savingsGoals }),
    evaluateScheduleNotifications({ userId, preferences }),
  ]);

  return [...budgetNotifications, ...savingsNotifications, ...scheduleNotifications];
}
