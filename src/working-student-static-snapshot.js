const LIFE_STAGE_PROFILE_KEY = "clara_life_stage_profile_v1";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readProfile() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_PROFILE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function clamp(value, min = 38, max = 96) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function statusLabel(value) {
  if (value >= 75) return "High";
  if (value >= 60) return "Moderate";
  if (value >= 45) return "Watch";
  return "Low";
}

function hasAny(value, options) {
  const text = clean(value).toLowerCase();
  return options.some((option) => text.includes(clean(option).toLowerCase()));
}

const WORKING_STUDENT_ARCHETYPES = {
  survivalHeavy: {
    key: "survivalHeavy",
    label: "Survival-heavy working student",
    hero:
      "Your current routine is built around survival before comfort. School, work, daily needs, and limited money may be competing in the same week, so many decisions happen under fatigue rather than calm planning.",
    supportTitle: "This pressure is real.",
    supportBody:
      "Many working students in this pattern are not careless with money — they are trying to keep school, work, food, transport, and rest alive at the same time.",
    cards: [
      {
        category: "energy",
        label: "Burnout Risk",
        value: 88,
        note:
          "Recovery space is low, so CLARA should protect sleep, food, commute, school deadlines, and emotional breathing room before pushing aggressive saving.",
      },
      {
        category: "pressure",
        label: "Financial Pressure",
        value: 84,
        note:
          "Daily expenses, school needs, and unstable room for error can make the month feel tight even when spending is not excessive.",
      },
      {
        category: "stability",
        label: "Emotional Spending Risk",
        value: 66,
        note:
          "Small relief purchases may appear when the body needs rest but the schedule does not give enough space to recover.",
      },
      {
        category: "growth",
        label: "Future Potential",
        value: 81,
        note:
          "This stage is heavy, but it can still build discipline and resilience when the system protects essentials first.",
      },
    ],
  },
  familyCarrying: {
    key: "familyCarrying",
    label: "Family-carrying working student",
    hero:
      "You are not only studying for your future — you may also be helping stabilize people around you. That makes money feel emotional because family needs and personal progress can compete in the same week.",
    supportTitle: "You are carrying more than school.",
    supportBody:
      "Many students in this situation feel pressure quietly because helping family can feel loving and heavy at the same time.",
    cards: [
      {
        category: "energy",
        label: "Responsibility Burnout",
        value: 84,
        note:
          "Family-linked responsibility can increase emotional fatigue because the student role and provider role overlap.",
      },
      {
        category: "pressure",
        label: "Shared Financial Pressure",
        value: 86,
        note:
          "Money decisions may carry guilt, urgency, or obligation when personal progress and family needs compete.",
      },
      {
        category: "stability",
        label: "Boundary Risk",
        value: 63,
        note:
          "The main risk is not generosity itself; it is helping without a clear limit until personal stability weakens.",
      },
      {
        category: "growth",
        label: "Future Protection",
        value: 82,
        note:
          "A wise support system can protect both family help and school progress without forcing self-abandonment.",
      },
    ],
  },
  burnoutHeavy: {
    key: "burnoutHeavy",
    label: "Burnout-heavy working student",
    hero:
      "Your schedule may already be close to capacity. Constant switching between classes, work, commute, and deadlines can make spending decisions feel more like recovery than planning.",
    supportTitle: "Your energy is part of the budget.",
    supportBody:
      "Many working students overspend not because they lack discipline, but because exhaustion makes convenience and small comfort feel necessary.",
    cards: [
      {
        category: "energy",
        label: "Burnout Risk",
        value: 90,
        note:
          "The biggest signal is limited recovery. CLARA should watch fatigue-triggered spending, late tracking, and skipped meals or rest.",
      },
      {
        category: "pressure",
        label: "Schedule Pressure",
        value: 76,
        note:
          "When work and school overlap, time scarcity can become a financial pressure through food, transport, and convenience costs.",
      },
      {
        category: "stability",
        label: "Convenience Spending Risk",
        value: 70,
        note:
          "Spending may rise when the user needs shortcuts because the schedule is demanding more energy than the week can return.",
      },
      {
        category: "growth",
        label: "Recovery Potential",
        value: 78,
        note:
          "Small recovery rules can improve money behavior faster than strict budgeting alone.",
      },
    ],
  },
  debtPressure: {
    key: "debtPressure",
    label: "Debt-pressure working student",
    hero:
      "Money pressure may already be moving from one week into the next. Borrowing, delayed payments, or school costs can make the month feel like repair mode instead of progress.",
    supportTitle: "You need pressure to stop stacking.",
    supportBody:
      "Many students enter debt cycles through survival decisions, not bad intentions. CLARA should focus on preventing the next pressure layer.",
    cards: [
      {
        category: "energy",
        label: "Debt Stress Load",
        value: 82,
        note:
          "Borrowed money can create mental weight that affects spending, checking habits, and confidence.",
      },
      {
        category: "pressure",
        label: "Repayment Pressure",
        value: 88,
        note:
          "Repayment timing should be protected before flexible spending, rewards, and non-urgent purchases.",
      },
      {
        category: "stability",
        label: "Cash Flow Stability",
        value: 58,
        note:
          "The month may feel unstable because old pressure is still competing with current needs.",
      },
      {
        category: "growth",
        label: "Recovery Potential",
        value: 74,
        note:
          "A small repayment rhythm and no-new-debt boundary can gradually return control.",
      },
    ],
  },
  stressReward: {
    key: "stressReward",
    label: "Stress-reward working student",
    hero:
      "Your spending may not be about being careless. It may be your brain asking for relief after school, work, and pressure keep taking energy from the same body.",
    supportTitle: "Small rewards are usually emotional signals.",
    supportBody:
      "Many working students use small purchases to feel okay. CLARA should protect joy without letting stress become a repeated money leak.",
    cards: [
      {
        category: "energy",
        label: "Emotional Fatigue",
        value: 80,
        note:
          "Relief spending often increases when rest is missing and pressure continues without pause.",
      },
      {
        category: "pressure",
        label: "Daily Pressure",
        value: 73,
        note:
          "Food, commute, deadlines, and expectations can make small purchases feel like the only available reward.",
      },
      {
        category: "stability",
        label: "Stress-Spending Risk",
        value: 78,
        note:
          "The pattern to watch is frequency: small repeated rewards can quietly become a monthly drain.",
      },
      {
        category: "growth",
        label: "Relief Control Potential",
        value: 80,
        note:
          "A planned reward budget can keep the user human without letting pressure control the wallet.",
      },
    ],
  },
  selfSupportingBuilder: {
    key: "selfSupportingBuilder",
    label: "Self-supporting builder",
    hero:
      "You are building your future while carrying more of the cost yourself. This creates discipline, but it also means your budget needs to protect essentials before motivation runs out.",
    supportTitle: "Independence needs protection.",
    supportBody:
      "Many self-supporting students are strong, but strength still needs structure: food, transport, tuition, rest, and emergency margin should not be treated as optional.",
    cards: [
      {
        category: "energy",
        label: "Independence Load",
        value: 79,
        note:
          "Carrying personal costs while studying can build maturity, but it also raises fatigue and decision pressure.",
      },
      {
        category: "pressure",
        label: "Essential Pressure",
        value: 82,
        note:
          "Essentials need priority because fewer costs can be safely delayed or ignored.",
      },
      {
        category: "stability",
        label: "Buffer Stability",
        value: 58,
        note:
          "A small buffer matters more here because one missed income moment can affect school and daily survival.",
      },
      {
        category: "growth",
        label: "Discipline Potential",
        value: 86,
        note:
          "Self-supporting students often develop strong future discipline when the system is realistic and protective.",
      },
    ],
  },
  hopefulStretched: {
    key: "hopefulStretched",
    label: "Hopeful but stretched",
    hero:
      "You are stretched, but still moving with direction. With the right limits, this season can build discipline without forcing you to sacrifice rest, food, or school stability.",
    supportTitle: "You still have room to build rhythm.",
    supportBody:
      "Many working students in this pattern are not yet in crisis, but small systems matter now before the schedule becomes heavier.",
    cards: [
      {
        category: "energy",
        label: "Burnout Risk",
        value: 70,
        note:
          "Pressure is present, but there is still room to prevent deeper fatigue through weekly limits and recovery planning.",
      },
      {
        category: "pressure",
        label: "Financial Pressure",
        value: 64,
        note:
          "Money may be tight in specific areas, but planning can still prevent repeated surprise pressure.",
      },
      {
        category: "stability",
        label: "Routine Stability",
        value: 52,
        note:
          "The routine is still forming, so CLARA should help the user build a simple money rhythm before life becomes heavier.",
      },
      {
        category: "growth",
        label: "Future Potential",
        value: 88,
        note:
          "This is a strong building season when ambition is paired with protection and realistic spending boundaries.",
      },
    ],
  },
  quietlyAmbitious: {
    key: "quietlyAmbitious",
    label: "Quietly ambitious working student",
    hero:
      "Your current stage shows quiet ambition: you are learning, earning, adjusting, and trying to build a future with limited margin. CLARA should protect your energy as much as your money.",
    supportTitle: "Your effort has direction.",
    supportBody:
      "Many working students are quietly building their future while handling pressure that is not always visible from the outside.",
    cards: [
      {
        category: "energy",
        label: "Burnout Risk",
        value: 76,
        note:
          "The stage has natural fatigue risk because school, work, and future pressure share the same energy source.",
      },
      {
        category: "pressure",
        label: "Financial Pressure",
        value: 69,
        note:
          "Costs may not be extreme every week, but limited margin means small leaks still deserve attention.",
      },
      {
        category: "stability",
        label: "Emotional Spending Risk",
        value: 60,
        note:
          "Spending may rise when pressure needs comfort, especially after long school or work days.",
      },
      {
        category: "growth",
        label: "Future Potential",
        value: 86,
        note:
          "This stage has high growth potential because the user is already practicing effort, sacrifice, and future orientation.",
      },
    ],
  },
};

