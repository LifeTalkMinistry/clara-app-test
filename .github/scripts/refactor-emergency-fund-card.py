from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, content):
    Path(path).write_text(content, encoding="utf-8")


def replace_once(path, old, new, label):
    content = read(path)
    if new in content:
        return
    if old not in content:
        raise RuntimeError(f"Missing patch anchor ({label}) in {path}")
    write(path, content.replace(old, new, 1))


def replace_regex(path, pattern, replacement, label):
    content = read(path)
    if re.search(pattern, content, flags=re.S) is None:
        if replacement.strip() in content:
            return
        raise RuntimeError(f"Missing regex anchor ({label}) in {path}")
    write(path, re.sub(pattern, replacement, content, count=1, flags=re.S))


view = "src/components/financial-carousel/cards/emergency-fund/ui/EmergencyFundCardView.jsx"
replace_once(
    view,
    "        addExpense={financeCardController?.addExpense}\n        transferBetweenWallets={financeCardController?.transferBetweenWallets}",
    "        addExpense={financeCardController?.addExpense}\n        deleteExpense={financeCardController?.deleteExpense}\n        transferBetweenWallets={financeCardController?.transferBetweenWallets}",
    "pass deleteExpense rollback action",
)

card = "src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx"
replace_once(
    card,
    "  updateEmergencyFund,\n  addExpense,\n  transferBetweenWallets,",
    "  updateEmergencyFund,\n  addExpense,\n  deleteExpense,\n  transferBetweenWallets,",
    "receive deleteExpense",
)
replace_once(
    card,
    "  const [showResetConfirm, setShowResetConfirm] = useState(false);\n  const pendingStorageWallet",
    "  const [showResetConfirm, setShowResetConfirm] = useState(false);\n  const [resetError, setResetError] = useState(\"\");\n  const pendingStorageWallet",
    "reset error state",
)
replace_once(
    card,
    "  const persistEmergencyFund = async (patch) => {\n    if (typeof updateEmergencyFund !== \"function\") return;\n    const now = new Date().toISOString();",
    "  const persistEmergencyFund = async (patch) => {\n    if (typeof updateEmergencyFund !== \"function\") {\n      throw new Error(\"Emergency Fund saving is not available yet.\");\n    }\n    const now = new Date().toISOString();",
    "reject missing save action",
)

