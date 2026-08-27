import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
  isBackendNetworkError,
  isStoredTokenLive,
  readJwtPayload,
} from "@/lib/clara-backend-client";

const SESSION_WINDOW_MS = 30 * 60 * 1000;
const INTEGRITY_HEARTBEAT_MS = 5 * 60 * 1000;
const STATE_KEY_PREFIX = "clara:app-open-state:v1:";
const QUEUE_KEY = "clara:app-open-queue:v1";
const LIFECYCLE_KEY = "clara:app-lifecycle:v1";
const INSTALLATION_KEY = "clara:competition-install-id:v1";
const DAILY_CHECK_IN_STORAGE_PREFIX = "clara_daily_check_in_v3:";
const DAILY_CHECK_IN_UPDATE_EVENT = "clara:daily-check-in-updated";
const LAST_DEVICE_TRANSFER_KEY = "clara_last_device_transfer_v1";
const MEANS_BASELINE_PREFIX = "clara:means-cycle-baseline:";
const MEANS_TRANSFER_REBUILD_MARKER_PREFIX = "clara:means-transfer-baseline-rebuilt:v1:";
const MAX_QUEUED_EVENTS = 20;
const MAX_COMPETITION_CHECK_INS = 45;
let flushPromise = null;
let integrityHeartbeatPromise = null;
let memoryInstallationId = "";

function safeStorage(kind = "localStorage") {
  try {
    return window?.[kind] || null;
  } catch {
    return null;
  }
}

function readJson(storage, key, fallback) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Tracking must never interrupt the user experience.
  }
}

function clearTransferredMeansBaselineOnce() {
  const storage = safeStorage();
  if (!storage) return;

  const transfer = readJson(storage, LAST_DEVICE_TRANSFER_KEY, null);
  const recoveryId = String(transfer?.recoveryId || "").trim();
  if (!recoveryId) return;

  const markerKey = `${MEANS_TRANSFER_REBUILD_MARKER_PREFIX}${recoveryId}`;
  try {
    if (storage.getItem(markerKey)) return;
  } catch {
    return;
  }

  const staleKeys = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(MEANS_BASELINE_PREFIX)) staleKeys.push(key);
    }
    staleKeys.forEach((key) => storage.removeItem(key));
    storage.setItem(
      markerKey,
      JSON.stringify({
        recoveryId,
        rebuiltAt: new Date().toISOString(),
        removedBaselineKeys: staleKeys.length,
      })
    );
  } catch {
    // If storage is temporarily unavailable, a later heartbeat retries safely.
  }
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2);
  return `clara_${Date.now().toString(36)}_${random}_${random}`.slice(0, 80);
}

function getInstallationId() {
  const storage = safeStorage();
  let installationId = "";
  try {
    installationId = storage?.getItem(INSTALLATION_KEY) || "";
  } catch {
    installationId = "";
  }

  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(installationId)) {
    installationId = memoryInstallationId || makeId();
    memoryInstallationId = installationId;
    try {
      storage?.setItem(INSTALLATION_KEY, installationId);
    } catch {
      // In-memory fallback is enough for the current app lifecycle.
    }
  }

  return installationId;
}

function getLifecycleId() {
  const storage = safeStorage("sessionStorage");
  let lifecycleId = storage?.getItem(LIFECYCLE_KEY) || "";
  if (!lifecycleId) {
    lifecycleId = makeId();
    try {
      storage?.setItem(LIFECYCLE_KEY, lifecycleId);
    } catch {
      // A fresh in-memory ID still lets this launch be counted once.
    }
  }
  return lifecycleId;
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

function detectPlatform() {
  try {
    const capacitor = globalThis.Capacitor || window?.Capacitor;
    if (capacitor?.isNativePlatform?.()) {
      const nativePlatform = String(capacitor?.getPlatform?.() || "").toLowerCase();
      if (nativePlatform === "android") return "android_native";
      if (nativePlatform === "ios") return "ios_native";
    }
  } catch {
    // Fall through to browser/PWA detection.
  }

  const userAgent = String(navigator?.userAgent || "").toLowerCase();
  const standalone = Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
      navigator?.standalone === true
  );

  if (standalone && /iphone|ipad|ipod/.test(userAgent)) return "ios_pwa";
  if (standalone && /android/.test(userAgent)) return "android_pwa";
  if (standalone) return "web_pwa";
  return "web";
}

function stateKey(userId) {
  return `${STATE_KEY_PREFIX}${userId}`;
}

function readCompetitionCheckInEvents(userId) {
  const state = readJson(
    safeStorage(),
    `${DAILY_CHECK_IN_STORAGE_PREFIX}${userId}`,
    null,
  );
  const events = Array.isArray(state?.checkInEvents) ? state.checkInEvents : [];

  return events
    .filter((event) => event?.eventType === "daily_check_in" || !event?.eventType)
    .slice(-MAX_COMPETITION_CHECK_INS)
    .map((event) => ({
      eventId: typeof event?.eventId === "string" ? event.eventId : "",
      eligibleDay: typeof event?.eligibleDay === "string" ? event.eligibleDay : "",
      source: typeof event?.source === "string" ? event.source : "daily_money_tip",
      clientOccurredAt:
        typeof event?.clientOccurredAt === "string"
          ? event.clientOccurredAt
          : typeof event?.createdAt === "string"
            ? event.createdAt
            : null,
    }))
    .filter((event) => event.eventId && /^\d{4}-\d{2}-\d{2}$/.test(event.eligibleDay));
}

function integrityPayload(identity, platform) {
  return {
    platform,
    installationId: getInstallationId(),
    clientTime: new Date().toISOString(),
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    checkInEvents: readCompetitionCheckInEvents(identity.userId),
  };
}

