import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
  isStoredTokenLive,
  readJwtPayload,
} from "@/lib/clara-backend-client";
import { addLocalDays, getEligibleDayKey } from "@/lib/challenge-schedule.js";
import { createDailyCheckInEvent } from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInEngine.js";
import { loadState, writeState } from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence.js";

const DAILY_CHECK_IN_STORAGE_PREFIX = "clara_daily_check_in_v3:";
const DAILY_CHECK_IN_UPDATE_EVENT = "clara:daily-check-in-updated";
const LAST_SENT_PREFIX = "clara:challenge-streak:last-sent:v1:";
const ADMIN_RESTORE_APPLIED_PREFIX = "clara:challenge-streak:admin-restore-applied:v1:";
const ADMIN_RESTORE_SOURCE = "admin_streak_recovery";
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
let syncPromise = null;
let queuedSync = false;

function safeStorage() {
  try {
    return window?.localStorage || null;
  } catch {
    return null;
  }
}

function getAuthenticatedIdentity() {
  const token = getStoredBackendToken();
  if (!isStoredTokenLive(token)) return null;

  const storedUser = getStoredBackendUser();
  const payload = readJwtPayload(token);
  const userId = storedUser?.id ?? payload?.userId ?? payload?.user_id ?? null;
  if (userId === null || userId === undefined || String(userId).trim() === "") {
    return null;
  }

  return { token, userId: String(userId) };
}

