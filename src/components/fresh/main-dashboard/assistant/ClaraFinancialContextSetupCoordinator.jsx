import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, WalletCards } from "lucide-react";
import ClaraAddIncomeOverlayV2 from "./ClaraAddIncomeOverlayV2.jsx";
import ClaraWalletOverlayV2 from "./ClaraWalletOverlayV2.jsx";
import ClaraMoneyScheduleOverlay from "./ClaraMoneyScheduleOverlay.jsx";
import ClaraDebtObligationOverlay from "./ClaraDebtObligationOverlay.jsx";
import {
  completeFinancialContextSetupStep,
  advanceFinancialContextSetup,
  finalizeFinancialContextSetup,
  getFinancialContextSetupLocalUserId,
} from "@/lib/financialContextSetupRepository";
import { getIncomeSources } from "@/lib/incomeHubRepository";
import {
  getEmergencyFund,
  getSavingsGoals,
  getWallets,
  getWalletTransactions,
} from "@/lib/financeRepository";
import { readClaraMoneyRoutine } from "@/lib/clara-money-schedule-repository";
import { getDebtObligations } from "@/lib/debtObligationStore";
import { buildCanonicalMeansSnapshot } from "@/lib/clara-means-authority";
import {
  getWalletName,
  isActiveWalletForMoneySemantics,
} from "@/lib/clara-wallet-money-semantics";

const STEP_LABELS = Object.freeze({
  intro: "Financial Context",
  income_hub: "Income Hub",
  wallet: "Wallet",
  money_schedule: "Money Schedule",
  obligations: "Debt / Obligations",
  review: "Review",
});

