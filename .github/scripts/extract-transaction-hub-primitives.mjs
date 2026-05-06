import fs from "node:fs";

const targetPath = "src/pages/TransactionHub.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const importBlock = `import {
  GlassDropdown,
  InsightCard,
  StatusBadge,
  SummaryCard,
  useClickOutside,
} from "@/components/fresh/transaction-hub/ui/TransactionHubPrimitives";
`;

const importAnchor = '} from "@/components/fresh/transaction-hub/logic/transactionHubUtils";\n';
if (!source.includes('TransactionHubPrimitives')) {
  const index = source.indexOf(importAnchor);
  if (index === -1) throw new Error("transactionHubUtils import anchor not found.");
  source = source.slice(0, index + importAnchor.length) + "\n" + importBlock + source.slice(index + importAnchor.length);
}

const startNeedle = "function useClickOutside(ref, onClose) {";
const endNeedle = "function TransactionCard({ item, onEdit }) {";
const start = source.indexOf(startNeedle);
if (start !== -1) {
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error("TransactionCard boundary not found after Transaction Hub primitives.");
  source = source.slice(0, start) + source.slice(end);
}

const forbiddenInline = [
  "function useClickOutside(ref, onClose) {",
  "function GlassDropdown({",
  "function SummaryCard({",
  "function StatusBadge({",
  "function InsightCard({",
];

for (const needle of forbiddenInline) {
  if (source.includes(needle)) {
    throw new Error(`Inline Transaction Hub primitive still exists: ${needle}`);
  }
}

for (const required of [
  "GlassDropdown",
  "InsightCard",
  "StatusBadge",
  "SummaryCard",
  "useClickOutside",
  "function TransactionCard({ item, onEdit }) {",
]) {
  if (!source.includes(required)) {
    throw new Error(`Expected Transaction Hub reference missing after primitive extraction: ${required}`);
  }
}

if (source === original) {
  console.log("No Transaction Hub primitive extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(targetPath, source);
console.log(`Extracted Transaction Hub UI primitives, reduced TransactionHub.jsx by ${original.length - source.length} characters.`);
