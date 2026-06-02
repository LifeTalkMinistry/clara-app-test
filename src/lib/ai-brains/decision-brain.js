import { buildClaraFinanceSnapshot } from "../clara-local-brain";
import { buildScheduleDirectReply, buildSchedulePromptBlock } from "../clara-schedule-ai-context";
import { buildClaraBrainSubContextPromptBlock } from "./sub-context-selector";
import { CLARA_BRAINS } from "./brain-router";

const MISSING_PURCHASE_QUESTION = "What are you planning to buy, and how much is it?";
const MISSING_DATA_REPLY = "I need your wallet or budget data before I can judge this clearly.";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value = "") {
  return cleanText(value).toLowerCase();
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const number = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, "").trim());
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = toNumber(value);
  return number !== null && number > 0 ? number : 0;
}

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : [])
    .slice(0, 5)
    .map(formatter)
    .filter(Boolean)
    .join("; ") || empty;
}

function formatRecentConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-6)
    .map((message) => {
      const role = message?.role === "user" ? "User" : "CLARA";
      const text = cleanText(message?.text || message?.content || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n") || "No recent chatbox conversation yet.";
}

function extractPurchaseAmount(message = "") {
  const matches = [...String(message || "").replace(/,/g, "").matchAll(/(?:₱|php\s*|p\s*)?(\d+(?:\.\d{1,2})?)\s*(?:pesos?|php)?/gi)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isFinite(number) && number > 0);

  return matches.length ? Math.max(...matches) : null;
}

function hasEmergencyIntent(message = "") {
  return /\b(emergency fund|emergency money|protected money|reserve|buffer)\b/i.test(message || "");
}

function hasRealEmergencySignal(message = "") {
  return /\b(hospital|medical|medicine|medication|doctor|accident|urgent|emergency|rent|eviction|electricity|water bill|food|groceries|basic need|essential|survival)\b/i.test(message || "");
}

function budgetName(budget = {}) {
  return String(budget?.name || budget?.category || budget?.title || budget?.label || "Budget").trim();
}

function buildBudgetRows(finance = {}) {
  const categories = Array.isArray(finance?.budgetPlan?.categories) ? finance.budgetPlan.categories : [];
  if (!categories.length) return "No budget categories created yet.";
  return list(categories, (budget) => `${budgetName(budget)}: allocated ${money(budget.allocated)}, spent ${money(budget.spent)}, left ${money(budget.remaining)}`);
}

function buildWalletRows(finance = {}) {
  return list(finance.wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`);
}

function buildSavingsRows(finance = {}) {
  return list(finance.savingsGoals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`);
}

function buildRecentExpenseRows(finance = {}) {
  return list(finance.currentMonthExpenses || finance.expenses, (expense) => `${expense.category || "Expense"}: ${money(expense.amount)}`);
}

function getDecisionNumbers(finance = {}) {
  const visibleWalletMoney = toNumber(finance.availableMoney ?? finance.totalWalletBalance ?? finance.totalBalance);
  const emergencyProtectedMoney = positiveNumber(finance?.emergencyFund?.saved);
  const availableSpendableMoney = visibleWalletMoney !== null ? Math.max(visibleWalletMoney - emergencyProtectedMoney, 0) : null;
  const plan = finance.budgetPlan || {};
  const remainingBudget = plan.hasDeclaredBudget ? toNumber(plan.remainingSpendableBudget ?? finance.budgetRemaining ?? finance.remainingBudget) : null;

  return {
    visibleWalletMoney,
    emergencyProtectedMoney,
    availableSpendableMoney,
    remainingBudget,
  };
}

function classifyLocalDecision({ amount, finance, userMessage }) {
  const numbers = getDecisionNumbers(finance);
  const usingEmergency = hasEmergencyIntent(userMessage);
  const realEmergency = hasRealEmergencySignal(userMessage);

  if (amount === null) return { level: "ASK", numbers };
  if (!finance.hasAnyData) return { level: "MISSING_DATA", numbers };
  if (usingEmergency && !realEmergency) return { level: "NO", reason: "protected_emergency", numbers };
  if (numbers.availableSpendableMoney !== null && amount > numbers.availableSpendableMoney && numbers.visibleWalletMoney !== null && amount <= numbers.visibleWalletMoney && numbers.emergencyProtectedMoney > 0) {
    return { level: "NO", reason: "touches_protected", numbers };
  }
  if (numbers.availableSpendableMoney !== null && amount > numbers.availableSpendableMoney) return { level: "NO", reason: "not_enough_spendable", numbers };
  if (numbers.remainingBudget !== null && amount > numbers.remainingBudget) return { level: "DELAY", reason: "budget_pressure", numbers };
  if (numbers.remainingBudget !== null && amount > numbers.remainingBudget * 0.5) return { level: "CAUTION", reason: "large_vs_budget", numbers };
  return { level: "SAFE", numbers };
}

function trimSentences(text = "", maxSentences = 4) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return parts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
}

function limitWords(text = "", maxWords = 90) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleanText(text);
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;\-–—]+$/, "")}.`;
}

export function buildDecisionBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const amount = extractPurchaseAmount(userMessage);
  const decision = classifyLocalDecision({ amount, finance, userMessage });
  const numbers = decision.numbers || getDecisionNumbers(finance);
  const scheduleBlock = buildSchedulePromptBlock(userMessage, context || {});
  const subContextBlock = buildClaraBrainSubContextPromptBlock({ brain: CLARA_BRAINS.DECISION, message: userMessage, context });

  return `You are CLARA's Decision Brain.

