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

  const layers = [];

  layers.push({
    key: "initialPattern",
    title: setup.title,
    meaning: setup.summary || snapshot.hero || snapshot.caption,
    evidence: [display(answers.setup)],
  });

  layers.push({
    key: "pressureData",
    title: rhythm.title,
    meaning: `${layers[0].title} becomes clearer when ${lower(display(answers.rhythm))} meets ${lower(topSignal.label)}.`,
    evidence: [display(answers.setup), display(answers.rhythm), `${topSignal.label}: ${topSignal.value}%`],
  });

  layers.push({
    key: "rhythmInstability",
    title: pressure.title,
    meaning: `Because ${lower(display(answers.workload))} and ${lower(display(answers.pressure))} are happening in the same week, CLARA reads this as one connected rhythm, not separate problems.`,
    evidence: [display(answers.workload), display(answers.pressure), `${secondSignal.label}: ${secondSignal.value}%`],
  });

  layers.push({
    key: "responsePattern",
    title: coping.title,
    meaning: coping.summary || `When pressure builds, ${lower(display(answers.coping))} may be a way of staying functional, not a character flaw.`,
    evidence: [display(answers.coping), thirdSignal.label],
  });

  layers.push({
    key: "protectionPriority",
    title: `${topSignal.label}: ${topSignal.value}%`,
    meaning: topSignal.note || snapshot.overview || snapshot.caption,
    evidence: signals.slice(0, 3).map((signal) => `${signal.label}: ${signal.value}%`),
  });

  layers.push({
    key: "stabilizationDirection",
    title: goal.title,
    meaning: goal.summary || `The first stabilizing move should support ${lower(display(answers.goal))}.`,
    evidence: Array.isArray(snapshot.recommendations) ? snapshot.recommendations.slice(0, 3) : [],
  });

  return { answers, snapshot, signals, setup, rhythm, workload, pressure, coping, goal, topSignal, secondSignal, thirdSignal, layers };
};

export function buildWorkingStudentReveal(profile = {}) {
  const state = buildProgressiveState(profile);
  const recommendations = state.layers[5].evidence.length
    ? state.layers[5].evidence.join(" • ")
    : "One protected decision is enough to begin.";

  return [
    {
      kind: "opening",
      eyebrow: "Current Working Student path",
      title: state.layers[0].title,
      body: state.layers[0].meaning,
      supporting: state.snapshot.supportTitle || "CLARA is reading your selected Working Student path.",
      interpretationLayer: state.layers[0],
    },
    {
      kind: "chips",
      eyebrow: "Pressure data added",
      title: state.layers[1].title,
      body: state.layers[1].meaning,
      supporting: `This updates the first read into ${lower(state.snapshot.title)}.`,
      chips: state.layers[1].evidence.filter(Boolean),
      interpretationLayer: state.layers[1],
    },
    {
      kind: "rhythm",
      eyebrow: "Rhythm reinterpretation",
      title: state.layers[2].title,
      body: state.layers[2].meaning,
      supporting: state.pressure.summary || state.snapshot.overview,
      interpretationLayer: state.layers[2],
    },
    {
      kind: "trigger",
      eyebrow: "Behavior response",
      title: state.layers[3].title,
      body: state.layers[3].meaning,
      supporting: "CLARA is reading the behavior as a pressure response, not a personal failure.",
      interpretationLayer: state.layers[3],
    },
    {
      kind: "meter",
      eyebrow: "Life Stage Trend Snapshot",
      title: state.layers[4].title,
      body: state.layers[4].meaning,
      supporting: state.secondSignal?.value
        ? `${state.secondSignal.label} also appears at ${state.secondSignal.value}%. This is a 100% pressure split of the detected pattern.`
        : "This is a 100% pressure split of the detected pattern.",
      meterLabel: `${state.topSignal.label} • ${state.topSignal.value}%`,
      interpretationLayer: state.layers[4],
    },
    {
      kind: "final",
      eyebrow: "First stabilization direction",
      title: state.layers[5].title,
      body: state.layers[5].meaning,
      supporting: recommendations || "One protected decision is enough to begin.",
      interpretationLayer: state.layers[5],
    },
  ];
}

export function getWorkingStudentRevealContext(profile = {}) {
  return buildProgressiveState(profile);
}

export default buildWorkingStudentReveal;