function readQueue() {
  const queue = readJson(safeStorage(), QUEUE_KEY, []);
  return Array.isArray(queue) ? queue.slice(-MAX_QUEUED_EVENTS) : [];
}

function writeQueue(queue) {
  writeJson(safeStorage(), QUEUE_KEY, queue.slice(-MAX_QUEUED_EVENTS));
}

function enqueueOpen(event) {
  const queue = readQueue();
  if (
    !queue.some(
      (item) =>
        item?.userId === event.userId && item?.sessionId === event.sessionId
    )
  ) {
    queue.push(event);
    writeQueue(queue);
  }
}

async function flushQueuedOpens() {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    const identity = getAuthenticatedIdentity();
    if (!identity || navigator?.onLine === false) return;

    const queue = readQueue();
    if (!queue.length) return;

    const remaining = [];
    for (const item of queue) {
      if (String(item?.userId || "") !== identity.userId) {
        remaining.push(item);
        continue;
      }

      try {
        await backendRequest("/api/users/me/app-open", {
          method: "POST",
          token: identity.token,
          timeoutMs: 8000,
          body: {
            sessionId: item.sessionId,
            ...integrityPayload(identity, item.platform),
          },
        });
      } catch (error) {
        const shouldRetry =
          isBackendNetworkError(error) ||
          [404, 429, 502, 503, 504].includes(Number(error?.status));
        if (shouldRetry) remaining.push(item);
      }
    }

    writeQueue(remaining);
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

async function syncCompetitionIntegrity() {
  if (integrityHeartbeatPromise) return integrityHeartbeatPromise;

  integrityHeartbeatPromise = (async () => {
    const identity = getAuthenticatedIdentity();
    if (!identity || navigator?.onLine === false) return;

    const storage = safeStorage();
    const state = readJson(storage, stateKey(identity.userId), null);
    const sessionId = state?.sessionId;
    if (!sessionId) {
      registerVisibleOpen();
      return;
    }

    await backendRequest("/api/users/me/app-open", {
      method: "POST",
      token: identity.token,
      timeoutMs: 8000,
      body: {
        sessionId,
        ...integrityPayload(identity, state.platform || detectPlatform()),
      },
    });
  })()
    .catch(() => {
      // Competition integrity is best-effort while offline. The next heartbeat
      // retries the receipt without interrupting the normal CLARA experience.
    })
    .finally(() => {
      integrityHeartbeatPromise = null;
    });

  return integrityHeartbeatPromise;
}

function markHidden() {
  const identity = getAuthenticatedIdentity();
  if (!identity) return;

  const storage = safeStorage();
  const key = stateKey(identity.userId);
  const state = readJson(storage, key, null);
  if (!state?.sessionId) return;

  writeJson(storage, key, {
    ...state,
    lastHiddenAt: Date.now(),
    lastSeenAt: Date.now(),
  });
}

function registerVisibleOpen() {
  if (document.visibilityState === "hidden") return;

  // Device-transfer finance records are authoritative; any transferred Means baseline
  // is only derived cache and must be rebuilt once on the receiving device.
  clearTransferredMeansBaselineOnce();

  const identity = getAuthenticatedIdentity();
  if (!identity) return;

  const storage = safeStorage();
  const key = stateKey(identity.userId);
  const now = Date.now();
  const lifecycleId = getLifecycleId();
  const previous = readJson(storage, key, null);
  const lastSeenAt = Number(previous?.lastSeenAt || 0);
  const lastHiddenAt = Number(previous?.lastHiddenAt || 0);
  const newLifecycle = previous?.lifecycleId !== lifecycleId;
  const staleSession = !lastSeenAt || now - lastSeenAt >= SESSION_WINDOW_MS;
  const longBackground = lastHiddenAt && now - lastHiddenAt >= SESSION_WINDOW_MS;
  const shouldStartSession =
    !previous?.sessionId || newLifecycle || staleSession || longBackground;
  const sessionId = shouldStartSession ? makeId() : previous.sessionId;
  const platform = detectPlatform();

  getInstallationId();

  writeJson(storage, key, {
    sessionId,
    lifecycleId,
    platform,
    startedAt: shouldStartSession ? now : previous.startedAt || now,
    lastSeenAt: now,
    lastHiddenAt: null,
  });

  if (shouldStartSession) {
    enqueueOpen({
      userId: identity.userId,
      sessionId,
      platform,
      queuedAt: new Date(now).toISOString(),
    });
  }

  void flushQueuedOpens();
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") markHidden();
  else {
    registerVisibleOpen();
    void syncCompetitionIntegrity();
  }
}

function handleDailyCheckInUpdated(event) {
  const identity = getAuthenticatedIdentity();
  if (!identity) return;
  const eventUserId = event?.detail?.userId;
  if (eventUserId && String(eventUserId) !== identity.userId) return;
  void syncCompetitionIntegrity();
}

function runHeartbeat() {
  registerVisibleOpen();
  void syncCompetitionIntegrity();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pageshow", runHeartbeat);
  window.addEventListener("focus", runHeartbeat);
  window.addEventListener("online", () => {
    void flushQueuedOpens();
    void syncCompetitionIntegrity();
  });
  window.addEventListener(DAILY_CHECK_IN_UPDATE_EVENT, handleDailyCheckInUpdated);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runHeartbeat, { once: true });
  } else {
    runHeartbeat();
  }

  [1000, 5000, 15000].forEach((delay) => {
    window.setTimeout(runHeartbeat, delay);
  });
  window.setInterval(runHeartbeat, INTEGRITY_HEARTBEAT_MS);
}
