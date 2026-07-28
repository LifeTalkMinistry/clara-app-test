import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, content) => fs.writeFileSync(file, content);

function replaceRequired(file, source, replacement, label) {
  const content = read(file);
  if (!content.includes(source)) {
    throw new Error(`Missing patch anchor (${label}) in ${file}`);
  }
  write(file, content.replace(source, replacement));
}

function replaceRegexRequired(file, pattern, replacement, label) {
  const content = read(file);
  if (!pattern.test(content)) {
    throw new Error(`Missing regex patch anchor (${label}) in ${file}`);
  }
  pattern.lastIndex = 0;
  write(file, content.replace(pattern, replacement));
}

replaceRegexRequired(
  "src/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetListItems.js",
  /\nfunction installProtectedFindBridge\([\s\S]*?\n}\n\nexport default function/,
  "\nexport default function",
  "remove protected find monkeypatch",
);
replaceRegexRequired(
  "src/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetListItems.js",
  /\n\s*\/\/ Compatibility bridge for the legacy Manual Log save handler:[\s\S]*?installProtectedFindBridge\(safeBudgetOptions, protectedItems\);\n/,
  "\n",
  "remove protected find bridge call",
);

replaceRequired(
  "src/pages/Dashboard.jsx",
  "    manualExpenseBudgetOptions,\n    monthlyBudgetHeader,",
  "    manualExpenseBudgetOptions,\n    selectedManualExpenseBudget,\n    monthlyBudgetHeader,",
  "pass selected budget to finance actions",
);

replaceRequired(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js",
  "  manualExpenseBudgetOptions,\n  monthlyBudgetHeader,",
  "  manualExpenseBudgetOptions,\n  selectedManualExpenseBudget,\n  monthlyBudgetHeader,",
  "receive selected budget",
);
replaceRegexRequired(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js",
  /    const selectedBudget = manualExpenseBudgetOptions\.find\(\n      \(item\) => String\(item\.key\) === String\(financeForm\.budgetListKey\)\n    \);/,
  `    const selectedBudget =
      isUnplanned || isUndocumented ? null : selectedManualExpenseBudget;
    const selectedBudgetRecord = selectedBudget?.budget || selectedBudget || null;
    const selectedBudgetKey = normalizeString(
      selectedBudget?.key || financeForm.budgetListKey
    );
    const selectedBudgetId = normalizeString(
      selectedBudget?.id || selectedBudgetRecord?.id || selectedBudgetKey
    );
    const selectedProtectionType = normalizeLower(
      selectedBudget?.protectionType ||
        selectedBudgetRecord?.protectionType ||
        selectedBudgetRecord?.protection_type ||
        selectedBudgetRecord?.linkedTargetType ||
        selectedBudgetRecord?.linked_target_type
    );
    const selectedLinkedTargetId = normalizeString(
      selectedBudgetRecord?.linkedTargetId ||
        selectedBudgetRecord?.linked_target_id ||
        selectedBudgetRecord?.sourceSavingsGoalId ||
        selectedBudgetRecord?.source_savings_goal_id
    );
    const selectedIsProtected = Boolean(
      selectedBudget?.isProtectedCommitment === true ||
        selectedBudgetRecord?.isProtectedCommitment === true ||
        selectedBudgetRecord?.is_protected_commitment === true
    );`,
  "resolve selected budget explicitly",
);
replaceRequired(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js",
  "        category: budgetCategory,\n        need_type: needType,",
  `        category: budgetCategory,
        budget_category: budgetCategory,
        budget_category_id: selectedBudgetId || null,
        budget_list_key: selectedBudgetKey || null,
        budgetListKey: selectedBudgetKey || null,
        is_protected_commitment: selectedIsProtected,
        protection_type: selectedProtectionType || null,
        linked_target_type: selectedProtectionType || null,
        linked_target_id: selectedLinkedTargetId || null,
        need_type: needType,`,
  "persist selected budget identity",
);
replaceRequired(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js",
  "    manualExpenseBudgetOptions,\n    pendingExpenses,",
  "    manualExpenseBudgetOptions,\n    selectedManualExpenseBudget,\n    pendingExpenses,",
  "selected budget dependency",
);

