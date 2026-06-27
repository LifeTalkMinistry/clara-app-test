import {
  playFinancialCarouselSwipeSound,
  primeFinancialCarouselSwipeSound,
} from "@/lib/financialCarouselSwipeSound";

const TRACK_SELECTOR = ".clara-finance-carousel-track";
const HORIZONTAL_LOCK_PX = 4;
const HORIZONTAL_AXIS_RATIO = 1.02;
const SWIPE_IDLE_MS = 180;
const CLICK_SUPPRESSION_MS = 420;

let installed = false;
const pointerGestures = new Map();
const trackStates = new WeakMap();
const idleTimers = new WeakMap();
const clickSuppressionTimers = new WeakMap();

function findTrack(target) {
  return target?.closest?.(TRACK_SELECTOR) || null;
}

function getTrackIndex(track) {
  if (!track) return 0;
  const slideWidth = track.clientWidth || 1;
  return Math.max(0, Math.round(track.scrollLeft / slideWidth));
}

function getTrackState(track) {
  let state = trackStates.get(track);

  if (!state) {
    state = {
      lastIndex: getTrackIndex(track),
      pointerActive: false,
      horizontalGesture: false,
      wheelActive: false,
    };
    trackStates.set(track, state);
  }

  return state;
}

function clearIdleTimer(track) {
  const timer = idleTimers.get(track);
  if (timer && typeof window !== "undefined") {
    window.clearTimeout(timer);
  }
  idleTimers.delete(track);
}

function scheduleSwipeIdle(track) {
  if (!track || typeof window === "undefined") return;

  clearIdleTimer(track);
  const timer = window.setTimeout(() => {
    const state = getTrackState(track);

    if (state.pointerActive) return;

    state.horizontalGesture = false;
    state.wheelActive = false;
    state.lastIndex = getTrackIndex(track);
    idleTimers.delete(track);
  }, SWIPE_IDLE_MS);

  idleTimers.set(track, timer);
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

function playWhenCardBoundaryChanges(track) {
  const state = getTrackState(track);

  if (!state.horizontalGesture && !state.wheelActive) return;

  const currentIndex = getTrackIndex(track);
  if (currentIndex === state.lastIndex) return;

  state.lastIndex = currentIndex;

  // The player pauses and seeks to the beginning before every play call,
  // so a fast second swipe immediately restarts the same sound.
  playFinancialCarouselSwipeSound();
}

export function installFinancialCarouselSwipeSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  primeFinancialCarouselSwipeSound();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const track = findTrack(event.target);
    if (!track || track.getAttribute("data-swipe-locked") === "true") return;

    clearIdleTimer(track);

    const state = getTrackState(track);
    state.lastIndex = getTrackIndex(track);
    state.pointerActive = true;
    state.horizontalGesture = false;
    state.wheelActive = false;

    pointerGestures.set(event.pointerId, {
      track,
      startX: event.clientX,
      startY: event.clientY,
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
      const state = getTrackState(gesture.track);
      state.horizontalGesture = true;
      suppressGeneratedClick(gesture.track);
    }
  };

  const finishPointerGesture = (event) => {
    const gesture = pointerGestures.get(event.pointerId);
    pointerGestures.delete(event.pointerId);

    if (!gesture) return;

    const state = getTrackState(gesture.track);
    state.pointerActive = false;

    // Keep the gesture armed while native momentum scrolling continues.
    scheduleSwipeIdle(gesture.track);
  };

  const handleWheel = (event) => {
    const track = findTrack(event.target);
    if (!track || track.getAttribute("data-swipe-locked") === "true") return;

    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : 0;

    if (Math.abs(horizontalDelta) < 1) return;

    const state = getTrackState(track);

    if (!state.wheelActive) {
      state.lastIndex = getTrackIndex(track);
    }

    state.wheelActive = true;
    scheduleSwipeIdle(track);
  };

  const handleScroll = (event) => {
    const track = event.target?.matches?.(TRACK_SELECTOR) ? event.target : null;
    if (!track) return;

    playWhenCardBoundaryChanges(track);

    const state = getTrackState(track);
    if (!state.pointerActive && (state.horizontalGesture || state.wheelActive)) {
      scheduleSwipeIdle(track);
    }
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerup", finishPointerGesture, true);
  document.addEventListener("pointercancel", finishPointerGesture, true);
  document.addEventListener("wheel", handleWheel, true);
  document.addEventListener("scroll", handleScroll, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("pointerup", finishPointerGesture, true);
    document.removeEventListener("pointercancel", finishPointerGesture, true);
    document.removeEventListener("wheel", handleWheel, true);
    document.removeEventListener("scroll", handleScroll, true);
    pointerGestures.clear();
    installed = false;
  };
}
