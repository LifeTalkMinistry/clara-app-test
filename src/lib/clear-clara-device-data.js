import { pauseOnlineSyncAfterDeviceReset } from "./cloud-sync-policy";
import { createLocalVaultId, setLocalVaultId } from "./local-user-identity";
import { closeLocalFinanceDb, LOCAL_FINANCE_DB_NAME } from "./localFinanceStore";

const FALLBACK_INDEXED_DB_NAMES = [
  LOCAL_FINANCE_DB_NAME,
  "clara_behavioral_memory_db",
  "clara_local_notifications",
  "clara",
  "clara-db",
  "clara_db",
  "clara-vault",
  "clara_vault",
  "clara-local-vault",
  "clara_local_vault",
  "clara_settings_db",
];

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

async function clearIndexedDatabaseContents(name) {
  if (!name || typeof indexedDB === "undefined") return;

  await new Promise((resolve) => {
    let openedExistingDatabase = true;
    const request = indexedDB.open(name);

    request.onupgradeneeded = () => {
      // This fallback name did not exist before the reset. Do not create data in it.
      openedExistingDatabase = false;
    };

    request.onerror = () => resolve();
    request.onblocked = () => resolve();
    request.onsuccess = async () => {
      const db = request.result;
      try {
        const storeNames = Array.from(db.objectStoreNames || []);
        if (!openedExistingDatabase || storeNames.length === 0) return;

        const transaction = db.transaction(storeNames, "readwrite");
        const transactionDone = new Promise((done) => {
          transaction.oncomplete = () => done();
          transaction.onerror = () => done();
          transaction.onabort = () => done();
        });

        await Promise.all(
          storeNames.map((storeName) => requestToPromise(transaction.objectStore(storeName).clear()))
        );
        await transactionDone;
      } catch (error) {
        console.warn(`[CLARA Device Reset] Could not clear IndexedDB database ${name}.`, error);
      } finally {
        db.close?.();
        resolve();
      }
    };
  });
}

function deleteIndexedDatabase(name) {
  return new Promise((resolve) => {
    if (!name || typeof indexedDB === "undefined") {
      resolve(false);
      return;
    }

    try {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      request.onblocked = () => {
        // The records have already been cleared above. A blocked schema deletion
        // is therefore not allowed to make the reset appear as though data remains.
        console.warn(`[CLARA Device Reset] IndexedDB deletion is blocked for ${name}; contents were cleared instead.`);
        resolve(false);
      };
    } catch (error) {
      console.warn(`[CLARA Device Reset] Could not delete IndexedDB database ${name}.`, error);
      resolve(false);
    }
  });
}

async function clearIndexedDatabases() {
  if (typeof indexedDB === "undefined") return;

  // CLARA keeps the finance database connection cached for normal runtime use.
  // Close it first so deletion is not blocked by CLARA itself.
  try {
    await closeLocalFinanceDb();
  } catch (error) {
    console.warn("[CLARA Device Reset] Finance database connection could not be closed cleanly.", error);
  }

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

  // Clear records first. This still succeeds when another connection prevents
  // deleteDatabase() from removing the database schema immediately.
  for (const name of names) {
    await clearIndexedDatabaseContents(name);
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
 * Online finance sync remains paused after the reset until the user explicitly
 * chooses Sync online data from Settings.
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

  // A reset must also sever the account from any old local vault that might
  // survive because of a browser/WebView storage edge case. Establish a brand-
  // new local vault identity now, before login is allowed again. While Online
  // Sync is paused, account login is forced to use this exact empty vault.
  const freshVaultId = createLocalVaultId();
  setLocalVaultId(freshVaultId);
  pauseOnlineSyncAfterDeviceReset({ freshVaultId });

  return { freshVaultId };
}
