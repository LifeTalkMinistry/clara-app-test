const PAUSE_KEY = "clara_talk_to_clara_pause_v1";
const MEMORY_KEY = "clara_behavioral_memory_v1";
const NONE_CHOICE_LABEL = "None of these";

const MEMORY_FLOW = [
  { key: "incomePattern", level: 1, choices: ["Stable monthly", "Every cutoff", "Changing", "Extra work", "Project-based"] },
  { key: "livingSituation", level: 1, choices: ["Alone", "With family", "With partner", "Renting", "Shared place"] },
  { key: "responsibilities", level: 1, choices: ["Family", "Rent/Bills", "Food", "Debt", "Self only"] },
  { key: "workType", level: 1, choices: ["BPO/Call center", "Office work", "Freelance", "Student", "Business"] },
  { key: "relationshipStatus", level: 1, choices: ["Single/no effect", "Relationship", "Family conflict", "Breakup/healing", "Complicated"] },
  { key: "dependents", level: 1, choices: ["No dependents", "Parents", "Child/kids", "Sibling", "Partner"] },
  { key: "currentFinancialPressure", level: 1, choices: ["Monthly bills", "Rent", "Food", "Debt", "Low savings"] },
  { key: "survivalPressureLevel", level: 1, choices: ["Light", "Manageable", "Tight", "Really heavy", "Changing"] },
  { key: "mainFinancialGoal", level: 1, choices: ["Emergency fund", "Save more", "Pay debt", "Control spending", "Increase income"] },
  { key: "emotionalStateTrend", level: 1, choices: ["Confident", "Slight leak", "Stressed", "Tempted", "Unclear"] },
  { key: "emotionalTriggers", level: 2, choices: ["Stress", "Sadness", "Boredom", "Loneliness", "Excitement"] },
  { key: "stressSpendingHabits", level: 2, choices: ["Food/drinks", "Online shopping", "Transport/convenience", "Entertainment", "I avoid spending"] },
  { key: "rewardSystem", level: 2, choices: ["Food/drinks", "Shopping", "Games/entertainment", "Rest", "Going out"] },
  { key: "commonImpulsivePurchases", level: 2, choices: ["Food", "Coffee/drinks", "Shopee/Lazada", "Gadgets", "Small random items"] },
  { key: "biggestSpendingWeakness", level: 2, choices: ["Food", "Online shopping", "Small leaks", "Impulse buys", "Giving money"] },
  { key: "copingMechanisms", level: 2, choices: ["Eat", "Sleep/rest", "Scroll online", "Buy something", "Talk to someone"] },
  { key: "motivationStyle", level: 2, choices: ["Gentle reminders", "Direct honesty", "Strong accountability", "Encouragement", "Step-by-step"] },
  { key: "financialFear", level: 2, choices: ["Running out", "Emergency", "Debt growing", "Family needs", "Losing income"] },
  { key: "guiltPatterns", level: 2, choices: ["Food", "Online shopping", "Wants/luxury", "Helping others", "No guilt pattern"] },
  { key: "socialPressureTriggers", level: 2, choices: ["Friends", "Family", "Coworkers", "Social media", "Dates/relationship"] },
  { key: "scheduleRoutine", level: 3, choices: ["Day shift", "Night shift", "Mixed schedule", "Flexible", "Very busy"] },
  { key: "sleepPattern", level: 3, choices: ["Good", "Irregular", "Short sleep", "Night shift sleep", "Poor"] },
  { key: "workExhaustion", level: 3, choices: ["Low", "Manageable", "Tired often", "Drained", "Burned out"] },
  { key: "socialEnvironment", level: 3, choices: ["They help", "They pressure me", "No effect", "Mixed", "I hide spending"] },
  { key: "relationshipConflicts", level: 3, choices: ["No", "Sometimes", "Family conflict", "Partner conflict", "Friend/coworker issue"] },
  { key: "hobbyPatterns", level: 3, choices: ["Music", "Sports", "Content creation", "Learning", "Rest"] },
  { key: "energyLevelTrends", level: 3, choices: ["Morning", "Afternoon", "After work", "Late night", "Random"] },
  { key: "burnoutIndicators", level: 3, choices: ["Overspending", "Low energy", "Irritable", "Avoiding tasks", "Sleep problems"] },
  { key: "wallets", level: 4, choices: ["Cash", "GCash", "Maya", "Bank", "Multiple"] },
  { key: "budgets", level: 4, choices: ["Strict budget", "Rough plan", "I track only", "Not yet", "Per cutoff"] },
  { key: "emergencyFund", level: 4, choices: ["Not started", "Starting", "Partly built", "Good progress", "Already okay"] },
  { key: "savingsGoals", level: 4, choices: ["Emergency fund", "Device/gadget", "Travel", "Business", "Family goal"] },
  { key: "recurringExpenses", level: 4, choices: ["Rent", "Bills", "Food", "Debt", "Subscriptions"] },
  { key: "debt", level: 4, choices: ["No debt", "Small debt", "Manageable", "Heavy", "Family-related"] },
  { key: "subscriptions", level: 4, choices: ["None", "A few", "Streaming", "Apps/tools", "Not sure"] },
  { key: "transfers", level: 4, choices: ["Rarely", "Sometimes", "Every cutoff", "For family", "For bills"] },
  { key: "paydayCycle", level: 4, choices: ["Once a month", "Every 10 and 25", "15 and 30", "Weekly", "Irregular"] },
];

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const wait = (ms = 160) => new Promise((resolve) => window.setTimeout(resolve, ms));
const matches = (answer, choices = []) => choices.some((choice) => clean(choice).toLowerCase() === clean(answer).toLowerCase());

