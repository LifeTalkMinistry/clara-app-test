import {
  LOCAL_FINANCE_STORES,
  getLocalRecordById,
  upsertLocalRecord,
} from "./localFinanceStore.js";
import { getIncomeHubLocalUserId } from "./incomeHubRepository.js";

export const FINANCIAL_CONTEXT_SETUP_VERSION = 1;
export const FINANCIAL_CONTEXT_SETUP_RECORD_KIND = "financial_context_setup";
export const FINANCIAL_CONTEXT_SETUP_ROLLOUT_AT = "2026-09-02T22:30:00.000Z";

const STORE_NAME = LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";
const STEP_ORDER = Object.freeze([
  "intro",
  "income_hub",
  "wallet",
  "money_schedule",
  "obligations",
  "review",
  "complete",
]);

const clean = (value) => String(value ?? "").trim();

export function getFinancialContextSetupLocalUserId(user = {}) {
  return getIncomeHubLocalUserId(user);
}

export function getFinancialContextSetupRecordId(localUserId) {
  const owner = clean(localUserId);
  if (!owner) throw new Error("Financial Context Setup requires an account-scoped local user id.");
  return `financial-context-setup:v${FINANCIAL_CONTEXT_SETUP_VERSION}:${owner}`;
}

function initialState(localUserId) {
  return {
    id: getFinancialContextSetupRecordId(localUserId),
    recordKind: FINANCIAL_CONTEXT_SETUP_RECORD_KIND,
    version: FINANCIAL_CONTEXT_SETUP_VERSION,
    status: "not_started",
    currentStep: "intro",
    outcomes: {
      incomeHub: null,
      wallet: null,
      moneySchedule: null,
      obligations: null,
    },
    completedAt: null,
    migration: { reason: null },
  };
}

function migratedCompleteState(localUserId, migrationTime = new Date().toISOString()) {
  return {
    ...initialState(localUserId),
    status: "complete",
    currentStep: "complete",
    completedAt: migrationTime,
    migration: { reason: "pre_feature_migration" },
  };
}

function normalizeState(localUserId, record = null) {
  const base = initialState(localUserId);
  if (!record || Number(record.version) !== FINANCIAL_CONTEXT_SETUP_VERSION) return base;
  const currentStep = STEP_ORDER.includes(record.currentStep) ? record.currentStep : "intro";
  return {
    ...base,
    ...record,
    id: base.id,
    recordKind: FINANCIAL_CONTEXT_SETUP_RECORD_KIND,
    version: FINANCIAL_CONTEXT_SETUP_VERSION,
    status: ["not_started", "in_progress", "complete"].includes(record.status)
      ? record.status
      : "not_started",
    currentStep,
    outcomes: {
      ...base.outcomes,
      ...(record.outcomes || {}),
    },
    migration: {
      ...base.migration,
      ...(record.migration || {}),
    },
  };
}

export async function readFinancialContextSetupState(userOrLocalUserId) {
  const localUserId = typeof userOrLocalUserId === "string"
    ? clean(userOrLocalUserId)
    : getFinancialContextSetupLocalUserId(userOrLocalUserId || {});
  const id = getFinancialContextSetupRecordId(localUserId);
  const record = await getLocalRecordById(STORE_NAME, id, localUserId).catch(() => null);
  return record ? normalizeState(localUserId, record) : null;
}

function accountCreatedAt(user = {}) {
  return clean(
    user?.created_at ||
      user?.createdAt ||
      user?.account_created_at ||
      user?.accountCreatedAt ||
      user?.profile?.created_at ||
      user?.account_profile?.created_at
  );
}

function isPreFeatureAccount(user = {}) {
  const createdAt = accountCreatedAt(user);
  if (!createdAt) return true;
  const createdTime = new Date(createdAt).getTime();
  const rolloutTime = new Date(FINANCIAL_CONTEXT_SETUP_ROLLOUT_AT).getTime();
  if (!Number.isFinite(createdTime) || !Number.isFinite(rolloutTime)) return true;
  return createdTime < rolloutTime;
}

export async function ensureFinancialContextSetupState(user = {}) {
  const localUserId = getFinancialContextSetupLocalUserId(user);
  const existing = await readFinancialContextSetupState(localUserId);
  if (existing) return existing;

  const next = isPreFeatureAccount(user)
    ? migratedCompleteState(localUserId)
    : initialState(localUserId);

  return upsertLocalRecord(STORE_NAME, next, localUserId);
}

export async function writeFinancialContextSetupState(userOrLocalUserId, patch = {}) {
  const localUserId = typeof userOrLocalUserId === "string"
    ? clean(userOrLocalUserId)
    : getFinancialContextSetupLocalUserId(userOrLocalUserId || {});
  const existing = (await readFinancialContextSetupState(localUserId)) || initialState(localUserId);
  const next = normalizeState(localUserId, {
    ...existing,
    ...patch,
    outcomes: {
      ...existing.outcomes,
      ...(patch.outcomes || {}),
    },
    migration: {
      ...existing.migration,
      ...(patch.migration || {}),
    },
  });
  return upsertLocalRecord(STORE_NAME, next, localUserId);
}

export async function startFinancialContextSetup(userOrLocalUserId) {
  return writeFinancialContextSetupState(userOrLocalUserId, {
    status: "in_progress",
    currentStep: "intro",
  });
}

const OUTCOME_FIELD_BY_STEP = Object.freeze({
  income_hub: "incomeHub",
  wallet: "wallet",
  money_schedule: "moneySchedule",
  obligations: "obligations",
});

export async function completeFinancialContextSetupStep(
  userOrLocalUserId,
  { step, outcome, nextStep }
) {
  if (!STEP_ORDER.includes(step) || step === "intro" || step === "review" || step === "complete") {
    throw new Error(`Unsupported Financial Context Setup completion step: ${step}`);
  }
  if (!STEP_ORDER.includes(nextStep)) {
    throw new Error(`Unsupported Financial Context Setup next step: ${nextStep}`);
  }
  const outcomeField = OUTCOME_FIELD_BY_STEP[step];
  return writeFinancialContextSetupState(userOrLocalUserId, {
    status: "in_progress",
    currentStep: nextStep,
    outcomes: outcomeField ? { [outcomeField]: outcome } : {},
  });
}

export async function advanceFinancialContextSetup(userOrLocalUserId, nextStep) {
  if (!STEP_ORDER.includes(nextStep)) {
    throw new Error(`Unsupported Financial Context Setup step: ${nextStep}`);
  }
  return writeFinancialContextSetupState(userOrLocalUserId, {
    status: nextStep === "complete" ? "complete" : "in_progress",
    currentStep: nextStep,
    completedAt: nextStep === "complete" ? new Date().toISOString() : null,
  });
}

export async function finalizeFinancialContextSetup(userOrLocalUserId) {
  return writeFinancialContextSetupState(userOrLocalUserId, {
    status: "complete",
    currentStep: "complete",
    completedAt: new Date().toISOString(),
  });
}

export function isFinancialContextSetupComplete(state = null) {
  return Boolean(
    state &&
    Number(state.version) === FINANCIAL_CONTEXT_SETUP_VERSION &&
    state.status === "complete" &&
    state.currentStep === "complete"
  );
}
