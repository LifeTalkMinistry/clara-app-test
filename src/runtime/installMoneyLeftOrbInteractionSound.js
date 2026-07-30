import learningHubSoundUrl from "../../learning-hub.mp3.wav";
import { triggerClaraHaptic } from "@/lib/claraHaptics";

const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";
const LEADING_SILENCE_SECONDS = 0.04;
let orbAudio = null;

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
  if (typeof window === "undefined" || typeof window.Audio !== "function") return null;

  if (!orbAudio) {
    orbAudio = new window.Audio();
    orbAudio.preload = "none";
    orbAudio.src = learningHubSoundUrl;
  }

  return orbAudio;
}

export function playMoneyLeftOrbInteractionSound(button, hapticType = "light") {
  button?.setAttribute?.("data-clara-no-sound", "true");
  triggerClaraHaptic(hapticType);
  if (!isSoundEnabled()) return false;

  const audio = getOrbAudio();
  if (!audio) return false;

  try {
    audio.pause();
    audio.currentTime = LEADING_SILENCE_SECONDS;
    audio.muted = false;
    audio.volume = getSoundVolume();
    audio.play()?.catch?.((error) => {
      console.warn("Money Left orb sound failed:", error?.message || error);
    });
    return true;
  } catch (error) {
    console.warn("Money Left orb sound failed:", error?.message || error);
    return false;
  }
}

// Kept as a compatibility no-op for older imports. Gesture ownership now lives
// inside DashboardMoneySummaryStable instead of global document listeners.
export function installMoneyLeftOrbInteractionSound() {
  return () => {};
}