function readChallengeState(userId) {
  try {
    const raw = safeStorage()?.getItem(`${DAILY_CHECK_IN_STORAGE_PREFIX}${userId}`) || "";
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function hasChallengeActivity(state) {
  return Boolean(
    state?.challengeStartDay ||
    state?.completedThirtyDays ||
    state?.lastResetAt ||
    state?.lastCheckInDay ||
    Number(state?.currentStreak || 0) > 0
  );
}

function finiteInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function sanitizeSnapshot(state) {
  return {
    challengeStartDay: state?.challengeStartDay || null,
    challengeEndDay: state?.challengeEndDay || null,
    challengeCurrentDay: Math.min(30, finiteInteger(state?.challengeCurrentDay)),
    completedCheckInDays: Math.min(30, finiteInteger(state?.completedCheckInDays)),
    currentStreak: finiteInteger(state?.currentStreak),
    longestStreak: finiteInteger(state?.longestStreak),
    lifetimeCheckIns: finiteInteger(state?.lifetimeCheckIns),
    lastCheckInDay: state?.lastCheckInDay || state?.lastCheckInDate || null,
    completedThirtyDays: Boolean(state?.completedThirtyDays),
    completedThirtyDaysAt: state?.completedThirtyDaysAt || null,
    lastResetAt: state?.lastResetAt || null,
    lastResetForDay: state?.lastResetForDay || state?.lastResetForDate || null,
    clientUpdatedAt: state?.updatedAt || null,
  };
}

function lastSentKey(userId) {
  return `${LAST_SENT_PREFIX}${userId}`;
}

function readLastSent(userId) {
  try {
    return safeStorage()?.getItem(lastSentKey(userId)) || "";
  } catch {
    return "";
  }
}

function writeLastSent(userId, fingerprint) {
  try {
    safeStorage()?.setItem(lastSentKey(userId), fingerprint);
  } catch {
    // Tracking must never interrupt the CLARA experience.
  }
}

function appliedAdminRestoreKey(userId) {
  return `${ADMIN_RESTORE_APPLIED_PREFIX}${userId}`;
}

function readAppliedAdminRestoreVersion(userId) {
  try {
    return finiteInteger(safeStorage()?.getItem(appliedAdminRestoreKey(userId)), 0);
  } catch {
    return 0;
  }
}

function writeAppliedAdminRestoreVersion(userId, version) {
  try {
    safeStorage()?.setItem(appliedAdminRestoreKey(userId), String(version));
  } catch {
    // The restore is still safe to retry if the acknowledgement cannot persist.
  }
}

function restoredEvents(userId, endDay, streak) {
  if (!endDay || streak < 1) return [];
  return Array.from({ length: streak }, (_, index) => {
    const eligibleDay = addLocalDays(endDay, -(streak - 1 - index));
    return createDailyCheckInEvent({
      userId,
      eligibleDay,
      source: ADMIN_RESTORE_SOURCE,
    });
  });
}

async function applyPendingAdminStreakRestore(identity) {
  let serverState = null;
  try {
    serverState = await backendRequest("/api/users/me/challenge-streak", {
      token: identity.token,
      timeoutMs: 8000,
    });
  } catch {
    return;
  }

  const restoreVersion = finiteInteger(serverState?.admin_restore_version, 0);
  if (restoreVersion < 1) return;
  if (readAppliedAdminRestoreVersion(identity.userId) >= restoreVersion) return;

  const requestedStreak = finiteInteger(serverState?.admin_restore_streak, 0);
  const todayKey = getEligibleDayKey();
  const localState = loadState(identity.userId, todayKey);
  const localStreak = finiteInteger(localState?.currentStreak, 0);

  // Recovery is intentionally non-destructive. If the device already has a
  // higher real streak, acknowledge the admin request without lowering it.
  if (requestedStreak <= localStreak) {
    writeAppliedAdminRestoreVersion(identity.userId, restoreVersion);
    return;
  }

  const completedToday = Array.isArray(localState?.completedDates)
    && localState.completedDates.includes(todayKey);
  const endDay = completedToday ? todayKey : addLocalDays(todayKey, -1);
  const recoveryEvents = restoredEvents(identity.userId, endDay, requestedStreak);
  const recoveryStartDay = recoveryEvents[0]?.eligibleDay || null;
  const updatedAt = new Date().toISOString();

  const writeResult = writeState(
    identity.userId,
    {
      ...localState,
      checkInEvents: [...(localState?.checkInEvents || []), ...recoveryEvents],
      completedDates: [
        ...(localState?.completedDates || []),
        ...recoveryEvents.map((event) => event.eligibleDay),
      ],
      challengeStartDay: localState?.challengeStartDay || recoveryStartDay,
      cycleStartedAt: localState?.challengeStartDay || recoveryStartDay,
      longestStreak: Math.max(finiteInteger(localState?.longestStreak), requestedStreak),
      lifetimeCheckIns: Math.max(finiteInteger(localState?.lifetimeCheckIns), requestedStreak),
      updatedAt,
    },
    "admin_streak_recovery",
    todayKey,
  );

  if (writeResult.ok) {
    writeAppliedAdminRestoreVersion(identity.userId, restoreVersion);
  }
}

async function performSync({ force = false } = {}) {
  const identity = getAuthenticatedIdentity();
  if (!identity || navigator?.onLine === false) return;

  await applyPendingAdminStreakRestore(identity);

  const state = readChallengeState(identity.userId);
  if (!state || !hasChallengeActivity(state)) return;

  const snapshot = sanitizeSnapshot(state);
  const fingerprint = JSON.stringify(snapshot);
  if (!force && readLastSent(identity.userId) === fingerprint) return;

  await backendRequest("/api/users/me/challenge-streak", {
    method: "POST",
    token: identity.token,
    timeoutMs: 8000,
    body: snapshot,
  });

  writeLastSent(identity.userId, fingerprint);
}

async function syncChallengeStreak(options = {}) {
  if (syncPromise) {
    queuedSync = true;
    return syncPromise;
  }

  syncPromise = performSync(options)
    .catch(() => {
      // Streak reporting is best-effort metadata sync. Local streak behavior
      // remains authoritative for the user experience if the backend is offline.
    })
    .finally(() => {
      syncPromise = null;
      if (queuedSync) {
        queuedSync = false;
        window.setTimeout(() => void syncChallengeStreak(), 0);
      }
    });

  return syncPromise;
}

function handleDailyCheckInUpdated(event) {
  const identity = getAuthenticatedIdentity();
  if (!identity) return;
  const eventUserId = event?.detail?.userId;
  if (eventUserId && String(eventUserId) !== identity.userId) return;
  void syncChallengeStreak({ force: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener(DAILY_CHECK_IN_UPDATE_EVENT, handleDailyCheckInUpdated);
  window.addEventListener("online", () => void syncChallengeStreak({ force: true }));
  window.addEventListener("pageshow", () => void syncChallengeStreak());

  [1000, 5000, 15000].forEach((delay) => {
    window.setTimeout(() => void syncChallengeStreak(), delay);
  });

  window.setInterval(() => void syncChallengeStreak(), RETRY_INTERVAL_MS);
}
