import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve("src/pages/TransactionHub.jsx");
const dialogImport =
  'import EditTransactionDialog from "@/components/fresh/transaction-hub/ui/EditTransactionDialog";';

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function addDialogImport(source) {
  if (source.includes(dialogImport)) return source;

  const anchor =
    'import TimelineDropdown from "@/components/fresh/transaction-hub/ui/TimelineDropdown";';

  if (!source.includes(anchor)) {
    fail("Could not find TimelineDropdown import anchor.");
  }

  return source.replace(anchor, `${anchor}\n${dialogImport}`);
}

function removeInlineEditDialog(source) {
  const startMarker = "function EditTransactionDialog({";
  const endMarker = "\nexport default function TransactionHub() {";

  const start = source.indexOf(startMarker);
  if (start === -1) return source;

  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    fail("Found inline EditTransactionDialog start but could not find TransactionHub boundary.");
  }

  return `${source.slice(0, start)}${source.slice(end + 1)}`;
}

function removeUnusedImports(source) {
  source = source.replace(/\n\s*X,/, "");
  return source;
}

function assertResult(source) {
  const required = [
    dialogImport,
    "export default function TransactionHub()",
    "<EditTransactionDialog",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) {
      fail(`Missing expected text after patch: ${text}`);
    }
  });

  const forbidden = [
    "function EditTransactionDialog({",
  ];

  forbidden.forEach((text) => {
    if (source.includes(text)) {
      fail(`Old inline edit dialog still exists after patch: ${text}`);
    }
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = addDialogImport(next);
next = removeInlineEditDialog(next);
next = removeUnusedImports(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. TransactionHub edit dialog already appears wired.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ TransactionHub.jsx now imports EditTransactionDialog from the UI folder.");
console.log("✅ Inline EditTransactionDialog removed from TransactionHub.jsx.");
console.log("✅ Transaction edit/save logic was left untouched.");
console.log("\nNext: run npm run build to verify imports and JSX compile cleanly.\n");
