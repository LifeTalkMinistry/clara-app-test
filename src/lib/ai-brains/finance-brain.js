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

function normalizeText(value = "") {
  return cleanText(value).toLowerCase();
}

function budgetName(budget = {}) {
  return String(budget?.name || budget?.category || budget?.title || budget?.label || "Budget").trim();
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

function trimSentences(text = "", maxSentences = 4) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return parts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
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

function buildTopCategoryLine(finance = {}) {
  const top = finance.topSpendingCategory;
  return top?.category ? `Your biggest category right now is ${top.category} at ${money(top.amount)}.` : "I don’t see a top spending category yet.";
}

function noActiveBudgetReply() {
  return "I don’t see an active declared monthly budget yet. Your budget card is still in No Plan state, so I can’t calculate real remaining budget yet. Start by declaring your monthly budget amount, then CLARA can track your categories and spending.";
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

STYLE:
Direct, clear, short, and data-first.

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

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

Reply as CLARA:`;
}

export function generateLocalFinanceReply({ userMessage = "", context = {} } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const text = normalizeText(userMessage);
  const plan = finance.budgetPlan || {};

  if (!finance.hasAnyData) return "I don’t see enough finance data loaded yet. Add a wallet, budget, or expense first so I can answer clearly.";

  if (/\b(spent|spending|expense|expenses|this month|monthly|eating most|top category|which category)\b/.test(text)) {
    return `You’ve spent ${money(finance.monthlySpent)} this month. Unplanned spending is ${money(finance.unplannedSpent)}. ${buildTopCategoryLine(finance)}`;
  }

  if (/\b(budget|budget left|remaining budget|budget status|category|categories|spending plan)\b/.test(text)) {
    if (!plan.hasDeclaredBudget || plan.budgetStatus === "no_budget") return noActiveBudgetReply();
    return `Your remaining spendable budget is ${money(plan.remainingSpendableBudget)}. You’ve spent ${money(plan.spentTotal)} out of ${money(plan.declaredBudget)}. Budget rows: ${buildBudgetRows(finance)}.`;
  }

  if (/\b(wallet|balance|money left|available money|how much money|cash)\b/.test(text)) {
    const wallets = buildWalletRows(finance);
    return `You currently have ${money(finance.availableMoney)} available. Wallets: ${wallets}.`;
  }

  if (/\b(savings?|goal|goals)\b/.test(text)) {
    if (!finance.savingsGoals?.length) return "I don’t see savings goals loaded yet. Add one so CLARA can track your progress.";
    return `Your savings goals: ${buildSavingsRows(finance)}.`;
  }

  if (/\b(emergency|emergency fund|buffer)\b/.test(text)) {
    return `Emergency fund: ${buildEmergencyRow(finance)}`;
  }

  return `Your current visible money is ${money(finance.availableMoney)}. Ask me about wallets, budget, spending, savings, or emergency fund to narrow it down.`;
}

export function sanitizeFinanceBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .trim();

  if (!cleaned) return "I don’t have enough finance data to answer that clearly yet.";
  return trimSentences(cleaned, 4);
}
