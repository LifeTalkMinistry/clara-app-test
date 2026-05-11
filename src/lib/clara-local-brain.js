const CLARA_UNKNOWN_REPLY =
  "I can help with money decisions, spending, wallet health, budgets, savings, emergency fund, or purchase checks. What do you want to check?";

const CLARA_LOADING_REPLY = "Dashboard data is still loading. Try again in a second.";

const CLARA_NOT_ENOUGH_DATA_REPLY =
  "I need more dashboard data before I can answer that clearly. Add wallets, expenses, budgets, savings, or emergency fund details first.";

const INTENTS = {
  FUTURE_FORECAST: "future_forecast",
  SPENDING_CHECK: "spending_check",
  WALLET_HEALTH: "wallet_health",
  AVAILABLE_MONEY: "available_money",
  BUDGET_CHECK: "budget_check",
  SAVINGS_CHECK: "savings_check",
  EMERGENCY_FUND_CHECK: "emergency_fund_check",
  PURCHASE_DECISION: "purchase_decision",
  DAILY_WARNING: "daily_warning",
  UNKNOWN: "unknown",
};

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function cleanText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s₱.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNumber(...values) {
  for (const value of values) {
    if (!hasValue(value)) continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;

    const cleaned = String(value)
      .replace(/php/gi, "")
      .replace(/[₱,\s]/g, "")
      .trim();

    const number = Number(cleaned);
    if (Number.isFinite(number)) return number;
  }

  return null;
}

function getText(...values) {
  for (const value of values) {
    if (hasValue(value)) return String(value).trim();
  }

  return "";
}

function formatMoney(value) {
  const number = getNumber(value);
  if (number === null) return null;

  return `₱${number.toLocaleString("en-PH", {
    maximumFractionDigits: number % 1 === 0 ? 0 : 2,
  })}`;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function getByPath(source, path) {
  if (!source || !path) return undefined;

  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, source);
}

function getFirstNumber(source, paths = []) {
  for (const path of paths) {
    const value = getByPath(source, path);
    const number = getNumber(value);
    if (number !== null) return number;
  }

  return null;
}

function getFirstArray(source, paths = []) {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (Array.isArray(value)) return value;
  }

  return [];
}

function sumNumbers(values = []) {
  return asArray(values).reduce((sum, value) => {
    const number = getNumber(value);
    return number === null ? sum : sum + number;
  }, 0);
}

