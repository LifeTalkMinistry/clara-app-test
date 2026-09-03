import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, CircleDollarSign, WalletCards } from "lucide-react";
import useFinancialData from "@/hooks/useFinancialData";
import ClaraAddIncomeOverlay from "./ClaraAddIncomeOverlayV2.jsx";
import ClaraWalletOverlay from "./ClaraWalletOverlayV2.jsx";
import ClaraMoneyScheduleOverlay from "./ClaraMoneyScheduleOverlay.jsx";
import ClaraDebtObligationOverlay from "./ClaraDebtObligationOverlay.jsx";
import {
  completeFinancialContextSetup,
  recordFinancialContextSetupOutcome,
  startFinancialContextSetup,
} from "@/lib/financialContextSetupRepository";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
} from "@/lib/incomeHubRepository";
import { isIncomeSourceMasterPayCycle } from "@/lib/clara-master-pay-cycle-repository";
import {
  getEmergencyFund,
  getSavingsGoals,
  getTransfers,
  getWalletTransactions,
  getWallets,
} from "@/lib/financeRepository";
import {
  getWalletId,
  getWalletName,
  isActiveWalletForMoneySemantics,
  isMoneyLentWallet,
} from "@/lib/clara-wallet-money-semantics";
import {
  getDebtObligations,
  summarizeDebtObligations,
} from "@/lib/debtObligationStore";
import { readClaraMoneyRoutine } from "@/lib/clara-money-schedule-repository";
import {
  buildCanonicalMeansSnapshot,
  calculateMeansAvailableWalletState,
} from "@/lib/clara-means-authority";

const clean = (value) => String(value ?? "").trim();

