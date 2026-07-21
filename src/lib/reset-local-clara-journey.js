import { clearMemories } from "@/lib/ai/clara-memory";
import {
  clearLocalSetupProfile,
  LOCAL_SETUP_PROFILE_KEY_PREFIX,
} from "@/lib/claraLocalProfile";
import { clearLocalUserVault } from "@/lib/localFinanceStore";
import {
  clearDeveloperMembershipPreview,
} from "@/lib/membership";
import {
  clearAccessSnapshot,
  clearOfflineQueue,
} from "@/lib/offline-access-cache";
import {
  clearLocalAccountProfile,
} from "@/lib/local-profile-repository";
import {
  clearLocalGooglePlayEntitlement,
} from "@/lib/local-google-play-entitlement";
import {
  getOrCreateLocalVaultId,
  LEGACY_ACTIVE_LOCAL_VAULT_KEY,
} from "@/lib/local-user-identity";
import {
  clearDailyCheckInState,
} from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence";

const LEGACY_LOCAL_IDS = ["local-dev-user", "local-user"];
const PROFILE_PREFIX = "clara_local_account_profile_v1:";
const ENTITLEMENT_PREFIX = "clara_google_play_entitlement_v1:";

const ALWAYS_CLEAR_KEYS = [
  "CLARA_USER_CONTEXT_STORY_V1",
  "CLARA_LIVE_USER_MESSAGE_HISTORY",
  "clara_behavioral_memory_v1",
  "clara_active_memory_user_id",
  "clara_daily_check_in_v1",
  "clara_daily_check_in_v1_migrated_to",
  "clara_local_setup_profile_v1",
  "clara_offline_queue_v1",
];

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

function removeKey(storage, key) {
  try {
    storage?.removeItem(key);
  } catch (error) {
    console.warn(`[CLARA Reset] unable to remove ${key}`, error);
  }
}

function clearScopedLocalStorage(localUserIds) {
  const storage = getStorage();
  if (!storage) return;

  ALWAYS_CLEAR_KEYS.forEach((key) => removeKey(storage, key));

  localUserIds.forEach((localUserId) => {
    clearDailyCheckInState(localUserId);
    clearLocalSetupProfile({ id: localUserId });
    removeKey(storage, `clara_memory_${localUserId}`);
    removeKey(storage, `clara_me_life_setup:${localUserId}`);
    removeKey(storage, `${PROFILE_PREFIX}${localUserId}`);
  });

  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }

  keys.forEach((key) => {
    const belongsToKnownIdentity = localUserIds.some((id) => key.includes(id));
    const resettablePrefix = RESETTABLE_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (belongsToKnownIdentity && resettablePrefix) removeKey(storage, key);
  });

  removeKey(storage, LEGACY_ACTIVE_LOCAL_VAULT_KEY);
}

export async function resetLocalClaraJourney({
  localUserId = getOrCreateLocalVaultId(),
  preserveEntitlement = true,
} = {}) {
  const canonicalId = String(localUserId || "").trim() || getOrCreateLocalVaultId();
  const localUserIds = [...new Set([canonicalId, ...LEGACY_LOCAL_IDS])];

  clearDeveloperMembershipPreview();
  clearOfflineQueue();

  for (const userId of localUserIds) {
    try {
      await clearLocalUserVault(userId);
    } catch (error) {
      console.warn("[CLARA Reset] local finance vault clear skipped", {
        userId,
        message: error?.message || String(error),
      });
    }

    clearMemories(userId);
    clearAccessSnapshot(userId);

    try {
      clearLocalAccountProfile(userId, { clearSetup: true });
    } catch (error) {
      console.warn("[CLARA Reset] local profile clear skipped", {
        userId,
        message: error?.message || String(error),
      });
    }

    if (!preserveEntitlement) {
      clearLocalGooglePlayEntitlement(userId);
    }
  }

  clearScopedLocalStorage(localUserIds);
  clearAccessSnapshot();

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
