/**
 * 48 kHz 16-bit PCM Mono WAV Kodlayıcı, Çözücü, ITU-R BS.1770 Yaklaşık Ses Yüksekliği
 * Ölçer (-14 LUFS / -1.5 dBTP Tavan) ve Sahne Bazlı Punch-In Birleştirici.
 *
 * Hem tarayıcıda (S24 doğrudan mikrofon kaydı & sahne birleştirme) hem de Node.js testlerinde
 * sıfır harici bağımlılıkla deterministik çalışır.
 */

export const STUDYO_SAMPLE_RATE = 48_000;
export const TARGET_LUFS = -14.0;
export const TRUE_PEAK_CEILING_DB = -1.5;

export interface WavAudioStats {
  durationSec: number;
  sampleRate: number;
  peakDbfs: number;
  approxLufs: number;
}

function clampSample(v: number): number {
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

/** Float32 [-1, 1] örnek dizisini doğrusal interpolasyonla hedef örnekleme hızına (48 kHz) çevirir. */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number = STUDYO_SAMPLE_RATE
): Float32Array {
  if (fromRate === toRate || samples.length === 0) {
    return samples;
  }
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = samples[Math.min(idx, samples.length - 1)] ?? 0;
    const s1 = samples[Math.min(idx + 1, samples.length - 1)] ?? s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

/** Yaklaşık K-ağırlıklı RMS üzerinden LUFS ve Peak dBFS ölçümü hesaplar. */
export function measureMonoSamples(
  samples: Float32Array,
  sampleRate: number = STUDYO_SAMPLE_RATE
): WavAudioStats {
  if (samples.length === 0) {
    return {
      durationSec: 0,
      sampleRate,
      peakDbfs: -96,
      approxLufs: -70,
    };
  }

  let peak = 0;
  // Basit yüksek geçiren fark filtresiyle düşük frekans uğultusunu süzerek BS.1770 konuşma enerjisine yaklaş
  let weightedSumSq = 0;
  let prev = 0;
  let activeBlocksSum = 0;
  let activeBlocksCount = 0;

  const blockLen = Math.max(1, Math.floor(sampleRate * 0.4)); // 400ms bloklar
  let blockSq = 0;
  let blockSamples = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i] ?? 0;
    const abs = Math.abs(s);
    if (abs > peak) peak = abs;

    const hp = s - 0.85 * prev;
    prev = s;
    const energy = 0.65 * s * s + 0.35 * hp * hp;
    weightedSumSq += energy;

    blockSq += energy;
    blockSamples += 1;
    if (blockSamples >= blockLen) {
      const meanSq = blockSq / blockSamples;
      const blockLufs = -0.691 + 10 * Math.log10(Math.max(meanSq, 1e-12));
      if (blockLufs > -60) {
        activeBlocksSum += meanSq;
        activeBlocksCount += 1;
      }
      blockSq = 0;
      blockSamples = 0;
    }
  }

  if (blockSamples > 0) {
    const meanSq = blockSq / blockSamples;
    const blockLufs = -0.691 + 10 * Math.log10(Math.max(meanSq, 1e-12));
    if (blockLufs > -60) {
      activeBlocksSum += meanSq;
      activeBlocksCount += 1;
    }
  }

  const gatedMeanSq =
    activeBlocksCount > 0
      ? activeBlocksSum / activeBlocksCount
      : weightedSumSq / samples.length;

  const peakDbfs =
    peak > 1e-8 ? Math.round(20 * Math.log10(peak) * 10) / 10 : -96;
  const approxLufs =
    gatedMeanSq > 1e-10
      ? Math.round((-0.691 + 10 * Math.log10(gatedMeanSq)) * 10) / 10
      : -70;

  return {
    durationSec: Math.round((samples.length / sampleRate) * 100) / 100,
    sampleRate,
    peakDbfs,
    approxLufs,
  };
}

/**
 * Ses örneklerini hedef -14 LUFS yüksekliğine yaklaştırır ve -1.5 dBTP tavanını yumuşak sınırlayıcı
 * (soft knee limiter) ile korur; böylece S24'te kısık veya yüksek okunan sahneler dengelenir.
 */
export function normalizeToBroadcastTarget(
  samples: Float32Array,
  sampleRate: number = STUDYO_SAMPLE_RATE,
  targetLufs: number = TARGET_LUFS,
  ceilingDb: number = TRUE_PEAK_CEILING_DB
): Float32Array {
  if (samples.length === 0) return samples;
  const stats = measureMonoSamples(samples, sampleRate);
  const ceilingLin = Math.pow(10, ceilingDb / 20); // -1.5 dB -> ~0.8414

  const gainDb =
    stats.approxLufs <= -65
      ? 0
      : Math.max(-14, Math.min(18, targetLufs - stats.approxLufs));
  const linearGain = Math.pow(10, gainDb / 20);

  const out = new Float32Array(samples.length);
  const knee = ceilingLin * 0.85;

  for (let i = 0; i < samples.length; i += 1) {
    const boosted = (samples[i] ?? 0) * linearGain;
    const sign = boosted < 0 ? -1 : 1;
    const abs = Math.abs(boosted);
    if (abs <= knee) {
      out[i] = boosted;
    } else {
      // Yumuşak doygunluk ile tavanı asla aşma
      const excess = (abs - knee) / (ceilingLin - knee);
      const compressed = knee + (ceilingLin - knee) * Math.tanh(excess);
      out[i] = sign * Math.min(ceilingLin, compressed);
    }
  }
  return out;
}

