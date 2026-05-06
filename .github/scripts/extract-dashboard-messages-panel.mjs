import fs from "node:fs";
import path from "node:path";

const dashboardPath = "src/pages/Dashboard.jsx";
const componentPath = "src/components/fresh/main-dashboard/dashboard-panels/DashboardMessagesPanel.jsx";

let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const startNeedle = "function DashboardMessagesPanel({ onBack }) {";
const start = source.indexOf(startNeedle);
if (start === -1) {
  console.log("DashboardMessagesPanel already extracted or not found.");
  process.exit(0);
}

const findFunctionEnd = (text, functionStart) => {
  const braceStart = text.indexOf("{", functionStart);
  if (braceStart === -1) throw new Error("DashboardMessagesPanel opening brace not found.");

  let depth = 0;
  let mode = "code";
  let escaped = false;

  for (let index = braceStart; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (mode === "lineComment") {
      if (char === "\n") mode = "code";
      continue;
    }

    if (mode === "blockComment") {
      if (char === "*" && next === "/") {
        mode = "code";
        index += 1;
      }
      continue;
    }

    if (mode === "single") {
      if (!escaped && char === "'") mode = "code";
      escaped = !escaped && char === "\\";
      if (char !== "\\") escaped = false;
      continue;
    }

    if (mode === "double") {
      if (!escaped && char === '"') mode = "code";
      escaped = !escaped && char === "\\";
      if (char !== "\\") escaped = false;
      continue;
    }

    if (mode === "template") {
      if (!escaped && char === "`") mode = "code";
      escaped = !escaped && char === "\\";
      if (char !== "\\") escaped = false;
      continue;
    }

    if (char === "/" && next === "/") {
      mode = "lineComment";
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      mode = "blockComment";
      index += 1;
      continue;
    }

    if (char === "'") {
      mode = "single";
      escaped = false;
      continue;
    }

    if (char === '"') {
      mode = "double";
      escaped = false;
      continue;
    }

    if (char === "`") {
      mode = "template";
      escaped = false;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  throw new Error("DashboardMessagesPanel closing brace not found.");
};

const end = findFunctionEnd(source, start);
const rawBlock = source.slice(start, end);
const extractedBlock = rawBlock.replace(
  startNeedle,
  "export default function DashboardMessagesPanel({ onBack }) {"
);

const componentHeader = `import { useState, useEffect, useMemo, useCallback, useRef } from "react";\nimport { createPortal } from "react-dom";\nimport { ArrowDown, MessageCircle, Plus, Search, Send } from "lucide-react";\n\nimport { supabase } from "@/lib/supabaseClient";\nimport useUserRole from "@/hooks/useUserRole";\nimport {\n  dashboardPanelFormatTime,\n  dashboardPanelInitials,\n} from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";\nimport {\n  dashboardPanelCardClass,\n  dashboardPanelTextClass,\n} from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";\nimport { normalizeLower, normalizeString } from "@/utils/dashboard/dashboardHelpers";\n\n`;

fs.mkdirSync(path.dirname(componentPath), { recursive: true });
fs.writeFileSync(componentPath, `${componentHeader}${extractedBlock}\n`);

source = source.slice(0, start) + source.slice(end);

const importLine = 'import DashboardMessagesPanel from "@/components/fresh/main-dashboard/dashboard-panels/DashboardMessagesPanel";\n';
const importAnchor = 'import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";\n';
if (!source.includes(importLine.trim())) {
  const anchorIndex = source.indexOf(importAnchor);
  if (anchorIndex === -1) throw new Error("DashboardPanelShell import anchor not found.");
  source = source.slice(0, anchorIndex + importAnchor.length) + importLine + source.slice(anchorIndex + importAnchor.length);
}

if (source.includes(startNeedle)) {
  throw new Error("Inline DashboardMessagesPanel still exists after extraction.");
}

if (!source.includes("<DashboardMessagesPanel")) {
  throw new Error("DashboardMessagesPanel JSX usage is not referenced after extraction.");
}

const componentSource = fs.readFileSync(componentPath, "utf8");
for (const required of [
  "export default function DashboardMessagesPanel",
  "supabase",
  "useUserRole",
  "dashboardPanelInitials",
  "dashboardPanelFormatTime",
  "normalizeString",
  "normalizeLower",
]) {
  if (!componentSource.includes(required)) {
    throw new Error(`Extracted component is missing required reference: ${required}`);
  }
}

fs.writeFileSync(dashboardPath, source);
console.log(`Extracted DashboardMessagesPanel, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
