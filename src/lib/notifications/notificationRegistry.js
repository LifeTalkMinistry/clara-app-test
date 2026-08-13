export const NOTIFICATION_CATEGORIES = Object.freeze({
  DAILY_CHECK_IN: "daily_check_in",
  EXPENSE_LOGGING: "expense_logging",
  WEEKLY_REVIEW: "weekly_money_review",
  MONEY: "budget_and_money",
  GOALS: "goals_and_financial_progress",
  BILLS: "bills_and_obligations",
  STREAKS: "streaks_and_challenge",
  COACHING_SCHEDULE: "coaching_and_schedule",
  COMMUNITY: "community_and_accountability",
  ACCOUNT_UPDATES: "account_and_clara_updates",
});

const event = ({ category, severity = "info", optional = true, active = false }) =>
  Object.freeze({ category, severity, optional, active });

export const NOTIFICATION_EVENTS = Object.freeze({
  // 1. Daily Check-In
  daily_check_in_reminder: event({ category: NOTIFICATION_CATEGORIES.DAILY_CHECK_IN }),
  daily_check_in_incomplete: event({ category: NOTIFICATION_CATEGORIES.DAILY_CHECK_IN, severity: "warning" }),

  // 2. Expense Logging
  // Historic event name retained because existing runtime/server delivery already
  // uses it for expense-log reminders.
  daily_money_check_in: event({ category: NOTIFICATION_CATEGORIES.EXPENSE_LOGGING, active: true }),

  // 3. Weekly Money Review
  weekly_review_ready: event({ category: NOTIFICATION_CATEGORIES.WEEKLY_REVIEW, active: true }),
  monthly_review_ready: event({ category: NOTIFICATION_CATEGORIES.WEEKLY_REVIEW }),

  // 4. Budget & Money Alerts
  budget_near_limit: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning", active: true }),
  budget_exceeded: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "critical", active: true }),
  protected_money_risk: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "critical" }),
  uncovered_purchase: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning" }),
  unusual_spending_jump: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning" }),
  money_left_low: event({ category: NOTIFICATION_CATEGORIES.MONEY, severity: "warning" }),

  // 5. Goals & Financial Progress
  savings_goal_milestone: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "success", active: true }),
  savings_goal_completed: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "success", active: true }),
  savings_goal_off_track: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "warning" }),
  emergency_fund_milestone: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "success" }),
  debt_payoff_milestone: event({ category: NOTIFICATION_CATEGORIES.GOALS, severity: "success" }),

  // 6. Bills & Obligations
  bill_due_soon: event({ category: NOTIFICATION_CATEGORIES.BILLS, severity: "warning" }),
  bill_due_today: event({ category: NOTIFICATION_CATEGORIES.BILLS, severity: "critical" }),
  bill_overdue: event({ category: NOTIFICATION_CATEGORIES.BILLS, severity: "critical" }),
  obligation_due_soon: event({ category: NOTIFICATION_CATEGORIES.BILLS, severity: "warning" }),
  obligation_due_today: event({ category: NOTIFICATION_CATEGORIES.BILLS, severity: "critical" }),

  // 7. Streaks & 30-Day Challenge
  streak_at_risk: event({ category: NOTIFICATION_CATEGORIES.STREAKS, severity: "critical" }),
  streak_milestone: event({ category: NOTIFICATION_CATEGORIES.STREAKS, severity: "success" }),
  challenge_daily_action_due: event({ category: NOTIFICATION_CATEGORIES.STREAKS, severity: "warning" }),
  challenge_milestone: event({ category: NOTIFICATION_CATEGORIES.STREAKS, severity: "success" }),
  challenge_completed: event({ category: NOTIFICATION_CATEGORIES.STREAKS, severity: "success" }),
  challenge_result_ready: event({ category: NOTIFICATION_CATEGORIES.STREAKS }),
  achievement_unlocked: event({ category: NOTIFICATION_CATEGORIES.STREAKS, severity: "success" }),

  // 8. Coaching & Schedule
  today_task_ready: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE, active: true }),
  task_still_incomplete: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE, severity: "warning", active: true }),
  task_deadline_near: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE, severity: "warning" }),
  new_assignment: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE }),
  coach_feedback_received: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE }),
  program_week_unlocked: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE }),
  coaching_session_reminder: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE, severity: "warning" }),
  schedule_event_upcoming: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE, severity: "info", active: true }),
  schedule_event_today: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE, severity: "warning", active: true }),
  schedule_money_event_due: event({ category: NOTIFICATION_CATEGORIES.COACHING_SCHEDULE, severity: "warning", active: true }),

  // 9. Community & Accountability
  community_reply: event({ category: NOTIFICATION_CATEGORIES.COMMUNITY }),
  community_mention: event({ category: NOTIFICATION_CATEGORIES.COMMUNITY }),
  community_reaction: event({ category: NOTIFICATION_CATEGORIES.COMMUNITY }),
  circle_activity: event({ category: NOTIFICATION_CATEGORIES.COMMUNITY }),
  accountability_nudge: event({ category: NOTIFICATION_CATEGORIES.COMMUNITY, severity: "warning" }),

  // 10. Account & CLARA Updates
  // Security/account notices are non-optional. Product communication within the
  // same family remains user-controllable through `productUpdates`.
  new_device_login: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "critical", optional: false }),
  password_changed: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "critical", optional: false }),
  payment_confirmed: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "success", optional: false }),
  payment_failed: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "critical", optional: false }),
  plan_activated: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "success", optional: false }),
  plan_expiring: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "warning", optional: false }),
  account_action_required: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "critical", optional: false }),
  privacy_terms_update: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "warning", optional: false }),
  major_feature_released: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES }),
  maintenance_notice: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES, severity: "warning" }),
  learning_material_added: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES }),
  general_announcement: event({ category: NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES }),
});

const CATEGORY_PREFERENCE_KEYS = Object.freeze({
  [NOTIFICATION_CATEGORIES.DAILY_CHECK_IN]: "dailyCheckIn",
  [NOTIFICATION_CATEGORIES.EXPENSE_LOGGING]: "expenseLogging",
  [NOTIFICATION_CATEGORIES.WEEKLY_REVIEW]: "weeklyMoneyReview",
  [NOTIFICATION_CATEGORIES.MONEY]: "moneyAlerts",
  [NOTIFICATION_CATEGORIES.GOALS]: "goalsAndReviews",
  [NOTIFICATION_CATEGORIES.BILLS]: "billsAndObligations",
  [NOTIFICATION_CATEGORIES.STREAKS]: "streaksAndChallenge",
  [NOTIFICATION_CATEGORIES.COMMUNITY]: "communityAndAccountability",
  [NOTIFICATION_CATEGORIES.ACCOUNT_UPDATES]: "productUpdates",
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

  if (definition.category === NOTIFICATION_CATEGORIES.COACHING_SCHEDULE) {
    return preferences?.tasksAndCoaching !== false && preferences?.scheduleAndCalendar !== false;
  }

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
