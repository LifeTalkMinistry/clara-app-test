import {
  getSelectedLifeStageKey,
  normalizeLifeStageKey,
  readSelectedLifeStageProfile,
} from "@/life-stage-flow";
import { getLifeStageSnapshot } from "@/life-stage-snapshot";

const PROFILE_INTERNAL_KEYS = new Set([
  "stage",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "completedAt",
  "completed_at",
  "version",
]);

const MONEY_CONTEXT_PATTERN =
  /\b(money|spend|spending|buy|purchase|afford|budget|save|saving|savings|wallet|cash|balance|bills?|debt|utang|loan|emergency|payday|income|expense|overspend|overspending|decision|plan|priority|prioritize)\b/i;

const HIGH_CONTEXT_PATTERN =
  /\b(should i|can i|buy|purchase|afford|budget|overspend|overspending|save|saving|savings|debt|utang|loan|bills?|emergency|payday|income|expense|decision|plan|priority|prioritize|money advice|spending advice)\b/i;

const SIMPLE_BALANCE_PATTERN =
  /\b(how much|balance|wallet balance|money left|available money|current money|currently have)\b/i;

const WRITE_CONFIRMATION_PATTERN = /^(logged|added|transferred|created|saved|updated)\b/i;

function safeString(value) {
  return String(value || "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function answerValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return safeString(value);
  }
  if (isPlainObject(value)) {
    return safeString(value.value || value.label || value.answer || value.title || value.name || "");
  }
  return "";
}

function compactProfileAnswers(profile = {}) {
  if (!isPlainObject(profile)) return {};

  return Object.entries(profile).reduce((answers, [key, value]) => {
    if (PROFILE_INTERNAL_KEYS.has(key)) return answers;
    const cleaned = answerValue(value);
    if (!cleaned) return answers;
    answers[key] = cleaned;
    return answers;
  }, {});
}

function hasMeaningfulProfile(profile = {}) {
  return Object.keys(compactProfileAnswers(profile)).length > 0;
}

