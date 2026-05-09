import fs from "node:fs";
import path from "node:path";

const dashboardPath = path.resolve("src/pages/Dashboard.jsx");
const hookImport =
  'import useDashboardClaraAssistantContext from "@/components/fresh/main-dashboard/assistant/useDashboardClaraAssistantContext";';

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function findMatchingBrace(source, openingBraceIndex) {
  let depth = 0;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let index = openingBraceIndex; index < source.length; index += 1) {
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

      if (char === inString) {
        inString = null;
      }
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

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function findUseMemoBlock(source) {
  const marker = "const claraAssistantContext = useMemo(() =>";
  const start = source.indexOf(marker);
  if (start === -1) return null;

  const arrowIndex = source.indexOf("=>", start);
  const openingBrace = source.indexOf("{", arrowIndex);
  if (openingBrace === -1) return null;

  const closingBrace = findMatchingBrace(source, openingBrace);
  if (closingBrace === -1) return null;

  const suffix = source.slice(closingBrace);
  const endMatch = suffix.match(/^}\s*,\s*\[[\s\S]*?\]\s*\);/);
  if (!endMatch) return null;

  return {
    start,
    end: closingBrace + endMatch[0].length,
  };
}

function insertImport(source) {
  if (source.includes(hookImport)) return source;

  const anchor = 'import useDashboardFinanceOverviewState from "@/components/fresh/main-dashboard/finance-content/useDashboardFinanceOverviewState";';
  if (source.includes(anchor)) {
    return source.replace(anchor, `${anchor}\n${hookImport}`);
  }

  const lastImportMatch = [...source.matchAll(/^import .*?;$/gm)].at(-1);
  if (!lastImportMatch) fail("Could not find import section in Dashboard.jsx.");

  const insertAt = lastImportMatch.index + lastImportMatch[0].length;
  return `${source.slice(0, insertAt)}\n${hookImport}${source.slice(insertAt)}`;
}

function removeUnusedDashboardHelperImports(source) {
  const removable = new Set(["normalizeLower", "sortByNewestDate", "getTransactionDate"]);

  return source.replace(
    /import \{([\s\S]*?)\} from "@\/utils\/dashboard\/dashboardHelpers";/,
    (fullMatch, importsBlock) => {
      const nextImports = importsBlock
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !removable.has(item));

      if (!nextImports.length) return "";
      return `import {\n  ${nextImports.join(",\n  ")},\n} from "@/utils/dashboard/dashboardHelpers";`;
    }
  );
}

function buildReplacement() {
  return `const claraAssistantContext = useDashboardClaraAssistantContext({
    user,
    profileData,
    wallets,
    expenses,
    budgets,
    savingsGoals,
    walletTransactions,
    transfers,
    pendingExpenses,
    emergencyFund,
    thisMonthSpent,
    thisMonthIncome,
    moneyLeftThisMonth,
    walletMoney,
    totalSavingsSaved,
    totalSavingsTarget,
    primarySavingsGoal,
    topWallet,
    activeBudget,
    derivedActiveBudget,
  });`;
}

if (!fs.existsSync(dashboardPath)) {
  fail(`Dashboard.jsx not found at ${dashboardPath}`);
}

const original = fs.readFileSync(dashboardPath, "utf8");
const block = findUseMemoBlock(original);

if (!block) {
  fail("Could not find the inline claraAssistantContext useMemo block. No changes were written.");
}

let next = original.slice(0, block.start) + buildReplacement() + original.slice(block.end);
next = insertImport(next);
next = removeUnusedDashboardHelperImports(next);

if (next === original) {
  console.log("No changes needed. Dashboard.jsx already appears wired.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, next, "utf8");

console.log("✅ Dashboard.jsx wired to useDashboardClaraAssistantContext.");
console.log("✅ Inline claraAssistantContext useMemo block replaced.");
console.log("✅ Assistant hook import added.");
console.log("\nNext: run npm run build to verify imports and JSX compile cleanly.\n");
