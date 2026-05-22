const DIAGNOSIS_ID = "clara-life-stage-diagnosis-reveal";
const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

const OPENING_COPY = {
  "Working Student": {
    title: "Let’s see what CLARA noticed.",
    body: "CLARA is reading your answers as a pattern often seen among working students experiencing similar school, work, money, and responsibility pressure.",
    support: "",
    button: "Show me the pattern",
    hideEyebrow: true,
  },
  "Young Professional": {
    title: "You’re trying to build a life.",
    body: "Income, independence, pressure, and future plans are starting to meet in the same decisions.",
    support: "Let’s look at what needs support first.",
    button: "Okay… show me what matters.",
  },
  "Living with Partner": {
    title: "Money is not just yours now.",
    body: "Some choices may now carry emotion, fairness, timing, and the quiet need to feel understood.",
    support: "Let’s look at the shared pressure gently.",
    button: "Okay… help me see it.",
  },
  "Family Household": {
    title: "You’re carrying home pressure too.",
    body: "It is not only about your own spending. Support, requests, and boundaries may be pulling from the same pocket.",
    support: "Let’s find the part that needs protection first.",
    button: "Okay… show me the pressure.",
  },
  "Single Parent": {
    title: "You’re protecting more than yourself.",
    body: "Your answers point to care, safety, time, and money all moving around someone who depends on you.",
    support: "Let’s keep this gentle and practical.",
    button: "Okay… walk me through it.",
  },
  "Full-Time Earner": {
    title: "You’re stable, but still stretched.",
    body: "Payday helps, but responsibility, tiredness, and repeated small choices can still make money feel tight.",
    support: "Let’s look at the pattern without blaming you.",
    button: "Okay… show me the pattern.",
  },
  "Freelance Season": {
    title: "You’re carrying an uneven rhythm.",
    body: "Freedom can feel good, but late payments, quiet weeks, and uncertain income can still weigh on you.",
    support: "Let’s look at what would make this safer.",
    button: "Okay… show me gently.",
  },
  "Business Builder": {
    title: "You’re trying to grow without breaking.",
    body: "Growth, cash flow, reinvestment, and personal safety may be moving through the same decisions.",
    support: "Let’s separate the pressure carefully.",
    button: "Okay… show me what to protect.",
  },
};

function getStage() {
  try {
    const profile = JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
    return clean(profile.stage) || "Working Student";
  } catch {
    return "Working Student";
  }
}

function installStyle() {
  if (document.getElementById("clara-opening-page-refine-style")) return;
  const style = document.createElement("style");
  style.id = "clara-opening-page-refine-style";
  style.textContent = `
    #${DIAGNOSIS_ID} .story-card[data-kind="opening"] h1 {
      max-width: 292px !important;
      text-wrap: balance;
    }
    #${DIAGNOSIS_ID} .story-card[data-kind="opening"] .story-body {
      max-width: 294px !important;
      color: rgba(248,253,255,.80) !important;
    }
    #${DIAGNOSIS_ID} .story-card[data-kind="opening"] .supporting {
      max-width: 270px !important;
      color: rgba(186,230,253,.58) !important;
    }
    #${DIAGNOSIS_ID} .story-card[data-kind="opening"][data-clean-working-student-opening="true"] {
      gap: clamp(16px, 2.4svh, 24px) !important;
    }
    #${DIAGNOSIS_ID}[data-canonical-working-student="true"] .story-card .eyebrow,
    #${DIAGNOSIS_ID}[data-canonical-working-student="true"] .story-card .supporting,
    #${DIAGNOSIS_ID} .story-card[data-kind="opening"][data-clean-working-student-opening="true"] .eyebrow,
    #${DIAGNOSIS_ID} .story-card[data-kind="opening"][data-clean-working-student-opening="true"] .supporting {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function applyOpeningRefine() {
  const root = document.getElementById(DIAGNOSIS_ID);
  if (!root) return;

  installStyle();

  const card = root.querySelector('.story-card[data-kind="opening"]');
  if (!card) return;

  const copy = OPENING_COPY[getStage()] || OPENING_COPY["Working Student"];
  const eyebrow = card.querySelector(".eyebrow");
  const title = card.querySelector("h1");
  const body = card.querySelector(".story-body");
  const support = card.querySelector(".supporting");
  const next = root.querySelector(".next-button");

  if (copy.hideEyebrow) {
    card.dataset.cleanWorkingStudentOpening = "true";
    if (eyebrow) eyebrow.hidden = true;
  } else {
    delete card.dataset.cleanWorkingStudentOpening;
    if (eyebrow) eyebrow.hidden = false;
  }

  if (title && clean(title.textContent) !== copy.title) title.textContent = copy.title;
  if (body && clean(body.textContent) !== copy.body) body.textContent = copy.body;
  if (support) {
    if (copy.support) {
      support.hidden = false;
      if (clean(support.textContent) !== copy.support) support.textContent = copy.support;
    } else {
      support.textContent = "";
      support.hidden = true;
    }
  }
  if (next && card && clean(next.textContent) !== copy.button) {
    next.textContent = copy.button;
    next.setAttribute("aria-label", copy.button);
  }
}

function stripInternalSnapshotText(value) {
  return clean(value)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/(also present|grouped it under|snapshot clean|non-repetitive)/i.test(sentence))
    .join(" ")
    .trim();
}

function cleanSnapshotDetailCards() {
  const modal = Array.from(document.querySelectorAll(".absolute")).find((node) => {
    const text = clean(node.textContent);
    return text.includes("Behavioral distribution share") || text.includes("100% Pressure Split") || text.includes("DATA STATUS");
  });
  if (!modal) return;

  const title = modal.querySelector("h4");
  const subtitle = title?.nextElementSibling;
  if (subtitle?.tagName === "P") {
    subtitle.textContent = "";
    subtitle.hidden = true;
    subtitle.style.setProperty("display", "none", "important");
  }

  Array.from(modal.querySelectorAll("p")).forEach((node) => {
    const text = clean(node.textContent);
    if (!text) return;

    if (/^next move$/i.test(text)) {
      const row = node.closest("div");
      if (row) {
        row.hidden = true;
        row.style.setProperty("display", "none", "important");
      }
      return;
    }

    const cleaned = stripInternalSnapshotText(text);
    if (cleaned !== text) {
      if (cleaned) node.textContent = cleaned;
      else {
        const row = node.closest("div");
        if (row) {
          row.hidden = true;
          row.style.setProperty("display", "none", "important");
        }
      }
    }
  });
}

function applyAllRefinements() {
  applyOpeningRefine();
  cleanSnapshotDetailCards();
}

function installOpeningPageRefine() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_OPENING_PAGE_REFINE__) return;
  window.__CLARA_OPENING_PAGE_REFINE__ = true;

  const observer = new MutationObserver(applyAllRefinements);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(applyAllRefinements);
  document.addEventListener("click", () => window.setTimeout(applyAllRefinements, 80), true);
}

try {
  installOpeningPageRefine();
} catch (error) {
  console.warn("CLARA opening page refinement failed:", error);
}