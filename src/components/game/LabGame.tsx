"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BakeDecisions, CutWait, FridgePlan, WaterTemp } from "@/types/game";
import { MASTER_DECISIONS, TIP_TEXT, doughTemperature, fermentationRate, simulateBread, starterVigor } from "@/lib/game/sim";
import { CrumbSvg, LoafSvg, crustColor } from "./BreadSvg";

/** Prototip: "Usta Olabilir misin?" — docs/OYUN.md. Krem palet. */
const C = { paper: "#F6EEDF", card: "#FBF6EC", ink: "#3B1E1A", soft: "#6E5148", line: "#E2D3BD", accent: "#B4532A" };
const serif = { fontFamily: "var(--font-fraunces)" } as const;
const FLOUR_G = 4000;

type Stage = "kapi" | "maya" | "hamur" | "yogurma" | "mayalanma" | "sekil" | "firin" | "kesme" | "sonuc";
const ORDER: Stage[] = ["kapi", "maya", "hamur", "yogurma", "mayalanma", "sekil", "firin", "kesme", "sonuc"];

function Tahsin({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/logo.png" alt="" className="w-11 h-11 shrink-0" />
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed border" style={{ background: C.card, borderColor: C.line }}>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.accent }}>
          Tahsin
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "solid" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: "solid" | "ghost" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl text-base font-bold active:scale-[0.98] transition-transform disabled:opacity-40"
      style={variant === "solid" ? { background: C.accent, color: "#fff" } : { border: `2px solid ${C.ink}`, color: C.ink }}
    >
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, display }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string }) {
  return (
    <label className="block space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="font-mono" style={{ color: C.accent }}>
          {display}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#B4532A] h-8" />
    </label>
  );
}

function Choice<T extends string>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className="py-3 px-2 rounded-xl text-sm font-semibold border-2"
          style={value === o.v ? { background: C.ink, color: C.paper, borderColor: C.ink } : { borderColor: C.line, background: C.card }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Belirli aralıkla ilerleyen oyun saati */
function useTicker(running: boolean, ms: number, onTick: () => void) {
  const cb = useRef(onTick);
  useEffect(() => {
    cb.current = onTick;
  });
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => cb.current(), ms);
    return () => window.clearInterval(t);
  }, [running, ms]);
}

