import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const countMatches = (needle) => source.split(needle).length - 1;

const noticeRulesImport =
  'import { shouldSilenceNormalOfflineNotice } from "@/components/fresh/main-dashboard/finance-notices/financeNoticeRules";\n';

if (source.includes(noticeRulesImport)) {
  const occurrences = countMatches("shouldSilenceNormalOfflineNotice");
  if (occurrences !== 1) {
    throw new Error(`shouldSilenceNormalOfflineNotice still appears outside its import (${occurrences} occurrences).`);
  }
  source = source.replace(noticeRulesImport, "");
}

if (source.includes('shouldSilenceNormalOfflineNotice')) {
  throw new Error("shouldSilenceNormalOfflineNotice remained in Dashboard.jsx after cleanup.");
}

if (!source.includes('import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";')) {
  throw new Error("FinanceInlineAlert import was removed unexpectedly.");
}

if (source === original) {
  console.log("No stale notice import to clean.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Cleaned stale Dashboard notice import, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
