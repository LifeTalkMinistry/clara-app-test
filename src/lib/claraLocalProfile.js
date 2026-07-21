const LEGACY_LOCAL_SETUP_PROFILE_KEY = "clara_local_setup_profile_v1";
export const LOCAL_SETUP_PROFILE_KEY_PREFIX = "clara_local_setup_profile_v2:";
const LOCAL_VAULT_ID_KEY = "clara_local_vault_id_v1";
const ACTIVE_MEMORY_USER_ID_KEY = "clara_active_memory_user_id";
const MEMORY_STORAGE_PREFIX = "clara_memory_";

export const REQUIRED_LOCAL_SETUP_FIELDS = [
  "commitment_level",
  "lifestyle_context",
  "money_pressure_point",
  "spending_trigger",
  "spending_guidance_style",
  "guidance_intensity",
];

export const LOCAL_ONLY_PROFILE_FIELDS = new Set([
  "context",
  "onboarding_answers",
  "commitment_level",
  "lifestyle_context",
  "money_pressure_point",
  "spending_trigger",
  "spending_guidance_style",
  "guidance_intensity",
  "recommended_access_level",
  "onboarding_completed_at",
  "onboarding_completed",
  "has_completed_onboarding",
  "has_completed_universal_onboarding",
  "has_seen_universal_onboarding",
  "onboarding_step",
]);

const REQUIRED_MEMORY_CATEGORIES = [
  "onboarding_commitment",
  "onboarding_lifestyle_clarity",
  "onboarding_money_pressure",
  "onboarding_spending_trigger",
  "onboarding_guidance_style",
  "onboarding_guidance_intensity",
];

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function clean(value) {
  return String(value ?? "").trim();
}

function hasAllRequiredAnswers(answers = {}) {
  return REQUIRED_LOCAL_SETUP_FIELDS.every((field) => clean(answers?.[field]));
}

function readJson(key) {
  if (!isBrowser()) return null;
  return safeParse(window.localStorage.getItem(key));
}

export function resolveLocalSetupOwnerId(ownerLike = null) {
  if (typeof ownerLike === "string" || typeof ownerLike === "number") {
    return clean(ownerLike);
  }

  if (isPlainObject(ownerLike)) {
    return clean(
      ownerLike.local_vault_id ||
        ownerLike.localUserId ||
        ownerLike.id ||
        ownerLike.account_id ||
        ownerLike.server_user_id ||
        ownerLike.email
    );
  }

  if (!isBrowser()) return "";
  return clean(
    window.localStorage.getItem(LOCAL_VAULT_ID_KEY) ||
      window.localStorage.getItem(ACTIVE_MEMORY_USER_ID_KEY)
  );
}

export function getLocalSetupProfileKey(ownerLike = null) {
  const ownerId = resolveLocalSetupOwnerId(ownerLike);
  return ownerId ? `${LOCAL_SETUP_PROFILE_KEY_PREFIX}${ownerId}` : LEGACY_LOCAL_SETUP_PROFILE_KEY;
}

function migrateLegacySetupProfile(ownerLike = null) {
  if (!isBrowser()) return null;
  const ownerId = resolveLocalSetupOwnerId(ownerLike);
  if (!ownerId) return null;

  const scopedKey = `${LOCAL_SETUP_PROFILE_KEY_PREFIX}${ownerId}`;
  const scoped = readJson(scopedKey);
  if (isPlainObject(scoped)) return scoped;

  const legacy = readJson(LEGACY_LOCAL_SETUP_PROFILE_KEY);
  if (!isPlainObject(legacy)) return null;

  const migrated = {
    ...legacy,
    version: Math.max(Number(legacy.version) || 1, 2),
    owner_id: ownerId,
    migrated_at: new Date().toISOString(),
  };
  window.localStorage.setItem(scopedKey, JSON.stringify(migrated));
  window.localStorage.removeItem(LEGACY_LOCAL_SETUP_PROFILE_KEY);
  return migrated;
}

function getMemoryKeys(ownerLike = null) {
  if (!isBrowser()) return [];
  const ownerId = resolveLocalSetupOwnerId(ownerLike);
  return ownerId ? [`${MEMORY_STORAGE_PREFIX}${ownerId}`] : [];
}

