import learningHubSoundUrl from "../../learning-hub.mp3.wav";

const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";
const LEARNING_HUB_OPEN_SELECTOR = 'button[aria-label="Open Learning Hub."]';
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
    learningHubAudio.load();
  }

  return learningHubAudio;
}

function findOpenButton(target) {
  return target?.closest?.(LEARNING_HUB_OPEN_SELECTOR) || null;
}

function markAsCustomSound(button) {
  button?.setAttribute?.("data-clara-no-sound", "true");
}

function playLearningHubOpenSound(button) {
  if (!button || !isSoundEnabled()) return;

  markAsCustomSound(button);

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
        console.warn("Learning Hub opening sound failed:", error?.message || error);
      });
    }
  } catch (error) {
    console.warn("Learning Hub opening sound failed:", error?.message || error);
  }
}

export function installLearningHubOpenSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  getLearningHubAudio();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const button = findOpenButton(event.target);
    if (!button) return;

    playLearningHubOpenSound(button);
  };

  const handleClick = (event) => {
    const button = findOpenButton(event.target);
    if (!button) return;

    markAsCustomSound(button);
  };

  const handleKeyDown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;

    const button = findOpenButton(event.target);
    if (!button) return;

    playLearningHubOpenSound(button);
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
