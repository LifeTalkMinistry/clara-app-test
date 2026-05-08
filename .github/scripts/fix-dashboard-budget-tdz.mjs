import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";

if (!fs.existsSync(dashboardPath)) {
  console.warn(`Dashboard file not found: ${dashboardPath}`);
  process.exit(0);
}

const source = fs.readFileSync(dashboardPath, "utf8");

const openBudgetModalPattern = /const openBudgetModal = useCallback\(\(budgetCategory = null\) => \{([\s\S]*?)\n  \}, \[declaredMonthlyBudgetAmount, monthlyBudgetPlan\?\.declared_amount, monthlyBudgetPlan\?\.declared_budget\]\);/;

const nextSource = source.replace(
  openBudgetModalPattern,
  "function openBudgetModal(budgetCategory = null) {$1\n  }"
);

if (nextSource === source) {
  console.log("Dashboard budget TDZ fix already applied or pattern not found.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, nextSource);
console.log("Fixed Dashboard openBudgetModal TDZ crash before build.");
