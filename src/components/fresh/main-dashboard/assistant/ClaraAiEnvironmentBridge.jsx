import { useEffect, useMemo, useRef, useState } from "react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";
import useClaraAiEnvironment from "@/components/fresh/main-dashboard/assistant/useClaraAiEnvironment";
import useFinancialData from "@/hooks/useFinancialData";
import useUserRole from "@/hooks/useUserRole";
import { buildClaraBridgeReadableContext } from "@/lib/clara-bridge-context-readers";
import { buildTransactionHubAiSnapshot } from "@/lib/clara-transaction-hub-ai-reader";
import { LOCAL_FINANCE_STORES, runLocalFinanceTransaction } from "@/lib/localFinanceStore";

const LONG_PRESS_DELAY = 520;
const DASHBOARD_DEFAULT_GUARD_VERSION = "dashboard-default-ai-mode-v2";
const RETIRED_DEMO_LOCAL_USER_ID = "clara-demo-user";
const YOUNG_PROFESSIONAL_SOURCE = "clara_young_professional_current_state";
const YOUNG_PROFESSIONAL_FAMILY = "young_professional_current_state";

const RETIRED_DEMO_STORAGE_KEYS = [
  "clara_dev_identity_override_v1",
  "clara_demo_intro_seen_at_v1",
  "CLARA_AI_USE_DEMO_CONTEXT",
  "CLARA_SAMPLE_MAX_ACTIVE_V1",
  "CLARA_SAMPLE_MAX_REAL_BACKUP_V1",
  "CLARA_LIFE_STAGE_SAMPLE_ACTIVE_V1",
];

const RETIRED_STORAGE_KEY_PARTS = [
  "clara_demo",
  "clara_sample",
  "clara_life_stage_demo",
  "CLARA_SAMPLE",
  "CLARA_LIFE_STAGE_SAMPLE",
];

const RETIRED_DEMO_CLEANUP_STORES = [
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
  LOCAL_FINANCE_STORES.privatePreferences,
].filter(Boolean);

const RETIRED_YOUNG_PROFESSIONAL_STORES = new Set([
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
]);

