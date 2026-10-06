"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/game/audio";

/**
 * Basılı tutarak dökme: akış hızı (g/sn) ve bırakınca süren küçük atalet (gerçek dökme gibi taşabilir).
 */
export function usePour(ratePerSec: number, maxGrams: number) {
  const [grams, setGrams] = useState(0);
  const [pouring, setPouring] = useState(false);
  const raf = useRef(0);
  const last = useRef(0);
  const flow = useRef(0);
  const stopSound = useRef<() => void>(() => {});

  const loop = useCallback(
    (now: number) => {
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      setGrams((g) => Math.min(maxGrams, g + flow.current * dt));
      raf.current = requestAnimationFrame(loop);
    },
    [maxGrams]
  );

  useEffect(() => {
    last.current = performance.now();
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [loop]);

  // Bırakınca akış hızla söner (atalet)
  useEffect(() => {
    if (pouring) return;
    const t = window.setInterval(() => {
      flow.current *= 0.55;
      if (flow.current < 5) flow.current = 0;
    }, 50);
    return () => window.clearInterval(t);
  }, [pouring]);

  const start = useCallback(() => {
    sfx.unlock();
    flow.current = ratePerSec;
    setPouring(true);
    stopSound.current = sfx.pour();
  }, [ratePerSec]);

  const stop = useCallback(() => {
    setPouring(false);
    stopSound.current();
  }, []);

  const reset = useCallback(() => {
    flow.current = 0;
    setGrams(0);
  }, []);

  /** İnce ayar: tek dokunuşla biraz ekle ya da geri al (refleks gerektirmeden hedefe varmak için) */
  const nudge = useCallback(
    (delta: number) => {
      sfx.unlock();
      setGrams((g) => Math.max(0, Math.min(maxGrams, g + delta)));
    },
    [maxGrams]
  );

  return { grams, pouring, start, stop, reset, nudge, flowing: pouring || flow.current > 0 };
}
