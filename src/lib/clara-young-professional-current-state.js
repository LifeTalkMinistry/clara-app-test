import { LOCAL_FINANCE_STORES, upsertLocalRecord } from "./localFinanceStore";
import { supabase } from "./supabaseClient";
import { saveSelectedLifeStageProfile } from "@/life-stage-flow";

const SOURCE = "clara_young_professional_current_state";
const FAMILY = "young_professional_current_state";
const ACTIVE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";

function nowIso() {
  return new Date().toISOString();
}

function safeUserId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80) || "local_user";
}

function toMoney(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function dateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function monthDate(day) {
  const date = new Date();
  date.setDate(Math.max(1, Math.min(day, 28)));
  return dateOnly(date);
}

function monthStart() {
  const date = new Date();
  date.setDate(1);
  return dateOnly(date);
}

function monthEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 0);
  return dateOnly(date);
}

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function at(date) {
  return `${date}T12:00:00.000Z`;
}

async function resolveLocalUserId(explicitUser = null) {
  const fromExplicit = explicitUser?.id || explicitUser?.email;
  if (fromExplicit) return String(fromExplicit).trim();

  try {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;
    const fromAuth = authUser?.id || authUser?.email;
    if (fromAuth) return String(fromAuth).trim();
  } catch {
    // Local/offline mode can continue using the dashboard fallback id.
  }

  return "local-user";
}

function makeId(localUserId, type, key) {
  return `clara_yp_current_${safeUserId(localUserId)}_${type}_${key}`;
}

function base(localUserId, type, key, createdAt = nowIso()) {
  return {
    id: makeId(localUserId, type, key),
    localUserId,
    source: SOURCE,
    setupFamily: FAMILY,
    activeCurrentState: true,
    lifeStage: "Young Professional",
    createdAt,
    created_at: createdAt,
    updatedAt: nowIso(),
    updated_at: nowIso(),
    deletedAt: null,
    deleted_at: null,
    syncStatus: "local_only",
  };
}

function wallet(localUserId, key, name, balance, type = "wallet", order = 1) {
  const amount = toMoney(balance);
  return {
    ...base(localUserId, "wallet", key, at(monthDate(order))),
    name,
    title: name,
    label: name,
    type,
    wallet_type: type,
    balance: amount,
    current_balance: amount,
    wallet_balance: amount,
    available_balance: amount,
    starting_balance: amount,
    sort_order: order,
  };
}

function budgetHeader(localUserId) {
  const amount = 32000;
  const month = currentMonthKey();

  return {
    ...base(localUserId, "budget", "monthly_plan", at(monthStart())),
    is_plan_header: true,
    plan_type: "monthly_budget",
    type: "monthly_budget",
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    title: "Young Professional Monthly Plan",
    name: "Young Professional Monthly Plan",
    status: "active",
    is_active: true,
    is_complete: true,
    complete: true,
    plan_is_complete: true,
    declared_amount: amount,
    declared_budget: amount,
    monthly_budget_amount: amount,
    total_declared_budget: amount,
    amount,
    month,
    budget_month: month,
    month_key: month,
    budget_cycle: "monthly",
    cycle_type: "monthly",
    period_type: "monthly",
    cycle_start: monthStart(),
    cycle_end: monthEnd(),
    period_start: monthStart(),
    period_end: monthEnd(),
  };
}

function budget(localUserId, key, title, amount, needType = "need", order = 1) {
  const month = currentMonthKey();
  const numericAmount = toMoney(amount);

  return {
    ...base(localUserId, "budget", key, at(monthStart())),
    title,
    name: title,
    category: title,
    budget_category: title,
    section_key: key,
    status: "active",
    is_active: true,
    amount: numericAmount,
    allocated_amount: numericAmount,
    budget_amount: numericAmount,
    total_budget: numericAmount,
    budget: numericAmount,
    need_type: needType,
    month,
    budget_month: month,
    month_key: month,
    sort_order: order,
  };
}

function expense(localUserId, walletIds, key, walletKey, amount, category, title, options = {}) {
  const date = options.date || monthDate(5);
  const status = options.status || "planned";
  const needType = options.needType || "need";
  const numericAmount = toMoney(amount);
  const walletId = walletIds[walletKey] || walletIds.primary;

  return {
    ...base(localUserId, "expense", key, at(date)),
    wallet_id: walletId,
    walletId,
    amount: numericAmount,
    category,
    budget_category: category,
    expense_category: category,
    title,
    name: title,
    merchant: title,
    date: at(date),
    transaction_date: date,
    created_at: at(date),
    planning_status: status,
    budget_status: status,
    need_type: needType,
    unplanned_reason: status === "unplanned" ? options.notes || "Current spending pattern" : "",
    notes: options.notes || "Young Professional current-state transaction",
  };
}

