import {
  getBudgets,
  getEmergencyFund,
  getExpenses,
  getSavingsGoals,
  getTransfers,
  getWallets,
  getWalletTransactions,
} from "@/lib/financeRepository";
import { buildClaraBridgeReadableContext } from "@/lib/clara-bridge-context-readers";
import { getIncomeSources } from "@/lib/incomeHubRepository";
import { getDebtObligations } from "@/lib/debtObligationStore";
import { MEMORY_CABINET_DEFINITIONS, readMemoryCabinet } from "@/lib/memory-cabinets";

const RETIRED_DEMO_SOURCES = new Set([
  "clara_demo_account",
  "clara_sample_demo_seed",
  "clara_life_stage_demo_seed",
]);

const INCOME_TRANSACTION_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "credit",
]);

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanLower(value = "") {
  return clean(value).toLowerCase();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isDeleted(record = {}) {
  return Boolean(record.deletedAt || record.deleted_at || record.syncStatus === "local_deleted");
}

function isRetiredDemoRecord(record = {}) {
  const id = clean(record.id);
  const source = clean(record.source);
  const setupFamily = clean(record.setupFamily || record.setup_family);
  const localUserId = clean(record.localUserId || record.local_user_id);

  return Boolean(
    localUserId === "clara-demo-user" ||
      id.startsWith("clara_demo") ||
      id.startsWith("clara_sample_max") ||
      id.startsWith("clara_life_stage_demo") ||
      RETIRED_DEMO_SOURCES.has(source) ||
      setupFamily === "life_stage_sample" ||
      record.demoAccount === true ||
      record.demo_account === true ||
      record.demoVersion ||
      record.demo_version ||
      record.sampleData === true ||
      record.sample_data === true
  );
}

function isSafeFinanceRecord(record = {}) {
  return !isDeleted(record) && !isRetiredDemoRecord(record);
}

function normalizeWallet(wallet = {}) {
  return {
    id: wallet.id,
    name: clean(wallet.name || wallet.wallet_name || wallet.title || wallet.label || "Wallet"),
    type: clean(wallet.type || wallet.wallet_type || wallet.kind || ""),
    balance: toNumber(
      wallet.balance ??
        wallet.current_balance ??
        wallet.wallet_balance ??
        wallet.available_balance ??
        wallet.starting_balance ??
        0
    ),
    source: wallet.source || null,
  };
}

function getBudgetTitle(budget = {}) {
  return clean(budget.category || budget.name || budget.title || budget.label || budget.budget_category || "");
}

function isBudgetCategory(budget = {}) {
  const title = getBudgetTitle(budget);
  return Boolean(
    title &&
      title !== "__monthly_budget__" &&
      budget.is_plan_header !== true &&
      budget.plan_type !== "monthly_budget" &&
      budget.type !== "monthly_budget"
  );
}

function normalizeBudget(budget = {}) {
  const amount = toNumber(
    budget.amount ??
      budget.limit ??
      budget.budget_amount ??
      budget.allocated ??
      budget.allocated_amount ??
      budget.monthly_amount ??
      budget.total_budget ??
      budget.budget ??
      budget.cap ??
      budget.plannedAmount ??
      budget.planned_amount ??
      budget.monthlyLimit ??
      budget.monthly_limit ??
      budget.categoryLimit ??
      budget.category_limit ??
      0
  );

  return {
    id: budget.id,
    title: getBudgetTitle(budget),
    category: getBudgetTitle(budget),
    limit: amount,
    amount,
    plannedAmount: amount,
    allocatedAmount: amount,
    monthlyLimit: amount,
    categoryLimit: amount,
    remainingAmount: toNumber(budget.remainingAmount ?? budget.remaining_amount ?? 0),
    month: clean(budget.month || budget.budget_month || budget.month_key || ""),
    needType: clean(budget.need_type || budget.needType || ""),
    source: budget.source || null,
  };
}

function normalizeExpense(expense = {}) {
  return {
    id: expense.id,
    walletId: clean(expense.wallet_id || expense.walletId || ""),
    amount: toNumber(expense.amount ?? expense.total ?? expense.value ?? 0),
    category: clean(expense.category || expense.category_name || expense.budget_category || expense.expense_category || expense.tag || "Uncategorized"),
    title: clean(expense.title || expense.name || expense.merchant || expense.item || "Expense"),
    note: clean(expense.notes || expense.note || expense.item || expense.title || ""),
    date: expense.date || expense.created_at || expense.createdAt || expense.updatedAt || "",
    planningStatus: clean(expense.planning_status || expense.planningStatus || expense.budget_status || expense.budgetStatus || expense.status || ""),
    budgetStatus: clean(expense.budget_status || expense.budgetStatus || ""),
    needType: clean(expense.need_type || expense.needType || ""),
    unplannedReason: clean(expense.unplanned_reason || ""),
    expenseId: expense.expenseId || expense.expense_id || null,
    sourceExpenseId: expense.sourceExpenseId || expense.source_expense_id || null,
    referenceId: expense.referenceId || expense.reference_id || null,
    linkedExpenseId: expense.linkedExpenseId || expense.linked_expense_id || null,
    source: expense.source || null,
  };
}

function normalizeWalletTransaction(transaction = {}) {
  return {
    id: transaction.id,
    walletId: clean(transaction.wallet_id || transaction.walletId || transaction.source_wallet_id || transaction.sourceWalletId || ""),
    type: clean(transaction.type || transaction.transaction_type || transaction.kind || ""),
    amount: toNumber(transaction.amount ?? transaction.total ?? transaction.value ?? 0),
    title: clean(transaction.title || transaction.name || transaction.merchant || transaction.label || "Wallet transaction"),
    note: clean(transaction.note || transaction.notes || transaction.description || transaction.memo || transaction.title || ""),
    date: transaction.date || transaction.created_at || transaction.createdAt || transaction.updatedAt || transaction.transaction_date || transaction.transactionDate || "",
    expenseId: transaction.expenseId || transaction.expense_id || null,
    sourceExpenseId: transaction.sourceExpenseId || transaction.source_expense_id || null,
    referenceId: transaction.referenceId || transaction.reference_id || null,
    linkedExpenseId: transaction.linkedExpenseId || transaction.linked_expense_id || null,
    source: transaction.source || null,
  };
}

function normalizeTransfer(transfer = {}) {
  return {
    id: transfer.id,
    fromWalletId: clean(transfer.from_wallet_id || transfer.fromWalletId || transfer.source_wallet_id || transfer.sourceWalletId || transfer.wallet_id || transfer.walletId || ""),
    toWalletId: clean(transfer.to_wallet_id || transfer.toWalletId || transfer.destination_wallet_id || transfer.destinationWalletId || transfer.target_wallet_id || transfer.targetWalletId || ""),
    amount: toNumber(transfer.amount ?? transfer.total ?? transfer.value ?? 0),
    date: transfer.date || transfer.created_at || transfer.createdAt || transfer.updatedAt || transfer.transfer_date || transfer.transferDate || "",
    source: transfer.source || null,
  };
}

function isIncomeTransaction(transaction = {}) {
  return INCOME_TRANSACTION_TYPES.has(cleanLower(transaction.type || transaction.transaction_type || transaction.kind));
}

function normalizeIncome(transaction = {}) {
  const normalized = normalizeWalletTransaction(transaction);
  return {
    id: normalized.id,
    walletId: normalized.walletId,
    amount: normalized.amount,
    title: normalized.title,
    note: normalized.note,
    date: normalized.date,
    source: normalized.source,
  };
}

function normalizeIncomeSource(source = {}) {
  const totalMoneyIn = toNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in ?? 0);
  const totalMoneyOut = toNumber(source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out ?? 0);
  const currentBalance = toNumber(source.currentBalance ?? source.current_balance ?? source.balance ?? totalMoneyIn - totalMoneyOut);

  return {
    id: source.id,
    name: clean(source.name || source.title || source.label || source.category || "Income source"),
    category: clean(source.category || "Other Income"),
    stability: clean(source.stability || ""),
    currentBalance,
    totalMoneyIn,
    totalMoneyOut,
    monthlyAmount: toNumber(source.monthlyAmount ?? source.monthly_amount ?? 0),
    expectedMonthlyIncome: toNumber(source.expectedMonthlyIncome ?? source.expected_monthly_income ?? 0),
    recurringAmount: toNumber(source.recurringAmount ?? source.recurring_amount ?? 0),
    salaryAmount: toNumber(source.salaryAmount ?? source.salary_amount ?? 0),
    lastActivityAt: source.lastActivityAt || source.last_activity_at || source.updatedAt || source.updated_at || source.createdAt || source.created_at || "",
    source: source.source || null,
  };
}

