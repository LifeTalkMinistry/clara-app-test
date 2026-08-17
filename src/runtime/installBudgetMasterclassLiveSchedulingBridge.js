const MASTERCLASS_ROUTE_MARKER = "masterclass=budget";
const LIVE_CONVERSATION_LABEL = "schedule a live conversation";
const EXISTING_SCHEDULER_HASH = "#/welcome-session";

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function isBudgetMasterclassOpen() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").toLowerCase().includes(MASTERCLASS_ROUTE_MARKER);
}

function isLiveConversationButton(target) {
  if (!(target instanceof Element)) return null;
  const button = target.closest("button");
  if (!(button instanceof HTMLButtonElement)) return null;

  const label = normalizeText(button.textContent);
  if (!label.includes(LIVE_CONVERSATION_LABEL)) return null;
  return button;
}

function routeToExistingScheduler(event) {
  if (!isBudgetMasterclassOpen()) return;

  const button = isLiveConversationButton(event.target);
  if (!button || button.disabled) return;

  // Own this one action before the Masterclass placeholder handler runs.
  // The destination is CLARA's existing live-person scheduler; no duplicate
  // booking state or availability logic is created here.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  window.location.hash = EXISTING_SCHEDULER_HASH;
}

if (typeof document !== "undefined") {
  document.addEventListener("click", routeToExistingScheduler, true);
}
