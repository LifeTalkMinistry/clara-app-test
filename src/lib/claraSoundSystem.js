const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

let audioContext = null;
let lastPlayedAt = 0;
let installed = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  return audioContext;
}

function getEnabled() {
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

  return 0.55;
}

function resumeAudio() {
  const context = getAudioContext();
  if (!context) return null;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  return context;
}

function tone({ frequency = 700, endFrequency = 420, duration = 0.11, delay = 0, volume = 1, type = "sine" } = {}) {
  if (!getEnabled()) return;

  const context = resumeAudio();
  if (!context) return;

  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, getVolume() * volume), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playBubble() {
  tone({ frequency: 900, endFrequency: 520, duration: 0.12, volume: 0.95 });
  tone({ frequency: 1250, endFrequency: 760, duration: 0.08, delay: 0.018, volume: 0.35 });
}

function playSuccess() {
  tone({ frequency: 660, endFrequency: 990, duration: 0.11, volume: 0.8 });
  tone({ frequency: 880, endFrequency: 1320, duration: 0.15, delay: 0.06, volume: 0.55 });
}

function playExpense() {
  tone({ frequency: 580, endFrequency: 240, duration: 0.16, volume: 0.85, type: "triangle" });
}

function playIncome() {
  tone({ frequency: 460, endFrequency: 920, duration: 0.16, volume: 0.85 });
  tone({ frequency: 720, endFrequency: 1180, duration: 0.14, delay: 0.04, volume: 0.38 });
}

function playTransfer() {
  tone({ frequency: 420, endFrequency: 680, duration: 0.11, volume: 0.6 });
  tone({ frequency: 680, endFrequency: 420, duration: 0.11, delay: 0.07, volume: 0.48 });
}

function playWarning() {
  tone({ frequency: 320, endFrequency: 210, duration: 0.18, volume: 0.75, type: "triangle" });
}

function playAi() {
  tone({ frequency: 720, endFrequency: 1080, duration: 0.15, volume: 0.55 });
  tone({ frequency: 1480, endFrequency: 980, duration: 0.1, delay: 0.04, volume: 0.2 });
}

function playOrb() {
  tone({ frequency: 180, endFrequency: 420, duration: 0.2, volume: 0.75, type: "triangle" });
  tone({ frequency: 880, endFrequency: 1280, duration: 0.13, delay: 0.07, volume: 0.3 });
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

function getSoundKey(element) {
  const explicit = element?.getAttribute?.("data-clara-sound") || element?.getAttribute?.("data-sound");
  if (explicit) return normalize(explicit);

  const text = normalize([
    element?.getAttribute?.("aria-label"),
    element?.getAttribute?.("title"),
    element?.textContent,
    element?.className,
    element?.id,
  ].join(" "));

  if (/delete|remove|trash|danger|reset|revoke|decline|cancel/.test(text)) return "warning";
  if (/expense|spent|spend|payment|paid|deduct/.test(text)) return "expense";
  if (/income|add funds|salary|cash in|deposit|earned|top up|add money|funds/.test(text)) return "income";
  if (/transfer|move money|wallet to wallet/.test(text)) return "transfer";
  if (/success|complete|done|save|saved|confirm|apply|create|update|finish|activate/.test(text)) return "success";
  if (/orb|clara|ai|assistant|ask|chat|thinking/.test(text)) return "ai";
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
  const now = Date.now();
  if (now - lastPlayedAt < 55) return;
  lastPlayedAt = now;

  const key = normalize(soundKey);

  switch (key) {
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
    case "orbrelease":
    case "orb-release":
      playOrb();
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
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  const prime = () => {
    resumeAudio();
  };

  const handlePointerDown = (event) => {
    prime();

    if (isSilentTarget(event.target)) return;

    const clickable = getClickable(event.target);
    if (!clickable) return;

    const key = getSoundKey(clickable);
    if (key === "ai" || key === "orb") {
      playClaraSound("orb");
    }
  };

  const handleClick = (event) => {
    prime();

    if (isSilentTarget(event.target)) return;

    const clickable = getClickable(event.target);
    if (!clickable) return;

    playClaraSound(getSoundKey(clickable));
  };

  document.addEventListener("pointerdown", prime, { passive: true });
  document.addEventListener("touchstart", prime, { passive: true });
  document.addEventListener("pointerdown", handlePointerDown, true);
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
    orbRelease: () => playClaraSound("orbRelease"),
    setEnabled: setClaraSoundEnabled,
    setVolume: setClaraSoundVolume,
  };

  return () => {
    document.removeEventListener("pointerdown", prime);
    document.removeEventListener("touchstart", prime);
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
    installed = false;
  };
}
