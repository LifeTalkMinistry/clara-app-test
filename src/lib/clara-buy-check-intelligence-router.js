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

const PAYMENT_NUMERIC_KEYS = [
  "amountDueNow",
  "paymentAmount",
  "remainingPayments",
  "totalPayments",
  "totalCommitment",
  "fees",
];

const AMBIGUOUS_PRICE_PATTERN = /\b(voucher|coupon|discount|less\s+\d|off|installment|monthly|per\s+month|months?|deposit|down\s*payment|downpayment|interest|fee|shipping|split|each|total\s+with|after\s+discount)\b/i;
const INSTALLMENT_SIGNAL_PATTERN = /\b(installment|monthly|per\s+month|every\s+month|months?|down\s*payment|downpayment)\b/i;
const BUYING_PATTERN = /\b(buy|buying|purchase|get|getting|spend|spending|worth|cost|price|pay|paying|need)\b/i;
const AFFIRMATIVE_PATTERN = /^(yes|yeah|yep|yup|correct|right|exactly|that'?s right|oo|opo|yes\s+that'?s\s+right)[.!\s]*$/i;
const NEGATIVE_ONLY_PATTERN = /^(no|nope|nah|not really|hindi|wala)[.!\s]*$/i;
const META_DISCOVERY_QUESTION_PATTERN = /^(why|what|how|can you|could you|would you|explain|tell me)\b.*\?$/i;
const WAIT_SIGNAL_PATTERN = /\b(wait|waiting|later|nothing|happen|happens|affected|affect|delay|skip|skipping|can wait|not urgent)\b/i;
const URGENCY_SIGNAL_PATTERN = /\b(urgent|urgently|asap|today|tomorrow|tonight|now|immediately|deadline|before work|before school)\b/i;
const BROKEN_SIGNAL_PATTERN = /\b(broke|broken|damaged|stopped working|doesn'?t work|does not work|unusable|worn out)\b/i;
const ALTERNATIVE_SIGNAL_PATTERN = /\b(already have|another|spare|backup|alternative|use my|use the old|enough shirts|enough clothes)\b/i;

function positiveNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function nonNegativeInteger(value) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount >= 0 ? amount : null;
}

