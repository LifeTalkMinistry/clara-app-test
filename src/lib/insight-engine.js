const formatPeso = (value = 0) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const normalizeLower = (value) => String(value ?? "").trim().toLowerCase();

const getAmount = (item) => {
  const amount = Number(item?.amount ?? item?.total ?? item?.value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const getCategory = (item) => {
  const category = normalizeLower(
    item?.category ||
      item?.budget_category ||
      item?.expense_category ||
      item?.classification ||
      "other"
  );

  return category || "other";
};

const getDate = (item) => {
  const raw = item?.date || item?.expense_date || item?.created_at || item?.updated_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const titleCase = (value = "") =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function generateInsights(expenses = [], budgets = []) {
  const cleanExpenses = Array.isArray(expenses)
    ? expenses.filter((item) => getAmount(item) > 0)
    : [];

  if (cleanExpenses.length === 0) return [];

  const insights = [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const monthExpenses = cleanExpenses.filter((item) => {
    const date = getDate(item);
    return date ? date >= startOfMonth : true;
  });

  const weekExpenses = cleanExpenses.filter((item) => {
    const date = getDate(item);
    return date ? date >= startOfWeek : false;
  });

  const source = monthExpenses.length ? monthExpenses : cleanExpenses;
  const totalThisMonth = source.reduce((sum, item) => sum + getAmount(item), 0);
  const totalThisWeek = weekExpenses.reduce((sum, item) => sum + getAmount(item), 0);

  const byCategory = source.reduce((acc, item) => {
    const category = getCategory(item);
    acc[category] = (acc[category] || 0) + getAmount(item);
    return acc;
  }, {});

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  if (topCategory) {
    const [category, amount] = topCategory;
    const share = totalThisMonth > 0 ? Math.round((amount / totalThisMonth) * 100) : 0;

    insights.push({
      id: "top-category",
      type: share >= 45 ? "warning" : "neutral",
      eyebrow: "Top spending area",
      title: `${titleCase(category)} is your highest expense`,
      description: `${formatPeso(amount)}${share ? ` • ${share}% of tracked spending` : ""}`,
    });
  }

  if (totalThisWeek > 0) {
    insights.push({
      id: "week-total",
      type: "neutral",
      eyebrow: "This week",
      title: `You spent ${formatPeso(totalThisWeek)} this week`,
      description: "Tap to see the full spending breakdown.",
    });
  }

  if (totalThisMonth > 0) {
    insights.push({
      id: "month-total",
      type: totalThisMonth >= 10000 ? "warning" : "positive",
      eyebrow: "Monthly snapshot",
      title:
        totalThisMonth >= 10000
          ? "Your spending is getting heavier this month"
          : "Your monthly spending is still manageable",
      description: `${formatPeso(totalThisMonth)} tracked so far.`,
    });
  }

  const budgetList = Array.isArray(budgets) ? budgets : [];
  const activeBudget = budgetList
    .map((budget) => {
      const limit = Number(
        budget?.amount ||
          budget?.budget ||
          budget?.total_budget ||
          budget?.budget_amount ||
          0
      );
      const spent = Number(
        budget?.spent || budget?.spent_amount || budget?.total_spent || 0
      );

      return {
        limit: Number.isFinite(limit) ? limit : 0,
        spent: Number.isFinite(spent) ? spent : 0,
      };
    })
    .find((budget) => budget.limit > 0);

  if (activeBudget) {
    const percent = Math.round((activeBudget.spent / activeBudget.limit) * 100);
    insights.push({
      id: "budget-progress",
      type: percent >= 90 ? "warning" : percent >= 70 ? "neutral" : "positive",
      eyebrow: "Budget pulse",
      title:
        percent >= 90
          ? "You are close to your budget limit"
          : "Your budget progress is still under control",
      description: `${Math.min(percent, 999)}% used • ${formatPeso(
        Math.max(activeBudget.limit - activeBudget.spent, 0)
      )} left`,
    });
  }

  return insights.slice(0, 5);
}
