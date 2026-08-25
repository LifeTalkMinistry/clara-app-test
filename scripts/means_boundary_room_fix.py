from pathlib import Path

means_path = Path("src/runtime/installClaraOrbGreeting.js")
text = means_path.read_text()

# One financial window only: today < commitment date < next stable payday.
# The next salary date itself belongs to the next pay cycle.
text = text.replace(
    'if (!date || date <= today || date > horizonEnd) return sum;',
    'if (!date || date <= today || date >= horizonEnd) return sum;'
)
text = text.replace('while (cursor <= end) {', 'while (cursor < end) {', 1)

# The canonical Means snapshot already owns all arithmetic. Keep these invariants explicit.
for check in [
    'const upcoming = debtUpcoming + savingsGoalUpcoming + moneyScheduleUpcoming + otherScheduledUpcoming;',
    'const projectedRoom = availableNow - upcoming;',
    '${snapshot.projectedRoom >= 0 ? "" : "−"}${money(Math.abs(snapshot.projectedRoom))}',
]:
    if check not in text:
        raise SystemExit(f'missing canonical Means invariant: {check}')

if text.count('date >= horizonEnd') < 3:
    raise SystemExit('not all dated commitment sources use the exclusive payday boundary')
if 'while (cursor < end)' not in text:
    raise SystemExit('Money Schedule still includes the payday boundary')

means_path.write_text(text)

# Remove the legacy DOM post-processor. It was independently adding overdue debt/savings
# after the canonical snapshot rendered, causing Upcoming/Score to disagree with Room.
main_path = Path("src/main.jsx")
main = main_path.read_text()
legacy_import = 'import "./runtime/installMeansActualCommitmentGuard";\n'
if legacy_import not in main:
    raise SystemExit('legacy Means commitment guard import not found')
main_path.write_text(main.replace(legacy_import, '', 1))

legacy_guard = Path("src/runtime/installMeansActualCommitmentGuard.js")
if legacy_guard.exists():
    legacy_guard.unlink()
