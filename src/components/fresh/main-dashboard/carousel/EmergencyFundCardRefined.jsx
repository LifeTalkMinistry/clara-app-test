import { useState } from "react";
import {
  Shield,
  Edit2,
  Plus,
  X,
  Check,
  RotateCcw,
  AlertTriangle,
  MinusCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";

import SurvivalExpenseModal from "../../../../SurvivalExpenseModal";
import useEmergencyFundCard, { fmt, VALID_TARGET_MONTHS } from "../../../../hooks/useEmergencyFundCard";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";

const premiumActionClass =
  "border-white/[0.045] bg-black/[0.105] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.026),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const expandButtonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const EMERGENCY_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-emerald-500/[0.08] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-purple-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(103,232,249,0.105),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(124,58,237,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/[0.055]",
];

const noop = () => {};

const fallbackThemeClasses = {
  title: "text-white",
  body: "text-white/70",
  muted: "text-white/45",
};

const fallbackStatus = {
  label: "Protected",
  text: "text-emerald-200",
  badge: "bg-emerald-400/12 text-emerald-100 border border-emerald-300/15",
  ring: "",
};

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getEmergencyActivityLog(emergencyFund) {
  const source =
    emergencyFund?.emergencyActivityLog ||
    emergencyFund?.emergency_activity_log ||
    emergencyFund?.activityLog ||
    emergencyFund?.activity_log ||
    emergencyFund?.usageLog ||
    emergencyFund?.usage_log ||
    [];

  return Array.isArray(source) ? source.filter(Boolean) : [];
}

function getActivityDateLabel(value) {
  try {
    return new Date(value).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Today";
  }
}

