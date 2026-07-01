import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Edit3,
  ListChecks,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import useDashboardMonthlyBudgetPlan from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan";
import { resetMonthlyBudgetCycle } from "@/lib/clara-budget-cycle-reset";
import { getPHMonthKey, normalizeString } from "@/utils/dashboard/dashboardHelpers";

const amountValue = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
};

const firstAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = amountValue(value, NaN);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

const fmt = (value = 0) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountValue(value));

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
const addDays = (date, days) => {
  const value = new Date(`${String(date || today()).slice(0, 10)}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

const card =
  "rounded-[28px] border border-cyan-100/12 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl";
const input =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/45 focus:bg-black/25";
const primaryButton =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-4 py-3.5 text-sm font-black text-[#03171a] shadow-[0_16px_34px_rgba(45,212,191,0.2)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton =
  "flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3.5 text-sm font-bold text-white/72 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";

const BUDGET_PROTECTION_STORAGE_KEY = "clara_budget_protection_settings";
const BUDGET_PROTECTION_UPDATED_EVENT = "clara:budget-protection-settings-updated";
const DEFAULT_BUDGET_PROTECTION_SETTINGS = {
  setupCompleted: false,
  includeEmergencyFund: false,
  emergencyFundContributionMode: "fixed",
  emergencyFundMonthlyAmount: 0,
  includeSavingsGoals: false,
  savingsGoalMode: "none",
  selectedSavingsGoalIds: [],
  savingsContributionMode: "fixed",
  savingsGoalMonthlyAmounts: {},
  createdAt: null,
  updatedAt: null,
};

function fireBudgetEvents() {
  if (typeof window === "undefined") return;
  [
    "clara-budgets-updated",
    "clara-finance-updated",
    "clara-local-finance-updated",
  ].forEach((name) => window.dispatchEvent(new Event(name)));
}

function cleanProtectionSettings(settings = {}) {
  return {
    ...DEFAULT_BUDGET_PROTECTION_SETTINGS,
    ...settings,
    setupCompleted: settings.setupCompleted === true,
    includeEmergencyFund: settings.includeEmergencyFund === true,
    emergencyFundContributionMode: "fixed",
    emergencyFundMonthlyAmount: Math.max(0, amountValue(settings.emergencyFundMonthlyAmount)),
    includeSavingsGoals: settings.includeSavingsGoals === true,
    savingsGoalMode: ["none", "selected", "all"].includes(settings.savingsGoalMode)
      ? settings.savingsGoalMode
      : "none",
    selectedSavingsGoalIds: Array.isArray(settings.selectedSavingsGoalIds)
      ? settings.selectedSavingsGoalIds.map(String).filter(Boolean)
      : [],
    savingsContributionMode: "fixed",
    savingsGoalMonthlyAmounts:
      settings.savingsGoalMonthlyAmounts && typeof settings.savingsGoalMonthlyAmounts === "object"
        ? settings.savingsGoalMonthlyAmounts
        : {},
  };
}

function readProtectionSettings() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return cleanProtectionSettings();
    }
    const raw = window.localStorage.getItem(BUDGET_PROTECTION_STORAGE_KEY);
    return raw ? cleanProtectionSettings(JSON.parse(raw)) : cleanProtectionSettings();
  } catch {
    return cleanProtectionSettings();
  }
}

function saveProtectionSettings(settings = {}) {
  const current = readProtectionSettings();
  const timestamp = new Date().toISOString();
  const next = cleanProtectionSettings({
    ...current,
    ...settings,
    createdAt: current.createdAt || timestamp,
    updatedAt: timestamp,
  });

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(BUDGET_PROTECTION_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent(BUDGET_PROTECTION_UPDATED_EVENT, { detail: { settings: next } }),
      );
    }
  } catch (error) {
    console.warn("CLARA budget protection save failed:", error);
  }

  return next;
}

function goalId(goal = {}, index = 0) {
  return String(goal.id || goal.goal_id || goal.key || `goal-${index}`);
}

function goalTitle(goal = {}, index = 0) {
  return String(goal.title || goal.name || goal.goal_name || `Savings Goal ${index + 1}`);
}

function goalTarget(goal = {}) {
  return firstAmount(
    goal.target_amount,
    goal.targetAmount,
    goal.goal_amount,
    goal.target,
    goal.goal,
  );
}

function goalSaved(goal = {}) {
  return firstAmount(
    goal.saved_amount,
    goal.current_amount,
    goal.saved,
    goal.current,
    goal.amount,
  );
}

function isActiveGoal(goal = {}) {
  const status = String(goal.status || goal.goal_status || goal.state || "active").toLowerCase();
  if (["done", "completed", "complete", "archived", "inactive"].includes(status)) return false;
  const target = goalTarget(goal);
  return target <= 0 || goalSaved(goal) < target;
}

function goalProgressText(goal = {}) {
  const saved = goalSaved(goal);
  const target = goalTarget(goal);
  if (target > 0) return `${fmt(saved)} of ${fmt(target)}`;
  return saved > 0 ? `${fmt(saved)} saved` : "Target not set yet";
}

function hasEmergencyFundSetup(emergencyFund) {
  if (!emergencyFund || typeof emergencyFund !== "object") return false;
  if (emergencyFund.resetAt || emergencyFund.reset_at) return false;

  const status = String(
    emergencyFund.status || emergencyFund.state || emergencyFund.setup_status || "",
  )
    .trim()
    .toLowerCase();

  if (["reset", "inactive", "archived", "deleted", "not_setup", "not set"].includes(status)) {
    return false;
  }

  const hasSetupFlag =
    emergencyFund.is_setup === true ||
    emergencyFund.isSetup === true ||
    emergencyFund.setup_complete === true ||
    emergencyFund.setupComplete === true ||
    emergencyFund.setupCompleted === true ||
    emergencyFund.is_configured === true ||
    emergencyFund.isConfigured === true;

  const hasSetupStatus = ["active", "setup", "configured", "complete", "completed", "ready"].includes(
    status,
  );

  const survivalCost = firstAmount(
    emergencyFund.monthly_survival_cost,
    emergencyFund.monthlySurvivalCost,
    emergencyFund.survival_expense,
    emergencyFund.survivalExpense,
    emergencyFund.monthlyExpense,
    emergencyFund.monthly_expense,
    emergencyFund.monthly_survival_expense,
  );

  const targetAmount = firstAmount(
    emergencyFund.target_amount,
    emergencyFund.targetAmount,
    emergencyFund.target,
    emergencyFund.goal_amount,
  );

  const walletId = String(
    emergencyFund.linkedWalletId ||
      emergencyFund.linked_wallet_id ||
      emergencyFund.reserveWalletId ||
      emergencyFund.reserve_wallet_id ||
      emergencyFund.sourceWalletId ||
      emergencyFund.source_wallet_id ||
      emergencyFund.storageWalletId ||
      emergencyFund.storage_wallet_id ||
      emergencyFund.walletId ||
      emergencyFund.wallet_id ||
      "",
  ).trim();

  return hasSetupFlag || hasSetupStatus || survivalCost > 0 || targetAmount > 0 || Boolean(walletId);
}

function normalizeCycleType(value) {
  const clean = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (["weekly", "week"].includes(clean)) return "weekly";
  if (["biweekly", "bi-weekly", "2weeks", "twoweeks"].includes(clean)) return "biweekly";
  if (clean === "custom") return "custom";
  return "monthly";
}

function getCycleWindow(type, start, end) {
  const safeType = normalizeCycleType(type);
  const safeStart = start || today();
  if (safeType === "weekly") {
    return { start: safeStart, end: addDays(safeStart, 6), label: "Weekly" };
  }
  if (safeType === "biweekly") {
    return { start: safeStart, end: addDays(safeStart, 13), label: "Bi-weekly" };
  }
  if (safeType === "custom") {
    return { start: safeStart, end: end || String(safeStart).slice(0, 10), label: "Custom" };
  }
  const month = getPHMonthKey();
  return { start: `${month}-01`, end: "", label: "Monthly" };
}

function getResetCycleWindow(type, end) {
  const resetStart = nowIso();
  const base = getCycleWindow(type, today(), end);
  return { ...base, start: resetStart, reset_start_at: resetStart };
}

function headerPayload({ amount, done, user, cycle }) {
  const now = new Date().toISOString();
  const title = `${cycle.label} Spending Plan`;
  const resetBoundary = cycle.reset_start_at || null;
  return {
    month: getPHMonthKey(),
    month_key: getPHMonthKey(),
    title,
    name: title,
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    type: "monthly_budget",
    plan_type: "monthly_budget",
    is_plan_header: true,
    budget_cycle: cycle.label.toLowerCase(),
    cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    period_start: cycle.start,
    period_end: cycle.end,
    reset_start_at: resetBoundary,
    tracking_started_at: resetBoundary,
    tracking_start_date: resetBoundary,
    declared_amount: amount,
    declared_budget: amount,
    monthly_budget_amount: amount,
    total_declared_budget: amount,
    total_budget: amount,
    amount,
    is_complete: Boolean(done),
    status: done ? "active" : "draft",
    is_active: true,
    active: true,
    updated_at: now,
    created_by: user?.email || null,
    email: user?.email || null,
    user_id: user?.id || null,
  };
}

function categoryPayload({ title, amount, order, user, cycle }) {
  const now = new Date().toISOString();
  const clean = normalizeString(title) || "Budget Category";
  return {
    month: getPHMonthKey(),
    month_key: getPHMonthKey(),
    title: clean,
    name: clean,
    category: clean,
    budget_category: clean,
    allocated: amount,
    allocated_amount: amount,
    budget_amount: amount,
    total_budget: amount,
    amount,
    sort_order: order,
    display_order: order,
    position: order,
    budget_cycle: cycle.label.toLowerCase(),
    cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    period_start: cycle.start,
    period_end: cycle.end,
    reset_start_at: cycle.reset_start_at || null,
    is_active: true,
    active: true,
    status: "active",
    updated_at: now,
    created_by: user?.email || null,
    email: user?.email || null,
    user_id: user?.id || null,
  };
}

function ProtectionSetupModal({
  open,
  settings,
  savingsGoals = [],
  hasEmergencyFundSetup = false,
  onClose,
  onSave,
}) {
  const activeGoals = useMemo(
    () => (Array.isArray(savingsGoals) ? savingsGoals : []).filter(isActiveGoal),
    [savingsGoals],
  );
  const [draft, setDraft] = useState(() => cleanProtectionSettings(settings));
  const [screen, setScreen] = useState("emergency-choice");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const clean = cleanProtectionSettings(settings);
    if (!hasEmergencyFundSetup) {
      clean.includeEmergencyFund = false;
      clean.emergencyFundMonthlyAmount = 0;
    }
    setDraft(clean);
    setMessage("");
    setScreen(hasEmergencyFundSetup ? "emergency-choice" : "savings-choice");
  }, [open, settings, hasEmergencyFundSetup]);

  if (!open) return null;

  const selectedGoalIds = Array.isArray(draft.selectedSavingsGoalIds)
    ? draft.selectedSavingsGoalIds
    : [];

  const finish = (rawDraft = draft) => {
    const selectedIds = Array.isArray(rawDraft.selectedSavingsGoalIds)
      ? rawDraft.selectedSavingsGoalIds.map(String).filter(Boolean)
      : [];
    const includeSavingsGoals = rawDraft.includeSavingsGoals === true && selectedIds.length > 0;
    const includeEmergencyFund = hasEmergencyFundSetup && rawDraft.includeEmergencyFund === true;
    const amountMap = includeSavingsGoals
      ? selectedIds.reduce((result, id) => {
          const amount = amountValue(rawDraft.savingsGoalMonthlyAmounts?.[id]);
          if (amount > 0) result[id] = amount;
          return result;
        }, {})
      : {};

    const saved = saveProtectionSettings({
      ...rawDraft,
      setupCompleted: true,
      includeEmergencyFund,
      emergencyFundContributionMode: "fixed",
      emergencyFundMonthlyAmount: includeEmergencyFund
        ? amountValue(rawDraft.emergencyFundMonthlyAmount)
        : 0,
      includeSavingsGoals,
      savingsGoalMode: includeSavingsGoals ? "selected" : "none",
      selectedSavingsGoalIds: includeSavingsGoals ? selectedIds : [],
      savingsContributionMode: "fixed",
      savingsGoalMonthlyAmounts: amountMap,
    });
    onSave(saved);
  };

  const continueAfterEmergency = (nextDraft) => {
    const clean = cleanProtectionSettings({ ...draft, ...nextDraft });
    setDraft(clean);
    setMessage("");
    if (!activeGoals.length) {
      finish({
        ...clean,
        includeSavingsGoals: false,
        savingsGoalMode: "none",
        selectedSavingsGoalIds: [],
        savingsGoalMonthlyAmounts: {},
      });
      return;
    }
    setScreen("savings-choice");
  };

  const toggleGoal = (id) => {
    setMessage("");
    setDraft((current) => {
      const selected = new Set(current.selectedSavingsGoalIds || []);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      const amounts = { ...(current.savingsGoalMonthlyAmounts || {}) };
      if (!selected.has(id)) delete amounts[id];
      return {
        ...current,
        includeSavingsGoals: selected.size > 0,
        selectedSavingsGoalIds: [...selected],
        savingsGoalMonthlyAmounts: amounts,
      };
    });
  };

  const copy = {
    "emergency-choice": {
      title: "Protect part of this budget for emergencies?",
      body: "CLARA will reserve this money before calculating what is still available for categories.",
    },
    "emergency-amount": {
      title: "How much should stay protected?",
      body: "Choose the amount you want reserved for your Emergency Fund this cycle.",
    },
    "savings-choice": {
      title: activeGoals.length === 1 ? "Include your savings goal?" : "Which savings goals should be protected?",
      body: "Only the goals you select will be reserved inside this budget.",
    },
    "savings-amount": {
      title: "How much should go to savings?",
      body: "Set the protected amount for each selected goal.",
    },
  }[screen];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#020713]/85 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92svh] w-full max-w-[430px] overflow-y-auto rounded-t-[32px] border border-white/15 bg-[#071421] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.6)] sm:rounded-[32px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              Budget protection
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">{copy.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-white/64"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/58">{copy.body}</p>

        {message ? (
          <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-xs font-bold leading-5 text-amber-100">
            {message}
          </p>
        ) : null}

        {screen === "emergency-choice" ? (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() =>
                continueAfterEmergency({
                  includeEmergencyFund: false,
                  emergencyFundMonthlyAmount: 0,
                })
              }
              className={secondaryButton}
            >
              Skip Emergency Fund
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft((current) => ({ ...current, includeEmergencyFund: true }));
                setScreen("emergency-amount");
              }}
              className={primaryButton}
            >
              Yes, protect money
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {screen === "emergency-amount" ? (
          <div className="mt-5 space-y-3">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={draft.emergencyFundMonthlyAmount || ""}
              onChange={(event) => {
                setMessage("");
                setDraft((current) => ({
                  ...current,
                  emergencyFundMonthlyAmount: event.target.value,
                }));
              }}
              placeholder="Example: 1,000"
              className={input}
            />
            <button
              type="button"
              onClick={() => {
                const amount = amountValue(draft.emergencyFundMonthlyAmount);
                if (amount <= 0) {
                  setMessage("Enter an amount above ₱0.");
                  return;
                }
                continueAfterEmergency({
                  includeEmergencyFund: true,
                  emergencyFundMonthlyAmount: amount,
                });
              }}
              className={primaryButton}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {screen === "savings-choice" ? (
          <div className="mt-5 space-y-3">
            <div className="space-y-2">
              {activeGoals.map((goal, index) => {
                const id = goalId(goal, index);
                const selected = selectedGoalIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleGoal(id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-50"
                        : "border-white/10 bg-white/[0.045] text-white/72"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black">{goalTitle(goal, index)}</span>
                      {selected ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : null}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-white/42">
                      {goalProgressText(goal)}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                finish({
                  ...draft,
                  includeSavingsGoals: false,
                  savingsGoalMode: "none",
                  selectedSavingsGoalIds: [],
                  savingsGoalMonthlyAmounts: {},
                })
              }
              className={secondaryButton}
            >
              Continue without savings
            </button>
            <button
              type="button"
              disabled={!selectedGoalIds.length}
              onClick={() => setScreen("savings-amount")}
              className={primaryButton}
            >
              Set savings amounts
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {screen === "savings-amount" ? (
          <div className="mt-5 space-y-3">
            {activeGoals
              .map((goal, index) => ({ goal, index, id: goalId(goal, index) }))
              .filter((item) => selectedGoalIds.includes(item.id))
              .map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-black">{goalTitle(item.goal, item.index)}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                    Protected amount
                  </p>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={draft.savingsGoalMonthlyAmounts?.[item.id] || ""}
                    onChange={(event) => {
                      setMessage("");
                      setDraft((current) => ({
                        ...current,
                        savingsGoalMonthlyAmounts: {
                          ...(current.savingsGoalMonthlyAmounts || {}),
                          [item.id]: event.target.value,
                        },
                      }));
                    }}
                    placeholder="Example: 500"
                    className={`${input} mt-2`}
                  />
                </div>
              ))}
            <button
              type="button"
              onClick={() => {
                const invalid = selectedGoalIds.some(
                  (id) => amountValue(draft.savingsGoalMonthlyAmounts?.[id]) <= 0,
                );
                if (invalid) {
                  setMessage("Enter an amount for every selected goal.");
                  return;
                }
                finish({ ...draft, includeSavingsGoals: true, savingsGoalMode: "selected" });
              }}
              className={primaryButton}
            >
              Save protection
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepProgress({ step }) {
  const labels = ["Amount", "Cycle", "Protection", "Categories", "Review"];
  return (
    <section className={`${card} px-4 py-3.5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/45">
            Step {step} of 5
          </p>
          <p className="mt-1 text-sm font-black text-white/88">{labels[step - 1]}</p>
        </div>
        <p className="text-xs font-bold text-white/38">{Math.round((step / 5) * 100)}%</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300 transition-all duration-500"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>
    </section>
  );
}

