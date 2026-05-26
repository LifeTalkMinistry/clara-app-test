import { getLifeStageGuidance } from "./life-stage-guidance";
import { getSelectedLifeStageKey, normalizeLifeStageKey, readSelectedLifeStageProfile } from "./life-stage-flow";

const WORKING_STUDENT_STAGE_KEY = "Working Student";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getProfile() {
  return readSelectedLifeStageProfile?.() || {};
}

function getStage() {
  const profile = getProfile();
  return normalizeLifeStageKey(profile.stage || getSelectedLifeStageKey());
}

function findLifeStageHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard() {
  const hero = findLifeStageHero();
  if (!hero) return null;

  let current = hero.nextElementSibling;
  while (current) {
    if (current.matches?.("[data-clara-pressure-signals='true']")) {
      current = current.nextElementSibling;
      continue;
    }
    if (clean(current.querySelector?.("h3")?.textContent) || current.querySelector?.("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function getTextNodes(card) {
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, body };
}

function setText(node, value) {
  const next = String(value || "");
  if (node && node.textContent !== next) node.textContent = next;
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function getActiveSignalId(card) {
  return clean(card?.dataset?.claraSelectedSignal)
    || clean(document.querySelector("[data-clara-pressure-signal][data-active='true']")?.dataset?.claraPressureSignal)
    || clean(document.querySelector("[data-clara-pressure-signal]")?.dataset?.claraPressureSignal)
    || "pressure";
}

const STAGE_SIGNAL_COPY = {
  "Young Professional": {
    independencePressure: {
      awareness: { title: "Independence pressure is showing.", body: "Bills, food, commute, rent, and personal choices are starting to carry real weight." },
      guidance: { title: "Secure the fixed costs first.", body: "Protect bills, food, commute, and savings before lifestyle or reward spending begins." },
    },
    salaryLeak: {
      awareness: { title: "Salary leak is showing.", body: "The income may look stable, but repeated small costs can quietly take the space meant for savings." },
      guidance: { title: "Create a salary boundary.", body: "Split payday first: bills, savings, food, commute, then flexible spending." },
    },
    familySupportPressure: {
      awareness: { title: "Family support is affecting the salary.", body: "Helping family can be meaningful, but it can also reduce the room for your own stability." },
      guidance: { title: "Set a support limit.", body: "Choose an amount that helps without removing your essentials, savings, and recovery money." },
    },
    careerPressure: {
      awareness: { title: "Career pressure is active.", body: "Courses, tools, image, and comparison can make spending feel connected to growth." },
      guidance: { title: "Separate growth from panic.", body: "Create a small career fund so upgrades are planned instead of reaction-based." },
    },
    burnoutRisk: {
      awareness: { title: "Burnout risk is showing.", body: "Workload, commute, shifting schedules, or pressure can make spending feel like recovery." },
      guidance: { title: "Protect recovery without overspending.", body: "Pick one low-cost recovery option before exhaustion chooses the most convenient one." },
    },
    debtCarryover: {
      awareness: { title: "Debt is entering the current salary.", body: "Old balances or pay-later habits can make new income feel already spoken for." },
      guidance: { title: "Stop new debt first.", body: "Create one no-new-debt rule, then give repayment a predictable place every cutoff." },
    },
    socialLifestylePressure: {
      awareness: { title: "Lifestyle pressure is active.", body: "Social life, image, dates, or comparison can quietly become part of the salary rhythm." },
      guidance: { title: "Keep connection with a limit.", body: "Decide the amount before the social pressure starts, then protect the rest." },
    },
    budgetDiscipline: {
      awareness: { title: "There is still planning capacity.", body: "The pattern shows room to build structure before salary pressure gets louder." },
      guidance: { title: "Make one payday rule automatic.", body: "Use the same first move every salary day so the month starts with protection." },
    },
  },

  "Living with Partner": {
    sharedBills: {
      awareness: { title: "Shared bills need clarity.", body: "Rent, utilities, food, and daily costs can become emotional when the split is unclear." },
      guidance: { title: "Make the split visible.", body: "Write the next shared bill and agree who covers what before the payment happens." },
    },
    fairness: {
      awareness: { title: "Fairness pressure can build quietly.", body: "Uneven contribution can feel heavier when one person silently carries more." },
      guidance: { title: "Talk before resentment grows.", body: "Name one unfair-feeling pattern gently and choose one adjustment together." },
    },
    moneyTalks: {
      awareness: { title: "Avoided money talks create fog.", body: "When money feels sensitive, both people may avoid the topic until pressure appears." },
      guidance: { title: "Make one topic safe.", body: "Discuss only one thing first: bills, food, savings, or debt. Keep the goal clarity, not blame." },
    },
    comfortSpending: {
      awareness: { title: "Comfort spending can become bonding.", body: "Food, dates, delivery, and treats can feel like love, peace, or recovery." },
      guidance: { title: "Keep bonding affordable.", body: "Choose the shared comfort limit before it becomes an open-ended pattern." },
    },
    familyBoundaries: {
      awareness: { title: "Family boundaries affect both wallets.", body: "Outside support requests can quickly become a shared-money issue." },
      guidance: { title: "Agree before giving.", body: "Decide together what support is safe after bills, food, and emergency money are protected." },
    },
    futurePlans: {
      awareness: { title: "Future plans shape today’s spending.", body: "Moving, marriage plans, shared savings, or long-term goals can make small choices matter more." },
      guidance: { title: "Protect the shared direction.", body: "Choose one shared priority before optional spending competes with it." },
    },
    emergencyBuffer: {
      awareness: { title: "Shared life needs a buffer.", body: "One unexpected cost can affect both people when bills, food, and rent are connected." },
      guidance: { title: "Build a small safety layer.", body: "Start with a small shared emergency amount and treat it as protected money." },
    },
  },

  "Family Household": {
    pressure: {
      awareness: { title: "Home support is affecting the budget.", body: "Food, bills, requests, and shared needs can quickly reshape the month when family responsibility is involved." },
      guidance: { title: "Protect support with limits.", body: "Choose a support amount that helps at home without emptying your own essentials and buffer." },
    },
    stability: {
      awareness: { title: "Support needs a stable base.", body: "Helping becomes harder when your own food, bills, and personal safety money disappear too." },
      guidance: { title: "Keep a personal buffer visible.", body: "Set aside even a small protected amount before responding to new household requests." },
    },
    energy: {
      awareness: { title: "Family responsibility can drain energy.", body: "Carrying home needs can make money decisions feel emotional, especially when rest and boundaries are thin." },
      guidance: { title: "Reduce the emotional load.", body: "Pause before saying yes and check what the request will affect this week." },
    },
    growth: {
      awareness: { title: "Your goals still need space.", body: "Home support matters, but personal progress can quietly disappear when every peso becomes shared." },
      guidance: { title: "Protect one personal goal.", body: "Give one goal a fixed place in the budget, even if the amount starts small." },
    },
    boundaries: {
      awareness: { title: "Boundaries protect support.", body: "Without a clear limit, every request can become a full-budget emergency." },
      guidance: { title: "Set one family boundary.", body: "Define what you can safely give this cycle before pressure decides for you." },
    },
  },

  "Single Parent": {
    pressure: {
      awareness: { title: "Essentials are carrying weight.", body: "Food, school, health, transport, and child needs can make every budget decision feel sensitive." },
      guidance: { title: "Protect essentials first.", body: "Keep food, school, health, and transport visible before flexible spending gets space." },
    },
    stability: {
      awareness: { title: "Safety matters first.", body: "One surprise expense can affect the whole household rhythm when there is little margin." },
      guidance: { title: "Build a small safety layer.", body: "Start with a tiny emergency amount that stays protected from daily spending." },
    },
    energy: {
      awareness: { title: "Care is using energy too.", body: "Parenting, work, and planning can make money decisions heavier when there is little space to reset." },
      guidance: { title: "Protect parent energy too.", body: "Choose one low-effort money rule that still works on tired days." },
    },
    growth: {
      awareness: { title: "The future is part of today.", body: "Child stability and future plans often sit inside the same daily choices." },
      guidance: { title: "Fund the next safe step.", body: "Put even a small amount toward the child-related priority that needs protection first." },
    },
    boundaries: {
      awareness: { title: "Your needs still count.", body: "Protecting your own food, rest, and stability is connected to protecting your child’s life." },
      guidance: { title: "Keep one need protected.", body: "Do not let every flexible amount disappear before your own basic need is covered." },
    },
  },

  "Full-Time Earner": {
    pressure: {
      awareness: { title: "Salary pressure is showing.", body: "A stable paycheck can still feel tight when bills, subscriptions, family needs, and daily spending all pull from it." },
      guidance: { title: "Give salary a first move.", body: "Assign bills, savings, food, and commute before reward or convenience spending begins." },
    },
    stability: {
      awareness: { title: "The salary needs structure.", body: "Predictable income becomes stronger when payday has a clear first move." },
      guidance: { title: "Make payday automatic.", body: "Use the same salary split every cutoff so the month starts protected." },
    },
    energy: {
      awareness: { title: "Work fatigue can affect spending.", body: "Long routines can make convenience or reward spending feel like recovery after carrying the day." },
      guidance: { title: "Plan recovery spending.", body: "Choose a small recovery limit before tiredness chooses the easiest option." },
    },
    growth: {
      awareness: { title: "Stable income has potential.", body: "The opportunity is not only earning regularly, but keeping enough of the salary to build security." },
      guidance: { title: "Protect savings before lifestyle.", body: "Move one savings amount first, then let the remaining money handle flexible choices." },
    },
    boundaries: {
      awareness: { title: "Cutoff rules can protect you.", body: "A simple limit around payday, bills, and rewards can stop the same cycle from repeating." },
      guidance: { title: "Set one cutoff boundary.", body: "Decide what amount must last until the next salary before spending freely." },
    },
  },

  "Freelance Season": {
    pressure: {
      awareness: { title: "Income timing is the pressure.", body: "Client money can arrive in waves while expenses stay regular, so the gap between payments matters." },
      guidance: { title: "Protect the dry-week gap.", body: "Keep essentials safe before project money turns into flexible spending." },
    },
    stability: {
      awareness: { title: "Freelance income needs a buffer.", body: "Strong weeks feel better when part of the money is protected for dry weeks and delayed payments." },
      guidance: { title: "Build a freelance buffer.", body: "Set aside a fixed percentage from strong payments before using the rest." },
    },
    energy: {
      awareness: { title: "Freedom can still feel heavy.", body: "Flexible work can blur rest, earning, and client pressure until the schedule becomes draining." },
      guidance: { title: "Protect the work rhythm.", body: "Choose one rest or admin boundary so income pressure does not consume every hour." },
    },
    growth: {
      awareness: { title: "Your freedom needs structure.", body: "Freelance growth becomes safer when client flow, pricing, and buffers do not depend on one good week." },
      guidance: { title: "Stabilize before scaling.", body: "Protect a baseline amount first, then use extra income for growth." },
    },
    boundaries: {
      awareness: { title: "Separate money creates clarity.", body: "When work money and personal money mix, it becomes harder to see what is safe to spend." },
      guidance: { title: "Separate work and personal money.", body: "Keep operating costs, taxes, savings, and spending in clear places before the month moves." },
    },
  },

  "Business Builder": {
    pressure: {
      awareness: { title: "Cash flow pressure is active.", body: "Sales timing, operating costs, inventory, and reinvestment can make business money feel urgent before profit feels stable." },
      guidance: { title: "Separate growth from survival.", body: "Keep business costs, owner pay, and personal essentials from pulling from the same invisible pool." },
    },
    stability: {
      awareness: { title: "Cash flow needs protection.", body: "A business can be growing and still feel tight when expenses happen before sales fully arrive." },
      guidance: { title: "Build a small runway.", body: "Protect operating money first, then decide what can safely be reinvested." },
    },
    energy: {
      awareness: { title: "Decision load is real.", body: "Building can make every money decision feel strategic, risky, and personal at the same time." },
      guidance: { title: "Simplify one decision rule.", body: "Create one rule for reinvestment or owner pay so every choice does not restart from zero." },
    },
    growth: {
      awareness: { title: "Growth needs pacing.", body: "Reinvestment can help the business move, but it becomes safer when personal stability is not erased." },
      guidance: { title: "Grow with a boundary.", body: "Decide what percentage can go to growth only after essentials and operating costs are safe." },
    },
    boundaries: {
      awareness: { title: "Business and personal money need lines.", body: "Clear separation shows what belongs to operations, what belongs to growth, and what protects your life." },
      guidance: { title: "Create money lanes.", body: "Separate operating costs, reinvestment, owner pay, and personal essentials before spending decisions happen." },
    },
  },
};

function getMappedCopy(stage, signalId, mode) {
  const stageCopy = STAGE_SIGNAL_COPY[stage];
  const signalCopy = stageCopy?.[signalId] || stageCopy?.pressure;
  return signalCopy?.[mode] || signalCopy?.awareness || null;
}

function getStageSignalCopy(stage, signalId, mode) {
  const profile = getProfile();
  return getMappedCopy(stage, signalId, mode)
    || getLifeStageGuidance(stage, { signalId, mode, profile });
}

function applyStageAwareCopy(signalId = null, mode = "awareness") {
  const stage = getStage();
  if (!stage || stage === WORKING_STUDENT_STAGE_KEY) return false;

  const card = findSupportCard();
  const { title, body } = getTextNodes(card);
  if (!card || !title || !body) return false;

  const activeSignal = signalId || getActiveSignalId(card);
  if (!activeSignal || activeSignal === "default") return false;

  const copy = getStageSignalCopy(stage, activeSignal, mode);
  if (!copy?.title || !copy?.body) return false;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSelectedSignal = activeSignal;
  card.dataset.claraSignalMode = mode;
  card.dataset.claraSignalCardActive = "true";
  card.dataset.claraStageAwareSignal = "true";

  setText(title, copy.title);
  setText(body, copy.body);
  setActiveIcon(activeSignal);
  return true;
}

function installLifeStageSignalCardStageGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_SIGNAL_CARD_STAGE_GUARD__) return;
  window.__CLARA_SIGNAL_CARD_STAGE_GUARD__ = true;

  document.addEventListener("click", (event) => {
    const stage = getStage();
    if (!stage || stage === WORKING_STUDENT_STAGE_KEY) return;

    const signal = event.target?.closest?.("[data-clara-pressure-signal]");
    const heart = event.target?.closest?.("[data-clara-heart-cta='true']");
    if (!signal && !heart) return;

    const signalId = signal?.dataset?.claraPressureSignal || getActiveSignalId(findSupportCard());
    const mode = heart ? "guidance" : "awareness";

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    applyStageAwareCopy(signalId, mode);
    window.setTimeout(() => applyStageAwareCopy(signalId, mode), 40);
    window.setTimeout(() => applyStageAwareCopy(signalId, mode), 120);
  }, true);

  window.addEventListener("clara:life-stage-profile-updated", () => {
    window.setTimeout(() => {
      const card = findSupportCard();
      const signalId = getActiveSignalId(card);
      if (signalId && signalId !== "default") applyStageAwareCopy(signalId, "awareness");
    }, 120);
  }, { passive: true });
}

try {
  installLifeStageSignalCardStageGuard();
} catch (error) {
  console.warn("CLARA signal card stage guard failed:", error);
}
