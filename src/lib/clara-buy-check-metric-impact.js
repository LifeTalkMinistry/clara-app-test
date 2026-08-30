import {
  getClaraMoneyScheduleStorageKey,
  readClaraMoneyRoutine,
} from "./clara-money-schedule-repository.js";
import {
  addFinancialDays,
  financialDateKey,
  financialWeekdayIndex,
  normalizeFinancialDateKey,
} from "./clara-financial-day.js";
import { matchMeansOutflowToRequirement } from "./clara-means-cycle-baseline.js";

const STOP_WORDS = new Set([
  "a", "an", "and", "buy", "buying", "for", "get", "i", "item", "my", "of", "pay",
  "purchase", "spend", "the", "this", "to", "want", "with",
]);

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeToken(token = "") {
  let value = String(token).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (value.length > 4 && value.endsWith("ies")) value = `${value.slice(0, -3)}y`;
  else if (value.length > 4 && value.endsWith("s")) value = value.slice(0, -1);
  return value;
}

function words(value = "") {
  return clean(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(normalizeToken)
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
}

function normalizedPhrase(value = "") {
  return words(value).join(" ");
}

function matchScore(item = "", candidate = "") {
  const leftPhrase = normalizedPhrase(item);
  const rightPhrase = normalizedPhrase(candidate);
  if (!leftPhrase || !rightPhrase) return 0;
  if (leftPhrase === rightPhrase) return 1;
  if (leftPhrase.includes(rightPhrase) || rightPhrase.includes(leftPhrase)) return 0.94;

  const left = new Set(leftPhrase.split(" "));
  const right = new Set(rightPhrase.split(" "));
  const intersection = [...left].filter((token) => right.has(token)).length;
  if (!intersection) return 0;
  const overlap = intersection / Math.max(left.size, right.size);
  return overlap >= 0.75 ? 0.82 : overlap >= 0.5 && intersection >= 2 ? 0.74 : 0;
}

function ownerFromContext(context = {}) {
  return (
    context?.user ||
    context?.userId ||
    context?.user_id ||
    context?.profile?.id ||
    context?.profile?.email ||
    context?.localUserId ||
    context?.local_user_id ||
    "local-user"
  );
}

function planRequirements(snapshot = {}) {
  return Array.isArray(snapshot?.planRequirements)
    ? snapshot.planRequirements
    : Array.isArray(snapshot?.baselineContributions)
      ? snapshot.baselineContributions
      : [];
}

function requirementIdentity(requirement = {}) {
  return clean(
    requirement?.requirementKey ||
      requirement?.requirement_key ||
      requirement?.id
  );
}

function requirementSourceId(requirement = {}) {
  return clean(requirement?.sourceId || requirement?.source_id);
}

function requirementDate(requirement = {}) {
  return normalizeFinancialDateKey(
    requirement?.date || requirement?.dueDate || requirement?.due_date
  );
}

function resolveCanonicalRequirement(candidate = null, snapshot = {}) {
  if (!candidate) return null;
  const requirements = planRequirements(snapshot);
  if (!requirements.length) return null;

  const suppliedKey = clean(candidate?.requirementKey);
  if (suppliedKey) {
    const exact = requirements.find(
      (requirement) => requirementIdentity(requirement) === suppliedKey
    );
    if (exact) return exact;
  }

  const sourceId = clean(candidate?.sourceId);
  const date = normalizeFinancialDateKey(candidate?.targetDate);
  const sourceType = clean(candidate?.sourceType || candidate?.kind).toLowerCase();
  if (!sourceId) return null;

  const sameSource = requirements.filter((requirement) => {
    if (requirementSourceId(requirement) !== sourceId) return false;
    if (sourceType) {
      const requirementType = clean(
        requirement?.sourceType || requirement?.source_type || requirement?.kind
      ).toLowerCase();
      if (requirementType && requirementType !== sourceType) return false;
    }
    return true;
  });

  if (date) {
    const exactDate = sameSource.find(
      (requirement) => requirementDate(requirement) === date
    );
    if (exactDate) return exactDate;
  }

  return sameSource.length === 1 ? sameSource[0] : null;
}

function routineCandidates({ item, assistantContext, snapshot }) {
  if (typeof window === "undefined") return [];
  let routine = assistantContext?.moneyRoutine || assistantContext?.moneyScheduleRoutine || null;
  if (!routine) {
    try {
      routine = readClaraMoneyRoutine(ownerFromContext(assistantContext));
    } catch {
      routine = null;
    }
  }
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return [];

  const today = financialDateKey();
  const horizon = normalizeFinancialDateKey(snapshot?.cycleEndDate || snapshot?.horizonDate) ||
    addFinancialDays(today, 31);
  const candidates = [];
  const routineId = clean(routine?.id) || "routine";

  for (let cursor = today; cursor && cursor < horizon; cursor = addFinancialDays(cursor, 1)) {
    const weekdayIndex = financialWeekdayIndex(cursor);
    const day = routine.days.find(
      (entry) => Number(entry?.weekdayIndex ?? entry?.weekday_index) === weekdayIndex
    );
    if (!day || !Array.isArray(day.items)) continue;

    day.items.forEach((entry) => {
      const label = clean(entry?.label || entry?.title || entry?.name || entry?.category);
      const score = matchScore(item, label);
      const centavos = Number(entry?.amountCentavos ?? entry?.amount_centavos);
      const amount = Number.isFinite(centavos)
        ? Math.max(0, centavos) / 100
        : Math.max(0, toNumber(entry?.amount));
      if (score < 0.72 || !(amount > 0)) return;
      candidates.push({
        source: "money_schedule_routine",
        sourceType: "money_schedule",
        sourceId: routineId,
        label,
        amount,
        matchScore: score,
        targetDate: cursor,
        impactKey: clean(entry?.id) || `routine:${cursor}:${normalizedPhrase(label)}`,
        offsetUntil: horizon,
        // Discovery remains fuzzy. This key is only a canonical lookup hint; it is not
        // authoritative until it is found in snapshot.planRequirements and matched by
        // matchMeansOutflowToRequirement().
        authoritativeMatch: false,
        requirementKey: `money-routine:${routineId}:${cursor}`,
      });
    });
  }
  return candidates;
}

function scheduledEventCandidates({ item, assistantContext, snapshot }) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  let events = [];
  const supplied =
    assistantContext?.scheduleEvents ||
    assistantContext?.moneyScheduleEvents ||
    assistantContext?.calendarEvents ||
    assistantContext?.schedule ||
    null;
  if (Array.isArray(supplied)) events = supplied;
  else {
    try {
      const key = getClaraMoneyScheduleStorageKey(ownerFromContext(assistantContext));
      const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
      events = Array.isArray(parsed) ? parsed : [];
    } catch {
      events = [];
    }
  }

  const today = financialDateKey();
  const horizon = normalizeFinancialDateKey(
    snapshot?.cycleEndDate || snapshot?.horizonDate || "9999-12-31"
  ) || "9999-12-31";
  return events.flatMap((event) => {
    const date = normalizeFinancialDateKey(event?.date || event?.start);
    const direction = clean(event?.direction || "out").toLowerCase();
    const amount = Math.max(0, toNumber(event?.amount ?? event?.cost));
    const label = clean(event?.title || event?.name || event?.note || event?.type);
    const score = matchScore(item, `${label} ${event?.note || ""}`);
    if (!date || date < today || date >= horizon || direction !== "out" || event?.affectsMoney === false) {
      return [];
    }
    if (!(amount > 0) || score < 0.72) return [];
    const eventId = clean(event?.id);
    return [{
      source: "money_schedule_event",
      sourceType: "money_schedule",
      sourceId: eventId,
      label,
      amount,
      matchScore: score,
      targetDate: date,
      impactKey: eventId || `event:${date}:${normalizedPhrase(label)}`,
      offsetUntil: date,
      // Fuzzy discovery is never fulfillment authority. The key below must resolve to
      // a live canonical plan requirement before any matched amount is protected.
      authoritativeMatch: false,
      requirementKey: eventId ? `money-schedule:${eventId}:${date}` : null,
    }];
  });
}

