import { getLocalDateKey } from "@/lib/challenge-schedule";
import { migrateSessionIdentityState } from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence";
import {
  ENTITLEMENT_KEY_PREFIX,
  getLocalGooglePlayEntitlement,
  saveLocalGooglePlayEntitlement,
} from "@/lib/local-google-play-entitlement";
import { PROFILE_KEY_PREFIX } from "@/lib/local-profile-repository";
import { LEGACY_ACTIVE_LOCAL_VAULT_KEY } from "@/lib/local-user-identity";

const LEGACY_IDS = ["local-dev-user", "local-user"];
const MEMORY_PREFIX = "clara_memory_";
const LIFE_SETUP_PREFIX = "clara_me_life_setup:";
const MIGRATION_PREFIX = "clara_local_identity_storage_migration_v3:";

function storage() {
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

function copyJsonKey(sourceKey, destinationKey, transform = (value) => value) {
  const store = storage();
  if (!store || !sourceKey || !destinationKey || sourceKey === destinationKey) return false;
  const source = parse(store.getItem(sourceKey));
  if (source === null || source === undefined) return false;
  if (!store.getItem(destinationKey)) {
    store.setItem(destinationKey, JSON.stringify(transform(source)));
  }
  return true;
}

function mergeMemories(sourceId, destinationId) {
  const store = storage();
  if (!store) return false;
  const sourceKey = `${MEMORY_PREFIX}${sourceId}`;
  const destinationKey = `${MEMORY_PREFIX}${destinationId}`;
  const source = parse(store.getItem(sourceKey), []);
  if (!Array.isArray(source) || source.length === 0) return false;
  const destination = parse(store.getItem(destinationKey), []);
  const merged = [...(Array.isArray(destination) ? destination : [])];
  const signatures = new Set(
    merged.map((item) => `${item?.id || ""}|${item?.category || ""}|${item?.content || ""}`)
  );
  source.forEach((item) => {
    const signature = `${item?.id || ""}|${item?.category || ""}|${item?.content || ""}`;
    if (!signatures.has(signature)) {
      signatures.add(signature);
      merged.push(item);
    }
  });
  store.setItem(destinationKey, JSON.stringify(merged));
  store.removeItem(sourceKey);
  return true;
}

function migrateEntitlement(sourceId, destinationId) {
  const store = storage();
  if (!store) return false;
  const sourceKey = `${ENTITLEMENT_KEY_PREFIX}${sourceId}`;
  const source = parse(store.getItem(sourceKey));
  if (!source) return false;

  const destination = getLocalGooglePlayEntitlement(destinationId);
  const destinationHasSignal = destination?.state && destination.state !== "inactive";
  const sourceHasSignal = source?.state && source.state !== "inactive";

  if (!destinationHasSignal && sourceHasSignal) {
    saveLocalGooglePlayEntitlement(destinationId, {
      ...source,
      localUserId: destinationId,
    });
  }
  store.removeItem(sourceKey);
  return true;
}

function migrateIdentityKeyedStorage(sourceId, destinationId) {
  const store = storage();
  if (!store || !sourceId || sourceId === destinationId) return 0;
  const keys = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key && key.includes(sourceId)) keys.push(key);
  }

  let migrated = 0;
  keys.forEach((sourceKey) => {
    if (
      sourceKey.startsWith(PROFILE_KEY_PREFIX) ||
      sourceKey.startsWith(MEMORY_PREFIX) ||
      sourceKey.startsWith(ENTITLEMENT_KEY_PREFIX) ||
      sourceKey.startsWith("clara_daily_check_in_v2:")
    ) {
      return;
    }

    const destinationKey = sourceKey.replace(sourceId, destinationId);
    if (!store.getItem(destinationKey)) {
      const value = store.getItem(sourceKey);
      if (value !== null) store.setItem(destinationKey, value);
    }
    store.removeItem(sourceKey);
    migrated += 1;
  });
  return migrated;
}

export async function migrateLegacyLocalIdentityStorage(canonicalLocalUserId) {
  const canonicalId = String(canonicalLocalUserId || "").trim();
  const store = storage();
  if (!canonicalId || !store) return { status: "skipped", migrated: 0 };

  const markerKey = `${MIGRATION_PREFIX}${canonicalId}`;
  const existingMarker = parse(store.getItem(markerKey));
  if (existingMarker?.status === "completed") return existingMarker;

  const oldActiveId = String(store.getItem(LEGACY_ACTIVE_LOCAL_VAULT_KEY) || "").trim();
  const sourceIds = [...new Set(LEGACY_IDS.filter((id) => id !== canonicalId))];
  if (LEGACY_IDS.includes(oldActiveId) && oldActiveId !== canonicalId) {
    sourceIds.push(oldActiveId);
  }

  let migrated = 0;
  for (const sourceId of [...new Set(sourceIds)]) {
    if (
      copyJsonKey(
        `${PROFILE_KEY_PREFIX}${sourceId}`,
        `${PROFILE_KEY_PREFIX}${canonicalId}`,
        (profile) => ({ ...profile, id: canonicalId, email: null, role: "user" })
      )
    ) {
      store.removeItem(`${PROFILE_KEY_PREFIX}${sourceId}`);
      migrated += 1;
    }

    if (
      copyJsonKey(
        `${LIFE_SETUP_PREFIX}${sourceId}`,
        `${LIFE_SETUP_PREFIX}${canonicalId}`
      )
    ) {
      store.removeItem(`${LIFE_SETUP_PREFIX}${sourceId}`);
      migrated += 1;
    }

    if (mergeMemories(sourceId, canonicalId)) migrated += 1;
    if (migrateEntitlement(sourceId, canonicalId)) migrated += 1;

    const checkInResult = migrateSessionIdentityState(
      sourceId,
      canonicalId,
      getLocalDateKey()
    );
    if (checkInResult?.migrated) migrated += 1;

    migrated += migrateIdentityKeyedStorage(sourceId, canonicalId);
  }

  if (store.getItem("clara_active_memory_user_id")) {
    store.setItem("clara_active_memory_user_id", canonicalId);
  }
  if (LEGACY_IDS.includes(oldActiveId)) {
    store.removeItem(LEGACY_ACTIVE_LOCAL_VAULT_KEY);
  }

  const marker = {
    status: "completed",
    canonicalLocalUserId: canonicalId,
    sourceIds: [...new Set(sourceIds)],
    migrated,
    migratedAt: new Date().toISOString(),
  };
  store.setItem(markerKey, JSON.stringify(marker));
  return marker;
}
