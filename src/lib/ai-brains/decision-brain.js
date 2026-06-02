import { buildClaraFinanceSnapshot } from "../clara-local-brain";
import { buildScheduleDirectReply, buildSchedulePromptBlock, getScheduleContextForAI } from "../clara-schedule-ai-context";
import { buildClaraBrainSubContextPromptBlock } from "./sub-context-selector";
import { CLARA_BRAINS } from "./brain-router";

const MISSING_PURCHASE_QUESTION = "What are you planning to buy, and how much is it?";
const MISSING_DATA_REPLY = "I need your wallet or budget data before I can judge this clearly.";
const DANGLING_DECISION_ENDINGS = ["is", "are", "was", "were", "and", "but", "because", "so", "with", "for", "to", "of", "your", "the", "a", "an", "this", "that", "purchase"];

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

function getConversationMessageText(message = {}) {
  return cleanText(message?.text || message?.content || message?.message || "");
}

function isAcknowledgmentFollowUp(message = "") {
  const text = normalizeText(message).replace(/[.?!]+$/g, "").trim();

  return /^(oh i see|i see|ok|okay|got it|hmm|makes sense|noted|understood|right|alright|ah ok|ah okay|sige|yes i see)$/.test(text);
}

function hasEmergencyIntent(message = "") {
  return /\b(emergency fund|emergency money|protected money|reserve|buffer)\b/i.test(message || "");
}

function hasRealEmergencySignal(message = "") {
  return /\b(hospital|medical|medicine|medication|doctor|accident|urgent|emergency|rent|eviction|electricity|water bill|food|groceries|basic need|essential|survival)\b/i.test(message || "");
}

function hasSpendingDecisionIntent(message = "") {
  const text = normalizeText(message);
  return /\b(before i buy|before buying|before i spend|before spending|can i buy|can i spend|should i buy|should i spend|can i still buy|can i still spend|afford|worth it|delay|purchase|buy|spend|order)\b/.test(text) || extractPurchaseAmount(message) !== null;
}

function hasScheduleConcernIntent(message = "") {
  const text = normalizeText(message);
  return /\b(schedule|appointment|calendar|upcoming|coming up|dentist|doctor|meeting|shift|class|event|reminder|prepare money|prepare for|anything coming up)\b/.test(text);
}

function getLastDecisionLikeUserMessage(recentConversation = []) {
  const messages = Array.isArray(recentConversation) ? recentConversation : [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;

    const text = getConversationMessageText(message);
    if (!text || isAcknowledgmentFollowUp(text)) continue;

    if (
      hasSpendingDecisionIntent(text) ||
      hasScheduleConcernIntent(text) ||
      extractPurchaseAmount(text) !== null
    ) {
      return text;
    }
  }

  return "";
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

  if (
    numbers.availableSpendableMoney !== null &&
    amount > numbers.availableSpendableMoney &&
    numbers.visibleWalletMoney !== null &&
    amount <= numbers.visibleWalletMoney &&
    numbers.emergencyProtectedMoney > 0
  ) {
    return { level: "NO", reason: "touches_protected", numbers };
  }

  if (numbers.availableSpendableMoney !== null && amount > numbers.availableSpendableMoney) {
    return { level: "NO", reason: "not_enough_spendable", numbers };
  }

  if (numbers.remainingBudget !== null && amount > numbers.remainingBudget) {
    return { level: "DELAY", reason: "budget_pressure", numbers };
  }

  if (numbers.remainingBudget !== null && amount > numbers.remainingBudget * 0.5) {
    return { level: "CAUTION", reason: "large_vs_budget", numbers };
  }

  return { level: "SAFE", numbers };
}

function buildScheduleDecisionLine(context = {}) {
  const schedule = getScheduleContextForAI(context || {});
  const item = schedule.nextMoneyItem || schedule.nextItem;

  if (!item) return "I don’t see any upcoming schedule item loaded that would affect this decision.";
  if (item.amountText) return `You also have ${item.title} on ${item.dateLabel} with an estimated money impact of ${item.amountText}.`;
  if (item.hasMoneyImpact) return `You also have ${item.title} on ${item.dateLabel}, and it may have a cost even though no exact amount is saved yet.`;

  return `You also have ${item.title} on ${item.dateLabel}, so consider that before spending.`;
}

function buildScheduleAwareDecisionReply({ amount, decision, numbers, context }) {
  const scheduleLine = buildScheduleDecisionLine(context);
  const amountText = amount !== null ? money(amount) : "that amount";

  if (decision.reason === "budget_pressure" || decision.reason === "large_vs_budget") {
    return `I’d delay the ${amountText} purchase for now. ${scheduleLine} Protect that upcoming commitment first, then check if the purchase still fits your remaining budget of ${money(numbers.remainingBudget)}.`;
  }

  if (decision.reason === "not_enough_spendable" || decision.reason === "touches_protected" || decision.reason === "protected_emergency") {
    return `I would not buy it right now. ${scheduleLine} Keep your protected and upcoming money safe before spending ${amountText}.`;
  }

  return `This may be possible, but do not decide from wallet balance alone. ${scheduleLine} Reserve that first, then only buy the ${amountText} item if it still fits your budget.`;
}

