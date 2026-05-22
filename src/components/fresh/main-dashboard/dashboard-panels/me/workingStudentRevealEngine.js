import {
  WORKING_STUDENT_STAGE_KEY,
  completeWorkingStudentDraft,
  getWorkingStudentDisplayLabel,
  getWorkingStudentQuestionContext,
  getWorkingStudentSnapshot,
} from "./workingStudentLifeStageSource";

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

const lower = (value) => {
  const text = clean(value);
  return text ? text[0].toLowerCase() + text.slice(1) : "";
};

const display = (value) => getWorkingStudentDisplayLabel(value) || clean(value);

const includesAny = (value, needles = []) => {
  const text = clean(value).toLowerCase();
  return needles.some((needle) => text.includes(String(needle).toLowerCase()));
};

const safeContext = (key, value, profile) => {
  const context = getWorkingStudentQuestionContext(key, value, profile);
  return {
    title: clean(context?.title) || display(value),
    summary: clean(context?.summary),
  };
};

const getSignal = (signals, index, fallback = {}) =>
  signals[index] || {
    label: fallback.label || "Working Student pressure",
    value: fallback.value || 0,
    note: fallback.note || "CLARA is reading this as part of the detected Working Student pattern.",
  };

const buildAnswerText = (answers) =>
  [answers.setup, answers.rhythm, answers.workload, answers.pressure, answers.coping, answers.goal]
    .map(clean)
    .join(" | ")
    .toLowerCase();

