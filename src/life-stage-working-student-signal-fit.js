import { LIFE_STAGE_GUIDANCE } from "./life-stage-guidance";
import { getSelectedLifeStageKey, normalizeLifeStageKey, readSelectedLifeStageProfile } from "./life-stage-flow";

// Working Student signal copy must fit the compact premium support card.
// This file does NOT change layout. It only normalizes the selected signal text
// and the small heart hint label after the existing signal bridges finish.

const COMPACT_WORKING_STUDENT_SIGNALS = {
  tired: {
    awareness: {
      title: "Energy pressure is showing up.",
      body: "Heavy days can trigger shortcuts, comfort buys, or skipped tracking.",
    },
    guidance: {
      title: "Make tired days easier.",
      body: "Set one tired-day rule: fare, food limit, or quick check.",
    },
  },
  stress: {
    awareness: {
      title: "Stress may be asking for relief.",
      body: "Stress can push relief spending when school, work, commute, and deadlines stack up.",
    },
    guidance: {
      title: "Name the pressure first.",
      body: "Name the pressure, then set one small relief limit.",
    },
  },
  sleepy: {
    awareness: {
      title: "Low sleep weakens control.",
      body: "Sleepy days can trigger caffeine runs, auto-spending, and convenience choices.",
    },
    guidance: {
      title: "Delay bigger decisions.",
      body: "Rest first, then decide when your mind is clearer.",
    },
  },
  hungry: {
    awareness: {
      title: "Hunger can trigger impulse spending.",
      body: "Delayed meals can turn snacks, drinks, and treats into bigger spending.",
    },
    guidance: {
      title: "Protect a small food buffer.",
      body: "Eat on time so hunger does not decide the price.",
    },
  },
  pressure: {
    awareness: {
      title: "Time pressure becomes money pressure.",
      body: "Rushing can add fare, food, supplies, and school costs.",
    },
    guidance: {
      title: "Prepare one thing early.",
      body: "Prepare one predictable cost before the rush starts.",
    },
  },
  moneyTiming: {
    awareness: {
      title: "Money timing can create pressure.",
      body: "Late money can make food, fare, load, and school costs feel heavier.",
    },
    guidance: {
      title: "Protect the waiting period.",
      body: "Protect fare, food, load, and school needs first.",
    },
  },
  commute: {
    awareness: {
      title: "Commute pressure affects spending.",
      body: "Long travel can add fare, food, drinks, and comfort stops.",
    },
    guidance: {
      title: "Plan the travel cost early.",
      body: "Set aside fare before optional spending starts.",
    },
  },
};

const HINT_TEXTS = new Set(["Tap for solution", "Solution shown", "Reveal guidance", "Guidance ready", "Guidance shown"]);

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function patchGuidanceSource() {
  const workingStudent = LIFE_STAGE_GUIDANCE?.["Working Student"];
  const signals = workingStudent?.signals || {};

  Object.entries(COMPACT_WORKING_STUDENT_SIGNALS).forEach(([signalId, states]) => {
    if (!signals[signalId]) return;
    Object.entries(states).forEach(([mode, copy]) => {
      signals[signalId][mode] = {
        ...signals[signalId][mode],
        ...copy,
      };
    });
  });
}

function getStage() {
  const profile = readSelectedLifeStageProfile?.() || {};
  const stored = normalizeLifeStageKey(profile.stage || getSelectedLifeStageKey());
  if (stored) return stored;

  const heroHeading = Array.from(document.querySelectorAll("section h2"))
    .map((node) => clean(node.textContent))
    .find(Boolean);
  return normalizeLifeStageKey(heroHeading);
}

function findLifeStageHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  }) || null;
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

function getActiveSignal() {
  return clean(document.querySelector("[data-clara-pressure-signal][data-active='true']")?.dataset?.claraPressureSignal);
}

function inferSignal(card, titleText = "") {
  const selected = clean(card?.dataset?.claraSelectedSignal);
  if (selected && selected !== "default") return selected;

  const active = getActiveSignal();
  if (active && active !== "default") return active;

  return Object.entries(COMPACT_WORKING_STUDENT_SIGNALS).find(([, states]) => (
    clean(states.awareness.title) === titleText || clean(states.guidance.title) === titleText
  ))?.[0] || "";
}

