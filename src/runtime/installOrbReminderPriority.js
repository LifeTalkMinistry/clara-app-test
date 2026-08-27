const INSTALLED_FLAG = "__CLARA_ORB_REMINDER_PRIORITY_INSTALLED__";
const STYLE_ID = "clara-orb-reminder-priority-styles";
const BLOCK_SCHEDULE_ATTR = "data-clara-orb-schedule-reminder-blocked";
const DAILY_STREAK_TITLE_ID = "clara-streak-bubble-title";
const WEEKLY_CROSS_CHECK_BANNER_ID = "clara-weekly-cross-check-reminder";

function hasHigherPriorityOrbReminder() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.getElementById(DAILY_STREAK_TITLE_ID) ||
      document.getElementById(WEEKLY_CROSS_CHECK_BANNER_ID)
  );
}

function ensurePriorityStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    body[${BLOCK_SCHEDULE_ATTR}="true"] [data-clara-orb-past-schedule-banner="true"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function syncOrbReminderPriority() {
  if (typeof document === "undefined" || !document.body) return;
  document.body.setAttribute(
    BLOCK_SCHEDULE_ATTR,
    hasHigherPriorityOrbReminder() ? "true" : "false"
  );
}

function startPriorityOwnership() {
  if (!document.body) return;
  ensurePriorityStyles();
  syncOrbReminderPriority();

  if (typeof MutationObserver === "undefined") return;
  const observer = new MutationObserver(syncOrbReminderPriority);
  observer.observe(document.body, { childList: true, subtree: true });
}

export function installOrbReminderPriority() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALLED_FLAG]) return;
  window[INSTALLED_FLAG] = true;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPriorityOwnership, { once: true });
    return;
  }

  startPriorityOwnership();
}

installOrbReminderPriority();