const detectBehaviorPattern = (answers) => {
  const text = buildAnswerText(answers);

  if (includesAny(text, ["family", "home", "guilt", "shared", "support boundary", "income goes home"])) {
    return {
      key: "familyLinked",
      sourceLabel: "family-linked money load",
      conflictTitle: "Guilt shows up when you protect yourself.",
      conflictBody:
        "The hidden conflict is not only helping family. It is trying to protect school money while still feeling responsible when home needs appear.",
      adaptationTitle: includesAny(text, ["limits", "boundary"])
        ? "You are trying to set limits without feeling selfish."
        : "You may be absorbing pressure before naming it.",
      adaptationBody: includesAny(text, ["delay my own needs", "give even when", "hide money stress"])
        ? "CLARA reads a self-sacrifice pattern: your own needs may move last so the week can keep going for everyone else."
        : "CLARA reads the behavior as emotional buffering: you try to stay helpful while quietly protecting what is left.",
      instabilityTitle: "School money may be turning into shared survival money.",
      instabilityBody:
        "Your stability weakens most when the money meant for class, fare, food, or recovery quietly becomes the backup fund for everyone.",
      architectureTitle: "Build a family-support boundary system.",
      architectureBody:
        "Start with a protected school-and-daily-needs wallet, then set a visible family-help ceiling so support does not erase your own stability.",
      plan: ["Family support limit", "Essentials-first rule", "School wallet"],
    };
  }

  if (includesAny(text, ["tuition", "school payments", "school costs", "school deadlines", "fear of stopping school", "school continuity"])) {
    return {
      key: "schoolContinuity",
      sourceLabel: "school-continuity pressure",
      conflictTitle: "School progress is competing with basic recovery.",
      conflictBody:
        "The deeper tension is that finishing school matters, but the money used to protect school can also shrink food, fare, rest, or personal needs.",
      adaptationTitle: "You may be trading comfort for continuity.",
      adaptationBody:
        "CLARA reads an over-functioning pattern: you keep school moving by cutting personal space first, even when your body already feels stretched.",
      instabilityTitle: "The danger is not one big failure. It is slow depletion.",
      instabilityBody:
        "The month can look controlled while your energy, meals, rest, or repayment margin quietly runs out before the next school deadline.",
      architectureTitle: "Create a tuition firewall.",
      architectureBody:
        "Separate school money from daily survival money first. Then protect a small food-and-fare floor so tuition pressure does not drain your body.",
      plan: ["Tuition firewall", "Food/fare floor", "Deadline buffer"],
    };
  }

  if (includesAny(text, ["exhaust", "tired", "burn", "commute", "comfort", "convenience", "missed tracking", "low recovery", "rest"])) {
    return {
      key: "fatigueDriven",
      sourceLabel: "energy-driven spending load",
      conflictTitle: "Your budget may be losing to exhaustion, not carelessness.",
      conflictBody:
        "The hidden conflict is that discipline becomes harder when school, work, commute, and recovery are all asking for the same energy.",
      adaptationTitle: includesAny(text, ["convenience"])
        ? "Convenience may be functioning like survival support."
        : "Comfort spending may be acting like emergency recovery.",
      adaptationBody:
        "CLARA reads an energy-protection pattern: spending may happen because planning, cooking, tracking, or resisting takes energy you no longer have.",
      instabilityTitle: "Routine protection is weakening before money fully runs out.",
      instabilityBody:
        "The first collapse point may be tracking, meals, transport choices, or rest — long before the budget looks completely broken.",
      architectureTitle: "Create low-energy money rules.",
      architectureBody:
        "Build a simple tired-day rule: pre-decide food, fare, and small recovery spending so exhaustion cannot negotiate every decision.",
      plan: ["Tired-day rule", "Recovery allowance", "Low-energy tracking"],
    };
  }

  if (includesAny(text, ["borrow", "debt", "repay", "delayed", "delay payments", "timing mismatch", "no-new-debt", "pressure carries over"])) {
    return {
      key: "delayedPressure",
      sourceLabel: "carry-over pressure cycle",
      conflictTitle: "Old pressure is entering the current week.",
      conflictBody:
        "The deeper issue is timing: money may arrive after pressure already forced a decision, so this week starts with last week still attached.",
      adaptationTitle: "Delay becomes a survival tool, then a trap.",
      adaptationBody:
        "CLARA reads a pressure-stacking pattern: delaying, borrowing, or avoiding the full picture may solve today while making the next week tighter.",
      instabilityTitle: "Stability collapses when the next income is already assigned.",
      instabilityBody:
        "The danger is not only debt. It is losing the ability to decide freely because repayment, food, fare, and school needs arrive together.",
      architectureTitle: "Build a no-new-pressure reset path.",
      architectureBody:
        "Start with a tiny food-and-fare buffer, then create a repayment rhythm that prevents one delayed decision from becoming the whole month.",
      plan: ["No-new-debt rule", "Repayment rhythm", "Food/fare buffer"],
    };
  }

  if (includesAny(text, ["small", "reward", "leak", "social", "extra income disappears", "strict tracking", "saving feels inconsistent"])) {
    return {
      key: "leakProne",
      sourceLabel: "small-leak reward cycle",
      conflictTitle: "Small rewards may be carrying bigger feelings.",
      conflictBody:
        "The hidden conflict is that the spending may look minor, but it often appears when effort, school stress, or the need to feel normal builds up.",
      adaptationTitle: "You are not overspending randomly. You are buying relief in small pieces.",
      adaptationBody:
        "CLARA reads emotional micro-buffering: small purchases help the week feel lighter, but the repetition can quietly weaken savings rhythm.",
      instabilityTitle: "The leak is small enough to ignore, but frequent enough to shape the month.",
      instabilityBody:
        "Your stability weakens when extra income has no job before stress, friends, food, and rewards start deciding for it.",
      architectureTitle: "Give extra money a job before it disappears.",
      architectureBody:
        "Keep a small reward lane, but assign extra income first: save a piece, spend a piece, and protect one future need before the week starts.",
      plan: ["Reward lane", "Extra-income rule", "Small savings first"],
    };
  }

  return {
    key: "developingRhythm",
    sourceLabel: "unstable rhythm pattern",
    conflictTitle: "You are trying to build a future without a steady base yet.",
    conflictBody:
      "The hidden conflict is that ambition needs consistency, but your income, schedule, and priorities may still change from week to week.",
    adaptationTitle: "Switching plans may be your way of searching for safety.",
    adaptationBody:
      "CLARA reads a priority-friction pattern: when the next right move is unclear, saving, spending, and planning can start and stop repeatedly.",
    instabilityTitle: "The weak point is not motivation. It is lack of one protected priority.",
    instabilityBody:
      "Your stability weakens when every goal competes at once, so the month never gets a single anchor strong enough to hold the rest.",
    architectureTitle: "Choose one protected priority first.",
    architectureBody:
      "Pick one financial anchor for the week — buffer, school, debt, or essentials — then let CLARA protect that before adding more goals.",
    plan: ["One-priority rule", "Simple money rhythm", "Weekly anchor"],
  };
};

