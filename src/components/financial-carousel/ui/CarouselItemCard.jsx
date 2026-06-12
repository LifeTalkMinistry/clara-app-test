import { Lock } from "lucide-react";
import ComingSoonCard from "../cards/coming-soon/ui/ComingSoonCard";
import WalletCardView from "../cards/wallet/ui/WalletCardView";
import BudgetCardView from "../cards/budget/ui/BudgetCardView";
import EmergencyFundCardView from "../cards/emergency-fund/ui/EmergencyFundCardView";
import SavingsGoalsCardView from "../cards/savings-goals/ui/SavingsGoalsCardView";
import InvestmentCardView from "../cards/investment/ui/InvestmentCardView";
import DebtCardView from "../cards/debt/ui/DebtCardView";

function LockedFinanceShell({ item, children }) {
  const tier = item?.lockedTier || "PRO";

  return (
    <div
      className="relative h-full min-h-[inherit] overflow-hidden rounded-[inherit]"
      onClickCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDownCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchStartCapture={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="pointer-events-none opacity-45 grayscale-[0.85] saturate-[0.65]">
        {children}
      </div>

      <div className="absolute inset-0 z-[160] flex items-center justify-center rounded-[inherit] bg-black/[0.18] backdrop-blur-[1px]">
        <div className="mx-5 rounded-[24px] border border-white/14 bg-[rgba(9,18,36,0.68)] px-4 py-3 text-center text-white shadow-[0_18px_52px_rgba(0,0,0,0.36)] backdrop-blur-xl">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-white/75">
            <Lock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/52">
            {tier} Version
          </p>
          <p className="mt-1 text-sm font-black text-white/88">Upgrade to {tier}</p>
        </div>
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

  const data = item.data || {};
  let card = null;

  if (item.type === "wallet") {
    card = (
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
  } else if (item.type === "emergencyFund") {
    card = (
      <EmergencyFundCardView
        data={data}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
        onQuickExpense={onQuickExpense}
        onSurvivalSaved={onSurvivalSaved}
        onCreateWallet={onCreateWallet}
        startClaraAiLongPress={startClaraAiLongPress}
        endClaraAiLongPress={endClaraAiLongPress}
        handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}
      />
    );
  } else if (item.type === "budget") {
    card = (
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
  } else if (item.type === "savingsGoals") {
    card = (
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
  } else if (item.type === "investmentFund") {
    card = (
      <InvestmentCardView
        item={item}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
      />
    );
  } else if (item.type === "debtObligations") {
    card = (
      <DebtCardView
        item={item}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
      />
    );
  } else {
    card = <ComingSoonCard item={item} />;
  }

  if (item.locked) {
    return <LockedFinanceShell item={item}>{card}</LockedFinanceShell>;
  }

  return card;
}