/** Float32 [-1, 1] mono dizisini 16-bit PCM RIFF WAV ArrayBuffer olarak kodlar. */
export function encodeMonoWav16(
  samples: Float32Array,
  sampleRate: number = STUDYO_SAMPLE_RATE
): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = clampSample(samples[i] ?? 0);
    const pcm = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    view.setInt16(offset, pcm, true);
    offset += 2;
  }

  return buffer;
}

/** 16-bit veya 32-bit PCM WAV tamponunu Float32 mono örneklerine çözer. */
export function decodeWavToMonoFloat32(buffer: ArrayBuffer): {
  samples: Float32Array;
  sampleRate: number;
} {
  const view = new DataView(buffer);
  if (buffer.byteLength < 44) {
    throw new Error("Geçersiz WAV dosyası (boyut < 44 bayt).");
  }

  const riff =
    String.fromCharCode(view.getUint8(0)) +
    String.fromCharCode(view.getUint8(1)) +
    String.fromCharCode(view.getUint8(2)) +
    String.fromCharCode(view.getUint8(3));
  const wave =
    String.fromCharCode(view.getUint8(8)) +
    String.fromCharCode(view.getUint8(9)) +
    String.fromCharCode(view.getUint8(10)) +
    String.fromCharCode(view.getUint8(11));

  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error("Desteklenmeyen WAV başlığı.");
  }

  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = STUDYO_SAMPLE_RATE;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const chunkId =
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3));
    const chunkSize = view.getUint32(offset + 4, true);
    const bodyStart = offset + 8;

    if (chunkId === "fmt " && bodyStart + 16 <= buffer.byteLength) {
      audioFormat = view.getUint16(bodyStart, true);
      numChannels = Math.max(1, view.getUint16(bodyStart + 2, true));
      sampleRate = view.getUint32(bodyStart + 4, true);
      bitsPerSample = view.getUint16(bodyStart + 14, true);
    } else if (chunkId === "data") {
      dataOffset = bodyStart;
      dataSize = Math.min(chunkSize, buffer.byteLength - bodyStart);
      break;
    }

    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataSize <= 0) {
    return { samples: new Float32Array(0), sampleRate };
  }

  const bytesPerSample = Math.max(1, bitsPerSample / 8);
  const frameSize = bytesPerSample * numChannels;
  const frameCount = Math.floor(dataSize / frameSize);
  const mono = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i += 1) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch += 1) {
      const p = dataOffset + i * frameSize + ch * bytesPerSample;
      if (audioFormat === 3 && bitsPerSample === 32) {
        sum += view.getFloat32(p, true);
      } else if (bitsPerSample === 16) {
        sum += view.getInt16(p, true) / 32768;
      } else if (bitsPerSample === 24) {
        const b0 = view.getUint8(p);
        const b1 = view.getUint8(p + 1);
        const b2 = view.getInt8(p + 2);
        const val = (b2 << 16) | (b1 << 8) | b0;
        sum += val / 8388608;
      } else {
        sum += (view.getUint8(p) - 128) / 128;
      }
    }
    mono[i] = sum / numChannels;
  }

  return { samples: mono, sampleRate };
}

/**
 * Sahne bazlı Punch-In kayıtlarını 25ms kosinüs yumuşatma (tıklama/çıtırtı önleyici) ve
 * sahneler arası doğal 180ms nefes boşluğuyla tek bir 48 kHz -14 LUFS Master WAV'da birleştirir.
 */
export function stitchSceneTakesToMasterWav(
  sceneSegments: readonly { samples: Float32Array; sampleRate: number }[],
  pauseMs: number = 180
): { wavBuffer: ArrayBuffer; stats: WavAudioStats } {
  if (sceneSegments.length === 0) {
    const empty = encodeMonoWav16(new Float32Array(0), STUDYO_SAMPLE_RATE);
    return {
      wavBuffer: empty,
      stats: { durationSec: 0, sampleRate: STUDYO_SAMPLE_RATE, peakDbfs: -96, approxLufs: -70 },
    };
  }

  const fadeSamples = Math.floor(STUDYO_SAMPLE_RATE * 0.025); // 25ms
  const pauseSamples = Math.floor((STUDYO_SAMPLE_RATE * pauseMs) / 1000);

  const normalizedSegments = sceneSegments.map((seg) => {
    const resampled = resampleLinear(seg.samples, seg.sampleRate, STUDYO_SAMPLE_RATE);
    const norm = normalizeToBroadcastTarget(resampled, STUDYO_SAMPLE_RATE);
    // Kenar fade-in / fade-out (klik önleme)
    const len = norm.length;
    const ramp = Math.min(fadeSamples, Math.floor(len / 4));
    for (let i = 0; i < ramp; i += 1) {
      const w = 0.5 * (1 - Math.cos((Math.PI * i) / ramp));
      norm[i] = (norm[i] ?? 0) * w;
      norm[len - 1 - i] = (norm[len - 1 - i] ?? 0) * w;
    }
    return norm;
  });

  const totalLength =
    normalizedSegments.reduce((acc, s) => acc + s.length, 0) +
    Math.max(0, normalizedSegments.length - 1) * pauseSamples;

  const master = new Float32Array(totalLength);
  let cursor = 0;
  for (let idx = 0; idx < normalizedSegments.length; idx += 1) {
    const seg = normalizedSegments[idx]!;
    master.set(seg, cursor);
    cursor += seg.length;
    if (idx < normalizedSegments.length - 1) {
      cursor += pauseSamples;
    }
  }

  const finalSamples = normalizeToBroadcastTarget(master, STUDYO_SAMPLE_RATE);
  const stats = measureMonoSamples(finalSamples, STUDYO_SAMPLE_RATE);
  const wavBuffer = encodeMonoWav16(finalSamples, STUDYO_SAMPLE_RATE);

  return { wavBuffer, stats };
}
