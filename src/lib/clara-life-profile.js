import {
  LOCAL_FINANCE_STORES,
  getLocalRecordsByUser,
  openLocalFinanceDb,
  upsertLocalRecord,
} from "./localFinanceStore";

export const CLARA_LIFE_PROFILE_ID = "clara-life-identity-profile";

export const DEFAULT_CLARA_LIFE_PROFILE = Object.freeze({
  id: CLARA_LIFE_PROFILE_ID,
  personality: "Balanced spender",
  status: "Employee",
  age: "",
  dependents: "Just me",
  responsibility: "Bills and essentials",
  incomeRhythm: "Monthly salary",
  coachingStyle: "Balanced",
  currentFocus: "",
  topValues: "",
  meaningfulGoal: "",
  financialFear: "",
  spendingTrigger: "",
  nonNegotiable: "",
  identityStatement: "",
  currentLifeSeason: "",
  emotionalState: "",
  replacementActivity: "",
  personalityQuizAnswers: {},
});

export function getClaraLocalUserId(user) {
  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

export function getClaraLifeProfileRecordId(userOrLocalUserId) {
  const localUserId =
    userOrLocalUserId &&
    typeof userOrLocalUserId === "object" &&
    !Array.isArray(userOrLocalUserId)
      ? getClaraLocalUserId(userOrLocalUserId)
      : String(userOrLocalUserId || "local-user").trim() || "local-user";

  return `${CLARA_LIFE_PROFILE_ID}:${localUserId}`;
}

export function normalizeClaraLifeProfile(profile = {}) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};
  const embedded =
    safeProfile.profile && typeof safeProfile.profile === "object"
      ? safeProfile.profile
      : safeProfile;

  return {
    ...DEFAULT_CLARA_LIFE_PROFILE,
    ...embedded,
    id: CLARA_LIFE_PROFILE_ID,
    personalityQuizAnswers:
      embedded.personalityQuizAnswers && typeof embedded.personalityQuizAnswers === "object"
        ? embedded.personalityQuizAnswers
        : {},
  };
}

function newestActiveProfile(records = [], preferredRecordId = "") {
  const activeRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record && !record.deletedAt && !record.deleted_at)
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.updated_at || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.updated_at || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

  if (preferredRecordId) {
    const preferred = activeRecords.find((record) => record.id === preferredRecordId);
    if (preferred) return preferred;
  }

  return activeRecords[0] || null;
}

export async function readClaraLifeProfile(user) {
  const localUserId = getClaraLocalUserId(user);
  const recordId = getClaraLifeProfileRecordId(localUserId);
  const records = await getLocalRecordsByUser(LOCAL_FINANCE_STORES.lifeProfile, {
    localUserId,
  });

  return normalizeClaraLifeProfile(newestActiveProfile(records, recordId) || {});
}

export async function readLatestClaraLifeProfileOnDevice() {
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_STORES.lifeProfile, "readonly");
  const store = transaction.objectStore(LOCAL_FINANCE_STORES.lifeProfile);

  const records = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Failed to read CLARA life profile."));
  });

  return normalizeClaraLifeProfile(newestActiveProfile(records) || {});
}

function isForeignOwnerCollision(error) {
  return String(error?.message || "").includes(
    "Cannot update a local finance record owned by another local user."
  );
}

async function resolveLifeProfileWriteId(localUserId, preferredRecordId) {
  const records = await getLocalRecordsByUser(LOCAL_FINANCE_STORES.lifeProfile, {
    localUserId,
  });
  return newestActiveProfile(records, preferredRecordId)?.id || preferredRecordId;
}

export async function saveClaraLifeProfile(user, profile) {
  const localUserId = getClaraLocalUserId(user);
  const preferredRecordId = getClaraLifeProfileRecordId(localUserId);
  const normalized = normalizeClaraLifeProfile(profile);
  const timestamp = new Date().toISOString();
  const recordId = await resolveLifeProfileWriteId(localUserId, preferredRecordId);

  const write = (id) =>
    upsertLocalRecord(
      LOCAL_FINANCE_STORES.lifeProfile,
      {
        ...normalized,
        id,
        profile: normalized,
        updatedAt: timestamp,
        updated_at: timestamp,
      },
      localUserId
    );

  try {
    return await write(recordId);
  } catch (error) {
    if (!isForeignOwnerCollision(error) || recordId !== preferredRecordId) throw error;

    // Older builds could leave a deterministic profile id owned by a different
    // local vault. Never overwrite that foreign record. Move this vault onto a
    // stable collision-safe id; future saves will discover and reuse it.
    return write(`${preferredRecordId}:vault`);
  }
}

export function hasMeaningfulLifeProfile(profile = {}) {
  const normalized = normalizeClaraLifeProfile(profile);
  return Boolean(
    normalized.age ||
      normalized.personality ||
      normalized.status ||
      normalized.dependents ||
      normalized.responsibility ||
      normalized.incomeRhythm ||
      normalized.coachingStyle ||
      normalized.currentFocus ||
      normalized.topValues ||
      normalized.meaningfulGoal ||
      normalized.financialFear ||
      normalized.spendingTrigger ||
      normalized.nonNegotiable ||
      normalized.identityStatement ||
      normalized.currentLifeSeason ||
      normalized.emotionalState ||
      normalized.replacementActivity
  );
}

export function summarizeLifeProfileForClara(profile = {}) {
  const normalized = normalizeClaraLifeProfile(profile);
  return {
    personality: normalized.personality,
    status: normalized.status,
    age: normalized.age,
    dependents: normalized.dependents,
    responsibility: normalized.responsibility,
    incomeRhythm: normalized.incomeRhythm,
    coachingStyle: normalized.coachingStyle,
    currentFocus: normalized.currentFocus,
    topValues: normalized.topValues,
    meaningfulGoal: normalized.meaningfulGoal,
    financialFear: normalized.financialFear,
    spendingTrigger: normalized.spendingTrigger,
    nonNegotiable: normalized.nonNegotiable,
    identityStatement: normalized.identityStatement,
    currentLifeSeason: normalized.currentLifeSeason,
    emotionalState: normalized.emotionalState,
    replacementActivity: normalized.replacementActivity,
    hasMeaningfulProfile: hasMeaningfulLifeProfile(normalized),
  };
}