const buildProgressiveState = (profile) => {
  const answers = completeWorkingStudentDraft({ ...profile, stage: WORKING_STUDENT_STAGE_KEY });
  const snapshot = getWorkingStudentSnapshot(answers);
  const signals = Array.isArray(snapshot.indicators) ? snapshot.indicators : [];
  const setup = safeContext("setup", answers.setup, answers);
  const rhythm = safeContext("rhythm", answers.rhythm, answers);
  const workload = safeContext("workload", answers.workload, answers);
  const pressure = safeContext("pressure", answers.pressure, answers);
  const coping = safeContext("coping", answers.coping, answers);
  const goal = safeContext("goal", answers.goal, answers);
  const topSignal = getSignal(signals, 0, { value: 100, note: snapshot.overview || snapshot.caption });
  const secondSignal = getSignal(signals, 1, { label: snapshot.title, value: 0, note: snapshot.caption });
  const thirdSignal = getSignal(signals, 2, { label: "Protection focus", value: 0, note: snapshot.supportBody });
  const pattern = detectBehaviorPattern(answers);

  const layers = [];

  layers.push({
    key: "surfaceEnvironment",
    title: includesAny(buildAnswerText(answers), ["heavy", "exhaust", "survive", "tired", "pressure"])
      ? "This week sounds heavy."
      : "There is a lot happening in one week.",
    meaning:
      setup.summary ||
      `CLARA sees ${lower(display(answers.setup))} as the starting environment before reading the deeper money pattern.`,
    evidence: [display(answers.setup)],
  });

  layers.push({
    key: "pressureSource",
    title: pattern.sourceLabel[0].toUpperCase() + pattern.sourceLabel.slice(1),
    meaning: `${rhythm.title} narrows the first read: ${lower(display(answers.rhythm))} is where the money pressure starts becoming visible.`,
    evidence: [display(answers.setup), display(answers.rhythm), `${topSignal.label}: ${topSignal.value}%`],
  });

  layers.push({
    key: "internalConflict",
    title: pattern.conflictTitle,
    meaning: pattern.conflictBody,
    evidence: [display(answers.workload), display(answers.pressure), `${secondSignal.label}: ${secondSignal.value}%`],
  });

  layers.push({
    key: "copingAdaptation",
    title: pattern.adaptationTitle,
    meaning: pattern.adaptationBody,
    evidence: [display(answers.coping), thirdSignal.label],
  });

  layers.push({
    key: "hiddenInstability",
    title: pattern.instabilityTitle,
    meaning: pattern.instabilityBody,
    evidence: signals.slice(0, 3).map((signal) => `${signal.label}: ${signal.value}%`),
  });

  layers.push({
    key: "protectionArchitecture",
    title: pattern.architectureTitle || goal.title,
    meaning: pattern.architectureBody || goal.summary || `The first stabilizing move should support ${lower(display(answers.goal))}.`,
    evidence: pattern.plan?.length ? pattern.plan : Array.isArray(snapshot.recommendations) ? snapshot.recommendations.slice(0, 3) : [],
  });

  return {
    answers,
    snapshot,
    signals,
    setup,
    rhythm,
    workload,
    pressure,
    coping,
    goal,
    topSignal,
    secondSignal,
    thirdSignal,
    pattern,
    layers,
  };
};

export function buildWorkingStudentReveal(profile = {}) {
  const state = buildProgressiveState(profile);
  const architecturePlan = state.layers[5].evidence.length
    ? state.layers[5].evidence.join(" • ")
    : "One protected decision is enough to begin.";

  return [
    {
      kind: "opening",
      eyebrow: "Current Working Student path",
      title: state.layers[0].title,
      body: state.layers[0].meaning,
      supporting: "Let’s look at it gently, one part at a time.",
      interpretationLayer: state.layers[0],
    },
    {
      kind: "chips",
      eyebrow: "Pressure source detected",
      title: state.layers[1].title,
      body: state.layers[1].meaning,
      supporting: "This is the first narrowing point, not the full story yet.",
      chips: state.layers[1].evidence.filter(Boolean),
      interpretationLayer: state.layers[1],
    },
    {
      kind: "rhythm",
      eyebrow: "Internal conflict discovered",
      title: state.layers[2].title,
      body: state.layers[2].meaning,
      supporting: state.pressure.summary || state.snapshot.overview,
      interpretationLayer: state.layers[2],
    },
    {
      kind: "trigger",
      eyebrow: "Behavior adaptation",
      title: state.layers[3].title,
      body: state.layers[3].meaning,
      supporting: "This is a behavior signal, not a personal failure.",
      interpretationLayer: state.layers[3],
    },
    {
      kind: "meter",
      eyebrow: "Hidden instability",
      title: `${state.topSignal.label}: ${state.topSignal.value}%`,
      body: state.layers[4].meaning,
      supporting: state.secondSignal?.value
        ? `${state.secondSignal.label} also appears at ${state.secondSignal.value}%. This is the 100% pressure split behind the validation.`
        : "This is the 100% pressure split behind the validation.",
      meterLabel: `${state.topSignal.label} • ${state.topSignal.value}%`,
      interpretationLayer: state.layers[4],
    },
    {
      kind: "final",
      eyebrow: "Protection architecture",
      title: state.layers[5].title,
      body: state.layers[5].meaning,
      supporting: architecturePlan || "One protected decision is enough to begin.",
      interpretationLayer: state.layers[5],
    },
  ];
}

export function getWorkingStudentRevealContext(profile = {}) {
  return buildProgressiveState(profile);
}

export default buildWorkingStudentReveal;
