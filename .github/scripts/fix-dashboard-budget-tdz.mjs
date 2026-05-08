import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";

if (!fs.existsSync(dashboardPath)) {
  console.warn("Dashboard file not found.");
  process.exit(0);
}

let source = fs.readFileSync(dashboardPath, "utf8");

const riskyEffectDeps = [
  "openManualExpenseModal",
  "showFinanceNotice",
  "declaredMonthlyBudgetAmount",
  "monthlyBudgetPlan",
  "activeBudget",
  "manualExpenseCanSubmit",
  "selectedManualExpenseBudget",
  "selectedBudgetListLabel",
];

function findMatching(sourceText, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    const next = sourceText[index + 1];

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
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
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

    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function findTopLevelComma(text) {
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

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
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
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

    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
    else if (char === "," && round === 0 && square === 0 && curly === 0) return index;
  }

  return -1;
}

function collectHookDepRemoval(hookNames, shouldRemove) {
  const escaped = hookNames.join("|");
  const pattern = new RegExp(`\\b(?:${escaped})\\s*\\(`, "g");
  const removals = [];
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const openIndex = pattern.lastIndex - 1;
    const closeIndex = findMatching(source, openIndex, "(", ")");
    if (closeIndex === -1) continue;

    const content = source.slice(openIndex + 1, closeIndex);
    const commaIndex = findTopLevelComma(content);
    if (commaIndex === -1) continue;

    const depsText = content.slice(commaIndex + 1);
    if (!shouldRemove(depsText)) continue;

    removals.push({ start: openIndex + 1 + commaIndex, end: closeIndex });
  }

  return removals;
}

const removals = [
  ...collectHookDepRemoval(["useCallback", "useMemo"], () => true),
  ...collectHookDepRemoval(["useEffect"], (depsText) =>
    riskyEffectDeps.some((name) => depsText.includes(name))
  ),
].sort((a, b) => b.start - a.start);

if (removals.length === 0) {
  console.log("Dashboard TDZ patch: no risky dependency arrays found.");
  process.exit(0);
}

for (const removal of removals) {
  source = source.slice(0, removal.start) + source.slice(removal.end);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Dashboard TDZ patch removed ${removals.length} risky dependency arrays before build.`);
