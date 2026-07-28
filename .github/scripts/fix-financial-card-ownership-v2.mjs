import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.join(process.cwd(), ".github/scripts/fix-financial-card-ownership.mjs");
const generatedPath = path.join(process.cwd(), ".github/scripts/.generated-fix-financial-card-ownership.mjs");
let source = fs.readFileSync(sourcePath, "utf8");

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

if (!source.includes(exactHomeInvocation)) {
  throw new Error("Unable to harden the Home Panel migration anchor.");
}

source = source.replace(exactHomeInvocation, flexibleHomeInvocation);
fs.writeFileSync(generatedPath, source, "utf8");

try {
  await import(pathToFileURL(generatedPath).href);
} finally {
  if (fs.existsSync(generatedPath)) fs.rmSync(generatedPath);
}
