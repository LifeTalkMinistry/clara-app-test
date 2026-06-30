import { playMoneyVisibilitySound } from "@/lib/moneyVisibilitySound";
import { playLearningHubToggleSound } from "./installLearningHubOpenSound";

const CALENDAR_DATE_SELECTOR =
  'button[aria-label^="Select "][aria-label*="Double tap to add a schedule."]';
const MONEY_WORD_LETTER_SELECTOR = [
  'button[aria-label^="Choose letter "]',
  'button[aria-label^="Remove letter "]',
].join(", ");
const SELECTOR =
  `[data-clara-summary-privacy-toggle='true'], button[data-clara-trend-card='true'], [data-clara-heart-cta='true'], ${CALENDAR_DATE_SELECTOR}, ${MONEY_WORD_LETTER_SELECTOR}`;
const CALENDAR_DOUBLE_CLICK_MS = 380;

let installed = false;
let calendarClickTimer = null;
let lastCalendarButton = null;
let lastCalendarClickAt = 0;

function isMoneyWordGameRoot(root) {
  const text = String(root?.textContent || "").toUpperCase();
  return text.includes("MONEY GAME MODE") && text.includes("HIDDEN MONEY WORD");
}

function findMoneyWordSubmitButton(target) {
  const button = target?.closest?.('button[type="submit"]');
  if (!button) return null;

  const buttonText = String(button.textContent || "").trim().toLowerCase();
  if (!buttonText.startsWith("check") && !buttonText.startsWith("next")) return null;

  return isMoneyWordGameRoot(button.closest?.("main")) ? button : null;
}

function findButton(target) {
  const button = target?.closest?.(SELECTOR) || findMoneyWordSubmitButton(target);
  if (!button || button.disabled || button.getAttribute?.("aria-disabled") === "true") {
    return null;
  }
  return button;
}

function isCalendarDateButton(button) {
  return Boolean(button?.matches?.(CALENDAR_DATE_SELECTOR));
}

function isMoneyWordLetterButton(button) {
  return Boolean(button?.matches?.(MONEY_WORD_LETTER_SELECTOR));
}

function isMoneyWordSubmitButton(button) {
  return Boolean(findMoneyWordSubmitButton(button));
}

function mark(button) {
  button?.setAttribute?.("data-clara-no-sound", "true");
}

function playButtonSound(button) {
  if (isMoneyWordSubmitButton(button)) {
    playLearningHubToggleSound(button);
    return;
  }

  if (isMoneyWordLetterButton(button)) {
    playMoneyVisibilitySound();
    return;
  }

  playMoneyVisibilitySound();
}

function clearCalendarTimer() {
  if (calendarClickTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(calendarClickTimer);
  }
  calendarClickTimer = null;
}

function resetCalendarClickState() {
  clearCalendarTimer();
  lastCalendarButton = null;
  lastCalendarClickAt = 0;
}

function handleCalendarDateClick(button) {
  const now = Date.now();
  const isDoubleClick =
    lastCalendarButton === button &&
    now - lastCalendarClickAt <= CALENDAR_DOUBLE_CLICK_MS;

  if (isDoubleClick) {
    resetCalendarClickState();
    playLearningHubToggleSound(button);
    return;
  }

  if (calendarClickTimer !== null) {
    clearCalendarTimer();
    playMoneyVisibilitySound();
  }

  lastCalendarButton = button;
  lastCalendarClickAt = now;
  calendarClickTimer = window.setTimeout(() => {
    calendarClickTimer = null;
    lastCalendarButton = null;
    lastCalendarClickAt = 0;
    playMoneyVisibilitySound();
  }, CALENDAR_DOUBLE_CLICK_MS);
}

export function installMoneyVisibilitySound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  const pointerdown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;
    const button = findButton(event.target);
    if (!button) return;
    mark(button);
    if (isCalendarDateButton(button)) return;
    playButtonSound(button);
  };

  const click = (event) => {
    const button = findButton(event.target);
    if (!button) return;
    mark(button);
    if (isCalendarDateButton(button)) {
      handleCalendarDateClick(button);
    }
  };

  const keydown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    const button = findButton(event.target);
    if (!button) return;
    mark(button);
    if (isCalendarDateButton(button)) return;
    playButtonSound(button);
  };

  document.addEventListener("pointerdown", pointerdown, true);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", keydown, true);

  return () => {
    document.removeEventListener("pointerdown", pointerdown, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", keydown, true);
    resetCalendarClickState();
    installed = false;
  };
}