function compactSnapshotCards(snapshot = {}) {
  return safeArray(snapshot?.cards)
    .map((card) => ({
      key: safeString(card.key || card.label),
      label: safeString(card.label || card.title),
      value: Number.isFinite(Number(card.value)) ? Number(card.value) : 0,
      status: safeString(card.status),
      category: safeString(card.category),
      insight: safeString(card.insight || card.note),
      action: safeString(card.action),
    }))
    .filter((card) => card.label)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

function uniqueStrings(items = [], limit = 5) {
  return Array.from(new Set(items.map(safeString).filter(Boolean))).slice(0, limit);
}

function buildGuidanceTone(stage, cards = []) {
  const dominant = cards[0];
  if (!dominant) {
    return `Use a warm, practical, non-generic money-coach tone for the user's ${stage} reality.`;
  }

  return `Use a warm, practical tone. Prioritize ${dominant.label} before optional spending, and avoid sounding generic.`;
}

export function buildClaraLifeStageAiContext(profileOverride = null) {
  const storedProfile =
    isPlainObject(profileOverride) && Object.keys(profileOverride).length
      ? profileOverride
      : readSelectedLifeStageProfile();

  const selectedStage = normalizeLifeStageKey(
    storedProfile?.stage || getSelectedLifeStageKey()
  );

  const profileAnswers = compactProfileAnswers(storedProfile || {});
  const hasProfile = Boolean(storedProfile && hasMeaningfulProfile(storedProfile));
  const snapshot = hasProfile ? getLifeStageSnapshot(selectedStage, storedProfile) : null;
  const cards = compactSnapshotCards(snapshot);
  const topSignals = cards.slice(0, 4).map(({ key, label, value, status, category }) => ({
    key,
    label,
    value,
    status,
    category,
  }));

  return {
    hasProfile,
    profileStatus: hasProfile ? "ready" : "missing",
    lifeStage: selectedStage,
    profileAnswers,
    snapshotTopSignals: topSignals,
    dominantPressure: topSignals[0]?.label || "",
    guidanceTone: hasProfile
      ? buildGuidanceTone(selectedStage, cards)
      : "Give general guidance, but mention that CLARA can guide better after the Me profile is completed when the user asks for money advice.",
    knownRisks: hasProfile
      ? uniqueStrings(cards.map((card) => card.insight || card.label), 5)
      : [],
    recommendedNextMoves: hasProfile
      ? uniqueStrings(cards.map((card) => card.action), 5)
      : ["Complete the Me profile so CLARA can connect money advice to the user's real life stage."],
  };
}

export function withClaraLifeStageAiContext(context = {}) {
  const lifeStageContext = buildClaraLifeStageAiContext();

  return {
    ...(context || {}),
    lifeStageContext,
    lifeStageAiContext: lifeStageContext,
    meLifeStageProfile: lifeStageContext,
  };
}

export function buildClaraLifeStagePromptBlock(lifeStageContext = null) {
  const context = lifeStageContext || buildClaraLifeStageAiContext();

  if (!context.hasProfile) {
    return `ME / LIFE STAGE CONTEXT:\nStatus: missing\nCurrent selected stage: ${context.lifeStage || "not set"}\nInstruction: For money advice, CLARA may say it can give sharper guidance after the user completes the Me profile. Do not force this into casual small talk.`;
  }

  return `ME / LIFE STAGE CONTEXT:\n${JSON.stringify(
    {
      lifeStage: context.lifeStage,
      profileAnswers: context.profileAnswers,
      snapshotTopSignals: context.snapshotTopSignals,
      dominantPressure: context.dominantPressure,
      guidanceTone: context.guidanceTone,
      knownRisks: context.knownRisks,
      recommendedNextMoves: context.recommendedNextMoves,
    },
    null,
    2
  )}\nInstruction: Use this when it meaningfully improves spending, budgeting, savings, debt, payday, emergency, or purchase advice. Do not mention the Me profile in every reply.`;
}

function isSimpleBalanceOnly(message = "") {
  const text = safeString(message);
  return SIMPLE_BALANCE_PATTERN.test(text) && !HIGH_CONTEXT_PATTERN.test(text.replace(/balance|wallet balance|money left|available money|current money|currently have/gi, ""));
}

export function shouldUseLifeStageForMessage(message = "") {
  const text = safeString(message);
  if (!text) return false;
  if (!MONEY_CONTEXT_PATTERN.test(text)) return false;
  if (isSimpleBalanceOnly(text)) return false;
  return HIGH_CONTEXT_PATTERN.test(text);
}

function buildProfileReferenceSentence(context = {}) {
  if (!context.hasProfile) {
    return "I can give sharper guidance after you complete your Me profile, because then I can connect this advice to your real life stage and pressure patterns.";
  }

  const signalLabels = safeArray(context.snapshotTopSignals)
    .map((signal) => signal.label)
    .filter(Boolean)
    .slice(0, 2);

  const signalText = signalLabels.length
    ? ` with ${signalLabels.join(" and ")} active`
    : "";

  const nextMove = safeArray(context.recommendedNextMoves)[0];

  return `Since your current Me profile shows ${context.lifeStage}${signalText}, protect ${
    context.dominantPressure || "your main pressure"
  } before making this money decision.${nextMove ? ` Next safest move: ${nextMove}` : ""}`;
}

export function decorateClaraReplyWithLifeStageContext(reply = "", options = {}) {
  const text = safeString(reply);
  const message = safeString(options.message);

  if (!text) return text;
  if (WRITE_CONFIRMATION_PATTERN.test(text)) return text;
  if (/\b(current Me profile|Me profile shows|Life Stage Context|life stage profile)\b/i.test(text)) return text;
  if (!options.force && !shouldUseLifeStageForMessage(message)) return text;

  const context =
    options.context?.lifeStageContext ||
    options.context?.lifeStageAiContext ||
    options.context?.meLifeStageProfile ||
    buildClaraLifeStageAiContext();

  const profileSentence = buildProfileReferenceSentence(context);
  return `${profileSentence}\n\n${text}`.trim();
}
