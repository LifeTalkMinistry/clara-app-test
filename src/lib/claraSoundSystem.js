const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

const SOUND_THROTTLE_MS = {
  bubble: 65,
  tap: 65,
  success: 120,
  expense: 140,
  income: 140,
  transfer: 140,
  warning: 180,
  ai: 120,
  orb: 120,
  navigation: 90,
};

let audioContext = null;
let unlocked = false;
const lastPlayedAt = new Map();

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

function getSoundVolume(multiplier = 1) {
  return Math.max(0.0001, Math.min(readStoredVolume() * multiplier, 1));
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

function shouldThrottle(soundKey) {
  const now = Date.now();
  const last = lastPlayedAt.get(soundKey) || 0;
  const delay = SOUND_THROTTLE_MS[soundKey] || 90;

  if (now - last < delay) return true;

  lastPlayedAt.set(soundKey, now);
  return false;
}

function createTone({ frequency, endFrequency, duration, volume = 1, type = "sine", delay = 0, filterFrom = 1800, filterTo = 800 }) {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const start = context.currentTime + delay;
  const safeDuration = Math.max(0.04, duration);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);

  if (endFrequency && endFrequency > 0) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + safeDuration * 0.85);
  }

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.max(40, filterFrom), start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), start + safeDuration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(getSoundVolume(volume), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + safeDuration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  oscillator.start(start);
  oscillator.stop(start + safeDuration + 0.02);
}

function playBubble() {
  createTone({ frequency: 620, endFrequency: 430, duration: 0.13, volume: 1, filterFrom: 1600, filterTo: 720 });
  createTone({ frequency: 980, endFrequency: 760, duration: 0.08, volume: 0.25, delay: 0.018, filterFrom: 2200, filterTo: 1000 });
}

function playSuccess() {
  createTone({ frequency: 660, endFrequency: 880, duration: 0.11, volume: 0.85, filterFrom: 2400, filterTo: 1600 });
  createTone({ frequency: 990, endFrequency: 1320, duration: 0.16, volume: 0.55, delay: 0.055, filterFrom: 3200, filterTo: 2100 });
}

function playExpense() {
  createTone({ frequency: 560, endFrequency: 260, duration: 0.16, volume: 0.85, filterFrom: 1400, filterTo: 520 });
  createTone({ frequency: 330, endFrequency: 220, duration: 0.11, volume: 0.28, delay: 0.035, filterFrom: 900, filterTo: 420 });
}

function playIncome() {
  createTone({ frequency: 520, endFrequency: 880, duration: 0.16, volume: 0.8, filterFrom: 2200, filterTo: 1500 });
  createTone({ frequency: 780, endFrequency: 1240, duration: 0.16, volume: 0.4, delay: 0.045, filterFrom: 3000, filterTo: 1900 });
}

function playTransfer() {
  createTone({ frequency: 430, endFrequency: 620, duration: 0.12, volume: 0.6, filterFrom: 1500, filterTo: 900 });
  createTone({ frequency: 620, endFrequency: 430, duration: 0.12, volume: 0.5, delay: 0.07, filterFrom: 1500, filterTo: 760 });
}

function playWarning() {
  createTone({ frequency: 320, endFrequency: 240, duration: 0.18, volume: 0.75, type: "triangle", filterFrom: 1000, filterTo: 420 });
}

function playAi() {
  createTone({ frequency: 720, endFrequency: 1040, duration: 0.15, volume: 0.42, filterFrom: 2600, filterTo: 1800 });
  createTone({ frequency: 1440, endFrequency: 1080, duration: 0.12, volume: 0.18, delay: 0.035, filterFrom: 3600, filterTo: 2200 });
}

function playOrb() {
  createTone({ frequency: 180, endFrequency: 360, duration: 0.2, volume: 0.55, type: "triangle", filterFrom: 900, filterTo: 600 });
  createTone({ frequency: 820, endFrequency: 1180, duration: 0.12, volume: 0.24, delay: 0.075, filterFrom: 2600, filterTo: 1700 });
}

