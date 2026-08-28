import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const page = read("src/pages/SavingsGoalsIntegrated.jsx");
const wrapper = read("src/pages/SavingsGoals.jsx");
const topShell = read("src/pages/SavingsGoalsTopShell.css");
const card = read("src/components/SavingsCardRefined.jsx");
const dashboardPreview = read(
  "src/components/fresh/main-dashboard/finance-content/useDashboardSavingsPreviewState.js"
);
const repair = read("src/lib/savingsGoalLinkedExpenseRepair.js");
const manualSync = read("src/lib/manualExpenseLinkedTargetSync.js");
const scheduleEntry = read(
  "src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.jsx"
);
const packageJson = read("package.json");

test("Savings Goal uses one protected-wallet truth", () => {
  assert.match(page, /protectedSavingsByWallet/);
  assert.match(page, /walletAvailableBalances/);
  assert.match(page, /getWalletEmergencyProtectedAmount/);
  assert.match(page, /The selected wallet does not have enough unprotected money/);
});

test("goal creation and managed edits cannot relabel saved money", () => {
  assert.match(page, /existing \? currentSavedAmount/);
  assert.match(page, /Target Amount cannot be lower than the current saved balance/);
  assert.match(page, /savings_goal_wallet_move_/);
  assert.match(page, /savings_goal_storage_move_rollback/);
  assert.match(page, /Reduce Already Saved to ₱0 before changing wallets/);
});

test("Add Savings moves wallet money and rolls it back if the goal save fails", () => {
  assert.match(page, /source_type: "savings_goal_funding"/);
  assert.match(page, /notes: `Savings goal funding:/);
  assert.match(page, /source_type: "savings_goal_funding_rollback"/);
  assert.doesNotMatch(page, /note: `Savings goal funding:/);
});

test("Use Savings records a real wallet expense and compensates failures", () => {
  assert.match(page, /await addExpense\(\{/);
  assert.match(page, /source_type: "savings_goal_usage"/);
  assert.match(page, /await deleteExpense\(expenseId\)/);
  assert.match(page, /This records a real expense from/);
});

test("savings usage cannot be mistaken for a historical contribution", () => {
  assert.match(repair, /isSavingsUsageExpense/);
  assert.match(repair, /if \(isSavingsUsageExpense\(expense\)\) return false/);
  assert.match(manualSync, /isSavingsUsageExpense/);
  assert.match(manualSync, /if \(isSavingsUsageExpense\(expense\)\) return null/);
});

test("Savings Goal dialogs expose errors and guard close while saving", () => {
  assert.match(page, /const \[formError, setFormError\]/);
  assert.match(page, /const \[addError, setAddError\]/);
  assert.match(page, /const \[useError, setUseError\]/);
  assert.match(page, /SavingsDeleteConfirmDialog/);
  assert.match(page, /if \(!value && !saving\) onClose/);
});

test("starter ideas prefill the goal and card totals preserve explicit zero", () => {
  assert.match(page, /openAdd\(routeState\?\.starterTitle \|\| ""\)/);
  assert.match(page, /onClick=\{\(\) => openAdd\(\)\}/);
  assert.match(card, /goal\.saved_amount \?\?/);
  assert.match(card, /const activePrimaryGoal/);
  assert.match(card, /const saved = goals\.reduce/);
  assert.match(card, /const target = goals\.reduce/);
});

test("dashboard Savings totals read canonical fields and ignore deleted goals", () => {
  assert.match(dashboardPreview, /goal\?\.saved_amount/);
  assert.match(dashboardPreview, /goal\?\.savedAmount/);
  assert.match(dashboardPreview, /goal\?\.current_amount/);
  assert.match(dashboardPreview, /goal\?\.target_amount/);
  assert.match(dashboardPreview, /goal\?\.targetAmount/);
  assert.match(dashboardPreview, /!goal\?\.deletedAt && !goal\?\.deleted_at/);
  assert.match(dashboardPreview, /activeSavingsGoals\.reduce/);
});

test("wallet sync failures stay visible instead of using alerts", () => {
  assert.match(page, /const \[walletSyncError, setWalletSyncError\]/);
  assert.match(page, /CLARA could not mark this wallet money as saved yet/);
  assert.doesNotMatch(page, /alert\(/);
  assert.match(page, /Available to Save/);
});

test("Savings Goals owns the complete top shell without a mount-time class", () => {
  assert.doesNotMatch(wrapper, /useLayoutEffect/);
  assert.doesNotMatch(wrapper, /closest\("main"\)/);
  assert.match(topShell, /body:has\(\.savings-goals-premium\)/);
  assert.match(topShell, /#root:has\(\.savings-goals-premium\)/);
  assert.match(topShell, /\.theme-page-shell:has\(\.savings-goals-premium\)/);
  assert.match(topShell, /linear-gradient\(180deg, #051126 0%, #030817 58%, #050714 100%\) !important/);
  assert.match(topShell, /padding-top: 0 !important/);
  assert.match(topShell, /min-height: 100dvh/);
});

test("Savings Goal schedule entry cannot bypass financial-card projection sync", () => {
  assert.match(scheduleEntry, /DashboardScheduleManualPanel/);
  assert.doesNotMatch(scheduleEntry, /syncFinancialCardSchedulesIntoCalendar/);
  assert.doesNotMatch(scheduleEntry, /financialProjectionEpoch/);
  assert.doesNotMatch(scheduleEntry, /localStorage/);
});

test("Savings Goal flow regression runs in npm test", () => {
  assert.match(packageJson, /tests\/savings-goal-card-flow-regression\.test\.mjs/);
});
