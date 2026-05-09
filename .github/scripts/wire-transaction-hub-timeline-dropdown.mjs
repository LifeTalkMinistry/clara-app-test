import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve("src/pages/TransactionHub.jsx");
const timelineImport =
  'import TimelineDropdown from "@/components/fresh/transaction-hub/ui/TimelineDropdown";';

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function addTimelineImport(source) {
  if (source.includes(timelineImport)) return source;

  const anchor = 'import TransactionCard from "@/components/fresh/transaction-hub/ui/TransactionCard";';
  if (source.includes(anchor)) {
    return source.replace(anchor, timelineImport);
  }

  const primitiveAnchor =
    '} from "@/components/fresh/transaction-hub/ui/TransactionHubPrimitives";';
  if (!source.includes(primitiveAnchor)) {
    fail("Could not find TransactionHub import anchor.");
  }

  return source.replace(primitiveAnchor, `${primitiveAnchor}\n${timelineImport}`);
}

function removeInlineTimelineDropdown(source) {
  const startMarker = "function TimelineDropdown({";
  const endMarker = "\nfunction EditTransactionDialog({";

  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  if (start === -1) {
    return source;
  }

  if (end === -1) {
    fail("Found inline TimelineDropdown start but could not find EditTransactionDialog boundary.");
  }

  return `${source.slice(0, start)}${source.slice(end + 1)}`;
}

function removeUnusedLucideChevronDown(source) {
  return source.replace(/\n\s*ChevronDown,/, "");
}

function removeUnusedTimelineHelpersFromUtilsImport(source) {
  const removable = new Set(["getTimelineStats"]);

  return source.replace(
    /import \{([\s\S]*?)\} from "@\/components\/fresh\/transaction-hub\/logic\/transactionHubUtils";/,
    (fullMatch, importsBlock) => {
      const nextImports = importsBlock
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !removable.has(item));

      if (!nextImports.length) return "";
      return `import {\n  ${nextImports.join(",\n  ")},\n} from "@/components/fresh/transaction-hub/logic/transactionHubUtils";`;
    }
  );
}

function assertResult(source) {
  const required = [
    timelineImport,
    "function EditTransactionDialog({",
    "export default function TransactionHub()",
    "<TimelineDropdown",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) {
      fail(`Missing expected text after patch: ${text}`);
    }
  });

  const forbidden = [
    "function TimelineDropdown({",
    'import TransactionCard from "@/components/fresh/transaction-hub/ui/TransactionCard";',
  ];

  forbidden.forEach((text) => {
    if (source.includes(text)) {
      fail(`Old inline timeline dependency still exists after patch: ${text}`);
    }
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = addTimelineImport(next);
next = removeInlineTimelineDropdown(next);
next = removeUnusedLucideChevronDown(next);
next = removeUnusedTimelineHelpersFromUtilsImport(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. TransactionHub timeline dropdown already appears wired.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ TransactionHub.jsx now imports TimelineDropdown from the UI folder.");
console.log("✅ Inline TimelineDropdown component removed from TransactionHub.jsx.");
console.log("✅ Transaction data, filtering, edit dialog, and persistence logic were left untouched.");
console.log("\nNext: run npm run build to verify imports and JSX compile cleanly.\n");
