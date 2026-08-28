from pathlib import Path

path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text(encoding="utf-8")

old_prefix = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v3";'
new_prefix = 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v5";'
if old_prefix not in text and new_prefix not in text:
    raise SystemExit("Means baseline storage prefix not found")
text = text.replace(old_prefix, new_prefix)

old_block = '''  const plannedDebtAlreadyPaid = plannedDebtPaidInsideCycle(
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
new_block = '''  // Rebuild the cycle anchor only from currently declared/predicted cycle context.
  // Never backfill already-paid debt from payment history: that silently makes old
  // transactions part of the user's hidden 100 and can double-count realized outflow.
  const reconstructedRequiredRunway = Math.max(
    Number(requiredRunwayCandidate || 0),
    Number(upcoming || 0),
    0
  );'''

if old_block not in text:
    if new_block not in text:
        raise SystemExit("Paid-debt reconstruction block not found")
else:
    text = text.replace(old_block, new_block)

path.write_text(text, encoding="utf-8")
print("Patched Means baseline reconstruction to exclude already-paid debt.")
# v5 one-shot repair trigger
