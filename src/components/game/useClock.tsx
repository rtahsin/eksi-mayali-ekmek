"use client";

import React, { useEffect, useRef, useState } from "react";
import { C } from "./ui";

/**
 * Oyun saati: zamanlı aşamaların ortak saati.
 * İnsan tepki süresi için kurallar:
 * - Süre asla bir kurulum tıklamasıyla aynı anda başlamaz; oyuncu ne izleyeceğini okuyup kendisi "Başlat" der.
 * - Her an duraklatılabilir; duraklatınca karar düğmeleri çalışmaya devam eder.
 * - Kritik pencereler varsayılan hızda birkaç saniye sürer; sıkıcı kısımlar için hızlandırma vardır.
 */
export type ClockSpeed = 0.5 | 1 | 3;

export interface Clock {
  t: number;
  running: boolean;
  started: boolean;
  speed: ClockSpeed;
  start: () => void;
  pause: () => void;
  resume: () => void;
  setSpeed: (s: ClockSpeed) => void;
  reset: (t?: number) => void;
  /** Süreyi elle ayarla (ör. sona ulaşınca) */
  set: (t: number) => void;
}

/**
 * @param perSecond oyun birimi / gerçek saniye (1× hızda)
 * @param max saatin duracağı üst sınır
 */
export function useClock(perSecond: number, max: number): Clock {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState<ClockSpeed>(1);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const iv = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      setT((x) => Math.min(max, x + dt * perSecond * speedRef.current));
    }, 50);
    return () => window.clearInterval(iv);
  }, [running, perSecond, max]);

  useEffect(() => {
    if (t >= max) setRunning(false);
  }, [t, max]);

  return {
    t,
    running,
    started,
    speed,
    start: () => {
      setStarted(true);
      setRunning(true);
    },
    pause: () => setRunning(false),
    resume: () => setRunning(true),
    setSpeed,
    reset: (x = 0) => {
      setT(x);
      setRunning(false);
      setStarted(false);
    },
    set: setT,
  };
}

/** Duraklat / devam + hız düğmeleri (başparmak dostu) */
export function ClockControls({ clock, label = "Zamanı başlat" }: { clock: Clock; label?: string }) {
  if (!clock.started)
    return (
      <button
        type="button"
        onClick={clock.start}
        className="w-full min-h-[56px] rounded-2xl text-lg font-bold"
        style={{ background: C.accent, color: "#FBF6EC" }}
      >
        ▶ {label}
      </button>
    );
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={clock.running ? clock.pause : clock.resume}
        className="flex-1 min-h-[48px] rounded-2xl border-2 font-bold"
        style={{ borderColor: C.ink, background: clock.running ? C.card : C.ink, color: clock.running ? C.ink : C.paper }}
        aria-label={clock.running ? "Duraklat" : "Devam et"}
      >
        {clock.running ? "❚❚ Duraklat" : "▶ Devam"}
      </button>
      {([0.5, 1, 3] as ClockSpeed[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => clock.setSpeed(s)}
          className="min-h-[48px] min-w-[52px] rounded-2xl border-2 text-sm font-bold"
          style={{ borderColor: clock.speed === s ? C.ink : C.line, background: clock.speed === s ? C.ink : "transparent", color: clock.speed === s ? C.paper : C.ink }}
          aria-label={`Hız ${s}×`}
        >
          {s === 0.5 ? "½×" : `${s}×`}
        </button>
      ))}
    </div>
  );
}

/** Önümüzdeki önemli anı önceden söyleyen küçük şerit */
export function Upcoming({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
      style={{ background: active ? "#F3E0C8" : "transparent", border: `1px dashed ${active ? C.accent : C.line}`, color: active ? C.accent : C.soft }}
      role="status"
    >
      {children}
    </div>
  );
}
