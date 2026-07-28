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

const invalidBudgetAssertion = `  assert.match(budgetLogic, /export \\{ default \\} from "\\.\\/useBudgetCardLogicCore"/);`;
const safeBudgetAssertion = `  assert.equal(budgetLogic.includes('export { default } from "./useBudgetCardLogicCore";'), true);`;

harden(exactHomeInvocation, flexibleHomeInvocation, "Home Panel");
harden(exactCarouselData, flexibleCarouselData, "carousel card data");
harden(exactCarouselHelpers, flexibleCarouselHelpers, "carousel helper cleanup");
harden(redundantCarouselPropCleanup, "", "redundant carousel prop cleanup");
harden(invalidBudgetAssertion, safeBudgetAssertion, "Budget regression assertion");
fs.writeFileSync(generatedPath, source, "utf8");

try {
  await import(pathToFileURL(generatedPath).href);
} finally {
  if (fs.existsSync(generatedPath)) fs.rmSync(generatedPath);
}
