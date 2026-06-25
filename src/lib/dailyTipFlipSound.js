let audioContext = null;
let openFlipBuffer = null;
let closeFlipBuffer = null;
let resumePromise = null;
let activeSource = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx({ latencyHint: "interactive" });
  }

  return audioContext;
}

function createSeededNoise(seed) {
  let state = seed >>> 0;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 4294967295) * 2 - 1;
  };
}

function smoothStep(value) {
  const clamped = Math.max(0, Math.min(value, 1));
  return clamped * clamped * (3 - 2 * clamped);
}

function createFlipBuffer(context, direction) {
  const opening = direction !== "close";
  const duration = opening ? 0.27 : 0.23;
  const sampleRate = context.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const samples = buffer.getChannelData(0);
  const noise = createSeededNoise(opening ? 0x434c4152 : 0x54495043);

  let phaseBody = 0;
  let phaseWarmth = 0;
  let phaseAir = 0;
  let smoothedNoise = 0;
  let slowerNoise = 0;
  let peak = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    const progress = index / Math.max(1, frameCount - 1);
    const sweep = smoothStep(progress);

    const attack = smoothStep(Math.min(1, time / 0.012));
    const release = smoothStep(Math.min(1, (duration - time) / 0.055));
    const envelope = attack * release * Math.pow(1 - progress * 0.42, 0.72);

    const bodyFrequency = opening
      ? 235 + 295 * sweep
      : 510 - 275 * sweep;
    const warmthFrequency = opening
      ? 390 + 330 * sweep
      : 705 - 320 * sweep;
    const airFrequency = opening
      ? 760 + 720 * sweep
      : 1420 - 620 * sweep;

    phaseBody += (Math.PI * 2 * bodyFrequency) / sampleRate;
    phaseWarmth += (Math.PI * 2 * warmthFrequency) / sampleRate;
    phaseAir += (Math.PI * 2 * airFrequency) / sampleRate;

    const rawNoise = noise();
    smoothedNoise = smoothedNoise * 0.82 + rawNoise * 0.18;
    slowerNoise = slowerNoise * 0.94 + rawNoise * 0.06;
    const shapedNoise = smoothedNoise - slowerNoise * 0.45;

    const body = Math.sin(phaseBody) * 0.5;
    const warmth = Math.sin(phaseWarmth) * 0.25;
    const air = Math.sin(phaseAir) * 0.08;
    const whoosh = shapedNoise * (opening ? 0.34 : 0.29);

    const thumpEnvelope = Math.exp(-time * (opening ? 31 : 38));
    const thumpFrequency = opening ? 285 : 325;
    const thump = Math.sin(Math.PI * 2 * thumpFrequency * time) * thumpEnvelope * 0.26;

    const rawSample = (body + warmth + air + whoosh) * envelope + thump;
    const softenedSample = Math.tanh(rawSample * 1.35);

    samples[index] = softenedSample;
    peak = Math.max(peak, Math.abs(softenedSample));
  }

  const targetPeak = opening ? 0.88 : 0.82;
  const normalization = peak > 0 ? targetPeak / peak : 1;

  for (let index = 0; index < frameCount; index += 1) {
    samples[index] *= normalization;
  }

  return buffer;
}

function ensureFlipBuffers(context) {
  if (
    openFlipBuffer?.sampleRate === context.sampleRate &&
    closeFlipBuffer?.sampleRate === context.sampleRate
  ) {
    return;
  }

  openFlipBuffer = createFlipBuffer(context, "open");
  closeFlipBuffer = createFlipBuffer(context, "close");
}

function resumeAudioContext(context) {
  if (!context || context.state === "running") {
    return Promise.resolve(context);
  }

  if (!resumePromise) {
    resumePromise = context
      .resume()
      .then(() => context)
      .catch((error) => {
        console.warn("Daily Tip flip sound was blocked:", error?.message || error);
        return null;
      })
      .finally(() => {
        resumePromise = null;
      });
  }

  return resumePromise;
}

export function primeDailyTipFlipSound({ resume = false } = {}) {
  const context = getAudioContext();
  if (!context) return null;

  ensureFlipBuffers(context);

  if (resume && context.state !== "running") {
    void resumeAudioContext(context);
  }

  return context;
}

function startFlipSound(context, direction) {
  ensureFlipBuffers(context);

  if (activeSource) {
    try {
      activeSource.stop();
    } catch {}

    try {
      activeSource.disconnect();
    } catch {}

    activeSource = null;
  }

  const source = context.createBufferSource();
  const output = context.createGain();
  const start = context.currentTime + 0.001;

  source.buffer = direction === "close" ? closeFlipBuffer : openFlipBuffer;
  output.gain.setValueAtTime(1, start);

  source.connect(output);
  output.connect(context.destination);

  source.onended = () => {
    if (activeSource === source) {
      activeSource = null;
    }

    try {
      source.disconnect();
      output.disconnect();
    } catch {}
  };

  activeSource = source;
  source.start(start);
}

export function playDailyTipFlipSound({ direction = "open" } = {}) {
  const context = primeDailyTipFlipSound();
  if (!context) return;

  if (context.state === "running") {
    startFlipSound(context, direction);
    return;
  }

  void resumeAudioContext(context).then((resumedContext) => {
    if (resumedContext?.state === "running") {
      startFlipSound(resumedContext, direction);
    }
  });
}
