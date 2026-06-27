import {
  playFinancialCarouselSwipeSound,
  primeFinancialCarouselSwipeSound,
} from "@/lib/financialCarouselSwipeSound";

const TRACK_SELECTOR = ".clara-finance-carousel-track";
const HORIZONTAL_LOCK_PX = 8;
const HORIZONTAL_AXIS_RATIO = 1.05;
const CLICK_SUPPRESSION_MS = 420;
const WHEEL_SOUND_GAP_MS = 300;

let installed = false;
let lastWheelSoundAt = 0;
const pointerGestures = new Map();
const clickSuppressionTimers = new WeakMap();

function findTrack(target) {
  return target?.closest?.(TRACK_SELECTOR) || null;
}

function suppressGeneratedClick(track) {
  if (!track || typeof window === "undefined") return;

  const existingTimer = clickSuppressionTimers.get(track);
  if (existingTimer) window.clearTimeout(existingTimer);

  track.setAttribute("data-clara-no-sound", "true");
  const timer = window.setTimeout(() => {
    track.removeAttribute("data-clara-no-sound");
    clickSuppressionTimers.delete(track);
  }, CLICK_SUPPRESSION_MS);

  clickSuppressionTimers.set(track, timer);
}

export function installFinancialCarouselSwipeSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  primeFinancialCarouselSwipeSound();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const track = findTrack(event.target);
    if (!track || track.getAttribute("data-swipe-locked") === "true") return;

    pointerGestures.set(event.pointerId, {
      track,
      startX: event.clientX,
      startY: event.clientY,
      horizontal: false,
    });
  };

  const handlePointerMove = (event) => {
    const gesture = pointerGestures.get(event.pointerId);
    if (!gesture) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (
      Math.abs(deltaX) >= HORIZONTAL_LOCK_PX &&
      Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_AXIS_RATIO
    ) {
      gesture.horizontal = true;
    }
  };

  const handlePointerUp = (event) => {
    const gesture = pointerGestures.get(event.pointerId);
    pointerGestures.delete(event.pointerId);

    if (!gesture?.horizontal) return;

    suppressGeneratedClick(gesture.track);

    // Play inside the trusted pointer-up gesture. Delaying until scroll settles
    // can be blocked by desktop and mobile browser autoplay policies.
    playFinancialCarouselSwipeSound();
  };

  const handlePointerCancel = (event) => {
    pointerGestures.delete(event.pointerId);
  };

  const handleWheel = (event) => {
    const track = findTrack(event.target);
    if (!track || track.getAttribute("data-swipe-locked") === "true") return;

    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : 0;

    if (Math.abs(horizontalDelta) < 1) return;

    const now = Date.now();
    if (now - lastWheelSoundAt < WHEEL_SOUND_GAP_MS) return;

    lastWheelSoundAt = now;
    playFinancialCarouselSwipeSound();
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("wheel", handleWheel, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    document.removeEventListener("pointercancel", handlePointerCancel, true);
    document.removeEventListener("wheel", handleWheel, true);
    pointerGestures.clear();
    installed = false;
  };
}
