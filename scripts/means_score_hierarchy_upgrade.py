from pathlib import Path

means_path = Path("src/runtime/installClaraOrbGreeting.js")
text = means_path.read_text()

old_score = '''  const projectedSpending = upcoming;
  const projectedRoom = availableNow - upcoming;
  const score =
    availableNow > 0
      ? Math.round(100 + ((availableNow - upcoming) / availableNow) * 100)
      : upcoming > 0
        ? -100
        : 100;
'''

new_score = '''  const projectedSpending = upcoming;
  const projectedRoom = availableNow - upcoming;

  // Means Score is an uncapped financial-runway index.
  // 100 means the user has exactly the resources required to reach the next payday.
  // Emergency Fund increases financial runway, but remains protected from ordinary spending.
  const financialRunway = availableNow + emergencyProtected;
  const requiredRunway = upcoming;
  const score =
    requiredRunway > 0
      ? Math.round((financialRunway / requiredRunway) * 100)
      : financialRunway > 0
        ? 100
        : 0;
'''

if old_score not in text:
    raise SystemExit("canonical Means score formula not found; refusing blind patch")
text = text.replace(old_score, new_score, 1)

old_return = '''    availableNow,
    moneyLentUnavailable,
    emergencyProtected,
    savingsProtected,
    otherProtected,
    projectedSpending,
    projectedRoom,
'''
new_return = '''    availableNow,
    financialRunway,
    requiredRunway,
    moneyLentUnavailable,
    emergencyProtected,
    savingsProtected,
    otherProtected,
    projectedSpending,
    projectedRoom,
'''
if old_return not in text:
    raise SystemExit("Means snapshot return block not found")
text = text.replace(old_return, new_return, 1)

old_status = '''function statusForScore(score) {
  if (score > 100) return "Below your means";
  if (score === 100) return "Within your means";
  if (score >= 0) return "Above your means";
  return "Over your means";
}
'''
new_status = '''function statusForScore(score) {
  if (score >= 10000) return "Diamond";
  if (score >= 5000) return "Gold";
  if (score >= 2000) return "Silver";
  if (score >= 1000) return "Bronze";
  if (score >= 500) return "Vanguard";
  if (score >= 400) return "3 Cycles Ahead";
  if (score >= 300) return "2 Cycles Ahead";
  if (score >= 200) return "1 Cycle Ahead";
  if (score >= 101) return "Below Your Means";
  if (score === 100) return "Within Your Means";
  if (score >= 1) return "Above Your Means";
  return "In Deficit";
}
'''
if old_status not in text:
    raise SystemExit("Means status function not found")
text = text.replace(old_status, new_status, 1)

# Include the new runway fields in render invalidation so Emergency Fund changes repaint the score.
old_signature = '''        Math.round(snapshot.availableNow || 0),
        Math.round(snapshot.moneyLentUnavailable || 0),
'''
new_signature = '''        Math.round(snapshot.availableNow || 0),
        Math.round(snapshot.financialRunway || 0),
        Math.round(snapshot.requiredRunway || 0),
        Math.round(snapshot.moneyLentUnavailable || 0),
'''
if old_signature not in text:
    raise SystemExit("Means render signature block not found")
text = text.replace(old_signature, new_signature, 1)

# Guard the product invariants we are introducing.
checks = [
    'const financialRunway = availableNow + emergencyProtected;',
    'Math.round((financialRunway / requiredRunway) * 100)',
    'if (score >= 10000) return "Diamond";',
    'if (score >= 5000) return "Gold";',
    'if (score >= 2000) return "Silver";',
    'if (score >= 1000) return "Bronze";',
    'if (score >= 500) return "Vanguard";',
    'if (score >= 200) return "1 Cycle Ahead";',
    'if (score >= 101) return "Below Your Means";',
    'if (score === 100) return "Within Your Means";',
    'if (score >= 1) return "Above Your Means";',
    'return "In Deficit";',
]
for check in checks:
    if check not in text:
        raise SystemExit(f"missing Means hierarchy invariant: {check}")

means_path.write_text(text)
