import {
  WORKING_STUDENT_STAGE_KEY,
  completeWorkingStudentDraft,
  getWorkingStudentDisplayLabel,
  getWorkingStudentSnapshot,
} from "./workingStudentLifeStageSource";

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const display = (value) => getWorkingStudentDisplayLabel(value) || clean(value);

const includesAny = (value, needles = []) => {
  const text = clean(value).toLowerCase();
  return needles.some((needle) => text.includes(String(needle).toLowerCase()));
};

const buildAnswerText = (answers) =>
  [answers.setup, answers.rhythm, answers.workload, answers.pressure, answers.coping, answers.goal]
    .map(clean)
    .join(" | ")
    .toLowerCase();

const getSignal = (signals, index, fallback = {}) =>
  signals[index] || {
    label: fallback.label || "Working Student pressure",
    value: fallback.value || 0,
    note: fallback.note || "This is part of the Working Student pattern.",
    insight: fallback.insight || "This signal helps CLARA understand the situation more clearly.",
  };

const compactSignal = (signal) => `${signal.label}: ${signal.value}%`;

function detectAwarenessPattern(answers) {
  const text = buildAnswerText(answers);

  if (includesAny(text, ["family", "home", "guilt", "shared", "support boundary", "income goes home", "family needs"])) {
    return {
      key: "familyLinked",
      title: "A family-linked student pattern appears.",
      body:
        "Students in this pattern often experience money as shared responsibility, not only personal allowance or income. School costs, home needs, guilt, and personal stability can occupy the same financial space.",
      commonBehavior:
        "A common pattern is quiet adjustment: the student gives, delays personal needs, or mentally recalculates what remains for school and daily essentials.",
      financialMeaning:
        "Financially, this pattern matters because personal school money can slowly become household backup money.",
      emotionalMeaning:
        "Emotionally, the pressure is often connected to care, responsibility, and the fear of seeming selfish.",
    };
  }

  if (includesAny(text, ["tuition", "school payments", "school costs", "school deadlines", "school continuity", "fear of stopping", "printing", "materials"])) {
    return {
      key: "schoolContinuity",
      title: "A school-continuity pattern appears.",
      body:
        "Students in this pattern often connect money directly to staying enrolled, submitting requirements, attending class, and keeping progress alive. Spending decisions can feel tied to the future, not just the present week.",
      commonBehavior:
        "A common pattern is personal sacrifice first: the student may reduce comfort, delay non-school needs, or stretch daily spending to protect school-related costs.",
      financialMeaning:
        "Financially, this pattern matters because tuition, projects, fare, food, and school materials can compete inside the same limited budget.",
      emotionalMeaning:
        "Emotionally, the pressure often comes from fear of interruption, falling behind, or losing momentum.",
    };
  }

  if (includesAny(text, ["exhaust", "tired", "burn", "commute", "comfort", "convenience", "missed tracking", "low recovery", "rest", "heavy schedule", "shifts"])) {
    return {
      key: "fatigueDriven",
      title: "An energy-pressure pattern appears.",
      body:
        "Students in this pattern often experience spending pressure through fatigue. Work, school, commute, deadlines, and low recovery can affect how consistent planning and tracking feel.",
      commonBehavior:
        "A common pattern is convenience or comfort spending: not because the student is careless, but because the day has already used most of their energy.",
      financialMeaning:
        "Financially, this pattern matters because energy-saving choices can quietly become repeated expenses.",
      emotionalMeaning:
        "Emotionally, the pressure often feels like needing relief, silence, rest, or a small reward after carrying too much.",
    };
  }

  if (includesAny(text, ["borrow", "repay", "delayed", "delay payments", "timing mismatch", "pressure carries over", "repair mode", "old pressure"])) {
    return {
      key: "delayedPressure",
      title: "A carryover-pressure pattern appears.",
      body:
        "Students in this pattern often start a new week with old financial pressure still active. Borrowing, repayment, delayed payments, or timing gaps can make income feel assigned before it arrives.",
      commonBehavior:
        "A common pattern is survival-first decision making: the student handles the most urgent gap now, then carries the repair into the next income cycle.",
      financialMeaning:
        "Financially, this pattern matters because one delay can influence several future decisions.",
      emotionalMeaning:
        "Emotionally, the pressure often feels like catching up, avoiding the full picture, or trying to breathe while numbers are still moving.",
    };
  }

  if (includesAny(text, ["small", "reward", "leak", "social", "extra income disappears", "strict tracking", "saving feels inconsistent", "spend when i feel stuck"])) {
    return {
      key: "reliefSpending",
      title: "A relief-spending pattern appears.",
      body:
        "Students in this pattern often use small purchases as relief, reward, social participation, or a way to feel normal after effort. The individual amount may look small, but the pattern matters through repetition.",
      commonBehavior:
        "A common pattern is repeated micro-spending: food, drinks, small online purchases, or social expenses that feel harmless in the moment.",
      financialMeaning:
        "Financially, this pattern matters because small repeated costs can weaken savings rhythm without feeling like a major mistake.",
      emotionalMeaning:
        "Emotionally, the spending often represents recovery, belonging, or a small sense of control during a pressured week.",
    };
  }

  return {
    key: "unstableBuilding",
    title: "A building-while-unstable pattern appears.",
    body:
      "Students in this pattern are trying to move forward while income, routine, priorities, or emotional capacity still change from week to week. The situation often shows effort and uncertainty at the same time.",
    commonBehavior:
      "A common pattern is switching plans, starting and stopping savings, or changing priorities depending on how the week feels.",
    financialMeaning:
      "Financially, this pattern matters because progress becomes harder to measure when the base keeps moving.",
    emotionalMeaning:
      "Emotionally, the pressure often comes from wanting a better future while still managing an unstable present.",
  };
}

