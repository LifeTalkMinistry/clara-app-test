from pathlib import Path

OVERLAY = Path('src/components/fresh/main-dashboard/assistant/ClaraSavingsGoalOverlay.jsx')
PAGE = Path('src/pages/SavingsGoalsIntegrated.jsx')
CARD = Path('src/components/SavingsCardRefined.jsx')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} anchor missing')
    return text.replace(old, new, 1)

# --- CLARA conversational Savings Goal flow ---
s = OVERLAY.read_text()
marker = 'data-clara-savings-goal-complete="true"'
if marker not in s:
    old_filter = '''  const activeGoals = useMemo(\n    () => sourceGoals\n      .filter((goal) => goal && !goal?.deletedAt && !goal?.deleted_at && !goal?.is_archived)\n      .map((goal) => ({ ...goal, id: getGoalId(goal) }))\n      .filter((goal) => goal.id),\n    [sourceGoals]\n  );'''
    new_filter = '''  const activeGoals = useMemo(\n    () => sourceGoals\n      .filter((goal) => {\n        if (!goal || goal?.deletedAt || goal?.deleted_at || goal?.is_archived) return false;\n        const activity = getGoalActivity(goal);\n        const consumed = getGoalSavedAmount(goal) <= 0 && activity.some((entry) => [\"use\", \"complete\"].includes(String(entry?.type || \"\").toLowerCase()));\n        return !consumed;\n      })\n      .map((goal) => ({ ...goal, id: getGoalId(goal) }))\n      .filter((goal) => goal.id),\n    [sourceGoals]\n  );'''
    s = replace_once(s, old_filter, new_filter, 'overlay active goal filter')

    anchor = '  const startMoveFundOut = () => {\n'
    handler = r'''  const completeManagedGoal = async () => {
    if (saving || !selectedManagedGoal) return;
    const amount = Math.max(getGoalSavedAmount(selectedManagedGoal), 0);
    if (amount <= 0) return setError("There is no saved money left to complete this goal.");
    const storageWalletId = getWalletId({ id: selectedManagedGoal?.wallet_id || selectedManagedGoal?.walletId || "" });
    const storageWallet = realWallets.find((wallet) => wallet.id === storageWalletId) || null;
    if (!storageWallet) return setError("The wallet holding this savings is unavailable.");
    if (getWalletBalance(storageWallet) + 0.0001 < amount) return setError(`${storageWallet.name} no longer contains enough money for this goal.`);
    if (typeof finance?.addExpense !== "function" || typeof finance?.deleteExpense !== "function" || typeof finance?.updateSavingsGoal !== "function") {
      return setError("Savings completion is not available yet.");
    }

    const now = new Date().toISOString();
    const expenseId = `savings_complete_expense_${Date.now()}`;
    let expenseCreated = false;
    try {
      setSaving(true);
      setError("");
      await finance.addExpense({
        id: expenseId,
        wallet_id: storageWallet.id,
        amount,
        category: "Savings Goal Completed",
        need_type: "other",
        planning_status: "planned",
        notes: `Completed savings goal: ${getGoalTitle(selectedManagedGoal)}. Used as intended.`,
        date: now,
        created_at: now,
        updated_at: now,
        source_type: "savings_goal_completion",
        usage_goal_id: selectedManagedGoal.id,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      expenseCreated = true;
      const activity = [{
        id: `savings_complete_${Date.now()}`,
        type: "complete",
        title: "Goal completed",
        amount,
        reason: "Used as intended",
        note: `Paid from ${storageWallet.name}`,
        storageWalletId: storageWallet.id,
        storage_wallet_id: storageWallet.id,
        linkedExpenseId: expenseId,
        linked_expense_id: expenseId,
        createdAt: now,
        created_at: now,
      }, ...getGoalActivity(selectedManagedGoal)].slice(0, 80);
      await finance.updateSavingsGoal(selectedManagedGoal.id, {
        ...selectedManagedGoal,
        saved_amount: 0,
        savedAmount: 0,
        current_amount: 0,
        currentAmount: 0,
        status: "completed",
        completion_status: "completed",
        completionStatus: "completed",
        completed_at: now,
        completedAt: now,
        deleted_at: now,
        deletedAt: now,
        savingsActivityLog: activity,
        savings_activity_log: activity,
        activityLog: activity,
        activity_log: activity,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      await finance.refreshData?.();
      appendExchange("Complete", `${getGoalTitle(selectedManagedGoal)} is complete. The saved money was used as intended and the goal is now closed.`);
      setSelectedGoalId("");
      setPhase("home");
    } catch (nextError) {
      if (expenseCreated) {
        try { await finance.deleteExpense(expenseId); }
        catch (rollbackError) { console.error("Savings completion rollback failed:", rollbackError); }
      }
      setError(nextError?.message || "CLARA could not complete this Savings Goal yet.");
    } finally {
      setSaving(false);
    }
  };

'''
    s = replace_once(s, anchor, handler + anchor, 'overlay completion handler')

    move_button = '<ReplyButton onClick={startMoveFundOut} disabled={saving || getGoalSavedAmount(selectedManagedGoal) <= 0}>Move Fund Out</ReplyButton>'
    move_index = s.find(move_button)
    if move_index < 0:
        raise SystemExit('overlay Complete button anchor missing')
    line_start = s.rfind('\n', 0, move_index) + 1
    indent = s[line_start:move_index]
    complete_button = '<ReplyButton onClick={completeManagedGoal} disabled={saving || getGoalSavedAmount(selectedManagedGoal) <= 0} data-clara-savings-goal-complete="true">Complete</ReplyButton>'
    s = s[:move_index] + complete_button + '\n' + indent + s[move_index:]
    OVERLAY.write_text(s)

