import learningHubSoundUrl from "../../learning-hub.mp3.wav";

const ORB_SELECTOR = '[data-clara-manual-expense-orb="true"]';
const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";
const SINGLE_TAP_DELAY_MS = 280;
const DOUBLE_TAP_WINDOW_MS = 280;
const LONG_PRESS_DELAY_MS = 550;
const GUIDE_LONG_PRESS_DELAY_MS = 520;
const MOVE_CANCEL_DISTANCE_PX = 12;
const LEADING_SILENCE_SECONDS = 0.04;

let installed = false;
let orbAudio = null;
const pointerStates = new Map();
const buttonStates = new WeakMap();

function isSoundEnabled() {
  try {
    return window.localStorage?.getItem(CLARA_SOUND_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function getSoundVolume() {
  try {
    const raw = window.localStorage?.getItem(CLARA_SOUND_VOLUME_KEY);
    if (raw === null || raw === undefined || raw === "") return 1;

    const saved = Number(raw);
    if (Number.isFinite(saved)) return Math.max(0, Math.min(saved, 1));
  } catch {}

  return 1;
}

function getOrbAudio() {
  if (typeof window === "undefined" || typeof window.Audio !== "function") {
    return null;
  }

  if (!orbAudio) {
    orbAudio = new window.Audio();
    orbAudio.preload = "auto";
    orbAudio.src = learningHubSoundUrl;
    orbAudio.muted = false;
    orbAudio.volume = getSoundVolume();
    orbAudio.load();
  }

  return orbAudio;
}

function playOrbInteractionSound(button) {
  if (!button || !isSoundEnabled()) return false;

  button.setAttribute("data-clara-no-sound", "true");

  const audio = getOrbAudio();
  if (!audio) return false;

  try {
    audio.pause();
    audio.currentTime = LEADING_SILENCE_SECONDS;
    audio.muted = false;
    audio.volume = getSoundVolume();

    const playback = audio.play();
    playback?.catch?.((error) => {
      console.warn("Money Left orb sound failed:", error?.message || error);
    });

    return true;
  } catch (error) {
    console.warn("Money Left orb sound failed:", error?.message || error);
    return false;
  }
}

function findOrbButton(target) {
  return target?.closest?.(ORB_SELECTOR) || null;
}

function isButtonUnavailable(button) {
  return Boolean(
    !button ||
      button.disabled ||
      button.getAttribute("aria-disabled") === "true"
  );
}

function getGuidePhase(button) {
  return (
    button
      ?.closest?.("[data-clara-guide-orb-phase]")
      ?.getAttribute?.("data-clara-guide-orb-phase") || ""
  );
}

function getButtonState(button) {
  let state = buttonStates.get(button);

  if (!state) {
    state = {
      lastTapAt: 0,
      singleTapTimer: null,
    };
    buttonStates.set(button, state);
  }

  return state;
}

function clearSingleTapTimer(button) {
  const state = getButtonState(button);
  if (state.singleTapTimer && typeof window !== "undefined") {
    window.clearTimeout(state.singleTapTimer);
  }
  state.singleTapTimer = null;
}

function clearHoldTimer(pointerState) {
  if (pointerState?.holdTimer && typeof window !== "undefined") {
    window.clearTimeout(pointerState.holdTimer);
  }
  if (pointerState) pointerState.holdTimer = null;
}

function resetButtonTapState(button) {
  if (!button) return;
  const state = getButtonState(button);
  clearSingleTapTimer(button);
  state.lastTapAt = 0;
}

export function installMoneyLeftOrbInteractionSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  getOrbAudio();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const button = findOrbButton(event.target);
    if (isButtonUnavailable(button)) return;

    button.setAttribute("data-clara-no-sound", "true");

    const guidePhase = getGuidePhase(button);
    const holdDelay = guidePhase ? GUIDE_LONG_PRESS_DELAY_MS : LONG_PRESS_DELAY_MS;
    const pointerState = {
      button,
      startX: Number(event.clientX || 0),
      startY: Number(event.clientY || 0),
      moved: false,
      longPressTriggered: false,
      holdTimer: null,
    };

    pointerState.holdTimer = window.setTimeout(() => {
      pointerState.holdTimer = null;
      if (pointerState.moved || isButtonUnavailable(button)) return;

      const currentGuidePhase = getGuidePhase(button);
      if (
        currentGuidePhase &&
        currentGuidePhase !== "await-single" &&
        currentGuidePhase !== "await-double" &&
        currentGuidePhase !== "await-hold"
      ) {
        return;
      }

      pointerState.longPressTriggered = true;
      resetButtonTapState(button);
      playOrbInteractionSound(button);
    }, holdDelay);

    pointerStates.set(event.pointerId, pointerState);
  };

  const handlePointerMove = (event) => {
    const pointerState = pointerStates.get(event.pointerId);
    if (!pointerState) return;

    const dx = Math.abs(Number(event.clientX || 0) - pointerState.startX);
    const dy = Math.abs(Number(event.clientY || 0) - pointerState.startY);

    if (dx <= MOVE_CANCEL_DISTANCE_PX && dy <= MOVE_CANCEL_DISTANCE_PX) return;

    pointerState.moved = true;
    clearHoldTimer(pointerState);
    resetButtonTapState(pointerState.button);
  };

  const handlePointerUp = (event) => {
    const pointerState = pointerStates.get(event.pointerId);
    pointerStates.delete(event.pointerId);
    if (!pointerState) return;

    clearHoldTimer(pointerState);

    const { button } = pointerState;
    if (
      pointerState.moved ||
      pointerState.longPressTriggered ||
      isButtonUnavailable(button)
    ) {
      return;
    }

    const guidePhase = getGuidePhase(button);

    if (guidePhase === "await-hold") {
      resetButtonTapState(button);
      return;
    }

    if (guidePhase === "await-single") {
      resetButtonTapState(button);
      playOrbInteractionSound(button);
      return;
    }

    const state = getButtonState(button);
    const now = Date.now();

    if (state.lastTapAt && now - state.lastTapAt <= DOUBLE_TAP_WINDOW_MS) {
      clearSingleTapTimer(button);
      state.lastTapAt = 0;
      playOrbInteractionSound(button);
      return;
    }

    state.lastTapAt = now;
    clearSingleTapTimer(button);

    if (guidePhase === "await-double") {
      state.singleTapTimer = window.setTimeout(() => {
        state.singleTapTimer = null;
        state.lastTapAt = 0;
      }, DOUBLE_TAP_WINDOW_MS);
      return;
    }

    state.singleTapTimer = window.setTimeout(() => {
      state.singleTapTimer = null;
      state.lastTapAt = 0;

      if (!isButtonUnavailable(button)) {
        playOrbInteractionSound(button);
      }
    }, SINGLE_TAP_DELAY_MS);
  };

  const handlePointerCancel = (event) => {
    const pointerState = pointerStates.get(event.pointerId);
    pointerStates.delete(event.pointerId);
    if (!pointerState) return;

    clearHoldTimer(pointerState);
    resetButtonTapState(pointerState.button);
  };

  const handleClick = (event) => {
    const button = findOrbButton(event.target);
    if (!button) return;
    button.setAttribute("data-clara-no-sound", "true");
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("click", handleClick, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    document.removeEventListener("pointercancel", handlePointerCancel, true);
    document.removeEventListener("click", handleClick, true);

    pointerStates.forEach((pointerState) => clearHoldTimer(pointerState));
    pointerStates.clear();
    installed = false;
  };
}
