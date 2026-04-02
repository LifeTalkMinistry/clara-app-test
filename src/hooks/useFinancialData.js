import { useState, useEffect } from "react";

/* -----------------------------
   CLARA LOGIC (KEEP SAME)
------------------------------*/
export function getRetentionStatus(rate) {
  const r = parseFloat(rate);
  if (r < 0) return { status: "Overspending", color: "text-destructive", level: "danger" };
  if (r < 15) return { status: "Warning", color: "text-orange-500", level: "warning" };
  if (r <= 20) return { status: "On Track", color: "text-primary", level: "safe" };
  return { status: "Excellent", color: "text-primary", level: "praise" };
}

export function getCoachInsight(rate, totalIncome) {
  if (!totalIncome) return "Start tracking your finances.";
  const r = parseFloat(rate);

  if (r < 0) return "⚠️ You're overspending.";
  if (r < 15) return "⚠️ Below 15%. Cut wants.";
  if (r <= 20) return "✅ Safe zone.";
  return "🎉 Excellent retention!";
}

/* -----------------------------
   MAIN HOOK (NO BASE44)
------------------------------*/
export default function useFinancialData(userEmail) {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ LOAD FROM LOCAL STORAGE
  const load = () => {
    const exp = JSON.parse(localStorage.getItem("expenses") || "[]");
    const inc = JSON.parse(localStorage.getItem("incomes") || "[]");
    const wal = JSON.parse(localStorage.getItem("wallets") || "[]");
    const bud = JSON.parse(localStorage.getItem("budgets") || "[]");

    setExpenses(exp);
    setIncomes(inc);
    setWallets(wal);
    setBudgets(bud);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userEmail]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const totalRetained = totalIncome - totalExpenses;
  const retentionRate =
    totalIncome > 0 ? ((totalRetained / totalIncome) * 100).toFixed(1) : "0.0";

  const { status, color: statusColor, level: statusLevel } =
    getRetentionStatus(retentionRate);

  const coachInsight = getCoachInsight(retentionRate, totalIncome);

  const thisMonthExpenses = expenses.filter(e =>
    e.date?.startsWith(currentMonth)
  );

  const needsSpent = thisMonthExpenses
    .filter(e => e.need_type === "need")
    .reduce((s, e) => s + (e.amount || 0), 0);

  const wantsSpent = thisMonthExpenses
    .filter(e => e.need_type === "want")
    .reduce((s, e) => s + (e.amount || 0), 0);

  const savingsSpent = thisMonthExpenses
    .filter(e => e.need_type === "savings")
    .reduce((s, e) => s + (e.amount || 0), 0);

  const thisMonthSpent = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);

  const thisMonthIncome = incomes
    .filter(i => i.date?.startsWith(currentMonth))
    .reduce((s, i) => s + i.amount, 0);

  const walletBalances = wallets.map(w => {
    const walletIncome = incomes
      .filter(i => i.wallet_id === w.id)
      .reduce((s, i) => s + i.amount, 0);

    const walletExpense = expenses
      .filter(e => e.wallet_id === w.id)
      .reduce((s, e) => s + e.amount, 0);

    return {
      ...w,
      currentBalance:
        (w.starting_balance || 0) + walletIncome - walletExpense,
    };
  });

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
    thisMonthSpent,
    thisMonthIncome,
    currentMonth,
    status,
    statusColor,
    statusLevel,
    coachInsight,
    walletBalances,
    refresh: load,
  };
}