const money = (value) =>
  `₱${Math.max(0, Number(value) || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;

function SetupShell({ eyebrow = "CLARA setup", title, body, children }) {
  return (
    <div
      className="fixed inset-0 z-[410] mx-auto flex w-full max-w-[430px] flex-col overflow-y-auto bg-[#020714] px-5 pb-[max(env(safe-area-inset-bottom),22px)] pt-[max(env(safe-area-inset-top),22px)] text-white"
      data-clara-financial-context-setup="true"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_8%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_94%_10%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_48%,#020714_100%)]" />
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center py-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8ffff8]/55">{eyebrow}</p>
        <h1 className="mt-3 text-[30px] font-black leading-[1.06] tracking-[-0.045em] text-white">{title}</h1>
        {body ? <p className="mt-4 text-[13px] font-semibold leading-6 text-white/58">{body}</p> : null}
        <div className="mt-7 grid gap-3">{children}</div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, secondary = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-13 rounded-[18px] border px-4 py-3 text-[13px] font-black transition active:scale-[0.985] disabled:opacity-45 ${
        secondary
          ? "border-white/10 bg-white/[0.035] text-white/82"
          : "border-cyan-200/20 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white shadow-[0_14px_34px_rgba(23,105,255,0.22)]"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] py-3 last:border-b-0">
      <span className="text-[11px] font-bold text-white/42">{label}</span>
      <span className="max-w-[64%] text-right text-[12px] font-black leading-5 text-white/88">{value}</span>
    </div>
  );
}

export default function ClaraFinancialContextSetupCoordinator({
  user,
  setupState,
  onStateChange,
  onComplete,
}) {
  const localUserId = useMemo(() => getFinancialContextSetupLocalUserId(user || {}), [user]);
  const step = setupState?.currentStep || "intro";
  const [childActive, setChildActive] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState("");
  const [financeContext, setFinanceContext] = useState({
    wallets: [],
    walletTransactions: [],
    savingsGoals: [],
    emergencyFund: null,
  });
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refreshFinanceContext = useCallback(async () => {
    const [wallets, walletTransactions, savingsGoals, emergencyFund] = await Promise.all([
      getWallets(localUserId).catch(() => []),
      getWalletTransactions(localUserId).catch(() => []),
      getSavingsGoals(localUserId).catch(() => []),
      getEmergencyFund(localUserId).catch(() => null),
    ]);
    const next = {
      wallets: Array.isArray(wallets) ? wallets : [],
      walletTransactions: Array.isArray(walletTransactions) ? walletTransactions : [],
      savingsGoals: Array.isArray(savingsGoals) ? savingsGoals : [],
      emergencyFund: emergencyFund || null,
    };
    setFinanceContext(next);
    return next;
  }, [localUserId]);

  const persistState = useCallback((next) => {
    onStateChange?.(next);
    return next;
  }, [onStateChange]);

  const completeStep = useCallback(async ({ step: completedStep, outcome, nextStep }) => {
    setBusy(true);
    setError("");
    try {
      const next = await completeFinancialContextSetupStep(localUserId, {
        step: completedStep,
        outcome,
        nextStep,
      });
      setChildActive(false);
      setCloseConfirmation("");
      persistState(next);
      return next;
    } catch (nextError) {
      setError(String(nextError?.message || "CLARA couldn’t save your setup progress."));
      return null;
    } finally {
      setBusy(false);
    }
  }, [localUserId, persistState]);

  useEffect(() => {
    setChildActive(false);
    setCloseConfirmation("");
    setError("");

    if (step === "income_hub") {
      setChildActive(true);
      return;
    }

    if (step === "wallet") {
      let cancelled = false;
      void refreshFinanceContext().then(async (context) => {
        if (cancelled) return;
        const activeWallet = context.wallets.find(isActiveWalletForMoneySemantics);
        if (activeWallet) {
          await completeStep({ step: "wallet", outcome: "existing", nextStep: "money_schedule" });
          return;
        }
        if (!cancelled) setChildActive(true);
      });
      return () => {
        cancelled = true;
      };
    }

    if (step === "review") {
      let cancelled = false;
      setBusy(true);
      void Promise.all([
        getIncomeSources(localUserId).catch(() => []),
        refreshFinanceContext(),
        getDebtObligations(localUserId).catch(() => []),
        buildCanonicalMeansSnapshot({ profile: user || {} }).catch(() => null),
      ]).then(([incomeSources, context, obligations, means]) => {
        if (cancelled) return;
        const routine = readClaraMoneyRoutine(user || {});
        setReview({
          incomeSources: Array.isArray(incomeSources) ? incomeSources : [],
          wallets: context.wallets.filter(isActiveWalletForMoneySemantics),
          routine,
          obligations: Array.isArray(obligations) ? obligations : [],
          means,
        });
        setBusy(false);
      });
      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [completeStep, localUserId, refreshFinanceContext, step, user]);

  const assistantContext = useMemo(() => ({
    user: user || {},
    wallets: financeContext.wallets,
    walletTransactions: financeContext.walletTransactions,
    savingsGoals: financeContext.savingsGoals,
    emergencyFund: financeContext.emergencyFund,
  }), [financeContext, user]);

  const continueIntro = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await advanceFinancialContextSetup(localUserId, "income_hub");
      persistState(next);
    } catch (nextError) {
      setError(String(nextError?.message || "CLARA couldn’t start Financial Context Setup."));
    } finally {
      setBusy(false);
    }
  };

  const handleIncomeClose = async () => {
    setChildActive(false);
    const sources = await getIncomeSources(localUserId).catch(() => []);
    setCloseConfirmation(Array.isArray(sources) && sources.length ? "income-configured" : "income-incomplete");
  };

  const handleIncomeOpenWallet = async () => {
    await completeStep({ step: "income_hub", outcome: "configured", nextStep: "wallet" });
  };

  const handleWalletReady = async () => {
    await refreshFinanceContext();
    await completeStep({ step: "wallet", outcome: "created", nextStep: "money_schedule" });
  };

  const handleMoneyScheduleClose = () => {
    setChildActive(false);
    const routine = readClaraMoneyRoutine(user || {});
    setCloseConfirmation(routine?.active ? "schedule-configured" : "schedule-incomplete");
  };

  const handleObligationsClose = async () => {
    setChildActive(false);
    const records = await getDebtObligations(localUserId).catch(() => []);
    setCloseConfirmation(Array.isArray(records) && records.length ? "obligations-configured" : "obligations-incomplete");
  };

  const finishSetup = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await finalizeFinancialContextSetup(localUserId);
      persistState(next);
      onComplete?.(next);
    } catch (nextError) {
      setError(String(nextError?.message || "CLARA couldn’t finish your Financial Context Setup."));
    } finally {
      setBusy(false);
    }
  };

  if (step === "intro") {
    return (
      <SetupShell
        title="Before we start, I need to understand your financial context."
        body="I’ll guide you through a short series of questions so CLARA understands your income cycle, where your money is held, your normal spending routine, and the obligations you need to protect."
      >
        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          {["Income Hub", "Wallet", "Money Schedule", "Debt / Obligations"].map((label, index) => (
            <div key={label} className="flex items-center gap-3 border-b border-white/[0.07] py-2.5 last:border-b-0">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-200/[0.08] text-[10px] font-black text-[#8ffff8]/80">{index + 1}</span>
              <span className="text-[12px] font-black text-white/82">{label}</span>
            </div>
          ))}
        </div>
        <PrimaryButton onClick={continueIntro} disabled={busy}>
          {busy ? "Starting…" : "Build my financial context"}
        </PrimaryButton>
        {error ? <p className="text-center text-[11px] font-bold text-rose-200/85">{error}</p> : null}
      </SetupShell>
    );
  }

  if (step === "income_hub") {
    if (childActive) {
      return (
        <ClaraAddIncomeOverlayV2
          isActive
          claraAssistantContext={assistantContext}
          onOpenWalletChat={handleIncomeOpenWallet}
          onClose={handleIncomeClose}
        />
      );
    }

    return (
      <SetupShell
        eyebrow="Financial Context · Income Hub"
        title={closeConfirmation === "income-configured" ? "Income Hub has usable context." : "Income Hub is still incomplete."}
        body={closeConfirmation === "income-configured"
          ? "I found at least one Income Source. Closing the chat did not automatically complete the setup step, so confirm when you’re ready to continue."
          : "No Income Source was confirmed. Reopen Income Hub to continue; your normal CLARA experience stays gated until this setup is resolved."}
      >
        {closeConfirmation === "income-configured" ? (
          <PrimaryButton
            onClick={() => completeStep({ step: "income_hub", outcome: "configured", nextStep: "wallet" })}
            disabled={busy}
          >
            Continue to Wallet
          </PrimaryButton>
        ) : null}
        <PrimaryButton onClick={() => setChildActive(true)} secondary>Reopen Income Hub</PrimaryButton>
      </SetupShell>
    );
  }

  if (step === "wallet") {
    if (childActive) {
      return (
        <ClaraWalletOverlayV2
          isActive
          claraAssistantContext={assistantContext}
          entryContext={{ intent: "create", source: "financial-context-setup", returnMode: "financial-context-setup" }}
          onWalletReady={handleWalletReady}
          onClose={() => setChildActive(false)}
        />
      );
    }
    return (
      <SetupShell
        eyebrow="Financial Context · Wallet"
        title="Create the place where your actual money is tracked."
        body="A Wallet can start at ₱0. You do not need to add or transfer income first."
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/14 bg-cyan-200/[0.05]">
          <WalletCards className="h-6 w-6 text-[#8ffff8]/75" />
        </div>
        <PrimaryButton onClick={() => setChildActive(true)}>Create a Wallet</PrimaryButton>
      </SetupShell>
    );
  }

  if (step === "money_schedule") {
    if (childActive) {
      return (
        <ClaraMoneyScheduleOverlay
          isActive
          claraAssistantContext={assistantContext}
          onClose={handleMoneyScheduleClose}
        />
      );
    }

    if (closeConfirmation === "schedule-configured") {
      return (
        <SetupShell
          eyebrow="Financial Context · Money Schedule"
          title="Your Money Schedule is configured."
          body="Confirm this as the routine CLARA should use for the setup, or reopen it if you want to make changes first."
        >
          <PrimaryButton
            onClick={() => completeStep({ step: "money_schedule", outcome: "configured", nextStep: "obligations" })}
            disabled={busy}
          >
            Continue to Debt / Obligations
          </PrimaryButton>
          <PrimaryButton onClick={() => setChildActive(true)} secondary>Reopen Money Schedule</PrimaryButton>
        </SetupShell>
      );
    }

    return (
      <SetupShell
        eyebrow="Financial Context · Money Schedule"
        title="What do you normally need to spend during your routine?"
        body="Set up your normal Monday-to-Sunday routine. If you truly have no routine spending yet, say so explicitly — CLARA will not create fake ₱0 schedule records."
      >
        <PrimaryButton onClick={() => setChildActive(true)}>Set up Money Schedule</PrimaryButton>
        <PrimaryButton
          onClick={() => completeStep({ step: "money_schedule", outcome: "none_confirmed", nextStep: "obligations" })}
          secondary
          disabled={busy}
        >
          I have no routine spending yet
        </PrimaryButton>
      </SetupShell>
    );
  }

  if (step === "obligations") {
    if (childActive) {
      return (
        <ClaraDebtObligationOverlay
          isActive
          claraAssistantContext={assistantContext}
          onClose={handleObligationsClose}
        />
      );
    }

    if (closeConfirmation === "obligations-configured") {
      return (
        <SetupShell
          eyebrow="Financial Context · Debt / Obligations"
          title="Your obligations are configured."
          body="Confirm that CLARA should use the obligations you recorded, or reopen the chat if you need to add or correct something."
        >
          <PrimaryButton
            onClick={() => completeStep({ step: "obligations", outcome: "configured", nextStep: "review" })}
            disabled={busy}
          >
            Continue to Review
          </PrimaryButton>
          <PrimaryButton onClick={() => setChildActive(true)} secondary>Reopen Debt / Obligations</PrimaryButton>
        </SetupShell>
      );
    }

    return (
      <SetupShell
        eyebrow="Financial Context · Debt / Obligations"
        title="Do you have bills, obligations, loans, or debts CLARA should protect?"
        body="Record the commitments that apply to you. If you have none, confirm that explicitly; an empty database by itself does not count as an answer."
      >
        <PrimaryButton onClick={() => setChildActive(true)}>Set up Debt / Obligations</PrimaryButton>
        <PrimaryButton
          onClick={() => completeStep({ step: "obligations", outcome: "none_confirmed", nextStep: "review" })}
          secondary
          disabled={busy}
        >
          I have no debt or obligations
        </PrimaryButton>
      </SetupShell>
    );
  }

  if (step === "review") {
    const scheduleOutcome = setupState?.outcomes?.moneySchedule;
    const obligationOutcome = setupState?.outcomes?.obligations;
    const means = review?.means || null;
    const meansResolved = Boolean(means?.meansScoreResolved && Number.isFinite(Number(means?.meansScore)));
    const activeWalletMoney = means ? means.availableWalletMoney : null;

    return (
      <SetupShell
        eyebrow="Financial Context · Review"
        title="CLARA now has your starting financial context."
        body="This review reads your existing financial authorities. It does not calculate another version of your Means Score."
      >
        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4">
          <SummaryRow label="Income Sources" value={busy ? "Loading…" : `${review?.incomeSources?.length || 0} configured`} />
          <SummaryRow
            label="Wallets"
            value={busy ? "Loading…" : review?.wallets?.length
              ? review.wallets.map((wallet) => getWalletName(wallet) || "Wallet").join(", ")
              : "None"}
          />
          <SummaryRow
            label="Available Wallet Money"
            value={busy ? "Loading…" : activeWalletMoney === null ? "—" : money(activeWalletMoney)}
          />
          <SummaryRow
            label="Money Schedule"
            value={scheduleOutcome === "none_confirmed" ? "None confirmed" : review?.routine?.active ? "Configured" : "Configured in setup"}
          />
          <SummaryRow
            label="Debt / Obligations"
            value={obligationOutcome === "none_confirmed" ? "None confirmed" : `${review?.obligations?.length || 0} configured`}
          />
        </div>

        <div className="rounded-[22px] border border-cyan-200/14 bg-cyan-200/[0.045] p-4 text-center">
          {meansResolved ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8ffff8]/55">Initial Means Score</p>
              <p className="mt-2 text-[44px] font-black tracking-[-0.05em] text-white">{Math.round(Number(means.meansScore))}</p>
              <p className="mt-1 text-[11px] font-semibold text-white/48">Canonical Cycle 100 / Means authority</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-7 w-7 text-[#8ffff8]/70" />
              <p className="mt-3 text-[13px] font-black text-white">Financial context is ready.</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-white/48">
                Your Means Score has not been established yet because the canonical Cycle 100 Anchor is not currently resolved. CLARA will not invent a score.
              </p>
            </>
          )}
        </div>

        <PrimaryButton onClick={finishSetup} disabled={busy || !review}>
          <span className="inline-flex items-center gap-2">
            Enter CLARA <ChevronRight className="h-4 w-4" />
          </span>
        </PrimaryButton>
        {error ? <p className="text-center text-[11px] font-bold text-rose-200/85">{error}</p> : null}
      </SetupShell>
    );
  }

  return (
    <SetupShell title={STEP_LABELS[step] || "Financial Context Setup"} body="Loading your setup progress…">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-200/55" />
      </div>
    </SetupShell>
  );
}
