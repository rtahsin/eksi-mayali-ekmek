"use client";

import React, { useEffect, useState } from "react";
import { internalTempAt, runFor, simulateBread } from "@/lib/game/sim";
import { sfx, buzz } from "@/lib/game/audio";
import { OvenArt } from "../art";
import { LoafSvg } from "../BreadSvg";
import { Btn, C, Feedback, Readout, StageTitle, Tahsin } from "../ui";
import type { StageProps } from "./types";

const MIN_MS = 200; // her fırın dakikası

/** Taş fırın: yükle, buhar ver, buharı tahliye et, iç sıcaklığı ölç, çıkar */
export function OvenStage({ d, set, done }: StageProps) {
  const [step, setStep] = useState<"kapak" | "yukle" | "buhar" | "pisir" | "cikti">("kapak");
  const [open, setOpen] = useState(false);
  const [steam, setSteam] = useState(false);
  const [vent, setVent] = useState<number | null>(null);
  const [m, setM] = useState(0);
  const [probe, setProbe] = useState<number | null>(null);

  useEffect(() => {
    if (step !== "pisir") return;
    const iv = window.setInterval(() => setM((x) => Math.min(75, x + 1)), MIN_MS);
    return () => window.clearInterval(iv);
  }, [step]);
  useEffect(() => {
    if (step === "pisir" && m >= 75) setStep("cikti");
  }, [m, step]);

  const projected = simulateBread({ ...d, steam, ventMinute: vent, bakeMinutes: Math.max(42, m) });
  const now = simulateBread({ ...d, steam, ventMinute: vent, bakeMinutes: Math.max(1, m) });
  const growth = Math.min(1, m / 12) ** 0.7;
  const look = { ...projected, crust: m === 0 ? 0 : now.crust };
  const steamOn = steam && vent === null && step === "pisir";
  // Ekmeğin içinde olanlar: motorun fırın olayları, iç sıcaklık ilerledikçe belirir
  const ovenRun = runFor({ ...d, steam, ventMinute: vent, bakeMinutes: Math.max(42, m) });
  const OVEN_KEYS = ["son_maya_patlamasi", "maya_oldu", "nisasta_jel", "gluten_dondu", "amilaz_durdu", "kabuk_renk", "ic_pisti"];
  const happened = ovenRun.events.filter((e) => OVEN_KEYS.includes(e.key) && e.t <= ovenRun.marks.firin + m / 60 + 1e-6);

  const takeOut = () => {
    set("steam", steam);
    set("ventMinute", vent);
    set("bakeMinutes", m);
    setStep("cikti");
    sfx.creak();
    buzz(30);
  };

  return (
    <div className="space-y-5">
      <StageTitle n={7} title="Taş fırın" sub="Fırın 280°'de ısındı, 220°'ye indirildi." />
      <OvenArt open={open} glow={step === "pisir" || step === "cikti" ? 1 : open ? 0.6 : 0.3} steam={steamOn ? 1 : 0}>
        {step !== "kapak" && (
          <div className="w-full h-full flex items-end justify-center pb-[2%]">
            <LoafSvg look={look} growth={step === "yukle" || step === "buhar" ? 0 : growth} className="w-[80%]" />
          </div>
        )}
      </OvenArt>

      {step === "kapak" && (
        <>
          <Tahsin>Hamur küreğin üstünde, kesiği atıldı. Kapağı aç, taşın üstüne kaydır.</Tahsin>
          <Btn
            onClick={() => {
              sfx.unlock();
              sfx.creak();
              setOpen(true);
              setStep("yukle");
            }}
          >
            Fırın kapağını aç
          </Btn>
        </>
      )}

      {step === "yukle" && (
        <Btn
          onClick={() => {
            sfx.pat(0.8);
            setStep("buhar");
          }}
        >
          Hamuru taşa kaydır
        </Btn>
      )}

      {step === "buhar" && (
        <>
          <Tahsin>Kapağı kapatmadan önce: buhar verecek miyiz?</Tahsin>
          <div className="grid grid-cols-2 gap-3">
            <Btn
              onClick={() => {
                setSteam(true);
                sfx.hiss(1.8);
                buzz([20, 20, 60]);
                setStep("pisir");
              }}
            >
              Buhar ver
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                setSteam(false);
                setStep("pisir");
              }}
            >
              Buharsız pişir
            </Btn>
          </div>
        </>
      )}

      {step === "pisir" && (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-2xl p-3 border" style={{ borderColor: C.line, background: C.card }}>
            <Readout value={`${m} dk`} label="süre" />
            <Readout value={steam ? (vent === null ? "açık" : `${vent}. dk`) : "yok"} label="buhar" tone={steam && vent === null && m > 28 ? "warn" : "ink"} />
            <Readout value={probe === null ? "—" : `${probe}°`} label="iç sıcaklık" tone={probe !== null && probe >= 96 ? "good" : "ink"} />
          </div>
          {happened.length > 0 && (
            <ol className="space-y-1" aria-label="Ekmeğin içinde olanlar">
              {happened.map((e) => (
                <li key={e.key} className="flex items-center gap-2 text-sm font-semibold animate-[pop_.4s_ease-out]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: C.accent }} />
                  {e.label}
                </li>
              ))}
            </ol>
          )}
          <style>{`@keyframes pop{from{transform:translateX(-8px);opacity:0}to{transform:none;opacity:1}}`}</style>
          <Tahsin>
            {m < 8
              ? "Şimdi fırın kabarması: gaz ısıyla genleşiyor, çözünmüş CO₂ kabarcıklara geçiyor; içi ~60 dereceye gelene kadar maya son nefesini veriyor."
              : steam && vent === null
              ? "Kesik açılıyor, kulak kalkıyor. Buharı ne zaman bırakacağına sen karar ver; buhar kalırsa kabuk soluk kalır."
              : "Buhar gitti; kabuk kızarmaya başladı. Renge bak, istersen termometreyle ölç."}
          </Tahsin>
          <div className="grid grid-cols-2 gap-3">
            <Btn
              variant="ghost"
              disabled={!steam || vent !== null}
              onClick={() => {
                setVent(m);
                sfx.hiss(0.6);
              }}
            >
              Buharı tahliye et
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                setProbe(Math.round(internalTempAt(m)));
                sfx.ding(internalTempAt(m) >= 96);
              }}
            >
              Termometre
            </Btn>
          </div>
          <Btn disabled={m < 10} onClick={takeOut}>
            Fırından çıkar
          </Btn>
        </>
      )}

      {step === "cikti" && (
        <>
          <Feedback tone={now.internalTemp >= 96 && now.crust <= 0.85 ? "good" : now.crust > 0.85 ? "bad" : "warn"}>
            {now.crust > 0.9
              ? "Kabuk yanmış!"
              : now.internalTemp < 96
              ? `İç ${now.internalTemp} °C: biraz erken çıktı.`
              : `İç ${now.internalTemp} °C, kabuk ${now.crust > 0.7 ? "koyu kızıl" : now.crust > 0.5 ? "altın kahve" : "soluk"}.`}
          </Feedback>
          <Btn
            onClick={() => {
              if (m >= 75) {
                set("steam", steam);
                set("ventMinute", vent);
                set("bakeMinutes", m);
              }
              done();
            }}
          >
            Tel rafa al
          </Btn>
        </>
      )}
    </div>
  );
}
