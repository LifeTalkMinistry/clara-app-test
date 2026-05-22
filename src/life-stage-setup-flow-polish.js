import { getWorkingStudentBehaviorProfile } from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";

const FLOW_MARKER = "CLARA CONTEXT BOARD";
const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DRAFT_KEY = "clara_working_student_branch_draft_v1";

const STEP_META = {
  "CURRENT SETUP": { key: "setup", label: "CURRENT SETUP", question: "Which setup feels closest to your real life right now?", index: 0 },
  "MONEY RHYTHM": { key: "rhythm", label: "MONEY RHYTHM", question: "How does money usually come into your week or month?", index: 1 },
  "WEEKLY LOAD": { key: "workload", label: "WEEKLY LOAD", question: "How stretched does your normal week feel?", index: 2 },
  "PRESSURE RIGHT NOW": { key: "pressure", label: "PRESSURE RIGHT NOW", question: "What is putting the most pressure on your money right now?", index: 3 },
  "PRESSURE RESPONSE": { key: "coping", label: "WHEN PRESSURE HITS", question: "What do you usually do when money pressure gets heavy?", index: 4 },
  "WHEN PRESSURE HITS": { key: "coping", label: "WHEN PRESSURE HITS", question: "What do you usually do when money pressure gets heavy?", index: 4 },
  "PROTECTION GOAL": { key: "goal", label: "WHAT TO PROTECT", question: "What are you trying to protect most right now?", index: 5 },
  "WHAT TO PROTECT": { key: "goal", label: "WHAT TO PROTECT", question: "What are you trying to protect most right now?", index: 5 },
};

const STAGE_NAMES = ["Working Student", "Young Professional", "Living with Partner", "Family Household", "Single Parent", "Full-Time Earner", "Freelance Season", "Business Builder"];
const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();
const isVisible = (node) => !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
const getStepMeta = (text) => STEP_META[loud(text)] || null;

function readJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function isSelectedButton(button) {
  const className = String(button?.className || "");
  return className.includes("border-cyan") || className.includes("text-cyan-50") || className.includes("bg-cyan");
}

function getSelectedOption(section) {
  const buttons = Array.from(section?.querySelectorAll("button") || []);
  const selected = buttons.find(isSelectedButton) || buttons[0];
  return clean(selected?.innerText || selected?.textContent || "");
}

function findActiveQuestionSection() {
  for (const label of Array.from(document.querySelectorAll("section p"))) {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (meta && section && isVisible(section) && section.querySelector("button")) return { label, section, meta };
  }
  return null;
}

function findStageBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === FLOW_MARKER);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { header, title, summary };
}

function isStagePickerOpen() {
  const labels = Array.from(document.querySelectorAll("main button") || []).map((button) => clean(button.innerText || button.textContent));
  return STAGE_NAMES.some((stage) => labels.includes(stage));
}

function getProgressGroup(header) {
  return Array.from(header?.querySelectorAll("div") || []).find((group) => {
    const bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
    return bars.length >= 3 && bars.every((bar) => String(bar.className || "").includes("rounded-full"));
  });
}

