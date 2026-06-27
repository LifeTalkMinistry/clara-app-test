import swipeSoundUrl from "../../Swipe Sound Effect.mp3";

const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";
const LEADING_ENCODER_SILENCE_SECONDS = 0.06;

let swipeAudio = null;

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

function getSwipeAudio() {
  if (typeof window === "undefined" || typeof window.Audio !== "function") {
    return null;
  }

  if (!swipeAudio) {
    swipeAudio = new window.Audio();
    swipeAudio.preload = "auto";
    swipeAudio.src = swipeSoundUrl;
    swipeAudio.muted = false;
    swipeAudio.volume = getSoundVolume();
    swipeAudio.load();
  }

  return swipeAudio;
}

export function primeFinancialCarouselSwipeSound() {
  return getSwipeAudio();
}

export function playFinancialCarouselSwipeSound() {
  if (!isSoundEnabled()) return false;

  const audio = getSwipeAudio();
  if (!audio) return false;

  try {
    audio.pause();
    audio.currentTime = LEADING_ENCODER_SILENCE_SECONDS;
    audio.muted = false;
    audio.volume = getSoundVolume();

    const playback = audio.play();
    playback?.catch?.((error) => {
      console.warn("Financial carousel swipe sound failed:", error?.message || error);
    });

    return true;
  } catch (error) {
    console.warn("Financial carousel swipe sound failed:", error?.message || error);
    return false;
  }
}
