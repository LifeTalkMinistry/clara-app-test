import fs from "node:fs";

function replace(path, before, after, all = false) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Missing expected snippet in ${path}`);
  fs.writeFileSync(path, all ? source.split(before).join(after) : source.replace(before, after));
}

replace(
  "package.json",
  '    "lint:fix": "eslint . --fix",\n',
  '    "lint:fix": "eslint . --fix",\n    "test:budget-cycle": "node --test tests/budget-cycle-authority.test.mjs",\n'
);
replace(
  "src/pages/MonthlyBudgetPlan.jsx",
  '  const month = getPHMonthKey();\n  return { start: `${month}-01`, end: "", label: "Monthly" };',
  '  const month = getPHMonthKey();\n  const exactResetStart = String(start || "").includes("T") ? String(start) : "";\n  if (exactResetStart) {\n    return { start: exactResetStart, end: "", label: "Monthly", reset_start_at: exactResetStart };\n  }\n  return { start: `${month}-01`, end: "", label: "Monthly" };'
);
replace(
  "src/pages/MonthlyBudgetPlan.jsx",
  '    reset_start_at: cycle.reset_start_at || null,',
  '    ...(cycle.reset_start_at ? { reset_start_at: cycle.reset_start_at } : {}),',
  true
);
replace(
  "src/pages/MonthlyBudgetPlan.jsx",
  '  const { monthlyBudgetHeader, declaredMonthlyBudgetAmount } = useDashboardMonthlyBudgetHeader({ budgets });\n  const budgetOptions = useDashboardManualExpenseBudgetOptions({ budgets });\n  const plan = useDashboardMonthlyBudgetPlan({ manualExpenseBudgetOptions: budgetOptions, expenses, declaredMonthlyBudgetAmount, monthlyBudgetHeader });',
  '  const { budgetCycleHeader, monthlyBudgetHeader, declaredMonthlyBudgetAmount } = useDashboardMonthlyBudgetHeader({ budgets, user });\n  const budgetOptions = useDashboardManualExpenseBudgetOptions({ budgets, budgetCycleHeader, user });\n  const plan = useDashboardMonthlyBudgetPlan({ manualExpenseBudgetOptions: budgetOptions, expenses, declaredMonthlyBudgetAmount, budgetCycleHeader, monthlyBudgetHeader });'
);
replace(
  "src/pages/MonthlyBudgetPlan.jsx",
  '  const [cycleType, setCycleType] = useState(normalizeCycleType(monthlyBudgetHeader?.cycle_type || monthlyBudgetHeader?.budget_cycle || "monthly"));\n  const [cycleStart, setCycleStart] = useState(monthlyBudgetHeader?.cycle_start || today());\n  const [cycleEnd, setCycleEnd] = useState(monthlyBudgetHeader?.cycle_end || addDays(today(), 6));',
  '  const activeCycleHeader = budgetCycleHeader || monthlyBudgetHeader;\n  const [cycleType, setCycleType] = useState(normalizeCycleType(activeCycleHeader?.cycle_type || activeCycleHeader?.budget_cycle || "monthly"));\n  const [cycleStart, setCycleStart] = useState(activeCycleHeader?.reset_start_at || activeCycleHeader?.cycle_start || today());\n  const [cycleEnd, setCycleEnd] = useState(activeCycleHeader?.cycle_end || addDays(today(), 6));'
);
replace(
  "src/pages/MonthlyBudgetPlan.jsx",
  '    if (monthlyBudgetHeader?.id && typeof updateBudget === "function") return updateBudget(monthlyBudgetHeader.id, payload);\n    return addBudget?.(payload);',
  '    const editableHeader = monthlyBudgetHeader || (String(budgetCycleHeader?.status || "").toLowerCase() === "draft" ? budgetCycleHeader : null);\n    if (editableHeader?.id && typeof updateBudget === "function") return updateBudget(editableHeader.id, payload);\n    return addBudget?.(payload);'
);
replace(
  "src/pages/MonthlyBudgetPlan.jsx",
  '      for (const row of budgets.filter((item) => item?.id)) {\n        await deleteBudget(row.id);\n      }\n      await resetMonthlyBudgetCycle({\n        budgets: [],',
  '      await resetMonthlyBudgetCycle({\n        budgets,'
);
replace(
  "src/pages/Dashboard.jsx",
  '  const {\n    monthlyBudgetHeader,\n    declaredMonthlyBudgetAmount,\n  } = useDashboardMonthlyBudgetHeader({\n    budgets,\n  });',
  '  const {\n    budgetCycleHeader,\n    monthlyBudgetHeader,\n    declaredMonthlyBudgetAmount,\n  } = useDashboardMonthlyBudgetHeader({\n    budgets,\n    user,\n  });'
);
replace(
  "src/pages/Dashboard.jsx",
  '    useDashboardManualExpenseBudgetOptions({\n      budgets,\n    });',
  '    useDashboardManualExpenseBudgetOptions({\n      budgets,\n      budgetCycleHeader,\n      user,\n    });'
);
replace(
  "src/pages/Dashboard.jsx",
  '  const monthlyBudgetPlan = useDashboardMonthlyBudgetPlan({\n    manualExpenseBudgetOptions,\n    expenses,\n    declaredMonthlyBudgetAmount,\n  });',
  '  const monthlyBudgetPlan = useDashboardMonthlyBudgetPlan({\n    manualExpenseBudgetOptions,\n    expenses,\n    declaredMonthlyBudgetAmount,\n    budgetCycleHeader,\n    monthlyBudgetHeader,\n  });'
);
replace(
  "src/pages/Dashboard.jsx",
  '    budgetPlanIsComplete,\n    budgets,',
  '    budgetPlanIsComplete,\n    budgetCycleHeader,\n    budgets,'
);
console.log("Patched budget page and dashboard wiring.");