function expenseTransaction(localUserId, row) {
  return {
    ...base(localUserId, "wallet_txn", `expense_${row.id}`, row.created_at),
    wallet_id: row.wallet_id,
    walletId: row.wallet_id,
    amount: row.amount,
    type: "expense",
    category: row.category,
    need_type: row.need_type,
    planning_status: row.planning_status,
    expense_id: row.id,
    title: row.title,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function income(localUserId, walletIds, key, walletKey, amount, title, date) {
  const walletId = walletIds[walletKey] || walletIds.primary;
  const numericAmount = toMoney(amount);

  return {
    ...base(localUserId, "wallet_txn", key, at(date)),
    wallet_id: walletId,
    walletId,
    amount: numericAmount,
    type: "income",
    category: "Income",
    source_type: "salary",
    sourceType: "salary",
    title,
    notes: title,
    created_at: at(date),
    date: at(date),
  };
}

function savingsGoal(localUserId, key, title, saved, target, order = 1) {
  const savedAmount = toMoney(saved);
  const targetAmount = toMoney(target);
  const date = new Date();
  date.setMonth(date.getMonth() + order * 3);

  return {
    ...base(localUserId, "savings_goal", key, at(monthDate(order + 2))),
    name: title,
    title,
    saved_amount: savedAmount,
    savedAmount,
    saved: savedAmount,
    current_amount: savedAmount,
    target_amount: targetAmount,
    targetAmount,
    target: targetAmount,
    goal_amount: targetAmount,
    target_date: dateOnly(date),
    status: "active",
    sort_order: order,
  };
}

function emergencyFund(localUserId, walletIds) {
  return {
    ...base(localUserId, "emergency_fund", "primary", at(monthDate(1))),
    target_amount: 50000,
    targetAmount: 50000,
    saved_amount: 7000,
    savedAmount: 7000,
    saved: 7000,
    current_amount: 7000,
    amount: 7000,
    monthly_target: 3000,
    monthlyTarget: 3000,
    monthly_survival_expense: 18000,
    monthsCovered: 0.4,
    linkedWalletId: walletIds.emergency,
    linked_wallet_id: walletIds.emergency,
    linkedWalletName: "Emergency Reserve Wallet",
    linked_wallet_name: "Emergency Reserve Wallet",
    status: "active",
  };
}

function memory(localUserId, key, category, summary, spendingImpact, supportStyle) {
  return {
    ...base(localUserId, "memory", key, at(monthDate(2))),
    recordKind: "ai_financial_memory",
    category,
    summary,
    spendingImpact,
    supportStyle,
    status: "active",
    userApproved: true,
  };
}

function buildYoungProfessionalState(localUserId) {
  const wallets = [
    wallet(localUserId, "primary", "Payroll Wallet", 13500, "bank", 1),
    wallet(localUserId, "daily", "Daily Spending Wallet", 2600, "cash", 2),
    wallet(localUserId, "savings", "Savings Wallet", 12000, "savings", 3),
    wallet(localUserId, "emergency", "Emergency Reserve Wallet", 7000, "emergency", 4),
  ];

  const walletIds = {
    primary: makeId(localUserId, "wallet", "primary"),
    daily: makeId(localUserId, "wallet", "daily"),
    savings: makeId(localUserId, "wallet", "savings"),
    emergency: makeId(localUserId, "wallet", "emergency"),
  };

  const expenses = [
    expense(localUserId, walletIds, "home_contribution", "primary", 6000, "Rent / Family Contribution", "Monthly home contribution", { date: monthDate(3) }),
    expense(localUserId, walletIds, "food_delivery", "daily", 420, "Food", "Food delivery after work", { status: "unplanned", needType: "want", notes: "Tired after work, convenience spending" }),
    expense(localUserId, walletIds, "coffee_run", "daily", 180, "Food", "Coffee run", { status: "unplanned", needType: "want", notes: "Small repeat spending" }),
    expense(localUserId, walletIds, "internet_bill", "primary", 1699, "Bills", "Internet bill", { date: monthDate(6) }),
    expense(localUserId, walletIds, "commute", "daily", 120, "Transportation", "MRT and jeepney", { date: monthDate(7) }),
    expense(localUserId, walletIds, "online_checkout", "daily", 799, "Lifestyle", "Online checkout", { status: "unplanned", needType: "want", notes: "Payday reward temptation" }),
    expense(localUserId, walletIds, "savings_transfer", "savings", 2500, "Savings", "Savings transfer", { date: monthDate(10) }),
    expense(localUserId, walletIds, "medicine", "primary", 380, "Health", "Medicine", { date: monthDate(11) }),
  ];

  const walletTransactions = [
    income(localUserId, walletIds, "salary_first_cutoff", "primary", 16000, "Salary - first cutoff", monthDate(10)),
    income(localUserId, walletIds, "salary_second_cutoff", "primary", 16000, "Salary - second cutoff", monthDate(25)),
    ...expenses.map((row) => expenseTransaction(localUserId, row)),
  ];

  const budgets = [
    budgetHeader(localUserId),
    budget(localUserId, "food", "Food", 8000, "need", 1),
    budget(localUserId, "transportation", "Transportation", 3500, "need", 2),
    budget(localUserId, "rent_family", "Rent / Family Contribution", 6000, "need", 3),
    budget(localUserId, "bills", "Bills", 4000, "need", 4),
    budget(localUserId, "savings", "Savings", 5000, "need", 5),
    budget(localUserId, "lifestyle", "Lifestyle", 2500, "want", 6),
    budget(localUserId, "health", "Health", 1500, "need", 7),
    budget(localUserId, "buffer", "Buffer", 1500, "need", 8),
  ];

  const savingsGoals = [
    savingsGoal(localUserId, "laptop_upgrade", "Laptop Upgrade", 12500, 45000, 1),
    savingsGoal(localUserId, "local_travel", "Local Travel Fund", 6000, 25000, 2),
  ];

  const memories = [
    memory(
      localUserId,
      "life_stage_context",
      "Life Stage",
      "Young professional with stable salary, independence pressure, and growing lifestyle temptation.",
      "Payday confidence can make optional spending feel safer than it really is.",
      "Be direct but encouraging; support independence without approving every reward purchase."
    ),
    memory(
      localUserId,
      "spending_trigger",
      "Spending Trigger",
      "Food delivery, coffee, and online checkout are the main small-leak patterns.",
      "Small wants can quietly compete with savings and emergency fund progress.",
      "Check planned budget first, then distinguish intentional reward from stress spending."
    ),
    memory(
      localUserId,
      "protected_priority",
      "Protection",
      "Emergency money and savings should not be used for lifestyle wants.",
      "Savings and emergency fund are protected before lifestyle spending.",
      "Remind the user to protect future stability first."
    ),
  ];

  return {
    wallets,
    expenses,
    walletTransactions,
    budgets,
    savingsGoals,
    emergencyFund: emergencyFund(localUserId, walletIds),
    memories,
  };
}

async function upsertRows(storeName, rows, localUserId) {
  for (const row of rows) {
    await upsertLocalRecord(storeName, row, localUserId);
  }
}

function writeActiveState(localUserId) {
  if (typeof window === "undefined") return;

  const activeState = {
    mode: "current_state",
    activeLifeStageKey: "Young Professional",
    activeLifeStageTitle: "Young Professional",
    localUserId,
    activatedAt: nowIso(),
  };

  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeState));
}

