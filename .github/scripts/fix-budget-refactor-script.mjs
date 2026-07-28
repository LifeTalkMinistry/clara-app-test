import fs from "node:fs";

const generatorFile = ".github/scripts/refactor-budget-card-truth.mjs";
const actionFile = "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js";

let generator = fs.readFileSync(generatorFile, "utf8");
let actions = fs.readFileSync(actionFile, "utf8");

const allocationSource = `    const currentAllocated = firstValidNumber(monthlyBudgetPlan?.allocated_amount, monthlyBudgetPlan?.allocated_total);
    const existingAllocation = existingCategory?.id ? getBudgetTotal(existingCategory) : 0;
    const projectedAllocated = shouldSaveCategory
      ? currentAllocated - existingAllocation + categoryAmount
      : currentAllocated;
    const remainingToAllocate = Math.max(declaredAmount - (currentAllocated - existingAllocation), 0);
    const projectedUnallocated = Math.max(declaredAmount - projectedAllocated, 0);

    if (projectedAllocated > declaredAmount) {`;

const allocationReplacement = `    const currentAllocated = firstValidNumber(monthlyBudgetPlan?.allocated_amount, monthlyBudgetPlan?.allocated_total);
    const existingAllocation = existingCategory?.id ? getBudgetTotal(existingCategory) : 0;
    const projectedAllocated = shouldSaveCategory
      ? currentAllocated - existingAllocation + categoryAmount
      : currentAllocated;
    const declaredUnits = Math.round(declaredAmount * 100);
    const projectedAllocatedUnits = Math.round(projectedAllocated * 100);
    const allocatedBeforeEditUnits = Math.round((currentAllocated - existingAllocation) * 100);
    const remainingToAllocate = Math.max((declaredUnits - allocatedBeforeEditUnits) / 100, 0);
    const projectedUnallocated = Math.max((declaredUnits - projectedAllocatedUnits) / 100, 0);

    if (projectedAllocatedUnits > declaredUnits) {`;

if (!actions.includes(allocationSource)) {
  throw new Error("Could not locate the Budget allocation block in the finance handler.");
}
actions = actions.replace(allocationSource, allocationReplacement);
fs.writeFileSync(actionFile, actions);

const generatorCall = /replaceRegexRequired\(\n  "src\/components\/fresh\/main-dashboard\/finance-actions\/useDashboardFinanceActionHandlers\.js",\n  \/    const currentAllocated[\s\S]*?  "currency-safe budget allocation",\n\);\n/;
if (!generatorCall.test(generator)) {
  throw new Error("Could not locate the stale Budget allocation patch call in the generator.");
}
generator = generator.replace(generatorCall, "");
fs.writeFileSync(generatorFile, generator);
