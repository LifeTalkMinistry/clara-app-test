import { clearMemories } from "@/lib/ai/clara-memory";
import {
  clearLocalSetupProfile,
  LOCAL_SETUP_PROFILE_KEY_PREFIX,
} from "@/lib/claraLocalProfile";
import { clearLocalUserVault } from "@/lib/localFinanceStore";
import { clearLocalAccountProfile } from "@/lib/local-profile-repository";
import { clearLocalGooglePlayEntitlement } from "@/lib/local-google-play-entitlement";
import { getOrCreateLocalVaultId } from "@/lib/local-user-identity";
import { clearDailyCheckInState } from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence";

const PROFILE_PREFIX = "clara_local_account_profile_v1:";
const ENTITLEMENT_PREFIX = "clara_google_play_entitlement_v1:";
const ACCESS_CACHE_PREFIX = "clara_access_snapshot_v2";
const ACCESS_CACHE_LAST_KEY = `${ACCESS_CACHE_PREFIX}:last`;
const OFFLINE_QUEUE_KEY = "clara_offline_queue_v1";

const RESETTABLE_PREFIXES = [
  "clara_dashboard_cache",
  "clara_dashboard_page",
  "clara_dashboard_runtime",
  "clara_finance_cache",
  "clara_life_profile",
  "clara_ai_financial_memory",
  "clara_private_preferences",
  "clara_user_context",
  "clara_live_user_message",
  "clara_buy_check_session",
  "clara_forecast_session",
  LOCAL_SETUP_PROFILE_KEY_PREFIX,
];

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function parse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function removeKey(storage, key) {
  try {
    storage?.removeItem(key);
  } catch (error) {
    console.warn(`[CLARA Reset] unable to remove ${key}`, error);
  }
}

function clearScopedOfflineQueue(storage, localUserId) {
  const queue = parse(storage?.getItem(OFFLINE_QUEUE_KEY), []);
  if (!Array.isArray(queue)) return;
  const filtered = queue.filter((item) => {
    const owner = String(
      item?.localUserId || item?.vaultId || item?.userId || item?.payload?.localUserId || ""
    ).trim();
    return owner && owner !== localUserId;
  });
  if (filtered.length) {
    storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } else {
    removeKey(storage, OFFLINE_QUEUE_KEY);
  }
}

function clearScopedAccessSnapshot(storage, localUserId) {
  removeKey(storage, `${ACCESS_CACHE_PREFIX}:${localUserId.toLowerCase()}`);
  const lastSnapshot = parse(storage?.getItem(ACCESS_CACHE_LAST_KEY));
  const lastOwner = String(lastSnapshot?.userId || "").trim();
  if (lastOwner === localUserId) removeKey(storage, ACCESS_CACHE_LAST_KEY);
}

function clearScopedLocalStorage(localUserId) {
  const storage = getStorage();
  if (!storage) return;

  clearDailyCheckInState(localUserId);
  clearLocalSetupProfile({ id: localUserId });
  removeKey(storage, `clara_memory_${localUserId}`);
  removeKey(storage, `clara_me_life_setup:${localUserId}`);
  removeKey(storage, `${PROFILE_PREFIX}${localUserId}`);
  clearScopedAccessSnapshot(storage, localUserId);
  clearScopedOfflineQueue(storage, localUserId);

  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }

  keys.forEach((key) => {
    const belongsToVault = key.includes(localUserId);
    const resettablePrefix = RESETTABLE_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (belongsToVault && resettablePrefix) removeKey(storage, key);
  });
}

export async function resetLocalClaraJourney({
  localUserId = getOrCreateLocalVaultId(),
  preserveEntitlement = true,
} = {}) {
  const canonicalId = String(localUserId || "").trim() || getOrCreateLocalVaultId();

  try {
    await clearLocalUserVault(canonicalId);
  } catch (error) {
    console.warn("[CLARA Reset] local finance vault clear skipped", {
      userId: canonicalId,
      message: error?.message || String(error),
    });
  }

  clearMemories(canonicalId);
  clearLocalSetupProfile({ id: canonicalId });
  clearDailyCheckInState(canonicalId);

  try {
    clearLocalAccountProfile(canonicalId, { clearSetup: true });
  } catch (error) {
    console.warn("[CLARA Reset] local profile clear skipped", {
      userId: canonicalId,
      message: error?.message || String(error),
    });
  }

  if (!preserveEntitlement) {
    clearLocalGooglePlayEntitlement(canonicalId);
  }

  clearScopedLocalStorage(canonicalId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("clara-local-journey-reset", {
        detail: { localUserId: canonicalId, preserveEntitlement },
      })
    );
  }

  return {
    ok: true,
    localUserId: canonicalId,
    preserveEntitlement,
  };
}

export { ENTITLEMENT_PREFIX };