function normalizeDebtObligation(record = {}) {
  const balance = toNumber(record.totalDebt ?? record.balance ?? record.amount ?? record.debt_balance ?? record.remainingBalance ?? record.remaining_balance ?? 0);
  const amount = toNumber(record.monthlyDebt ?? record.monthlyPayment ?? record.monthly_payment ?? record.payment ?? record.scheduledPayment ?? record.scheduled_payment ?? 0);

  return {
    id: record.id,
    title: clean(record.title || record.name || record.lender || record.creditor || record.label || record.debtName || "Debt obligation"),
    name: clean(record.name || record.title || record.lender || record.creditor || record.label || record.debtName || "Debt obligation"),
    amount,
    balance,
    monthlyDebt: amount,
    monthlyPayment: amount,
    dueDate: record.dueDate || record.due_date || record.nextDueDate || record.next_due_date || record.date || "",
    date: record.date || record.created_at || record.createdAt || record.updatedAt || record.updated_at || "",
    status: clean(record.status || ""),
    source: record.source || null,
  };
}

function normalizeSavingsGoal(goal = {}) {
  return {
    id: goal.id,
    name: clean(goal.name || goal.title || goal.label || "Savings Goal"),
    savedAmount: toNumber(goal.saved_amount ?? goal.savedAmount ?? goal.saved ?? goal.current_amount ?? goal.currentAmount ?? 0),
    targetAmount: toNumber(goal.target_amount ?? goal.targetAmount ?? goal.target ?? goal.goal_amount ?? 0),
    targetDate: goal.target_date || goal.targetDate || "",
    date: goal.date || goal.created_at || goal.createdAt || goal.updated_at || goal.updatedAt || "",
    status: clean(goal.status || ""),
    source: goal.source || null,
  };
}

