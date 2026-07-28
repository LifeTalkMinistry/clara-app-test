import fs from "node:fs";

function replaceRequired(file, source, target, label) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes(target)) return;
  if (!content.includes(source)) throw new Error(`Missing ${label} in ${file}`);
  fs.writeFileSync(file, content.replace(source, target));
}

const synced = "src/components/financial-carousel/cards/wallet/ui/WalletCardContentSynced.jsx";
replaceRequired(
  synced,
  `    const isEmergencyStorageWallet =
      emergencyAmount > 0 &&
      Boolean(emergencyWallet) &&
      (walletId === emergencyWalletId || (!walletId && emergencyWalletName && walletName === emergencyWalletName));
    const emergencyProtectedAmount = isEmergencyStorageWallet
      ? Math.min(emergencyAmount, Math.max(walletBalance, 0))
      : 0;`,
  `    const isEmergencyStorageWallet =
      Boolean(emergencyWallet) &&
      (walletId === emergencyWalletId || (!walletId && emergencyWalletName && walletName === emergencyWalletName));
    const emergencyProtectedAmount = emergencyAmount > 0 && isEmergencyStorageWallet
      ? Math.min(emergencyAmount, Math.max(walletBalance, 0))
      : 0;`,
  "Emergency Fund storage-wallet link"
);
replaceRequired(
  synced,
  `      hasEmergencyFundAllocation: emergencyProtectedAmount > 0,
      has_emergency_fund_allocation: emergencyProtectedAmount > 0,
      hasSavingsGoalAllocation: savingsGoalStats.count > 0,`,
  `      hasEmergencyFundAllocation: emergencyProtectedAmount > 0,
      has_emergency_fund_allocation: emergencyProtectedAmount > 0,
      isEmergencyFundStorageWallet: isEmergencyStorageWallet,
      is_emergency_fund_storage_wallet: isEmergencyStorageWallet,
      hasSavingsGoalAllocation: savingsGoalStats.count > 0,`,
  "linked-fund flags"
);
replaceRequired(
  synced,
  `      emergencyFundLinkedWalletId: emergencyProtectedAmount > 0 ? emergencyWalletId : null,
      emergency_fund_linked_wallet_id: emergencyProtectedAmount > 0 ? emergencyWalletId : null,`,
  `      emergencyFundLinkedWalletId: isEmergencyStorageWallet ? emergencyWalletId : null,
      emergency_fund_linked_wallet_id: isEmergencyStorageWallet ? emergencyWalletId : null,`,
  "Emergency Fund linked wallet id"
);

const handlers = "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js";
replaceRequired(
  handlers,
  `    const balance = getWalletDisplayBalance(wallet);

    if (protectedAmount > 0) {
      showFinanceNotice("Move the Emergency Fund or Savings Goal allocation before removing this wallet.");`,
  `    const balance = getWalletDisplayBalance(wallet);
    const hasLinkedFunds = Boolean(
      wallet?.isEmergencyFundStorageWallet ||
        wallet?.is_emergency_fund_storage_wallet ||
        wallet?.hasSavingsGoalAllocation ||
        wallet?.has_savings_goal_allocation ||
        Number(wallet?.savingsGoalCount || wallet?.savings_goal_count || 0) > 0
    );

    if (protectedAmount > 0 || hasLinkedFunds) {
      showFinanceNotice("Reassign the linked Emergency Fund or Savings Goal before removing this wallet.");`,
  "linked-fund delete guard"
);

const renderer = "src/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer.jsx";
replaceRequired(
  renderer,
  `  const deleteWalletBalance = getWalletDisplayBalance(financeModal.payload);
  const deleteWalletBlocked =
    deleteWalletProtectedAmount > 0 || Math.abs(deleteWalletBalance) > 0.000001;`,
  `  const deleteWalletBalance = getWalletDisplayBalance(financeModal.payload);
  const deleteWalletHasLinkedFunds = Boolean(
    financeModal.payload?.isEmergencyFundStorageWallet ||
      financeModal.payload?.is_emergency_fund_storage_wallet ||
      financeModal.payload?.hasSavingsGoalAllocation ||
      financeModal.payload?.has_savings_goal_allocation ||
      Number(financeModal.payload?.savingsGoalCount || financeModal.payload?.savings_goal_count || 0) > 0
  );
  const deleteWalletBlocked =
    deleteWalletProtectedAmount > 0 ||
    deleteWalletHasLinkedFunds ||
    Math.abs(deleteWalletBalance) > 0.000001;`,
  "linked-fund modal state"
);
replaceRequired(
  renderer,
  `        submitDisabledLabel={deleteWalletProtectedAmount > 0 ? "Protected Funds" : "Clear Balance First"}`,
  `        submitDisabledLabel={deleteWalletProtectedAmount > 0 || deleteWalletHasLinkedFunds ? "Linked Funds" : "Clear Balance First"}`,
  "linked-fund disabled label"
);
replaceRequired(
  renderer,
  `          {deleteWalletProtectedAmount > 0
            ? "This wallet contains protected Emergency Fund or Savings Goal money. Move that allocation first."
            : Math.abs(deleteWalletBalance) > 0.000001`,
  `          {deleteWalletProtectedAmount > 0 || deleteWalletHasLinkedFunds
            ? "This wallet is linked to an Emergency Fund or Savings Goal. Reassign that link before removing it."
            : Math.abs(deleteWalletBalance) > 0.000001`,
  "linked-fund removal copy"
);

const testFile = "tests/wallet-expanded-flow-regression.test.mjs";
replaceRequired(
  testFile,
  `  assert.equal(renderer.includes("submitDisabled={deleteWalletBlocked}"), true);
  assert.equal(walletListItem.includes("onDeleteWallet?.(wallet)"), true);`,
  `  assert.equal(renderer.includes("submitDisabled={deleteWalletBlocked}"), true);
  assert.equal(renderer.includes("deleteWalletHasLinkedFunds"), true);
  assert.equal(handlers.includes("hasLinkedFunds"), true);
  assert.equal(syncedContent.includes("isEmergencyFundStorageWallet"), true);
  assert.equal(walletListItem.includes("onDeleteWallet?.(wallet)"), true);`,
  "linked-fund regression assertions"
);
