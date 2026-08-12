import { clean, money } from "./clara-buy-check-budget-core.js";

const STRONG_PURPOSE_KEYWORDS = [
  "replacement",
  "replace",
  "work",
  "job",
  "school",
  "study",
  "health",
  "medical",
  "medicine",
  "family",
  "repair",
  "daily use",
  "everyday",
  "required",
  "requirement",
  "damaged",
  "broken",
  "important event",
  "event",
  "planned",
  "need",
  "needed",
  "necessary",
];

const WEAK_REASON_PATTERNS = [
  /^because i want it$/i,
  /^i want it$/i,
  /^want it$/i,
  /^nothing$/i,
  /^none$/i,
  /^no reason$/i,
  /^just because$/i,
  /^because$/i,
  /^i like it$/i,
  /^like it$/i,
  /^for me$/i,
  /^for myself$/i,
  /^reward$/i,
  /^treat$/i,
  /^trip$/i,
  /^just a gift$/i,
  /^gift$/i,
  /^replacement$/i,
  /^replace$/i,
  /^work$/i,
  /^work need$/i,
  /^school$/i,
  /^health$/i,
  /^hobby$/i,
  /^daily use$/i,
  /^planned$/i,
  /^need$/i,
  /^para sa akin$/i,
  /^gusto ko$/i,
  /^wala$/i,
  /^ewan$/i,
];

const WEAK_CONTEXT_PATTERN = /\b(reward|rewarding|rewarded|treat|treating|trip|stress|sad|bored|boredom|tempted|craving|deserve|deserved|feel|feeling|emotion|impulse)\b/i;
const GIFT_PATTERN = /\b(gift|regalo|present)\b/i;
const GIFT_CONTEXT_PATTERN = /\b(mom|mother|mama|nanay|dad|father|papa|tatay|parent|parents|wife|husband|partner|child|kid|son|daughter|brother|sister|friend|birthday|anniversary|christmas|graduation|wedding|occasion)\b/i;
const REPLACEMENT_PATTERN = /\b(replacement|replace|replacing)\b/i;
const DAMAGE_CONTEXT_PATTERN = /\b(damaged|broken|worn|worn out|old|torn|unusable|doesn'?t fit|no longer fits|unsafe)\b/i;

function meaningfulWords(value = "") {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !["i", "a", "an", "the", "it", "to", "for", "me", "my", "ko", "po", "lang", "just", "because", "youre", "you're", "yourself", "myself", "giving"].includes(word));
}

function includesStrongPurpose(value = "") {
  const text = clean(value).toLowerCase();
  return STRONG_PURPOSE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isVagueGiftReason(value = "") {
  const text = clean(value);
  if (!GIFT_PATTERN.test(text)) return false;
  return !GIFT_CONTEXT_PATTERN.test(text) || meaningfulWords(text).length < 3;
}

function isBareReplacementReason(value = "") {
  const text = clean(value);
  if (!REPLACEMENT_PATTERN.test(text)) return false;
  if (DAMAGE_CONTEXT_PATTERN.test(text)) return false;
  return meaningfulWords(text).length < 4;
}

function needsPurchaseClarification(reason = "", item = "") {
  const text = clean(reason);
  if (!text) return true;
  if (WEAK_REASON_PATTERNS.some((pattern) => pattern.test(text))) return true;
  if (isVagueGiftReason(text)) return true;
  if (isBareReplacementReason(text)) return true;
  if (WEAK_CONTEXT_PATTERN.test(text) && !includesStrongPurpose(text)) return true;
  if (includesStrongPurpose(`${reason} ${item}`) && meaningfulWords(text).length >= 3) return false;
  if (meaningfulWords(text).length < 3) return true;
  return false;
}

function clarificationQuestion(item = "", reason = "") {
  const purchase = clean(item || "this purchase").toLowerCase();
  const trimmedReason = clean(reason).toLowerCase();
  if (GIFT_PATTERN.test(trimmedReason) && !GIFT_CONTEXT_PATTERN.test(trimmedReason)) {
    return "Got it. Who is the gift for, and is there a specific occasion?";
  }
  if (REPLACEMENT_PATTERN.test(trimmedReason)) {
    return `Got it — what are you replacing about your current ${purchase}, and why does it need replacing now?`;
  }
  return `Got it. What makes ${purchase} important enough to buy right now?`;
}

function priceStepMessage() {
  return "What makes this purchase worth considering right now?";
}

function confirmationText(flow = {}) {
  const item = clean(flow.item || "this item");
  const price = money(flow.price);
  const reason = clean(flow.reason);
  const clarification = clean(flow.clarification || flow.followUpAnswer || flow.purchaseContext);

  if (reason && clarification) {
    return `That helps. You’re considering ${item} for ${price}, and the reason is clearer now: ${clarification}. Ready for me to run the full Buy Check?`;
  }

  if (reason) {
    return `That makes sense. You’re considering ${item} for ${price} because ${reason}. Ready for me to run the full Buy Check?`;
  }

  return `You’re considering ${item} for ${price}. Ready for me to run the full Buy Check?`;
}

export { clarificationQuestion, confirmationText, needsPurchaseClarification, priceStepMessage };