function clampPercent(value) {
  const number = getNumber(value);
  if (number === null) return null;
  return Math.max(0, Math.min(number, 100));
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getDateMonthKey(value) {
  if (!hasValue(value)) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getExpenseDate(expense = {}) {
  return getText(
    expense.date,
    expense.created_at,
    expense.createdAt,
    expense.spent_at,
    expense.logged_at,
    expense.transaction_date,
    expense.transactionDate
  );
}

function getTransactionDate(transaction = {}) {
  return getText(
    transaction.date,
    transaction.created_at,
    transaction.createdAt,
    transaction.transaction_date,
    transaction.transactionDate,
    transaction.logged_at
  );
}

function getExpenseAmount(expense = {}) {
  return getNumber(
    expense.amount,
    expense.total,
    expense.value,
    expense.expense_amount,
    expense.spent_amount,
    expense.price
  );
}

function getWalletName(wallet = {}) {
  return getText(wallet.name, wallet.wallet_name, wallet.title, wallet.label, "Wallet");
}

function getWalletBalance(wallet = {}) {
  return getNumber(
    wallet.balance,
    wallet.current_balance,
    wallet.wallet_balance,
    wallet.available_balance,
    wallet.amount,
    wallet.total
  );
}

function normalizeWallet(wallet = {}) {
  return {
    id: wallet.id || wallet.wallet_id || wallet.local_id || getWalletName(wallet),
    name: getWalletName(wallet),
    balance: getWalletBalance(wallet),
    raw: wallet,
  };
}

function normalizeExpense(expense = {}) {
  const amount = getExpenseAmount(expense);
  const date = getExpenseDate(expense);

  const planningStatus = cleanText(
    getText(expense.planning_status, expense.planningStatus, expense.status)
  );

  const needType = cleanText(
    getText(expense.need_type, expense.needType, expense.type, expense.spending_type)
  );

  const isPlanned =
    planningStatus.includes("planned") && !planningStatus.includes("unplanned")
      ? true
      : planningStatus.includes("unplanned")
        ? false
        : typeof expense.planned === "boolean"
          ? expense.planned
          : typeof expense.is_planned === "boolean"
            ? expense.is_planned
            : null;

  const isNeed =
    needType.includes("need") && !needType.includes("want")
      ? true
      : needType.includes("want")
        ? false
        : null;

  return {
    id: expense.id || expense.expense_id || expense.local_id || `${date}-${amount}`,
    amount,
    date,
    monthKey: getDateMonthKey(date),
    category: getText(expense.category, expense.category_name, expense.type, "Expense"),
    merchant: getText(expense.merchant, expense.name, expense.title, expense.note),
    walletId: expense.wallet_id || expense.walletId || expense.wallet,
    planningStatus,
    needType,
    isPlanned,
    isNeed,
    raw: expense,
  };
}

function normalizeWalletTransaction(transaction = {}) {
  const amount = getNumber(
    transaction.amount,
    transaction.value,
    transaction.total,
    transaction.transaction_amount
  );

  const type = cleanText(
    getText(transaction.type, transaction.transaction_type, transaction.kind, transaction.action)
  );

  const date = getTransactionDate(transaction);

  return {
    id: transaction.id || transaction.transaction_id || transaction.local_id || `${date}-${amount}`,
    amount,
    type,
    date,
    monthKey: getDateMonthKey(date),
    walletId: transaction.wallet_id || transaction.walletId || transaction.wallet,
    title: getText(transaction.title, transaction.name, transaction.note, transaction.description),
    raw: transaction,
  };
}

function normalizeTransfer(transfer = {}) {
  const amount = getNumber(
    transfer.amount,
    transfer.value,
    transfer.total,
    transfer.transfer_amount
  );

  const date = getTransactionDate(transfer);

  return {
    id: transfer.id || transfer.transfer_id || transfer.local_id || `${date}-${amount}`,
    amount,
    date,
    monthKey: getDateMonthKey(date),
    fromWalletId: transfer.from_wallet_id || transfer.fromWalletId || transfer.from_wallet,
    toWalletId: transfer.to_wallet_id || transfer.toWalletId || transfer.to_wallet,
    title: getText(transfer.title, transfer.name, transfer.note, transfer.description, "Transfer"),
    raw: transfer,
  };
}

function normalizeBudget(budget = {}, expenses = []) {
  const category = getText(budget.category, budget.category_name, budget.name, budget.title, "Budget");

  const allocated = getNumber(
    budget.allocated,
    budget.total,
    budget.limit,
    budget.amount,
    budget.allocated_amount,
    budget.budget_amount
  );

  const explicitSpent = getNumber(
    budget.spent,
    budget.used,
    budget.current,
    budget.spent_amount,
    budget.used_amount
  );

  const month = getText(budget.month, budget.month_key, budget.period);
  const currentMonthKey = getCurrentMonthKey();
  const budgetMonth = month || currentMonthKey;

  const matchingExpenseSpent = sumNumbers(
    asArray(expenses)
      .filter((expense) => {
        const sameMonth = !expense.monthKey || expense.monthKey === budgetMonth;
        const sameCategory =
          cleanText(expense.category) === cleanText(category) ||
          cleanText(category) === "budget" ||
          cleanText(category) === "monthly budget";

        return sameMonth && sameCategory;
      })
      .map((expense) => expense.amount)
  );

  const spent = explicitSpent !== null ? explicitSpent : matchingExpenseSpent || null;

  const explicitRemaining = getNumber(
    budget.remaining,
    budget.left,
    budget.available,
    budget.remaining_amount
  );

  const remaining =
    explicitRemaining !== null
      ? explicitRemaining
      : allocated !== null
        ? allocated - (spent || 0)
        : null;

  return {
    id: budget.id || budget.budget_id || budget.local_id || category,
    name: category,
    category,
    allocated,
    spent,
    remaining,
    month,
    needsPercent: getNumber(budget.needs_percent, budget.needsPercentage, budget.needs),
    wantsPercent: getNumber(budget.wants_percent, budget.wantsPercentage, budget.wants),
    raw: budget,
  };
}

function normalizeSavingsGoal(goal = {}) {
  const saved = getNumber(
    goal.saved,
    goal.current,
    goal.saved_amount,
    goal.current_amount,
    goal.amount,
    goal.progress
  );

  const target = getNumber(
    goal.target,
    goal.goal,
    goal.target_amount,
    goal.goal_amount,
    goal.required_amount
  );

  return {
    id: goal.id || goal.goal_id || goal.local_id || goal.title || "savings-goal",
    name: getText(goal.name, goal.title, goal.goal_name, "Savings goal"),
    saved,
    target,
    percent: saved !== null && target !== null && target > 0 ? clampPercent((saved / target) * 100) : null,
    raw: goal,
  };
}

function buildEmergencyFund(context = {}) {
  const emergencyFund = context.emergencyFund || context.emergency_fund || {};

  const saved = getNumber(
    emergencyFund.saved,
    emergencyFund.current,
    emergencyFund.currentAmount,
    emergencyFund.current_amount,
    emergencyFund.amount,
    emergencyFund.saved_amount,
    context.emergencyFundSaved,
    context.emergency_fund_saved
  );

  const target = getNumber(
    emergencyFund.target,
    emergencyFund.goal,
    emergencyFund.targetAmount,
    emergencyFund.target_amount,
    emergencyFund.goal_amount,
    context.emergencyFundTarget,
    context.emergency_fund_target,
    context.survivalExpense
  );

  const monthsCovered = getNumber(
    emergencyFund.monthsCovered,
    emergencyFund.months_covered,
    emergencyFund.months,
    context.emergencyFundMonths,
    context.emergency_fund_months
  );

  const explicitPercent = clampPercent(
    emergencyFund.percentage ||
      emergencyFund.percent ||
      emergencyFund.progressPercent ||
      emergencyFund.progress_percent
  );

  const percent =
    explicitPercent !== null
      ? explicitPercent
      : saved !== null && target !== null && target > 0
        ? clampPercent((saved / target) * 100)
        : null;

  return {
    saved,
    target,
    monthsCovered,
    percent,
    remaining: saved !== null && target !== null ? Math.max(target - saved, 0) : null,
    summary: getText(emergencyFund.summary),
    raw: emergencyFund,
  };
}

function getPurchasePrice(message = "") {
  const normalized = String(message || "").replace(/,/g, "");

  const matches = [...normalized.matchAll(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isFinite(number) && number > 0);

  if (matches.length === 0) return null;

  return Math.max(...matches);
}

function buildSpendingBreakdown(expenses = [], currentMonthKey = getCurrentMonthKey()) {
  const safeExpenses = asArray(expenses);
  const datedExpenses = safeExpenses.filter((expense) => expense.monthKey);

  const currentMonthExpenses =
    datedExpenses.length > 0
      ? safeExpenses.filter((expense) => expense.monthKey === currentMonthKey)
      : safeExpenses;

  const monthlySpent = sumNumbers(currentMonthExpenses.map((expense) => expense.amount));
  const totalSpent = sumNumbers(safeExpenses.map((expense) => expense.amount));

  const plannedSpent = sumNumbers(
    currentMonthExpenses
      .filter((expense) => expense.isPlanned === true)
      .map((expense) => expense.amount)
  );

  const unplannedSpent = sumNumbers(
    currentMonthExpenses
      .filter((expense) => expense.isPlanned === false)
      .map((expense) => expense.amount)
  );

  const needsSpent = sumNumbers(
    currentMonthExpenses
      .filter((expense) => expense.isNeed === true)
      .map((expense) => expense.amount)
  );

  const wantsSpent = sumNumbers(
    currentMonthExpenses
      .filter((expense) => expense.isNeed === false)
      .map((expense) => expense.amount)
  );

  const spendingByCategory = currentMonthExpenses.reduce((map, expense) => {
    const category = getText(expense.category, "Expense");
    const amount = getNumber(expense.amount) || 0;
    map[category] = (map[category] || 0) + amount;
    return map;
  }, {});

  const topCategory =
    Object.entries(spendingByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }))[0] || null;

  return {
    currentMonthExpenses,
    monthlySpent: currentMonthExpenses.length ? monthlySpent : null,
    monthlySpentLabel: datedExpenses.length > 0 ? "this month" : "visible expenses",
    totalSpent: safeExpenses.length ? totalSpent : null,
    plannedSpent: plannedSpent > 0 ? plannedSpent : null,
    unplannedSpent: unplannedSpent > 0 ? unplannedSpent : null,
    needsSpent: needsSpent > 0 ? needsSpent : null,
    wantsSpent: wantsSpent > 0 ? wantsSpent : null,
    spendingByCategory,
    topCategory,
    hasDatedExpenses: datedExpenses.length > 0,
  };
}

function hasActiveBudgetPlan(snapshot = {}) {
  if (snapshot.hasActiveBudgetPlan === true) return true;

  const allocated = getNumber(snapshot.budgetAllocated, snapshot.totalBudgetAllocated);
  if (allocated !== null && allocated > 0) return true;

  return asArray(snapshot.budgets).some((budget) => {
    const budgetAllocated = getNumber(
      budget.allocated,
      budget.total,
      budget.limit,
      budget.amount,
      budget.allocated_amount,
      budget.budget_amount
    );

    return budgetAllocated !== null && budgetAllocated > 0;
  });
}

function getBudgetPressure(snapshot = {}) {
  if (!hasActiveBudgetPlan(snapshot)) return "none";

  if (snapshot.budgetRemaining !== null && snapshot.budgetRemaining <= 0) return "high";

  if (
    snapshot.budgetAllocated !== null &&
    snapshot.budgetAllocated > 0 &&
    snapshot.budgetRemaining !== null &&
    snapshot.budgetRemaining < snapshot.budgetAllocated * 0.2
  ) {
    return "medium";
  }

  return "low";
}

export function buildClaraFinanceSnapshot(context = {}) {
  const source = {
    ...(context?.financeSnapshot || {}),
    ...(context?.dashboardSnapshot || {}),
    ...(context || {}),
  };

  const wallets = getFirstArray(source, ["wallets", "userWallets", "finance.wallets"]).map(
    normalizeWallet
  );

  const rawExpenses = getFirstArray(source, [
    "expenses",
    "monthlyExpensesList",
    "recentExpenses",
    "finance.expenses",
  ]);

  const expenses = rawExpenses.map(normalizeExpense);

  const walletTransactions = getFirstArray(source, [
    "walletTransactions",
    "wallet_transactions",
    "transactions",
    "finance.walletTransactions",
  ]).map(normalizeWalletTransaction);

  const transfers = getFirstArray(source, [
    "transfers",
    "walletTransfers",
    "wallet_transfers",
    "finance.transfers",
  ]).map(normalizeTransfer);

  const rawBudgets = [
    ...getFirstArray(source, ["budgets", "budgetList", "finance.budgets"]),
    ...(source.budget ? [source.budget] : []),
  ];

  const budgets = rawBudgets.map((budget) => normalizeBudget(budget, expenses));

  const rawSavingsGoals = [
    ...getFirstArray(source, ["savingsGoals", "savings_goals", "goals", "finance.savingsGoals"]),
    ...(source.savings && !Array.isArray(source.savings) ? [source.savings] : []),
    ...(source.savingsGoal ? [source.savingsGoal] : []),
  ];

  const savingsGoals = rawSavingsGoals.map(normalizeSavingsGoal);

  const walletBalances = wallets
    .map((wallet) => wallet.balance)
    .filter((balance) => balance !== null);

  const walletTotal = walletBalances.length ? sumNumbers(walletBalances) : null;

  const availableMoney = getFirstNumber(source, [
    "totalAvailableMoney",
    "totalMoneyLeft",
    "moneyLeftThisMonth",
    "availableMoney",
    "walletMoney",
    "totalWalletBalance",
    "cashAvailable",
    "finance.availableMoney",
  ]);

  const totalWalletBalance =
    getFirstNumber(source, ["totalWalletBalance", "walletMoney", "finance.totalWalletBalance"]) ??
    walletTotal;

  const spendingBreakdown = buildSpendingBreakdown(expenses);

  const monthlySpent =
    getFirstNumber(source, [
      "monthlySpent",
      "totalExpensesThisMonth",
      "thisMonthSpent",
      "monthlyExpenses",
      "spentThisMonth",
      "finance.monthlySpent",
    ]) ?? spendingBreakdown.monthlySpent;

  const budgetAllocated =
    getFirstNumber(source, ["budgetAllocated", "totalBudgetAllocated"]) ??
    (budgets.length ? sumNumbers(budgets.map((budget) => budget.allocated)) : null);

  const budgetSpent =
    getFirstNumber(source, ["budgetSpent", "totalBudgetSpent"]) ??
    (budgets.length ? sumNumbers(budgets.map((budget) => budget.spent)) : monthlySpent);

  const explicitBudgetRemaining = getFirstNumber(source, [
    "budgetRemaining",
    "totalBudgetRemaining",
  ]);

  const budgetRemaining =
    explicitBudgetRemaining !== null
      ? explicitBudgetRemaining
      : budgets.length
        ? sumNumbers(budgets.map((budget) => budget.remaining))
        : budgetAllocated !== null && budgetSpent !== null
          ? budgetAllocated - budgetSpent
          : null;

  const savingsSaved =
    getFirstNumber(source, ["totalSavingsSaved", "savingsSaved", "savedAmount"]) ??
    (savingsGoals.length ? sumNumbers(savingsGoals.map((goal) => goal.saved)) : null);

  const savingsTarget =
    getFirstNumber(source, ["totalSavingsTarget", "savingsTarget", "targetSavings"]) ??
    (savingsGoals.length ? sumNumbers(savingsGoals.map((goal) => goal.target)) : null);

  const emergencyFund = buildEmergencyFund(source);

  const transactionIncome = sumNumbers(
    walletTransactions
      .filter((transaction) =>
        ["income", "add", "deposit", "fund", "funds", "add_money"].some((word) =>
          transaction.type.includes(word)
        )
      )
      .map((transaction) => transaction.amount)
  );

  const income =
    getFirstNumber(source, [
      "income",
      "monthlyIncome",
      "incomeThisMonth",
      "totalIncome",
      "addedFunds",
      "addFunds",
      "fundsAdded",
      "finance.income",
    ]) ?? (transactionIncome || null);

  const resolvedAvailableMoney = availableMoney ?? totalWalletBalance;

  const hasAnyData = Boolean(
    wallets.length ||
      expenses.length ||
      walletTransactions.length ||
      transfers.length ||
      budgets.length ||
      savingsGoals.length ||
      resolvedAvailableMoney !== null ||
      monthlySpent !== null ||
      budgetAllocated !== null ||
      budgetSpent !== null ||
      budgetRemaining !== null ||
      savingsSaved !== null ||
      savingsTarget !== null ||
      emergencyFund.saved !== null ||
      emergencyFund.target !== null ||
      income !== null
  );

  const hasActiveBudgetPlanValue =
    (budgetAllocated !== null && budgetAllocated > 0) ||
    budgets.some((budget) => budget.allocated !== null && budget.allocated > 0);

  return {
    rawContext: source,
    hasAnyData,
    dataStatus: hasAnyData ? "ready" : "loading",
    hasActiveBudgetPlan: hasActiveBudgetPlanValue,

    wallets,
    walletCount: wallets.length,
    walletBalances: wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      balance: wallet.balance,
    })),
    totalBalance: totalWalletBalance,
    totalWalletBalance,
    availableMoney: resolvedAvailableMoney,

    expenses,
    expenseCount: expenses.length,
    currentMonthExpenses: spendingBreakdown.currentMonthExpenses,
    monthlySpent,
    totalExpensesCurrentMonth: monthlySpent,
    monthlySpentLabel: spendingBreakdown.monthlySpentLabel,
    totalSpent: spendingBreakdown.totalSpent,
    plannedSpent: spendingBreakdown.plannedSpent,
    unplannedSpent: spendingBreakdown.unplannedSpent,
    needsSpent: spendingBreakdown.needsSpent,
    wantsSpent: spendingBreakdown.wantsSpent,
    spendingByCategory: spendingBreakdown.spendingByCategory,
    topSpendingCategory: spendingBreakdown.topCategory,

    walletTransactions,
    transfers,

    budgets,
    budgetAllocated,
    budgetSpent,
    budgetRemaining,
    remainingBudget: budgetRemaining,
    effectiveBudgetRemaining: hasActiveBudgetPlanValue ? budgetRemaining : null,
    budgetPressure: getBudgetPressure({
      budgetAllocated,
      budgetRemaining,
      budgets,
      hasActiveBudgetPlan: hasActiveBudgetPlanValue,
    }),

    savingsGoals,
    savingsSaved,
    savingsTarget,
    savingsProgress:
      savingsSaved !== null && savingsTarget !== null && savingsTarget > 0
        ? clampPercent((savingsSaved / savingsTarget) * 100)
        : null,

    emergencyFund,
    income,
  };
}

