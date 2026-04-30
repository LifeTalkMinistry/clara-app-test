import { TrendingUp, ReceiptText } from "lucide-react";
import EmergencyFundCard from "../EmergencyFundCard";
import WalletCard from "../WalletCard";
import BudgetCardBase from "../BudgetCard";
import SavingsCard from "../SavingsCard";

const firstValidNumber = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
};

const BudgetCard = ({
  activeBudget,
  declaredBudget,
  budgetCategories = [],
  remainingAmount,
  amountLeft,
  budgetRemaining,
  spentAmount,
  totalSpent,
  ...props
}) => {
  const total = firstValidNumber(
    declaredBudget,
    activeBudget?.declared_budget,
    activeBudget?.declared_amount,
    activeBudget?.monthly_budget_amount,
    activeBudget?.total_budget,
    activeBudget?.allocated_amount,
    activeBudget?.allocated_total
  );
  const spent = firstValidNumber(
    spentAmount,
    totalSpent,
    activeBudget?.spent,
    activeBudget?.spent_amount,
    activeBudget?.total_spent,
    budgetCategories.reduce(
      (sum, item) => sum + firstValidNumber(item?.spent, item?.spent_amount, item?.total_spent),
      0
    )
  );
  const remaining = Math.max(
    firstValidNumber(
      remainingAmount,
      amountLeft,
      budgetRemaining,
      activeBudget?.remaining,
      activeBudget?.remaining_amount,
      activeBudget?.amount_left,
      total - spent
    ),
    0
  );

  return (
    <BudgetCardBase
      activeBudget={activeBudget}
      declaredBudget={declaredBudget}
      budgetCategories={budgetCategories}
      remainingAmount={remaining}
      amountLeft={remaining}
      budgetRemaining={remaining}
      spentAmount={spent}
      totalSpent={spent}
      {...props}
    />
  );
};

const ComingSoonFinanceCard = ({ type, label, data }) => {
  const isDebt = type === "debtObligations";
  const Icon = isDebt ? ReceiptText : TrendingUp;
  const value = isDebt ? data?.remaining || 0 : data?.totalInvested || 0;

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col justify-between overflow-hidden rounded-[inherit] border border-white/10 bg-white/[0.045] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">CLARA Carousel</p>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight text-white">{label}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.075] text-white/85">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            {isDebt ? "Remaining" : "Current Fund"}
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-white">
            ₱{Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/62">
            {isDebt
              ? "Debt tracking is ready for the carousel. Connect real debt data when the module is added."
              : "Investment fund is ready for the carousel. Connect real investment data when the module is added."}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-semibold text-white/60">
        Safe default state — no broken data or Supabase writes.
      </div>
    </div>
  );
};

export default function CarouselItemCard({ item, data = {}, dashboard = {} }) {
  if (item.type === "emergencyFund") {
    return (
      <EmergencyFundCard
        moneyLeft={dashboard.walletMoney}
        survivalExpense={dashboard.survivalExpense}
        retentionRate={0}
        theme={dashboard.selectedDashboardTheme}
        expanded={dashboard.expandedFinanceCard === "emergency"}
        onToggleDetails={() => dashboard.toggleFinanceDetails?.("emergency", { autoExpand: true, forceOpen: true })}
        canAutoPrompt={Boolean(dashboard.user?.id) && dashboard.guardChecked && !dashboard.loading}
        hasSurvivalSetup={dashboard.hasSurvivalSetup}
        onQuickExpense={dashboard.onQuickExpense}
        onSurvivalSaved={dashboard.onSurvivalSaved}
      />
    );
  }

  if (item.type === "wallets") {
    return (
      <WalletCard
        wallets={dashboard.wallets}
        walletMoney={dashboard.walletMoney}
        walletPreviewTransactions={dashboard.walletPreviewTransactions}
        theme={dashboard.selectedDashboardTheme}
        expanded={dashboard.expandedFinanceCard === "wallets"}
        onToggleDetails={() => dashboard.toggleFinanceDetails?.("wallets")}
        financeActionLoading={dashboard.financeActionLoading}
        onCreateWallet={dashboard.onCreateWallet}
        onMoveWallet={dashboard.onMoveWallet}
        onDeleteWallet={dashboard.onDeleteWallet}
        onAddMoney={dashboard.onAddMoney}
        onTransferMoney={dashboard.onTransferMoney}
      />
    );
  }

  if (item.type === "budget") {
    const plan = dashboard.monthlyBudgetPlan || {};
    return (
      <BudgetCard
        activeBudget={plan}
        budgetCategories={Array.isArray(plan.categories) ? plan.categories : []}
        declaredBudget={plan.declared_budget}
        unallocatedAmount={plan.unallocated_amount}
        budgetStatus={plan.status}
        isComplete={plan.is_complete}
        unplannedSpent={plan.unplanned_spent}
        undocumentedSpent={plan.undocumented_spent}
        remainingAmount={plan.remaining_amount}
        amountLeft={plan.remaining_amount}
        spentAmount={plan.spent_amount}
        totalSpent={plan.total_spent}
        theme={dashboard.selectedDashboardTheme}
        expanded={dashboard.expandedFinanceCard === "budgets"}
        onToggleDetails={() => dashboard.toggleFinanceDetails?.("budgets")}
        financeActionLoading={dashboard.financeActionLoading}
        onSaveBudget={dashboard.onSaveBudget}
        onEditBudgetCategory={dashboard.onEditBudgetCategory}
        onDeleteBudgetCategory={dashboard.onDeleteBudgetCategory}
        onResetBudget={dashboard.onResetBudget}
      />
    );
  }

  if (item.type === "savingsGoals") {
    return (
      <SavingsCard
        savingsGoals={dashboard.savingsGoals}
        totalSavingsSaved={dashboard.totalSavingsSaved}
        totalSavingsTarget={dashboard.totalSavingsTarget}
        primarySavingsGoal={dashboard.primarySavingsGoal}
        theme={dashboard.selectedDashboardTheme}
        expanded={dashboard.expandedFinanceCard === "savings"}
        onToggleDetails={() => dashboard.toggleFinanceDetails?.("savings")}
        financeActionLoading={dashboard.financeActionLoading}
        onSaveSavingsGoal={dashboard.onSaveSavingsGoal}
        onDeleteSavingsGoal={dashboard.onDeleteSavingsGoal}
        onAddSavings={dashboard.onAddSavings}
      />
    );
  }

  return <ComingSoonFinanceCard type={item.type} label={item.label} data={data?.[item.type]} />;
}
