import fs from "node:fs";
import path from "node:path";

const dashboardPath = "src/pages/Dashboard.jsx";
const rendererPath = "src/components/fresh/main-dashboard/shell/DashboardOverlayRenderer.jsx";

let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const rendererImport = 'import DashboardOverlayRenderer from "@/components/fresh/main-dashboard/shell/DashboardOverlayRenderer";\n';
const importAnchor = 'import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";\n';

if (!source.includes(rendererImport.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("DashboardFinanceModalRenderer import anchor not found.");
  }
  source = source.replace(importAnchor, `${importAnchor}${rendererImport}`);
}

const overlayStartNeedle = `      {showOnboarding && (`;
const overlayEndNeedle = `      <DashboardFinanceModalRenderer`;

const rendererProps = [
  "showOnboarding",
  "closeOnboarding",
  "onboardingStep",
  "setOnboardingStep",
  "commitmentChecked",
  "setCommitmentChecked",
  "nickname",
  "setNickname",
  "reminderTime",
  "setReminderTime",
  "financialGoal",
  "setFinancialGoal",
  "completeOnboarding",
  "savingOnboarding",
  "shouldShowProgramPromptThisSession",
  "programRecord",
  "profile",
  "startProgramOnboarding",
  "persistProgramPromptSeenThisSession",
  "programPromptSessionKey",
  "user",
  "isApproved",
  "activeTask",
  "nextTask",
  "themePickerOpen",
  "closeThemePicker",
  "dashboardTheme",
  "selectedDashboardThemeKey",
  "applyDashboardTheme",
];

const rendererUsage = `      <DashboardOverlayRenderer
${rendererProps.map((name) => `        ${name}={${name}}`).join("\n")}
      />

`;

const alreadyWired = source.includes("<DashboardOverlayRenderer");
let extractedJsx = "";

if (!alreadyWired) {
  const startIndex = source.indexOf(overlayStartNeedle);
  if (startIndex === -1) {
    throw new Error("Dashboard onboarding overlay start boundary not found.");
  }

  const endIndex = source.indexOf(overlayEndNeedle, startIndex);
  if (endIndex === -1) {
    throw new Error("Dashboard finance modal renderer boundary not found after overlays.");
  }

  extractedJsx = source.slice(startIndex, endIndex);

  const requiredOverlayTokens = [
    "{showOnboarding && (",
    "<OnboardingActionBar",
    "<TaskReminderPrompt",
    "{themePickerOpen && (",
  ];

  for (const token of requiredOverlayTokens) {
    if (!extractedJsx.includes(token)) {
      throw new Error(`Required overlay token missing from extracted block: ${token}`);
    }
  }

  source = source.slice(0, startIndex) + rendererUsage + source.slice(endIndex);
} else if (!fs.existsSync(rendererPath)) {
  throw new Error("Dashboard already references DashboardOverlayRenderer but the renderer file is missing.");
}

if (!alreadyWired) {
  const componentSource = `import { Check, X } from "lucide-react";
import OnboardingActionBar from "@/components/fresh/main-dashboard/onboarding/OnboardingActionBar";
import TaskReminderPrompt from "@/components/TaskReminderPrompt";
import { getProgramBubbleContent } from "@/lib/program-journey";

export default function DashboardOverlayRenderer({
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
  "<DashboardOverlayRenderer",
  "<DashboardFinanceModalRenderer",
  "<DashboardModalLayer>",
  "</DashboardModalLayer>",
];

for (const token of requiredDashboardTokens) {
  if (!source.includes(token)) {
    throw new Error(`Required dashboard token missing after overlay extraction: ${token}`);
  }
}

const modalLayerStart = source.indexOf("<DashboardModalLayer>");
const financeRendererIndex = source.indexOf("<DashboardFinanceModalRenderer", modalLayerStart);
if (modalLayerStart === -1 || financeRendererIndex === -1) {
  throw new Error("Dashboard modal layer or finance renderer not found after extraction.");
}

const remainingOverlayArea = source.slice(modalLayerStart, financeRendererIndex);
const forbiddenRemainingTokens = [
  "{showOnboarding && (",
  "<OnboardingActionBar",
  "<TaskReminderPrompt",
  "{themePickerOpen && (",
];

for (const token of forbiddenRemainingTokens) {
  if (remainingOverlayArea.includes(token)) {
    throw new Error(`Overlay token still remains in Dashboard modal layer after extraction: ${token}`);
  }
}

if (!fs.existsSync(rendererPath)) {
  throw new Error("DashboardOverlayRenderer.jsx was not created.");
}

if (source === original && alreadyWired) {
  console.log("Dashboard overlay renderer is already extracted.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Extracted Dashboard overlay renderer safely.");
