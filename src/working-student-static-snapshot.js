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

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

const WORKING_STUDENT_ARCHETYPES = {
  survivalHeavy: {
    key: "survivalHeavy",
    label: "Essential-cost pressure",
    hero:
      "Your week is shaped by school costs, transport, meals, and work hours competing for the same limited income. CLARA should protect basics first before strict saving.",
    supportTitle: "This looks like survival budgeting.",
    supportBody:
      "This pattern is common when tuition, commute, meals, load/data, and income timing squeeze the same week.",
    cards: [
      {
        category: "energy",
        label: "Recovery Gap",
        value: 88,
        note:
          "Low recovery time can affect spending through skipped meals, late-night convenience food, transport shortcuts, and delayed expense tracking.",
      },
      {
        category: "pressure",
        label: "Essential-Cost Load",
        value: 84,
        note:
          "The strongest pressure usually comes from fixed school needs and repeated small costs like commute, food, mobile data, and school materials.",
      },
      {
        category: "stability",
        label: "Cash Buffer Risk",
        value: 66,
        note:
          "A tight week becomes risky when there is no small buffer for sudden projects, fare changes, food gaps, or emergency school payments.",
      },
      {
        category: "growth",
        label: "Stability Potential",
        value: 81,
        note:
          "This stage can still improve when CLARA protects essentials, separates school money, and keeps a realistic weekly spending cap.",
      },
    ],
  },
  familyCarrying: {
    key: "familyCarrying",
    label: "Family-linked responsibility",
    hero:
      "Your money decisions are connected to home support. Family contribution, school needs, food, and transport can compete, so budgeting needs boundaries instead of guilt.",
    supportTitle: "Support needs a limit.",
    supportBody:
      "Many working students help at home while still paying for school, meals, commute, projects, and personal essentials.",
    cards: [
      {
        category: "energy",
        label: "Responsibility Load",
        value: 84,
        note:
          "Family-linked responsibility can increase fatigue because the student role and support role use the same income and energy.",
      },
      {
        category: "pressure",
        label: "Shared-Money Pressure",
        value: 86,
        note:
          "Family help can become financially heavy when requests overlap with tuition timing, school projects, transport, or personal essentials.",
      },
      {
        category: "stability",
        label: "Boundary Risk",
        value: 63,
        note:
          "The risk is not generosity. The risk is helping without a clear weekly limit until school stability and daily needs become weaker.",
      },
      {
        category: "growth",
        label: "Support Balance",
        value: 82,
        note:
          "A fixed family-support rule can protect both family care and the student's own tuition, commute, food, and emergency margin.",
      },
    ],
  },
  burnoutHeavy: {
    key: "burnoutHeavy",
    label: "High-fatigue schedule",
    hero:
      "School and work appear to be overlapping heavily. Commute, deadlines, and irregular meals can push convenience spending because time, not only money, is limited.",
    supportTitle: "Time pressure becomes money pressure.",
    supportBody:
      "Working students with heavy schedule switching often spend more on convenience because planning energy is already drained.",
    cards: [
      {
        category: "energy",
        label: "Fatigue Load",
        value: 90,
        note:
          "High fatigue often shows through late tracking, missed meals, rushed transport choices, small comfort buys, and low motivation to review money.",
      },
      {
        category: "pressure",
        label: "Schedule-Cost Pressure",
        value: 76,
        note:
          "When class, work, commute, and deadlines overlap, money pressure appears through food, fare, printing, load/data, and convenience costs.",
      },
      {
        category: "stability",
        label: "Convenience Spend Risk",
        value: 70,
        note:
          "Convenience spending becomes more likely when the schedule removes time for cheaper meals, planned transport, or calm decision-making.",
      },
      {
        category: "growth",
        label: "Recovery Potential",
        value: 78,
        note:
          "Small recovery rules, meal planning, and transport buffers can improve the budget faster than strict restriction alone.",
      },
    ],
  },
  debtPressure: {
    key: "debtPressure",
    label: "Delayed-payment cycle",
    hero:
      "Money pressure may already be moving from one week into the next. Borrowing, delayed payments, or tuition timing can make the month feel like repair mode.",
    supportTitle: "Stop pressure from stacking.",
    supportBody:
      "Many students enter debt cycles through survival gaps: fare, food, school fees, projects, or income arriving later than expenses.",
    cards: [
      {
        category: "energy",
        label: "Debt Stress Load",
        value: 82,
        note:
          "Borrowed money can affect confidence, expense checking, and decision-making because old pressure stays active during the current week.",
      },
      {
        category: "pressure",
        label: "Repayment Pressure",
        value: 88,
        note:
          "Repayment timing should be protected before flexible spending, rewards, online purchases, and non-urgent school-related extras.",
      },
      {
        category: "stability",
        label: "Cash-Flow Stability",
        value: 58,
        note:
          "Cash flow becomes unstable when allowance, salary, or side-income timing does not match tuition, commute, food, and repayment deadlines.",
      },
      {
        category: "growth",
        label: "Recovery Potential",
        value: 74,
        note:
          "A no-new-debt rule, minimum repayment rhythm, and small emergency fare/food buffer can gradually return control.",
      },
    ],
  },
  stressReward: {
    key: "stressReward",
    label: "Recovery-spending rhythm",
    hero:
      "Your spending may be recovery-driven. After school, work, commute, and pressure, small food, drink, or digital purchases can become quick relief.",
    supportTitle: "Small rewards can signal fatigue.",
    supportBody:
      "This pattern often appears when rest is limited, meals are irregular, and the day feels too heavy to end without a small reward.",
    cards: [
      {
        category: "energy",
        label: "Emotional Fatigue",
        value: 80,
        note:
          "Relief spending often rises after long class-work days, commute fatigue, irregular meals, or weeks with repeated academic pressure.",
      },
      {
        category: "pressure",
        label: "Daily Pressure",
        value: 73,
        note:
          "Daily pressure is often built from repeated small demands: food, fare, mobile data, school materials, group needs, and time pressure.",
      },
      {
        category: "stability",
        label: "Reward Frequency Risk",
        value: 78,
        note:
          "The risk is usually frequency, not one purchase. Small rewards can quietly drain the month when they become a repeated recovery habit.",
      },
      {
        category: "growth",
        label: "Reward Control",
        value: 80,
        note:
          "A planned reward limit can keep the user human while preventing stress from controlling the wallet.",
      },
    ],
  },
  selfSupportingBuilder: {
    key: "selfSupportingBuilder",
    label: "Self-funded student builder",
    hero:
      "You are carrying more of school and daily life yourself. Income timing, tuition needs, transport, meals, and emergency margin need clear protection.",
    supportTitle: "Independence needs structure.",
    supportBody:
      "Self-supporting students often look strong, but strength still needs a buffer for food, fare, school deadlines, and income gaps.",
    cards: [
      {
        category: "energy",
        label: "Independence Load",
        value: 79,
        note:
          "Carrying personal costs while studying can build maturity, but it raises fatigue when school deadlines and income timing collide.",
      },
      {
        category: "pressure",
        label: "Essential Pressure",
        value: 82,
        note:
          "Essentials need priority because tuition, commute, meals, mobile data, and school materials are harder to safely delay.",
      },
      {
        category: "stability",
        label: "Buffer Stability",
        value: 58,
        note:
          "A small buffer matters because one missed side-income payment or extra school cost can affect the whole week.",
      },
      {
        category: "growth",
        label: "Discipline Potential",
        value: 86,
        note:
          "Self-funded students can build strong discipline when CLARA uses realistic caps instead of unrealistic saving pressure.",
      },
    ],
  },
  hopefulStretched: {
    key: "hopefulStretched",
    label: "Stable but stretched",
    hero:
      "Your setup still has room for control, but the week is already stretched. This is the best time to build caps for food, fare, load/data, and small rewards.",
    supportTitle: "Build rhythm before pressure grows.",
    supportBody:
      "Many working students are not in crisis yet, but small leaks become harder to control once school and work get heavier.",
    cards: [
      {
        category: "energy",
        label: "Fatigue Watch",
        value: 70,
        note:
          "Pressure is present, but there is still room to prevent deeper fatigue through weekly limits and recovery planning.",
      },
      {
        category: "pressure",
        label: "Cost Pressure",
        value: 64,
        note:
          "Money may be tight in specific areas like transport, food, data, or school materials, but planning can still prevent surprise pressure.",
      },
      {
        category: "stability",
        label: "Routine Stability",
        value: 52,
        note:
          "The routine is still forming, so CLARA should help build a simple weekly rhythm before the schedule becomes heavier.",
      },
      {
        category: "growth",
        label: "Future Potential",
        value: 88,
        note:
          "This is a strong building season when ambition is paired with protected essentials and realistic spending boundaries.",
      },
    ],
  },
  quietlyAmbitious: {
    key: "quietlyAmbitious",
    label: "Developing money rhythm",
    hero:
      "You are learning, earning, adjusting, and building direction with limited margin. CLARA should watch repeated costs before they become monthly leaks.",
    supportTitle: "Your effort has direction.",
    supportBody:
      "Many working students quietly build their future while managing school costs, commute, food, mobile data, and social pressure.",
    cards: [
      {
        category: "energy",
        label: "Burnout Watch",
        value: 76,
        note:
          "This stage has natural fatigue risk because school, work, commute, and future pressure share the same energy source.",
      },
      {
        category: "pressure",
        label: "Financial Pressure",
        value: 69,
        note:
          "Costs may not be extreme every week, but repeated small expenses still deserve attention when income is limited.",
      },
      {
        category: "stability",
        label: "Micro-Spend Risk",
        value: 60,
        note:
          "Small food, transport, mobile data, digital, or social spending can become the hidden pattern to watch.",
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
      "Pattern-based snapshot: this is not a live public statistic yet. It is a CLARA estimate grounded in selected signals like commute, food, tuition, mobile data, income timing, workload, family support, debt pressure, and coping behavior.",
  };
}

function getProfileSignature(profile) {
  return [profile.stage, profile.setup, profile.rhythm, profile.workload, profile.pressure, profile.coping, profile.goal]
    .map(clean)
    .join("|");
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
  setText(hero.copy, snapshot.hero);
  hero.copy.dataset.claraWorkingStudentSnapshot = snapshot.key;
}

function patchSupport(snapshot) {
  const section = findSectionByHeading("You’re not alone.") ||
    Array.from(document.querySelectorAll("section")).find((node) => node.querySelector("[data-clara-working-student-support='true']"));
  if (!section) return;
  const title = section.querySelector("h3");
  const body = section.querySelector("p");
  if (title) {
    setText(title, snapshot.supportTitle);
    title.dataset.claraWorkingStudentSupport = "true";
  }
  if (body) {
    setText(body, snapshot.supportBody);
    body.dataset.claraWorkingStudentSnapshot = snapshot.key;
  }
}

function patchTrendCards(snapshot) {
  const section = findSectionByHeading("Life Stage Trend Snapshot");
  if (!section) return;

  const helper = section.querySelector("h3")?.parentElement?.querySelector("p");
  setText(helper, `${snapshot.label} • pattern-based snapshot`);

  const cards = Array.from(section.querySelectorAll("button"));
  snapshot.cards.forEach((item, index) => {
    const card = cards[index];
    if (!card) return;
    card.dataset.claraWorkingStudentSnapshotIndex = String(index);
    card.dataset.claraWorkingStudentSnapshotKey = snapshot.key;
    if (card.title !== item.note) card.title = item.note;

    const lines = Array.from(card.querySelectorAll("p"));
    setText(lines[0], item.label);
    setText(lines[1], `${item.value}%`);
    setText(lines[2], statusLabel(item.value));
  });
}

function patchDetailPanel(snapshot) {
  const detailHeading = Array.from(document.querySelectorAll("h4")).find((node) => {
    const text = clean(node.textContent);
    return snapshot.cards.some((card) => card.label === text) ||
      [
        "Burnout Risk",
        "Financial Pressure",
        "Emotional Spending Risk",
        "Future Potential",
        "Emotional Fatigue",
        "Daily Pressure",
        "Stress-Spending Risk",
        "Relief Control Potential",
      ].includes(text);
  });
  if (!detailHeading) return;

  const selectedIndex = Number(window.__CLARA_WORKING_STUDENT_SELECTED_TREND_INDEX__ || 0);
  const card = snapshot.cards[selectedIndex] || snapshot.cards[0];
  setText(detailHeading, card.label);

  const note = detailHeading.parentElement?.querySelector("p:not(:first-child)");
  setText(note, card.note);

  const valueNode = Array.from(document.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)) && node.closest("[class*='rounded']"));
  setText(valueNode, `${card.value}%`);

  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => clean(node.textContent) === "Source direction");
  const sourceBody = sourceHeading?.parentElement?.querySelector("p:last-child");
  setText(sourceBody, snapshot.context);
}

