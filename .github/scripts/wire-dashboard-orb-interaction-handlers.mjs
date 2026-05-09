import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js"
);

const hookImport =
  'import useDashboardOrbInteractionHandlers from "@/components/fresh/main-dashboard/finance-actions/useDashboardOrbInteractionHandlers";';

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function findMatching(source, startIndex, openChar, closeChar) {
  let depth = 0;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === inString) inString = null;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function replaceReactImport(source) {
  return source.replace(
    'import { useCallback, useEffect, useRef } from "react";',
    'import { useCallback, useEffect } from "react";'
  );
}

function addHookImport(source) {
  if (source.includes(hookImport)) return source;

  const anchor = 'import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";';
  if (!source.includes(anchor)) {
    fail("Could not find dispatchClaraEvent import anchor.");
  }

  return source.replace(anchor, `${anchor}\n${hookImport}`);
}

function removeLongPressRefs(source) {
  return source.replace(
    /\n\s*const longPressTimerRef = useRef\(null\);\n\s*const longPressTriggeredRef = useRef\(false\);\n/,
    "\n"
  );
}

function buildOrbHookBlock() {
  return `const {
    getClaraAiOrbButtonFromEvent,
    isClaraAiOrbEvent,
    clearLongPressTimer,
    openClaraAiFromLongPress,
    startClaraAiLongPress,
    endClaraAiLongPress,
    handleClaraAiOrbClickCapture,
    stopMoneyLeftOrbEvent,
    startMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    handleMoneyLeftOrbClick,
  } = useDashboardOrbInteractionHandlers({
    openManualExpenseModal,
    setShowAiAssistant,
  });`;
}

function replaceOrbBlock(source) {
  const startMarker = "  const getClaraAiOrbButtonFromEvent = useCallback((event) => {";
  const endMarker = "\n\n  const openBudgetModal = useCallback((budgetCategory = null) => {";

  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  if (start === -1 || end === -1) {
    fail("Could not find orb interaction block boundaries. No changes were written.");
  }

  return `${source.slice(0, start)}  ${buildOrbHookBlock()}${source.slice(end)}`;
}

function assertResult(source) {
  const required = [
    hookImport,
    "useDashboardOrbInteractionHandlers({",
    "openManualExpenseModal,",
    "setShowAiAssistant,",
    "const openBudgetModal = useCallback",
    "window.addEventListener(\"clara:open-manual-expense\", openManualExpenseModal);",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) {
      fail(`Missing expected text after patch: ${text}`);
    }
  });

  const removed = [
    "const longPressTimerRef = useRef(null);",
    "const longPressTriggeredRef = useRef(false);",
    "window.addEventListener(\"clara:open-assistant\", handleOpenAssistant, true);",
  ];

  removed.forEach((text) => {
    if (source.includes(text)) {
      fail(`Old orb logic still exists after patch: ${text}`);
    }
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = replaceReactImport(next);
next = addHookImport(next);
next = removeLongPressRefs(next);
next = replaceOrbBlock(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. Orb interaction handlers already appear wired.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ useDashboardFinanceActionHandlers.js wired to useDashboardOrbInteractionHandlers.");
console.log("✅ Inline orb long-press/click logic removed from the finance action hook.");
console.log("✅ Manual expense event listener and finance write logic were left untouched.");
console.log("\nNext: run npm run build to verify imports and hook wiring.\n");