add_function = r'''  const addEmergencyMoney = async () => {
    const amount = toNumber(addAmount);
    const sourceWallet = safeWallets.find((wallet) => getWalletId(wallet) === sourceWalletId);
    const finalStorageWallet = activeStorageWallet;
    if (isEmergencyFundUnconfigured) return setAddError("Set up your Emergency Fund first.");
    if (!sourceWallet) return setAddError("Choose a valid source wallet.");
    if (amount <= 0) return setAddError("Enter a valid amount.");
    if (getWalletSpendable(sourceWallet) < amount) return setAddError("This wallet does not have enough spendable balance.");
    if (!finalStorageWallet) return setAddError("Choose an available storage wallet before adding money.");

    const now = new Date().toISOString();
    const sourceName = getWalletName(sourceWallet);
    const finalStorageId = getWalletId(finalStorageWallet);
    const finalStorageName = getWalletName(finalStorageWallet);
    const nextSaved = savedAmount + amount;
    const activityId = `emergency_allocation_${Date.now()}`;
    const shouldMoveWalletMoney = sourceWalletId !== finalStorageId;
    const nextActivity = [{ id: activityId, type: "allocation", amount, title: "Emergency Fund Allocation", reason: "Emergency Fund Allocation", note: shouldMoveWalletMoney ? `From ${sourceName}; stored in ${finalStorageName}` : `Protected inside ${finalStorageName}`, sourceWalletId, source_wallet_id: sourceWalletId, sourceWalletName: sourceName, source_wallet_name: sourceName, storageWalletId: finalStorageId, storage_wallet_id: finalStorageId, storageWalletName: finalStorageName, storage_wallet_name: finalStorageName, balanceBefore: savedAmount, balanceAfter: nextSaved, createdAt: now, created_at: now }, ...activity].slice(0, 60);
    let movedWalletMoney = false;

    setSaving(true);
    setAddError("");
    try {
      if (shouldMoveWalletMoney) {
        if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await transferBetweenWallets({
          id: activityId,
          transfer_group_id: activityId,
          from_wallet_id: sourceWalletId,
          to_wallet_id: finalStorageId,
          amount,
          notes: `Emergency Fund Allocation. From ${sourceName}; stored in ${finalStorageName}.`,
          date: now,
          created_at: now,
          emergency_fund_transaction_id: activityId,
          emergencyFundTransactionId: activityId,
          source_type: "emergency_fund_allocation",
          category: "Emergency Fund Allocation",
          planning_status: "planned",
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        movedWalletMoney = true;
      }

      await persistEmergencyFund({ savedAmount: nextSaved, saved_amount: nextSaved, currentAmount: nextSaved, current_amount: nextSaved, amount: nextSaved, balance: nextSaved, moneyLeft: nextSaved, protectedBalance: nextSaved, protected_balance: nextSaved, reserveBalance: nextSaved, reserve_balance: nextSaved, targetAmount: target, target_amount: target, target, linkedWalletId: finalStorageId, linked_wallet_id: finalStorageId, reserveWalletId: finalStorageId, reserve_wallet_id: finalStorageId, storageWalletId: finalStorageId, storage_wallet_id: finalStorageId, linkedWalletName: finalStorageName, linked_wallet_name: finalStorageName, reserveWalletName: finalStorageName, reserve_wallet_name: finalStorageName, storageWalletName: finalStorageName, storage_wallet_name: finalStorageName, emergencyActivityLog: nextActivity, emergency_activity_log: nextActivity, activityLog: nextActivity, activity_log: nextActivity, lastTopUpAmount: amount, last_top_up_amount: amount, lastReserveAllocationAt: now, last_reserve_allocation_at: now });
      setShowAddModal(false);
      setAddAmount("");
    } catch (error) {
      if (movedWalletMoney && typeof transferBetweenWallets === "function") {
        try {
          await transferBetweenWallets({
            from_wallet_id: finalStorageId,
            to_wallet_id: sourceWalletId,
            amount,
            notes: "Emergency Fund allocation rollback after the reserve record could not be saved.",
            source_type: "emergency_fund_allocation_rollback",
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_by: user?.email || null,
          });
        } catch (rollbackError) {
          console.error("Unable to roll back Emergency Fund wallet movement:", rollbackError);
        }
      }
      console.error("Unable to add Emergency Fund money:", error);
      setAddError("CLARA could not add this Emergency Fund amount yet. No reserve change was kept.");
    } finally {
      setSaving(false);
    }
  };
'''
replace_regex(
    card,
    r"  const addEmergencyMoney = async \(\) => \{.*?\n  \};\n\n  const useEmergencyMoney",
    add_function + "\n  const useEmergencyMoney",
    "replace add flow",
)

