import { PiggyBank, ReceiptText } from "lucide-react";
import SavingsCard from "../../SavingsCard";
import InvestmentCard from "../../InvestmentCard";
import ObligationDebt from "../../ObligationDebt";
import WalletCardView from "../cards/wallet/ui/WalletCardView";
import BudgetCardView from "../cards/budget/ui/BudgetCardView";
import EmergencyFundCardView from "../cards/emergency-fund/ui/EmergencyFundCardView";

const comingSoonIconMap = {
  debtObligations: ReceiptText,
};

const getComingSoonShellClass = (tone = "emerald") => {
  const toneMap = {
    emerald:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_36%),linear-gradient(135deg,rgba(4,25,24,0.94),rgba(3,14,24,0.98))]",
    teal:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_36%),linear-gradient(135deg,rgba(4,23,30,0.94),rgba(3,14,24,0.98))]",
    blue:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_36%),linear-gradient(135deg,rgba(8,18,52,0.94),rgba(3,14,24,0.98))]",
    gold:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_36%),linear-gradient(135deg,rgba(29,18,8,0.94),rgba(3,14,24,0.98))]",
    rose:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.15),transparent_36%),linear-gradient(135deg,rgba(40,12,18,0.94),rgba(3,14,24,0.98))]",
  };

  return toneMap[tone] || toneMap.emerald;
};

const ComingSoonCard = ({ item }) => {
  const Icon = comingSoonIconMap[item?.key] || PiggyBank;
  const data = item?.data || {};

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col justify-between overflow-hidden rounded-[inherit] border p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl ${getComingSoonShellClass(item?.tone)}`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.075] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
          {data.ctaLabel || "Coming soon"}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              CLARA Financial Carousel
            </p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
              {data.title || item?.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {data.subtitle ||
                "This card is ready for future finance data."}
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-white/80 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 rounded-3xl border border-white/12 bg-white/[0.055] p-4">
        <p className="text-sm leading-6 text-white/64">
          {data.description ||
            "Future edits for this card now live inside src/components/financial-carousel only."}
        </p>
      </div>
    </div>
  );
};

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

  if (item.type === "wallet") {
    return (
      <WalletCardView
        data={data}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceCard={expandedFinanceCard}
        toggleFinanceDetails={toggleFinanceDetails}
        financeActionLoading={financeActionLoading}
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
      <div className="h-full min-h-[inherit] flex flex-col">
        <SavingsCard
          savingsGoals={data.savingsGoals}
          totalSavingsSaved={data.totalSavingsSaved}
          totalSavingsTarget={data.totalSavingsTarget}
          primarySavingsGoal={data.primarySavingsGoal}
          theme={selectedDashboardTheme}
          expanded={expandedFinanceCard === "savings"}
          onToggleDetails={() => toggleFinanceDetails?.("savings")}
          financeActionLoading={financeActionLoading}
          onSaveSavingsGoal={onSaveSavingsGoal}
          onDeleteSavingsGoal={onDeleteSavingsGoal}
          onAddSavings={onAddSavings}
        />
      </div>
    );
  }

  if (item.type === "investmentFund") {
    return (
      <div className="h-full min-h-[inherit] flex flex-col">
        <InvestmentCard item={item} theme={selectedDashboardTheme} />
      </div>
    );
  }

  if (item.type === "debtObligations") {
    return (
      <div className="h-full min-h-[inherit] flex flex-col">
        <ObligationDebt item={item} theme={selectedDashboardTheme} />
      </div>
    );
  }

  return <ComingSoonCard item={item} />;
}
