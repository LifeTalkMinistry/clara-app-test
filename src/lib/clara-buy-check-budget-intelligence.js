import {
  analyzeBuyCheckBudgetCoverage,
  clean,
  isProtectedWallet,
  safeList,
  safeRecord,
  toNumber,
  walletBalance,
  walletName,
} from "@/lib/clara-buy-check-budget-core";

const PH_TIME_ZONE = "Asia/Manila";
const isRecord = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));

function scheduleItems(contextValue) {
  const context = safeRecord(contextValue);
  const raw =
    context.scheduleContext ||
    context.schedule ||
    context.upcomingSchedule ||
    safeRecord(context.dashboardCardsLiveSnapshot).schedule ||
    [];
  if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 8);
  const schedule = safeRecord(raw);
  return [
    ...(Array.isArray(schedule.upcomingEvents) ? schedule.upcomingEvents : []),
    ...(Array.isArray(schedule.moneyImpactEvents) ? schedule.moneyImpactEvents : []),
  ]
    .filter(Boolean)
    .slice(0, 8);
}

function memorySummary(contextValue) {
  const context = safeRecord(contextValue);
  const source =
    context.memoryContext ||
    context.fullMemoryContext ||
    context.claraMemoryContext ||
    context.aiFinancialMemory ||
    null;
  if (!source) return "No strong saved spending pattern was available.";
  if (typeof source === "string") return clean(source).slice(0, 280);

  const memory = safeRecord(source);
  const records = safeList(memory.memoryCabinets).flatMap((cabinet) => safeList(cabinet.records));
  const notes = safeList(memory.profileMemoryNotes);
  const candidates = [...records, ...notes];
  const selected =
    candidates.find((record) =>
      /payday|impulse|shopping|trigger|spending|discipline|emergency|goal/i.test(
        `${record.summary || ""} ${Array.isArray(record.signals) ? record.signals.join(" ") : ""}`,
      ),
    ) || candidates[0];

  return clean(
    selected?.summary ||
      (Array.isArray(selected?.signals) ? selected.signals.join(" ") : "") ||
      "No strong saved spending pattern was available.",
  ).slice(0, 280);
}

function buildContextPackage(flowValue, contextValue) {
  const flow = safeRecord(flowValue);
  const context = safeRecord(contextValue);
  const wallets = safeList(context.wallets);
  const savingsGoals = safeList(context.savingsGoals);
  const spendableWallets = wallets.filter((wallet) => !isProtectedWallet(wallet));
  const protectedWallets = wallets.filter(isProtectedWallet);
  const spendableTotal = spendableWallets.reduce((sum, wallet) => sum + walletBalance(wallet), 0);
  const budgetAssessment = analyzeBuyCheckBudgetCoverage(flow.item, flow.price, context);
  const selectedBudget = budgetAssessment.selectedBudget;

  return {
    purchase: {
      item: clean(flow.item),
      price: toNumber(flow.price),
      reason: clean(flow.reason),
      planningStatus: budgetAssessment.status === "full" ? "planned" : flow.planningStatus || "unplanned",
      category: budgetAssessment.purchaseCategory,
      categoryKey: budgetAssessment.purchaseCategoryKey,
    },
    finance: {
      spendableWallets: spendableWallets.map((wallet) => ({
        name: walletName(wallet),
        balance: walletBalance(wallet),
      })),
      protectedWallets: protectedWallets.map((wallet) => ({
        name: walletName(wallet),
        balance: walletBalance(wallet),
      })),
      spendableTotal,
      matchingBudget: selectedBudget
        ? {
            id: selectedBudget.id,
            title: selectedBudget.title,
            flexible: selectedBudget.flexible,
            matchType: selectedBudget.matchType,
            limit: selectedBudget.limit,
            spent: selectedBudget.spent,
            remaining: selectedBudget.remaining,
            remainingAfter: budgetAssessment.remainingAfter,
            shortfall: budgetAssessment.shortfall,
            rangeStart: selectedBudget.rangeStart,
            rangeEnd: selectedBudget.rangeEnd,
          }
        : null,
      budgetAssessment: {
        status: budgetAssessment.status,
        scannedBudgetCount: budgetAssessment.scannedBudgetCount,
        matchedBudgetCount: budgetAssessment.matchedBudgetCount,
        flexibleBudgetCount: budgetAssessment.flexibleBudgetCount,
        shortfall: budgetAssessment.shortfall,
        walletShortfall: budgetAssessment.walletShortfall,
        candidates: budgetAssessment.candidates.slice(0, 6),
      },
      savingsGoals: savingsGoals.slice(0, 4),
      emergencyFund: isRecord(context.emergencyFund) ? context.emergencyFund : null,
    },
    schedule: scheduleItems(context),
    meProfile:
      context.meProfileContext ||
      context.lifeProfile ||
      safeRecord(context.user).user_metadata ||
      null,
    memory: memorySummary(context),
  };
}

function getPHDateString(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function normalizeNeedType(reason = "", category = "") {
  const text = `${reason} ${category}`.toLowerCase();
  if (/health|medical|medicine|doctor|work|job|school|study|replacement|replace|broken|repair|lost/.test(text)) return "need";
  if (/savings|goal|invest/.test(text)) return "savings";
  return "want";
}

function saveLocalList(key, payload) {
  try {
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    const list = Array.isArray(current) ? current : [];
    list.unshift(payload);
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function dispatchFinanceUpdates() {
  if (typeof window === "undefined") return;
  [
    "clara-expenses-updated",
    "clara-finance-updated",
    "clara-wallets-updated",
    "clara-wallet-transactions-updated",
    "clara-local-finance-updated",
  ].forEach((name) => window.dispatchEvent(new Event(name)));
}

export {
  analyzeBuyCheckBudgetCoverage,
  budgetCoverageFromAssessment,
  clean,
  confirmationText,
  createDecisionState,
  createInitialState,
  createMessage,
  getWalletOptions,
  money,
  normalizeExpenseCategory,
  parsePrice,
  priceStepMessage,
  safeList,
  safeRecord,
  toNumber,
} from "@/lib/clara-buy-check-budget-core";

export {
  buildContextPackage,
  getPHDateString,
  normalizeNeedType,
  saveLocalList,
  dispatchFinanceUpdates,
};
