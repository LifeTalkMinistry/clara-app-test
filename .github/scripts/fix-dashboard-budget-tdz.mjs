import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";

if (!fs.existsSync(dashboardPath)) {
  console.warn("Dashboard file not found.");
  process.exit(0);
}

let source = fs.readFileSync(dashboardPath, "utf8");
const before = source;

const riskyNames = [
  "declaredMonthlyBudgetAmount",
  "monthlyBudgetPlan",
  "activeBudget",
  "budgetPlanIsComplete",
  "budgetAllocatedSoFar",
  "budgetFormDeclaredAmount",
  "budgetFormCategoryAmount",
  "budgetAllocatedExcludingCurrent",
  "budgetRemainingToAllocate",
  "monthlyBudgetHeader",
  "manualExpenseBudgetOptions",
  "selectedManualExpenseBudget",
  "selectedBudgetListLabel",
  "manualExpenseCanSubmit"
];

for (const name of riskyNames) {
  const pattern = new RegExp(",\\s*\\[[^\\]]*\\b" + name + "\\b[^\\]]*\\]\\s*\\)", "g");
  source = source.replace(pattern, ")");
}

if (source === before) {
  console.log("Dashboard TDZ safety patch: no risky dependency arrays found.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Dashboard TDZ safety patch removed risky hook dependency arrays before build.");
