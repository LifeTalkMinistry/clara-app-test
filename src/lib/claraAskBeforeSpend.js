export const CLARA_DECISION_STYLES = {
  idle: {
    label: "Ready",
    ring: "border-cyan-300/35",
    badge: "bg-cyan-300/10 text-cyan-100 border-cyan-300/20",
    glow: "from-cyan-300/20 via-blue-500/10 to-violet-500/20",
    dot: "bg-cyan-300",
  },
  green: {
    label: "Safe",
    ring: "border-emerald-300/35",
    badge: "bg-emerald-300/10 text-emerald-100 border-emerald-300/20",
    glow: "from-emerald-300/20 via-cyan-500/10 to-blue-500/20",
    dot: "bg-emerald-300",
  },
  yellow: {
    label: "With limit",
    ring: "border-amber-200/35",
    badge: "bg-amber-200/10 text-amber-100 border-amber-200/20",
    glow: "from-amber-200/20 via-cyan-500/10 to-violet-500/20",
    dot: "bg-amber-200",
  },
  orange: {
    label: "Delay",
    ring: "border-orange-300/35",
    badge: "bg-orange-300/10 text-orange-100 border-orange-300/20",
    glow: "from-orange-300/20 via-fuchsia-500/10 to-violet-500/20",
    dot: "bg-orange-300",
  },
  red: {
    label: "Not now",
    ring: "border-rose-300/35",
    badge: "bg-rose-300/10 text-rose-100 border-rose-300/20",
    glow: "from-rose-300/20 via-fuchsia-500/10 to-violet-500/20",
    dot: "bg-rose-300",
  },
};

const CATEGORY_KEYWORDS = [
  { category: "food", keywords: ["food", "coffee", "starbucks", "milk tea", "milktea", "snack", "meal", "lunch", "dinner", "breakfast", "restaurant", "delivery", "grabfood"] },
  { category: "transport", keywords: ["fare", "jeep", "bus", "train", "grab", "taxi", "gas", "fuel", "transport"] },
  { category: "shopping", keywords: ["shoes", "shirt", "clothes", "dress", "bag", "makeup", "skincare", "gadget", "phone", "watch", "shopping"] },
  { category: "bills", keywords: ["bill", "electric", "water", "internet", "rent", "subscription", "loan"] },
  { category: "health", keywords: ["medicine", "doctor", "clinic", "hospital", "vitamin", "health"] },
  { category: "savings", keywords: ["save", "savings", "goal", "emergency fund", "investment"] },
];