function ensureSixProgressBars(group) {
  let bars = Array.from(group?.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  if (!bars.length) return [];
  while (bars.length < 6) {
    group.appendChild(bars[bars.length - 1].cloneNode(false));
    bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  }
  Array.from(group.querySelectorAll("[data-clara-moving-tile='true']") || []).forEach((node) => node.remove());
  return bars.slice(0, 6);
}

function updateSimpleProgress(header, activeIndex) {
  const group = getProgressGroup(header);
  if (!group) return;
  if (isStagePickerOpen()) {
    group.style.setProperty("display", "none", "important");
    return;
  }
  group.style.setProperty("display", "flex", "important");
  group.style.setProperty("gap", "0.45rem", "important");
  group.style.setProperty("align-items", "center", "important");
  group.style.setProperty("position", "relative", "important");
  ensureSixProgressBars(group).forEach((bar, index) => {
    const active = index === activeIndex;
    bar.style.setProperty("width", active ? "2rem" : "1.65rem", "important");
    bar.style.setProperty("height", "0.25rem", "important");
    bar.style.setProperty("border-radius", "9999px", "important");
    bar.style.setProperty("background", active ? "rgb(165 243 252)" : "rgba(255,255,255,.12)", "important");
    bar.style.setProperty("box-shadow", active ? "0 0 16px rgba(125,211,252,.35)" : "none", "important");
    bar.style.setProperty("opacity", active ? "1" : ".6", "important");
    bar.style.setProperty("transition", "background 160ms ease, opacity 160ms ease, width 160ms ease", "important");
  });
}

function polishQuestionCards() {
  Array.from(document.querySelectorAll("section p")).forEach((label) => {
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

function includesAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some((term) => text.includes(term));
}

function conciseSelectionMeaning(selectedValue, activeKey, profile) {
  const selected = clean(selectedValue);
  const text = selected.toLowerCase();

  if (activeKey === "setup" && profile?.meaning && !profile.meaning.startsWith("Selecting")) {
    return profile.meaning;
  }

  if (includesAny(text, ["tuition", "school payment", "school cost", "school requirement", "school needs", "school deadlines", "school continuity", "continue school", "protect school", "fear of stopping", "printing", "materials", "projects"])) {
    return "This usually means your money already has an important school-related purpose before anything else. Many working students in this setup become more careful with spending because studies, requirements, or tuition depend on that income.";
  }

  if (includesAny(text, ["family", "home", "goes home", "shared", "give", "support boundary", "guilt"])) {
    return "This usually means your student life is also carrying responsibility for people at home. Money can feel more emotional here because helping family and protecting your own school needs may happen at the same time.";
  }

  if (includesAny(text, ["borrow", "debt", "repay", "repayment", "cash-flow", "delayed", "repair mode", "old pressure", "pressure carries", "no-new-debt"])) {
    return "This usually means money pressure may not be starting fresh each week. Borrowing, repayments, or delayed expenses can make planning feel heavier because part of today’s income is already connected to yesterday’s pressure.";
  }

  if (includesAny(text, ["tired", "exhaust", "low recovery", "little time to rest", "commute", "heavy schedule", "shifts", "deadlines", "overwork", "burning out", "push rest", "comfort after hard days"])) {
    return "This usually means your energy is becoming part of the money problem too. When school, work, and rest compete, many working students rely more on shortcuts, comfort, or delayed tracking just to get through the day.";
  }

  if (includesAny(text, ["convenience", "rushed", "save energy", "missed tracking", "forget to track"])) {
    return "This usually means spending may be helping you save time or energy during busy days. For working students, convenience spending often comes from exhaustion, not laziness.";
  }

  if (includesAny(text, ["reward", "social", "small spending", "small rewards", "leaks", "micro", "stuck", "extra money leaks"])) {
    return "This usually means small spending may be acting as relief, reward, or a way to feel normal after effort. The risk is not one small purchase, but how often those small choices quietly repeat.";
  }

  if (includesAny(text, ["irregular", "unstable", "fluctuate", "income changes", "some weeks", "gaps", "seasonal", "side hustle", "money arrives after"])) {
    return "This usually means planning can feel difficult because money does not arrive in a steady rhythm. Many working students in this situation become very adaptive, but the uncertainty can make budgeting mentally tiring.";
  }

  if (includesAny(text, ["food", "fare", "transport", "daily", "survival", "emergency", "stretch money", "no room", "essentials"])) {
    return "This usually means daily basics are taking up serious space in your money decisions. Food, fare, and school attendance costs can make even small spending choices feel more sensitive.";
  }

  if (includesAny(text, ["save", "savings", "discipline", "plan", "priority", "purpose", "control", "pause", "prepared", "limits", "boundary", "protect"])) {
    return "This usually means you are trying to create more control instead of just reacting to pressure. For many working students, even a small clear rule can make money feel less scattered.";
  }

  if (profile?.financialInterpretation) {
    return `${profile.financialInterpretation} This helps CLARA understand what this choice usually means in real student life.`;
  }

  return "This choice helps CLARA understand what this situation usually means in real life. It gives a clearer picture of how school, work, money, and energy may be affecting the student right now.";
}

function getBoardFromEngine(active) {
  const saved = readJson(LIFE_STAGE_KEY);
  const draft = readJson(DRAFT_KEY);
  const selectedValue = getSelectedOption(active.section);
  const answers = { ...(saved?.stage === "Working Student" ? saved : {}), ...(draft || {}), stage: "Working Student" };
  answers[active.meta.key] = selectedValue;
  const behavior = getWorkingStudentBehaviorProfile(answers, { currentQuestionKey: active.meta.key });
  const currentProfile = (behavior.answerProfiles || []).find((profile) => profile.key === active.meta.key);
  return {
    title: currentProfile?.title || behavior.currentContext?.title || selectedValue,
    body: conciseSelectionMeaning(selectedValue, active.meta.key, currentProfile),
  };
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { header, summary, title } = findStageBoard();
  if (!active || !header || !summary || !title) return;
  const selectedValue = getSelectedOption(active.section);
  const board = getBoardFromEngine(active);
  const signature = `${active.meta.key}:${selectedValue}:${board?.title}:${board?.body}`;
  updateSimpleProgress(header, active.meta.index);
  if (title.dataset.claraSimpleBoardSignature !== signature) {
    title.textContent = board?.title || selectedValue;
    title.dataset.claraSimpleBoardSignature = signature;
  }
  if (summary.dataset.claraSimpleBoardSignature !== signature) {
    summary.textContent = board?.body || "";
    summary.dataset.claraSimpleBoardSignature = signature;
    summary.classList.add("clara-flow-board-summary");
    summary.style.setProperty("white-space", "pre-line", "important");
    summary.style.setProperty("line-height", "1.55", "important");
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
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  document.addEventListener("click", schedule, true);
  window.addEventListener("storage", schedule);
}

try {
  installLifeStageSetupFlowPolish();
} catch (error) {
  console.warn("CLARA life stage setup flow polish failed:", error);
}
