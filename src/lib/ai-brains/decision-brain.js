import { buildClaraFinanceSnapshot } from "../clara-local-brain";
import { buildSchedulePromptBlock } from "../clara-schedule-ai-context";
import { buildClaraBrainSubContextPromptBlock } from "./sub-context-selector";
import { CLARA_BRAINS } from "./brain-router";

const MISSING_PURCHASE_QUESTION = "What are you planning to buy, and how much is it?";
const CLARIFICATION_REPLY = "I need one more detail before I can judge that safely. What item are you deciding about, and how much will it cost?";
const DANGLING_DECISION_ENDINGS = [
  "is",
  "are",
  "was",
  "were",
  "and",
  "but",
  "because",
  "so",
  "with",
  "for",
  "to",
  "of",
  "your",
  "the",
  "a",
  "an",
  "this",
  "that",
  "purchase",
];

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : [])
    .slice(0, 5)
    .map(formatter)
    .filter(Boolean)
    .join("; ") || empty;
}

function formatRecentConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-8)
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

function budgetName(budget = {}) {
  return String(budget?.name || budget?.category || budget?.title || budget?.label || "Budget").trim();
}

function buildBudgetRows(finance = {}) {
  const categories = Array.isArray(finance?.budgetPlan?.categories) ? finance.budgetPlan.categories : [];
  if (!categories.length) return "No budget categories loaded.";
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
  if (lowered.includes("comfortable") && lowered.includes("buy") && !lowered.includes("budget") && !lowered.includes("schedule") && !lowered.includes("appointment")) return true;

  return false;
}

export function buildDecisionBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const amount = extractPurchaseAmount(userMessage);
  const scheduleBlock = buildSchedulePromptBlock(userMessage, context || {});
  const subContextBlock = buildClaraBrainSubContextPromptBlock({
    brain: CLARA_BRAINS.DECISION,
    message: userMessage,
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

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

DECISION SNAPSHOT:
Purchase amount detected: ${amount !== null ? money(amount) : "missing"}
Wallet total / available money: ${money(finance.availableMoney ?? finance.totalWalletBalance)}
Remaining spendable budget: ${plan.hasDeclaredBudget ? money(plan.remainingSpendableBudget) : "not declared"}
Emergency fund protected amount: ${money(finance.protectedEmergencyAmount)}
Finance data status: ${finance.hasAnyData ? "ready" : "not enough data loaded"}

Wallets:
${buildWalletRows(finance)}

Budget:
Declared monthly budget: ${plan.hasDeclaredBudget ? money(plan.declaredBudget) : "none"}
Spent so far: ${money(plan.spentTotal)}
Remaining spendable budget: ${plan.hasDeclaredBudget ? money(plan.remainingSpendableBudget) : "not declared"}
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

DECISION RULES:
- Use the selected sub-contexts first when choosing what to mention.
- Do not use hardcoded or canned wording.
- If the user gave only an item without price, ask one question for the missing price.
- If the user gave only a price without item, use recent chat history to infer the item. If unclear, ask one clarification question.
- If budget, wallet, schedule, or emergency-fund data is missing, ask one clarification question instead of guessing.
- Emergency Fund is protected money. Do not treat it as free spending money.
- Answer with recommendation first, short reason second, safe next step third.
- Keep the answer calm, direct, protective, and short.
- Maximum 2-4 short sentences and around 90 words.

Example clarification only when needed:
${MISSING_PURCHASE_QUESTION}

Reply as CLARA:`;
}

export function generateLocalDecisionReply() {
  return CLARIFICATION_REPLY;
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

export function __claraDecisionBrainInternals() {
  return { toNumber, extractPurchaseAmount };
}