function getWorkingStudentSnapshot(profile) {
  const setup = clean(profile.setup);
  const rhythm = clean(profile.rhythm);
  const workload = clean(profile.workload);
  const pressure = clean(profile.pressure);
  const coping = clean(profile.coping);
  const goal = clean(profile.goal);

  const familyScore =
    (hasAny(setup, ["helping family"]) ? 2 : 0) +
    (hasAny(pressure, ["family contribution"]) ? 2 : 0) +
    (hasAny(goal, ["help family"]) ? 2 : 0);

  const debtScore =
    (hasAny(pressure, ["debt", "borrowed"]) ? 2 : 0) +
    (hasAny(coping, ["borrow", "delay payments"]) ? 2 : 0) +
    (hasAny(goal, ["avoid debt"]) ? 1 : 0);

  const survivalScore =
    (hasAny(setup, ["self-supporting", "school costs"]) ? 2 : 0) +
    (hasAny(rhythm, ["irregular", "project", "seasonal"]) ? 1 : 0) +
    (hasAny(workload, ["almost no margin", "survival", "little time to rest"]) ? 2 : 0) +
    (hasAny(pressure, ["daily food", "transport", "debt", "borrowed"]) ? 1 : 0) +
    (hasAny(coping, ["cut my needs", "borrow", "avoid checking"]) ? 1 : 0);

  const burnoutScore =
    (hasAny(workload, ["heavy", "little time", "almost no margin", "survival"]) ? 2 : 0) +
    (hasAny(pressure, ["schedule conflict", "work-school"]) ? 2 : 0) +
    (hasAny(goal, ["burning out"]) ? 1 : 0);

  const rewardScore =
    (hasAny(coping, ["small rewards", "feel okay"]) ? 2 : 0) +
    (hasAny(goal, ["stress spending"]) ? 2 : 0);

  const stableScore =
    (hasAny(workload, ["manageable", "tight but still controlled"]) ? 1 : 0) +
    (hasAny(rhythm, ["fixed", "allowance + work", "mostly allowance"]) ? 1 : 0) +
    (hasAny(coping, ["ask for help"]) ? 1 : 0) +
    (hasAny(goal, ["build savings", "finish school"]) ? 1 : 0);

  let archetype = WORKING_STUDENT_ARCHETYPES.quietlyAmbitious;

  if (debtScore >= 3) archetype = WORKING_STUDENT_ARCHETYPES.debtPressure;
  else if (familyScore >= 4) archetype = WORKING_STUDENT_ARCHETYPES.familyCarrying;
  else if (survivalScore >= 5) archetype = WORKING_STUDENT_ARCHETYPES.survivalHeavy;
  else if (burnoutScore >= 4) archetype = WORKING_STUDENT_ARCHETYPES.burnoutHeavy;
  else if (rewardScore >= 2) archetype = WORKING_STUDENT_ARCHETYPES.stressReward;
  else if (hasAny(setup, ["self-supporting", "school costs"])) archetype = WORKING_STUDENT_ARCHETYPES.selfSupportingBuilder;
  else if (stableScore >= 3) archetype = WORKING_STUDENT_ARCHETYPES.hopefulStretched;

  const adjustedCards = archetype.cards.map((card) => {
    let value = card.value;
    if (card.category === "energy") value += burnoutScore + Math.max(0, survivalScore - 3);
    if (card.category === "pressure") value += familyScore + debtScore + Math.max(0, survivalScore - 3);
    if (card.category === "stability") value += rewardScore - Math.max(0, stableScore - 2);
    if (card.category === "growth") value += Math.max(0, stableScore - 2) - Math.max(0, debtScore - 3);
    return { ...card, value: clamp(value) };
  });

  return {
    ...archetype,
    cards: adjustedCards,
    context:
      "Static snapshot engine: selections are mapped into a behavioral archetype, then adjusted by responsibility, income rhythm, workload, pressure, coping style, and protection goal.",
  };
}

