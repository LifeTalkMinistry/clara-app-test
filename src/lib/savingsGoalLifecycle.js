const normalize = (value) => String(value ?? "").trim().toLowerCase();

const COMPLETED_STATES = new Set([
  "completed",
  "complete",
  "fulfilled",
  "consumed",
]);

const INACTIVE_STATES = new Set([
  ...COMPLETED_STATES,
  "deleted",
  "archived",
  "cancelled",
  "canceled",
]);

const SAVED_AMOUNT_KEYS = [
  "saved_amount",
  "savedAmount",
  "current_amount",
  "currentAmount",
  "current_saved_amount",
  "currentSavedAmount",
  "saved",
  "current",
  "amount_saved",
  "amountSaved",
  "progress_amount",
  "progressAmount",
];

export function getSavingsGoalActivity(goal = {}) {
  const source =
    goal?.savingsActivityLog ??
    goal?.savings_activity_log ??
    goal?.activityLog ??
    goal?.activity_log ??
    [];

  return Array.isArray(source) ? source.filter(Boolean) : [];
}

export function getSavingsGoalSavedAmount(goal = {}) {
  for (const key of SAVED_AMOUNT_KEYS) {
    const value = goal?.[key];
    if (value === undefined || value === null || value === "") continue;
    const parsed = Number(String(value).replace(/[₱,\s]/g, ""));
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }

  return null;
}

export function hasLegacySavingsCompletionEvidence(goal = {}) {
  const saved = getSavingsGoalSavedAmount(goal);
  if (saved === null || saved > 0) return false;

  return getSavingsGoalActivity(goal).some((entry) => {
    const type = normalize(
      entry?.type ?? entry?.action ?? entry?.event_type ?? entry?.eventType,
    );
    return type === "use" || type === "complete" || type === "completed";
  });
}

export function isSavingsGoalCompleted(goal = {}) {
  if (!goal || typeof goal !== "object") return false;

  const lifecycleState = normalize(
    goal?.completion_status ?? goal?.completionStatus ?? goal?.status,
  );

  return Boolean(
    goal?.completedAt ||
      goal?.completed_at ||
      goal?.fulfilled === true ||
      goal?.consumed === true ||
      COMPLETED_STATES.has(lifecycleState) ||
      hasLegacySavingsCompletionEvidence(goal)
  );
}

export function isSavingsGoalActive(goal = {}) {
  if (!goal || typeof goal !== "object") return false;
  if (isSavingsGoalCompleted(goal)) return false;

  const lifecycleState = normalize(
    goal?.completion_status ?? goal?.completionStatus ?? goal?.status,
  );

  return !Boolean(
    goal?.deletedAt ||
      goal?.deleted_at ||
      goal?.archived === true ||
      goal?.is_archived === true ||
      goal?.isArchived === true ||
      goal?.cancelled === true ||
      goal?.canceled === true ||
      INACTIVE_STATES.has(lifecycleState)
  );
}

export function getSavingsGoalLifecycleReason(goal = {}) {
  if (!goal || typeof goal !== "object") return "invalid";
  if (hasLegacySavingsCompletionEvidence(goal)) return "legacy_consumed";
  if (isSavingsGoalCompleted(goal)) return "completed";
  if (isSavingsGoalActive(goal)) return "active";
  return "inactive";
}
