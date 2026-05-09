import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve(
  "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js"
);

const hookImport =
  'import useDashboardFinanceModalHandlers from "@/components/fresh/main-dashboard/finance-actions/useDashboardFinanceModalHandlers";';

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function addHookImport(source) {
  if (source.includes(hookImport)) return source;

  const anchor =
    'import useDashboardOrbInteractionHandlers from "@/components/fresh/main-dashboard/finance-actions/useDashboardOrbInteractionHandlers";';

  if (source.includes(anchor)) {
    return source.replace(anchor, `${anchor}\n${hookImport}`);
  }

  const fallbackAnchor =
    'import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";';

  if (!source.includes(fallbackAnchor)) {
    fail("Could not find an import anchor for the modal handlers hook.");
  }

  return source.replace(fallbackAnchor, `${fallbackAnchor}\n${hookImport}`);
}

function buildModalHookBlock() {
  return `const {
    showFinanceNotice,
    closeFinanceNotice,
    closeFinanceModal,
    openCreateWalletModal,
    openDeleteWalletModal,
    openAddMoneyModal,
    openTransferMoneyModal,
    openManualExpenseModal,
    openBudgetModal,
    openDeleteBudgetCategoryModal,
    openResetBudgetModal,
    openSavingsGoalModal,
    openDeleteSavingsGoalModal,
    openAddSavingsModal,
  } = useDashboardFinanceModalHandlers({
    activeBudget,
    declaredMonthlyBudgetAmount,
    financeModal,
    monthlyBudgetPlan,
    navigate,
    savingsGoals,
    setBudgetExitConfirm,
    setBudgetListOpen,
    setFinanceForm,
    setFinanceModal,
    setFinanceNotice,
    wallets,
  });`;
}

function replaceFirstModalBlock(source) {
  const startMarker = "  const showFinanceNotice = useCallback((message, type = \"error\") => {";
  const orbHookMarker = "  const {\n    getClaraAiOrbButtonFromEvent,";
  const legacyOrbMarker = "  const getClaraAiOrbButtonFromEvent = useCallback((event) => {";

  const start = source.indexOf(startMarker);
  const orbHookStart = source.indexOf(orbHookMarker, start);
  const legacyOrbStart = source.indexOf(legacyOrbMarker, start);

  const end = orbHookStart !== -1 ? orbHookStart : legacyOrbStart;

  if (start === -1 || end === -1) {
    fail(
      "Could not find the first modal handler block. Make sure the orb wiring step was applied first."
    );
  }

  return `${source.slice(0, start)}  ${buildModalHookBlock()}\n\n${source.slice(end)}`;
}

function removeSecondModalBlock(source) {
  const startMarker = "  const openBudgetModal = useCallback((budgetCategory = null) => {";
  const endMarker =
    "\n\n  useEffect(() => {\n    window.addEventListener(\"clara:open-manual-expense\", openManualExpenseModal);";

  const start = source.indexOf(startMarker);
  if (start === -1) return source;

  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    fail("Could not find the end of the second modal handler block.");
  }

  return `${source.slice(0, start)}${source.slice(end)}`;
}

function assertResult(source) {
  const required = [
    hookImport,
    "useDashboardFinanceModalHandlers({",
    "useDashboardOrbInteractionHandlers({",
    "openManualExpenseModal,",
    "window.addEventListener(\"clara:open-manual-expense\", openManualExpenseModal);",
    "const refreshFinanceSection = useCallback(async () => {",
    "const moveWalletInline = useCallback(",
    "const saveManualExpenseInline = useCallback(async () => {",
    "const saveBudgetInline = useCallback(async",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) {
      fail(`Missing expected text after patch: ${text}`);
    }
  });

  const removed = [
    "const showFinanceNotice = useCallback((message, type = \"error\") => {",
    "const closeFinanceNotice = useCallback(() => {",
    "const closeFinanceModal = useCallback(() => {",
    "const openCreateWalletModal = useCallback(() => {",
    "const openBudgetModal = useCallback((budgetCategory = null) => {",
    "const openSavingsGoalModal = useCallback(",
  ];

  removed.forEach((text) => {
    if (source.includes(text)) {
      fail(`Old modal handler still exists after patch: ${text}`);
    }
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = addHookImport(next);
next = replaceFirstModalBlock(next);
next = removeSecondModalBlock(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. Finance modal handlers already appear wired.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ useDashboardFinanceActionHandlers.js wired to useDashboardFinanceModalHandlers.");
console.log("✅ Inline modal/open-handler blocks removed from the finance action hook.");
console.log("✅ Wallet, manual expense, budget, savings write logic were left untouched.");
console.log("\nNext: run npm run build to verify imports and hook wiring.\n");
