import {
  LOCAL_FINANCE_STORES,
  getLocalRecordById,
  upsertLocalRecord,
} from "@/lib/localFinanceStore";
import { getResetFreshLocalVaultId } from "@/lib/cloud-sync-policy";

export const FINANCIAL_CONTEXT_SETUP_VERSION = 1;
export const FINANCIAL_CONTEXT_SETUP_ROLLOUT_AT = "2026-09-02T22:32:47.000Z";
export const FINANCIAL_CONTEXT_SETUP_UPDATED_EVENT = "clara-financial-context-setup-updated";

export const FINANCIAL_CONTEXT_SETUP_STEPS = Object.freeze([
  "intro",
  "income_hub",
  "wallet",
  "money_schedule",
  "obligations",
  "review",
  "complete",
]);

const STORE_NAME = LOCAL_FINANCE_STORES.privatePreferences;
const RECORD_KIND = "financial_context_setup";

const STEP_TO_OUTCOME_KEY = Object.freeze({
  income_hub: "incomeHub",
  wallet: "wallet",
  money_schedule: "moneySchedule",
  obligations: "obligations",
});

const STEP_SUCCESSOR = Object.freeze({
  income_hub: "wallet",
  wallet: "money_schedule",
  money_schedule: "obligations",
  obligations: "review",
});

const ALLOWED_OUTCOMES = Object.freeze({
  income_hub: new Set(["configured", "none_confirmed"]),
  wallet: new Set(["existing", "created"]),
  money_schedule: new Set(["configured", "none_confirmed"]),
  obligations: new Set(["configured", "none_confirmed"]),
});

const clean = (value) => String(value ?? "").trim();

function nowIso() {
  return new Date().toISOString();
}

function normalizeLocalUserId(localUserId) {
  const value = clean(localUserId);
  if (!value) {
    throw new Error("A local vault id is required for Financial Context Setup.");
  }
  return value;
}

export function financialContextSetupRecordId(localUserId) {
  const owner = normalizeLocalUserId(localUserId);
  return `financial-context-setup:v${FINANCIAL_CONTEXT_SETUP_VERSION}:${encodeURIComponent(owner)}`;
}

function emptyOutcomes() {
  return {
    incomeHub: null,
    wallet: null,
    moneySchedule: null,
    obligations: null,
  };
}

export function createInitialFinancialContextSetupState() {
  return {
    version: FINANCIAL_CONTEXT_SETUP_VERSION,
    status: "not_started",
    currentStep: "intro",
    outcomes: emptyOutcomes(),
    completedAt: null,
    migration: {
      reason: null,
    },
  };
}

export function createGrandfatheredFinancialContextSetupState(completedAt = nowIso()) {
  return {
    version: FINANCIAL_CONTEXT_SETUP_VERSION,
    status: "complete",
    currentStep: "complete",
    outcomes: emptyOutcomes(),
    completedAt,
    migration: {
      reason: "pre_feature_migration",
    },
  };
}

export function shouldGrandfatherFinancialContextSetup(
  accountCreatedAt,
  rolloutAt = FINANCIAL_CONTEXT_SETUP_ROLLOUT_AT
) {
  const createdAtMs = Date.parse(clean(accountCreatedAt));
  const rolloutAtMs = Date.parse(clean(rolloutAt));
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(rolloutAtMs)) return false;
  return createdAtMs < rolloutAtMs;
}

export function isResetFreshFinancialContextVault(localUserId) {
  const owner = normalizeLocalUserId(localUserId);
  const resetFreshVaultId = clean(getResetFreshLocalVaultId());
  return Boolean(resetFreshVaultId && resetFreshVaultId === owner);
}

export function isFinancialContextSetupComplete(state) {
  return state?.status === "complete" && state?.currentStep === "complete";
}

function normalizeOutcomes(outcomes = {}) {
  const source = outcomes && typeof outcomes === "object" ? outcomes : {};
  return {
    incomeHub: clean(source.incomeHub) || null,
    wallet: clean(source.wallet) || null,
    moneySchedule: clean(source.moneySchedule) || null,
    obligations: clean(source.obligations) || null,
  };
}

function normalizeState(record) {
  if (!record || typeof record !== "object" || record.deletedAt) return null;
  const version = Number(record.version);
  if (version !== FINANCIAL_CONTEXT_SETUP_VERSION) return null;

  const status = ["not_started", "in_progress", "complete"].includes(record.status)
    ? record.status
    : "not_started";
  const requestedStep = clean(record.currentStep);
  const currentStep = FINANCIAL_CONTEXT_SETUP_STEPS.includes(requestedStep)
    ? requestedStep
    : status === "complete"
      ? "complete"
      : "intro";

  return {
    version: FINANCIAL_CONTEXT_SETUP_VERSION,
    status: currentStep === "complete" ? "complete" : status === "complete" ? "in_progress" : status,
    currentStep,
    outcomes: normalizeOutcomes(record.outcomes),
    completedAt: currentStep === "complete" ? clean(record.completedAt) || null : null,
    migration: {
      reason: clean(record?.migration?.reason) || null,
    },
  };
}

