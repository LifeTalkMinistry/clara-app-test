const FLOW_MARKER = "CLARA CONTEXT BOARD";

const STEP_META = {
  "CURRENT SETUP": {
    label: "CURRENT SETUP",
    question: "Which setup feels closest to your real life right now?",
    summary: (value) =>
      `${value} becomes your starting environment. CLARA uses this first before reading your money rhythm, weekly load, pressure, and spending response.`,
  },
  "MONEY RHYTHM": {
    label: "MONEY RHYTHM",
    question: "How does money usually come into your week or month?",
    summary: () =>
      "This shows how predictable your money feels. CLARA will treat your plan as stable, mixed, or vulnerable to timing gaps.",
  },
  "WEEKLY LOAD": {
    label: "WEEKLY LOAD",
    question: "How stretched does your normal week feel?",
    summary: () =>
      "This is not only about time. Your energy level helps CLARA understand when convenience spending, avoidance, or survival decisions may happen.",
  },
  "PRESSURE RIGHT NOW": {
    label: "PRESSURE RIGHT NOW",
    question: "What is putting the most pressure on your money right now?",
    summary: () =>
      "This is the financial area CLARA should protect first. It helps separate real pressure from random spending.",
  },
  "PRESSURE RESPONSE": {
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    summary: () =>
      "This is your stress pattern. CLARA uses it to tell whether spending comes from relief, avoidance, support pressure, or survival.",
  },
  "WHEN PRESSURE HITS": {
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    summary: () =>
      "This is your stress pattern. CLARA uses it to tell whether spending comes from relief, avoidance, support pressure, or survival.",
  },
  "PROTECTION GOAL": {
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    summary: () =>
      "This becomes your protection priority. CLARA will shape advice around this instead of giving generic budgeting tips.",
  },
  "WHAT TO PROTECT": {
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    summary: () =>
      "This becomes your protection priority. CLARA will shape advice around this instead of giving generic budgeting tips.",
  },
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

function isVisible(node) {
  return !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
}

function getStepMeta(text) {
  return STEP_META[loud(text)] || null;
}

function getSelectedOption(section) {
  const buttons = Array.from(section?.querySelectorAll("button") || []);
  const selected = buttons.find((button) => {
    const className = String(button.className || "");
    return className.includes("border-cyan") || className.includes("text-cyan-50");
  });
  return clean(selected?.innerText || selected?.textContent || "");
}

function findActiveQuestionSection() {
  const labels = Array.from(document.querySelectorAll("section p"));
  for (const label of labels) {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (meta && section && isVisible(section) && section.querySelector("button")) {
      return { label, section, meta };
    }
  }
  return null;
}

function polishQuestionCards() {
  const labels = Array.from(document.querySelectorAll("section p"));

  labels.forEach((label) => {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (!meta || !section || !section.querySelector("button")) return;

    label.textContent = meta.label;

    const next = label.nextElementSibling;
    if (next?.dataset?.claraFlowQuestion === "true") {
      if (next.textContent !== meta.question) next.textContent = meta.question;
      return;
    }

    const question = document.createElement("p");
    question.dataset.claraFlowQuestion = "true";
    question.className = "clara-flow-question";
    question.textContent = meta.question;
    label.insertAdjacentElement("afterend", question);
  });
}

function findContextBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === FLOW_MARKER);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { marker, header, title, summary };
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { summary, title } = findContextBoard();
  if (!active || !summary || !title) return;

  const selectedValue = getSelectedOption(active.section) || clean(title.textContent);
  const nextSummary = active.meta.summary(selectedValue);
  const signature = `${active.meta.label}:${selectedValue}`;

  if (summary.dataset.claraFlowSignature !== signature) {
    summary.textContent = nextSummary;
    summary.dataset.claraFlowSignature = signature;
    summary.classList.add("clara-flow-board-summary");
  }
}

function polishFlow() {
  polishQuestionCards();
  polishContextBoard();
}

function installLifeStageSetupFlowPolish() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraLifeStageSetupFlowPolishInstalled) return;
  window.__claraLifeStageSetupFlowPolishInstalled = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      polishFlow();
    });
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  document.addEventListener("click", schedule, true);
}

try {
  installLifeStageSetupFlowPolish();
} catch (error) {
  console.warn("CLARA life stage setup flow polish failed:", error);
}
