const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";
const SECURITY_VIEW_KEY = "detail:Security & privacy";

let installed = false;
let lastSettingsViewKey = "";
let scheduledFrame = null;
let scheduledScrollOwner = null;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function forceScrollTop(scrollOwner) {
  if (!scrollOwner?.isConnected) return;

  scrollOwner.scrollTop = 0;
  scrollOwner.scrollLeft = 0;

  try {
    scrollOwner.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    scrollOwner.scrollTop = 0;
    scrollOwner.scrollLeft = 0;
  }
}

function scheduleScrollReset(scrollOwner) {
  scheduledScrollOwner = scrollOwner;
  if (scheduledFrame !== null || typeof window === "undefined") return;

  scheduledFrame = window.requestAnimationFrame(() => {
    scheduledFrame = null;
    const owner = scheduledScrollOwner;
    scheduledScrollOwner = null;
    forceScrollTop(owner);
  });
}

function replaceExactText(root, selector, before, after) {
  if (!root) return false;

  const node = [...root.querySelectorAll(selector)].find(
    (candidate) => normalizeText(candidate.textContent) === before
  );

  if (!node) return false;
  node.textContent = after;
  return true;
}

function syncSecurityPrivacyCopy(detailRoot) {
  if (!detailRoot?.isConnected) return;

  replaceExactText(
    detailRoot,
    "h3",
    "Your CLARA data is private",
    "Your CLARA data stays private"
  );

  replaceExactText(
    detailRoot,
    "p",
    "This device is your private CLARA environment.",
    "This device has its own CLARA data. Signing in on another device will not automatically bring your financial records with it."
  );

  replaceExactText(
    detailRoot,
    "span",
    "Device-first data",
    "Each device starts with its own data"
  );

  replaceExactText(
    detailRoot,
    "span",
    "Not publicly visible",
    "No automatic device-to-device sync"
  );

  const protectedLabel = [...detailRoot.querySelectorAll("span")].find(
    (node) => normalizeText(node.textContent) === "Financial records protected"
  );
  const protectedRow = protectedLabel?.parentElement;

  if (protectedRow && ![...protectedRow.parentElement.children].some((row) =>
    normalizeText(row.textContent) === "You choose when to transfer your data"
  )) {
    const choiceRow = protectedRow.cloneNode(true);
    const choiceLabel = choiceRow.querySelector("span");
    if (choiceLabel) choiceLabel.textContent = "You choose when to transfer your data";
    protectedRow.parentElement.appendChild(choiceRow);
  }

  replaceExactText(
    detailRoot,
    "p",
    "Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain protected.",
    "Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain on this device unless you choose to back up or transfer them."
  );

  const transferButton = [...detailRoot.querySelectorAll("button")].find((button) => {
    const text = normalizeText(button.textContent);
    return text.includes("Backup & Transfer") || text.includes("Move & Restore Data");
  });

  if (transferButton) {
    const labels = transferButton.querySelectorAll("p");
    if (labels[0]) labels[0].textContent = "Move & Restore Data";
    if (labels[1]) {
      labels[1].textContent =
        "Move your CLARA data to another device or restore a previous backup.";
    }
  }
}

function handleSettingsViewSync(event) {
  const viewKey = String(event?.detail?.viewKey || "");
  const scrollOwner = event?.detail?.scrollOwner || null;
  const detailRoot = event?.detail?.detailRoot || null;

  if (viewKey === SECURITY_VIEW_KEY) {
    syncSecurityPrivacyCopy(detailRoot);
  }

  if (!viewKey || !scrollOwner) {
    lastSettingsViewKey = "";
    return;
  }

  if (viewKey === lastSettingsViewKey) return;

  lastSettingsViewKey = viewKey;
  scheduleScrollReset(scrollOwner);
}

export function installSettingsScrollReset() {
  if (installed || typeof window === "undefined") return;

  installed = true;
  window.addEventListener(SETTINGS_VIEW_SYNC_EVENT, handleSettingsViewSync);
}

installSettingsScrollReset();
