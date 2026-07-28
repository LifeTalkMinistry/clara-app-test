import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resolvePath = (file) => path.join(root, file);

function read(file) {
  return fs.readFileSync(resolvePath(file), "utf8");
}

function write(file, content) {
  fs.writeFileSync(resolvePath(file), content, "utf8");
}

function replaceRequired(file, search, replacement, label) {
  const source = read(file);
  const next = source.replace(search, replacement);
  if (next === source) {
    throw new Error(`Missing patch anchor (${label}) in ${file}`);
  }
  write(file, next);
}

function removeFile(file) {
  const target = resolvePath(file);
  if (fs.existsSync(target)) fs.rmSync(target);
}

const dashboardPath = "src/pages/Dashboard.jsx";
replaceRequired(
  dashboardPath,
  `    emergencyFund: financeEmergencyFund = null,\n    refreshData: refreshFinancialData,`,
  `    emergencyFund: financeEmergencyFund = null,\n    totalExpenses: financeTotalExpenses = 0,\n    totalIncome: financeTotalIncome = 0,\n    totalWalletBalance: financeTotalWalletBalance = 0,\n    refreshData: refreshFinancialData,`,
  "dashboard finance totals"
);
replaceRequired(
  dashboardPath,
  `    updateEmergencyFund: updateEmergencyFundData,\n  } = useFinancialData(user);`,
  `    updateEmergencyFund: updateEmergencyFundData,\n    correctEmergencyFundBalance: correctEmergencyFundBalanceData,\n  } = useFinancialData(user);`,
  "dashboard emergency correction action"
);
replaceRequired(
  dashboardPath,
  /(  const saveSurvivalExpenseInline = useDashboardSurvivalExpenseSaver\(\{[\s\S]*?\n  \}\);)\n\n\n  const \{/,
  `$1\n\n  const financeCardController = {\n    user,\n    wallets,\n    expenses,\n    transfers,\n    emergencyFund,\n    totalIncome: financeTotalIncome,\n    totalExpenses: financeTotalExpenses,\n    totalWalletBalance: financeTotalWalletBalance,\n    refreshData: refreshFinancialData,\n    deleteExpense: deleteExpenseData,\n    updateWallet: updateWalletData,\n    addExpense: addExpenseData,\n    transferBetweenWallets: transferBetweenWalletsData,\n    updateEmergencyFund: updateEmergencyFundData,\n    correctEmergencyFundBalance: correctEmergencyFundBalanceData,\n  };\n\n  const {`,
  "dashboard finance card controller"
);
replaceRequired(
  dashboardPath,
  `            thisMonthSpent, fmt,\n`,
  `            thisMonthSpent, fmt, financeCardController,\n`,
  "dashboard passes finance card controller"
);

const homePanelPath = "src/components/fresh/main-dashboard/shell/DashboardHomePanel.jsx";
replaceRequired(
  homePanelPath,
  `  profileData,\n  firstPositiveNumber,\n  readStoredSurvivalExpense,\n  monthlyBudgetPlan,`,
  `  profileData,\n  monthlyBudgetPlan,`,
  "home panel removes obsolete emergency helper props"
);
replaceRequired(
  homePanelPath,
  `  thisMonthSpent,\n  fmt,\n}) {`,
  `  thisMonthSpent,\n  financeCardController,\n  fmt,\n}) {`,
  "home panel controller prop"
);
replaceRequired(
  homePanelPath,
  `                   profileData={isGuideMode ? { plan: "pro" } : profileData}\n                   firstPositiveNumber={firstPositiveNumber}\n                   readStoredSurvivalExpense={isGuideMode ? undefined : readStoredSurvivalExpense}\n                   monthlyBudgetPlan={effectiveMonthlyBudgetPlan}`,
  `                   profileData={isGuideMode ? { plan: "pro" } : profileData}\n                   financeCardController={isGuideMode ? null : financeCardController}\n                   monthlyBudgetPlan={effectiveMonthlyBudgetPlan}`,
  "home panel finance carousel controller"
);

const carouselPath = "src/components/financial-carousel/FinancialCarousel.jsx";
replaceRequired(
  carouselPath,
  `import useFinancialData from "@/hooks/useFinancialData";\n`,
  ``,
  "remove nested finance hook import"
);
replaceRequired(
  carouselPath,
  `    readStoredSurvivalExpense,\n    isGuideMode = false,`,
  `    readStoredSurvivalExpense,\n    financeCardController = null,\n    isGuideMode = false,`,
  "carousel finance controller prop"
);
replaceRequired(
  carouselPath,
  `  const emergencyFundSyncController = useFinancialData(effectiveUser);\n  const removeExpense = emergencyFundSyncController.deleteExpense;\n\n  useEmergencyFundAllocationSync({\n    user: effectiveUser,\n    expenses: emergencyFundSyncController.expenses,\n    transfers: emergencyFundSyncController.transfers,\n    emergencyFund: emergencyFundSyncController.emergencyFund,\n    transferBetweenWallets: emergencyFundSyncController.transferBetweenWallets,\n    deleteExpense: removeExpense,\n    refreshData: emergencyFundSyncController.refreshData,\n    enabled: !isGuideMode && Boolean(effectiveUser && guardChecked && !loading),\n  });`,
  `  const {\n    expenses: financeExpenses = [],\n    transfers: financeTransfers = [],\n    emergencyFund: financeEmergencyFund = null,\n    totalIncome: financeTotalIncome = 0,\n    totalExpenses: financeTotalExpenses = 0,\n    totalWalletBalance: financeTotalWalletBalance = 0,\n    refreshData: refreshFinanceData,\n    deleteExpense: deleteFinanceExpense,\n    transferBetweenWallets: transferFinanceWallets,\n  } = financeCardController || {};\n\n  useEmergencyFundAllocationSync({\n    user: effectiveUser,\n    expenses: financeExpenses,\n    transfers: financeTransfers,\n    emergencyFund: financeEmergencyFund,\n    transferBetweenWallets: transferFinanceWallets,\n    deleteExpense: deleteFinanceExpense,\n    refreshData: refreshFinanceData,\n    enabled: !isGuideMode && Boolean(effectiveUser && guardChecked && !loading),\n  });`,
  "carousel parent-owned emergency reconciliation"
);
replaceRequired(
  carouselPath,
  `       survivalExpense,\n       user: userId || userPlan ? { id: userId, plan: userPlan } : null,`,
  `       survivalExpense,\n       financeEmergencyFund,\n       financeTotalIncome,\n       financeTotalExpenses,\n       financeTotalWalletBalance,\n       user: userId || userPlan ? { id: userId, plan: userPlan } : null,`,
  "carousel card data totals"
);
replaceRequired(
  carouselPath,
  `       firstPositiveNumber,\n       readStoredSurvivalExpense,\n`,
  ``,
  "carousel removes obsolete emergency helpers"
);
replaceRequired(
  carouselPath,
  `[monthlyBudgetPlan, savingsGoals, totalSavingsSaved, totalSavingsTarget, primarySavingsGoal, wallets, walletMoney, walletPreviewTransactions, survivalExpense, userId, userPlan, plan, guardChecked, loading, profileData, featureFlags, includeLocked, firstPositiveNumber, readStoredSurvivalExpense, isGuideMode]`,
  `[monthlyBudgetPlan, savingsGoals, totalSavingsSaved, totalSavingsTarget, primarySavingsGoal, wallets, walletMoney, walletPreviewTransactions, survivalExpense, financeEmergencyFund, financeTotalIncome, financeTotalExpenses, financeTotalWalletBalance, userId, userPlan, plan, guardChecked, loading, profileData, featureFlags, includeLocked, isGuideMode]`,
  "carousel memo dependencies"
);
replaceRequired(
  carouselPath,
  `    firstPositiveNumber,\n    readStoredSurvivalExpense,\n    financeCardController = null,`,
  `    financeCardController = null,`,
  "carousel prop cleanup"
);

const carouselLogicPath = "src/components/financial-carousel/logic/FinancialCarouselLogic.js";
replaceRequired(
  carouselLogicPath,
  `  survivalExpense = 0,\n  user = null,`,
  `  survivalExpense = 0,\n  financeEmergencyFund = null,\n  financeTotalIncome = 0,\n  financeTotalExpenses = 0,\n  financeTotalWalletBalance = 0,\n  user = null,`,
  "carousel logic finance inputs"
);
replaceRequired(
  carouselLogicPath,
  /  const hasSurvivalSetup =[\s\S]*?\n\n  const budgetData =/,
  `  const budgetData =`,
  "remove obsolete emergency setup derivation"
);
replaceRequired(
  carouselLogicPath,
  `  firstPositiveNumber,\n  readStoredSurvivalExpense,\n} = {}) => {`,
  `} = {}) => {`,
  "remove obsolete carousel logic helpers"
);
replaceRequired(
  carouselLogicPath,
  `    emergencyFund: {\n      moneyLeft: walletMoney,\n      survivalExpense,\n      retentionRate: 0,\n      canAutoPrompt: Boolean(user?.id) && guardChecked && !loading,\n      hasSurvivalSetup,\n    },`,
  `    emergencyFund: {\n      survivalExpense,\n      emergencyFund: financeEmergencyFund,\n    },`,
  "single emergency data authority"
);
replaceRequired(
  carouselLogicPath,
  `    debtObligations: {\n      title: "Debt / Obligations",`,
  `    debtObligations: {\n      totalIncome: financeTotalIncome,\n      totalExpenses: financeTotalExpenses,\n      totalWalletBalance: financeTotalWalletBalance,\n      title: "Debt / Obligations",`,
  "debt receives parent totals"
);

const carouselItemPath = "src/components/financial-carousel/ui/CarouselItemCard.jsx";
replaceRequired(
  carouselItemPath,
  `    handleClaraAiOrbClickCapture,\n  } = props;`,
  `    handleClaraAiOrbClickCapture,\n    financeCardController,\n  } = props;`,
  "carousel item controller"
);
replaceRequired(
  carouselItemPath,
  `        onEditWallet={onEditWallet}\n      />`,
  `        onEditWallet={onEditWallet}\n        onUpdateWallet={financeCardController?.updateWallet}\n      />`,
  "wallet parent update action"
);
replaceRequired(
  carouselItemPath,
  `        handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}\n      />`,
  `        handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}\n        financeCardController={financeCardController}\n      />`,
  "emergency parent controller"
);
replaceRequired(
  carouselItemPath,
  `        isNearbySlide={isNearbySlide}\n      />`,
  `        isNearbySlide={isNearbySlide}\n        financeCardController={financeCardController}\n      />`,
  "debt parent controller"
);

write(
  "src/components/financial-carousel/cards/budget/logic/useBudgetCardLogic.js",
  `export { default } from "./useBudgetCardLogicCore";\nexport * from "./useBudgetCardLogicCore";\n`
);

const walletViewPath = "src/components/financial-carousel/cards/wallet/ui/WalletCardView.jsx";
replaceRequired(walletViewPath, `import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";\n`, ``, "wallet capture import");
replaceRequired(
  walletViewPath,
  `  onEditWallet,\n}) {`,
  `  onEditWallet,\n  onUpdateWallet,\n}) {`,
  "wallet update prop"
);
replaceRequired(
  walletViewPath,
  `      style={{ minHeight: isExpanded ? "clamp(515px,73dvh,647px)" : "clamp(286px,45dvh,430px)" }}\n      onClickCapture={(event) => {\n        if (stopCapturedDetailsToggle(event)) {\n          handleWalletToggle();\n        }\n      }}\n`,
  `      style={{ minHeight: isExpanded ? "clamp(515px,73dvh,647px)" : "clamp(286px,45dvh,430px)" }}\n`,
  "wallet single expand owner"
);
replaceRequired(
  walletViewPath,
  `        onEditWallet={onEditWallet}\n      />`,
  `        onEditWallet={onEditWallet}\n        onUpdateWallet={onUpdateWallet}\n      />`,
  "wallet update forwarding"
);

const walletCardPath = "src/components/WalletCard.jsx";
replaceRequired(
  walletCardPath,
  `  onEditWallet,\n}) {`,
  `  onEditWallet,\n  onUpdateWallet,\n}) {`,
  "wallet card update prop"
);
replaceRequired(
  walletCardPath,
  `    onEditWallet,\n  });`,
  `    onEditWallet,\n    onUpdateWallet,\n  });`,
  "wallet logic update action"
);

const walletLogicPath = "src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js";
replaceRequired(walletLogicPath, `import useUserRole from "@/hooks/useUserRole";\nimport useFinancialData from "@/hooks/useFinancialData";\n`, ``, "wallet nested hook imports");
replaceRequired(
  walletLogicPath,
  `  onEditWallet,\n} = {}) {\n  const { user } = useUserRole();\n  const { updateWallet, refreshData } = useFinancialData(user);`,
  `  onEditWallet,\n  onUpdateWallet,\n} = {}) {`,
  "wallet parent-owned action"
);
replaceRequired(
  walletLogicPath,
  `    if (typeof updateWallet !== "function") {`,
  `    if (typeof onUpdateWallet !== "function") {`,
  "wallet action availability"
);
replaceRequired(
  walletLogicPath,
  `      await updateWallet(editingWallet.id, {`,
  `      await onUpdateWallet(editingWallet.id, {`,
  "wallet update invocation"
);
replaceRequired(walletLogicPath, `      await refreshData?.();\n`, ``, "wallet duplicate refresh");

const emergencyViewPath = "src/components/financial-carousel/cards/emergency-fund/ui/EmergencyFundCardView.jsx";
replaceRequired(emergencyViewPath, `import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";\n`, ``, "emergency capture import");
replaceRequired(
  emergencyViewPath,
  `  handleClaraAiOrbClickCapture,\n}) {`,
  `  handleClaraAiOrbClickCapture,\n  financeCardController,\n}) {`,
  "emergency controller prop"
);
replaceRequired(
  emergencyViewPath,
  `      onClickCapture={(event) => {\n        if (\n          typeof handleClaraAiOrbClickCapture === "function" &&\n          handleClaraAiOrbClickCapture(event)\n        ) {\n          return;\n        }\n\n        if (stopCapturedDetailsToggle(event)) {\n          handleEmergencyToggle();\n        }\n      }}\n`,
  `      onClickCapture={(event) => {\n        handleClaraAiOrbClickCapture?.(event);\n      }}\n`,
  "emergency single expand owner"
);
replaceRequired(
  emergencyViewPath,
  `      <EmergencyFundCard\n        moneyLeft={data.moneyLeft}\n        survivalExpense={data.survivalExpense}\n        retentionRate={data.retentionRate}\n`,
  `      <EmergencyFundCard\n        user={financeCardController?.user || null}\n        emergencyFund={financeCardController?.emergencyFund ?? data.emergencyFund ?? null}\n        wallets={financeCardController?.wallets || []}\n        updateEmergencyFund={financeCardController?.updateEmergencyFund}\n        addExpense={financeCardController?.addExpense}\n        transferBetweenWallets={financeCardController?.transferBetweenWallets}\n        refreshData={financeCardController?.refreshData}\n        correctEmergencyFundBalance={financeCardController?.correctEmergencyFundBalance}\n        survivalExpense={data.survivalExpense}\n`,
  "emergency parent data and actions"
);
replaceRequired(
  emergencyViewPath,
  `        canAutoPrompt={data.canAutoPrompt}\n        hasSurvivalSetup={data.hasSurvivalSetup}\n`,
  ``,
  "remove obsolete emergency props"
);

const emergencyCardPath = "src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx";
replaceRequired(emergencyCardPath, `import { useAuth } from "@/context/AuthContext";\nimport useFinancialData from "@/hooks/useFinancialData";\n`, ``, "emergency nested hook imports");
replaceRequired(
  emergencyCardPath,
  `export default function EmergencyFundCard({ survivalExpense = 0, onSurvivalSaved, expanded = false, onToggleDetails }) {\n  const { user } = useAuth();\n  const { emergencyFund, wallets = [], updateEmergencyFund, addExpense, transferBetweenWallets, refreshData, correctEmergencyFundBalance } = useFinancialData(user);`,
  `export default function EmergencyFundCard({\n  user = null,\n  emergencyFund = null,\n  wallets = [],\n  updateEmergencyFund,\n  addExpense,\n  transferBetweenWallets,\n  refreshData,\n  correctEmergencyFundBalance,\n  survivalExpense = 0,\n  onSurvivalSaved,\n  expanded = false,\n  onToggleDetails,\n}) {`,
  "emergency parent-owned controller"
);
replaceRequired(
  emergencyCardPath,
  `    await updateEmergencyFund({ ...(emergencyFund || {}), ...patch, updatedAt: now, updated_at: now });\n    await refreshData?.();`,
  `    await updateEmergencyFund({ ...(emergencyFund || {}), ...patch, updatedAt: now, updated_at: now });`,
  "emergency duplicate persist refresh"
);
replaceRequired(emergencyCardPath, `      await refreshData?.();\n`, ``, "emergency duplicate correction refresh");

const savingsViewPath = "src/components/financial-carousel/cards/savings-goals/ui/SavingsGoalsCardView.jsx";
replaceRequired(savingsViewPath, `import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";\n`, ``, "savings capture import");
replaceRequired(
  savingsViewPath,
  `    <div\n      className="h-full min-h-[inherit] flex flex-col"\n      onClickCapture={(event) => {\n        if (stopCapturedDetailsToggle(event)) {\n          handleSavingsToggle();\n        }\n      }}\n    >`,
  `    <div className="h-full min-h-[inherit] flex flex-col">`,
  "savings single expand owner"
);

const investmentViewPath = "src/components/financial-carousel/cards/investment/ui/InvestmentCardView.jsx";
replaceRequired(investmentViewPath, `import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";\n`, ``, "income capture import");
replaceRequired(
  investmentViewPath,
  `    if (stopCapturedDetailsToggle(event)) handleInvestmentToggle();\n`,
  ``,
  "income single expand owner"
);

const debtViewPath = "src/components/financial-carousel/cards/debt/ui/DebtCardView.jsx";
replaceRequired(debtViewPath, `import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";\n`, ``, "debt capture import");
replaceRequired(
  debtViewPath,
  `  toggleFinanceDetails,\n}) {`,
  `  toggleFinanceDetails,\n  financeCardController,\n}) {`,
  "debt controller prop"
);
replaceRequired(
  debtViewPath,
  `    <div\n      className="h-full min-h-[inherit] flex flex-col"\n      onClickCapture={(event) => {\n        if (stopCapturedDetailsToggle(event)) {\n          handleToggle();\n        }\n      }}\n    >`,
  `    <div className="h-full min-h-[inherit] flex flex-col">`,
  "debt single expand owner"
);
replaceRequired(
  debtViewPath,
  `        item={item}\n        theme={selectedDashboardTheme}`,
  `        item={item}\n        user={financeCardController?.user || null}\n        theme={selectedDashboardTheme}`,
  "debt parent user"
);

const obligationPath = "src/components/ObligationDebt.jsx";
replaceRequired(obligationPath, `import { useAuth } from "@/context/AuthContext";\n`, ``, "debt auth import");
replaceRequired(
  obligationPath,
  `export default function ObligationDebt({ item = null, expanded = false, onToggleDetails }) {\n  const { user } = useAuth();`,
  `export default function ObligationDebt({ item = null, user = null, expanded = false, onToggleDetails }) {`,
  "debt parent user ownership"
);
replaceRequired(
  obligationPath,
  `  const { state, computed, handlers } = useDebtCardLogic({ item, expanded, onToggleDetails });`,
  `  const { state, computed, handlers } = useDebtCardLogic({ item, user, expanded, onToggleDetails });`,
  "debt logic parent user"
);

const debtLogicPath = "src/components/financial-carousel/cards/debt/logic/useDebtCardLogic.js";
replaceRequired(debtLogicPath, `import { useAuth } from "@/context/AuthContext";\nimport useFinancialData from "@/hooks/useFinancialData";\n`, ``, "debt nested hook imports");
replaceRequired(
  debtLogicPath,
  `  item = null,\n  expanded = false,`,
  `  item = null,\n  user = null,\n  expanded = false,`,
  "debt user prop"
);
replaceRequired(
  debtLogicPath,
  `  const { user: authUser } = useAuth();\n  const {\n    totalIncome = 0,\n    totalExpenses = 0,\n    totalWalletBalance = 0,\n  } = useFinancialData(authUser);\n\n`,
  ``,
  "debt removes nested finance controller"
);
replaceRequired(
  debtLogicPath,
  `  const localUserId = String(authUser?.id || authUser?.email || "local-user");`,
  `  const localUserId = String(user?.id || user?.email || "local-user");`,
  "debt local user identity"
);
replaceRequired(
  debtLogicPath,
  `  const income = toDebtNumber(totalIncome);\n  const expenses = toDebtNumber(totalExpenses);\n  const walletBalance = toDebtNumber(totalWalletBalance);`,
  `  const income = toDebtNumber(data.totalIncome || 0);\n  const expenses = toDebtNumber(data.totalExpenses || 0);\n  const walletBalance = toDebtNumber(data.totalWalletBalance || 0);`,
  "debt parent totals"
);

removeFile("src/components/financial-carousel/shared/financeCardInteraction.js");

write(
  "tests/financial-card-ownership-regression.test.mjs",
  `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { existsSync, readFileSync } from "node:fs";\n\nconst readSource = (relativePath) =>\n  readFileSync(new URL(\`../\${relativePath}\`, import.meta.url), "utf8");\n\nconst dashboard = readSource("src/pages/Dashboard.jsx");\nconst homePanel = readSource("src/components/fresh/main-dashboard/shell/DashboardHomePanel.jsx");\nconst carousel = readSource("src/components/financial-carousel/FinancialCarousel.jsx");\nconst budgetLogic = readSource("src/components/financial-carousel/cards/budget/logic/useBudgetCardLogic.js");\nconst walletLogic = readSource("src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js");\nconst emergencyCard = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx");\nconst debtLogic = readSource("src/components/financial-carousel/cards/debt/logic/useDebtCardLogic.js");\n\ntest("Dashboard owns one finance card controller", () => {\n  assert.match(dashboard, /const financeCardController = \{/);\n  assert.match(dashboard, /correctEmergencyFundBalance: correctEmergencyFundBalanceData/);\n  assert.match(dashboard, /thisMonthSpent, fmt, financeCardController/);\n  assert.match(homePanel, /financeCardController=\{isGuideMode \? null : financeCardController\}/);\n});\n\ntest("financial cards do not create duplicate full finance controllers", () => {\n  assert.doesNotMatch(carousel, /useFinancialData/);\n  assert.doesNotMatch(walletLogic, /useFinancialData|useUserRole/);\n  assert.doesNotMatch(emergencyCard, /useFinancialData|useAuth/);\n  assert.doesNotMatch(debtLogic, /useFinancialData|useAuth/);\n  assert.match(carousel, /financeCardController \|\| \{\}/);\n});\n\ntest("Budget preserves the protected remaining calculation from its core", () => {\n  assert.match(budgetLogic, /export \{ default \} from "\.\/useBudgetCardLogicCore"/);\n  assert.doesNotMatch(budgetLogic, /declared - spent/);\n  assert.doesNotMatch(budgetLogic, /safeDailyPace: remaining/);\n});\n\ntest("finance expand buttons have one explicit click owner", () => {\n  const interactionPath = new URL("../src/components/financial-carousel/shared/financeCardInteraction.js", import.meta.url);\n  assert.equal(existsSync(interactionPath), false);\n  for (const file of [\n    "src/components/financial-carousel/cards/wallet/ui/WalletCardView.jsx",\n    "src/components/financial-carousel/cards/emergency-fund/ui/EmergencyFundCardView.jsx",\n    "src/components/financial-carousel/cards/savings-goals/ui/SavingsGoalsCardView.jsx",\n    "src/components/financial-carousel/cards/investment/ui/InvestmentCardView.jsx",\n    "src/components/financial-carousel/cards/debt/ui/DebtCardView.jsx",\n  ]) {\n    assert.doesNotMatch(readSource(file), /stopCapturedDetailsToggle|financeCardInteraction/);\n  }\n});\n\ntest("Emergency Fund and Debt consume parent-owned data and actions", () => {\n  assert.match(emergencyCard, /updateEmergencyFund,/);\n  assert.match(emergencyCard, /correctEmergencyFundBalance,/);\n  assert.match(debtLogic, /data\.totalIncome/);\n  assert.match(debtLogic, /data\.totalExpenses/);\n  assert.match(debtLogic, /data\.totalWalletBalance/);\n});\n`
);

console.log("Financial card ownership surgery applied.");
