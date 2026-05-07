import { X } from "lucide-react";

import SavingsCard from "@/components/SavingsCard";

const INLINE_EXPANDED_CARDS = [
  "budgets",
  "wallets",
  "emergency",
  "investmentFund",
];

const getExpandedTitle = (expandedFinanceCard) => {
  if (expandedFinanceCard === "savings") return "Savings Goals";
  return "CLARA Details";
};

export default function DashboardFinanceExpandedSheet({
  activeDashboardPanel,
  expandedFinanceCard,
  setExpandedFinanceCard,
  financeActionLoading,
  savingsGoals,
  totalSavingsSaved,
  totalSavingsTarget,
  primarySavingsGoal,
  openSavingsGoalModal,
  openDeleteSavingsGoalModal,
  openAddSavingsModal,
}) {
  if (activeDashboardPanel !== "home" || !expandedFinanceCard) return null;

  // These cards now expand inline inside the financial carousel.
  // Do not open the old full-screen sheet for them.
  if (INLINE_EXPANDED_CARDS.includes(expandedFinanceCard)) return null;

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
          {expandedFinanceCard === "savings" && (
            <div className="[&>*]:!mb-0 [&>*]:!min-h-0">
              <SavingsCard
                savingsGoals={savingsGoals}
                totalSavingsSaved={totalSavingsSaved}
                totalSavingsTarget={totalSavingsTarget}
                primarySavingsGoal={primarySavingsGoal}
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
