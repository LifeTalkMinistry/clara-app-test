import { X } from "lucide-react";

import EmergencyFundCard from "@/components/EmergencyFundCard";
import WalletCard from "@/components/WalletCard";
import BudgetCardBase from "@/components/BudgetCard";
import SavingsCard from "@/components/SavingsCard";

const firstValidNumber = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
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

const getExpandedTitle = (expandedFinanceCard) => {
  if (expandedFinanceCard === "emergency") return "Emergency Fund";
  if (expandedFinanceCard === "wallets") return "Wallets";
  if (expandedFinanceCard === "budgets") return "Budget";
  return "Savings Goals";
};

export default function DashboardFinanceExpandedSheet({
  activeDashboardPanel,
  expandedFinanceCard,
  setExpandedFinanceCard,
  walletMoney,
  survivalExpense,
  selectedDashboardTheme,
  expandedFinanceDetailSections,
  toggleExpandedFinanceDetailSection,
  profileData,
  firstPositiveNumber,
  readStoredSurvivalExpense,
  user,
  onSurvivalSaved,
  wallets,
  walletPreviewTransactions,
  financeActionLoading,
  openCreateWalletModal,
  moveWalletInline,
  openDeleteWalletModal,
  openAddMoneyModal,
  openTransferMoneyModal,
  monthlyBudgetPlan,
  openBudgetModal,
  openDeleteBudgetCategoryModal,
  openResetBudgetModal,
  savingsGoals,
  totalSavingsSaved,
  totalSavingsTarget,
  primarySavingsGoal,
  openSavingsGoalModal,
  openDeleteSavingsGoalModal,
  openAddSavingsModal,
}) {
  if (activeDashboardPanel !== "home" || !expandedFinanceCard) return null;

  const closeDetails = () => setExpandedFinanceCard(null);
  const closeAndRun = (callback) => {
    closeDetails();
    window.requestAnimationFrame(() => callback?.());
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/72 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close finance details"
        onClick={closeDetails}
      />

      <div className="relative z-10 flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/15 bg-[radial-gradient(circle_at_top,rgba(45,246,222,0.14),transparent_34%),linear-gradient(180deg,rgba(4,17,32,0.98),rgba(3,10,24,0.99))] shadow-[0_-24px_80px_rgba(0,0,0,0.45)] sm:h-[92dvh] sm:rounded-[32px]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
              CLARA Details
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-white">
              {getExpandedTitle(expandedFinanceCard)}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeDetails}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.075] text-white/75 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+24px)] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {expandedFinanceCard === "emergency" && (
            <div className="[&>*]:!mb-0">
              <EmergencyFundCard
                moneyLeft={walletMoney}
                survivalExpense={survivalExpense}
                retentionRate={0}
                theme={selectedDashboardTheme}
                expanded={expandedFinanceDetailSections?.emergency !== false}
                onToggleDetails={() => toggleExpandedFinanceDetailSection("emergency")}
                canAutoPrompt={false}
                hasSurvivalSetup={
                  Boolean(profileData?.survival_setup_done) ||
                  firstPositiveNumber(
                    profileData?.monthly_survival_expense,
                    profileData?.survival_expense,
                    profileData?.clara_survival_expense,
                    survivalExpense,
                    readStoredSurvivalExpense(user?.id)
                  ) > 0
                }
                onSurvivalSaved={onSurvivalSaved}
              />
            </div>
          )}

          {expandedFinanceCard === "wallets" && (
            <div className="[&>*]:!mb-0 [&>*]:!min-h-0">
              <WalletCard
                wallets={wallets}
                walletMoney={walletMoney}
                walletPreviewTransactions={walletPreviewTransactions}
                theme={selectedDashboardTheme}
                expanded={true}
                onToggleDetails={closeDetails}
                financeActionLoading={financeActionLoading}
                onCreateWallet={() => closeAndRun(openCreateWalletModal)}
                onMoveWallet={moveWalletInline}
                onDeleteWallet={(walletId) => closeAndRun(() => openDeleteWalletModal(walletId))}
                onAddMoney={(wallet) => closeAndRun(() => openAddMoneyModal(wallet))}
                onTransferMoney={(wallet) => closeAndRun(() => openTransferMoneyModal(wallet))}
              />
            </div>
          )}

          {expandedFinanceCard === "budgets" && (
            <div className="[&>*]:!mb-0 [&>*]:!min-h-0">
              <BudgetCard
                activeBudget={monthlyBudgetPlan}
                budgetCategories={Array.isArray(monthlyBudgetPlan?.categories) ? monthlyBudgetPlan.categories : []}
                declaredBudget={Number(monthlyBudgetPlan?.declared_budget || monthlyBudgetPlan?.declared_amount || 0)}
                unallocatedAmount={Number(monthlyBudgetPlan?.unallocated_amount || 0)}
                budgetStatus={monthlyBudgetPlan?.status || ""}
                isComplete={monthlyBudgetPlan?.is_complete === true}
                unplannedSpent={Number(monthlyBudgetPlan?.unplanned_spent || 0)}
                undocumentedSpent={Number(monthlyBudgetPlan?.undocumented_spent || 0)}
                remainingAmount={Number(monthlyBudgetPlan?.remaining_amount || monthlyBudgetPlan?.remaining || 0)}
                amountLeft={Number(monthlyBudgetPlan?.remaining_amount || monthlyBudgetPlan?.remaining || 0)}
                spentAmount={Number(monthlyBudgetPlan?.spent_amount || monthlyBudgetPlan?.spent || monthlyBudgetPlan?.total_spent || 0)}
                totalSpent={Number(monthlyBudgetPlan?.total_spent || monthlyBudgetPlan?.spent_amount || monthlyBudgetPlan?.spent || 0)}
                theme={selectedDashboardTheme}
                expanded={true}
                onToggleDetails={closeDetails}
                financeActionLoading={financeActionLoading}
                onSaveBudget={() => closeAndRun(openBudgetModal)}
                onEditBudgetCategory={(item) => closeAndRun(() => openBudgetModal(item))}
                onDeleteBudgetCategory={(item) => closeAndRun(() => openDeleteBudgetCategoryModal(item))}
                onResetBudget={() => closeAndRun(openResetBudgetModal)}
              />
            </div>
          )}

          {expandedFinanceCard === "savings" && (
            <div className="[&>*]:!mb-0 [&>*]:!min-h-0">
              <SavingsCard
                savingsGoals={savingsGoals}
                totalSavingsSaved={totalSavingsSaved}
                totalSavingsTarget={totalSavingsTarget}
                primarySavingsGoal={primarySavingsGoal}
                theme={selectedDashboardTheme}
                expanded={true}
                onToggleDetails={closeDetails}
                financeActionLoading={financeActionLoading}
                onSaveSavingsGoal={(goal) => closeAndRun(() => openSavingsGoalModal(goal))}
                onDeleteSavingsGoal={(goalId) => closeAndRun(() => openDeleteSavingsGoalModal(goalId))}
                onAddSavings={(goal) => closeAndRun(() => openAddSavingsModal(goal))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
