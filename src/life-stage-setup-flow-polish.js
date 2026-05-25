import {
  getWorkingStudentDisplayLabel,
  getWorkingStudentOptionProfile,
} from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";
import {
  YOUNG_PROFESSIONAL_STAGE_KEY,
  getYoungProfessionalDisplayLabel,
  getYoungProfessionalQuestionContext,
} from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";
import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  getLivingWithPartnerDisplayLabel,
  getLivingWithPartnerOptionProfile,
} from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";

const FLOW_MARKER = "CLARA CONTEXT BOARD";
const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

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

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
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

function currentStage() {
  const profile = readProfile();
  return clean(profile.stage);
}

function getDisplayLabelForStage(stage, selectedValue) {
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) return getLivingWithPartnerDisplayLabel(selectedValue) || selectedValue;
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) return getYoungProfessionalDisplayLabel(selectedValue) || selectedValue;
  return getWorkingStudentDisplayLabel(selectedValue) || selectedValue;
}

function getStageLabelAndProfile(selectedValue, activeKey) {
  const stage = currentStage();
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) {
    return {
      label: getLivingWithPartnerDisplayLabel(selectedValue) || selectedValue,
      profile: getLivingWithPartnerOptionProfile(selectedValue, activeKey),
      stage,
    };
  }
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) {
    const label = getYoungProfessionalDisplayLabel(selectedValue) || selectedValue;
    const context = getYoungProfessionalQuestionContext(activeKey, selectedValue, { ...readProfile(), stage });
    return {
      label,
      profile: {
        title: context?.title || label,
        meaning: context?.summary || context?.body || "",
      },
      stage,
    };
  }
  return {
    label: getWorkingStudentDisplayLabel(selectedValue) || selectedValue,
    profile: getWorkingStudentOptionProfile(selectedValue, activeKey),
    stage,
  };
}

