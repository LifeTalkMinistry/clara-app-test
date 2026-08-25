from pathlib import Path

# One-shot repair: only the recurring Money Schedule may decay automatically as days pass.
path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()


def replace_inside_function(text, function_name, next_function_name, old, new):
    start_marker = f"function {function_name}"
    end_marker = f"function {next_function_name}"
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"missing function: {function_name}")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"missing next function after {function_name}: {next_function_name}")
    block = text[start:end]
    if old not in block:
        raise SystemExit(f"missing target inside {function_name}: {old}")
    block = block.replace(old, new, 1)
    return text[:start] + block + text[end:]


# Other scheduled commitments remain part of the current pay-cycle requirement after their date passes.
# This was already changed by the first pass; assert it instead of touching unrelated functions.
other_signature = "function futureScheduledAmount(user, cycleStart = localDateKey(), horizonEnd = endOfCurrentMonthKey())"
other_filter = "if (!date || date < cycleStart || date >= horizonEnd) return sum;"
if other_signature not in text or other_filter not in text:
    raise SystemExit("other scheduled commitment carry-forward is not installed")

# Debt stays state-based. Future debt counts only future occurrences; overdue unpaid debt is carried by
# overdueUnpaidDebtAmount. Restore this after the first pass accidentally widened the future filter.
text = replace_inside_function(
    text,
    "futureDebtObligationAmount",
    "debtLastPaidDate",
    "if (!date || date >= horizonEnd) return sum;",
    "if (!date || date <= today || date >= horizonEnd) return sum;",
)

# Savings Goals are state-based: an active, unfunded goal must not vanish just because its date passed.
text = replace_inside_function(
    text,
    "futureSavingsGoalAmount",
    "getOwnerIdentity",
    "if (!date || date <= today || date >= horizonEnd) return sum;",
    "if (!date || date >= horizonEnd) return sum;",
)

# Core doctrine checks.
required = [
    # Money Schedule alone decays naturally as days pass.
    "const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);",
    "while (cursor < end) {",
    # Other scheduled commitments stay through the current pay cycle until explicitly resolved elsewhere.
    other_signature,
    other_filter,
    "const otherScheduledUpcoming = futureScheduledAmount(owner, cycleStartDate, cycleEndDate);",
    # Debt = future obligations + overdue unpaid carry-forward, without double counting.
    "function futureDebtObligationAmount(records = [], horizonEnd = endOfCurrentMonthKey())",
    "if (!date || date <= today || date >= horizonEnd) return sum;",
    "overdueUnpaidDebtAmount(debtObligations, cycleStartDate, cycleEndDate)",
    # Savings remains until lifecycle state resolves it.
    "function futureSavingsGoalAmount(goals = [], horizonEnd = endOfCurrentMonthKey())",
    "if (!date || date >= horizonEnd) return sum;",
]
for check in required:
    if check not in text:
        raise SystemExit(f"missing Means progression invariant: {check}")

path.write_text(text)