function findWorkingStudentHero() {
  const heading = Array.from(document.querySelectorAll("h2")).find((node) => clean(node.textContent).startsWith("Working Student"));
  if (!heading) return null;
  return {
    heading,
    copy: Array.from(heading.parentElement?.querySelectorAll("p") || []).find((node) => !/your life stage/i.test(clean(node.textContent))),
  };
}

function findSectionByHeading(text) {
  const heading = Array.from(document.querySelectorAll("h3")).find((node) => clean(node.textContent) === text);
  return heading?.closest("section") || null;
}

function patchHero(snapshot) {
  const hero = findWorkingStudentHero();
  if (!hero?.copy) return;
  hero.copy.textContent = snapshot.hero;
  hero.copy.dataset.claraWorkingStudentSnapshot = snapshot.key;
}

function patchSupport(snapshot) {
  const section = findSectionByHeading("You’re not alone.");
  if (!section) return;
  const title = section.querySelector("h3");
  const body = section.querySelector("p");
  if (title) title.textContent = snapshot.supportTitle;
  if (body) {
    body.textContent = snapshot.supportBody;
    body.dataset.claraWorkingStudentSnapshot = snapshot.key;
  }
}

function patchTrendCards(snapshot) {
  const section = findSectionByHeading("Life Stage Trend Snapshot");
  if (!section) return;

  const helper = section.querySelector("h3")?.parentElement?.querySelector("p");
  if (helper) helper.textContent = `${snapshot.label} • static snapshot`;

  const cards = Array.from(section.querySelectorAll("button"));
  snapshot.cards.forEach((item, index) => {
    const card = cards[index];
    if (!card) return;
    card.dataset.claraWorkingStudentSnapshotIndex = String(index);
    card.dataset.claraWorkingStudentSnapshotKey = snapshot.key;
    card.title = item.note;

    const lines = Array.from(card.querySelectorAll("p"));
    if (lines[0]) lines[0].textContent = item.label;
    if (lines[1]) lines[1].textContent = `${item.value}%`;
    if (lines[2]) lines[2].textContent = statusLabel(item.value);
  });
}