export function hasUsableClaraSnapshot(snapshot = {}) {
  return Boolean(snapshot?.hasAnyData);
}

export function detectClaraIntent(message = "") {
  const text = cleanText(message);

  if (!text) return INTENTS.UNKNOWN;

  if (
    /\b(before i buy|before buying|before i purchase|before purchasing|should i buy|can i buy|can i afford|afford this|is it okay to buy|purchase decision|buy this)\b/.test(
      text
    )
  ) {
    return INTENTS.PURCHASE_DECISION;
  }

  if (/\b(predict|forecast|future|where will my money|next week|next month|financial future)\b/.test(text)) {
    return INTENTS.FUTURE_FORECAST;
  }

  if (
    /\b(check my spending|spending check|spending|spent|spend|expenses|expense|leaks|overspend|unplanned|wants|needs)\b/.test(
      text
    )
  ) {
    return INTENTS.SPENDING_CHECK;
  }

  if (/\b(wallet health|wallets|wallet|balance health|cash health)\b/.test(text)) {
    return INTENTS.WALLET_HEALTH;
  }

  if (
    /\b(how much do i have|how much money do i have|available money|money left|how much money|left to spend|can spend|remaining money|cash left|total balance|balance)\b/.test(
      text
    )
  ) {
    return INTENTS.AVAILABLE_MONEY;
  }

  if (/\b(budget|budget check|budget health|budget left|budget remaining|remaining budget)\b/.test(text)) {
    return INTENTS.BUDGET_CHECK;
  }

  if (/\b(savings check|savings|saving|save|goal|goals|on track)\b/.test(text)) {
    return INTENTS.SAVINGS_CHECK;
  }

  if (/\b(emergency fund|emergency|survival buffer|buffer)\b/.test(text)) {
    return INTENTS.EMERGENCY_FUND_CHECK;
  }

  if (/\b(warning|warn|watch today|careful today|what should i watch|daily check|today)\b/.test(text)) {
    return INTENTS.DAILY_WARNING;
  }

  return INTENTS.UNKNOWN;
}