function normalizeEmergencyFund(record = null) {
  if (!record) return null;

  return {
    id: record.id,
    savedAmount: toNumber(record.saved_amount ?? record.savedAmount ?? record.saved ?? record.current_amount ?? record.amount ?? 0),
    targetAmount: toNumber(record.target_amount ?? record.targetAmount ?? record.target ?? 0),
    monthlyTarget: toNumber(record.monthly_target ?? record.monthlyTarget ?? 0),
    monthlySurvivalExpense: toNumber(record.monthly_survival_expense ?? record.monthlySurvivalExpense ?? 0),
    monthsCovered: toNumber(record.monthsCovered ?? record.months_covered ?? 0),
    linkedWalletId: clean(record.linkedWalletId || record.linked_wallet_id || ""),
    linkedWalletName: clean(record.linkedWalletName || record.linked_wallet_name || ""),
    date: record.date || record.created_at || record.createdAt || record.updated_at || record.updatedAt || "",
    status: clean(record.status || ""),
    source: record.source || null,
  };
}

function normalizeScheduleEvents(scheduleContext = null) {
  if (Array.isArray(scheduleContext)) return scheduleContext.filter(Boolean);

  const seen = new Set();
  const events = [
    ...safeArray(scheduleContext?.upcomingEvents),
    ...safeArray(scheduleContext?.moneyImpactEvents),
  ];

  return events.filter((event) => {
    const key = clean(event.id || `${event.date}-${event.title}-${event.time}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarizeMemoryCabinets() {
  try {
    return MEMORY_CABINET_DEFINITIONS.map((definition) => ({
      cabinet: definition.name,
      records: readMemoryCabinet(definition.name)
        .slice(-20)
        .map((entry) => ({
          id: entry.id,
          summary: clean(entry.summary || entry.text || entry.content || entry.value || ""),
          signals: Array.isArray(entry.signals) ? entry.signals.slice(0, 6) : [],
          patternStrength: entry.patternStrength || "",
          occurrenceCount: entry.occurrenceCount || 1,
        }))
        .filter((entry) => entry.summary || entry.signals.length),
    })).filter((cabinet) => cabinet.records.length);
  } catch {
    return [];
  }
}

function countMemoryRecords(memoryContext = null) {
  if (!memoryContext) return 0;

  const cabinetCount = safeArray(memoryContext.memoryCabinets).reduce(
    (total, cabinet) => total + safeArray(cabinet.records).length,
    0
  );
  const storedMemoryCount = toNumber(memoryContext.previousConversationMemory?.storedMemoryCount || 0);
  const userHistoryCount = safeArray(memoryContext.userMessageHistory).length;
  const profileNotesCount = safeArray(memoryContext.profileMemoryNotes).length;

  return cabinetCount + storedMemoryCount + userHistoryCount + profileNotesCount;
}

async function safeRead(readFn, fallback) {
  try {
    return await readFn();
  } catch {
    return fallback;
  }
}

async function readRepositoryFinance(localUserId) {
  const [
    wallets,
    budgets,
    expenses,
    walletTransactions,
    transfers,
    savingsGoals,
    emergencyFund,
    incomeSources,
    debtObligations,
  ] = await Promise.all([
    safeRead(() => getWallets(localUserId), []),
    safeRead(() => getBudgets(localUserId), []),
    safeRead(() => getExpenses(localUserId), []),
    safeRead(() => getWalletTransactions(localUserId), []),
    safeRead(() => getTransfers(localUserId), []),
    safeRead(() => getSavingsGoals(localUserId), []),
    safeRead(() => getEmergencyFund(localUserId), null),
    safeRead(() => getIncomeSources(localUserId), []),
    safeRead(() => getDebtObligations(localUserId), []),
  ]);

  return {
    wallets: safeArray(wallets).filter(isSafeFinanceRecord),
    budgets: safeArray(budgets).filter(isSafeFinanceRecord),
    expenses: safeArray(expenses).filter(isSafeFinanceRecord),
    walletTransactions: safeArray(walletTransactions).filter(isSafeFinanceRecord),
    transfers: safeArray(transfers).filter(isSafeFinanceRecord),
    savingsGoals: safeArray(savingsGoals).filter(isSafeFinanceRecord),
    emergencyFund: emergencyFund && isSafeFinanceRecord(emergencyFund) ? emergencyFund : null,
    incomeSources: safeArray(incomeSources).filter(isSafeFinanceRecord),
    debtObligations: safeArray(debtObligations).filter(isSafeFinanceRecord),
  };
}

function hasFinanceData(raw = {}) {
  return Boolean(
    safeArray(raw.wallets).length ||
      safeArray(raw.budgets).length ||
      safeArray(raw.expenses).length ||
      safeArray(raw.walletTransactions).length ||
      safeArray(raw.transfers).length ||
      safeArray(raw.savingsGoals).length ||
      safeArray(raw.incomeSources).length ||
      safeArray(raw.debtObligations).length ||
      raw.emergencyFund
  );
}

function buildMemoryContext(bridgeContext = {}, meProfileContext = null) {
  return {
    memoryCabinets: summarizeMemoryCabinets(),
    previousConversationMemory: bridgeContext.previousConversationMemory || null,
    userMessageHistory: bridgeContext.userMessageHistory || [],
    profileMemoryNotes: safeArray(meProfileContext?.memoryNotes),
  };
}

export async function getClaraEffectiveFinanceContext(userId, options = {}) {
  const localUserId = clean(userId) || "local-user";
  const messages = safeArray(options.messages);

  const raw = await readRepositoryFinance(localUserId);
  const repoHasData = hasFinanceData(raw);
  const bridgeContext = buildClaraBridgeReadableContext({ messages });
  const source = "real";
  const wallets = raw.wallets.map(normalizeWallet);
  const budgets = raw.budgets.filter(isBudgetCategory).map(normalizeBudget);
  const expenses = raw.expenses.map(normalizeExpense);
  const walletTransactions = raw.walletTransactions.map(normalizeWalletTransaction);
  const transfers = raw.transfers.map(normalizeTransfer);
  const incomes = raw.walletTransactions.filter(isIncomeTransaction).map(normalizeIncome);
  const incomeSources = raw.incomeSources.map(normalizeIncomeSource);
  const savingsGoals = raw.savingsGoals.map(normalizeSavingsGoal);
  const emergencyFund = normalizeEmergencyFund(raw.emergencyFund);
  const debtObligations = raw.debtObligations.map(normalizeDebtObligation);
  const scheduleContext = normalizeScheduleEvents(bridgeContext.scheduleEvents);
  const meProfileContext =
    bridgeContext.Me_summary_profile?.hasProfile
      ? bridgeContext.Me_summary_profile
      : bridgeContext.meLifeStageProfile?.hasProfile
        ? bridgeContext.meLifeStageProfile
        : bridgeContext.lifeStageContext?.hasProfile
          ? bridgeContext.lifeStageContext
          : bridgeContext.Me_summary_profile || null;
  const memoryContext = buildMemoryContext(bridgeContext, meProfileContext);
  const memoryLoaded = countMemoryRecords(memoryContext);

  const dataReadStatus = {
    source,
    contextSource: source,
    walletsLoaded: wallets.length,
    budgetsLoaded: budgets.length,
    expensesLoaded: expenses.length,
    savingsGoalsLoaded: savingsGoals.length,
    emergencyFundLoaded: emergencyFund ? 1 : 0,
    scheduleLoaded: scheduleContext.length,
    meProfileLoaded: meProfileContext?.hasProfile || meProfileContext?.profile || meProfileContext?.profileAnswers ? 1 : 0,
    memoryLoaded,
    repositoryHadData: repoHasData,
    sampleActive: false,
    sampleRecordsFound: false,
    localUserId,
    walletTransactionsLoaded: walletTransactions.length,
    transfersLoaded: transfers.length,
    incomesLoaded: incomes.length,
    incomeSourcesLoaded: incomeSources.length,
    debtObligationsLoaded: debtObligations.length,
  };

  return {
    source,
    wallets,
    budgets,
    expenses,
    savingsGoals,
    emergencyFund,
    scheduleContext,
    meProfileContext,
    memoryContext: memoryLoaded ? memoryContext : null,
    timeContext: bridgeContext.currentTime,
    dataReadStatus,
    walletTransactions,
    transfers,
    incomes,
    incomeSources,
    debtObligations,
  };
}