function inferMode(card, signalId, titleText = "") {
  const explicit = clean(card?.dataset?.claraSignalMode);
  const copy = COMPACT_WORKING_STUDENT_SIGNALS[signalId];

  if (copy && clean(copy.guidance.title) === titleText) return "guidance";
  if (copy && clean(copy.awareness.title) === titleText) return "awareness";
  if (explicit === "guidance") return "guidance";
  return "awareness";
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function installSignalCardLayoutStyles() {
  if (document.getElementById("clara-working-student-signal-card-layout-style")) return;
  const style = document.createElement("style");
  style.id = "clara-working-student-signal-card-layout-style";
  style.textContent = `
    #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] {
      position: relative !important;
      overflow: hidden !important;
    }

    #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] > div {
      display: flex !important;
      min-height: 100% !important;
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: center !important;
      gap: 0 !important;
    }

    #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] > div > div:not([data-clara-heart-cta="true"]) {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      flex: none !important;
    }

    #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] h3 {
      width: 100% !important;
      max-width: none !important;
      padding-right: 72px !important;
      line-height: 1.16 !important;
      letter-spacing: -0.01em !important;
    }

    #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] h3 + p {
      display: -webkit-box !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      padding-right: 76px !important;
      line-height: 1.34 !important;
      -webkit-line-clamp: 3 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      overflow-wrap: normal !important;
    }

    #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] [data-clara-heart-cta="true"] {
      position: absolute !important;
      right: 14px !important;
      top: 50% !important;
      z-index: 4 !important;
      width: 58px !important;
      height: 58px !important;
      margin: 0 !important;
      flex: none !important;
      translate: 0 -50% !important;
    }

    #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] [data-clara-heart-cta="true"] svg {
      width: 25px !important;
      height: 25px !important;
    }

    @media (max-width: 380px) {
      #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] h3 {
        padding-right: 66px !important;
      }

      #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] h3 + p {
        padding-right: 68px !important;
      }

      #root [data-clara-support-card="true"][data-clara-signal-stage="Working Student"] [data-clara-heart-cta="true"] {
        right: 10px !important;
        width: 54px !important;
        height: 54px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function normalizeHint(card, mode) {
  const nextHint = mode === "guidance" ? "Guidance shown" : "Reveal guidance";

  card?.querySelectorAll?.("[data-clara-solution-hint='true']").forEach((hint, index) => {
    if (index > 0) {
      hint.remove?.();
      return;
    }
    if (clean(hint.textContent) !== nextHint) hint.textContent = nextHint;
  });

  const heart = card?.querySelector?.("[data-clara-heart-cta='true']")
    || card?.querySelector?.("svg")?.closest?.("button,[role='button'],div");

  if (heart) {
    heart.dataset.claraHeartCta = "true";
    heart.setAttribute("aria-label", mode === "guidance" ? "Guidance shown for selected signal" : "Reveal guidance for selected signal");
    heart.title = mode === "guidance" ? "Guidance shown" : "Reveal guidance";

    Array.from(heart.querySelectorAll?.("span,strong,small,em,b,i") || []).forEach((node) => {
      if (node.querySelector?.("svg")) return;
      if (HINT_TEXTS.has(clean(node.textContent))) node.remove?.();
    });
  }
}

function normalizeWorkingStudentSignalCard() {
  if (getStage() !== "Working Student") return;

  const card = findSupportCard();
  const { title, body } = getTextNodes(card);
  if (!card || !title || !body) return;

  const titleText = clean(title.textContent);
  const signalId = inferSignal(card, titleText);
  const copyGroup = COMPACT_WORKING_STUDENT_SIGNALS[signalId];
  if (!signalId || !copyGroup) return;

  const mode = inferMode(card, signalId, titleText);
  const copy = copyGroup[mode];
  if (!copy) return;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalStage = "Working Student";
  card.dataset.claraSelectedSignal = signalId;
  card.dataset.claraSignalMode = mode;
  card.dataset.claraSignalCardActive = "true";

  setText(title, copy.title);
  setText(body, copy.body);
  normalizeHint(card, mode);
}

function installWorkingStudentSignalFit() {
  patchGuidanceSource();

  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_SIGNAL_FIT__) return;
  window.__CLARA_WORKING_STUDENT_SIGNAL_FIT__ = true;
  installSignalCardLayoutStyles();

  let scheduled = false;
  const run = () => {
    scheduled = false;
    normalizeWorkingStudentSignalCard();
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  };
  const scheduleAfterInteraction = () => {
    window.setTimeout(normalizeWorkingStudentSignalCard, 0);
    window.setTimeout(normalizeWorkingStudentSignalCard, 80);
    window.setTimeout(normalizeWorkingStudentSignalCard, 180);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-clara-signal-mode", "data-clara-selected-signal", "data-clara-signal-card-active", "data-active"],
  });

  document.addEventListener("click", scheduleAfterInteraction, true);
  document.addEventListener("pointerup", scheduleAfterInteraction, true);
  window.addEventListener("storage", schedule, { passive: true });
  window.addEventListener("clara:life-stage-profile-updated", schedule, { passive: true });
  schedule();
}

try {
  installWorkingStudentSignalFit();
} catch (error) {
  console.warn("CLARA Working Student signal fit failed:", error);
}