function getAvailabilityTone(amount) {
  if (amount === null) return "";
  if (amount <= 0) return "Pause non-essential spending first. You are in a tight zone.";
  if (amount < 1000) return "Your buffer is thin. Protect it from small leaks today.";
  if (amount < 5000) return "You still have room, but watch small daily leaks.";
  return "You have breathing room, but still spend with intention.";
}

function getPressureTone(snapshot = {}) {
  const available = snapshot.availableMoney;
  const spent = snapshot.monthlySpent;
  const budgetRemaining = hasActiveBudgetPlan(snapshot) ? snapshot.budgetRemaining : null;

  if (available !== null && available <= 0) {
    return "Your available money is tight, so protect essentials only.";
  }

  if (budgetRemaining !== null && budgetRemaining <= 0) {
    return "Your active budget is already pressured, so pause wants first.";
  }

  if (available !== null && spent !== null && spent > available) {
    return "Spending is already heavier than your visible available money.";
  }

  if (snapshot.unplannedSpent !== null && snapshot.unplannedSpent > 0) {
    return "The main risk is unplanned spending, not one big mistake.";
  }

  if (snapshot.wantsSpent !== null && snapshot.needsSpent !== null && snapshot.wantsSpent > snapshot.needsSpent) {
    return "Wants are taking more space than needs, so slow down before adding more.";
  }

  return "You are not in panic mode, but consistency will decide the outcome.";
}

