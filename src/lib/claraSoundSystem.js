const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

let installed = false;
let lastPlayedAt = 0;
let audioPool = [];
let poolIndex = 0;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
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

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function createBubbleWavDataUri() {
  const sampleRate = 44100;
  const duration = 0.18;
  const sampleCount = Math.floor(sampleRate * duration);
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + sampleCount * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, sampleCount * bytesPerSample, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const progress = i / sampleCount;
    const envelope = Math.sin(Math.PI * progress) * Math.pow(1 - progress, 0.55);
    const sweepA = 980 - progress * 470;
    const sweepB = 1320 - progress * 560;
    const sample =
      Math.sin(2 * Math.PI * sweepA * t) * 0.72 +
      Math.sin(2 * Math.PI * sweepB * t) * 0.28;
    const value = Math.max(-1, Math.min(1, sample * envelope * 0.85));
    view.setInt16(44 + i * bytesPerSample, value * 32767, true);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

function ensureAudioPool() {
  if (audioPool.length > 0 || typeof Audio === "undefined") return audioPool;

  const src = createBubbleWavDataUri();
  audioPool = Array.from({ length: 6 }, () => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = getVolume();
    return audio;
  });

  return audioPool;
}

function playHtmlBubble() {
  if (!isEnabled()) return;

  const pool = ensureAudioPool();
  if (!pool.length) return;

  const audio = pool[poolIndex % pool.length];
  poolIndex += 1;

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = getVolume();
    const result = audio.play();
    if (result?.catch) {
      result.catch((error) => {
        console.warn("CLARA sound play blocked:", error?.message || error);
      });
    }
  } catch (error) {
    console.warn("CLARA sound failed:", error);
  }

  if (navigator.vibrate) {
    try {
      navigator.vibrate(8);
    } catch {}
  }
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

  audioPool.forEach((audio) => {
    audio.volume = safeVolume;
  });
}

export function playClaraSound(soundKey = "bubble", options = {}) {
  const now = Date.now();
  const minGap = options.force ? 0 : 45;

  if (now - lastPlayedAt < minGap) return;
  lastPlayedAt = now;

  playHtmlBubble();

  if (window.__CLARA_SOUND_DEBUG__) {
    console.info("CLARA sound played:", soundKey);
  }
}

export function playClaraBubblePop() {
  playClaraSound("bubble", { force: true });
}

export function installClaraGlobalClickSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  ensureAudioPool();

  const handlePointerDown = (event) => {
    if (isSilentTarget(event.target)) return;
    playClaraSound(inferSoundKey(event.target), { force: true });
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (isSilentTarget(event.target)) return;
    playClaraSound(inferSoundKey(event.target), { force: true });
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("touchstart", handlePointerDown, true);
  document.addEventListener("mousedown", handlePointerDown, true);
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
    enableDebug: () => {
      window.__CLARA_SOUND_DEBUG__ = true;
    },
  };

  console.info("CLARA HTMLAudio sound system installed. Test with window.CLARA_SOUND.test().");

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("touchstart", handlePointerDown, true);
    document.removeEventListener("mousedown", handlePointerDown, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    installed = false;
  };
}
