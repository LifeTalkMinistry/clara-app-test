import { useMemo, useState } from "react";
import { CheckCircle2, PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardSetupEmptyState from "@/components/financial-carousel/shared/FinanceCardSetupEmptyState";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import {
  buildReusableBudgetDraft,
  getCompletedBudgetHistory,
} from "@/lib/clara-budget-history";
import { writeBudgetSetupDraft } from "@/lib/clara-derived-budget";

const BUDGET_GLOW_LAYERS = [];

function EmptyBudgetState({
  expanded = false,
  onToggleDetails,
  onSetup,
  onInfo,
  onReuse,
}) {
  return (
    <FinanceCardSetupEmptyState
      title="Budget"
      infoLabel="Open Budgeting Masterclass"
      onInfo={onInfo}
      cta="Set up my budget"
      secondaryCta={onReuse ? "Reuse last budget" : undefined}
      onSecondarySetup={onReuse}
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
  onCompleteBudget,
  financeCardController = null,
}) {
  const navigate = useNavigate();
  const [completeBudgetConfirmOpen, setCompleteBudgetConfirmOpen] = useState(false);
  const [completingBudget, setCompletingBudget] = useState(false);
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

  const completedBudgetHistory = useMemo(
    () => getCompletedBudgetHistory(financeCardController?.budgets),
    [financeCardController?.budgets],
  );
  const latestReusableBudget = useMemo(
    () =>
      completedBudgetHistory.find(
        (entry) => Array.isArray(entry?.categories) && entry.categories.length > 0,
      ) || null,
    [completedBudgetHistory],
  );

  const openBudgetPlanPage = () => navigate("/budget-plan");
  const openBudgetMasterclass = () => navigate("/community?view=orb&masterclass=budget");
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
  const completionVisible = Boolean(hasDeclaredBudget && hasActivePlan);
  const completionWriteReady = typeof onCompleteBudget === "function";
  const actionLoading = financeActionLoading || completingBudget;
  const isExhausted = completionVisible && remaining <= 0;
  const displayBadgeLabel = isExhausted ? "Exhausted" : badgeLabel;

  const reuseLastBudget = () => {
    if (!latestReusableBudget) return;

    const reusable = buildReusableBudgetDraft(latestReusableBudget, {
      savingsGoals: financeCardController?.savingsGoals,
      emergencyFund: financeCardController?.emergencyFund,
    });

    if (!reusable.hasReusableStructure) {
      toast.error("This completed budget has no reusable setup yet.");
      return;
    }

    writeBudgetSetupDraft(reusable.draft);
    const debtNote = reusable.omittedDebtCount > 0
      ? " Current obligations will be refreshed from your live debt records."
      : "";
    toast.success(`Previous budget setup loaded.${debtNote}`);
    navigate("/budget-plan", {
      state: {
        reusedFromBudgetId: latestReusableBudget.id,
        reusedFromCompletedAt: latestReusableBudget.completedAt,
      },
    });
  };

  const openCompleteBudgetConfirm = () => {
    if (!completionVisible || actionLoading) return;

    if (!completionWriteReady) {
      toast.error("CLARA is still loading this budget. Please try again.");
      return;
    }

    setCompleteBudgetConfirmOpen(true);
  };

  const completeBudgetInline = async () => {
    if (!completionVisible || actionLoading) return;

    if (!completionWriteReady) {
      toast.error("CLARA is still loading this budget. Please try again.");
      return;
    }

    try {
      setCompletingBudget(true);
      await onCompleteBudget({
        categories,
        declared,
        allocated,
        spent,
        remaining,
        unallocated,
        unplannedSpent,
        undocumentedSpent,
        outsidePlanItems,
      });
      setCompleteBudgetConfirmOpen(false);
      if (expanded) onToggleDetails?.();
      toast.success("Budget completed. Your history and reusable setup are saved.");
    } catch (error) {
      toast.error(error?.message || "CLARA could not complete this budget yet.");
    } finally {
      setCompletingBudget(false);
    }
  };

  const completionAction = expanded && completionVisible ? (
    <div
      data-budget-completion-action="true"
      data-budget-exhausted={isExhausted ? "true" : "false"}
      className={[
        "mx-4 mb-4 shrink-0 rounded-[22px] border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm",
        isExhausted
          ? "border-red-200/[0.14] bg-[linear-gradient(135deg,rgba(206,17,38,0.13),rgba(0,56,168,0.18)_58%,rgba(252,209,22,0.035))]"
          : "border-blue-100/[0.09] bg-[#0038A8]/[0.08]",
      ].join(" ")}
    >
      {isExhausted ? (
        <div className="mb-2 px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-100/72">
            Budget exhausted
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-4 text-white/56">
            No planned balance remains in this cycle.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={openCompleteBudgetConfirm}
        disabled={actionLoading}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-yellow-100/[0.16] bg-[linear-gradient(135deg,rgba(0,56,168,0.34),rgba(16,49,108,0.46)_58%,rgba(252,209,22,0.075))] px-4 py-2.5 text-[12px] font-black text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_18px_rgba(0,0,0,0.10)] transition hover:border-yellow-100/26 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Complete this budget"
      >
        <CheckCircle2 className="h-4 w-4 text-yellow-100/84" />
        {completingBudget ? "Completing..." : "Complete budget"}
      </button>
    </div>
  ) : null;

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
            onInfo={openBudgetMasterclass}
            onReuse={latestReusableBudget ? reuseLastBudget : undefined}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
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
            </div>

            {completionAction}
          </div>
        )}
      </FinanceCardShell>

      <FinanceActionModal
        open={completeBudgetConfirmOpen}
        title="Complete this budget?"
        description="CLARA will close this cycle, preserve its transactions and results, and save a reusable setup for your next budget."
        onClose={() => {
          if (!completingBudget) setCompleteBudgetConfirmOpen(false);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void completeBudgetInline();
        }}
        submitLabel="Complete Budget"
        loading={completingBudget}
      >
        <div className="rounded-2xl border border-emerald-300/14 bg-emerald-500/[0.08] px-4 py-3 text-[12px] font-semibold leading-5 text-emerald-50/74">
          This locks the current budget as completed history. Your original cycle dates stay intact, and reusing it later creates a new editable budget instead of reopening this one.
        </div>
      </FinanceActionModal>
    </div>
  );
}