function parseMoneyToken(value = "") {
  const amount = Number(String(value).replace(/[₱,\s]|php/gi, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function normalizePurchaseType(value = "") {
  const type = clean(value).toLowerCase();
  if (type === "installment") return "installment";
  if (type === "one_time" || type === "one-time" || type === "onetime") return "one_time";
  return "";
}

function normalizePaymentStatus(value = "") {
  const status = clean(value).toLowerCase();
  if (status === "confirmed" || status === "needs_confirmation") return status;
  return "";
}

function isPurposeReply(message = "") {
  const source = clean(message);
  if (!source || AFFIRMATIVE_PATTERN.test(source) || NEGATIVE_ONLY_PATTERN.test(source)) return false;
  return !META_DISCOVERY_QUESTION_PATTERN.test(source);
}

function isDecisionSignalReply(message = "") {
  const source = clean(message);
  if (!source) return false;
  return !META_DISCOVERY_QUESTION_PATTERN.test(source);
}

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

  const purchaseType = normalizePurchaseType(source.purchaseType);
  const paymentStatus = normalizePaymentStatus(
    source.paymentStructureStatus || (purchaseType === "installment" ? "" : source.priceStatus),
  );

  if (purchaseType === "installment") {
    evidence.purchaseType = "installment";
    const frequency = clean(source.frequency).toLowerCase();
    if (frequency) evidence.frequency = frequency.slice(0, 40);

    PAYMENT_NUMERIC_KEYS.forEach((key) => {
      const amount = Number(source[key]);
      if (!Number.isFinite(amount)) return;
      if (key === "remainingPayments" || key === "totalPayments") {
        if (Number.isInteger(amount) && amount >= 0) evidence[key] = amount;
      } else if (amount >= 0) {
        evidence[key] = amount;
      }
    });

    if (paymentStatus) evidence.paymentStructureStatus = paymentStatus;
    const paymentSource = clean(source.paymentStructureSource || source.priceSource);
    if (paymentSource) evidence.paymentStructureSource = paymentSource.slice(0, 60);
    return evidence;
  }

  const confirmed = Number(source.price);
  if (Number.isFinite(confirmed) && confirmed > 0 && clean(source.priceStatus).toLowerCase() === "confirmed") {
    evidence.purchaseType = "one_time";
    evidence.price = confirmed;
    evidence.priceStatus = "confirmed";
    evidence.priceSource = clean(source.priceSource || "user_confirmed") || "user_confirmed";
  } else {
    const candidate = Number(source.priceCandidate);
    if (Number.isFinite(candidate) && candidate > 0) evidence.priceCandidate = candidate;
    const status = clean(source.priceStatus).toLowerCase();
    if (status === "needs_confirmation") {
      evidence.purchaseType = purchaseType || "one_time";
      evidence.priceStatus = status;
    } else if (purchaseType) {
      evidence.purchaseType = purchaseType;
    }
  }

  return evidence;
}

function copyPaymentAuthority(target, source) {
  const left = sanitizeClaraPurchaseEvidence(source);
  if (!hasConfirmedClaraPaymentStructure(left)) return target;

  const preserved = { ...target };
  if (left.purchaseType === "installment") {
    delete preserved.price;
    delete preserved.priceCandidate;
    delete preserved.priceStatus;
    delete preserved.priceSource;
    preserved.purchaseType = "installment";
    preserved.paymentStructureStatus = "confirmed";
    PAYMENT_NUMERIC_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(left, key)) preserved[key] = left[key];
    });
    if (left.frequency) preserved.frequency = left.frequency;
    if (left.paymentStructureSource) preserved.paymentStructureSource = left.paymentStructureSource;
  } else {
    preserved.purchaseType = "one_time";
    preserved.price = left.price;
    preserved.priceStatus = "confirmed";
    preserved.priceSource = left.priceSource;
    delete preserved.priceCandidate;
  }
  return preserved;
}

function hasPendingClaraPaymentAuthority(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType === "installment") {
    return source.paymentStructureStatus === "needs_confirmation" && (
      positiveNumber(source.amountDueNow) > 0 ||
      positiveNumber(source.paymentAmount) > 0 ||
      positiveNumber(source.totalCommitment) > 0
    );
  }
  return source.priceStatus === "needs_confirmation" && positiveNumber(source.priceCandidate) > 0;
}

function copyPendingPaymentAuthority(target, source) {
  const left = sanitizeClaraPurchaseEvidence(source);
  if (!hasPendingClaraPaymentAuthority(left)) return target;

  const preserved = { ...target };
  if (left.purchaseType === "installment") {
    delete preserved.price;
    delete preserved.priceCandidate;
    delete preserved.priceStatus;
    delete preserved.priceSource;
    preserved.purchaseType = "installment";
    preserved.paymentStructureStatus = "needs_confirmation";
    PAYMENT_NUMERIC_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(left, key)) preserved[key] = left[key];
      else delete preserved[key];
    });
    if (left.frequency) preserved.frequency = left.frequency;
    else delete preserved.frequency;
    if (left.paymentStructureSource) preserved.paymentStructureSource = left.paymentStructureSource;
  } else {
    preserved.purchaseType = "one_time";
    preserved.priceCandidate = left.priceCandidate;
    preserved.priceStatus = "needs_confirmation";
    delete preserved.price;
    delete preserved.priceSource;
  }
  return preserved;
}

