import fs from "node:fs";

const targetPath = "src/pages/TransactionHub.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const importBlock = `import {
  FILTERS,
  DEFAULT_THEME,
  TIMELINE_GROUPS,
  buildEditFormFromTransaction,
  cleanNumber,
  formatDateOnly,
  formatTime,
  getBudgetAmount,
  getBudgetCategory,
  getBudgetMonthKey,
  getFirstValue,
  getGroup,
  getIcon,
  getLast12Months,
  getSignedAmountByGroup,
  getStableDedupeKey,
  getTimelineKey,
  getTimelineStats,
  getToneClasses,
  hasValue,
  isDeletedRecord,
  isJsonLike,
  isLinkedExpenseWalletTransaction,
  monthKey,
  normalizeText,
  parseDate,
  peso,
  titleCase,
} from "@/components/fresh/transaction-hub/logic/transactionHubUtils";
`;

const importAnchor = 'import useFinancialData from "../hooks/useFinancialData";\n';
if (!source.includes('transactionHubUtils')) {
  const index = source.indexOf(importAnchor);
  if (index === -1) throw new Error("useFinancialData import anchor not found.");
  source = source.slice(0, index + importAnchor.length) + "\n" + importBlock + source.slice(index + importAnchor.length);
}

const startNeedle = "const FILTERS = [\n";
const endNeedle = "function useClickOutside(ref, onClose) {";
const start = source.indexOf(startNeedle);
if (start !== -1) {
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error("useClickOutside boundary not found after Transaction Hub utilities.");
  source = source.slice(0, start) + source.slice(end);
}

const forbiddenInline = [
  "const FILTERS = [",
  "const DEFAULT_THEME = {",
  "const peso = (value) =>",
  "const cleanNumber = (value) =>",
  "const normalizeText = (value) =>",
  "const parseDate = (value) =>",
  "function getTimelineStats(items)",
];

for (const needle of forbiddenInline) {
  if (source.includes(needle)) {
    throw new Error(`Inline Transaction Hub utility still exists: ${needle}`);
  }
}

for (const required of [
  "FILTERS",
  "DEFAULT_THEME",
  "peso",
  "cleanNumber",
  "getGroup",
  "getTimelineStats",
]) {
  if (!source.includes(required)) {
    throw new Error(`Expected utility reference missing after extraction: ${required}`);
  }
}

if (!source.includes("function useClickOutside(ref, onClose) {")) {
  throw new Error("useClickOutside was removed unexpectedly.");
}

if (source === original) {
  console.log("No Transaction Hub utility extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(targetPath, source);
console.log(`Extracted Transaction Hub utilities, reduced TransactionHub.jsx by ${original.length - source.length} characters.`);
