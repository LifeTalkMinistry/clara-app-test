const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

const isRecord = (value) => Boolean(value && typeof value === "object");
const safeRecord = (value) => (isRecord(value) ? value : {});
const safeList = (value) => (Array.isArray(value) ? value.filter(isRecord) : []);

const CATEGORY_ALIASES = {
  food: ["food", "foods", "meal", "meals", "coffee", "snack", "snacks", "grocery", "groceries", "dining", "restaurant"],
  transport: ["transport", "transportation", "commute", "fare", "fares", "gas", "fuel", "jeep", "bus", "taxi", "grab", "angkas", "moveit"],
  housing: ["housing", "house", "rent", "mortgage", "apartment"],
  utilities: ["bill", "bills", "utility", "utilities", "electric", "electricity", "water", "internet", "wifi", "load", "subscription", "subscriptions"],
  health: ["health", "medical", "medicine", "doctor", "hospital", "vitamin", "checkup", "wellness", "fitness"],
  education: ["education", "school", "study", "tuition", "books", "supplies"],
  shopping: ["shopping", "shop", "shoe", "shoes", "sneaker", "sneakers", "clothes", "clothing", "shirt", "bag", "watch", "gadget", "phone", "lazada", "shopee"],
  entertainment: ["entertainment", "fun", "leisure", "game", "games", "gaming", "movie", "cinema", "concert", "hobby", "hobbies", "outing"],
  personal: ["personal", "self care", "selfcare", "beauty", "skincare", "makeup", "haircut", "allowance"],
};

const FLEXIBLE_BUDGET_NAMES = [
  "other",
  "others",
  "other expense",
  "other expenses",
  "misc",
  "miscellaneous",
  "random expense",
  "random expenses",
  "excess expense",
  "excess expenses",
  "extra expense",
  "extra expenses",
  "extra spending",
  "flexible spending",
  "unplanned spending",
  "unplanned expense",
  "unplanned expenses",
  "spending allowance",
  "personal allowance",
  "wants budget",
  "want budget",
  "wants",
  "lifestyle",
  "discretionary",
  "discretionary spending",
  "fun money",
  "pocket money",
  "spending buffer",
  "buffer",
  "general spending",
];

const CATEGORY_LABELS = {
  food: "Food",
  transport: "Transportation",
  housing: "Housing",
  utilities: "Bills",
  health: "Health",
  education: "Education",
  shopping: "Shopping",
  entertainment: "Entertainment",
  personal: "Personal",
  other: "Lifestyle",
};

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  return `₱${Math.max(0, toNumber(value)).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function createMessage(role, text) {
  return {
    id: `buy-check-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text: clean(text),
  };
}

function createInitialState(sessionId = "") {
  return {
    sessionId,
    step: "item",
    item: "",
    price: 0,
    reason: "",
    clarification: "",
    followUpAnswer: "",
    purchaseContext: "",
    askedClarification: false,
    planningStatus: null,
    budgetCoverage: null,
    budgetAssessment: null,
    confirmation: null,
    diagnosis: null,
    busy: false,
    done: false,
    messages: [],
  };
}

function createDecisionState() {
  return {
    phase: "choose",
    choice: "",
    explanation: "",
    walletId: "",
    busy: false,
    error: "",
    result: null,
  };
}

function parsePrice(value = "") {
  const match = clean(value).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
}

function includesAlias(text, aliases = []) {
  const normalizedText = normalize(text);
  return aliases.some((alias) => {
    const normalizedAlias = normalize(alias);
    return normalizedText === normalizedAlias || normalizedText.includes(normalizedAlias);
  });
}

function inferCategoryKey(value = "") {
  const text = normalize(value);
  if (includesAlias(text, CATEGORY_ALIASES.food)) return "food";
  if (includesAlias(text, CATEGORY_ALIASES.transport)) return "transport";
  if (includesAlias(text, CATEGORY_ALIASES.housing)) return "housing";
  if (includesAlias(text, CATEGORY_ALIASES.utilities)) return "utilities";
  if (includesAlias(text, CATEGORY_ALIASES.health)) return "health";
  if (includesAlias(text, CATEGORY_ALIASES.education)) return "education";
  if (includesAlias(text, CATEGORY_ALIASES.shopping)) return "shopping";
  if (includesAlias(text, CATEGORY_ALIASES.entertainment)) return "entertainment";
  if (includesAlias(text, CATEGORY_ALIASES.personal)) return "personal";
  return "other";
}

function normalizeExpenseCategory(value = "") {
  return inferCategoryKey(value);
}

function walletId(value) {
  const wallet = safeRecord(value);
  return clean(wallet.id ?? wallet.wallet_id ?? wallet.walletId ?? wallet.key ?? wallet.uuid ?? "");
}

