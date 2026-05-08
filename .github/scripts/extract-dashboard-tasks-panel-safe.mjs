import fs from "node:fs";
import path from "node:path";

const dashboardPath = "src/pages/Dashboard.jsx";
const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/tasks/DashboardTasksPanel.jsx";

let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const importLine = 'import DashboardTasksPanel from "@/components/fresh/main-dashboard/dashboard-panels/tasks/DashboardTasksPanel";\n';
const importAnchor = 'import DashboardMessagesPanel from "@/components/fresh/main-dashboard/dashboard-panels/messages/DashboardMessagesPanel";\n';

if (!source.includes(importLine.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("DashboardMessagesPanel import anchor not found.");
  }
  source = source.replace(importAnchor, `${importAnchor}${importLine}`);
}

const startNeedle = "function DashboardTasksPanel({ onBack, activeTask, nextTask, tasks = [], submissions = [], programJourney }) {";
const endNeedle = "\n\nfunction DashboardSettingsPanel";

if (!fs.existsSync(targetPath)) {
  const startIndex = source.indexOf(startNeedle);
  if (startIndex === -1) {
    throw new Error("DashboardTasksPanel function boundary not found.");
  }

  const endIndex = source.indexOf(endNeedle, startIndex);
  if (endIndex === -1) {
    throw new Error("DashboardTasksPanel end boundary before DashboardSettingsPanel not found.");
  }

  const panelSource = source.slice(startIndex, endIndex);
  const requiredPanelTokens = [
    "DashboardTasksPanel",
    "DashboardPanelShell",
    "ListChecks",
    "Flag",
    "dashboardPanelCardClass",
    "programJourney",
  ];

  for (const token of requiredPanelTokens) {
    if (!panelSource.includes(token)) {
      throw new Error(`Extracted tasks panel missing required token: ${token}`);
    }
  }

  const componentSource = `import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Flag, ListChecks } from "lucide-react";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";
import { dashboardPanelCardClass } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

${panelSource.replace("function DashboardTasksPanel", "export default function DashboardTasksPanel")}
`;

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, componentSource);
  source = source.slice(0, startIndex) + source.slice(endIndex + 2);
}

if (!source.includes(importLine.trim())) {
  throw new Error("DashboardTasksPanel import missing after extraction.");
}

if (source.includes(startNeedle)) {
  throw new Error("DashboardTasksPanel function still remains in Dashboard.jsx after extraction.");
}

if (!fs.existsSync(targetPath)) {
  throw new Error("DashboardTasksPanel target file was not created.");
}

if (source === original && fs.existsSync(targetPath)) {
  console.log("DashboardTasksPanel already extracted.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Extracted DashboardTasksPanel safely.");
