import fs from "node:fs";
import path from "node:path";

const dashboardPath = "src/pages/Dashboard.jsx";
const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/messages/DashboardMessagesPanel.jsx";

let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const importLine = 'import DashboardMessagesPanel from "@/components/fresh/main-dashboard/dashboard-panels/messages/DashboardMessagesPanel";\n';
const importAnchor = 'import DashboardFeedPanel from "@/components/fresh/dashboard-panels/feed/DashboardFeedPanel";\n';

if (!source.includes(importLine.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("DashboardFeedPanel import anchor not found.");
  }
  source = source.replace(importAnchor, `${importAnchor}${importLine}`);
}

const startNeedle = "function DashboardMessagesPanel({ onBack }) {";
const endNeedle = "\n\nfunction DashboardTasksPanel";

if (!fs.existsSync(targetPath)) {
  const startIndex = source.indexOf(startNeedle);
  if (startIndex === -1) {
    throw new Error("DashboardMessagesPanel function boundary not found.");
  }

  const endIndex = source.indexOf(endNeedle, startIndex);
  if (endIndex === -1) {
    throw new Error("DashboardMessagesPanel end boundary before DashboardTasksPanel not found.");
  }

  const panelSource = source.slice(startIndex, endIndex);
  const requiredPanelTokens = [
    "useUserRole",
    "direct_messages",
    "createPortal",
    "DashboardMessagesPanel",
    "dashboardPanelFormatTime",
    "dashboardPanelInitials",
  ];

  for (const token of requiredPanelTokens) {
    if (!panelSource.includes(token)) {
      throw new Error(`Extracted messages panel missing required token: ${token}`);
    }
  }

  const componentSource = `import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ChevronRight,
  MessageCircle,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import useUserRole from "@/hooks/useUserRole";
import {
  dashboardPanelFormatTime,
  dashboardPanelInitials,
} from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";
import {
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

${panelSource.replace("function DashboardMessagesPanel", "export default function DashboardMessagesPanel")}
`;

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, componentSource);
  source = source.slice(0, startIndex) + source.slice(endIndex + 2);
}

if (!source.includes(importLine.trim())) {
  throw new Error("DashboardMessagesPanel import missing after extraction.");
}

if (source.includes(startNeedle)) {
  throw new Error("DashboardMessagesPanel function still remains in Dashboard.jsx after extraction.");
}

if (!fs.existsSync(targetPath)) {
  throw new Error("DashboardMessagesPanel target file was not created.");
}

if (source === original && fs.existsSync(targetPath)) {
  console.log("DashboardMessagesPanel already extracted.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Extracted DashboardMessagesPanel safely.");
