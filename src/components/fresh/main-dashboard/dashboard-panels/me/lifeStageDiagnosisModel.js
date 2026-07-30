import { getLifeStageSnapshot } from "../../../../../life-stage-snapshot";
import {
  getLifeStageQuestions,
  normalizeLifeStageKey,
} from "../../../../../life-stage-flow";
import {
  WORKING_STUDENT_STAGE_KEY,
} from "./workingStudentLifeStageSource";
import { buildWorkingStudentReveal } from "./workingStudentRevealEngine";
import {
  LIVING_WITH_PARTNER_STAGE_KEY,
} from "./livingWithPartnerLifeStageSource";
import { buildLivingWithPartnerReveal } from "./livingWithPartnerRevealEngine";

const STAGE_COPY = {
  "Young Professional": {
    openingTitle: "You’re trying to stand on your own.",
    openingBody:
      "Independence, career pressure, lifestyle choices, and future-building are all showing up in your answers.",
    patternTitle: "Your money rhythm is still becoming your own.",
    patternBody:
      "A stable income can still feel tight while adult responsibilities, small repeated costs, and personal goals learn to share the same space.",
    landing:
      "You do not need to perfect adulthood overnight. Start by protecting the rhythm that keeps your independence steady.",
  },
  "Family Household": {
    openingTitle: "You’re holding more than your own needs.",
    openingBody:
      "Support, household responsibility, personal stability, and boundaries are pulling on the same budget.",
    patternTitle: "Care needs a visible boundary.",
    patternBody:
      "Helping can feel loving and necessary, but repeated support becomes safer when the household can see what is shared and what still needs protection.",
    landing:
      "You can care for people without carrying everything alone. Protect the boundary that keeps your support sustainable.",
  },
  "Single Parent": {
    openingTitle: "You’re protecting more than money.",
    openingBody:
      "Safety, care, time, emotional strength, and everyday essentials are connected in your answers.",
    patternTitle: "One surprise can affect the whole week.",
    patternBody:
      "When one person is protecting both the household and the child, ordinary costs can carry the weight of safety and continuity.",
    landing:
      "You do not need to solve every pressure today. Start by protecting the essentials that keep you and your child steady.",
  },
  "Full-Time Earner": {
    openingTitle: "You’re steady, but still stretched.",
    openingBody:
      "Routine, responsibility, tiredness, and reward pressure are moving together inside a regular salary.",
    patternTitle: "Stable income still needs direction.",
    patternBody:
      "Payday can look predictable while fatigue, repeated obligations, and small automatic choices quietly decide where the money goes.",
    landing:
      "Stable income becomes powerful when it has direction. Protect the rhythm that repeats every payday.",
  },
  "Freelance Season": {
    openingTitle: "You’re building stability without a fixed rhythm.",
    openingBody:
      "Freedom, uncertainty, client timing, effort, and dry-week pressure are present in the same season.",
    patternTitle: "Flexible income needs a safety floor.",
    patternBody:
      "Planning becomes harder when strong weeks and quiet weeks must fund the same essentials, goals, and recovery time.",
    landing:
      "Freedom feels better when slow weeks are protected. Build the buffer that keeps your work rhythm safe.",
  },
  "Business Builder": {
    openingTitle: "You’re trying to grow without losing yourself.",
    openingBody:
      "Ambition, cash pressure, reinvestment, decision fatigue, and personal safety are moving together.",
    patternTitle: "Growth needs separation and visibility.",
    patternBody:
      "Business momentum becomes harder to read when operating money, reinvestment, and personal needs share the same mental account.",
    landing:
      "Building something takes pressure. Protect the system that keeps growth, cash flow, and personal safety from blending together.",
  },
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const lower = (value) => {
  const text = clean(value);
  return text ? text[0].toLowerCase() + text.slice(1) : "";
};

function displayAnswer(stage, value) {
  const raw = clean(value);
  if (!raw) return "";
  const labels = getLifeStageQuestions(stage)?.displayLabels || {};
  return labels[raw] || raw;
}

function selectedPath(stage, profile = {}) {
  return ["setup", "rhythm", "workload", "pressure", "coping", "goal"]
    .map((key) => displayAnswer(stage, profile[key]))
    .filter(Boolean);
}

function snapshotCards(stage, profile) {
  const snapshot = getLifeStageSnapshot(stage, profile) || {};
  const cards = Array.isArray(snapshot.cards)
    ? snapshot.cards
    : Array.isArray(snapshot.indicators)
      ? snapshot.indicators
      : [];

  return { snapshot, cards: cards.filter((item) => item?.label) };
}

function distributionText(cards = []) {
  const visible = cards.slice(0, 4);
  if (!visible.length) {
    return "CLARA is still forming the visible pressure distribution for this Life Stage.";
  }

  return visible
    .map((item) => `${clean(item.label)}: ${Number(item.value) || 0}%`)
    .join(" • ");
}

function buildGenericReveal(profile = {}) {
  const stage = normalizeLifeStageKey(profile.stage);
  const copy = STAGE_COPY[stage] || STAGE_COPY["Young Professional"];
  const path = selectedPath(stage, profile);
  const { snapshot, cards } = snapshotCards(stage, profile);
  const topSignal = cards[0] || null;
  const pressure = displayAnswer(stage, profile.pressure) || "the pressure showing up most often";
  const coping = displayAnswer(stage, profile.coping) || "the response pattern you selected";
  const goal = displayAnswer(stage, profile.goal) || "greater stability";

  return [
    {
      kind: "opening",
      eyebrow: `${stage} awareness`,
      title: copy.openingTitle,
      body: copy.openingBody,
      supporting: "This is awareness first, not judgment or advice.",
    },
    {
      kind: "chips",
      eyebrow: "Your selected situation",
      title: copy.patternTitle,
      body: copy.patternBody,
      supporting: "These are the answers CLARA is now connecting as one context.",
      chips: path.slice(0, 6),
    },
    {
      kind: "distribution",
      eyebrow: "Visible pressure split",
      title: "The pressure is not coming from one place.",
      body: distributionText(cards),
      supporting:
        snapshot.subtitle ||
        "The percentages show how CLARA currently divides the visible behavioral pressure in this setup.",
    },
    {
      kind: "strongestSignal",
      eyebrow: "Strongest visible signal",
      title: topSignal
        ? `${topSignal.label} is currently the largest signal.`
        : `${pressure} needs the clearest attention.`,
      body:
        topSignal?.note ||
        `Your answers place ${lower(pressure)} near the center of the current money pressure.`,
      supporting:
        topSignal?.insight ||
        "This gives CLARA a clearer reason behind the numbers, not only a category name.",
      metric: topSignal ? `${Number(topSignal.value) || 0}%` : null,
    },
    {
      kind: "commonPattern",
      eyebrow: "Behavior under pressure",
      title: "Your response makes sense in context.",
      body: `When pressure becomes heavy, ${lower(coping)} may be the way you try to keep moving or feel okay in the moment.`,
      supporting: `That pattern matters because you are trying to protect ${lower(goal)} while ${lower(pressure)} is still active.`,
    },
    {
      kind: "final",
      eyebrow: "CLARA context memory",
      title: "CLARA understands your situation better now.",
      body: copy.landing,
      supporting:
        "When you ask CLARA for help later, these answers can explain the real-life pressure behind your money decisions.",
    },
  ];
}

export function buildLifeStageDiagnosisSlides(profile = {}) {
  const stage = normalizeLifeStageKey(profile.stage);
  const normalizedProfile = { ...profile, stage };

  if (stage === WORKING_STUDENT_STAGE_KEY) {
    return buildWorkingStudentReveal(normalizedProfile);
  }

  if (
    stage === LIVING_WITH_PARTNER_STAGE_KEY ||
    stage === "Living With Partner"
  ) {
    return buildLivingWithPartnerReveal({
      ...normalizedProfile,
      stage: LIVING_WITH_PARTNER_STAGE_KEY,
    });
  }

  return buildGenericReveal(normalizedProfile);
}

export default buildLifeStageDiagnosisSlides;
