const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const DEFAULT_SUPPORT_COPY = {
  title: "You’re not alone.",
  body: "Many people in this life stage are experiencing similar financial pressure.",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some((term) => text.includes(clean(term).toLowerCase()));
}

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function getWorkingStudentSupportCopy(profile) {
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

  if (debtScore >= 3) {
    return {
      title: "Pressure may be stacking.",
      body: "Borrowing or delayed payments often happen when school fees, food, fare, and income timing do not line up.",
    };
  }

  if (familyScore >= 4) {
    return {
      title: "You’re carrying shared pressure.",
      body: "Helping at home can be meaningful, but it still needs limits so school, food, transport, and personal stability stay protected.",
    };
  }

  if (survivalScore >= 5) {
    return {
      title: "This looks like survival budgeting.",
      body: "Tuition, meals, commute, load/data, and income timing can squeeze the same week even when spending is not careless.",
    };
  }

  if (burnoutScore >= 4) {
    return {
      title: "Time pressure becomes money pressure.",
      body: "When class, work, commute, and deadlines overlap, convenience spending can increase because planning energy is already drained.",
    };
  }

  if (rewardScore >= 2) {
    return {
      title: "Small rewards can signal fatigue.",
      body: "This pattern often appears when rest is limited, meals are irregular, and the day feels too heavy to end without relief.",
    };
  }

  if (hasAny(setup, ["self-supporting", "school costs"])) {
    return {
      title: "Independence needs structure.",
      body: "Self-supporting students need buffers for food, fare, school deadlines, mobile data, and income gaps.",
    };
  }

  if (stableScore >= 3) {
    return {
      title: "Build rhythm before pressure grows.",
      body: "You may still have room for control, but small leaks become harder once school and work get heavier.",
    };
  }

  return {
    title: "Your effort has direction.",
    body: "Many working students quietly build their future while managing school costs, commute, food, mobile data, and social pressure.",
  };
}

function getSupportCopy() {
  const profile = readProfile();
  if (clean(profile.stage) === "Working Student") return getWorkingStudentSupportCopy(profile);
  return DEFAULT_SUPPORT_COPY;
}

function findLifeStageRoot() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard(hero) {
  if (!hero) return null;
  let current = hero.nextElementSibling;
  while (current) {
    const title = clean(current.querySelector("h3")?.textContent);
    if (title || current.querySelector("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function enhanceSupportCard() {
  const hero = findLifeStageRoot();
  const card = findSupportCard(hero);
  if (!hero || !card) return;

  const title = card.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!title || !body) return;

  const copy = getSupportCopy();
  card.dataset.claraSupportCard = "true";
  setText(title, copy.title);
  setText(body, copy.body);

  card.querySelectorAll("[data-clara-support-signal='true']").forEach((node) => node.remove());
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_SUPPORT_CARD__) {
  window.__CLARA_LIFE_SUPPORT_CARD__ = true;

  let scheduled = false;
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceSupportCard();
    });
  };

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("storage", scheduleEnhance, { passive: true });
  document.addEventListener("click", () => window.setTimeout(scheduleEnhance, 80), { passive: true });
  scheduleEnhance();
}
