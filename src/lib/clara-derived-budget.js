export const DERIVED_BUDGET_MODE = "derived_from_items";
export const BUDGET_SETUP_DRAFT_KEY = "clara_budget_setup_draft_v2";
export const BUDGET_PROTECTION_STORAGE_KEY = "clara_budget_protection_settings";
export const BUDGET_PROTECTION_UPDATED_EVENT = "clara:budget-protection-settings-updated";

export const DEFAULT_BUDGET_PROTECTION_SETTINGS = {
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

export function amountValue(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function firstAmount(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = amountValue(value, Number.NaN);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

export function normalizeBudgetText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeDraftId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `budget-setup-${globalThis.crypto.randomUUID()}`;
  }
  return `budget-setup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeDraftItemId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `budget-item-${globalThis.crypto.randomUUID()}`;
  }
  return `budget-item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function dateOnly(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const parsed = new Date(`${dateOnly(date) || todayDate()}T00:00:00`);
  parsed.setDate(parsed.getDate() + Number(days || 0));
  return parsed.toISOString().slice(0, 10);
}

export function monthRange(date = todayDate()) {
  const safe = dateOnly(date) || todayDate();
  const [year, month] = safe.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export function normalizeCycleType(value) {
  const clean = normalizeBudgetText(value).replace(/\s+/g, "");
  if (["weekly", "week"].includes(clean)) return "weekly";
  if (clean.startsWith("bi") || clean.includes("2week") || clean.includes("twoweek")) return "biweekly";
  if (clean === "custom") return "custom";
  return "monthly";
}

export function getCycleWindow(type, start, end) {
  const safeType = normalizeCycleType(type);
  const safeStart = dateOnly(start) || todayDate();
  if (safeType === "weekly") {
    return { type: safeType, label: "Weekly", start: safeStart, end: addDays(safeStart, 6) };
  }
  if (safeType === "biweekly") {
    return { type: safeType, label: "Every 2 weeks", start: safeStart, end: addDays(safeStart, 13) };
  }
  if (safeType === "custom") {
    return { type: safeType, label: "Custom", start: safeStart, end: dateOnly(end) || safeStart };
  }
  const range = monthRange(safeStart);
  return { type: "monthly", label: "Monthly", start: range.start, end: range.end };
}

export function isValidCycleWindow(cycle) {
  return Boolean(cycle?.start && cycle?.end && cycle.end >= cycle.start);
}

export function isDateInsideCycle(value, cycle) {
  const due = dateOnly(value);
  return Boolean(due && isValidCycleWindow(cycle) && due >= cycle.start && due <= cycle.end);
}

export function isDerivedBudgetHeader(header = {}) {
  return normalizeBudgetText(header?.budget_total_mode || header?.budgetTotalMode) === DERIVED_BUDGET_MODE;
}

export function isDebtCommitment(row = {}) {
  const raw = row?.budget || row || {};
  return Boolean(
    raw?.is_commitment === true ||
      raw?.isCommitment === true ||
      normalizeBudgetText(raw?.commitment_type || raw?.commitmentType) === "debt" ||
      raw?.source_debt_id ||
      raw?.sourceDebtId
  );
}

export function rowAmount(row = {}) {
  const raw = row?.budget || row || {};
  return firstAmount(
    row?.allocated,
    row?.allocated_amount,
    row?.budget_amount,
    row?.total_budget,
    row?.amount,
    raw?.allocated,
    raw?.allocated_amount,
    raw?.budget_amount,
    raw?.total_budget,
    raw?.amount,
  );
}

export function rowTitle(row = {}) {
  const raw = row?.budget || row || {};
  return String(
    row?.title ||
      row?.name ||
      row?.category ||
      raw?.title ||
      raw?.name ||
      raw?.category ||
      raw?.budget_category ||
      "Budget item",
  ).trim();
}

export function sourceDebtId(row = {}) {
  const raw = row?.budget || row || {};
  return String(raw?.source_debt_id || raw?.sourceDebtId || "").trim();
}

export function summarizeBudgetRows(rows = [], protectedAmount = 0) {
  const regularItems = [];
  const debtItems = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const amount = Math.max(0, rowAmount(row));
    if (amount <= 0) continue;
    const normalized = { ...row, title: rowTitle(row), allocated: amount };
    if (isDebtCommitment(row)) debtItems.push(normalized);
    else regularItems.push(normalized);
  }
  const regularTotal = regularItems.reduce((sum, item) => sum + rowAmount(item), 0);
  const debtTotal = debtItems.reduce((sum, item) => sum + rowAmount(item), 0);
  const protectedTotal = Math.max(0, amountValue(protectedAmount));
  return {
    regularItems,
    debtItems,
    regularTotal,
    debtTotal,
    protectedTotal,
    calculatedTotal: regularTotal + debtTotal + protectedTotal,
  };
}

export function cleanProtectionSettings(settings = {}) {
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

export function createBudgetSetupDraft(overrides = {}) {
  const now = todayDate();
  const cycle = getCycleWindow("monthly", now, "");
  return {
    version: 2,
    draftId: makeDraftId(),
    step: 1,
    items: [],
    includeEmergencyFund: false,
    emergencyFundAmount: 0,
    selectedSavingsGoalIds: [],
    savingsGoalAmounts: {},
    selectedDebtIds: [],
    outsideDueConfirmed: {},
    cycleType: "monthly",
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function cleanBudgetSetupDraft(draft = {}) {
  const fallback = createBudgetSetupDraft();
  const items = (Array.isArray(draft.items) ? draft.items : [])
    .map((item) => ({
      id: String(item?.id || makeDraftItemId()),
      title: String(item?.title || "").trim(),
      amount: Math.max(0, amountValue(item?.amount)),
      sourceDebtId: String(item?.sourceDebtId || item?.source_debt_id || "").trim(),
    }))
    .filter((item) => item.title || item.amount > 0);
  return {
    ...fallback,
    ...draft,
    version: 2,
    draftId: String(draft.draftId || draft.setup_draft_id || fallback.draftId),
    step: Math.min(5, Math.max(1, Number(draft.step) || 1)),
    items,
    includeEmergencyFund: draft.includeEmergencyFund === true,
    emergencyFundAmount: Math.max(0, amountValue(draft.emergencyFundAmount)),
    selectedSavingsGoalIds: Array.isArray(draft.selectedSavingsGoalIds)
      ? [...new Set(draft.selectedSavingsGoalIds.map(String).filter(Boolean))]
      : [],
    savingsGoalAmounts:
      draft.savingsGoalAmounts && typeof draft.savingsGoalAmounts === "object"
        ? draft.savingsGoalAmounts
        : {},
    selectedDebtIds: Array.isArray(draft.selectedDebtIds)
      ? [...new Set(draft.selectedDebtIds.map(String).filter(Boolean))]
      : [],
    outsideDueConfirmed:
      draft.outsideDueConfirmed && typeof draft.outsideDueConfirmed === "object"
        ? draft.outsideDueConfirmed
        : {},
    cycleType: normalizeCycleType(draft.cycleType),
    cycleStart: dateOnly(draft.cycleStart) || fallback.cycleStart,
    cycleEnd: dateOnly(draft.cycleEnd) || fallback.cycleEnd,
    updatedAt: new Date().toISOString(),
  };
}

export function readBudgetSetupDraft() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return createBudgetSetupDraft();
    const raw = window.localStorage.getItem(BUDGET_SETUP_DRAFT_KEY);
    return raw ? cleanBudgetSetupDraft(JSON.parse(raw)) : createBudgetSetupDraft();
  } catch {
    return createBudgetSetupDraft();
  }
}

export function writeBudgetSetupDraft(draft = {}) {
  const next = cleanBudgetSetupDraft(draft);
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(BUDGET_SETUP_DRAFT_KEY, JSON.stringify(next));
    }
  } catch (error) {
    console.warn("CLARA budget setup draft save failed:", error);
  }
  return next;
}

export function clearBudgetSetupDraft() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(BUDGET_SETUP_DRAFT_KEY);
    }
  } catch (error) {
    console.warn("CLARA budget setup draft clear failed:", error);
  }
}