function debtCandidates({ item, assistantContext, snapshot }) {
  const supplied =
    assistantContext?.debtObligations ||
    assistantContext?.obligations ||
    assistantContext?.debts ||
    assistantContext?.debtRecords ||
    [];
  if (!Array.isArray(supplied) || !supplied.length) return [];

  const requirements = planRequirements(snapshot).filter((requirement) =>
    clean(requirement?.sourceType || requirement?.source_type || requirement?.kind)
      .toLowerCase() === "debt"
  );

  return supplied.flatMap((record) => {
    const sourceId = clean(
      record?.id || record?.debtId || record?.debt_id || record?.obligationId || record?.obligation_id
    );
    const label = clean(
      record?.title || record?.name || record?.label || record?.creditor ||
      record?.debtName || record?.debt_name || record?.description
    );
    const score = matchScore(item, label);
    if (!sourceId || !label || score < 0.72) return [];

    return requirements
      .filter((requirement) =>
        requirementSourceId(requirement) === sourceId &&
        toNumber(requirement?.remainingAmount ?? requirement?.remaining_amount ?? requirement?.amount) > 0
      )
      .map((requirement) => ({
        source: "debt_obligation",
        sourceType: "debt",
        sourceId,
        label,
        amount: toNumber(
          requirement?.remainingAmount ?? requirement?.remaining_amount ?? requirement?.amount
        ),
        matchScore: score,
        targetDate: requirementDate(requirement),
        impactKey: sourceId,
        offsetUntil: requirementDate(requirement),
        authoritativeMatch: false,
        requirementKey: requirementIdentity(requirement),
      }));
  });
}

