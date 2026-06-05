import { Lock } from "lucide-react";
import ComingSoonCard from "../cards/coming-soon/ui/ComingSoonCard";
import WalletCardView from "../cards/wallet/ui/WalletCardView";
import BudgetCardView from "../cards/budget/ui/BudgetCardView";
import EmergencyFundCardView from "../cards/emergency-fund/ui/EmergencyFundCardView";
import SavingsGoalsCardView from "../cards/savings-goals/ui/SavingsGoalsCardView";
import InvestmentCardView from "../cards/investment/ui/InvestmentCardView";
import DebtCardView from "../cards/debt/ui/DebtCardView";

function LockedFinanceFeatureCard({ item }) {
  const tier = item?.lockedTier || "PRO";
  const label = item?.label || "CLARA Feature";

  return (
    <div className="relative h-full min-h-[inherit] overflow-hidden rounded-3xl border border-white/[0.07] bg-[linear-gradient(135deg,rgba(18,24,38,0.86),rgba(20,24,44,0.92)_50%,rgba(39,31,60,0.88))] p-4 text-white opacity-70 shadow-[0_24px_70px_rgba(0,0,0,0.38)] grayscale">
      <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-white/[0.045] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-88px] h-60 w-60 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/[0.045]" />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Lock className="h-4.5 w-4.5" />
          </div>
          <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">
            {tier}
          </span>
        </div>

        <div>
          <p className="text-xl font-black tracking-[-0.04em] text-white/88">{label}</p>
          <p className="mt-2 text-sm font-semibold leading-5 text-white/54">
            Upgrade to {tier} to unlock this CLARA feature.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="w-full rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-black text-white/58"
        >
          Locked • {tier}
        </button>
      </div>
    </div>
  );
}

export default function CarouselItemCard(props) {
  const {
    item,
    selectedDashboardTheme,
    expandedFinanceCard,
    toggleFinanceDetails,
    financeActionLoading,
    onQuickExpense,
    onSurvivalSaved,
    onSaveBudget,
    onEditBudgetCategory,
    onDeleteBudgetCategory,
    onResetBudget,
    onCreateWallet,
    onMoveWallet,
    onDeleteWallet,
    onAddMoney,
    onTransferMoney,
    onEditWallet,
    onSaveSavingsGoal,
    onDeleteSavingsGoal,
    onAddSavings,
    startClaraAiLongPress,
    endClaraAiLongPress,
    handleClaraAiOrbClickCapture,
  } = props;

  if (!item) return null;

  if (item.locked) return <LockedFinanceFeatureCard item={item} />;

  const data = item.data || {};

  if (item.type === "wallet") {
    return (
      <WalletCardView
        data={data}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
        financeActionLoading={financeActionLoading}
        financeDataLoading={Boolean(props.loading)}
        onCreateWallet={onCreateWallet}
        onMoveWallet={onMoveWallet}
        onDeleteWallet={onDeleteWallet}
        onAddMoney={onAddMoney}
        onTransferMoney={onTransferMoney}
        onEditWallet={onEditWallet}
      />
    );
  }

  if (item.type === "emergencyFund") {
    return (
      <EmergencyFundCardView
        data={data}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
        onQuickExpense={onQuickExpense}
        onSurvivalSaved={onSurvivalSaved}
        startClaraAiLongPress={startClaraAiLongPress}
        endClaraAiLongPress={endClaraAiLongPress}
        handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}
      />
    );
  }

  if (item.type === "budget") {
    return (
      <BudgetCardView
        data={data}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
        financeActionLoading={financeActionLoading}
        onSaveBudget={onSaveBudget}
        onEditBudgetCategory={onEditBudgetCategory}
        onDeleteBudgetCategory={onDeleteBudgetCategory}
        onResetBudget={onResetBudget}
      />
    );
  }

  if (item.type === "savingsGoals") {
    return (
      <SavingsGoalsCardView
        data={data}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
        financeActionLoading={financeActionLoading}
        onSaveSavingsGoal={onSaveSavingsGoal}
        onDeleteSavingsGoal={onDeleteSavingsGoal}
        onAddSavings={onAddSavings}
      />
    );
  }

  if (item.type === "investmentFund") {
    return (
      <InvestmentCardView
        item={item}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
      />
    );
  }

  if (item.type === "debtObligations") {
    return (
      <DebtCardView
        item={item}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
      />
    );
  }

  return <ComingSoonCard item={item} />;
}
