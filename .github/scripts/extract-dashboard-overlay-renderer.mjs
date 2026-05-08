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

const overlayStartNeedle = `      {themePickerOpen && (`;
const overlayEndNeedle = `      <DashboardFinanceModalRenderer`;

const rendererProps = [
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
    throw new Error("Dashboard theme picker overlay start boundary not found.");
  }

  const endIndex = source.indexOf(overlayEndNeedle, startIndex);
  if (endIndex === -1) {
    throw new Error("Dashboard finance modal renderer boundary not found after theme picker overlay.");
  }

  extractedJsx = source.slice(startIndex, endIndex);

  const requiredOverlayTokens = [
    "{themePickerOpen && (",
    "closeThemePicker",
    "selectedDashboardThemeKey",
    "applyDashboardTheme",
  ];

  for (const token of requiredOverlayTokens) {
    if (!extractedJsx.includes(token)) {
      throw new Error(`Required theme overlay token missing from extracted block: ${token}`);
    }
  }

  const forbiddenBroadTokens = [
    "{showOnboarding && (",
    "<OnboardingActionBar",
    "<TaskReminderPrompt",
  ];

  for (const token of forbiddenBroadTokens) {
    if (extractedJsx.includes(token)) {
      throw new Error(`Theme-only overlay extraction captured a broader block than expected: ${token}`);
    }
  }

  source = source.slice(0, startIndex) + rendererUsage + source.slice(endIndex);
} else if (!fs.existsSync(rendererPath)) {
  throw new Error("Dashboard already references DashboardOverlayRenderer but the renderer file is missing.");
}

if (!alreadyWired) {
  const componentSource = `import { Check, X } from "lucide-react";

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
    throw new Error(`Required dashboard token missing after theme overlay extraction: ${token}`);
  }
}

const modalLayerStart = source.indexOf("<DashboardModalLayer>");
const financeRendererIndex = source.indexOf("<DashboardFinanceModalRenderer", modalLayerStart);
if (modalLayerStart === -1 || financeRendererIndex === -1) {
  throw new Error("Dashboard modal layer or finance renderer not found after extraction.");
}

const remainingOverlayArea = source.slice(modalLayerStart, financeRendererIndex);
if (remainingOverlayArea.includes("{themePickerOpen && (")) {
  throw new Error("Theme picker overlay still remains in Dashboard modal layer after extraction.");
}

if (!fs.existsSync(rendererPath)) {
  throw new Error("DashboardOverlayRenderer.jsx was not created.");
}

if (source === original && alreadyWired) {
  console.log("Dashboard theme overlay renderer is already extracted.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Extracted Dashboard theme overlay renderer safely.");
