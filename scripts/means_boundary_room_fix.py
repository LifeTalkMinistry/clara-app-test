from pathlib import Path
import re

path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

# One financial window: today < commitment date < next stable payday.
text = text.replace(
    'if (!date || date <= today || date > horizonEnd) return sum;',
    'if (!date || date <= today || date >= horizonEnd) return sum;'
)
text = text.replace('while (cursor <= end) {', 'while (cursor < end) {', 1)

# Preserve negative Room values in the UI.
if 'function signedMoney(value)' not in text:
    marker = 'function localDateKey(value = new Date()) {'
    if marker not in text:
        raise SystemExit('localDateKey marker not found')
    signed = '''function signedMoney(value) {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 });
  return amount < 0 ? `-₱${absolute}` : `₱${absolute}`;
}

'''
    text = text.replace(marker, signed + marker, 1)

# Room must display the same canonical projectedRoom used by the Means calculation.
room_pattern = re.compile(
    r'(<span>Room until \$\{formatHorizonDate\(snapshot\.cycleEndDate\)\}</span>\s*<strong[^>]*>)(\$\{.*?\})(</strong>)',
    re.S,
)
text, room_count = room_pattern.subn(r'\1${signedMoney(snapshot.projectedRoom)}\3', text, count=1)
if room_count != 1:
    raise SystemExit('Room row not found')

# Explicit integrity total: visible rows must equal Upcoming commitments.
if 'upcomingBreakdownTotal' not in text:
    needle = '  const upcoming = debtUpcoming + savingsGoalUpcoming + moneyScheduleUpcoming + otherScheduledUpcoming;\n'
    if needle not in text:
        raise SystemExit('upcoming marker not found')
    text = text.replace(
        needle,
        needle + '  const upcomingBreakdownTotal = debtUpcoming + savingsGoalUpcoming + moneyScheduleUpcoming + otherScheduledUpcoming;\n',
        1,
    )
    text = text.replace(
        '    upcoming,\n    savingsGoalUpcoming,',
        '    upcoming,\n    upcomingBreakdownTotal,\n    savingsGoalUpcoming,',
        1,
    )
    text = text.replace(
        '        Math.round(snapshot.upcoming),\n        Math.round(snapshot.savingsGoalUpcoming || 0),',
        '        Math.round(snapshot.upcoming),\n        Math.round(snapshot.upcomingBreakdownTotal || 0),\n        Math.round(snapshot.savingsGoalUpcoming || 0),',
        1,
    )

# Hard invariants.
if text.count('date >= horizonEnd') < 3:
    raise SystemExit('not all commitment sources use exclusive payday boundary')
for check in [
    'while (cursor < end)',
    'const projectedRoom = availableNow - upcoming;',
    '${signedMoney(snapshot.projectedRoom)}',
    'upcomingBreakdownTotal',
]:
    if check not in text:
        raise SystemExit(f'missing invariant: {check}')

path.write_text(text)