export function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatPeso(value) {
  const cleanValue = Math.max(0, safeNumber(value));
  return `₱${cleanValue.toLocaleString("en-PH", { maximumFractionDigits: cleanValue % 1 === 0 ? 0 : 2 })}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getBudgetName(category) {
  return category?.category || category?.name || category?.title || category?.category_name || "";
}

function getBudgetAllocated(category) {
  return safeNumber(category?.allocated_amount ?? category?.allocated ?? category?.amount ?? category?.limit ?? category?.budget_amount);
}

function getBudgetSpent(category) {
  return safeNumber(category?.spent ?? category?.totalSpent ?? category?.used ?? category?.actual_spent);
}

function getBudgetRemaining(category) {
  if (category?.remaining !== undefined) return safeNumber(category.remaining);
  return getBudgetAllocated(category) - getBudgetSpent(category);
}

function getExpenseAmount(expense) {
  return safeNumber(expense?.amount ?? expense?.value ?? expense?.total);
}

function getExpenseCategory(expense) {
  return expense?.category || expense?.category_name || expense?.budget_category || expense?.budgetName || "";
}

function getExpenseDate(expense) {
  return expense?.created_at || expense?.createdAt || expense?.date || expense?.timestamp || expense?.transaction_date || "";
}

function isCurrentMonth(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function getBudgetCategories(budgets) {
  if (Array.isArray(budgets?.categories)) return budgets.categories;
  if (Array.isArray(budgets)) return budgets;
  return [];
}

function parsePurchasePrompt(prompt) {
  const raw = String(prompt || "").trim();
  const amountPattern = /(?:₱|php|peso|pesos|p)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:php|peso|pesos)/i;
  const directAmount = raw.match(amountPattern);
  const fallbackAmount = raw.match(/\b\d{2,}(?:,\d{3})*(?:\.\d{1,2})?\b/);
  const amountText = directAmount?.[1] || directAmount?.[2] || fallbackAmount?.[0] || "";
  const amount = amountText ? safeNumber(amountText.replace(/,/g, ""), null) : null;
  const item = raw
    .replace(amountPattern, "")
    .replace(fallbackAmount?.[0] || "", "")
    .replace(/[?.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { raw, item: item || raw || "this purchase", amount };
}

function inferCategory(prompt, categories = []) {
  const promptText = normalizeText(prompt);
  const budgetMatch = categories.find((category) => {
    const name = normalizeText(getBudgetName(category));
    return name && (promptText.includes(name) || name.includes(promptText));
  });
  if (budgetMatch) return getBudgetName(budgetMatch);

  const keywordMatch = CATEGORY_KEYWORDS.find((group) => group.keywords.some((keyword) => promptText.includes(keyword)));
  if (!keywordMatch) return "";

  const actualBudget = categories.find((category) => {
    const name = normalizeText(getBudgetName(category));
    return name.includes(keywordMatch.category) || keywordMatch.category.includes(name);
  });
  return getBudgetName(actualBudget) || keywordMatch.category;
}

function findCategoryBudget(categoryName, categories = []) {
  const key = normalizeText(categoryName);
  if (!key) return null;
  return categories.find((category) => {
    const name = normalizeText(getBudgetName(category));
    return name === key || name.includes(key) || key.includes(name);
  }) || null;
}

function getCurrentMonthCategoryFrequency(expenses = [], categoryName = "") {
  const key = normalizeText(categoryName);
  if (!key) return 0;
  return (Array.isArray(expenses) ? expenses : []).filter((expense) => {
    const category = normalizeText(getExpenseCategory(expense));
    return isCurrentMonth(getExpenseDate(expense)) && category && (category === key || category.includes(key) || key.includes(category));
  }).length;
}

function buildDecision({ status, label, headline, body, nextAction, reasons }) {
  return { status, label, headline, body, nextAction, reasons: reasons.filter(Boolean).slice(0, 3) };
}

export function getDefaultCoachState(finance = {}) {
  const moneyLeft = safeNumber(finance.moneyLeft ?? finance.moneyLeftThisMonth);
  const currentExpenses = safeNumber(finance.currentMonthExpenses ?? finance.thisMonthSpent);
  const riskyCategory = Array.isArray(finance.budgetSummaries?.highRiskCategories)
    ? finance.budgetSummaries.highRiskCategories[0]
    : null;
  return {
    status: "idle",
    label: finance.loading ? "Loading" : "Ready",
    headline: "Ask before you spend.",
    body: finance.loading
      ? "I’m preparing your local budget context."
      : riskyCategory
        ? `${getBudgetName(riskyCategory)} is already close to its limit.`
        : currentExpenses > 0
          ? `You've spent ${formatPeso(currentExpenses)} this month so far.`
          : "I’ll check your budget, wallet, and spending pattern before you decide.",
    nextAction: "Type item + price to get a clear decision.",
    reasons: [moneyLeft > 0 ? `Money left: ${formatPeso(moneyLeft)}` : "Budget check ready", "Decision lens active"],
  };
}

