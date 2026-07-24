const TOP_EXPLANATION =
  "Add each expense or responsibility one at a time. CLARA will calculate your real budget total as you go.";
const EMPTY_STATE_EXPLANATION =
  "You can continue without a regular item if this budget will contain only protected money or a confirmed obligation.";
const HIDDEN_MARKER = "data-clara-budget-copy-hidden";
const PROGRESS_HIDDEN_MARKER = "data-clara-budget-progress-hidden";
const STEP_NAMES = ["Budget Items", "Commitments", "Review", "Timeframe", "Activate"];

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

function isRedundantProgressCard(element) {
  if (!element || element.tagName !== "SECTION") return false;

  const text = normalizeText(element.textContent);
  if (!text) return false;

  return STEP_NAMES.some((name, index) => {
    const step = index + 1;
    const percent = step * 20;
    return text === `Step ${step} of 5 ${name} ${percent}%`;
  });
}

function restoreReusedElements(root) {
  if (!root) return;

  root.querySelectorAll(`[${HIDDEN_MARKER}="true"]`).forEach((element) => {
    const text = normalizeText(element.textContent);
    const shouldStayHidden = text === TOP_EXPLANATION || text === EMPTY_STATE_EXPLANATION;

    if (shouldStayHidden) return;

    element.hidden = false;
    element.style.removeProperty("display");
    element.removeAttribute(HIDDEN_MARKER);
  });

  root.querySelectorAll(`[${PROGRESS_HIDDEN_MARKER}="true"]`).forEach((element) => {
    if (isRedundantProgressCard(element)) return;

    element.hidden = false;
    element.style.removeProperty("display");
    element.removeAttribute(PROGRESS_HIDDEN_MARKER);
  });
}

function hideRedundantProgressCard(root) {
  if (!root) return;

  root.querySelectorAll("section").forEach((section) => {
    if (!isRedundantProgressCard(section)) return;

    section.setAttribute(PROGRESS_HIDDEN_MARKER, "true");
    section.hidden = true;
    section.style.display = "none";
  });
}

function hideMatchingCopy(root) {
  if (!root) return;

  restoreReusedElements(root);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const elementsToHide = new Set();
  let node = walker.nextNode();

  while (node) {
    const text = normalizeText(node.nodeValue);

    if (text === TOP_EXPLANATION) {
      const paragraph = node.parentElement?.closest("p");
      if (paragraph) elementsToHide.add(paragraph);
    }

    if (text === EMPTY_STATE_EXPLANATION) {
      const explanationCard = node.parentElement?.closest("div");
      if (explanationCard) elementsToHide.add(explanationCard);
    }

    node = walker.nextNode();
  }

  elementsToHide.forEach((element) => {
    element.setAttribute(HIDDEN_MARKER, "true");
    element.hidden = true;
    element.style.display = "none";
  });

  hideRedundantProgressCard(root);
}

export function installBudgetSetupCopyCleanup() {
  if (typeof window === "undefined" || window.__claraBudgetSetupCopyCleanupInstalled) return;
  window.__claraBudgetSetupCopyCleanupInstalled = true;

  const start = () => {
    const root = document.getElementById("root");
    if (!root) return;

    hideMatchingCopy(root);

    const observer = new MutationObserver(() => hideMatchingCopy(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
