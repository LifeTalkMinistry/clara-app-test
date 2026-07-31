import {
  playUploadedDailyTipSound,
  primeUploadedDailyTipSound,
} from "@/lib/dailyTipUploadedSound";

const DAILY_TIP_CARD_SELECTOR = "[data-clara-daily-tip-card='true']";
const DAILY_TIP_GRID_SELECTOR = `${DAILY_TIP_CARD_SELECTOR} .clara-checkin-grid`;
const COMPLETED_DOT_SELECTOR = ".clara-checkin-dot--done";
const FLIPPED_CLASS_SELECTOR = ".clara-daily-tip-flipper--flipped";
const DOT_STEP_MS = 360;
const DOT_SEQUENCE_PAUSE_MS = 2200;

let installed = false;
let dotWaveObserver = null;
const dotWaveControllers = new WeakMap();
const activeDotWaveControllers = new Set();

function findInteractiveCard(target) {
  const card = target?.closest?.(DAILY_TIP_CARD_SELECTOR);
  if (!card) return null;

  const interactive = target?.closest?.("[role='button']");
  if (!interactive || !card.contains(interactive)) return null;

  return interactive;
}

function markAsCustomSound(interactive) {
  interactive?.setAttribute?.("data-clara-no-sound", "true");
}

function playForCard(interactive) {
  if (!interactive) return;

  markAsCustomSound(interactive);
  playUploadedDailyTipSound();
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

function completedDotsFor(grid) {
  return Array.from(grid?.querySelectorAll?.(COMPLETED_DOT_SELECTOR) || []);
}

function cardIsFlipped(grid) {
  return Boolean(grid?.closest?.(DAILY_TIP_CARD_SELECTOR)?.querySelector?.(FLIPPED_CLASS_SELECTOR));
}

function paintCompletedDot(dot, { active = false, reducedMotion = false } = {}) {
  if (!dot?.style) return;

  dot.style.setProperty("animation", "none", "important");
  dot.style.setProperty(
    "transition",
    reducedMotion
      ? "none"
      : "transform 170ms cubic-bezier(0.22, 1, 0.36, 1), filter 170ms ease-out, box-shadow 170ms ease-out, background 170ms ease-out",
    "important",
  );
  dot.style.setProperty("opacity", "1", "important");
  dot.style.setProperty("z-index", active ? "3" : "1", "important");

  if (active) {
    dot.style.setProperty("filter", "brightness(1.8)", "important");
    dot.style.setProperty(
      "transform",
      `translateZ(0) scale(${reducedMotion ? "1" : "1.52"})`,
      "important",
    );
    dot.style.setProperty("background", "rgba(236, 254, 255, 1)", "important");
    dot.style.setProperty("border-color", "rgba(236, 254, 255, 1)", "important");
    dot.style.setProperty(
      "box-shadow",
      "0 0 0 4px rgba(207,250,254,0.22), 0 0 16px rgba(103,232,249,1), 0 0 28px rgba(34,211,238,0.62), inset 0 1px 0 rgba(255,255,255,1)",
      "important",
    );
    return;
  }

  dot.style.setProperty("filter", "brightness(1)", "important");
  dot.style.setProperty("transform", "translateZ(0) scale(1)", "important");
  dot.style.setProperty("background", "rgba(207, 250, 254, 0.96)", "important");
  dot.style.setProperty("border-color", "rgba(207, 250, 254, 0.78)", "important");
  dot.style.setProperty(
    "box-shadow",
    "0 0 7px rgba(103,232,249,0.58), 0 0 14px rgba(34,211,238,0.24), inset 0 1px 0 rgba(255,255,255,0.88)",
    "important",
  );
}

function paintAllCompletedDots(grid, activeIndex = -1) {
  const reducedMotion = prefersReducedMotion();
  const dots = completedDotsFor(grid);

  dots.forEach((dot, index) => {
    paintCompletedDot(dot, {
      active: index === activeIndex,
      reducedMotion,
    });
  });

  return dots;
}

function startDotWaveForGrid(grid) {
  if (!grid || dotWaveControllers.has(grid)) return;

  let stopped = false;
  let timer = null;

  const schedule = (callback, delay) => {
    if (stopped) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(callback, delay);
  };

  const runSequence = () => {
    if (stopped || !grid.isConnected) return;

    if (document.hidden || cardIsFlipped(grid)) {
      paintAllCompletedDots(grid);
      schedule(runSequence, 500);
      return;
    }

    const dots = paintAllCompletedDots(grid);
    if (!dots.length) {
      schedule(runSequence, 900);
      return;
    }

    let stepIndex = 0;

    const advance = () => {
      if (stopped || !grid.isConnected) return;

      if (document.hidden || cardIsFlipped(grid)) {
        paintAllCompletedDots(grid);
        schedule(runSequence, 500);
        return;
      }

      const currentDots = completedDotsFor(grid);
      currentDots.forEach((dot, index) => {
        paintCompletedDot(dot, {
          active: index === stepIndex,
          reducedMotion: prefersReducedMotion(),
        });
      });

      if (stepIndex >= currentDots.length) {
        paintAllCompletedDots(grid);
        schedule(runSequence, DOT_SEQUENCE_PAUSE_MS);
        return;
      }

      stepIndex += 1;
      schedule(advance, DOT_STEP_MS);
    };

    schedule(advance, 160);
  };

  const controller = {
    stop() {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      timer = null;
      paintAllCompletedDots(grid);
      activeDotWaveControllers.delete(controller);
    },
  };

  dotWaveControllers.set(grid, controller);
  activeDotWaveControllers.add(controller);
  runSequence();
}

function scanForDailyTipDotGrids() {
  document.querySelectorAll(DAILY_TIP_GRID_SELECTOR).forEach((grid) => {
    startDotWaveForGrid(grid);
  });
}

function installDailyTipDotWave() {
  scanForDailyTipDotGrids();

  dotWaveObserver = new MutationObserver(() => {
    scanForDailyTipDotGrids();
  });

  dotWaveObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

export function installDailyTipFlipSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  primeUploadedDailyTipSound();
  installDailyTipDotWave();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;

    playForCard(interactive);
  };

  const handleClick = (event) => {
    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;

    markAsCustomSound(interactive);
  };

  const handleKeyDown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;

    const interactive = findInteractiveCard(event.target);
    if (!interactive) return;

    playForCard(interactive);
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);

    dotWaveObserver?.disconnect?.();
    dotWaveObserver = null;
    activeDotWaveControllers.forEach((controller) => controller.stop());
    activeDotWaveControllers.clear();
    installed = false;
  };
}
