import { Shield, Edit2, Plus, X, Check } from "lucide-react";

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

                  <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition ${premiumActionClass}`}
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Expense
                    </button>

                    <button
                      type="button"
                      onClick={openTopUpModal}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-4 py-3.5 text-sm font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)] transition hover:bg-emerald-400/[0.13]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Fund
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
