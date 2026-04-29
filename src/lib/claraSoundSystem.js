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
  return 1;
}

function createTone(frequency = 660, duration = 0.22, volume = 1) {
  if (!isEnabled()) return;
  const context = getAudioContext();
  if (!context) return;

  const startSound = () => {
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, getVolume() * volume), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
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

  if (soundKey === "test") {
    createTone(440, 0.2, 1);
    window.setTimeout(() => createTone(660, 0.2, 1), 230);
    window.setTimeout(() => createTone(880, 0.25, 1), 460);
    return;
  }

  if (soundKey === "warning" || soundKey === "danger" || soundKey === "error") {
    createTone(260, 0.26, 1);
    return;
  }

  if (soundKey === "income" || soundKey === "success" || soundKey === "saved") {
    createTone(780, 0.18, 1);
    window.setTimeout(() => createTone(980, 0.16, 0.8), 120);
    return;
  }

  if (soundKey === "orb" || soundKey === "ai" || soundKey === "assistant") {
    createTone(330, 0.22, 1);
    window.setTimeout(() => createTone(880, 0.15, 0.7), 120);
    return;
  }

  if (soundKey === "expense" || soundKey === "spend") {
    createTone(360, 0.22, 1);
    return;
  }

  createTone(720, 0.16, 1);
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

  console.info("CLARA loud click sound system installed.");

  return () => {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    installed = false;
  };
}
