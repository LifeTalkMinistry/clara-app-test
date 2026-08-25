from pathlib import Path

PATH = Path('src/lib/clara-wallet-money-semantics.js')
text = PATH.read_text()
old = '''function isActiveSavingsGoal(goal) {
  const status = String(goal?.status || "").trim().toLowerCase();
  return Boolean(
    goal &&
      !goal?.deletedAt &&
      !goal?.deleted_at &&
      !goal?.is_archived &&
      !goal?.isArchived &&
      !["deleted", "archived", "cancelled", "canceled"].includes(status)
  );
}'''
new = '''function isActiveSavingsGoal(goal) {
  const status = String(
    goal?.status || goal?.completion_status || goal?.completionStatus || ""
  ).trim().toLowerCase();
  const terminalStatuses = new Set([
    "deleted",
    "archived",
    "cancelled",
    "canceled",
    "completed",
    "complete",
    "fulfilled",
    "consumed",
  ]);

  return Boolean(
    goal &&
      !goal?.deletedAt &&
      !goal?.deleted_at &&
      !goal?.is_archived &&
      !goal?.isArchived &&
      !goal?.completedAt &&
      !goal?.completed_at &&
      !terminalStatuses.has(status)
  );
}'''
if old in text:
    PATH.write_text(text.replace(old, new, 1))
elif new not in text:
    raise SystemExit('wallet savings active-goal anchor missing')
print('Completed Savings Goals no longer link wallets')
