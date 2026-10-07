"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { BakeRun, MicroPhase, RyeDecisions } from "@/types/game";
import { RYE_MASTER, RYE_RECIPE, RYE_TIP_TEXT, ryeCoreAt, simulateRye } from "@/lib/game/engine/rye";
import { cardForEntity } from "@/lib/game/content/cards";
import { sfx, buzz } from "@/lib/game/audio";
import { BiographyChart } from "../BiographyChart";
import { LensButton, LensSheet } from "../micro/LensSheet";
import { Btn, C, Feedback, Readout, StageTitle, Tahsin, mono, serif } from "../ui";
import { RyeCrumbSvg, RyeLoafSvg } from "./RyeLoaf";
import type { ChapterHooks } from "./StarterChapter";
import { ClockControls, Upcoming, useClock } from "../useClock";

/**
 * Bölüm 4 — Gece Yarısı: Tahsin'in mavi haşhaşlı çavdarı (docs/OYUN.md §11).
 * Haşlama → ekşi maya + hamur → karıştır (yoğurma yok) → ıslak el + haşhaş → çatlayana dek → kapalı dolap →
 * düşen fırın ~2 sa, buhar tahliyesi, ters çevir → 1–2 gün streçte dinlen.
 */

type Step = "haslama" | "hamur" | "karistir" | "sekil" | "mayalanma" | "firin" | "dinlenme" | "sonuc";
const STEPS: Step[] = ["haslama", "hamur", "karistir", "sekil", "mayalanma", "firin", "dinlenme", "sonuc"];
const LENS_PHASE: Partial<Record<Step, MicroPhase[]>> = {
  hamur: ["yogurma"],
  karistir: ["yogurma"],
  sekil: ["yogurma"],
  mayalanma: ["mayalanma", "dolap"],
  firin: ["firin"],
  dinlenme: ["sogutma"],
  sonuc: ["yogurma", "mayalanma", "dolap", "firin", "sogutma"],
};

