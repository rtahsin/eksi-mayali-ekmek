"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { BakeDecisions, MicroSnapshot, StarterDay } from "@/types/game";
import { MASTER_DECISIONS, simulateBake } from "@/lib/game/engine/bake";
import { newStarter, runStarterDay } from "@/lib/game/engine/starter";
import { MicroScope } from "./MicroScope";
import type { Magnification } from "./world";

/** Büyütecin önizlemesi: motorun gerçek zaman çizelgeleri üzerinde kaydırıcı ve zaman akışı */

type Source = "koy" | "pide" | "siyez" | "maya";

function starterWeek(): MicroSnapshot[] {
  let st = newStarter("tam_bugday");
  const out: MicroSnapshot[] = [];
  const days: StarterDay[] = [];
  for (let i = 0; i < 7; i++) {
    const r = runStarterDay(st, { spot: "tezgah", feed: "1:1:1" });
    st = r.next;
    days.push(r.day);
    r.day.hours.forEach((h) => out.push({ ...h, t: i * 24 + h.t }));
  }
  return out;
}

export function MicroPreview() {
  const [src, setSrc] = useState<Source>("koy");
  const [mag, setMag] = useState<Magnification>("x400");
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);

  const samples = useMemo(() => {
    if (src === "maya") return starterWeek();
    const d: BakeDecisions =
      src === "pide" ? { ...MASTER_DECISIONS, waterTempC: 30, bulkHours: 5 } : src === "siyez" ? { ...MASTER_DECISIONS, level: "siyez", waterGrams: 2800 } : MASTER_DECISIONS;
    return simulateBake(d).samples;
  }, [src]);

  useEffect(() => setI(0), [src]);
  useEffect(() => {
    if (!play) return;
    const iv = window.setInterval(() => setI((x) => (x + 1) % samples.length), 120);
    return () => window.clearInterval(iv);
  }, [play, samples.length]);

  const s = samples[Math.min(i, samples.length - 1)];
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "#F6EEDF", color: "#3B1E1A" }}>
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
          Lab Büyüteci önizleme
        </h1>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["koy", "pide", "siyez", "maya"] as Source[]).map((k) => (
            <button key={k} type="button" onClick={() => setSrc(k)} className="px-3 py-1.5 rounded-full border font-bold" style={{ background: src === k ? "#3B1E1A" : "transparent", color: src === k ? "#F6EEDF" : "#3B1E1A" }}>
              {k === "koy" ? "Köy (usta)" : k === "pide" ? "Ilık su + 5 sa" : k === "siyez" ? "Siyez" : "Maya haftası"}
            </button>
          ))}
        </div>
        <MicroScope snapshot={s} magnification={mag} caption={`${s.phase} · t = ${s.t.toFixed(1)} sa`} />
        <div className="flex gap-2 justify-center text-sm">
          {(["x100", "x400", "x1000"] as Magnification[]).map((m) => (
            <button key={m} type="button" onClick={() => setMag(m)} className="px-3 py-1 rounded-full border font-bold" style={{ background: mag === m ? "#3B1E1A" : "transparent", color: mag === m ? "#F6EEDF" : "#3B1E1A" }}>
              {m}
            </button>
          ))}
          <button type="button" onClick={() => setPlay((p) => !p)} className="px-3 py-1 rounded-full border font-bold">
            {play ? "Durdur" : "Oynat"}
          </button>
        </div>
        <input type="range" min={0} max={samples.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} className="w-full" />
        <pre className="text-[11px] leading-snug overflow-x-auto">
          {JSON.stringify({ phase: s.phase, T: s.tempC.toFixed(1), pH: s.pH.toFixed(2), pop: Object.fromEntries(Object.entries(s.pop).map(([k, v]) => [k, v.toFixed(1)])), gas: s.gas.toFixed(2), gluten: s.glutenDev.toFixed(2), damage: s.glutenDamage.toFixed(2), heat: s.heat && { core: s.heat.coreC.toFixed(0), gel: s.heat.starchGel.toFixed(2) } }, null, 1)}
        </pre>
      </div>
    </div>
  );
}
