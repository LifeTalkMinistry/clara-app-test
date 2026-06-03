import { buildClaraFinanceSnapshot } from "../clara-local-brain";
import { buildClaraBrainSubContextPromptBlock } from "./sub-context-selector";
import { CLARA_BRAINS } from "./brain-router";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

function budgetMoney(value, plan = {}) {
  if (!plan?.hasDeclaredBudget) return "not available";
  return money(value);
}

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : [])
    .slice(0, 6)
    .map(formatter)
    .filter(Boolean)
    .join("; ") || empty;
}

function budgetName(budget = {}) {
  return String(budget?.name || budget?.category || budget?.title || budget?.label || "Budget").trim();
}

function formatFullConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const role = message?.role === "user" ? "User" : "CLARA";
      const text = cleanText(message?.text || message?.content || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n") || "No visible chatbox conversation history yet.";
}

function hasSentenceEnding(text = "") {
  return /[.!?)]$/.test(cleanText(text));
}

function looksCutOff(text = "") {
  const cleaned = cleanText(text);
  if (!cleaned) return true;
  if (/₱\s*\d[\d,]*(?:\.\d+)?$/.test(cleaned)) return true;
  if (/[,:;–—-]$/.test(cleaned)) return true;
  if (/\b(and|but|because|so|while|with|for|to|if|unless|before|after|about|around|based on|you have|your budget|still have)$/i.test(cleaned)) return true;
  return false;
}

function trimSentences(text = "", maxSentences = 4) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";

  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  const completeParts = parts.filter((part, index) => {
    const sentence = cleanText(part);
    if (!sentence) return false;
    if (hasSentenceEnding(sentence)) return true;
    return index === parts.length - 1 && parts.length === 1 && !looksCutOff(sentence);
  });

  const safeParts = completeParts.length ? completeParts : parts.slice(0, 1);
  let result = safeParts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();

  if (looksCutOff(result)) {
    const completedOnly = safeParts.filter((part) => hasSentenceEnding(part));
    result = completedOnly.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
  }

  return result;
}

function buildWalletRows(finance = {}) {
  return list(finance.wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`);
}

function buildBudgetRows(finance = {}) {
  const plan = finance.budgetPlan || {};
  const categories = Array.isArray(plan.categories) ? plan.categories : [];
  if (!plan.hasDeclaredBudget) {
    if (categories.length) return "Budget categories exist, but no declared monthly budget is active yet.";
    return "No active budget plan or budget categories created yet.";
  }
  if (!categories.length) return "No budget categories created yet.";
  return list(categories, (budget) => `${budgetName(budget)}: allocated ${money(budget.allocated)}, spent ${money(budget.spent)}, left ${money(budget.remaining)}`);
}

function buildSavingsRows(finance = {}) {
  return list(finance.savingsGoals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`);
}

function buildEmergencyRow(finance = {}) {
  const fund = finance.emergencyFund || {};
  const saved = Number(fund.saved);
  const target = Number(fund.target);
  if (Number.isFinite(saved) && Number.isFinite(target)) return `${money(saved)} saved out of ${money(target)} target.`;
  if (Number.isFinite(saved)) return `${money(saved)} protected.`;
  if (Number.isFinite(target)) return `Target is ${money(target)}.`;
  return "No emergency fund details loaded.";
}

function buildSpendingRows(finance = {}) {
  const top = finance.topSpendingCategory;
  const topText = top?.category ? `${top.category}: ${money(top.amount)}` : "No top category yet.";
  return `Monthly spent: ${money(finance.monthlySpent)}. Planned: ${money(finance.plannedSpent)}. Unplanned: ${money(finance.unplannedSpent)}. Top category: ${topText}`;
}

export function buildFinanceBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const subContextBlock = buildClaraBrainSubContextPromptBlock({ brain: CLARA_BRAINS.FINANCE, message: userMessage, context });

  return `You are CLARA's Finance Brain.

BRAIN TYPE:
Finance Brain

PURPOSE:
Answer questions about wallets, budgets, spending, expenses, categories, savings goals, emergency fund, income, transfers, and money card data.

${subContextBlock}

IMPORTANT CONTEXT RULES:
- Use the finance data below as the source of truth.
- Use the selected sub-contexts first when choosing which finance data to answer from.
- Use the full visible chatbox conversation history to understand follow-ups like "ok", "sure", "what?", "how about this", and price-only replies.
- For spending questions, prioritize transactions, monthly summary, and top category.
- For category questions, prioritize budget rows and top spending category.
- For wallet questions, prioritize wallet total and wallet rows.
- Do not answer spending or category questions using only wallet balance.
- Do not turn a simple finance question into a coaching reply.
- Do not mention unrelated cards.
- If Budget status is "no_budget" or Has declared budget is "no", never say the user has remaining budget.
- If Budget status is "no_budget", answer clearly that no active declared monthly budget exists.
- Do not treat budget categories alone as a declared monthly budget.
- Do not use wallet balance as budget remaining.
- Do not say "budget looks good" unless there is an active declared budget.
- If the latest user message is an affirmation like "Sure" or "Yes", use full chat history to understand what they accepted.
- If the previous CLARA message asked whether the user wants a budget/category breakdown, provide the budget breakdown from the rows below.
- Avoid canned wording. Write a fresh, natural answer from the snapshot and the current chat history.

STYLE:
Direct, clear, short, and data-first.

FULL VISIBLE CHATBOX CONVERSATION HISTORY:
${formatFullConversation(recentConversation)}

LATEST USER MESSAGE:
${cleanText(userMessage)}

FINANCE SNAPSHOT:
Wallet total / available money: ${money(finance.availableMoney)}
Wallets: ${buildWalletRows(finance)}

Budget:
Has declared budget: ${plan.hasDeclaredBudget ? "yes" : "no"}
Declared monthly budget: ${plan.hasDeclaredBudget ? money(plan.declaredBudget) : "none"}
Allocated: ${money(plan.allocatedBudget)}
Unallocated: ${budgetMoney(plan.unallocatedBudget, plan)}
Spent so far: ${money(plan.spentTotal)}
Remaining spendable budget: ${budgetMoney(plan.remainingSpendableBudget, plan)}
Budget status: ${plan.budgetStatus || "unknown"}
Budget explanation: ${plan.budgetExplanation || "Budget state is unclear."}
Budget truth source: ${plan.sourceUsed || plan.budgetTruthSource || "unknown"}
Budget rows: ${buildBudgetRows(finance)}

Spending:
${buildSpendingRows(finance)}

Savings goals:
${buildSavingsRows(finance)}

Emergency fund:
${buildEmergencyRow(finance)}

Finance data status: ${finance.hasAnyData ? "ready" : "not enough data loaded"}

ANSWER RULES:
- Start with the direct answer first.
- Maximum 2-4 short sentences unless the user asks for a breakdown.
- If selected sub-contexts are missing, say what is missing instead of guessing.
- For budget questions with no declared budget, use this meaning: "I don’t see an active declared monthly budget yet."
- End with a complete sentence and punctuation.
- Never stop after a partial money amount like "₱25" or an unfinished phrase like "so you still have".

Reply as CLARA:`;
}

export function generateLocalFinanceReply() {
  return "";
}

export function sanitizeFinanceBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .trim();

  if (!cleaned) return "";

  const safeReply = trimSentences(cleaned, 4);
  if (!safeReply || looksCutOff(safeReply)) return "";
  return safeReply;
}
