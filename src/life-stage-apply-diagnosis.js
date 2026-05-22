const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DIAGNOSIS_ID = "clara-life-stage-diagnosis-reveal";

const STAGE_COPY = {
  "Working Student": {
    openingTitle: "You’re carrying a lot at once.",
    openingBody: "I can see why money may feel tied to school, work, rest, and pressure right now.",
    pressureTitle: "It’s not just spending.",
    pressure: "It looks like school, money, time, and emotional energy are all sharing the same week.",
    rhythmTitle: "Your week feels stretched.",
    rhythmBody: "Money may be moving around class days, work days, tired days, and the days you still need to feel okay.",
    landing: "You do not need to fix everything at once. Start by protecting the part of your week that keeps everything else steady.",
  },
  "Young Professional": {
    openingTitle: "You’re trying to stand on your own.",
    openingBody: "I can see independence, pressure, and future-building all showing up in your answers.",
    pressureTitle: "It’s not just adulting.",
    pressure: "Independence, salary rhythm, lifestyle pressure, and future plans are all asking for attention.",
    rhythmTitle: "Your salary needs breathing room.",
    rhythmBody: "Money may feel stable on paper, but small choices can quietly carry the weight of independence.",
    landing: "You do not need to perfect adulthood overnight. Start by protecting the rhythm that keeps your independence steady.",
  },
  "Living with Partner": {
    openingTitle: "You’re not deciding alone anymore.",
    openingBody: "I can see how money may now carry emotion, fairness, timing, and trust.",
    pressureTitle: "It’s not just bills.",
    pressure: "Money decisions are now connected to fairness, routines, emotion, and how safe both people feel.",
    rhythmTitle: "Your shared rhythm needs care.",
    rhythmBody: "A small money issue can feel bigger when it touches peace, trust, or expectations at home.",
    landing: "Shared money becomes lighter when the rules are clear. Start with the part that protects peace, fairness, and trust.",
  },
  "Family Household": {
    openingTitle: "You’re holding more than your own needs.",
    openingBody: "I can see support, responsibility, and personal stability all pulling on the same budget.",
    pressureTitle: "It’s not just household costs.",
    pressure: "Home needs, support pressure, boundaries, and personal stability are overlapping.",
    rhythmTitle: "Your support needs limits too.",
    rhythmBody: "Helping can feel loving, but without boundaries it can quietly drain the part of you that needs to stay steady.",
    landing: "You can care for people without carrying everything alone. Start by protecting the boundary that keeps your support sustainable.",
  },
  "Single Parent": {
    openingTitle: "You’re protecting more than money.",
    openingBody: "I can see safety, care, time, and emotional strength behind your answers.",
    pressureTitle: "It’s not just expenses.",
    pressure: "Care, essentials, time, and emergency pressure are all competing for safety.",
    rhythmTitle: "Your safety rhythm needs care.",
    rhythmBody: "One unexpected cost can feel heavier when your week is already built around protecting someone else.",
    landing: "You do not need to solve every pressure today. Start by protecting the essentials that keep you and your child steady.",
  },
  "Full-Time Earner": {
    openingTitle: "You’re steady, but still stretched.",
    openingBody: "I can see routine, responsibility, tiredness, and reward pressure moving together.",
    pressureTitle: "It’s not just payday.",
    pressure: "Salary rhythm, fatigue, responsibilities, and reward spending can repeat quietly.",
    rhythmTitle: "Your salary needs direction.",
    rhythmBody: "Even stable income can feel smaller when exhaustion and repeated small choices keep showing up.",
    landing: "Stable income becomes powerful when it has direction. Start by protecting the rhythm that repeats every payday.",
  },
  "Freelance Season": {
    openingTitle: "You’re building stability without a fixed rhythm.",
    openingBody: "I can see freedom, uncertainty, effort, and dry-week pressure in the same season.",
    pressureTitle: "It’s not just irregular income.",
    pressure: "Income timing, client flow, rest, and dry-week protection are all connected.",
    rhythmTitle: "Your flexible rhythm needs safety.",
    rhythmBody: "Freedom feels better when your slow days, late payments, and quiet weeks do not threaten your basics.",
    landing: "Freedom feels better when the slow weeks are protected. Start by building the buffer that keeps your work rhythm safe.",
  },
  "Business Builder": {
    openingTitle: "You’re trying to grow without losing yourself.",
    openingBody: "I can see ambition, cash pressure, reinvestment, and personal safety all moving together.",
    pressureTitle: "It’s not just business growth.",
    pressure: "Growth, cash flow, decisions, and personal stability are moving at the same time.",
    rhythmTitle: "Your builder rhythm needs separation.",
    rhythmBody: "Growth can feel exciting, but it gets heavy when business money and personal safety start blending together.",
    landing: "Building something takes pressure. Start by protecting the system that keeps growth, cash flow, and your personal life from mixing too much.",
  },
};