function hasCompletedLocalMemorySetup(ownerLike = null) {
  const seenCategories = new Set();

  getMemoryKeys(ownerLike).forEach((key) => {
    const memories = readJson(key);
    if (!Array.isArray(memories)) return;

    memories.forEach((memory) => {
      const category = clean(memory?.category);
      const content = clean(memory?.content);
      if (category.startsWith("onboarding_") && content) seenCategories.add(category);
    });
  });

  return REQUIRED_MEMORY_CATEGORIES.every((category) => seenCategories.has(category));
}

function extractAnswers(payload = {}) {
  if (!isPlainObject(payload)) return {};

  const answers = isPlainObject(payload.onboarding_answers) ? { ...payload.onboarding_answers } : {};
  REQUIRED_LOCAL_SETUP_FIELDS.forEach((field) => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== "") {
      answers[field] = payload[field];
    }
  });

  return answers;
}

function isCompletionPayload(payload = {}) {
  return Boolean(
    payload?.onboarding_completed ||
      payload?.has_completed_onboarding ||
      payload?.has_completed_universal_onboarding ||
      payload?.has_seen_universal_onboarding ||
      payload?.onboarding_completed_at
  );
}

export function getLocalSetupProfile(ownerLike = null) {
  if (!isBrowser()) return null;
  const migrated = migrateLegacySetupProfile(ownerLike);
  if (isPlainObject(migrated)) return migrated;
  const parsed = readJson(getLocalSetupProfileKey(ownerLike));
  return isPlainObject(parsed) ? parsed : null;
}

export function saveLocalSetupProfile(data = {}, ownerLike = null) {
  if (!isBrowser() || !isPlainObject(data)) return null;

  const ownerId = resolveLocalSetupOwnerId(ownerLike);
  const previous = getLocalSetupProfile(ownerLike) || {};
  const previousAnswers = isPlainObject(previous.answers) ? previous.answers : {};
  const nextAnswers = isPlainObject(data.answers)
    ? { ...previousAnswers, ...data.answers }
    : previousAnswers;
  const completed = Boolean(data.completed ?? previous.completed ?? hasAllRequiredAnswers(nextAnswers));

  const nextProfile = {
    version: 2,
    owner_id: ownerId || null,
    answers: nextAnswers,
    recommended_access_level:
      clean(data.recommended_access_level) || clean(previous.recommended_access_level) || "free",
    completed,
    completed_at:
      data.completed_at || previous.completed_at || (completed ? new Date().toISOString() : null),
    updated_at: new Date().toISOString(),
  };

  window.localStorage.setItem(getLocalSetupProfileKey(ownerLike), JSON.stringify(nextProfile));
  window.dispatchEvent(
    new CustomEvent("clara-local-setup-profile-updated", {
      detail: { ...nextProfile, ownerId: ownerId || null },
    })
  );
  return nextProfile;
}

export function persistLocalSetupProfileFromPayload(payload, ownerLike = null) {
  if (!isBrowser()) return null;

  const rows = Array.isArray(payload) ? payload : [payload];
  let latest = null;

  rows.forEach((row) => {
    if (!isPlainObject(row)) return;

    const answers = extractAnswers(row);
    const completed = isCompletionPayload(row) || hasAllRequiredAnswers(answers);
    if (!Object.keys(answers).length && !completed && !row.recommended_access_level) return;

    latest = saveLocalSetupProfile(
      {
        answers,
        recommended_access_level: row.recommended_access_level,
        completed,
        completed_at: row.onboarding_completed_at || (completed ? new Date().toISOString() : null),
      },
      ownerLike
    );
  });

  return latest;
}

export function stripLocalSetupProfileFields(value) {
  if (Array.isArray(value)) return value.map((item) => stripLocalSetupProfileFields(item));
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !LOCAL_ONLY_PROFILE_FIELDS.has(key))
  );
}

export function hasCompletedLocalSetup(ownerLike = null) {
  const setup = getLocalSetupProfile(ownerLike);
  const answers = isPlainObject(setup?.answers) ? setup.answers : {};
  return (
    (Boolean(setup?.completed) && hasAllRequiredAnswers(answers)) ||
    hasCompletedLocalMemorySetup(ownerLike)
  );
}

export function clearLocalSetupProfile(ownerLike = null) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(getLocalSetupProfileKey(ownerLike));
  if (resolveLocalSetupOwnerId(ownerLike)) {
    window.localStorage.removeItem(LEGACY_LOCAL_SETUP_PROFILE_KEY);
  }
}
