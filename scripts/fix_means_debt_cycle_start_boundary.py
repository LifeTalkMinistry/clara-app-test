from pathlib import Path

path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

old_signature = "function overdueUnpaidDebtAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {"
new_signature = "function overdueUnpaidDebtAmount(records = [], cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey()) {"
if old_signature not in text:
    raise SystemExit("overdue debt helper signature not found")
text = text.replace(old_signature, new_signature, 1)

old_filter = "    if (date > today || date >= horizonEnd) return;"
new_filter = "    if (date < cycleStart || date > today || date >= horizonEnd) return;"
if old_filter not in text:
    raise SystemExit("overdue debt date filter not found")
text = text.replace(old_filter, new_filter, 1)

old_call = "    overdueUnpaidDebtAmount(debtObligations, cycleEndDate);"
new_call = "    overdueUnpaidDebtAmount(debtObligations, cycleStartDate, cycleEndDate);"
if old_call not in text:
    raise SystemExit("overdue debt call site not found")
text = text.replace(old_call, new_call, 1)

for expected in [
    "date < cycleStart || date > today || date >= horizonEnd",
    "overdueUnpaidDebtAmount(debtObligations, cycleStartDate, cycleEndDate)",
    "futureDebtObligationAmount(debtObligations, cycleEndDate)",
]:
    if expected not in text:
        raise SystemExit(f"missing invariant: {expected}")

path.write_text(text)
