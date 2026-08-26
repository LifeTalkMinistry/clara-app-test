const cleanText = (value) => String(value ?? "").trim();

const MOTIVE_KEYS = ["purpose", "currentSituation"];
const CONSEQUENCE_KEYS = ["urgency", "alternatives", "timing", "constraints"];

export function getClaraBuyCheckDiscoveryState(evidence = {}) {
  const source = evidence && typeof evidence === "object" ? evidence : {};
  const item = cleanText(source.item);
  const price = Number(source.price);
  const motiveSignals = MOTIVE_KEYS.filter((key) => cleanText(source[key]));
  const consequenceSignals = CONSEQUENCE_KEYS.filter((key) => cleanText(source[key]));

  const hasPurchase = Boolean(item && Number.isFinite(price) && price > 0);
  const hasMotive = motiveSignals.length > 0;
  const hasSecondDecisionSignal = consequenceSignals.length > 0 || motiveSignals.length >= 2;
  const mature = Boolean(hasPurchase && hasMotive && hasSecondDecisionSignal);

  return {
    hasPurchase,
    hasMotive,
    hasSecondDecisionSignal,
    mature,
    motiveSignals,
    consequenceSignals,
  };
}

export function buildClaraBuyCheckDiscoveryQuestion(evidence = {}) {
  const source = evidence && typeof evidence === "object" ? evidence : {};
  const item = cleanText(source.item);
  const price = Number(source.price);
  const state = getClaraBuyCheckDiscoveryState(source);

  if (!item) return "What are you thinking of buying?";
  if (!Number.isFinite(price) || price <= 0) return `How much is the ${item}?`;
  if (!state.hasMotive) return "What’s making you want to buy it today?";
  if (!state.hasSecondDecisionSignal) {
    return "If you skip it today, would anything important actually be affected?";
  }
  return "";
}

export function shouldRevealClaraBuyCheckMeans(action = "", evidence = {}) {
  const state = getClaraBuyCheckDiscoveryState(evidence);
  const normalizedAction = cleanText(action).toLowerCase();
  return Boolean(state.mature && (normalizedAction === "ready" || normalizedAction === "reassess"));
}
