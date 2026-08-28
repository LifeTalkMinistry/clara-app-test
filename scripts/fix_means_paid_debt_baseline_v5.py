from pathlib import Path

# Keep the v5 baseline repair idempotent.
means = Path("src/runtime/installClaraOrbGreeting.js")
text = means.read_text(encoding="utf-8")

old_prefix = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v3";'
new_prefix = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v5";'
if old_prefix not in text and new_prefix not in text:
    raise SystemExit("Means baseline storage prefix not found")
text = text.replace(old_prefix, new_prefix)

old_baseline = '''  const plannedDebtAlreadyPaid = plannedDebtPaidInsideCycle(
    debtObligations,
    cycleStart,
    cycleEnd
  );

  // 100 is the full predicted amount needed for this pay cycle. Keep already-realized
  // planned debt inside the floor so fulfilling a known obligation cannot make the
  // measuring stick artificially smaller.
  const reconstructedRequiredRunway = Math.max(
    Number(requiredRunwayCandidate || 0),
    Number(upcoming || 0) + plannedDebtAlreadyPaid,
    0
  );'''
new_baseline = '''  // Rebuild the cycle anchor only from currently declared/predicted cycle context.
  // Never backfill already-paid debt from payment history: that silently makes old
  // transactions part of the user's hidden 100 and can double-count realized outflow.
  const reconstructedRequiredRunway = Math.max(
    Number(requiredRunwayCandidate || 0),
    Number(upcoming || 0),
    0
  );'''
if old_baseline in text:
    text = text.replace(old_baseline, new_baseline, 1)
elif new_baseline not in text:
    raise SystemExit("Paid-debt reconstruction block not found")

# Do not count a future debt occurrence in Upcoming if that exact occurrence was paid early.
old_future = '''function futureDebtObligationAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return buildDebtObligationScheduleProjection(records).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));
    if (!date || date <= today || date >= horizonEnd) return sum;
    if (direction !== "out") return sum;
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}'''
new_future = '''function futureDebtObligationAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();
  const recordMap = new Map(
    (Array.isArray(records) ? records : []).map((record) => [
      String(record?.id || record?.debt_id || record?.debtId || "").trim(),
      record,
    ])
  );

  return buildDebtObligationScheduleProjection(records).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const debtId = String(event?.debtObligationId || event?.debt_obligation_id || "").trim();
    const record = recordMap.get(debtId) || {};
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));
    if (!date || date <= today || date >= horizonEnd) return sum;
    if (direction !== "out") return sum;
    if (debtId && isDebtOccurrencePaid(record, date)) return sum;
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}'''
if old_future in text:
    text = text.replace(old_future, new_future, 1)
elif new_future not in text:
    raise SystemExit("Future debt obligation function not found")

means.write_text(text, encoding="utf-8")

# Also make the shared debt occurrence resolver skip future occurrences already paid early,
# so debt cards and other consumers agree with the Means calculation.
state = Path("src/lib/debtOccurrenceState.js")
state_text = state.read_text(encoding="utf-8")
old_next = '''  const next = events.find((event) => dateKey(event?.date) > today) || null;'''
new_next = '''  const next =
    events.find(
      (event) =>
        dateKey(event?.date) > today &&
        !isDebtOccurrencePaid(record, event?.date)
    ) || null;'''
if old_next in state_text:
    state_text = state_text.replace(old_next, new_next, 1)
elif new_next not in state_text:
    raise SystemExit("Future debt occurrence resolver not found")
state.write_text(state_text, encoding="utf-8")

# Verification contracts.
means_body = means.read_text(encoding="utf-8")
state_body = state.read_text(encoding="utf-8")
assert 'if (debtId && isDebtOccurrencePaid(record, date)) return sum;' in means_body
assert '!isDebtOccurrencePaid(record, event?.date)' in state_body
print("Patched early-paid future debt occurrences out of Means and debt lifecycle state.")
