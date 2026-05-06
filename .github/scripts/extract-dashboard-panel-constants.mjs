import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const helperImport =
  'import {\n  DASHBOARD_PANEL_ORDER,\n  dashboardPanelCardClass,\n  dashboardPanelTextClass,\n} from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";\n';

const importAnchor =
  'import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";\n';

if (!source.includes(helperImport.trim())) {
  const anchorIndex = source.indexOf(importAnchor);
  if (anchorIndex === -1) {
    throw new Error("Dashboard cache factory import anchor not found.");
  }

  source =
    source.slice(0, anchorIndex + importAnchor.length) +
    helperImport +
    source.slice(anchorIndex + importAnchor.length);
}

const inlineBlock =
  'const DASHBOARD_PANEL_ORDER = ["home", "feed", "messages", "settings"];\n\n' +
  'const dashboardPanelCardClass =\n' +
  '  "rounded-[28px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl";\n\n' +
  'const dashboardPanelTextClass = "text-white/65";\n\n\n';

if (source.includes(inlineBlock)) {
  source = source.replace(inlineBlock, "");
}

const duplicateChecks = [
  'const DASHBOARD_PANEL_ORDER = ["home", "feed", "messages", "settings"];',
  'const dashboardPanelCardClass =',
  'const dashboardPanelTextClass =',
];

for (const needle of duplicateChecks) {
  if (source.includes(needle)) {
    throw new Error(`Inline dashboard panel constant still exists: ${needle}`);
  }
}

const importCount = source.split('dashboardPanelConstants').length - 1;
if (importCount !== 1) {
  throw new Error(`Expected exactly one panel constants import, found ${importCount}.`);
}

for (const expectedUsage of [
  "DASHBOARD_PANEL_ORDER",
  "dashboardPanelCardClass",
  "dashboardPanelTextClass",
]) {
  if (!source.includes(expectedUsage)) {
    throw new Error(`${expectedUsage} is not used after extraction.`);
  }
}

if (source === original) {
  console.log("No Dashboard panel constants extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Extracted dashboard panel constants, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