function getOverlay() {
  return document.querySelector("[data-clara-ai-brain-version]");
}

function getLastQuestion(root) {
  return String(root?.innerText || "")
    .split("\n")
    .map(clean)
    .filter((line) => line.endsWith("?"))
    .at(-1) || "Talk to CLARA setup";
}

function getUserAnswers(root) {
  return Array.from(root?.querySelectorAll("main div") || [])
    .filter((node) => {
      const className = String(node.className || "");
      const text = clean(node.innerText || node.textContent || "");
      return text && className.includes("bg-emerald-300") && className.includes("text-slate-950");
    })
    .map((node) => clean(node.innerText || node.textContent || ""))
    .filter(Boolean);
}

function isTalkFlowOpen(root) {
  const text = String(root?.innerText || "");
  return /Would you like me to explain it in English or Tagalog|How does your income usually come in|What emotion usually makes you want to spend|What wallets or money sources do you usually use|Is anyone depending on your money or care right now/i.test(text);
}

function readPause() {
  try {
    return JSON.parse(localStorage.getItem(PAUSE_KEY) || "null");
  } catch {
    return null;
  }
}

function readMemory() {
  try {
    return { version: 2, updatedAt: "", items: {}, ...JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}") };
  } catch {
    return { version: 2, updatedAt: "", items: {} };
  }
}

function labelFor(key = "") {
  return String(key).replace(/([A-Z])/g, " $1").replace(/^\w/, (letter) => letter.toUpperCase()).trim();
}

function writeMemoryItem(step, value) {
  const nextValue = clean(value);
  if (!step?.key || !nextValue || nextValue === NONE_CHOICE_LABEL) return false;

  if (window.CLARA_BEHAVIORAL_MEMORY?.updateItem) {
    window.CLARA_BEHAVIORAL_MEMORY.updateItem(step.key, {
      label: labelFor(step.key),
      value: nextValue,
      layer: Number(step.level || 1),
      source: "talk-to-clara-guided-flow",
    });
    return true;
  }

  const current = readMemory();
  const previous = current.items?.[step.key] || {};
  const now = new Date().toISOString();
  const payload = {
    version: 2,
    updatedAt: now,
    items: {
      ...(current.items || {}),
      [step.key]: {
        key: step.key,
        label: previous.label || labelFor(step.key),
        value: nextValue,
        layer: Number(step.level || previous.layer || 1),
        weight: Math.min(10, Number(previous.weight || 0) + 2),
        pinned: Boolean(previous.pinned),
        source: "talk-to-clara-guided-flow",
        createdAt: previous.createdAt || now,
        updatedAt: now,
      },
    },
  };

  localStorage.setItem(MEMORY_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: payload }));
  return true;
}

function syncMeMemoryFromAnswers(answers = []) {
  let stepIndex = 0;
  let customStep = null;
  const savedKeys = new Set();

  answers.forEach((answer) => {
    if (customStep) {
      if (writeMemoryItem(customStep, answer)) savedKeys.add(customStep.key);
      customStep = null;
      stepIndex += 1;
      return;
    }

    const step = MEMORY_FLOW[stepIndex];
    if (!step) return;

    if (answer === NONE_CHOICE_LABEL) {
      customStep = step;
      return;
    }

    if (matches(answer, step.choices)) {
      if (writeMemoryItem(step, answer)) savedKeys.add(step.key);
      stepIndex += 1;
    }
  });

  if (savedKeys.size > 0) {
    window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: readMemory() }));
  }

  return savedKeys.size;
}

