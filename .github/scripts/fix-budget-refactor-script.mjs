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

const resetSource = `    const protectedAmount = firstValidNumber(
      monthlyBudgetPlan?.totalProtectedCommitments,
      monthlyBudgetPlan?.protected_commitments_total,
      monthlyBudgetPlan?.protectedBudgetCommitments?.totalProtectedCommitments,
      monthlyBudgetPlan?.protected_budget_commitments?.totalProtectedCommitments,
      monthlyBudgetPlan?.protected_budget_commitments?.total_protected_commitments
    );

    const headerRemaining = Math.max(declared - protectedAmount, 0);`;
const resetReplacement = `    const headerRemaining = Math.max(declared, 0);`;

if (!actions.includes(resetSource)) {
  throw new Error("Could not locate the exact Budget reset remaining block.");
}
actions = actions.replace(resetSource, resetReplacement);
fs.writeFileSync(actionFile, actions);

const allocationGeneratorCall = /replaceRegexRequired\(\n  "src\/components\/fresh\/main-dashboard\/finance-actions\/useDashboardFinanceActionHandlers\.js",\n  \/    const currentAllocated[\s\S]*?  "currency-safe budget allocation",\n\);\n/;
if (!allocationGeneratorCall.test(generator)) {
  throw new Error("Could not locate the stale Budget allocation patch call in the generator.");
}
generator = generator.replace(allocationGeneratorCall, "");

const resetGeneratorCall = /replaceRegexRequired\(\n  "src\/components\/fresh\/main-dashboard\/finance-actions\/useDashboardFinanceActionHandlers\.js",\n  \/\\n    const protectedAmount[\s\S]*?  "reset remaining truth",\n\);\n/;
if (!resetGeneratorCall.test(generator)) {
  throw new Error("Could not locate the stale Budget reset patch call in the generator.");
}
generator = generator.replace(resetGeneratorCall, "");
fs.writeFileSync(generatorFile, generator);
