import fs from "node:fs";

function replace(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Missing expected snippet in ${path}`);
  fs.writeFileSync(path, source.replace(before, after));
}

const file = "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js";
replace(
  file,
  'import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";\n',
  'import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";\nimport { resetMonthlyBudgetCycle } from "@/lib/clara-budget-cycle-reset";\n'
);
replace(file, '  budgetPlanIsComplete,\n  budgets,', '  budgetPlanIsComplete,\n  budgetCycleHeader,\n  budgets,');
replace(
  file,
  `  const resetBudgetInline = useCallback(async () => {
    const currentMonthKey = getPHMonthKey();
    const categoryIds = manualExpenseBudgetOptions
      .map((item) => item.id)
      .filter(Boolean);

    if (!categoryIds.length) return;

    try {
      setFinanceActionLoading(true);
      const nowIso = new Date().toISOString();
      await Promise.all(
        categoryIds.map((id) =>
          updateBudgetData?.(String(id), {
            tracking_start_date: nowIso,
            range_start: nowIso,
            updated_at: nowIso,
          })
        )
      );

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice(\`Budget tracking has been reset for \${currentMonthKey}.\`, "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to reset budget.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, manualExpenseBudgetOptions, refreshFinanceSection, showFinanceNotice]);`,
  `  const resetBudgetInline = useCallback(async () => {
    const sourceHeader = budgetCycleHeader || monthlyBudgetHeader || activeBudget;
    if (!sourceHeader?.id) return;

    try {
      setFinanceActionLoading(true);
      const nowIso = new Date().toISOString();
      const currentMonthKey = normalizeString(
        sourceHeader?.month || sourceHeader?.budget_month || sourceHeader?.month_key || getPHMonthKey()
      ) || getPHMonthKey();
      const cycleType = normalizeString(
        sourceHeader?.budget_cycle || sourceHeader?.cycle_type || "monthly"
      ) || "monthly";

      await resetMonthlyBudgetCycle({
        budgets,
        headerPayload: {
          month: currentMonthKey,
          month_key: currentMonthKey,
          title: "Monthly Spending Plan",
          name: "Monthly Spending Plan",
          category: "__monthly_budget__",
          budget_category: "__monthly_budget__",
          type: "monthly_budget",
          plan_type: "monthly_budget",
          is_plan_header: true,
          budget_cycle: cycleType,
          cycle_type: cycleType,
          cycle_start: nowIso,
          period_start: nowIso,
          cycle_end: sourceHeader?.cycle_end || sourceHeader?.period_end || "",
          period_end: sourceHeader?.period_end || sourceHeader?.cycle_end || "",
          reset_start_at: nowIso,
          declared_amount: 0,
          declared_budget: 0,
          monthly_budget_amount: 0,
          total_budget: 0,
          amount: 0,
          is_complete: false,
          status: "draft",
          is_active: true,
          active: true,
          user_id: user?.id || sourceHeader?.user_id || null,
          user_email: user?.email || sourceHeader?.user_email || sourceHeader?.email || null,
          email: user?.email || sourceHeader?.email || null,
          created_by: user?.email || sourceHeader?.created_by || null,
        },
        categoryPayloads: [],
        addBudget: addBudgetData,
        updateBudget: updateBudgetData,
      });

      await refreshFinanceSection();
      setExpandedFinanceCard("budgets");
      closeFinanceModal();
      showFinanceNotice(\`Budget cycle reset for \${currentMonthKey}. Transaction history was preserved.\`, "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to reset budget.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    activeBudget,
    addBudgetData,
    budgetCycleHeader,
    budgets,
    closeFinanceModal,
    monthlyBudgetHeader,
    refreshFinanceSection,
    showFinanceNotice,
    updateBudgetData,
    user?.email,
    user?.id,
  ]);`
);
replace(
  "src/lib/financeRepository.js",
  '              created_at: expense.created_at || expenseDate,',
  '              created_at: expense.created_at || expense.createdAt || operationTime,'
);
replace(
  "src/lib/financeRepository.js",
  '                created_at: expenseDate,',
  '                created_at: expense.created_at || expense.createdAt || operationTime,'
);
console.log("Patched reset action and immutable expense timestamps.");
