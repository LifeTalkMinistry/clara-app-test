import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ShieldCheck, X } from "lucide-react";

import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import GuidedWalletCreationModal from "@/components/fresh/main-dashboard/dashboard-primitives/GuidedWalletCreationModal";
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
  toIncomeHubNumber,
  updateIncomeSource,
} from "@/lib/incomeHubRepository";
import {
  getWalletDisplayBalance,
  getWalletDisplayName,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

const BUDGET_PROTECTION_STORAGE_KEY = "clara_budget_protection_settings";
const BUDGET_PROTECTION_UPDATED_EVENT = "clara:budget-protection-settings-updated";
const DEFAULT_BUDGET_PROTECTION_SETTINGS = {
  setupCompleted: false,
  includeSavingsGoals: false,
  savingsGoalMode: "none",
  selectedSavingsGoalIds: [],
  savingsContributionMode: "goalMonthly",
  savingsGoalMonthlyAmounts: {},
  includeEmergencyFund: false,
  emergencyFundContributionMode: "fixed",
  emergencyFundMonthlyAmount: 0,
  createdAt: null,
  updatedAt: null,
};

function getIncomeSourceBalance(source) {
  if (!source) return 0;
  const totalMoneyIn = toIncomeHubNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in);
  const totalMoneyOut = toIncomeHubNumber(source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out);
  const explicitBalance = source.currentBalance ?? source.current_balance ?? source.balance;
  if (explicitBalance !== undefined && explicitBalance !== null && explicitBalance !== "") return toIncomeHubNumber(explicitBalance);
  return totalMoneyIn - totalMoneyOut;
}

function formatFallbackMoney(value) {
  return `₱${toIncomeHubNumber(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : fallback;
};
const cleanSettings = (settings = {}) => ({
  ...DEFAULT_BUDGET_PROTECTION_SETTINGS,
  ...settings,
  setupCompleted: settings.setupCompleted === true,
  includeSavingsGoals: settings.includeSavingsGoals === true,
  savingsGoalMode: ["none", "selected", "all"].includes(settings.savingsGoalMode) ? settings.savingsGoalMode : "none",
  selectedSavingsGoalIds: safeArray(settings.selectedSavingsGoalIds).map(String).filter(Boolean),
  savingsContributionMode: ["goalMonthly", "fixed", "targetDate"].includes(settings.savingsContributionMode) ? settings.savingsContributionMode : "goalMonthly",
  savingsGoalMonthlyAmounts: settings.savingsGoalMonthlyAmounts && typeof settings.savingsGoalMonthlyAmounts === "object" ? settings.savingsGoalMonthlyAmounts : {},
  includeEmergencyFund: settings.includeEmergencyFund === true,
  emergencyFundContributionMode: ["fixed", "setupTarget", "leftover"].includes(settings.emergencyFundContributionMode) ? settings.emergencyFundContributionMode : "fixed",
  emergencyFundMonthlyAmount: Math.max(0, safeNumber(settings.emergencyFundMonthlyAmount)),
});
const readBudgetProtectionSettings = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return cleanSettings();
    const raw = window.localStorage.getItem(BUDGET_PROTECTION_STORAGE_KEY);
    return raw ? cleanSettings(JSON.parse(raw)) : cleanSettings();
  } catch {
    return cleanSettings();
  }
};
const saveBudgetProtectionSettings = (settings = {}) => {
  const current = readBudgetProtectionSettings();
  const timestamp = new Date().toISOString();
  const next = cleanSettings({
    ...current,
    ...settings,
    createdAt: current.createdAt || settings.createdAt || timestamp,
    updatedAt: timestamp,
  });
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(BUDGET_PROTECTION_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(BUDGET_PROTECTION_UPDATED_EVENT, { detail: { settings: next } }));
    }
  } catch (error) {
    console.warn("CLARA budget protection save failed:", error);
  }
  return next;
};
const goalId = (goal = {}, index = 0) => String(goal.id || goal.goal_id || goal.key || `goal-${index}`);
const goalTitle = (goal = {}, index = 0) => String(goal.title || goal.name || goal.goal_name || `Savings Goal ${index + 1}`);
const goalTarget = (goal = {}) => safeNumber(goal.target_amount ?? goal.targetAmount ?? goal.goal_amount ?? goal.target ?? goal.goal);
const goalSaved = (goal = {}) => safeNumber(goal.saved_amount ?? goal.current_amount ?? goal.saved ?? goal.current ?? goal.amount);
const goalActive = (goal = {}) => {
  const status = String(goal.status || goal.goal_status || goal.state || "active").toLowerCase();
  if (["done", "completed", "complete", "archived", "inactive"].includes(status)) return false;
  const target = goalTarget(goal);
  return target <= 0 || goalSaved(goal) < target;
};

function OptionButton({ selected, title, body, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        selected
          ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-50 shadow-[0_14px_34px_rgba(16,185,129,0.10)]"
          : "border-white/12 bg-white/[0.045] text-white/72 hover:bg-white/[0.07]"
      }`}
    >
      <p className="text-sm font-black text-white">{title}</p>
      {body ? <p className="mt-1 text-xs leading-5 text-white/48">{body}</p> : null}
    </button>
  );
}

