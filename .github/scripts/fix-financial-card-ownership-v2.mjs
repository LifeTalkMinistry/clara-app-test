import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.join(process.cwd(), ".github/scripts/fix-financial-card-ownership.mjs");
const generatedPath = path.join(process.cwd(), ".github/scripts/.generated-fix-financial-card-ownership.mjs");
let source = fs.readFileSync(sourcePath, "utf8");

function harden(exact, flexible, label) {
  if (!source.includes(exact)) {
    throw new Error(`Unable to harden the ${label} migration anchor.`);
  }
  source = source.replace(exact, flexible);
}

const exactHomeInvocation = `replaceRequired(
  homePanelPath,
  \`                   profileData={isGuideMode ? { plan: "pro" } : profileData}\\n                   firstPositiveNumber={firstPositiveNumber}\\n                   readStoredSurvivalExpense={isGuideMode ? undefined : readStoredSurvivalExpense}\\n                   monthlyBudgetPlan={effectiveMonthlyBudgetPlan}\`,
  \`                   profileData={isGuideMode ? { plan: "pro" } : profileData}\\n                   financeCardController={isGuideMode ? null : financeCardController}\\n                   monthlyBudgetPlan={effectiveMonthlyBudgetPlan}\`,
  "home panel finance carousel controller"
);`;

const flexibleHomeInvocation = `replaceRequired(
  homePanelPath,
  /profileData=\\{isGuideMode \\? \\{ plan: "pro" \\} : profileData\\}\\s+firstPositiveNumber=\\{firstPositiveNumber\\}\\s+readStoredSurvivalExpense=\\{isGuideMode \\? undefined : readStoredSurvivalExpense\\}\\s+monthlyBudgetPlan=\\{effectiveMonthlyBudgetPlan\\}/,
  \`profileData={isGuideMode ? { plan: "pro" } : profileData}\\n                   financeCardController={isGuideMode ? null : financeCardController}\\n                   monthlyBudgetPlan={effectiveMonthlyBudgetPlan}\`,
  "home panel finance carousel controller"
);`;

const exactCarouselData = `replaceRequired(
  carouselPath,
  \`       survivalExpense,\\n       user: userId || userPlan ? { id: userId, plan: userPlan } : null,\`,
  \`       survivalExpense,\\n       financeEmergencyFund,\\n       financeTotalIncome,\\n       financeTotalExpenses,\\n       financeTotalWalletBalance,\\n       user: userId || userPlan ? { id: userId, plan: userPlan } : null,\`,
  "carousel card data totals"
);`;

const flexibleCarouselData = `replaceRequired(
  carouselPath,
  /survivalExpense,\\s+user: userId \\|\\| userPlan \\? \\{ id: userId, plan: userPlan \\} : null,/,
  \`survivalExpense,\\n      financeEmergencyFund,\\n      financeTotalIncome,\\n      financeTotalExpenses,\\n      financeTotalWalletBalance,\\n      user: userId || userPlan ? { id: userId, plan: userPlan } : null,\`,
  "carousel card data totals"
);`;

const exactCarouselHelpers = `replaceRequired(
  carouselPath,
  \`       firstPositiveNumber,\\n       readStoredSurvivalExpense,\\n\`,
  \`\`,
  "carousel removes obsolete emergency helpers"
);`;

const flexibleCarouselHelpers = `replaceRequired(
  carouselPath,
  /\\n\\s+firstPositiveNumber,\\n\\s+readStoredSurvivalExpense,/g,
  \`\`,
  "carousel removes obsolete emergency helpers"
);`;

const redundantCarouselPropCleanup = `replaceRequired(
  carouselPath,
  \`    firstPositiveNumber,\\n    readStoredSurvivalExpense,\\n    financeCardController = null,\`,
  \`    financeCardController = null,\`,
  "carousel prop cleanup"
);`;

const invalidDashboardControllerAssertion = `  assert.match(dashboard, /const financeCardController = \\{/);`;
const safeDashboardControllerAssertion = `  assert.equal(dashboard.includes("const financeCardController = {"), true);`;
const invalidHomeControllerAssertion = `  assert.match(homePanel, /financeCardController=\\{isGuideMode \\? null : financeCardController\\}/);`;
const safeHomeControllerAssertion = `  assert.equal(homePanel.includes("financeCardController={isGuideMode ? null : financeCardController}"), true);`;
const invalidCarouselControllerAssertion = `  assert.match(carousel, /financeCardController \\|\\| \\{\\}/);`;
const safeCarouselControllerAssertion = `  assert.equal(carousel.includes("financeCardController || {}"), true);`;
const invalidBudgetAssertion = `  assert.match(budgetLogic, /export \\{ default \\} from "\\.\\/useBudgetCardLogicCore"/);`;
const safeBudgetAssertion = `  assert.equal(budgetLogic.includes('export { default } from "./useBudgetCardLogicCore";'), true);`;

harden(exactHomeInvocation, flexibleHomeInvocation, "Home Panel");
harden(exactCarouselData, flexibleCarouselData, "carousel card data");
harden(exactCarouselHelpers, flexibleCarouselHelpers, "carousel helper cleanup");
harden(redundantCarouselPropCleanup, "", "redundant carousel prop cleanup");
harden(invalidDashboardControllerAssertion, safeDashboardControllerAssertion, "Dashboard controller assertion");
harden(invalidHomeControllerAssertion, safeHomeControllerAssertion, "Home controller assertion");
harden(invalidCarouselControllerAssertion, safeCarouselControllerAssertion, "carousel controller assertion");
harden(invalidBudgetAssertion, safeBudgetAssertion, "Budget regression assertion");
fs.writeFileSync(generatedPath, source, "utf8");

try {
  await import(pathToFileURL(generatedPath).href);

  const packagePath = path.join(process.cwd(), "package.json");
  let packageSource = fs.readFileSync(packagePath, "utf8");
  if (!packageSource.includes("tests/financial-card-ownership-regression.test.mjs")) {
    const anchor = 'tests/learning-hub-first-click.test.mjs"';
    if (!packageSource.includes(anchor)) {
      throw new Error("Unable to add the financial card regression to npm test.");
    }
    packageSource = packageSource.replace(
      anchor,
      'tests/learning-hub-first-click.test.mjs tests/financial-card-ownership-regression.test.mjs"'
    );
    fs.writeFileSync(packagePath, packageSource, "utf8");
  }
} finally {
  if (fs.existsSync(generatedPath)) fs.rmSync(generatedPath);
}
