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
  memoryNotes: [],
  personalityQuizAnswers: {},
});

export function getClaraLocalUserId(user) {
  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

function normalizeMemoryNotes(notes = []) {
  if (!Array.isArray(notes)) return [];

  return notes
    .filter((note) => note && typeof note === "object")
    .map((note, index) => {
      const timestamp = note.updatedAt || note.updated_at || note.createdAt || note.created_at || new Date().toISOString();

      return {
        id: String(note.id || `memory-${index}-${timestamp}`),
        category: String(note.category || "Life Context").trim() || "Life Context",
        summary: String(note.summary || note.insight || "").trim(),
        spendingImpact: String(note.spendingImpact || note.spendingRisk || "").trim(),
        supportStyle: String(note.supportStyle || "").trim(),
        status: String(note.status || "active").trim() || "active",
        createdAt: note.createdAt || note.created_at || timestamp,
        updatedAt: timestamp,
        userApproved: note.userApproved !== false,
      };
    })
    .filter((note) => note.summary || note.spendingImpact)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
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
    memoryNotes: normalizeMemoryNotes(embedded.memoryNotes),
    personalityQuizAnswers:
      embedded.personalityQuizAnswers && typeof embedded.personalityQuizAnswers === "object"
        ? embedded.personalityQuizAnswers
        : {},
  };
}

function newestActiveProfile(records = []) {
  const activeRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record && !record.deletedAt && !record.deleted_at)
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.updated_at || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.updated_at || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

  return activeRecords.find((record) => record.id === CLARA_LIFE_PROFILE_ID) || activeRecords[0] || null;
}

export async function readClaraLifeProfile(user) {
  const localUserId = getClaraLocalUserId(user);
  const records = await getLocalRecordsByUser(LOCAL_FINANCE_STORES.lifeProfile, {
    localUserId,
  });

  return normalizeClaraLifeProfile(newestActiveProfile(records) || {});
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

export async function saveClaraLifeProfile(user, profile) {
  const localUserId = getClaraLocalUserId(user);
  const normalized = normalizeClaraLifeProfile(profile);
  const timestamp = new Date().toISOString();

  return upsertLocalRecord(
    LOCAL_FINANCE_STORES.lifeProfile,
    {
      ...normalized,
      id: CLARA_LIFE_PROFILE_ID,
      profile: normalized,
      updatedAt: timestamp,
      updated_at: timestamp,
    },
    localUserId
  );
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
      normalized.replacementActivity ||
      normalized.memoryNotes?.length
  );
}

export function summarizeLifeProfileForClara(profile = {}) {
  const normalized = normalizeClaraLifeProfile(profile);
  const approvedMemoryNotes = normalizeMemoryNotes(normalized.memoryNotes)
    .filter((note) => note.userApproved !== false)
    .slice(0, 6)
    .map((note) => ({
      category: note.category,
      summary: note.summary,
      spendingImpact: note.spendingImpact,
      supportStyle: note.supportStyle,
      status: note.status,
      updatedAt: note.updatedAt,
    }));

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
    approvedMemoryNotes,
    hasMeaningfulProfile: hasMeaningfulLifeProfile(normalized),
  };
}
