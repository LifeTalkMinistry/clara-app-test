import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import createInitialFinanceForm from "@/components/fresh/main-dashboard/finance-form/financeFormInitialState";
import { ManualExpenseGuideSimulationProvider } from "@/components/fresh/main-dashboard/manual-expense/ManualExpenseGuideSimulationContext";

const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_ORB_FEATURE = "money-left-orb";

const GUIDE_FORM = Object.freeze({
  ...createInitialFinanceForm(),
  amount: "120",
  budgetListKey: "food",
  expenseWalletId: "guide-main-wallet",
});

const GUIDE_WALLETS = Object.freeze([
  {
    id: "guide-main-wallet",
    name: "Main Wallet",
    balance: 10000,
    current_balance: 10000,
  },
]);

const GUIDE_BUDGET_ITEMS = Object.freeze([
  {
    key: "food",
    title: "Food",
    subtitle: "₱2,500 remaining",
    tone: "emerald",
    disabled: false,
  },
]);

const GUIDE_SELECTED_BUDGET = Object.freeze({
  key: "food",
  title: "Food",
});

const GUIDE_MONTHLY_PLAN = Object.freeze({
  declared_budget: 10000,
  categories: [],
});

const noop = () => {};

const formatGuideMoney = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function returnToSingleTapLesson() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(GUIDE_TARGET_CHANGE_EVENT, {
      detail: { feature: GUIDE_ORB_FEATURE },
    })
  );

  let attempts = 0;
  const advanceFromOrbIntro = () => {
    attempts += 1;

    const nextButton = document.querySelector(
      ".clara-guide-carousel-bubble-shell [data-clara-guide-action='next']"
    );

    if (nextButton instanceof HTMLButtonElement) {
      nextButton.click();
      return;
    }

    if (attempts < 12) {
      window.requestAnimationFrame(advanceFromOrbIntro);
    }
  };

  window.requestAnimationFrame(advanceFromOrbIntro);
}

export default function ClaraGuideManualExpensePreview({ onNext }) {
  return (
    <ManualExpenseGuideSimulationProvider
      value={{
        onClose: returnToSingleTapLesson,
        onNext,
        nextLabel: "Next",
        safetyMessage: "GUIDE MODE — NOTHING WILL BE SAVED",
      }}
    >
      <DashboardFinanceModalRenderer
        financeModal={{ type: "manual_expense", payload: {} }}
        closeFinanceModal={returnToSingleTapLesson}
        financeActionLoading={false}
        financeForm={GUIDE_FORM}
        setFinanceForm={noop}
        deleteWalletInline={noop}
        addMoneyInline={noop}
        fmt={formatGuideMoney}
        transferMoneyInline={noop}
        wallets={GUIDE_WALLETS}
        saveManualExpenseInline={noop}
        manualExpenseCanSubmit={false}
        manualExpenseBudgetListItems={GUIDE_BUDGET_ITEMS}
        showFinanceNotice={noop}
        setManualExpenseBudgetListKey={noop}
        manualExpenseIsUnplanned={false}
        manualExpenseIsUndocumented={false}
        selectedManualExpenseBudget={GUIDE_SELECTED_BUDGET}
        handleBudgetModalClose={noop}
        monthlyBudgetPlan={GUIDE_MONTHLY_PLAN}
        budgetExitConfirm={false}
        saveBudgetInline={noop}
        setBudgetExitConfirm={noop}
        budgetFormDeclaredAmount={0}
        budgetProjectedAllocated={0}
        budgetProjectedUnallocated={0}
        budgetFinishHelper=""
        openBudgetModal={noop}
        openDeleteBudgetCategoryModal={noop}
        openResetBudgetModal={noop}
        budgetCanFinish={false}
        deleteBudgetCategoryInline={noop}
        resetBudgetInline={noop}
        saveSavingsGoalInline={noop}
        deleteSavingsGoalInline={noop}
        addSavingsInline={noop}
        dashboardShellReady
        showAiAssistant={false}
        setShowAiAssistant={noop}
        claraAssistantContext={{}}
      />
    </ManualExpenseGuideSimulationProvider>
  );
}
