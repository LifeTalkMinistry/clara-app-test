import { getIncomeSources } from "@/lib/incomeHubRepository";
import { getDebtObligations } from "@/lib/debtObligationStore";
import {
  buildCanonicalMeansSnapshot,
  buildMeansDebtOccurrences,
  buildMeansMoneyScheduleOccurrences,
  calculateMeansOutstandingDebtCommitments,
  resolveMeansMasterPayCycle,
} from "@/lib/clara-means-authority";
import {
  financialDateKey,
  isFinancialOccurrenceOnOrAfterCreation,
  normalizeFinancialDateKey,
} from "@/lib/clara-financial-day";
import { filterScheduleOwnedEvents } from "@/lib/scheduleEventOwnership";
import {
  calculateUpcomingCoverageState,
  isOccurrenceInPaycheckWindow,
  selectConservativeMeansScore,
} from "@/lib/clara-means-next-cycle-coverage";

const CALENDAR_STORAGE_PREFIX = "clara_schedule_events_v2";

const clean = (value) => String(value ?? "").trim();
const lower = (value) => clean(value).toLowerCase();
const nonNegative = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

function ownerIdentity(profile = {}) {
  return clean(
    profile?.id ||
      profile?.user_id ||
      profile?.userId ||
      profile?.email ||
      profile?.user?.id ||
      profile?.user?.email ||
      "local-user"
  ) || "local-user";
}

