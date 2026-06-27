import soundUrl from "../../back-sound.mp3.wav";
import { triggerClaraHaptic } from "@/lib/claraHaptics";

let audio = null;

function volume() {
  try {
    const raw = window.localStorage?.getItem("clara:sound-volume");
    if (raw === null || raw === undefined || raw === "") return 1;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(value, 1)) : 1;
  } catch {
    return 1;
  }
}

function enabled() {
  try {
    return window.localStorage?.getItem("clara:sound-enabled") !== "false";
  } catch {
    return true;
  }
}

export function playMoneyVisibilitySound() {
  triggerClaraHaptic("light");
  if (typeof window === "undefined" || !enabled() || typeof window.Audio !== "function") {
    return false;
  }

  if (!audio) {
    audio = new window.Audio(soundUrl);
    audio.preload = "auto";
  }

  try {
    audio.pause();
    audio.currentTime = 0.04;
    audio.muted = false;
    audio.volume = volume();
    audio.play()?.catch?.((error) => console.warn("Money visibility sound failed:", error));
    return true;
  } catch (error) {
    console.warn("Money visibility sound failed:", error);
    return false;
  }
}
