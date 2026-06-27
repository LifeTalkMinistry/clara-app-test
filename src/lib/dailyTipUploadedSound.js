import dailyMoneyTipSoundUrl from "@/assets/sounds/daily-money-tip.mp3.wav";

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
    const saved = Number(window.localStorage?.getItem(CLARA_SOUND_VOLUME_KEY));
    if (Number.isFinite(saved)) return Math.max(0, Math.min(saved, 1));
  } catch {}

  return 1;
}

export function primeUploadedDailyTipSound() {
  if (typeof window === "undefined") return null;

  if (!dailyTipAudio) {
    dailyTipAudio = new window.Audio(dailyMoneyTipSoundUrl);
    dailyTipAudio.preload = "auto";
  }

  dailyTipAudio.volume = getSoundVolume();
  return dailyTipAudio;
}

export function playUploadedDailyTipSound() {
  if (!isSoundEnabled()) return false;

  const audio = primeUploadedDailyTipSound();
  if (!audio) return false;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = getSoundVolume();

  const playback = audio.play();
  if (playback?.catch) {
    playback.catch((error) => {
      console.warn("Daily Money Tip sound failed:", error?.message || error);
    });
  }

  return true;
}
