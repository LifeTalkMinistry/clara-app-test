import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
  isStoredTokenLive,
  readJwtPayload,
} from "@/lib/clara-backend-client";

const DAILY_CHECK_IN_STORAGE_PREFIX = "clara_daily_check_in_v3:";
const DAILY_CHECK_IN_UPDATE_EVENT = "clara:daily-check-in-updated";
const LAST_SENT_PREFIX = "clara:challenge-streak:last-sent:v1:";
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

async function performSync({ force = false } = {}) {
  const identity = getAuthenticatedIdentity();
  if (!identity || navigator?.onLine === false) return;

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