function choosePlannedCandidate(args = {}) {
  const supplied = Array.isArray(args.plannedCandidates) ? args.plannedCandidates : null;
  const candidates = supplied || [
    ...routineCandidates(args),
    ...scheduledEventCandidates(args),
    ...debtCandidates(args),
  ];
  return candidates
    .filter((candidate) => Number(candidate?.amount) > 0)
    .sort((left, right) =>
      Number(right.matchScore || 0) - Number(left.matchScore || 0) ||
      String(left.targetDate || "").localeCompare(String(right.targetDate || ""))
    )[0] || null;
}

function statusForScore(score) {
  if (!Number.isFinite(Number(score))) return null;
  const value = Number(score);
  if (value >= 10000) return "Diamond";
  if (value >= 5000) return "Gold";
  if (value >= 2000) return "Silver";
  if (value >= 1000) return "Bronze";
  if (value >= 500) return "Vanguard";
  if (value >= 400) return "3 Cycles Ahead";
  if (value >= 300) return "2 Cycles Ahead";
  if (value >= 200) return "1 Cycle Ahead";
  if (value >= 101) return "Below Your Means";
  if (value === 100) return "Within Your Means";
  if (value >= 1) return "Above Your Means";
  return "In Deficit";
}

function simulateMeansPurchaseImpact({
  snapshot = {},
  purchasePrice = 0,
  alreadyAccountedAmount = 0,
  matchedPlannedAmount = null,
  authoritativePlannedMatch = false,
  impactSource = "unplanned",
  impactLabel = "",
  impactKey = "",
  requirementKey = null,
  targetDate = null,
  offsetUntil = null,
} = {}) {
  const price = Math.max(0, toNumber(purchasePrice));
  if (!(price > 0) || !snapshot || typeof snapshot !== "object") return null;

  const currentScore = Number(snapshot.score);
  const cycle100Anchor = Math.max(
    0,
    toNumber(snapshot.cycle100Anchor ?? snapshot.requiredRunway)
  );
  const availableNow = toNumber(
    snapshot.availableWalletMoney ?? snapshot.availableNow
  );
  const remainingPlannedSpending = Math.max(
    0,
    toNumber(
      snapshot.remainingPlannedSpending ??
        snapshot.projectedSpending ??
        snapshot.upcoming
    )
  );
  const currentWallBill = Number.isFinite(Number(snapshot.wallBill))
    ? Number(snapshot.wallBill)
    : Number.isFinite(Number(snapshot.scoreRoom))
      ? Number(snapshot.scoreRoom)
      : availableNow - remainingPlannedSpending;

  const accounted = Math.max(0, toNumber(alreadyAccountedAmount));
  const hasRequirementIdentity = Boolean(clean(requirementKey));
  const explicitMatch = matchedPlannedAmount == null
    ? authoritativePlannedMatch && hasRequirementIdentity
      ? accounted
      : 0
    : authoritativePlannedMatch && hasRequirementIdentity
      ? Math.max(0, toNumber(matchedPlannedAmount))
      : 0;
  const matched = Math.min(price, remainingPlannedSpending, explicitMatch);
  const unmatched = Math.max(price - matched, 0);

  const availableAfterPurchase = availableNow - price;
  const remainingPlannedSpendingAfterPurchase = Math.max(
    remainingPlannedSpending - matched,
    0
  );
  const projectedWallBill =
    availableAfterPurchase - remainingPlannedSpendingAfterPurchase;
  const projectedRawScore = cycle100Anchor > 0
    ? 100 + ((projectedWallBill / cycle100Anchor) * 100)
    : null;
  const projectedScoreAfterPurchase = projectedRawScore == null
    ? null
    : Math.round(projectedRawScore);
  const scoreChange = Number.isFinite(currentScore) && projectedScoreAfterPurchase != null
    ? projectedScoreAfterPurchase - currentScore
    : null;

  return {
    protectionLine: 100,
    purchasePrice: price,
    alreadyAccountedAmount: accounted,
    matchedPlannedAmount: matched,
    unmatchedAmount: unmatched,
    incrementalImpact: unmatched,
    authoritativePlannedMatch: matched > 0 && hasRequirementIdentity,
    impactSource,
    impactLabel,
    impactKey,
    requirementKey: matched > 0 && hasRequirementIdentity ? clean(requirementKey) : null,
    targetDate,
    offsetUntil,
    currentScore: Number.isFinite(currentScore) ? currentScore : null,
    projectedScoreAfterPurchase,
    projectedRawScore,
    scoreChange,
    currentStatus: statusForScore(currentScore),
    projectedStatus: statusForScore(projectedScoreAfterPurchase),
    cycle100Anchor,
    requiredRunway: cycle100Anchor,
    currentWallBill,
    projectedWallBill,
    currentScoreRoom: currentWallBill,
    projectedScoreRoom: projectedWallBill,
    currentRoomUntilPayday: currentWallBill,
    projectedRoomAfterPurchase: projectedWallBill,
    roomChange: projectedWallBill - currentWallBill,
    purchaseSimulationApplied: true,
    crossesProtectionLine:
      Number.isFinite(currentScore) &&
      projectedScoreAfterPurchase != null &&
      currentScore >= 100 &&
      projectedScoreAfterPurchase < 100,
    cycleStartDate: snapshot.cycleStartDate || null,
    nextPayday: snapshot.cycleEndDate || snapshot.horizonDate || null,
    spendableMoney: availableNow,
    availableAfterPurchase,
    remainingPlannedSpending,
    remainingPlannedSpendingAfterPurchase,
    upcomingCommitments: remainingPlannedSpending,
    upcomingCommitmentsAfterPurchase: remainingPlannedSpendingAfterPurchase,
    breakdown: {
      debtAndObligations: Math.max(0, toNumber(snapshot.debtUpcoming)),
      savingsGoals: Math.max(0, toNumber(snapshot.savingsGoalUpcoming)),
      moneySchedule: Math.max(0, toNumber(snapshot.moneyScheduleUpcoming)),
      otherScheduledEvents: Math.max(0, toNumber(snapshot.otherScheduledUpcoming)),
    },
    moneyLentUnavailable: Math.max(0, toNumber(snapshot.moneyLentUnavailable)),
    savingsProtected: Math.max(0, toNumber(snapshot.savingsProtected)),
    emergencyProtected: Math.max(0, toNumber(snapshot.emergencyProtected)),
    dataSource: "canonical-orb-means-snapshot",
  };
}