function patchDetailPanel(snapshot) {
  const detailHeading = Array.from(document.querySelectorAll("h4")).find((node) => {
    const text = clean(node.textContent);
    return snapshot.cards.some((card) => card.label === text) || ["Burnout Risk", "Financial Pressure", "Emotional Spending Risk", "Future Potential"].includes(text);
  });
  if (!detailHeading) return;

  const selectedIndex = Number(window.__CLARA_WORKING_STUDENT_SELECTED_TREND_INDEX__ || 0);
  const card = snapshot.cards[selectedIndex] || snapshot.cards[0];
  detailHeading.textContent = card.label;

  const note = detailHeading.parentElement?.querySelector("p:not(:first-child)");
  if (note) note.textContent = card.note;

  const valueNode = Array.from(document.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)) && node.closest("[class*='rounded']"));
  if (valueNode) valueNode.textContent = `${card.value}%`;

  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => clean(node.textContent) === "Source direction");
  const sourceBody = sourceHeading?.parentElement?.querySelector("p:last-child");
  if (sourceBody) sourceBody.textContent = snapshot.context;
}

function applyWorkingStudentSnapshot() {
  if (typeof document === "undefined") return;
  const profile = readProfile();
  if (clean(profile.stage) !== "Working Student") return;
  if (!findWorkingStudentHero()) return;

  const snapshot = getWorkingStudentSnapshot(profile);
  patchHero(snapshot);
  patchSupport(snapshot);
  patchTrendCards(snapshot);
  patchDetailPanel(snapshot);
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_STATIC_SNAPSHOT__) return;
  window.__CLARA_WORKING_STUDENT_STATIC_SNAPSHOT__ = true;

  document.addEventListener(
    "click",
    (event) => {
      const trendCard = event.target?.closest?.("button[data-clara-working-student-snapshot-index]");
      if (trendCard) {
        window.__CLARA_WORKING_STUDENT_SELECTED_TREND_INDEX__ = Number(trendCard.dataset.claraWorkingStudentSnapshotIndex || 0);
      }
      window.requestAnimationFrame(applyWorkingStudentSnapshot);
      window.setTimeout(applyWorkingStudentSnapshot, 60);
    },
    true
  );

  const observer = new MutationObserver(() => window.requestAnimationFrame(applyWorkingStudentSnapshot));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(applyWorkingStudentSnapshot);
}

try {
  install();
} catch (error) {
  console.warn("CLARA Working Student static snapshot failed:", error);
}