BRAIN TYPE:
Decision Brain

CORE PRODUCT PROMISE:
Ask before you spend.

PURPOSE:
Help the user decide safely and quickly on purchase decisions, affordability checks, spending judgment, tradeoffs, and "should I?" questions.

${subContextBlock}

LATEST USER MESSAGE:
${cleanText(userMessage)}

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

DECISION SNAPSHOT:
Purchase amount detected: ${amount !== null ? money(amount) : "missing"}
Internal local decision level: ${decision.level || "unknown"}
Visible wallet money: ${money(numbers.visibleWalletMoney)}
Available spendable wallet money after protected emergency money: ${money(numbers.availableSpendableMoney)}
Remaining spendable budget: ${money(numbers.remainingBudget)}
Emergency fund protected amount: ${money(numbers.emergencyProtectedMoney)}
Finance data status: ${finance.hasAnyData ? "ready" : "not enough data loaded"}

Wallets:
${buildWalletRows(finance)}

Budget:
Declared monthly budget: ${money(plan.declaredBudget)}
Spent so far: ${money(plan.spentTotal)}
Remaining spendable budget: ${money(plan.remainingSpendableBudget)}
Budget status: ${plan.budgetStatus || "unknown"}
Budget rows: ${buildBudgetRows(finance)}

Schedule:
${scheduleBlock}

Savings goals:
${buildSavingsRows(finance)}

Recent spending pattern:
Monthly spent: ${money(finance.monthlySpent)}
Planned spent: ${money(finance.plannedSpent)}
Unplanned spent: ${money(finance.unplannedSpent)}
Recent expense rows: ${buildRecentExpenseRows(finance)}

DECISION LEVELS:
- SAFE: The purchase appears affordable and does not harm budget, emergency fund, or savings goals.
- CAUTION: Possible, but there is some budget pressure or risk.
- DELAY: Not urgent or may hurt goals/budget. Recommend waiting.
- NO: User clearly cannot afford it, or it would touch protected/emergency money without a real emergency reason.

CONTEXT PRIORITY:
1. Selected sub-contexts from CLARA SUB-CONTEXT SELECTION
2. Purchase amount detected from user message
3. Available spendable wallet money
4. Remaining spendable budget
5. Emergency fund protected amount
6. Schedule commitments and upcoming money-impact appointments
7. Savings goal progress
8. Recent spending pattern
9. Recent conversation

IMPORTANT RULES:
- Use the selected sub-contexts first when choosing what to mention.
- If the user asks about schedule, appointment, calendar, upcoming plans, or commitments, answer from the Schedule section.
- If Schedule section has an item such as a dentist appointment, mention it directly.
- If no schedule items are loaded, say that clearly.
- Emergency Fund is protected money. Do not treat it as free spending money.
- Do not overuse full life profile, saved memory, emotional context, or coaching language.
- If purchase amount is missing but the user is asking about schedule, do not ask for purchase amount.
- If purchase amount is missing for a purchase decision, ask only: "${MISSING_PURCHASE_QUESTION}"
- If wallet or budget data is missing, say: "${MISSING_DATA_REPLY}"
- Answer with recommendation first, short reason second, safe next step third.
- Do not make this a long life-coach reply.
- Keep the answer calm, direct, protective, and short.
- Maximum 2-4 short sentences and around 90 words.
- Do not show the internal decision label unless it sounds natural.

Reply as CLARA:`;
}

export function generateLocalDecisionReply({ userMessage = "", context = {} } = {}) {
  const scheduleReply = buildScheduleDirectReply(userMessage, context || {});
  if (scheduleReply) return scheduleReply;

  const finance = buildClaraFinanceSnapshot(context || {});
  const amount = extractPurchaseAmount(userMessage);
  const decision = classifyLocalDecision({ amount, finance, userMessage });

  if (decision.level === "ASK") return MISSING_PURCHASE_QUESTION;
  if (decision.level === "MISSING_DATA") return MISSING_DATA_REPLY;

  const numbers = decision.numbers || getDecisionNumbers(finance);

  if (decision.reason === "protected_emergency") {
    return "Only use protected emergency money if this is a real emergency. If this is normal spending, delay it and use your regular budget instead.";
  }

  if (decision.reason === "touches_protected") {
    return "Only use protected emergency money if this is a real emergency. If not, delay this purchase and keep your emergency fund untouched.";
  }

  if (decision.reason === "not_enough_spendable") {
    return `Not recommended right now. This costs ${money(amount)}, which is more than your available spendable money of ${money(numbers.availableSpendableMoney)}, so delay it and protect essentials first.`;
  }

  if (decision.reason === "budget_pressure") {
    return `Better to delay it. You may have wallet money, but this would pressure your remaining budget of ${money(numbers.remainingBudget)}.`;
  }

  if (decision.reason === "large_vs_budget") {
    return `Possible, but be careful. ${money(amount)} takes a big part of your remaining budget, so only continue if it is planned and necessary.`;
  }

  return "This looks possible, but keep it planned. Log it properly and make sure it does not reduce your protected money or savings goals.";
}

export function sanitizeDecisionBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();

  if (!cleaned) return "Pause first. I need the amount and your wallet or budget data before I can judge this safely.";

  return limitWords(trimSentences(cleaned, 4), 90);
}
