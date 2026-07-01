import { getPHMonthKey, normalizeString } from "@/utils/dashboard/dashboardHelpers";

export const card = "rounded-[28px] border border-cyan-100/12 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl";
export const input = "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/45 focus:bg-black/25";
export const primaryButton = "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-4 py-3.5 text-sm font-black text-[#03171a] shadow-[0_16px_34px_rgba(45,212,191,0.2)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
export const secondaryButton = "flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3.5 text-sm font-bold text-white/72 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
export const BALANCE_EPSILON = 0.005;
export const STEP_LABELS = ["Basics", "Protection", "Categories", "Review"];

export const BUDGET_PROTECTION_STORAGE_KEY = "clara_budget_protection_settings";
export const BUDGET_PROTECTION_UPDATED_EVENT = "clara:budget-protection-settings-updated";
const DEFAULT_SETTINGS = {
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

export const amountValue = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const firstAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = amountValue(value, NaN);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

export const fmt = (value = 0) => new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(amountValue(value));

export const today = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();
export const addDays = (date, days) => {
  const value = new Date(`${String(date || today()).slice(0, 10)}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

export function fireBudgetEvents() {
  if (typeof window === "undefined") return;
  ["clara-budgets-updated", "clara-finance-updated", "clara-local-finance-updated"].forEach(
    (name) => window.dispatchEvent(new Event(name)),
  );
}

export function cleanProtectionSettings(settings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    setupCompleted: settings.setupCompleted === true,
    includeEmergencyFund: settings.includeEmergencyFund === true,
    emergencyFundContributionMode: "fixed",
    emergencyFundMonthlyAmount: Math.max(0, amountValue(settings.emergencyFundMonthlyAmount)),
    includeSavingsGoals: settings.includeSavingsGoals === true,
    savingsGoalMode: ["none", "selected", "all"].includes(settings.savingsGoalMode) ? settings.savingsGoalMode : "none",
    selectedSavingsGoalIds: Array.isArray(settings.selectedSavingsGoalIds)
      ? settings.selectedSavingsGoalIds.map(String).filter(Boolean)
      : [],
    savingsContributionMode: "fixed",
    savingsGoalMonthlyAmounts: settings.savingsGoalMonthlyAmounts && typeof settings.savingsGoalMonthlyAmounts === "object"
      ? settings.savingsGoalMonthlyAmounts
      : {},
  };
}

export function readProtectionSettings() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return cleanProtectionSettings();
    const raw = window.localStorage.getItem(BUDGET_PROTECTION_STORAGE_KEY);
    return raw ? cleanProtectionSettings(JSON.parse(raw)) : cleanProtectionSettings();
  } catch {
    return cleanProtectionSettings();
  }
}

export function saveProtectionSettings(settings = {}) {
  const current = readProtectionSettings();
  const timestamp = nowIso();
  const next = cleanProtectionSettings({
    ...current,
    ...settings,
    createdAt: current.createdAt || timestamp,
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
}

export const goalId = (goal = {}, index = 0) => String(goal.id || goal.goal_id || goal.key || `goal-${index}`);
export const goalTitle = (goal = {}, index = 0) => String(goal.title || goal.name || goal.goal_name || `Savings Goal ${index + 1}`);
const goalTarget = (goal = {}) => firstAmount(goal.target_amount, goal.targetAmount, goal.goal_amount, goal.target, goal.goal);
const goalSaved = (goal = {}) => firstAmount(goal.saved_amount, goal.current_amount, goal.saved, goal.current, goal.amount);
export function isActiveGoal(goal = {}) {
  const status = String(goal.status || goal.goal_status || goal.state || "active").toLowerCase();
  if (["done", "completed", "complete", "archived", "inactive"].includes(status)) return false;
  const target = goalTarget(goal);
  return target <= 0 || goalSaved(goal) < target;
}

export function hasEmergencyFundSetup(emergencyFund) {
  if (!emergencyFund || typeof emergencyFund !== "object") return false;
  if (emergencyFund.resetAt || emergencyFund.reset_at) return false;
  const status = String(emergencyFund.status || emergencyFund.state || emergencyFund.setup_status || "").trim().toLowerCase();
  if (["reset", "inactive", "archived", "deleted", "not_setup", "not set"].includes(status)) return false;
  const flag = emergencyFund.is_setup === true || emergencyFund.isSetup === true || emergencyFund.setup_complete === true ||
    emergencyFund.setupComplete === true || emergencyFund.setupCompleted === true || emergencyFund.is_configured === true ||
    emergencyFund.isConfigured === true;
  const statusReady = ["active", "setup", "configured", "complete", "completed", "ready"].includes(status);
  const target = firstAmount(emergencyFund.target_amount, emergencyFund.targetAmount, emergencyFund.target, emergencyFund.goal_amount);
  const survival = firstAmount(emergencyFund.monthly_survival_cost, emergencyFund.monthlySurvivalCost, emergencyFund.survival_expense,
    emergencyFund.survivalExpense, emergencyFund.monthlyExpense, emergencyFund.monthly_expense);
  const walletId = String(emergencyFund.linkedWalletId || emergencyFund.linked_wallet_id || emergencyFund.reserveWalletId ||
    emergencyFund.reserve_wallet_id || emergencyFund.sourceWalletId || emergencyFund.source_wallet_id ||
    emergencyFund.walletId || emergencyFund.wallet_id || "").trim();
  return flag || statusReady || target > 0 || survival > 0 || Boolean(walletId);
}

export function normalizeCycleType(value) {
  const clean = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  if (["weekly", "week"].includes(clean)) return "weekly";
  if (["biweekly", "bi-weekly", "2weeks", "twoweeks"].includes(clean)) return "biweekly";
  if (clean === "custom") return "custom";
  return "monthly";
}

export function getCycleWindow(type, start, end) {
  const safeType = normalizeCycleType(type);
  const safeStart = start || today();
  if (safeType === "weekly") return { start: safeStart, end: addDays(safeStart, 6), label: "Weekly" };
  if (safeType === "biweekly") return { start: safeStart, end: addDays(safeStart, 13), label: "Bi-weekly" };
  if (safeType === "custom") return { start: safeStart, end: end || String(safeStart).slice(0, 10), label: "Custom" };
  return { start: `${getPHMonthKey()}-01`, end: "", label: "Monthly" };
}

export function getResetCycleWindow(type, end) {
  const resetStart = nowIso();
  return { ...getCycleWindow(type, today(), end), start: resetStart, reset_start_at: resetStart };
}

export function headerPayload({ amount, done, user, cycle }) {
  const now = nowIso();
  const title = `${cycle.label} Spending Plan`;
  const boundary = cycle.reset_start_at || null;
  return {
    month: getPHMonthKey(), month_key: getPHMonthKey(), title, name: title,
    category: "__monthly_budget__", budget_category: "__monthly_budget__",
    type: "monthly_budget", plan_type: "monthly_budget", is_plan_header: true,
    budget_cycle: cycle.label.toLowerCase(), cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start, cycle_end: cycle.end, period_start: cycle.start, period_end: cycle.end,
    reset_start_at: boundary, tracking_started_at: boundary, tracking_start_date: boundary,
    declared_amount: amount, declared_budget: amount, monthly_budget_amount: amount,
    total_declared_budget: amount, total_budget: amount, amount,
    is_complete: Boolean(done), status: done ? "active" : "draft", is_active: true, active: true,
    updated_at: now, created_by: user?.email || null, email: user?.email || null, user_id: user?.id || null,
  };
}

export function categoryPayload({ title, amount, order, user, cycle }) {
  const clean = normalizeString(title) || "Budget Category";
  return {
    month: getPHMonthKey(), month_key: getPHMonthKey(), title: clean, name: clean,
    category: clean, budget_category: clean, allocated: amount, allocated_amount: amount,
    budget_amount: amount, total_budget: amount, amount,
    sort_order: order, display_order: order, position: order,
    budget_cycle: cycle.label.toLowerCase(), cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start, cycle_end: cycle.end, period_start: cycle.start, period_end: cycle.end,
    reset_start_at: cycle.reset_start_at || null, is_active: true, active: true, status: "active",
    updated_at: nowIso(), created_by: user?.email || null, email: user?.email || null, user_id: user?.id || null,
  };
}