export function generateSpendingCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  const spent = snapshot.monthlySpent !== null ? formatMoney(snapshot.monthlySpent) : null;
  const available = snapshot.availableMoney !== null ? formatMoney(snapshot.availableMoney) : null;
  const topCategory = snapshot.topSpendingCategory;

  if (!spent && !available) {
    return "I need your spending or wallet data before I can judge your spending clearly.";
  }

  const parts = [];

  if (spent) {
    parts.push(`You’ve spent ${spent} in ${snapshot.monthlySpentLabel || "this period"}.`);
  }

  if (topCategory?.category && topCategory?.amount) {
    parts.push(`Your biggest category is ${topCategory.category} at ${formatMoney(topCategory.amount)}.`);
  }

  if (available) {
    parts.push(`You still have ${available} available.`);
  }

  if (snapshot.unplannedSpent !== null) {
    parts.push(`Unplanned spending is ${formatMoney(snapshot.unplannedSpent)}, so that is the first leak to watch.`);
  } else if (snapshot.wantsSpent !== null) {
    parts.push(`Wants spending is ${formatMoney(snapshot.wantsSpent)}, so pause before adding more wants.`);
  } else {
    parts.push(getPressureTone(snapshot));
  }

  return parts.filter(Boolean).join(" ");
}

export function generateWalletHealth(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  if (!snapshot.wallets.length && snapshot.availableMoney === null) {
    return "I do not see wallet details loaded yet. Add or load wallets first so I can check wallet health.";
  }

  const total =
    snapshot.totalWalletBalance !== null
      ? snapshot.totalWalletBalance
      : snapshot.availableMoney !== null
        ? snapshot.availableMoney
        : null;

  const topWallets = snapshot.wallets
    .slice(0, 3)
    .map((wallet) => {
      const balance = wallet.balance !== null ? formatMoney(wallet.balance) : null;
      return balance ? `${wallet.name} (${balance})` : wallet.name;
    })
    .filter(Boolean);

  const totalText = total !== null ? `Total visible wallet balance is ${formatMoney(total)}.` : "";
  const walletText = topWallets.length ? `Main wallets: ${topWallets.join(", ")}.` : "";
  const tone = total !== null ? getAvailabilityTone(total) : "Keep your main spending wallet visible before buying.";

  return [totalText, walletText, tone].filter(Boolean).join(" ");
}

