import {
  playDailyTipFlipSound,
  primeDailyTipFlipSound,
} from "@/lib/dailyTipFlipSound";

const DAILY_TIP_CARD_SELECTOR = "[data-clara-daily-tip-card='true']";
const FLIP_SOUND_LOCK_MS = 180;

let installed = false;
const lastPlayedByCard = new WeakMap();

function findInteractiveCard(target) {
  const card = target?.closest?.(DAILY_TIP_CARD_SELECTOR);
  if (!card) return null;

  const interactive = target?.closest?.("[role='button']");
  if (!interactive || !card.contains(interactive)) return null;

  return interactive;
}

function isNonFlipInteraction(interactive) {
  if (!interactive) return true;
  if (interactive.getAttribute("aria-disabled") === "true") return true;

  const label = String(interactive.getAttribute("aria-label") || "").toLowerCase();
  return label.includes("guide step") || label.includes("unlock");
}

function shouldSkipFlipSound(interactive) {
  if (isNonFlipInteraction(interactive)) return true;

  const now = Date.now();
  const lastPlayedAt = lastPlayedByCard.get(interactive) || 0;
  if (now - lastPlayedAt < FLIP_SOUND_LOCK_MS) return true;

  lastPlayedByCard.set(interactive, now);
  return false;
}

function prepareCardSound(interactive) {
  if (isNonFlipInteraction(interactive)) return;

  // Wake the low-latency audio context during the earliest user gesture.
  interactive.setAttribute("data-clara-no-sound", "true");
  primeDailyTipFlipSound({ resume: true });
}

function playForCard(interactive) {
  if (shouldSkipFlipSound(interactive)) return;

  // Suppress CLARA's generic global click sound for this specific interaction.
  interactive.setAttribute("data-clara-no-sound", "true");

  const isCurrentlyRevealed = interactive.getAttribute("aria-pressed") === "true";
  playDailyTipFlipSound({ direction: isCurrentlyRevealed ? "close" : "open" });
}

export function installDailyTipFlipSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  // Build the sound buffer during app startup so the first flip has less work to do.
  primeDailyTipFlipSound();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;
    prepareCardSound(interactive);
  };

  const handleClick = (event) => {
    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;
    playForCard(interactive);
  };

  const handleKeyDown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;

    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;

    prepareCardSound(interactive);
    playForCard(interactive);
  };

  // Install before the generic global sound listener so this interaction can opt out.
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    installed = false;
  };
}
