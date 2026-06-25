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
    smoothedNoise = smoothedNoise * 0.72 + whiteNoise * 0.28;

    const envelope = Math.sin(Math.PI * progress);
    samples[index] = (whiteNoise * 0.38 + smoothedNoise * 0.62) * envelope;
  }

  flipNoiseBuffer = buffer;
  return flipNoiseBuffer;
}

function connectToOutput(context, node, gainValue) {
  const output = context.createGain();
  output.gain.setValueAtTime(gainValue, context.currentTime);
  node.connect(output);
  output.connect(context.destination);
  return output;
}

function startFlipSound(context, direction) {
  const opening = direction !== "close";
  const start = context.currentTime;
  const duration = opening ? 0.24 : 0.2;

  const source = context.createBufferSource();
  const highPass = context.createBiquadFilter();
  const lowPass = context.createBiquadFilter();
  const noiseGain = context.createGain();

  source.buffer = getFlipNoiseBuffer(context);

  highPass.type = "highpass";
  highPass.frequency.setValueAtTime(420, start);

  lowPass.type = "lowpass";
  lowPass.Q.setValueAtTime(0.7, start);
  lowPass.frequency.setValueAtTime(opening ? 1100 : 2600, start);
  lowPass.frequency.exponentialRampToValueAtTime(opening ? 3200 : 900, start + duration);

  noiseGain.gain.setValueAtTime(0.0001, start);
  noiseGain.gain.exponentialRampToValueAtTime(opening ? 0.16 : 0.12, start + 0.015);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(noiseGain);
  connectToOutput(context, noiseGain, 0.9);

  source.start(start);
  source.stop(start + duration + 0.03);

  const bodyTone = context.createOscillator();
  const bodyGain = context.createGain();

  bodyTone.type = "triangle";
  bodyTone.frequency.setValueAtTime(opening ? 520 : 980, start);
  bodyTone.frequency.exponentialRampToValueAtTime(opening ? 980 : 520, start + duration * 0.82);

  bodyGain.gain.setValueAtTime(0.0001, start);
  bodyGain.gain.exponentialRampToValueAtTime(opening ? 0.14 : 0.1, start + 0.012);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.88);

  bodyTone.connect(bodyGain);
  connectToOutput(context, bodyGain, 0.8);
  bodyTone.start(start);
  bodyTone.stop(start + duration);

  if (!opening) return;

  const shimmer = context.createOscillator();
  const shimmerGain = context.createGain();

  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(1180, start + 0.055);
  shimmer.frequency.exponentialRampToValueAtTime(1540, start + 0.18);

  shimmerGain.gain.setValueAtTime(0.0001, start + 0.05);
  shimmerGain.gain.exponentialRampToValueAtTime(0.055, start + 0.085);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

  shimmer.connect(shimmerGain);
  connectToOutput(context, shimmerGain, 0.75);
  shimmer.start(start + 0.05);
  shimmer.stop(start + 0.23);
}

export function playDailyTipFlipSound({ direction = "open" } = {}) {
  const now = Date.now();
  if (now - lastPlayedAt < 120) return;
  lastPlayedAt = now;

  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch((error) => {
      console.warn("Daily Tip flip sound was blocked:", error?.message || error);
    });
  }

  startFlipSound(context, direction);
}
