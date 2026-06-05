import { supabase } from "./supabaseClient";
import { LOCAL_FINANCE_STORES, runLocalFinanceTransaction } from "./localFinanceStore";

export const ACTIVE_CURRENT_STATE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";

const CURRENT_STATE_SOURCE = "clara_young_professional_current_state";
const CURRENT_STATE_FAMILY = "young_professional_current_state";
const FALLBACK_LOCAL_USER_ID = "local-user";
const DEMO_LOCAL_USER_ID = "clara-demo-user";

const CURRENT_STATE_STORES = [
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
  LOCAL_FINANCE_STORES.privatePreferences,
  LOCAL_FINANCE_STORES.lifeProfile,
].filter(Boolean);

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getRealLocalUserId(user) {
  return clean(user?.id || user?.email || FALLBACK_LOCAL_USER_ID) || FALLBACK_LOCAL_USER_ID;
}

function removeActiveCurrentStateFlag() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ACTIVE_CURRENT_STATE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

async function getPossibleLocalUserIds() {
  const ids = new Set([FALLBACK_LOCAL_USER_ID, DEMO_LOCAL_USER_ID]);

  try {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;
    ids.add(getRealLocalUserId(authUser));
    if (authUser?.id) ids.add(clean(authUser.id));
    if (authUser?.email) ids.add(clean(authUser.email));
  } catch {
    // Offline/local mode can still clean the known local ids.
  }

  return [...ids].map(clean).filter(Boolean);
}

function isYoungProfessionalCurrentStateRecord(record = {}) {
  if (!record || typeof record !== "object") return false;

  const id = clean(record.id).toLowerCase();
  const source = clean(record.source).toLowerCase();
  const setupFamily = clean(record.setupFamily || record.setup_family).toLowerCase();
  const lifeStage = clean(record.lifeStage || record.life_stage || record.activeLifeStageTitle || record.activeLifeStageKey).toLowerCase();

  return Boolean(
    source === CURRENT_STATE_SOURCE ||
      setupFamily === CURRENT_STATE_FAMILY ||
      (record.activeCurrentState === true && lifeStage.includes("young professional")) ||
      id.includes("clara_young_professional") ||
      id.includes("young_professional_current_state")
  );
}

async function purgeCurrentStateRecordsForUser(localUserId) {
  const safeLocalUserId = clean(localUserId);
  if (!safeLocalUserId) return false;

  let deletedAny = false;

  await runLocalFinanceTransaction(CURRENT_STATE_STORES, safeLocalUserId, async (tx) => {
    for (const storeName of CURRENT_STATE_STORES) {
      const rows = await tx.getAllForUser(storeName, true);
      const store = tx.store(storeName);

      for (const row of rows || []) {
        if (isYoungProfessionalCurrentStateRecord(row)) {
          store.delete(row.id);
          deletedAny = true;
        }
      }
    }
  });

  return deletedAny;
}

function dispatchCurrentStateExitEvents(deletedAny = false) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event("clara-young-professional-current-state-exited"));
  window.dispatchEvent(new Event("clara-young-professional-current-state-loaded"));
  window.dispatchEvent(new Event("storage"));

  if (deletedAny) {
    window.dispatchEvent(new Event("clara-finance-updated"));
    window.dispatchEvent(new Event("clara-income-hub-updated"));
    window.dispatchEvent(new Event("clara-wallets-updated"));
    window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
    window.dispatchEvent(new Event("clara-expenses-updated"));
    window.dispatchEvent(new Event("clara-local-finance-updated"));
  }
}

export async function exitYoungProfessionalCurrentState() {
  removeActiveCurrentStateFlag();

  let deletedAny = false;
  const localUserIds = await getPossibleLocalUserIds();

  for (const localUserId of localUserIds) {
    try {
      const deletedForUser = await purgeCurrentStateRecordsForUser(localUserId);
      deletedAny = deletedAny || deletedForUser;
    } catch (error) {
      console.warn("Young Professional current-state cleanup skipped for one local user:", error);
    }
  }

  dispatchCurrentStateExitEvents(deletedAny);

  return { success: true, deletedAny };
}