function applyWorkingStudentSnapshot() {
  if (typeof document === "undefined") return;
  const profile = readProfile();
  if (clean(profile.stage) !== "Working Student") return;
  if (!findWorkingStudentHero()) return;

  const snapshot = getWorkingStudentSnapshot(profile);
  const signature = `${getProfileSignature(profile)}|${snapshot.key}|${snapshot.cards.map((card) => `${card.label}:${card.value}`).join(",")}`;
  const root = document.body;
  const shouldPatch = root.dataset.claraWorkingStudentSnapshotSignature !== signature;
  const detailOpen = Boolean(document.querySelector("h4"));

  if (!shouldPatch && !detailOpen) return;
  root.dataset.claraWorkingStudentSnapshotSignature = signature;

  patchHero(snapshot);
  patchSupport(snapshot);
  patchTrendCards(snapshot);
  if (detailOpen) patchDetailPanel(snapshot);
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_STATIC_SNAPSHOT__) return;
  window.__CLARA_WORKING_STUDENT_STATIC_SNAPSHOT__ = true;

  let scheduled = false;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      applyWorkingStudentSnapshot();
    });
  };

  document.addEventListener(
    "click",
    (event) => {
      const trendCard = event.target?.closest?.("button[data-clara-working-student-snapshot-index]");
      if (trendCard) {
        window.__CLARA_WORKING_STUDENT_SELECTED_TREND_INDEX__ = Number(trendCard.dataset.claraWorkingStudentSnapshotIndex || 0);
      }
      scheduleApply();
    },
    { capture: true, passive: true }
  );

  window.addEventListener("storage", scheduleApply, { passive: true });

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleApply();
}

try {
  install();
} catch (error) {
  console.warn("CLARA Working Student static snapshot failed:", error);
}