function playNavigation() {
  createTone({ frequency: 540, endFrequency: 700, duration: 0.11, volume: 0.45, filterFrom: 1500, filterTo: 900 });
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getClickableTarget(target) {
  return target?.closest?.(
    "button, a, [role='button'], [role='menuitem'], [role='tab'], [role='switch'], [role='checkbox'], [data-sound], [data-clara-sound], [data-clickable], .clickable"
  );
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

function inferSoundFromElement(element) {
  if (!element) return null;

  const explicitSound = element.getAttribute("data-clara-sound") || element.getAttribute("data-sound");
  if (explicitSound) return explicitSound;

  const text = normalizeText([
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.textContent,
    element.className,
    element.id,
  ].join(" "));

  if (/delete|remove|trash|danger|reset|revoke|decline|cancel|close/.test(text)) return "warning";
  if (/expense|spent|spend|log expense|add expense|save expense|payment|paid|deduct/.test(text)) return "expense";
  if (/income|add funds|salary|cash in|deposit|earned|top up|add money|funds/.test(text)) return "income";
  if (/transfer|move money|wallet to wallet|send to wallet/.test(text)) return "transfer";
  if (/success|complete|completed|done|save|saved|confirm|apply|create|update|finish|activate/.test(text)) return "success";
  if (/clara|ai|assistant|ask|orb|chat|thinking/.test(text)) return "ai";
  if (/dashboard|home|settings|analytics|budget|wallet|savings|profile|admin|back|next|continue|open|view/.test(text)) return "navigation";

  return "bubble";
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

export function playClaraSound(soundKey = "bubble") {
  if (!isSoundEnabled()) return;

  const key = normalizeText(soundKey) || "bubble";
  if (shouldThrottle(key)) return;

  switch (key) {
    case "tap":
    case "click":
    case "bubble":
      playBubble();
      break;
    case "success":
    case "saved":
      playSuccess();
      break;
    case "expense":
    case "spend":
      playExpense();
      break;
    case "income":
    case "funds":
      playIncome();
      break;
    case "transfer":
      playTransfer();
      break;
    case "warning":
    case "danger":
    case "error":
      playWarning();
      break;
    case "ai":
    case "assistant":
      playAi();
      break;
    case "orb":
      playOrb();
      break;
    case "navigation":
    case "nav":
      playNavigation();
      break;
    default:
      playBubble();
      break;
  }
}

export function playClaraBubblePop() {
  playClaraSound("bubble");
}

export function installClaraGlobalClickSound() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const handleFirstGesture = () => {
    unlockAudio();
  };

  const handleClick = (event) => {
    unlockAudio();

    if (isBlockedTarget(event.target)) return;

    const clickable = getClickableTarget(event.target);
    if (!clickable) return;

    const soundKey = inferSoundFromElement(clickable);
    playClaraSound(soundKey);
  };

  document.addEventListener("pointerdown", handleFirstGesture, { passive: true, once: true });
  document.addEventListener("touchstart", handleFirstGesture, { passive: true, once: true });
  document.addEventListener("click", handleClick, true);

  window.CLARA_SOUND = {
    play: playClaraSound,
    bubble: () => playClaraSound("bubble"),
    success: () => playClaraSound("success"),
    expense: () => playClaraSound("expense"),
    income: () => playClaraSound("income"),
    transfer: () => playClaraSound("transfer"),
    warning: () => playClaraSound("warning"),
    ai: () => playClaraSound("ai"),
    orb: () => playClaraSound("orb"),
    setEnabled: setClaraSoundEnabled,
    setVolume: setClaraSoundVolume,
  };

  return () => {
    document.removeEventListener("pointerdown", handleFirstGesture);
    document.removeEventListener("touchstart", handleFirstGesture);
    document.removeEventListener("click", handleClick, true);
  };
}