function buildAcknowledgmentDecisionReply({ context = {}, previousMessage = "" } = {}) {
  const scheduleLine = buildScheduleDecisionLine(context);
  const amount = extractPurchaseAmount(previousMessage);
  const purchaseText = amount !== null ? `the ${money(amount)} purchase` : "the purchase";

  return `Exactly. ${scheduleLine} Protect that first, then check if ${purchaseText} still fits your remaining budget.`;
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

function lastWord(text = "") {
  const words = cleanText(text).toLowerCase().match(/[a-z]+(?:'[a-z]+)?|₱?\d[\d,]*/g) || [];
  return words[words.length - 1] || "";
}

function hasSentenceEnding(text = "") {
  return /[.!?)]$/.test(cleanText(text));
}

function isBadDecisionReply(text = "") {
  const cleaned = cleanText(text);
  const lowered = cleaned.toLowerCase();

  if (!cleaned) return true;
  if (/[,:;\-–—]$/.test(cleaned)) return true;
  if (!hasSentenceEnding(cleaned) && cleaned.length < 180) return true;
  if (DANGLING_DECISION_ENDINGS.includes(lastWord(cleaned))) return true;
  if (/\b(comfortably buy|definitely buy|go ahead and buy|yes, you can comfortably)\b/i.test(cleaned)) return true;
  if (/^okay,?\s+so\s+you\s+have\b/i.test(cleaned)) return true;
  if (/\byour\s+₱?\d[\d,]*\s+purchase\s+is\s*$/i.test(cleaned)) return true;
  if (lowered.includes("you have") && lowered.includes("appointment") && !lowered.includes("protect") && !lowered.includes("budget")) return true;
  if (lowered.includes("comfortable") && lowered.includes("buy") && !lowered.includes("budget") && !lowered.includes("schedule") && !lowered.includes("appointment")) return true;

  return false;
}

export function buildDecisionBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const isAckFollowUp = isAcknowledgmentFollowUp(userMessage);
  const previousDecisionMessage = isAckFollowUp ? getLastDecisionLikeUserMessage(recentConversation) : "";
  const effectiveMessage = previousDecisionMessage || userMessage;

  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const amount = extractPurchaseAmount(effectiveMessage);
  const decision = classifyLocalDecision({ amount, finance, userMessage: effectiveMessage });
  const numbers = decision.numbers || getDecisionNumbers(finance);
  const scheduleBlock = buildSchedulePromptBlock(effectiveMessage, context || {});
  const subContextBlock = buildClaraBrainSubContextPromptBlock({
    brain: CLARA_BRAINS.DECISION,
    message: effectiveMessage,
    context,
  });

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

${isAckFollowUp ? `FOLLOW-UP STATUS:
The latest user message is only a short acknowledgment, not a new question.
Continue the previous decision concern: ${cleanText(previousDecisionMessage) || "not found"}
Do not restart.
Do not simply summarize the last fact.
Give the next best action.

` : ""}RECENT CHATBOX CONVERSATION:
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
2. Purchase amount detected from user message or previous decision concern
3. Available spendable wallet money
4. Remaining spendable budget
5. Emergency fund protected amount
6. Schedule commitments and upcoming money-impact appointments
7. Savings goal progress
8. Recent spending pattern
9. Recent conversation

IMPORTANT ACKNOWLEDGMENT FOLLOW-UP RULE:
- If the latest user message is a short acknowledgment like "oh I see", "ok", "got it", "hmm", or "makes sense", continue the active decision flow.
- Do not answer as if it is a new question.
- Do not simply repeat the last fact.
- Confirm the realization briefly, then give the next best action.

IMPORTANT DECISION + SCHEDULE RULE:
- If the user asks about buying, spending, affordability, delaying, or deciding AND also asks about schedule, appointments, upcoming plans, or money-impact events, this is still a Decision Brain request.
- In that case, schedule is only supporting context. Do not answer with schedule information only.
- Give a spending recommendation first, then use the schedule item as the reason or risk.

IMPORTANT RULES:
- Use the selected sub-contexts first when choosing what to mention.
- If the user asks about schedule, appointment, calendar, upcoming plans, or commitments without a spending decision, answer from the Schedule section.
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

export function generateLocalDecisionReply({
  userMessage = "",
  context = {},
  conversationHistory = [],
} = {}) {
  if (isAcknowledgmentFollowUp(userMessage)) {
    const previousMessage = getLastDecisionLikeUserMessage(conversationHistory);

    return buildAcknowledgmentDecisionReply({
      context,
      previousMessage,
    });
  }

  const finance = buildClaraFinanceSnapshot(context || {});
  const amount = extractPurchaseAmount(userMessage);
  const decision = classifyLocalDecision({ amount, finance, userMessage });
  const numbers = decision.numbers || getDecisionNumbers(finance);
  const isDecisionWithSchedule = hasSpendingDecisionIntent(userMessage) && hasScheduleConcernIntent(userMessage);

  if (!isDecisionWithSchedule) {
    const scheduleReply = buildScheduleDirectReply(userMessage, context || {});
    if (scheduleReply) return scheduleReply;
  }

  if (isDecisionWithSchedule && amount !== null && finance.hasAnyData) {
    return buildScheduleAwareDecisionReply({ amount, decision, numbers, context });
  }

  if (decision.level === "ASK") return MISSING_PURCHASE_QUESTION;
  if (decision.level === "MISSING_DATA") return MISSING_DATA_REPLY;

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

  if (!cleaned) return "";
  if (isBadDecisionReply(cleaned)) return "";

  return limitWords(trimSentences(cleaned, 4), 90);
}
