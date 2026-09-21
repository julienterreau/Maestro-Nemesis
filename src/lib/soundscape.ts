import type { SoundscapeKind } from "@/lib/audio-prompt";

const SAMPLE_RATE = 22050;
const DURATION_SEC = 18;

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function white() {
  return Math.random() * 2 - 1;
}

function fade(samples: Float32Array, sampleRate: number) {
  const edge = Math.floor(sampleRate * 0.35);
  for (let i = 0; i < edge; i++) {
    const g = i / edge;
    samples[i] *= g;
    samples[samples.length - 1 - i] *= g;
  }
}

function addDrops(samples: Float32Array, count: number, amp: number) {
  for (let d = 0; d < count; d++) {
    const start = Math.floor(Math.random() * samples.length);
    const len = 30 + Math.floor(Math.random() * 180);
    const peak = amp * (0.35 + Math.random() * 0.65);
    for (let j = 0; j < len && start + j < samples.length; j++) {
      samples[start + j] += white() * peak * Math.exp(-j / (len * 0.22));
    }
  }
}

function chirp(
  samples: Float32Array,
  sampleRate: number,
  start: number,
  duration: number,
  fromHz: number,
  toHz: number,
  amp: number,
) {
  const n = Math.floor(duration * sampleRate);
  for (let i = 0; i < n && start + i < samples.length; i++) {
    const t = i / n;
    const hz = fromHz + (toHz - fromHz) * t;
    const env = Math.sin(Math.PI * t);
    samples[start + i] += Math.sin((2 * Math.PI * hz * i) / sampleRate) * amp * env;
  }
}

function rain(samples: Float32Array, sampleRate: number) {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const w = white();
    b0 = 0.997 * b0 + w * 0.04;
    b1 = 0.985 * b1 + w * 0.06;
    b2 = 0.95 * b2 + w * 0.09;
    samples[i] += (b0 + b1 + b2) * 0.55 + w * 0.03;
  }
  addDrops(samples, Math.floor(DURATION_SEC * 48), 0.16);
}

function wind(samples: Float32Array, sampleRate: number) {
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    low = 0.993 * low + white() * 0.07;
    const lfo = 0.7 + 0.3 * Math.sin((2 * Math.PI * 0.12 * i) / sampleRate);
    samples[i] += low * lfo;
  }
}

function ocean(samples: Float32Array, sampleRate: number) {
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    low = 0.996 * low + white() * 0.08;
    const swell =
      0.55 +
      0.45 * Math.sin((2 * Math.PI * 0.08 * i) / sampleRate) +
      0.2 * Math.sin((2 * Math.PI * 0.13 * i) / sampleRate);
    samples[i] += low * swell;
  }
}

function fire(samples: Float32Array) {
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    low = 0.99 * low + white() * 0.04;
    samples[i] += low * 0.7;
  }
  addDrops(samples, Math.floor(DURATION_SEC * 22), 0.22);
}

function thunder(samples: Float32Array, sampleRate: number) {
  rain(samples, sampleRate);
  for (let n = 0; n < 4; n++) {
    const start = Math.floor((0.15 + Math.random() * 0.7) * samples.length);
    const len = Math.floor(sampleRate * (1.2 + Math.random()));
    for (let i = 0; i < len && start + i < samples.length; i++) {
      const env = Math.exp(-i / (sampleRate * 0.45));
      const hz = 38 + Math.random() * 18;
      samples[start + i] +=
        (Math.sin((2 * Math.PI * hz * i) / sampleRate) * 0.55 + white() * 0.08) * env;
    }
  }
}

function birds(samples: Float32Array, sampleRate: number, count: number) {
  for (let b = 0; b < count; b++) {
    const start = Math.floor(Math.random() * samples.length * 0.9);
    const from = 1800 + Math.random() * 2200;
    const to = from + (Math.random() * 900 - 200);
    chirp(samples, sampleRate, start, 0.12 + Math.random() * 0.18, from, to, 0.08);
  }
}

function forest(samples: Float32Array, sampleRate: number) {
  wind(samples, sampleRate);
  for (let i = 0; i < samples.length; i++) samples[i] *= 0.45;
  addDrops(samples, Math.floor(DURATION_SEC * 10), 0.05);
  birds(samples, sampleRate, 14);
}

function night(samples: Float32Array, sampleRate: number) {
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    low = 0.997 * low + white() * 0.02;
    samples[i] += low * 0.5;
  }
  for (let c = 0; c < Math.floor(DURATION_SEC * 6); c++) {
    const start = Math.floor(Math.random() * samples.length);
    chirp(
      samples,
      sampleRate,
      start,
      0.04,
      3500 + Math.random() * 1500,
      4200 + Math.random() * 800,
      0.05,
    );
  }
}

function toWav(samples: Float32Array, sampleRate: number) {
  fade(samples, sampleRate);
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE((clamp(samples[i]) * 0x7fff) | 0, 44 + i * 2);
  }
  return buffer;
}

export function synthesizeSoundscape(kind: SoundscapeKind) {
  const samples = new Float32Array(SAMPLE_RATE * DURATION_SEC);
  if (kind === "rain") rain(samples, SAMPLE_RATE);
  else if (kind === "thunder") thunder(samples, SAMPLE_RATE);
  else if (kind === "ocean") ocean(samples, SAMPLE_RATE);
  else if (kind === "fire") fire(samples);
  else if (kind === "forest") forest(samples, SAMPLE_RATE);
  else if (kind === "wind") wind(samples, SAMPLE_RATE);
  else if (kind === "night") night(samples, SAMPLE_RATE);
  else birds(samples, SAMPLE_RATE, 18);
  return toWav(samples, SAMPLE_RATE);
}
