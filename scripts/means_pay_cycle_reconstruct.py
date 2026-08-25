from pathlib import Path
import re

path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

pattern = re.compile(r'''function resolveMeansHorizonDate\(incomeSources = \[\]\) \{.*?\n\}\n\nfunction parseMonthKey''', re.S)
replacement = '''function resolveMeansPayCycle(incomeSources = []) {
  const today = localDateKey();
  const searchStart = addLocalDaysKey(today, -62);
  const searchEnd = addLocalDaysKey(today, 62);
  const cycles = [];

  (Array.isArray(incomeSources) ? incomeSources : []).forEach((source) => {
    if (normalizeLower(source?.stability) !== "stable") return;
    if (source?.useForBudgetTiming === false || source?.use_for_budget_timing === false) return;
    const recurrence = stableIncomeRecurrence(source);
    if (!recurrence) return;
    const occurrences = getRecurrenceOccurrences(recurrence, searchStart, searchEnd, { kind: "income" }).sort();
    const previous = [...occurrences].reverse().find((date) => date <= today) || "";
    const next = occurrences.find((date) => date > today) || "";
    if (next) cycles.push({ start: previous || today, end: next });
  });

  if (!cycles.length) return { start: today, end: endOfCurrentMonthKey() };
  return cycles.sort((a, b) => a.end.localeCompare(b.end))[0];
}

function payCycleIncomeFromSources(incomeSources = [], cycleStart = "", cycleEnd = "") {
  return (Array.isArray(incomeSources) ? incomeSources : []).reduce((sourceSum, source) => {
    const actualIncome = getIncomeSourceActivityLog(source).reduce((activitySum, activity) => {
      if (normalizeLower(activity?.type) !== INCOME_HUB_CASH_IN_TYPE) return activitySum;
      const date = localDateKey(getTransactionDate(activity));
      if (!date || date < cycleStart || date >= cycleEnd) return activitySum;
      return activitySum + Math.max(0, firstValidNumber(activity?.amount));
    }, 0);
    return sourceSum + actualIncome;
  }, 0);
}

function payCycleSpent(expenses = [], cycleStart = "") {
  const today = localDateKey();
  return (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const date = localDateKey(getTransactionDate(expense));
    if (!date || date < cycleStart || date > today) return sum;
    return sum + Math.abs(Number(expense?.amount || 0));
  }, 0);
}

function parseMonthKey'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit("Could not replace Means horizon resolver safely")

old = '''  const currentMonthKey = getPHMonthKey();

  const spent = (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const date = getTransactionDate(expense);
    if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;
    return sum + Math.abs(Number(expense?.amount || 0));
  }, 0);

  const income = currentMonthIncomeFromSources(incomeSources, currentMonthKey);
'''
new = '''  const payCycle = resolveMeansPayCycle(incomeSources);
  const cycleStartDate = payCycle.start;
  const cycleEndDate = payCycle.end;
  const spent = payCycleSpent(expenses, cycleStartDate);
  const income = payCycleIncomeFromSources(incomeSources, cycleStartDate, cycleEndDate);
'''
if old not in text:
    raise SystemExit("Means month-based snapshot block not found")
text = text.replace(old, new, 1)

old = '''  const horizonDate = resolveMeansHorizonDate(incomeSources);
  const routineUpcoming = futureRoutineAmount(owner, horizonDate);
  const scheduledUpcoming = futureScheduledAmount(owner, horizonDate);
  const savingsGoalUpcoming = futureSavingsGoalAmount(savingsGoals, horizonDate);
  const debtUpcoming = futureDebtObligationAmount(debtObligations, horizonDate);
  const upcoming = routineUpcoming + scheduledUpcoming + savingsGoalUpcoming + debtUpcoming;
'''
new = '''  const moneyScheduleUpcoming = futureRoutineAmount(owner, cycleEndDate);
  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleEndDate);
  const savingsGoalUpcoming = futureSavingsGoalAmount(savingsGoals, cycleEndDate);
  const debtUpcoming = futureDebtObligationAmount(debtObligations, cycleEndDate);
  const upcoming = debtUpcoming + savingsGoalUpcoming + moneyScheduleUpcoming + otherScheduledUpcoming;
'''
if old not in text:
    raise SystemExit("Means upcoming block not found")
text = text.replace(old, new, 1)

old = '''    savingsGoalUpcoming,
    debtUpcoming,
    horizonDate,
    availableNow,
'''
new = '''    savingsGoalUpcoming,
    debtUpcoming,
    moneyScheduleUpcoming,
    otherScheduledUpcoming,
    cycleStartDate,
    cycleEndDate,
    horizonDate: cycleEndDate,
    availableNow,
'''
if old not in text:
    raise SystemExit("Means return fields not found")
text = text.replace(old, new, 1)

old = '''        Math.round(snapshot.savingsGoalUpcoming || 0),
        Math.round(snapshot.debtUpcoming || 0),
        Math.round(snapshot.availableNow || 0),
'''
new = '''        Math.round(snapshot.savingsGoalUpcoming || 0),
        Math.round(snapshot.debtUpcoming || 0),
        Math.round(snapshot.moneyScheduleUpcoming || 0),
        Math.round(snapshot.otherScheduledUpcoming || 0),
        snapshot.cycleStartDate || "",
        snapshot.cycleEndDate || "",
        Math.round(snapshot.availableNow || 0),
'''
if old not in text:
    raise SystemExit("Means render signature not found")
text = text.replace(old, new, 1)

text = text.replace('<span>Income this month</span>', '<span>Income this pay cycle</span>', 1)
rows = '''      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Debt / obligations</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.debtUpcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Savings goals</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.savingsGoalUpcoming)}</strong></span>'''
expanded = rows + '''
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Money Schedule</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.moneyScheduleUpcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Other scheduled events</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.otherScheduledUpcoming)}</strong></span>'''
if rows not in text:
    raise SystemExit("Means breakdown rows not found")
text = text.replace(rows, expanded, 1)
text = text.replace('<span>Room until next payday</span>', '<span>Room until ${formatHorizonDate(snapshot.cycleEndDate)}</span>', 1)

old_info = '''This score uses only your money in hand — wallet money that is not protected for Emergency Fund or Savings Goals and is not lent out — and checks whether it can carry you through ${formatHorizonDate(snapshot.horizonDate)}, your next stable payday. Future salary is not treated as available before it arrives.'''
new_info = '''This score uses one pay-cycle window: ${formatHorizonDate(snapshot.cycleStartDate)} through ${formatHorizonDate(snapshot.cycleEndDate)}. Income and spending are measured inside that cycle. Upcoming commitments are the exact total of Debt / Obligations, Savings Goals, Money Schedule, and other scheduled events due before the next payday. Protected or lent money is already excluded from money in hand and is not subtracted twice.'''
if old_info not in text:
    raise SystemExit("Means info copy not found")
text = text.replace(old_info, new_info, 1)

text = text.replace(
    'Once income is recorded, CLARA will calculate your score from what you have already spent plus upcoming Money Schedule, Debt / Obligations, and Savings Goal commitments.',
    'Once income is recorded, CLARA will calculate your pay-cycle position from money in hand, spending already recorded in this cycle, and upcoming Debt / Obligations, Savings Goals, Money Schedule, and other scheduled events.',
    1,
)

path.write_text(text)