function walletName(value) {
  const wallet = safeRecord(value);
  return clean(wallet.name || wallet.wallet_name || wallet.title || wallet.label || wallet.type || "Wallet");
}

function walletBalance(value) {
  const wallet = safeRecord(value);
  return toNumber(
    wallet.derived_balance ??
      wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0,
  );
}

function isProtectedWallet(value) {
  const wallet = safeRecord(value);
  return /emergency|reserve|saving|goal/.test(normalize(`${walletName(wallet)} ${wallet.type || ""}`));
}

function getWalletOptions(context = {}, amount = 0) {
  const seen = new Set();
  return safeList(context.wallets)
    .filter((wallet) => !isProtectedWallet(wallet))
    .map((wallet) => {
      const id = walletId(wallet);
      const name = walletName(wallet);
      const balance = walletBalance(wallet);
      const key = id || normalize(name);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return {
        id,
        name,
        balance,
        enough: Boolean(id) && balance >= toNumber(amount),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.enough) - Number(a.enough) || b.balance - a.balance);
}

function budgetId(value) {
  const budget = safeRecord(value);
  return clean(budget.id ?? budget.budget_id ?? budget.budgetId ?? budget.uuid ?? "");
}

function budgetTitle(value) {
  const budget = safeRecord(value);
  return clean(
    budget.title ||
      budget.name ||
      budget.label ||
      budget.display_name ||
      budget.displayName ||
      budget.category ||
      budget.budget_category ||
      "Budget",
  );
}

function budgetSearchText(value) {
  const budget = safeRecord(value);
  return clean(
    [
      budget.title,
      budget.name,
      budget.label,
      budget.display_name,
      budget.displayName,
      budget.category,
      budget.budget_category,
      budget.budgetCategory,
      budget.expense_category,
      budget.expenseCategory,
      budget.bucket,
      budget.type,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function budgetLimit(value) {
  const budget = safeRecord(value);
  return toNumber(
    budget.limit ??
      budget.amount ??
      budget.budget_amount ??
      budget.allocated ??
      budget.allocated_amount ??
      budget.allocatedAmount ??
      budget.monthly_amount ??
      budget.total_budget ??
      budget.totalBudget ??
      budget.budget ??
      budget.cap ??
      0,
  );
}

function isFlexibleBudget(value) {
  return includesAlias(budgetSearchText(value), FLEXIBLE_BUDGET_NAMES);
}

function safeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPHMonthKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(value);
}

function monthKeyRange(monthKey = "") {
  const resolved = /^\d{4}-\d{2}$/.test(clean(monthKey)) ? clean(monthKey) : getPHMonthKey();
  const [year, month] = resolved.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1) - PH_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - PH_OFFSET_MS - 1);
  return { start, end };
}

function budgetRange(value) {
  const budget = safeRecord(value);
  const start = safeDate(
    budget.tracking_start_date ||
      budget.trackingStartDate ||
      budget.range_start ||
      budget.rangeStart ||
      budget.start_date ||
      budget.startDate,
  );
  const end = safeDate(
    budget.tracking_end_date ||
      budget.trackingEndDate ||
      budget.range_end ||
      budget.rangeEnd ||
      budget.end_date ||
      budget.endDate,
  );

  if (start && end && end >= start) return { start, end };
  return monthKeyRange(budget.month || getPHMonthKey());
}

function isBudgetActive(value, now = new Date()) {
  const { start, end } = budgetRange(value);
  return now >= start && now <= end;
}

function expenseDate(value) {
  const expense = safeRecord(value);
  return safeDate(
    expense.date ||
      expense.spent_at ||
      expense.spentAt ||
      expense.transaction_date ||
      expense.transactionDate ||
      expense.created_at ||
      expense.createdAt ||
      expense.updated_at ||
      expense.updatedAt,
  );
}

function expenseAmount(value) {
  const expense = safeRecord(value);
  return Math.abs(toNumber(expense.amount ?? expense.expense_amount ?? expense.total ?? expense.value ?? expense.price ?? 0));
}

function expenseBudgetId(value) {
  const expense = safeRecord(value);
  return clean(expense.budget_id ?? expense.budgetId ?? expense.linked_budget_id ?? expense.linkedBudgetId ?? "");
}

function expenseBudgetName(value) {
  const expense = safeRecord(value);
  return clean(expense.budget_name || expense.budgetName || expense.budget_title || expense.budgetTitle || "");
}

function expenseSearchText(value) {
  const expense = safeRecord(value);
  return clean(
    [
      expense.category,
      expense.category_name,
      expense.budget_category,
      expense.budgetCategory,
      expense.expense_category,
      expense.expenseCategory,
      expense.tag,
      expense.type,
      expense.need_type,
      expense.needType,
      expense.title,
      expense.name,
      expense.description,
      expense.notes,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function budgetFamily(value) {
  if (isFlexibleBudget(value)) return "flexible";
  return inferCategoryKey(budgetSearchText(value));
}

function exactCategoryMatch(value, purchaseCategory) {
  const text = normalize(budgetSearchText(value));
  const aliases = CATEGORY_ALIASES[purchaseCategory] || [];
  return aliases.some((alias) => text === normalize(alias));
}

function candidateScore(value, purchaseCategory) {
  if (exactCategoryMatch(value, purchaseCategory)) return 120;
  const family = budgetFamily(value);
  if (family === purchaseCategory) return 100;
  if (includesAlias(budgetSearchText(value), CATEGORY_ALIASES[purchaseCategory] || [])) return 90;
  if (family === "flexible") return 60;
  return 0;
}

function buildBudgetMetadata(rawBudgets, purchaseCategory) {
  const now = new Date();
  return safeList(rawBudgets)
    .filter((budget) => budgetLimit(budget) > 0 && isBudgetActive(budget, now))
    .map((budget) => {
      const range = budgetRange(budget);
      return {
        id: budgetId(budget),
        title: budgetTitle(budget),
        family: budgetFamily(budget),
        flexible: isFlexibleBudget(budget),
        limit: budgetLimit(budget),
        rangeStart: range.start,
        rangeEnd: range.end,
        score: candidateScore(budget, purchaseCategory),
      };
    });
}

function expenseWithinBudgetRange(expense, budget) {
  const date = expenseDate(expense);
  return Boolean(date && date >= budget.rangeStart && date <= budget.rangeEnd);
}

function directlyLinkedToBudget(expense, budget) {
  const linkedId = expenseBudgetId(expense);
  if (linkedId && budget.id && linkedId === budget.id) return true;
  const linkedName = normalize(expenseBudgetName(expense));
  return Boolean(linkedName && linkedName === normalize(budget.title));
}

function expenseBelongsToBudget(expense, candidate, allBudgets) {
  if (!expenseWithinBudgetRange(expense, candidate)) return false;
  if (directlyLinkedToBudget(expense, candidate)) return true;

  const expenseText = expenseSearchText(expense);
  const expenseFamily = inferCategoryKey(expenseText);

  if (!candidate.flexible) return expenseFamily === candidate.family;
  if (includesAlias(expenseText, FLEXIBLE_BUDGET_NAMES)) return true;

  const hasSpecificOwner = allBudgets.some(
    (budget) =>
      !budget.flexible &&
      budget.family === expenseFamily &&
      expenseWithinBudgetRange(expense, budget),
  );
  return !hasSpecificOwner;
}

function summarizeCandidate(candidate, rawExpenses, allBudgets) {
  const spent = safeList(rawExpenses).reduce(
    (sum, expense) => expenseBelongsToBudget(expense, candidate, allBudgets)
      ? sum + expenseAmount(expense)
      : sum,
    0,
  );
  return {
    id: candidate.id,
    title: candidate.title,
    family: candidate.family,
    flexible: candidate.flexible,
    matchType: candidate.flexible ? "flexible" : "specific",
    score: candidate.score,
    limit: candidate.limit,
    spent,
    remaining: Math.max(0, candidate.limit - spent),
    rangeStart: candidate.rangeStart.toISOString(),
    rangeEnd: candidate.rangeEnd.toISOString(),
  };
}

export function analyzeBuyCheckBudgetCoverage(item, price, contextValue) {
  const context = safeRecord(contextValue);
  const amount = toNumber(price);
  const purchaseCategoryKey = inferCategoryKey(item);
  const purchaseCategory = CATEGORY_LABELS[purchaseCategoryKey] || "Lifestyle";
  const spendable = safeList(context.wallets)
    .filter((wallet) => !isProtectedWallet(wallet))
    .reduce((sum, wallet) => sum + walletBalance(wallet), 0);

  const allBudgets = buildBudgetMetadata(context.budgets, purchaseCategoryKey);
  const candidates = allBudgets
    .filter((budget) => budget.score > 0)
    .map((budget) => summarizeCandidate(budget, context.expenses, allBudgets))
    .sort((a, b) => b.score - a.score || Number(a.flexible) - Number(b.flexible) || b.remaining - a.remaining);

  const fullBudget = candidates.find((candidate) => candidate.remaining >= amount) || null;
  const bestPartial = [...candidates].sort((a, b) => b.remaining - a.remaining || b.score - a.score)[0] || null;
  const selectedBudget = fullBudget || bestPartial;

  let status = "no_match";
  if (fullBudget && spendable >= amount) status = "full";
  else if (fullBudget && spendable < amount) status = "wallet_shortfall";
  else if (bestPartial?.remaining > 0) status = "partial";
  else if (bestPartial) status = "exhausted";

  return {
    status,
    purchaseCategory,
    purchaseCategoryKey,
    purchaseAmount: amount,
    spendable,
    walletShortfall: Math.max(0, amount - spendable),
    selectedBudget,
    candidates,
    scannedBudgetCount: allBudgets.length,
    matchedBudgetCount: candidates.length,
    flexibleBudgetCount: candidates.filter((candidate) => candidate.flexible).length,
    shortfall: selectedBudget ? Math.max(0, amount - selectedBudget.remaining) : amount,
    remainingAfter: status === "full" && selectedBudget
      ? Math.max(0, selectedBudget.remaining - amount)
      : null,
  };
}

function budgetCoverageFromAssessment(assessment) {
  if (assessment?.status !== "full" || !assessment.selectedBudget) return null;
  return {
    budgetId: assessment.selectedBudget.id,
    budgetTitle: assessment.selectedBudget.title,
    category: assessment.purchaseCategory,
    flexible: assessment.selectedBudget.flexible,
    matchType: assessment.selectedBudget.matchType,
    limit: assessment.selectedBudget.limit,
    spent: assessment.selectedBudget.spent,
    remaining: assessment.selectedBudget.remaining,
    remainingAfter: assessment.remainingAfter,
    spendable: assessment.spendable,
    rangeStart: assessment.selectedBudget.rangeStart,
    rangeEnd: assessment.selectedBudget.rangeEnd,
  };
}

function priceStepMessage(assessment) {
  const budget = assessment?.selectedBudget;
  if (assessment?.status === "full" && budget) {
    const matchLabel = budget.flexible ? "flexible budget" : "budget";
    return `This is covered by your ${budget.title} ${matchLabel}. You still have ${money(budget.remaining)} available, and ${money(assessment.remainingAfter)} would remain after this purchase. Did I get that right before I run the full Buy Check?`;
  }
  if (assessment?.status === "wallet_shortfall" && budget) {
    return `Your ${budget.title} budget can cover this, but your spendable wallets are short by ${money(assessment.walletShortfall)}. Why do you still want to buy it?`;
  }
  if (assessment?.status === "partial" && budget) {
    return `I found your ${budget.title} budget, but only ${money(budget.remaining)} remains. This purchase is ${money(assessment.shortfall)} over that budget. Why do you still want to buy it?`;
  }
  if (assessment?.status === "exhausted" && budget) {
    return `I found your ${budget.title} budget, but it has no remaining amount right now. Why do you still want to buy it?`;
  }
  return "Why do you want to buy it? You can say replacement, work need, reward, health, hobby, or simply that you want it.";
}

function confirmationText(flow) {
  const assessment = flow.budgetAssessment;
  const clarification = clean(flow.clarification || flow.followUpAnswer || flow.purchaseContext);
  const addedContext = clarification ? `, and you added that ${clarification}` : "";
  if (flow.planningStatus === "planned" && flow.budgetCoverage) {
    const flexibleText = flow.budgetCoverage.flexible ? " flexible" : "";
    return `This is covered by your ${flow.budgetCoverage.budgetTitle}${flexibleText} budget. You’re considering ${flow.item} for ${money(flow.price)}. The budget has ${money(flow.budgetCoverage.remaining)} available and would have ${money(flow.budgetCoverage.remainingAfter)} left${addedContext}. Did I get that right before I run the full Buy Check?`;
  }
  if (assessment?.status === "partial" && assessment.selectedBudget) {
    return `You’re considering ${flow.item} for ${money(flow.price)} because ${flow.reason}${addedContext}. Your ${assessment.selectedBudget.title} budget only has ${money(assessment.selectedBudget.remaining)} left, leaving a ${money(assessment.shortfall)} shortfall. Did I get that right before I run the full Buy Check?`;
  }
  return `You’re considering ${flow.item} for ${money(flow.price)} because ${flow.reason}${addedContext}. Did I get that right before I run the full Buy Check?`;
}

export {
  safeRecord,
  safeList,
  clean,
  toNumber,
  money,
  createMessage,
  createInitialState,
  createDecisionState,
  parsePrice,
  normalizeExpenseCategory,
  walletName,
  walletBalance,
  isProtectedWallet,
  getWalletOptions,
  budgetCoverageFromAssessment,
  priceStepMessage,
  confirmationText,
};