function Choice<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string; sub?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={`grid gap-2 ${options.length > 3 ? "grid-cols-2" : `grid-cols-${options.length}`}`}>
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => {
            sfx.pat(0.3);
            onChange(o.v);
          }}
          className="rounded-2xl border-2 p-3 text-left min-h-[56px]"
          style={{ borderColor: value === o.v ? C.ink : C.line, background: value === o.v ? C.card : "transparent" }}
        >
          <div className="font-bold">{o.label}</div>
          {o.sub && (
            <div className="text-xs" style={{ color: C.soft }}>
              {o.sub}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/** BiographyChart pişirme günü çizelgesi bekler; çavdar çizelgesini ona uyarla */
function asBakeRun(r: ReturnType<typeof simulateRye>): BakeRun {
  const m = r.marks;
  return {
    result: undefined as unknown as BakeRun["result"],
    samples: r.samples,
    events: r.events,
    marks: { kavanoz: m.karistirma, otoliz: m.haslama, yogurma: m.karistirma, mayalanma: m.mayalanma, sekil: m.mayalanma, dolap: m.dolap, firin: m.firin, sogutma: m.dinlenme, kesim: m.dinlenme },
    maturityAtShape: 1,
  };
}

export function RyeChapter({ hooks, onDone }: { hooks: ChapterHooks; onDone: (score: number) => void }) {
  const [step, setStep] = useState<Step>("haslama");
  const [d, setD] = useState<RyeDecisions>({ ...RYE_MASTER, scaldHours: 0, proofHours: 0, bakeMinutes: 0, vents: 0, flip: false, wetHands: false, poppyCoverage: 0, restHours: 0 });
  const set = <K extends keyof RyeDecisions>(k: K, v: RyeDecisions[K]) => setD((p) => ({ ...p, [k]: v }));
  const [poured, setPoured] = useState(false);
  const [mixed, setMixed] = useState<null | "karistir" | "yogur">(null);
  const [pressing, setPressing] = useState(false);
  // Mayalanma: 1× hızda bir saat ≈ 3,3 sn (çatlak penceresi ~3,5 sn, duraklatılabilir).
  // Fırın: 1× hızda bir dakika ≈ 0,33 sn (iki saat ≈ 40 sn; 3× ile ~13 sn).
  const proofClock = useClock(0.3, 5);
  const ovenClock = useClock(3, 180);
  const t = step === "firin" ? Math.floor(ovenClock.t) : proofClock.t;
  const [lens, setLens] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const asked = useRef(new Set<string>());

  const idx = STEPS.indexOf(step);
  // Büyüteç ve önizleme: o ana kadarki kararlar + geri kalanı usta ayarı
  const preview = useMemo(() => {
    const p: RyeDecisions = { ...RYE_MASTER };
    const k = (key: keyof RyeDecisions, from: Step) => {
      if (idx > STEPS.indexOf(from)) (p as unknown as Record<string, unknown>)[key] = d[key];
    };
    k("scaldWater", "haslama");
    k("scaldHours", "haslama");
    k("sourGrams", "hamur");
    k("waterGrams", "hamur");
    k("saltGrams", "hamur");
    k("mix", "karistir");
    k("wetHands", "sekil");
    k("poppyCoverage", "sekil");
    k("proofHours", "mayalanma");
    k("covered", "mayalanma");
    k("fallingOven", "firin");
    k("bakeMinutes", "firin");
    k("vents", "firin");
    k("flip", "firin");
    k("restHours", "dinlenme");
    return simulateRye(p);
  }, [d, idx]);
  const final = useMemo(() => (step === "sonuc" ? simulateRye(d) : null), [step, d]);

  const ask = (at: string) => {
    if (asked.current.has(at)) return;
    asked.current.add(at);
    hooks.ask(at, () => undefined);
  };
  useEffect(() => {
    if (step === "hamur") ask("cavdar:hamur");
    if (step === "karistir") ask("cavdar:karistir");
    if (step === "dinlenme") ask("cavdar:dinlenme");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Haşhaş kaplama: basılı tutunca dolar; kuru elle tutmaz
  useEffect(() => {
    if (!pressing) return;
    const iv = window.setInterval(() => setD((p) => ({ ...p, poppyCoverage: Math.min(p.wetHands ? 1 : 0.45, p.poppyCoverage + 0.04) })), 60);
    return () => window.clearInterval(iv);
  }, [pressing]);

  const next = (s: Step) => {
    proofClock.pause();
    ovenClock.pause();
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Kalıptaki ekmeğin görünümü
  const proofNow = step === "mayalanma" ? simulateRye({ ...RYE_MASTER, ...d, proofHours: Math.max(0.01, t) }).samples.filter((s) => s.phase === "mayalanma").pop() : undefined;
  const rise = step === "mayalanma" ? Math.min(1.2, (proofNow?.gas ?? 0) * 1.4) : idx > STEPS.indexOf("mayalanma") ? Math.min(1.2, preview.result.proof * 0.9) : 0;
  const cracks = step === "mayalanma" ? Math.max(0, Math.min(1, (t - 0.8) / 1.4)) : idx > STEPS.indexOf("mayalanma") ? Math.max(0, Math.min(1, (d.proofHours - 0.8) / 1.4)) : 0;
  const ovenCore = step === "firin" ? ryeCoreAt(t, 6, d.fallingOven) : 0;
  const ovenEvents = step === "firin" ? simulateRye({ ...RYE_MASTER, ...d, bakeMinutes: Math.max(1, t) }).events.filter((e) => ["maya_oldu", "nisasta_jel", "amilaz_durdu", "ic_pisti"].includes(e.key) && e.t <= preview.marks.firin + t / 60 + 1e-6) : [];
  const crustNow = step === "firin" ? simulateRye({ ...RYE_MASTER, ...d, bakeMinutes: Math.max(1, t) }).result.crust : preview.result.crust;

  const lensSamples = (LENS_PHASE[step] ?? ["yogurma"]).flatMap((ph) => preview.samples.filter((s) => s.phase === ph));

  return (
    <div className="space-y-5">
      <StageTitle kicker="Bölüm" n={4} title="Gece Yarısı" sub="Mavi haşhaşlı çavdar. İki gün dinlenir." />
      {idx > 0 && step !== "sonuc" && (
        <button
          type="button"
          onClick={() => {
            const prev = STEPS[idx - 1];
            if (prev === "haslama") setPoured(false);
            if (prev === "karistir") setMixed(null);
            if (prev === "mayalanma") proofClock.reset();
            if (prev === "firin") ovenClock.reset();
            next(prev);
          }}
          className="text-sm font-semibold min-h-[44px]"
          style={{ color: C.soft }}
        >
          ← Önceki adım
        </button>
      )}
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="h-1.5 flex-1 rounded-full" style={{ background: i <= idx ? C.accent : C.line }} />
        ))}
      </div>

      {step === "haslama" && (
        <>
          <Tahsin>
            Önce haşlama. Arpa unu, çavdar kırması, kabak çekirdeği, keten ve karabuğday unu bir kapta. Üstüne üç kilo su dökeceğiz. Hangi su?
          </Tahsin>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm rounded-2xl border p-3" style={{ borderColor: C.line, background: C.card }}>
            <li>Arpa unu · {RYE_RECIPE.haslama.arpaUnu} g</li>
            <li>Çavdar kırması · {RYE_RECIPE.haslama.cavdarKirmasi} g</li>
            <li>Kabak çekirdeği · {RYE_RECIPE.haslama.kabakCekirdegi} g</li>
            <li>Keten tohumu · {RYE_RECIPE.haslama.keten} g</li>
            <li>Karabuğday unu · {RYE_RECIPE.haslama.karabugday} g</li>
            <li>Su · {RYE_RECIPE.haslama.kaynarSu} g</li>
          </ul>
          <Choice
            value={d.scaldWater}
            options={[
              { v: "kaynar", label: "Kaynar su", sub: "Tahsin'in yolu" },
              { v: "ilik", label: "Ilık su", sub: "Daha kolay" },
            ]}
            onChange={(v) => set("scaldWater", v)}
          />
          {!poured ? (
            <Btn
              onClick={() => {
                sfx.unlock();
                sfx.pour(1.4);
                buzz(20);
                setPoured(true);
              }}
            >
              Suyu dök, karıştır
            </Btn>
          ) : (
            <>
              <Feedback tone={d.scaldWater === "kaynar" ? "good" : "warn"}>
                {d.scaldWater === "kaynar" ? "Buhar yükseliyor; kap 90 dereceden yavaşça soğumaya başladı." : "Ilık karışım: tohumlar su çekiyor ama nişasta jelleşmedi."}
              </Feedback>
              <p className="text-sm font-bold">Ne kadar bekleyecek?</p>
              <Choice
                value={d.scaldHours}
                options={[
                  { v: 2, label: "2 saat" },
                  { v: 12, label: "Bir gece" },
                  { v: 24, label: "Bir gün", sub: "Tahsin" },
                ]}
                onChange={(v) => set("scaldHours", v)}
              />
              <Btn disabled={d.scaldHours === 0} onClick={() => hooks.unlock("olay_haslama", () => next("hamur"))}>
                Bekle
              </Btn>
            </>
          )}
        </>
      )}

      {step === "hamur" && (
        <>
          <Tahsin>Haşlamanın üstüne 3 kilo çavdar unu, 800 gram siyez, su, çavdar ekşi mayası ve tuz. Ekşi mayayı ne kadar koyuyoruz?</Tahsin>
          <p className="text-sm font-bold">Çavdar ekşi mayası</p>
          <Choice
            value={d.sourGrams}
            options={[
              { v: 300, label: "300 g" },
              { v: 800, label: "800 g" },
              { v: 1500, label: "1500 g", sub: "Tahsin" },
              { v: 2500, label: "2500 g" },
            ]}
            onChange={(v) => set("sourGrams", v)}
          />
          <p className="text-sm font-bold">Su</p>
          <Choice
            value={d.waterGrams}
            options={[
              { v: 1800, label: "1800 g" },
              { v: 2400, label: "2400 g", sub: "Tahsin" },
              { v: 3200, label: "3200 g" },
            ]}
            onChange={(v) => set("waterGrams", v)}
          />
          <p className="text-sm font-bold">Tuz</p>
          <Choice
            value={d.saltGrams}
            options={[
              { v: 0, label: "Yok" },
              { v: 170, label: "170 g", sub: "Tahsin" },
              { v: 300, label: "300 g" },
            ]}
            onChange={(v) => set("saltGrams", v)}
          />
          <Btn onClick={() => next("karistir")}>Kaba koy</Btn>
        </>
      )}

      {step === "karistir" && (
        <>
          <Tahsin>Kap dolu, hamur ağır. Şimdi ne yapıyoruz?</Tahsin>
          {!mixed ? (
            <Choice
              value={"" as string}
              options={[
                { v: "karistir", label: "Sadece karıştır", sub: "her yer ıslanana dek" },
                { v: "yogur", label: "Yoğur, pencere testi yap", sub: "köy ekmeği gibi" },
              ]}
              onChange={(v) => {
                const m = v as "karistir" | "yogur";
                setMixed(m);
                set("mix", m);
                sfx.pat(0.8);
              }}
            />
          ) : (
            <>
              <Feedback tone={mixed === "karistir" ? "good" : "warn"}>
                {mixed === "karistir"
                  ? "Hamur macun gibi bir araya geldi. Çavdarda bu kadarı yeter."
                  : "Yoğurdun, yoğurdun… pencere çıkmıyor, hamur ellerine yapışıyor. Çavdar gluten ağı kurmaz."}
              </Feedback>
              <Btn onClick={() => hooks.unlock("pentozan", () => next("sekil"))}>12 parçaya böl</Btn>
            </>
          )}
        </>
      )}

      {step === "sekil" && (
        <>
          <Tahsin>Her parçayı mavi haşhaşa bulayıp teflon kalıba koyacağız. Haşhaş kuru hamura tutmaz…</Tahsin>
          <RyeLoafSvg look={{ rise: 0, cracks: 0, crust: 0, poppy: d.poppyCoverage, inTin: false }} className="w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Btn
              variant={d.wetHands ? "dark" : "ghost"}
              onClick={() => {
                set("wetHands", true);
                sfx.pour(0.8);
              }}
            >
              {d.wetHands ? "Eller ıslak ✓" : "Elini ıslat"}
            </Btn>
            <button
              type="button"
              onPointerDown={() => setPressing(true)}
              onPointerUp={() => setPressing(false)}
              onPointerLeave={() => setPressing(false)}
              onPointerCancel={() => setPressing(false)}
              className="rounded-2xl border-2 font-bold min-h-[56px] select-none"
              style={{ borderColor: C.ink, background: pressing ? C.ink : "#C8D0E0", color: pressing ? C.paper : C.ink, touchAction: "none" }}
            >
              {pressing ? "Buluyor…" : "Basılı tut: haşhaşa bula"}
            </button>
          </div>
          <div className="text-center text-sm" style={{ color: C.soft }}>
            Kaplama <strong style={{ ...mono, color: C.ink }}>%{Math.round(d.poppyCoverage * 100)}</strong>
          </div>
          {!d.wetHands && d.poppyCoverage >= 0.44 && <Feedback tone="warn">Haşhaş tutmuyor; dökülüyor. El ve hamur kuruyken olmaz.</Feedback>}
          <Btn disabled={d.poppyCoverage < 0.2} onClick={() => next("mayalanma")}>
            Kalıba koy
          </Btn>
        </>
      )}

      {step === "mayalanma" && (
        <>
          <Tahsin>Oda sıcaklığında bekliyor. Çavdarın parmak testi yok; üstüne bak. Çatlaklar belirince dolaba alacağız.</Tahsin>
          <RyeLoafSvg look={{ rise, cracks, crust: 0, poppy: d.poppyCoverage }} className="w-full" />
          <div className="grid grid-cols-2 gap-2 rounded-2xl p-3 border" style={{ borderColor: C.line, background: C.card }}>
            <Readout value={`${t.toFixed(1)} sa`} label="süre" />
            <Readout value={cracks > 0.05 ? (cracks > 0.75 ? "derin" : "belirdi") : "yok"} label="çatlaklar" tone={cracks > 0.05 && cracks <= 0.75 ? "good" : cracks > 0.75 ? "bad" : "ink"} />
          </div>
          <Upcoming active={cracks > 0.05 && cracks <= 0.75}>
            {cracks <= 0.05 ? "Yüzey henüz düz. Genelde 1–2 saatte çatlar belirir." : cracks <= 0.75 ? "Çatlaklar belirdi: dolaba alma zamanı." : "Çatlaklar derinleşti; fazla bekledi."}
          </Upcoming>
          <ClockControls clock={proofClock} label="Kalıpları tezgâha koy, zamanı başlat" />
          {proofClock.started && (
            <>
              <p className="text-sm font-bold">Dolaba alırken:</p>
              <Choice
                value={d.covered ? "kapali" : "acik"}
                options={[
                  { v: "kapali", label: "Üstünü kapat", sub: "hava almasın" },
                  { v: "acik", label: "Açık bırak" },
                ]}
                onChange={(v) => set("covered", v === "kapali")}
              />
              <Btn
                onClick={() => {
                  set("proofHours", Math.max(0.1, t));
                  proofClock.pause();
                  hooks.unlock("olay_catlak", () => next("firin"));
                }}
              >
                Dolaba al
              </Btn>
            </>
          )}
        </>
      )}

      {step === "firin" && (
        <>
          <Tahsin>
            {!ovenClock.started
              ? "Sabah. Fırını 280 dereceye ısıttım. Kalıpları nasıl pişireceğiz? Benim düzenim: 220'de yükle, buhar ver, ısıtıcıları kapat; ara ara buharı bırak; iki saate yakın kalıptan çıkarıp ters çevir."
              : d.fallingOven
              ? "Isıtıcılar kapalı, fırın kendi kendine soğuyor; üst yanmadan içi pişiyor. Ara ara kapağı açıp buharı bırak."
              : "Fırın 220'de sabit. Uzun pişmede üste dikkat."}
          </Tahsin>
          <RyeLoafSvg look={{ rise, cracks, crust: crustNow, poppy: d.poppyCoverage, inTin: !d.flip }} className="w-full" />
          {!ovenClock.started ? (
            <>
              <Choice
                value={d.fallingOven ? "dusen" : "sabit"}
                options={[
                  { v: "dusen", label: "220'de yükle, ısıtıcıları kapat", sub: "düşen fırın · Tahsin" },
                  { v: "sabit", label: "220'de sabit pişir" },
                ]}
                onChange={(v) => set("fallingOven", v === "dusen")}
              />
              <Choice
                value={d.steamAtLoad ? "buhar" : "yok"}
                options={[
                  { v: "buhar", label: "Yüklerken buhar ver", sub: "Tahsin" },
                  { v: "yok", label: "Buharsız" },
                ]}
                onChange={(v) => set("steamAtLoad", v === "buhar")}
              />
              <ClockControls clock={ovenClock} label="Kalıpları koy, kapağı kapat" />
            </>
          ) : (
            <>
              <ClockControls clock={ovenClock} />
              <Upcoming active={t >= 100 && !d.flip}>
                {t < 100 ? "İç yavaş ısınıyor; arada bir buharı bırak. ~100. dakikadan sonra kalıptan çıkarıp ters çevir." : !d.flip ? "Kalıptan çıkarıp ters çevirme zamanı." : "Alt kabuk kuruyor; birkaç dakika sonra çıkar."}
              </Upcoming>
              <div className="grid grid-cols-3 gap-2 rounded-2xl p-3 border" style={{ borderColor: C.line, background: C.card }}>
                <Readout value={`${t} dk`} label="süre" />
                <Readout value={`${Math.round(ovenCore)}°`} label="iç sıcaklık" tone={ovenCore >= 96 ? "good" : "ink"} />
                <Readout value={`${d.vents}`} label="buhar tahliyesi" />
              </div>
              {ovenEvents.length > 0 && (
                <ol className="space-y-1">
                  {ovenEvents.map((e) => (
                    <li key={e.key} className="flex items-center gap-2 text-sm font-semibold">
                      <span className="w-2 h-2 rounded-full" style={{ background: C.accent }} />
                      {e.label}
                    </li>
                  ))}
                </ol>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Btn
                  variant="ghost"
                  onClick={() => {
                    set("vents", d.vents + 1);
                    sfx.hiss();
                  }}
                >
                  Kapağı aç, buharı bırak
                </Btn>
                <Btn
                  variant={d.flip ? "dark" : "ghost"}
                  disabled={d.flip || t < 60}
                  onClick={() => {
                    set("flip", true);
                    sfx.creak();
                    buzz(25);
                  }}
                >
                  {d.flip ? "Ters çevrildi ✓" : "Kalıptan çıkar, ters çevir"}
                </Btn>
              </div>
              <Btn
                onClick={() => {
                  set("bakeMinutes", t);
                  ovenClock.pause();
                  sfx.ding(ovenCore >= 96);
                  hooks.unlock("olay_dusen_firin", () => next("dinlenme"));
                }}
              >
                Fırından çıkar, tel rafa
              </Btn>
            </>
          )}
        </>
      )}

      {step === "dinlenme" && (
        <>
          <Tahsin>Oda sıcaklığına inince streç filme sarıyorum. Ne zaman keseceğiz?</Tahsin>
          <Choice
            value={d.restHours}
            options={[
              { v: 3, label: "3 saat sonra" },
              { v: 24, label: "1 gün", sub: "en az" },
              { v: 48, label: "2 gün", sub: "Tahsin" },
            ]}
            onChange={(v) => set("restHours", v)}
          />
          <Btn disabled={d.restHours === 0} onClick={() => next("sonuc")}>
            Bıçağı al
          </Btn>
        </>
      )}

      {step === "sonuc" && final && (
        <RyeResultView
          r={final}
          onRecord={() => {
            if (recorded) return;
            setRecorded(true);
            onDone(final.result.scores.toplam);
          }}
        />
      )}

      {step !== "haslama" && (
        <div className="flex justify-center">
          <LensButton onClick={() => setLens(true)} />
        </div>
      )}
      <LensSheet
        open={lens}
        onClose={() => setLens(false)}
        samples={lensSamples.length ? lensSamples : preview.samples.slice(0, 1)}
        startIndex={Math.max(0, lensSamples.length - 1)}
        title="Çavdarın içi"
        onEntityTap={(k) => {
          const c = cardForEntity(k);
          if (c) hooks.unlock(c.id);
        }}
      >
        <p className="text-sm leading-relaxed">
          Gluten ağı yok: yapıyı suyu sünger gibi tutan pentozan jeli taşır. Bol laktik bakteri asidi pH&apos;ı düşürür; fırında amilaz makaslarını
          frenleyen bu asittir.
        </p>
      </LensSheet>
    </div>
  );
}

function RyeResultView({ r, onRecord }: { r: ReturnType<typeof simulateRye>; onRecord: () => void }) {
  const [cut, setCut] = useState(false);
  const x = r.result;
  useEffect(() => onRecord(), [onRecord]);
  return (
    <div className="space-y-4">
      {!cut ? (
        <>
          <RyeLoafSvg look={{ rise: Math.min(1.1, x.proof * 0.9), cracks: 0.6, crust: x.crust, poppy: 0.9, inTin: false }} className="w-full" />
          <Btn
            onClick={() => {
              sfx.slice();
              buzz(30);
              setCut(true);
            }}
          >
            Kes
          </Btn>
        </>
      ) : (
        <>
          <RyeCrumbSvg gummy={x.gummy} crust={x.crust} className="w-full" />
          <div className="text-center space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: C.accent }}>
              Gece Yarısı
            </p>
            <h2 className="text-4xl font-semibold" style={serif}>
              {x.title}
            </h2>
            <p className="text-5xl font-bold" style={mono}>
              {x.scores.toplam}
              <span className="text-xl" style={{ color: C.soft }}>
                /100
              </span>
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["Şekil", x.scores.kabarma],
                ["İç", x.scores.ic],
                ["Kabuk", x.scores.kabuk],
                ["Lezzet", x.scores.lezzet],
              ] as [string, number][]
            ).map(([k, v]) => (
              <div key={k} className="rounded-2xl border p-2" style={{ borderColor: C.line, background: C.card }}>
                <div className="text-xl font-bold" style={mono}>
                  {v}
                </div>
                <div className="text-xs" style={{ color: C.soft }}>
                  {k}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="font-bold" style={mono}>
                pH {x.pH.toFixed(2).replace(".", ",")}
              </div>
              <div style={{ color: C.soft }}>fırına girerken</div>
            </div>
            <div>
              <div className="font-bold" style={mono}>
                %{Math.round(x.starchAttack * 100)}
              </div>
              <div style={{ color: C.soft }}>nişasta saldırısı</div>
            </div>
            <div>
              <div className="font-bold" style={mono}>
                {x.coreC}°
              </div>
              <div style={{ color: C.soft }}>iç sıcaklık</div>
            </div>
          </div>
          {x.tips.length > 0 ? (
            x.tips.map((k) => <Tahsin key={k}>{RYE_TIP_TEXT[k]}</Tahsin>)
          ) : (
            <Tahsin>Bu benim ekmeğim gibi olmuş. İnce dilimle, üstüne tereyağı; tek başına bir öğün.</Tahsin>
          )}
          <section className="rounded-3xl border-2 p-4 space-y-3" style={{ borderColor: C.ink, background: C.card }}>
            <h3 className="text-xl font-semibold" style={serif}>
              Ekmeğinin biyografisi
            </h3>
            <BiographyChart run={asBakeRun(r)} />
          </section>
        </>
      )}
    </div>
  );
}
