const DB_NAME = "clara_local_notifications";
const DB_VERSION = 1;
const STORE_NAME = "notifications";
const RETENTION_DAYS = 90;

let databasePromise = null;

function requireUserId(userId) {
  const clean = String(userId || "").trim();
  if (!clean) throw new Error("A user ID is required for local notifications.");
  return clean;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: "id" });

      if (!store.indexNames.contains("userId")) {
        store.createIndex("userId", "userId", { unique: false });
      }
      if (!store.indexNames.contains("scopeKey")) {
        store.createIndex("scopeKey", "scopeKey", { unique: true });
      }
      if (!store.indexNames.contains("createdAt")) {
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error("Failed to open the notification database."));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("Notification storage upgrade is blocked by another tab."));
    };
  });

  return databasePromise;
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return `notification_${globalThis.crypto.randomUUID()}`;
  }
  return `notification_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function emitNotificationEvent(type, notification) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(type, {
      detail: { notification },
    })
  );
}

export async function getNotificationByDedupeKey(userId, dedupeKey) {
  const cleanUserId = requireUserId(userId);
  const cleanDedupeKey = String(dedupeKey || "").trim();
  if (!cleanDedupeKey) return null;

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  return requestToPromise(store.index("scopeKey").get(`${cleanUserId}:${cleanDedupeKey}`));
}

export async function createNotification(notification) {
  const userId = requireUserId(notification?.userId);
  const dedupeKey = String(notification?.dedupeKey || "").trim();
  if (!dedupeKey) throw new Error("Notification dedupeKey is required.");

  const scopeKey = `${userId}:${dedupeKey}`;
  const existing = await getNotificationByDedupeKey(userId, dedupeKey);
  if (existing) return { notification: existing, created: false };

  const next = {
    ...notification,
    id: notification.id || createId(),
    userId,
    dedupeKey,
    scopeKey,
    createdAt: notification.createdAt || new Date().toISOString(),
    readAt: notification.readAt || null,
    dismissedAt: notification.dismissedAt || null,
    actedAt: notification.actedAt || null,
    deliveredAt: notification.deliveredAt || null,
    snoozedUntil: notification.snoozedUntil || null,
  };

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).add(next);

  try {
    await transactionToPromise(transaction);
    emitNotificationEvent("clara:notification-created", next);
    return { notification: next, created: true };
  } catch (error) {
    const racedExisting = await getNotificationByDedupeKey(userId, dedupeKey);
    if (racedExisting) return { notification: racedExisting, created: false };
    throw error;
  }
}

export async function listNotifications(userId, options = {}) {
  const cleanUserId = requireUserId(userId);
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const rows = await requestToPromise(store.index("userId").getAll(cleanUserId));
  let notifications = Array.isArray(rows) ? rows : [];

  if (options.unreadOnly) {
    notifications = notifications.filter((item) => !item.readAt && !item.dismissedAt);
  }
  if (options.undeliveredOnly) {
    notifications = notifications.filter((item) => !item.deliveredAt && !item.dismissedAt);
  }

  notifications.sort((left, right) =>
    new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

  const limit = Number(options.limit);
  return Number.isFinite(limit) && limit > 0 ? notifications.slice(0, limit) : notifications;
}

export async function getUnreadNotificationCount(userId) {
  const notifications = await listNotifications(userId, { unreadOnly: true });
  return notifications.length;
}

async function updateNotification(userId, notificationId, patch) {
  const cleanUserId = requireUserId(userId);
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const existing = await requestToPromise(store.get(notificationId));

  if (!existing || existing.userId !== cleanUserId) {
    await transactionToPromise(transaction);
    return null;
  }

  const updated = { ...existing, ...patch };
  store.put(updated);
  await transactionToPromise(transaction);
  emitNotificationEvent("clara:notification-updated", updated);
  return updated;
}

export function markNotificationRead(userId, notificationId) {
  return updateNotification(userId, notificationId, { readAt: new Date().toISOString() });
}

export function markNotificationDelivered(userId, notificationId) {
  return updateNotification(userId, notificationId, {
    deliveredAt: new Date().toISOString(),
    snoozedUntil: null,
  });
}

export function markNotificationActed(userId, notificationId) {
  const now = new Date().toISOString();
  return updateNotification(userId, notificationId, { actedAt: now, readAt: now });
}

export function dismissNotification(userId, notificationId) {
  return updateNotification(userId, notificationId, { dismissedAt: new Date().toISOString() });
}

export function snoozeNotification(userId, notificationId, minutes = 30) {
  const duration = Math.max(Number(minutes) || 30, 1);
  return updateNotification(userId, notificationId, {
    snoozedUntil: new Date(Date.now() + duration * 60_000).toISOString(),
  });
}

export async function cleanupOldNotifications(userId, retentionDays = RETENTION_DAYS) {
  const cleanUserId = requireUserId(userId);
  const cutoff = Date.now() - Math.max(Number(retentionDays) || RETENTION_DAYS, 1) * 86_400_000;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const rows = await requestToPromise(store.index("userId").getAll(cleanUserId));
  let removed = 0;

  (rows || []).forEach((item) => {
    const createdAt = new Date(item.createdAt || 0).getTime();
    if (
      createdAt < cutoff &&
      (item.readAt || item.dismissedAt || item.actedAt || item.deliveredAt)
    ) {
      store.delete(item.id);
      removed += 1;
    }
  });

  await transactionToPromise(transaction);
  return removed;
}
