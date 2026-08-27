from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:80]!r}")
    file.write_text(text.replace(old, new, 1))


def replace_between(path, start, end, replacement):
    file = Path(path)
    text = file.read_text()
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"Start marker not found in {path}: {start!r}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"End marker not found in {path}: {end!r}")
    file.write_text(text[:start_index] + replacement + text[end_index:])


# 1) Canonical Means math: zero remaining runway is a state, not a fake score.
replace_between(
    "src/lib/clara-means-cycle-baseline.js",
    "export function calculateMeansScoreState({",
    "\n\nexport const MEANS_CYCLE_BASELINE_VERSION",
    '''export function calculateMeansScoreState({
  financialRunway = 0,
  upcoming = 0,
} = {}) {
  const normalizedFinancialRunway = finiteNonNegative(financialRunway);
  const currentRequiredRunway = finiteNonNegative(upcoming);
  const fullyCovered = currentRequiredRunway === 0;
  const scoreRoom = normalizedFinancialRunway - currentRequiredRunway;
  const score = fullyCovered
    ? null
    : Math.round((normalizedFinancialRunway / currentRequiredRunway) * 100);

  return {
    score,
    fullyCovered,
    coverageState: fullyCovered ? "fully_covered" : "scored",
    scoreRoom,
    // Retained in the return shape so older callers do not break. Assumed spend
    // is informational now; it is not deducted a second time from live runway.
    plannedAssumedSinceLock: 0,
  };
}''',
)

# 2) ORB snapshot and presentation: show Fully Covered instead of manufacturing 100.
runtime = "src/runtime/installClaraOrbGreeting.js"
replace_once(
    runtime,
    "const { score, scoreRoom, plannedAssumedSinceLock } = calculateMeansScoreState({",
    "const { score, scoreRoom, plannedAssumedSinceLock, fullyCovered } = calculateMeansScoreState({",
)
replace_once(
    runtime,
    """  return {\n    hasIncomePayCycle: true,\n    score,\n    income,""",
    """  return {\n    hasIncomePayCycle: true,\n    score,\n    fullyCovered,\n    income,""",
)
replace_once(
    runtime,
    '        "ready",\n        snapshot.score,',
    '        "ready",\n        snapshot.fullyCovered ? "fully-covered" : "scored",\n        snapshot.score,',
)
replace_once(
    runtime,
    '''  const tone = metricTone(snapshot.score);\n  root.setAttribute(\n    "aria-label",\n    `Means Score ${snapshot.score}. ${statusForScore(snapshot.score)}. ${expanded ? "Tap to collapse details." : "Tap for details."}`\n  );''',
    '''  const fullyCovered = snapshot.fullyCovered === true;\n  const tone = fullyCovered ? "#67e8c8" : metricTone(snapshot.score);\n  const scoreDisplay = fullyCovered ? "✓" : snapshot.score;\n  const statusLabel = fullyCovered ? "Fully Covered" : statusForScore(snapshot.score);\n  root.setAttribute(\n    "aria-label",\n    fullyCovered\n      ? `Means Score Fully Covered. No remaining required runway before the next income point. ${expanded ? "Tap to collapse details." : "Tap for details."}`\n      : `Means Score ${snapshot.score}. ${statusLabel}. ${expanded ? "Tap to collapse details." : "Tap for details."}`\n  );''',
)
replace_once(runtime, '>${snapshot.score}</strong>', '>${scoreDisplay}</strong>')
replace_once(runtime, '>${statusForScore(snapshot.score)}</span>', '>${statusLabel}</span>')
replace_once(
    runtime,
    '<span>100 = living within your means</span>',
    '<span>${fullyCovered ? "No remaining required runway before next income" : "100 = living within your means"}</span>',
)
replace_once(
    runtime,
    'Protected or lent money is already excluded from money in hand and is not subtracted twice.</span>',
    'Protected or lent money is already excluded from money in hand and is not subtracted twice.${fullyCovered ? " All remaining required runway is ₱0, so CLARA shows Fully Covered instead of forcing a numeric score." : ""}</span>',
)

