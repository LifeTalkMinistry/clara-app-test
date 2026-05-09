import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve("src/pages/Dashboard.jsx");
const modalStackPath = "@/components/fresh/main-dashboard/shell/DashboardModalStack";

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function ensureLazySuspenseImport(source) {
  const lazyImport = 'import { lazy, Suspense, useRef, useState } from "react";';
  if (source.includes(lazyImport)) return source;

  const basicImport = 'import { useState, useRef } from "react";';
  if (source.includes(basicImport)) {
    return source.replace(basicImport, lazyImport);
  }

  const reorderedBasicImport = 'import { useRef, useState } from "react";';
  if (source.includes(reorderedBasicImport)) {
    return source.replace(reorderedBasicImport, lazyImport);
  }

  const lazyNoSuspense = 'import { lazy, useRef, useState } from "react";';
  if (source.includes(lazyNoSuspense)) {
    return source.replace(lazyNoSuspense, lazyImport);
  }

  const suspenseNoLazy = 'import { Suspense, useRef, useState } from "react";';
  if (source.includes(suspenseNoLazy)) {
    return source.replace(suspenseNoLazy, lazyImport);
  }

  fail("Could not find Dashboard React import to update.");
}

function removeStaticModalStackImport(source) {
  return source.replace(`import DashboardModalStack from "${modalStackPath}";\n`, "");
}

function addLazyModalStackDeclaration(source) {
  const declaration = `const DashboardModalStack = lazy(() => import("${modalStackPath}"));\n`;
  if (source.includes(declaration)) return source;

  const existingLazyPanelMarker = "const DashboardFeedPanel = lazy(() =>";
  const markerIndex = source.indexOf(existingLazyPanelMarker);
  if (markerIndex !== -1) {
    return `${source.slice(0, markerIndex)}${declaration}${source.slice(markerIndex)}`;
  }

  const exportMarker = "\n\nexport default function Dashboard() {";
  if (!source.includes(exportMarker)) {
    fail("Could not find Dashboard component export marker.");
  }

  return source.replace(exportMarker, `\n\n${declaration}\nexport default function Dashboard() {`);
}

function addShouldRenderModalStackFlag(source) {
  if (source.includes("const shouldRenderDashboardModalStack = Boolean(")) return source;

  const marker = `  if (!guardChecked && shouldShowBlockingDashboardLoader) {`;
  if (!source.includes(marker)) {
    fail("Could not find insertion point before Dashboard blocking loader.");
  }

  const flagBlock = `  const shouldRenderDashboardModalStack = Boolean(\n    expandedFinanceCard ||\n      showOnboarding ||\n      showAiAssistant ||\n      financeModal?.type\n  );\n\n`;

  return source.replace(marker, `${flagBlock}${marker}`);
}

