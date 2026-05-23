import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  completeLivingWithPartnerDraft,
  getLivingWithPartnerBehaviorProfile,
} from "./livingWithPartnerLifeStageSource";

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const compactSignal = (signal) => `${signal.label}: ${signal.value}%`;

function detectPattern(profile = {}) {
  const draft = completeLivingWithPartnerDraft(profile);
  const text = [draft.setup, draft.rhythm, draft.workload, draft.pressure, draft.coping, draft.goal].join(" | ").toLowerCase();

  if (text.includes("uneven") || text.includes("one person carries") || text.includes("covers gaps") || text.includes("one income")) {
    return {
      key: "fairnessPattern",
      title: "A fairness-pressure pattern appears.",
      body: "This shared-life setup may be carrying an uneven money rhythm. One person may be covering more, adjusting more, or quietly absorbing gaps that need to become visible.",
      commonBehavior: "A common pattern is silent adjustment: one partner covers the gap, both move on, then the same pressure returns during the next bill or purchase.",
      financialMeaning: "Financially, this matters because uneven contribution can make shared bills feel unstable even when both people care.",
      emotionalMeaning: "Emotionally, this can feel like pressure, guilt, resentment, or fear of sounding unfair.",
    };
  }

  if (text.includes("avoid money talks") || text.includes("argue") || text.includes("sensitive") || text.includes("communication")) {
    return {
      key: "communicationPattern",
      title: "A money-communication pattern appears.",
      body: "Money may be hard to discuss clearly in this relationship right now. The numbers matter, but the emotional safety around the conversation may matter just as much.",
      commonBehavior: "A common pattern is avoiding the topic until a bill, purchase, or plan forces the conversation to happen under pressure.",
      financialMeaning: "Financially, this matters because unclear conversations can turn ordinary expenses into repeated confusion.",
      emotionalMeaning: "Emotionally, it can feel like walking carefully around a topic that both people know needs attention.",
    };
  }

  if (text.includes("family") || text.includes("living with one family")) {
    return {
      key: "familyBoundaryPattern",
      title: "A family-boundary pattern appears.",
      body: "Family expectations may be entering the shared budget. Even when the request comes from one side, the effect can be felt by both people.",
      commonBehavior: "A common pattern is saying yes first, then trying to adjust shared bills, food, or savings afterward.",
      financialMeaning: "Financially, this matters because family support can quietly compete with rent, bills, savings, and emergency protection.",
      emotionalMeaning: "Emotionally, the pressure often carries loyalty, guilt, respect, and the need to protect the relationship too.",
    };
  }

  if (text.includes("comfort") || text.includes("spend together") || text.includes("date") || text.includes("lifestyle")) {
    return {
      key: "comfortBondingPattern",
      title: "A comfort-bonding pattern appears.",
      body: "Shared spending may be acting as bonding, relief, or peace after busy days. That is human, but it needs a boundary so comfort does not quietly weaken stability.",
      commonBehavior: "A common pattern is choosing food, delivery, dates, or convenience because it feels like an easy way to feel connected.",
      financialMeaning: "Financially, this matters because repeated comfort spending can compete with bills and savings without feeling like a serious mistake.",
      emotionalMeaning: "Emotionally, the spending may represent closeness, care, apology, or a way to make the day feel lighter.",
    };
  }

  if (text.includes("future") || text.includes("planning") || text.includes("savings") || text.includes("move")) {
    return {
      key: "futureBuildingPattern",
      title: "A future-building pattern appears.",
      body: "This relationship has a future direction that needs protection. Plans become stronger when they have a clear place in the shared budget.",
      commonBehavior: "A common pattern is wanting the future plan, but letting daily costs and comfort spending claim the money first.",
      financialMeaning: "Financially, this matters because future goals need to be funded before the month absorbs the income.",
      emotionalMeaning: "Emotionally, the pressure often comes from wanting progress without making the relationship feel restricted.",
    };
  }

  return {
    key: "sharedClarityPattern",
    title: "A shared-clarity pattern appears.",
    body: "This stage is asking for clearer shared rules. Money is no longer just personal; it now affects peace, fairness, routine, and future direction.",
    commonBehavior: "A common pattern is assuming both people understand the money rhythm until a bill, purchase, or plan reveals the gap.",
    financialMeaning: "Financially, this matters because shared life needs visible roles, not guessing.",
    emotionalMeaning: "Emotionally, clarity protects both the budget and the relationship atmosphere.",
  };
}