function BudgetProtectionSetupModal({ open, initialSettings, savingsGoals = [], emergencyFund = null, formatMoney, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => cleanSettings(initialSettings));
  const [notice, setNotice] = useState("");
  const activeGoals = useMemo(() => safeArray(savingsGoals).filter(goalActive), [savingsGoals]);
  const fmt = useCallback((value) => (typeof formatMoney === "function" ? formatMoney(value) : formatFallbackMoney(value)), [formatMoney]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setNotice("");
    setDraft(cleanSettings(initialSettings));
  }, [initialSettings, open]);

  if (!open) return null;

  const saveAndClose = (nextDraft = draft) => {
    const cleanDraft = cleanSettings({ ...nextDraft, setupCompleted: true });
    if (cleanDraft.includeEmergencyFund && cleanDraft.emergencyFundContributionMode === "fixed" && safeNumber(cleanDraft.emergencyFundMonthlyAmount) <= 0) {
      setNotice("Enter a monthly Emergency Fund reserve above ₱0, or choose setup target / leftover.");
      setStep(3);
      return;
    }
    const saved = saveBudgetProtectionSettings(cleanDraft);
    onSaved?.(saved);
  };

  const skipSetup = () => saveAndClose({
    setupCompleted: true,
    includeSavingsGoals: false,
    savingsGoalMode: "none",
    selectedSavingsGoalIds: [],
    includeEmergencyFund: false,
    emergencyFundContributionMode: "fixed",
    emergencyFundMonthlyAmount: 0,
  });

  const toggleGoal = (id) => {
    setDraft((current) => {
      const key = String(id);
      const selected = new Set(current.selectedSavingsGoalIds || []);
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      return { ...current, selectedSavingsGoalIds: [...selected] };
    });
  };

  const Header = () => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/80">
          <ShieldCheck className="h-3.5 w-3.5" />
          Budget Protection Setup
        </div>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-white">{step === 4 ? "Your Budget Protection Setup" : "Should your budget include savings and protection?"}</h2>
      </div>
      <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/65 hover:bg-white/[0.1] hover:text-white" aria-label="Close budget protection setup">
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[#020713]/82 p-0 backdrop-blur-md sm:items-center sm:p-4" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[32px] border border-white/15 bg-[#07111f] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:rounded-[32px]">
        <Header />
        <p className="mt-3 text-sm font-semibold leading-6 text-white/58">
          CLARA can include Savings Goals and Emergency Fund in your monthly budget so they are protected before extra spending.
        </p>

        {notice ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-xs font-bold leading-5 text-amber-100">{notice}</p> : null}

        {step === 1 ? (
          <div className="mt-5 space-y-3">
            <button type="button" onClick={skipSetup} className="w-full rounded-2xl border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/[0.08]">No, skip this</button>
            <button type="button" onClick={() => setStep(2)} className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(16,185,129,0.22)]">Yes, include them</button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-black text-white">Should Savings Goals be part of your monthly budget?</p>
            <OptionButton selected={!draft.includeSavingsGoals} title="No, keep goals separate" onClick={() => setDraft((current) => ({ ...current, includeSavingsGoals: false, savingsGoalMode: "none", selectedSavingsGoalIds: [] }))} />
            <OptionButton selected={draft.includeSavingsGoals && draft.savingsGoalMode === "all"} title="Yes, include all active goals" body={`${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"} found`} onClick={() => setDraft((current) => ({ ...current, includeSavingsGoals: true, savingsGoalMode: "all" }))} />
            <OptionButton selected={draft.includeSavingsGoals && draft.savingsGoalMode === "selected"} title="Yes, let me choose goals" onClick={() => setDraft((current) => ({ ...current, includeSavingsGoals: true, savingsGoalMode: "selected" }))} />

            {draft.includeSavingsGoals ? (
              <div className="rounded-2xl border border-white/12 bg-white/[0.035] p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">Monthly method</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    ["goalMonthly", "Use each goal’s monthly contribution"],
                    ["fixed", "Let me set a monthly amount"],
                    ["targetDate", "Calculate from target date"],
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setDraft((current) => ({ ...current, savingsContributionMode: value }))} className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${draft.savingsContributionMode === value ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-black/10 text-white/55"}`}>{label}</button>
                  ))}
                </div>
              </div>
            ) : null}

            {draft.includeSavingsGoals && draft.savingsGoalMode === "selected" ? (
              <div className="space-y-2 rounded-2xl border border-white/12 bg-white/[0.035] p-3">
                {activeGoals.length ? activeGoals.map((goal, index) => {
                  const id = goalId(goal, index);
                  const selected = draft.selectedSavingsGoalIds.includes(id);
                  return (
                    <button key={id} type="button" onClick={() => toggleGoal(id)} className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left ${selected ? "border-emerald-300/25 bg-emerald-400/10" : "border-white/10 bg-black/10"}`}>
                      <span className="text-xs font-bold text-white">{goalTitle(goal, index)}</span>
                      {selected ? <Check className="h-4 w-4 text-emerald-200" /> : null}
                    </button>
                  );
                }) : <p className="text-xs leading-5 text-white/50">No savings goals yet. You can skip this for now.</p>}
              </div>
            ) : null}

            <button type="button" onClick={() => setStep(3)} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">Continue</button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-black text-white">Should Emergency Fund be part of your monthly budget?</p>
            <OptionButton selected={!draft.includeEmergencyFund} title="No, keep Emergency Fund separate" onClick={() => setDraft((current) => ({ ...current, includeEmergencyFund: false, emergencyFundContributionMode: "fixed", emergencyFundMonthlyAmount: 0 }))} />
            <OptionButton selected={draft.includeEmergencyFund} title="Yes, include Emergency Fund as monthly protection" onClick={() => setDraft((current) => ({ ...current, includeEmergencyFund: true, emergencyFundContributionMode: current.emergencyFundContributionMode || "fixed" }))} />

            {draft.includeEmergencyFund ? (
              <div className="rounded-2xl border border-white/12 bg-white/[0.035] p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">Reserve method</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    ["fixed", "Fixed monthly amount"],
                    ["setupTarget", "Use Emergency Fund setup target"],
                    ["leftover", "Use leftover after essentials"],
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setDraft((current) => ({ ...current, emergencyFundContributionMode: value }))} className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${draft.emergencyFundContributionMode === value ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-black/10 text-white/55"}`}>{label}</button>
                  ))}
                </div>
                {draft.emergencyFundContributionMode === "fixed" ? (
                  <label className="mt-3 block space-y-1.5">
                    <span className="text-xs font-bold text-white/50">Monthly Emergency Fund reserve</span>
                    <input type="number" min="0" step="0.01" value={draft.emergencyFundMonthlyAmount || ""} onChange={(event) => setDraft((current) => ({ ...current, emergencyFundMonthlyAmount: event.target.value }))} placeholder="1000" className="w-full rounded-2xl border border-white/15 bg-[#050b17] px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/35" />
                  </label>
                ) : null}
                {!emergencyFund ? <p className="mt-3 text-xs leading-5 text-white/42">Emergency Fund is not set up yet. CLARA will not crash; reserve becomes ₱0 until setup data exists.</p> : null}
              </div>
            ) : null}

            <button type="button" onClick={() => setStep(4)} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">Continue</button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/12 bg-white/[0.045] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">Savings Goals</p>
              <p className="mt-1 text-sm font-black text-white">{draft.includeSavingsGoals ? "Included" : "Not included"}</p>
              <p className="mt-1 text-xs text-white/50">Mode: {draft.savingsGoalMode === "all" ? "All active" : draft.savingsGoalMode === "selected" ? "Selected" : "None"}</p>
              <p className="mt-1 text-xs text-white/50">Monthly method: {draft.savingsContributionMode}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.045] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">Emergency Fund</p>
              <p className="mt-1 text-sm font-black text-white">{draft.includeEmergencyFund ? "Included" : "Not included"}</p>
              <p className="mt-1 text-xs text-white/50">Method: {draft.emergencyFundContributionMode}</p>
              {draft.includeEmergencyFund && draft.emergencyFundContributionMode === "fixed" ? <p className="mt-1 text-xs text-white/50">Monthly reserve: {fmt(draft.emergencyFundMonthlyAmount)}</p> : null}
            </div>
            <p className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 px-4 py-3 text-xs leading-5 text-cyan-50/70">CLARA will subtract these protected commitments before judging extra spending.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep(3)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/70"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button type="button" onClick={() => saveAndClose()} className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white">Save settings</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AddFromIncomeHubModal({
  open,
  wallet,
  incomeSources = [],
  incomeSourcesLoading = false,
  financeActionLoading = false,
  savingWallet = false,
  financeForm,
  setFinanceForm,
  formatMoney,
  onClose,
  onSubmit,
}) {
  const selectedSource = incomeSources.find(
    (source) => String(source.id) === String(financeForm.incomeSourceId || "")
  );
  const selectedSourceBalance = selectedSource ? getIncomeSourceBalance(selectedSource) : 0;
  const destinationBalance = getWalletDisplayBalance(wallet);

  return (
    <FinanceActionModal
      open={open}
      title="Add from Income Hub"
      description={`Move recorded income into ${getWalletDisplayName(wallet)}.`}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      submitLabel="Add from Income Hub"
      loading={financeActionLoading || savingWallet}
    >
      <FinanceField
        label="Income source"
        helper={
          incomeSources.length
            ? "Choose which recorded income will fund this wallet."
            : "No available Income Hub source. Record income first."
        }
      >
        <select
          value={financeForm.incomeSourceId || ""}
          disabled={!incomeSources.length || incomeSourcesLoading || financeActionLoading || savingWallet}
          onChange={(event) =>
            setFinanceForm((prev) => ({
              ...prev,
              incomeSourceId: event.target.value,
            }))
          }
          className={financeInputClassName}
        >
          {incomeSources.length ? (
            incomeSources.map((source) => (
              <option key={source.id} value={String(source.id)}>
                {source.name || source.source_name || "Income Hub"} • {formatMoney(getIncomeSourceBalance(source))}
              </option>
            ))
          ) : (
            <option value="">No Income Hub money available</option>
          )}
        </select>
      </FinanceField>

      {!incomeSources.length ? (
        <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-xs font-bold leading-5 text-amber-100">
          Record income first before adding money to a wallet.
        </p>
      ) : null}

      <FinanceField
        label="Amount"
        helper={`Available from Income Hub: ${formatMoney(selectedSourceBalance)} • Destination wallet balance: ${formatMoney(destinationBalance)}`}
      >
        <input
          type="number"
          min="0"
          step="0.01"
          value={financeForm.amount}
          onChange={(event) =>
            setFinanceForm((prev) => ({
              ...prev,
              amount: event.target.value,
            }))
          }
          placeholder="0.00"
          className={financeInputClassName}
        />
      </FinanceField>
    </FinanceActionModal>
  );
}

