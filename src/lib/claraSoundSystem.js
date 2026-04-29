const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

let audioContext = null;
let installed = false;
let lastPlayedAt = 0;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  return audioContext;
}

function isEnabled() {
  try {
    return window.localStorage?.getItem(CLARA_SOUND_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function getVolume() {
  try {
    const saved = Number(window.localStorage?.getItem(CLARA_SOUND_VOLUME_KEY));
    if (Number.isFinite(saved)) return Math.max(0, Math.min(saved, 1));
  } catch {}

  return 0.85;
}

function unlockAudio() {
  const context = getAudioContext();
  if (!context) return null;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  return context;
}

function createTone({ frequency = 880, endFrequency = 520, duration = 0.16, delay = 0, volume = 1, type = "sine" } = {}) {
  if (!isEnabled()) return false;

  const context = unlockAudio();
  if (!context) return false;

  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, getVolume() * volume), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);

  return true;
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function isSilentTarget(target) {
  return Boolean(
    target?.closest?.(
      "[data-no-sound], [data-clara-no-sound], input, textarea, select, option, [contenteditable='true'], button:disabled, [disabled], [aria-disabled='true']"
    )
  );
}

function getClickable(target) {
  return target?.closest?.(
    "button, a, [role='button'], [role='menuitem'], [role='tab'], [role='switch'], [role='checkbox'], [data-sound], [data-clara-sound], [data-clickable], .clickable"
  );
}

function inferSoundKey(target) {
  const element = getClickable(target);
  if (!element) return "bubble";

  const explicit = element.getAttribute?.("data-clara-sound") || element.getAttribute?.("data-sound");
  if (explicit) return normalize(explicit);

  const text = normalize([
    element.getAttribute?.("aria-label"),
    element.getAttribute?.("title"),
    element.textContent,
    element.className,
    element.id,
  ].join(" "));

  if (/delete|remove|trash|danger|reset|revoke|decline|cancel/.test(text)) return "warning";
  if (/expense|spent|spend|payment|paid|deduct/.test(text)) return "expense";
  if (/income|add funds|salary|cash in|deposit|earned|top up|add money|funds/.test(text)) return "income";
  if (/transfer|move money|wallet to wallet/.test(text)) return "transfer";
  if (/success|complete|done|save|saved|confirm|apply|create|update|finish|activate/.test(text)) return "success";
  if (/orb|clara|ai|assistant|ask|chat|thinking/.test(text)) return "orb";
  if (/dashboard|home|settings|analytics|budget|wallet|savings|profile|admin|back|next|continue|open|view/.test(text)) return "navigation";

  return "bubble";
}

function playPattern(key = "bubble") {
  const soundKey = normalize(key) || "bubble";

  switch (soundKey) {
    case "success":
    case "saved":
      createTone({ frequency: 660, endFrequency: 990, duration: 0.12, volume: 0.78 });
      createTone({ frequency: 940, endFrequency: 1320, duration: 0.17, delay: 0.07, volume: 0.5 });
      break;

    case "expense":
    case "spend":
      createTone({ frequency: 560, endFrequency: 220, duration: 0.18, volume: 0.82, type: "triangle" });
      break;

    case "income":
    case "funds":
      createTone({ frequency: 460, endFrequency: 920, duration: 0.17, volume: 0.82 });
      createTone({ frequency: 720, endFrequency: 1180, duration: 0.15, delay: 0.045, volume: 0.36 });
      break;

    case "transfer":
      createTone({ frequency: 420, endFrequency: 680, duration: 0.12, volume: 0.62 });
      createTone({ frequency: 680, endFrequency: 420, duration: 0.12, delay: 0.075, volume: 0.5 });
      break;

    case "warning":
    case "danger":
    case "error":
      createTone({ frequency: 320, endFrequency: 210, duration: 0.2, volume: 0.78, type: "triangle" });
      break;

    case "ai":
    case "assistant":
      createTone({ frequency: 720, endFrequency: 1080, duration: 0.16, volume: 0.58 });
      createTone({ frequency: 1480, endFrequency: 980, duration: 0.11, delay: 0.045, volume: 0.24 });
      break;

    case "orb":
    case "orbrelease":
    case "orb-release":
      createTone({ frequency: 180, endFrequency: 440, duration: 0.22, volume: 0.8, type: "triangle" });
      createTone({ frequency: 900, endFrequency: 1320, duration: 0.14, delay: 0.08, volume: 0.34 });
      break;

    case "navigation":
    case "nav":
      createTone({ frequency: 540, endFrequency: 740, duration: 0.12, volume: 0.56 });
      break;

    case "test":
      createTone({ frequency: 440, endFrequency: 660, duration: 0.12, volume: 1 });
      createTone({ frequency: 660, endFrequency: 880, duration: 0.12, delay: 0.12, volume: 1 });
      createTone({ frequency: 880, endFrequency: 1320, duration: 0.14, delay: 0.24, volume: 1 });
      break;

    case "bubble":
    default:
      createTone({ frequency: 980, endFrequency: 520, duration: 0.15, volume: 1 });
      createTone({ frequency: 1320, endFrequency: 760, duration: 0.1, delay: 0.02, volume: 0.42 });
      break;
  }
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

export function playClaraSound(soundKey = "bubble", options = {}) {
  const now = Date.now();
  const minGap = options.force ? 0 : 45;

  if (now - lastPlayedAt < minGap) return;
  lastPlayedAt = now;

  playPattern(soundKey);
}

export function playClaraBubblePop() {
  playClaraSound("bubble");
}

export function installClaraGlobalClickSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  const prime = () => {
    unlockAudio();
  };

  const handlePointerDown = (event) => {
    prime();

    if (isSilentTarget(event.target)) return;

    const key = inferSoundKey(event.target);
    playClaraSound(key, { force: true });
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (isSilentTarget(event.target)) return;

    prime();
    playClaraSound(inferSoundKey(event.target), { force: true });
  };

  document.addEventListener("pointerdown", prime, { passive: true });
  document.addEventListener("touchstart", prime, { passive: true });
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("keydown", handleKeyDown, true);

  window.CLARA_SOUND = {
    play: (key) => playClaraSound(key, { force: true }),
    test: () => playClaraSound("test", { force: true }),
    bubble: () => playClaraSound("bubble", { force: true }),
    success: () => playClaraSound("success", { force: true }),
    expense: () => playClaraSound("expense", { force: true }),
    income: () => playClaraSound("income", { force: true }),
    transfer: () => playClaraSound("transfer", { force: true }),
    warning: () => playClaraSound("warning", { force: true }),
    ai: () => playClaraSound("ai", { force: true }),
    orb: () => playClaraSound("orb", { force: true }),
    orbRelease: () => playClaraSound("orbRelease", { force: true }),
    setEnabled: setClaraSoundEnabled,
    setVolume: setClaraSoundVolume,
  };

  console.info("CLARA sound system installed. Test with window.CLARA_SOUND.test().");

  return () => {
    document.removeEventListener("pointerdown", prime);
    document.removeEventListener("touchstart", prime);
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    installed = false;
  };
}