const CLARA_AI_ENVIRONMENT_STYLES = `
  .clara-ai-environment-active [data-clara-ai-background="true"] {
    opacity: 0.28;
    filter: blur(3.5px) saturate(0.82);
    transform: translate3d(0, -8px, 0) scale(0.985);
    pointer-events: none;
    transition:
      opacity 360ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 360ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

function isMoneyLeftOrbTarget(target) {
  return Boolean(
    target?.closest?.(
      '[data-clara-manual-expense-orb="true"], [aria-label*="Tap to log expense"], [aria-label*="ask CLARA"]'
    )
  );
}

function getRealLocalUserId(user) {
  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

function clearRetiredDemoBrowserState() {
  if (typeof window === "undefined") return;

  try {
    for (const key of RETIRED_DEMO_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }

    const keysToRemove = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (RETIRED_STORAGE_KEY_PARTS.some((part) => key.includes(part))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function isRetiredDemoAccountRecord(record) {
  if (!record || typeof record !== "object") return false;

  const id = String(record.id || "");
  const source = String(record.source || "");
  const setupFamily = String(record.setupFamily || record.setup_family || "");
  const localUserId = String(record.localUserId || record.local_user_id || "");

  return Boolean(
    localUserId === RETIRED_DEMO_LOCAL_USER_ID ||
      id.startsWith("clara_demo") ||
      id.startsWith("clara_sample_max") ||
      id.startsWith("clara_life_stage_demo") ||
      source === "clara_demo_account" ||
      source === "clara_sample_demo_seed" ||
      source === "clara_life_stage_demo_seed" ||
      setupFamily === "life_stage_sample" ||
      record.demoAccount === true ||
      record.demo_account === true ||
      record.demoVersion ||
      record.demo_version ||
      record.sampleData === true ||
      record.sample_data === true
  );
}

function isRetiredYoungProfessionalRecord(record, storeName) {
  if (!RETIRED_YOUNG_PROFESSIONAL_STORES.has(storeName)) return false;

  return Boolean(
    record?.source === YOUNG_PROFESSIONAL_SOURCE ||
      record?.setupFamily === YOUNG_PROFESSIONAL_FAMILY ||
      (record?.activeCurrentState === true && record?.lifeStage === "Young Professional")
  );
}

async function purgeRetiredDemoDataForUser(localUserId) {
  const safeLocalUserId = String(localUserId || "").trim();
  if (!safeLocalUserId) return false;

  let deletedAny = false;

  await runLocalFinanceTransaction(RETIRED_DEMO_CLEANUP_STORES, localUserId, async (tx) => {
    for (const storeName of RETIRED_DEMO_CLEANUP_STORES) {
      const rows = await tx.getAllForUser(storeName, true);
      const objectStore = tx.store(storeName);

      for (const row of rows || []) {
        if (isRetiredDemoAccountRecord(row) || isRetiredYoungProfessionalRecord(row, storeName)) {
          objectStore.delete(row.id);
          deletedAny = true;
        }
      }
    }
  });

  return deletedAny;
}

async function purgeRetiredDemoAccountData(user) {
  clearRetiredDemoBrowserState();

  const localUserIds = [
    getRealLocalUserId(user),
    user?.id,
    user?.email,
    "local-user",
    RETIRED_DEMO_LOCAL_USER_ID,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const uniqueLocalUserIds = [...new Set(localUserIds)];
  let deletedAny = false;

  for (const localUserId of uniqueLocalUserIds) {
    try {
      const deletedForUser = await purgeRetiredDemoDataForUser(localUserId);
      deletedAny = deletedAny || deletedForUser;
    } catch (error) {
      console.warn("CLARA retired demo data cleanup skipped for one local user:", error);
    }
  }

  if (typeof window !== "undefined" && deletedAny) {
    window.dispatchEvent(new Event("clara-finance-updated"));
    window.dispatchEvent(new Event("clara-wallets-updated"));
    window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
    window.dispatchEvent(new Event("clara-expenses-updated"));
    window.setTimeout(() => window.location.reload(), 250);
  }
}

export default function ClaraAiEnvironmentBridge() {
  clearRetiredDemoBrowserState();

  const claraAiEnvironment = useClaraAiEnvironment();
  const { user } = useUserRole();

  const {
    expenses = [],
    wallets = [],
    walletTransactions = [],
    transfers = [],
    budgets = [],
    savingsGoals = [],
    emergencyFund = null,
    loading = false,
    refreshing = false,
  } = useFinancialData(user);

  const transactionHubSnapshot = useMemo(
    () =>
      buildTransactionHubAiSnapshot({
        expenses,
        wallets,
        walletTransactions,
        transfers,
        budgets,
        savingsGoals,
        emergencyFund,
      }),
    [expenses, wallets, walletTransactions, transfers, budgets, savingsGoals, emergencyFund]
  );

  const claraAssistantContext = useMemo(() => {
    const bridgeReadableContext = buildClaraBridgeReadableContext({ messages: claraAiEnvironment.messages });

    return {
      user,
      expenses,
      wallets,
      walletTransactions,
      transfers,
      budgets,
      savingsGoals,
      emergencyFund,
      transactionHubSnapshot,
      loading,
      refreshing,
      ...bridgeReadableContext,
    };
  }, [user, expenses, wallets, walletTransactions, transfers, budgets, savingsGoals, emergencyFund, transactionHubSnapshot, loading, refreshing, claraAiEnvironment.messages]);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const longPressTimerRef = useRef(null);
  const cleanupStartedRef = useRef(false);
  const isActive = overlayVisible;

  useEffect(() => {
    if (cleanupStartedRef.current) return;
    cleanupStartedRef.current = true;
    purgeRetiredDemoAccountData(user);
  }, [user]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle("clara-ai-environment-active", isActive);
    root.dataset.claraAiMode = isActive ? "active" : "idle";
    root.dataset.claraAiGuard = DASHBOARD_DEFAULT_GUARD_VERSION;

    if (body) {
      body.classList.toggle("clara-ai-environment-active", isActive);
      body.dataset.claraAiMode = isActive ? "active" : "idle";
      body.dataset.claraAiGuard = DASHBOARD_DEFAULT_GUARD_VERSION;
    }

    return () => {
      root.classList.remove("clara-ai-environment-active");
      delete root.dataset.claraAiMode;
      delete root.dataset.claraAiGuard;

      if (body) {
        body.classList.remove("clara-ai-environment-active");
        delete body.dataset.claraAiMode;
        delete body.dataset.claraAiGuard;
      }
    };
  }, [isActive]);

  useEffect(() => {
    setOverlayVisible(false);
    claraAiEnvironment.clearEnvironment?.();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const clearLongPressTimer = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handlePointerDown = (event) => {
      if (!isMoneyLeftOrbTarget(event.target)) return;
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        setOverlayVisible(true);
        claraAiEnvironment.activateOverlay?.("money-left-orb-long-press");
      }, LONG_PRESS_DELAY);
    };

    const handlePointerRelease = () => clearLongPressTimer();

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerRelease, true);
    document.addEventListener("pointercancel", handlePointerRelease, true);
    document.addEventListener("touchend", handlePointerRelease, true);

    return () => {
      clearLongPressTimer();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerRelease, true);
      document.removeEventListener("pointercancel", handlePointerRelease, true);
      document.removeEventListener("touchend", handlePointerRelease, true);
    };
  }, [claraAiEnvironment]);

  const closeOverlay = () => {
    setOverlayVisible(false);
    claraAiEnvironment.clearEnvironment?.();
  };

  return (
    <>
      <style>{CLARA_AI_ENVIRONMENT_STYLES}</style>

      <ClaraAiEnvironmentOverlay
        isActive={isActive}
        messages={claraAiEnvironment.messages}
        claraAssistantContext={claraAssistantContext}
        requestFeaturePrompt={claraAiEnvironment.requestFeaturePrompt}
        onClose={closeOverlay}
      />
    </>
  );
}