function money(value = 0) {
  const parsed = Number(value);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function firstNameFromUser(user = {}) {
  const raw = clean(
    user?.firstName ||
      user?.first_name ||
      user?.displayName ||
      user?.display_name ||
      user?.fullName ||
      user?.full_name ||
      user?.name
  );
  if (raw) return raw.split(" ")[0];
  const email = clean(user?.email);
  return email.includes("@") ? email.split("@")[0] : "there";
}

function isSetupWallet(wallet = {}) {
  return isActiveWalletForMoneySemantics(wallet) && !isMoneyLentWallet(wallet);
}

function ProgressStrip({ currentStep }) {
  const items = [
    ["income_hub", "Income"],
    ["wallet", "Wallet"],
    ["money_schedule", "Schedule"],
    ["obligations", "Obligations"],
    ["review", "Review"],
  ];
  const activeIndex = Math.max(0, items.findIndex(([step]) => step === currentStep));

  return (
    <div className="grid grid-cols-5 gap-1.5 px-4" aria-label="Financial Context Setup progress">
      {items.map(([step, label], index) => (
        <div key={step} className="min-w-0 text-center">
          <div
            className={`mx-auto h-1.5 w-full rounded-full ${
              index <= activeIndex ? "bg-[#2be1d8]" : "bg-white/10"
            }`}
          />
          <span
            className={`mt-1.5 block truncate text-[8.5px] font-black uppercase tracking-[0.08em] ${
              index === activeIndex ? "text-cyan-100/85" : "text-white/28"
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SetupFrame({ currentStep, children }) {
  return (
    <div
      className="fixed inset-0 z-[420] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714] text-white"
      data-clara-financial-context-setup="true"
      data-clara-financial-context-step={currentStep}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(23,105,255,0.27),transparent_34%),radial-gradient(circle_at_94%_8%,rgba(43,225,216,0.12),transparent_32%),linear-gradient(180deg,#06152e_0%,#040b1a_45%,#020714_100%)]" />
      <header className="relative z-10 shrink-0 px-4 pb-3 pt-[max(env(safe-area-inset-top),14px)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/48">CLARA setup</p>
            <h1 className="mt-0.5 text-[15px] font-black tracking-[-0.02em]">Financial Context</h1>
          </div>
          <span className="rounded-full border border-cyan-200/12 bg-cyan-200/[0.045] px-2.5 py-1 text-[9px] font-black text-cyan-50/62">
            First setup
          </span>
        </div>
        {currentStep !== "intro" ? <ProgressStrip currentStep={currentStep} /> : null}
      </header>
      <div className="relative z-10 min-h-0 flex-1">{children}</div>
    </div>
  );
}

function SetupOverlayActivationBridge({ children }) {
  const [overlayActive, setOverlayActive] = useState(false);

  useEffect(() => {
    const activationTimer = window.setTimeout(() => setOverlayActive(true), 0);
    return () => window.clearTimeout(activationTimer);
  }, []);

  return children(overlayActive);
}

function PausedSetup({ currentStep, onResume }) {
  const labels = {
    income_hub: "Income Hub",
    wallet: "Wallet",
    money_schedule: "Money Schedule",
    obligations: "Debt / Obligations",
    review: "Review",
  };

  return (
    <div className="flex h-full items-center justify-center px-5 py-10">
      <section className="w-full rounded-[28px] border border-white/[0.08] bg-[#07142b]/92 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <CheckCircle2 className="mx-auto h-8 w-8 text-[#8ffff8]/85" />
        <h2 className="mt-4 text-xl font-black tracking-[-0.03em]">Your progress is saved.</h2>
        <p className="mx-auto mt-2 max-w-xs text-[12.5px] font-semibold leading-6 text-white/50">
          You can continue from {labels[currentStep] || "the current step"}. Completed financial-context steps will not be repeated.
        </p>
        <button
          type="button"
          onClick={onResume}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[17px] bg-[#1769ff] px-4 text-[13px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.25)] active:scale-[0.985]"
        >
          Resume setup <ChevronRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function Intro({ firstName, busy, error, onContinue }) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),22px)] pt-3">
      <section className="w-full rounded-[30px] border border-white/[0.08] bg-[#07142b]/88 p-6 shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/14 bg-cyan-200/[0.055]">
          <CircleDollarSign className="h-6 w-6 text-[#8ffff8]" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.17em] text-cyan-100/48">Before we start</p>
        <h2 className="mt-2 text-[26px] font-black leading-[1.08] tracking-[-0.045em]">
          I need to understand your financial context, {firstName}.
        </h2>
        <p className="mt-4 text-[13px] font-semibold leading-6 text-white/54">
          I’ll guide you through a short series of questions. This gives CLARA the context it needs before showing your financial position.
        </p>
        <div className="mt-5 grid gap-2.5">
          {[
            ["1", "Where your money comes from"],
            ["2", "Where your available money is held"],
            ["3", "Your normal scheduled spending"],
            ["4", "Bills, loans, debts, and obligations"],
          ].map(([number, label]) => (
            <div key={number} className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1769ff]/18 text-[10px] font-black text-cyan-100/78">{number}</span>
              <span className="text-[12px] font-bold text-white/76">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] font-semibold leading-5 text-white/36">
          You do not need to invent money or obligations you do not have. ₱0 and “none” are valid answers where they apply.
        </p>
        {error ? <p className="mt-3 text-[11px] font-bold text-red-100/80">{error}</p> : null}
        <button
          type="button"
          onClick={onContinue}
          disabled={busy}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[17px] bg-[#1769ff] px-4 text-[13px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.25)] active:scale-[0.985] disabled:opacity-45"
        >
          {busy ? "Starting..." : "Build my financial context"}
          {!busy ? <ChevronRight className="h-4 w-4" /> : null}
        </button>
      </section>
    </div>
  );
}

function Review({ review, loading, error, busy, onRetry, onComplete }) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center px-5 text-center">
        <div>
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-[#2be1d8]" />
          <p className="mt-3 text-[12px] font-bold text-white/48">Checking your financial context...</p>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex h-full items-center justify-center px-5">
        <section className="w-full rounded-[24px] border border-red-200/10 bg-red-500/[0.04] p-5 text-center">
          <p className="text-[13px] font-black">CLARA couldn’t prepare the review yet.</p>
          <p className="mt-2 text-[11px] font-semibold leading-5 text-white/45">{error || "Financial context is temporarily unavailable."}</p>
          <button type="button" onClick={onRetry} className="mt-4 min-h-11 w-full rounded-[15px] bg-[#1769ff] text-[12px] font-black">Try again</button>
        </section>
      </div>
    );
  }

  const means = review.means;
  const rawMeansScore = means?.meansScore;
  const scoreAvailable =
    rawMeansScore !== null &&
    rawMeansScore !== undefined &&
    rawMeansScore !== "" &&
    Number.isFinite(Number(rawMeansScore));

  return (
    <div className="h-full overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),22px)] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <section className="rounded-[26px] border border-white/[0.08] bg-[#07142b]/88 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/48">Context review</p>
        <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em]">CLARA now has the full setup picture.</h2>
        <p className="mt-2 text-[12px] font-semibold leading-5 text-white/46">Review the context below before we finish your first setup.</p>
      </section>

      <div className="mt-3 grid gap-2.5">
        <section className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Income Hub</p>
          <p className="mt-1.5 text-[14px] font-black">{review.incomeSources.length} income source{review.incomeSources.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/44">
            Master Pay Cycle: {review.masterSource?.name || "Not established"}
          </p>
        </section>

        <section className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Wallet</p>
          <p className="mt-1.5 text-[14px] font-black">{review.wallets.length} active wallet{review.wallets.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/44">Available wallet money: {money(review.availableWalletMoney)}</p>
        </section>

        <section className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Money Schedule</p>
          <p className="mt-1.5 text-[14px] font-black">
            {review.routine ? `Normal weekly routine: ${money((review.routine.weeklyTotalCentavos || 0) / 100)}` : "No routine spending confirmed"}
          </p>
        </section>

        <section className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Debt / Obligations</p>
          <p className="mt-1.5 text-[14px] font-black">{review.obligations.length} active obligation{review.obligations.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/44">Monthly obligation: {money(review.debtSummary.monthlyDebt)}</p>
        </section>
      </div>

      <section className="mt-3 rounded-[24px] border border-cyan-200/14 bg-[linear-gradient(135deg,rgba(23,105,255,0.12),rgba(43,225,216,0.055))] p-5">
        <div className="flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-[#8ffff8]" />
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/58">Initial financial position</p>
        </div>
        {scoreAvailable ? (
          <>
            <p className="mt-3 text-[38px] font-black leading-none tracking-[-0.055em]">{Number(rawMeansScore).toFixed(0)}</p>
            <p className="mt-2 text-[11px] font-semibold text-white/48">Means Score · Cycle 100 Anchor {money(means.cycle100Anchor)}</p>
            <p className="mt-1 text-[11px] font-semibold text-white/48">Real room / Wall Bill: {money(means.wallBill)}</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-[18px] font-black tracking-[-0.025em]">Financial context ready.</p>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-white/48">
              Your Cycle 100 Anchor and numeric Means Score have not been established yet. CLARA will not invent a score.
            </p>
          </>
        )}
      </section>

      {error ? <p className="mt-3 text-[11px] font-bold text-red-100/80">{error}</p> : null}
      <button
        type="button"
        onClick={onComplete}
        disabled={busy}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[17px] bg-[#1769ff] px-4 text-[13px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.25)] active:scale-[0.985] disabled:opacity-45"
      >
        {busy ? "Finishing..." : "Finish setup"}
        {!busy ? <CheckCircle2 className="h-4 w-4" /> : null}
      </button>
    </div>
  );
}

export default function ClaraFinancialContextSetupCoordinator({
  user,
  initialState,
  onStateChange,
  onComplete,
}) {
  const firstName = firstNameFromUser(user);
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const [setupState, setSetupState] = useState(initialState);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [walletStepMode, setWalletStepMode] = useState("checking");
  const [incomeWalletHandoff, setIncomeWalletHandoff] = useState(null);
  const [incomeResume, setIncomeResume] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewNonce, setReviewNonce] = useState(0);

  const {
    expenses = [],
    incomes = [],
    wallets = [],
    walletTransactions = [],
    transfers = [],
    budgets = [],
    savingsGoals = [],
    emergencyFund = null,
    totalIncome = 0,
    loading = false,
    refreshing = false,
  } = useFinancialData(user);

  useEffect(() => {
    setSetupState(initialState);
    setPaused(false);
    setError("");
    setWalletStepMode("checking");
    setIncomeWalletHandoff(null);
    setIncomeResume(null);
    setReview(null);
  }, [initialState, localUserId]);

  const currentStep = setupState?.currentStep || "intro";

  const childContext = useMemo(
    () => ({
      user,
      expenses,
      incomes,
      wallets,
      walletTransactions,
      transfers,
      budgets,
      savingsGoals,
      emergencyFund,
      totalIncome,
      loading,
      refreshing,
    }),
    [
      user,
      expenses,
      incomes,
      wallets,
      walletTransactions,
      transfers,
      budgets,
      savingsGoals,
      emergencyFund,
      totalIncome,
      loading,
      refreshing,
    ]
  );

  const commitState = (next) => {
    setSetupState(next);
    onStateChange?.(next);
    return next;
  };

  const startSetup = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await startFinancialContextSetup(localUserId);
      commitState(next);
    } catch (nextError) {
      setError(clean(nextError?.message) || "CLARA couldn’t start Financial Context Setup.");
    } finally {
      setBusy(false);
    }
  };

  const advance = async (step, outcome) => {
    if (busy) return null;
    setBusy(true);
    setError("");
    try {
      const next = await recordFinancialContextSetupOutcome(localUserId, { step, outcome });
      setPaused(false);
      setWalletStepMode("checking");
      setIncomeWalletHandoff(null);
      setIncomeResume(null);
      setReview(null);
      return commitState(next);
    } catch (nextError) {
      setError(clean(nextError?.message) || "CLARA couldn’t save this setup step.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const interrupt = () => {
    setPaused(true);
    setIncomeWalletHandoff(null);
    setIncomeResume(null);
    setError("");
  };

  const handleIncomeSetupResult = (result = {}) => {
    if (result?.status !== "complete") return;
    void advance("income_hub", result?.outcome || "configured");
  };

  const openWalletFromIncome = (detail = {}) => {
    const amount = Number(detail?.amount) || 0;
    setIncomeResume(
      amount > 0
        ? {
            sourceId: String(detail?.sourceId || ""),
            sourceName: clean(detail?.sourceName),
            amount,
            reason: "transfer-after-wallet",
            cancelled: false,
          }
        : null
    );
    setIncomeWalletHandoff({
      ...detail,
      intent: "create",
      source: "financial-context-income",
      returnMode: "income_hub",
    });
  };

  const returnWalletToIncome = (detail = {}) => {
    const pendingAmount = Number(incomeWalletHandoff?.amount) || 0;
    if (pendingAmount > 0) {
      setIncomeResume((current) => ({
        ...(current || {}),
        wallet: detail?.wallet || null,
        walletAction: detail?.action || "created",
        cancelled: false,
      }));
    } else {
      setIncomeResume(null);
    }
    setIncomeWalletHandoff(null);
  };

  useEffect(() => {
    if (currentStep !== "wallet" || paused) return undefined;
    let cancelled = false;
    setWalletStepMode("checking");

    (async () => {
      try {
        const rows = await getWallets(localUserId);
        if (cancelled) return;
        const hasExistingWallet = (Array.isArray(rows) ? rows : []).some(isSetupWallet);
        if (hasExistingWallet) {
          await advance("wallet", "existing");
          return;
        }
        if (!cancelled) setWalletStepMode("create");
      } catch (nextError) {
        if (!cancelled) {
          setError(clean(nextError?.message) || "CLARA couldn’t check your Wallet setup.");
          setWalletStepMode("create");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentStep, localUserId, paused]);

  useEffect(() => {
    if (currentStep !== "review" || paused) return undefined;
    let cancelled = false;
    setReviewLoading(true);
    setError("");

    (async () => {
      try {
        const [
          incomeSources,
          walletRows,
          transactionRows,
          transferRows,
          goalRows,
          reserve,
          obligations,
          canonicalMeans,
        ] = await Promise.all([
          getIncomeSources(localUserId),
          getWallets(localUserId),
          getWalletTransactions(localUserId),
          getTransfers(localUserId),
          getSavingsGoals(localUserId),
          getEmergencyFund(localUserId),
          getDebtObligations(localUserId),
          buildCanonicalMeansSnapshot({
            profile: {
              ...(user || {}),
              id: localUserId,
              user_id: localUserId,
              userId: localUserId,
            },
            now: new Date(),
          }),
        ]);
        if (cancelled) return;

        const safeWallets = (Array.isArray(walletRows) ? walletRows : []).filter(isSetupWallet);
        const walletState = calculateMeansAvailableWalletState(
          walletRows,
          transactionRows,
          transferRows,
          { emergencyFund: reserve, savingsGoals: goalRows }
        );
        const safeIncomeSources = Array.isArray(incomeSources) ? incomeSources : [];
        const safeObligations = Array.isArray(obligations) ? obligations : [];
        const routine = readClaraMoneyRoutine(user);
        const debtSummary = summarizeDebtObligations(safeObligations, {
          income: Number(totalIncome) || 0,
        });

        setReview({
          incomeSources: safeIncomeSources,
          masterSource: safeIncomeSources.find(isIncomeSourceMasterPayCycle) || null,
          wallets: safeWallets.map((wallet) => ({
            id: getWalletId(wallet),
            name: getWalletName(wallet) || "Wallet",
          })),
          availableWalletMoney: Number(
            canonicalMeans?.availableWalletMoney ?? walletState.availableNow
          ) || 0,
          routine,
          obligations: safeObligations,
          debtSummary,
          means: canonicalMeans || null,
        });
      } catch (nextError) {
        if (!cancelled) {
          setReview(null);
          setError(clean(nextError?.message) || "CLARA couldn’t build your financial review.");
        }
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentStep, localUserId, paused, reviewNonce, totalIncome, user]);

  const finishSetup = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await completeFinancialContextSetup(localUserId);
      commitState(next);
      onComplete?.(next);
    } catch (nextError) {
      setError(clean(nextError?.message) || "CLARA couldn’t finish Financial Context Setup.");
    } finally {
      setBusy(false);
    }
  };

  if (currentStep === "complete") return null;

  if (incomeWalletHandoff && currentStep === "income_hub" && !paused) {
    return (
      <SetupFrame currentStep={currentStep}>
        <ClaraWalletOverlay
          isActive
          claraAssistantContext={childContext}
          entryContext={incomeWalletHandoff}
          onWalletReady={returnWalletToIncome}
          onClose={interrupt}
        />
      </SetupFrame>
    );
  }

  return (
    <SetupFrame currentStep={currentStep}>
      {paused ? (
        <PausedSetup currentStep={currentStep} onResume={() => setPaused(false)} />
      ) : currentStep === "intro" ? (
        <Intro firstName={firstName} busy={busy} error={error} onContinue={startSetup} />
      ) : currentStep === "income_hub" ? (
        <SetupOverlayActivationBridge>
          {(overlayActive) => (
            <ClaraAddIncomeOverlay
              isActive={overlayActive}
              claraAssistantContext={childContext}
              resumeState={incomeResume}
              onOpenWalletChat={openWalletFromIncome}
              onSetupResult={handleIncomeSetupResult}
              onClose={interrupt}
            />
          )}
        </SetupOverlayActivationBridge>
      ) : currentStep === "wallet" ? (
        walletStepMode === "checking" ? (
          <div className="flex h-full items-center justify-center px-5 text-center">
            <div>
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-[#2be1d8]" />
              <p className="mt-3 text-[12px] font-bold text-white/48">Checking your Wallet context...</p>
            </div>
          </div>
        ) : (
          <ClaraWalletOverlay
            isActive
            claraAssistantContext={childContext}
            entryContext={{
              intent: "create",
              source: "financial-context-setup",
              returnMode: "financial-context-setup",
            }}
            onWalletReady={() => void advance("wallet", "created")}
            onClose={interrupt}
          />
        )
      ) : currentStep === "money_schedule" ? (
        <SetupOverlayActivationBridge>
          {(overlayActive) => (
            <ClaraMoneyScheduleOverlay
              isActive={overlayActive}
              claraAssistantContext={childContext}
              onSetupResult={(result) => {
                if (result?.status === "complete") {
                  void advance("money_schedule", result?.outcome || "configured");
                }
              }}
              onClose={interrupt}
            />
          )}
        </SetupOverlayActivationBridge>
      ) : currentStep === "obligations" ? (
        <SetupOverlayActivationBridge>
          {(overlayActive) => (
            <ClaraDebtObligationOverlay
              isActive={overlayActive}
              claraAssistantContext={childContext}
              onSetupResult={(result) => {
                if (result?.status === "complete") {
                  void advance("obligations", result?.outcome || "configured");
                }
              }}
              onClose={interrupt}
            />
          )}
        </SetupOverlayActivationBridge>
      ) : currentStep === "review" ? (
        <Review
          review={review}
          loading={reviewLoading}
          error={error}
          busy={busy}
          onRetry={() => setReviewNonce((value) => value + 1)}
          onComplete={finishSetup}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-5 text-center">
          <p className="text-[12px] font-bold text-white/50">Restoring Financial Context Setup...</p>
        </div>
      )}
    </SetupFrame>
  );
}
