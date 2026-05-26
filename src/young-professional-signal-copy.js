const SIGNAL_COPY = {
  workPressure: {
    awarenessTitle: "Work pressure is spending pressure.",
    guidanceTitle: "Set a workday limit.",
    subject: "work pressure",
    pressure: "busy workdays",
    behavior: "quick convenience spending",
    risk: "salary pays for stress, not priorities",
    protection: "set one workday spending limit before work starts",
    example: "coffee, food, transport, or delivery",
  },
  salaryLeak: {
    awarenessTitle: "Small leaks are adding up.",
    guidanceTitle: "Split payday first.",
    subject: "salary leaks",
    pressure: "small daily buys",
    behavior: "money disappearing without one big purchase",
    risk: "payday feels strong, then cutoff feels tight",
    protection: "split salary before lifestyle spending begins",
    example: "bills, savings, food, commute, then wants",
  },
  billsPressure: {
    awarenessTitle: "Bills are pulling first.",
    guidanceTitle: "Separate bills now.",
    subject: "bill pressure",
    pressure: "due dates and fixed costs",
    behavior: "spending before bills are fully safe",
    risk: "flexible money disappears too early",
    protection: "separate bill money the moment salary arrives",
    example: "rent, utilities, internet, phone, or loans",
  },
  careerPressure: {
    awarenessTitle: "Growth pressure is active.",
    guidanceTitle: "Invest slowly.",
    subject: "career pressure",
    pressure: "upgrades, image, and comparison",
    behavior: "buying fast to feel prepared",
    risk: "growth spending becomes panic spending",
    protection: "create a small career fund before buying upgrades",
    example: "courses, tools, clothes, or subscriptions",
  },
  burnoutRisk: {
    awarenessTitle: "Tiredness is choosing for you.",
    guidanceTitle: "Plan cheap recovery.",
    subject: "burnout spending",
    pressure: "low energy and long days",
    behavior: "buying comfort to recover fast",
    risk: "spending becomes your easiest rest",
    protection: "prepare one low-cost recovery option before exhaustion hits",
    example: "food, rides, drinks, delivery, or small comforts",
  },
  familySupportPressure: {
    awarenessTitle: "Support needs a limit.",
    guidanceTitle: "Help with boundaries.",
    subject: "family support pressure",
    pressure: "home needs and family requests",
    behavior: "giving before your own basics are safe",
    risk: "helping others empties your stability",
    protection: "set a support amount that protects you too",
    example: "groceries, bills, emergencies, or sibling support",
  },
  socialLifestylePressure: {
    awarenessTitle: "Lifestyle pressure is loud.",
    guidanceTitle: "Choose the amount first.",
    subject: "lifestyle pressure",
    pressure: "plans, dates, image, and comparison",
    behavior: "saying yes before checking the budget",
    risk: "belonging becomes hidden spending",
    protection: "decide the social limit before the invite arrives",
    example: "eating out, outfits, gifts, rides, or events",
  },
};

const AWARENESS_OPENERS = [
  "Quick check: {subject} is active.",
  "This looks like {subject}.",
  "CLARA sees {subject} here.",
  "This may be {subject}, not carelessness.",
  "This signal points to {subject}.",
  "Heads up: {subject} may be driving this.",
];

const AWARENESS_CONTEXTS = [
  "Watch for {behavior}.",
  "The usual trigger is {pressure}.",
  "The risk: {risk}.",
  "It often shows up through {example}.",
  "Small pattern, big effect if repeated.",
];

const GUIDANCE_OPENERS = [
  "Do this first: {protection}.",
  "Simple rule: {protection}.",
  "Before spending, {protection}.",
  "Keep it light: {protection}.",
  "Your next move: {protection}.",
  "Protect yourself: {protection}.",
];

const GUIDANCE_CONTEXTS = [
  "This keeps pressure from choosing for you.",
  "Start with {example}.",
  "You are not saying no forever, just not automatically.",
  "Choose the smallest version that still helps.",
  "Repeat it before the same pressure returns.",
];

function fill(template, config) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => config[key] || "");
}

function pickPair(mode) {
  const openers = mode === "guidance" ? GUIDANCE_OPENERS : AWARENESS_OPENERS;
  const contexts = mode === "guidance" ? GUIDANCE_CONTEXTS : AWARENESS_CONTEXTS;
  const first = Math.floor(Math.random() * openers.length);
  const second = Math.floor(Math.random() * contexts.length);
  return [openers[first], contexts[second]];
}

export function getYoungProfessionalRotatingSignalCopy(signalKey, mode = "awareness") {
  const config = SIGNAL_COPY[signalKey] || SIGNAL_COPY.workPressure;
  const [opener, context] = pickPair(mode);
  return {
    title: mode === "guidance" ? config.guidanceTitle : config.awarenessTitle,
    body: `${fill(opener, config)} ${fill(context, config)}`,
  };
}

export default getYoungProfessionalRotatingSignalCopy;