function buildDistributionSentence(signals = []) {
  const visible = signals.slice(0, 4).filter((signal) => signal?.label);
  if (!visible.length) return "CLARA is still forming the pressure distribution for this Working Student path.";
  return visible.map(compactSignal).join(" • ");
}

function buildWorkingStudentAwarenessState(profile = {}) {
  const answers = completeWorkingStudentDraft({ ...profile, stage: WORKING_STUDENT_STAGE_KEY });
  const snapshot = getWorkingStudentSnapshot(answers);
  const signals = Array.isArray(snapshot.indicators) ? snapshot.indicators : [];
  const topSignal = getSignal(signals, 0, { value: 100, note: snapshot.overview || snapshot.caption });
  const secondSignal = getSignal(signals, 1, { label: snapshot.title, value: 0, note: snapshot.caption });
  const thirdSignal = getSignal(signals, 2, { label: "Context signal", value: 0, note: snapshot.supportBody });
  const pattern = detectAwarenessPattern(answers);

  return {
    answers,
    snapshot,
    signals,
    topSignal,
    secondSignal,
    thirdSignal,
    pattern,
    distributionText: buildDistributionSentence(signals),
    selectedPath: [
      display(answers.setup),
      display(answers.rhythm),
      display(answers.workload),
      display(answers.pressure),
      display(answers.coping),
      display(answers.goal),
    ].filter(Boolean),
  };
}

export function buildWorkingStudentReveal(profile = {}) {
  const state = buildWorkingStudentAwarenessState(profile);

  return [
    {
      kind: "opening",
      eyebrow: "Working Student awareness",
      title: "Let’s see what CLARA noticed.",
      body:
        "CLARA is reading your answers as a pattern often seen among working students experiencing similar school, work, money, and responsibility pressure.",
      supporting: "This is statistical awareness, not advice yet.",
      interpretationLayer: { key: "awarenessOpening", evidence: state.selectedPath },
    },
    {
      kind: "chips",
      eyebrow: "Selected situation",
      title: state.pattern.title,
      body: state.pattern.body,
      supporting: "These are the context points CLARA is remembering from your path.",
      chips: state.selectedPath.slice(0, 4),
      interpretationLayer: { key: state.pattern.key, evidence: state.selectedPath },
    },
    {
      kind: "distribution",
      eyebrow: "100% pressure split",
      title: "The pressure is not coming from one place.",
      body: state.distributionText,
      supporting:
        "The percentages show how CLARA currently divides the visible pressure signals in this Working Student situation.",
      interpretationLayer: { key: "pressureDistribution", evidence: state.signals.map(compactSignal) },
    },
    {
      kind: "strongestSignal",
      eyebrow: "Strongest signal",
      title: `${state.topSignal.label} is the largest visible signal.`,
      body:
        state.topSignal.note ||
        "This signal appears as the strongest part of the current Working Student pattern.",
      supporting:
        state.topSignal.insight ||
        "This helps CLARA understand what may be influencing the situation most strongly.",
      interpretationLayer: { key: state.topSignal.key || state.topSignal.label, evidence: [compactSignal(state.topSignal)] },
    },
    {
      kind: "commonPattern",
      eyebrow: "Common behavior pattern",
      title: "This situation often changes behavior quietly.",
      body: state.pattern.commonBehavior,
      supporting: `${state.pattern.financialMeaning} ${state.pattern.emotionalMeaning}`,
      interpretationLayer: {
        key: "commonBehaviorPattern",
        evidence: [compactSignal(state.topSignal), compactSignal(state.secondSignal), compactSignal(state.thirdSignal)],
      },
    },
    {
      kind: "final",
      eyebrow: "CLARA context memory",
      title: "CLARA knows your situation better now.",
      body:
        "When you interact with CLARA or ask for help later, this Working Student context can be used to understand your money decisions more clearly.",
      supporting:
        "The advice comes later — after CLARA understands the real-life pressure behind the numbers.",
      interpretationLayer: { key: "contextMemory", evidence: state.selectedPath },
    },
  ];
}

export function getWorkingStudentRevealContext(profile = {}) {
  return buildWorkingStudentAwarenessState(profile);
}

export default buildWorkingStudentReveal;