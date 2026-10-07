"use client";

import React, { useEffect, useState } from "react";
import { doughTemperature } from "@/lib/game/sim";
import { FLOUR_GRAMS, FLOUR_TEMP_C, LEVAIN_TEMP_C, ROOM_TEMP_C } from "@/lib/game/levels";
import { sfx } from "@/lib/game/audio";
import { ScaleArt, ThermometerArt } from "../art";
import { DoughBlob } from "../DoughBlob";
import { Btn, C, Feedback, Readout, StageTitle, Tahsin, mono } from "../ui";
import { usePour } from "../usePour";
import { Nudge } from "../Nudge";
import type { StageProps } from "./types";

/** Hamur: istenen hamur sıcaklığı hesabı (DDT), suyu dök, tuzun zamanı, otoliz */
export function MixStage({ d, set, level, done }: StageProps) {
  const [phase, setPhase] = useState<"isi" | "su" | "tuz" | "tuzTart" | "otoliz">("isi");
  const [waterT, setWaterT] = useState(20);
  // 400 g/sn: hedef aralık (~160 g) yaklaşık 0,4 sn; kaçarsa ince ayar düğmeleri var
  const water = usePour(400, 4000);
  const salt = usePour(40, 200);
  const [autolyse, setAutolyse] = useState(0);

  const predicted = doughTemperature(waterT, 0.9);
  const hyd = (water.grams / FLOUR_GRAMS) * 100;
  const waterTarget: [number, number] = [level.idealHydration[0] * 40, level.idealHydration[1] * 40];

  useEffect(() => {
    if (phase !== "otoliz") return;
    const t = window.setInterval(() => setAutolyse((x) => Math.min(1, x + 0.02)), 50);
    return () => window.clearInterval(t);
  }, [phase]);

  return (
    <div className="space-y-5">
      <StageTitle n={2} title="Un, su, tuz" sub="Hamurun sıcaklığı tesadüf değil, hesaptır." />

      {phase === "isi" && (
        <>
          <Tahsin>
            Hamur yoğrulunca 27–28 derece olmalı. Odayı, unu, mayayı değiştiremezsin; yoğuran makine de hamuru ısıtır.
            Elindeki tek ayar suyun sıcaklığı. Ayarla bakalım.
          </Tahsin>
          <div className="grid grid-cols-4 gap-2 rounded-2xl p-3 border" style={{ borderColor: C.line, background: C.card }}>
            <Readout value={`${ROOM_TEMP_C}°`} label="oda" />
            <Readout value={`${FLOUR_TEMP_C}°`} label="un" />
            <Readout value={`${LEVAIN_TEMP_C}°`} label="maya" />
            <Readout value="+34" label="makine" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-44">
              <ThermometerArt c={waterT} min={0} max={45} />
            </div>
            <div className="flex-1 space-y-3">
              <label className="block text-sm font-semibold">
                Su: <span style={{ ...mono, color: C.accent }}>{waterT} °C</span>
              </label>
              <input
                type="range"
                min={2}
                max={40}
                value={waterT}
                onChange={(e) => setWaterT(Number(e.target.value))}
                className="w-full h-8 accent-[#B4532A]"
              />
              <div className="text-sm rounded-xl p-3 border" style={{ borderColor: C.line }}>
                Tahmini hamur:{" "}
                <strong style={{ ...mono, color: predicted >= 26 && predicted <= 28.5 ? C.good : C.bad }}>{predicted.toFixed(1)} °C</strong>
                <div className="text-xs mt-1" style={{ ...mono, color: C.soft }}>
                  (oda + un + maya + su + makine) ÷ 4
                </div>
              </div>
            </div>
          </div>
          <Btn
            onClick={() => {
              set("waterTempC", waterT);
              setPhase("su");
            }}
          >
            Suyu bu sıcaklıkta hazırla
          </Btn>
        </>
      )}

      {phase === "su" && (
        <>
          <Tahsin>
            Şimdi suyu una dök. Ama dikkat: her un aynı suyu içmez. Bu un fazlasını kaldırmaz, hamur yayılır gider.
          </Tahsin>
          <ScaleArt grams={water.grams} target={waterTarget} filling={water.grams / 4000} />
          <div className="flex justify-center gap-6 text-sm" style={{ color: C.soft }}>
            <span>
              Su oranı: <strong style={{ ...mono, color: hyd > level.maxHydration ? C.bad : C.ink }}>%{hyd.toFixed(1)}</strong>
            </span>
          </div>
          <button
            type="button"
            onPointerDown={water.start}
            onPointerUp={water.stop}
            onPointerLeave={() => water.pouring && water.stop()}
            onPointerCancel={water.stop}
            className="w-full py-6 rounded-2xl text-lg font-bold select-none"
            style={{ background: water.pouring ? "#4E7FA8" : "#DCE8F0", color: water.pouring ? "#fff" : C.ink, border: `3px solid ${C.ink}`, touchAction: "none" }}
          >
            {water.pouring ? "Su dökülüyor…" : "Basılı tut: suyu dök"}
          </button>
          <Nudge onNudge={water.nudge} step={25} />
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={water.reset} disabled={water.grams === 0}>
              Boşalt
            </Btn>
            <Btn
              disabled={water.grams < 1500 || water.pouring}
              onClick={() => {
                set("waterGrams", Math.round(water.grams));
                setPhase("tuz");
              }}
            >
              Tamam
            </Btn>
          </div>
        </>
      )}

      {phase === "tuz" && (
        <>
          <Tahsin>Tuzu ne zaman koyalım? Şimdi, un ile suyun yanına mı; yoksa yoğurmanın sonunda mı?</Tahsin>
          <div className="grid grid-cols-2 gap-3">
            <Btn
              variant="ghost"
              onClick={() => {
                set("saltTiming", "otoliz");
                setPhase("tuzTart");
                sfx.pat(0.6);
              }}
            >
              Şimdi koy
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                set("saltTiming", "son");
                setPhase("otoliz");
                sfx.pat(0.6);
              }}
            >
              Sonra koyarım
            </Btn>
          </div>
        </>
      )}

      {phase === "tuzTart" && (
        <>
          <Tahsin>Peki, tuzu şimdi tart. Ne kadar koyacağına sen karar ver.</Tahsin>
          <ScaleArt grams={salt.grams} target={[70, 90]} filling={salt.grams / 200} />
          <button
            type="button"
            onPointerDown={salt.start}
            onPointerUp={salt.stop}
            onPointerLeave={() => salt.pouring && salt.stop()}
            onPointerCancel={salt.stop}
            className="w-full py-5 rounded-2xl font-bold select-none"
            style={{ background: "#F7F7F2", border: `3px solid ${C.ink}`, touchAction: "none" }}
          >
            {salt.pouring ? "Tuz dökülüyor…" : "Basılı tut: tuzu dök"}
          </button>
          <Nudge onNudge={salt.nudge} step={5} />
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={salt.reset} disabled={salt.grams === 0 || salt.pouring}>
              Boşalt
            </Btn>
            <Btn
              disabled={salt.grams === 0 || salt.pouring}
              onClick={() => {
                set("saltGrams", Math.round(salt.grams));
                setPhase("otoliz");
              }}
            >
              Karıştır
            </Btn>
          </div>
        </>
      )}

      {phase === "otoliz" && (
        <>
          <Tahsin>
            Un ile su sadece karıştı, yoğurmadık. Bir saat dinleniyor; un suyu kendi kendine çekiyor, gluten
            kendiliğinden örülmeye başlıyor. Buna otoliz diyoruz.
          </Tahsin>
          <div className="w-64 h-64 mx-auto">
            <DoughBlob radius={78} shag={1 - autolyse * 0.45} sheen={0.1 + autolyse * 0.2} loft={0.3} flour={0.6 - autolyse * 0.5} />
          </div>
          <div className="text-center text-sm" style={{ ...mono, color: C.soft }}>
            Otoliz: {Math.round(autolyse * 60)} / 60 dk
          </div>
          {autolyse >= 1 && (
            <>
              <Feedback tone="good">Un suyunu çekti; hamur yoğurmaya hazır.</Feedback>
              <Btn onClick={done}>Yoğurmaya geç</Btn>
            </>
          )}
        </>
      )}
    </div>
  );
}
