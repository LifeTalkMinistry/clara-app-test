import { useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-violet-700/[0.12] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-purple-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(103,232,249,0.105),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(124,58,237,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/[0.055]",
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
  const navigate = useNavigate();

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

  const openBudgetPlanPage = () => {
    navigate("/budget-plan");
  };

  const openBudgetCategoryOnPlanPage = (item) => {
    const id = item?.id || item?.key || item?.budget?.id || null;

    navigate("/budget-plan", {
      state: id ? { editCategoryId: String(id) } : undefined,
    });
  };

  return (
    <FinanceCardShell
      cardKey="budget"
      expanded={expanded}
      ringClass={status.ring}
      roundedClass="rounded-3xl"
      glowLayerClassNames={BUDGET_GLOW_LAYERS}
      surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]"
      shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]"
    >
      <BudgetCardContent
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        financeActionLoading={financeActionLoading}
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
        status={status}
        message={message}
        remainingAmountColor={remainingAmountColor}
        monthKey={monthKey}
        badgeLabel={badgeLabel}
        openBudgetModal={openBudgetPlanPage}
      />
    </FinanceCardShell>
  );
}
