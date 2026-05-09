import { useMemo } from "react";
import { firstValidNumber, normalizeString } from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardBudgetFormProgress({
  financeForm = {},
  financeModal = { type: null, payload: null },
  monthlyBudgetPlan = null,
  declaredMonthlyBudgetAmount = 0,
} = {}) {
  return useMemo(() => {
    const safeMonthlyBudgetPlan = monthlyBudgetPlan || { categories: [] };
    const safeCategories = Array.isArray(safeMonthlyBudgetPlan.categories)
      ? safeMonthlyBudgetPlan.categories
      : [];
    const editingBudgetId = normalizeString(financeModal?.payload?.id || "");
    const formCategoryAmount = firstValidNumber(financeForm.totalBudget);

    const budgetFormDeclaredAmount = firstValidNumber(
      financeForm.monthlyBudgetAmount,
      declaredMonthlyBudgetAmount,
      safeMonthlyBudgetPlan.declared_budget,
      safeMonthlyBudgetPlan.declaredBudget,
      safeMonthlyBudgetPlan.declaredAmount
    );

    const savedAllocated = safeCategories.reduce((sum, category) => {
      const categoryId = normalizeString(category?.id || category?.key || "");
      if (editingBudgetId && categoryId && categoryId === editingBudgetId) {
        return sum;
      }
      return sum + firstValidNumber(category?.allocated);
    }, 0);

    const budgetProjectedAllocated = savedAllocated + formCategoryAmount;
    const budgetProjectedUnallocated = Math.max(
      budgetFormDeclaredAmount - budgetProjectedAllocated,
      0
    );
    const budgetProjectedOverAllocated = Math.max(
      budgetProjectedAllocated - budgetFormDeclaredAmount,
      0
    );
    const budgetCanFinish =
      budgetFormDeclaredAmount > 0 &&
      safeCategories.length > 0 &&
      budgetProjectedUnallocated === 0 &&
      budgetProjectedOverAllocated === 0;

    let budgetFinishHelper = "";
    if (budgetFormDeclaredAmount <= 0) {
      budgetFinishHelper = "Declare your monthly budget amount first.";
    } else if (!safeCategories.length && formCategoryAmount <= 0) {
      budgetFinishHelper = "Add at least one budget category before finishing.";
    } else if (budgetProjectedOverAllocated > 0) {
      budgetFinishHelper = "Your categories are above your declared monthly budget.";
    } else if (budgetProjectedUnallocated > 0) {
      budgetFinishHelper = "Assign the remaining balance before finishing your budget.";
    }

    return {
      budgetFormDeclaredAmount,
      budgetProjectedAllocated,
      budgetProjectedUnallocated,
      budgetProjectedOverAllocated,
      budgetCanFinish,
      budgetFinishHelper,
    };
  }, [
    declaredMonthlyBudgetAmount,
    financeForm.monthlyBudgetAmount,
    financeForm.totalBudget,
    financeModal?.payload?.id,
    monthlyBudgetPlan,
  ]);
}
