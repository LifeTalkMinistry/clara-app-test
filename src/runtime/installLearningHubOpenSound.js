import learningHubSoundUrl from "../../learning-hub.mp3.wav";
import { triggerClaraHaptic } from "@/lib/claraHaptics";

const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";
const LEARNING_HUB_TOGGLE_SELECTOR = [
  'button[data-clara-learning-hub-toggle="true"]',
  "button[data-clara-pressure-signal]",
  'button[aria-label="Open CLARA Guide Mode"]',
  'button[data-clara-guided-onboarding-button="true"]',
  "button.clara-guide-next-button",
  "button.clara-guide-carousel-next-button",
  "button.clara-guide-orb-next",
  "button.clara-guide-orb-feature-next",
  "button.clara-guide-learning-hub-next",
  'button[data-clara-guide-action="next"]',
  'button[data-clara-guide-orb-preview-next="true"]',
  'button[data-clara-guide-orb-ui-next="true"]',
  'button[data-clara-guide-learning-hub-next="true"]',
].join(", ");
const LEADING_SILENCE_SECONDS = 0.04;

let installed = false;
let learningHubAudio = null;

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

function getLearningHubAudio() {
  if (typeof window === "undefined" || typeof window.Audio !== "function") {
    return null;
  }

  if (!learningHubAudio) {
    learningHubAudio = new window.Audio();
    learningHubAudio.preload = "auto";
    learningHubAudio.src = learningHubSoundUrl;
    learningHubAudio.muted = false;
    learningHubAudio.volume = getSoundVolume();
  }

  return learningHubAudio;
}

function findToggleButton(target) {
  return target?.closest?.(LEARNING_HUB_TOGGLE_SELECTOR) || null;
}

function markAsCustomSound(button) {
  button?.setAttribute?.("data-clara-no-sound", "true");
}

export function playLearningHubToggleSound(button) {
  if (!button) return;

  markAsCustomSound(button);
  triggerClaraHaptic("light");
  if (!isSoundEnabled()) return;

  // Create and load the sound only after a real user interaction.
  // This removes audio setup and network work from dashboard startup.
  const audio = getLearningHubAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = LEADING_SILENCE_SECONDS;
    audio.muted = false;
    audio.volume = getSoundVolume();

    const playback = audio.play();
    if (playback?.catch) {
      playback.catch((error) => {
        console.warn("Learning Hub toggle sound failed:", error?.message || error);
      });
    }
  } catch (error) {
    console.warn("Learning Hub toggle sound failed:", error?.message || error);
  }
}

export function installLearningHubOpenSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const button = findToggleButton(event.target);
    if (!button) return;

    playLearningHubToggleSound(button);
  };

  const handleClick = (event) => {
    const button = findToggleButton(event.target);
    if (!button) return;

    markAsCustomSound(button);
  };

  const handleKeyDown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;

    const button = findToggleButton(event.target);
    if (!button) return;

    playLearningHubToggleSound(button);
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    installed = false;
  };
}
