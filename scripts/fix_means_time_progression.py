from pathlib import Path

# One-shot repair: only the recurring Money Schedule may decay automatically as days pass.
path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

old_other_sig = 'function futureScheduledAmount(user, horizonEnd = endOfCurrentMonthKey()) {'
new_other_sig = 'function futureScheduledAmount(user, cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey()) {'
if old_other_sig not in text:
    raise SystemExit('futureScheduledAmount signature not found')
text = text.replace(old_other_sig, new_other_sig, 1)

old_other_filter = '    if (!date || date <= today || date >= horizonEnd) return sum;'
new_other_filter = '    if (!date || date < cycleStart || date >= horizonEnd) return sum;'
if old_other_filter not in text:
    raise SystemExit('other scheduled date filter not found')
text = text.replace(old_other_filter, new_other_filter, 1)

old_savings_filter = '    if (!date || date <= today || date >= horizonEnd) return sum;'
new_savings_filter = '    if (!date || date >= horizonEnd) return sum;'
if old_savings_filter not in text:
    raise SystemExit('savings goal date filter not found')
text = text.replace(old_savings_filter, new_savings_filter, 1)

old_other_call = '  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleEndDate);'
new_other_call = '  const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);'
if old_other_call not in text:
    raise SystemExit('other scheduled call not found')
text = text.replace(old_other_call, new_other_call, 1)

checks = [
    'const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);',
    'while (cursor < end) {',
    'if (!date || date < cycleStart || date >= horizonEnd) return sum;',
    'if (!date || date >= horizonEnd) return sum;',
    'futureDebtObligationAmount(debtObligations, cycleEndDate) +',
    'overdueUnpaidDebtAmount(debtObligations, cycleStartDate, cycleEndDate)',
]
for check in checks:
    if check not in text:
        raise SystemExit(f'missing Means progression invariant: {check}')

path.write_text(text)
