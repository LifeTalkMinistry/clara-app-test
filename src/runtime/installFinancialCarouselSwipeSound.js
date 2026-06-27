import {
  playFinancialCarouselSwipeSound,
  primeFinancialCarouselSwipeSound,
} from "@/lib/financialCarouselSwipeSound";

const TRACK_SELECTOR = ".clara-finance-carousel-track";
const HORIZONTAL_LOCK_PX = 8;
const HORIZONTAL_AXIS_RATIO = 1.05;
const SETTLE_DELAY_MS = 150;
const FALLBACK_SETTLE_MS = 260;
const CLICK_SUPPRESSION_MS = 420;

let installed = false;
const pointerGestures = new Map();
const pendingSwipes = new WeakMap();
const settleTimers = new WeakMap();
const clickSuppressionTimers = new WeakMap();

function findTrack(target) {
  return target?.closest?.(TRACK_SELECTOR) || null;
}

function getTrackIndex(track) {
  if (!track) return 0;
  const slideWidth = track.clientWidth || 1;
  return Math.max(0, Math.round(track.scrollLeft / slideWidth));
}

function clearSettleTimer(track) {
  const timer = settleTimers.get(track);
  if (timer && typeof window !== "undefined") {
    window.clearTimeout(timer);
  }
  settleTimers.delete(track);
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

function finishPendingSwipe(track) {
  clearSettleTimer(track);

  const pending = pendingSwipes.get(track);
  if (!pending) return;

  pendingSwipes.delete(track);
  const settledIndex = getTrackIndex(track);

  if (settledIndex !== pending.startIndex) {
    playFinancialCarouselSwipeSound();
  }
}

function scheduleSwipeSettle(track, delay = SETTLE_DELAY_MS) {
  if (!track || typeof window === "undefined") return;

  clearSettleTimer(track);
  const timer = window.setTimeout(() => {
    finishPendingSwipe(track);
  }, delay);
  settleTimers.set(track, timer);
}

function beginPendingSwipe(track, startIndex) {
  if (!track) return;

  pendingSwipes.set(track, {
    startIndex,
    startedAt: Date.now(),
  });
  scheduleSwipeSettle(track, FALLBACK_SETTLE_MS);
}

export function installFinancialCarouselSwipeSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  primeFinancialCarouselSwipeSound();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const track = findTrack(event.target);
    if (!track) return;

    pointerGestures.set(event.pointerId, {
      track,
      startX: event.clientX,
      startY: event.clientY,
      startIndex: getTrackIndex(track),
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
    beginPendingSwipe(gesture.track, gesture.startIndex);
  };

  const handlePointerCancel = (event) => {
    pointerGestures.delete(event.pointerId);
  };

  const handleWheel = (event) => {
    const track = findTrack(event.target);
    if (!track) return;

    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : 0;

    if (Math.abs(horizontalDelta) < 1) return;

    const existing = pendingSwipes.get(track);
    if (!existing) {
      beginPendingSwipe(track, getTrackIndex(track));
    } else {
      scheduleSwipeSettle(track);
    }
  };

  const handleScroll = (event) => {
    const track = event.target?.matches?.(TRACK_SELECTOR) ? event.target : null;
    if (!track || !pendingSwipes.has(track)) return;
    scheduleSwipeSettle(track);
  };

  const handleScrollEnd = (event) => {
    const track = event.target?.matches?.(TRACK_SELECTOR) ? event.target : null;
    if (!track || !pendingSwipes.has(track)) return;
    finishPendingSwipe(track);
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("wheel", handleWheel, true);
  document.addEventListener("scroll", handleScroll, true);
  document.addEventListener("scrollend", handleScrollEnd, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    document.removeEventListener("pointercancel", handlePointerCancel, true);
    document.removeEventListener("wheel", handleWheel, true);
    document.removeEventListener("scroll", handleScroll, true);
    document.removeEventListener("scrollend", handleScrollEnd, true);
    pointerGestures.clear();
    installed = false;
  };
}
