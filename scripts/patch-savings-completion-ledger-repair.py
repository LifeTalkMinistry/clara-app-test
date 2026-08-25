from pathlib import Path

REPO = Path('src/lib/financeRepository.js')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} anchor missing')
    return text.replace(old, new, 1)

# Repair legacy/broken Savings Goal completion ledger effects at the repository boundary.
# Lifecycle eligibility itself is owned by src/lib/savingsGoalLifecycle.js.
s = REPO.read_text()
marker = 'SAVINGS_COMPLETION_LEDGER_REPAIR_V1'
if marker not in s:
    s = replace_once(
        s,
        'const legacyIncomeRepairPromises = new Map();',
        'const legacyIncomeRepairPromises = new Map();\nconst completedSavingsRepairPromises = new Map(); // SAVINGS_COMPLETION_LEDGER_REPAIR_V1',
        'repair promise marker',
    )

    helper_anchor = '\nexport function getFinanceDataRevision() {'
    helper = r'''

const getSavingsGoalActivity = (goal = {}) => {
  const candidates = [
    goal?.savingsActivityLog,
    goal?.savings_activity_log,
    goal?.activityLog,
    goal?.activity_log,
  ];
  return candidates.find(Array.isArray) || [];
};

const getSavingsGoalId = (goal = {}) =>
  String(goal?.id || goal?.goal_id || goal?.goalId || "").trim();

const getSavingsGoalWalletId = (goal = {}, activity = {}) =>
  String(
    activity?.storageWalletId ||
      activity?.storage_wallet_id ||
      goal?.wallet_id ||
      goal?.walletId ||
      ""
  ).trim();

const getSavingsCompletionActivity = (goal = {}) =>
  getSavingsGoalActivity(goal).find((entry) => {
    const type = String(entry?.type || "").trim().toLowerCase();
    return ["complete", "use"].includes(type) && Math.abs(toNumber(entry?.amount)) > 0;
  }) || null;

const isCompletedSavingsGoalRecord = (goal = {}) => {
  const status = String(
    goal?.completion_status || goal?.completionStatus || goal?.status || ""
  ).trim().toLowerCase();
  return Boolean(
    goal?.deletedAt ||
      goal?.deleted_at ||
      goal?.completedAt ||
      goal?.completed_at ||
      status === "completed"
  );
};

const savingsExpenseMatchesGoal = (expense = {}, goal = {}, activity = {}) => {
  if (!expense || expense?.deletedAt || expense?.deleted_at) return false;
  const goalId = getSavingsGoalId(goal);
  const linkedExpenseId = String(
    activity?.linkedExpenseId || activity?.linked_expense_id || ""
  ).trim();
  const expenseGoalId = String(
    expense?.usage_goal_id ||
      expense?.usageGoalId ||
      expense?.source_savings_goal_id ||
      expense?.sourceSavingsGoalId ||
      ""
  ).trim();
  const sourceType = String(expense?.source_type || expense?.sourceType || "")
    .trim()
    .toLowerCase();
  if (linkedExpenseId && String(expense?.id || "") === linkedExpenseId) return true;
  if (goalId && expenseGoalId === goalId && ["savings_goal_completion", "savings_goal_usage"].includes(sourceType)) return true;
  return false;
};

async function repairCompletedSavingsGoalLedgerEffects(repository, localUserId) {
  const key = String(localUserId || "").trim();
  if (!key || !repository) return { repaired: 0, amount: 0 };
  if (completedSavingsRepairPromises.has(key)) return completedSavingsRepairPromises.get(key);

  const promise = (async () => {
    const [goals, expenses, wallets] = await Promise.all([
      repository.getSavingsGoals(key, { includeDeleted: true }),
      repository.getExpenses(key, { includeDeleted: true }),
      repository.getWallets(key, { includeDeleted: true }),
    ]);
    const allGoals = Array.isArray(goals) ? goals : [];
    const allExpenses = Array.isArray(expenses) ? expenses : [];
    const walletMap = new Map(
      (Array.isArray(wallets) ? wallets : []).map((wallet) => [getWalletId(wallet), wallet])
    );

    let repaired = 0;
    let repairedAmount = 0;

    for (const goal of allGoals) {
      if (!isCompletedSavingsGoalRecord(goal)) continue;
      const activity = getSavingsCompletionActivity(goal);
      if (!activity) continue;
      if (allExpenses.some((expense) => savingsExpenseMatchesGoal(expense, goal, activity))) continue;

      const goalId = getSavingsGoalId(goal);
      const walletId = getSavingsGoalWalletId(goal, activity);
      const amount = Math.abs(toNumber(activity?.amount));
      const wallet = walletMap.get(walletId);
      if (!goalId || !walletId || !wallet || amount <= 0) continue;

      const currentBalance = getWalletBalance(wallet);
      if (currentBalance + 0.0001 < amount) continue;

      const now = new Date().toISOString();
      const repairExpenseId = `savings_completion_repair_${goalId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const result = await repository.addExpense(key, {
        id: repairExpenseId,
        wallet_id: walletId,
        amount,
        category: "Savings Goal Completed",
        need_type: "other",
        planning_status: "planned",
        notes: `Recovered missing intended-use expense for completed savings goal: ${goal?.title || goal?.name || "Savings Goal"}.`,
        date: activity?.createdAt || activity?.created_at || goal?.completedAt || goal?.completed_at || now,
        created_at: activity?.createdAt || activity?.created_at || goal?.completedAt || goal?.completed_at || now,
        updated_at: now,
        source_type: "savings_goal_completion",
        usage_goal_id: goalId,
        repair_source: "legacy_completed_savings_missing_wallet_effect",
      });

      const updatedWallet = result?.walletUpdate || {
        ...wallet,
        balance: currentBalance - amount,
      };
      walletMap.set(walletId, updatedWallet);
      allExpenses.push(result?.expense || {
        id: repairExpenseId,
        wallet_id: walletId,
        amount,
        source_type: "savings_goal_completion",
        usage_goal_id: goalId,
      });
      repaired += 1;
      repairedAmount += amount;
    }

    return { repaired, amount: repairedAmount };
  })();

  completedSavingsRepairPromises.set(key, promise);
  try {
    return await promise;
  } catch (error) {
    completedSavingsRepairPromises.delete(key);
    throw error;
  }
}
'''
    s = replace_once(s, helper_anchor, helper + helper_anchor, 'repository helper insertion')

    savings_anchor = '''    async upsertSavingsGoal(localUserId, goal, ...args) {\n      const result = await repository.upsertSavingsGoal(localUserId, goal, ...args);\n      return emit(localUserId, "savings_goal:upsert", result);\n    },'''
    savings_override = '''    async getSavingsGoals(localUserId, options, ...args) {\n      const repair = await repairCompletedSavingsGoalLedgerEffects(repository, localUserId);\n      if (repair.repaired > 0) {\n        emitFinanceDataUpdated(localUserId, "savings_goal:completion-ledger-repair");\n      }\n      return repository.getSavingsGoals(localUserId, options, ...args);\n    },\n\n''' + savings_anchor
    s = replace_once(s, savings_anchor, savings_override, 'decorated savings getter')
    REPO.write_text(s)

print('Savings Goal completion ledger repair patched; lifecycle authority unchanged')
