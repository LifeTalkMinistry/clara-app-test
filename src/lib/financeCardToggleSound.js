import learningHubSoundUrl from "../../learning-hub.mp3.wav";
import { triggerClaraHaptic } from "@/lib/claraHaptics";

const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";
const LEADING_SILENCE_SECONDS = 0.04;

let financeToggleAudio = null;

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

function getFinanceToggleAudio() {
  if (typeof window === "undefined" || typeof window.Audio !== "function") {
    return null;
  }

  if (!financeToggleAudio) {
    financeToggleAudio = new window.Audio();
    financeToggleAudio.preload = "auto";
    financeToggleAudio.src = learningHubSoundUrl;
    financeToggleAudio.muted = false;
    financeToggleAudio.volume = getSoundVolume();
    financeToggleAudio.load();
  }

  return financeToggleAudio;
}

export function playFinanceCardToggleSound() {
  triggerClaraHaptic("light");
  if (!isSoundEnabled()) return false;

  const audio = getFinanceToggleAudio();
  if (!audio) return false;

  try {
    audio.pause();
    audio.currentTime = LEADING_SILENCE_SECONDS;
    audio.muted = false;
    audio.volume = getSoundVolume();

    const playback = audio.play();
    if (playback?.catch) {
      playback.catch((error) => {
        console.warn("Financial card toggle sound failed:", error?.message || error);
      });
    }

    return true;
  } catch (error) {
    console.warn("Financial card toggle sound failed:", error?.message || error);
    return false;
  }
}