function savePause(root) {
  const userAnswers = getUserAnswers(root);
  const payload = {
    savedAt: new Date().toISOString(),
    lastQuestion: getLastQuestion(root),
    userAnswers,
    memorySavedCount: syncMeMemoryFromAnswers(userAnswers),
    visibleText: String(root?.innerText || "").slice(-3000),
  };

  localStorage.setItem(PAUSE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("clara-talk-pause-updated", { detail: payload }));
}

function clearPause() {
  localStorage.removeItem(PAUSE_KEY);
  window.dispatchEvent(new CustomEvent("clara-talk-pause-updated"));
}

function findChoiceButton(root, label) {
  return Array.from(root.querySelectorAll("button")).find((button) => clean(button.innerText || button.textContent) === label);
}

function findAllChoiceButtons(root, label) {
  return Array.from(root.querySelectorAll("button")).filter((button) => clean(button.innerText || button.textContent) === label);
}

function findSendButton(root) {
  return Array.from(root.querySelectorAll("button")).find((button) => /send to clara/i.test(button.getAttribute("aria-label") || ""));
}

async function playAnswer(root, answer) {
  const value = clean(answer);
  if (!value) return;
  await wait(180);

  const choice = findChoiceButton(root, value);
  if (choice && !choice.disabled) {
    choice.click();
    return;
  }

  const input = root.querySelector("input");
  const send = findSendButton(root);
  if (!input || !send || send.disabled) return;

  input.focus?.();
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(80);
  send.click();
}

async function continuePause(root, card) {
  const saved = readPause();
  const answers = Array.isArray(saved?.userAnswers) ? saved.userAnswers : [];
  const button = card.querySelector("[data-clara-resume-pause]");

  if (button) {
    button.disabled = true;
    button.textContent = "Continuing...";
  }

  for (const answer of answers) {
    await playAnswer(root, answer);
  }

  clearPause();
  card.remove();
}

function closeOverlay(root) {
  const close = Array.from(root.querySelectorAll("button")).find((item) => /close/i.test(item.getAttribute("aria-label") || ""));
  if (close) close.click();
}

function addButtonBesideNone(root, noneButton) {
  const holder = noneButton?.parentElement;
  if (!noneButton || !holder) return;
  if (holder.querySelector("[data-clara-continue-later]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.claraContinueLater = "true";
  button.textContent = "Continue later";
  button.className = noneButton.className;
  button.style.background = "rgba(255,255,255,.08)";
  button.style.borderColor = "rgba(255,255,255,.22)";
  button.style.color = "rgba(255,255,255,.86)";
  button.onclick = () => {
    savePause(root);
    closeOverlay(root);
  };
  holder.appendChild(button);
}

function addContinueLater() {
  const root = getOverlay();
  if (!root || !/None of these/i.test(root.innerText || "")) return;

  const noneButtons = findAllChoiceButtons(root, "None of these");
  noneButtons.forEach((noneButton) => addButtonBesideNone(root, noneButton));
}

function addResumeNotice() {
  const root = getOverlay();
  if (!root || root.querySelector("[data-clara-resume-notice]")) return;
  if (!isTalkFlowOpen(root)) return;

  const saved = readPause();
  if (!saved) return;

  const holder = root.querySelector("main > div");
  if (!holder) return;

  const card = document.createElement("div");
  card.dataset.claraResumeNotice = "true";
  card.style.cssText = "margin:12px 0;border:1px solid rgba(110,231,183,.18);background:rgba(110,231,183,.10);border-radius:22px;padding:12px;color:white;";

  const title = document.createElement("div");
  title.textContent = "Paused Talk to CLARA";
  title.style.cssText = "font-size:11px;font-weight:900;letter-spacing:.16em;color:rgba(167,243,208,.78);text-transform:uppercase;";

  const body = document.createElement("div");
  body.textContent = `You paused at: ${clean(saved.lastQuestion || "your setup")}`;
  body.style.cssText = "font-size:13px;line-height:1.55;color:rgba(226,232,240,.88);margin-top:6px;";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";

  const resume = document.createElement("button");
  resume.type = "button";
  resume.dataset.claraResumePause = "true";
  resume.textContent = "Continue";
  resume.style.cssText = "border:1px solid rgba(110,231,183,.28);background:rgba(110,231,183,.16);color:white;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900;";
  resume.onclick = () => continuePause(root, card);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset";
  reset.style.cssText = "border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900;";
  reset.onclick = () => {
    clearPause();
    card.remove();
  };

  actions.appendChild(resume);
  actions.appendChild(reset);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(actions);
  holder.appendChild(card);
}

function run() {
  addContinueLater();
  addResumeNotice();
}

if (typeof window !== "undefined" && !window.__claraTalkPauseBridgeInstalled) {
  window.__claraTalkPauseBridgeInstalled = true;
  window.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (root) {
      new MutationObserver(() => setTimeout(run, 80)).observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    run();
  });
}
