"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { doughTemperature } from "@/lib/game/sim";
import { sfx, buzz } from "@/lib/game/audio";
import { ScaleArt, ThermometerArt } from "../art";
import { DoughBlob } from "../DoughBlob";
import { Btn, C, Feedback, StageTitle, Tahsin, mono } from "../ui";
import { usePour } from "../usePour";
import { Nudge } from "../Nudge";
import type { StageProps } from "./types";

const BEAT_MS = 800;
/** Başlamadan önce 3-2-1 (tepki ve hazırlanma payı) */
const LEAD_MS = 2400;

type Hit = "mükemmel" | "iyi" | "kaçtı";

/** Ritim: halka hamura doğru daralır; tam üstündeyken dokun */
function useRhythm(beats: number, onFinish: (scores: number[]) => void) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState(0);
  const [beat, setBeat] = useState(0);
  const [last, setLast] = useState<Hit | null>(null);
  const [countdown, setCountdown] = useState(0);
  const t0 = useRef(0);
  const scores = useRef<number[]>([]);
  const hitBeat = useRef(-1);
  const finished = useRef(false);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = (now: number) => {
      const el = now - t0.current;
      if (el < 0) {
        setCountdown(Math.ceil(-el / (LEAD_MS / 3)));
        raf = requestAnimationFrame(loop);
        return;
      }
      setCountdown(0);
      const b = Math.floor(el / BEAT_MS);
      if (b >= beats) {
        setActive(false);
        if (!finished.current) {
          finished.current = true;
          while (scores.current.length < beats) scores.current.push(0);
          onFinish(scores.current);
        }
        return;
      }
      setBeat(b);
      setPhase((el % BEAT_MS) / BEAT_MS);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, beats, onFinish]);

  const start = useCallback(() => {
    scores.current = [];
    hitBeat.current = -1;
    finished.current = false;
    t0.current = performance.now() + LEAD_MS;
    setLast(null);
    setActive(true);
  }, []);

  const tap = useCallback(() => {
    if (!active) return;
    const el = performance.now() - t0.current;
    // Halka her vuruşun sonunda hedefe değer: hedef an = (b+1)·BEAT
    const b = Math.round(el / BEAT_MS) - 1;
    if (b < 0 || b >= beats || b <= hitBeat.current) return;
    const err = Math.abs(el - (b + 1) * BEAT_MS);
    // Telefonda dokunma gecikmesi ve insan tepkisi için geniş pencere
    const s = err < 120 ? 1 : err < 240 ? 0.6 : 0.15;
    while (scores.current.length < b) scores.current.push(0);
    scores.current[b] = s;
    hitBeat.current = b;
    const h: Hit = s === 1 ? "mükemmel" : s >= 0.6 ? "iyi" : "kaçtı";
    setLast(h);
    sfx.pat(0.5 + s * 0.6);
    if (s === 1) buzz(15);
  }, [active, beats]);

  return { active, phase, beat, last, start, tap, countdown };
}