export function applyFinancialContextSetupOutcome(state, { step, outcome } = {}) {
  const current = normalizeState(state);
  if (!current) throw new Error("Financial Context Setup state is invalid.");
  if (isFinancialContextSetupComplete(current)) return current;

  const safeStep = clean(step);
  const safeOutcome = clean(outcome);
  const outcomeKey = STEP_TO_OUTCOME_KEY[safeStep];
  const successor = STEP_SUCCESSOR[safeStep];
  const allowed = ALLOWED_OUTCOMES[safeStep];

  if (!outcomeKey || !successor || !allowed?.has(safeOutcome)) {
    throw new Error(`Invalid Financial Context Setup outcome: ${safeStep}/${safeOutcome}`);
  }
  if (current.currentStep !== safeStep) {
    throw new Error(
      `Financial Context Setup cannot complete ${safeStep} while ${current.currentStep} is active.`
    );
  }

  return {
    ...current,
    status: "in_progress",
    currentStep: successor,
    outcomes: {
      ...current.outcomes,
      [outcomeKey]: safeOutcome,
    },
    completedAt: null,
    migration: { reason: null },
  };
}

function dispatchSetupUpdated(state) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FINANCIAL_CONTEXT_SETUP_UPDATED_EVENT, {
      detail: { state },
    })
  );
}

async function persistState(localUserId, state) {
  const owner = normalizeLocalUserId(localUserId);
  const normalized = normalizeState({ ...state, version: FINANCIAL_CONTEXT_SETUP_VERSION });
  if (!normalized) throw new Error("Financial Context Setup state is invalid.");

  const saved = await upsertLocalRecord(
    STORE_NAME,
    {
      id: financialContextSetupRecordId(owner),
      kind: RECORD_KIND,
      recordKind: RECORD_KIND,
      recordType: RECORD_KIND,
      ...normalized,
      source: "financial_context_setup",
      syncStatus: "local_only",
    },
    owner
  );

  const next = normalizeState(saved) || normalized;
  dispatchSetupUpdated(next);
  return next;
}

export async function readFinancialContextSetupState(localUserId) {
  const owner = normalizeLocalUserId(localUserId);
  const record = await getLocalRecordById(
    STORE_NAME,
    financialContextSetupRecordId(owner),
    owner
  );
  return normalizeState(record);
}

export async function resolveFinancialContextSetupState({
  localUserId,
  accountCreatedAt,
} = {}) {
  const owner = normalizeLocalUserId(localUserId);
  const existing = await readFinancialContextSetupState(owner);
  if (existing) return existing;

  // Clear Data creates a brand-new empty account-scoped vault. That is an explicit
  // request to rebuild local financial context, so it must restart this setup even
  // for accounts old enough to be grandfathered during the original rollout.
  if (isResetFreshFinancialContextVault(owner)) {
    return persistState(owner, createInitialFinancialContextSetupState());
  }

  if (shouldGrandfatherFinancialContextSetup(accountCreatedAt)) {
    return persistState(owner, createGrandfatheredFinancialContextSetupState());
  }

  // Missing or untrustworthy account-age evidence deliberately fails closed into
  // the setup journey. Finance-row absence is never interpreted as confirmation.
  return persistState(owner, createInitialFinancialContextSetupState());
}

export async function startFinancialContextSetup(localUserId) {
  const owner = normalizeLocalUserId(localUserId);
  const current = (await readFinancialContextSetupState(owner)) || createInitialFinancialContextSetupState();
  if (isFinancialContextSetupComplete(current)) return current;

  return persistState(owner, {
    ...current,
    status: "in_progress",
    currentStep: "income_hub",
    completedAt: null,
    migration: { reason: null },
  });
}

export async function recordFinancialContextSetupOutcome(
  localUserId,
  { step, outcome } = {}
) {
  const owner = normalizeLocalUserId(localUserId);
  const current = (await readFinancialContextSetupState(owner)) || createInitialFinancialContextSetupState();
  const next = applyFinancialContextSetupOutcome(current, { step, outcome });
  if (next === current || isFinancialContextSetupComplete(current)) return current;
  return persistState(owner, next);
}

export async function completeFinancialContextSetup(localUserId) {
  const owner = normalizeLocalUserId(localUserId);
  const current = await readFinancialContextSetupState(owner);
  if (!current) throw new Error("Financial Context Setup has not started.");
  if (isFinancialContextSetupComplete(current)) return current;
  if (current.currentStep !== "review") {
    throw new Error(`Financial Context Setup cannot finish from ${current.currentStep}.`);
  }

  return persistState(owner, {
    ...current,
    status: "complete",
    currentStep: "complete",
    completedAt: nowIso(),
    migration: { reason: null },
  });
}

export const FINANCIAL_CONTEXT_SETUP_RECORD_KIND = RECORD_KIND;
