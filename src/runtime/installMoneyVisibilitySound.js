import { playMoneyVisibilitySound } from "@/lib/moneyVisibilitySound";

const SELECTOR =
  "[data-clara-summary-privacy-toggle='true'], button[data-clara-trend-card='true'], [data-clara-heart-cta='true']";
let installed = false;

function findButton(target) {
  const button = target?.closest?.(SELECTOR);
  if (!button || button.disabled || button.getAttribute?.("aria-disabled") === "true") {
    return null;
  }
  return button;
}

function mark(button) {
  button?.setAttribute?.("data-clara-no-sound", "true");
}

export function installMoneyVisibilitySound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  const pointerdown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;
    const button = findButton(event.target);
    if (!button) return;
    mark(button);
    playMoneyVisibilitySound();
  };

  const click = (event) => {
    const button = findButton(event.target);
    if (button) mark(button);
  };

  const keydown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    const button = findButton(event.target);
    if (!button) return;
    mark(button);
    playMoneyVisibilitySound();
  };

  document.addEventListener("pointerdown", pointerdown, true);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", keydown, true);

  return () => {
    document.removeEventListener("pointerdown", pointerdown, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", keydown, true);
    installed = false;
  };
}