function dateAtFinancialNoon(dateKey) {
  const normalized = normalizeFinancialDateKey(dateKey);
  if (!normalized) return null;
  const date = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stableMinimumAmount(source = {}) {
  if (lower(source?.stability) !== "stable") return 0;
  return nonNegative(
    source?.minimumStableIncome ??
      source?.minimum_stable_income ??
      source?.minimumExpectedIncome ??
      source?.minimum_expected_income ??
      source?.expectedAmount ??
      source?.expected_amount
  );
}

function lowestExpectedIncomeForPayday(incomeSources = [], payCycle = null) {
  const sourceId = clean(payCycle?.sourceId);
  if (!sourceId) return 0;
  const source = (Array.isArray(incomeSources) ? incomeSources : []).find(
    (entry) => clean(entry?.id) === sourceId
  );
  return source ? stableMinimumAmount(source) : 0;
}

function readCalendarEvents(owner) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(`${CALENDAR_STORAGE_PREFIX}_${owner}`) || "[]"
    );
    return filterScheduleOwnedEvents(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function calendarEventOutAmount(event = {}) {
  const rows = Array.isArray(event?.impactBreakdown)
    ? event.impactBreakdown
    : Array.isArray(event?.impact_breakdown)
      ? event.impact_breakdown
      : [];

  if (rows.length) {
    return rows.reduce((sum, row) => {
      const direction = lower(row?.direction || "out");
      const pending = row?.pendingAmount === true || row?.pending_amount === true;
      return direction === "out" && !pending
        ? sum + nonNegative(row?.amount)
        : sum;
    }, 0);
  }

  const explicitlyAffectsMoney = event?.affectsMoney === true || event?.affects_money === true;
  const direction = lower(event?.direction || "out");
  return explicitlyAffectsMoney && direction === "out"
    ? nonNegative(event?.amount ?? event?.cost)
    : 0;
}

export function buildMeansCalendarEventOccurrences(owner, cycleStart, cycleEnd) {
  return readCalendarEvents(owner)
    .map((event, index) => {
      const date = normalizeFinancialDateKey(event?.date);
      if (!isOccurrenceInPaycheckWindow(date, cycleStart, cycleEnd)) return null;
      if (!isFinancialOccurrenceOnOrAfterCreation(event, date)) return null;
      const amount = calendarEventOutAmount(event);
      if (!(amount > 0)) return null;
      const sourceId = clean(event?.id) || `calendar-event-${index}`;
      const requirementKey = `calendar-event:${sourceId}:${date}`;
      return {
        id: requirementKey,
        requirementKey,
        sourceId,
        date,
        kind: "calendar_event",
        sourceType: "calendar_event",
        amount,
        source: "calendar_event",
      };
    })
    .filter(Boolean);
}

function outstandingOccurrenceTotal(occurrences = []) {
  return (Array.isArray(occurrences) ? occurrences : []).reduce((sum, occurrence) => {
    const planned = nonNegative(occurrence?.amount ?? occurrence?.plannedAmount);
    const fulfilled = nonNegative(
      occurrence?.actualPaid ?? occurrence?.actual_paid ?? occurrence?.fulfilledAmount
    );
    return sum + Math.max(planned - fulfilled, 0);
  }, 0);
}

export async function buildRollingMeansSnapshot({ profile = {}, now = new Date() } = {}) {
  const current = await buildCanonicalMeansSnapshot({ profile, now });
  if (!current) return null;

  const owner = ownerIdentity(profile);
  const incomeSources = await getIncomeSources(owner).catch(() => []);
  const nextPayday = normalizeFinancialDateKey(current?.cycleEndDate);
  const nextCycleNow = dateAtFinancialNoon(nextPayday);
  const upcomingPayCycle = nextCycleNow
    ? resolveMeansMasterPayCycle(incomeSources, nextCycleNow)
    : null;

  const upcomingCycleStartDate = normalizeFinancialDateKey(upcomingPayCycle?.start);
  const upcomingCycleEndDate = normalizeFinancialDateKey(upcomingPayCycle?.end);
  const upcomingWindowResolved = Boolean(
    upcomingCycleStartDate &&
      upcomingCycleEndDate &&
      upcomingCycleStartDate === nextPayday &&
      upcomingCycleStartDate < upcomingCycleEndDate
  );

  if (!upcomingWindowResolved) {
    return {
      ...current,
      currentCycleMeansScore: current.score,
      currentCycleRawMeansScore: current.rawMeansScore,
      currentRealRoom: current.wallBill,
      meansScoreLimitingWindow: "current",
      upcomingCycleResolved: false,
      upcomingCycleState: "following_payday_unresolved",
      upcomingCycleStartDate: nextPayday || null,
      upcomingCycleEndDate: null,
      followingPaydayDate: null,
      lowestExpectedIncome: 0,
      upcomingCarryover: current.wallBill,
      upcomingProjectedResources: current.wallBill,
      upcomingCycleRequirement: 0,
      upcomingDebtRequirement: 0,
      upcomingMoneyScheduleRequirement: 0,
      upcomingCalendarEventRequirement: 0,
      upcomingOtherRequirement: 0,
      upcomingCoverageRawScore: null,
      upcomingCoverageScore: null,
      upcomingCoverageState: "following_payday_unresolved",
      upcomingShortfall: 0,
      upcomingSurplus: 0,
    };
  }

  const debtRecords = await getDebtObligations(owner).catch(() => []);
  const debtOccurrences = buildMeansDebtOccurrences(
    debtRecords,
    upcomingCycleStartDate,
    upcomingCycleEndDate
  );
  const moneyScheduleOccurrences = buildMeansMoneyScheduleOccurrences(
    owner,
    upcomingCycleStartDate,
    upcomingCycleEndDate
  );
  const calendarEventOccurrences = buildMeansCalendarEventOccurrences(
    owner,
    upcomingCycleStartDate,
    upcomingCycleEndDate
  );

  const upcomingDebtRequirement = calculateMeansOutstandingDebtCommitments(debtOccurrences);
  const upcomingMoneyScheduleRequirement = outstandingOccurrenceTotal(moneyScheduleOccurrences);
  const upcomingCalendarEventRequirement = outstandingOccurrenceTotal(calendarEventOccurrences);
  const upcomingOtherRequirement = 0;
  const upcomingCycleRequirement =
    upcomingDebtRequirement +
    upcomingMoneyScheduleRequirement +
    upcomingCalendarEventRequirement +
    upcomingOtherRequirement;

  const lowestExpectedIncome = lowestExpectedIncomeForPayday(
    incomeSources,
    upcomingPayCycle
  );
  const currentRealRoom = Number(current?.wallBill || 0);
  const coverage = calculateUpcomingCoverageState({
    currentRealRoom,
    lowestExpectedIncome,
    upcomingCycleRequirement,
  });
  const conservative = selectConservativeMeansScore({
    currentCycleRawScore: current?.rawMeansScore,
    upcomingCoverageRawScore: coverage.rawScore,
  });

  return {
    ...current,
    score: conservative.score,
    meansScore: conservative.score,
    rawMeansScore: conservative.rawScore,
    currentCycleMeansScore: current.score,
    currentCycleRawMeansScore: current.rawMeansScore,
    currentRealRoom,
    meansScoreLimitingWindow: conservative.limitingWindow,
    upcomingCycleResolved: true,
    upcomingCycleState: coverage.coverageState,
    upcomingCycleStartDate,
    upcomingCycleEndDate,
    followingPaydayDate: upcomingCycleEndDate,
    lowestExpectedIncome,
    upcomingCarryover: coverage.carryover,
    upcomingProjectedResources: coverage.projectedResources,
    upcomingCycleRequirement,
    upcomingDebtRequirement,
    upcomingMoneyScheduleRequirement,
    upcomingCalendarEventRequirement,
    upcomingOtherRequirement,
    upcomingCoverageRawScore: coverage.rawScore,
    upcomingCoverageScore: coverage.score,
    upcomingCoverageState: coverage.coverageState,
    upcomingShortfall: coverage.shortfall,
    upcomingSurplus: coverage.surplus,
    upcomingDebtOccurrences: debtOccurrences,
    upcomingMoneyScheduleOccurrences: moneyScheduleOccurrences,
    upcomingCalendarEventOccurrences: calendarEventOccurrences,
    rollingMeansCapturedForDate: financialDateKey(now),
  };
}
