import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const dashboard = readSource("src/pages/Dashboard.jsx");
const homePanel = readSource("src/components/fresh/main-dashboard/shell/DashboardHomePanel.jsx");
const carousel = readSource("src/components/financial-carousel/FinancialCarousel.jsx");
const budgetLogic = readSource("src/components/financial-carousel/cards/budget/logic/useBudgetCardLogic.js");
const walletLogic = readSource("src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js");
const emergencyCard = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx");
const debtLogic = readSource("src/components/financial-carousel/cards/debt/logic/useDebtCardLogic.js");

test("Dashboard owns one finance card controller", () => {
  assert.equal(dashboard.includes("const financeCardController = useMemo("), true);
  assert.match(dashboard, /correctEmergencyFundBalance: correctEmergencyFundBalanceData/);
  assert.match(dashboard, /thisMonthSpent, fmt, financeCardController/);
  assert.equal(homePanel.includes("financeCardController={isGuideMode ? null : financeCardController}"), true);
});

test("financial cards do not create duplicate full finance controllers", () => {
  assert.doesNotMatch(carousel, /useFinancialData/);
  assert.doesNotMatch(walletLogic, /useFinancialData|useUserRole/);
  assert.doesNotMatch(emergencyCard, /useFinancialData|useAuth/);
  assert.doesNotMatch(debtLogic, /useFinancialData|useAuth/);
  assert.equal(carousel.includes("financeCardController || {}"), true);
});

test("Budget preserves the protected remaining calculation from its core", () => {
  assert.equal(budgetLogic.includes('export { default } from "./useBudgetCardLogicCore";'), true);
  assert.doesNotMatch(budgetLogic, /declared - spent/);
  assert.doesNotMatch(budgetLogic, /safeDailyPace: remaining/);
});

test("finance expand buttons have one explicit click owner", () => {
  const interactionPath = new URL("../src/components/financial-carousel/shared/financeCardInteraction.js", import.meta.url);
  assert.equal(existsSync(interactionPath), false);
  for (const file of [
    "src/components/financial-carousel/cards/wallet/ui/WalletCardView.jsx",
    "src/components/financial-carousel/cards/emergency-fund/ui/EmergencyFundCardView.jsx",
    "src/components/financial-carousel/cards/savings-goals/ui/SavingsGoalsCardView.jsx",
    "src/components/financial-carousel/cards/investment/ui/InvestmentCardView.jsx",
    "src/components/financial-carousel/cards/debt/ui/DebtCardView.jsx",
  ]) {
    assert.doesNotMatch(readSource(file), /stopCapturedDetailsToggle|financeCardInteraction/);
  }
});

test("successful Wallet edits close the local edit modal without a second finance refresh", () => {
  assert.match(walletLogic, /await onUpdateWallet/);
  assert.match(walletLogic, /setEditingWallet\(null\)/);
  assert.match(walletLogic, /setEditForm\(\{ name: "", type: "cash" \}\)/);
  assert.doesNotMatch(walletLogic, /await refreshData/);
});

test("Emergency Fund and Debt consume parent-owned data and actions", () => {
  assert.match(emergencyCard, /updateEmergencyFund,/);
  assert.match(emergencyCard, /correctEmergencyFundBalance,/);
  assert.match(debtLogic, /data.totalIncome/);
  assert.match(debtLogic, /data.totalExpenses/);
  assert.match(debtLogic, /data.totalWalletBalance/);
});