# 3) Ask Before You Spend: preserve the same zero-runway state systemically.
buy_check = "src/lib/clara-buy-check-metric-impact.js"
replace_between(
    buy_check,
    "function simulateMeansPurchaseImpact({",
    "\n\nfunction buildClaraPurchaseMetricImpact(",
    '''function simulateMeansPurchaseImpact({
  snapshot = {},
  purchasePrice = 0,
  alreadyAccountedAmount = 0,
  impactSource = "unplanned",
  impactLabel = "",
  impactKey = "",
  targetDate = null,
  offsetUntil = null,
} = {}) {
  const price = Math.max(0, toNumber(purchasePrice));
  if (!(price > 0) || !snapshot || typeof snapshot !== "object") return null;

  const availableNow = Math.max(0, toNumber(snapshot.availableNow));
  const upcomingCommitments = Math.max(0, toNumber(snapshot.upcoming));
  const emergencyProtected = Math.max(0, toNumber(snapshot.emergencyProtected));
  const suppliedFinancialRunway = Number(snapshot.financialRunway);
  const financialRunway = Number.isFinite(suppliedFinancialRunway)
    ? Math.max(0, suppliedFinancialRunway)
    : availableNow + emergencyProtected;
  const currentFullyCovered = snapshot.fullyCovered === true || upcomingCommitments === 0;
  const rawCurrentScore = snapshot.score;
  const currentScore =
    !currentFullyCovered && rawCurrentScore != null && Number.isFinite(Number(rawCurrentScore))
      ? Number(rawCurrentScore)
      : null;

  // The current remaining commitments are the live 100 line. A historical
  // locked baseline must not influence Ask Before You Spend projections.
  const requiredRunway = upcomingCommitments;
  const currentScoreRoom = financialRunway - requiredRunway;
  const currentRoomUntilPayday = availableNow - upcomingCommitments;

  const accounted = Math.max(0, toNumber(alreadyAccountedAmount));
  const accountedAgainstRunway = Math.min(accounted, upcomingCommitments);
  const incrementalImpact = price - accounted;
  const upcomingCommitmentsAfterPurchase = Math.max(
    0,
    upcomingCommitments - accountedAgainstRunway
  );
  const projectedFinancialRunway = Math.max(0, financialRunway - price);
  const projectedScoreRoom = projectedFinancialRunway - upcomingCommitmentsAfterPurchase;
  const projectedRoomAfterPurchase =
    (availableNow - price) - upcomingCommitmentsAfterPurchase;
  const projectedFullyCovered = upcomingCommitmentsAfterPurchase === 0;
  const projectedScoreAfterPurchase = projectedFullyCovered
    ? null
    : Math.round((projectedFinancialRunway / upcomingCommitmentsAfterPurchase) * 100);

  return {
    protectionLine: 100,
    purchasePrice: price,
    alreadyAccountedAmount: accounted,
    incrementalImpact,
    impactSource,
    impactLabel,
    impactKey,
    targetDate,
    offsetUntil,
    currentScore,
    fullyCovered: currentFullyCovered,
    projectedScoreAfterPurchase,
    projectedFullyCovered,
    scoreChange:
      currentScore != null && projectedScoreAfterPurchase != null
        ? projectedScoreAfterPurchase - currentScore
        : null,
    currentStatus: currentFullyCovered
      ? "Fully Covered"
      : currentScore != null
        ? statusForScore(currentScore)
        : null,
    projectedStatus: projectedFullyCovered
      ? "Fully Covered"
      : statusForScore(projectedScoreAfterPurchase),
    requiredRunway,
    currentScoreRoom,
    projectedScoreRoom,
    currentRoomUntilPayday,
    projectedRoomAfterPurchase,
    roomChange: projectedRoomAfterPurchase - currentRoomUntilPayday,
    purchaseSimulationApplied: true,
    crossesProtectionLine:
      currentScore != null &&
      projectedScoreAfterPurchase != null &&
      currentScore >= 100 &&
      projectedScoreAfterPurchase < 100,
    cycleStartDate: snapshot.cycleStartDate || null,
    nextPayday: snapshot.cycleEndDate || snapshot.horizonDate || null,
    spendableMoney: availableNow,
    availableAfterPurchase: availableNow - price,
    upcomingCommitments,
    upcomingCommitmentsAfterPurchase,
    breakdown: {
      debtAndObligations: Math.max(0, toNumber(snapshot.debtUpcoming)),
      savingsGoals: Math.max(0, toNumber(snapshot.savingsGoalUpcoming)),
      moneySchedule: Math.max(0, toNumber(snapshot.moneyScheduleUpcoming)),
      otherScheduledEvents: Math.max(0, toNumber(snapshot.otherScheduledUpcoming)),
    },
    moneyLentUnavailable: Math.max(0, toNumber(snapshot.moneyLentUnavailable)),
    savingsProtected: Math.max(0, toNumber(snapshot.savingsProtected)),
    emergencyProtected,
    dataSource: "canonical-orb-means-snapshot",
  };
}''',
)
replace_between(
    buy_check,
    "function formatClaraMetricImpactLine(impact = {}) {",
    "\n\nexport {",
    '''function formatClaraMetricImpactLine(impact = {}) {
  if (!impact?.purchaseSimulationApplied) return "";
  const price = Math.max(0, Number(impact.purchasePrice) || 0);
  const accounted = Math.max(0, Number(impact.alreadyAccountedAmount) || 0);
  const incremental = Number(impact.incrementalImpact) || 0;
  const sourceLabel = impact.impactSource === "money_schedule_routine" || impact.impactSource === "money_schedule_event"
    ? "Money Schedule"
    : "your plan";

  if (impact.projectedFullyCovered) {
    if (!(accounted > 0)) {
      return `That ${peso(price)} would leave your remaining commitments fully covered.`;
    }
    if (Math.abs(incremental) < 0.005) {
      return `You already planned ${peso(accounted)} for this in ${sourceLabel}. After buying it at ${peso(price)}, your remaining commitments would be fully covered.`;
    }
    if (incremental > 0) {
      return `You planned ${peso(accounted)} for this, so only the extra ${peso(incremental)} is new spending. Your remaining commitments would still be fully covered.`;
    }
    return `You planned ${peso(accounted)} for this, and at ${peso(price)} you're ${peso(Math.abs(incremental))} under plan. Your remaining commitments would be fully covered.`;
  }

  if (impact?.projectedScoreAfterPurchase == null) return "";
  const before = impact.currentScore != null && Number.isFinite(Number(impact.currentScore))
    ? Number(impact.currentScore)
    : null;
  const after = Number(impact.projectedScoreAfterPurchase);
  const movement = before === null
    ? `put your Means Score at ${after}`
    : after < before
      ? `bring your Means Score from ${before} down to ${after}`
      : after > before
        ? `move your Means Score from ${before} up to ${after}`
        : `keep your Means Score at ${after}`;

  // Financial math stays deterministic, but the user should hear it as
  // normal CLARA conversation — never as telemetry or a diagnostic row.
  if (!(accounted > 0)) {
    return `That ${peso(price)} would ${movement}.`;
  }
  if (Math.abs(incremental) < 0.005) {
    return `You already planned ${peso(accounted)} for this in ${sourceLabel}, so buying it at ${peso(price)} would ${movement}.`;
  }
  if (incremental > 0) {
    return `You planned ${peso(accounted)} for this, so only the extra ${peso(incremental)} is new spending. That would ${movement}.`;
  }
  return `You planned ${peso(accounted)} for this, and at ${peso(price)} you're ${peso(Math.abs(incremental))} under plan. That would ${movement}.`;
}''',
)

