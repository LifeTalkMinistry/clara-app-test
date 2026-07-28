import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content, "utf8");

function replaceRequired(file, search, replacement, label) {
  const source = read(file);
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Missing finalization anchor (${label}) in ${file}`);
  write(file, next);
}

const dashboardPath = "src/pages/Dashboard.jsx";
replaceRequired(
  dashboardPath,
  `import { useState, useRef } from "react";`,
  `import { useMemo, useState, useRef } from "react";`,
  "Dashboard useMemo import"
);
replaceRequired(
  dashboardPath,
  `  const financeCardController = {\n    user,\n    wallets,\n    expenses,\n    transfers,\n    emergencyFund,\n    totalIncome: financeTotalIncome,\n    totalExpenses: financeTotalExpenses,\n    totalWalletBalance: financeTotalWalletBalance,\n    refreshData: refreshFinancialData,\n    deleteExpense: deleteExpenseData,\n    updateWallet: updateWalletData,\n    addExpense: addExpenseData,\n    transferBetweenWallets: transferBetweenWalletsData,\n    updateEmergencyFund: updateEmergencyFundData,\n    correctEmergencyFundBalance: correctEmergencyFundBalanceData,\n  };`,
  `  const financeCardController = useMemo(\n    () => ({\n      user,\n      wallets,\n      expenses,\n      transfers,\n      emergencyFund,\n      totalIncome: financeTotalIncome,\n      totalExpenses: financeTotalExpenses,\n      totalWalletBalance: financeTotalWalletBalance,\n      refreshData: refreshFinancialData,\n      deleteExpense: deleteExpenseData,\n      updateWallet: updateWalletData,\n      addExpense: addExpenseData,\n      transferBetweenWallets: transferBetweenWalletsData,\n      updateEmergencyFund: updateEmergencyFundData,\n      correctEmergencyFundBalance: correctEmergencyFundBalanceData,\n    }),\n    [\n      user,\n      wallets,\n      expenses,\n      transfers,\n      emergencyFund,\n      financeTotalIncome,\n      financeTotalExpenses,\n      financeTotalWalletBalance,\n      refreshFinancialData,\n      deleteExpenseData,\n      updateWalletData,\n      addExpenseData,\n      transferBetweenWalletsData,\n      updateEmergencyFundData,\n      correctEmergencyFundBalanceData,\n    ]\n  );`,
  "memoized finance card controller"
);

const walletLogicPath = "src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js";
replaceRequired(
  walletLogicPath,
  `      await onUpdateWallet(editingWallet.id, {\n        name: nextName,\n        wallet_name: nextName,\n        type: nextType,\n        icon: getWalletIcon(nextType, editingWallet?.icon || "💰"),\n        updated_at: new Date().toISOString(),\n      });\n      closeEditWallet();`,
  `      await onUpdateWallet(editingWallet.id, {\n        name: nextName,\n        wallet_name: nextName,\n        type: nextType,\n        icon: getWalletIcon(nextType, editingWallet?.icon || "💰"),\n        updated_at: new Date().toISOString(),\n      });\n      setEditingWallet(null);\n      setEditForm({ name: "", type: "cash" });`,
  "Wallet successful edit closes modal"
);

const testPath = "tests/financial-card-ownership-regression.test.mjs";
replaceRequired(
  testPath,
  `  assert.equal(dashboard.includes("const financeCardController = {"), true);`,
  `  assert.equal(dashboard.includes("const financeCardController = useMemo("), true);`,
  "memoized controller regression"
);
replaceRequired(
  testPath,
  `test("Emergency Fund and Debt consume parent-owned data and actions", () => {`,
  `test("successful Wallet edits close the local edit modal without a second finance refresh", () => {\n  assert.match(walletLogic, /await onUpdateWallet/);\n  assert.match(walletLogic, /setEditingWallet\\(null\\)/);\n  assert.match(walletLogic, /setEditForm\\(\\{ name: "", type: "cash" \\}\\)/);\n  assert.doesNotMatch(walletLogic, /await refreshData/);\n});\n\ntest("Emergency Fund and Debt consume parent-owned data and actions", () => {`,
  "Wallet edit regression"
);

console.log("Financial card ownership finalization applied.");