use_function = r'''  const useEmergencyMoney = async () => {
    const amount = toNumber(useAmount);
    const reason = String(useReason || "").trim();
    if (amount <= 0) return setUseError("Enter a valid amount.");
    if (amount > savedAmount) return setUseError("This is higher than your current reserve.");
    if (!reason) return setUseError("Add a short emergency reason.");
    if (!activeStorageWallet) return setUseError("Choose an available storage wallet before using this fund.");
    if (getWalletBalance(activeStorageWallet) < amount) return setUseError("The storage wallet does not contain enough money for this emergency expense.");
    if (typeof addExpense !== "function" || typeof deleteExpense !== "function") return setUseError("Emergency expense logging is not available yet.");

    const now = new Date().toISOString();
    const activityId = `emergency_use_${Date.now()}`;
    const expenseId = `emergency_use_expense_${Date.now()}`;
    const nextSaved = Math.max(savedAmount - amount, 0);
    const nextActivity = [{ id: activityId, type: "use", amount, title: "Emergency Fund Used", reason, note: `Paid from ${storageWalletName}`, storageWalletId, storage_wallet_id: storageWalletId, balanceBefore: savedAmount, balanceAfter: nextSaved, createdAt: now, created_at: now }, ...activity].slice(0, 60);
    let expenseCreated = false;

    setSaving(true);
    setUseError("");
    try {
      await addExpense({
        id: expenseId,
        wallet_id: storageWalletId,
        amount,
        category: "Emergency Fund Used",
        need_type: "need",
        planning_status: "unplanned",
        unplanned_reason: reason,
        notes: `Emergency Fund expense: ${reason}`,
        date: now,
        created_at: now,
        updated_at: now,
        emergency_fund_transaction_id: activityId,
        emergencyFundTransactionId: activityId,
        source_type: "emergency_fund_usage",
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      expenseCreated = true;

      await persistEmergencyFund({ savedAmount: nextSaved, saved_amount: nextSaved, currentAmount: nextSaved, current_amount: nextSaved, amount: nextSaved, balance: nextSaved, moneyLeft: nextSaved, protectedBalance: nextSaved, protected_balance: nextSaved, reserveBalance: nextSaved, reserve_balance: nextSaved, emergencyActivityLog: nextActivity, emergency_activity_log: nextActivity, activityLog: nextActivity, activity_log: nextActivity, usageLog: nextActivity, usage_log: nextActivity, lastEmergencySpendAmount: amount, last_emergency_spend_amount: amount, lastEmergencySpendReason: reason, last_emergency_spend_reason: reason, lastEmergencySpendAt: now, last_emergency_spend_at: now });
      setShowUseModal(false);
      setUseAmount("");
      setUseReason("");
      setEmergencyActionType("expense");
      setCorrectionOrphanId("");
    } catch (error) {
      if (expenseCreated) {
        try {
          await deleteExpense(expenseId);
        } catch (rollbackError) {
          console.error("Unable to roll back Emergency Fund expense:", rollbackError);
        }
      }
      console.error("Unable to use Emergency Fund money:", error);
      setUseError("CLARA could not log this emergency usage yet. No reserve change was kept.");
    } finally {
      setSaving(false);
    }
  };
'''
replace_regex(
    card,
    r"  const useEmergencyMoney = async \(\) => \{.*?\n  \};\n\n  const reverseOrphanAllocation",
    use_function + "\n  const reverseOrphanAllocation",
    "replace use flow",
)

move_function = r'''  const confirmStorageWalletMove = async () => {
    const nextWallet = pendingStorageWallet;
    if (!nextWallet) return setMoveError("Choose a valid destination wallet.");
    const nextWalletId = getWalletId(nextWallet);
    const nextWalletName = getWalletName(nextWallet);
    const shouldTransfer = savedAmount > 0 && Boolean(activeStorageWallet);
    if (shouldTransfer && getWalletBalance(activeStorageWallet) < savedAmount) return setMoveError("The current storage wallet does not have enough balance to move this protected amount.");
    const now = new Date().toISOString();
    const previousWalletId = activeStorageWallet ? getWalletId(activeStorageWallet) : "";
    const previousWalletName = activeStorageWallet ? getWalletName(activeStorageWallet) : "Previous wallet";
    const nextActivity = savedAmount > 0 ? [{ id: `emergency_storage_move_${Date.now()}`, type: shouldTransfer ? "storage_wallet_transfer" : "storage_wallet_changed", amount: savedAmount, title: shouldTransfer ? "Emergency Fund moved" : "Storage wallet changed", reason: "Emergency Fund Storage Wallet", note: shouldTransfer ? `Moved from ${previousWalletName} to ${nextWalletName}` : `Stored in ${nextWalletName}`, sourceWalletId: previousWalletId || null, source_wallet_id: previousWalletId || null, storageWalletId: nextWalletId, storage_wallet_id: nextWalletId, storageWalletName: nextWalletName, storage_wallet_name: nextWalletName, createdAt: now, created_at: now }, ...activity].slice(0, 60) : activity;
    let movedWalletMoney = false;

    setMovingFund(true);
    setMoveError("");
    try {
      if (shouldTransfer) {
        if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await transferBetweenWallets({ from_wallet_id: previousWalletId, to_wallet_id: nextWalletId, amount: savedAmount, notes: `Emergency Fund moved from ${previousWalletName} to ${nextWalletName}.`, source_type: "emergency_fund_storage_move", user_id: user?.id || null, user_email: user?.email || null, created_by: user?.email || null });
        movedWalletMoney = true;
      }
      await persistEmergencyFund({ linkedWalletId: nextWalletId, linked_wallet_id: nextWalletId, reserveWalletId: nextWalletId, reserve_wallet_id: nextWalletId, storageWalletId: nextWalletId, storage_wallet_id: nextWalletId, linkedWalletName: nextWalletName, linked_wallet_name: nextWalletName, reserveWalletName: nextWalletName, reserve_wallet_name: nextWalletName, storageWalletName: nextWalletName, storage_wallet_name: nextWalletName, emergencyActivityLog: nextActivity, emergency_activity_log: nextActivity, activityLog: nextActivity, activity_log: nextActivity, lastStorageWalletChangedAt: now, last_storage_wallet_changed_at: now, lastReserveTransferAt: shouldTransfer ? now : emergencyFund?.lastReserveTransferAt ?? emergencyFund?.last_reserve_transfer_at ?? null, last_reserve_transfer_at: shouldTransfer ? now : emergencyFund?.last_reserve_transfer_at ?? emergencyFund?.lastReserveTransferAt ?? null });
      setPendingStorageWalletId("");
    } catch (error) {
      if (movedWalletMoney && previousWalletId && typeof transferBetweenWallets === "function") {
        try {
          await transferBetweenWallets({ from_wallet_id: nextWalletId, to_wallet_id: previousWalletId, amount: savedAmount, notes: "Emergency Fund storage move rollback after the reserve record could not be saved.", source_type: "emergency_fund_storage_move_rollback", user_id: user?.id || null, user_email: user?.email || null, created_by: user?.email || null });
        } catch (rollbackError) {
          console.error("Unable to roll back Emergency Fund storage move:", rollbackError);
        }
      }
      console.error("Unable to move Emergency Fund storage wallet:", error);
      setMoveError(error?.message || "CLARA could not move this Emergency Fund yet. No storage change was kept.");
    } finally {
      setMovingFund(false);
    }
  };
'''
replace_regex(
    card,
    r"  const confirmStorageWalletMove = async \(\) => \{.*?\n  \};\n\n  const resetEmergencyFund",
    move_function + "\n  const resetEmergencyFund",
    "replace move flow",
)

