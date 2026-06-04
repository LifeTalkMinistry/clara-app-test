import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
  upsertLocalRecord,
} from "./localFinanceStore";
import { supabase } from "./supabaseClient";
import { upsertIncomeSource } from "./incomeHubRepository";
import { saveSelectedLifeStageProfile } from "@/life-stage-flow";
import { YOUNG_PROFESSIONAL_DEMO_BLUEPRINT } from "./clara-young-professional-demo-blueprint";
import {
  YOUNG_PROFESSIONAL_DEMO_EXPENSES,
  YOUNG_PROFESSIONAL_MONEY_CALENDAR,
} from "./clara-young-professional-demo-transactions";

const SOURCE = "clara_young_professional_current_state";
const FAMILY = "young_professional_current_state";
const LIFE_STAGE = "Young Professional";
const ACTIVE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";
const DATA_BOUNDARY = "temporary_demo_playground";
const RESET_POLICY = "reset_on_every_entry";
const SESSION_TIME_GRACE_MS = 10000;
const DEMO_YEAR = new Date().getFullYear();

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

const DEMO_MUTABLE_FINANCE_STORES = new Set([
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
]);

const nowIso = () => new Date().toISOString();
const sum = (values = []) => values.reduce((total, value) => total + (Number(value) || 0), 0);
const slug = (value) => String(value || "demo").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

function safeUserId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "local_user";
}

function createDemoSessionId(localUserId) {
  return `demo_young_professional_${safeUserId(localUserId)}_${Date.now()}`;
}

