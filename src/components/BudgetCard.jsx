import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-teal-300/[0.085] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-500/[0.055] blur-[86px]",
  "pointer-events-none absolute bottom-[-212px] right-[-132px] z-[1] h-[310px] w-[310px] rounded-full bg-indigo-700/[0.10] blur-[94px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,0.125),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(79,70,229,0.115),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.058),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-teal-100/[0.055]",
];

const PLAN_TEST_OPTIONS = [
  {
    label: "Explorer Journey",
    helper: "Preview the free CLARA experience.",
    badge: "FREE",
    value: "free",
  },
  {
    label: "Committed Journey",
    helper: "Preview the full CLARA experience.",
    badge: "COMMITTED",
    value: "life_os_499",
  },
];

function savePlanPreview(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("clara_dev_plan_preview", value);
  window.dispatchEvent(new CustomEvent("clara-plan-preview-updated", { detail: { plan: value } }));
}

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
  const cardRef = useRef(null);
  const [showPlanPreview, setShowPlanPreview] = useState(false);

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

  const openBudgetPlanPage = () => {
    navigate("/budget-plan");
  };

  const openBudgetCategoryOnPlanPage = (item) => {
    const id = item?.id || item?.key || item?.budget?.id || null;

    navigate("/budget-plan", {
      state: id ? { editCategoryId: String(id) } : undefined,
    });
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    const titleNode = Array.from(card.querySelectorAll("p")).find(
      (node) => node.textContent?.trim() === "Budget"
    );

    if (!titleNode) return undefined;

    let lastTitleTapAt = 0;

    const openPlanPreview = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setShowPlanPreview(true);
    };

    const handleTitleClick = (event) => {
      const now = Date.now();
      const clickedTwice = event.detail >= 2 || now - lastTitleTapAt <= 520;
      lastTitleTapAt = now;

      if (clickedTwice) {
        openPlanPreview(event);
      }
    };

    titleNode.classList.add("cursor-pointer", "select-none");
    titleNode.style.touchAction = "manipulation";
    titleNode.addEventListener("click", handleTitleClick, true);

    return () => {
      titleNode.removeEventListener("click", handleTitleClick, true);
      titleNode.style.touchAction = "";
    };
  }, [expanded]);

  const applyPlanPreview = (value) => {
    savePlanPreview(value);
    setShowPlanPreview(false);
    window.location.reload();
  };

  return (
    <>
      <div ref={cardRef}>
        <FinanceCardShell
          cardKey="budget"
          expanded={expanded}
          ringClass={status.ring}
          roundedClass="rounded-3xl"
          glowLayerClassNames={BUDGET_GLOW_LAYERS}
          surfaceClassName="!border-teal-100/[0.07] !bg-[linear-gradient(135deg,rgba(3,37,43,0.91),rgba(5,17,39,0.955)_44%,rgba(19,13,56,0.915))]"
          shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.47),0_0_28px_rgba(45,212,191,0.058),0_0_54px_rgba(79,70,229,0.085)]"
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
            budgetPace={budgetPace}
            openBudgetModal={openBudgetPlanPage}
          />
        </FinanceCardShell>
      </div>

      {showPlanPreview && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(7,44,54,0.96),rgba(19,20,63,0.98)_52%,rgba(58,28,101,0.96))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-200/70">
                  Developer Access Override
                </p>
                <h3 className="mt-1 text-lg font-black text-white">Choose test journey state</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                  Local preview only. No Google Play purchase will run.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanPreview(false)}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/75"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {PLAN_TEST_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyPlanPreview(option.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.10]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black">{option.label}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-teal-100/72">
                      {option.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/50">{option.helper}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
