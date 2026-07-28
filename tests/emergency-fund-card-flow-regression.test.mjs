import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const view = readSource("src/components/financial-carousel/cards/emergency-fund/ui/EmergencyFundCardView.jsx");
const card = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx");
const modals = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardModals.jsx");
const allocationSync = readSource("src/components/fresh/main-dashboard/carousel/logic/useEmergencyFundAllocationSync.js");

 test("Emergency Fund receives rollback ownership from the Dashboard controller", () => {
  assert.match(view, /deleteExpense=\{financeCardController\?\.deleteExpense\}/);
  assert.match(card, /deleteExpense,/);
  assert.match(card, /throw new Error\("Emergency Fund saving is not available yet\."\)/);
});

test("adding reserve money moves wallets directly instead of creating a temporary expense", () => {
  assert.match(card, /const finalStorageWallet = activeStorageWallet;/);
  assert.match(card, /source_type: "emergency_fund_allocation"/);
  assert.match(card, /Emergency Fund allocation rollback/);
  assert.doesNotMatch(card, /category: "Emergency Fund Allocation", need_type: "other"/);
  assert.doesNotMatch(card, /finalStorageWallet = activeStorageWallet \|\| sourceWallet/);
});

test("using the reserve creates a real wallet expense and rolls it back if protection cannot save", () => {
  assert.match(card, /category: "Emergency Fund Used"/);
  assert.match(card, /planning_status: "unplanned"/);
  assert.match(card, /await deleteExpense\(expenseId\)/);
  assert.match(card, /storage wallet does not contain enough money/);
});

test("Emergency Fund usage cannot be mistaken for a legacy allocation", () => {
  const usageBlock = card.match(/category: "Emergency Fund Used"[\s\S]*?source_type: "emergency_fund_usage"/)?.[0] || "";
  assert.ok(usageBlock);
  assert.doesNotMatch(usageBlock, /emergency_fund_transaction_id|emergencyFundTransactionId/);
  assert.match(allocationSync, /if \(usageLike\) return false/);
  assert.match(allocationSync, /body\.includes\("emergency fund used"\)/);
});

test("storage changes and reset failures preserve the prior financial state", () => {
  assert.match(card, /emergency_fund_storage_move_rollback/);
  assert.match(card, /const resetCompleted = await resetEmergencyFund\(\)/);
  assert.match(card, /if \(resetCompleted\) setShowResetConfirm\(false\)/);
  assert.match(modals, /The actual money will remain in its wallet and become spendable again\./);
  assert.match(modals, /EmergencyResetConfirmModal\(\{ open, onClose, onConfirm, saving, error \}\)/);
});

test("missing storage wallets block reserve mutations instead of silently relinking", () => {
  assert.match(card, /Choose an available storage wallet before adding money\./);
  assert.match(card, /Choose an available storage wallet before using this fund\./);
  assert.match(card, /The linked storage wallet is unavailable/);
  assert.match(card, /disabled=\{!activeStorageWallet \|\| saving \|\| movingFund\}/);
});
