from pathlib import Path

path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()
old = '''function statusForScore(score) {
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
}'''
new = '''function statusForScore(score) {
  if (score >= 10000) return "Diamond";
  if (score >= 5000) return "Gold";
  if (score >= 2000) return "Silver";
  if (score >= 1000) return "Bronze";
  if (score >= 500) return "Vanguard";
  if (score >= 400) return "Level IV";
  if (score >= 300) return "Level III";
  if (score >= 200) return "Level II";
  if (score >= 101) return "Below Your Means";
  if (score === 100) return "Within Your Means";
  if (score >= 1) return "Above Your Means";
  return "In Deficit";
}'''
if old not in text:
    raise SystemExit("Expected Means Score hierarchy not found; aborting without changes.")
path.write_text(text.replace(old, new, 1))