function wrapDashboardModalStackRender(source) {
  const oldBlock = `      <DashboardModalStack
        expandedSheetLayerProps={{
          activeDashboardPanel, expandedFinanceCard, setExpandedFinanceCard, walletMoney,
          survivalExpense, selectedDashboardTheme, expandedFinanceDetailSections,
          toggleExpandedFinanceDetailSection, profileData, firstPositiveNumber,
          readStoredSurvivalExpense, user, saveSurvivalExpenseInline, wallets,
          walletPreviewTransactions, financeActionLoading, openCreateWalletModal,
          moveWalletInline, openDeleteWalletModal, openAddMoneyModal, openTransferMoneyModal,
          monthlyBudgetPlan, openBudgetModal, openDeleteBudgetCategoryModal, openResetBudgetModal,
          savingsGoals, totalSavingsSaved, totalSavingsTarget, primarySavingsGoal,
          openSavingsGoalModal, openDeleteSavingsGoalModal, openAddSavingsModal,
        }}
        onboardingModalProps={{
          showOnboarding, closeOnboarding, onboardingStep, setOnboardingStep,
          commitmentChecked, setCommitmentChecked, savingOnboarding, goToNextOnboardingStep,
          nickname, setNickname, reminderTime, setReminderTime, financialGoal,
          setFinancialGoal, finishOnboarding,
        }}
        financeModalRendererProps={{
          financeModal, closeFinanceModal, createWalletInline, financeActionLoading,
          financeForm, setFinanceForm, deleteWalletInline, addMoneyInline, fmt,
          transferMoneyInline, wallets, saveManualExpenseInline, manualExpenseCanSubmit,
          manualExpenseBudgetListItems, showFinanceNotice, setManualExpenseBudgetListKey,
          manualExpenseIsUnplanned, manualExpenseIsUndocumented, selectedManualExpenseBudget,
          handleBudgetModalClose, monthlyBudgetPlan, budgetExitConfirm, saveBudgetInline,
          setBudgetExitConfirm, budgetFormDeclaredAmount, budgetProjectedAllocated,
          budgetProjectedUnallocated, budgetFinishHelper, openBudgetModal,
          openDeleteBudgetCategoryModal, budgetCanFinish, deleteBudgetCategoryInline,
          resetBudgetInline, saveSavingsGoalInline, deleteSavingsGoalInline, addSavingsInline,
          dashboardShellReady, showAiAssistant, setShowAiAssistant, claraAssistantContext,
        }}
      />`;

  const newBlock = `      {shouldRenderDashboardModalStack ? (
        <Suspense fallback={null}>
          <DashboardModalStack
            expandedSheetLayerProps={{
              activeDashboardPanel, expandedFinanceCard, setExpandedFinanceCard, walletMoney,
              survivalExpense, selectedDashboardTheme, expandedFinanceDetailSections,
              toggleExpandedFinanceDetailSection, profileData, firstPositiveNumber,
              readStoredSurvivalExpense, user, saveSurvivalExpenseInline, wallets,
              walletPreviewTransactions, financeActionLoading, openCreateWalletModal,
              moveWalletInline, openDeleteWalletModal, openAddMoneyModal, openTransferMoneyModal,
              monthlyBudgetPlan, openBudgetModal, openDeleteBudgetCategoryModal, openResetBudgetModal,
              savingsGoals, totalSavingsSaved, totalSavingsTarget, primarySavingsGoal,
              openSavingsGoalModal, openDeleteSavingsGoalModal, openAddSavingsModal,
            }}
            onboardingModalProps={{
              showOnboarding, closeOnboarding, onboardingStep, setOnboardingStep,
              commitmentChecked, setCommitmentChecked, savingOnboarding, goToNextOnboardingStep,
              nickname, setNickname, reminderTime, setReminderTime, financialGoal,
              setFinancialGoal, finishOnboarding,
            }}
            financeModalRendererProps={{
              financeModal, closeFinanceModal, createWalletInline, financeActionLoading,
              financeForm, setFinanceForm, deleteWalletInline, addMoneyInline, fmt,
              transferMoneyInline, wallets, saveManualExpenseInline, manualExpenseCanSubmit,
              manualExpenseBudgetListItems, showFinanceNotice, setManualExpenseBudgetListKey,
              manualExpenseIsUnplanned, manualExpenseIsUndocumented, selectedManualExpenseBudget,
              handleBudgetModalClose, monthlyBudgetPlan, budgetExitConfirm, saveBudgetInline,
              setBudgetExitConfirm, budgetFormDeclaredAmount, budgetProjectedAllocated,
              budgetProjectedUnallocated, budgetFinishHelper, openBudgetModal,
              openDeleteBudgetCategoryModal, budgetCanFinish, deleteBudgetCategoryInline,
              resetBudgetInline, saveSavingsGoalInline, deleteSavingsGoalInline, addSavingsInline,
              dashboardShellReady, showAiAssistant, setShowAiAssistant, claraAssistantContext,
            }}
          />
        </Suspense>
      ) : null}`;

  if (source.includes(newBlock)) return source;
  if (!source.includes(oldBlock)) {
    fail("Could not find exact DashboardModalStack JSX block to wrap.");
  }

  return source.replace(oldBlock, newBlock);
}

function assertResult(source) {
  const required = [
    'import { lazy, Suspense, useRef, useState } from "react";',
    `const DashboardModalStack = lazy(() => import("${modalStackPath}"));`,
    "const shouldRenderDashboardModalStack = Boolean(",
    "expandedFinanceCard ||",
    "showOnboarding ||",
    "showAiAssistant ||",
    "financeModal?.type",
    "{shouldRenderDashboardModalStack ? (",
    "<Suspense fallback={null}>",
    "<DashboardModalStack",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) fail(`Missing expected text after patch: ${text}`);
  });

  const forbidden = [`import DashboardModalStack from "${modalStackPath}";`];
  forbidden.forEach((text) => {
    if (source.includes(text)) fail(`Static modal stack import still exists: ${text}`);
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = ensureLazySuspenseImport(next);
next = removeStaticModalStackImport(next);
next = addLazyModalStackDeclaration(next);
next = addShouldRenderModalStackFlag(next);
next = wrapDashboardModalStackRender(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. DashboardModalStack already appears lazy and conditional.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ DashboardModalStack is now lazy-loaded and conditionally rendered.");
console.log("✅ Modal code will not load during normal Dashboard first paint.");
console.log("✅ Finance data, dashboard home, and panel behavior were left untouched.");
console.log("\nNext: run npm run build to verify modal stack lazy wiring.\n");
