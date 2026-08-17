import { useState } from "react";
import { CircleStop, PieChart, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardSetupEmptyState from "@/components/financial-carousel/shared/FinanceCardSetupEmptyState";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import { closeMonthlyBudgetCycle } from "@/lib/clara-budget-cycle-reset";

const BUDGET_GLOW_LAYERS = [];

function EmptyBudgetState({ expanded = false, onToggleDetails, onSetup }) {
  return (
    <FinanceCardSetupEmptyState
      title="Budget"
      info="Set up a budget first. Once it exists, CLARA will show your available balance, spending status, and budget diagnostics here."
      cta="Set up my budget"
      Icon={PieChart}
      iconClass="border-blue-100/[0.13] bg-[#0A2D67]/[0.72] text-blue-100/82"
      buttonClass="border-yellow-100/[0.15] bg-[linear-gradient(135deg,rgba(0,56,168,0.28),rgba(16,49,108,0.44)_58%,rgba(252,209,22,0.06))] text-yellow-100/92 hover:border-yellow-100/[0.26] hover:brightness-110"
      detailKey="budget"
      expanded={expanded}
      onSetup={onSetup}
      onToggleDetails={onToggleDetails}
      collapsedLabel="View budget details"
      expandedLabel="Hide budget details"
    />
  );
}

export default function BudgetCard({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = undefined,
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  unplannedItems = [],
  undocumentedItems = [],
  outsidePlanItems = [],
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  financeCardController = null,
}) {
  const navigate = useNavigate();
  const [endBudgetConfirmOpen, setEndBudgetConfirmOpen] = useState(false);
  const [endingBudget, setEndingBudget] = useState(false);
  const {
    categories,
    declared,
    allocated,
    spent,
    remaining,
    unallocated,
    progress,
    hasDeclaredBudget,
    planIsComplete,
    status,
    message,
    remainingAmountColor,
    monthKey,
    badgeLabel,
    budgetPace,
  } = useBudgetCardLogic({
    activeBudget,
    budgetCategories,
    declaredBudget,
    unallocatedAmount,
    isComplete,
  });

  const openBudgetPlanPage = () => navigate("/budget-plan");
  const openBudgetAchievement = () =>
    navigate("/community?view=orb&focus=budget&panel=achievement", {
      state: {
        claraFinancialFocus: "budget",
        claraFinancialPanel: "achievement",
      },
    });
  const openBudgetCategoryOnPlanPage = (item) => {
    const id = item?.id || item?.key || item?.budget?.id || null;
    navigate("/budget-plan", {
      state: id ? { editCategoryId: String(id) } : undefined,
    });
  };

  const hasActivePlan = Boolean(
    activeBudget?.hasActiveBudgetPlan === true ||
      activeBudget?.has_active_budget_plan === true ||
      planIsComplete
  );
  const canEndBudget = Boolean(
    hasDeclaredBudget &&
      hasActivePlan &&
      Array.isArray(financeCardController?.budgets) &&
      typeof financeCardController?.updateBudget === "function"
  );
  const actionLoading = financeActionLoading || endingBudget;
  const displayBadgeLabel = hasActivePlan && remaining <= 0 ? "Exhausted" : badgeLabel;

  const endBudgetInline = async () => {
    if (!canEndBudget || actionLoading) return;

    try {
      setEndingBudget(true);
      await closeMonthlyBudgetCycle({
        budgets: financeCardController.budgets,
        headerHint: activeBudget,
        updateBudget: financeCardController.updateBudget,
      });
      await financeCardController?.refreshData?.();
      setEndBudgetConfirmOpen(false);
      if (expanded) onToggleDetails?.();
      toast.success("Budget ended early. Your history is still saved.");
    } catch (error) {
      toast.error(error?.message || "CLARA could not end this budget yet.");
    } finally {
      setEndingBudget(false);
    }
  };

  return (
    <div className="flex h-full min-h-[inherit] flex-col rounded-[inherit]">
      <FinanceCardShell
        cardKey="budget"
        expanded={expanded}
        ringClass={status.ring}
        roundedClass="rounded-3xl"
        glowLayerClassNames={BUDGET_GLOW_LAYERS}
      >
        {!hasDeclaredBudget ? (
          <EmptyBudgetState
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            onSetup={openBudgetPlanPage}
          />
        ) : (
          <>
            <BudgetCardContent
              expanded={expanded}
              onToggleDetails={onToggleDetails}
              financeActionLoading={actionLoading}
              onSaveBudget={openBudgetPlanPage}
              onEditBudgetCategory={openBudgetCategoryOnPlanPage}
              onDeleteBudgetCategory={onDeleteBudgetCategory}
              categories={categories}
              declared={declared}
              allocated={allocated}
              spent={spent}
              remaining={remaining}
              unallocated={unallocated}
              progress={progress}
              hasDeclaredBudget={hasDeclaredBudget}
              planIsComplete={planIsComplete}
              unplannedSpent={unplannedSpent}
              undocumentedSpent={undocumentedSpent}
              unplannedItems={unplannedItems}
              undocumentedItems={undocumentedItems}
              outsidePlanItems={outsidePlanItems}
              status={status}
              message={message}
              remainingAmountColor={remainingAmountColor}
              monthKey={monthKey}
              badgeLabel={displayBadgeLabel}
              budgetPace={budgetPace}
              openBudgetModal={openBudgetPlanPage}
            />

            {!expanded ? (
              <button
                type="button"
                onClick={openBudgetAchievement}
                className="absolute bottom-[82px] right-7 z-40 grid h-10 w-10 place-items-center rounded-full border border-yellow-100/[0.18] bg-[linear-gradient(145deg,rgba(252,209,22,0.14),rgba(0,56,168,0.34)_52%,rgba(206,17,38,0.12))] text-yellow-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(0,0,0,0.20),0_0_20px_rgba(252,209,22,0.06)] backdrop-blur-md transition hover:border-yellow-100/[0.30] hover:brightness-110 active:scale-95"
                aria-label="Open Budget achievement with CLARA"
                title="Budget achievement with CLARA"
              >
                <Target className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </button>
            ) : null}

            {expanded && canEndBudget ? (
              <button
                type="button"
                onClick={() => setEndBudgetConfirmOpen(true)}
                disabled={actionLoading}
                className="absolute right-7 top-[30px] z-40 flex min-h-9 items-center gap-1.5 rounded-full border border-rose-200/[0.16] bg-rose-500/[0.10] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-rose-100/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition hover:border-rose-200/25 hover:bg-rose-500/[0.16] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="End this budget early"
              >
                <CircleStop className="h-3.5 w-3.5" />
                End budget
              </button>
            ) : null}
          </>
        )}
      </FinanceCardShell>

      <FinanceActionModal
        open={endBudgetConfirmOpen}
        title="End this budget?"
        description="Your transactions and budget history will stay saved. New expenses will no longer count toward this budget."
        onClose={() => {
          if (!endingBudget) setEndBudgetConfirmOpen(false);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void endBudgetInline();
        }}
        submitLabel="End Budget"
        loading={endingBudget}
        danger
      >
        <div className="rounded-2xl border border-rose-300/14 bg-rose-500/[0.08] px-4 py-3 text-[12px] font-semibold leading-5 text-rose-50/74">
          This closes the current budget only. CLARA keeps its original cycle dates and past spending records intact.
        </div>
      </FinanceActionModal>
    </div>
  );
}
