import fs from "node:fs";

function replace(path, before, after, all = false) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Missing expected snippet in ${path}`);
  fs.writeFileSync(path, all ? source.split(before).join(after) : source.replace(before, after));
}

replace(
  "src/components/financial-carousel/cards/budget/ui/BudgetCardContent.jsx",
  'import { useState } from "react";',
  'import { useEffect, useState } from "react";'
);
replace(
  "src/components/financial-carousel/cards/budget/ui/BudgetCardContent.jsx",
  `  const driftDetailItems = buildDriftDetailItems({
    outsidePlanItems,
    unplannedItems,
    undocumentedItems,
  });

  if (!expanded) {`,
  `  const driftDetailItems = buildDriftDetailItems({
    outsidePlanItems,
    unplannedItems,
    undocumentedItems,
  });

  useEffect(() => {
    if (showDriftModal && outsidePlanSpent <= 0 && driftDetailItems.length === 0) {
      setShowDriftModal(false);
    }
  }, [driftDetailItems.length, outsidePlanSpent, showDriftModal]);

  if (!expanded) {`
);
replace(
  "src/lib/clara-dashboard-cards-ai-reader.js",
  `  const normalizedPlan = normalizeCarouselBudgetPlan(plan, totalSpent);
  const declaredBudget = firstNumber(normalizedPlan.declaredBudget, totalBudgetFromRecords, context.dashboardSummarySnapshot?.budgetDeclaredAmount) ?? 0;
  const spentAmount = Math.max(cleanNumber(normalizedPlan.totalSpent), totalSpent);
  const remaining = declaredBudget > 0 ? Math.max(declaredBudget - spentAmount, 0) : cleanNumber(context.dashboardSummarySnapshot?.budgetRemaining ?? normalizedPlan.remainingAmount);
  const unplannedCount = expensesThisMonth.filter((expense) => getExpensePlanningStatus(expense) === "unplanned").length + safeArray(normalizedPlan.outsidePlanItems).length;`,
  `  const hasAuthoritativePlan = Boolean(context.monthlyBudgetPlan);
  const normalizedPlan = normalizeCarouselBudgetPlan(plan, hasAuthoritativePlan ? 0 : totalSpent);
  const declaredBudget = firstNumber(normalizedPlan.declaredBudget, totalBudgetFromRecords, context.dashboardSummarySnapshot?.budgetDeclaredAmount) ?? 0;
  const spentAmount = hasAuthoritativePlan
    ? cleanNumber(normalizedPlan.totalSpent)
    : Math.max(cleanNumber(normalizedPlan.totalSpent), totalSpent);
  const remaining = declaredBudget > 0 ? Math.max(declaredBudget - spentAmount, 0) : cleanNumber(context.dashboardSummarySnapshot?.budgetRemaining ?? normalizedPlan.remainingAmount);
  const unplannedCount = hasAuthoritativePlan
    ? safeArray(normalizedPlan.outsidePlanItems).length
    : expensesThisMonth.filter((expense) => getExpensePlanningStatus(expense) === "unplanned").length + safeArray(normalizedPlan.outsidePlanItems).length;`
);
replace(
  "src/lib/clara-budget-snapshot.js",
  '  const range = plan.monthRange || getCycleRange(activeHeader || {});',
  '  const range = plan.monthRange || getCycleRange(source.budgetCycleHeader || activeHeader || {});'
);
const assistantFile = "src/components/fresh/main-dashboard/assistant/useDashboardClaraAssistantContext.js";
replace(
  assistantFile,
  '  activeBudget = null,\n  derivedActiveBudget = null,',
  '  activeBudget = null,\n  derivedActiveBudget = null,\n  monthlyBudgetPlan = null,'
);
replace(
  assistantFile,
  `    const currentMonthExpenses = safeExpenses.filter((expense) => {
      const itemDate = getTransactionDate(expense);
      return Boolean(itemDate && getPHMonthKey(itemDate) === currentMonthKey);
    });

    const monthlySpent =`,
  `    const currentMonthExpenses = safeExpenses.filter((expense) => {
      const itemDate = getTransactionDate(expense);
      return Boolean(itemDate && getPHMonthKey(itemDate) === currentMonthKey);
    });
    const explicitBudgetCycleExpenses = Array.isArray(monthlyBudgetPlan?.activeCycleExpenses)
      ? monthlyBudgetPlan.activeCycleExpenses
      : Array.isArray(monthlyBudgetPlan?.active_cycle_expenses)
        ? monthlyBudgetPlan.active_cycle_expenses
        : null;
    const budgetCycleExpenses = explicitBudgetCycleExpenses || currentMonthExpenses;

    const monthlySpent =`
);
replace(
  assistantFile,
  'currentMonthExpenses.filter((expense) =>',
  'budgetCycleExpenses.filter((expense) =>',
  true
);
replace(
  assistantFile,
  '    const categoryBreakdown = buildCategoryBreakdown(currentMonthExpenses);',
  '    const categoryBreakdown = buildCategoryBreakdown(budgetCycleExpenses);'
);
replace(
  assistantFile,
  '      currentMonthExpenses,\n      recentExpenses,',
  '      currentMonthExpenses,\n      budgetCycleExpenses,\n      recentExpenses,'
);
replace(
  assistantFile,
  '    derivedActiveBudget,\n  ]);',
  '    derivedActiveBudget,\n    monthlyBudgetPlan,\n  ]);'
);
console.log("Patched budget card and AI consumers.");