export default function DashboardFinanceModalRendererWithIncomeFunding(props) {
  const {
    financeModal,
    closeFinanceModal,
    financeActionLoading,
    financeForm,
    setFinanceForm,
    fmt,
    showFinanceNotice,
  } = props;

  const { user: authUser } = useAuth();
  const effectiveUser = props.user || authUser;
  const financial = useFinancialData(effectiveUser);
  const [incomeSources, setIncomeSources] = useState([]);
  const [incomeSourcesLoading, setIncomeSourcesLoading] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [budgetProtectionSettings, setBudgetProtectionSettings] = useState(() => readBudgetProtectionSettings());
  const [budgetProtectionEditorOpen, setBudgetProtectionEditorOpen] = useState(false);

  const createWalletOpen = financeModal?.type === "create_wallet";
  const addMoneyOpen = financeModal?.type === "add_money";
  const budgetSetupOpen = financeModal?.type === "save_budget";
  const formatMoney = useCallback((value) => (typeof fmt === "function" ? fmt(value) : formatFallbackMoney(value)), [fmt]);
  const visibleSavingsGoals = safeArray(financial.savingsGoals || props.savingsGoals);
  const visibleEmergencyFund = financial.emergencyFund || props.emergencyFund || null;
  const shouldGateBudgetSetup = budgetSetupOpen && !budgetProtectionSettings.setupCompleted;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncProtectionSettings = () => setBudgetProtectionSettings(readBudgetProtectionSettings());
    window.addEventListener("storage", syncProtectionSettings);
    window.addEventListener(BUDGET_PROTECTION_UPDATED_EVENT, syncProtectionSettings);
    return () => {
      window.removeEventListener("storage", syncProtectionSettings);
      window.removeEventListener(BUDGET_PROTECTION_UPDATED_EVENT, syncProtectionSettings);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__CLARA_BUDGET_PROTECTION_CONTEXT = {
      savingsGoals: visibleSavingsGoals,
      emergencyFund: visibleEmergencyFund,
    };
    window.dispatchEvent(new CustomEvent(BUDGET_PROTECTION_UPDATED_EVENT, { detail: { settings: readBudgetProtectionSettings() } }));
  }, [visibleEmergencyFund, visibleSavingsGoals]);

  const handleProtectionSaved = useCallback((settings) => {
    setBudgetProtectionSettings(settings);
    setBudgetProtectionEditorOpen(false);
  }, []);

  const handleProtectionClose = useCallback(() => {
    if (shouldGateBudgetSetup) {
      closeFinanceModal?.();
      return;
    }
    setBudgetProtectionEditorOpen(false);
  }, [closeFinanceModal, shouldGateBudgetSetup]);

  const loadIncomeSources = useCallback(async () => {
    if (!createWalletOpen && !addMoneyOpen) return;

    try {
      setIncomeSourcesLoading(true);
      const localUserId = getIncomeHubLocalUserId(effectiveUser);
      const sources = await getIncomeSources(localUserId);
      const cleanSources = Array.isArray(sources) ? sources : [];
      setIncomeSources(cleanSources);
      setFinanceForm((prev) => {
        const currentId = String(prev?.incomeSourceId || "");
        const hasCurrentSource = cleanSources.some((source) => String(source.id) === currentId);
        if (!cleanSources.length) return { ...prev, incomeSourceId: "" };
        if (hasCurrentSource) return prev;
        return { ...prev, incomeSourceId: String(cleanSources[0]?.id || "") };
      });
    } catch (error) {
      console.warn("CLARA income source load failed:", error);
      setIncomeSources([]);
      showFinanceNotice?.("Unable to load income sources yet.");
    } finally {
      setIncomeSourcesLoading(false);
    }
  }, [addMoneyOpen, createWalletOpen, effectiveUser, setFinanceForm, showFinanceNotice]);

  useEffect(() => {
    if (!createWalletOpen && !addMoneyOpen) return undefined;
    loadIncomeSources();
    if (typeof window === "undefined") return undefined;
    window.addEventListener("clara-income-hub-updated", loadIncomeSources);
    return () => window.removeEventListener("clara-income-hub-updated", loadIncomeSources);
  }, [addMoneyOpen, createWalletOpen, loadIncomeSources]);

  const debitIncomeSource = useCallback(
    async ({ incomeSourceId, amount }) => {
      const localUserId = getIncomeHubLocalUserId(effectiveUser);
      const latestSources = await getIncomeSources(localUserId);
      const selectedSource = latestSources.find((source) => String(source.id) === String(incomeSourceId));
      if (!selectedSource) throw new Error("Please select a valid Income Hub source.");
      const currentBalance = getIncomeSourceBalance(selectedSource);
      if (currentBalance < amount) throw new Error("Insufficient balance in the selected Income Hub source.");
      const totalMoneyIn = toIncomeHubNumber(selectedSource.totalMoneyIn ?? selectedSource.total_money_in);
      const nextTotalMoneyOut = toIncomeHubNumber(selectedSource.totalMoneyOut ?? selectedSource.total_money_out) + amount;
      const nowIso = new Date().toISOString();

      await updateIncomeSource(localUserId, selectedSource.id, {
        totalMoneyOut: nextTotalMoneyOut,
        total_money_out: nextTotalMoneyOut,
        currentBalance: totalMoneyIn - nextTotalMoneyOut,
        current_balance: totalMoneyIn - nextTotalMoneyOut,
        lastActivityAt: nowIso,
        last_activity_at: nowIso,
        updatedAt: nowIso,
        updated_at: nowIso,
      });

      dispatchClaraEvent("clara-income-hub-updated");
      return selectedSource;
    },
    [effectiveUser]
  );

  const addMoneyFromIncomeHub = useCallback(async () => {
    const wallet = financeModal?.payload;
    const amount = toIncomeHubNumber(financeForm.amount);
    const incomeSourceId = String(financeForm.incomeSourceId || "");

    if (!wallet) return;

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice?.("Please enter a valid amount.");
      return;
    }

    if (!incomeSources.length) {
      showFinanceNotice?.("Record income first before adding money to a wallet.");
      return;
    }

    if (!incomeSourceId) {
      showFinanceNotice?.("Choose an Income Hub source first.");
      return;
    }

    try {
      setSavingWallet(true);
      const selectedSource = await debitIncomeSource({ incomeSourceId, amount });

      await financial.addIncome?.({
        wallet_id: wallet.id,
        type: "income",
        amount,
        incomeSourceId: selectedSource.id,
        income_source_id: selectedSource.id,
        source: selectedSource.name || selectedSource.source_name || "Income Hub",
        source_type: "income_hub",
        notes: `Added from Income Hub: ${selectedSource.name || selectedSource.source_name || "Income Hub"}`,
        user_id: effectiveUser?.id || null,
        user_email: effectiveUser?.email || null,
        created_by: effectiveUser?.email || null,
      });

      dispatchClaraEvent("clara-wallets-updated", {
        reason: "wallet-funded-from-income-hub",
      });

      dispatchClaraEvent("clara-finance-updated", {
        reason: "wallet-funded-from-income-hub",
      });

      await financial.refreshData?.();
      closeFinanceModal?.();
      showFinanceNotice?.("Money added from Income Hub.", "success");
    } catch (error) {
      console.warn("CLARA add from Income Hub failed:", error);
      showFinanceNotice?.(error?.message || "Failed to add money from Income Hub.");
    } finally {
      setSavingWallet(false);
    }
  }, [
    closeFinanceModal,
    debitIncomeSource,
    effectiveUser?.email,
    effectiveUser?.id,
    financeForm.amount,
    financeForm.incomeSourceId,
    financeModal?.payload,
    financial,
    incomeSources.length,
    showFinanceNotice,
  ]);

  const createWalletFromGuidedSetup = useCallback(async () => {
    const name = normalizeString(financeForm.name);
    const selectedWalletType = normalizeString(financeForm.type) || "cash";
    const customWalletType = normalizeString(financeForm.customWalletType);
    const walletType = selectedWalletType === "custom" ? customWalletType || "other" : selectedWalletType;
    const incomeSourceId = String(financeForm.incomeSourceId || "");
    const rawAmount = String(financeForm.amount ?? financeForm.startingBalance ?? "").trim();
    const amount = rawAmount === "" ? 0 : toIncomeHubNumber(rawAmount);
    const startingBalanceMode = normalizeString(financeForm.startingBalanceMode) || (amount > 0 ? "income_hub" : "skip");
    const shouldFundFromIncomeSource = startingBalanceMode === "income_hub" && amount > 0;

    if (!name) return showFinanceNotice?.("Please enter a wallet name.");
    if (!walletType) return showFinanceNotice?.("Please enter a wallet type.");
    if (!Number.isFinite(amount) || amount < 0) return showFinanceNotice?.("Please enter a valid amount, or leave it at 0.");
    if (shouldFundFromIncomeSource && !incomeSources.length) return showFinanceNotice?.("Create an income source first before funding a wallet.");
    if (shouldFundFromIncomeSource && !incomeSourceId) return showFinanceNotice?.("Please select an income source.");

    try {
      setSavingWallet(true);
      let selectedSource = null;

      if (shouldFundFromIncomeSource) {
        selectedSource = await debitIncomeSource({ incomeSourceId, amount });
      }

      await financial.addWallet?.({
        name,
        type: walletType,
        balance: amount,
        starting_balance: amount,
        sort_order: Array.isArray(props.wallets) ? props.wallets.length : 0,
        user_id: effectiveUser?.id || null,
        user_email: effectiveUser?.email || null,
        created_by: effectiveUser?.email || null,
        incomeSourceId: selectedSource?.id || null,
        income_source_id: selectedSource?.id || null,
        source: selectedSource?.name || selectedSource?.source_name || "",
      });

      dispatchClaraEvent("clara-wallets-updated", {
        reason: "wallet-created",
      });

      dispatchClaraEvent("clara-finance-updated", {
        reason: "wallet-created",
      });

      await financial.refreshData?.();
      closeFinanceModal?.();
      showFinanceNotice?.("Wallet created successfully.", "success");
    } catch (error) {
      console.warn("CLARA wallet creation failed:", error);
      showFinanceNotice?.(error?.message || "Failed to create wallet.");
    } finally {
      setSavingWallet(false);
    }
  }, [closeFinanceModal, debitIncomeSource, effectiveUser, financeForm.amount, financeForm.customWalletType, financeForm.incomeSourceId, financeForm.name, financeForm.startingBalance, financeForm.startingBalanceMode, financeForm.type, financial, incomeSources.length, props.wallets, showFinanceNotice]);

  if (createWalletOpen) {
    return (
      <GuidedWalletCreationModal
        open={createWalletOpen}
        onClose={closeFinanceModal}
        onSave={createWalletFromGuidedSetup}
        loading={financeActionLoading || savingWallet}
        financeForm={financeForm}
        setFinanceForm={setFinanceForm}
        incomeSources={incomeSources}
        incomeSourcesLoading={incomeSourcesLoading}
        formatMoney={formatMoney}
        getIncomeSourceBalance={getIncomeSourceBalance}
      />
    );
  }

  if (addMoneyOpen) {
    return (
      <AddFromIncomeHubModal
        open={addMoneyOpen}
        wallet={financeModal?.payload}
        incomeSources={incomeSources}
        incomeSourcesLoading={incomeSourcesLoading}
        financeActionLoading={financeActionLoading}
        savingWallet={savingWallet}
        financeForm={financeForm}
        setFinanceForm={setFinanceForm}
        formatMoney={formatMoney}
        onClose={closeFinanceModal}
        onSubmit={addMoneyFromIncomeHub}
      />
    );
  }

  return (
    <>
      <DashboardFinanceModalRenderer {...props} />
      {budgetSetupOpen && budgetProtectionSettings.setupCompleted ? (
        <button
          type="button"
          onClick={() => setBudgetProtectionEditorOpen(true)}
          className="fixed bottom-4 left-1/2 z-[130] flex w-[calc(100%-32px)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-[#07111f]/94 px-4 py-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl"
        >
          <span>
            <span className="block text-sm font-black text-white">Budget Protection</span>
            <span className="block text-xs text-white/48">Savings Goals and Emergency Fund reserved before spending.</span>
          </span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-100">Edit</span>
        </button>
      ) : null}
      <BudgetProtectionSetupModal
        open={shouldGateBudgetSetup || budgetProtectionEditorOpen}
        initialSettings={budgetProtectionSettings}
        savingsGoals={visibleSavingsGoals}
        emergencyFund={visibleEmergencyFund}
        formatMoney={formatMoney}
        onClose={handleProtectionClose}
        onSaved={handleProtectionSaved}
      />
    </>
  );
}
