from pathlib import Path

# Triggered one-shot upgrade: separate recorded spending from Money Schedule assumed spending.
path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

anchor = '''function futureRoutineAmount(user, horizonEnd = endOfCurrentMonthKey()) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;

  const byWeekday = new Map(
    routine.days.map((day) => [
      Number(day?.weekdayIndex ?? day?.weekday_index),
      Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100,
    ])
  );

  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
'''
if anchor not in text:
    raise SystemExit('futureRoutineAmount anchor not found')

helper = '''function assumedRoutineSpent(user, cycleStart = localDateKey()) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;

  const byWeekday = new Map(
    routine.days.map((day) => [
      Number(day?.weekdayIndex ?? day?.weekday_index),
      Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100,
    ])
  );

  const startMatch = String(cycleStart || "").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!startMatch) return 0;

  // Money Schedule is assumed consumed at 12:00 AM when its calendar day begins.
  // Therefore the current day belongs to Assumed spent, while futureRoutineAmount starts tomorrow.
  const cursor = new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let total = 0;

  while (cursor <= today) {
    total += byWeekday.get(cursor.getDay()) || 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

'''
text = text.replace(anchor, helper + anchor, 1)

old = '''  const moneyScheduleUpcoming = futureRoutineAmount(owner, cycleEndDate);
  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);
'''
new = '''  const assumedSpent = assumedRoutineSpent(owner, cycleStartDate);
  const moneyScheduleUpcoming = futureRoutineAmount(owner, cycleEndDate);
  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);
'''
if old not in text:
    raise SystemExit('Means snapshot routine block not found')
text = text.replace(old, new, 1)

old_return = '''    income,
    spent,
    upcoming,
'''
new_return = '''    income,
    spent,
    assumedSpent,
    upcoming,
'''
if old_return not in text:
    raise SystemExit('Means return block not found')
text = text.replace(old_return, new_return, 1)

old_signature = '''        Math.round(snapshot.spent),
        Math.round(snapshot.upcoming),
'''
new_signature = '''        Math.round(snapshot.spent),
        Math.round(snapshot.assumedSpent || 0),
        Math.round(snapshot.upcoming),
'''
if old_signature not in text:
    raise SystemExit('render signature spent block not found')
text = text.replace(old_signature, new_signature, 1)

old_ui = '''      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Already spent</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.spent)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:10px;color:rgba(255,255,255,.44)"><span>Upcoming commitments</span><strong style="color:rgba(255,255,255,.78)">${money(snapshot.upcoming)}</strong></span>
'''
new_ui = '''      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Actual spent</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.spent)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Assumed spent</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.assumedSpent || 0)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:10px;color:rgba(255,255,255,.44)"><span>Upcoming commitments</span><strong style="color:rgba(255,255,255,.78)">${money(snapshot.upcoming)}</strong></span>
'''
if old_ui not in text:
    raise SystemExit('Means spent UI block not found')
text = text.replace(old_ui, new_ui, 1)

old_info = '''Income and spending are measured inside that cycle. Upcoming commitments are the exact total of Debt / Obligations, Savings Goals, Money Schedule, and other scheduled events due before the next payday.'''
new_info = '''Actual spent is based on recorded expenses. Assumed spent is the Money Schedule amount whose scheduled days have already begun in the current pay cycle. Upcoming commitments contain only the remaining future Money Schedule plus unresolved Debt / Obligations, Savings Goals, and other scheduled events before the next payday.'''
if old_info not in text:
    raise SystemExit('Means info copy not found')
text = text.replace(old_info, new_info, 1)

checks = [
    'function assumedRoutineSpent(user, cycleStart = localDateKey())',
    'while (cursor <= today)',
    'const assumedSpent = assumedRoutineSpent(owner, cycleStartDate);',
    'assumedSpent,',
    '<span>Actual spent</span>',
    '<span>Assumed spent</span>',
]
for check in checks:
    if check not in text:
        raise SystemExit(f'missing assumed-spent invariant: {check}')

path.write_text(text)
