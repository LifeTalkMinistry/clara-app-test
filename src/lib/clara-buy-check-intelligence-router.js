const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();

const TEXT_KEYS = [
  "item",
  "purpose",
  "currentSituation",
  "urgency",
  "consequenceOfWaiting",
  "alternatives",
  "timing",
  "constraints",
  "readinessSummary",
];

const SECOND_SIGNAL_KEYS = [
  "currentSituation",
  "urgency",
  "consequenceOfWaiting",
  "alternatives",
  "timing",
  "constraints",
];

const AMBIGUOUS_PRICE_PATTERN = /\b(voucher|coupon|discount|less\s+\d|off|installment|monthly|per\s+month|months?|deposit|down\s*payment|downpayment|interest|fee|shipping|split|each|total\s+with|after\s+discount)\b/i;
const BUYING_PATTERN = /\b(buy|buying|purchase|get|getting|spend|spending|worth|cost|price|pay|paying)\b/i;
const AFFIRMATIVE_PATTERN = /^(yes|yeah|yep|yup|correct|right|exactly|that'?s right|oo|opo|yes\s+that'?s\s+right)[.!\s]*$/i;

export const CLARA_BUY_CHECK_PHASE = Object.freeze({
  ESTABLISH: "establish",
  DISCOVER: "discover",
  METRIC: "metric",
});

export function sanitizeClaraPurchaseEvidence(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const evidence = {};

  TEXT_KEYS.forEach((key) => {
    const text = clean(source[key]);
    if (text) evidence[key] = text.slice(0, key === "item" ? 120 : 360);
  });

  const confirmed = Number(source.price);
  if (Number.isFinite(confirmed) && confirmed > 0 && clean(source.priceStatus).toLowerCase() === "confirmed") {
    evidence.price = confirmed;
    evidence.priceStatus = "confirmed";
    evidence.priceSource = clean(source.priceSource || "user_confirmed") || "user_confirmed";
  } else {
    const candidate = Number(source.priceCandidate);
    if (Number.isFinite(candidate) && candidate > 0) evidence.priceCandidate = candidate;
    const status = clean(source.priceStatus).toLowerCase();
    if (status === "needs_confirmation") evidence.priceStatus = status;
  }

  return evidence;
}

export function mergeClaraPurchaseEvidence(previous = {}, incoming = {}) {
  const left = sanitizeClaraPurchaseEvidence(previous);
  const right = sanitizeClaraPurchaseEvidence(incoming);
  const merged = { ...left, ...right };

  // A confirmed user price is authoritative until the user explicitly supplies
  // a replacement amount. Gemini may propose a candidate but never overwrites it.
  if (left.priceStatus === "confirmed" && right.priceStatus !== "confirmed") {
    merged.price = left.price;
    merged.priceStatus = "confirmed";
    merged.priceSource = left.priceSource;
    delete merged.priceCandidate;
  }

  return merged;
}

export function parseClaraMoneyAmounts(message = "") {
  const source = clean(message);
  const matches = [...source.matchAll(/(?:₱|php\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:pesos?|php)?/gi)];
  return matches
    .map((match) => Number(String(match[1]).replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function inferItem(message = "") {
  const source = clean(message);
  if (!BUYING_PATTERN.test(source)) return "";
  const stripped = source
    .replace(/(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?\s*(?:pesos?|php)?/gi, " ")
    .replace(/\b(can\s+i|should\s+i|could\s+i|i(?:'m| am)?\s+thinking\s+of|thinking\s+of|i\s+want\s+to|want\s+to|buying|buy|purchase|get|getting|worth|costs?|price|for|paying|pay)\b/gi, " ")
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 120);
}

export function applyLocalPurchaseFacts(message = "", previousEvidence = {}) {
  const previous = sanitizeClaraPurchaseEvidence(previousEvidence);
  const next = { ...previous };
  const source = clean(message);
  const amounts = parseClaraMoneyAmounts(source);

  if (previous.priceStatus === "needs_confirmation" && previous.priceCandidate > 0 && AFFIRMATIVE_PATTERN.test(source)) {
    next.price = Number(previous.priceCandidate);
    next.priceStatus = "confirmed";
    next.priceSource = "user_confirmation";
    delete next.priceCandidate;
    return next;
  }

  if (amounts.length === 1 && !AMBIGUOUS_PRICE_PATTERN.test(source)) {
    next.price = amounts[0];
    next.priceStatus = "confirmed";
    next.priceSource = "user_direct";
    delete next.priceCandidate;
  } else if (amounts.length > 0) {
    delete next.price;
    delete next.priceSource;
    next.priceStatus = "needs_confirmation";
    if (amounts.length === 1) next.priceCandidate = amounts[0];
  }

  if (!next.item) {
    const item = inferItem(source);
    if (item) next.item = item;
  }

  return next;
}

export function hasConfirmedClaraPurchasePrice(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return source.priceStatus === "confirmed" && Number(source.price) > 0;
}

export function hasClaraSecondDecisionSignal(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return SECOND_SIGNAL_KEYS.some((key) => clean(source[key]));
}

export function isClaraPurchaseContextMature(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return Boolean(
    clean(source.item) &&
    hasConfirmedClaraPurchasePrice(source) &&
    clean(source.purpose) &&
    hasClaraSecondDecisionSignal(source)
  );
}

export function transactionReasonFromClaraEvidence(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return clean(source.purpose || source.currentSituation || source.readinessSummary || "");
}

export function routeClaraBuyCheckPhase({ connected = false, evidence = {} } = {}) {
  if (!connected) return CLARA_BUY_CHECK_PHASE.ESTABLISH;
  if (isClaraPurchaseContextMature(evidence)) return CLARA_BUY_CHECK_PHASE.METRIC;
  return CLARA_BUY_CHECK_PHASE.DISCOVER;
}

export function compactClaraPurchaseContext(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return {
    item: source.item || null,
    price: hasConfirmedClaraPurchasePrice(source) ? Number(source.price) : null,
    priceStatus: source.priceStatus || null,
    priceCandidate: source.priceCandidate || null,
    purpose: source.purpose || null,
    currentSituation: source.currentSituation || null,
    urgency: source.urgency || null,
    consequenceOfWaiting: source.consequenceOfWaiting || null,
    alternatives: source.alternatives || null,
    timing: source.timing || null,
    constraints: source.constraints || null,
  };
}