reset_function = r'''  const resetEmergencyFund = async () => {
    const now = new Date().toISOString();
    setSaving(true);
    setResetError("");
    try {
      await persistEmergencyFund({ savedAmount: 0, saved_amount: 0, currentAmount: 0, current_amount: 0, amount: 0, balance: 0, moneyLeft: 0, protectedBalance: 0, protected_balance: 0, reserveBalance: 0, reserve_balance: 0, survivalExpense: 0, survival_expense: 0, monthlyExpense: 0, monthly_expense: 0, monthly_survival_expense: 0, targetAmount: 0, target_amount: 0, target: 0, targetMonths: 3, target_months: 3, months_target: 3, linkedWalletId: null, linked_wallet_id: null, reserveWalletId: null, reserve_wallet_id: null, sourceWalletId: null, source_wallet_id: null, storageWalletId: null, storage_wallet_id: null, linkedWalletName: null, linked_wallet_name: null, reserveWalletName: null, reserve_wallet_name: null, sourceWalletName: null, source_wallet_name: null, storageWalletName: null, storage_wallet_name: null, emergencyActivityLog: [], emergency_activity_log: [], activityLog: [], activity_log: [], usageLog: [], usage_log: [], resetAt: now, reset_at: now });
      onSurvivalSaved?.(0);
      return true;
    } catch (error) {
      console.error("Unable to reset Emergency Fund:", error);
      setResetError("CLARA could not reset this Emergency Fund yet. Your current setup was kept.");
      return false;
    } finally {
      setSaving(false);
    }
  };
'''
replace_regex(
    card,
    r"  const resetEmergencyFund = async \(\) => \{.*?\n  \};\n\n  const openAddEmergencyModal",
    reset_function + "\n  const openAddEmergencyModal",
    "replace reset flow",
)

