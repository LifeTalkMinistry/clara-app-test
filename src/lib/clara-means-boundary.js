const MEANS_CONTEXT_KEY = "__claraCanonicalMeansSnapshot__";
const MEANS_SNAPSHOT_UPDATED_EVENT = "clara:means-snapshot-updated";

function toFiniteMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function readCanonicalMeansSnapshot() {
  if (typeof window === "undefined") return null;
  const snapshot = window[MEANS_CONTEXT_KEY];
  return snapshot && typeof snapshot === "object" ? snapshot : null;
}

export function getCanonicalMeansDecisionBoundary() {
  const snapshot = readCanonicalMeansSnapshot();
  if (!snapshot) {
    return {
      ready: false,
      amount: 0,
      availableNow: 0,
      upcoming: 0,
      cycleStartDate: "",
      cycleEndDate: "",
      horizonDate: "",
      source: "income_hub",
    };
  }

  return {
    ready: snapshot.hasIncomePayCycle === true,
    amount: toFiniteMoney(snapshot.projectedRoom),
    availableNow: toFiniteMoney(snapshot.availableNow),
    upcoming: toFiniteMoney(snapshot.upcoming),
    cycleStartDate: String(snapshot.cycleStartDate || ""),
    cycleEndDate: String(snapshot.cycleEndDate || ""),
    horizonDate: String(snapshot.horizonDate || snapshot.cycleEndDate || ""),
    source: "income_hub",
  };
}

export { MEANS_CONTEXT_KEY, MEANS_SNAPSHOT_UPDATED_EVENT };
