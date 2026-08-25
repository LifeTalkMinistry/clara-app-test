from pathlib import Path

p = Path('src/components/fresh/main-dashboard/assistant/ClaraSavingsGoalOverlay.jsx')
s = p.read_text()
marker = 'completed_via_intended_use'
if marker in s:
    print('Savings Goal completion-on-use flow already present')
    raise SystemExit(0)

old = '''      const updatedGoal = {
        ...selectedManagedGoal,
        saved_amount: nextSaved,
        savedAmount: nextSaved,
        current_amount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: activity,
        savings_activity_log: activity,
        activityLog: activity,
        activity_log: activity,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      };
      await finance.updateSavingsGoal(selectedManagedGoal.id, updatedGoal);
      await finance.refreshData?.();
      setUseAmountInput("");
      setUsePurposeInput("");
      appendExchange(purpose, `Done. ${fmt(amount)} was used from ${getGoalTitle(updatedGoal)} for “${purpose}”. Remaining saved: ${fmt(nextSaved)}.`);
      setPhase("manage-goal");
'''

new = '''      const completedByUse = nextSaved <= 0.0001;
      const updatedGoal = {
        ...selectedManagedGoal,
        saved_amount: nextSaved,
        savedAmount: nextSaved,
        current_amount: nextSaved,
        currentAmount: nextSaved,
        status: completedByUse ? "completed" : selectedManagedGoal?.status,
        completion_status: completedByUse ? "completed" : selectedManagedGoal?.completion_status,
        completed_at: completedByUse ? now : selectedManagedGoal?.completed_at,
        completedAt: completedByUse ? now : selectedManagedGoal?.completedAt,
        completion_reason: completedByUse ? "completed_via_intended_use" : selectedManagedGoal?.completion_reason,
        completionReason: completedByUse ? "completed_via_intended_use" : selectedManagedGoal?.completionReason,
        deleted_at: completedByUse ? now : selectedManagedGoal?.deleted_at,
        deletedAt: completedByUse ? now : selectedManagedGoal?.deletedAt,
        savingsActivityLog: activity,
        savings_activity_log: activity,
        activityLog: activity,
        activity_log: activity,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      };
      await finance.updateSavingsGoal(selectedManagedGoal.id, updatedGoal);
      await finance.refreshData?.();
      setUseAmountInput("");
      setUsePurposeInput("");
      if (completedByUse) {
        setSelectedGoalId("");
        appendExchange(purpose, `Done. ${fmt(amount)} was used from ${getGoalTitle(updatedGoal)} for “${purpose}”. Goal completed and removed from active Savings Goals.`);
        setPhase("home");
      } else {
        appendExchange(purpose, `Done. ${fmt(amount)} was used from ${getGoalTitle(updatedGoal)} for “${purpose}”. Remaining saved: ${fmt(nextSaved)}.`);
        setPhase("manage-goal");
      }
'''

if old not in s:
    raise SystemExit('Savings Goal completion-on-use anchor missing')

s = s.replace(old, new, 1)
p.write_text(s)
print('Savings Goal completion-on-use flow patched')
