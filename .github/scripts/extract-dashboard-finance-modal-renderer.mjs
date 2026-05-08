import fs from "node:fs";
import path from "node:path";

const dashboardPath = "src/pages/Dashboard.jsx";
const rendererPath = "src/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer.jsx";

let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const rendererImport = 'import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";\n';
const importAnchor = 'import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";\n';

if (!source.includes(rendererImport.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("DashboardModalLayer import anchor not found.");
  }
  source = source.replace(importAnchor, `${importAnchor}${rendererImport}`);
}

const startNeedle = `      <ManualExpenseFullScreenSheet
        open={financeModal.type === "manual_expense"}`;
const endNeedle = `      {dashboardShellReady ? (
        <ClaraAssistantPanel
          open={showAiAssistant}
          onClose={() => setShowAiAssistant(false)}
          context={claraAssistantContext}
        />
      ) : null}`;

const alreadyWired = source.includes("<DashboardFinanceModalRenderer");
let extractedJsx = "";

const rendererProps = [
  "financeModal",
  "closeFinanceModal",
  "saveManualExpenseInline",
  "financeActionLoading",
  "financeForm",
  "setFinanceForm",
  "wallets",
  "monthlyBudgetPlan",
  "addMoneyInline",
  "fmt",
  "transferMoneyInline",
  "saveWalletInline",
  "budgetFormDeclaredAmount",
  "budgetCanFinish",
  "setBudgetExitConfirm",
  "budgetExitConfirm",
  "saveBudgetInline",
  "budgetProjectedAllocated",
  "budgetProjectedUnallocated",
  "budgetFinishHelper",
  "openBudgetModal",
  "openDeleteBudgetCategoryModal",
  "deleteBudgetCategoryInline",
  "resetBudgetInline",
  "saveSavingsGoalInline",
  "deleteSavingsGoalInline",
  "addSavingsInline",
  "dashboardShellReady",
  "showAiAssistant",
  "setShowAiAssistant",
  "claraAssistantContext",
];

const renderPropSpread = rendererProps.map((name) => `        ${name}={${name}}`).join("\n");
const rendererUsage = `      <DashboardFinanceModalRenderer
${renderPropSpread}
      />`;

if (!alreadyWired) {
  const startIndex = source.indexOf(startNeedle);
  if (startIndex === -1) {
    throw new Error("ManualExpenseFullScreenSheet modal cluster start not found.");
  }

  const endIndex = source.indexOf(endNeedle, startIndex);
  if (endIndex === -1) {
    throw new Error("ClaraAssistantPanel modal cluster end not found.");
  }

  const endExclusive = endIndex + endNeedle.length;
  extractedJsx = source.slice(startIndex, endExclusive);
  source = source.slice(0, startIndex) + rendererUsage + source.slice(endExclusive);
} else {
  if (!fs.existsSync(rendererPath)) {
    throw new Error("Dashboard already references DashboardFinanceModalRenderer but the renderer file is missing.");
  }
}

if (!alreadyWired) {
  const componentSource = `import { Edit, Trash2, Wallet } from "lucide-react";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import ManualExpenseFullScreenSheet from "@/components/fresh/main-dashboard/dashboard-primitives/ManualExpenseFullScreenSheet";
import QuickActionDropdown from "@/components/fresh/main-dashboard/dashboard-primitives/QuickActionDropdown";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import {
  financeInputClassName,
  UNDOCUMENTED_SPENDING_REASONS,
} from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import {
  getWalletDisplayName,
  getBudgetListTitle,
  getBudgetCategoryKey,
  getWalletDisplayBalance,
  getSavingsGoalTitle,
  getSavingsTarget,
  getSavingsSaved,
} from "@/utils/dashboard/dashboardHelpers";

export default function DashboardFinanceModalRenderer({
${rendererProps.map((name) => `  ${name},`).join("\n")}
}) {
  return (
    <>
${extractedJsx}
    </>
  );
}
`;

  fs.mkdirSync(path.dirname(rendererPath), { recursive: true });
  fs.writeFileSync(rendererPath, componentSource);
}

const requiredDashboardTokens = [
  rendererImport.trim(),
  "<DashboardFinanceModalRenderer",
  "<DashboardModalLayer>",
  "</DashboardModalLayer>",
];

for (const token of requiredDashboardTokens) {
  if (!source.includes(token)) {
    throw new Error(`Required dashboard token missing after finance modal renderer extraction: ${token}`);
  }
}

if (source.includes(startNeedle)) {
  throw new Error("ManualExpenseFullScreenSheet cluster still exists in Dashboard.jsx after extraction.");
}

if (!fs.existsSync(rendererPath)) {
  throw new Error("DashboardFinanceModalRenderer.jsx was not created.");
}

if (source === original && alreadyWired) {
  console.log("Dashboard finance modal renderer is already extracted.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Extracted Dashboard finance modal renderer safely.");
