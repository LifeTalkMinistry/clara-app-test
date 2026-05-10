import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[92px] -top-[118px] z-[1] h-[210px] w-[210px] rounded-full bg-cyan-300/[0.08] blur-2xl",
  "pointer-events-none absolute bottom-[-185px] right-[-125px] z-[1] h-[250px] w-[250px] rounded-full bg-violet-400/[0.08] blur-3xl",
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.08))]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/10",
];

export default function BudgetCard({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
}) {
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
  } = useBudgetCardLogic({
    activeBudget,
    budgetCategories,
    declaredBudget,
    unallocatedAmount,
    isComplete,
  });

  return (
    <FinanceCardShell
      cardKey="budget"
      expanded={expanded}
      ringClass={status.ring}
      roundedClass="rounded-3xl"
      glowLayerClassNames={BUDGET_GLOW_LAYERS}
      shadowClass="shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.09),0_0_48px_rgba(126,34,206,0.10)]"
    >
      <BudgetCardContent
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        financeActionLoading={financeActionLoading}
        onSaveBudget={onSaveBudget}
        onEditBudgetCategory={onEditBudgetCategory}
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
        status={status}
        message={message}
        remainingAmountColor={remainingAmountColor}
        monthKey={monthKey}
        badgeLabel={badgeLabel}
        openBudgetModal={onSaveBudget}
      />
    </FinanceCardShell>
  );
}
