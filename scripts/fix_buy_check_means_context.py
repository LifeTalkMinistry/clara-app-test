from pathlib import Path

orb_path = Path('src/runtime/installClaraOrbGreeting.js')
orb = orb_path.read_text()

needle = 'const MEANS_PLACEHOLDER_ATTR = "data-clara-orb-means-placeholder";\n'
if 'const MEANS_CONTEXT_KEY = "__claraCanonicalMeansSnapshot__";' not in orb:
    orb = orb.replace(needle, needle + 'const MEANS_CONTEXT_KEY = "__claraCanonicalMeansSnapshot__";\n')

old = '''        meansSnapshot = snapshot;\n        if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);'''
new = '''        meansSnapshot = snapshot;\n        window[MEANS_CONTEXT_KEY] = snapshot ? { ...snapshot, capturedAt: Date.now() } : null;\n        if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);'''
if old not in orb:
    raise SystemExit('refresh success anchor not found')
orb = orb.replace(old, new, 1)

old = '''        console.warn("CLARA Orb Means Score unavailable:", error);\n        meansSnapshot = null;\n        if (activeLabel) ensureMeansMetric(activeLabel, null, toggleMeansMetric);'''
new = '''        console.warn("CLARA Orb Means Score unavailable:", error);\n        meansSnapshot = null;\n        window[MEANS_CONTEXT_KEY] = null;\n        if (activeLabel) ensureMeansMetric(activeLabel, null, toggleMeansMetric);'''
if old not in orb:
    raise SystemExit('refresh failure anchor not found')
orb = orb.replace(old, new, 1)

old = '''      meansSnapshot = null;\n      window[RUNTIME_KEY] = null;'''
new = '''      meansSnapshot = null;\n      window[MEANS_CONTEXT_KEY] = null;\n      window[RUNTIME_KEY] = null;'''
if old not in orb:
    raise SystemExit('destroy anchor not found')
orb = orb.replace(old, new, 1)
orb_path.write_text(orb)

ai_path = Path('src/lib/clara-buy-check-expert-ai.js')
ai = ai_path.read_text()

anchor = '''function buildConversationFinancialContext(assistantContext = {}, evidence = {}) {\n'''
helper = '''function buildCanonicalMeansContext(purchasePrice = 0) {\n  if (typeof window === "undefined") return null;\n  const snapshot = safeRecord(window.__claraCanonicalMeansSnapshot__);\n  if (!Object.keys(snapshot).length) return null;\n\n  const currentScore = Number(snapshot.score);\n  const availableNow = toNumber(snapshot.availableNow);\n  const upcomingCommitments = toNumber(snapshot.upcoming);\n  const currentRoomUntilPayday = Number.isFinite(Number(snapshot.projectedRoom))\n    ? Number(snapshot.projectedRoom)\n    : availableNow - upcomingCommitments;\n  const price = Math.max(0, toNumber(purchasePrice));\n  const availableAfterPurchase = price > 0 ? Math.max(0, availableNow - price) : null;\n  const projectedRoomAfterPurchase = availableAfterPurchase === null\n    ? null\n    : availableAfterPurchase - upcomingCommitments;\n  const projectedScoreAfterPurchase = availableAfterPurchase === null\n    ? null\n    : availableAfterPurchase > 0\n      ? Math.round(100 + (projectedRoomAfterPurchase / availableAfterPurchase) * 100)\n      : upcomingCommitments > 0\n        ? -100\n        : 100;\n\n  return {\n    protectionLine: 100,\n    currentScore: Number.isFinite(currentScore) ? currentScore : null,\n    projectedScoreAfterPurchase,\n    currentRoomUntilPayday,\n    projectedRoomAfterPurchase,\n    crossesProtectionLine:\n      Number.isFinite(currentScore) &&\n      projectedScoreAfterPurchase !== null &&\n      currentScore >= 100 &&\n      projectedScoreAfterPurchase < 100,\n    cycleStartDate: snapshot.cycleStartDate || null,\n    nextPayday: snapshot.cycleEndDate || snapshot.horizonDate || null,\n    spendableMoney: availableNow,\n    upcomingCommitments,\n    breakdown: {\n      debtAndObligations: toNumber(snapshot.debtUpcoming),\n      savingsGoals: toNumber(snapshot.savingsGoalUpcoming),\n      moneySchedule: toNumber(snapshot.moneyScheduleUpcoming),\n      otherScheduledEvents: toNumber(snapshot.otherScheduledUpcoming),\n    },\n    moneyLentUnavailable: toNumber(snapshot.moneyLentUnavailable),\n    savingsProtected: toNumber(snapshot.savingsProtected),\n    emergencyProtected: toNumber(snapshot.emergencyProtected),\n    dataSource: "canonical-orb-means-snapshot",\n  };\n}\n\n'''
if 'function buildCanonicalMeansContext(' not in ai:
    if anchor not in ai:
        raise SystemExit('AI context anchor not found')
    ai = ai.replace(anchor, helper + anchor, 1)

old = '''  const price = toNumber(purchase.price);\n  const spendable = toNumber(wallet.spendableTotal);\n\n  return {\n    purchaseAlreadyUnderstood: {'''
new = '''  const price = toNumber(purchase.price);\n  const spendable = toNumber(wallet.spendableTotal);\n  const means = buildCanonicalMeansContext(price);\n\n  return {\n    means,\n    purchaseAlreadyUnderstood: {'''
if old not in ai:
    raise SystemExit('AI return anchor not found')
ai = ai.replace(old, new, 1)

old = '''- When CLARA supplies a current or projected Means Score, treat it as authoritative. Do not independently rebuild or contradict the Means calculation.\n- Treat 100 as the financial protection line: protect it without moralizing ordinary safe purchases.'''
new = '''- When VERIFIED FINANCIAL CONTEXT includes means, that object is the primary financial authority for Ask Before You Spend.\n- means.currentScore is the user's real current Means Score. means.projectedScoreAfterPurchase is the simulated score after this proposed purchase.\n- means.currentRoomUntilPayday and means.projectedRoomAfterPurchase are authoritative breathing-room values through means.nextPayday.\n- NEVER claim the user has no wallet, income, or Means setup when the means object is present.\n- Do not independently rebuild or contradict the Means calculation.\n- Treat 100 as the financial protection line: protect it without moralizing ordinary safe purchases.'''
if old not in ai:
    raise SystemExit('prompt means authority anchor not found')
ai = ai.replace(old, new, 1)

ai_path.write_text(ai)
