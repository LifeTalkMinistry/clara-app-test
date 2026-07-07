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
  "gift",
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
  /^para sa akin$/i,
  /^gusto ko$/i,
  /^wala$/i,
  /^ewan$/i,
];

const WEAK_CONTEXT_PATTERN = /\b(reward|rewarding|rewarded|treat|treating|trip|stress|sad|bored|boredom|tempted|craving|deserve|deserved|feel|feeling|emotion|impulse)\b/i;

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

function needsPurchaseClarification(reason = "", item = "") {
  const text = clean(reason);
  if (!text) return true;
  if (includesStrongPurpose(`${reason} ${item}`)) return false;
  if (WEAK_REASON_PATTERNS.some((pattern) => pattern.test(text))) return true;
  if (WEAK_CONTEXT_PATTERN.test(text) && !includesStrongPurpose(text)) return true;
  if (meaningfulWords(text).length < 3) return true;
  return false;
}

function clarificationQuestion(item = "", reason = "") {
  const purchase = clean(item || "this purchase").toLowerCase();
  const trimmedReason = clean(reason).toLowerCase();
  if (WEAK_CONTEXT_PATTERN.test(trimmedReason)) {
    return `Got it. Before I decide, help me understand one thing: what problem does ${purchase} solve right now?`;
  }
  return `Got it. Before I decide, help me understand one thing: what problem does ${purchase} solve right now?`;
}

function priceStepMessage() {
  return "Why do you want to buy it? You can say replacement, work need, reward, health, hobby, or simply that you want it.";
}

function confirmationText(flow = {}) {
  const item = clean(flow.item || "this item");
  const price = money(flow.price);
  const reason = clean(flow.reason);
  const clarification = clean(flow.clarification || flow.followUpAnswer || flow.purchaseContext);

  if (reason && clarification) {
    return `Got it. So you’re looking to buy ${item} for ${price} because ${reason}, and you added that ${clarification}. Is that right?`;
  }

  if (reason) {
    return `You’re considering ${item} for ${price} because ${reason}. Did I get that right before I run the full Buy Check?`;
  }

  return `You’re considering ${item} for ${price}. Did I get that right before I run the full Buy Check?`;
}

export { clarificationQuestion, confirmationText, needsPurchaseClarification, priceStepMessage };