export function generateAvailableMoneyReply(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  if (snapshot.availableMoney === null) {
    return "I need your available money or wallet balance before I can answer that clearly.";
  }

  const available = formatMoney(snapshot.availableMoney);

  const spent =
    snapshot.monthlySpent !== null
      ? `You have already spent ${formatMoney(snapshot.monthlySpent)} in ${snapshot.monthlySpentLabel || "this period"}.`
      : "";

  return [`You currently have ${available} available.`, spent, getAvailabilityTone(snapshot.availableMoney)]
    .filter(Boolean)
    .join(" ");
}

export function generateBudgetCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  const activeBudget = hasActiveBudgetPlan(snapshot);

  if (!activeBudget) {
    const available =
      snapshot.availableMoney !== null
        ? ` You currently have ${formatMoney(snapshot.availableMoney)} available, so use that as the temporary spending boundary.`
        : "";

    return `I do not see an active budget plan loaded yet.${available} Set a budget before treating any purchase as budget-approved.`;
  }

  const allocated = snapshot.budgetAllocated !== null ? formatMoney(snapshot.budgetAllocated) : null;
  const spent = snapshot.budgetSpent !== null ? formatMoney(snapshot.budgetSpent) : null;
  const remaining = snapshot.budgetRemaining !== null ? formatMoney(snapshot.budgetRemaining) : null;

  if (allocated && spent && remaining) {
    const pressure =
      snapshot.budgetRemaining <= 0
        ? "Stop wants first. Your active budget is already at the safe line."
        : snapshot.budgetAllocated > 0 && snapshot.budgetRemaining < snapshot.budgetAllocated * 0.2
          ? "The margin is thin, so keep today defensive."
          : "There is still breathing room, but do not let wants eat it quietly.";

    return `Budget check: ${spent} spent out of ${allocated}. Remaining: ${remaining}. ${pressure}`;
  }

  if (remaining) return `Your active budget remaining shows ${remaining}. Keep that protected for essentials first.`;
  if (allocated && spent) return `Budget check: ${spent} spent out of ${allocated}. Use that as your line before adding wants.`;
  if (allocated) return `Your budget allocation is ${allocated}. I need spending data to judge the pressure.`;
  if (spent) return `Your budget spending shows ${spent}. I need the budget limit to judge if it is safe.`;

  return "I can see a budget section, but the values are not clear enough yet.";
}

