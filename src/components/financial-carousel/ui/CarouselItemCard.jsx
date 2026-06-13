import { memo } from "react";
import { Lock } from "lucide-react";
import ComingSoonCard from "../cards/coming-soon/ui/ComingSoonCard";
import WalletCardView from "../cards/wallet/ui/WalletCardView";
import BudgetCardView from "../cards/budget/ui/BudgetCardView";
import EmergencyFundCardView from "../cards/emergency-fund/ui/EmergencyFundCardView";
import SavingsGoalsCardView from "../cards/savings-goals/ui/SavingsGoalsCardView";
import InvestmentCardView from "../cards/investment/ui/InvestmentCardView";
import DebtCardView from "../cards/debt/ui/DebtCardView";
import { FinanceCardPerformanceModeProvider } from "../shared/FinanceCardShell";

const LockedFinancePreview = memo(function LockedFinancePreview({ item }) {
  return (
    <div className="flex h-full min-h-[inherit] flex-col justify-between rounded-[inherit] border border-white/[0.06] bg-white/[0.025] p-4">
      <div>
        <div className="mb-2 inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
          Locked
        </div>

        <h3 className="text-sm font-black text-white/65">
          {item?.label || "Premium Card"}
        </h3>

        {item?.description ? (
          <p className="mt-1 text-[11px] leading-snug text-white/35">
            {item.description}
          </p>
        ) : null}
      </div>

      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/28">
        Unlock with CLARA
      </div>
    </div>
  );
});

function LockedFinanceShell({ item, performanceMode = "lite", children }) {
  const tier = item?.lockedTier || "PRO";
  const isFull = performanceMode === "full";
  const isLite = performanceMode === "lite";
  const overlayClassName = isLite
    ? "absolute inset-0 z-[160] flex items-center justify-center rounded-[inherit] bg-black/[0.22]"
    : "absolute inset-0 z-[160] flex items-center justify-center rounded-[inherit] bg-black/[0.18] backdrop-blur-[1px]";
  const panelClassName = isLite
    ? "mx-5 rounded-[22px] border border-white/10 bg-[rgba(9,18,36,0.72)] px-4 py-3 text-center text-white shadow-none"
    : isFull
      ? "mx-5 rounded-[24px] border border-white/14 bg-[rgba(9,18,36,0.68)] px-4 py-3 text-center text-white shadow-[0_18px_52px_rgba(0,0,0,0.36)] backdrop-blur-xl"
      : "mx-5 rounded-[24px] border border-white/12 bg-[rgba(9,18,36,0.74)] px-4 py-3 text-center text-white shadow-[0_12px_32px_rgba(0,0,0,0.26)] backdrop-blur-sm";

  return (
    <div
      className="relative h-full min-h-[inherit] overflow-hidden rounded-[inherit]"
      data-performance-mode={performanceMode}
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
      <div className="pointer-events-none h-full min-h-[inherit] opacity-45 grayscale-[0.85] saturate-[0.65]">
        {children}
      </div>

      <div className={overlayClassName}>
        <div className={panelClassName}>
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

function CarouselItemCard(props) {
  const {
    item,
    performanceMode,
    isActiveSlide,
    isNearbySlide,
    selectedDashboardTheme,
    expandedFinanceCard,
    toggleFinanceDetails,
    financeActionLoading,
    loading,
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

  const resolvedPerformanceMode =
    performanceMode || item?.data?.performanceMode || "full";

  // Performance rule:
  // Locked cards must not mount their real card components.
  // Keep this branch before any card renderer is created.
  if (item.locked) {
    return (
      <FinanceCardPerformanceModeProvider performanceMode="lite">
        <LockedFinanceShell item={item} performanceMode="lite">
          <LockedFinancePreview item={item} />
        </LockedFinanceShell>
      </FinanceCardPerformanceModeProvider>
    );
  }

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
        financeDataLoading={Boolean(loading)}
        performanceMode={resolvedPerformanceMode}
        isActiveSlide={isActiveSlide}
        isNearbySlide={isNearbySlide}
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
        performanceMode={resolvedPerformanceMode}
        isActiveSlide={isActiveSlide}
        isNearbySlide={isNearbySlide}
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
        performanceMode={resolvedPerformanceMode}
        isActiveSlide={isActiveSlide}
        isNearbySlide={isNearbySlide}
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
        performanceMode={resolvedPerformanceMode}
        isActiveSlide={isActiveSlide}
        isNearbySlide={isNearbySlide}
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
        incomeSources={data.incomeSources}
        incomeData={data.incomeData}
        refreshData={data.refreshData}
        isActive={data.isActiveSlide}
        isNearby={data.isNearbySlide}
        performanceMode={resolvedPerformanceMode}
      />
    );
  } else if (item.type === "debtObligations") {
    card = (
      <DebtCardView
        item={item}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
        performanceMode={resolvedPerformanceMode}
        isActiveSlide={isActiveSlide}
        isNearbySlide={isNearbySlide}
      />
    );
  } else {
    card = <ComingSoonCard item={item} />;
  }

  return (
    <FinanceCardPerformanceModeProvider performanceMode={resolvedPerformanceMode}>
      {card}
    </FinanceCardPerformanceModeProvider>
  );
}

export default memo(CarouselItemCard);