function QuestionHeader({ icon: Icon, eyebrow, title, body }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_12px_28px_rgba(34,211,238,0.1)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/45">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black leading-tight tracking-[-0.035em]">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/52">{body}</p>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, note, onEdit }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/12 px-3.5 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/8 text-cyan-100/75">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/34">{label}</p>
        <p className="mt-0.5 truncate text-sm font-black text-white/88">{value}</p>
        {note ? <p className="mt-0.5 truncate text-[11px] font-semibold text-white/38">{note}</p> : null}
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/50"
          aria-label={`Edit ${label}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default function MonthlyBudgetPlanGuided() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserRole();
  const {
    budgets = [],
    expenses = [],
    savingsGoals = [],
    emergencyFund = null,
    addBudget,
    updateBudget,
    deleteBudget,
    refreshData,
    loading,
  } = useFinancialData(user);
  const { monthlyBudgetHeader, declaredMonthlyBudgetAmount } = useDashboardMonthlyBudgetHeader({
    budgets,
    includeDraft: true,
  });
  const budgetOptions = useDashboardManualExpenseBudgetOptions({ budgets });

  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [cycleConfirmed, setCycleConfirmed] = useState(false);
  const [protectionConfirmed, setProtectionConfirmed] = useState(false);
  const [protectionSettings, setProtectionSettings] = useState(() => readProtectionSettings());
  const [protectionOpen, setProtectionOpen] = useState(false);
  const [cycleType, setCycleType] = useState(
    normalizeCycleType(monthlyBudgetHeader?.cycle_type || monthlyBudgetHeader?.budget_cycle || "monthly"),
  );
  const [cycleStart, setCycleStart] = useState(monthlyBudgetHeader?.cycle_start || today());
  const [cycleEnd, setCycleEnd] = useState(monthlyBudgetHeader?.cycle_end || addDays(today(), 6));
  const [declaredInput, setDeclaredInput] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryAmount, setCategoryAmount] = useState("");
  const [categoryQuestion, setCategoryQuestion] = useState("name");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const liveDeclaredBudgetAmount = firstAmount(declaredInput, declaredMonthlyBudgetAmount);
  const hasEmergencyProtectionSetup = useMemo(
    () => hasEmergencyFundSetup(emergencyFund),
    [emergencyFund],
  );
  const activeSavingsGoals = useMemo(
    () => (Array.isArray(savingsGoals) ? savingsGoals : []).filter(isActiveGoal),
    [savingsGoals],
  );
  const hasActiveSavingsGoals = activeSavingsGoals.length > 0;
  const hasAnyBudgetProtection = hasEmergencyProtectionSetup || hasActiveSavingsGoals;
  const emergencyFundForProtection = hasEmergencyProtectionSetup ? emergencyFund : null;

  const plan = useDashboardMonthlyBudgetPlan({
    manualExpenseBudgetOptions: budgetOptions,
    expenses,
    declaredMonthlyBudgetAmount: liveDeclaredBudgetAmount,
    monthlyBudgetHeader,
    savingsGoals,
    emergencyFund: emergencyFundForProtection,
  });

  const editId = String(location.state?.editCategoryId || "");
  const editing = useMemo(
    () =>
      editId
        ? budgetOptions.find((item) => String(item.id || item.key) === editId) || null
        : null,
    [budgetOptions, editId],
  );

  const cycle = getCycleWindow(cycleType, cycleStart, cycleEnd);
  const declared = liveDeclaredBudgetAmount;
  const allocated = firstAmount(plan.allocated);
  const categoryAllocated = firstAmount(plan.categoryAllocated, plan.category_allocated);
  const protectedAmount = firstAmount(
    plan.totalProtectedCommitments,
    plan.protected_commitments_total,
  );
  const left = Math.max(declared - allocated, 0);
  const canFinish = declared > 0 && budgetOptions.length > 0 && left <= 0;
  const headerStatus = String(monthlyBudgetHeader?.status || "").trim().toLowerCase();
  const isActiveBudget = Boolean(
    monthlyBudgetHeader?.is_complete ||
      monthlyBudgetHeader?.complete ||
      headerStatus === "active" ||
      headerStatus === "activated",
  );
  const canActivate = canFinish && !isActiveBudget;
  const pageBadge = isActiveBudget ? "Active" : canFinish ? "Ready" : "Draft";
  const busy = saving || loading;

  useEffect(() => {
    if (firstAmount(declaredMonthlyBudgetAmount) > 0) {
      setDeclaredInput(String(declaredMonthlyBudgetAmount));
    }
  }, [declaredMonthlyBudgetAmount]);

  useEffect(() => {
    if (!editing) return;
    setCategoryName(editing.title || "");
    setCategoryAmount(String(editing.allocated || ""));
    setCategoryQuestion("amount");
    setStep(4);
  }, [editing]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const sync = () => setProtectionSettings(readProtectionSettings());
    window.addEventListener("storage", sync);
    window.addEventListener(BUDGET_PROTECTION_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(BUDGET_PROTECTION_UPDATED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__CLARA_BUDGET_PROTECTION_CONTEXT = {
      savingsGoals,
      emergencyFund: emergencyFundForProtection,
    };
  }, [emergencyFundForProtection, savingsGoals]);

  useEffect(() => {
    if (hasEmergencyProtectionSetup) return;
    const clean = cleanProtectionSettings(readProtectionSettings());
    if (clean.includeEmergencyFund || clean.emergencyFundMonthlyAmount > 0) {
      const next = saveProtectionSettings({
        ...clean,
        includeEmergencyFund: false,
        emergencyFundMonthlyAmount: 0,
      });
      setProtectionSettings(next);
      fireBudgetEvents();
    }
  }, [hasEmergencyProtectionSetup]);

  useEffect(() => {
    if (hydrated || loading) return;
    const hasSavedAmount = firstAmount(declaredMonthlyBudgetAmount) > 0;
    const hasSavedCycle = Boolean(
      monthlyBudgetHeader?.id ||
        monthlyBudgetHeader?.cycle_type ||
        monthlyBudgetHeader?.budget_cycle,
    );
    const protectionDone = !hasAnyBudgetProtection || protectionSettings.setupCompleted;

    setCycleConfirmed(hasSavedCycle);
    setProtectionConfirmed(protectionDone);

    if (isActiveBudget || (hasSavedAmount && budgetOptions.length > 0 && canFinish)) {
      setStep(5);
    } else if (!hasSavedAmount) {
      setStep(1);
    } else if (!hasSavedCycle) {
      setStep(2);
    } else if (!protectionDone) {
      setStep(3);
    } else {
      setStep(4);
    }
    setHydrated(true);
  }, [
    hydrated,
    loading,
    declaredMonthlyBudgetAmount,
    monthlyBudgetHeader,
    hasAnyBudgetProtection,
    protectionSettings.setupCompleted,
    isActiveBudget,
    budgetOptions.length,
    canFinish,
  ]);

  const refresh = async () => {
    await refreshData?.();
    fireBudgetEvents();
  };

  const saveHeader = async (done = false) => {
    const amount = firstAmount(declaredInput, declaredMonthlyBudgetAmount);
    if (amount <= 0) throw new Error("Enter the money available for this budget first.");
    const payload = headerPayload({
      amount,
      done: Boolean(done || isActiveBudget),
      user,
      cycle,
    });
    if (monthlyBudgetHeader?.id && typeof updateBudget === "function") {
      return updateBudget(monthlyBudgetHeader.id, payload);
    }
    return addBudget?.(payload);
  };

  const continueAmount = async () => {
    const amount = firstAmount(declaredInput);
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }
    try {
      setSaving(true);
      setNotice("");
      await saveHeader(false);
      await refresh();
      setStep(2);
    } catch (error) {
      setNotice(error?.message || "CLARA could not save this amount yet.");
    } finally {
      setSaving(false);
    }
  };

  const continueCycle = async () => {
    if (cycleType === "custom" && (!cycleStart || !cycleEnd || cycleEnd < cycleStart)) {
      setNotice("Choose a valid start and end date for the custom cycle.");
      return;
    }
    try {
      setSaving(true);
      setNotice("");
      await saveHeader(false);
      await refresh();
      setCycleConfirmed(true);
      setStep(3);
    } catch (error) {
      setNotice(error?.message || "CLARA could not save this cycle yet.");
    } finally {
      setSaving(false);
    }
  };

  const skipProtection = () => {
    const saved = saveProtectionSettings({
      ...protectionSettings,
      setupCompleted: true,
      includeEmergencyFund: false,
      emergencyFundMonthlyAmount: 0,
      includeSavingsGoals: false,
      savingsGoalMode: "none",
      selectedSavingsGoalIds: [],
      savingsGoalMonthlyAmounts: {},
    });
    setProtectionSettings(saved);
    setProtectionConfirmed(true);
    setNotice("");
    fireBudgetEvents();
    setStep(4);
  };

  const continueWithoutAvailableProtection = () => {
    setProtectionConfirmed(true);
    setNotice("");
    setStep(4);
  };

  const addCategory = async () => {
    const title = normalizeString(categoryName);
    const amount = firstAmount(categoryAmount);
    if (!title) {
      setNotice("Name the category first.");
      setCategoryQuestion("name");
      return;
    }
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }

    const current = editing
      ? Math.max(allocated - firstAmount(editing.allocated), 0)
      : allocated;
    if (declared > 0 && current + amount > declared) {
      setNotice(`This is above the budget. You only have ${fmt(Math.max(declared - current, 0))} left.`);
      return;
    }

    try {
      setSaving(true);
      setNotice("");
      await saveHeader(false);
      const payload = categoryPayload({
        title,
        amount,
        order: editing?.sortOrder ?? budgetOptions.length,
        user,
        cycle,
      });
      if (editing?.id && typeof updateBudget === "function") {
        await updateBudget(editing.id, payload);
      } else {
        await addBudget?.(payload);
      }
      const nextAllocated = current + amount;
      setCategoryName("");
      setCategoryAmount("");
      setCategoryQuestion("name");
      await refresh();
      if (editing) {
        navigate("/budget-plan", { replace: true });
      }
      setNotice(editing ? "Category updated." : "Category added to your plan.");
      if (declared > 0 && nextAllocated >= declared) setStep(5);
    } catch (error) {
      setNotice(error?.message || "CLARA could not save this category yet.");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (item) => {
    if (!item?.id || typeof deleteBudget !== "function") return;
    try {
      setSaving(true);
      setNotice("");
      await deleteBudget(item.id);
      await refresh();
      setNotice("Category removed.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not remove this category yet.");
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!canActivate) {
      setNotice(
        budgetOptions.length === 0
          ? "Add at least one category before activating."
          : `You still need to assign ${fmt(left)}.`,
      );
      return;
    }
    try {
      setSaving(true);
      setNotice("");
      await saveHeader(true);
      await refresh();
      navigate("/dashboard");
    } catch (error) {
      setNotice(error?.message || "CLARA could not activate this budget yet.");
    } finally {
      setSaving(false);
    }
  };

  const saveActiveChanges = async () => {
    try {
      setSaving(true);
      setNotice("");
      await saveHeader(false);
      await refresh();
      navigate("/dashboard");
    } catch (error) {
      setNotice(error?.message || "CLARA could not save these changes yet.");
    } finally {
      setSaving(false);
    }
  };

  const resetCycle = async () => {
    const amount = firstAmount(declaredInput, declaredMonthlyBudgetAmount);
    if (amount <= 0) {
      setNotice("Enter your new budget amount first.");
      return;
    }
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Reset this budget cycle? Transaction history stays, but the Watch Zone and categories start clean from this moment.",
      );
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      setNotice("");
      const resetWindow = getResetCycleWindow(cycleType, cycleEnd);
      await resetMonthlyBudgetCycle({
        budgets,
        headerPayload: headerPayload({ amount, done: false, user, cycle: resetWindow }),
        categoryPayloads: [],
        addBudget,
        updateBudget,
      });
      await refresh();
      setCycleStart(resetWindow.start);
      setCycleEnd(resetWindow.end || cycleEnd);
      setCategoryName("");
      setCategoryAmount("");
      setCategoryQuestion("name");
      setStep(1);
      navigate("/budget-plan", { replace: true });
      setNotice("A fresh budget cycle is ready. Your transaction history was kept.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not reset this budget cycle yet.");
    } finally {
      setSaving(false);
    }
  };

  const budgetProtectionLabel = hasEmergencyProtectionSetup && hasActiveSavingsGoals
    ? "Emergency Fund and Savings Goals"
    : hasEmergencyProtectionSetup
      ? "Emergency Fund"
      : hasActiveSavingsGoals
        ? "Savings Goals"
        : "No protection added";

  return (
    <div className="min-h-[100svh] w-full bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.24),transparent_38%),linear-gradient(135deg,#04171e,#071430_48%,#170d36)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(0.7rem+env(safe-area-inset-top))] text-white">
      <ProtectionSetupModal
        open={protectionOpen && hasAnyBudgetProtection}
        settings={protectionSettings}
        savingsGoals={savingsGoals}
        hasEmergencyFundSetup={hasEmergencyProtectionSetup}
        onClose={() => setProtectionOpen(false)}
        onSave={(saved) => {
          setProtectionSettings(saved);
          setProtectionConfirmed(true);
          setProtectionOpen(false);
          setNotice("");
          fireBudgetEvents();
          setStep(4);
        }}
      />

      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-3">
        <header className="sticky top-0 z-30 -mx-4 border-b border-white/8 bg-[#06101d]/78 px-4 pb-2.5 pt-[calc(0.7rem+env(safe-area-inset-top))] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[430px] items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/80"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/50">
                Budget setup
              </p>
              <h1 className="truncate text-lg font-black tracking-[-0.035em]">Monthly Budget Plan</h1>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                isActiveBudget || canFinish
                  ? "border-emerald-300/25 bg-emerald-400/12 text-emerald-100"
                  : "border-amber-300/20 bg-amber-400/10 text-amber-100"
              }`}
            >
              {pageBadge}
            </span>
          </div>
        </header>

        <StepProgress step={step} />

        {step === 1 ? (
          <section className={`${card} p-4`}>
            <QuestionHeader
              icon={Wallet}
              eyebrow="Question 1"
              title="How much money is available for this budget cycle?"
              body="Enter the total amount you can realistically plan before we divide it into categories."
            />
            <div className="mt-5">
              <label className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                Available amount
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-200/80">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={declaredInput}
                  onChange={(event) => {
                    setDeclaredInput(event.target.value);
                    setNotice("");
                  }}
                  placeholder="25,000"
                  className={`${input} pl-10 text-lg font-black tracking-[-0.02em]`}
                />
              </div>
              {firstAmount(declaredInput) > 0 ? (
                <div className="mt-3 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.07] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-emerald-100/48">
                    You are budgeting
                  </p>
                  <p className="mt-1 text-xl font-black text-emerald-100">{fmt(declaredInput)}</p>
                </div>
              ) : null}
            </div>
            <button type="button" onClick={continueAmount} disabled={busy} className={`${primaryButton} mt-4`}>
              {saving ? "Saving..." : "Continue"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className={`${card} p-4`}>
            <QuestionHeader
              icon={CalendarDays}
              eyebrow="Question 2"
              title="How often should this budget reset?"
              body="Choose the rhythm that matches how you receive and manage your money."
            />
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                ["weekly", "Weekly", "Every 7 days"],
                ["biweekly", "Every 2 weeks", "Every 14 days"],
                ["monthly", "Monthly", "Calendar month"],
                ["custom", "Custom", "Choose dates"],
              ].map(([key, label, note]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCycleType(key);
                    setNotice("");
                  }}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    cycleType === key
                      ? "border-emerald-300/35 bg-emerald-400/12"
                      : "border-white/9 bg-white/[0.035]"
                  }`}
                >
                  <span className={`block text-sm font-black ${cycleType === key ? "text-emerald-100" : "text-white/72"}`}>
                    {label}
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold text-white/35">{note}</span>
                </button>
              ))}
            </div>

            {cycleType !== "monthly" ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-black/12 p-3.5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.13em] text-white/34">
                    Starts on
                  </label>
                  <input
                    type="date"
                    value={String(cycleStart || "").slice(0, 10)}
                    onChange={(event) => {
                      setCycleStart(event.target.value);
                      setNotice("");
                    }}
                    className={`${input} mt-2`}
                  />
                </div>
                {cycleType === "custom" ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.13em] text-white/34">
                      Ends on
                    </label>
                    <input
                      type="date"
                      value={cycleEnd}
                      onChange={(event) => {
                        setCycleEnd(event.target.value);
                        setNotice("");
                      }}
                      className={`${input} mt-2`}
                    />
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-white/50">This cycle ends on {cycle.end}.</p>
                )}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <button type="button" onClick={() => setStep(1)} className={secondaryButton}>
                Back
              </button>
              <button type="button" onClick={continueCycle} disabled={busy} className={primaryButton}>
                {saving ? "Saving..." : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className={`${card} p-4`}>
            <QuestionHeader
              icon={ShieldCheck}
              eyebrow="Question 3"
              title="Should CLARA protect money before category spending?"
              body="Protected money is reserved first, so it does not look available for ordinary spending."
            />

            {hasAnyBudgetProtection ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-emerald-300/16 bg-emerald-400/[0.06] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                    Available protection
                  </p>
                  <p className="mt-1 text-sm font-black text-emerald-50">{budgetProtectionLabel}</p>
                  {protectionSettings.setupCompleted ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-50/55">
                      Currently protecting {fmt(protectedAmount)}.
                    </p>
                  ) : null}
                </div>
                <button type="button" onClick={skipProtection} className={secondaryButton}>
                  Continue without protection
                </button>
                <button type="button" onClick={() => setProtectionOpen(true)} className={primaryButton}>
                  {protectionSettings.setupCompleted ? "Review protection" : "Set protection"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
                  <p className="text-sm font-black text-white/76">No protection tools are set up yet.</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/42">
                    You can continue now and add an Emergency Fund or Savings Goal later.
                  </p>
                </div>
                <button type="button" onClick={continueWithoutAvailableProtection} className={primaryButton}>
                  Continue to categories
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button type="button" onClick={() => setStep(2)} className="mt-3 w-full py-2 text-xs font-bold text-white/42">
              Back to cycle
            </button>
          </section>
        ) : null}

        {step === 4 ? (
          <section className={`${card} p-4`}>
            <QuestionHeader
              icon={ListChecks}
              eyebrow="Question 4"
              title={
                categoryQuestion === "name"
                  ? "What do you need to set money aside for?"
                  : `How much should go to ${normalizeString(categoryName) || "this category"}?`
              }
              body={
                categoryQuestion === "name"
                  ? "Add one category at a time. Your plan will build below as you answer."
                  : `You currently have ${fmt(Math.max(declared - (editing ? allocated - firstAmount(editing.allocated) : allocated), 0))} available to assign.`
              }
            />

            {categoryQuestion === "name" ? (
              <div className="mt-5 space-y-3">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(event) => {
                    setCategoryName(event.target.value);
                    setNotice("");
                  }}
                  placeholder="Example: Food"
                  className={input}
                />
                <div className="flex flex-wrap gap-2">
                  {["Food", "Bills", "Rent", "Transport", "Groceries"].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setCategoryName(suggestion);
                        setNotice("");
                      }}
                      className="rounded-full border border-white/9 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/55"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!normalizeString(categoryName)) {
                      setNotice("Name the category first.");
                      return;
                    }
                    setNotice("");
                    setCategoryQuestion("amount");
                  }}
                  className={primaryButton}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/12 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/34">
                      Category
                    </p>
                    <p className="mt-0.5 text-sm font-black">{categoryName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryQuestion("name")}
                    className="text-xs font-bold text-cyan-100/65"
                  >
                    Change
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-200/80">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={categoryAmount}
                    onChange={(event) => {
                      setCategoryAmount(event.target.value);
                      setNotice("");
                    }}
                    placeholder="Amount to assign"
                    className={`${input} pl-10 text-lg font-black`}
                  />
                </div>
                {firstAmount(categoryAmount) > 0 ? (
                  <p className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.05] px-4 py-3 text-xs font-semibold text-cyan-50/65">
                    {fmt(categoryAmount)} will be reserved for {categoryName}.
                  </p>
                ) : null}
                <button type="button" onClick={addCategory} disabled={busy} className={primaryButton}>
                  <Plus className="h-4 w-4" />
                  {saving ? "Saving..." : editing ? "Update category" : "Add category"}
                </button>
              </div>
            )}

            {budgetOptions.length > 0 ? (
              <div className="mt-5 border-t border-white/8 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">Categories added</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/38">
                      {fmt(categoryAllocated)} assigned across {budgetOptions.length} {budgetOptions.length === 1 ? "category" : "categories"}.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/58">
                    {budgetOptions.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {budgetOptions.map((item) => (
                    <div
                      key={item.id || item.key}
                      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/12 px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{item.title}</p>
                        <p className="mt-0.5 text-xs font-semibold text-white/38">
                          {fmt(item.allocated)} assigned
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/budget-plan", {
                            replace: true,
                            state: { editCategoryId: item.id || item.key },
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/55"
                        aria-label={`Edit ${item.title}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCategory(item)}
                        disabled={busy}
                        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-300/18 bg-rose-500/10 text-rose-100/75"
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setStep(5)} className={`${secondaryButton} mt-3`}>
                  Review my plan
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <button type="button" onClick={() => setStep(3)} className="mt-3 w-full py-2 text-xs font-bold text-white/42">
              Back to protection
            </button>
          </section>
        ) : null}

        {step === 5 ? (
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-white/8 bg-gradient-to-br from-cyan-400/[0.09] via-transparent to-violet-400/[0.08] p-4">
              <QuestionHeader
                icon={CheckCircle2}
                eyebrow="Final review"
                title={isActiveBudget ? "Review your active budget" : "Does this plan cover the full amount?"}
                body={
                  isActiveBudget
                    ? "You can still edit any part without removing the spending history from this cycle."
                    : canFinish
                      ? "Everything is assigned. Your budget is ready to activate."
                      : "Review what is still unallocated, then return to categories to finish the plan."
                }
              />
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/8 bg-black/12 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Available</p>
                  <p className="mt-1 text-lg font-black">{fmt(declared)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.06] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-emerald-100/42">Unallocated</p>
                  <p className="mt-1 text-lg font-black text-emerald-100">{fmt(left)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/12 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Categories</p>
                  <p className="mt-1 text-lg font-black">{fmt(categoryAllocated)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/12 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Protected</p>
                  <p className="mt-1 text-lg font-black">{fmt(protectedAmount)}</p>
                </div>
              </div>

              {left > 0 ? (
                <div className="mt-3 rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-4 py-3">
                  <p className="text-sm font-black text-amber-50">{fmt(left)} still needs a purpose.</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-amber-50/55">
                    Add another category or increase an existing one before activation.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                <SummaryRow
                  icon={Wallet}
                  label="Budget amount"
                  value={fmt(declared)}
                  note="Money available this cycle"
                  onEdit={() => setStep(1)}
                />
                <SummaryRow
                  icon={CalendarDays}
                  label="Cycle"
                  value={cycle.label}
                  note={cycle.end ? `${String(cycle.start).slice(0, 10)} to ${cycle.end}` : String(cycle.start).slice(0, 10)}
                  onEdit={() => setStep(2)}
                />
                <SummaryRow
                  icon={ShieldCheck}
                  label="Protection"
                  value={protectedAmount > 0 ? fmt(protectedAmount) : "No protected amount"}
                  note={budgetProtectionLabel}
                  onEdit={() => setStep(3)}
                />
                <SummaryRow
                  icon={ListChecks}
                  label="Categories"
                  value={`${budgetOptions.length} ${budgetOptions.length === 1 ? "category" : "categories"}`}
                  note={`${fmt(categoryAllocated)} assigned`}
                  onEdit={() => setStep(4)}
                />
              </div>

              <div className="mt-4 space-y-2">
                {isActiveBudget ? (
                  <>
                    {left > 0 ? (
                      <button type="button" onClick={() => setStep(4)} className={secondaryButton}>
                        Assign the remaining {fmt(left)}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button type="button" onClick={saveActiveChanges} disabled={busy} className={primaryButton}>
                      {saving ? "Saving..." : "Save changes"}
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </>
                ) : !canFinish ? (
                  <button type="button" onClick={() => setStep(4)} className={primaryButton}>
                    Assign the remaining {fmt(left)}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={activate} disabled={busy || !canActivate} className={primaryButton}>
                    {saving ? "Activating..." : "Activate budget"}
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}

                <button type="button" onClick={() => navigate("/dashboard")} className={secondaryButton}>
                  Return to dashboard
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-5 text-amber-50">
            {notice}
          </div>
        ) : null}

        {isActiveBudget && step === 5 ? (
          <section className={`${card} border-amber-300/14 bg-amber-400/[0.05] p-4`}>
            <p className="text-sm font-black text-amber-50">Start a fresh cycle</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-amber-50/55">
              Transaction history stays, but your Watch Zone and categories restart from the reset time.
            </p>
            <button
              type="button"
              onClick={resetCycle}
              disabled={busy}
              className="mt-3 rounded-2xl border border-amber-300/22 bg-amber-400/10 px-4 py-3 text-xs font-black text-amber-50"
            >
              Reset budget cycle
            </button>
          </section>
        ) : null}

        <div className="pb-4 text-center">
          <p className="text-[11px] font-semibold text-white/28">You can edit any completed answer anytime.</p>
        </div>
      </div>
    </div>
  );
}
