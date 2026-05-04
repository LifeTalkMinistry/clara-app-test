import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const carouselConfig = [
  {
    key: "budget",
    type: "budget",
    label: "Budget",
    enabled: true,
    order: 1,
    detailKey: "budgets",
    tone: "emerald",
  },
  {
    key: "emergencyFund",
    type: "emergencyFund",
    label: "Emergency Fund",
    enabled: true,
    order: 2,
    detailKey: "emergency",
    tone: "teal",
  },
  {
    key: "savingsGoals",
    type: "savingsGoals",
    label: "Savings Goals",
    enabled: true,
    order: 3,
    detailKey: "savings",
    tone: "blue",
  },
  {
    key: "investmentFund",
    type: "investmentFund",
    label: "Investment Fund",
    enabled: true,
    order: 4,
    detailKey: "investmentFund",
    tone: "gold",
  },
  {
    key: "debtObligations",
    type: "debtObligations",
    label: "Debt / Obligations",
    enabled: true,
    order: 5,
    detailKey: "debtObligations",
    tone: "rose",
  },
];

const readNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const number =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[₱,\s]/g, ""));

    if (Number.isFinite(number)) return number;
  }

  return 0;
};

const getEnabledCarouselItems = () =>
  carouselConfig
    .filter((item) => item.enabled !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const normalizeBudgetPlan = (plan = {}) => {
  const categories = Array.isArray(plan?.categories) ? plan.categories : [];
  const declaredBudget = readNumber(
    plan?.declared_budget,
    plan?.declared_amount,
    plan?.monthly_budget_amount,
    plan?.total_budget,
    plan?.allocated_amount
  );
  const spentAmount = readNumber(
    plan?.spent_amount,
    plan?.spent,
    plan?.total_spent,
    categories.reduce(
      (sum, item) => sum + readNumber(item?.spent, item?.spent_amount, item?.total_spent),
      0
    )
  );
  const remainingAmount = Math.max(
    readNumber(plan?.remaining_amount, plan?.remaining, plan?.amount_left, declaredBudget - spentAmount),
    0
  );

  return {
    activeBudget: plan || null,
    budgetCategories: categories,
    declaredBudget,
    unallocatedAmount: readNumber(plan?.unallocated_amount),
    budgetStatus: plan?.status || "",
    isComplete: plan?.is_complete === true,
    unplannedSpent: readNumber(plan?.unplanned_spent),
    undocumentedSpent: readNumber(plan?.undocumented_spent),
    remainingAmount,
    amountLeft: remainingAmount,
    spentAmount,
    totalSpent: readNumber(plan?.total_spent, spentAmount),
  };
};

const getCarouselData = ({
  monthlyBudgetPlan,
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  walletMoney = 0,
  survivalExpense = 0,
  user = null,
  guardChecked = false,
  loading = false,
  profileData = null,
  firstPositiveNumber,
  readStoredSurvivalExpense,
} = {}) => {
  const hasSurvivalSetup =
    Boolean(profileData?.survival_setup_done) ||
    (typeof firstPositiveNumber === "function"
      ? firstPositiveNumber(
          profileData?.monthly_survival_expense,
          profileData?.survival_expense,
          profileData?.clara_survival_expense,
          survivalExpense,
          typeof readStoredSurvivalExpense === "function"
            ? readStoredSurvivalExpense(user?.id)
            : 0
        ) > 0
      : readNumber(
          profileData?.monthly_survival_expense,
          profileData?.survival_expense,
          profileData?.clara_survival_expense,
          survivalExpense
        ) > 0);

  const budgetData = normalizeBudgetPlan(monthlyBudgetPlan || {});
  const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];

  const dataByType = {
    budget: {
      ...budgetData,
    },
    emergencyFund: {
      moneyLeft: walletMoney,
      survivalExpense,
      retentionRate: 0,
      canAutoPrompt: Boolean(user?.id) && guardChecked && !loading,
      hasSurvivalSetup,
    },
    savingsGoals: {
      savingsGoals: safeSavingsGoals,
      totalSavingsSaved,
      totalSavingsTarget,
      primarySavingsGoal,
    },
    investmentFund: {
      title: "Investment Fund",
      amount: 0,
      subtitle: "Investment tracking is ready for setup.",
      description: "This card is reserved for future investment fund data without breaking Dashboard.jsx.",
      ctaLabel: "Coming soon",
      state: "comingSoon",
    },
    debtObligations: {
      title: "Debt / Obligations",
      amount: 0,
      subtitle: "Debt tracking is ready for setup.",
      description: "This card is reserved for future obligation data without breaking Dashboard.jsx.",
      ctaLabel: "Coming soon",
      state: "comingSoon",
    },
  };

  return getEnabledCarouselItems().map((item) => ({
    ...item,
    data: dataByType[item.type] || {},
  }));
};

export default function useFinancialCarouselLogic({
  monthlyBudgetPlan,
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  walletMoney = 0,
  survivalExpense = 0,
  user = null,
  guardChecked = false,
  loading = false,
  profileData = null,
  firstPositiveNumber,
  readStoredSurvivalExpense,
} = {}) {
  const carouselRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(
    () =>
      getCarouselData({
        monthlyBudgetPlan,
        savingsGoals,
        totalSavingsSaved,
        totalSavingsTarget,
        primarySavingsGoal,
        walletMoney,
        survivalExpense,
        user,
        guardChecked,
        loading,
        profileData,
        firstPositiveNumber,
        readStoredSurvivalExpense,
      }),
    [
      monthlyBudgetPlan,
      savingsGoals,
      totalSavingsSaved,
      totalSavingsTarget,
      primarySavingsGoal,
      walletMoney,
      survivalExpense,
      user,
      guardChecked,
      loading,
      profileData,
      firstPositiveNumber,
      readStoredSurvivalExpense,
    ]
  );

  const scrollToIndex = useCallback(
    (nextIndex) => {
      const container = carouselRef.current;
      if (!container || items.length <= 0) return;

      const safeIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
      const slideWidth = container.clientWidth || container.scrollWidth / items.length || 1;

      container.scrollTo({
        left: slideWidth * safeIndex,
        behavior: "smooth",
      });

      setActiveIndex(safeIndex);
    },
    [items.length]
  );

  const handleScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container || items.length <= 0 || typeof window === "undefined") return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const slideWidth = container.scrollWidth / items.length || container.clientWidth || 1;
      const index = Math.round(container.scrollLeft / slideWidth);
      setActiveIndex(Math.max(0, Math.min(items.length - 1, index)));
    });
  }, [items.length]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  return {
    activeIndex,
    carouselRef,
    handleScroll,
    items,
    scrollToIndex,
  };
}
