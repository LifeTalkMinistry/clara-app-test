const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

let audioContext = null;
let installed = false;
let lastPlayedAt = 0;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
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
  return 0.9;
}

function createTone({ frequency = 900, endFrequency = 520, duration = 0.16, volume = 1, type = "sine" } = {}) {
  if (!isEnabled()) return;

  const context = getAudioContext();
  if (!context) return;

  const startSound = () => {
    const start = context.currentTime;
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
  };

  if (context.state === "suspended") {
    context.resume().then(startSound).catch((error) => {
      console.warn("CLARA sound resume blocked:", error?.message || error);
    });
    return;
  }

  startSound();
}

function isSilentTarget(target) {
  return Boolean(
    target?.closest?.(
      "[data-no-sound], [data-clara-no-sound], input, textarea, select, option, [contenteditable='true'], button:disabled, [disabled], [aria-disabled='true']"
    )
  );
}

function inferSoundKey(target) {
  const element = target?.closest?.(
    "button, a, [role='button'], [role='menuitem'], [role='tab'], [role='switch'], [role='checkbox'], [data-sound], [data-clara-sound], [data-clickable], .clickable"
  );

  const explicit = element?.getAttribute?.("data-clara-sound") || element?.getAttribute?.("data-sound");
  if (explicit) return normalize(explicit);

  const text = normalize([
    element?.getAttribute?.("aria-label"),
    element?.getAttribute?.("title"),
    element?.textContent,
    element?.className,
    element?.id,
  ].join(" "));

  if (/orb|clara|ai|assistant|ask|chat|thinking/.test(text)) return "orb";
  if (/delete|remove|trash|danger|reset|revoke|decline|cancel/.test(text)) return "warning";
  if (/expense|spent|spend|payment|paid|deduct/.test(text)) return "expense";
  if (/income|add funds|salary|cash in|deposit|earned|top up|add money|funds/.test(text)) return "income";
  if (/transfer|move money|wallet to wallet/.test(text)) return "transfer";
  if (/success|complete|done|save|saved|confirm|apply|create|update|finish|activate/.test(text)) return "success";

  return "bubble";
}

function playPattern(key = "bubble") {
  const soundKey = normalize(key) || "bubble";

  switch (soundKey) {
    case "success":
    case "saved":
      createTone({ frequency: 660, endFrequency: 990, duration: 0.12, volume: 0.8 });
      window.setTimeout(() => createTone({ frequency: 940, endFrequency: 1320, duration: 0.14, volume: 0.5 }), 70);
      break;
    case "expense":
    case "spend":
      createTone({ frequency: 560, endFrequency: 220, duration: 0.18, volume: 0.8, type: "triangle" });
      break;
    case "income":
    case "funds":
      createTone({ frequency: 460, endFrequency: 920, duration: 0.17, volume: 0.82 });
      break;
    case "warning":
    case "danger":
    case "error":
      createTone({ frequency: 320, endFrequency: 210, duration: 0.2, volume: 0.78, type: "triangle" });
      break;
    case "orb":
    case "ai":
    case "assistant":
      createTone({ frequency: 180, endFrequency: 440, duration: 0.22, volume: 0.8, type: "triangle" });
      break;
    case "test":
      createTone({ frequency: 440, endFrequency: 660, duration: 0.13, volume: 1 });
      window.setTimeout(() => createTone({ frequency: 660, endFrequency: 880, duration: 0.13, volume: 1 }), 140);
      window.setTimeout(() => createTone({ frequency: 880, endFrequency: 1320, duration: 0.15, volume: 1 }), 280);
      break;
    case "transfer":
    case "navigation":
    case "nav":
    case "bubble":
    default:
      createTone({ frequency: 980, endFrequency: 520, duration: 0.15, volume: 1 });
      window.setTimeout(() => createTone({ frequency: 1320, endFrequency: 760, duration: 0.09, volume: 0.4 }), 25);
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
  playClaraSound("bubble", { force: true });
}

export function installClaraGlobalClickSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  const handleClick = (event) => {
    if (isSilentTarget(event.target)) return;
    playClaraSound(inferSoundKey(event.target), { force: true });
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (isSilentTarget(event.target)) return;
    playClaraSound(inferSoundKey(event.target), { force: true });
  };

  document.addEventListener("click", handleClick, true);
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
    orbRelease: () => playClaraSound("orb", { force: true }),
    setEnabled: setClaraSoundEnabled,
    setVolume: setClaraSoundVolume,
  };

  console.info("CLARA click sound system installed. Test by clicking inside the app.");

  return () => {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    installed = false;
  };
}
