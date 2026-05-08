import fs from "node:fs";
import path from "node:path";

const dashboardPath = "src/pages/Dashboard.jsx";
const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";

let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const importLine = 'import DashboardSettingsPanel from "@/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel";\n';
const importAnchor = 'import DashboardTasksPanel from "@/components/fresh/main-dashboard/dashboard-panels/tasks/DashboardTasksPanel";\n';

if (!source.includes(importLine.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("DashboardTasksPanel import anchor not found.");
  }
  source = source.replace(importAnchor, `${importAnchor}${importLine}`);
}

const startNeedle = "function DashboardSettingsPanel({";
const endNeedles = [
  "\n\nexport default function Dashboard",
  "\n\nexport default function DashboardPage",
  "\n\nfunction Dashboard(",
  "\n\nfunction DashboardPage(",
  "\n\nconst Dashboard =",
  "\n\nconst DashboardPage =",
];

if (!fs.existsSync(targetPath)) {
  const startIndex = source.indexOf(startNeedle);
  if (startIndex === -1) {
    throw new Error("DashboardSettingsPanel function boundary not found.");
  }

  const endMatches = endNeedles
    .map((needle) => ({ needle, index: source.indexOf(needle, startIndex) }))
    .filter((match) => match.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (!endMatches.length) {
    throw new Error("DashboardSettingsPanel end boundary before main Dashboard component not found.");
  }

  const endIndex = endMatches[0].index;
  let panelSource = source.slice(startIndex, endIndex);

  const requiredPanelTokens = [
    "DashboardSettingsPanel",
    "DashboardPanelShell",
    "Plan & billing",
    "Help & support",
    "About CLARA",
    "Performance Mode",
    "persistStoredNotificationSettings",
    "dispatchClaraEvent",
  ];

  for (const token of requiredPanelTokens) {
    if (!panelSource.includes(token)) {
      throw new Error(`Extracted settings panel missing required token: ${token}`);
    }
  }

  panelSource = panelSource.replace(
    "function DashboardSettingsPanel({",
    "export default function DashboardSettingsPanel({"
  );

  panelSource = panelSource.replace(
    "  onOpenMessages,\n}) {",
    "  onOpenMessages,\n  setNotificationSettings = () => {},\n}) {"
  );

  const componentSource = `import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Flag,
  Home,
  ListChecks,
  MessageCircle,
  Palette,
  Plus,
  Rocket,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";
import {
  dashboardPanelCardClass,
  dashboardPanelTextClass,
} from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";
import {
  applyVisualPerformanceMode,
  readStoredPerformanceMode,
  saveVisualPerformanceMode,
} from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";
import { persistStoredNotificationSettings } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import {
  formatCompactDate,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

const dashboardRuntimePrefs = { clear: () => {} };
const dashboardRuntimeNotifications = { clear: () => {} };
const dashboardRuntimeMoneySummaryVisibility = { clear: () => {} };
const dashboardRuntimePerformanceMode = { clear: () => {} };
const dashboardRuntimeProgramPrompts = { clear: () => {} };
const dashboardRuntimeThemes = { clear: () => {} };
const dashboardRuntimeSurvivalExpenses = { clear: () => {} };

${panelSource}
`;

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, componentSource);
  source = source.slice(0, startIndex) + source.slice(endIndex + 2);
}

if (!source.includes(importLine.trim())) {
  throw new Error("DashboardSettingsPanel import missing after extraction.");
}

if (source.includes(startNeedle)) {
  throw new Error("DashboardSettingsPanel function still remains in Dashboard.jsx after extraction.");
}

if (!fs.existsSync(targetPath)) {
  throw new Error("DashboardSettingsPanel target file was not created.");
}

if (source === original && fs.existsSync(targetPath)) {
  console.log("DashboardSettingsPanel already extracted.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Extracted DashboardSettingsPanel safely.");