export function evaluateClaraPurchaseDecision(prompt, finance = {}) {
  const parsed = parsePurchasePrompt(prompt);
  const categories = getBudgetCategories(finance.budgets);
  const categoryName = inferCategory(`${parsed.item} ${parsed.raw}`, categories);
  const categoryBudget = findCategoryBudget(categoryName, categories);
  const amount = parsed.amount;
  const moneyLeft = safeNumber(finance.moneyLeft ?? finance.moneyLeftThisMonth);
  const currentExpenses = safeNumber(finance.currentMonthExpenses ?? finance.thisMonthSpent);
  const categoryRemaining = categoryBudget ? getBudgetRemaining(categoryBudget) : 0;
  const categoryAllocated = categoryBudget ? getBudgetAllocated(categoryBudget) : 0;
  const categorySpent = categoryBudget ? getBudgetSpent(categoryBudget) : 0;
  const frequency = getCurrentMonthCategoryFrequency(finance.expenses, categoryName);

  if (!parsed.raw) return getDefaultCoachState(finance);
  if (!amount || amount <= 0) {
    return buildDecision({ status: "yellow", label: "Need price", headline: "Give me the amount too.", body: "I can judge the purchase properly once I know the item and price.", nextAction: "Try: coffee ₱180 or shoes ₱1,200.", reasons: ["Item detected", "Price missing"] });
  }
  if (!categories.length) {
    return buildDecision({
      status: moneyLeft > 0 && amount <= moneyLeft * 0.08 ? "yellow" : "orange",
      label: "Limited check",
      headline: moneyLeft > 0 && amount <= moneyLeft * 0.08 ? "Probably okay, but log it." : "Better pause first.",
      body: moneyLeft > 0 ? `I can see your money left, but no budget category is set yet. This purchase would use ${formatPeso(amount)}.` : "I need your budget or wallet data to give a confident answer.",
      nextAction: "Set this as planned before buying so CLARA can track the pattern.",
      reasons: [moneyLeft > 0 ? `Money left: ${formatPeso(moneyLeft)}` : "No wallet context", "No budget categories"],
    });
  }
  if (moneyLeft > 0 && amount > moneyLeft) {
    return buildDecision({ status: "red", label: "Not recommended", headline: "Not now.", body: `${formatPeso(amount)} is higher than your current money left of ${formatPeso(moneyLeft)}.`, nextAction: "Delay it, lower the amount, or move money intentionally before buying.", reasons: [`Money left: ${formatPeso(moneyLeft)}`, `Purchase: ${formatPeso(amount)}`] });
  }
  if (!categoryBudget) {
    return buildDecision({ status: amount > Math.max(moneyLeft * 0.12, 500) ? "orange" : "yellow", label: "Unplanned", headline: amount > Math.max(moneyLeft * 0.12, 500) ? "Better delay this." : "Okay only if intentional.", body: `I don't see a matching budget category for ${parsed.item}. That makes this an unplanned purchase.`, nextAction: "Create or choose a budget category before buying.", reasons: [categoryName ? `Detected: ${categoryName}` : "No category match", `Amount: ${formatPeso(amount)}`] });
  }

  const afterRemaining = categoryRemaining - amount;
  const categoryUsageAfter = categoryAllocated > 0 ? (categorySpent + amount) / categoryAllocated : 1;
  const categoryLabel = getBudgetName(categoryBudget);
  if (amount > categoryRemaining) {
    return buildDecision({ status: "orange", label: "Delay", headline: "Better delay this.", body: `${categoryLabel} only has ${formatPeso(categoryRemaining)} left, and this costs ${formatPeso(amount)}.`, nextAction: "Wait, reduce the amount, or re-balance your budget first.", reasons: [`${categoryLabel}: ${formatPeso(categoryRemaining)} left`, `Short by ${formatPeso(Math.abs(afterRemaining))}`] });
  }
  if (categoryUsageAfter >= 0.9) {
    return buildDecision({ status: "orange", label: "High risk", headline: "You can, but it will tighten your budget.", body: `After this, ${categoryLabel} will be almost used up for the month.`, nextAction: "Buy only if this is planned or important today.", reasons: [`After: ${formatPeso(afterRemaining)} left`, `Usage: ${Math.round(categoryUsageAfter * 100)}%`] });
  }
  if (frequency >= 3) {
    return buildDecision({ status: "yellow", label: "Pattern check", headline: "Okay, but control the pattern.", body: `You've already spent in ${categoryLabel} ${frequency} times this month.`, nextAction: "Keep this one within limit, then stop repeating it this week.", reasons: [`${frequency}x this month`, `${formatPeso(afterRemaining)} left after`] });
  }
  if (amount > categoryRemaining * 0.4) {
    return buildDecision({ status: "yellow", label: "With limit", headline: "Okay, but keep it intentional.", body: `This uses a big part of your remaining ${categoryLabel} budget.`, nextAction: `Try to keep it under ${formatPeso(Math.max(0, categoryRemaining * 0.3))} if possible.`, reasons: [`${categoryLabel}: ${formatPeso(categoryRemaining)} left`, `After: ${formatPeso(afterRemaining)} left`] });
  }
  return buildDecision({ status: "green", label: "Safe", headline: "Safe to spend.", body: `This fits inside your ${categoryLabel} budget and still leaves ${formatPeso(afterRemaining)} after.`, nextAction: "Buy it only if it still feels intentional, then log it.", reasons: [`Amount: ${formatPeso(amount)}`, `Month spent: ${formatPeso(currentExpenses)}`] });
}
