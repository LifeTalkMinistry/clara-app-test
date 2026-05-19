const MODAL_SELECTOR = "#root div[class*='fixed'][class*='z-[9999]']";

const sessionAnswers = {
  setup: "",
  rhythm: "",
  pressure: "",
  focus: "",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function modal() {
  return document.querySelector(MODAL_SELECTOR);
}

function screenOf(root) {
  const title = clean(root?.querySelector("header h3")?.textContent).toLowerCase();
  if (title.includes("shape the environment")) return "environment";
  if (title.includes("set your focus")) return "focus";
  return title ? "stage" : "";
}

function keyFor(label) {
  const value = clean(label).toLowerCase();
  if (value.includes("current setup")) return "setup";
  if (value.includes("current rhythm")) return "rhythm";
  if (value.includes("pressure")) return "pressure";
  if (value.includes("main focus")) return "focus";
  return "setup";
}

function groupsOf(root) {
  const panel = Array.from(root?.querySelectorAll("main section") || []).find((section) =>
    String(section.className || "").includes("space-y-5")
  );
  return Array.from(panel?.children || []).filter((item) => item.querySelector("button"));
}

function visibleGroup(groups) {
  return groups.find((group) => group.dataset.claraProgressiveVisible === "true") || groups[0] || null;
}

function selectedButton(group) {
  if (group?.dataset.claraUserTouched !== "true") return null;
  return Array.from(group.querySelectorAll("button")).find((button) =>
    String(button.className || "").includes("bg-cyan-200")
  );
}

function headerMessage(root) {
  return root?.querySelector("header h3")?.nextElementSibling || null;
}

function resetSessionAnswers() {
  sessionAnswers.setup = "";
  sessionAnswers.rhythm = "";
  sessionAnswers.pressure = "";
  sessionAnswers.focus = "";
}

function introFor(key) {
  if (key === "setup") return "Start by choosing your current setup. This becomes CLARA’s first clue about your real environment before it reads your rhythm, pressure, and focus.";
  if (key === "rhythm") return sessionAnswers.setup
    ? `You started with ${sessionAnswers.setup}. Now choose your rhythm so CLARA can connect your environment with how money actually moves day to day.`
    : "Now choose your rhythm so CLARA can understand how stable or changing your money season feels.";
  if (key === "pressure") return contextLine("Now choose the pressure that is affecting your decisions most. CLARA will connect it with your setup and rhythm.");
  if (key === "focus") return contextLine("Now choose what should be protected first. CLARA will use this to complete the life-season profile.");
  return "Choose the option that best matches your situation.";
}

function optionMeaning(option, key) {
  const o = clean(option).toLowerCase();

  if (key === "setup") {
    if (o.includes("first job")) return "your money habits are still forming, so first-salary rewards, early bills, and save-before-spend routines matter.";
    if (o.includes("early career")) return "you already have work momentum, but lifestyle upgrades, new responsibilities, and savings discipline can start competing.";
    if (o.includes("exploring")) return "your earning path is still open, so flexibility, small buffers, and avoiding heavy commitments matter.";
    if (o.includes("independence")) return "you are carrying more of your own needs, so boundaries, essentials, and emergency protection become more important.";
    if (o.includes("family") || o.includes("parents") || o.includes("siblings") || o.includes("household")) return "family or household expectations may shape spending, support requests, contribution pressure, and boundaries.";
    if (o.includes("partner")) return "shared routines and relationship expectations can affect bills, comfort spending, and future planning.";
    if (o.includes("child")) return "child-centered needs make essentials, timing, and emergency protection more important than flexible spending.";
    if (o.includes("corporate") || o.includes("office") || o.includes("bpo") || o.includes("remote")) return "work structure can shape daily spending through commute, meals, stress, shifts, or home-work routines.";
    if (o.includes("freelance") || o.includes("client") || o.includes("project") || o.includes("side hustle")) return "income depends more on flow and timing, so buffers and separated wallets become important.";
    if (o.includes("business") || o.includes("starting") || o.includes("main income")) return "business and personal money can mix, so runway, owner pay, and operating costs need clearer separation.";
    return `your current environment is ${option}, so CLARA will treat your setup as the foundation of the profile.`;
  }

  if (key === "rhythm") {
    if (o.includes("irregular") || o.includes("changing") || o.includes("seasonal") || o.includes("not steady") || o.includes("unpredictable")) return "your cash flow is not fully predictable, so CLARA should avoid strict fixed-payday assumptions and protect buffers, bills, and low-income periods.";
    if (o.includes("stable") || o.includes("salary") || o.includes("monthly") || o.includes("routine")) return "your rhythm has enough predictability to build stronger rules around bills, savings, and controlled self-reward.";
    if (o.includes("cutoff") || o.includes("every cutoff")) return "your spending may rise and fall around payday, so CLARA should watch early-cutoff spending and end-cycle survival behavior.";
    if (o.includes("part-time") || o.includes("allowance")) return "income may be limited or mixed with support, so CLARA should separate essentials, school/work needs, and personal spending.";
    if (o.includes("shift")) return "your schedule can affect energy and spending, especially food, transport, convenience buys, and fatigue rewards.";
    if (o.includes("reinvest") || o.includes("scaling") || o.includes("sales")) return "business movement affects personal stability, so CLARA should watch cash flow before growth decisions become risky.";
    return `your rhythm is ${option}, so CLARA will use that timing pattern to shape the budget advice.`;
  }

  if (key === "pressure") {
    if (o.includes("burnout") || o.includes("stress") || o.includes("fatigue")) return "emotional or energy pressure can turn into comfort spending, food shortcuts, and reward purchases.";
    if (o.includes("family") || o.includes("support") || o.includes("household")) return "relationship or household pressure can blur boundaries and make money decisions feel urgent or guilt-based.";
    if (o.includes("transport") || o.includes("school") || o.includes("daily needs")) return "essential daily costs are pulling the budget, so CLARA should protect practical needs before flexible wants.";
    if (o.includes("emergency") || o.includes("low buffer")) return "one surprise expense can disrupt the month, so emergency protection should come before upgrades or risk.";
    if (o.includes("lifestyle") || o.includes("comfort") || o.includes("peer") || o.includes("impulse") || o.includes("random")) return "spending pressure may come from emotion, comparison, or small unplanned choices that repeat.";
    if (o.includes("client") || o.includes("income") || o.includes("sales")) return "money timing is the pressure point, so CLARA should stay conservative until cash is actually available.";
    if (o.includes("inventory") || o.includes("operating") || o.includes("reinvestment") || o.includes("business")) return "business growth pressure can drain personal stability if spending, runway, and operating money are not separated.";
    return `the active pressure is ${option}, so CLARA will watch how that pressure affects decisions before spending happens.`;
  }

  if (key === "focus") {
    if (o.includes("emergency") || o.includes("buffer") || o.includes("runway") || o.includes("safety") || o.includes("protect")) return "your priority is protection, so CLARA should defend essentials and cash reserves before flexible spending.";
    if (o.includes("save")) return "your priority is consistent saving, so CLARA should make saving happen before money leaks into small purchases.";
    if (o.includes("debt")) return "your priority is reducing future pressure, so CLARA should prevent new borrowing triggers while protecting essentials.";
    if (o.includes("habit") || o.includes("discipline") || o.includes("impulse") || o.includes("random")) return "your priority is behavior control, so CLARA should watch triggers and help you decide before spending becomes automatic.";
    if (o.includes("family") || o.includes("contribute")) return "your priority includes responsibility to others, so CLARA should balance support with personal stability.";
    if (o.includes("grow") || o.includes("client") || o.includes("business") || o.includes("sustainable")) return "your priority is growth, but CLARA should protect cash flow so progress does not create instability.";
    return `your priority is ${option}, so CLARA will use that as the direction of the plan.`;
  }

  return `${option} gives CLARA another signal about your real financial season.`;
}

function answeredParts() {
  const parts = [];
  if (sessionAnswers.setup) parts.push(`setup: ${sessionAnswers.setup}`);
  if (sessionAnswers.rhythm) parts.push(`rhythm: ${sessionAnswers.rhythm}`);
  if (sessionAnswers.pressure) parts.push(`pressure: ${sessionAnswers.pressure}`);
  if (sessionAnswers.focus) parts.push(`focus: ${sessionAnswers.focus}`);
  return parts;
}

function contextLine(extra) {
  const parts = answeredParts();
  if (!parts.length) return extra;
  return `So far, CLARA sees ${parts.join(" + ")}. ${extra}`;
}

function buildMessage(key, option) {
  if (!option) return introFor(key);

  sessionAnswers[key] = option;
  const meaning = optionMeaning(option, key);

  if (key === "setup") {
    return `Starting profile: ${option}. This means ${meaning}`;
  }

  if (key === "rhythm") {
    return contextLine(`Because your rhythm is ${option}, ${meaning}`);
  }

  if (key === "pressure") {
    return contextLine(`With ${option} as the pressure, ${meaning}`);
  }

  if (key === "focus") {
    return contextLine(`Since your focus is ${option}, ${meaning}`);
  }

  return contextLine(`${option}: ${meaning}`);
}

function syncFromGroup(group) {
  if (!group) return "";
  const label = clean(group.querySelector("p")?.textContent);
  const key = keyFor(label);
  const option = clean(selectedButton(group)?.textContent);
  return buildMessage(key, option);
}

function refresh() {
  const root = modal();
  if (!root) return;
  const screen = screenOf(root);
  if (screen === "stage") {
    resetSessionAnswers();
    return;
  }
  if (!["environment", "focus"].includes(screen)) return;

  const groups = groupsOf(root);
  groups.forEach((group) => {
    if (!group.dataset.claraUserTouched) group.dataset.claraUserTouched = "false";
  });

  root.querySelectorAll("[data-clara-life-explanation='true']").forEach((node) => node.remove());

  const message = headerMessage(root);
  if (message) message.textContent = syncFromGroup(visibleGroup(groups));
}

function handleClick(event) {
  const root = modal();
  if (!root || !["environment", "focus"].includes(screenOf(root))) return;
  const button = event.target?.closest?.("button");
  if (!button || button.closest("footer")) return;
  const group = button.closest("[data-clara-progressive-group]") || button.parentElement?.parentElement;
  if (group) group.dataset.claraUserTouched = "true";
  requestAnimationFrame(refresh);
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_EXPLANATIONS__) {
  window.__CLARA_LIFE_EXPLANATIONS__ = true;
  document.addEventListener("click", handleClick, true);
  const observer = new MutationObserver(() => requestAnimationFrame(refresh));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  requestAnimationFrame(refresh);
}
