import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const view = readSource("src/components/financial-carousel/cards/emergency-fund/ui/EmergencyFundCardView.jsx");
const card = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx");
const modals = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardModals.jsx");
const allocationSync = readSource("src/components/fresh/main-dashboard/carousel/logic/useEmergencyFundAllocationSync.js");
const registry = readSource("src/lib/clara-masterclass-registry.js");
const runtime = readSource("src/components/community/masterclass/ClaraMasterclassRuntime.jsx");
const api = readSource("api/clara-masterclass-gemini.js");
const emergencyI18n = readSource("src/lib/clara-emergency-fund-masterclass-i18n.js");

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

test("same-wallet reserve allocation is classification only and does not move wallet money", () => {
  assert.match(card, /const shouldMoveWalletMoney = sourceWalletId !== finalStorageId/);
  assert.match(card, /if \(shouldMoveWalletMoney\) \{/);
  assert.match(card, /Protected inside \$\{finalStorageName\}/);
});

test("legacy same-wallet allocation migration cannot synthesize a wallet refund", () => {
  assert.match(allocationSync, /const sameWalletAllocation = Boolean/);
  assert.match(allocationSync, /fromWalletId === toWalletId/);
  const guardBlock = allocationSync.match(/if \(sameWalletAllocation\) \{[\s\S]*?continue;\n\s*\}/)?.[0] || "";
  assert.ok(guardBlock);
  assert.match(guardBlock, /processedIdsRef\.current\.add\(processingKey\)/);
  assert.doesNotMatch(guardBlock, /deleteExpense|transferBetweenWallets/);
  assert.match(allocationSync, /can manufacture[\s\S]*₱2,500 -> ₱4,500/);
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

test("Emergency Fund education is routed into the shared CLARA Masterclass engine", () => {
  assert.match(card, /\/community\?view=orb&masterclass=emergency-fund/);
  assert.match(card, /masterclassId: "emergency-fund"/);
  assert.match(card, /monthlySurvivalCost: monthlyExpense/);
  assert.match(card, /protectedAmount: savedAmount/);
  assert.match(card, /monthsProtected: months/);
  assert.doesNotMatch(card, /showInfo/);
  assert.match(registry, /"emergency-fund": Object\.freeze/);
  assert.match(registry, /getEmergencyFundMasterclassExperience/);
  assert.match(runtime, /getClaraMasterclassDefinition\(masterclassId\)/);
});

test("Emergency Fund Masterclass keeps authored curriculum as authority and personalized values out of Gemini prompts", () => {
  assert.match(emergencyI18n, /The authored Emergency Fund curriculum is the source of truth/);
  assert.match(emergencyI18n, /Never pretend to know the learner's private finances/);
  assert.match(emergencyI18n, /locationState\?\.claraMasterclassContext/);
  assert.doesNotMatch(emergencyI18n, /monthlySurvivalCost[\s\S]{0,500}LEARNER'S FOLLOW-UP QUESTION/);
  assert.match(api, /\["emergency-fund", "CLARA EMERGENCY FUND MASTERCLASS"\]/);
  assert.match(api, /validMasterclassPrompt\(masterclassId, prompt, mode\)/);
});
