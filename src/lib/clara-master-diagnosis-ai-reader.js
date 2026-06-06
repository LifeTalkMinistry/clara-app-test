const MEMORY_KEY = "clara_behavioral_memory_v1";

const LIFE_KEYS = ["incomePattern", "livingSituation", "responsibilities", "workType", "relationshipStatus", "dependents", "currentFinancialPressure", "survivalPressureLevel", "mainFinancialGoal", "emotionalStateTrend"];
const EMOTION_KEYS = ["emotionalTriggers", "stressSpendingHabits", "rewardSystem", "commonImpulsivePurchases", "biggestSpendingWeakness", "copingMechanisms", "motivationStyle", "financialFear", "guiltPatterns", "socialPressureTriggers"];
const SCHEDULE_KEYS = ["scheduleRoutine", "sleepPattern", "workExhaustion", "socialEnvironment", "relationshipConflicts", "hobbyPatterns", "energyLevelTrends", "burnoutIndicators"];
const MONEY_PROFILE_KEYS = ["wallets", "budgets", "emergencyFund", "savingsGoals", "recurringExpenses", "debt", "subscriptions", "transfers", "paydayCycle"];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[’']/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(String(value ?? "0").replace(/php/gi, "").replace(/[₱,\s]/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(toNumber(value));
}

function readMemory() {
  if (typeof window === "undefined" || !window.localStorage) return { updatedAt: "missing", items: {} };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MEMORY_KEY) || "{}");
    return { updatedAt: parsed.updatedAt || "missing", items: safeObject(parsed.items) };
  } catch {
    return { updatedAt: "unreadable", items: {} };
  }
}

function memoryValue(items, key) {
  const direct = items[key];
  if (direct?.value !== undefined && String(direct.value).trim()) return String(direct.value).trim();
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const nested = Object.keys(items).filter((itemKey) => itemKey.startsWith(`${key}.`));
  if (!nested.length) return "";
  return nested.map((itemKey) => {
    const item = items[itemKey];
    const value = item?.value ?? item;
    return String(value || "").trim() ? `${itemKey.replace(`${key}.`, "")}: ${String(value).trim()}` : "";
  }).filter(Boolean).join("; ");
}

function memoryBlock(title, keys, items) {
  const lines = keys.map((key) => `${key}: ${memoryValue(items, key) || "MISSING"}`);
  const readable = keys.filter((key) => Boolean(memoryValue(items, key))).length;
  return { title, readable, total: keys.length, text: `${title}\nreadable=${readable}/${keys.length}\n${lines.join("\n")}` };
}

function statusFromSnapshot(snapshot, tests) {
  if (!snapshot) return "MISSING";
  if (snapshot.connected === false) return "NOT_CONNECTED";
  return tests.some((test) => {
    try { return Boolean(test(snapshot)); } catch { return false; }
  }) ? "READABLE" : "EMPTY_OR_LIMITED";
}

function counts(context) {
  const transactionHub = context.transactionHubSnapshot || {};
  const incomeHub = context.incomeHubSnapshot || {};
  const cards = context.dashboardCardsLiveSnapshot || {};
  return [
    `wallets=${safeArray(context.wallets).length}`,
    `walletTransactions=${safeArray(context.walletTransactions).length}`,
    `transfers=${safeArray(context.transfers).length}`,
    `expenses=${safeArray(context.expenses).length}`,
    `incomes=${safeArray(context.incomes).length}`,
    `incomeSources=${safeArray(context.incomeSources).length}`,
    `budgets=${safeArray(context.budgets).length}`,
    `savingsGoals=${safeArray(context.savingsGoals).length}`,
    `debtObligations=${safeArray(context.debtObligations).length}`,
    `emergencyFund=${context.emergencyFund ? "present" : "missing"}`,
    `transactionHubTimeline=${safeArray(transactionHub.timeline).length}`,
    `incomeHubTimeline=${safeArray(incomeHub.timeline).length}`,
    `dashboardCards=${safeArray(cards.cards).length}`,
  ].join("\n");
}

function snapshotHealth(context) {
  const summary = context.dashboardSummarySnapshot || null;
  const cards = context.dashboardCardsLiveSnapshot || null;
  const income = context.incomeHubSnapshot || null;
  const transaction = context.transactionHubSnapshot || null;
  return [
    `Dashboard Summary: ${statusFromSnapshot(summary, [(s) => s.walletCount > 0, (s) => s.expenseCountThisMonth > 0, (s) => s.incomeCountThisMonth > 0, (s) => s.moneyLeft > 0])}`,
    `Dashboard Cards: ${statusFromSnapshot(cards, [(s) => safeArray(s.cards).length > 0])}`,
    `Income Hub: ${statusFromSnapshot(income, [(s) => s.totalIncomeRecords > 0, (s) => safeArray(s.sourceRoots).length > 0, (s) => safeArray(s.timeline).length > 0])}`,
    `Transaction Hub: ${statusFromSnapshot(transaction, [(s) => safeArray(s.timeline).length > 0, (s) => s.transactionCount > 0, (s) => s.totalMoneyIn > 0 || s.totalMoneyOut > 0])}`,
    `Debt / Obligations: ${safeArray(context.debtObligations).length > 0 ? "READABLE" : "EMPTY_OR_NOT_STARTED"}`,
  ].join("\n");
}

