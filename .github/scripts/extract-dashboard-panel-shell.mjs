import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const helperImport =
  'import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";\n';

const importAnchor =
  '} from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";\n';

if (!source.includes(helperImport.trim())) {
  const anchorIndex = source.indexOf(importAnchor);
  if (anchorIndex === -1) {
    throw new Error("Dashboard panel constants import anchor not found.");
  }

  source =
    source.slice(0, anchorIndex + importAnchor.length) +
    helperImport +
    source.slice(anchorIndex + importAnchor.length);
}

const startNeedle = 'function DashboardPanelShell({\n';
const endNeedle = 'function DashboardMessagesPanel({ onBack }) {';
const start = source.indexOf(startNeedle);
if (start !== -1) {
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    throw new Error("DashboardMessagesPanel boundary not found after DashboardPanelShell.");
  }
  source = source.slice(0, start) + source.slice(end);
}

if (source.includes(startNeedle)) {
  throw new Error("Inline DashboardPanelShell still exists.");
}

const importCount = source.split('DashboardPanelShell"').length - 1;
if (importCount !== 1) {
  throw new Error(`Expected exactly one DashboardPanelShell import, found ${importCount}.`);
}

if (!source.includes('DashboardPanelShell')) {
  throw new Error("DashboardPanelShell is not referenced after extraction.");
}

if (!source.includes('function DashboardMessagesPanel({ onBack }) {')) {
  throw new Error("DashboardMessagesPanel was removed unexpectedly.");
}

if (source === original) {
  console.log("No DashboardPanelShell extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Extracted DashboardPanelShell, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