function dateOnly(month, day) {
  return `${DEMO_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function at(month, day, hour = 12) {
  return `${dateOnly(month, day)}T${String(hour).padStart(2, "0")}:00:00.000Z`;
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

function readActiveCurrentState(localUserId = null) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.mode !== "current_state") return null;
    const stageMatches = parsed.setupFamily === FAMILY || parsed.activeLifeStageKey === LIFE_STAGE || parsed.activeLifeStageTitle === LIFE_STAGE;
    if (!stageMatches) return null;
    if (localUserId && parsed.localUserId && String(parsed.localUserId) !== String(localUserId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function base(localUserId, type, key, createdAt = nowIso(), demoSessionId = null) {
  const timestamp = nowIso();
  return {
    id: makeId(localUserId, type, key),
    localUserId,
    source: SOURCE,
    setupFamily: FAMILY,
    activeCurrentState: true,
    lifeStage: LIFE_STAGE,
    demoMode: true,
    demoSessionId,
    dataBoundary: DATA_BOUNDARY,
    resetPolicy: RESET_POLICY,
    createdAt,
    created_at: createdAt,
    updatedAt: timestamp,
    updated_at: timestamp,
    deletedAt: null,
    deleted_at: null,
    syncStatus: "local_only",
  };
}

function walletId(localUserId, key) {
  return makeId(localUserId, "wallet", key);
}

function walletName(key) {
  return YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.wallets.find((wallet) => wallet.key === key)?.name || "Wallet";
}

function budgetCategoryId(localUserId, key) {
  return makeId(localUserId, "budget_category", key);
}

function budgetKeyForCategory(categoryName) {
  return YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.budgets.find(([, name]) => name === categoryName)?.[0] || slug(categoryName);
}

function buildWallets(localUserId, demoSessionId) {
  const timestamp = nowIso();
  return YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.wallets.map((wallet, index) => ({
    ...base(localUserId, "wallet", wallet.key, at(1, 1, 8), demoSessionId),
    id: walletId(localUserId, wallet.key),
    name: wallet.name,
    title: wallet.name,
    label: wallet.name,
    type: wallet.type,
    wallet_type: wallet.type,
    balance: wallet.balance,
    current_balance: wallet.balance,
    wallet_balance: wallet.balance,
    available_balance: wallet.balance,
    starting_balance: 0,
    sort_order: index + 1,
    updatedAt: timestamp,
    updated_at: timestamp,
  }));
}

function buildIncomeSources(localUserId, demoSessionId) {
  return YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.incomeSources.map((source) => {
    const totalMoneyIn = sum(source.monthlyAmounts);
    const monthlyHistory = source.monthlyAmounts.map((amount, index) => ({
      month: index + 1,
      amount,
      transferredOut: amount,
      balance: 0,
    }));

    return {
      ...base(localUserId, "income_source", source.key, at(1, 1, 8), demoSessionId),
      kind: "income_source",
      recordType: "income_source",
      name: source.name,
      title: source.name,
      category: source.category,
      stability: source.stability,
      expectedMonthlyAmount: Math.round(totalMoneyIn / source.monthlyAmounts.length),
      expected_monthly_amount: Math.round(totalMoneyIn / source.monthlyAmounts.length),
      totalMoneyIn,
      total_money_in: totalMoneyIn,
      totalMoneyOut: totalMoneyIn,
      total_money_out: totalMoneyIn,
      currentBalance: 0,
      current_balance: 0,
      balance: 0,
      monthlyHistory,
      monthly_history: monthlyHistory,
      notes: `${source.name} is an origin only. All money is transferred into wallets, so this income source ends at ₱0.`,
      lastActivityAt: at(5, 25, 9),
      last_activity_at: at(5, 25, 9),
    };
  });
}

function getIncomeTransfers(sourceKey, amount) {
  if (sourceKey === "work_salary") return [{ walletKey: "bdo", amount: 20000 }, { walletKey: "gcash", amount: 8000 }, { walletKey: "cash", amount: 4000 }];
  if (sourceKey === "small_side_hustle") return [{ walletKey: "bdo", amount: amount / 2 }, { walletKey: "gcash", amount: amount / 2 }];
  if (sourceKey === "family_support" && amount > 0) return [{ walletKey: "cash", amount }];
  return [];
}

function buildIncomeWalletTransactions(localUserId, incomeSources, demoSessionId) {
  const sourceByKey = Object.fromEntries(YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.incomeSources.map((source, index) => [source.key, incomeSources[index]]));

  return YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.incomeSources.flatMap((source) =>
    source.monthlyAmounts.flatMap((amount, index) => {
      if (!amount) return [];
      const month = index + 1;
      const sourceRecord = sourceByKey[source.key];
      const createdAt = at(month, 25, 9);

      return getIncomeTransfers(source.key, amount).map((transfer, transferIndex) => ({
        ...base(localUserId, "wallet_txn", `income_${source.key}_${month}_${transfer.walletKey}_${transferIndex}`, createdAt, demoSessionId),
        wallet_id: walletId(localUserId, transfer.walletKey),
        walletId: walletId(localUserId, transfer.walletKey),
        amount: transfer.amount,
        type: "income",
        transaction_type: "income",
        category: "Income",
        source_type: "income_source",
        source_id: sourceRecord.id,
        sourceId: sourceRecord.id,
        income_source_id: sourceRecord.id,
        incomeSourceId: sourceRecord.id,
        income_source_name: sourceRecord.name,
        incomeSourceName: sourceRecord.name,
        funding_source: sourceRecord.name,
        title: `${sourceRecord.name} transferred to ${walletName(transfer.walletKey)}`,
        label: `${sourceRecord.name} to ${walletName(transfer.walletKey)}`,
        notes: `${sourceRecord.name} received money and transferred it to ${walletName(transfer.walletKey)}.`,
        date: createdAt,
        created_at: createdAt,
      }));
    })
  );
}

function buildBudgetRows(localUserId, demoSessionId) {
  const declaredBudget = sum(YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.budgets.map(([, , amount]) => amount));
  const header = {
    ...base(localUserId, "budget", "monthly_spending_plan_header", at(5, 1, 8), demoSessionId),
    is_plan_header: true,
    plan_type: "monthly_budget",
    type: "monthly_budget",
    category: "__monthly_budget__",
    title: "Monthly Spending Plan",
    name: "Monthly Spending Plan",
    status: "active",
    is_complete: true,
    complete: true,
    declaredBudget,
    declared_budget: declaredBudget,
    monthly_budget_amount: declaredBudget,
    total_declared_budget: declaredBudget,
    cycle_start: dateOnly(5, 1),
    cycle_end: dateOnly(5, 31),
    period_start: dateOnly(5, 1),
    period_end: dateOnly(5, 31),
  };

  const categories = YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.budgets.map(([key, name, amount], index) => ({
    ...base(localUserId, "budget", key, at(5, 1, 8), demoSessionId),
    id: budgetCategoryId(localUserId, key),
    title: name,
    name,
    category: name,
    category_name: name,
    budget_category: name,
    amount,
    allocated: amount,
    allocated_amount: amount,
    budget_amount: amount,
    monthly_budget_amount: declaredBudget,
    month: `${DEMO_YEAR}-05`,
    month_key: `${DEMO_YEAR}-05`,
    status: "active",
    is_active: true,
    sort_order: index + 1,
  }));

  return [header, ...categories];
}

function buildExpenses(localUserId, demoSessionId) {
  return YOUNG_PROFESSIONAL_DEMO_EXPENSES.flatMap((monthBlock) =>
    monthBlock.items.map(([category, title, amount, walletKey, day], itemIndex) => {
      const createdAt = at(monthBlock.month, day, 18);
      const categoryKey = budgetKeyForCategory(category);
      return {
        ...base(localUserId, "expense", `${monthBlock.month}_${itemIndex}_${slug(title)}`, createdAt, demoSessionId),
        title,
        name: title,
        amount,
        wallet_id: walletId(localUserId, walletKey),
        walletId: walletId(localUserId, walletKey),
        wallet_name: walletName(walletKey),
        category,
        expense_category: category,
        budget_category: category,
        budgetCategory: category,
        budget_category_id: budgetCategoryId(localUserId, categoryKey),
        budgetCategoryId: budgetCategoryId(localUserId, categoryKey),
        planning_status: "planned",
        budget_status: "planned",
        need_type: ["Food", "Transportation", "Bills", "Debt Payments"].includes(category) ? "need" : "want",
        notes: `${monthBlock.label} demo expense for ${category}.`,
        date: createdAt,
        transaction_date: createdAt,
        created_at: createdAt,
      };
    })
  );
}

function buildExpenseWalletTransactions(localUserId, expenses, demoSessionId) {
  return expenses.map((expense) => ({
    ...base(localUserId, "wallet_txn", `wallet_txn_${expense.id}`, expense.created_at, demoSessionId),
    id: `${expense.id}_wallet_txn`,
    wallet_id: expense.wallet_id,
    walletId: expense.wallet_id,
    amount: expense.amount,
    type: "expense",
    transaction_type: "expense",
    category: expense.category,
    need_type: expense.need_type,
    planning_status: expense.planning_status,
    expense_id: expense.id,
    expenseId: expense.id,
    title: expense.title,
    label: expense.title,
    notes: expense.notes,
    date: expense.date,
    created_at: expense.created_at,
  }));
}

function buildSavingsGoals(localUserId, demoSessionId) {
  return YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.savingsGoals.map((goal, index) => ({
    ...base(localUserId, "savings_goal", goal.key, at(1, 10 + index, 9), demoSessionId),
    title: goal.title,
    name: goal.title,
    target_amount: goal.targetAmount,
    targetAmount: goal.targetAmount,
    saved_amount: goal.savedAmount,
    savedAmount: goal.savedAmount,
    current_amount: goal.savedAmount,
    currentAmount: goal.savedAmount,
    monthly_contribution: goal.monthlyContribution,
    monthlyContribution: goal.monthlyContribution,
    wallet_id: walletId(localUserId, "bdo"),
    walletId: walletId(localUserId, "bdo"),
    linkedWalletId: walletId(localUserId, "bdo"),
    linked_wallet_id: walletId(localUserId, "bdo"),
    linkedWalletName: "BDO",
    linked_wallet_name: "BDO",
    notes: "Reserved goal money still lives inside BDO. The savings goal only gives that money a purpose.",
    status: "active",
  }));
}

function buildEmergencyFund(localUserId, demoSessionId) {
  const fund = YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.emergencyFund;
  return {
    ...base(localUserId, "emergency_fund", "main", at(1, 5, 9), demoSessionId),
    id: `emergency_fund:${localUserId}`,
    title: "Emergency Fund",
    name: "Emergency Fund",
    target_amount: fund.targetAmount,
    targetAmount: fund.targetAmount,
    saved_amount: fund.savedAmount,
    savedAmount: fund.savedAmount,
    current_amount: fund.savedAmount,
    currentAmount: fund.savedAmount,
    protectedBalance: fund.savedAmount,
    protected_balance: fund.savedAmount,
    reserveBalance: fund.savedAmount,
    reserve_balance: fund.savedAmount,
    monthly_target: fund.monthlyTarget,
    monthlyTarget: fund.monthlyTarget,
    wallet_id: walletId(localUserId, fund.walletKey),
    walletId: walletId(localUserId, fund.walletKey),
    linkedWalletId: walletId(localUserId, fund.walletKey),
    linked_wallet_id: walletId(localUserId, fund.walletKey),
    sourceWalletId: walletId(localUserId, fund.walletKey),
    source_wallet_id: walletId(localUserId, fund.walletKey),
    linkedWalletName: walletName(fund.walletKey),
    linked_wallet_name: walletName(fund.walletKey),
    sourceWalletName: walletName(fund.walletKey),
    source_wallet_name: walletName(fund.walletKey),
    status: "Building Foundation",
    notes: "Emergency Fund is protected money inside BDO, not ghost money or a separate invisible wallet.",
  };
}

function buildObligations(localUserId, demoSessionId) {
  return YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.obligations.map((obligation) => ({
    ...base(localUserId, "obligation", obligation.key, at(1, 1, 9), demoSessionId),
    kind: "financial_obligation",
    recordType: "financial_obligation",
    name: obligation.name,
    title: obligation.name,
    outstandingBalance: obligation.outstandingBalance,
    outstanding_balance: obligation.outstandingBalance,
    monthlyDue: obligation.monthlyDue,
    monthly_due: obligation.monthlyDue,
    status: obligation.status,
    paymentHistory: [1, 2, 3, 4, 5].map((month) => ({ month, amount: obligation.monthlyDue, status: "paid" })),
    notes: "Monthly dues are represented in the Debt Payments budget and expense history.",
  }));
}

function buildAiMemories(localUserId, state, demoSessionId) {
  const totalIncome = sum(state.incomeSources.map((source) => source.totalMoneyIn));
  const totalExpenses = sum(state.expenses.map((expense) => expense.amount));
  const savingsTotal = sum(state.savingsGoals.map((goal) => goal.saved_amount));
  const debtTotal = sum(YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.obligations.map((item) => item.outstandingBalance));

  return [
    {
      ...base(localUserId, "ai_memory", "young_professional_money_story", at(5, 31, 22), demoSessionId),
      memoryType: "demo_financial_story",
      memory_type: "demo_financial_story",
      title: "Young Professional Demo Money Story",
      summary: "Young Professional demo with income sources, BDO, GCash, Cash, budgets, January to May expenses, obligations, savings goals, and emergency fund protection.",
      facts: { totalIncome, totalExpenses, currentWalletMoney: 38000, savingsTotal, emergencyFund: 4000, debtTotal, moneyLeftAfterCurrentBudget: 9125 },
    },
    {
      ...base(localUserId, "ai_memory", "philippines_money_calendar", at(1, 1, 8), demoSessionId),
      memoryType: "calendar_intelligence",
      memory_type: "calendar_intelligence",
      title: "Philippines Money-Impact Calendar",
      summary: "January to December money-impact schedule for Filipino young professionals.",
      calendar: YOUNG_PROFESSIONAL_MONEY_CALENDAR,
      financialSeasons: [
        { label: "Build Season", months: "January to March", focus: "Savings, debt reduction, foundation building" },
        { label: "Lifestyle Season", months: "April to August", focus: "Travel, experiences, social spending" },
        { label: "Spending Season", months: "September to December", focus: "Gifts, bonuses, family obligations" },
      ],
    },
  ];
}

function buildYoungProfessionalState(localUserId, demoSessionId) {
  const incomeSources = buildIncomeSources(localUserId, demoSessionId);
  const wallets = buildWallets(localUserId, demoSessionId);
  const incomeWalletTransactions = buildIncomeWalletTransactions(localUserId, incomeSources, demoSessionId);
  const budgets = buildBudgetRows(localUserId, demoSessionId);
  const expenses = buildExpenses(localUserId, demoSessionId);
  const expenseWalletTransactions = buildExpenseWalletTransactions(localUserId, expenses, demoSessionId);
  const savingsGoals = buildSavingsGoals(localUserId, demoSessionId);
  const emergencyFund = buildEmergencyFund(localUserId, demoSessionId);
  const obligations = buildObligations(localUserId, demoSessionId);
  const walletTransactions = [...incomeWalletTransactions, ...expenseWalletTransactions];
  const partialState = { incomeSources, wallets, walletTransactions, transfers: [], budgets, expenses, savingsGoals, emergencyFund, obligations };
  const memories = buildAiMemories(localUserId, partialState, demoSessionId);
  const currentBudgeted = sum(YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.budgets.map(([, , amount]) => amount));

  return {
    ...partialState,
    memories,
    ledgerCheck: {
      demoSessionId,
      resetPolicy: RESET_POLICY,
      incomeSourceCount: incomeSources.length,
      walletCount: wallets.length,
      budgetCategoryCount: YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.budgets.length,
      expenseCount: expenses.length,
      savingsGoalCount: savingsGoals.length,
      obligationCount: obligations.length,
      totalIncomeReceived: sum(incomeSources.map((source) => source.totalMoneyIn)),
      totalIncomeSourceBalance: 0,
      totalWalletMoney: 38000,
      bdoBreakdown: { walletBalance: 22000, emergencyFund: 4000, laptopFund: 5000, travelFund: 3000, moveOutFund: 7000, availableMoney: 3000 },
      currentBudgeted,
      currentMoneyLeftAfterBudget: 9125,
      emergencyFund: 4000,
      savingsGoalsTotal: sum(savingsGoals.map((goal) => goal.saved_amount)),
      debtOutstanding: sum(YOUNG_PROFESSIONAL_DEMO_BLUEPRINT.obligations.map((item) => item.outstandingBalance)),
    },
  };
}

function isYoungProfessionalCurrentStateRecord(record) {
  if (!record || typeof record !== "object") return false;
  return Boolean(record.source === SOURCE || record.setupFamily === FAMILY || record.dataBoundary === DATA_BOUNDARY || record.resetPolicy === RESET_POLICY || (record.activeCurrentState === true && record.lifeStage === LIFE_STAGE) || String(record.id || "").startsWith("clara_yp_current_"));
}

function getRecordTimestamp(record) {
  return [record?.updatedAt, record?.updated_at, record?.createdAt, record?.created_at, record?.date, record?.transaction_date].reduce((latest, value) => {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) && time > latest ? time : latest;
  }, 0);
}

function isDemoMutableRecord(storeName, record) {
  if (DEMO_MUTABLE_FINANCE_STORES.has(storeName)) return true;
  if (storeName === LOCAL_FINANCE_STORES.privatePreferences) return Boolean(record?.kind === "income_source" || record?.recordType === "income_source" || record?.kind === "financial_obligation" || record?.recordType === "financial_obligation");
  return false;
}

function wasTouchedDuringActiveDemoSession(storeName, record, activeState) {
  if (!activeState || !isDemoMutableRecord(storeName, record)) return false;
  const activatedAt = new Date(activeState.activatedAt || 0).getTime();
  if (!Number.isFinite(activatedAt) || activatedAt <= 0) return false;
  return getRecordTimestamp(record) >= activatedAt - SESSION_TIME_GRACE_MS;
}

async function archiveExistingYoungProfessionalCurrentState(localUserId, activeState = readActiveCurrentState(localUserId)) {
  const timestamp = nowIso();
  await runLocalFinanceTransaction(STORES_TO_RESET, localUserId, async (tx) => {
    for (const storeName of STORES_TO_RESET) {
      const rows = await tx.getAllForUser(storeName, true);
      for (const row of rows || []) {
        const shouldReset = isYoungProfessionalCurrentStateRecord(row) || wasTouchedDuringActiveDemoSession(storeName, row, activeState);
        if (shouldReset) {
          tx.store(storeName).put({ ...row, activeCurrentState: false, archivedFromDemoSession: activeState?.demoSessionId || row?.demoSessionId || null, resetPolicy: row?.resetPolicy || RESET_POLICY, deletedAt: timestamp, deleted_at: timestamp, updatedAt: timestamp, updated_at: timestamp, syncStatus: "local_deleted" });
        }
      }
    }
  });
}

async function upsertRows(storeName, rows, localUserId) {
  for (const row of rows) await upsertLocalRecord(storeName, row, localUserId);
}

async function upsertIncomeSources(rows, localUserId) {
  for (const row of rows) await upsertIncomeSource(localUserId, row);
}

function writeActiveState(localUserId, ledgerCheck, demoSessionId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify({ mode: "current_state", dataBoundary: DATA_BOUNDARY, resetPolicy: RESET_POLICY, setupFamily: FAMILY, demoSessionId, activeLifeStageKey: LIFE_STAGE, activeLifeStageTitle: LIFE_STAGE, localUserId, ledgerCheck, activatedAt: nowIso() }));
}

function clearActiveState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_KEY);
}

function writeLifeStageProfile() {
  saveSelectedLifeStageProfile({
    stage: LIFE_STAGE,
    setup: "Full-time earner building independence",
    rhythm: "Work Salary, Small Side Hustle, and Family Support transfer into BDO, GCash, and Cash",
    workload: "Full-time work with commute, bills, family contribution, obligations, and lifestyle pressure",
    pressure: "Payday confidence can hide monthly dues, social spending, online shopping, and family obligations",
    coping: "Money becomes easier to manage when income sources stay empty and wallets show where money actually lives",
    goal: "Use CLARA to connect income, wallet balances, budget categories, obligations, savings goals, emergency fund, and seasonal money risks",
    currentFocus: "Understand the full money flow from January to May and prepare for Philippine holiday spending seasons",
    financialFear: "Money movement becomes confusing when goals, emergency fund, and obligations feel separate from real wallet balances",
    nonNegotiable: "Income sources are origins only. Wallets hold the real money.",
  });
}

function dispatchRefresh(result) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("clara-young-professional-current-state-loaded", { detail: result }));
  window.dispatchEvent(new Event("clara-income-hub-updated"));
  window.dispatchEvent(new Event("clara-wallets-updated"));
  window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
  window.dispatchEvent(new Event("clara-finance-updated"));
  window.dispatchEvent(new Event("clara:life-stage-profile-updated"));
}

export async function activateYoungProfessionalCurrentState({ user = null } = {}) {
  const localUserId = await resolveLocalUserId(user);
  const previousActiveState = readActiveCurrentState(localUserId);
  const demoSessionId = createDemoSessionId(localUserId);
  const state = buildYoungProfessionalState(localUserId, demoSessionId);

  await archiveExistingYoungProfessionalCurrentState(localUserId, previousActiveState);
  await upsertIncomeSources(state.incomeSources, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.wallets, state.wallets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.walletTransactions, state.walletTransactions, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.budgets, state.budgets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.expenses, state.expenses, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.savingsGoals, state.savingsGoals, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.emergencyFund, [state.emergencyFund], localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.aiFinancialMemory, state.memories, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.privatePreferences, state.obligations, localUserId);

  writeLifeStageProfile();
  writeActiveState(localUserId, state.ledgerCheck, demoSessionId);

  const result = { mode: "current_state", dataBoundary: DATA_BOUNDARY, resetPolicy: RESET_POLICY, lifeStage: LIFE_STAGE, localUserId, demoSessionId, incomeSources: state.incomeSources.length, wallets: state.wallets.length, budgets: state.budgets.length, expenses: state.expenses.length, transfers: state.transfers.length, walletTransactions: state.walletTransactions.length, savingsGoals: state.savingsGoals.length, emergencyFund: Boolean(state.emergencyFund), obligations: state.obligations.length, memories: state.memories.length, ledgerCheck: state.ledgerCheck };
  dispatchRefresh(result);
  return result;
}

export async function exitYoungProfessionalCurrentState({ user = null } = {}) {
  const localUserId = await resolveLocalUserId(user);
  const activeState = readActiveCurrentState(localUserId);
  await archiveExistingYoungProfessionalCurrentState(localUserId, activeState);
  clearActiveState();
  const result = { mode: "real_data", lifeStage: LIFE_STAGE, localUserId, exitedCurrentState: true, resetPolicy: RESET_POLICY, clearedDemoSessionId: activeState?.demoSessionId || null };
  dispatchRefresh(result);
  return result;
}
