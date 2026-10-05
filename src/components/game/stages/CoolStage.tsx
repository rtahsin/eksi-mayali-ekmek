"use client";

import React, { useEffect, useState } from "react";
import { simulateBread } from "@/lib/game/sim";
import { sfx } from "@/lib/game/audio";
import { LoafSvg } from "../BreadSvg";
import { Btn, C, StageTitle, Tahsin } from "../ui";
import type { StageProps } from "./types";

const WAITS = [
  { h: 0, t: "Hemen!" },
  { h: 1, t: "1 saat" },
  { h: 3, t: "3 saat" },
  { h: 24, t: "1 gün" },
  { h: 48, t: "2 gün" },
];

/** Soğuma: kabuğun şarkısını dinle; ne zaman keseceğine karar ver */
export function CoolStage({ d, set, done }: StageProps) {
  const r = simulateBread(d);
  const [crackle, setCrackle] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const sings = r.crust >= 0.45;

  useEffect(() => {
    if (sings) sfx.crackle(3.5, 0.6 + r.crust * 0.6);
    const iv = window.setInterval(() => setCrackle((c) => Math.min(1, c + 0.02)), 70);
    return () => window.clearInterval(iv);
  }, [sings, r.crust]);

  return (
    <div className="space-y-5">
      <StageTitle n={8} title="Sabır" sub="Fırından çıktı; iş bitmedi." />
      <div className="relative rounded-3xl p-4 border" style={{ borderColor: C.line, background: C.card }}>
        <LoafSvg look={r} crackles={sings ? crackle * r.crust : 0} className="w-full" />
        <svg viewBox="0 0 360 30" className="w-full -mt-3">
          {Array.from({ length: 13 }, (_, i) => (
            <line key={i} x1={20 + i * 25} y1="4" x2={20 + i * 25} y2="26" stroke="#7A6455" strokeWidth="2" />
          ))}
          <line x1="10" y1="8" x2="350" y2="8" stroke="#7A6455" strokeWidth="3" />
          <line x1="10" y1="22" x2="350" y2="22" stroke="#7A6455" strokeWidth="3" />
        </svg>
        {sings && crackle < 1 && (
          <div className="absolute top-3 right-4 text-xs font-bold animate-pulse" style={{ color: C.accent }}>
            ♪ çıtır çıtır…
          </div>
        )}
      </div>
      <Tahsin>
        {sings
          ? "Dinle… Ekmek şarkı söylüyor. Kabuk soğurken içten hızlı büzülüyor; bu çıtırtı iyi pişmiş kabuğun işareti. Kokusu bütün atölyeyi sardı. Ne zaman kesiyorsun?"
          : "Kabuk yumuşak kaldı, şarkı söylemiyor. Kokusu yine de güzel. Ne zaman kesiyorsun?"}
      </Tahsin>
      <div className="grid grid-cols-3 gap-2">
        {WAITS.map((w) => (
          <button
            key={w.h}
            type="button"
            onClick={() => setPick(w.h)}
            className="py-3 rounded-xl text-sm font-bold border-2"
            style={pick === w.h ? { background: C.ink, color: C.paper, borderColor: C.ink } : { borderColor: C.line, background: C.card }}
          >
            {w.t}
          </button>
        ))}
      </div>
      <Btn
        disabled={pick === null}
        onClick={() => {
          set("cutWaitHours", pick ?? 0);
          done();
        }}
      >
        Kes ve bak
      </Btn>
    </div>
  );
}
