const TOP_EXPLANATION =
  "Add each expense or responsibility one at a time. CLARA will calculate your real budget total as you go.";
const EMPTY_STATE_EXPLANATION =
  "You can continue without a regular item if this budget will contain only protected money or a confirmed obligation.";

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

function removeMatchingCopy(root) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const elementsToRemove = new Set();
  let node = walker.nextNode();

  while (node) {
    const text = normalizeText(node.nodeValue);

    if (text === TOP_EXPLANATION) {
      const paragraph = node.parentElement?.closest("p");
      if (paragraph) elementsToRemove.add(paragraph);
    }

    if (text === EMPTY_STATE_EXPLANATION) {
      const explanationCard = node.parentElement?.closest("div");
      if (explanationCard) elementsToRemove.add(explanationCard);
    }

    node = walker.nextNode();
  }

  elementsToRemove.forEach((element) => element.remove());
}

export function installBudgetSetupCopyCleanup() {
  if (typeof window === "undefined" || window.__claraBudgetSetupCopyCleanupInstalled) return;
  window.__claraBudgetSetupCopyCleanupInstalled = true;

  const start = () => {
    const root = document.getElementById("root");
    if (!root) return;

    removeMatchingCopy(root);

    const observer = new MutationObserver(() => removeMatchingCopy(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
