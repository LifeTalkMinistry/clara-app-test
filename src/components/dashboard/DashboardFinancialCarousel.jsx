import { memo, useMemo, useRef, useState } from "react";
import { Landmark, PiggyBank, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { compareDashboardSectionProps } from "./dashboardMemoUtils";

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const firstNumber = (...values) => {
  for (const value of values) {
    const number = Number(String(value ?? "").replace(/[₱,\s,]/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return 0;
};

const formatPeso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const getBudgetTotal = (budget) =>
  firstNumber(
    budget?.allocated_amount,
    budget?.budget_amount,
    budget?.total_budget,
    budget?.budget,
    budget?.amount,
    budget?.target_amount,
    budget?.declared_budget,
    budget?.declared_amount,
    budget?.monthly_budget_amount,
    budget?.allocated_total
  );

const getBudgetSpent = (budget) =>
  firstNumber(
    budget?.spent,
    budget?.spent_amount,
    budget?.total_spent,
    budget?.used_amount
  );

const getSavingsSaved = (goal) =>
  firstNumber(
    goal?.saved_amount,
    goal?.current_amount,
    goal?.saved,
    goal?.progress_amount,
    goal?.amount_saved
  );

const getSavingsTarget = (goal) =>
  firstNumber(
    goal?.target_amount,
    goal?.goal_amount,
    goal?.target,
    goal?.amount,
    goal?.desired_amount
  );

const getEmergencySaved = (item) =>
  firstNumber(
    item?.saved_amount,
    item?.current_amount,
    item?.saved,
    item?.balance,
    item?.amount_saved,
    item?.fund_balance,
    item?.emergency_fund_saved
  );

const getEmergencyTarget = (item) =>
  firstNumber(
    item?.target_amount,
    item?.goal_amount,
    item?.target,
    item?.amount,
    item?.desired_amount,
    item?.fund_target,
    item?.emergency_fund_target
  );

const getObligationAmount = (item) =>
  firstNumber(
    item?.remaining_amount,
    item?.balance,
    item?.amount,
    item?.total_amount,
    item?.debt_amount,
    item?.obligation_amount,
    item?.payable_amount,
    item?.principal
  );

const getInvestmentAmount = (item) =>
  firstNumber(
    item?.current_value,
    item?.market_value,
    item?.value,
    item?.amount,
    item?.invested_amount,
    item?.principal,
    item?.balance
  );

function DashboardFinancialCarousel({
  activeBudget,
  declaredBudget,
  budgetCategories,
  totalSpent,
  spentAmount,
  savingsGoals,
  goals,
  emergencyFund,
  emergencyFunds,
  emergencyGoal,
  investments,
  investmentFunds,
  obligations,
  debts,
  dashboardScale,
  getDashboardGlowCardClass,
  className = "",
}) {
  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const cards = useMemo(() => {
    const safeBudgetCategories = toArray(budgetCategories);
    const budgetAllocated = Math.max(
      firstNumber(
        declaredBudget,
        activeBudget?.declared_budget,
        activeBudget?.declared_amount,
        activeBudget?.monthly_budget_amount,
        activeBudget?.total_budget,
        activeBudget?.allocated_amount,
        activeBudget?.allocated_total
      ) || safeBudgetCategories.reduce((sum, item) => sum + getBudgetTotal(item), 0),
      0
    );
    const budgetSpent = Math.max(
      firstNumber(spentAmount, totalSpent, activeBudget?.spent, activeBudget?.spent_amount, activeBudget?.total_spent) ||
        safeBudgetCategories.reduce((sum, item) => sum + getBudgetSpent(item), 0),
      0
    );
    const budgetLeft = Math.max(budgetAllocated - budgetSpent, 0);

    const emergencyItems = toArray(emergencyFunds).length
      ? toArray(emergencyFunds)
      : toArray([emergencyFund, emergencyGoal]);
    const emergencySaved = emergencyItems.reduce((sum, item) => sum + getEmergencySaved(item), 0);
    const emergencyTarget = emergencyItems.reduce((sum, item) => sum + getEmergencyTarget(item), 0);
    const emergencyPercent = emergencyTarget > 0 ? Math.min(Math.round((emergencySaved / emergencyTarget) * 100), 999) : 0;

    const savingsItems = toArray(savingsGoals).length ? toArray(savingsGoals) : toArray(goals);
    const savingsSaved = savingsItems.reduce((sum, item) => sum + getSavingsSaved(item), 0);

    const investmentItems = toArray(investments).length ? toArray(investments) : toArray(investmentFunds);
    const investmentTotal = investmentItems.reduce((sum, item) => sum + getInvestmentAmount(item), 0);

    const obligationItems = toArray(obligations).length ? toArray(obligations) : toArray(debts);
    const obligationTotal = obligationItems.reduce((sum, item) => sum + getObligationAmount(item), 0);

    return [
      {
        key: "budget",
        title: "Budget",
        Icon: Landmark,
        value: budgetAllocated > 0 ? `${formatPeso(budgetSpent)} / ${formatPeso(budgetAllocated)}` : "Set your budget",
        insight: budgetAllocated > 0 ? `You have ${formatPeso(budgetLeft)} left this month` : "Create your monthly spending plan",
      },
      {
        key: "emergency-fund",
        title: "Emergency Fund",
        Icon: ShieldCheck,
        value: emergencyTarget > 0 ? `${formatPeso(emergencySaved)} / ${formatPeso(emergencyTarget)}` : emergencySaved > 0 ? formatPeso(emergencySaved) : "Build protection",
        insight: emergencyTarget > 0 ? `You’re ${emergencyPercent}% protected` : "Prepare before life surprises you",
      },
      {
        key: "savings-goals",
        title: "Savings Goals",
        Icon: Target,
        value: savingsSaved > 0 ? formatPeso(savingsSaved) : "Start saving",
        insight: savingsItems.length > 0 ? `You’re building ${savingsItems.length} ${savingsItems.length === 1 ? "goal" : "goals"}` : "Turn plans into visible progress",
      },
      {
        key: "investments",
        title: "Investments",
        Icon: TrendingUp,
        value: investmentTotal > 0 ? formatPeso(investmentTotal) : "Not started yet",
        insight: investmentTotal > 0 ? "Your money is starting to grow" : "Start growing your money",
      },
      {
        key: "obligations",
        title: "Obligations",
        Icon: PiggyBank,
        value: obligationTotal > 0 ? formatPeso(obligationTotal) : "No record yet",
        insight: obligationTotal > 0 ? "Keep every payment visible" : "Track what’s holding you back",
      },
    ];
  }, [
    activeBudget,
    budgetCategories,
    declaredBudget,
    debts,
    emergencyFund,
    emergencyFunds,
    emergencyGoal,
    goals,
    investmentFunds,
    investments,
    obligations,
    savingsGoals,
    spentAmount,
    totalSpent,
  ]);

  const handleScroll = () => {
    const node = carouselRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.getBoundingClientRect?.().width || node.clientWidth || 1;
    const nextIndex = Math.round(node.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(cards.length - 1, nextIndex)));
  };

  return (
    <section className={`relative ${className}`} data-clara-dashboard-section="financial-decision-carousel">
      <div className="mb-3 flex items-end justify-between px-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Financial layers</p>
          <h2 className="text-sm font-semibold text-white/90">Decision framework</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {cards.map((card, index) => (
            <span
              key={card.key}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIndex === index ? "w-5 bg-emerald-300/80 shadow-[0_0_14px_rgba(52,211,153,0.45)]" : "w-1.5 bg-white/18"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 pr-[18%] [-webkit-overflow-scrolling:touch]"
      >
        {cards.map((card, index) => {
          const Icon = card.Icon;
          const active = activeIndex === index;
          return (
            <article
              key={card.key}
              className={`group relative min-h-[142px] min-w-[86%] snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-2xl transition-all duration-300 ${
                active ? "scale-100 opacity-100" : "scale-[0.97] opacity-75"
              } ${getDashboardGlowCardClass?.("teal") || "shadow-[0_18px_48px_rgba(0,0,0,0.28)]"}`}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-300/10 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-200/35 to-transparent" />

              <div className="relative flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Layer {index + 1}</p>
                    <h3 className="mt-1 text-base font-semibold text-white">{card.title}</h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.075] text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.14)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div>
                  <p className={`${dashboardScale?.moneyValue || "text-2xl"} line-clamp-1 font-black tracking-tight text-white`}>{card.value}</p>
                  <p className="mt-1.5 line-clamp-1 text-xs font-medium text-white/62">{card.insight}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default memo(DashboardFinancialCarousel, compareDashboardSectionProps);
