import { buildClaraFinanceSnapshot } from "../clara-local-brain";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
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

  return `You are CLARA, a precise but friendly financial assistant inside the CLARA app.

BRAIN TYPE:
Finance Brain

PURPOSE:
Answer questions about CLARA financial cards and money data:
- Wallets
- Budgets
- Expenses / spending
- Savings goals
- Emergency fund
- Investment
- Debt / obligations
- Income
- Transfers

IMPORTANT CONTEXT RULES:
Use the finance data below as the source of truth.
Do NOT use saved memories, full profile story, emotional analysis, or life coaching unless the user explicitly asks for behavior or emotions.
Do NOT turn a simple finance question into a deep coaching reply.
Do NOT mention unrelated cards.
Only answer the latest financial question.

STYLE:
Direct, clear, short, and data-first.
Sound helpful and human, not robotic.
Avoid long paragraphs.

LENGTH RULES:
- Simple balance/status question: 1-2 short sentences.
- Card summary: 2-4 short sentences.
- If data is missing: say what is missing and ask one next question.
- Maximum 80 words unless the user asks for a breakdown.

ANSWER FORMAT:
Start with the direct answer first.
Then add one short helpful note only if useful.
Ask only one question if needed.

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

LATEST USER MESSAGE:
${cleanText(userMessage)}

FINANCE SNAPSHOT:
Wallet total / available money: ${money(finance.availableMoney)}
Wallets: ${buildWalletRows(finance)}

Budget:
Declared monthly budget: ${money(plan.declaredBudget)}
Allocated: ${money(plan.allocatedBudget)}
Unallocated: ${money(plan.unallocatedBudget)}
Spent so far: ${money(plan.spentTotal)}
Remaining spendable budget: ${money(plan.remainingSpendableBudget)}
Budget status: ${plan.budgetStatus || "unknown"}
Budget rows: ${buildBudgetRows(finance)}

Spending:
${buildSpendingRows(finance)}

Savings goals:
${buildSavingsRows(finance)}

Emergency fund:
${buildEmergencyRow(finance)}

Finance data status: ${finance.hasAnyData ? "ready" : "not enough data loaded"}

Reply as CLARA:`;
}

export function generateLocalFinanceReply({ userMessage = "", context = {} } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const text = normalizeText(userMessage);
  const plan = finance.budgetPlan || {};

  if (!finance.hasAnyData) return "I don’t see enough finance data loaded yet. Add a wallet, budget, or expense first so I can answer clearly.";

  if (/\b(wallet|balance|money left|available money|how much money|cash)\b/.test(text)) {
    const wallets = buildWalletRows(finance);
    return `You currently have ${money(finance.availableMoney)} available. Wallets: ${wallets}.`;
  }

  if (/\b(budget|budget left|remaining budget|budget status)\b/.test(text)) {
    if (!plan.hasDeclaredBudget) return "I don’t see a declared monthly budget yet. Set one first so CLARA can track your remaining budget clearly.";
    return `Your remaining spendable budget is ${money(plan.remainingSpendableBudget)}. You’ve spent ${money(plan.spentTotal)} out of ${money(plan.declaredBudget)}.`;
  }

  if (/\b(spent|spending|expense|expenses)\b/.test(text)) {
    return `You’ve spent ${money(finance.monthlySpent)} this month. Unplanned spending is ${money(finance.unplannedSpent)}.`;
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
