const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";

let audioContext = null;
let flipNoiseBuffer = null;
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

function isSoundEnabled() {
  try {
    return window.localStorage?.getItem(CLARA_SOUND_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function getSoundVolume() {
  try {
    const saved = Number(window.localStorage?.getItem(CLARA_SOUND_VOLUME_KEY));
    if (Number.isFinite(saved)) {
      return Math.max(0, Math.min(saved, 1));
    }
  } catch {}

  return 1;
}

function getFlipNoiseBuffer(context) {
  if (flipNoiseBuffer?.sampleRate === context.sampleRate) {
    return flipNoiseBuffer;
  }

  const duration = 0.24;
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let smoothedNoise = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / frameCount;
    const whiteNoise = Math.random() * 2 - 1;
    smoothedNoise = smoothedNoise * 0.78 + whiteNoise * 0.22;

    const envelope = Math.sin(Math.PI * progress);
    samples[index] = (whiteNoise * 0.52 + smoothedNoise * 0.48) * envelope;
  }

  flipNoiseBuffer = buffer;
  return flipNoiseBuffer;
}

function startFlipSound(context, direction) {
  const opening = direction !== "close";
  const start = context.currentTime;
  const duration = opening ? 0.22 : 0.18;
  const masterVolume = getSoundVolume();

  if (masterVolume <= 0) return;

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = getFlipNoiseBuffer(context);

  filter.type = "bandpass";
  filter.Q.setValueAtTime(0.85, start);
  filter.frequency.setValueAtTime(opening ? 820 : 2200, start);
  filter.frequency.exponentialRampToValueAtTime(opening ? 2500 : 900, start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, masterVolume * (opening ? 0.13 : 0.085)),
    start + 0.018
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  source.start(start);
  source.stop(start + duration + 0.02);

  if (!opening) return;

  const shimmer = context.createOscillator();
  const shimmerGain = context.createGain();

  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(780, start + 0.06);
  shimmer.frequency.exponentialRampToValueAtTime(1160, start + 0.17);

  shimmerGain.gain.setValueAtTime(0.0001, start + 0.055);
  shimmerGain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, masterVolume * 0.025),
    start + 0.09
  );
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);

  shimmer.connect(shimmerGain);
  shimmerGain.connect(context.destination);
  shimmer.start(start + 0.055);
  shimmer.stop(start + 0.22);
}

export function playDailyTipFlipSound({ direction = "open" } = {}) {
  if (!isSoundEnabled()) return;

  const now = Date.now();
  if (now - lastPlayedAt < 120) return;
  lastPlayedAt = now;

  const context = getAudioContext();
  if (!context) return;

  const play = () => startFlipSound(context, direction);

  if (context.state === "suspended") {
    context.resume().then(play).catch((error) => {
      console.warn("Daily Tip flip sound was blocked:", error?.message || error);
    });
    return;
  }

  play();
}
