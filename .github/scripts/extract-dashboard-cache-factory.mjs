import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const helperImport =
  'import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";\n';

const importAnchor =
  '} from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";\n';

if (!source.includes(helperImport.trim())) {
  const anchorIndex = source.indexOf(importAnchor);
  if (anchorIndex === -1) {
    throw new Error("Dashboard theme runtime import anchor not found.");
  }

  source =
    source.slice(0, anchorIndex + importAnchor.length) +
    helperImport +
    source.slice(anchorIndex + importAnchor.length);
}

const inlineFactory =
  'const createEmptyDashboardCache = (key = null) => ({\n' +
  '  key,\n' +
  '  loaded: false,\n' +
  '  tasks: [],\n' +
  '  submissions: [],\n' +
  '  programRecord: null,\n' +
  '  survivalExpense: 0,\n' +
  '  walletMoney: 0,\n' +
  '  wallets: [],\n' +
  '  walletTransactions: [],\n' +
  '  budgets: [],\n' +
  '  savingsGoals: [],\n' +
  '  expenses: [],\n' +
  '  pendingExpenses: [],\n' +
  '  offlineReady: false,\n' +
  '  profileData: null,\n' +
  '  latestEnrollment: null,\n' +
  '  guardChecked: false,\n' +
  '  nickname: "",\n' +
  '  reminderTime: "",\n' +
  '  financialGoal: "",\n' +
  '});\n\n';

if (source.includes(inlineFactory)) {
  source = source.replace(inlineFactory, "");
}

if (source.includes('const createEmptyDashboardCache = (key = null) => ({')) {
  throw new Error("Inline createEmptyDashboardCache still exists in Dashboard.jsx.");
}

const importCount = source.split(helperImport.trim()).length - 1;
if (importCount !== 1) {
  throw new Error(`Expected exactly one cache factory import, found ${importCount}.`);
}

if (!source.includes("let dashboardPageCache = createEmptyDashboardCache();")) {
  throw new Error("dashboardPageCache initializer was not preserved.");
}

if (!source.includes("let dashboardPageInFlight = null;")) {
  throw new Error("dashboardPageInFlight was not preserved.");
}

if (source === original) {
  console.log("No Dashboard cache factory extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Extracted dashboard cache factory, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
