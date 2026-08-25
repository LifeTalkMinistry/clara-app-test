from pathlib import Path

# One-shot repair: only the recurring Money Schedule may decay automatically as days pass.
path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

# Other scheduled commitments stay in the current pay-cycle requirement even after their date passes.
old_other = '''function futureScheduledAmount(user, cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return parseScheduleEvents(user).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));
    const source = normalizeLower(event?.source);
    const savingsGoalProjection =
      source === SAVINGS_GOAL_SCHEDULE_SOURCE || event?.savingsGoalId || event?.savings_goal_id;
    const debtProjection =
      source === DEBT_OBLIGATION_SCHEDULE_SOURCE ||
      event?.debtObligationId ||
      event?.debt_obligation_id;
    if (!date || date < cycleStart || date >= horizonEnd) return sum;
'''
if old_other not in text:
    raise SystemExit('other scheduled block invariant not found')

# Restore future Debt to future-only; overdue unpaid Debt is already carried by overdueUnpaidDebtAmount.
old_debt_filter = '''function futureDebtObligationAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return buildDebtObligationScheduleProjection(records).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));
    if (!date || date >= horizonEnd) return sum;
'''
new_debt_filter = old_debt_filter.replace(
    'if (!date || date >= horizonEnd) return sum;',
    'if (!date || date <= today || date >= horizonEnd) return sum;'
)
if old_debt_filter not in text:
    raise SystemExit('future debt block not found')
text = text.replace(old_debt_filter, new_debt_filter, 1)

# Savings Goals are state-based: an active, unfunded goal does not vanish because its date passed.
old_savings = '''function futureSavingsGoalAmount(goals = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return (Array.isArray(goals) ? goals : []).reduce((sum, goal) => {
    if (!isSavingsGoalActive(goal)) return sum;

    const date = savingsGoalDate(goal);
    if (!date || date <= today || date >= horizonEnd) return sum;
'''
new_savings = old_savings.replace(
    'if (!date || date <= today || date >= horizonEnd) return sum;',
    'if (!date || date >= horizonEnd) return sum;'
)
if old_savings not in text:
    raise SystemExit('savings goal block not found')
text = text.replace(old_savings, new_savings, 1)

checks = [
    # Money Schedule alone decays naturally as days pass.
    'const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);',
    'while (cursor < end) {',
    # Other scheduled commitments remain for the current pay cycle after their date passes.
    'function futureScheduledAmount(user, cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey())',
    'if (!date || date < cycleStart || date >= horizonEnd) return sum;',
    # Debt uses future + explicit overdue unpaid carry-forward without double counting.
    'if (!date || date <= today || date >= horizonEnd) return sum;',
    'overdueUnpaidDebtAmount(debtObligations, cycleStartDate, cycleEndDate)',
    # Savings stays until lifecycle state resolves it.
    'function futureSavingsGoalAmount(goals = [], horizonEnd = endOfCurrentMonthKey())',
    'if (!date || date >= horizonEnd) return sum;',
    # Current-cycle call for other scheduled commitments.
    'const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);',
]
for check in checks:
    if check not in text:
        raise SystemExit(f'missing Means progression invariant: {check}')

path.write_text(text)
