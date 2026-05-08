import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const replacements = [
  ["        saveWalletInline={saveWalletInline}\n", ""],
  ["        handleBudgetModalClose={handleBudgetModalClose}\n", ""],
  ["        manualExpenseCanSubmit={manualExpenseCanSubmit}\n", ""],
  ["        manualExpenseBudgetListItems={manualExpenseBudgetListItems}\n", ""],
  ["        setManualExpenseBudgetListKey={setManualExpenseBudgetListKey}\n", ""],
  ["        manualExpenseIsUnplanned={manualExpenseIsUnplanned}\n", ""],
  ["        manualExpenseIsUndocumented={manualExpenseIsUndocumented}\n", ""],
  ["        selectedManualExpenseBudget={selectedManualExpenseBudget}\n", ""],
];

for (const [from, to] of replacements) {
  source = source.replaceAll(from, to);
}

if (!source.includes("<DashboardFinanceModalRenderer")) {
  throw new Error("DashboardFinanceModalRenderer usage not found in Dashboard.jsx.");
}

for (const [from] of replacements) {
  if (source.includes(from.trim())) {
    throw new Error(`Unsafe renderer prop still present: ${from.trim()}`);
  }
}

if (source === original) {
  console.log("No unsafe DashboardFinanceModalRenderer props found.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Removed unsafe DashboardFinanceModalRenderer props from Dashboard.jsx.");
