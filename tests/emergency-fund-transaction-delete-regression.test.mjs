import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const financialHook = readSource("src/hooks/useFinancialData.js");
const transactionHub = readSource("src/pages/TransactionHub.jsx");

test("Transaction Hub routes protected allocations through the Emergency Fund delete handler", () => {
  assert.match(transactionHub, /const isEmergencyAllocation = isEmergencyFundAllocation\(selectedTransaction\)/);
  assert.match(transactionHub, /await financial\.deleteEmergencyFundAllocation\(selectedTransaction\)/);
});

test("Emergency Fund deletion resolves transfer-in and transfer-out rows back to the transfer group", () => {
  assert.match(financialHook, /transfer_group_id/);
  assert.match(financialHook, /const isTransferIn = type\.includes\("transfer_in"\)/);
  assert.match(financialHook, /const isTransferOut = type\.includes\("transfer_out"\)/);
  assert.match(financialHook, /await financeData\.deleteTransfer\(transferBacking\.transferGroupId\)/);
});

test("deleting a protected transfer also reduces Emergency Fund protection and removes allocation activity", () => {
  assert.match(financialHook, /const nextSaved = Math\.max\(currentEmergencyAmount - amount, 0\)/);
  assert.match(financialHook, /removeEmergencyAllocationActivity/);
  assert.match(financialHook, /await financeData\.updateEmergencyFund\(removal\.payload\)/);
});

test("failed Emergency Fund state updates restore the deleted wallet transfer", () => {
  assert.match(financialHook, /if \(transferDeleted && typeof financeData\?\.transferBetweenWallets === "function"\)/);
  assert.match(financialHook, /Emergency Fund Allocation restored after delete rollback/);
});