export function generateSavingsCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  if (snapshot.savingsSaved === null && snapshot.savingsTarget === null && !snapshot.savingsGoals.length) {
    return "I do not see savings goals loaded yet. Add a savings goal so CLARA can protect it before you spend.";
  }

  const saved = snapshot.savingsSaved !== null ? formatMoney(snapshot.savingsSaved) : null;
  const target = snapshot.savingsTarget !== null ? formatMoney(snapshot.savingsTarget) : null;

  if (snapshot.savingsSaved !== null && snapshot.savingsTarget !== null && snapshot.savingsTarget > 0) {
    const percent = Math.min((snapshot.savingsSaved / snapshot.savingsTarget) * 100, 100);

    return `Savings check: ${saved} saved out of ${target}. That is about ${percent.toFixed(
      0
    )}% complete. Protect this from impulse spending.`;
  }

  if (saved) return `Your saved amount is ${saved}. That is progress worth protecting.`;
  if (target) return `Your savings target is ${target}. I need saved progress to check if you are on track.`;

  return "I can see savings data, but the saved and target values are not clear yet.";
}

export function generateEmergencyFundCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  const emergency = snapshot.emergencyFund || {};
  const saved = emergency.saved !== null ? formatMoney(emergency.saved) : null;
  const target = emergency.target !== null ? formatMoney(emergency.target) : null;

  if (emergency.summary) return emergency.summary;

  if (saved && target && emergency.monthsCovered !== null) {
    return `Emergency fund: ${saved} out of ${target}, covering about ${emergency.monthsCovered} month${
      emergency.monthsCovered === 1 ? "" : "s"
    }. Keep this protected from wants.`;
  }

  if (saved && target) {
    const percent =
      emergency.percent !== null
        ? emergency.percent
        : emergency.target > 0
          ? Math.min((emergency.saved / emergency.target) * 100, 100)
          : null;

    const percentText = percent !== null ? ` That is about ${percent.toFixed(0)}%.` : "";

    return `Emergency fund: ${saved} out of ${target}.${percentText} Build this before lifestyle upgrades.`;
  }

  if (saved) return `Your emergency fund shows ${saved}. Treat that as protection money, not extra spending money.`;
  if (target) return `Your emergency fund target is ${target}. I need the saved amount to judge your buffer.`;

  if (snapshot.availableMoney !== null) {
    return `I do not see a dedicated emergency fund yet. Based only on available money, you have ${formatMoney(
      snapshot.availableMoney
    )} visible, but that is not the same as protected emergency savings.`;
  }

  return "I do not see emergency fund details loaded yet.";
}

export function generateFutureForecast(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  const signals = [];

  if (snapshot.availableMoney !== null) {
    signals.push(`available money: ${formatMoney(snapshot.availableMoney)}`);
  }

  if (snapshot.monthlySpent !== null) {
    signals.push(`${snapshot.monthlySpentLabel || "spending"}: ${formatMoney(snapshot.monthlySpent)}`);
  }

  if (snapshot.budgetRemaining !== null) {
    signals.push(`budget remaining: ${formatMoney(snapshot.budgetRemaining)}`);
  }

  if (snapshot.savingsSaved !== null) {
    signals.push(`savings: ${formatMoney(snapshot.savingsSaved)}`);
  }

  if (snapshot.emergencyFund?.saved !== null) {
    signals.push(`emergency fund: ${formatMoney(snapshot.emergencyFund.saved)}`);
  }

  const risk = getPressureTone(snapshot);

  if (!signals.length) return CLARA_NOT_ENOUGH_DATA_REPLY;

  return `Forecast: if nothing changes, ${risk.toLowerCase()} I am basing this only on loaded data: ${signals.join(
    ", "
  )}.`;
}