const ALIASES = {
  "Young Earner": "Young Professional",
  "Fresh Graduate": "Young Professional",
  Breadwinner: "Family Household",
  "OFW Family": "Family Household",
  "Unemployed Adult": "Family Household",
  "First-Time Parent": "Single Parent",
  "Freelance / Gig Worker": "Freelance Season",
  Freelancer: "Freelance Season",
};

const REACTION_LABELS = {
  opening: "Yeah… show me what you noticed.",
  chips: "That actually feels true.",
  rhythm: "Okay… keep going.",
  trigger: "Hmm… I needed to hear that.",
  meter: "Let’s protect that first.",
  final: "Bring me back to Me",
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const lower = (value) => {
  const text = clean(value);
  return text ? text[0].toLowerCase() + text.slice(1) : "";
};
const safe = (value) =>
  clean(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));

function buildInsightChips(profile) {
  const chips = [];

  const setup = clean(profile.setup).toLowerCase();
  const rhythm = clean(profile.rhythm).toLowerCase();
  const workload = clean(profile.workload).toLowerCase();
  const pressure = clean(profile.pressure).toLowerCase();

  if (setup.includes("supported") || setup.includes("allowance")) {
    chips.push("You’re trying to earn while still depending on support.");
  }

  if (rhythm.includes("part-time") || rhythm.includes("extra")) {
    chips.push("Your income feels helpful, but not fully stable yet.");
  }

  if (workload.includes("inconsistent") || workload.includes("manageable")) {
    chips.push("Some weeks feel under control. Some weeks feel heavier than expected.");
  }

  if (pressure.includes("school") || pressure.includes("fare") || pressure.includes("food")) {
    chips.push("Daily essentials are quietly carrying most of the pressure.");
  }

  return chips.slice(0, 3);
}

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function stageKey(stage) {
  const next = ALIASES[clean(stage)] || clean(stage);
  return STAGE_COPY[next] ? next : "Young Professional";
}

function titleFromResponse(coping) {
  const value = clean(coping).toLowerCase();
  if (value.includes("reward") || value.includes("comfort") || value.includes("convenience") || value.includes("small")) return "Maybe this is your breathing room.";
  if (value.includes("avoid")) return "Maybe the numbers feel hard to face.";
  if (value.includes("borrow") || value.includes("delay") || value.includes("debt")) return "Some pressure may be carrying over.";
  if (value.includes("cut")) return "You may be sacrificing too much.";
  return "Your response makes sense.";
}

function triggerBody(coping) {
  const value = clean(coping) || "the way you respond when things feel heavy";
  return `When life feels full, ${lower(value)} may be your way of trying to stay okay.`;
}

function buildSlides(profile) {
  const stage = stageKey(profile.stage);
  const copy = STAGE_COPY[stage];
  const pressure = clean(profile.pressure).replace(/\bTution\b/gi, "Tuition") || "current financial pressure";
  const coping = clean(profile.coping) || "current response pattern";
  const goal = clean(profile.goal) || "protect stability";

  return [
    {
      kind: "opening",
      eyebrow: "CLARA Life Snapshot",
      title: copy.openingTitle,
      body: copy.openingBody,
      supporting: "I’m not judging it. I’m trying to understand it with you.",
    },
    {
      kind: "chips",
      eyebrow: "What’s underneath",
      title: copy.pressureTitle,
      body: copy.pressure,
      chips: buildInsightChips(profile),
    },
    {
      kind: "rhythm",
      eyebrow: "Your rhythm",
      title: copy.rhythmTitle,
      body: copy.rhythmBody,
      supporting: "So the plan has to feel realistic, not strict.",
    },
    {
      kind: "trigger",
      eyebrow: "The softer truth",
      title: titleFromResponse(coping),
      body: triggerBody(coping),
      supporting: "That is not weakness. It is a signal worth listening to.",
    },
    {
      kind: "meter",
      eyebrow: "First protection",
      title: "Let’s protect the part that breaks first.",
      body: `Right now, ${lower(pressure)} needs the most care.`,
      supporting: `Protecting this moves you closer to ${lower(goal)}.`,
      meterLabel: pressure,
    },
    {
      kind: "final",
      eyebrow: "Next small step",
      title: "Start small. Stay steady.",
      body: copy.landing,
      supporting: "One protected decision is enough to begin.",
    },
  ];
}
