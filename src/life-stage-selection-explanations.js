const MODAL_SELECTOR = "#root div[class*='fixed'][class*='z-[9999]']";

const optionCopy = {
  "First job": "So you are choosing First job. This usually means your income rhythm is still new, so CLARA will help you build simple money habits before spending becomes automatic.",
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

function groupsOf(root) {
  const panel = Array.from(root?.querySelectorAll("main section") || []).find((section) =>
    String(section.className || "").includes("space-y-5")
  );
  return Array.from(panel?.children || []).filter((item) => item.querySelector("button"));
}

function visibleGroup(groups) {
  return groups.find((group) => group.dataset.claraProgressiveVisible === "true") || groups[0] || null;
}

function selectedOption(group) {
  if (group?.dataset.claraUserTouched !== "true") return "";
  const selected = Array.from(group.querySelectorAll("button")).find((button) =>
    String(button.className || "").includes("bg-cyan-200")
  );
  return clean(selected?.textContent);
}

function intro(label) {
  const value = String(label || "").toLowerCase();
  if (value.includes("current setup")) return "This section tells CLARA what kind of environment you are operating from right now. Choose the tile that best fits your real situation.";
  if (value.includes("current rhythm")) return "This section tells CLARA how stable or changing this season feels. Choose the tile that best fits your rhythm.";
  if (value.includes("pressure")) return "This section tells CLARA what pressure affects your money decisions the most right now.";
  if (value.includes("main focus")) return "This section tells CLARA what you want to protect first in this season.";
  return "Choose the tile that best fits your situation.";
}

function explanationFor(group) {
  const label = clean(group?.querySelector("p")?.textContent);
  const picked = selectedOption(group);
  if (!picked) return intro(label);
  return optionCopy[picked] || `So you are choosing ${picked}. This helps CLARA understand your current season and adapt the guidance around your answer.`;
}

function headerMessage(root) {
  return root?.querySelector("header h3")?.nextElementSibling || null;
}

function removeOldCardNotes(root) {
  root?.querySelectorAll("[data-clara-life-explanation='true']").forEach((node) => node.remove());
}

function refresh() {
  const root = modal();
  if (!root) return;
  if (!["environment", "focus"].includes(screenOf(root))) return;
  const groups = groupsOf(root);
  groups.forEach((group) => {
    if (!group.dataset.claraUserTouched) group.dataset.claraUserTouched = "false";
  });
  removeOldCardNotes(root);
  const message = headerMessage(root);
  if (message) message.textContent = explanationFor(visibleGroup(groups));
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