export function generatePurchaseDecisionReply(message = "", snapshot = {}) {
  const price = getPurchasePrice(message);

  if (price === null) {
    return "What are you planning to buy, and how much is it?";
  }

  if (!snapshot.hasAnyData) {
    return CLARA_LOADING_REPLY;
  }

  const priceText = formatMoney(price);
  const available = snapshot.availableMoney;
  const activeBudget = hasActiveBudgetPlan(snapshot);
  const budgetRemaining = activeBudget ? snapshot.budgetRemaining : null;
  const savingsSaved = snapshot.savingsSaved;
  const emergencySaved = snapshot.emergencyFund?.saved;
  const notes = [];

  if (available === null && budgetRemaining === null) {
    return "I need your available money or an active budget before I can judge this purchase clearly.";
  }

  if (available !== null && price > available) {
    notes.push(`Not recommended. This is around ${priceText}, but you only have ${formatMoney(available)} available.`);
    notes.push("Pause this and protect essentials first.");
    return notes.join(" ");
  }

  if (activeBudget && budgetRemaining !== null && price > budgetRemaining) {
    notes.push(
      `Better delay. You have ${available !== null ? formatMoney(available) : "some money"} available, but only ${formatMoney(
        budgetRemaining
      )} remains in your active budget.`
    );
    notes.push("Rebalance first or reduce the cost.");
    return notes.join(" ");
  }

  if (available !== null) {
    const share = price / available;

    if (!activeBudget) {
      if (share >= 0.75) {
        notes.push(`Not recommended. You have ${formatMoney(available)} money left, but ${priceText} would use almost all of it.`);
        notes.push("No active budget plan is loaded yet, so delay this or set a budget first.");
        return notes.join(" ");
      }

      if (share >= 0.12) {
        notes.push(`Better delay. You have ${formatMoney(available)} money left, but ${priceText} is a noticeable bite without an active budget plan.`);
        notes.push("Buy only if this is planned, important, and still worth it tomorrow.");
        return notes.join(" ");
      }

      notes.push(`Okay with limit. You have ${formatMoney(available)} money left, but no active budget plan is loaded yet.`);
      notes.push(`${priceText} is affordable, but log it and keep it intentional.`);
      return notes.join(" ");
    }

    if (share >= 0.75) {
      notes.push(`Not recommended. ${priceText} would use most of your ${formatMoney(available)} money left.`);
      notes.push("Delay this unless it is urgent and already planned.");
      return notes.join(" ");
    }

    if (share >= 0.25) {
      notes.push(`Risky. ${priceText} takes a big bite from your available money.`);
      notes.push("Only proceed if it is a real need and already planned.");
      return notes.join(" ");
    }

    if (share >= 0.12) {
      notes.push(`Okay with limit. ${priceText} is affordable, but it is still noticeable against your ${formatMoney(available)} money left.`);
      notes.push("Buy only if it is planned.");
      return notes.join(" ");
    }
  }

  if (savingsSaved !== null && savingsSaved > 0 && price > savingsSaved * 0.2) {
    notes.push(`Risky. The price is manageable, but it can slow your savings momentum.`);
    notes.push("Delay it if it does not support your current goal.");
    return notes.join(" ");
  }

  if (emergencySaved !== null && emergencySaved <= 0) {
    notes.push(`Okay only if necessary. The purchase may fit, but your emergency buffer is not protected yet.`);
    notes.push("Build your buffer before lifestyle upgrades.");
    return notes.join(" ");
  }

  notes.push(`Safe, but still intentional. ${priceText} looks manageable based on your loaded data.`);
  notes.push("Log it after buying and keep it aligned with your goal.");

  return notes.join(" ");
}

export function generateDailyWarning(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;

  if (snapshot.availableMoney !== null && snapshot.availableMoney <= 0) {
    return "Today’s warning: protect essentials only. Your available money is already tight.";
  }

  if (hasActiveBudgetPlan(snapshot) && snapshot.budgetRemaining !== null && snapshot.budgetRemaining <= 0) {
    return "Today’s warning: stop wants first. Your active budget is already at the danger line.";
  }

  if (snapshot.unplannedSpent !== null && snapshot.unplannedSpent > 0) {
    return `Today’s warning: watch unplanned spending. I can see ${formatMoney(
      snapshot.unplannedSpent
    )} unplanned, so pause before small purchases.`;
  }

  if (snapshot.wantsSpent !== null && snapshot.needsSpent !== null && snapshot.wantsSpent > snapshot.needsSpent) {
    return "Today’s warning: wants are taking too much space. Keep spending defensive today.";
  }

  if (snapshot.availableMoney !== null && snapshot.availableMoney < 1000) {
    return `Today’s warning: your buffer is thin at ${formatMoney(
      snapshot.availableMoney
    )}. Avoid small leaks and protect essentials.`;
  }

  if (snapshot.monthlySpent !== null && snapshot.availableMoney !== null) {
    const budgetNote = hasActiveBudgetPlan(snapshot)
      ? " Check your active budget before adding wants."
      : " No active budget plan is loaded yet, so use your money left as the temporary boundary.";

    return `Today’s warning: you have ${formatMoney(snapshot.availableMoney)} available and ${formatMoney(
      snapshot.monthlySpent
    )} spent.${budgetNote}`;
  }

  return "Today’s warning: stay intentional. Before spending, check if it is planned, needed, and aligned with your goal.";
}

export function generateClaraLocalReply(message = "", context = {}) {
  const snapshot = buildClaraFinanceSnapshot(context);
  const intent = detectClaraIntent(message);

  if (intent === INTENTS.UNKNOWN) return CLARA_UNKNOWN_REPLY;

  switch (intent) {
    case INTENTS.FUTURE_FORECAST:
      return generateFutureForecast(snapshot);

    case INTENTS.SPENDING_CHECK:
      return generateSpendingCheck(snapshot);

    case INTENTS.WALLET_HEALTH:
      return generateWalletHealth(snapshot);

    case INTENTS.AVAILABLE_MONEY:
      return generateAvailableMoneyReply(snapshot);

    case INTENTS.BUDGET_CHECK:
      return generateBudgetCheck(snapshot);

    case INTENTS.SAVINGS_CHECK:
      return generateSavingsCheck(snapshot);

    case INTENTS.EMERGENCY_FUND_CHECK:
      return generateEmergencyFundCheck(snapshot);

    case INTENTS.PURCHASE_DECISION:
      return generatePurchaseDecisionReply(message, snapshot);

    case INTENTS.DAILY_WARNING:
      return generateDailyWarning(snapshot);

    default:
      return CLARA_UNKNOWN_REPLY;
  }
}

export const CLARA_LOCAL_INTENTS = INTENTS;
