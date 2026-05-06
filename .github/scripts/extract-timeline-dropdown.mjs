import fs from "node:fs";

const targetPath = "src/pages/TransactionHub.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const importLine = 'import TimelineDropdown from "@/components/fresh/transaction-hub/ui/TimelineDropdown";\n';
const importAnchor = 'import TransactionCard from "@/components/fresh/transaction-hub/ui/TransactionCard";\n';

if (!source.includes(importLine.trim())) {
  const index = source.indexOf(importAnchor);
  if (index === -1) throw new Error("TransactionCard import anchor not found.");
  source = source.slice(0, index + importAnchor.length) + importLine + source.slice(index + importAnchor.length);
}

const startNeedle = "function TimelineDropdown({";
const endNeedle = "function EditTransactionDialog({";
const start = source.indexOf(startNeedle);
if (start !== -1) {
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error("EditTransactionDialog boundary not found after TimelineDropdown.");
  source = source.slice(0, start) + source.slice(end);
}

if (source.includes(startNeedle)) {
  throw new Error("Inline TimelineDropdown still exists after extraction.");
}

if (!source.includes("<TimelineDropdown")) {
  throw new Error("TimelineDropdown JSX usage missing after extraction.");
}

if (!source.includes("function EditTransactionDialog({")) {
  throw new Error("EditTransactionDialog was removed unexpectedly.");
}

if (source === original) {
  console.log("No TimelineDropdown extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(targetPath, source);
console.log(`Extracted TimelineDropdown, reduced TransactionHub.jsx by ${original.length - source.length} characters.`);