export function KneadStage({ d, set, done }: StageProps) {
  const [step, setStep] = useState<"yogur" | "tuz" | "pencere" | "isi">("yogur");
  const [quality, setQuality] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [stretch, setStretch] = useState(0);
  const [torn, setTorn] = useState(false);
  const dragY = useRef<number | null>(null);
  const salt = usePour(40, 200);

  const finishRound = useCallback(
    (scores: number[]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      setQuality((q) => Math.min(1, rounds === 0 ? avg * 0.95 : q + (1 - q) * avg * 0.5));
      setRounds((r) => r + 1);
      sfx.ding(avg > 0.6);
    },
    [rounds]
  );
  const rhythm = useRhythm(rounds === 0 ? 16 : 6, finishRound);

  const progress = rhythm.active ? (rhythm.beat + rhythm.phase) / (rounds === 0 ? 16 : 6) : rounds > 0 ? 1 : 0;
  const liveQ = rounds === 0 ? quality + progress * 0.6 : quality;
  const ringR = 150 - rhythm.phase * 70;
  const windowpaneOk = quality >= 0.65;
  const tearAt = 0.45 + 0.5 * quality;
  const temp = doughTemperature(d.waterTempC, quality);

  useEffect(() => {
    set("kneadQuality", quality);
  }, [quality, set]);

  return (
    <div className="space-y-5">
      <StageTitle n={3} title="Yoğurma" sub="Mayayı ekle ve yoğur; ritmi tut." />

      {step === "yogur" && (
        <>
          <Tahsin>
            {rounds === 0
              ? "Mayayı ekledim. Şimdi yoğuruyoruz: halka hamurun üstüne geldiği an dokun. Gluten ağını örüyoruz."
              : quality >= 0.65
              ? "Hamur ipek gibi oldu. Ama her fazla yoğurma onu ısıtır, unutma."
              : "Hâlâ biraz pürüzlü. İstersen biraz daha yoğur; ama hamur ısınır."}
          </Tahsin>
          <div className="relative w-72 h-72 mx-auto" onPointerDown={rhythm.tap} style={{ touchAction: "none" }}>
            <DoughBlob radius={82} shag={Math.max(0, 0.9 - liveQ)} sheen={0.15 + liveQ * 0.7} loft={0.45} mode="tap" />
            {rhythm.active && rhythm.countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-7xl font-black" style={{ color: C.accent }}>
                {rhythm.countdown}
              </div>
            )}
            {rhythm.active && rhythm.countdown === 0 && (
              <svg viewBox="0 0 300 300" className="absolute inset-0 pointer-events-none">
                <circle cx="150" cy="150" r="80" fill="none" stroke={C.good} strokeWidth="3" strokeDasharray="6 6" opacity="0.8" />
                <circle cx="150" cy="150" r={ringR} fill="none" stroke={C.accent} strokeWidth="5" opacity={0.4 + rhythm.phase * 0.6} />
              </svg>
            )}
            {rhythm.last && rhythm.active && (
              <div
                key={rhythm.beat}
                className="absolute left-1/2 -translate-x-1/2 top-2 text-lg font-black animate-[pop_.5s_ease-out]"
                style={{ color: rhythm.last === "mükemmel" ? C.good : rhythm.last === "iyi" ? C.warn : C.bad }}
              >
                {rhythm.last === "mükemmel" ? "Mükemmel!" : rhythm.last === "iyi" ? "İyi" : "Kaçtı"}
              </div>
            )}
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: C.line }}>
            <div className="h-full transition-[width]" style={{ width: `${Math.min(1, liveQ) * 100}%`, background: liveQ >= 0.65 ? C.good : C.accent }} />
          </div>
          <div className="text-center text-xs" style={{ color: C.soft }}>
            Gluten gelişimi · hamur {temp.toFixed(1)} °C
          </div>
          {!rhythm.active &&
            (rounds === 0 ? (
              <Btn
                onClick={() => {
                  sfx.unlock();
                  rhythm.start();
                }}
              >
                Yoğurmaya başla
              </Btn>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Btn variant="ghost" onClick={rhythm.start} disabled={rounds >= 3}>
                  Biraz daha yoğur
                </Btn>
                <Btn onClick={() => setStep(d.saltTiming === "son" ? "tuz" : "pencere")}>Yeter</Btn>
              </div>
            ))}
        </>
      )}

      {step === "tuz" && (
        <>
          <Tahsin>Yoğurmanın sonu: tuz zamanı. Tart ve hamura yedir.</Tahsin>
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
              disabled={salt.pouring}
              onClick={() => {
                set("saltGrams", Math.round(salt.grams));
                setStep("pencere");
              }}
            >
              {salt.grams === 0 ? "Tuzsuz devam" : "Tuzu yedir"}
            </Btn>
          </div>
        </>
      )}

      {step === "pencere" && (
        <>
          <Tahsin>Pencere testi: bir parça hamuru parmaklarınla incelt. Işığı görürsen gluten hazır; yırtılırsa yoğurma yarım kalmış.</Tahsin>
          <div
            className="relative w-72 h-72 mx-auto rounded-3xl overflow-hidden select-none"
            style={{ background: "radial-gradient(circle at 50% 45%, #FFE6A8 0%, #F6EEDF 60%)", touchAction: "none" }}
            onPointerDown={(e) => {
              if (torn || stretch >= 1) return;
              try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
              dragY.current = e.clientY;
            }}
            onPointerMove={(e) => {
              if (dragY.current === null) return;
              const s = Math.max(0, Math.min(1.05, (dragY.current - e.clientY) / 140 + stretch));
              dragY.current = e.clientY;
              if (!windowpaneOk && s >= tearAt) {
                setTorn(true);
                dragY.current = null;
                sfx.ding(false);
                buzz([30, 30, 30]);
                return;
              }
              setStretch(s);
              if (s >= 1) {
                dragY.current = null;
                sfx.ding(true);
              }
            }}
            onPointerUp={() => (dragY.current = null)}
          >
            <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full">
              <defs>
                <radialGradient id="wp" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#FFF8E6" stopOpacity={0.2 + 0.7 * stretch} />
                  <stop offset="1" stopColor="#EAD3A2" stopOpacity="1" />
                </radialGradient>
              </defs>
              <ellipse cx="150" cy="150" rx={60 + stretch * 70} ry={50 + stretch * 60} fill="url(#wp)" stroke="#B8955E" strokeWidth="2" opacity={1 - stretch * 0.25} />
              {torn && <path d="M 125 140 l 12 -14 l 8 10 l 14 -12 l 6 16 l 12 -6 l -8 18 l -16 6 l -10 -8 l -14 4 z" fill="#F6EEDF" stroke="#8C6A3A" strokeWidth="2" />}
              {stretch >= 1 && <circle cx="150" cy="150" r="34" fill="#FFF3C4" opacity="0.8" />}
            </svg>
            {!torn && stretch < 1 && (
              <div className="absolute bottom-4 inset-x-0 text-center text-sm font-semibold" style={{ color: C.soft }}>
                ↑ yukarı sürükleyerek incelt
              </div>
            )}
          </div>
          {torn && <Feedback tone="bad">Yırtıldı: gluten henüz yeterince gelişmemiş.</Feedback>}
          {stretch >= 1 && <Feedback tone="good">Pencere göründü! Gluten ağı hazır.</Feedback>}
          {(torn || stretch >= 1) && <Btn onClick={() => setStep("isi")}>Hamurun sıcaklığını ölç</Btn>}
        </>
      )}

      {step === "isi" && (
        <>
          <div className="flex items-center justify-center gap-6">
            <div className="h-48">
              <ThermometerArt c={temp} min={10} max={40} target={[26, 28.5]} />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-bold" style={{ ...mono, color: temp >= 26 && temp <= 28.5 ? C.good : C.bad }}>
                {temp.toFixed(1)} °C
              </div>
              <div className="text-sm" style={{ color: C.soft }}>
                hedef 27–28 °C
              </div>
            </div>
          </div>
          <Feedback tone={temp >= 26 && temp <= 28.5 ? "good" : temp > 28.5 ? "bad" : "warn"}>
            {temp >= 26 && temp <= 28.5
              ? "Tam ustanın istediği sıcaklık."
              : temp > 28.5
              ? "Hamur fazla ısındı; mayalanma hızlı gidecek, gözünü ayırma."
              : "Hamur serin; mayalanma yavaş olacak."}
          </Feedback>
          <Btn onClick={done}>Hamur kasasına al</Btn>
        </>
      )}
      <style>{`@keyframes pop{0%{transform:translate(-50%,6px) scale(.7);opacity:0}40%{opacity:1}100%{transform:translate(-50%,-10px) scale(1.1);opacity:0}}`}</style>
    </div>
  );
}
