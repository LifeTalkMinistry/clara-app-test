const PROFILE_KEY_PREFIX = "clara_local_account_profile_v1:";
const LOCAL_SETUP_KEY = "clara_local_setup_profile_v1";

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function safeParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function profileKey(localUserId) {
  const id = String(localUserId || "").trim();
  if (!id) throw new Error("localUserId is required for the local CLARA profile.");
  return `${PROFILE_KEY_PREFIX}${id}`;
}

function readLocalLifeSetup(localUserId) {
  const storage = getStorage();
  if (!storage) return null;

  return (
    safeParse(storage.getItem(`clara_me_life_setup:${localUserId}`)) ||
    safeParse(storage.getItem(LOCAL_SETUP_KEY)) ||
    null
  );
}

function hasCompletedSetup(lifeSetup) {
  if (!lifeSetup || typeof lifeSetup !== "object") return false;

  return Boolean(
    lifeSetup.completed ||
      lifeSetup.isComplete ||
      lifeSetup.onboarding_completed ||
      lifeSetup.has_completed_universal_onboarding ||
      lifeSetup.life_stage ||
      lifeSetup.lifeStage
  );
}

export function getLocalAccountProfile(localUserId) {
  const storage = getStorage();
  const stored = safeParse(storage?.getItem(profileKey(localUserId)), {});
  const lifeSetup = stored?.clara_life_setup || readLocalLifeSetup(localUserId);
  const completed = hasCompletedSetup(lifeSetup);

  return {
    id: localUserId,
    full_name: stored?.full_name || stored?.display_name || "CLARA User",
    display_name: stored?.display_name || stored?.full_name || "CLARA User",
    phone: stored?.phone || "",
    email: null,
    role: "user",
    clara_life_setup: lifeSetup,
    onboarding_completed:
      stored?.onboarding_completed ?? completed,
    onboarding_step: Number(stored?.onboarding_step ?? 0),
    has_completed_universal_onboarding:
      stored?.has_completed_universal_onboarding ?? completed,
    has_seen_universal_onboarding:
      stored?.has_seen_universal_onboarding ?? completed,
    program_onboarding_completed:
      stored?.program_onboarding_completed ?? completed,
    has_completed_program_onboarding:
      stored?.has_completed_program_onboarding ?? completed,
    created_at: stored?.created_at || new Date().toISOString(),
    updated_at: stored?.updated_at || new Date().toISOString(),
  };
}

export function saveLocalAccountProfile(localUserId, patch = {}) {
  const storage = getStorage();
  const current = getLocalAccountProfile(localUserId);
  const timestamp = new Date().toISOString();
  const nextLifeSetup =
    patch?.clara_life_setup ?? current?.clara_life_setup ?? readLocalLifeSetup(localUserId);
  const completed = hasCompletedSetup(nextLifeSetup);

  const next = {
    ...current,
    ...patch,
    id: localUserId,
    email: null,
    role: "user",
    full_name:
      String(patch?.full_name ?? patch?.display_name ?? current?.full_name ?? "CLARA User").trim() ||
      "CLARA User",
    display_name:
      String(patch?.display_name ?? patch?.full_name ?? current?.display_name ?? "CLARA User").trim() ||
      "CLARA User",
    clara_life_setup: nextLifeSetup,
    onboarding_completed:
      patch?.onboarding_completed ?? current?.onboarding_completed ?? completed,
    has_completed_universal_onboarding:
      patch?.has_completed_universal_onboarding ??
      current?.has_completed_universal_onboarding ??
      completed,
    has_seen_universal_onboarding:
      patch?.has_seen_universal_onboarding ??
      current?.has_seen_universal_onboarding ??
      completed,
    program_onboarding_completed:
      patch?.program_onboarding_completed ??
      current?.program_onboarding_completed ??
      completed,
    has_completed_program_onboarding:
      patch?.has_completed_program_onboarding ??
      current?.has_completed_program_onboarding ??
      completed,
    created_at: current?.created_at || timestamp,
    updated_at: timestamp,
  };

  storage?.setItem(profileKey(localUserId), JSON.stringify(next));
  window?.dispatchEvent?.(
    new CustomEvent("clara-local-profile-updated", {
      detail: { localUserId },
    })
  );
  console.info("[CLARA Local Profile] profile saved", { localUserId });
  return next;
}

export function clearLocalAccountProfile(localUserId, { clearSetup = true } = {}) {
  const id = String(localUserId || "").trim();
  if (!id) throw new Error("localUserId is required for the local CLARA profile reset.");

  const storage = getStorage();
  storage?.removeItem(profileKey(id));

  if (clearSetup) {
    storage?.removeItem(`clara_me_life_setup:${id}`);
    storage?.removeItem(LOCAL_SETUP_KEY);
  }

  window?.dispatchEvent?.(
    new CustomEvent("clara-local-profile-updated", {
      detail: { localUserId: id, cleared: true },
    })
  );
}

export function buildLocalMembershipProfile(localUser, localProfile, entitlementProfile = {}) {
  return {
    ...localProfile,
    ...entitlementProfile,
    id: localUser?.id || localProfile?.id || null,
    email: null,
    role: "user",
    full_name:
      localProfile?.full_name || localUser?.user_metadata?.full_name || "CLARA User",
    display_name:
      localProfile?.display_name || localUser?.user_metadata?.display_name || "CLARA User",
    is_local_user: true,
  };
}

export { PROFILE_KEY_PREFIX };