function buildClaraPurchaseMetricImpact({
  purchasePrice = 0,
  item = "",
  assistantContext = {},
  snapshot: suppliedSnapshot = null,
  plannedCandidates = null,
} = {}) {
  const snapshot = suppliedSnapshot ||
    (typeof window !== "undefined" ? window.__claraCanonicalMeansSnapshot__ : null);
  if (!snapshot || typeof snapshot !== "object" || !Object.keys(snapshot).length) return null;

  const candidate = choosePlannedCandidate({ item, assistantContext, snapshot, plannedCandidates });
  const requirement = resolveCanonicalRequirement(candidate, snapshot);
  const requirementKey = requirementIdentity(requirement);
  const match = matchMeansOutflowToRequirement({
    actualOutflowAmount: purchasePrice,
    requirement,
    requirementKey,
  });
  const authoritativeMatch = Boolean(
    requirementKey && Number(match?.matchedPlannedAmount || 0) > 0
  );

  return simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice,
    alreadyAccountedAmount: candidate?.amount || 0,
    matchedPlannedAmount: match?.matchedPlannedAmount || 0,
    authoritativePlannedMatch: authoritativeMatch,
    impactSource: authoritativeMatch
      ? clean(requirement?.sourceType || requirement?.source_type || candidate?.source || "planned")
      : "unplanned",
    impactLabel: candidate?.label || "",
    impactKey: candidate?.impactKey || "",
    requirementKey: authoritativeMatch ? requirementKey : null,
    targetDate: requirementDate(requirement) || candidate?.targetDate || null,
    offsetUntil: candidate?.offsetUntil || requirementDate(requirement) || null,
  });
}

