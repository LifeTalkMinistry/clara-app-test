import fs from "node:fs";

const targetPath = "src/pages/TransactionHub.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const importLine = 'import TransactionCard from "@/components/fresh/transaction-hub/ui/TransactionCard";\n';
const importAnchor = '} from "@/components/fresh/transaction-hub/ui/TransactionHubPrimitives";\n';

if (!source.includes(importLine.trim())) {
  const index = source.indexOf(importAnchor);
  if (index === -1) throw new Error("TransactionHubPrimitives import anchor not found.");
  source = source.slice(0, index + importAnchor.length) + importLine + source.slice(index + importAnchor.length);
}

const startNeedle = "function TransactionCard({ item, onEdit }) {";
const endNeedle = "function TimelineDropdown({";
const start = source.indexOf(startNeedle);
if (start !== -1) {
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error("TimelineDropdown boundary not found after TransactionCard.");
  source = source.slice(0, start) + source.slice(end);
}

if (source.includes(startNeedle)) {
  throw new Error("Inline TransactionCard still exists after extraction.");
}

if (!source.includes("<TransactionCard")) {
  throw new Error("TransactionCard JSX usage missing after extraction.");
}

if (!source.includes("function TimelineDropdown({")) {
  throw new Error("TimelineDropdown was removed unexpectedly.");
}

if (source === original) {
  console.log("No TransactionCard extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(targetPath, source);
console.log(`Extracted TransactionCard, reduced TransactionHub.jsx by ${original.length - source.length} characters.`);
