import {
  getClaraMoneyScheduleStorageKey,
  readClaraMoneyRoutine,
} from "./clara-money-schedule-repository.js";

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

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function parseDateKey(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
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

  const today = new Date();
  const horizon = parseDateKey(snapshot?.cycleEndDate || snapshot?.horizonDate) || addDays(today, 31);
  const candidates = [];
  for (let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate()); cursor < horizon; cursor = addDays(cursor, 1)) {
    const day = routine.days.find((entry) => Number(entry?.weekdayIndex ?? entry?.weekday_index) === cursor.getDay());
    if (!day || !Array.isArray(day.items)) continue;
    day.items.forEach((entry) => {
      const label = clean(entry?.label || entry?.title || entry?.name || entry?.category);
      const score = matchScore(item, label);
      const centavos = Number(entry?.amountCentavos ?? entry?.amount_centavos);
      const amount = Number.isFinite(centavos) ? Math.max(0, centavos) / 100 : Math.max(0, toNumber(entry?.amount));
      if (score < 0.72 || !(amount > 0)) return;
      candidates.push({
        source: "money_schedule_routine",
        label,
        amount,
        matchScore: score,
        targetDate: localDateKey(cursor),
        impactKey: clean(entry?.id) || `routine:${localDateKey(cursor)}:${normalizedPhrase(label)}`,
        offsetUntil: snapshot?.cycleEndDate || snapshot?.horizonDate || localDateKey(horizon),
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

  const today = localDateKey();
  const horizon = String(snapshot?.cycleEndDate || snapshot?.horizonDate || "9999-12-31").slice(0, 10);
  return events.flatMap((event) => {
    const date = String(event?.date || event?.start || "").slice(0, 10);
    const direction = clean(event?.direction || "out").toLowerCase();
    const amount = Math.max(0, toNumber(event?.amount ?? event?.cost));
    const label = clean(event?.title || event?.name || event?.note || event?.type);
    const score = matchScore(item, `${label} ${event?.note || ""}`);
    if (!date || date < today || date >= horizon || direction !== "out" || event?.affectsMoney === false) return [];
    if (!(amount > 0) || score < 0.72) return [];
    return [{
      source: "money_schedule_event",
      label,
      amount,
      matchScore: score,
      targetDate: date,
      impactKey: clean(event?.id) || `event:${date}:${normalizedPhrase(label)}`,
      offsetUntil: date,
    }];
  });
}

function choosePlannedCandidate(args = {}) {
  const supplied = Array.isArray(args.plannedCandidates) ? args.plannedCandidates : null;
  const candidates = supplied || [
    ...routineCandidates(args),
    ...scheduledEventCandidates(args),
  ];
  return candidates
    .filter((candidate) => Number(candidate?.amount) > 0)
    .sort((left, right) =>
      Number(right.matchScore || 0) - Number(left.matchScore || 0) ||
      String(left.targetDate || "").localeCompare(String(right.targetDate || ""))
    )[0] || null;
}

function statusForScore(score) {
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

function simulateMeansPurchaseImpact({
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
}

function buildClaraPurchaseMetricImpact({ purchasePrice = 0, item = "", assistantContext = {}, snapshot: suppliedSnapshot = null, plannedCandidates = null } = {}) {
  const snapshot = suppliedSnapshot || (typeof window !== "undefined" ? window.__claraCanonicalMeansSnapshot__ : null);
  if (!snapshot || typeof snapshot !== "object" || !Object.keys(snapshot).length) return null;
  const candidate = choosePlannedCandidate({ item, assistantContext, snapshot, plannedCandidates });
  return simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice,
    alreadyAccountedAmount: candidate?.amount || 0,
    impactSource: candidate?.source || "unplanned",
    impactLabel: candidate?.label || "",
    impactKey: candidate?.impactKey || "",
    targetDate: candidate?.targetDate || null,
    offsetUntil: candidate?.offsetUntil || null,
  });
}

function peso(value = 0) {
  const amount = Math.abs(Number(value) || 0);
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`;
}

function signedPoints(value = 0) {
  const amount = Number(value) || 0;
  if (amount > 0) return `+${amount}`;
  if (amount < 0) return `−${Math.abs(amount)}`;
  return "0";
}

function formatClaraMetricImpactLine(impact = {}) {
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
}

export {
  buildClaraPurchaseMetricImpact,
  formatClaraMetricImpactLine,
  matchScore,
  simulateMeansPurchaseImpact,
};
