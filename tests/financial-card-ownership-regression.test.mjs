import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  DEBT_OBLIGATION_RECORD_KIND,
  estimateDebtPayoffMonths,
  getDebtObligationMode,
  getNextDebtDueDate,
  isActiveDebtObligation,
  isDebtLinkedExpense,
  summarizeDebtObligationsPure,
} from "../src/lib/debtObligationMath.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const communityHome = readSource("src/components/community/CommunityHomeFinancialCarousel.jsx");
const carousel = readSource("src/components/financial-carousel/FinancialCarousel.jsx");
const budgetLogic = readSource("src/components/financial-carousel/cards/budget/logic/useBudgetCardLogic.js");
const walletLogic = readSource("src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js");
const emergencyCard = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx");
const debtLogic = readSource("src/components/financial-carousel/cards/debt/logic/useDebtCardLogic.js");
const debtView = readSource("src/components/financial-carousel/cards/debt/ui/DebtCardView.jsx");
const debtItem = readSource("src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx");
const debtCard = readSource("src/components/ObligationDebt.jsx");
const debtStore = readSource("src/lib/debtObligationStore.js");
const debtSync = readSource("src/lib/manualExpenseLinkedTargetSync.js");
const moneyLeftMetrics = readSource("src/components/fresh/main-dashboard/money-summary/useDashboardMoneyLeftMetrics.js");

test("Community Home owns one finance card controller and one carousel host", () => {
  assert.match(communityHome, /const financeCardController = useFinancialData\(user\)/);
  assert.match(communityHome, /<FinancialCarousel/);
  assert.match(communityHome, /financeCardController=\{financeCardController\}/);
  assert.doesNotMatch(communityHome, /<DashboardHomePanel/);
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
  assert.match(debtView, /expenses: financeCardController\?\.expenses/);
  assert.match(debtLogic, /financeRepository\.getWalletTransactions\(localUserId\)/);
});

test("legacy paid-off debts are inactive while explicit recurring obligations remain active", () => {
  const legacyPaid = {
    recordKind: DEBT_OBLIGATION_RECORD_KIND,
    status: "active",
    totalDebt: 0,
    monthlyDebt: 2500,
    debtType: "installment",
  };
  const recurring = {
    ...legacyPaid,
    obligationMode: "recurring",
  };
  assert.equal(getDebtObligationMode(legacyPaid), "balance");
  assert.equal(isActiveDebtObligation(legacyPaid), false);
  assert.equal(getDebtObligationMode(recurring), "recurring");
  assert.equal(isActiveDebtObligation(recurring), true);
});

test("debt summary excludes completed balances and uses current-cycle income", () => {
  const summary = summarizeDebtObligationsPure(
    [
      {
        recordKind: DEBT_OBLIGATION_RECORD_KIND,
        status: "active",
        obligationMode: "balance",
        totalDebt: 50000,
        monthlyDebt: 6000,
        interestRate: 12,
      },
      {
        recordKind: DEBT_OBLIGATION_RECORD_KIND,
        status: "completed",
        obligationMode: "balance",
        totalDebt: 0,
        monthlyDebt: 4000,
      },
    ],
    { income: 30000 }
  );
  assert.equal(summary.activeCount, 1);
  assert.equal(summary.totalDebt, 50000);
  assert.equal(summary.monthlyDebt, 6000);
  assert.equal(summary.debtRatio, 20);
  assert.equal(summary.riskLevel, "Moderate");
});

test("payoff estimates include interest and detect negative amortization", () => {
  const noInterest = estimateDebtPayoffMonths({
    balance: 10000,
    monthlyPayment: 1000,
    annualInterestRate: 0,
  });
  const withInterest = estimateDebtPayoffMonths({
    balance: 10000,
    monthlyPayment: 1000,
    annualInterestRate: 24,
  });
  const impossible = estimateDebtPayoffMonths({
    balance: 100000,
    monthlyPayment: 1000,
    annualInterestRate: 24,
  });
  assert.equal(noInterest, 10);
  assert.ok(withInterest > noInterest);
  assert.equal(impossible, Number.POSITIVE_INFINITY);
});

test("monthly due dates roll forward instead of remaining permanently overdue", () => {
  const next = getNextDebtDueDate(
    { dueDate: "2025-01-31" },
    new Date("2026-02-10T00:00:00")
  );
  assert.equal(next?.getFullYear(), 2026);
  assert.equal(next?.getMonth(), 1);
  assert.equal(next?.getDate(), 28);
});

test("debt-linked expenses are identified without counting unrelated spending", () => {
  const obligations = [{ title: "Home Credit" }];
  assert.equal(isDebtLinkedExpense({ linked_target_type: "debt" }, obligations), true);
  assert.equal(isDebtLinkedExpense({ category: "Home Credit" }, obligations), true);
  assert.equal(isDebtLinkedExpense({ category: "Groceries" }, obligations), false);
});

test("debt pressure subtracts only the unpaid monthly remainder", () => {
  assert.match(moneyLeftMetrics, /const \{ user: authUser \} = useAuth\(\)/);
  assert.match(moneyLeftMetrics, /firstOwnerIdentity\(walletTransactions, expenses\)/);
  assert.match(moneyLeftMetrics, /scheduledMonthlyObligation - thisMonthDebtPayments/);
  assert.doesNotMatch(moneyLeftMetrics, /grossMoneyLeftThisMonth - scheduledMonthlyObligation/);
  assert.match(debtLogic, /summarizeDebtObligations\(debtObligations, \{ income \}\)/);
  assert.doesNotMatch(debtLogic, /debtSummary\.totalDebt \|\| data\.totalDebt/);
});

test("debt records have explicit lifecycle, recurrence, and consistent UI thresholds", () => {
  assert.match(debtStore, /obligationMode/);
  assert.match(debtStore, /dueDay/);
  assert.match(debtSync, /status: completed \? "completed" : "active"/);
  assert.match(debtSync, /paidAt: completed \? now : null/);
  assert.match(debtCard, /value="recurring"/);
  assert.match(debtCard, /htmlFor="debt-due-day"/);
  assert.match(debtCard, /debtRatio > 40/);
  assert.match(debtCard, /debtRatio >= 20/);
  assert.match(debtItem, /Payment does not cover interest/);
});