# 4) Regression coverage for the zero state and uncapped positive denominator.
means_test = "tests/means-score-context-baseline-regression.test.mjs"
replace_once(
    means_test,
    '''test("zero remaining requirement has a safe finite fallback", () => {\n  assert.equal(calculateMeansScoreState({ financialRunway: 12000, upcoming: 0 }).score, 100);\n  assert.equal(calculateMeansScoreState({ financialRunway: 0, upcoming: 0 }).score, 0);\n});''',
    '''test("zero remaining requirement becomes Fully Covered instead of a fabricated score", () => {\n  const withMoney = calculateMeansScoreState({ financialRunway: 12000, upcoming: 0 });\n  assert.equal(withMoney.score, null);\n  assert.equal(withMoney.fullyCovered, true);\n  assert.equal(withMoney.coverageState, "fully_covered");\n  assert.equal(withMoney.scoreRoom, 12000);\n\n  const noMoney = calculateMeansScoreState({ financialRunway: 0, upcoming: 0 });\n  assert.equal(noMoney.score, null);\n  assert.equal(noMoney.fullyCovered, true);\n});\n\ntest("positive remaining requirements remain mathematically uncapped", () => {\n  const state = calculateMeansScoreState({ financialRunway: 5000, upcoming: 1 });\n  assert.equal(state.score, 500000);\n  assert.equal(state.fullyCovered, false);\n});''',
)
replace_once(
    means_test,
    '  assert.match(runtime, /"clara:schedule:create-event"/);',
    '  assert.match(runtime, /"clara:schedule:create-event"/);\n  assert.match(runtime, /Fully Covered/);',
)

buy_test = "tests/buy-check-metric-impact.test.mjs"
with Path(buy_test).open("a") as file:
    file.write('''\n\ntest("zero remaining runway stays Fully Covered without inventing a numeric score", () => {\n  const covered = {\n    ...snapshot,\n    score: null,\n    fullyCovered: true,\n    availableNow: 5000,\n    financialRunway: 5000,\n    upcoming: 0,\n  };\n  const impact = simulateMeansPurchaseImpact({ snapshot: covered, purchasePrice: 1000 });\n  assert.equal(impact.currentScore, null);\n  assert.equal(impact.currentStatus, "Fully Covered");\n  assert.equal(impact.projectedScoreAfterPurchase, null);\n  assert.equal(impact.projectedFullyCovered, true);\n  assert.equal(impact.projectedStatus, "Fully Covered");\n  assert.match(formatClaraMetricImpactLine(impact), /fully covered/i);\n});\n''')

print("Applied Means Score Fully Covered zero-state patch.")
