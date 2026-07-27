const FALLBACK_INDEXED_DB_NAMES = [
  "clara",
  "clara-db",
  "clara_db",
  "clara-vault",
  "clara_vault",
  "clara-local-vault",
  "clara_local_vault",
  "clara_settings_db",
];

function deleteIndexedDatabase(name) {
  return new Promise((resolve) => {
    if (!name || typeof indexedDB === "undefined") {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    try {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = finish;
      request.onerror = finish;
      request.onblocked = finish;
    } catch (error) {
      console.warn(`[CLARA Device Reset] Could not delete IndexedDB database ${name}.`, error);
      finish();
    }
  });
}

async function clearIndexedDatabases() {
  if (typeof indexedDB === "undefined") return;

  const names = new Set(FALLBACK_INDEXED_DB_NAMES);

  if (typeof indexedDB.databases === "function") {
    try {
      const databases = await indexedDB.databases();
      databases.forEach((database) => {
        if (database?.name) names.add(database.name);
      });
    } catch (error) {
      console.warn("[CLARA Device Reset] IndexedDB enumeration was unavailable.", error);
    }
  }

  await Promise.all([...names].map(deleteIndexedDatabase));
}

async function clearCacheStorage() {
  if (typeof caches === "undefined") return;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  } catch (error) {
    console.warn("[CLARA Device Reset] Cache Storage could not be fully cleared.", error);
  }
}

function clearWebStorage() {
  try {
    window.localStorage?.clear();
  } catch (error) {
    console.warn("[CLARA Device Reset] localStorage could not be fully cleared.", error);
  }

  try {
    window.sessionStorage?.clear();
  } catch (error) {
    console.warn("[CLARA Device Reset] sessionStorage could not be fully cleared.", error);
  }
}

function clearCookies() {
  if (typeof document === "undefined" || !document.cookie) return;

  document.cookie.split(";").forEach((cookie) => {
    const separatorIndex = cookie.indexOf("=");
    const rawName = separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie;
    const name = rawName.trim();
    if (!name) return;

    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  });
}

async function clearLocalNotifications() {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const notifications = Array.isArray(pending?.notifications)
      ? pending.notifications
      : [];

    if (notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: notifications.map((notification) => ({ id: notification.id })),
      });
    }

    await LocalNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.warn("[CLARA Device Reset] Local notifications were not available to clear.", error);
  }
}

async function clearPushRegistration() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    if (typeof PushNotifications?.unregister === "function") {
      await PushNotifications.unregister();
    }
  } catch (error) {
    console.warn("[CLARA Device Reset] Push registration was not available to clear.", error);
  }
}

/**
 * Permanently clears CLARA data stored on the current device/origin only.
 *
 * This function intentionally performs no API mutation and no server-side
 * delete. PostgreSQL/account data that has already synchronized remains intact.
 * Unsynced local changes are intentionally discarded by this reset.
 */
export async function clearClaraDeviceData() {
  if (typeof window === "undefined") return;

  // Remove the login token, local vault records, settings, offline queue, and
  // every other CLARA value held in Web Storage on this app's isolated origin.
  clearWebStorage();
  clearCookies();

  await Promise.allSettled([
    clearIndexedDatabases(),
    clearCacheStorage(),
    clearLocalNotifications(),
    clearPushRegistration(),
  ]);
}