function conciseSelectionMeaning(selectedValue, activeKey, profile, stage) {
  const selected = clean(selectedValue);
  const text = selected.toLowerCase();
  const label = getDisplayLabelForStage(stage, selected);

  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) {
    if (includesAny(text, ["first stable job", "first salary", "adjusting", "adult responsibilities", "work-life balance", "cutoff week"])) {
      return `Choosing “${label}” usually means income is becoming more stable, but adult responsibilities are still new. CLARA should watch how payday, bills, commute, food, and early rewards start shaping the first real money rhythm.`;
    }
    if (includesAny(text, ["independent", "bills", "rent", "utilities", "living costs", "food and commute", "fixed bills", "one-month buffer"])) {
      return `Choosing “${label}” usually means independence is no longer just emotional — it now has bills, food, rent, commute, and timing pressure attached to it. CLARA should help protect fixed costs before lifestyle spending starts moving.`;
    }
    if (includesAny(text, ["family", "goes home", "support", "contribution", "guilt", "support limit", "home needs"])) {
      return `Choosing “${label}” usually means your salary is connected to family responsibility, not just personal progress. This can make spending decisions emotional because career growth, home support, and your own buffer may compete in the same month.`;
    }
    if (includesAny(text, ["career", "promotion", "courses", "tools", "professional image", "networking", "growth", "invest", "compare", "behind others"])) {
      return `Choosing “${label}” usually means ambition is creating real pressure. Career spending can be helpful, but CLARA should separate true investment from panic, comparison, or the need to look ready before you actually have the budget for it.`;
    }
    if (includesAny(text, ["salary feels stable", "disappears", "payday feels strong", "lifestyle", "installments", "subscriptions", "salary leaks", "overspend early", "cutoff survival"])) {
      return `Choosing “${label}” usually means the salary is present, but the system around it may be leaking. CLARA should watch repeated small costs, subscriptions, installments, and payday confidence before they quietly erase the month.`;
    }
    if (includesAny(text, ["shift", "bpo", "night shift", "sleep", "long calls", "ot", "comfort after shifts", "convenience", "recovery spending"])) {
      return `Choosing “${label}” usually means energy and schedule are part of the money pattern. When sleep, calls, commute, or shifting routines drain recovery, spending can become comfort, convenience, or a way to feel human again after work.`;
    }
    if (includesAny(text, ["debt", "pay-later", "pay later", "minimum", "repayment", "old shortfalls", "borrow", "no-new-debt"])) {
      return `Choosing “${label}” usually means old money pressure may still be entering the current salary. CLARA should help stop new debt first, protect essentials, and make repayment predictable instead of letting every cutoff feel like repair mode.`;
    }
    if (includesAny(text, ["reward", "social", "comparison", "image", "prepared", "spending", "payday", "lifestyle pressure"])) {
      return `Choosing “${label}” usually means spending may be connected to identity, belonging, or recovery after work. CLARA should keep enjoyment visible, but set the amount before emotion, social pressure, or payday confidence decides for you.`;
    }
    return profile?.meaning || `Choosing “${label}” helps CLARA understand this Young Professional reality. This stage connects income, bills, growth pressure, lifestyle choices, recovery, and responsibility into one clearer money pattern.`;
  }

  if (profile?.meaning && !profile.meaning.startsWith("Selecting")) {
    return profile.meaning;
  }

  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) {
    if (includesAny(text, ["uneven", "one income", "one person", "covers gaps", "mismatch"])) {
      return `Choosing “${label}” usually means fairness is already part of the shared money story. CLARA should watch whether one person is silently carrying more than the other.`;
    }
    if (includesAny(text, ["family", "living with one family"])) {
      return `Choosing “${label}” usually means family expectations may affect the couple’s budget too. This can make shared decisions feel heavier because outside needs enter the relationship rhythm.`;
    }
    if (includesAny(text, ["avoid", "argue", "communication", "sensitive", "talk"] )) {
      return `Choosing “${label}” usually means the money conversation itself needs care. The issue may not only be the amount, but how safe it feels to talk about the amount.`;
    }
    if (includesAny(text, ["comfort", "spend together", "date", "food"])) {
      return `Choosing “${label}” usually means spending may be acting as bonding or emotional relief. That can be healthy, but it needs a shared limit so connection does not weaken stability.`;
    }
    if (includesAny(text, ["future", "planning", "move", "savings", "emergency"])) {
      return `Choosing “${label}” usually means the relationship is trying to protect a future direction. CLARA should help make that goal visible before daily spending absorbs the money.`;
    }
    return `Choosing “${label}” helps CLARA understand this shared-life setup. Money here connects bills, emotion, fairness, routine, and future direction together.`;
  }

  if (includesAny(text, ["tuition", "school payment", "school cost", "school requirement", "school needs", "school deadlines", "school continuity", "continue school", "protect school", "fear of stopping", "printing", "materials", "projects"])) {
    return `Choosing “${label}” usually means school is already claiming part of the budget before anything else. This can create pressure because requirements, tuition timing, fare, and materials may decide what is safe to spend.`;
  }
  if (includesAny(text, ["family", "home", "goes home", "shared", "give", "support boundary", "guilt"])) {
    return `Choosing “${label}” usually means your student money is connected to people at home, not only to yourself. That can make spending feel emotional because helping family and protecting your own school needs may happen at the same time.`;
  }
  if (includesAny(text, ["borrow", "debt", "repay", "repayment", "cash-flow", "delayed", "repair mode", "old pressure", "pressure carries", "no-new-debt"])) {
    return `Choosing “${label}” usually means money pressure may be carrying over instead of starting fresh. Borrowing, repayment, or delayed expenses can make the next income feel already spoken for.`;
  }
  if (includesAny(text, ["tired", "exhaust", "low recovery", "little time to rest", "commute", "heavy schedule", "shifts", "deadlines", "overwork", "burning out", "push rest", "comfort after hard days"])) {
    return `Choosing “${label}” usually means energy is becoming part of the money pattern. When school, work, and rest compete, spending can shift toward shortcuts, comfort, or skipped tracking just to survive the day.`;
  }
  if (includesAny(text, ["convenience", "rushed", "save energy", "missed tracking", "forget to track"])) {
    return `Choosing “${label}” usually means spending may be helping you save time or energy on rushed days. For working students, this often comes from exhaustion, not laziness.`;
  }
  if (includesAny(text, ["reward", "social", "small spending", "small rewards", "leaks", "micro", "stuck", "extra money leaks"])) {
    return `Choosing “${label}” usually means small spending may be acting as relief, reward, or a way to feel normal after effort. The risk is not one small purchase, but how often that pattern repeats.`;
  }
  if (includesAny(text, ["irregular", "unstable", "fluctuate", "income changes", "some weeks", "gaps", "seasonal", "side hustle", "money arrives after"])) {
    return `Choosing “${label}” usually means planning has to adjust around uneven money timing. This can make budgeting mentally tiring because the week can change before the plan is ready.`;
  }
  if (includesAny(text, ["food", "fare", "transport", "daily", "survival", "emergency", "stretch money", "no room", "essentials"])) {
    return `Choosing “${label}” usually means daily basics are taking up serious space in your decisions. Food, fare, school attendance, and small emergency costs can make even minor spending feel sensitive.`;
  }
  if (includesAny(text, ["save", "savings", "discipline", "plan", "priority", "purpose", "control", "pause", "prepared", "limits", "boundary", "protect"])) {
    return `Choosing “${label}” usually means you are trying to build control instead of only reacting to pressure. Even one small clear rule can make student money feel less scattered.`;
  }

  const stepMeaning = {
    setup: "This is the environment CLARA should understand before reading the money behavior.",
    rhythm: "This shows how money usually enters the week, which affects how safe or unstable planning feels.",
    workload: "This shows how much energy the week is already using before budgeting even starts.",
    pressure: "This shows what currently needs the most protection in the budget.",
    coping: "This shows how pressure may turn into behavior when the week gets heavy.",
    goal: "This shows what CLARA should help protect first before asking for stricter discipline.",
  };
  return `Choosing “${label}” helps CLARA understand this exact part of your working-student life. ${stepMeaning[activeKey] || "It connects school, work, money, and energy into one clearer picture."}`;
}

function getBoardFromConciseProfile(active) {
  const selectedValue = getSelectedOption(active.section);
  const { label, profile, stage } = getStageLabelAndProfile(selectedValue, active.meta.key);
  return {
    title: profile?.title || label || selectedValue,
    body: conciseSelectionMeaning(selectedValue, active.meta.key, profile, stage),
  };
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { header, summary, title } = findStageBoard();
  if (!active || !header || !summary || !title) return;
  const selectedValue = getSelectedOption(active.section);
  const board = getBoardFromConciseProfile(active);
  const signature = `${currentStage()}:${active.meta.key}:${selectedValue}:${board?.title}:${board?.body}`;
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