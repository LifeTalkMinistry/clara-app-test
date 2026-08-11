import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleDollarSign,
  PiggyBank,
  ShieldAlert,
  WalletCards,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import { getDebtObligations } from "@/lib/debtObligationStore";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
} from "@/lib/incomeHubRepository";
import FinanceCardSetupEmptyState from "./FinanceCardSetupEmptyState";
import FinanceCardShell from "./FinanceCardShell";

const CARD_CONFIG = {
  wallet: {
    detailKey: "wallets",
    cardKey: "wallet",
    title: "Wallets",
    cta: "Create my first wallet",
    info: "Create a wallet first. Once it exists, CLARA will show your balances, protected money, and wallet activity here.",
    collapsedLabel: "View wallets",
    expandedLabel: "Hide wallets",
    Icon: WalletCards,
    iconClass: "border-cyan-200/20 bg-cyan-400/[0.08] text-cyan-100",
    buttonClass: "border-cyan-300/18 bg-cyan-400/[0.08] text-cyan-100 hover:bg-cyan-400/[0.12]",
    surfaceClassName: "!border-cyan-100/[0.075] !bg-[linear-gradient(135deg,rgba(4,35,49,0.92),rgba(5,17,40,0.955)_45%,rgba(18,13,55,0.915))]",
    shadowClass: "shadow-[0_26px_70px_rgba(0,0,0,0.46),0_0_30px_rgba(34,211,238,0.07),0_0_52px_rgba(79,70,229,0.085)]",
  },
  savingsGoals: {
    detailKey: "savings",
    cardKey: "savingsGoals",
    title: "Savings Goals",
    cta: "Set up a savings goal",
    info: "Create at least one real savings goal first. CLARA will show progress, targets, and goal details only after a goal exists.",
    collapsedLabel: "View savings details",
    expandedLabel: "Hide savings details",
    Icon: PiggyBank,
    iconClass: "border-cyan-200/20 bg-cyan-400/[0.08] text-cyan-100",
    buttonClass: "border-cyan-300/18 bg-cyan-400/[0.08] text-cyan-100 hover:bg-cyan-400/[0.12]",
    surfaceClassName: "!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(38,10,52,0.93))]",
    shadowClass: "shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]",
  },
  investmentFund: {
    detailKey: "investmentFund",
    cardKey: "investmentFund",
    title: "Income Hub",
    cta: "Set up my income",
    info: "Add an income source such as salary, business, freelance, or allowance. CLARA will show income analytics only after a source exists.",
    collapsedLabel: "View income sources",
    expandedLabel: "Hide income sources",
    Icon: CircleDollarSign,
    iconClass: "border-blue-300/20 bg-blue-950/55 text-amber-200",
    buttonClass: "border-blue-300/18 bg-blue-500/[0.09] text-blue-50 hover:bg-blue-500/[0.13]",
    surfaceClassName: "!border-blue-300/[0.10] !bg-[linear-gradient(135deg,rgba(2,16,39,0.97),rgba(3,10,28,0.985)_48%,rgba(12,10,28,0.975))]",
    shadowClass: "shadow-[0_26px_70px_rgba(0,0,0,0.50),0_0_30px_rgba(37,99,235,0.09),0_0_52px_rgba(239,68,68,0.035)]",
  },
  debtObligations: {
    detailKey: "debtObligations",
    cardKey: "debtObligations",
    title: "Debt / Obligations",
    cta: "Add an obligation",
    info: "Add an obligation only when you have one to track. CLARA will show debt pressure, monthly commitments, and payoff details after it exists.",
    collapsedLabel: "View debt details",
    expandedLabel: "Hide debt details",
    Icon: ShieldAlert,
    iconClass: "border-cyan-200/18 bg-white/[0.06] text-cyan-100",
    buttonClass: "border-rose-300/16 bg-rose-400/[0.07] text-rose-100 hover:bg-rose-400/[0.11]",
    surfaceClassName: "!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]",
    shadowClass: "shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_56px_rgba(88,28,135,0.11)]",
  },
};

const supportedTypes = new Set(Object.keys(CARD_CONFIG));

function isActiveWallet(wallet) {
  return Boolean(
    wallet &&
      !wallet?.is_archived &&
      !wallet?.isArchived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  );
}

function isActiveSavingsGoal(goal) {
  return Boolean(
    goal &&
      !goal?.deletedAt &&
      !goal?.deleted_at &&
      !goal?.is_archived &&
      !goal?.isArchived
  );
}