# --- Full Savings Goals financial page ---
p = PAGE.read_text()
page_marker = 'data-savings-goal-complete="true"'
if page_marker not in p:
    old_goals = '''        .filter((goal) => !goal?.deletedAt && !goal?.deleted_at)\n        .map(normalizeGoal)'''
    new_goals = '''        .filter((goal) => {\n          if (goal?.deletedAt || goal?.deleted_at) return false;\n          const activity = getGoalActivity(goal);\n          const consumed = getGoalSavedAmount(goal) <= 0 && activity.some((entry) => [\"use\", \"complete\"].includes(String(entry?.type || \"\").toLowerCase()));\n          return !consumed;\n        })\n        .map(normalizeGoal)'''
    p = replace_once(p, old_goals, new_goals, 'page active goal filter')

    start = p.find('  const handleUseSavings = async (goal, amount, reason) => {')
    end_token = '\n\n  if (accessLoading)'
    end = p.find(end_token, start)
    if start < 0 or end < 0:
        raise SystemExit('page handleUseSavings block missing')
    replacement = r'''  const handleUseSavings = async (goal) => {
    const safeAmount = Math.max(getGoalSavedAmount(goal), 0);
    if (safeAmount <= 0) throw new Error("There is no saved money left to complete this goal.");

    const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
    const assignedWallet = activeWallets.find((wallet) => walletId(wallet) === assignedWalletId) || null;
    if (!assignedWallet) throw new Error("The saved-in wallet is unavailable. Choose a valid wallet before completing this goal.");
    if (!hasEnoughMoney(walletBalances[assignedWalletId] || 0, safeAmount)) {
      throw new Error("The saved-in wallet does not contain enough money to complete this goal.");
    }
    if (typeof addExpense !== "function" || typeof deleteExpense !== "function") {
      throw new Error("Savings completion logging is not available yet.");
    }

    const now = new Date().toISOString();
    const activityId = `savings_complete_${Date.now()}`;
    const expenseId = `savings_complete_expense_${Date.now()}`;
    let expenseCreated = false;

    try {
      await addExpense({
        id: expenseId,
        wallet_id: assignedWalletId,
        amount: safeAmount,
        category: "Savings Goal Completed",
        need_type: "other",
        planning_status: "planned",
        notes: `Completed savings goal: ${goal.title}. Used as intended.`,
        date: now,
        created_at: now,
        updated_at: now,
        source_type: "savings_goal_completion",
        usage_goal_id: goal.id,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      expenseCreated = true;

      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: 0,
        current_amount: 0,
        savedAmount: 0,
        currentAmount: 0,
        status: "completed",
        completion_status: "completed",
        completionStatus: "completed",
        completed_at: now,
        completedAt: now,
        deleted_at: now,
        deletedAt: now,
        savingsActivityLog: buildActivity(goal, {
          id: activityId,
          type: "complete",
          title: "Goal completed",
          amount: safeAmount,
          reason: "Used as intended",
          note: `Paid from ${walletName(assignedWallet)}`,
          storageWalletId: assignedWalletId,
          storage_wallet_id: assignedWalletId,
          linkedExpenseId: expenseId,
          linked_expense_id: expenseId,
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
      setDetailGoal(null);
      return updatedGoal;
    } catch (error) {
      if (expenseCreated) {
        try { await deleteExpense(expenseId); }
        catch (rollbackError) { console.error("Failed to roll back savings completion expense:", rollbackError); }
      }
      throw error;
    }
  };'''
    p = p[:start] + replacement + p[end:]

    old_submit_start = p.find('  const handleSubmitUseSavings = async () => {')
    old_submit_end = p.find('\n  };', old_submit_start)
    if old_submit_start < 0 or old_submit_end < 0:
        raise SystemExit('GoalDetail completion submit block missing')
    old_submit_end += len('\n  };')
    new_submit = r'''  const handleSubmitUseSavings = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setUseError("");
      await onUseSavings(goal);
      setUseSavingsOpen(false);
      onClose?.();
    } catch (error) {
      console.error("Failed to complete Savings Goal:", error);
      setUseError(error?.message || "CLARA could not complete this Savings Goal yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };'''
    p = p[:old_submit_start] + new_submit + p[old_submit_end:]

    old_button = '''<Button type="button" onClick={() => { setUseAmount(""); setUseReason(""); setUseError(""); setUseSavingsOpen(true); }} disabled={saved <= 0 || !assignedWallet} className="h-10 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"><MinusCircle className="w-4 h-4 mr-2" />Use Savings</Button>'''
    new_button = '''<Button type="button" onClick={handleSubmitUseSavings} disabled={savingAmount || saved <= 0 || !assignedWallet} data-savings-goal-complete="true" className="h-10 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50">Complete</Button>'''
    p = replace_once(p, old_button, new_button, 'financial page Complete button')
    PAGE.write_text(p)

# --- Dashboard Savings card, including goals completed before this fix ---
c = CARD.read_text()
card_marker = 'data-consumed-savings-filter="complete"'
if card_marker not in c:
    old_card_filter = '''  const goals = Array.isArray(savingsGoals)\n    ? savingsGoals.filter((goal) => goal && !goal.deleted_at && !goal.deletedAt)\n    : [];'''
    new_card_filter = '''  const goals = Array.isArray(savingsGoals)\n    ? savingsGoals.filter((goal) => {\n        if (!goal || goal.deleted_at || goal.deletedAt) return false;\n        const activity = goal?.savingsActivityLog || goal?.savings_activity_log || goal?.activityLog || goal?.activity_log || [];\n        const consumed = getSaved(goal) <= 0 && Array.isArray(activity) && activity.some((entry) => [\"use\", \"complete\"].includes(String(entry?.type || \"\").toLowerCase()));\n        return !consumed;\n      })\n    : [];\n  const consumedSavingsFilter = \"complete\"; // data-consumed-savings-filter="complete"'''
    c = replace_once(c, old_card_filter, new_card_filter, 'dashboard consumed goal filter')
    CARD.write_text(c)

print('Canonical Savings Goal Complete action patched')