export function mergeClaraPurchaseEvidence(previous = {}, incoming = {}) {
  const left = sanitizeClaraPurchaseEvidence(previous);
  const right = sanitizeClaraPurchaseEvidence(incoming);
  let merged = { ...left, ...right };

  // The application owns payment authority. Gemini may add language evidence,
  // but it cannot silently replace either a confirmed structure or an
  // app-derived candidate that is still waiting for the user's confirmation.
  if (hasConfirmedClaraPaymentStructure(left) && !hasConfirmedClaraPaymentStructure(right)) {
    merged = copyPaymentAuthority(merged, left);
  } else if (hasPendingClaraPaymentAuthority(left) && !hasConfirmedClaraPaymentStructure(right)) {
    merged = copyPendingPaymentAuthority(merged, left);
  }

  return sanitizeClaraPurchaseEvidence(merged);
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
    .replace(/\bit[’']s\b/gi, " ")
    .replace(/\b(can\s+i|should\s+i|could\s+i|i(?:'m| am)?\s+thinking\s+of|thinking\s+of|i\s+want\s+to|want\s+to|buying|buy|purchase|get|getting|worth|costs?|price|for|paying|pay|need|i|a|an|it'?s|it\s+is|installment|monthly|per\s+month|months?)\b/gi, " ")
    .replace(/\b(because|since|but|and)\b[\s\S]*$/i, " ")
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 120);
}

function voucherCandidateFromText(source = "", amounts = []) {
  if (!/\b(voucher|coupon|discount)\b/i.test(source) || amounts.length < 2) return null;
  const payable = Number(amounts[0]) - Number(amounts[1]);
  if (!(payable > 0)) return null;
  return {
    purchaseType: "one_time",
    priceCandidate: payable,
    priceStatus: "needs_confirmation",
  };
}

function installmentCandidateFromText(source = "", amounts = []) {
  if (!INSTALLMENT_SIGNAL_PATTERN.test(source)) return null;

  const feeMatch = source.match(/\bfees?\s*(?:of|:|is|are)?\s*(?:₱|php\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i);
  const fees = feeMatch ? parseMoneyToken(feeMatch[1]) : 0;
  const explicitlyNoFees = /\b(no|zero|without)\s+(?:extra\s+)?fees?\b/i.test(source);

  const detailedCount = source.match(/\b(\d+)\s+(?:additional\s+|more\s+|remaining\s+)?months?\b/i);
  const hasDueNow = /\b(today|due\s+now|pay\s+now|right\s+now|upfront|down\s*payment|downpayment)\b/i.test(source);
  const hasFutureMonthly = /\b(every\s+month|monthly|per\s+month)\b/i.test(source);

  if (hasDueNow && hasFutureMonthly && detailedCount && amounts.length >= 2) {
    const amountDueNow = positiveNumber(amounts[0]);
    const paymentAmount = positiveNumber(amounts[1]);
    const remainingPayments = Number(detailedCount[1]);
    if (amountDueNow > 0 && paymentAmount > 0 && Number.isInteger(remainingPayments) && remainingPayments >= 1) {
      const totalCommitment = amountDueNow + paymentAmount * remainingPayments + fees;
      return {
        purchaseType: "installment",
        amountDueNow,
        paymentAmount,
        remainingPayments,
        totalPayments: remainingPayments + 1,
        totalCommitment,
        frequency: "monthly",
        fees,
        paymentStructureStatus: explicitlyNoFees || feeMatch ? "confirmed" : "needs_confirmation",
        paymentStructureSource: explicitlyNoFees || feeMatch ? "user_direct" : "candidate",
      };
    }
  }

  const shorthand = source.match(
    /(?:₱|php\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:pesos?\s*)?(?:per\s+month|monthly|\/\s*month)\b[\s\S]{0,40}?\b(?:for\s+)?(\d+)\s+months?\b/i,
  );
  if (shorthand) {
    const paymentAmount = parseMoneyToken(shorthand[1]);
    const totalPayments = Number(shorthand[2]);
    if (paymentAmount > 0 && Number.isInteger(totalPayments) && totalPayments > 0) {
      return {
        purchaseType: "installment",
        amountDueNow: paymentAmount,
        paymentAmount,
        remainingPayments: Math.max(0, totalPayments - 1),
        totalPayments,
        totalCommitment: paymentAmount * totalPayments + fees,
        frequency: "monthly",
        fees,
        paymentStructureStatus: "needs_confirmation",
        paymentStructureSource: "candidate",
      };
    }
  }

  return {
    purchaseType: "installment",
    paymentStructureStatus: "needs_confirmation",
    paymentStructureSource: "candidate",
  };
}

function applyObviousDecisionSignals(source = "", evidence = {}) {
  const next = { ...evidence };
  const because = source.match(/\b(?:because|since)\s+(.+?)(?:[.!?]|$)/i);
  if (!clean(next.purpose) && because?.[1]) next.purpose = clean(because[1]).slice(0, 360);

  if (!clean(next.currentSituation) && BROKEN_SIGNAL_PATTERN.test(source)) {
    next.currentSituation = source.slice(0, 360);
  }
  if (!clean(next.urgency) && URGENCY_SIGNAL_PATTERN.test(source)) {
    next.urgency = source.slice(0, 360);
  }
  if (!clean(next.alternatives) && ALTERNATIVE_SIGNAL_PATTERN.test(source)) {
    next.alternatives = source.slice(0, 360);
  }
  if (!clean(next.consequenceOfWaiting) && WAIT_SIGNAL_PATTERN.test(source)) {
    next.consequenceOfWaiting = source.slice(0, 360);
  }

  return next;
}

export function applyLocalPurchaseFacts(message = "", previousEvidence = {}) {
  const previous = sanitizeClaraPurchaseEvidence(previousEvidence);
  let next = { ...previous };
  const source = clean(message);
  const amounts = parseClaraMoneyAmounts(source);
  const previousHadPurchaseCore = Boolean(clean(previous.item) && hasConfirmedClaraPaymentStructure(previous));

  if (
    previous.purchaseType === "installment" &&
    previous.paymentStructureStatus === "needs_confirmation" &&
    AFFIRMATIVE_PATTERN.test(source) &&
    positiveNumber(previous.amountDueNow) > 0 &&
    positiveNumber(previous.paymentAmount) > 0 &&
    positiveNumber(previous.totalCommitment) > 0
  ) {
    next.paymentStructureStatus = "confirmed";
    next.paymentStructureSource = "user_confirmation";
    return sanitizeClaraPurchaseEvidence(next);
  }

  if (
    previous.purchaseType !== "installment" &&
    previous.priceStatus === "needs_confirmation" &&
    previous.priceCandidate > 0 &&
    AFFIRMATIVE_PATTERN.test(source)
  ) {
    next.purchaseType = "one_time";
    next.price = Number(previous.priceCandidate);
    next.priceStatus = "confirmed";
    next.priceSource = "user_confirmation";
    delete next.priceCandidate;
    return sanitizeClaraPurchaseEvidence(next);
  }

  const installment = installmentCandidateFromText(source, amounts);
  if (installment) {
    next = { ...next, ...installment };
    delete next.price;
    delete next.priceCandidate;
    delete next.priceStatus;
    delete next.priceSource;
  } else {
    const voucher = voucherCandidateFromText(source, amounts);
    if (voucher) {
      next = { ...next, ...voucher };
      delete next.price;
      delete next.priceSource;
    } else if (amounts.length === 1 && !AMBIGUOUS_PRICE_PATTERN.test(source)) {
      next.purchaseType = "one_time";
      next.price = amounts[0];
      next.priceStatus = "confirmed";
      next.priceSource = "user_direct";
      delete next.priceCandidate;
    } else if (amounts.length > 0) {
      next.purchaseType = "one_time";
      delete next.price;
      delete next.priceSource;
      next.priceStatus = "needs_confirmation";
      if (amounts.length === 1) next.priceCandidate = amounts[0];
    }
  }

  if (!next.item) {
    const item = inferItem(source);
    if (item) next.item = item;
  }

  next = applyObviousDecisionSignals(source, next);

  // Gemini remains the preferred language-understanding layer, but a temporary
  // model failure must not trap Buy Check in the same discovery question.
  if (previousHadPurchaseCore) {
    if (!clean(previous.purpose) && isPurposeReply(source) && !AFFIRMATIVE_PATTERN.test(source)) {
      next.purpose = source.slice(0, 360);
    } else if (
      clean(previous.purpose) &&
      !hasClaraSecondDecisionSignal(previous) &&
      isDecisionSignalReply(source)
    ) {
      if (WAIT_SIGNAL_PATTERN.test(source) || NEGATIVE_ONLY_PATTERN.test(source)) {
        next.consequenceOfWaiting = source.slice(0, 360);
      } else if (URGENCY_SIGNAL_PATTERN.test(source)) {
        next.urgency = source.slice(0, 360);
      } else if (ALTERNATIVE_SIGNAL_PATTERN.test(source)) {
        next.alternatives = source.slice(0, 360);
      } else {
        next.currentSituation = source.slice(0, 360);
      }
    }
  }

  return sanitizeClaraPurchaseEvidence(next);
}

export function hasConfirmedClaraPurchasePrice(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return source.purchaseType !== "installment" && source.priceStatus === "confirmed" && Number(source.price) > 0;
}

export function hasConfirmedClaraPaymentStructure(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType === "installment") {
    return Boolean(
      source.paymentStructureStatus === "confirmed" &&
      positiveNumber(source.amountDueNow) > 0 &&
      positiveNumber(source.paymentAmount) > 0 &&
      positiveNumber(source.totalCommitment) >= positiveNumber(source.amountDueNow) &&
      nonNegativeInteger(source.remainingPayments) !== null,
    );
  }
  return hasConfirmedClaraPurchasePrice(source);
}

export function claraPaymentAmountDueNow(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (!hasConfirmedClaraPaymentStructure(source)) return 0;
  return source.purchaseType === "installment"
    ? positiveNumber(source.amountDueNow)
    : positiveNumber(source.price);
}

export function claraTotalCommitment(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (!hasConfirmedClaraPaymentStructure(source)) return 0;
  return source.purchaseType === "installment"
    ? positiveNumber(source.totalCommitment)
    : positiveNumber(source.price);
}

export function claraFutureCommitmentAmount(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType !== "installment" || !hasConfirmedClaraPaymentStructure(source)) return 0;
  return Math.max(0, claraTotalCommitment(source) - claraPaymentAmountDueNow(source));
}

export function hasClaraSecondDecisionSignal(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return SECOND_SIGNAL_KEYS.some((key) => clean(source[key]));
}

export function isClaraPurchaseContextMature(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return Boolean(
    clean(source.item) &&
    hasConfirmedClaraPaymentStructure(source) &&
    clean(source.purpose) &&
    hasClaraSecondDecisionSignal(source)
  );
}

export function getClaraBuyCheckMissingDecisionField(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (!clean(source.item)) return "item";
  if (!hasConfirmedClaraPaymentStructure(source)) return "payment";
  if (!clean(source.purpose)) return "purpose";
  if (!hasClaraSecondDecisionSignal(source)) return "decision_signal";
  return "";
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
  const installment = source.purchaseType === "installment";
  return {
    item: source.item || null,
    purchaseType: source.purchaseType || null,
    price: hasConfirmedClaraPurchasePrice(source) ? Number(source.price) : null,
    priceStatus: source.priceStatus || null,
    priceCandidate: source.priceCandidate || null,
    paymentStructureStatus: source.paymentStructureStatus || null,
    amountDueNow: installment && Number.isFinite(Number(source.amountDueNow)) ? Number(source.amountDueNow) : null,
    paymentAmount: installment && Number.isFinite(Number(source.paymentAmount)) ? Number(source.paymentAmount) : null,
    remainingPayments: installment && Number.isInteger(Number(source.remainingPayments)) ? Number(source.remainingPayments) : null,
    totalPayments: installment && Number.isInteger(Number(source.totalPayments)) ? Number(source.totalPayments) : null,
    totalCommitment: installment && Number.isFinite(Number(source.totalCommitment)) ? Number(source.totalCommitment) : null,
    frequency: installment ? source.frequency || null : null,
    fees: installment && Number.isFinite(Number(source.fees)) ? Number(source.fees) : null,
    purpose: source.purpose || null,
    currentSituation: source.currentSituation || null,
    urgency: source.urgency || null,
    consequenceOfWaiting: source.consequenceOfWaiting || null,
    alternatives: source.alternatives || null,
    timing: source.timing || null,
    constraints: source.constraints || null,
  };
}
