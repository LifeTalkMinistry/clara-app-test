import fs from "node:fs";

const file = ".github/scripts/refactor-budget-card-truth.mjs";
let content = fs.readFileSync(file, "utf8");

const oldPattern = String.raw`/    const currentAllocated = firstValidNumber\(monthlyBudgetPlan\?\.allocated_amount, monthlyBudgetPlan\?\.allocated_total\);\n    const existingAllocation = existingCategory\?\.id \? getBudgetTotal\(existingCategory\) : 0;\n    const projectedAllocated = shouldSaveCategory\n      \? currentAllocated - existingAllocation \+ categoryAmount\n      : currentAllocated;\n    const remainingToAllocate = Math\.max\(declaredAmount - \(currentAllocated - existingAllocation\), 0\);\n    const projectedUnallocated = Math\.max\(declaredAmount - projectedAllocated, 0\);\n\n    if \(projectedAllocated > declaredAmount\) \{/`;
const newPattern = String.raw`/    const currentAllocated = firstValidNumber\([\s\S]*?    if \(projectedAllocated > declaredAmount\) \{/`;

if (!content.includes(oldPattern)) {
  throw new Error("Could not locate the Budget allocation regex in the generator.");
}

content = content.replace(oldPattern, newPattern);
fs.writeFileSync(file, content);
