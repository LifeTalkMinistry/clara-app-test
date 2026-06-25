import { playDailyTipFlipSound } from "@/lib/dailyTipFlipSound";

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

function shouldSkipFlipSound(interactive) {
  if (!interactive) return true;
  if (interactive.getAttribute("aria-disabled") === "true") return true;

  const label = String(interactive.getAttribute("aria-label") || "").toLowerCase();
  if (label.includes("guide step") || label.includes("unlock")) return true;

  const now = Date.now();
  const lastPlayedAt = lastPlayedByCard.get(interactive) || 0;
  if (now - lastPlayedAt < FLIP_SOUND_LOCK_MS) return true;

  lastPlayedByCard.set(interactive, now);
  return false;
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

  const handleClick = (event) => {
    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;
    playForCard(interactive);
  };

  const handleKeyDown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;

    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;
    playForCard(interactive);
  };

  // Install before the generic global sound listener so this interaction can opt out.
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    installed = false;
  };
}
