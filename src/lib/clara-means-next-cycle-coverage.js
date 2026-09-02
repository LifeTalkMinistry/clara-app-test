const nonNegativeMoney = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const signedMoney = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateKey = (value) => String(value ?? "").trim().slice(0, 10);

export function isOccurrenceInPaycheckWindow(date, cycleStart, cycleEnd) {
  const occurrenceDate = dateKey(date);
  const start = dateKey(cycleStart);
  const end = dateKey(cycleEnd);
  return Boolean(
    occurrenceDate &&
      start &&
      end &&
      start < end &&
      occurrenceDate >= start &&
      occurrenceDate < end
  );
}

export function calculateUpcomingCoverageState({
  currentRealRoom = 0,
  lowestExpectedIncome = 0,
  upcomingCycleRequirement = 0,
} = {}) {
  const carryover = signedMoney(currentRealRoom);
  const expectedIncome = nonNegativeMoney(lowestExpectedIncome);
  const requirement = nonNegativeMoney(upcomingCycleRequirement);
  const projectedResources = carryover + expectedIncome;

  if (!(requirement > 0)) {
    return {
      carryover,
      lowestExpectedIncome: expectedIncome,
      projectedResources,
      upcomingCycleRequirement: 0,
      rawScore: null,
      score: null,
      shortfall: 0,
      surplus: Math.max(projectedResources, 0),
      coverageState: "no_upcoming_requirements",
      coverageResolved: false,
    };
  }

  const rawScore = (projectedResources / requirement) * 100;
  return {
    carryover,
    lowestExpectedIncome: expectedIncome,
    projectedResources,
    upcomingCycleRequirement: requirement,
    rawScore,
    score: Math.round(rawScore),
    shortfall: Math.max(requirement - projectedResources, 0),
    surplus: Math.max(projectedResources - requirement, 0),
    coverageState: "scored",
    coverageResolved: true,
  };
}

export function selectConservativeMeansScore({
  currentCycleRawScore,
  upcomingCoverageRawScore,
} = {}) {
  const current = Number(currentCycleRawScore);
  const upcoming = Number(upcomingCoverageRawScore);
  const currentResolved = Number.isFinite(currentCycleRawScore) ||
    (currentCycleRawScore !== null && currentCycleRawScore !== undefined && Number.isFinite(current));
  const upcomingResolved = Number.isFinite(upcomingCoverageRawScore) ||
    (upcomingCoverageRawScore !== null && upcomingCoverageRawScore !== undefined && Number.isFinite(upcoming));

  if (!currentResolved) {
    return {
      rawScore: null,
      score: null,
      limitingWindow: "current",
      currentCycleRawScore: null,
      upcomingCoverageRawScore: upcomingResolved ? upcoming : null,
    };
  }

  const finalRawScore = upcomingResolved ? Math.min(current, upcoming) : current;
  return {
    rawScore: finalRawScore,
    score: Math.round(finalRawScore),
    limitingWindow: upcomingResolved && upcoming < current ? "upcoming" : "current",
    currentCycleRawScore: current,
    upcomingCoverageRawScore: upcomingResolved ? upcoming : null,
  };
}