function EmergencyTopUpModal({
  open,
  onClose,
  safeWallets = [],
  topUpWalletId = "",
  setTopUpWalletId = noop,
  topUpAmount = "",
  setTopUpAmount = noop,
  topUpError = "",
  setTopUpError = noop,
  handleTopUpSave = noop,
  saving = false,
  themeClasses = fallbackThemeClasses,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close add emergency fund modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.07] bg-[#061224]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div>
            <p className={`text-base font-semibold ${themeClasses.title || "text-white"}`}>
              Add Emergency Fund
            </p>
            <p className={`mt-0.5 text-xs ${themeClasses.muted || "text-white/45"}`}>
              Move money from a wallet into your protection fund
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-black/[0.12] text-white/70 transition hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Source Wallet
            </label>

            <select
              value={topUpWalletId}
              onChange={(event) => {
                setTopUpWalletId(event.target.value);
                setTopUpError("");
              }}
              className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-300/24"
            >
              {safeWallets.length ? (
                safeWallets.map((wallet) => {
                  const id = String(wallet?.id || wallet?.wallet_id || "");
                  const name = wallet?.name || wallet?.title || wallet?.wallet_name || "Wallet";
                  const balance = Number(wallet?.balance ?? wallet?.current_balance ?? wallet?.amount ?? 0);

                  return (
                    <option key={id} value={id} className="bg-slate-950">
                      {name} — {fmt(balance)}
                    </option>
                  );
                })
              ) : (
                <option value="" className="bg-slate-950">
                  No wallet available
                </option>
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Amount
            </label>

            <input
              type="number"
              min="0"
              value={topUpAmount}
              onChange={(event) => {
                setTopUpAmount(event.target.value);
                setTopUpError("");
              }}
              placeholder="0"
              className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/24"
            />
          </div>

          {topUpError ? (
            <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">
              {topUpError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleTopUpSave}
            disabled={saving || safeWallets.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.13] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? "Saving..." : "Add to Emergency Fund"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmergencyUseModal({
  open,
  onClose,
  onUse,
  amount,
  setAmount,
  reason,
  setReason,
  note,
  setNote,
  error = "",
  usingFund = false,
  currentReserve = 0,
  monthlySurvival = 0,
  themeClasses = fallbackThemeClasses,
}) {
  if (!open) return null;

  const numericAmount = toNumber(amount);
  const nextReserve = Math.max(toNumber(currentReserve) - numericAmount, 0);
  const currentMonths = monthlySurvival > 0 ? toNumber(currentReserve) / monthlySurvival : 0;
  const nextMonths = monthlySurvival > 0 ? nextReserve / monthlySurvival : 0;

  return (
    <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close use emergency fund modal"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.07] bg-[#061224]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div>
            <p className={`text-base font-semibold ${themeClasses.title || "text-white"}`}>
              Use Emergency Fund
            </p>
            <p className={`mt-0.5 text-xs ${themeClasses.muted || "text-white/45"}`}>
              Log protected money without touching normal wallet logic.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={usingFund}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-black/[0.12] text-white/70 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-4 py-3 text-xs font-semibold leading-5 text-amber-50/82">
            <div className="mb-2 flex items-center gap-2 text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold">Protected reserve warning</span>
            </div>
            This will reduce your emergency buffer from {fmt(currentReserve)} to {fmt(nextReserve)}
            {monthlySurvival > 0 ? ` (${currentMonths.toFixed(1)} months → ${nextMonths.toFixed(1)} months).` : "."}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Amount used
            </label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-amber-300/24"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Emergency reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. medicine, urgent repair, family emergency"
              className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-amber-300/24"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Optional note
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a short context if needed"
              className="min-h-[92px] w-full resize-none rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-amber-300/24"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={usingFund}
              className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onUse}
              disabled={usingFund}
              className="flex items-center justify-center gap-2 rounded-2xl border border-amber-300/22 bg-amber-400/[0.10] px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-400/[0.15] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MinusCircle className="h-4 w-4" />
              {usingFund ? "Logging..." : "Use Fund"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmergencyResetModal({
  open,
  onClose,
  onReset,
  resetError = "",
  resetting = false,
  themeClasses = fallbackThemeClasses,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[112] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close reset emergency fund modal"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.07] bg-[#061224]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div>
            <p className={`text-base font-semibold ${themeClasses.title || "text-white"}`}>
              Reset Emergency Fund
            </p>
            <p className={`mt-0.5 text-xs ${themeClasses.muted || "text-white/45"}`}>
              Clear the setup and protected amount.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={resetting}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-black/[0.12] text-white/70 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-4 py-3 text-xs font-semibold leading-5 text-amber-50/82">
            <div className="mb-2 flex items-center gap-2 text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold">Master reset warning</span>
            </div>
            This clears the emergency fund amount, survival number, target, reserve wallet link, and emergency activity log. It will not return money back to any wallet.
          </div>

          {resetError ? (
            <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">
              {resetError}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={resetting}
              className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onReset}
              disabled={resetting}
              className="flex items-center justify-center gap-2 rounded-2xl border border-rose-300/22 bg-rose-400/[0.10] px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/[0.15] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              {resetting ? "Resetting..." : "Reset All"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildNextStepCopy({ effectiveExpense, amountNeeded, targetLabel, emergencyAdvisor }) {
  if (effectiveExpense <= 0) {
    return {
      title: "Set your monthly survival cost",
      message: "CLARA needs your monthly survival cost before it can calculate a realistic emergency target.",
    };
  }

  if (amountNeeded <= 0) {
    return {
      title: "Goal reached",
      message: `You reached ${targetLabel}. Keep this fund protected and avoid using it for non-emergencies.`,
    };
  }

  const advisor = emergencyAdvisor || {};
  const recommendedMonthlyAmount = Number(advisor.recommendedMonthlyAmount || 0);
  const averageMonthlyIncome = Number(advisor.averageMonthlyIncome || 0);

  if (advisor.hasIncomeSignal === true && recommendedMonthlyAmount > 0) {
    return {
      title: `You need ${fmt(amountNeeded)} more`,
      message: `Based on your income pattern, CLARA suggests around ${fmt(recommendedMonthlyAmount)}/month to reach ${targetLabel}${averageMonthlyIncome > 0 ? ` from an average income of ${fmt(averageMonthlyIncome)}/month` : ""}.`,
    };
  }

  return {
    title: `You need ${fmt(amountNeeded)} more`,
    message: "Add funds intentionally when your wallet has breathing room. Your emergency balance only grows when you tap Add Fund.",
  };
}

function getSafetyStage({ effectiveExpense, amountNeeded, pct }) {
  if (effectiveExpense <= 0) return "Needs setup";
  if (amountNeeded <= 0) return "Protected";
  if (pct >= 66) return "Almost safe";
  if (pct >= 33) return "Building safety";
  return "Getting started";
}

function EmergencyHeader({ status = fallbackStatus, themeClasses = fallbackThemeClasses }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm">
        <Shield className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-base font-semibold tracking-tight ${themeClasses.title || "text-white"}`}>
              Emergency Fund
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-white/76">
              Safety buffer for emergencies
            </p>
          </div>

          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${status.badge || fallbackStatus.badge}`}>
            {status.label || "Protected"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="shrink-0 border-t border-white/[0.035] pt-3">
      <FinanceCardExpandButton
        detailKey="emergency"
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        collapsedLabel="View emergency details"
        expandedLabel="Hide emergency details"
        className={expandButtonClass}
      />
    </div>
  );
}

function EmergencyActivityList({ activity = [] }) {
  const latest = activity.slice(0, 4);

  if (!latest.length) {
    return (
      <div className="rounded-2xl border border-white/[0.045] bg-black/[0.08] px-3.5 py-3 text-[12px] font-semibold leading-5 text-white/42">
        No emergency usage yet. CLARA will keep a private log here when you use this reserve.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {latest.map((item) => {
        const type = String(item?.type || "use").toLowerCase();
        const isUse = type.includes("use") || type.includes("withdraw") || type.includes("expense");
        const amount = toNumber(item?.amount);
        const createdAt = item?.createdAt || item?.created_at || item?.date || new Date().toISOString();

        return (
          <div
            key={item?.id || `${createdAt}-${amount}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.045] bg-black/[0.09] px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-white/84">
                {item?.reason || item?.title || (isUse ? "Emergency usage" : "Emergency deposit")}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-white/38">
                {getActivityDateLabel(createdAt)}{item?.note ? ` • ${item.note}` : ""}
              </p>
            </div>
            <p className={`shrink-0 text-[12px] font-black ${isUse ? "text-amber-100" : "text-emerald-200"}`}>
              {isUse ? "-" : "+"}{fmt(amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
  canAutoPrompt = false,
  hasSurvivalSetup = false,
  theme = null,
  expanded = false,
  onToggleDetails,
  onQuickExpense,
  onQuickAI,
}) {
  const { user } = useAuth();
  const {
    emergencyFund: liveEmergencyFund = null,
    updateEmergencyFund = null,
    refreshData = null,
  } = useFinancialData(user);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [useAmount, setUseAmount] = useState("");
  const [useReason, setUseReason] = useState("");
  const [useNote, setUseNote] = useState("");
  const [useError, setUseError] = useState("");
  const [usingFund, setUsingFund] = useState(false);

  const { state = {}, computed = {}, handlers = {} } = useEmergencyFundCard({
    moneyLeft,
    survivalExpense,
    retentionRate,
    onSurvivalSaved,
    canAutoPrompt,
    hasSurvivalSetup,
    theme,
    expanded,
    onQuickExpense,
    onQuickAI,
  });

  const {
    isExpanded = expanded,
    editing = false,
    showModal = false,
    showTopUpModal = false,
    topUpAmount = "",
    topUpWalletId = "",
    topUpError = "",
    targetMonths = 3,
    saving = false,
  } = state;

  const {
    safeWallets = [],
    effectiveExpense = 0,
    safeMoneyLeft = 0,
    target = 0,
    months = 0,
    pct = 0,
    status = fallbackStatus,
    milestone = null,
    themeClasses = fallbackThemeClasses,
    emergencyAdvisor = null,
  } = computed;

  const {
    setEditing = noop,
    setShowModal = noop,
    setShowTopUpModal = noop,
    setTopUpAmount = noop,
    setTopUpWalletId = noop,
    setTopUpError = noop,
    handleSaved = noop,
    changeTargetMonths = noop,
    openTopUpModal = noop,
    handleTopUpSave = noop,
  } = handlers;

  const emergencyActivity = getEmergencyActivityLog(liveEmergencyFund);
  const coverageLabel = effectiveExpense > 0 ? `${Number(months || 0).toFixed(1)} months` : "Set expense";
  const amountNeeded = Math.max(Number(target || 0) - Number(safeMoneyLeft || 0), 0);
  const targetLabel = milestone?.label || `${targetMonths}-Month Safety`;
  const safetyStage = getSafetyStage({ effectiveExpense, amountNeeded, pct });
  const nextStep = buildNextStepCopy({
    effectiveExpense,
    amountNeeded,
    targetLabel,
    emergencyAdvisor,
  });

  const closeTopUpModal = () => {
    setShowTopUpModal(false);
    setTopUpError("");
  };

  const closeResetModal = () => {
    if (resetting) return;
    setShowResetModal(false);
    setResetError("");
  };

  const closeUseModal = () => {
    if (usingFund) return;
    setShowUseModal(false);
    setUseAmount("");
    setUseReason("");
    setUseNote("");
    setUseError("");
  };

  const useEmergencyFund = async () => {
    if (typeof updateEmergencyFund !== "function") {
      setUseError("Emergency usage log is not available yet.");
      return;
    }

    const amount = toNumber(useAmount);
    const currentReserve = toNumber(safeMoneyLeft);
    const reason = String(useReason || "").trim();
    const note = String(useNote || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setUseError("Enter a valid emergency amount.");
      return;
    }

    if (amount > currentReserve) {
      setUseError("This is higher than your current emergency reserve.");
      return;
    }

    if (!reason) {
      setUseError("Add a short emergency reason before using the fund.");
      return;
    }

    const now = new Date().toISOString();
    const nextReserve = Math.max(currentReserve - amount, 0);
    const nextActivity = [
      {
        id: `emergency_use_${Date.now()}`,
        type: "use",
        amount,
        reason,
        note,
        balanceBefore: currentReserve,
        balanceAfter: nextReserve,
        createdAt: now,
        created_at: now,
      },
      ...emergencyActivity,
    ].slice(0, 60);

    setUsingFund(true);
    setUseError("");

    try {
      await updateEmergencyFund({
        ...(liveEmergencyFund || {}),
        savedAmount: nextReserve,
        saved_amount: nextReserve,
        amount: nextReserve,
        balance: nextReserve,
        moneyLeft: nextReserve,
        protectedBalance: nextReserve,
        protected_balance: nextReserve,
        reserveBalance: nextReserve,
        reserve_balance: nextReserve,
        emergencyActivityLog: nextActivity,
        emergency_activity_log: nextActivity,
        usageLog: nextActivity,
        usage_log: nextActivity,
        lastEmergencySpendAmount: amount,
        last_emergency_spend_amount: amount,
        lastEmergencySpendReason: reason,
        last_emergency_spend_reason: reason,
        lastEmergencySpendAt: now,
        last_emergency_spend_at: now,
        updatedAt: now,
        updated_at: now,
      });

      if (typeof refreshData === "function") await refreshData();
      closeUseModal();
    } catch (error) {
      console.error("Unable to log emergency fund usage:", error);
      setUseError("CLARA could not log this emergency usage yet. Try again.");
    } finally {
      setUsingFund(false);
    }
  };

  const resetEmergencyFund = async () => {
    if (typeof updateEmergencyFund !== "function") {
      setResetError("Reset is not available yet.");
      return;
    }

    const now = new Date().toISOString();
    setResetting(true);
    setResetError("");

    try {
      await updateEmergencyFund({
        ...(liveEmergencyFund || {}),
        savedAmount: 0,
        saved_amount: 0,
        amount: 0,
        balance: 0,
        moneyLeft: 0,
        protectedBalance: 0,
        protected_balance: 0,
        reserveBalance: 0,
        reserve_balance: 0,
        targetAmount: 0,
        target_amount: 0,
        target: 0,
        monthlyTarget: 0,
        monthly_target: 0,
        survivalExpense: 0,
        survival_expense: 0,
        monthlyExpense: 0,
        monthly_expense: 0,
        monthly_survival_expense: 0,
        targetMonths: 3,
        target_months: 3,
        months_target: 3,
        reserveWalletId: null,
        reserve_wallet_id: null,
        reserveWalletName: null,
        reserve_wallet_name: null,
        lastTopUpAmount: null,
        last_top_up_amount: null,
        lastTopUpWalletId: null,
        last_top_up_wallet_id: null,
        lastReserveTransferAt: null,
        last_reserve_transfer_at: null,
        lastEmergencySpendAmount: null,
        last_emergency_spend_amount: null,
        emergencyActivityLog: [],
        emergency_activity_log: [],
        usageLog: [],
        usage_log: [],
        resetAt: now,
        reset_at: now,
        updatedAt: now,
        updated_at: now,
      });

      if (typeof refreshData === "function") await refreshData();
      onSurvivalSaved?.(0);
      setShowResetModal(false);
    } catch (error) {
      console.error("Unable to reset emergency fund:", error);
      setResetError("CLARA could not reset the emergency fund yet. Try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <SurvivalExpenseModal
        open={showModal || editing}
        initialValue={effectiveExpense}
        onSaved={handleSaved}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(false);
            setShowModal(false);
          }
        }}
      />

      <EmergencyTopUpModal
        open={showTopUpModal}
        onClose={closeTopUpModal}
        safeWallets={safeWallets}
        topUpWalletId={topUpWalletId}
        setTopUpWalletId={setTopUpWalletId}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        topUpError={topUpError}
        setTopUpError={setTopUpError}
        handleTopUpSave={handleTopUpSave}
        saving={saving}
        themeClasses={themeClasses}
      />

      <EmergencyUseModal
        open={showUseModal}
        onClose={closeUseModal}
        onUse={useEmergencyFund}
        amount={useAmount}
        setAmount={(value) => {
          setUseAmount(value);
          setUseError("");
        }}
        reason={useReason}
        setReason={(value) => {
          setUseReason(value);
          setUseError("");
        }}
        note={useNote}
        setNote={setUseNote}
        error={useError}
        usingFund={usingFund}
        currentReserve={safeMoneyLeft}
        monthlySurvival={effectiveExpense}
        themeClasses={themeClasses}
      />

      <EmergencyResetModal
        open={showResetModal}
        onClose={closeResetModal}
        onReset={resetEmergencyFund}
        resetError={resetError}
        resetting={resetting}
        themeClasses={themeClasses}
      />

      <FinanceCardShell
        cardKey="emergencyFund"
        expanded={isExpanded}
        ringClass={status.ring || ""}
        roundedClass="rounded-3xl"
        glowLayerClassNames={EMERGENCY_GLOW_LAYERS}
        surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]"
        shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]"
      >
        {!isExpanded ? (
          <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
            <div className="relative flex min-h-0 flex-col gap-4">
              <div className="min-h-0 rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]">
                <EmergencyHeader status={status} themeClasses={themeClasses} />

                <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
                  <p className={`text-[32px] font-bold leading-none tracking-[-0.045em] ${status.text || fallbackStatus.text}`}>
                    {coverageLabel}
                  </p>
                  <p className={`mt-2 text-sm font-semibold leading-tight ${themeClasses.body || "text-white/70"}`}>
                    Protection covered right now.
                  </p>

                  <div className="mt-3 grid grid-cols-3 divide-x divide-white/[0.055] overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105]">
                    <div className="px-2.5 py-2.5 text-center">
                      <p className="truncate text-[13px] font-black text-white/88">{fmt(safeMoneyLeft)}</p>
                      <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">Saved</p>
                    </div>
                    <div className="px-2.5 py-2.5 text-center">
                      <p className="truncate text-[13px] font-black text-white/88">{fmt(target)}</p>
                      <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">Target</p>
                    </div>
                    <div className="px-2.5 py-2.5 text-center">
                      <p className={`truncate text-[13px] font-black ${status.text || fallbackStatus.text}`}>{status.label || "Protected"}</p>
                      <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">Status</p>
                    </div>
                  </div>
                </div>
              </div>

              <ExpandButtonRow expanded={false} onToggleDetails={onToggleDetails} />
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
            <div className="relative flex min-h-0 flex-1 flex-col gap-4">
              <div className="shrink-0">
                <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${status.text || fallbackStatus.text}`}>
                  {coverageLabel}
                </p>
                <p className={`mt-2 text-xs font-semibold leading-relaxed ${themeClasses.body || "text-white/68"}`}>
                  Protection covered right now.
                </p>
              </div>

              <ExpandButtonRow expanded={true} onToggleDetails={onToggleDetails} />

              <div className="min-h-0 flex-1 overflow-hidden pt-1">
                <FinanceCardExpandedPanel className="h-full space-y-3 overflow-y-auto pr-1">
                  <div>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white/84">Goal</span>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-white/46">
                          Choose how many months CLARA should protect.
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-white/48">{targetLabel}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {VALID_TARGET_MONTHS.map((item) => {
                        const active = targetMonths === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => changeTargetMonths(item)}
                            disabled={saving}
                            className={`relative rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
                              active
                                ? "border-emerald-300/22 bg-emerald-400/[0.09] text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.12)]"
                                : "border-white/[0.05] bg-black/[0.105] text-white/72 hover:bg-white/[0.04] hover:text-white/88"
                            }`}
                          >
                            <span className="block">{item} Months</span>
                            {active ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.70)]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-emerald-300/12 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.10),transparent_42%),rgba(16,185,129,0.055)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_18px_rgba(16,185,129,0.035)]">
                    <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/46">
                      Next step
                    </p>
                    <p className="relative mt-2 text-[17px] font-black leading-snug text-white/92">
                      {nextStep.title}
                    </p>
                    <p className="relative mt-3 text-[12.5px] font-semibold leading-6 text-white/68">
                      {nextStep.message}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.045] bg-black/[0.105] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                        Current setup
                      </span>
                      <span className={`text-[11px] font-black ${status.text || fallbackStatus.text}`}>
                        {safetyStage}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-[12px] font-semibold text-white/58">
                      <div className="rounded-xl border border-white/[0.045] bg-black/[0.10] px-3 py-3">
                        <p className="text-white/34">Monthly survival cost</p>
                        <p className="mt-1.5 text-sm font-black text-white/84">{fmt(effectiveExpense)}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.045] bg-black/[0.10] px-3 py-3">
                        <p className="text-white/34">Target amount</p>
                        <p className="mt-1.5 text-sm font-black text-white/84">{fmt(target)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.045] bg-black/[0.105] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                        Emergency activity
                      </span>
                      <span className="text-[10px] font-semibold text-white/38">
                        Private log
                      </span>
                    </div>
                    <EmergencyActivityList activity={emergencyActivity} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3.5 text-[12px] font-semibold transition ${premiumActionClass}`}
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={openTopUpModal}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-2 py-3.5 text-[12px] font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)] transition hover:bg-emerald-400/[0.13]"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUseModal(true)}
                      disabled={toNumber(safeMoneyLeft) <= 0}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-2 py-3.5 text-[12px] font-black text-amber-100/90 shadow-[0_0_18px_rgba(251,191,36,0.06)] transition hover:bg-amber-400/[0.13] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <MinusCircle className="h-4 w-4" />
                      Use
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-2 py-3.5 text-[12px] font-black text-rose-100/90 shadow-[0_0_18px_rgba(244,63,94,0.06)] transition hover:bg-rose-400/[0.13]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </button>
                  </div>

                  <div aria-hidden="true" className="h-5 shrink-0" />
                </FinanceCardExpandedPanel>
              </div>
            </div>
          </div>
        )}
      </FinanceCardShell>
    </>
  );
}

export { premiumActionClass, expandButtonClass, EMERGENCY_GLOW_LAYERS };