replaceRequired(
  "src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js",
  `const isDerivedBudget = (activeBudget = {}) =>
  activeBudget?.isDerivedBudget === true ||
  activeBudget?.is_derived_budget === true ||
  String(activeBudget?.budget_total_mode || activeBudget?.budgetTotalMode || "")
    .trim()
    .toLowerCase() === "derived_from_items";

`,
  "",
  "remove stale derived remaining branch",
);
replaceRegexRequired(
  "src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js",
  /  const protectedCommitments = safeNumber\([\s\S]*?  const remaining = derivedMode[\s\S]*?Math\.max\(declared - spent, 0\);/,
  `  const explicitRemaining = safeNumber(
    activeBudget?.remaining ?? activeBudget?.remaining_amount ?? activeBudget?.amount_left ?? activeBudget?.totalRemaining
  );
  const hasExplicitRemaining = hasValue(activeBudget?.remaining) || hasValue(activeBudget?.remaining_amount) || hasValue(activeBudget?.amount_left) || hasValue(activeBudget?.totalRemaining);
  const remaining = hasExplicitRemaining
    ? Math.max(explicitRemaining, 0)
    : Math.max(declared - spent, 0);`,
  "single remaining formula",
);
replaceRequired(
  "src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js",
  "  unallocatedAmount = 0,",
  "  unallocatedAmount = undefined,",
  "allow active budget unallocated fallback",
);
replaceRegexRequired(
  "src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js",
  /  const unallocated = Math\.max\(\n    safeNumber\(unallocatedAmount \?\? activeBudget\?\.unallocated_amount \?\? activeBudget\?\.unallocated \?\? activeBudget\?\.unallocated_balance \?\? activeBudget\?\.unallocatedBalance \?\? declared - allocated\),\n    0\n  \);/,
  `  const activeUnallocated =
    activeBudget?.unallocated_amount ??
    activeBudget?.unallocated ??
    activeBudget?.unallocated_balance ??
    activeBudget?.unallocatedBalance;
  const unallocatedSource = hasValue(unallocatedAmount)
    ? unallocatedAmount
    : hasValue(activeUnallocated)
      ? activeUnallocated
      : declared - allocated;
  const unallocated = Math.max(safeNumber(unallocatedSource), 0);`,
  "unallocated fallback",
);
replaceRequired(
  "src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js",
  "    (hasDeclaredBudget && unallocated === 0 && allocated === declared);",
  "    (hasDeclaredBudget && unallocated < 0.005 && Math.abs(allocated - declared) < 0.005);",
  "currency-safe plan completion",
);
replaceRequired(
  "src/components/BudgetCard.jsx",
  "  unallocatedAmount = 0,",
  "  unallocatedAmount = undefined,",
  "BudgetCard unallocated fallback",
);

replaceRequired(
  "src/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlanEngine.js",
  `    const remaining = hasActiveBudgetPlan
      ? Math.max(declared - spent - protectedCommitmentsTotal, 0)
      : 0;`,
  `    const remaining = hasActiveBudgetPlan
      ? Math.max(declared - spent, 0)
      : 0;`,
  "engine remaining truth",
);
replaceRegexRequired(
  "src/components/financial-carousel/logic/financeCarouselDataHelpersCore.js",
  /\n  const protectedCommitmentsAmount = readCarouselNumber\([\s\S]*?\n  \);\n  const remainingAmount = Math\.max\(declaredBudget - spentAmount - protectedCommitmentsAmount, 0\);/,
  "\n  const remainingAmount = Math.max(declaredBudget - spentAmount, 0);",
  "carousel remaining truth",
);

replaceRegexRequired(
  "src/components/fresh/main-dashboard/budget/useDashboardBudgetFormProgress.js",
  /    const budgetProjectedAllocated = savedAllocated \+ formCategoryAmount;\n    const budgetProjectedCovered = budgetProjectedAllocated \+ protectedCommitments;\n    const budgetProjectedUnallocated = Math\.max\(\n      budgetFormDeclaredAmount - budgetProjectedCovered,\n      0\n    \);\n    const budgetProjectedOverAllocated = Math\.max\(\n      budgetProjectedCovered - budgetFormDeclaredAmount,\n      0\n    \);\n    const budgetCanFinish =\n      budgetFormDeclaredAmount > 0 &&\n      safeCategories\.length > 0 &&\n      budgetProjectedUnallocated === 0 &&\n      budgetProjectedOverAllocated === 0;/,
  `    const budgetProjectedAllocated = savedAllocated + formCategoryAmount;
    const budgetProjectedCovered = budgetProjectedAllocated + protectedCommitments;
    const declaredUnits = Math.round(budgetFormDeclaredAmount * 100);
    const coveredUnits = Math.round(budgetProjectedCovered * 100);
    const budgetProjectedUnallocated = Math.max((declaredUnits - coveredUnits) / 100, 0);
    const budgetProjectedOverAllocated = Math.max((coveredUnits - declaredUnits) / 100, 0);
    const budgetCanFinish =
      declaredUnits > 0 &&
      safeCategories.length > 0 &&
      coveredUnits === declaredUnits;`,
  "currency-safe form progress",
);

replaceRequired(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js",
  "    if (finish && projectedAllocated !== declaredAmount) {",
  "    if (finish && projectedAllocatedUnits !== declaredUnits) {",
  "currency-safe finish comparison",
);
replaceRequired(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js",
  "      const complete = finish && projectedAllocated === declaredAmount && projectedUnallocated === 0;",
  "      const complete = finish && projectedAllocatedUnits === declaredUnits;",
  "currency-safe completion flag",
);

replaceRequired(
  "package.json",
  "tests/wallet-expanded-flow-regression.test.mjs\"",
  "tests/wallet-expanded-flow-regression.test.mjs tests/budget-card-truth-regression.test.mjs\"",
  "register Budget regression",
);

write(
  "tests/budget-card-truth-regression.test.mjs",
  `import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(\`../\${relativePath}\`, import.meta.url), "utf8");

const listItems = readSource("src/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetListItems.js");
const dashboard = readSource("src/pages/Dashboard.jsx");
const actions = readSource("src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js");
const budgetLogic = readSource("src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js");
const budgetEngine = readSource("src/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlanEngine.js");
const carouselCore = readSource("src/components/financial-carousel/logic/financeCarouselDataHelpersCore.js");
const formProgress = readSource("src/components/fresh/main-dashboard/budget/useDashboardBudgetFormProgress.js");

test("protected Manual Log selections use explicit selected-budget ownership", () => {
  assert.doesNotMatch(listItems, /installProtectedFindBridge|Object\\.defineProperty\\(options, "find"/);
  assert.match(dashboard, /manualExpenseBudgetOptions,\\s*selectedManualExpenseBudget,\\s*monthlyBudgetHeader/);
  assert.match(actions, /isUnplanned \\|\\| isUndocumented \\? null : selectedManualExpenseBudget/);
  assert.match(actions, /budget_category_id: selectedBudgetId \\|\\| null/);
  assert.match(actions, /budget_list_key: selectedBudgetKey \\|\\| null/);
  assert.match(actions, /linked_target_type: selectedProtectionType \\|\\| null/);
});

test("Budget remaining has one actual-spending formula", () => {
  assert.match(budgetEngine, /Math\\.max\\(declared - spent, 0\\)/);
  assert.doesNotMatch(budgetEngine, /declared - spent - protectedCommitmentsTotal/);
  assert.match(carouselCore, /Math\\.max\\(declaredBudget - spentAmount, 0\\)/);
  assert.doesNotMatch(carouselCore, /declaredBudget - spentAmount - protectedCommitmentsAmount/);
  assert.doesNotMatch(budgetLogic, /derivedMode|protectedReserved/);
  assert.match(actions, /const headerRemaining = Math\\.max\\(declared, 0\\)/);
});

test("Budget completion compares currency units instead of floating point amounts", () => {
  assert.match(formProgress, /const declaredUnits = Math\\.round\\(budgetFormDeclaredAmount \\* 100\\)/);
  assert.match(formProgress, /coveredUnits === declaredUnits/);
  assert.match(actions, /const projectedAllocatedUnits = Math\\.round\\(projectedAllocated \\* 100\\)/);
  assert.match(actions, /projectedAllocatedUnits !== declaredUnits/);
  assert.doesNotMatch(actions, /projectedAllocated !== declaredAmount/);
});

test("Budget unallocated fallback does not force a missing value to zero", () => {
  assert.match(budgetLogic, /unallocatedAmount = undefined/);
  assert.match(budgetLogic, /const unallocatedSource = hasValue\\(unallocatedAmount\\)/);
});
`
);

console.log("Budget card truth refactor applied.");
