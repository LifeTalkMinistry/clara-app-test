const WEEKLY_CROSS_CHECK_SELECTOR = '[data-clara-weekly-cross-check-chat="true"]';
const INSTALLED_FLAG = "__CLARA_WEEKLY_CROSS_CHECK_FOREGROUND_OWNERSHIP_INSTALLED__";

function claimWeeklyCrossCheckForeground(node) {
  if (!(node instanceof HTMLElement)) return;
  node.setAttribute("data-clara-pause-overlay", "true");
  node.setAttribute("data-clara-buy-check-react-owner", "true");
  node.style.setProperty("z-index", "2147483000", "important");
  node.style.setProperty("isolation", "isolate", "important");
  node.style.setProperty("pointer-events", "auto", "important");
}

function scanWeeklyCrossCheckForeground() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(WEEKLY_CROSS_CHECK_SELECTOR)
    .forEach(claimWeeklyCrossCheckForeground);
}

export function installWeeklyCrossCheckForegroundOwnership() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALLED_FLAG]) return;
  window[INSTALLED_FLAG] = true;

  scanWeeklyCrossCheckForeground();

  const root = document.getElementById("root") || document.body;
  if (!root || typeof MutationObserver === "undefined") return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (!(addedNode instanceof HTMLElement)) continue;
        if (addedNode.matches?.(WEEKLY_CROSS_CHECK_SELECTOR)) {
          claimWeeklyCrossCheckForeground(addedNode);
        }
        addedNode
          .querySelectorAll?.(WEEKLY_CROSS_CHECK_SELECTOR)
          .forEach(claimWeeklyCrossCheckForeground);
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });
}

installWeeklyCrossCheckForegroundOwnership();