export function buildDerivedHeaderPayload({ total, cycle, user, done = false, current = {}, draftId = "" }) {
  const amount = Math.max(0, amountValue(total));
  const now = new Date().toISOString();
  const resolvedCycle = getCycleWindow(cycle?.type, cycle?.start, cycle?.end);
  const title = `${resolvedCycle.label} Spending Plan`;
  const currentMonthKey = todayDate().slice(0, 7);
  return {
    ...(current || {}),
    month: currentMonthKey,
    month_key: currentMonthKey,
    title,
    name: title,
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    type: "monthly_budget",
    plan_type: "monthly_budget",
    is_plan_header: true,
    budget_total_mode: DERIVED_BUDGET_MODE,
    budgetTotalMode: DERIVED_BUDGET_MODE,
    setup_draft_id: draftId || current?.setup_draft_id || null,
    budget_cycle: resolvedCycle.type,
    cycle_type: resolvedCycle.type,
    cycle_start: resolvedCycle.start,
    cycle_end: resolvedCycle.end,
    period_start: resolvedCycle.start,
    period_end: resolvedCycle.end,
    declared_amount: amount,
    declared_budget: amount,
    monthly_budget_amount: amount,
    total_declared_budget: amount,
    total_budget: amount,
    amount,
    is_complete: Boolean(done),
    complete: Boolean(done),
    status: done ? "active" : "draft",
    is_active: true,
    active: true,
    created_at: current?.created_at || current?.createdAt || now,
    updated_at: now,
    created_by: user?.email || current?.created_by || null,
    email: user?.email || current?.email || null,
    user_id: user?.id || current?.user_id || null,
  };
}

