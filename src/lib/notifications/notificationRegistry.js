export const NOTIFICATION_CATEGORIES = Object.freeze({
  MONEY: "money_alerts",
  DAILY: "daily_check_in",
  GOALS: "goals_and_reviews",
  TASKS: "tasks_and_coaching",
  ACCOUNT: "account_and_service",
  PRODUCT: "product_communication",
});

const event = ({ category, severity = "info", optional = true, active = false }) =>
  Object.freeze({ category, severity, optional, active });

export const NOTIFICATION_EVENTS = Object.freeze({
  budget_near_limit: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning", active: true }),
  budget_exceeded: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "critical", active: true }),
  protected_money_risk: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "critical" }),
  uncovered_purchase: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning" }),
  unusual_spending_jump: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning" }),
  bill_due_soon: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning" }),
  bill_due_today: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "critical" }),
  bill_overdue: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "critical" }),

  daily_money_check_in: event({ category: NOTIFICATION_CATEGORIES.DAILY, active: true }),
  daily_check_in_incomplete: event({ category: NOTIFICATION_CATEGORIES.DAILY }),

  savings_goal_milestone: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "success", active: true }),
  savings_goal_completed: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "success", active: true }),
  savings_goal_off_track: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "warning" }),
  emergency_fund_milestone: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "success" }),
  weekly_review_ready: event({ category: NOTIFICATION_CATEGORIES.GOALS, active: true }),
  monthly_review_ready: event({ category: NOTIFICATION_CATEGORIES.GOALS }),

  today_task_ready: event({ category: NOTIFICATION_CATEGORIES.TASKS, active: true }),
  task_still_incomplete: event({ category: NOTIFICATION_CATEGORIES.TASKS, severity: "warning", active: true }),
  task_deadline_near: event({ category: NOTIFICATION_CATEGORIES.TASKS, severity: "warning" }),
  new_assignment: event({ category: NOTIFICATION_CATEGORIES.TASKS }),
  coach_feedback_received: event({ category: NOTIFICATION_CATEGORIES.TASKS }),
  program_week_unlocked: event({ category: NOTIFICATION_CATEGORIES.TASKS }),
  coaching_session_reminder: event({ category: NOTIFICATION_CATEGORIES.TASKS }),

  new_device_login: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "critical", optional: false }),
  password_changed: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "critical", optional: false }),
  payment_confirmed: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "success", optional: false }),
  payment_failed: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "critical", optional: false }),
  plan_activated: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "success", optional: false }),
  plan_expiring: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "warning", optional: false }),
  account_action_required: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "critical", optional: false }),
  privacy_terms_update: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT, severity: "warning", optional: false }),

  major_feature_released: event({ category: NOTIFICATION_CATEGORIES.PRODUCT }),
  maintenance_notice: event({ category: NOTIFICATION_CATEGORIES.PRODUCT, severity: "warning" }),
  learning_material_added: event({ category: NOTIFICATION_CATEGORIES.PRODUCT }),
  general_announcement: event({ category: NOTIFICATION_CATEGORIES.PRODUCT }),
});

const CATEGORY_PREFERENCE_KEYS = Object.freeze({
  [NOTIFICATION_CATEGORIES.MONEY]: "moneyAlerts",
  [NOTIFICATION_CATEGORIES.DAILY]: "dailyCheckIn",
  [NOTIFICATION_CATEGORIES.GOALS]: "goalsAndReviews",
  [NOTIFICATION_CATEGORIES.TASKS]: "tasksAndCoaching",
  [NOTIFICATION_CATEGORIES.PRODUCT]: "productUpdates",
});

export function getNotificationDefinition(eventType) {
  return NOTIFICATION_EVENTS[eventType] || null;
}

export function isNotificationEventActive(eventType) {
  return getNotificationDefinition(eventType)?.active === true;
}

export function isNotificationEventAllowed(eventType, preferences = {}) {
  const definition = getNotificationDefinition(eventType);
  if (!definition) return false;
  if (definition.optional === false) return true;

  const preferenceKey = CATEGORY_PREFERENCE_KEYS[definition.category];
  return preferenceKey ? preferences?.[preferenceKey] !== false : false;
}

export function buildNotificationContract({
  id = "",
  eventType,
  dedupeKey,
  title,
  body,
  createdAt = new Date().toISOString(),
  userId,
  channel = "in_app",
  destination = "",
  metadata = {},
  severity,
  readAt = null,
  dismissedAt = null,
  actedAt = null,
} = {}) {
  const definition = getNotificationDefinition(eventType);

  if (!definition) throw new Error(`Unknown notification event type: ${eventType || "missing"}`);
  if (!dedupeKey) throw new Error("Notification dedupeKey is required.");
  if (!title || !body) throw new Error("Notification title and body are required.");
  if (!userId) throw new Error("Notification userId is required.");

  return {
    id,
    eventType,
    category: definition.category,
    dedupeKey,
    title: String(title).trim(),
    body: String(body).trim(),
    severity: severity || definition.severity || "info",
    createdAt,
    userId: String(userId),
    channel,
    destination: destination || "",
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    readAt,
    dismissedAt,
    actedAt,
  };
}

export const ACTIVE_NOTIFICATION_EVENT_TYPES = Object.freeze(
  Object.entries(NOTIFICATION_EVENTS)
    .filter(([, definition]) => definition.active)
    .map(([eventType]) => eventType)
);

export const INACTIVE_NOTIFICATION_EVENT_TYPES = Object.freeze(
  Object.entries(NOTIFICATION_EVENTS)
    .filter(([, definition]) => !definition.active)
    .map(([eventType]) => eventType)
);