function buildDistributionSentence(signals = []) {
  const visible = signals.slice(0, 4).filter((signal) => signal?.label);
  if (!visible.length) return "CLARA is still forming the shared-life pressure distribution.";
  return visible.map(compactSignal).join(" • ");
}

function buildState(profile = {}) {
  const draft = completeLivingWithPartnerDraft(profile);
  const behavior = getLivingWithPartnerBehaviorProfile(draft);
  const signals = Array.isArray(behavior.snapshotDistribution) ? behavior.snapshotDistribution : [];
  const topSignal = signals[0] || behavior.topSignal;
  const secondSignal = signals[1] || topSignal;
  const thirdSignal = signals[2] || secondSignal;
  const pattern = detectPattern(draft);

  return {
    draft,
    behavior,
    signals,
    topSignal,
    secondSignal,
    thirdSignal,
    pattern,
    distributionText: buildDistributionSentence(signals),
    selectedPath: behavior.selectedPath || [draft.setup, draft.rhythm, draft.workload, draft.pressure, draft.coping, draft.goal].filter(Boolean),
  };
}

export function buildLivingWithPartnerReveal(profile = {}) {
  const state = buildState(profile);

  return [
    {
      kind: "opening",
      eyebrow: "Shared-life awareness",
      title: "Let’s see what CLARA noticed.",
      body: "CLARA is reading your answers as a shared-life pattern where bills, emotions, fairness, future plans, and relationship peace may be connected.",
      supporting: "This is awareness first, not judgment or advice yet.",
      interpretationLayer: { key: "livingWithPartnerOpening", evidence: state.selectedPath },
    },
    {
      kind: "chips",
      eyebrow: "Selected situation",
      title: state.pattern.title,
      body: state.pattern.body,
      supporting: "These are the context points CLARA is remembering from your shared-life setup.",
      chips: state.selectedPath.slice(0, 4),
      interpretationLayer: { key: state.pattern.key, evidence: state.selectedPath },
    },
    {
      kind: "distribution",
      eyebrow: "100% pressure split",
      title: "The pressure is not coming from one place.",
      body: state.distributionText,
      supporting: "The percentages show how CLARA currently divides the visible shared-life pressure signals.",
      interpretationLayer: { key: "livingWithPartnerDistribution", evidence: state.signals.map(compactSignal) },
    },
    {
      kind: "strongestSignal",
      eyebrow: "Strongest signal",
      title: `${state.topSignal.label} is the largest visible signal.`,
      body: state.topSignal.note || "This signal appears as the strongest part of the current shared-life pattern.",
      supporting: state.topSignal.insight || "This helps CLARA understand what may be shaping the relationship money rhythm most strongly.",
      interpretationLayer: { key: state.topSignal.key || state.topSignal.label, evidence: [compactSignal(state.topSignal)] },
    },
    {
      kind: "commonPattern",
      eyebrow: "Common behavior pattern",
      title: "This situation often changes behavior quietly.",
      body: state.pattern.commonBehavior,
      supporting: `${state.pattern.financialMeaning} ${state.pattern.emotionalMeaning}`,
      interpretationLayer: {
        key: "livingWithPartnerCommonPattern",
        evidence: [compactSignal(state.topSignal), compactSignal(state.secondSignal), compactSignal(state.thirdSignal)],
      },
    },
    {
      kind: "final",
      eyebrow: "CLARA context memory",
      title: "CLARA understands this shared setup better now.",
      body: "When you ask CLARA for help later, this shared-life context can help explain why certain money decisions feel emotional, unfair, urgent, or future-focused.",
      supporting: "The advice comes later — after CLARA understands the real relationship pressure behind the numbers.",
      interpretationLayer: { key: "livingWithPartnerMemory", evidence: state.selectedPath },
    },
  ];
}

export function getLivingWithPartnerRevealContext(profile = {}) {
  return buildState(profile);
}

export default buildLivingWithPartnerReveal;
