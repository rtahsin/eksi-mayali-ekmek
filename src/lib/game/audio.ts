"use client";

/**
 * Oyun sesleri: dosya yok, Web Audio ile sentezlenir (hafif, her cihazda).
 * Tarayıcılar sesi ilk dokunuştan sonra açar; `unlock()` ilk etkileşimde çağrılır.
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let muted = false;
let noiseBuf: AudioBuffer | null = null;

function getCtx(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const W = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? W.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function noise(c: Ctx): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

function out(c: Ctx, gain = 0.5): GainNode {
  const g = c.createGain();
  g.gain.value = gain;
  g.connect(c.destination);
  return g;
}

export const sfx = {
  unlock() {
    const c = getCtx();
    if (c && c.state === "suspended") void c.resume();
  },
  setMuted(m: boolean) {
    muted = m;
  },
  isMuted() {
    return muted;
  },

  /** Hamur şapırtısı: alçak bir tok ses */
  pat(strength = 1) {
    const c = getCtx();
    if (!c || muted) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = out(c, 0);
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * strength, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.2);
    const n = c.createBufferSource();
    n.buffer = noise(c);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    const ng = out(c, 0);
    ng.gain.setValueAtTime(0.25 * strength, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(f).connect(ng);
    n.start(t);
    n.stop(t + 0.1);
  },

  /** Dökme sesi; durdurmak için dönen fonksiyonu çağır */
  pour(): () => void {
    const c = getCtx();
    if (!c || muted) return () => {};
    const n = c.createBufferSource();
    n.buffer = noise(c);
    n.loop = true;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1400;
    f.Q.value = 0.8;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain).connect(f.frequency);
    const g = out(c, 0);
    g.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.08);
    n.connect(f).connect(g);
    n.start();
    lfo.start();
    return () => {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.12);
      n.stop(t + 0.15);
      lfo.stop(t + 0.15);
    };
  },

  /** Buhar tıslaması */
  hiss(seconds = 1.6) {
    const c = getCtx();
    if (!c || muted) return;
    const t = c.currentTime;
    const n = c.createBufferSource();
    n.buffer = noise(c);
    n.loop = true;
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 3000;
    const g = out(c, 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    n.connect(f).connect(g);
    n.start(t);
    n.stop(t + seconds + 0.05);
  },

  /** Kabuğun şarkısı: rastgele minik çıtırtılar */
  crackle(seconds = 3, density = 1) {
    const c = getCtx();
    if (!c || muted) return;
    const t0 = c.currentTime;
    const count = Math.round(40 * seconds * density);
    for (let i = 0; i < count; i++) {
      const t = t0 + Math.random() * seconds;
      const n = c.createBufferSource();
      n.buffer = noise(c);
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2500 + Math.random() * 5000;
      f.Q.value = 4;
      const g = out(c, 0);
      const amp = 0.05 + Math.random() * 0.25 * (1 - (t - t0) / seconds);
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012 + Math.random() * 0.02);
      n.connect(f).connect(g);
      n.start(t, Math.random());
      n.stop(t + 0.05);
    }
  },

  /** Bıçak / jilet sürtmesi */
  slice() {
    const c = getCtx();
    if (!c || muted) return;
    const t = c.currentTime;
    const n = c.createBufferSource();
    n.buffer = noise(c);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(2000, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + 0.25);
    f.Q.value = 6;
    const g = out(c, 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    n.connect(f).connect(g);
    n.start(t);
    n.stop(t + 0.32);
  },

  /** Zil (aşama tamam / iyi hamle) */
  ding(good = true) {
    const c = getCtx();
    if (!c || muted) return;
    const t = c.currentTime;
    const freqs = good ? [880, 1320] : [330, 247];
    freqs.forEach((fq, i) => {
      const o = c.createOscillator();
      const g = out(c, 0);
      o.type = "sine";
      o.frequency.value = fq;
      const st = t + i * 0.09;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.22, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.6);
      o.connect(g);
      o.start(st);
      o.stop(st + 0.65);
    });
  },

  /** Fırın kapağı / kapı gıcırtısı */
  creak() {
    const c = getCtx();
    if (!c || muted) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, t);
    o.frequency.linearRampToValueAtTime(120, t + 0.7);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 700;
    f.Q.value = 10;
    const g = out(c, 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(f).connect(g);
    o.start(t);
    o.stop(t + 0.85);
  },
};

/** Titreşim (destekleyen telefonlarda) */
export function buzz(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {}
}
