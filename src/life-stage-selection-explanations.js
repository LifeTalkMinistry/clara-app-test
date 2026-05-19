const MODAL_SELECTOR = "#root div[class*='fixed'][class*='inset-y-0'][class*='left-1/2'][class*='z-[9999]']";

const optionCopy = {
  "First job": "So you are choosing First job. This usually means your income rhythm is still new, so CLARA will help you build simple money habits before spending becomes automatic.",
};

function text(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function getModal() {
  return document.querySelector(MODAL_SELECTOR);
}

function getScreen(modal) {
  const title = text(modal?.querySelector("header h3")).toLowerCase();
  if (title.includes("shape the environment")) return "environment";
  if (title.includes("set your focus")) return "focus";
  if (title) return "stage";
  return "";
}

function getGroups(modal) {
  const panel = Array.from(modal?.querySelectorAll("main section") || []).find((section) =>
    String(section.className || "").includes("space-y-5")
  );
  return Array.from(panel?.children || []).filter((child) => text(child.querySelector("p")) && child.querySelector("button"));
}

function introFor(label) {
  const clean = String(label || "").toLowerCase();
  if (clean.includes("current setup")) return "This section tells CLARA what kind of environment you are operating from right now. Choose the tile that best fits your real situation.";
  if (clean.includes("current rhythm")) return "This section tells CLARA how stable or changing this season feels. Choose the tile that best fits your rhythm.";
  if (clean.includes("pressure")) return "This section tells CLARA what pressure affects your money decisions the most right now.";
  if (clean.includes("main focus")) return "This section tells CLARA what you want to protect first in this season.";
  return "Choose the tile that best fits your situation.";
}

function selectedButton(group) {
  if (group?.dataset.claraUserTouched !== "true") return null;
  return Array.from(group.querySelectorAll("button")).find((button) => String(button.className || "").includes("bg-cyan-200"));
}

function updateExplanation(group) {
  if (!group) return;
  const label = text(group.querySelector("p"));
  const helper = group.querySelector("p:nth-child(2)") || group.querySelector("p");
  if (!helper) return;

  let note = group.querySelector("[data-clara-life-explanation='true']");
  if (!note) {
    note = document.createElement("p");
    note.dataset.claraLifeExplanation = "true";
    note.className = "clara-life-explanation";
    helper.insertAdjacentElement("afterend", note);
  }

  const picked = text(selectedButton(group));
  note.textContent = picked ? optionCopy[picked] || `So you are choosing ${picked}. This helps CLARA understand your current season and adapt the guidance around your answer.` : introFor(label);
}

function updateAll() {
  const modal = getModal();
  if (!modal) return;
  const screen = getScreen(modal);
  if (!["environment", "focus"].includes(screen)) return;
  getGroups(modal).forEach(updateExplanation);
}

function handleClick(event) {
  const modal = getModal();
  if (!modal || !["environment", "focus"].includes(getScreen(modal))) return;
  const target = event.target?.closest?.("button");
  if (!target || target.closest("footer")) return;
  const group = target.closest("[data-clara-progressive-group]") || target.parentElement?.parentElement;
  if (!group) return;
  group.dataset.claraUserTouched = "true";
  requestAnimationFrame(() => updateExplanation(group));
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_EXPLANATIONS__) {
  window.__CLARA_LIFE_EXPLANATIONS__ = true;
  document.addEventListener("click", handleClick, true);
  const observer = new MutationObserver(() => requestAnimationFrame(updateAll));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  requestAnimationFrame(updateAll);
}
