import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const bodyStartIndex = source.indexOf("let dashboardPageCache");
if (bodyStartIndex === -1) {
  throw new Error("Dashboard body boundary not found.");
}

const getBody = () => source.slice(bodyStartIndex);
const isUsedInBody = (name) => new RegExp(`\\b${name}\\b`).test(getBody());

const namedImportModules = [
  "@/components/fresh/dashboard-panels/feed/utils/feedHelpers",
  "lucide-react",
  "react-router-dom",
  "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode",
  "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings",
  "@/components/fresh/main-dashboard/program-prompts/programPromptSession",
  "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeBase",
  "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime",
  "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants",
  "@/utils/dashboard/dashboardHelpers",
];

const defaultImportModules = [
  ["DashboardPanelShell", "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell"],
  ["FinanceInlineAlert", "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert"],
  ["OnboardingActionBar", "@/components/fresh/main-dashboard/onboarding/OnboardingActionBar"],
  ["FinanceActionModal", "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal"],
  ["ManualExpenseFullScreenSheet", "@/components/fresh/main-dashboard/dashboard-primitives/ManualExpenseFullScreenSheet"],
  ["QuickActionDropdown", "@/components/fresh/main-dashboard/dashboard-primitives/QuickActionDropdown"],
  ["FinanceField", "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField"],
  ["ClaraAssistantPanel", "@/components/ai/ClaraAssistantPanel"],
  ["StatCard", "../components/StatCard"],
  ["TaskReminderPrompt", "@/components/TaskReminderPrompt"],
];

const getSpecifierLocalName = (specifier) => {
  const trimmed = specifier.trim();
  if (!trimmed) return "";
  const aliasMatch = trimmed.match(/\s+as\s+([A-Za-z_$][\w$]*)$/);
  if (aliasMatch) return aliasMatch[1];
  return trimmed.split(/\s+/)[0];
};

const rebuildNamedImport = (moduleName, specifiers) => {
  if (!specifiers.length) return "";

  return `import {\n${specifiers.map((item) => `  ${item},`).join("\n")}\n} from "${moduleName}";\n`;
};

for (const moduleName of namedImportModules) {
  const escapedModuleName = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const importRegex = new RegExp(
    `import\\s*{\\s*([\\s\\S]*?)\\s*}\\s*from\\s*["']${escapedModuleName}["'];\\n?`,
    "m"
  );

  source = source.replace(importRegex, (fullMatch, importBody) => {
    const specifiers = importBody
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const keptSpecifiers = specifiers.filter((specifier) => {
      const localName = getSpecifierLocalName(specifier);
      return localName && isUsedInBody(localName);
    });

    if (keptSpecifiers.length === specifiers.length) return fullMatch;
    return rebuildNamedImport(moduleName, keptSpecifiers);
  });
}

for (const [localName, moduleName] of defaultImportModules) {
  if (isUsedInBody(localName)) continue;

  const escapedModuleName = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const importRegex = new RegExp(
    `import\\s+${localName}\\s+from\\s+["']${escapedModuleName}["'];\\n?`,
    "m"
  );

  source = source.replace(importRegex, "");
}

const requiredTokens = [
  "export default function Dashboard",
  "DashboardMessagesPanel",
  "DashboardTasksPanel",
  "DashboardSettingsPanel",
  "FinanceActionModal",
  "ManualExpenseFullScreenSheet",
  "ClaraAssistantPanel",
];

for (const token of requiredTokens) {
  if (!source.includes(token)) {
    throw new Error(`Required Dashboard token missing after import cleanup: ${token}`);
  }
}

if (source === original) {
  console.log("No Dashboard import cleanup needed.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Cleaned unused Dashboard imports safely.");
