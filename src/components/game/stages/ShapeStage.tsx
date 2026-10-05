"use client";

import React, { useEffect, useRef, useState } from "react";
import { maturityAtOven, maturityAtShape, pokeResult } from "@/lib/game/sim";
import { sfx, buzz } from "@/lib/game/audio";
import { DoughBlob } from "../DoughBlob";
import { Btn, C, Feedback, StageTitle, Tahsin } from "../ui";
import type { StageProps } from "./types";
import type { FridgePlan } from "@/types/game";

/** Şekil: etrafında daire çizerek gerginlik ver (fazlası yırtar), dinlendir, bannetona koy, parmak testi, dolap kararı */
export function ShapeStage({ d, set, done }: StageProps) {
  const [step, setStep] = useState<"on" | "dinlen" | "son" | "test" | "gece">("on");
  const [acc, setAcc] = useState(0);
  const [rest, setRest] = useState(0);
  const [poked, setPoked] = useState(false);
  const [night, setNight] = useState(0);
  const lastSound = useRef(0);

  const atShape = maturityAtShape(d);
  const poke = pokeResult(atShape);
  const pokeRecovery = poke === "hizli" ? 0.9 : poke === "yavas" ? 0.18 : 0;
  const torn = acc > 1.05;
  const tension = Math.min(1, acc);

  const rub = (rad: number) => {
    setAcc((a) => a + rad * 0.045);
    const now = performance.now();
    if (now - lastSound.current > 160) {
      sfx.pat(0.25);
      lastSound.current = now;
    }
  };

  useEffect(() => {
    if (step !== "dinlen") return;
    const iv = window.setInterval(() => setRest((r) => Math.min(1, r + 0.025)), 50);
    return () => window.clearInterval(iv);
  }, [step]);
  useEffect(() => {
    if (step !== "gece") return;
    const iv = window.setInterval(() => setNight((n) => Math.min(1, n + 0.012)), 50);
    return () => window.clearInterval(iv);
  }, [step]);

  const commitTension = (key: "preshapeTension" | "finalTension") => {
    set(key, torn ? 1 : tension);
    if (torn) {
      sfx.ding(false);
      buzz([30, 30, 30]);
    } else sfx.ding(tension > 0.6);
  };

  return (
    <div className="space-y-5">
      <StageTitle n={5} title="Şekil ve dolap" sub="Gergin ama nazik." />

      {(step === "on" || step === "son") && (
        <>
          <Tahsin>
            {step === "on"
              ? "Porsiyonladım. Şimdi ön şekil: hamurun etrafında parmağınla daireler çiz, yüzeyi ger. Parlamaya başlayınca yeter; fazla zorlarsan yırtılır."
              : "Son şekil: oval ver, yine ger. Sonra bannetona ters koyacağız."}
          </Tahsin>
          <div className="relative w-72 h-72 mx-auto">
            <DoughBlob
              radius={step === "on" ? 86 - tension * 14 : 72 - tension * 8}
              aspect={step === "son" ? 1.35 : 1}
              shag={Math.max(0, 0.25 - tension * 0.3)}
              sheen={0.1 + tension * 0.85}
              loft={0.35 + tension * 0.4}
              tears={torn ? Math.min(1, (acc - 1.05) * 4 + 0.34) : 0}
              flour={step === "son" ? 0.2 : 0.35 - rest * 0.3}
              mode="rub"
              onRub={rub}
              className="w-full h-full"
            />
            <div className="absolute inset-x-0 -bottom-1 text-center text-xs font-semibold" style={{ color: C.soft }}>
              ⟳ hamurun etrafında daire çiz
            </div>
          </div>
          <div className="h-4 rounded-full overflow-hidden relative" style={{ background: C.line }}>
            <div className="absolute inset-y-0" style={{ left: "60%", width: "37%", background: "#9DB47E66" }} />
            <div className="h-full" style={{ width: `${Math.min(1, acc / 1.1) * 100}%`, background: torn ? C.bad : tension > 0.6 ? C.good : C.accent }} />
          </div>
          {torn && <Feedback tone="bad">Yüzey yırtıldı, gaz kaçıyor!</Feedback>}
          <Btn
            disabled={acc < 0.1}
            onClick={() => {
              if (step === "on") {
                commitTension("preshapeTension");
                setAcc(0);
                setStep("dinlen");
              } else {
                commitTension("finalTension");
                sfx.pat(1);
                window.setTimeout(() => setStep("test"), 700);
              }
            }}
          >
            {step === "on" ? "Tezgâhta dinlensin" : "Bannetona ters koy"}
          </Btn>
        </>
      )}

      {step === "dinlen" && (
        <>
          <Tahsin>Üstü açık, yarım saat tezgâhta. Biraz yayılır, yüzeyi hafifçe kurur; ele yapışmaz hâle gelir.</Tahsin>
          <div className="w-64 h-64 mx-auto">
            <DoughBlob radius={74 + rest * 10} sheen={0.5 - rest * 0.3} loft={0.6 - rest * 0.2} flour={0.05} />
          </div>
          <div className="text-center text-sm" style={{ color: C.soft }}>
            {Math.round(rest * 30)} / 30 dk
          </div>
          {rest >= 1 && <Btn onClick={() => setStep("son")}>Son şekle geç</Btn>}
        </>
      )}

      {step === "test" && (
        <>
          <div className="w-56 h-56 mx-auto animate-[drop_.6s_cubic-bezier(.2,1.3,.4,1)]">
            <div className="w-full h-full rounded-full border-[10px] flex items-center justify-center" style={{ borderColor: "#B08A5A", background: "repeating-radial-gradient(circle,#D9BC8C 0 6px,#C7A473 6px 12px)" }}>
              <div className="w-[78%] h-[62%]">
                <DoughBlob
                  radius={100}
                  aspect={1.3}
                  sheen={0.3}
                  loft={0.5}
                  flour={0.9}
                  mode="poke"
                  pokeRecovery={pokeRecovery}
                  onPoke={() => {
                    setPoked(true);
                    sfx.pat(0.4);
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
          <Tahsin>
            Dolaba koymadan önce parmak testi: unlu parmakla hamura hafifçe bastır, nasıl geri döndüğüne bak. Hamur şu an
            ne kadar kabarık? Ona göre dolabın derecesine karar ver.
          </Tahsin>
          {poked && (
            <Feedback tone={poke === "yavas" ? "good" : "warn"}>
              {poke === "hizli"
                ? "İz hemen kapandı: hamurun daha kabaracak yeri var."
                : poke === "yavas"
                ? "İz yavaşça, biraz kalarak döndü: tam kıvamında."
                : "İz hiç dönmüyor: hamur fazla kabarmış!"}
            </Feedback>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { v: "dort", t: "4 °C", s: "ertesi güne kadar" },
                { v: "on_iki_sonra_dort", t: "12 °C → 4 °C", s: "önce kabarsın" },
              ] as { v: FridgePlan; t: string; s: string }[]
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                disabled={!poked}
                onClick={() => {
                  set("fridgePlan", o.v);
                  setStep("gece");
                }}
                className="rounded-2xl p-4 border-2 text-left disabled:opacity-40"
                style={{ borderColor: C.ink, background: C.card }}
              >
                <div className="text-xl font-bold">{o.t}</div>
                <div className="text-xs" style={{ color: C.soft }}>
                  {o.s}
                </div>
              </button>
            ))}
          </div>
          {!poked && (
            <p className="text-center text-xs" style={{ color: C.soft }}>
              Önce hamura bastır.
            </p>
          )}
        </>
      )}

      {step === "gece" && (
        <>
          <div
            className="relative h-56 rounded-3xl overflow-hidden flex items-end justify-center"
            style={{ background: `linear-gradient(${night < 0.85 ? "#1D1B35" : "#F6C77A"}, ${night < 0.85 ? "#3B2F5A" : "#F6EEDF"})`, transition: "background 1s" }}
          >
            <div
              className="absolute w-12 h-12 rounded-full"
              style={{
                background: night < 0.85 ? "#F4F1E3" : "#FFD27A",
                left: `${10 + night * 75}%`,
                top: `${30 - Math.sin(night * Math.PI) * 18}%`,
                boxShadow: night < 0.85 ? "0 0 30px #F4F1E3" : "0 0 40px #FFB347",
              }}
            />
            <div className="mb-4 px-5 py-3 rounded-2xl text-sm font-semibold" style={{ background: "#FFFFFFD9", color: C.ink }}>
              Dolap: {d.fridgePlan === "dort" ? "4 °C" : night < 0.4 ? "12 °C" : "4 °C"} · olgunluk %
              {Math.round((atShape + (maturityAtOven(d) - atShape) * night) * 100)}
            </div>
          </div>
          <Tahsin>
            Soğukta maya yavaşlar ama bakteriler aromayı işlemeye devam eder. Sabah fırını yakınca hamur hazır.
          </Tahsin>
          {night >= 1 && <Btn onClick={done}>Sabah oldu: fırına</Btn>}
        </>
      )}
      <style>{`@keyframes drop{from{transform:translateY(-30px) scale(.9);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
