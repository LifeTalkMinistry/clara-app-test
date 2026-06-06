const NOT_AVAILABLE = "Not available";
const MISSING = "Missing";

function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return Boolean(value);
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function amount(value) {
  if (!hasValue(value)) return NOT_AVAILABLE;
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function text(value) {
  return hasValue(value) ? String(value).trim() : MISSING;
}

function percent(value) {
  if (!hasValue(value)) return NOT_AVAILABLE;
  const number = toNumber(value);
  return Number.isFinite(number) ? `${Math.round(number)}%` : NOT_AVAILABLE;
}

function normalizeCompleteness(value = "") {
  const normalized = String(value || "weak").trim().toLowerCase();
  if (normalized === "strong") return "strong";
  if (normalized === "medium" || normalized === "partial") return "medium";
  return "weak";
}

function labelCompleteness(value = "") {
  const normalized = normalizeCompleteness(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function readinessFor(completeness = "weak") {
  const normalized = normalizeCompleteness(completeness);

  if (normalized === "strong") {
    return {
      status: "READY FOR FORECAST",
      tone: "ready",
      message: "CLARA has enough local signals to generate a meaningful Future Money Forecast in the next phase.",
    };
  }

  if (normalized === "medium") {
    return {
      status: "PARTIAL FORECAST READY",
      tone: "partial",
      message: "CLARA can create a basic forecast, but some missing data may make the forecast less precise.",
    };
  }

  return {
    status: "NEEDS MORE DATA",
    tone: "needs-data",
    message: "CLARA needs more wallet, income, expense, emergency fund, or schedule data before the forecast becomes reliable.",
  };
}

function normalizeMissingData(snapshot = {}) {
  const missing = Array.isArray(snapshot.missingData) ? snapshot.missingData : [];
  return missing.map((item) => String(item || "").trim()).filter(Boolean);
}

function currentMoney(snapshot = {}) {
  const data = snapshot.currentMoney || {};
  return {
    walletCount: data.walletCount ?? snapshot.counts?.wallets,
    totalWalletBalance: data.totalWalletBalance,
    safeSpendableMoney: data.safeSpendableMoney ?? data.spendableWalletBalance,
    emergencyProtectedAmount: data.emergencyProtectedAmount,
  };
}

function moneyComingIn(snapshot = {}) {
  const data = snapshot.moneyComingIn || {};
  return {
    incomeRecordsCount: data.incomeRecordsCount ?? snapshot.counts?.income,
    incomeSourcesCount: data.incomeSourcesCount,
    expectedIncome: data.expectedIncome,
    paydayTiming: data.paydayTiming ?? snapshot.paydayInfo,
  };
}

function moneyGoingOut(snapshot = {}) {
  return snapshot.moneyGoingOut || {};
}

function budgetPressure(snapshot = {}) {
  const data = snapshot.budgetPressure || {};
  return {
    budgetsCount: data.budgetsCount ?? snapshot.counts?.budgets,
    budgetCategoriesCount: data.budgetCategoriesCount,
    budgetRemaining: data.budgetRemaining,
    plannedExpensesCount: data.plannedExpensesCount,
    unplannedExpensesCount: data.unplannedExpensesCount,
    outsidePlanSpendingCount: data.outsidePlanSpendingCount,
  };
}

function savingsPressure(snapshot = {}) {
  const data = snapshot.savingsPressure || {};
  return {
    savingsGoalsCount: data.savingsGoalsCount ?? snapshot.counts?.savingsGoals,
    savingsProgress: data.savingsProgress,
    emergencyFund: data.emergencyFund,
    goalDeadlinesCount: data.goalDeadlinesCount,
  };
}

function behaviorRisk(snapshot = {}) {
  return {
    ...(snapshot.behaviorRisk || {}),
    ...(snapshot.schedulePaydayRisk || {}),
  };
}

function stat(label, value) {
  return { label, value };
}

export function buildClaraForecastReport(snapshot = {}) {
  const completeness = normalizeCompleteness(snapshot.dataCompleteness);
  const readiness = readinessFor(completeness);
  const missingData = normalizeMissingData(snapshot);
  const money = currentMoney(snapshot);
  const incoming = moneyComingIn(snapshot);
  const outgoing = moneyGoingOut(snapshot);
  const budget = budgetPressure(snapshot);
  const savings = savingsPressure(snapshot);
  const behavior = behaviorRisk(snapshot);

  return {
    title: "FUTURE MONEY FORECAST",
    subtitle: "Swipe to review",
    completeness,
    readiness,
    missingData,
    cards: [
      {
        eyebrow: "01 / FORECAST SNAPSHOT",
        title: "Snapshot Ready",
        body: "CLARA scanned your current money signals from local records only.",
        stats: [
          stat("Data completeness level", labelCompleteness(completeness)),
          stat("Source", "Local records"),
          stat("Gemini", "Not used"),
        ],
      },
      {
        eyebrow: "02 / CURRENT MONEY POSITION",
        title: "Current Money",
        body: "This is the money CLARA can currently see before forecasting future pressure.",
        stats: [
          stat("Wallets found", count(money.walletCount)),
          stat("Total wallet balance", amount(money.totalWalletBalance)),
          stat("Safe spendable money", amount(money.safeSpendableMoney)),
          stat("Emergency protected amount", amount(money.emergencyProtectedAmount)),
        ],
      },
      {
        eyebrow: "03 / MONEY COMING IN",
        title: "Money Coming In",
        body: "This helps CLARA understand when money may refresh.",
        stats: [
          stat("Income records found", count(incoming.incomeRecordsCount)),
          stat("Income sources found", count(incoming.incomeSourcesCount)),
          stat("Expected income", amount(incoming.expectedIncome)),
          stat("Payday timing", text(incoming.paydayTiming)),
        ],
      },
      {
        eyebrow: "04 / MONEY GOING OUT",
        title: "Money Going Out",
        body: "This shows the pressure that can reduce your money before the next payday.",
        stats: [
          stat("Expenses found", count(outgoing.expensesCount)),
          stat("Transactions found", count(outgoing.transactionsCount)),
          stat("Transfers found", count(outgoing.transfersCount)),
          stat("Recurring expenses found", count(outgoing.recurringExpensesCount)),
          stat("Subscriptions found", count(outgoing.subscriptionsCount)),
          stat("Bills found", count(outgoing.billsCount)),
          stat("Debt obligations found", count(outgoing.debtObligationsCount)),
        ],
      },
      {
        eyebrow: "05 / BUDGET PRESSURE",
        title: "Budget Pressure",
        body: "This shows whether your spending is still inside your plan or starting to leak outside it.",
        stats: [
          stat("Budgets found", count(budget.budgetsCount)),
          stat("Budget categories found", count(budget.budgetCategoriesCount)),
          stat("Budget remaining", amount(budget.budgetRemaining)),
          stat("Planned expenses found", count(budget.plannedExpensesCount)),
          stat("Unplanned expenses found", count(budget.unplannedExpensesCount)),
          stat("Outside-plan spending found", count(budget.outsidePlanSpendingCount)),
        ],
      },
      {
        eyebrow: "06 / SAVINGS AND EMERGENCY PRESSURE",
        title: "Savings Pressure",
        body: "This helps CLARA protect money that should not be treated as free spending money.",
        stats: [
          stat("Savings goals found", count(savings.savingsGoalsCount)),
          stat("Savings progress", percent(savings.savingsProgress)),
          stat("Emergency fund", amount(savings.emergencyFund)),
          stat("Goal deadlines found", count(savings.goalDeadlinesCount)),
        ],
      },
      {
        eyebrow: "07 / BEHAVIOR AND ROUTINE RISK",
        title: "Behavior Risk",
        body: "This shows the personal patterns that may affect future spending.",
        stats: [
          stat("Recent expense activity", text(behavior.recentExpenseActivity)),
          stat("Unplanned spending count", count(behavior.unplannedSpendingCount)),
          stat("Stress spending habit", text(behavior.stressSpendingHabit)),
          stat("Common impulse purchases", text(behavior.commonImpulsePurchases)),
          stat("Biggest spending weakness", text(behavior.biggestSpendingWeakness)),
          stat("Work schedule", text(behavior.workSchedule)),
          stat("Sleep pattern", text(behavior.sleepPattern)),
          stat("Energy drop", text(behavior.energyDrop)),
          stat("Burnout indicators", text(behavior.burnoutIndicators)),
        ],
      },
      {
        eyebrow: "08 / FINAL FORECAST READINESS",
        title: "Forecast Readiness",
        body: readiness.message,
        final: true,
        tone: readiness.tone,
        stats: [
          stat("Status", readiness.status),
          stat("Data completeness level", labelCompleteness(completeness)),
          stat("Missing data", missingData.length ? `${missingData.length} item(s)` : "None detected"),
        ],
        missingData,
      },
    ],
  };
}
