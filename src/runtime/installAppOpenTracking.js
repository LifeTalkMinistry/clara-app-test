import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
  isBackendNetworkError,
  isStoredTokenLive,
  readJwtPayload,
} from "@/lib/clara-backend-client";

const SESSION_WINDOW_MS = 30 * 60 * 1000;
const STATE_KEY_PREFIX = "clara:app-open-state:v1:";
const QUEUE_KEY = "clara:app-open-queue:v1";
const LIFECYCLE_KEY = "clara:app-lifecycle:v1";
const MAX_QUEUED_EVENTS = 20;
let flushPromise = null;

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

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2);
  return `clara_${Date.now().toString(36)}_${random}_${random}`.slice(0, 80);
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
            platform: item.platform,
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
  else registerVisibleOpen();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pageshow", registerVisibleOpen);
  window.addEventListener("focus", registerVisibleOpen);
  window.addEventListener("online", flushQueuedOpens);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerVisibleOpen, { once: true });
  } else {
    registerVisibleOpen();
  }

  [1000, 5000, 15000].forEach((delay) => {
    window.setTimeout(registerVisibleOpen, delay);
  });
  window.setInterval(registerVisibleOpen, 60 * 1000);
}