function writeLifeStageProfile() {
  saveSelectedLifeStageProfile({
    stage: "Young Professional",
    setup: "Full-time earner building independence",
    rhythm: "Salary every 10 and 25",
    workload: "Full-time work with commute, bills, and routine pressure",
    pressure: "Food, transportation, bills, family or rent contribution, savings, and lifestyle temptation",
    coping: "Payday rewards, food delivery after work, coffee runs, and online checkout",
    goal: "Build emergency fund, maintain savings, and control lifestyle creep",
    currentFocus: "Make salary last while still enjoying life intentionally",
    financialFear: "Running out before the next cutoff because small wants pile up",
    nonNegotiable: "Emergency money and savings are protected before lifestyle wants",
  });
}

function dispatchRefresh(result) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("clara-young-professional-current-state-loaded", { detail: result }));
  window.dispatchEvent(new Event("clara-finance-updated"));
  window.dispatchEvent(new Event("clara-wallets-updated"));
  window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
  window.dispatchEvent(new Event("clara:life-stage-profile-updated"));
}

export async function activateYoungProfessionalCurrentState({ user = null } = {}) {
  const localUserId = await resolveLocalUserId(user);
  const state = buildYoungProfessionalState(localUserId);

  await upsertRows(LOCAL_FINANCE_STORES.wallets, state.wallets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.walletTransactions, state.walletTransactions, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.expenses, state.expenses, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.budgets, state.budgets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.savingsGoals, state.savingsGoals, localUserId);
  await upsertLocalRecord(LOCAL_FINANCE_STORES.emergencyFund, state.emergencyFund, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.aiFinancialMemory, state.memories, localUserId);

  writeLifeStageProfile();
  writeActiveState(localUserId);

  const result = {
    mode: "current_state",
    lifeStage: "Young Professional",
    localUserId,
    wallets: state.wallets.length,
    budgets: state.budgets.length,
    expenses: state.expenses.length,
    savingsGoals: state.savingsGoals.length,
    memories: state.memories.length,
  };

  dispatchRefresh(result);
  return result;
}