export function buildBudgetCategoryPayload({
  title,
  amount,
  order = 0,
  user,
  cycle,
  current = {},
  draftId = "",
  itemId = "",
  commitment = null,
}) {
  const now = new Date().toISOString();
  const cleanTitle = String(title || "Budget item").trim() || "Budget item";
  const numericAmount = Math.max(0, amountValue(amount));
  const resolvedCycle = getCycleWindow(cycle?.type, cycle?.start, cycle?.end);
  const currentMonthKey = todayDate().slice(0, 7);
  const base = current?.budget || current || {};
  const commitmentPayload = commitment
    ? {
        is_commitment: true,
        commitment_type: "debt",
        source_debt_id: String(commitment.id || commitment.source_debt_id || ""),
        source_debt_title: String(commitment.title || cleanTitle),
        source_debt_due_date: dateOnly(commitment.dueDate || commitment.due_date) || null,
      }
    : {
        is_commitment: false,
        commitment_type: null,
        source_debt_id: null,
        source_debt_title: null,
        source_debt_due_date: null,
      };
  return {
    ...base,
    month: currentMonthKey,
    month_key: currentMonthKey,
    title: cleanTitle,
    name: cleanTitle,
    category: cleanTitle,
    budget_category: cleanTitle,
    allocated: numericAmount,
    allocated_amount: numericAmount,
    budget_amount: numericAmount,
    total_budget: numericAmount,
    amount: numericAmount,
    sort_order: order,
    display_order: order,
    position: order,
    setup_draft_id: draftId || base?.setup_draft_id || null,
    setup_item_id: itemId || base?.setup_item_id || null,
    budget_total_mode: DERIVED_BUDGET_MODE,
    budget_cycle: resolvedCycle.type,
    cycle_type: resolvedCycle.type,
    cycle_start: resolvedCycle.start,
    cycle_end: resolvedCycle.end,
    period_start: resolvedCycle.start,
    period_end: resolvedCycle.end,
    is_active: true,
    active: true,
    status: "active",
    created_at: base?.created_at || base?.createdAt || now,
    updated_at: now,
    created_by: user?.email || base?.created_by || null,
    email: user?.email || base?.email || null,
    user_id: user?.id || base?.user_id || null,
    ...commitmentPayload,
  };
}
