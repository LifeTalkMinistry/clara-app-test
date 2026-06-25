import {
  playDailyTipFlipSound,
  primeDailyTipFlipSound,
} from "@/lib/dailyTipFlipSound";

const DAILY_TIP_CARD_SELECTOR = "[data-clara-daily-tip-card='true']";

let installed = false;

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

function prepareCardSound(interactive) {
  if (isNonFlipInteraction(interactive)) return;

  interactive.setAttribute("data-clara-no-sound", "true");
  primeDailyTipFlipSound({ resume: true });
}

function playForCard(interactive) {
  if (isNonFlipInteraction(interactive)) return;

  interactive.setAttribute("data-clara-no-sound", "true");

  const isCurrentlyRevealed = interactive.getAttribute("aria-pressed") === "true";
  playDailyTipFlipSound({ direction: isCurrentlyRevealed ? "close" : "open" });
}

export function installDailyTipFlipSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

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
