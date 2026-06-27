import dailyMoneyTipSoundUrl from "@/assets/sounds/daily-money-tip.mp3.wav";
import { triggerClaraHaptic } from "@/lib/claraHaptics";

const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

let dailyTipAudio = null;

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

function createDailyTipAudio() {
  if (typeof window === "undefined" || typeof window.Audio !== "function") {
    return null;
  }

  const audio = new window.Audio();
  audio.preload = "auto";
  audio.src = dailyMoneyTipSoundUrl;
  audio.muted = false;
  audio.volume = getSoundVolume();
  audio.load();
  return audio;
}

export function primeUploadedDailyTipSound() {
  if (!dailyTipAudio) {
    dailyTipAudio = createDailyTipAudio();
  }

  return dailyTipAudio;
}

export function playUploadedDailyTipSound() {
  triggerClaraHaptic("selection");
  if (!isSoundEnabled()) return false;

  const audio = primeUploadedDailyTipSound();
  if (!audio) return false;

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = getSoundVolume();

    const playback = audio.play();
    if (playback?.catch) {
      playback.catch((error) => {
        console.warn("Daily Money Tip sound failed:", error?.message || error);
      });
    }

    return true;
  } catch (error) {
    console.warn("Daily Money Tip sound failed:", error?.message || error);
    return false;
  }
}
