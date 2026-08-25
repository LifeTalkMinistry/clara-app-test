from pathlib import Path

path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

anchor = '''function assumedRoutineSpent(user, cycleStart = localDateKey()) {
'''
if anchor not in text:
    raise SystemExit('assumedRoutineSpent anchor not found')

helper = '''function routineAmountForDate(user, value = new Date()) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const day = routine.days.find(
    (entry) => Number(entry?.weekdayIndex ?? entry?.weekday_index) === date.getDay()
  );
  return Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100;
}

'''
text = text.replace(anchor, helper + anchor, 1)

old = '''  const assumedSpent = assumedRoutineSpent(owner, cycleStartDate);
  const moneyScheduleUpcoming = futureRoutineAmount(owner, cycleEndDate);
  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);
'''
new = '''  const assumedSpent = assumedRoutineSpent(owner, cycleStartDate);
  const assumedToday = routineAmountForDate(owner, new Date());
  const rawMoneyScheduleUpcoming = futureRoutineAmount(owner, cycleEndDate);
  // At 12:00 AM today's routine becomes assumed spent. Hand that same amount out of
  // the remaining Money Schedule immediately so it cannot sit in both past and future.
  const moneyScheduleUpcoming = Math.max(0, rawMoneyScheduleUpcoming - assumedToday);
  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);
'''
if old not in text:
    raise SystemExit('Means routine snapshot block not found')
text = text.replace(old, new, 1)

old_return = '''    spent,
    assumedSpent,
    upcoming,
'''
new_return = '''    spent,
    assumedSpent,
    assumedToday,
    upcoming,
'''
if old_return not in text:
    raise SystemExit('Means return handoff block not found')
text = text.replace(old_return, new_return, 1)

old_signature = '''        Math.round(snapshot.assumedSpent || 0),
        Math.round(snapshot.upcoming),
'''
new_signature = '''        Math.round(snapshot.assumedSpent || 0),
        Math.round(snapshot.assumedToday || 0),
        Math.round(snapshot.upcoming),
'''
if old_signature not in text:
    raise SystemExit('render signature assumed block not found')
text = text.replace(old_signature, new_signature, 1)

checks = [
    'function routineAmountForDate(user, value = new Date())',
    'const assumedToday = routineAmountForDate(owner, new Date());',
    'const rawMoneyScheduleUpcoming = futureRoutineAmount(owner, cycleEndDate);',
    'const moneyScheduleUpcoming = Math.max(0, rawMoneyScheduleUpcoming - assumedToday);',
    'assumedToday,',
]
for check in checks:
    if check not in text:
        raise SystemExit(f'missing assumed handoff invariant: {check}')

path.write_text(text)
