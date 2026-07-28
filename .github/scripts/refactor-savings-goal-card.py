from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, content):
    Path(path).write_text(content, encoding="utf-8")


def replace_once(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one exact match, found {count}")
    return content.replace(old, new, 1)


def regex_once(content, pattern, replacement, label, flags=0):
    next_content, count = re.subn(pattern, replacement, content, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return next_content


page_path = "src/pages/SavingsGoalsIntegrated.jsx"
page = read(page_path)

page = replace_once(
    page,
    '''    savingsGoals = [],
    wallets = [],
    walletTransactions = [],
    transfers = [],
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    transferBetweenWallets,
    refreshData,
''',
    '''    savingsGoals = [],
    wallets = [],
    walletTransactions = [],
    transfers = [],
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addExpense,
    deleteExpense,
    transferBetweenWallets,
''',
    "finance action ownership",
)

page = replace_once(
    page,
    '''  const [walletSyncPrompt, setWalletSyncPrompt] = useState(null);
  const [walletSyncSaving, setWalletSyncSaving] = useState(false);
''',
    '''  const [walletSyncPrompt, setWalletSyncPrompt] = useState(null);
  const [walletSyncSaving, setWalletSyncSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletePrompt, setDeletePrompt] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
''',
    "page action states",
)

page = replace_once(
    page,
    '''const getGoalTargetAmount = (goal) => firstNumber(goal?.target_amount, goal?.targetAmount, goal?.target, goal?.amount_target, goal?.amountTarget);
''',
    '''const getGoalTargetAmount = (goal) => firstNumber(goal?.target_amount, goal?.targetAmount, goal?.target, goal?.amount_target, goal?.amountTarget);
const getWalletEmergencyProtectedAmount = (wallet = {}) => firstNumber(
  wallet?.emergencyProtectedAmount,
  wallet?.emergency_protected_amount,
  wallet?.protectedEmergencyAmount,
  wallet?.protected_emergency_amount,
);
const toMinorUnits = (value) => Math.round(toNumber(value) * 100);
const hasEnoughMoney = (available, requested) => toMinorUnits(available) >= toMinorUnits(requested);
''',
    "wallet protection helpers",
)

page = replace_once(
    page,
    '''  const walletBalances = useMemo(() => {
    const map = {};
    activeWallets.forEach((wallet) => {
      map[walletId(wallet)] = getWalletBalance(wallet, Array.isArray(walletTransactions) ? walletTransactions : [], Array.isArray(transfers) ? transfers : []);
    });
    return map;
  }, [activeWallets, transfers, walletTransactions]);
''',
    '''  const walletBalances = useMemo(() => {
    const map = {};
    activeWallets.forEach((wallet) => {
      map[walletId(wallet)] = getWalletBalance(wallet, Array.isArray(walletTransactions) ? walletTransactions : [], Array.isArray(transfers) ? transfers : []);
    });
    return map;
  }, [activeWallets, transfers, walletTransactions]);

  const protectedSavingsByWallet = useMemo(() => {
    const map = {};
    goals.forEach((goal) => {
      const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
      if (!assignedWalletId) return;
      map[assignedWalletId] = (map[assignedWalletId] || 0) + Math.max(getGoalSavedAmount(goal), 0);
    });
    return map;
  }, [goals]);

  const walletAvailableBalances = useMemo(() => {
    const map = {};
    activeWallets.forEach((wallet) => {
      const id = walletId(wallet);
      const rawBalance = Math.max(toNumber(walletBalances[id] ?? wallet?.balance), 0);
      const emergencyProtected = Math.min(getWalletEmergencyProtectedAmount(wallet), rawBalance);
      const savingsProtected = Math.min(
        Math.max(protectedSavingsByWallet[id] || 0, 0),
        Math.max(rawBalance - emergencyProtected, 0),
      );
      map[id] = Math.max(rawBalance - emergencyProtected - savingsProtected, 0);
    });
    return map;
  }, [activeWallets, protectedSavingsByWallet, walletBalances]);
''',
    "available wallet balance calculation",
)

page = replace_once(
    page,
    '''    const otherGoalProtectedInSameWallet = goals
      .filter((item) => String(item.id) !== String(goal.id))
      .filter((item) => walletId(item.wallet_id) === goalWalletId)
      .reduce((sum, item) => sum + toNumber(item.saved_amount), 0);
    const availableWalletBalanceForThisGoal = Math.max(walletBalance - otherGoalProtectedInSameWallet, 0);
    const suggestedAmount = Math.min(remainingGoalAmount, availableWalletBalanceForThisGoal);
''',
    '''    const availableWalletBalanceForThisGoal = Math.max(
      toNumber(walletAvailableBalances[goalWalletId]),
      0,
    );
    const suggestedAmount = Math.min(remainingGoalAmount, availableWalletBalanceForThisGoal);
''',
    "wallet sync protection math",
)

page = replace_once(
    page,
    '''  const openAdd = () => {
    setDetailGoal(null);
    setForm(EMPTY_FORM);
    setEditId(null);
    setOpen(true);
  };
  const closeFormModal = () => {
    setOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };
''',
    '''  const openAdd = (starterTitle = "") => {
    setDetailGoal(null);
    setForm({ ...EMPTY_FORM, title: String(starterTitle || "") });
    setEditId(null);
    setFormError("");
    setOpen(true);
  };
  const closeFormModal = () => {
    setOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };
''',
    "starter goal form",
)

page = replace_once(
    page,
    '''  const openEdit = (goal) => {
    setForm({
''',
    '''  const openEdit = (goal) => {
    setFormError("");
    setForm({
''',
    "edit form error reset",
)

page = replace_once(
    page,
    '''      openAdd();
''',
    '''      openAdd(routeState?.starterTitle || "");
''',
    "starter route title",
)

new_handle_save = r'''  const handleSave = async () => {
    if (saving) return;
    setFormError("");

    if (!user?.id && !user?.email) return setFormError("No user was found. Please log in again.");
    if (!form.title?.trim()) return setFormError("Enter a goal title.");

    const nextTargetAmount = toNumber(form.target_amount);
    const nextSavedAmount = Math.max(0, toNumber(form.saved_amount));
    if (nextTargetAmount <= 0) return setFormError("Enter a valid target amount.");
    if (nextSavedAmount > nextTargetAmount) return setFormError("Already Saved cannot be higher than the goal target.");
    if (form.wallet_id === "__no_wallets__") return setFormError("Choose a valid wallet.");

    const existing = editId ? goals.find((goal) => String(goal.id) === String(editId)) : null;
    const currentSavedAmount = existing ? getGoalSavedAmount(existing) : 0;
    const previousWalletId = walletId(existing?.wallet_id || existing?.walletId || "");
    const nextWalletId = walletId(form.wallet_id && form.wallet_id !== "__no_wallets__" ? form.wallet_id : "");
    const previousWallet = activeWallets.find((wallet) => walletId(wallet) === previousWalletId) || null;
    const nextWallet = activeWallets.find((wallet) => walletId(wallet) === nextWalletId) || null;
    const walletChanged = Boolean(existing && previousWalletId !== nextWalletId);

    if (nextSavedAmount > 0 && !nextWallet) {
      return setFormError("Choose an available wallet before marking money as saved.");
    }

    const nextWalletAvailable = nextWallet ? toNumber(walletAvailableBalances[nextWalletId]) : 0;
    let transferAmount = 0;

    if (!existing && nextSavedAmount > 0 && !hasEnoughMoney(nextWalletAvailable, nextSavedAmount)) {
      return setFormError("This wallet does not have enough unprotected money for the Already Saved amount.");
    }

    if (existing && !walletChanged) {
      const increase = Math.max(nextSavedAmount - currentSavedAmount, 0);
      if (increase > 0 && !hasEnoughMoney(nextWalletAvailable, increase)) {
        return setFormError("This wallet does not have enough unprotected money for that savings increase.");
      }
    }

    if (walletChanged) {
      transferAmount = Math.min(currentSavedAmount, nextSavedAmount);
      const extraProtectionNeeded = Math.max(nextSavedAmount - currentSavedAmount, 0);

      if (transferAmount > 0 && !previousWallet) {
        return setFormError("The current saved-in wallet is unavailable. Reduce Already Saved to $0 before changing wallets.");
      }
      if (transferAmount > 0 && !hasEnoughMoney(walletBalances[previousWalletId] || 0, transferAmount)) {
        return setFormError("The current saved-in wallet no longer contains enough money to move this goal.");
      }
      if (extraProtectionNeeded > 0 && !hasEnoughMoney(nextWalletAvailable, extraProtectionNeeded)) {
        return setFormError("The new wallet does not have enough unprotected money for the increased saved amount.");
      }
    }

    let movedSavedMoney = false;
    const moveId = `savings_goal_wallet_move_${Date.now()}`;

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const payload = normalizeGoal({
        ...(existing || {}),
        id: editId || generateId(),
        title: form.title.trim(),
        category: form.category || "",
        subcategory: form.subcategory || "",
        target_amount: nextTargetAmount,
        saved_amount: nextSavedAmount,
        current_amount: nextSavedAmount,
        savedAmount: nextSavedAmount,
        currentAmount: nextSavedAmount,
        planned_use_date: form.planned_use_date || "",
        reasons: form.reasons,
        emotional_value: form.emotional_value || "joy",
        flexibility: form.flexibility || "flexible",
        priority: form.priority || "medium",
        notes: form.notes || "",
        wallet_id: nextWalletId,
        created_by: user?.email || null,
        user_email: user?.email || null,
        user_id: user?.id || null,
        created_date: existing?.created_date || now,
        updated_date: now,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });

      if (transferAmount > 0) {
        if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await transferBetweenWallets({
          id: moveId,
          transfer_group_id: moveId,
          from_wallet_id: previousWalletId,
          to_wallet_id: nextWalletId,
          amount: transferAmount,
          notes: `Savings goal moved from ${walletName(previousWallet)} to ${walletName(nextWallet)}: ${payload.title}.`,
          source_type: "savings_goal_storage_move",
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        movedSavedMoney = true;
      }

      if (editId) await updateSavingsGoal(payload.id, payload);
      else await addSavingsGoal(payload);

      const assignedWalletChanged = Boolean(existing && previousWalletId !== nextWalletId);
      const alreadyHandledThisWallet = walletSyncHandledForAssignedWallet(payload);
      const shouldAskWalletSync = Boolean(
        nextWalletId &&
          (!existing || assignedWalletChanged || !alreadyHandledThisWallet),
      );
      const suggestion = shouldAskWalletSync ? getWalletBalanceSyncSuggestion(payload) : null;

      setDetailGoal(payload);
      closeFormModal();
      if (suggestion) {
        setWalletSyncPrompt({
          goal: payload,
          wallet: suggestion.wallet,
          amount: suggestion.suggestedAmount,
          walletBalance: suggestion.walletBalance,
          remainingGoalAmount: suggestion.remainingGoalAmount,
        });
      }
    } catch (error) {
      if (movedSavedMoney && typeof transferBetweenWallets === "function") {
        try {
          await transferBetweenWallets({
            from_wallet_id: nextWalletId,
            to_wallet_id: previousWalletId,
            amount: transferAmount,
            notes: "Savings goal wallet move rollback after the goal could not be saved.",
            source_type: "savings_goal_storage_move_rollback",
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_by: user?.email || null,
          });
        } catch (rollbackError) {
          console.error("Failed to roll back savings goal wallet move:", rollbackError);
        }
      }
      console.error("Failed to save savings goal:", error);
      setFormError(error?.message || "CLARA could not save this goal yet. Try again.");
    } finally {
      setSaving(false);
    }
  };

'''
page = regex_once(
    page,
    r"  const handleSave = async \(\) => \{.*?\n  \};\n\n  const handleDelete = async \(id\) => \{.*?\n  \};\n\n",
    new_handle_save + r'''  const requestDelete = (goal) => {
    setDeletePrompt(normalizeGoal(goal));
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deletePrompt?.id || deleteSaving) return;
    try {
      setDeleteSaving(true);
      setDeleteError("");
      await deleteSavingsGoal(deletePrompt.id);
      setDetailGoal((previous) => (String(previous?.id) === String(deletePrompt.id) ? null : previous));
      setDeletePrompt(null);
    } catch (error) {
      console.error("Failed to delete savings goal:", error);
      setDeleteError(error?.message || "CLARA could not delete this goal yet. Try again.");
    } finally {
      setDeleteSaving(false);
    }
  };

''',
    "save and delete handlers",
    flags=re.S,
)

page = page.replace("      await refreshData?.();\n", "")

new_add_handler = r'''  const handleAddSavings = async (goal, inputAmount, sourceWalletId, forcedAmount = null) => {
    const requestedAmount = toNumber(inputAmount);
    const safeAmount = forcedAmount != null ? toNumber(forcedAmount) : requestedAmount;
    if (!safeAmount || safeAmount <= 0) throw new Error("Enter a valid amount.");

    const sourceWallet = activeWallets.find((wallet) => walletId(wallet) === String(sourceWalletId));
    if (!sourceWallet) throw new Error("Choose a valid source wallet.");

    const currentSaved = toNumber(goal.saved_amount);
    const targetAmount = toNumber(goal.target_amount);
    const remaining = Math.max(targetAmount - currentSaved, 0);
    if (remaining <= 0) throw new Error("This goal is already fully funded.");

    const finalAmount = Math.min(safeAmount, remaining);
    const sourceAvailable = toNumber(walletAvailableBalances[walletId(sourceWallet)]);
    if (!hasEnoughMoney(sourceAvailable, finalAmount)) {
      throw new Error("The selected wallet does not have enough unprotected money.");
    }

    const assignedWalletId = walletId(goal.wallet_id || goal.walletId || "");
    const savedInWallet = assignedWalletId
      ? activeWallets.find((wallet) => walletId(wallet) === assignedWalletId) || null
      : sourceWallet;
    if (!savedInWallet) throw new Error("The saved-in wallet is unavailable. Edit this goal and choose a valid wallet first.");

    const now = new Date().toISOString();
    const activityId = `savings_add_${Date.now()}`;
    const shouldMoveMoney = walletId(sourceWallet) !== walletId(savedInWallet);
    let movedWalletMoney = false;

    try {
      if (shouldMoveMoney) {
        if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await transferBetweenWallets({
          id: activityId,
          transfer_group_id: activityId,
          from_wallet_id: walletId(sourceWallet),
          to_wallet_id: walletId(savedInWallet),
          amount: finalAmount,
          notes: `Savings goal funding: ${goal.title}.`,
          source_type: "savings_goal_funding",
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        movedWalletMoney = true;
      }

      const nextSaved = Math.min(currentSaved + finalAmount, targetAmount);
      const updatedGoal = normalizeGoal({
        ...goal,
        wallet_id: walletId(savedInWallet),
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: buildActivity(goal, {
          id: activityId,
          type: "add",
          title: "Savings added",
          amount: finalAmount,
          sourceWalletId: walletId(sourceWallet),
          source_wallet_id: walletId(sourceWallet),
          sourceWalletName: walletName(sourceWallet),
          source_wallet_name: walletName(sourceWallet),
          storageWalletId: walletId(savedInWallet),
          storage_wallet_id: walletId(savedInWallet),
          storageWalletName: walletName(savedInWallet),
          storage_wallet_name: walletName(savedInWallet),
          note: shouldMoveMoney ? `Moved from ${walletName(sourceWallet)} to ${walletName(savedInWallet)}` : `Protected in ${walletName(savedInWallet)}`,
          createdAt: now,
          created_at: now,
        }),
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
      updatedGoal.activityLog = updatedGoal.savingsActivityLog;
      updatedGoal.activity_log = updatedGoal.savingsActivityLog;
      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      return updatedGoal;
    } catch (error) {
      if (movedWalletMoney && typeof transferBetweenWallets === "function") {
        try {
          await transferBetweenWallets({
            from_wallet_id: walletId(savedInWallet),
            to_wallet_id: walletId(sourceWallet),
            amount: finalAmount,
            notes: "Savings funding rollback after the goal could not be updated.",
            source_type: "savings_goal_funding_rollback",
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_by: user?.email || null,
          });
        } catch (rollbackError) {
          console.error("Failed to roll back savings funding:", rollbackError);
        }
      }
      throw error;
    }
  };

'''
page = regex_once(
    page,
    r"  const handleAddSavings = async \(goal, inputAmount, sourceWalletId, forcedAmount = null\) => \{.*?\n  \};\n\n  const handleUseSavings = async",
    new_add_handler + "  const handleUseSavings = async",
    "add savings handler",
    flags=re.S,
)

new_use_handler = r'''  const handleUseSavings = async (goal, amount, reason) => {
    const safeAmount = toNumber(amount);
    const cleanReason = String(reason || "").trim();
    if (!safeAmount || safeAmount <= 0) throw new Error("Enter a valid amount.");
    if (safeAmount > toNumber(goal.saved_amount)) throw new Error("Amount cannot exceed the current saved amount.");
    if (!cleanReason) throw new Error("Enter a reason or purpose.");

    const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
    const assignedWallet = activeWallets.find((wallet) => walletId(wallet) === assignedWalletId) || null;
    if (!assignedWallet) throw new Error("The saved-in wallet is unavailable. Choose a valid wallet before using this goal.");
    if (!hasEnoughMoney(walletBalances[assignedWalletId] || 0, safeAmount)) {
      throw new Error("The saved-in wallet does not contain enough money for this use.");
    }
    if (typeof addExpense !== "function" || typeof deleteExpense !== "function") {
      throw new Error("Savings usage logging is not available yet.");
    }

    const now = new Date().toISOString();
    const activityId = `savings_use_${Date.now()}`;
    const expenseId = `savings_use_expense_${Date.now()}`;
    const nextSaved = Math.max(toNumber(goal.saved_amount) - safeAmount, 0);
    let expenseCreated = false;

    try {
      await addExpense({
        id: expenseId,
        wallet_id: assignedWalletId,
        amount: safeAmount,
        category: "Savings Goal Used",
        need_type: "other",
        planning_status: "planned",
        notes: `Used savings for ${goal.title}: ${cleanReason}`,
        date: now,
        created_at: now,
        updated_at: now,
        source_type: "savings_goal_usage",
        usage_goal_id: goal.id,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      expenseCreated = true;

      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: buildActivity(goal, {
          id: activityId,
          type: "use",
          title: "Savings used",
          amount: safeAmount,
          reason: cleanReason,
          note: `Paid from ${walletName(assignedWallet)}`,
          storageWalletId: assignedWalletId,
          storage_wallet_id: assignedWalletId,
          createdAt: now,
          created_at: now,
        }),
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
      updatedGoal.activityLog = updatedGoal.savingsActivityLog;
      updatedGoal.activity_log = updatedGoal.savingsActivityLog;
      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      return updatedGoal;
    } catch (error) {
      if (expenseCreated) {
        try {
          await deleteExpense(expenseId);
        } catch (rollbackError) {
          console.error("Failed to roll back savings usage expense:", rollbackError);
        }
      }
      throw error;
    }
  };

'''
page = regex_once(
    page,
    r"  const handleUseSavings = async \(goal, amount, reason\) => \{.*?\n  \};\n\n  if \(accessLoading\)",
    new_use_handler + "  if (accessLoading)",
    "use savings handler",
    flags=re.S,
)

page = replace_once(
    page,
    '''    <GoalFormDialog open={open} editId={editId} form={form} setForm={setForm} saving={saving} onClose={closeFormModal} onSave={handleSave} wallets={activeWallets} walletBalances={walletBalances} subcats={form.category ? CATEGORIES[form.category] || [] : []} fmt={fmt} />
    {detailGoal && <GoalDetail goal={detailGoal} wallets={activeWallets} walletBalances={walletBalances} walletSyncSuggestion={getWalletBalanceSyncSuggestion(detailGoal)} onOpenWalletSyncPrompt={openWalletSyncPromptForGoal} onClose={() => setDetailGoal(null)} onEdit={openEdit} onDelete={handleDelete} onAddSavings={handleAddSavings} onUseSavings={handleUseSavings} totalIncome={data?.totalIncome || 0} fmt={fmt} />}
    <WalletBalanceSyncPrompt prompt={walletSyncPrompt} fmt={fmt} saving={walletSyncSaving} onCancel={handleDismissWalletBalanceSync} onConfirm={handleConfirmWalletBalanceSync} />
''',
    '''    <GoalFormDialog open={open} editId={editId} form={form} setForm={setForm} saving={saving} error={formError} onClose={closeFormModal} onSave={handleSave} wallets={activeWallets} walletBalances={walletBalances} subcats={form.category ? CATEGORIES[form.category] || [] : []} fmt={fmt} />
    {detailGoal && <GoalDetail goal={detailGoal} wallets={activeWallets} walletBalances={walletBalances} walletAvailableBalances={walletAvailableBalances} walletSyncSuggestion={getWalletBalanceSyncSuggestion(detailGoal)} onOpenWalletSyncPrompt={openWalletSyncPromptForGoal} onClose={() => setDetailGoal(null)} onEdit={openEdit} onDelete={requestDelete} onAddSavings={handleAddSavings} onUseSavings={handleUseSavings} totalIncome={data?.totalIncome || 0} fmt={fmt} />}
    <SavingsDeleteConfirmDialog goal={deletePrompt} wallets={activeWallets} saving={deleteSaving} error={deleteError} fmt={fmt} onClose={() => { if (!deleteSaving) { setDeletePrompt(null); setDeleteError(""); } }} onConfirm={confirmDelete} />
    <WalletBalanceSyncPrompt prompt={walletSyncPrompt} fmt={fmt} saving={walletSyncSaving} onCancel={handleDismissWalletBalanceSync} onConfirm={handleConfirmWalletBalanceSync} />
''',
    "page dialog wiring",
)

page = replace_once(
    page,
    '''function GoalFormDialog({ open, editId, form, setForm, saving, onClose, onSave, wallets, walletBalances, subcats, fmt }) {
''',
    '''function GoalFormDialog({ open, editId, form, setForm, saving, error, onClose, onSave, wallets, walletBalances, subcats, fmt }) {
''',
    "goal form error prop",
)
page = replace_once(
    page,
    '''<Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent className={formDialogClass}>''',
    '''<Dialog open={open} onOpenChange={(value) => { if (!value && !saving) onClose(); }}><DialogContent className={formDialogClass}>''',
    "goal form saving close guard",
)
page = replace_once(
    page,
    '''<FormInput label="Notes"><Textarea className={`${inputDarkClass} min-h-[92px]`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormInput></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl">''',
    '''<FormInput label="Notes"><Textarea className={`${inputDarkClass} min-h-[92px]`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormInput>{error ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{error}</div> : null}</div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl">''',
    "goal form visible error",
)
page = replace_once(
    page,
    '''<Button type="button" onClick={onClose} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={onSave} disabled={saving}''',
    '''<Button type="button" onClick={onClose} disabled={saving} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={onSave} disabled={saving}''',
    "goal form cancel guard",
)

page = replace_once(
    page,
    '''function GoalDetail({ goal, wallets, walletBalances, walletSyncSuggestion, onOpenWalletSyncPrompt, onClose, onEdit, onDelete, onAddSavings, onUseSavings, totalIncome, fmt }) {
''',
    '''function GoalDetail({ goal, wallets, walletBalances, walletAvailableBalances, walletSyncSuggestion, onOpenWalletSyncPrompt, onClose, onEdit, onDelete, onAddSavings, onUseSavings, totalIncome, fmt }) {
''',
    "goal detail available balance prop",
)
page = replace_once(
    page,
    '''  const [savingAmount, setSavingAmount] = useState(false);
''',
    '''  const [savingAmount, setSavingAmount] = useState(false);
  const [addError, setAddError] = useState("");
  const [useError, setUseError] = useState("");
''',
    "goal detail action errors",
)
page = replace_once(
    page,
    '''  const sourceWalletBalance = sourceWallet ? walletBalances[walletId(sourceWallet)] ?? toNumber(sourceWallet.balance) : 0;
''',
    '''  const sourceWalletBalance = sourceWallet ? walletAvailableBalances[walletId(sourceWallet)] ?? 0 : 0;
''',
    "add savings spendable display",
)

page = replace_once(
    page,
    '''  const runAddSavings = async (forcedAmount = null) => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      await onAddSavings(goal, amount, sourceWalletId, forcedAmount);
      setAmount("");
      setOverAmountOpen(false);
      setAddSavingsOpen(false);
    } finally {
      setSavingAmount(false);
    }
  };
''',
    '''  const runAddSavings = async (forcedAmount = null) => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setAddError("");
      await onAddSavings(goal, amount, sourceWalletId, forcedAmount);
      setAmount("");
      setOverAmountOpen(false);
      setAddSavingsOpen(false);
    } catch (error) {
      console.error("Failed to add savings:", error);
      setAddError(error?.message || "CLARA could not add this savings amount yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };
''',
    "add savings visible errors",
)
page = replace_once(
    page,
    '''  const handleSubmitUseSavings = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      await onUseSavings(goal, useAmount, useReason);
      setUseAmount("");
      setUseReason("");
      setUseSavingsOpen(false);
    } finally {
      setSavingAmount(false);
    }
  };
''',
    '''  const handleSubmitUseSavings = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setUseError("");
      await onUseSavings(goal, useAmount, useReason);
      setUseAmount("");
      setUseReason("");
      setUseSavingsOpen(false);
    } catch (error) {
      console.error("Failed to use savings:", error);
      setUseError(error?.message || "CLARA could not use this savings amount yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };
''',
    "use savings visible errors",
)

page = replace_once(
    page,
    '''<Dialog open={Boolean(goal)} onOpenChange={(value) => !value && onClose()}>''',
    '''<Dialog open={Boolean(goal)} onOpenChange={(value) => !value && !savingAmount && onClose()}>''',
    "goal detail saving close guard",
)
page = replace_once(
    page,
    '''onClick={() => { setAmount(""); setSourceWalletId(goal?.wallet_id || walletId(wallets?.[0])); setAddSavingsOpen(true); }}''',
    '''onClick={() => { setAmount(""); setAddError(""); setSourceWalletId(goal?.wallet_id || walletId(wallets?.[0])); setAddSavingsOpen(true); }}''',
    "open add savings reset",
)
page = replace_once(
    page,
    '''onClick={() => { setUseAmount(""); setUseReason(""); setUseSavingsOpen(true); }} disabled={saved <= 0}''',
    '''onClick={() => { setUseAmount(""); setUseReason(""); setUseError(""); setUseSavingsOpen(true); }} disabled={saved <= 0 || !assignedWallet}''',
    "open use savings guard",
)
page = replace_once(
    page,
    '''<Button type="button" onClick={() => onDelete(goal.id)} variant="ghost"''',
    '''<Button type="button" onClick={() => onDelete(goal)} variant="ghost"''',
    "delete goal request",
)
page = replace_once(
    page,
    '''<Dialog open={addSavingsOpen} onOpenChange={(value) => { setAddSavingsOpen(value); if (!value) setOverAmountOpen(false); }}>''',
    '''<Dialog open={addSavingsOpen} onOpenChange={(value) => { if (savingAmount) return; setAddSavingsOpen(value); if (!value) { setOverAmountOpen(false); setAddError(""); } }}>''',
    "add dialog close guard",
)
page = replace_once(
    page,
    '''<FormInput label="Amount to Add"><Input type="number" placeholder="Enter amount" className={inputDarkClass} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></FormInput><p className="text-xs text-white/50">''',
    '''<FormInput label="Amount to Add"><Input type="number" placeholder="Enter amount" className={inputDarkClass} value={amount} onChange={(e) => { setAmount(e.target.value); setAddError(""); }} autoFocus /></FormInput>{addError ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{addError}</div> : null}<p className="text-xs text-white/50">''',
    "add dialog visible error",
)
page = replace_once(
    page,
    '''<Button type="button" onClick={() => setAddSavingsOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={handleSubmitAddSavings} disabled={savingAmount || !sourceWallet || remaining <= 0}''',
    '''<Button type="button" onClick={() => setAddSavingsOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={handleSubmitAddSavings} disabled={savingAmount || !sourceWallet || remaining <= 0 || requestedAddAmount <= 0}''',
    "add dialog action guards",
)
page = replace_once(
    page,
    '''<Dialog open={overAmountOpen} onOpenChange={setOverAmountOpen}>''',
    '''<Dialog open={overAmountOpen} onOpenChange={(value) => { if (!savingAmount) setOverAmountOpen(value); }}>''',
    "over amount close guard",
)
page = replace_once(
    page,
    '''<Dialog open={useSavingsOpen} onOpenChange={setUseSavingsOpen}>''',
    '''<Dialog open={useSavingsOpen} onOpenChange={(value) => { if (!savingAmount) { setUseSavingsOpen(value); if (!value) setUseError(""); } }}>''',
    "use dialog close guard",
)
page = replace_once(
    page,
    '''<div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] p-4 text-sm text-white/75">This will reduce your saved amount for this goal. Current saved: <span className="font-bold text-amber-100">{fmt(saved)}</span></div>''',
    '''<div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] p-4 text-sm text-white/75">This records a real expense from {assignedWallet ? walletName(assignedWallet) : "the saved-in wallet"} and reduces this goal. Current saved: <span className="font-bold text-amber-100">{fmt(saved)}</span></div>''',
    "use savings wallet copy",
)
page = replace_once(
    page,
    '''<FormInput label="Amount to use"><Input type="number" className={inputDarkClass} value={useAmount} onChange={(e) => setUseAmount(e.target.value)} autoFocus /></FormInput><FormInput label="Reason / purpose"><Input placeholder="What will you use it for?" className={inputDarkClass} value={useReason} onChange={(e) => setUseReason(e.target.value)} /></FormInput></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl">''',
    '''<FormInput label="Amount to use"><Input type="number" className={inputDarkClass} value={useAmount} onChange={(e) => { setUseAmount(e.target.value); setUseError(""); }} autoFocus /></FormInput><FormInput label="Reason / purpose"><Input placeholder="What will you use it for?" className={inputDarkClass} value={useReason} onChange={(e) => { setUseReason(e.target.value); setUseError(""); }} /></FormInput>{useError ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{useError}</div> : null}</div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl">''',
    "use dialog visible error",
)
page = replace_once(
    page,
    '''<Button type="button" onClick={() => setUseSavingsOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={handleSubmitUseSavings} disabled={savingAmount || saved <= 0}''',
    '''<Button type="button" onClick={() => setUseSavingsOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={handleSubmitUseSavings} disabled={savingAmount || saved <= 0 || !assignedWallet}''',
    "use dialog action guards",
)

insert_delete_dialog = r'''
function SavingsDeleteConfirmDialog({ goal, wallets, saving, error, fmt, onClose, onConfirm }) {
  if (!goal) return null;
  const saved = getGoalSavedAmount(goal);
  const assignedWallet = wallets.find((wallet) => walletId(wallet) === walletId(goal?.wallet_id || goal?.walletId || ""));

  return <Dialog open={Boolean(goal)} onOpenChange={(value) => { if (!value && !saving) onClose?.(); }}><DialogContent className={detailDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Delete Savings Goal?</DialogTitle></DialogHeader><div className="space-y-4 px-4 sm:px-5 py-4"><div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm font-semibold leading-6 text-rose-50/90">This removes <span className="font-black text-white">{goal.title || "this goal"}</span> and its private activity log.</div><p className="text-sm font-semibold leading-6 text-white/65">{saved > 0 ? `${fmt(saved)} will remain in ${assignedWallet ? walletName(assignedWallet) : "its wallet"} and become normally spendable again.` : "No wallet money will be removed."}</p>{error ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{error}</div> : null}</div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="grid grid-cols-2 gap-2"><Button type="button" onClick={onClose} disabled={saving} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={onConfirm} disabled={saving} className="h-10 rounded-xl border border-rose-300/20 bg-rose-500/15 text-rose-100 hover:bg-rose-500/20 disabled:opacity-50">{saving ? "Deleting..." : "Delete Goal"}</Button></div></div></div></DialogContent></Dialog>;
}

'''
page = replace_once(
    page,
    '''function InfoMini({ label, value }) {
''',
    insert_delete_dialog + '''function InfoMini({ label, value }) {
''',
    "delete confirmation dialog",
)

write(page_path, page)

repair_path = "src/lib/savingsGoalLinkedExpenseRepair.js"
repair = read(repair_path)
repair = replace_once(
    repair,
    '''const getExpenseIdentityText = (expense = {}) =>
  normalized(
    expense?.budget_category ||
      expense?.budgetCategory ||
      expense?.expense_category ||
      expense?.category ||
      expense?.title ||
      expense?.name,
  );
''',
    '''const getExpenseIdentityText = (expense = {}) =>
  normalized(
    expense?.budget_category ||
      expense?.budgetCategory ||
      expense?.expense_category ||
      expense?.category ||
      expense?.title ||
      expense?.name,
  );

const isSavingsUsageExpense = (expense = {}) => {
  const identity = normalized([
    expense?.source_type,
    expense?.sourceType,
    expense?.type,
    expense?.category,
    expense?.title,
    expense?.notes,
  ].filter(Boolean).join(" "));

  return identity.includes("savings goal usage") || identity.includes("savings goal used");
};
''',
    "savings usage classification",
)
repair = replace_once(
    repair,
    '''const expenseLinksToGoal = (expense = {}, goal = {}) => {
  const goalId = getGoalId(goal);
''',
    '''const expenseLinksToGoal = (expense = {}, goal = {}) => {
  if (isSavingsUsageExpense(expense)) return false;
  const goalId = getGoalId(goal);
''',
    "exclude usage expenses from contribution repair",
)
write(repair_path, repair)

card_path = "src/components/SavingsCardRefined.jsx"
card = read(card_path)
card = replace_once(
    card,
    '''  const saved = safeNumber(totalSavingsSaved) || computedSaved;
  const target = safeNumber(totalSavingsTarget) || computedTarget;
  const progress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const status = getGoalStatus(progress, goals.length);
  const mainGoal = primarySavingsGoal || goals[0] || null;
''',
    '''  const hasExplicitSaved = totalSavingsSaved !== undefined && totalSavingsSaved !== null && totalSavingsSaved !== "";
  const hasExplicitTarget = totalSavingsTarget !== undefined && totalSavingsTarget !== null && totalSavingsTarget !== "";
  const saved = hasExplicitSaved ? safeNumber(totalSavingsSaved) : computedSaved;
  const target = hasExplicitTarget ? safeNumber(totalSavingsTarget) : computedTarget;
  const progress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const status = getGoalStatus(progress, goals.length);
  const primaryGoalId = primarySavingsGoal?.id || primarySavingsGoal?.goal_id || "";
  const activePrimaryGoal = primaryGoalId
    ? goals.find((goal) => String(goal?.id || goal?.goal_id || "") === String(primaryGoalId)) || null
    : null;
  const mainGoal = activePrimaryGoal || goals[0] || null;
''',
    "card total and primary goal truth",
)
write(card_path, card)

package_path = "package.json"
package = read(package_path)
package = replace_once(
    package,
    '''tests/emergency-fund-card-flow-regression.test.mjs",''',
    '''tests/emergency-fund-card-flow-regression.test.mjs tests/savings-goal-card-flow-regression.test.mjs",''',
    "register savings regression",
)
write(package_path, package)


test_path = Path("tests/savings-goal-card-flow-regression.test.mjs")
test_path.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const page = read("src/pages/SavingsGoalsIntegrated.jsx");
const card = read("src/components/SavingsCardRefined.jsx");
const repair = read("src/lib/savingsGoalLinkedExpenseRepair.js");
const packageJson = read("package.json");

test("Savings Goal uses one protected-wallet truth", () => {
  assert.match(page, /protectedSavingsByWallet/);
  assert.match(page, /walletAvailableBalances/);
  assert.match(page, /getWalletEmergencyProtectedAmount/);
  assert.match(page, /The selected wallet does not have enough unprotected money/);
});

test("goal create and edit cannot relabel money without validation", () => {
  assert.match(page, /Already Saved cannot be higher than the goal target/);
  assert.match(page, /savings_goal_wallet_move_/);
  assert.match(page, /savings_goal_storage_move_rollback/);
  assert.match(page, /Reduce Already Saved to \$0 before changing wallets/);
});

test("Add Savings moves wallet money and rolls it back if the goal save fails", () => {
  assert.match(page, /source_type: "savings_goal_funding"/);
  assert.match(page, /notes: `Savings goal funding:/);
  assert.match(page, /source_type: "savings_goal_funding_rollback"/);
  assert.doesNotMatch(page, /note: `Savings goal funding:/);
});

test("Use Savings records a real wallet expense and compensates failures", () => {
  assert.match(page, /await addExpense\(\{/);
  assert.match(page, /source_type: "savings_goal_usage"/);
  assert.match(page, /await deleteExpense\(expenseId\)/);
  assert.match(page, /This records a real expense from/);
});

test("savings usage cannot be mistaken for a historical contribution", () => {
  assert.match(repair, /isSavingsUsageExpense/);
  assert.match(repair, /if \(isSavingsUsageExpense\(expense\)\) return false/);
});

test("Savings Goal dialogs expose errors and guard close while saving", () => {
  assert.match(page, /const \[formError, setFormError\]/);
  assert.match(page, /const \[addError, setAddError\]/);
  assert.match(page, /const \[useError, setUseError\]/);
  assert.match(page, /SavingsDeleteConfirmDialog/);
  assert.match(page, /if \(!value && !saving\) onClose/);
});

test("starter ideas prefill the goal and card totals preserve explicit zero", () => {
  assert.match(page, /openAdd\(routeState\?\.starterTitle \|\| ""\)/);
  assert.match(card, /const hasExplicitSaved/);
  assert.match(card, /const activePrimaryGoal/);
});

test("Savings Goal flow regression runs in npm test", () => {
  assert.match(packageJson, /tests\/savings-goal-card-flow-regression\.test\.mjs/);
});
''', encoding="utf-8")
