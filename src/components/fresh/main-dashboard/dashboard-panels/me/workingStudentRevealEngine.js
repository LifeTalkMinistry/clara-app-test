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
    note: fallback.note || "This is part of the Working Student pattern.",
  };

const buildAnswerText = (answers) =>
  [answers.setup, answers.rhythm, answers.workload, answers.pressure, answers.coping, answers.goal]
    .map(clean)
    .join(" | ")
    .toLowerCase();

const signalLine = (signal) => `${signal.label} appears at ${signal.value}% in this pattern.`;

const detectBehaviorPattern = (answers) => {
  const text = buildAnswerText(answers);

  if (includesAny(text, ["family", "home", "guilt", "shared", "support boundary", "income goes home"])) {
    return {
      key: "familyLinked",
      sourceLabel: "Home needs are quietly entering your school budget.",
      conflictTitle: "The hard part is the guilt.",
      conflictBody:
        "You are not only choosing where money goes. You are also carrying the feeling that protecting your own stability might disappoint someone else.",
      adaptationTitle: includesAny(text, ["limits", "boundary"])
        ? "You are trying to set limits without feeling selfish."
        : "You may be carrying the pressure quietly first.",
      adaptationBody: includesAny(text, ["delay my own needs", "give even when", "hide money stress"])
        ? "Your own needs may move last so the week can keep going for everyone else."
        : "You try to stay helpful while privately calculating what is left for you.",
      instabilityTitle: "School money may be turning into shared household money.",
      instabilityBody:
        "Class, fare, food, and recovery money can slowly become the backup fund for everyone.",
      architectureTitle: "You need a boundary that still lets you care.",
      architectureBody:
        "This setup needs protection before stricter discipline: keep school and daily needs separate first, then set a family-help ceiling from what remains.",
      plan: ["Family support limit", "Essentials-first rule", "School wallet"],
    };
  }

  if (includesAny(text, ["tuition", "school payments", "school costs", "school deadlines", "school continuity"])) {
    return {
      key: "schoolContinuity",
      sourceLabel: "School costs are carrying the weight of the week.",
      conflictTitle: "You are protecting your future while spending your energy now.",
      conflictBody:
        "School matters deeply, but protecting school can quietly shrink food, rest, fare, or personal needs.",
      adaptationTitle: "You may be trading comfort for continuity.",
      adaptationBody:
        "You keep school moving by cutting personal space first, even when your body already feels stretched.",
      instabilityTitle: "The danger is slow depletion, not one big mistake.",
      instabilityBody:
        "The month can look controlled while meals, rest, repayment margin, or energy quietly run out before the next school deadline.",
      architectureTitle: "Your school money needs a firewall.",
      architectureBody:
        "Separate school money from daily survival money first. Then protect a small food-and-fare floor so tuition pressure does not drain your body.",
      plan: ["Tuition firewall", "Food/fare floor", "Deadline buffer"],
    };
  }

  if (includesAny(text, ["exhaust", "tired", "burn", "commute", "comfort", "convenience", "missed tracking", "low recovery", "rest"])) {
    return {
      key: "fatigueDriven",
      sourceLabel: "Your budget may be reacting to tiredness first.",
      conflictTitle: "The real battle may be energy, not discipline.",
      conflictBody:
        "Planning, cooking, tracking, and pausing all require energy, and some days that energy is already gone.",
      adaptationTitle: includesAny(text, ["convenience"])
        ? "Convenience may be helping you get through the day."
        : "Comfort spending may be acting like emergency recovery.",
      adaptationBody:
        "Spending can become a shortcut to keep functioning when your schedule leaves almost no room to recover.",
      instabilityTitle: "The first crack may appear in routine before money runs out.",
      instabilityBody:
        "Tracking, meals, transport choices, or rest can weaken first, then the budget starts reacting to exhaustion instead of intention.",
      architectureTitle: "Build rules for tired days, not perfect days.",
      architectureBody:
        "Your rhythm needs low-energy protection: pre-decide food, fare, and small recovery spending before exhaustion starts negotiating.",
      plan: ["Tired-day rule", "Recovery allowance", "Low-energy tracking"],
    };
  }

  if (includesAny(text, ["borrow", "repay", "delayed", "delay payments", "timing mismatch", "pressure carries over"])) {
    return {
      key: "delayedPressure",
      sourceLabel: "Last week may still be touching this week.",
      conflictTitle: "You are trying to breathe while catching up.",
      conflictBody:
        "The deeper issue is timing: money may arrive after pressure already forced a decision, so this week starts with last week still attached.",
      adaptationTitle: "Delay can feel like the only available option.",
      adaptationBody:
        "Borrowing, delaying, or avoiding the full picture can protect today, but it can also make the next week tighter before it starts.",
      instabilityTitle: "Stability gets thin when the next income is already assigned.",
      instabilityBody:
        "The hard part is losing room to choose because repayment, food, fare, and school needs arrive together.",
      architectureTitle: "You need a no-new-pressure reset path.",
      architectureBody:
        "Start with a tiny food-and-fare buffer, then create a repayment rhythm that keeps one delayed decision from becoming the whole month.",
      plan: ["No-new-pressure rule", "Repayment rhythm", "Food/fare buffer"],
    };
  }

  if (includesAny(text, ["small", "reward", "leak", "social", "extra income disappears", "strict tracking", "saving feels inconsistent"])) {
    return {
      key: "leakProne",
      sourceLabel: "Small rewards are becoming pressure relief.",
      conflictTitle: "Small rewards may be carrying bigger feelings.",
      conflictBody:
        "The spending may look minor, but it often appears when effort, school stress, or the need to feel normal builds up.",
      adaptationTitle: "You are not overspending randomly. You are buying relief in small pieces.",
      adaptationBody:
        "Small purchases can make the week feel lighter, but when they repeat, they quietly weaken the savings rhythm you are trying to build.",
      instabilityTitle: "The hard part is that it does not feel dangerous at first.",
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
    sourceLabel: "Your future goal needs one steady anchor.",
    conflictTitle: "You are trying to build with a base that still moves.",
    conflictBody:
      "The hidden conflict is that ambition needs consistency, but your income, schedule, and priorities may still change from week to week.",
    adaptationTitle: "Switching plans may be your way of searching for safety.",
    adaptationBody:
      "When the next right move is unclear, saving, spending, and planning can start and stop repeatedly.",
    instabilityTitle: "The weak point is having no protected priority.",
    instabilityBody:
      "Your stability weakens when every goal competes at once and none of them becomes the anchor for the week.",
    architectureTitle: "Choose one protected priority first.",
    architectureBody:
      "Pick one financial anchor for the week — buffer, school, repayment, or essentials — then let CLARA protect that before adding more goals.",
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
      `CLARA is starting with ${lower(display(answers.setup))}, because that is the environment everything else is happening inside.`,
    evidence: [display(answers.setup)],
  });

  layers.push({
    key: "pressureSource",
    title: pattern.sourceLabel,
    meaning: `${rhythm.title}. This is usually where the pressure starts: ${lower(display(answers.rhythm))} is where the week begins to feel tighter.`,
    evidence: [display(answers.setup), display(answers.rhythm), signalLine(topSignal)],
  });

  layers.push({
    key: "internalConflict",
    title: pattern.conflictTitle,
    meaning: pattern.conflictBody,
    evidence: [display(answers.workload), display(answers.pressure), signalLine(secondSignal)],
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
      eyebrow: "Where it starts",
      title: state.layers[1].title,
      body: state.layers[1].meaning,
      supporting: "This is only the starting point. The deeper reason usually appears next.",
      chips: state.layers[1].evidence.filter(Boolean),
      interpretationLayer: state.layers[1],
    },
    {
      kind: "rhythm",
      eyebrow: "What it costs inside",
      title: state.layers[2].title,
      body: state.layers[2].meaning,
      supporting: state.pressure.summary || state.snapshot.overview,
      interpretationLayer: state.layers[2],
    },
    {
      kind: "trigger",
      eyebrow: "The way you cope",
      title: state.layers[3].title,
      body: state.layers[3].meaning,
      supporting: "This is a behavior signal, not a character judgment.",
      interpretationLayer: state.layers[3],
    },
    {
      kind: "meter",
      eyebrow: "Where stability gets thin",
      title: state.layers[4].title,
      body: state.layers[4].meaning,
      supporting: state.secondSignal?.value
        ? `${state.secondSignal.label} also appears at ${state.secondSignal.value}%. The numbers support the pattern; they are not a score.`
        : "The numbers support the pattern; they are not a score.",
      meterLabel: `${state.topSignal.label} • ${state.topSignal.value}%`,
      interpretationLayer: state.layers[4],
    },
    {
      kind: "final",
      eyebrow: "A gentler protection system",
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
