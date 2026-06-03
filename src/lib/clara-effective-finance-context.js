import {
  getBudgets,
  getEmergencyFund,
  getExpenses,
  getSavingsGoals,
  getWallets,
} from "@/lib/financeRepository";
import { buildClaraBridgeReadableContext } from "@/lib/clara-bridge-context-readers";
import { MEMORY_CABINET_DEFINITIONS, readMemoryCabinet } from "@/lib/memory-cabinets";
import {
  activateClaraSampleUserData,
  getClaraSampleUserDataState,
} from "@/lib/clara-demo-sample-data";

const DEMO_SOURCE = "clara_sample_demo_seed";
const DEMO_PREFIX = "clara_sample_max";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isDeleted(record = {}) {
  return Boolean(record.deletedAt || record.deleted_at || record.syncStatus === "local_deleted");
}

function isDemoRecord(record = {}) {
  const id = clean(record.id);
  return Boolean(
    record.demoSeed === true ||
      record.source === DEMO_SOURCE ||
      id.startsWith(DEMO_PREFIX) ||
      id === "emergency_fund:sample_max"
  );
}

function hasDemoRecords(raw = {}) {
  return [
    ...safeArray(raw.wallets),
    ...safeArray(raw.budgets),
    ...safeArray(raw.expenses),
    ...safeArray(raw.savingsGoals),
    raw.emergencyFund,
  ].filter(Boolean).some(isDemoRecord);
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
      0
  );

  return {
    id: budget.id,
    title: getBudgetTitle(budget),
    category: getBudgetTitle(budget),
    limit: amount,
    amount,
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
    planningStatus: clean(expense.planning_status || expense.budget_status || expense.status || ""),
    needType: clean(expense.need_type || expense.needType || ""),
    unplannedReason: clean(expense.unplanned_reason || ""),
    source: expense.source || null,
  };
}

function normalizeSavingsGoal(goal = {}) {
  return {
    id: goal.id,
    name: clean(goal.name || goal.title || goal.label || "Savings Goal"),
    savedAmount: toNumber(goal.saved_amount ?? goal.savedAmount ?? goal.saved ?? goal.current_amount ?? 0),
    targetAmount: toNumber(goal.target_amount ?? goal.targetAmount ?? goal.target ?? goal.goal_amount ?? 0),
    targetDate: goal.target_date || goal.targetDate || "",
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

async function readRepositoryFinance(localUserId) {
  const [wallets, budgets, expenses, savingsGoals, emergencyFund] = await Promise.all([
    getWallets(localUserId).catch(() => []),
    getBudgets(localUserId).catch(() => []),
    getExpenses(localUserId).catch(() => []),
    getSavingsGoals(localUserId).catch(() => []),
    getEmergencyFund(localUserId).catch(() => null),
  ]);

  return {
    wallets: safeArray(wallets).filter((record) => !isDeleted(record)),
    budgets: safeArray(budgets).filter((record) => !isDeleted(record)),
    expenses: safeArray(expenses).filter((record) => !isDeleted(record)),
    savingsGoals: safeArray(savingsGoals).filter((record) => !isDeleted(record)),
    emergencyFund: emergencyFund && !isDeleted(emergencyFund) ? emergencyFund : null,
  };
}

function hasFinanceData(raw = {}) {
  return Boolean(
    safeArray(raw.wallets).length ||
      safeArray(raw.budgets).length ||
      safeArray(raw.expenses).length ||
      safeArray(raw.savingsGoals).length ||
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
  const user = options.user || { id: localUserId };
  const messages = safeArray(options.messages);

  let raw = await readRepositoryFinance(localUserId);
  let repoHasData = hasFinanceData(raw);

  const sampleState = await getClaraSampleUserDataState({ user }).catch(() => ({
    active: false,
    activeFlagForUser: false,
    hasSampleRecords: false,
    localUserId,
  }));

  if (!repoHasData && sampleState?.active) {
    try {
      await activateClaraSampleUserData({ user });
      raw = await readRepositoryFinance(localUserId);
      repoHasData = hasFinanceData(raw);
    } catch (error) {
      console.warn("CLARA effective context demo hydration skipped:", error);
    }
  }

  const bridgeContext = buildClaraBridgeReadableContext({ messages });
  const source = hasDemoRecords(raw) || (sampleState?.active && !repoHasData) ? "demo" : "real";
  const wallets = raw.wallets.map(normalizeWallet);
  const budgets = raw.budgets.filter(isBudgetCategory).map(normalizeBudget);
  const expenses = raw.expenses.map(normalizeExpense);
  const savingsGoals = raw.savingsGoals.map(normalizeSavingsGoal);
  const emergencyFund = normalizeEmergencyFund(raw.emergencyFund);
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
    sampleActive: Boolean(sampleState?.active),
    sampleRecordsFound: Boolean(sampleState?.hasSampleRecords || hasDemoRecords(raw)),
    localUserId,
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
  };
}
