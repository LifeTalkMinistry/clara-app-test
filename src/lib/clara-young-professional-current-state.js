import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
  upsertLocalRecord,
} from "./localFinanceStore";
import { supabase } from "./supabaseClient";
import { upsertIncomeSource } from "./incomeHubRepository";
import { saveSelectedLifeStageProfile } from "@/life-stage-flow";

const SOURCE = "clara_young_professional_current_state";
const FAMILY = "young_professional_current_state";
const ACTIVE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";

const STORES_TO_RESET = [
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
  LOCAL_FINANCE_STORES.privatePreferences,
];

const MONTHLY_SALARY = 32000;
const FIRST_CUTOFF = 16000;
const SECOND_CUTOFF = 16000;
const OPENING_SAVINGS = 7000;
const OPENING_EMERGENCY = 4000;

function nowIso() {
  return new Date().toISOString();
}

function safeUserId(value) {
  return (
    String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80) || "local_user"
  );
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

function at(date, hour = 12) {
  return `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;
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

function signedTransactionAmount(transaction) {
  const amount = toMoney(transaction?.amount);
  const type = String(transaction?.type || "").trim().toLowerCase();

  if (["expense", "transfer_out", "debit", "withdrawal"].includes(type)) return -amount;
  if (["income", "opening_balance", "transfer_in", "deposit", "credit"].includes(type)) return amount;
  return 0;
}

function wallet(localUserId, key, name, type = "wallet", order = 1) {
  return {
    ...base(localUserId, "wallet", key, at(monthDate(order), 8)),
    name,
    title: name,
    label: name,
    type,
    wallet_type: type,
    balance: 0,
    current_balance: 0,
    wallet_balance: 0,
    available_balance: 0,
    starting_balance: 0,
    sort_order: order,
  };
}

function applyLedgerBalances(wallets, walletTransactions) {
  return wallets.map((row) => {
    const balance = walletTransactions
      .filter((transaction) => String(transaction.wallet_id || transaction.walletId || "") === String(row.id))
      .reduce((sum, transaction) => sum + signedTransactionAmount(transaction), toMoney(row.starting_balance));

    return {
      ...row,
      balance,
      current_balance: balance,
      wallet_balance: balance,
      available_balance: balance,
    };
  });
}

function budgetHeader(localUserId) {
  const month = currentMonthKey();

  return {
    ...base(localUserId, "budget", "monthly_plan", at(monthStart(), 8)),
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
    declared_amount: MONTHLY_SALARY,
    declared_budget: MONTHLY_SALARY,
    monthly_budget_amount: MONTHLY_SALARY,
    total_declared_budget: MONTHLY_SALARY,
    amount: MONTHLY_SALARY,
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
    ...base(localUserId, "budget", key, at(monthStart(), 8)),
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

function walletTransaction(localUserId, key, walletId, amount, type, title, options = {}) {
  const date = options.date || monthDate(1);
  const timestamp = at(date, options.hour || 12);
  const numericAmount = toMoney(amount);

  return {
    ...base(localUserId, "wallet_txn", key, timestamp),
    wallet_id: walletId,
    walletId,
    amount: numericAmount,
    type,
    category: options.category || title,
    source_type: options.sourceType || type,
    sourceType: options.sourceType || type,
    income_source_id: options.incomeSourceId || null,
    incomeSourceId: options.incomeSourceId || null,
    income_source_name: options.incomeSourceName || null,
    incomeSourceName: options.incomeSourceName || null,
    funding_source: options.fundingSource || options.incomeSourceName || null,
    title,
    notes: options.notes || title,
    created_at: timestamp,
    date: timestamp,
    details: options.details || null,
  };
}

function transfer(localUserId, key, walletIds, fromKey, toKey, amount, title, options = {}) {
  const date = options.date || monthDate(10);
  const transferGroupId = makeId(localUserId, "transfer", key);
  const fromWalletId = walletIds[fromKey];
  const toWalletId = walletIds[toKey];
  const numericAmount = toMoney(amount);
  const timestamp = at(date, options.hour || 14);

  const transferRecord = {
    ...base(localUserId, "transfer", key, timestamp),
    transfer_group_id: transferGroupId,
    from_wallet_id: fromWalletId,
    to_wallet_id: toWalletId,
    amount: numericAmount,
    title,
    notes: title,
    created_at: timestamp,
  };

  const transactions = [
    walletTransaction(localUserId, `transfer_out_${key}`, fromWalletId, numericAmount, "transfer_out", title, {
      date,
      hour: options.hour || 14,
      category: "Transfer",
      sourceType: "transfer",
      notes: `Transfer to ${options.toLabel || "another wallet"}`,
    }),
    walletTransaction(localUserId, `transfer_in_${key}`, toWalletId, numericAmount, "transfer_in", title, {
      date,
      hour: (options.hour || 14) + 1,
      category: "Transfer",
      sourceType: "transfer",
      notes: `Transfer from ${options.fromLabel || "another wallet"}`,
    }),
  ];

  transactions.forEach((transaction) => {
    transaction.transfer_group_id = transferGroupId;
    transaction.related_wallet_id = transaction.wallet_id === fromWalletId ? toWalletId : fromWalletId;
  });

  return { transferRecord, transactions };
}

function expense(localUserId, walletIds, key, walletKey, amount, category, title, options = {}) {
  const date = options.date || monthDate(5);
  const status = options.status || "planned";
  const needType = options.needType || "need";
  const numericAmount = toMoney(amount);
  const walletId = walletIds[walletKey] || walletIds.primary;
  const createdAt = at(date, options.hour || 18);

  return {
    ...base(localUserId, "expense", key, createdAt),
    wallet_id: walletId,
    walletId,
    amount: numericAmount,
    category,
    budget_category: category,
    expense_category: category,
    title,
    name: title,
    merchant: title,
    date: createdAt,
    transaction_date: date,
    created_at: createdAt,
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
    date: row.created_at,
  };
}

function savingsGoal(localUserId, key, title, saved, target, order = 1) {
  const savedAmount = toMoney(saved);
  const targetAmount = toMoney(target);
  const date = new Date();
  date.setMonth(date.getMonth() + order * 3);

  return {
    ...base(localUserId, "savings_goal", key, at(monthDate(order + 2), 9)),
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
    ...base(localUserId, "emergency_fund", "primary", at(monthDate(1), 9)),
    target_amount: 50000,
    targetAmount: 50000,
    saved_amount: OPENING_EMERGENCY + 3000,
    savedAmount: OPENING_EMERGENCY + 3000,
    saved: OPENING_EMERGENCY + 3000,
    current_amount: OPENING_EMERGENCY + 3000,
    amount: OPENING_EMERGENCY + 3000,
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
    ...base(localUserId, "memory", key, at(monthDate(2), 10)),
    recordKind: "ai_financial_memory",
    category,
    summary,
    spendingImpact,
    supportStyle,
    status: "active",
    userApproved: true,
  };
}

function incomeSource(localUserId) {
  const incomeSourceId = makeId(localUserId, "income_source", "primary_salary");

  return {
    id: incomeSourceId,
    kind: "income_source",
    recordType: "income_source",
    localUserId,
    name: "Primary Salary",
    title: "Primary Salary",
    category: "Salary",
    stability: "Stable",
    expectedMonthlyAmount: MONTHLY_SALARY,
    expected_monthly_amount: MONTHLY_SALARY,
    totalMoneyIn: MONTHLY_SALARY,
    total_money_in: MONTHLY_SALARY,
    totalMoneyOut: MONTHLY_SALARY,
    total_money_out: MONTHLY_SALARY,
    currentBalance: 0,
    current_balance: 0,
    linkedWalletId: makeId(localUserId, "wallet", "primary"),
    linked_wallet_id: makeId(localUserId, "wallet", "primary"),
    linkedWalletName: "Payroll Wallet",
    linked_wallet_name: "Payroll Wallet",
    notes: "Two payroll cutoffs: ₱16,000 on the 10th and ₱16,000 on the 25th. This source funds the Payroll Wallet first, then allocations move to daily spending, savings, and emergency reserve.",
    lastActivityAt: at(monthDate(25), 9),
    last_activity_at: at(monthDate(25), 9),
    source: SOURCE,
    setupFamily: FAMILY,
    activeCurrentState: true,
    lifeStage: "Young Professional",
    createdAt: at(monthDate(1), 8),
    created_at: at(monthDate(1), 8),
    updatedAt: nowIso(),
    updated_at: nowIso(),
    deletedAt: null,
    deleted_at: null,
    syncStatus: "local_only",
  };
}

function buildYoungProfessionalState(localUserId) {
  const rawWallets = [
    wallet(localUserId, "primary", "Payroll Wallet", "bank", 1),
    wallet(localUserId, "daily", "Daily Spending Wallet", "cash", 2),
    wallet(localUserId, "savings", "Savings Wallet", "savings", 3),
    wallet(localUserId, "emergency", "Emergency Reserve Wallet", "emergency", 4),
  ];

  const walletIds = {
    primary: makeId(localUserId, "wallet", "primary"),
    daily: makeId(localUserId, "wallet", "daily"),
    savings: makeId(localUserId, "wallet", "savings"),
    emergency: makeId(localUserId, "wallet", "emergency"),
  };

  const salarySource = incomeSource(localUserId);

  const openingTransactions = [
    walletTransaction(localUserId, "opening_savings_carryover", walletIds.savings, OPENING_SAVINGS, "opening_balance", "Savings carried over", {
      date: monthDate(1),
      hour: 8,
      category: "Opening Balance",
      sourceType: "opening_balance",
      notes: "Existing savings before this month started",
    }),
    walletTransaction(localUserId, "opening_emergency_carryover", walletIds.emergency, OPENING_EMERGENCY, "opening_balance", "Emergency fund carried over", {
      date: monthDate(1),
      hour: 8,
      category: "Opening Balance",
      sourceType: "opening_balance",
      notes: "Existing emergency reserve before this month started",
    }),
  ];

  const incomeTransactions = [
    walletTransaction(localUserId, "salary_first_cutoff", walletIds.primary, FIRST_CUTOFF, "income", "Salary - first cutoff", {
      date: monthDate(10),
      hour: 9,
      category: "Income",
      sourceType: "salary",
      incomeSourceId: salarySource.id,
      incomeSourceName: salarySource.name,
      fundingSource: "Income Hub: Primary Salary",
      notes: "Declared income source: Primary Salary, first payroll cutoff",
    }),
    walletTransaction(localUserId, "salary_second_cutoff", walletIds.primary, SECOND_CUTOFF, "income", "Salary - second cutoff", {
      date: monthDate(25),
      hour: 9,
      category: "Income",
      sourceType: "salary",
      incomeSourceId: salarySource.id,
      incomeSourceName: salarySource.name,
      fundingSource: "Income Hub: Primary Salary",
      notes: "Declared income source: Primary Salary, second payroll cutoff",
    }),
  ];

  const transferBundles = [
    transfer(localUserId, "daily_allowance_allocation", walletIds, "primary", "daily", 5000, "Daily spending allocation", {
      date: monthDate(10),
      hour: 14,
      fromLabel: "Payroll Wallet",
      toLabel: "Daily Spending Wallet",
    }),
    transfer(localUserId, "savings_allocation", walletIds, "primary", "savings", 5000, "Savings allocation", {
      date: monthDate(10),
      hour: 15,
      fromLabel: "Payroll Wallet",
      toLabel: "Savings Wallet",
    }),
    transfer(localUserId, "emergency_allocation", walletIds, "primary", "emergency", 3000, "Emergency fund allocation", {
      date: monthDate(25),
      hour: 14,
      fromLabel: "Payroll Wallet",
      toLabel: "Emergency Reserve Wallet",
    }),
  ];

  const transfers = transferBundles.map((bundle) => bundle.transferRecord);
  const transferTransactions = transferBundles.flatMap((bundle) => bundle.transactions);

  const expenses = [
    expense(localUserId, walletIds, "home_contribution", "primary", 6000, "Rent / Family Contribution", "Monthly home contribution", { date: monthDate(3), hour: 18 }),
    expense(localUserId, walletIds, "food_delivery", "daily", 420, "Food", "Food delivery after work", { date: monthDate(5), hour: 21, status: "unplanned", needType: "want", notes: "Tired after work, convenience spending" }),
    expense(localUserId, walletIds, "coffee_run", "daily", 180, "Food", "Coffee run", { date: monthDate(6), hour: 10, status: "unplanned", needType: "want", notes: "Small repeat spending" }),
    expense(localUserId, walletIds, "internet_bill", "primary", 1699, "Bills", "Internet bill", { date: monthDate(6), hour: 18 }),
    expense(localUserId, walletIds, "commute", "daily", 120, "Transportation", "MRT and jeepney", { date: monthDate(7), hour: 8 }),
    expense(localUserId, walletIds, "online_checkout", "daily", 799, "Lifestyle", "Online checkout", { date: monthDate(11), hour: 22, status: "unplanned", needType: "want", notes: "Payday reward temptation" }),
    expense(localUserId, walletIds, "medicine", "primary", 380, "Health", "Medicine", { date: monthDate(12), hour: 19 }),
  ];

  const walletTransactions = [
    ...openingTransactions,
    ...incomeTransactions,
    ...transferTransactions,
    ...expenses.map((row) => expenseTransaction(localUserId, row)),
  ];

  const wallets = applyLedgerBalances(rawWallets, walletTransactions);

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
    savingsGoal(localUserId, "laptop_upgrade", "Laptop Upgrade", 8000, 45000, 1),
    savingsGoal(localUserId, "local_travel", "Local Travel Fund", 4000, 25000, 2),
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

  const expenseTotal = expenses.reduce((sum, row) => sum + toMoney(row.amount), 0);
  const finalWalletBalance = wallets.reduce((sum, row) => sum + toMoney(row.balance), 0);

  return {
    incomeSources: [salarySource],
    wallets,
    expenses,
    walletTransactions,
    transfers,
    budgets,
    savingsGoals,
    emergencyFund: emergencyFund(localUserId, walletIds),
    memories,
    ledgerCheck: {
      income: MONTHLY_SALARY,
      openingBalances: OPENING_SAVINGS + OPENING_EMERGENCY,
      expenses: expenseTotal,
      finalWalletBalance,
      expectedFinalWalletBalance: MONTHLY_SALARY + OPENING_SAVINGS + OPENING_EMERGENCY - expenseTotal,
      savingsWalletBalance: wallets.find((row) => row.id === walletIds.savings)?.balance || 0,
      emergencyWalletBalance: wallets.find((row) => row.id === walletIds.emergency)?.balance || 0,
      incomeSourceMoneyIn: salarySource.totalMoneyIn,
      incomeSourceMoneyOut: salarySource.totalMoneyOut,
      incomeSourceCurrentBalance: salarySource.currentBalance,
    },
  };
}

function isCurrentStateRecord(record) {
  return Boolean(record?.source === SOURCE || record?.setupFamily === FAMILY || record?.activeCurrentState === true);
}

async function clearExistingYoungProfessionalCurrentState(localUserId) {
  await runLocalFinanceTransaction(STORES_TO_RESET, localUserId, async (tx) => {
    for (const storeName of STORES_TO_RESET) {
      const rows = await tx.getAllForUser(storeName, true);
      for (const row of rows || []) {
        if (isCurrentStateRecord(row)) {
          tx.store(storeName).delete(row.id);
        }
      }
    }
  });
}

async function upsertRows(storeName, rows, localUserId) {
  for (const row of rows) {
    await upsertLocalRecord(storeName, row, localUserId);
  }
}

async function upsertIncomeSources(rows, localUserId) {
  for (const row of rows) {
    await upsertIncomeSource(localUserId, row);
  }
}

function writeActiveState(localUserId, ledgerCheck) {
  if (typeof window === "undefined") return;

  const activeState = {
    mode: "current_state",
    activeLifeStageKey: "Young Professional",
    activeLifeStageTitle: "Young Professional",
    localUserId,
    ledgerCheck,
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
  window.dispatchEvent(new Event("clara-income-hub-updated"));
  window.dispatchEvent(new Event("clara-finance-updated"));
  window.dispatchEvent(new Event("clara-wallets-updated"));
  window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
  window.dispatchEvent(new Event("clara:life-stage-profile-updated"));
}

export async function activateYoungProfessionalCurrentState({ user = null } = {}) {
  const localUserId = await resolveLocalUserId(user);
  const state = buildYoungProfessionalState(localUserId);

  await clearExistingYoungProfessionalCurrentState(localUserId);
  await upsertIncomeSources(state.incomeSources, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.wallets, state.wallets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.walletTransactions, state.walletTransactions, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.transfers, state.transfers, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.expenses, state.expenses, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.budgets, state.budgets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.savingsGoals, state.savingsGoals, localUserId);
  await upsertLocalRecord(LOCAL_FINANCE_STORES.emergencyFund, state.emergencyFund, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.aiFinancialMemory, state.memories, localUserId);

  writeLifeStageProfile();
  writeActiveState(localUserId, state.ledgerCheck);

  const result = {
    mode: "current_state",
    lifeStage: "Young Professional",
    localUserId,
    incomeSources: state.incomeSources.length,
    wallets: state.wallets.length,
    budgets: state.budgets.length,
    expenses: state.expenses.length,
    transfers: state.transfers.length,
    walletTransactions: state.walletTransactions.length,
    savingsGoals: state.savingsGoals.length,
    memories: state.memories.length,
    ledgerCheck: state.ledgerCheck,
  };

  dispatchRefresh(result);
  return result;
}
