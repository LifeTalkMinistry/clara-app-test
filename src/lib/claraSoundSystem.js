const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

let audioContext = null;
let lastBubbleAt = 0;
let unlocked = false;

function canUseAudio() {
  return typeof window !== "undefined" && typeof window.AudioContext !== "undefined";
}

function getAudioContext() {
  if (!canUseAudio()) return null;

  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  return audioContext;
}

function readStoredBoolean(key, fallback = true) {
  try {
    const value = window.localStorage?.getItem(key);
    if (value === "false") return false;
    if (value === "true") return true;
    return fallback;
  } catch {
    return fallback;
  }
}

function readStoredVolume() {
  try {
    const value = Number(window.localStorage?.getItem(CLARA_SOUND_VOLUME_KEY));
    if (Number.isFinite(value)) return Math.max(0, Math.min(value, 1));
    return 0.22;
  } catch {
    return 0.22;
  }
}

function isSoundEnabled() {
  return readStoredBoolean(CLARA_SOUND_STORAGE_KEY, true);
}

function getSoundVolume() {
  return readStoredVolume();
}

function isBlockedTarget(target) {
  if (!target) return true;

  const element = target.closest?.(
    "[data-no-sound], [data-clara-no-sound], input, textarea, select, option, [contenteditable='true']"
  );

  if (element) return true;

  const disabledControl = target.closest?.("button:disabled, [aria-disabled='true'], [disabled]");
  return Boolean(disabledControl);
}

function isClickableTarget(target) {
  if (!target || isBlockedTarget(target)) return false;

  return Boolean(
    target.closest?.(
      "button, a, [role='button'], [role='menuitem'], [role='tab'], [role='switch'], [role='checkbox'], [data-sound], [data-clickable], .clickable"
    )
  );
}

function unlockAudio() {
  if (unlocked) return;

  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  unlocked = true;
}

export function setClaraSoundEnabled(enabled) {
  try {
    window.localStorage?.setItem(CLARA_SOUND_STORAGE_KEY, enabled ? "true" : "false");
  } catch {}
}

export function setClaraSoundVolume(volume) {
  const safeVolume = Math.max(0, Math.min(Number(volume) || 0, 1));
  try {
    window.localStorage?.setItem(CLARA_SOUND_VOLUME_KEY, String(safeVolume));
  } catch {}
}

export function playClaraBubblePop() {
  if (!isSoundEnabled()) return;

  const now = Date.now();
  if (now - lastBubbleAt < 75) return;
  lastBubbleAt = now;

  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const start = context.currentTime;
  const volume = getSoundVolume();

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, start);
  oscillator.frequency.exponentialRampToValueAtTime(980, start + 0.035);
  oscillator.frequency.exponentialRampToValueAtTime(430, start + 0.105);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, start);
  filter.frequency.exponentialRampToValueAtTime(720, start + 0.12);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  oscillator.start(start);
  oscillator.stop(start + 0.14);
}

export function installClaraGlobalClickSound() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const handleFirstGesture = () => {
    unlockAudio();
  };

  const handlePointerUp = (event) => {
    unlockAudio();

    if (!isClickableTarget(event.target)) return;

    playClaraBubblePop();
  };

  document.addEventListener("pointerdown", handleFirstGesture, { passive: true, once: true });
  document.addEventListener("touchstart", handleFirstGesture, { passive: true, once: true });
  document.addEventListener("click", handlePointerUp, true);

  return () => {
    document.removeEventListener("pointerdown", handleFirstGesture);
    document.removeEventListener("touchstart", handleFirstGesture);
    document.removeEventListener("click", handlePointerUp, true);
  };
}
