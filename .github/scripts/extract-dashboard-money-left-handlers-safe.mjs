import fs from "node:fs";
import path from "node:path";

const dashboardPath = "src/pages/Dashboard.jsx";
const hookPath = "src/components/fresh/main-dashboard/money-summary/useMoneyLeftSummaryHandlers.js";

let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const importLine = 'import useMoneyLeftSummaryHandlers from "@/components/fresh/main-dashboard/money-summary/useMoneyLeftSummaryHandlers";\n';
const importAnchor = 'import DashboardMoneySummary from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummary";\n';

if (!source.includes(importLine.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("DashboardMoneySummary import anchor not found.");
  }
  source = source.replace(importAnchor, `${importAnchor}${importLine}`);
}

const hookAlreadyWired = source.includes("useMoneyLeftSummaryHandlers({");
const hookAlreadyExists = fs.existsSync(hookPath);

if (hookAlreadyWired && hookAlreadyExists) {
  console.log("Money Left summary handlers already extracted.");
  process.exit(0);
}

if (hookAlreadyWired && !hookAlreadyExists) {
  throw new Error("Dashboard is wired to useMoneyLeftSummaryHandlers, but the hook file is missing.");
}

const findStatementEnd = (text, startIndex) => {
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    const prev = text[index - 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (char === quote && prev !== "\\") quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth -= 1;
    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth -= 1;

    if (
      char === ";" &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      return index + 1;
    }
  }

  return -1;
};

const moneyRefsStart = source.indexOf("  const moneyLeftTapRef = useRef({");
const financeFormStart = source.indexOf("  const [financeForm, setFinanceForm]", moneyRefsStart);

if (moneyRefsStart === -1 || financeFormStart === -1) {
  throw new Error("Money Left tap refs boundary not found.");
}

const moneyRefsBlock = source.slice(moneyRefsStart, financeFormStart);
if (
  !moneyRefsBlock.includes("moneyLeftTapRef") ||
  !moneyRefsBlock.includes("moneyLeftNavigateLockRef") ||
  moneyRefsBlock.length > 700
) {
  throw new Error("Unsafe Money Left tap refs extraction boundary.");
}

source = source.slice(0, moneyRefsStart) + source.slice(financeFormStart);

const longPressRefsPattern = /\n  const longPressTimerRef = useRef\(null\);\n  const longPressTriggeredRef = useRef\(false\);\n/;
const longPressMatch = source.match(longPressRefsPattern);
if (!longPressMatch) {
  throw new Error("Money Left long press refs not found.");
}
const longPressRefsBlock = longPressMatch[0].slice(1);
source = source.replace(longPressRefsPattern, "\n");

const handlerStart = source.indexOf("  const isManualExpenseOrbEvent = useCallback");
const lastHandlerStart = source.indexOf("  const moneyLeftSummaryHandlers = useMemo", handlerStart);

if (handlerStart === -1 || lastHandlerStart === -1) {
  throw new Error("Money Left handler boundaries not found.");
}

const handlerEnd = findStatementEnd(source, lastHandlerStart);
if (handlerEnd === -1) {
  throw new Error("Money Left summary handlers statement end not found.");
}

const handlerBlock = source.slice(handlerStart, handlerEnd);
const requiredHandlerTokens = [
  "isManualExpenseOrbEvent",
  "stopMoneyLeftSummaryEvent",
  "openTransactionHubFromMoneyLeft",
  "handleMoneyLeftPointerDown",
  "handleMoneyLeftPointerMove",
  "handleMoneyLeftOrbClick",
  "startMoneyLeftOrbLongPress",
  "endMoneyLeftOrbLongPress",
  "moneyLeftSummaryHandlers",
];

for (const token of requiredHandlerTokens) {
  if (!handlerBlock.includes(token)) {
    throw new Error(`Extracted Money Left handlers missing token: ${token}`);
  }
}

const stopMoneyLeftOrbFallback = handlerBlock.includes("stopMoneyLeftOrbEvent")
  ? ""
  : `
  const stopMoneyLeftOrbEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
    return false;
  }, []);
`;

const hookCall = `  const {
    moneyLeftSummaryHandlers,
    handleMoneyLeftOrbClick,
    startMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    stopMoneyLeftOrbEvent,
  } = useMoneyLeftSummaryHandlers({
    navigate,
    setFinanceModal,
    setShowAiAssistant,
  });`;

source = source.slice(0, handlerStart) + hookCall + source.slice(handlerEnd);

const hookSource = `import { useCallback, useMemo, useRef } from "react";

export default function useMoneyLeftSummaryHandlers({
  navigate,
  setFinanceModal,
  setShowAiAssistant,
} = {}) {
${moneyRefsBlock}${longPressRefsBlock}

${handlerBlock}
${stopMoneyLeftOrbFallback}

  return {
    moneyLeftSummaryHandlers,
    handleMoneyLeftOrbClick,
    startMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    stopMoneyLeftOrbEvent,
  };
}
`;

const requiredDashboardTokens = [
  "export default function Dashboard",
  "useMoneyLeftSummaryHandlers({",
  "DashboardMoneySummary",
  "moneyLeftSummaryHandlers=",
  "handleMoneyLeftOrbClick=",
  "startMoneyLeftOrbLongPress=",
  "endMoneyLeftOrbLongPress=",
  "stopMoneyLeftOrbEvent=",
];

for (const token of requiredDashboardTokens) {
  if (!source.includes(token)) {
    throw new Error(`Dashboard missing required token after Money Left extraction: ${token}`);
  }
}

const forbiddenDashboardTokens = [
  "const isManualExpenseOrbEvent = useCallback",
  "const handleMoneyLeftPointerDown = useCallback",
  "const moneyLeftTapRef = useRef",
  "const longPressTimerRef = useRef",
];

for (const token of forbiddenDashboardTokens) {
  if (source.includes(token)) {
    throw new Error(`Dashboard still contains extracted Money Left token: ${token}`);
  }
}

for (const token of requiredHandlerTokens) {
  if (!hookSource.includes(token)) {
    throw new Error(`Hook missing required Money Left token: ${token}`);
  }
}

if (!hookSource.includes("stopMoneyLeftOrbEvent")) {
  throw new Error("Hook missing stopMoneyLeftOrbEvent export token.");
}

fs.mkdirSync(path.dirname(hookPath), { recursive: true });
fs.writeFileSync(hookPath, hookSource);
fs.writeFileSync(dashboardPath, source);

if (source === original && hookAlreadyExists) {
  console.log("No Money Left handler extraction changes needed.");
  process.exit(0);
}

console.log("Extracted Money Left summary handlers safely.");