function peso(value = 0) {
  const amount = Math.abs(Number(value) || 0);
  return `₱${amount.toLocaleString("en-PH", {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })}`;
}

function formatClaraMetricImpactLine(impact = {}) {
  if (!impact?.purchaseSimulationApplied) return "";
  const before = Number.isFinite(Number(impact.currentScore)) ? Number(impact.currentScore) : null;
  const after = Number.isFinite(Number(impact.projectedScoreAfterPurchase))
    ? Number(impact.projectedScoreAfterPurchase)
    : null;
  const price = Math.max(0, Number(impact.purchasePrice) || 0);
  const matched = Math.max(0, Number(impact.matchedPlannedAmount) || 0);
  const unmatched = Math.max(0, Number(impact.unmatchedAmount) || 0);

  if (after == null) {
    return `That ${peso(price)} can be checked against your Wallet and remaining plan, but your cycle has no resolved 100 anchor yet.`;
  }

  const movement = before === null
    ? `put your Means Score at ${after}`
    : after < before
      ? `bring your Means Score from ${before} down to ${after}`
      : after > before
        ? `move your Means Score from ${before} up to ${after}`
        : `keep your Means Score at ${after}`;

  if (!(matched > 0)) {
    return `That ${peso(price)} is outside a confirmed planned requirement, so it would ${movement}.`;
  }

  if (!(unmatched > 0)) {
    return `${peso(matched)} is confirmed against your plan. Wallet and Remaining Plan fall together, so it would ${movement}.`;
  }

  return `${peso(matched)} is confirmed against your plan and protected. Only the ${peso(unmatched)} outside that match reduces your real room, so it would ${movement}.`;
}

export {
  buildClaraPurchaseMetricImpact,
  formatClaraMetricImpactLine,
  matchScore,
  simulateMeansPurchaseImpact,
};
