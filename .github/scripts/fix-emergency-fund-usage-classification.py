from pathlib import Path

card_path = Path("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx")
card = card_path.read_text(encoding="utf-8")
old_usage = '''        updated_at: now,
        emergency_fund_transaction_id: activityId,
        emergencyFundTransactionId: activityId,
        source_type: "emergency_fund_usage",'''
new_usage = '''        updated_at: now,
        source_type: "emergency_fund_usage",'''
if old_usage in card:
    card = card.replace(old_usage, new_usage, 1)
elif new_usage not in card:
    raise RuntimeError("Could not isolate Emergency Fund usage from allocation IDs.")
card_path.write_text(card, encoding="utf-8")

sync_path = Path("src/components/fresh/main-dashboard/carousel/logic/useEmergencyFundAllocationSync.js")
sync = sync_path.read_text(encoding="utf-8")
old_sync = '''const isEmergencyAllocationExpense = (expense = {}) => {
  if (expense?.deletedAt || expense?.deleted_at) return false;
  const body = getRecordText(expense);

  return Boolean(
    firstText(expense, [
      "emergency_fund_transaction_id",
      "emergencyFundTransactionId",
      "emergency_fund_id",
      "emergencyFundId",
    ]) ||
      body.includes("emergency fund allocation") ||
      body.includes("moved to emergency fund") ||
      cleanText(expense?.source_type || expense?.sourceType).includes("emergency fund allocation") ||
      cleanText(expense?.type).includes("emergency fund allocation")
  );
};'''
new_sync = '''const isEmergencyAllocationExpense = (expense = {}) => {
  if (expense?.deletedAt || expense?.deleted_at) return false;
  const body = getRecordText(expense);
  const sourceType = cleanText(expense?.source_type || expense?.sourceType);
  const type = cleanText(expense?.type);
  const usageLike =
    body.includes("emergency fund used") ||
    body.includes("emergency fund usage") ||
    sourceType.includes("emergency fund usage") ||
    sourceType.includes("emergency_fund_usage") ||
    type.includes("emergency fund usage") ||
    type.includes("emergency fund used");

  if (usageLike) return false;

  return Boolean(
    firstText(expense, [
      "emergency_fund_transaction_id",
      "emergencyFundTransactionId",
      "emergency_fund_id",
      "emergencyFundId",
    ]) ||
      body.includes("emergency fund allocation") ||
      body.includes("moved to emergency fund") ||
      sourceType.includes("emergency fund allocation") ||
      type.includes("emergency fund allocation")
  );
};'''
if old_sync in sync:
    sync = sync.replace(old_sync, new_sync, 1)
elif new_sync not in sync:
    raise RuntimeError("Could not harden Emergency Fund allocation classification.")
sync_path.write_text(sync, encoding="utf-8")

test_path = Path("tests/emergency-fund-card-flow-regression.test.mjs")
test = test_path.read_text(encoding="utf-8")
if 'const allocationSync = readSource(' not in test:
    test = test.replace(
        'const modals = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardModals.jsx");',
        'const modals = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardModals.jsx");\nconst allocationSync = readSource("src/components/fresh/main-dashboard/carousel/logic/useEmergencyFundAllocationSync.js");',
        1,
    )
marker = '''test("storage changes and reset failures preserve the prior financial state", () => {'''
new_test = '''test("Emergency Fund usage cannot be mistaken for a legacy allocation", () => {
  const usageBlock = card.match(/category: "Emergency Fund Used"[\\s\\S]*?source_type: "emergency_fund_usage"/)?.[0] || "";
  assert.ok(usageBlock);
  assert.doesNotMatch(usageBlock, /emergency_fund_transaction_id|emergencyFundTransactionId/);
  assert.match(allocationSync, /if \\(usageLike\\) return false/);
  assert.match(allocationSync, /body\\.includes\\("emergency fund used"\\)/);
});

''' + marker
if 'Emergency Fund usage cannot be mistaken for a legacy allocation' not in test:
    if marker not in test:
        raise RuntimeError("Could not add usage classification regression.")
    test = test.replace(marker, new_test, 1)
test_path.write_text(test, encoding="utf-8")
