import { getRegisteredFinancialCards } from "@/components/financial-carousel/logic/FinancialCardRegistry";
import { normalizeCarouselBudgetPlan } from "@/components/financial-carousel/logic/financeCarouselDataHelpers";
import { summarizeDebtObligations, toDebtNumber } from "@/lib/debtObligationStore";

const CARD_ORDER = ["investmentFund", "wallet", "budget", "emergencyFund", "savingsGoals", "debtObligations"];
const CARD_LABELS = {
  investmentFund: "Income Hub",
  wallet: "Wallet Hub",
  budget: "Budget Hub",
  emergencyFund: "Emergency Fund",
  savingsGoals: "Savings Goals",
  debtObligations: "Debt / Obligations",
};

const safeArray = (value) => (Array.isArray(value) ? value : []);
const cleanNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const number = Number(String(value ?? "0").replace(/php/gi, "").replace(/[₱,\s]/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
};
const peso = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(cleanNumber(value));
const normalizeText = (value) => String(value || "").trim().toLowerCase().replace(/[’']/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const firstNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const number = cleanNumber(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

function logDashboardCardsAiReader(message, payload) {
  if (!(import.meta?.env?.DEV || import.meta?.env?.VITE_CLARA_DEBUG_AI === "true")) return;
  if (payload !== undefined) console.info("[CLARA Dashboard Cards AI Reader]", message, payload);
  else console.info("[CLARA Dashboard Cards AI Reader]", message);
}

export { logDashboardCardsAiReader };

function getMonthKey(value = new Date()) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, "0")}`;
}

function getRecordDate(record = {}) {
  return record.date || record.transaction_date || record.transactionDate || record.spent_at || record.spentAt || record.created_at || record.createdAt || record.updated_at || record.updatedAt || new Date();
}

function isCurrentMonth(record = {}, now = new Date()) {
  return getMonthKey(getRecordDate(record)) === getMonthKey(now);
}

function getWalletBalance(wallet = {}) {
  return firstNumber(wallet.derived_balance, wallet.balance, wallet.current_balance, wallet.wallet_balance, wallet.available_balance, wallet.starting_balance, wallet.amount) ?? 0;
}

function getWalletName(wallet = {}) {
  return String(wallet.name || wallet.wallet_name || wallet.title || wallet.label || "Wallet").trim() || "Wallet";
}

function getExpenseAmount(expense = {}) {
  return cleanNumber(expense.amount ?? expense.total ?? expense.value ?? expense.price ?? expense.expense_amount ?? expense.spent_amount);
}

function getExpensePlanningStatus(expense = {}) {
  const status = normalizeText(expense.planning_status || expense.budget_status || expense.plan_status || expense.budgetStatus || expense.status || "");
  if (status) return status;
  const category = normalizeText(expense.budget_category || expense.expense_category || expense.category || expense.budgetCategory || "");
  if (category.includes("unplanned")) return "unplanned";
  if (category.includes("undocumented")) return "undocumented";
  return "planned";
}

function getBudgetAmount(budget = {}) {
  return cleanNumber(budget.allocated ?? budget.amount ?? budget.budget_amount ?? budget.monthly_amount ?? budget.limit ?? budget.target ?? budget.value ?? budget.declared_budget ?? budget.declaredAmount);
}

function getSavingsSaved(goal = {}) {
  return cleanNumber(goal.saved ?? goal.current ?? goal.currentAmount ?? goal.current_amount ?? goal.saved_amount ?? goal.balance ?? goal.amount);
}

function getSavingsTarget(goal = {}) {
  return cleanNumber(goal.target ?? goal.targetAmount ?? goal.target_amount ?? goal.goal_amount ?? goal.goalAmount ?? goal.required_amount);
}

function getEmergencySaved(fund = {}) {
  return firstNumber(fund.saved, fund.current, fund.currentAmount, fund.current_amount, fund.amount, fund.saved_amount, fund.balance, fund.protectedAmount, fund.protected_amount, fund.reserveAmount, fund.reserve_amount) ?? 0;
}

function getEmergencyTarget(fund = {}) {
  return firstNumber(fund.target, fund.targetAmount, fund.target_amount, fund.goal, fund.goalAmount, fund.goal_amount, fund.monthly_survival_expense, fund.survivalExpense, fund.survival_expense) ?? 0;
}

function getCardRegistry(context = {}) {
  const plan = context.plan || context.user?.plan || context.user?.subscription_label || context.profileData?.plan || context.profileData?.subscription_label || "free";
  const registered = getRegisteredFinancialCards({ plan, profileData: context.profileData, featureFlags: context.featureFlags || context.profileData?.feature_flags, includeLocked: true });
  const byKey = new Map(registered.map((card) => [card.key, card]));
  return CARD_ORDER.map((key) => {
    const card = byKey.get(key) || {};
    return { key, label: card.label || CARD_LABELS[key], type: card.type || key, locked: Boolean(card.locked), minimumPlan: card.minimumPlan || "free", lockedTier: card.lockedTier || "" };
  });
}

function lockedCard(baseCard) {
  if (!baseCard.locked) return null;
  return { ...baseCard, status: "locked", primaryValue: "Locked", secondaryValue: baseCard.lockedTier ? `${baseCard.lockedTier} access required` : "Plan upgrade required", recordCount: 0, attentionLevel: "locked", reason: `${baseCard.label} is locked for the current plan.`, source: "financial_card_registry" };
}

function buildIncomeCard(baseCard, context) {
  const locked = lockedCard(baseCard);
  if (locked) return locked;
  const snapshot = context.incomeHubSnapshot || {};
  const sourceCount = safeArray(snapshot.sourceRoots).length || safeArray(snapshot.incomeSources).length || safeArray(snapshot.incomeBySource).length;
  const totalRecords = cleanNumber(snapshot.totalIncomeRecords ?? safeArray(context.incomes).length);
  const totalThisMonth = cleanNumber(snapshot.totalIncomeThisMonth);
  const topSource = snapshot.summary?.topIncomeSource || snapshot.incomeBySource?.[0]?.name || snapshot.latestIncome?.incomeSourceName || "No income source yet";
  if (!totalRecords && !sourceCount) return { ...baseCard, status: "empty", primaryValue: peso(0), secondaryValue: "No income source yet", recordCount: 0, attentionLevel: "medium", reason: "Income Hub has no readable income records yet.", source: "incomeHubSnapshot+incomes" };
  return { ...baseCard, status: totalThisMonth > 0 ? "active" : "ready", primaryValue: peso(totalThisMonth), secondaryValue: `${sourceCount} source${sourceCount === 1 ? "" : "s"}; top source: ${topSource}`, recordCount: totalRecords || sourceCount, attentionLevel: totalThisMonth > 0 ? "none" : "low", reason: totalThisMonth > 0 ? "Income Hub has readable income this month." : "Income Hub has sources, but no recorded income total for this month yet.", source: "incomeHubSnapshot+incomeSources+incomes+walletTransactions" };
}

function buildWalletCard(baseCard, context) {
  const locked = lockedCard(baseCard);
  if (locked) return locked;
  const wallets = safeArray(context.wallets);
  const readableWallets = wallets.map((wallet) => ({ name: getWalletName(wallet), balance: getWalletBalance(wallet) }));
  const totalWalletBalance = firstNumber(context.dashboardSummarySnapshot?.totalWalletBalance, context.dashboardSummarySnapshot?.moneyLeft) ?? readableWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const topWallet = context.dashboardSummarySnapshot?.topWallet || readableWallets.slice().sort((a, b) => b.balance - a.balance)[0] || null;
  if (!wallets.length) return { ...baseCard, status: "empty", primaryValue: peso(0), secondaryValue: "No wallet created yet", recordCount: 0, attentionLevel: "high", reason: "Wallet Hub has no wallet records yet.", source: "wallets+dashboardSummarySnapshot" };
  return { ...baseCard, status: totalWalletBalance > 0 ? "active" : "needs_attention", primaryValue: peso(totalWalletBalance), secondaryValue: topWallet ? `${topWallet.name}: ${peso(topWallet.balance)}` : `${wallets.length} wallet${wallets.length === 1 ? "" : "s"}`, recordCount: wallets.length, attentionLevel: totalWalletBalance > 0 ? "none" : "high", reason: totalWalletBalance > 0 ? "Wallet Hub has readable wallet balances." : "Wallet Hub exists, but wallet balance is zero.", source: "wallets+dashboardSummarySnapshot" };
}

function buildBudgetCard(baseCard, context) {
  const locked = lockedCard(baseCard);
  if (locked) return locked;
  const budgets = safeArray(context.budgets);
  const expensesThisMonth = safeArray(context.expenses).filter((expense) => isCurrentMonth(expense, context.now || new Date()));
  const totalSpent = expensesThisMonth.reduce((sum, expense) => sum + getExpenseAmount(expense), 0);
  const totalBudgetFromRecords = budgets.reduce((sum, budget) => sum + getBudgetAmount(budget), 0);
  const plan = context.monthlyBudgetPlan || (budgets.length === 1 ? budgets[0] : { declared_budget: totalBudgetFromRecords, categories: budgets });
  const normalizedPlan = normalizeCarouselBudgetPlan(plan, totalSpent);
  const declaredBudget = firstNumber(normalizedPlan.declaredBudget, totalBudgetFromRecords, context.dashboardSummarySnapshot?.budgetDeclaredAmount) ?? 0;
  const spentAmount = Math.max(cleanNumber(normalizedPlan.totalSpent), totalSpent);
  const remaining = declaredBudget > 0 ? Math.max(declaredBudget - spentAmount, 0) : cleanNumber(context.dashboardSummarySnapshot?.budgetRemaining ?? normalizedPlan.remainingAmount);
  const unplannedCount = expensesThisMonth.filter((expense) => getExpensePlanningStatus(expense) === "unplanned").length + safeArray(normalizedPlan.outsidePlanItems).length;
  if (!budgets.length && declaredBudget <= 0) return { ...baseCard, status: "empty", primaryValue: peso(0), secondaryValue: "No budget set yet", recordCount: 0, attentionLevel: "high", reason: "Budget Hub has no active budget records yet.", source: "budgets+expenses+dashboardSummarySnapshot" };
  const overBudget = declaredBudget > 0 && spentAmount > declaredBudget;
  const lowRemaining = declaredBudget > 0 && remaining <= declaredBudget * 0.15;
  const attentionLevel = overBudget ? "high" : unplannedCount > 0 || lowRemaining ? "medium" : "none";
  return { ...baseCard, status: overBudget ? "over_budget" : unplannedCount > 0 || lowRemaining ? "needs_attention" : "active", primaryValue: `${peso(remaining)} left`, secondaryValue: `${peso(spentAmount)} spent of ${peso(declaredBudget)}`, recordCount: budgets.length, attentionLevel, reason: overBudget ? `Budget Hub is over by ${peso(spentAmount - declaredBudget)}.` : unplannedCount > 0 ? `Budget Hub has ${unplannedCount} unplanned or outside-plan expense record${unplannedCount === 1 ? "" : "s"}.` : lowRemaining ? "Budget Hub has low remaining budget room." : "Budget Hub has readable budget room.", source: "budgets+expenses+monthlyBudgetPlan+dashboardSummarySnapshot" };
}

function buildEmergencyFundCard(baseCard, context) {
  const locked = lockedCard(baseCard);
  if (locked) return locked;
  const fund = context.emergencyFund && typeof context.emergencyFund === "object" ? context.emergencyFund : {};
  const saved = getEmergencySaved(fund);
  const target = getEmergencyTarget(fund);
  const protectedAmount = cleanNumber(context.dashboardSummarySnapshot?.emergencyProtectedAmount ?? saved);
  const hasFundData = Boolean(Object.keys(fund).length || saved > 0 || target > 0 || protectedAmount > 0);
  if (!hasFundData) return { ...baseCard, status: "empty", primaryValue: peso(0), secondaryValue: "No emergency fund data yet", recordCount: 0, attentionLevel: "medium", reason: "Emergency Fund has no readable saved amount or target yet.", source: "emergencyFund+dashboardSummarySnapshot" };
  const progress = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  return { ...baseCard, status: saved > 0 ? "active" : "needs_attention", primaryValue: peso(saved || protectedAmount), secondaryValue: target > 0 ? `${Math.round(progress)}% of ${peso(target)}` : "No target shown", recordCount: 1, attentionLevel: saved <= 0 ? "high" : progress > 0 && progress < 25 ? "medium" : "none", reason: saved > 0 ? "Emergency Fund has recorded protected money." : "Emergency Fund exists, but saved amount is zero.", source: "emergencyFund+dashboardSummarySnapshot" };
}

function buildSavingsGoalsCard(baseCard, context) {
  const locked = lockedCard(baseCard);
  if (locked) return locked;
  const goals = safeArray(context.savingsGoals);
  const totalSaved = goals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0);
  if (!goals.length) return { ...baseCard, status: "empty", primaryValue: peso(0), secondaryValue: "No savings goal yet", recordCount: 0, attentionLevel: "medium", reason: "Savings Goals has no goal records yet.", source: "savingsGoals" };
  const progress = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
  return { ...baseCard, status: totalSaved > 0 ? "active" : "needs_attention", primaryValue: `${peso(totalSaved)} saved`, secondaryValue: totalTarget > 0 ? `${Math.round(progress)}% of ${peso(totalTarget)}` : `${goals.length} goal${goals.length === 1 ? "" : "s"}; no target shown`, recordCount: goals.length, attentionLevel: totalSaved <= 0 ? "medium" : progress < 25 ? "low" : "none", reason: totalSaved > 0 ? "Savings Goals has saved progress." : "Savings Goals exists, but no saved amount is recorded yet.", source: "savingsGoals" };
}

function buildDebtCard(baseCard, context) {
  const locked = lockedCard(baseCard);
  if (locked) return locked;
  const debtObligations = safeArray(context.debtObligations);
  const income = cleanNumber(context.incomeHubSnapshot?.totalIncomeThisMonth ?? context.dashboardSummarySnapshot?.totalIncomeThisMonth ?? context.totalIncome);
  const summary = context.debtSummary || summarizeDebtObligations(debtObligations, { income });
  const totalDebt = toDebtNumber(summary.totalDebt);
  const monthlyDebt = toDebtNumber(summary.monthlyDebt);
  const debtRatio = toDebtNumber(summary.debtRatio);
  const activeCount = cleanNumber(summary.activeCount ?? debtObligations.length);
  if (!activeCount && totalDebt <= 0 && monthlyDebt <= 0) return { ...baseCard, status: "empty", primaryValue: peso(0), secondaryValue: "No active debt recorded", recordCount: 0, attentionLevel: "none", reason: "Debt / Obligations has no active debt records in local data.", source: "debtObligations+debtObligationStore" };
  const attentionLevel = debtRatio > 40 ? "high" : debtRatio >= 20 ? "medium" : "low";
  return { ...baseCard, status: debtRatio > 40 ? "needs_attention" : "active", primaryValue: peso(totalDebt), secondaryValue: `${peso(monthlyDebt)} monthly; ${Math.round(debtRatio)}% of income`, recordCount: activeCount, attentionLevel, reason: debtRatio > 40 ? "Debt / Obligations shows high monthly payment pressure." : `Debt / Obligations has ${activeCount} active obligation record${activeCount === 1 ? "" : "s"}.`, source: "debtObligations+debtObligationStore+incomeHubSnapshot" };
}

const CARD_BUILDERS = { investmentFund: buildIncomeCard, wallet: buildWalletCard, budget: buildBudgetCard, emergencyFund: buildEmergencyFundCard, savingsGoals: buildSavingsGoalsCard, debtObligations: buildDebtCard };

function rankCardAttention(card) {
  return { high: 4, medium: 3, low: 2, missing: 1, locked: 0, none: 0 }[card?.attentionLevel] ?? 0;
}

function cardHealthScore(card) {
  if (card.locked || card.attentionLevel === "locked") return -1;
  if (card.status === "empty" || card.status === "missing_data") return 15;
  if (card.attentionLevel === "high") return 35;
  if (card.attentionLevel === "medium") return 55;
  if (card.attentionLevel === "low") return 75;
  return 95;
}

export function buildDashboardCardsAiSnapshot(context = {}) {
  const cards = getCardRegistry(context).map((baseCard) => (CARD_BUILDERS[baseCard.key] ? CARD_BUILDERS[baseCard.key](baseCard, context) : { ...baseCard, status: "missing_data", primaryValue: "Not readable", secondaryValue: "No reader registered", recordCount: 0, attentionLevel: "missing", reason: `${baseCard.label} does not have a registered AI reader yet.`, source: "dashboard_cards_ai_reader" }));
  const unlockedCards = cards.filter((card) => !card.locked);
  const strongestCard = unlockedCards.filter((card) => card.status !== "empty" && card.status !== "missing_data").sort((a, b) => cardHealthScore(b) - cardHealthScore(a))[0] || null;
  const weakestCard = unlockedCards.slice().sort((a, b) => rankCardAttention(b) - rankCardAttention(a) || cardHealthScore(a) - cardHealthScore(b))[0] || null;
  const cardsNeedingAttention = unlockedCards.filter((card) => ["high", "medium", "missing"].includes(card.attentionLevel));
  const snapshot = { connected: true, totalCards: cards.length, cards, strongestCard, weakestCard, cardsNeedingAttention, generatedAt: new Date().toISOString() };
  logDashboardCardsAiReader("Snapshot ready", { totalCards: snapshot.totalCards, strongestCard: strongestCard?.label || null, weakestCard: weakestCard?.label || null, cardsNeedingAttention: cardsNeedingAttention.map((card) => card.label), generatedAt: snapshot.generatedAt });
  return snapshot;
}

function isDiagnosticCommand(message = "") {
  return /^(diagnose cards|diagnose dashboard cards|test cards|test dashboard cards|show card snapshot|show cards snapshot|cards snapshot)$/i.test(String(message || "").trim());
}

export function detectDashboardCardsIntent(message = "") {
  const text = normalizeText(message);
  if (!text) return null;
  if (isDiagnosticCommand(message)) return { type: "diagnostic" };
  const cardText = /(dashboard cards|cards carousel|carousel|my cards|cards are active|card needs attention|strongest card|weakest card)/.test(text);
  const explainCards = /(explain|check|show|what).*(cards|carousel)|what cards are active|cards are active/.test(text);
  const asksAttention = /(which|what).*(card|hub).*(needs attention|need attention|attention)|needs attention.*card/.test(text);
  const asksStrongest = /strongest card|best card|healthiest card/.test(text);
  const asksWeakest = /weakest card|worst card|riskiest card|most pressured card/.test(text);
  const specificMap = [
    { key: "investmentFund", pattern: /income hub|income card/ },
    { key: "wallet", pattern: /wallet hub|wallet card|wallets card/ },
    { key: "budget", pattern: /budget hub|budget card|budgets card/ },
    { key: "emergencyFund", pattern: /emergency fund|emergency card/ },
    { key: "savingsGoals", pattern: /savings goals|saving goals|savings card|saving card/ },
    { key: "debtObligations", pattern: /debt|obligation|obligations|debt card|debt hub/ },
  ];
  const specificCard = specificMap.find((item) => item.pattern.test(text));
  const asksSpecificCard = specificCard && /(what does|check|explain|read|show|say|status|health)/.test(text);
  if (asksStrongest) return { type: "strongest" };
  if (asksWeakest) return { type: "weakest" };
  if (asksAttention) return { type: "attention" };
  if (asksSpecificCard) return { type: "specific", key: specificCard.key };
  if (cardText || explainCards) return { type: "overview" };
  return null;
}

function getDashboardCardsSnapshot(context = {}) {
  return context.dashboardCardsLiveSnapshot || buildDashboardCardsAiSnapshot(context);
}

function humanStatus(card = {}) {
  if (card.locked || card.status === "locked") return "locked";
  if (card.status === "empty") return "empty";
  if (card.status === "missing_data") return "missing data";
  if (card.status === "needs_attention") return "needs attention";
  if (card.status === "over_budget") return "over budget";
  return card.status || "ready";
}

function cardLine(card = {}, index = 0) {
  const count = Number(card.recordCount || 0);
  return `${index + 1}. ${card.label} — ${humanStatus(card)} — ${card.primaryValue || "No value"}${card.secondaryValue ? ` (${card.secondaryValue})` : ""}. ${count === 1 ? "1 record" : `${count} records`}. ${card.reason}`;
}

function overviewReply(snapshot = {}) {
  const cards = safeArray(snapshot.cards);
  const lockedCards = cards.filter((card) => card.locked).map((card) => card.label);
  const attentionCards = safeArray(snapshot.cardsNeedingAttention).map((card) => card.label);
  return `I checked your Dashboard Cards Carousel. Here is the live card snapshot:\n\n${cards.map(cardLine).join("\n")}\n\nNeeds attention: ${attentionCards.join(", ") || "none"}.${lockedCards.length ? `\n\nLocked cards: ${lockedCards.join(", ")}.` : ""}`;
}

function specificCardReply(snapshot = {}, key = "") {
  const card = safeArray(snapshot.cards).find((item) => item.key === key || item.type === key);
  if (!card) return "I checked your Dashboard Cards Carousel, but I can’t find that card in the active carousel snapshot.";
  return `I checked your ${card.label} card. Status: ${humanStatus(card)}.\n\nMain value: ${card.primaryValue || "No value shown"}.\n${card.secondaryValue ? `Detail: ${card.secondaryValue}.\n` : ""}Records read: ${card.recordCount || 0}.\n\n${card.reason}`;
}

function attentionReply(snapshot = {}) {
  const cards = safeArray(snapshot.cardsNeedingAttention);
  if (!cards.length) return "I checked your Dashboard Cards Carousel. No unlocked card is currently flagged as high or medium attention.";
  return `I checked your Dashboard Cards Carousel. These cards need attention based on live local data:\n\n${cards.map(cardLine).join("\n")}`;
}

function strongestReply(snapshot = {}) {
  const card = snapshot.strongestCard;
  if (!card) return "I checked your Dashboard Cards Carousel, but I don’t see enough unlocked, non-empty card data to name a strongest card yet.";
  return `I checked your Dashboard Cards Carousel. Your strongest card is ${card.label}.\n\nIt shows ${card.primaryValue || "a readable value"}${card.secondaryValue ? ` (${card.secondaryValue})` : ""}. ${card.reason}`;
}

function weakestReply(snapshot = {}) {
  const card = snapshot.weakestCard;
  if (!card) return "I checked your Dashboard Cards Carousel, but I don’t see enough unlocked card data to name a weakest card yet.";
  return `I checked your Dashboard Cards Carousel. Your weakest card right now is ${card.label}.\n\nStatus: ${humanStatus(card)}. ${card.reason}`;
}

function diagnosticReply(snapshot = {}, context = {}) {
  const inputCounts = `wallets=${safeArray(context.wallets).length}, incomes=${safeArray(context.incomes).length}, expenses=${safeArray(context.expenses).length}, walletTransactions=${safeArray(context.walletTransactions).length}, transfers=${safeArray(context.transfers).length}, budgets=${safeArray(context.budgets).length}, savingsGoals=${safeArray(context.savingsGoals).length}, debtObligations=${safeArray(context.debtObligations).length}, emergencyFund=${context.emergencyFund ? "present" : "missing"}`;
  const cards = safeArray(snapshot.cards).map((card, index) => `${index + 1}. ${card.label}\nkey=${card.key}\nlocked=${card.locked ? "yes" : "no"}\nstatus=${card.status}\nprimaryValue=${card.primaryValue}\nsecondaryValue=${card.secondaryValue}\nrecordCount=${card.recordCount}\nattentionLevel=${card.attentionLevel}\nsource=${card.source}\nreason=${card.reason}`).join("\n\n---\n\n");
  return `CARD SNAPSHOT DIAGNOSIS\n\nconnected=${snapshot.connected}\ntotalCards=${snapshot.totalCards}\nstrongestCard=${snapshot.strongestCard?.label || "none"}\nweakestCard=${snapshot.weakestCard?.label || "none"}\ncardsNeedingAttention=${safeArray(snapshot.cardsNeedingAttention).map((card) => card.label).join(", ") || "none"}\ngeneratedAt=${snapshot.generatedAt}\n\nRAW INPUT COUNTS\n${inputCounts}\n\n${cards}\n\nCommand: diagnose cards`;
}

export function buildDashboardCardsDirectReply(message = "", context = {}) {
  const intent = detectDashboardCardsIntent(message);
  if (!intent) return "";
  const snapshot = getDashboardCardsSnapshot(context);
  logDashboardCardsAiReader(`Query detected: ${intent.type}`, { key: intent.key || null, totalCards: snapshot.totalCards || 0 });
  if (!snapshot?.connected) return "Dashboard Cards Carousel data is not connected yet, so I can’t honestly say I checked real card records.";
  if (intent.type === "diagnostic") return diagnosticReply(snapshot, context);
  if (intent.type === "specific") return specificCardReply(snapshot, intent.key);
  if (intent.type === "attention") return attentionReply(snapshot);
  if (intent.type === "strongest") return strongestReply(snapshot);
  if (intent.type === "weakest") return weakestReply(snapshot);
  return overviewReply(snapshot);
}
