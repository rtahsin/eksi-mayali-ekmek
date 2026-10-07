"use client";

import React, { useState } from "react";
import { starterVigor } from "@/lib/game/sim";
import { FLOUR_GRAMS } from "@/lib/game/levels";
import { sfx, buzz } from "@/lib/game/audio";
import { JarArt, ClockArt, ScaleArt } from "../art";
import { Btn, C, Feedback, StageTitle, Tahsin, mono } from "../ui";
import { usePour } from "../usePour";
import { Nudge } from "../Nudge";
import { ClockControls, Upcoming, useClock } from "../useClock";
import type { StageProps } from "./types";

/** Kavanozdaki maya seviyesi: tepeye kadar kabarır, sonra yavaşça iner */
function jarLevel(h: number) {
  const band = 0.33;
  if (h <= 4.6) {
    const t = h / 4.6;
    return band + 0.47 * (t * t * (3 - 2 * t));
  }
  return band + 0.47 * Math.max(0.45, 1 - (h - 4.6) / 11);
}

export function StarterStage({ d, set, done }: StageProps) {
  const [phase, setPhase] = useState<"izle" | "dok" | "bitti">("izle");
  // 1× hızda bir saat ≈ 3 saniye: tepe penceresi (3,5–6,5 sa) ~9 saniye sürer; duraklatıp düşünülebilir
  const clock = useClock(0.35, 12);
  const h = clock.t;
  const pour = usePour(260, 1200);

  const vigor = starterVigor(h);
  const pct = (pour.grams / FLOUR_GRAMS) * 100;
  const pourTarget: [number, number] = [600, 800];

  const pick = () => {
    clock.pause();
    set("levainHours", h);
    const good = h >= 3.5 && h <= 6.5;
    sfx.ding(good);
    buzz(good ? 30 : [20, 40, 20]);
    setPhase("dok");
  };

  return (
    <div className="space-y-5">
      <StageTitle n={1} title="Maya" sub="Dünkü mayayı besledin; şimdi tepe noktasını yakala." />

      {phase === "izle" && (
        <>
          <Tahsin>
            Dünden kalan 200 gram mayanın üstüne 400 gram un, 400 gram su ekledim; lastiği de başlangıç seviyesine
            geçirdim. Şimdi uyanıyor. Kubbelenip fokurdadığı an kullanacağız; inmeye başlarsa ekşir.
          </Tahsin>
          <div className="flex items-end justify-center gap-5">
            <div className="w-36 h-56">
              <JarArt level={jarLevel(h)} dome={h < 4.8 ? Math.min(1, h / 3) : 0} fallen={h > 5.6} bubbles={vigor} band={0.33} />
            </div>
            <div className="flex flex-col items-center gap-2 pb-2">
              <ClockArt hours={h} />
              <div className="text-3xl font-bold" style={mono}>
                {h.toFixed(1)}
              </div>
              <div className="text-xs uppercase tracking-wider" style={{ color: C.soft }}>
                saat
              </div>
            </div>
          </div>
          <Upcoming active={h >= 3.5 && h <= 6.5}>
            {h < 3.5 ? "Kubbe yükseliyor… Tepe genelde 4–5. saatte." : h <= 6.5 ? "Şimdi tepe civarında: kubbeli ve fokurdayan maya." : "Maya inmeye başladı; beklersen daha ekşi olur."}
          </Upcoming>
          <ClockControls
            clock={clock}
            label="Zamanı başlat"
          />
          {clock.started && <Btn onClick={pick}>Mayayı şimdi kullan</Btn>}
        </>
      )}

      {phase === "dok" && (
        <>
          <Feedback tone={d.levainHours >= 3.5 && d.levainHours <= 6.5 ? "good" : d.levainHours < 3.5 ? "bad" : "warn"}>
            {d.levainHours >= 3.5 && d.levainHours <= 6.5
              ? `Tam zamanında: ${d.levainHours.toFixed(1)}. saat, maya dorukta.`
              : d.levainHours < 3.5
              ? `${d.levainHours.toFixed(1)}. saat: maya daha uyanmadı.`
              : `${d.levainHours.toFixed(1)}. saat: maya inmeye başlamış, ekşi olacak.`}
          </Feedback>
          <Tahsin>8 ekmek için 4 kilo un kullanacağız. Mayayı kaba dök; unun yüzde kaçı kadar koyacağına sen karar ver.</Tahsin>
          <ScaleArt grams={pour.grams} target={pourTarget} filling={pour.grams / 1200} />
          <div className="text-center text-sm" style={{ color: C.soft }}>
            Unun <strong style={{ ...mono, color: C.ink }}>%{pct.toFixed(1)}</strong>&apos;i
          </div>
          <button
            type="button"
            onPointerDown={pour.start}
            onPointerUp={pour.stop}
            onPointerLeave={() => pour.pouring && pour.stop()}
            onPointerCancel={pour.stop}
            className="w-full py-6 rounded-2xl text-lg font-bold select-none"
            style={{ background: pour.pouring ? C.ink : "#EAD3A2", color: pour.pouring ? C.paper : C.ink, border: `3px solid ${C.ink}`, touchAction: "none" }}
          >
            {pour.pouring ? "Dökülüyor…" : "Basılı tut: mayayı dök"}
          </button>
          <Nudge onNudge={pour.nudge} step={20} />
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={pour.reset} disabled={pour.grams === 0}>
              Boşalt
            </Btn>
            <Btn
              disabled={pour.grams < 50 || pour.pouring}
              onClick={() => {
                set("levainGrams", Math.round(pour.grams));
                setPhase("bitti");
                done();
              }}
            >
              Tamam
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}
