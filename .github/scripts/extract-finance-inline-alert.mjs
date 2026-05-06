import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const helperImport =
  'import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";\n';

const importAnchor =
  'import { shouldSilenceNormalOfflineNotice } from "@/components/fresh/main-dashboard/finance-notices/financeNoticeRules";\n';

if (!source.includes(helperImport.trim())) {
  const anchorIndex = source.indexOf(importAnchor);
  if (anchorIndex === -1) {
    throw new Error("Finance notice rules import anchor not found.");
  }

  source =
    source.slice(0, anchorIndex + importAnchor.length) +
    helperImport +
    source.slice(anchorIndex + importAnchor.length);
}

const startNeedle = 'const FinanceInlineAlert = ({ notice, onClose }) => {\n';
const endNeedle = 'const dispatchClaraEvent = (name, detail = null) => {';
const start = source.indexOf(startNeedle);
if (start !== -1) {
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    throw new Error("dispatchClaraEvent boundary not found after FinanceInlineAlert.");
  }
  source = source.slice(0, start) + source.slice(end);
}

if (source.includes(startNeedle)) {
  throw new Error("Inline FinanceInlineAlert still exists.");
}

const importCount = source.split('FinanceInlineAlert"').length - 1;
if (importCount !== 1) {
  throw new Error(`Expected exactly one FinanceInlineAlert import, found ${importCount}.`);
}

if (!source.includes('FinanceInlineAlert')) {
  throw new Error("FinanceInlineAlert is not referenced after extraction.");
}

if (!source.includes('const dispatchClaraEvent = (name, detail = null) => {')) {
  throw new Error("dispatchClaraEvent was removed unexpectedly.");
}

if (source === original) {
  console.log("No FinanceInlineAlert extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Extracted FinanceInlineAlert, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
