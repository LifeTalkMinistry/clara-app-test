let audioContext = null;
let flipNoiseBuffer = null;
let resumePromise = null;
let lastPlayedAt = 0;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx({ latencyHint: "interactive" });
  }

  return audioContext;
}

function getFlipNoiseBuffer(context) {
  if (flipNoiseBuffer?.sampleRate === context.sampleRate) {
    return flipNoiseBuffer;
  }

  const duration = 0.2;
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let smoothedNoise = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / frameCount;
    const whiteNoise = Math.random() * 2 - 1;
    smoothedNoise = smoothedNoise * 0.68 + whiteNoise * 0.32;

    const envelope = Math.sin(Math.PI * progress);
    samples[index] = (whiteNoise * 0.32 + smoothedNoise * 0.68) * envelope;
  }

  flipNoiseBuffer = buffer;
  return flipNoiseBuffer;
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

  getFlipNoiseBuffer(context);

  if (resume && context.state !== "running") {
    void resumeAudioContext(context);
  }

  return context;
}

function createMasterBus(context, start) {
  const masterGain = context.createGain();
  const compressor = context.createDynamicsCompressor();

  masterGain.gain.setValueAtTime(1.45, start);

  compressor.threshold.setValueAtTime(-18, start);
  compressor.knee.setValueAtTime(8, start);
  compressor.ratio.setValueAtTime(5, start);
  compressor.attack.setValueAtTime(0.003, start);
  compressor.release.setValueAtTime(0.12, start);

  masterGain.connect(compressor);
  compressor.connect(context.destination);

  return masterGain;
}

function startFlipSound(context, direction) {
  const opening = direction !== "close";
  const start = context.currentTime + 0.002;
  const duration = opening ? 0.21 : 0.18;
  const master = createMasterBus(context, start);

  const transient = context.createOscillator();
  const transientGain = context.createGain();

  transient.type = "triangle";
  transient.frequency.setValueAtTime(opening ? 640 : 900, start);
  transient.frequency.exponentialRampToValueAtTime(opening ? 920 : 560, start + 0.055);

  transientGain.gain.setValueAtTime(0.0001, start);
  transientGain.gain.exponentialRampToValueAtTime(opening ? 0.18 : 0.15, start + 0.004);
  transientGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);

  transient.connect(transientGain);
  transientGain.connect(master);
  transient.start(start);
  transient.stop(start + 0.085);

  const source = context.createBufferSource();
  const highPass = context.createBiquadFilter();
  const lowPass = context.createBiquadFilter();
  const noiseGain = context.createGain();

  source.buffer = getFlipNoiseBuffer(context);

  highPass.type = "highpass";
  highPass.frequency.setValueAtTime(360, start);

  lowPass.type = "lowpass";
  lowPass.Q.setValueAtTime(0.75, start);
  lowPass.frequency.setValueAtTime(opening ? 1250 : 2500, start);
  lowPass.frequency.exponentialRampToValueAtTime(opening ? 3600 : 950, start + duration);

  noiseGain.gain.setValueAtTime(0.0001, start);
  noiseGain.gain.exponentialRampToValueAtTime(opening ? 0.22 : 0.18, start + 0.008);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(noiseGain);
  noiseGain.connect(master);

  source.start(start);
  source.stop(start + duration + 0.025);

  const bodyTone = context.createOscillator();
  const bodyGain = context.createGain();

  bodyTone.type = "triangle";
  bodyTone.frequency.setValueAtTime(opening ? 480 : 960, start);
  bodyTone.frequency.exponentialRampToValueAtTime(opening ? 1040 : 500, start + duration * 0.82);

  bodyGain.gain.setValueAtTime(0.0001, start);
  bodyGain.gain.exponentialRampToValueAtTime(opening ? 0.19 : 0.16, start + 0.007);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.9);

  bodyTone.connect(bodyGain);
  bodyGain.connect(master);
  bodyTone.start(start);
  bodyTone.stop(start + duration);

  if (!opening) return;

  const shimmer = context.createOscillator();
  const shimmerGain = context.createGain();

  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(1220, start + 0.04);
  shimmer.frequency.exponentialRampToValueAtTime(1660, start + 0.16);

  shimmerGain.gain.setValueAtTime(0.0001, start + 0.035);
  shimmerGain.gain.exponentialRampToValueAtTime(0.075, start + 0.065);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);

  shimmer.connect(shimmerGain);
  shimmerGain.connect(master);
  shimmer.start(start + 0.035);
  shimmer.stop(start + 0.2);
}

export function playDailyTipFlipSound({ direction = "open" } = {}) {
  const now = Date.now();
  if (now - lastPlayedAt < 120) return;
  lastPlayedAt = now;

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