function buttonText(button) {
  return String(button?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findSetupButton(root, type) {
  const buttons = Array.from(root?.querySelectorAll?.("button") || []);
  if (type === "investmentFund") {
    return buttons.find((button) => buttonText(button).includes("add income source"));
  }
  if (type === "debtObligations") {
    return buttons.find((button) => buttonText(button).includes("new obligation"));
  }
  return null;
}

export default function FinanceCardEmptyStateGuard({
  type,
  data = {},
  expandedFinanceCard,
  toggleFinanceDetails,
  onCreateWallet,
  onSaveSavingsGoal,
  loading = false,
  disabled = false,
  children,
}) {
  const { user } = useAuth();
  const config = CARD_CONFIG[type];
  const setupRootRef = useRef(null);
  const [remoteConfigured, setRemoteConfigured] = useState(null);
  const [setupMode, setSetupMode] = useState(false);
  const [autoOpenPending, setAutoOpenPending] = useState(false);

  const isExpanded = Boolean(config && expandedFinanceCard === config.detailKey);
  const incomeLocalUserId = useMemo(
    () => (type === "investmentFund" ? getIncomeHubLocalUserId(user) : ""),
    [type, user]
  );
  const debtLocalUserId = useMemo(
    () =>
      type === "debtObligations"
        ? getEffectiveDemoFinanceLocalUserId(
            String(user?.id || user?.email || "local-user")
          )
        : "",
    [type, user?.email, user?.id]
  );

  const localConfigured = useMemo(() => {
    if (type === "wallet") {
      return (Array.isArray(data?.wallets) ? data.wallets : []).some(isActiveWallet);
    }
    if (type === "savingsGoals") {
      return (Array.isArray(data?.savingsGoals) ? data.savingsGoals : []).some(
        isActiveSavingsGoal
      );
    }
    return null;
  }, [data?.savingsGoals, data?.wallets, type]);

  useEffect(() => {
    if (type !== "investmentFund" && type !== "debtObligations") {
      setRemoteConfigured(null);
      return undefined;
    }

    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const records =
          type === "investmentFund"
            ? await getIncomeSources(incomeLocalUserId)
            : await getDebtObligations(debtLocalUserId);
        if (!cancelled) {
          setRemoteConfigured(Array.isArray(records) && records.length > 0);
        }
      } catch (error) {
        console.warn("CLARA finance empty-state check failed:", error);
        if (!cancelled) setRemoteConfigured(false);
      } finally {
        inFlight = false;
      }
    };

    void load();

    const events =
      type === "investmentFund"
        ? ["clara-income-hub-updated", "clara-finance-updated"]
        : ["clara:debt-obligations-updated", "clara-finance-updated"];

    events.forEach((eventName) => window.addEventListener(eventName, load));
    return () => {
      cancelled = true;
      events.forEach((eventName) => window.removeEventListener(eventName, load));
    };
  }, [debtLocalUserId, incomeLocalUserId, type]);

  const configured =
    type === "wallet" || type === "savingsGoals"
      ? localConfigured === true
      : remoteConfigured === true;
  const checkingRemote =
    (type === "investmentFund" || type === "debtObligations") &&
    remoteConfigured === null;

  useEffect(() => {
    if (configured) {
      setSetupMode(false);
      setAutoOpenPending(false);
    }
  }, [configured]);

  useEffect(() => {
    if (!setupMode || !autoOpenPending) return undefined;

    let attempts = 0;
    let timeoutId = null;
    const tryOpen = () => {
      attempts += 1;
      const button = findSetupButton(setupRootRef.current, type);
      if (button) {
        button.click();
        setAutoOpenPending(false);
        if (type === "investmentFund") {
          timeoutId = window.setTimeout(() => setSetupMode(false), 180);
        }
        return;
      }
      if (attempts < 24) timeoutId = window.setTimeout(tryOpen, 50);
    };

    timeoutId = window.setTimeout(tryOpen, 30);
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [autoOpenPending, setupMode, type]);

  useEffect(() => {
    if (!configured && setupMode && !isExpanded && type === "debtObligations") {
      setSetupMode(false);
      setAutoOpenPending(false);
    }
  }, [configured, isExpanded, setupMode, type]);

  if (
    !supportedTypes.has(type) ||
    disabled ||
    loading ||
    checkingRemote ||
    configured ||
    setupMode
  ) {
    return (
      <div ref={setupRootRef} className="contents">
        {children}
      </div>
    );
  }

  const handleSetup = () => {
    if (type === "wallet") {
      onCreateWallet?.();
      return;
    }

    if (type === "savingsGoals") {
      onSaveSavingsGoal?.();
      return;
    }

    setSetupMode(true);
    setAutoOpenPending(true);
    if (!isExpanded) {
      toggleFinanceDetails?.(config.detailKey, { forceOpen: true });
    }
  };

  return (
    <FinanceCardShell
      cardKey={config.cardKey}
      expanded={isExpanded}
      roundedClass="rounded-3xl"
      surfaceClassName={config.surfaceClassName}
      shadowClass={config.shadowClass}
    >
      <FinanceCardSetupEmptyState
        title={config.title}
        info={config.info}
        cta={config.cta}
        Icon={config.Icon}
        iconClass={config.iconClass}
        buttonClass={config.buttonClass}
        detailKey={config.detailKey}
        expanded={isExpanded}
        onSetup={handleSetup}
        onToggleDetails={() => toggleFinanceDetails?.(config.detailKey)}
        collapsedLabel={config.collapsedLabel}
        expandedLabel={config.expandedLabel}
      />
    </FinanceCardShell>
  );
}