function moneyValues(context) {
  const summary = context.dashboardSummarySnapshot || {};
  const income = context.incomeHubSnapshot || {};
  return [
    `moneyLeft=${peso(summary.moneyLeft ?? summary.totalWalletBalance)}`,
    `safeSpendable=${peso(summary.safeSpendableMoney)}`,
    `emergencyProtected=${peso(summary.emergencyProtectedAmount)}`,
    `expenseThisMonth=${peso(summary.totalExpenseThisMonth)}`,
    `incomeThisMonth=${peso(summary.totalIncomeThisMonth ?? income.totalIncomeThisMonth)}`,
    `netFlowThisMonth=${peso(summary.netFlowThisMonth)}`,
    `budgetRemaining=${summary.budgetRemaining === null || summary.budgetRemaining === undefined ? "missing" : peso(summary.budgetRemaining)}`,
    `topWallet=${summary.topWallet?.name || "missing"}`,
    `topExpenseCategory=${summary.topExpenseCategory?.category || "missing"}`,
  ].join("\n");
}

function cardsText(context) {
  const snapshot = context.dashboardCardsLiveSnapshot || {};
  const cards = safeArray(snapshot.cards);
  if (!cards.length) return "No dashboard card snapshot loaded.";
  return cards.map((card, index) => `${index + 1}. ${card.label || card.key}: status=${card.status || "missing"}, locked=${card.locked ? "yes" : "no"}, value=${card.primaryValue || "missing"}, count=${card.recordCount || 0}, attention=${card.attentionLevel || "none"}, source=${card.source || "missing"}`).join("\n");
}

function blindSpots(context, blocks) {
  const spots = [];
  if (!safeArray(context.wallets).length) spots.push("wallets missing");
  if (!safeArray(context.expenses).length) spots.push("expenses missing");
  if (!safeArray(context.budgets).length) spots.push("budgets missing");
  if (!safeArray(context.incomes).length && !safeArray(context.incomeSources).length) spots.push("income records and income sources missing");
  if (!context.emergencyFund) spots.push("emergency fund missing");
  if (!safeArray(context.savingsGoals).length) spots.push("savings goals missing");
  if (!safeArray(context.debtObligations).length) spots.push("debt obligations empty");
  if (context.dashboardSummarySnapshot?.budgetRemaining === null || context.dashboardSummarySnapshot?.budgetRemaining === undefined) spots.push("dashboardSummarySnapshot.budgetRemaining missing");
  blocks.forEach((block) => { if (block.readable === 0) spots.push(`${block.title} empty`); });
  return spots.length ? spots.map((spot, index) => `${index + 1}. ${spot}`).join("\n") : "No major missing area detected.";
}

export function detectClaraMasterDiagnosisIntent(message = "") {
  return /^(diagnose clara|master diagnosis|diagnose ai|diagnose clara ai|clara diagnosis|ai diagnosis|diagnose all|diagnose everything)$/i.test(String(message || "").trim());
}

export function buildClaraMasterDiagnosisDirectReply(message = "", context = {}) {
  if (!detectClaraMasterDiagnosisIntent(message)) return "";
  const memory = readMemory();
  const items = memory.items || {};
  const blocks = [
    memoryBlock("LIFE STAGE / IDENTITY DATA", LIFE_KEYS, items),
    memoryBlock("EMOTIONAL / BEHAVIOR DATA", EMOTION_KEYS, items),
    memoryBlock("SCHEDULE / ROUTINE DATA", SCHEDULE_KEYS, items),
    memoryBlock("FINANCIAL PROFILE / STAGE DATA", MONEY_PROFILE_KEYS, items),
  ];
  const attention = safeArray(context.dashboardCardsLiveSnapshot?.cardsNeedingAttention).map((card) => card.label).join(", ") || "none";
  return `CLARA MASTER AI DIAGNOSIS\n\nThis shows what CLARA can read locally before Gemini.\n\nCONNECTION\nassistantContext=${context && typeof context === "object" ? "YES" : "NO"}\nbehavioralMemory=${Object.keys(items).length ? "READABLE" : "EMPTY_OR_MISSING"}\nbehavioralMemoryUpdatedAt=${memory.updatedAt}\n\nRAW FINANCE DATA COUNTS\n${counts(context)}\n\nAI SNAPSHOT HEALTH\n${snapshotHealth(context)}\n\nKEY MONEY VALUES\n${moneyValues(context)}\n\nDASHBOARD CARDS\nattentionCards=${attention}\n${cardsText(context)}\n\n${blocks.map((block) => block.text).join("\n\n")}\n\nBLIND SPOTS / MISSING READABILITY\n${blindSpots(context, blocks)}\n\nTest commands: diagnose cards, explain my cards, check my Wallet Hub, what does Budget Hub say, how much money do I have left?`;
}
