import { buildClaraFinanceSnapshot } from "@/lib/clara-local-brain";
import { buildClaraBudgetSnapshot } from "@/lib/clara-budget-snapshot";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";
import { buildClaraDiagnosticDirectReply } from "@/lib/clara-diagnostic-direct-reply";

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
    : null;
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactKey(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
}

function titleCase(value = "") {
  return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function walletName(wallet = {}) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.label || "Wallet").trim();
}

function walletBalance(wallet = {}) {
  return wallet?.balance ?? wallet?.current_balance ?? wallet?.wallet_balance ?? wallet?.available_balance ?? null;
}

function getWallets(snapshot = {}) {
  const walletBalances = Array.isArray(snapshot.walletBalances) ? snapshot.walletBalances : [];
  const wallets = Array.isArray(snapshot.wallets) ? snapshot.wallets : [];
  const source = walletBalances.length ? walletBalances : wallets;

  return source
    .map((wallet) => ({
      ...wallet,
      name: walletName(wallet),
      balance: walletBalance(wallet),
    }))
    .filter((wallet) => wallet.name && wallet.balance !== null && wallet.balance !== undefined);
}

function isPrimaryWalletQuestion(text = "") {
  return text.includes("primary wallet") || text.includes("main wallet") || text.includes("first wallet") || text.includes("top wallet");
}

function isBalanceQuestion(text = "") {
  return (
    text.includes("how much") ||
    text.includes("balance") ||
    text.includes("money left") ||
    text.includes("current money") ||
    text.includes("currently have") ||
    text.includes("available money") ||
    text.includes("check my money") ||
    isPrimaryWalletQuestion(text)
  );
}

function isExpenseLoggingPrompt(text = "") {
  return /\b(i spent|spent|i bought|bought|log|logged|record|add expense|expense of)\b/.test(text) && /\d/.test(text);
}

function isPurchaseDecisionQuestion(text = "") {
  if (isExpenseLoggingPrompt(text)) return false;

  return /\b(can i buy|should i buy|can i afford|afford|is it okay to buy|okay to buy|safe to buy|safe to spend|purchase|buy|spend on)\b/.test(text);
}

function isLifeStageAdviceQuestion(text = "") {
  if (isExpenseLoggingPrompt(text)) return false;
  if (isPurchaseDecisionQuestion(text)) return false;

  return /\b(money advice|spending advice|budget advice|next best move|plan my spending|spending plan|budget fixer|savings plan|save more|debt|utang|loan|bills|payday|emergency fund|overspend|overspending|prioritize|priority)\b/.test(text);
}

function isBudgetQuestion(text = "") {
  return /\b(budget|budgeting|category budget|categories|allocation|allocated|unallocated|overspending|overspend)\b/.test(text);
}

function isBudgetRemainingQuestion(text = "") {
  return isBudgetQuestion(text) && /\b(left|remaining|remain|available|have left|show|what is my budget|how much budget)\b/.test(text);
}

function isBudgetOverspendingQuestion(text = "") {
  return /\b(overspending|overspend|over budget|overbudget|spending too much)\b/.test(text);
}

function isBudgetCategoryQuestion(text = "") {
  return isBudgetQuestion(text) && /\b(category|categories|food|transport|transportation|grocery|groceries|bills|least|most|rank|from my|do i have)\b/.test(text);
}

function isBudgetSpentQuestion(text = "") {
  return isBudgetQuestion(text) && /\b(spent|spend|used|use|expense|expenses)\b/.test(text);
}

function getLifeStageContext(context = {}) {
  return (
    context?.lifeStageContext ||
    context?.lifeStageAiContext ||
    context?.meLifeStageProfile ||
    buildClaraLifeStageAiContext()
  );
}

function signalText(lifeStageContext = {}) {
  const signals = (Array.isArray(lifeStageContext.snapshotTopSignals) ? lifeStageContext.snapshotTopSignals : [])
    .map((signal) => signal?.label)
    .filter(Boolean)
    .slice(0, 2);

  if (!signals.length) return "";
  return ` with ${signals.join(" and ")} active`;
}

function firstRecommendedMove(lifeStageContext = {}) {
  return (Array.isArray(lifeStageContext.recommendedNextMoves) ? lifeStageContext.recommendedNextMoves : [])
    .filter(Boolean)[0] || "protect essentials first before optional spending";
}