replace_once(
    card,
    "      <EmergencyAddModal open={!isEmergencyFundUnconfigured && showAddModal} onClose={() => { setShowAddModal(false); setAddError(\"\"); }}",
    "      <EmergencyAddModal open={!isEmergencyFundUnconfigured && showAddModal} onClose={() => { if (!saving) { setShowAddModal(false); setAddError(\"\"); } }}",
    "guard add modal close",
)
replace_once(
    card,
    "      <EmergencyResetConfirmModal open={!isEmergencyFundUnconfigured && showResetConfirm} onClose={() => { if (!saving) setShowResetConfirm(false); }} onConfirm={async () => { await resetEmergencyFund(); setShowResetConfirm(false); }} saving={saving} />",
    "      <EmergencyResetConfirmModal open={!isEmergencyFundUnconfigured && showResetConfirm} onClose={() => { if (!saving) { setShowResetConfirm(false); setResetError(\"\"); } }} onConfirm={async () => { const resetCompleted = await resetEmergencyFund(); if (resetCompleted) setShowResetConfirm(false); }} saving={saving} error={resetError} />",
    "keep reset open on failure",
)
replace_once(
    card,
    "                  <ActivityList activity={activity} fmt={fmt} toNumber={toNumber} />\n\n                  <div className=\"grid grid-cols-2 gap-2 pt-1.5\">",
    "                  <ActivityList activity={activity} fmt={fmt} toNumber={toNumber} />\n\n                  {!activeStorageWallet ? <div className=\"rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-4 py-3 text-xs font-semibold leading-5 text-amber-50/82\">The linked storage wallet is unavailable. Choose a new storage wallet above before adding or using this reserve.</div> : null}\n\n                  <div className=\"grid grid-cols-2 gap-2 pt-1.5\">",
    "show missing storage warning",
)
replace_once(
    card,
    "<button type=\"button\" onClick={openAddEmergencyModal} className=\"flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-2 py-3.5 text-[12px] font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)] transition hover:bg-emerald-400/[0.13]\"><Plus className=\"h-4 w-4\" />Add</button>",
    "<button type=\"button\" onClick={openAddEmergencyModal} disabled={!activeStorageWallet || saving || movingFund} className=\"flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-2 py-3.5 text-[12px] font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)] transition hover:bg-emerald-400/[0.13] disabled:cursor-not-allowed disabled:opacity-45\"><Plus className=\"h-4 w-4\" />Add</button>",
    "disable add without storage",
)
replace_once(
    card,
    "disabled={savedAmount <= 0} className=\"flex items-center",
    "disabled={savedAmount <= 0 || !activeStorageWallet || saving || movingFund} className=\"flex items-center",
    "disable use without storage",
)

modals = "src/components/fresh/main-dashboard/carousel/EmergencyFundCardModals.jsx"
replace_once(
    modals,
    "export function EmergencyResetConfirmModal({ open, onClose, onConfirm, saving }) {",
    "export function EmergencyResetConfirmModal({ open, onClose, onConfirm, saving, error }) {",
    "reset modal error prop",
)
replace_once(
    modals,
    "This will reset your Emergency Fund setup, including your monthly survival cost, protection target, storage wallet, saved emergency amount, and activity log.",
    "This will reset the Emergency Fund setup and activity log. The actual money will remain in its wallet and become spendable again.",
    "clarify reset money behavior",
)
replace_once(
    modals,
    "      <p className=\"text-xs font-black uppercase tracking-[0.14em] text-rose-100/72\">This cannot be undone.</p>\n      <div className=\"grid grid-cols-2 gap-2\">",
    "      <p className=\"text-xs font-black uppercase tracking-[0.14em] text-rose-100/72\">This cannot be undone.</p>\n      {error ? <div className=\"rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200\">{error}</div> : null}\n      <div className=\"grid grid-cols-2 gap-2\">",
    "show reset error",
)

package = "package.json"
replace_once(
    package,
    "tests/budget-card-truth-regression.test.mjs\"",
    "tests/budget-card-truth-regression.test.mjs tests/emergency-fund-card-flow-regression.test.mjs\"",
    "register Emergency Fund regression",
)

test_path = Path("tests/emergency-fund-card-flow-regression.test.mjs")
test_path.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const view = readSource("src/components/financial-carousel/cards/emergency-fund/ui/EmergencyFundCardView.jsx");
const card = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx");
const modals = readSource("src/components/fresh/main-dashboard/carousel/EmergencyFundCardModals.jsx");

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
''', encoding="utf-8")
