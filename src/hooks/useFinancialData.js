import { useState, useEffect, useCallback } from "react";

// CLARA Retention Logic (consistent across Dashboard + Analytics)
// < 15% = warning/overspending
// 15–20% = safe/on-track
// > 20% = praise/excellent
export function getRetentionStatus(rate) {
  const r = parseFloat(rate);

  if (r < 0) {
    return {
      status: "Overspending",
      color: "text-destructive",
      level: "danger",
    };
  }

  if (r < 15) {
    return {
      status: "Warning",
      color: "text-orange-500",
      level: "warning",
    };
  }

  if (r <= 20) {
    return {
      status: "On Track",
      color: "text-primary",
      level: "safe",
    };
  }

  return {
    status: "Excellent",
    color: "text-primary",
    level: "praise",
  };
}

export function getCoachInsight(rate, totalIncome) {
  if (!totalIncome || totalIncome === 0) {
    return "Start logging your income and expenses to get personalized insights!";
  }

  const r = parseFloat(rate);

  if (r < 0) {
    return "⚠️ You've spent more than you earned. Review your expenses immediately and pause all non-essential spending.";
  }

  if (r < 15) {
    return "⚠️ Your leftover rate is below 15%. CLARA recommends keeping at least 15% of your income. Cut wants spending now.";
  }

  if (r <= 20) {
    return "✅ You're in the safe zone! You're keeping 15–20% of your income. Keep this up and look for ways to push past 20%.";
  }

  return "🎉 Excellent! You're retaining over 20% of your income. You're ahead of target — consider directing the extra toward a savings goal!";
}

const STORAGE_KEYS = {
  expenses: "clara_expenses",
  incomes: "clara_incomes",
  wallets: "clara_wallets",
  budgets: "clara_budgets",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export default function useFinancialData(userEmail) {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userEmail) {
      setExpenses([]);
      setIncomes([]);
      setWallets([]);
      setBudgets([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const allExpenses = getStoredData(STORAGE_KEYS.expenses);
    const allIncomes = getStoredData(STORAGE_KEYS.incomes);
    const allWallets = getStoredData(STORAGE_KEYS.wallets);
    const allBudgets = getStoredData(STORAGE_KEYS.budgets);

    const userExpenses = allExpenses
      .filter((item) => item.created_by === userEmail)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 500);

    const userIncomes = allIncomes
      .filter((item) => item.created_by === userEmail)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 500);

    const userWallets = allWallets.filter((item) => item.created_by === userEmail);

    const userBudgets = allBudgets.filter((item) => item.created_by === userEmail);

    setExpenses(userExpenses);
    setIncomes(userIncomes);
    setWallets(userWallets);
    setBudgets(userBudgets);
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const currentBudget = budgets.find((b) => b.month === currentMonth);

  const thisMonthExpenses = expenses.filter((e) => {
    if (!e.date?.startsWith(currentMonth)) return false;
    if (!currentBudget?.tracking_start_date) return true;
    return new Date(e.date) >= new Date(currentBudget.tracking_start_date);
  });

  const filteredExpenses = thisMonthExpenses;

  const totalIncome = incomes.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalRetained = totalIncome - totalExpenses;

  const retentionRate =
    totalIncome > 0 ? ((totalRetained / totalIncome) * 100).toFixed(1) : "0.0";

  const {
    status,
    color: statusColor,
    level: statusLevel,
  } = getRetentionStatus(retentionRate);

  const coachInsight = getCoachInsight(retentionRate, totalIncome);

  const needsSpent = filteredExpenses
    .filter((e) => e.need_type === "need")
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const wantsSpent = filteredExpenses
    .filter((e) => e.need_type === "want")
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const savingsSpent = filteredExpenses
    .filter((e) => e.need_type === "savings")
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const filteredTotalExpenses = filteredExpenses.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  const needsPct =
    filteredTotalExpenses > 0
      ? ((needsSpent / filteredTotalExpenses) * 100).toFixed(1)
      : "0.0";

  const wantsPct =
    filteredTotalExpenses > 0
      ? ((wantsSpent / filteredTotalExpenses) * 100).toFixed(1)
      : "0.0";

  const savingsPct =
    filteredTotalExpenses > 0
      ? ((savingsSpent / filteredTotalExpenses) * 100).toFixed(1)
      : "0.0";

  const thisMonthSpent = thisMonthExpenses.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  const thisMonthIncome = incomes
    .filter((i) => i.date?.startsWith(currentMonth))
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const walletBalances = wallets.map((wallet) => {
    const walletIncome = incomes
      .filter((i) => i.wallet_id === wallet.id)
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    const walletExpense = expenses
      .filter((e) => e.wallet_id === wallet.id)
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    return {
      ...wallet,
      currentBalance:
        (wallet.starting_balance || 0) + walletIncome - walletExpense,
      totalSpent: walletExpense,
      totalReceived: walletIncome,
    };
  });

  const monthlyData = {};

  incomes.forEach((income) => {
    const month = income.date?.substring(0, 7);
    if (!month) return;

    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expenses: 0 };
    }

    monthlyData[month].income += income.amount || 0;
  });

  expenses.forEach((expense) => {
    const month = expense.date?.substring(0, 7);
    if (!month) return;

    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expenses: 0 };
    }

    monthlyData[month].expenses += expense.amount || 0;
  });

  const monthlyBreakdown = Object.values(monthlyData).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const categoryData = {};

  expenses.forEach((expense) => {
    const category = expense.category || "Uncategorized";
    if (!categoryData[category]) categoryData[category] = 0;
    categoryData[category] += expense.amount || 0;
  });

  const categoryBreakdown = Object.entries(categoryData)
    .map(([name, value]) => ({
      name,
      value,
      pct: totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    expenses,
    incomes,
    wallets,
    budgets,
    loading,
    totalIncome,
    totalExpenses,
    totalRetained,
    retentionRate,
    needsSpent,
    wantsSpent,
    savingsSpent,
    needsPct,
    wantsPct,
    savingsPct,
    thisMonthSpent,
    thisMonthIncome,
    currentMonth,
    status,
    statusColor,
    statusLevel,
    coachInsight,
    walletBalances,
    monthlyBreakdown,
    categoryBreakdown,
    refresh: load,
  };
}