function buildLifeStageAdviceReply(prompt = "", context = {}) {
  const text = normalizeText(prompt);
  if (!isLifeStageAdviceQuestion(text)) return "";

  const lifeStageContext = getLifeStageContext(context);
  const snapshot = buildClaraFinanceSnapshot(context || {});
  const available = formatMoney(snapshot.availableMoney ?? snapshot.totalWalletBalance ?? snapshot.totalBalance);
  const dominant = lifeStageContext?.dominantPressure || "your main pressure";
  const nextMove = firstRecommendedMove(lifeStageContext);

  if (!lifeStageContext?.hasProfile) {
    const moneyLine = available ? ` I can see ${available} available, so use that as the temporary boundary.` : "";
    return `I can give sharper guidance after you complete your Me profile, because then I can connect this advice to your real life stage and pressure patterns.${moneyLine} For now, protect bills, essentials, savings, and emergency buffer before saying yes to optional spending.`;
  }

  if (/\b(save|savings|emergency fund)\b/.test(text)) {
    return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, your savings advice should protect ${dominant} first. Start with one small protected amount before flexible spending. Next safest move: ${nextMove}`;
  }

  if (/\b(budget|plan my spending|spending plan|budget fixer|payday|bills|overspend|overspending)\b/.test(text)) {
    return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, build the plan around ${dominant} first. Protect fixed bills and essentials before flexible spending, then use the remaining money as the safe zone. Next safest move: ${nextMove}`;
  }

  if (/\b(debt|utang|loan|prioritize|priority|next best move)\b/.test(text)) {
    return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, prioritize the move that lowers ${dominant} without weakening essentials. Next safest move: ${nextMove}`;
  }

  return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, I’d use ${dominant} as the main filter for this money decision. Next safest move: ${nextMove}`;
}

function findRequestedWallet(prompt = "", wallets = []) {
  const text = normalizeText(prompt);
  const compact = compactKey(prompt);

  for (const wallet of wallets) {
    const name = normalizeText(wallet.name);
    const key = compactKey(wallet.name);
    if (!key) continue;

    const exactWord = text.split(" ").includes(name);
    const compactMatch = key.length > 1 && compact.includes(key);
    const singleLetterMatch = key.length === 1 && text.split(" ").includes(key);

    if (exactWord || compactMatch || singleLetterMatch) return wallet;
  }

  return null;
}

function extractRequestedBudgetCategory(prompt = "") {
  const normalized = normalizeText(prompt);
  const patterns = [
    /(?:from|in|under) my ([a-z0-9\s]+?) budget\b/,
    /(?:from|in|under) ([a-z0-9\s]+?) budget\b/,
    /do i have (?:a |an )?([a-z0-9\s]+?) budget\b/,
    /my ([a-z0-9\s]+?) budget\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const value = String(match?.[1] || "").trim();
    if (value && !["remaining", "monthly", "overall", "active", "current"].includes(value)) return value;
  }

  const knownTerms = ["food", "transportation", "transport", "groceries", "grocery", "bills", "rent", "sports", "coffee"];
  return knownTerms.find((term) => normalized.split(" ").includes(term)) || "";
}

function findBudgetCategory(categories = [], requested = "") {
  const request = normalizeText(requested);
  if (!request) return null;

  return categories.find((category) => {
    const name = normalizeText(category.name || category.title || category.category || category.label || "");
    return name === request || name.includes(request) || request.includes(name);
  }) || null;
}

function buildBudgetDirectReply(prompt = "", context = {}) {
  const text = normalizeText(prompt);
  if (!isBudgetQuestion(text)) return "";

  const budget = buildClaraBudgetSnapshot(context || {});
  const declared = formatMoney(budget.declaredBudget) || "₱0";
  const spent = formatMoney(budget.spentTotal) || "₱0";
  const remaining = formatMoney(budget.remainingSpendableBudget) || "₱0";
  const overAmount = Math.max(budget.spentTotal - budget.declaredBudget, 0);
  const categories = Array.isArray(budget.categories) ? budget.categories : [];

  if (!budget.hasDeclaredBudget) {
    return "I don’t see a declared monthly budget yet. Set your monthly budget first, then I can track how much is left from that budget.";
  }

  if (isBudgetOverspendingQuestion(text)) {
    if (budget.isOverspent) {
      return `Yes. You’ve spent ${spent} against your ${declared} monthly budget, which is ${formatMoney(overAmount)} over.`;
    }
    return `Not yet. You’ve spent ${spent} out of your ${declared} monthly budget, so you still have ${remaining} left.`;
  }

  if (isBudgetCategoryQuestion(text)) {
    const requestedCategory = extractRequestedBudgetCategory(prompt);
    const matchedCategory = findBudgetCategory(categories, requestedCategory);

    if (/\bleast\b/.test(text)) {
      if (!budget.hasBudgetCategories) {
        return `You don’t have budget categories yet, so I can’t rank category balances. Your overall monthly budget still has ${remaining} left from ${declared}.`;
      }

      const lowest = [...categories].sort((a, b) => Number(a.remaining || 0) - Number(b.remaining || 0))[0];
      return `${lowest.name || lowest.title || lowest.category || "A category"} has the least budget left at ${formatMoney(lowest.remaining) || "₱0"}. Your overall monthly budget still has ${remaining} left.`;
    }

    if (requestedCategory && !matchedCategory) {
      const label = titleCase(requestedCategory);
      return `You don’t have a ${label} budget category yet. You’ve spent ${spent} overall this month, but I can’t count it against ${label} until a ${label} category exists or the expense is linked to ${label}.`;
    }

    if (!budget.hasBudgetCategories) {
      return `You don’t have budget categories yet. Your overall monthly budget still has ${remaining} left from ${declared}, but no category-level budget is active yet.`;
    }

    if (matchedCategory) {
      return `${matchedCategory.name || matchedCategory.title || matchedCategory.category} budget: ${formatMoney(matchedCategory.remaining) || "₱0"} left from ${formatMoney(matchedCategory.allocated) || "₱0"}. Spent so far: ${formatMoney(matchedCategory.spent) || "₱0"}.`;
    }

    return `Your budget categories are: ${categories.map((category) => category.name || category.title || category.category).filter(Boolean).join(", ")}. Overall monthly budget remaining: ${remaining}.`;
  }

  if (isBudgetSpentQuestion(text)) {
    return `You’ve spent ${spent} from your ${declared} monthly budget so far. You still have ${remaining} left.${budget.hasBudgetCategories ? "" : " You haven’t created budget categories yet, so this is overall budget tracking."}`;
  }

  if (isBudgetRemainingQuestion(text)) {
    if (/\bshow\b/.test(text)) {
      return `Remaining monthly budget: ${remaining}. Declared budget: ${declared}. Spent so far: ${spent}. Category allocation is still ${budget.hasBudgetCategories ? "active" : "empty, so no category-level budget is active yet"}.`;
    }

    return `You have ${remaining} left from your ${declared} monthly budget. You’ve spent ${spent} so far.${budget.hasBudgetCategories ? "" : " You haven’t created budget categories yet, so this is based on your overall monthly budget, not category-level tracking."}`;
  }

  return `Your declared monthly budget is ${declared}. You’ve spent ${spent}, so your remaining spendable monthly budget is ${remaining}. Allocated into categories: ${formatMoney(budget.allocatedBudget) || "₱0"}. Unallocated: ${formatMoney(budget.unallocatedBudget) || "₱0"}.`;
}

export function buildContextualFinanceReply(prompt, context) {
  const text = normalizeText(prompt);

  if (text.includes("talk to clara context mode is active")) return "";

  const diagnosticReply = buildClaraDiagnosticDirectReply(prompt, context);
  if (diagnosticReply) return diagnosticReply;

  // Purchase and affordability decisions must reach Gemini/Central Brain.
  if (isPurchaseDecisionQuestion(text)) return "";

  const budgetReply = buildBudgetDirectReply(prompt, context);
  if (budgetReply) return budgetReply;

  if (context?.allowDirectLifeStageAdvice === true) {
    const lifeStageAdvice = buildLifeStageAdviceReply(prompt, context);
    if (lifeStageAdvice) return lifeStageAdvice;
  }

  if (!isBalanceQuestion(text)) return "";

  const snapshot = buildClaraFinanceSnapshot(context || {});
  const wallets = getWallets(snapshot);
  const primaryWallet = wallets[0] || null;
  const requestedWallet = isPrimaryWalletQuestion(text)
    ? primaryWallet
    : findRequestedWallet(prompt, wallets);

  if (requestedWallet) {
    const amount = formatMoney(requestedWallet.balance);
    if (!amount) return `I found ${requestedWallet.name}, but I cannot calculate its balance clearly yet.`;

    return isPrimaryWalletQuestion(text)
      ? `Your primary wallet is ${requestedWallet.name}, and it currently has ${amount}.`
      : `${requestedWallet.name} currently has ${amount}.`;
  }

  const total = snapshot.availableMoney ?? snapshot.totalWalletBalance ?? snapshot.totalBalance;
  const totalText = formatMoney(total);

  if (!totalText) {
    return snapshot.hasAnyData
      ? "I can see your finance data, but I cannot calculate the wallet total clearly yet. Open your wallet card and refresh once."
      : "I do not see wallet data yet. Add a wallet first, then I can answer your current money accurately.";
  }

  const breakdown = wallets
    .slice(0, 5)
    .map((wallet) => `${wallet.name}: ${formatMoney(wallet.balance)}`)
    .join(", ");

  return `You currently have ${totalText} available across your wallets.${breakdown ? ` That includes ${breakdown}.` : ""}`;
}