export function LabGame() {
  const [stage, setStage] = useState<Stage>("kapi");
  const [d, setD] = useState<BakeDecisions>({ ...MASTER_DECISIONS, foldTimes: [], kneadQuality: 0, levainHours: 0 });
  const set = useCallback(<K extends keyof BakeDecisions>(k: K, v: BakeDecisions[K]) => setD((p) => ({ ...p, [k]: v })), []);
  const next = () => setStage(ORDER[ORDER.indexOf(stage) + 1]);
  const step = ORDER.indexOf(stage);

  // ── 1. Maya: saat akar, kavanoz kabarır/iner; tepede kullan
  const [jarH, setJarH] = useState(0);
  const [jarRunning, setJarRunning] = useState(false);
  const [levainPicked, setLevainPicked] = useState(false);
  useTicker(jarRunning, 120, () => setJarH((h) => (h >= 12 ? 0 : Math.round((h + 0.1) * 10) / 10)));

  // ── 3. Yoğurma: 8 saniye dokun
  const [kneadTaps, setKneadTaps] = useState(0);
  const [kneadLeft, setKneadLeft] = useState(0);
  useTicker(kneadLeft > 0, 100, () => setKneadLeft((t) => Math.max(0, Math.round((t - 0.1) * 10) / 10)));
  const kneadQ = Math.min(1, kneadTaps / 30);
  useEffect(() => {
    if (stage === "yogurma" && kneadLeft === 0 && kneadTaps > 0) set("kneadQuality", kneadQ);
  }, [kneadLeft, kneadTaps, kneadQ, stage, set]);

  // ── 4. Mayalanma: her tıkta yarım saat; yayılma katlayınca toplanır
  const [bulkT, setBulkT] = useState(0);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [lastFold, setLastFold] = useState(0);
  const doughT = doughTemperature(d.waterTemp, d.kneadQuality);
  const rate = fermentationRate(d, doughT);
  const rise = (rate * bulkT) / 3.3;
  const spreadNow = Math.min(1, ((bulkT - lastFold) * (0.25 + Math.max(0, d.hydration - 65) / 30)));
  useTicker(bulkRunning, 900, () => setBulkT((t) => Math.min(6, t + 0.5)));
  useEffect(() => {
    if (bulkT >= 6) setBulkRunning(false);
  }, [bulkT]);

  // ── 5. Şekil: basılı tut, gerginlik dolar (fazla tutarsan yırtılır)
  const [holdStart, setHoldStart] = useState<number | null>(null);
  const [holdMs, setHoldMs] = useState(0);
  useTicker(holdStart !== null, 50, () => setHoldMs(holdStart ? Date.now() - holdStart : 0));
  const tensionFrom = (ms: number) => (ms > 2400 ? 0.55 : Math.min(1, ms / 1800));

  // ── 6. Fırın: dakika akar, kabuk renklenir; çıkar
  const [ovenMin, setOvenMin] = useState(0);
  const [baking, setBaking] = useState(false);
  useTicker(baking, 250, () => setOvenMin((m) => Math.min(70, m + 1)));
  useEffect(() => {
    if (ovenMin >= 70) setBaking(false);
  }, [ovenMin]);
  const liveCrust = simulateBread({ ...d, bakeMinutes: Math.max(1, ovenMin) }).crust;

  const result = stage === "sonuc" ? simulateBread(d) : null;
  const restart = () => {
    setD({ ...MASTER_DECISIONS, foldTimes: [], kneadQuality: 0, levainHours: 0 });
    setJarH(0);
    setLevainPicked(false);
    setKneadTaps(0);
    setBulkT(0);
    setLastFold(0);
    setHoldMs(0);
    setOvenMin(0);
    setStage("maya");
  };

  const share = async () => {
    if (!result) return;
    const text = `EkmekLab'da ekmek yaptım: "${result.title}" çıktı (${result.scores.toplam}/100). Sen de dene!`;
    const url = typeof window !== "undefined" ? window.location.href : "https://ekmeklab.tr/laboratuvar";
    try {
      if (navigator.share) await navigator.share({ title: "EkmekLab", text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
    } catch {}
  };

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink, fontFamily: "var(--font-inter)" }}>
      <div className="max-w-md mx-auto px-5 py-6 space-y-6">
        {/* Üst: ilerleme */}
        {stage !== "kapi" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs" style={{ color: C.soft }}>
              <Link href="/">EkmekLab</Link>
              <span>
                {Math.min(step, 7)} / 7
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.line }}>
              <div className="h-full transition-all" style={{ width: `${(Math.min(step, 7) / 7) * 100}%`, background: C.accent }} />
            </div>
          </div>
        )}

        {stage === "kapi" && (
          <div className="space-y-6 pt-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="EkmekLab" className="w-28 h-28 mx-auto" />
            <h1 className="text-4xl font-semibold leading-tight" style={serif}>
              Usta olabilir misin?
            </h1>
            <p className="text-[15px]" style={{ color: C.soft }}>
              24 saatlik ekşi mayalı köy ekmeğini 3 dakikada sen yap. Her kararın ekmeği değiştirir.
            </p>
            <div className="text-left">
              <Tahsin>
                Selam, ben Tahsin. 2018&apos;de bir gece evde ekmek yoktu; sobada kendim yaptım, o gün bugündür yapıyorum.
                Atölyeye hoş geldin. Bir de sen denemek ister misin?
              </Tahsin>
            </div>
            <Btn onClick={next}>Önlüğü giy, başla</Btn>
          </div>
        )}

        {stage === "maya" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold" style={serif}>
              1 · Maya
            </h2>
            <Tahsin>
              Dünden kalan 200 gram mayanın üstüne 400 gram un, 400 gram su ekledim; şimdi uyanıyor. Tepe yaptığı an
              kullanacağız: kubbelenir, kabarcıklar çıkar, fokurdar. Saati başlat, doğru anda dokun.
            </Tahsin>
            <div className="flex items-end justify-center gap-6 h-56">
              <div className="relative w-28 h-52 rounded-b-3xl rounded-t-lg border-4 overflow-hidden" style={{ borderColor: C.ink, background: "#fff8" }}>
                <div
                  className="absolute bottom-0 inset-x-0 transition-all duration-100"
                  style={{ height: `${20 + 70 * starterVigor(jarH)}%`, background: "#EBD9AE" }}
                >
                  {Array.from({ length: Math.round(18 * starterVigor(jarH)) }, (_, i) => (
                    <span
                      key={i}
                      className="absolute rounded-full border"
                      style={{ borderColor: "#B89C66", width: 4 + (i % 4) * 3, height: 4 + (i % 4) * 3, left: `${(i * 37) % 90}%`, top: `${(i * 53) % 85}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-mono font-bold">{jarH.toFixed(1)}</div>
                <div className="text-xs" style={{ color: C.soft }}>
                  saat (beslemeden beri)
                </div>
              </div>
            </div>
            {!levainPicked ? (
              jarRunning ? (
                <Btn
                  onClick={() => {
                    setJarRunning(false);
                    set("levainHours", jarH);
                    setLevainPicked(true);
                  }}
                >
                  Şimdi kullan!
                </Btn>
              ) : (
                <Btn onClick={() => setJarRunning(true)}>Saati başlat</Btn>
              )
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center" style={{ color: C.soft }}>
                  Mayayı {d.levainHours.toFixed(1)}. saatte aldın.
                </p>
                <Slider
                  label="Ne kadar maya?"
                  value={d.levainPct}
                  min={5}
                  max={30}
                  step={1}
                  onChange={(v) => set("levainPct", v)}
                  display={`unun %${d.levainPct} · ${Math.round((FLOUR_G * d.levainPct) / 100)} g`}
                />
                <Btn onClick={next}>Devam</Btn>
              </div>
            )}
          </div>
        )}

        {stage === "hamur" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold" style={serif}>
              2 · Un, su, tuz
            </h2>
            <Tahsin>
              8 ekmek için 4 kilo un. Maya beklerken unu suyla sadece karıştırıp bir saat dinlendiriyoruz; buna otoliz
              diyoruz. Her un aynı suyu içmez, dikkat.
            </Tahsin>
            <Slider label="Su oranı" value={d.hydration} min={60} max={90} step={1} onChange={(v) => set("hydration", v)} display={`%${d.hydration} · ${Math.round((FLOUR_G * d.hydration) / 100)} g`} />
            <div className="space-y-2">
              <span className="text-sm font-semibold">Suyun sıcaklığı</span>
              <Choice<WaterTemp>
                value={d.waterTemp}
                onChange={(v) => set("waterTemp", v)}
                options={[
                  { v: "soguk", label: "Dolaptan (4°)" },
                  { v: "oda", label: "Oda (20°)" },
                  { v: "ilik", label: "Ilık (35°)" },
                ]}
              />
            </div>
            <Slider label="Tuz" value={d.saltPct} min={0} max={4} step={0.25} onChange={(v) => set("saltPct", v)} display={`%${d.saltPct} · ${Math.round((FLOUR_G * d.saltPct) / 100)} g`} />
            <Btn onClick={next}>Hamuru yoğurmaya geç</Btn>
          </div>
        )}

        {stage === "yogurma" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold" style={serif}>
              3 · Yoğurma
            </h2>
            <Tahsin>Mayayı ekle, yoğur; tuz en sonda. Gluten penceresini görene kadar bırakma. Sekiz saniyen var: hızlı hızlı dokun!</Tahsin>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Gluten</span>
                <span className="font-mono">{kneadLeft > 0 ? `${kneadLeft.toFixed(1)} sn` : ""}</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: C.line }}>
                <div className="h-full transition-all" style={{ width: `${kneadQ * 100}%`, background: kneadQ > 0.85 ? "#5E8B4E" : C.accent }} />
              </div>
              {kneadQ > 0.85 && <p className="text-sm font-semibold text-center">Gluten penceresi göründü!</p>}
            </div>
            {kneadLeft > 0 ? (
              <button
                type="button"
                onPointerDown={() => setKneadTaps((n) => n + 1)}
                className="w-full h-40 rounded-3xl text-2xl font-bold select-none active:scale-95 transition-transform"
                style={{ background: "#EBD9AE", border: `3px solid ${C.ink}` }}
              >
                YOĞUR
              </button>
            ) : d.kneadQuality > 0 ? (
              <div className="space-y-4 text-center">
                <p className="text-sm" style={{ color: C.soft }}>
                  Hamur sıcaklığı: <strong style={{ color: doughT > 30 || doughT < 23 ? C.accent : C.ink }}>{doughT.toFixed(1)} °C</strong> (usta 27–28 ister)
                </p>
                <Btn onClick={next}>Hamur kasasına al</Btn>
              </div>
            ) : (
              <Btn
                onClick={() => {
                  setKneadTaps(0);
                  setKneadLeft(8);
                }}
              >
                Yoğurmaya başla
              </Btn>
            )}
          </div>
        )}

        {stage === "mayalanma" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold" style={serif}>
              4 · Katlamalı mayalanma
            </h2>
            <Tahsin>Yarım saatte bir bak: hamur yayılıyorsa hemen katla, gerginleştir. Yayılmıyorsa bekle. Neredeyse iki katına çıkınca şekle geçeriz.</Tahsin>
            <div className="relative h-48 rounded-3xl border-4 flex items-end justify-center overflow-hidden" style={{ borderColor: C.ink, background: "#fff8" }}>
              <div
                className="rounded-t-[50%] transition-all duration-500"
                style={{
                  width: `${45 + spreadNow * 50}%`,
                  height: `${Math.min(95, 28 + rise * 45) * (1 - spreadNow * 0.35)}%`,
                  background: "#EBD9AE",
                  borderTop: `3px solid #C9A86A`,
                }}
              />
            </div>
            <div className="grid grid-cols-3 text-center text-sm">
              <div>
                <div className="font-mono text-xl font-bold">{bulkT.toFixed(1)}</div>
                <div style={{ color: C.soft }}>saat</div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold">+%{Math.round(rise * 100)}</div>
                <div style={{ color: C.soft }}>hacim</div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold">{d.foldTimes.length}</div>
                <div style={{ color: C.soft }}>katlama</div>
              </div>
            </div>
            {spreadNow > 0.5 && <p className="text-sm text-center font-semibold" style={{ color: C.accent }}>Hamur yayılıyor!</p>}
            {!bulkRunning && bulkT === 0 ? (
              <Btn onClick={() => setBulkRunning(true)}>Saati başlat</Btn>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Btn
                  variant="ghost"
                  disabled={bulkT === 0}
                  onClick={() => {
                    set("foldTimes", [...d.foldTimes, bulkT]);
                    setLastFold(bulkT);
                  }}
                >
                  Katla
                </Btn>
                <Btn
                  onClick={() => {
                    setBulkRunning(false);
                    set("bulkHours", Math.max(0.5, bulkT));
                    next();
                  }}
                >
                  Yeter, şekil ver
                </Btn>
              </div>
            )}
          </div>
        )}

        {stage === "sekil" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold" style={serif}>
              5 · Şekil ve dolap
            </h2>
            <Tahsin>Porsiyonla, gergin bir oval ver; yarım saat tezgâhta üstü açık dinlensin. Sonra son şekil, bannetona ters. Basılı tut, gerginlik dolsun; fazla tutarsan yırtılır!</Tahsin>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: C.line }}>
              <div className="h-full" style={{ width: `${Math.min(100, (holdMs / 2400) * 100)}%`, background: holdMs > 2400 ? "#9B2C1F" : holdMs > 1500 ? "#5E8B4E" : C.accent }} />
            </div>
            <button
              type="button"
              onPointerDown={() => {
                setHoldMs(0);
                setHoldStart(Date.now());
              }}
              onPointerUp={() => {
                const ms = holdStart ? Date.now() - holdStart : 0;
                setHoldStart(null);
                setHoldMs(ms);
                set("shapeTension", tensionFrom(ms));
              }}
              onPointerLeave={() => {
                if (holdStart) {
                  const ms = Date.now() - holdStart;
                  setHoldStart(null);
                  setHoldMs(ms);
                  set("shapeTension", tensionFrom(ms));
                }
              }}
              className="w-full h-28 rounded-3xl text-xl font-bold select-none"
              style={{ background: "#EBD9AE", border: `3px solid ${C.ink}`, touchAction: "none" }}
            >
              {holdStart ? "Gerginleştir…" : holdMs > 2400 ? "Yırtıldı! Tekrar dene" : "Basılı tut"}
            </button>
            <div className="space-y-2">
              <span className="text-sm font-semibold">Hamur şu an +%{Math.round(rise * 100)} kabarık. Dolap?</span>
              <Choice<FridgePlan>
                value={d.fridgePlan}
                onChange={(v) => set("fridgePlan", v)}
                options={[
                  { v: "dort", label: "4° (tam kabardı)" },
                  { v: "on_iki_sonra_dort", label: "Önce 12°, sonra 4°" },
                ]}
              />
            </div>
            <Btn disabled={holdMs === 0 || holdStart !== null} onClick={next}>
              Ertesi sabah: fırına
            </Btn>
          </div>
        )}

        {stage === "firin" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold" style={serif}>
              6 · Bıçak ve taş fırın
            </h2>
            <Tahsin>Fırını 280&apos;de ısıttım, şimdi 220&apos;ye aldım. Hamuru dolaptan al, kesiğini at, içeri. İlk 20 dakika buharlı, sonra buharı tahliye.</Tahsin>
            {!baking && ovenMin === 0 ? (
              <>
                <Slider label="Bıçak açısı" value={d.scoreAngle} min={0} max={90} step={5} onChange={(v) => set("scoreAngle", v)} display={`${d.scoreAngle}°`} />
                <Slider label="Kesik derinliği" value={d.scoreDepth} min={0} max={1} step={0.05} onChange={(v) => set("scoreDepth", v)} display={d.scoreDepth < 0.25 ? "sığ" : d.scoreDepth > 0.7 ? "çok derin" : "orta"} />
                <Slider label="Fırın" value={d.ovenTemp} min={180} max={260} step={10} onChange={(v) => set("ovenTemp", v)} display={`${d.ovenTemp} °C`} />
                <Slider label="Buharlı süre" value={d.steamMinutes} min={0} max={30} step={5} onChange={(v) => set("steamMinutes", v)} display={`${d.steamMinutes} dk`} />
                <Btn onClick={() => setBaking(true)}>Fırına ver</Btn>
              </>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-center h-40 rounded-3xl" style={{ background: "#2A1A12" }}>
                  <div className="w-48 h-24 rounded-t-full transition-colors duration-200" style={{ background: crustColor(liveCrust), boxShadow: "0 0 40px #F59E0B55" }} />
                </div>
                <div className="text-center">
                  <span className="font-mono text-3xl font-bold">{ovenMin}</span> <span style={{ color: C.soft }}>dakika</span>
                  <div className="text-xs" style={{ color: C.soft }}>
                    {ovenMin < d.steamMinutes ? "buharlı" : "buharsız, kabuk renkleniyor"}
                  </div>
                </div>
                <Btn
                  disabled={ovenMin < 5}
                  onClick={() => {
                    setBaking(false);
                    set("bakeMinutes", ovenMin);
                    next();
                  }}
                >
                  Fırından çıkar
                </Btn>
              </div>
            )}
          </div>
        )}

        {stage === "kesme" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold" style={serif}>
              7 · Sabır
            </h2>
            <Tahsin>Tel rafa aldık. Kokusu bütün atölyeyi sardı… Ne zaman kesiyorsun?</Tahsin>
            <Choice<CutWait>
              value={d.cutWait}
              onChange={(v) => set("cutWait", v)}
              options={[
                { v: "hemen", label: "Hemen!" },
                { v: "bir_saat", label: "1 saat sonra" },
                { v: "uc_saat", label: "3 saat sonra" },
              ]}
            />
            <Btn onClick={next}>Kes ve bak</Btn>
          </div>
        )}

        {stage === "sonuc" && result && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: C.accent }}>
                Senin ekmeğin
              </p>
              <h2 className="text-4xl font-semibold" style={serif}>
                {result.title}
              </h2>
              <p className="font-mono text-lg">{result.scores.toplam} / 100</p>
            </div>
            <LoafSvg look={result} className="w-full" />
            <CrumbSvg look={result} className="w-full" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(
                [
                  ["Kabarma", result.scores.kabarma],
                  ["İç yapı", result.scores.ic],
                  ["Kabuk", result.scores.kabuk],
                  ["Lezzet", result.scores.lezzet],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-xl border p-3" style={{ borderColor: C.line, background: C.card }}>
                  <div className="flex justify-between">
                    <span>{k}</span>
                    <span className="font-mono font-bold">{v}</span>
                  </div>
                  <div className="h-1.5 rounded-full mt-2" style={{ background: C.line }}>
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: C.accent }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-center" style={{ color: C.soft }}>
              Tat: {result.sourness > 0.55 ? "belirgin ekşi" : result.sourness > 0.35 ? "hafif ekşi" : "dengeli, umami"}
            </p>
            {result.tips.length > 0 ? (
              <div className="space-y-3">
                {result.tips.map((t) => (
                  <Tahsin key={t}>{TIP_TEXT[t]}</Tahsin>
                ))}
              </div>
            ) : (
              <Tahsin>Valla bu ekmeği ben yapsam bu kadar olurdu. Eline sağlık usta!</Tahsin>
            )}
            <div className="space-y-3 pt-2">
              <Btn onClick={share}>Ekmeğini paylaş</Btn>
              <Btn variant="ghost" onClick={restart}>
                Tekrar dene
              </Btn>
              <Link href="/" className="block text-center py-3 font-semibold underline" style={{ color: C.accent }}>
                Gerçeği 24 saat sürüyor. Bu sefer usta yapsın →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
