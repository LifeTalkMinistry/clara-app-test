const SIGNAL_COPY = {
  workPressure: {
    awarenessTitle: "Work pressure is shaping your money.",
    guidanceTitle: "Create a workday boundary.",
    subject: "work pressure",
    pressure: "deadlines, commute, meetings, shift demands, and the need to keep performing",
    behavior: "convenience spending, reward spending, skipped tracking, or rushed food choices",
    risk: "your salary starts paying for pressure instead of priorities",
    protection: "set one workday spending rule before the day gets heavy",
    example: "food, transport, coffee, delivery, or after-work comfort",
  },
  salaryLeak: {
    awarenessTitle: "Your salary may be leaking quietly.",
    guidanceTitle: "Give payday a first move.",
    subject: "salary leakage",
    pressure: "small purchases, subscriptions, convenience buys, payday rewards, and lifestyle upgrades",
    behavior: "spending that feels harmless because income looks stable at first",
    risk: "payday feels strong, then the cutoff becomes tight again",
    protection: "split salary before lifestyle spending begins",
    example: "bills, savings, food, commute, then flexible wants",
  },
  billsPressure: {
    awarenessTitle: "Bills are creating quiet pressure.",
    guidanceTitle: "Protect fixed costs first.",
    subject: "bill pressure",
    pressure: "rent, utilities, subscriptions, due dates, loans, and monthly commitments",
    behavior: "moving money around, delaying checks, or spending before fixed costs are fully protected",
    risk: "your flexible money disappears before essentials are safe",
    protection: "separate bill money immediately when salary arrives",
    example: "rent, utilities, internet, phone, insurance, or recurring payments",
  },
  careerPressure: {
    awarenessTitle: "Career pressure can look like urgency.",
    guidanceTitle: "Invest without panic.",
    subject: "career pressure",
    pressure: "courses, tools, outfits, networking, image, promotion pressure, and comparison",
    behavior: "buying quickly to feel prepared, competitive, or less behind",
    risk: "growth spending becomes insecurity spending",
    protection: "create a small career fund and delay non-urgent upgrades",
    example: "courses, gear, clothes, subscriptions, events, or portfolio tools",
  },
  burnoutRisk: {
    awarenessTitle: "Burnout may be affecting spending.",
    guidanceTitle: "Protect recovery without overspending.",
    subject: "burnout risk",
    pressure: "low sleep, long workdays, commute fatigue, emotional drain, and recovery gaps",
    behavior: "buying comfort because rest feels unavailable",
    risk: "spending becomes the fastest way to feel human again",
    protection: "prepare one low-cost recovery option before exhaustion peaks",
    example: "food, rides, delivery, drinks, online shopping, or small comforts",
  },
  familySupportPressure: {
    awarenessTitle: "Family support is shaping your money.",
    guidanceTitle: "Support with a boundary.",
    subject: "family support pressure",
    pressure: "home needs, family requests, shared expenses, emergencies, and guilt around saying no",
    behavior: "giving even when your own essentials or savings are not protected",
    risk: "helping others slowly erases your own stability",
    protection: "set a support limit that protects both care and survival",
    example: "family contribution, emergency help, groceries, bills, or sibling support",
  },
  socialLifestylePressure: {
    awarenessTitle: "Lifestyle pressure can grow quietly.",
    guidanceTitle: "Keep connection, set the amount.",
    subject: "lifestyle pressure",
    pressure: "barkada plans, dates, image, comparison, online trends, and the desire to feel like you belong",
    behavior: "saying yes before checking what the month still needs",
    risk: "belonging becomes an unnamed budget category",
    protection: "decide the social limit before the invitation or craving arrives",
    example: "eating out, outfits, gifts, rides, events, or online buys",
  },
};

const AWARENESS_OPENERS = [
  "This signal suggests {subject} is active right now.",
  "CLARA is noticing {subject} in your current stage.",
  "This may not be careless spending; it may be {subject} showing up through money.",
  "For many young professionals, {subject} starts quietly before it becomes obvious.",
  "This signal points to the way {subject} can affect daily decisions.",
  "Your current pattern may be showing signs of {subject}.",
];

const AWARENESS_CONTEXTS = [
  "When {pressure} are present, the usual result is {behavior}.",
  "The pressure often appears through {example}, even when each one feels small alone.",
  "The risky part is that {risk}, especially when the month still has fixed responsibilities.",
  "This matters because {pressure} can make spending feel reasonable in the moment.",
  "The pattern usually becomes visible when {behavior} starts repeating across the week.",
];

const GUIDANCE_OPENERS = [
  "The first move is to {protection}.",
  "Use one simple rule today: {protection}.",
  "Before the pressure decides for you, {protection}.",
  "Keep this practical: {protection}.",
  "Make the boundary small enough to repeat: {protection}.",
  "CLARA’s recommendation is simple: {protection}.",
];

const GUIDANCE_CONTEXTS = [
  "This protects your salary from being pulled by {pressure}.",
  "Start with {example}, then check what money must still survive the week.",
  "The goal is not to remove comfort; it is to stop {risk}.",
  "If spending still feels necessary, choose the smallest version that solves the real need.",
  "Repeat the rule before the same pressure returns, not after the budget is already affected.",
];

function fill(template, config) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => config[key] || "");
}

function pickPair(signalKey, mode) {
  const openers = mode === "guidance" ? GUIDANCE_OPENERS : AWARENESS_OPENERS;
  const contexts = mode === "guidance" ? GUIDANCE_CONTEXTS : AWARENESS_CONTEXTS;
  const first = Math.floor(Math.random() * openers.length);
  const second = Math.floor(Math.random() * contexts.length);
  return [openers[first], contexts[second]];
}

export function getYoungProfessionalRotatingSignalCopy(signalKey, mode = "awareness") {
  const config = SIGNAL_COPY[signalKey] || SIGNAL_COPY.workPressure;
  const [opener, context] = pickPair(signalKey, mode);
  return {
    title: mode === "guidance" ? config.guidanceTitle : config.awarenessTitle,
    body: `${fill(opener, config)} ${fill(context, config)}`,
  };
}

export default getYoungProfessionalRotatingSignalCopy;
