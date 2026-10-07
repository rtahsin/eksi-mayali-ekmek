"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { FeedRatio, FlourKind, StarterDay, StarterProfile, StarterSmell, StarterSpot, StarterStageKey, StarterState } from "@/types/game";
import { FLOURS, SPOT_TEMP } from "@/lib/game/engine/params";
import { newStarter, runStarterDay, starterProfile } from "@/lib/game/engine/starter";
import { cardForEntity } from "@/lib/game/content/cards";
import { sfx, buzz } from "@/lib/game/audio";
import { ClockArt, JarArt } from "../art";
import { LensButton, LensSheet } from "../micro/LensSheet";
import { Btn, C, Feedback, StageTitle, Tahsin, serif } from "../ui";

/**
 * Bölüm 1 — Maya: görünmeyenleri yakala.
 * A) Mikroplar nereden gelir  B) Kavanoz  C) Gün gün (sahte kabarma, sessizlik, mayaların gelişi)  D) İsim + karne
 * Hesap: engine/starter.ts; bilgi: docs/BILIM.md §2–3.
 */

export interface ChapterHooks {
  /** Tahmin sorusu (yoksa ya da cevaplandıysa doğrudan devam eder) */
  ask: (at: string, then: () => void) => void;
  /** Defter kartı aç (yeniyse gösterir) */
  unlock: (cardId: string, then?: () => void) => void;
}

const SMELL: Record<StarterSmell, string> = {
  un: "Islak un",
  peynir: "Peynirimsi, keskin",
  kusmuk: "Ekşimiş süt, kötü",
  yogurt: "Yoğurt gibi",
  sirke: "Sirke gibi keskin",
  meyve: "Meyvemsi, hoş ekşi",
  aseton: "Aseton / alkol",
  elma: "Yeşil elma, ekşi",
  kuf: "Küf",
};

const STAGE_LINE: Record<StarterStageKey, string> = {
  uyku: "Henüz bir şey yok gibi. Un ve su yeni tanışıyor; undan gelen mikroplar uyanıyor.",
  sahte_kabarma: "Vay! Kavanoz kabardı ama bu koku… Bu gaz mayadan değil; enterobakterilerin şenliği. Sevinme, bekle.",
  sessizlik: "Sessizlik. Asit yükseliyor, ilk gelenler eleniyor. Çoğu kişi mayayı burada atar. Biz atmıyoruz.",
  uyaniyor: "Kabarcıklar geri geliyor ve koku tatlanıyor. Mayalar sayıca artıyor.",
  hazir: "İşte bu! Beslemeden birkaç saat sonra iki katına çıkıyor, kokusu meyvemsi. Mayan hazır.",
  ac: "Aç kalmış: üstünde gri bir sıvı (hooch) var, aseton kokuyor. Bu alkol; dök ve besle.",
  kuf: "Küf! Renkli, tüylü lekeler. Bunu kurtaramayız; at ve baştan başla.",
};

const SPOT_LABEL: Record<StarterSpot, string> = { serin: "Serin köşe", tezgah: "Tezgâh", ilik: "Fırın yanı" };
const FLOUR_NOTE: Record<FlourKind, string> = {
  beyaz: "Az kepek, az mikrop, az besin. Yavaş başlar.",
  tam_bugday: "Kepekli: daha çok mikrop, vitamin ve mineral.",
  tam_cavdar: "En zengini: bol şeker, enzim ve mikrop. En hızlısı.",
};

/** Doğa sahnesi: dokunulacak noktalar */
const HOTSPOTS: { id: string; x: number; y: number; label: string; text: string; card: string }[] = [
  { id: "basak", x: 22, y: 38, label: "Buğday başağı", text: "Mikropların asıl yolu buradan geçer: tahıl tanesinin yüzeyinden una. Ekşi mayanın kurucuları undan gelir.", card: "l_plantarum" },
  { id: "bocek", x: 68, y: 30, label: "Un böceği", text: "Ekşi mayanın simge bakterisi F. sanfranciscensis un böceklerinin bağırsağında yaşar; depolanan tahıla onlarla yayılır.", card: "f_sanfranciscensis" },
  { id: "toprak", x: 40, y: 80, label: "Toprak", text: "Topraktaki ve bitkilerdeki bakteriler başağa, oradan una geçer. Bazıları kavanozda ilk gün patlayıp elenecek.", card: "enterobakteri" },
  { id: "el", x: 82, y: 70, label: "Fırıncının eli", text: "Eller de mikrop taşır; ama kavanozdaki topluluğa katkısı undan çok daha küçüktür.", card: "oncu_lab" },
  { id: "hava", x: 50, y: 12, label: "Hava", text: "Havada çoğunlukla küf sporu var. 'Maya havadan yakalanır' bir efsane.", card: "efsane_hava" },
];

function NatureScene({ seen, onTap }: { seen: Set<string>; onTap: (id: string) => void }) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden border-2" style={{ borderColor: C.ink, background: "linear-gradient(#F6EEDF 0 55%, #E8D6AE 55%)" }}>
      <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="330" cy="50" r="24" fill="#F3D27A" stroke="#3B1E1A" strokeWidth="2" />
        {Array.from({ length: 14 }, (_, i) => (
          <g key={i} transform={`translate(${30 + i * 14} ${165 - (i % 3) * 6})`}>
            <path d="M0 0 V-70" stroke="#8A6A2E" strokeWidth="2" />
            {Array.from({ length: 6 }, (_, k) => (
              <ellipse key={k} cx={k % 2 ? 4 : -4} cy={-70 - k * 7} rx="3.5" ry="6" fill="#D9B465" stroke="#3B1E1A" strokeWidth="1.2" />
            ))}
          </g>
        ))}
        <path d="M0 240 Q 100 225 200 240 T 400 238 V300 H0 Z" fill="#B88C5A" stroke="#3B1E1A" strokeWidth="2" />
        {[60, 140, 210, 300].map((x) => (
          <circle key={x} cx={x} cy={262} r="3" fill="#3B1E1A" opacity="0.4" />
        ))}
        <g transform="translate(272 92)">
          <ellipse cx="0" cy="0" rx="10" ry="6" fill="#5C3A26" stroke="#3B1E1A" strokeWidth="1.5" />
          <path d="M-6 -4 l-6 -6 M6 -4 l6 -6 M-8 2 l-6 4 M8 2 l6 4" stroke="#3B1E1A" strokeWidth="1.5" />
        </g>
        <path d="M300 230 q 10 -40 30 -50 q 18 -8 26 6 q 6 12 -6 22 l 10 30 Z" fill="#EBC9A3" stroke="#3B1E1A" strokeWidth="2" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${170 + i * 40} 30 q 10 -8 20 0`} fill="none" stroke="#6E5148" strokeWidth="1.5" opacity="0.6" />
        ))}
      </svg>
      {HOTSPOTS.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => onTap(h.id)}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-black"
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            borderColor: C.ink,
            background: seen.has(h.id) ? C.good : "#FBF6ECE6",
            color: seen.has(h.id) ? "#fff" : C.ink,
            boxShadow: seen.has(h.id) ? "none" : "0 0 0 6px rgba(180,83,42,0.25)",
          }}
          aria-label={h.label}
        >
          {seen.has(h.id) ? "✓" : "?"}
        </button>
      ))}
    </div>
  );
}

function OptionCard({ active, title, sub, onClick }: { active: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border-2 p-3 transition-colors"
      style={{ borderColor: active ? C.ink : C.line, background: active ? C.card : "transparent" }}
    >
      <div className="font-bold">{title}</div>
      <div className="text-sm" style={{ color: C.soft }}>
        {sub}
      </div>
    </button>
  );
}

const MAX_DAYS = 14;

export function StarterChapter({ hooks, onDone }: { hooks: ChapterHooks; onDone: (p: StarterProfile) => void }) {
  const [scene, setScene] = useState<"doga" | "kavanoz" | "gunler" | "isim">("doga");
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [tip, setTip] = useState<string | null>(null);
  const [flour, setFlour] = useState<FlourKind>("tam_bugday");
  const [spot, setSpot] = useState<StarterSpot>("tezgah");
  const [feed, setFeed] = useState<FeedRatio | "yok">("1:1:1");
  const [state, setState] = useState<StarterState | null>(null);
  const [days, setDays] = useState<StarterDay[]>([]);
  const [hour, setHour] = useState(24);
  const [lens, setLens] = useState(false);
  const [name, setName] = useState("");
  const [askedFirst, setAskedFirst] = useState(false);

  const today = days[days.length - 1];

  // Bölüme girerken ilk tahmin
  useEffect(() => {
    if (askedFirst) return;
    setAskedFirst(true);
    hooks.ask("maya:kaynak", () => undefined);
  }, [askedFirst, hooks]);

  // Günün 24 saati birkaç saniyede akar
  useEffect(() => {
    if (!today) return;
    setHour(0);
    const iv = window.setInterval(() => setHour((h) => (h >= 24 ? 24 : h + 1)), 110);
    return () => window.clearInterval(iv);
  }, [today]);

  // Gün bitince, ilk kez görülen evrede tahmin sorusu
  const [askedStages, setAskedStages] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!today || hour < 24) return;
    const at = today.stage === "sahte_kabarma" ? "maya:sahte_kabarma" : today.stage === "sessizlik" ? "maya:sessizlik" : null;
    if (at && !askedStages.has(at)) {
      setAskedStages((s) => new Set(s).add(at));
      hooks.ask(at, () => undefined);
    }
    if (today.stage === "hazir") sfx.ding(true);
  }, [today, hour, askedStages, hooks]);

  const runDay = () => {
    sfx.unlock();
    const st = state ?? newStarter(flour);
    const r = runStarterDay(st, { spot, feed: days.length === 0 ? "1:1:1" : feed });
    setState(r.next);
    setDays((d) => [...d, r.day]);
    sfx.pour(1.2);
    buzz(15);
  };

  const restart = () => {
    setState(null);
    setDays([]);
    setScene("kavanoz");
  };

  const readyDays = days.filter((d) => d.stage === "hazir").length;
  const profile = useMemo(() => (state ? starterProfile(name, state, days) : null), [state, days, name]);
  const rise = today ? today.rise[Math.min(24, hour)] : 0;

  return (
    <div className="space-y-5">
      <StageTitle kicker="Bölüm" n={1} title="Maya: görünmeyenleri yakala" sub="Mayayı satın alamazsın; onu yakalarsın." />

      {scene === "doga" && (
        <>
          <Tahsin>Mayanın canlıları bir yerden geliyor. Noktalara dokun; izlerini sür. En az üçünü bul.</Tahsin>
          <NatureScene
            seen={seen}
            onTap={(id) => {
              const h = HOTSPOTS.find((x) => x.id === id);
              if (!h) return;
              sfx.pat(0.6);
              setSeen((s) => new Set(s).add(id));
              setTip(`${h.label}: ${h.text}`);
              hooks.unlock(h.card);
            }}
          />
          {tip && <Feedback tone="good">{tip}</Feedback>}
          <Btn disabled={seen.size < 3} onClick={() => setScene("kavanoz")}>
            {seen.size < 3 ? `${seen.size}/3 iz` : "Kavanoza geç"}
          </Btn>
        </>
      )}

      {scene === "kavanoz" && (
        <>
          <button type="button" onClick={() => setScene("doga")} className="text-sm font-semibold min-h-[44px]" style={{ color: C.soft }}>
            ← Mikropların izine dön
          </button>
          <Tahsin>Bir kavanoz, un ve su. Hangi unla başlıyoruz, kavanoz nerede duracak?</Tahsin>
          <div className="space-y-2">
            {(Object.keys(FLOURS) as FlourKind[]).map((f) => (
              <OptionCard key={f} active={flour === f} title={FLOURS[f].label} sub={FLOUR_NOTE[f]} onClick={() => setFlour(f)} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(SPOT_TEMP) as StarterSpot[]).map((s) => (
              <OptionCard key={s} active={spot === s} title={SPOT_LABEL[s]} sub={`${SPOT_TEMP[s]} °C`} onClick={() => setSpot(s)} />
            ))}
          </div>
          <Btn
            onClick={() => {
              setScene("gunler");
              runDay();
            }}
          >
            Un + su: karıştır
          </Btn>
        </>
      )}

      {scene === "gunler" && today && (
        <>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Kavanozu boşaltıp baştan başlansın mı? (Un ve yer seçimine dönersin)")) restart();
            }}
            className="text-sm font-semibold min-h-[44px]"
            style={{ color: C.soft }}
          >
            ↺ Baştan başla
          </button>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold" style={serif}>
              {today.day}. gün
            </h3>
            <span className="text-sm font-bold" style={{ color: C.soft }}>
              {SPOT_LABEL[today.decision.spot]} · {SPOT_TEMP[today.decision.spot]} °C
            </span>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1 h-64">
              <JarArt level={Math.min(1, 0.35 + 0.3 * rise)} dome={Math.min(1, rise)} fallen={hour > today.peakHour + 3 && rise < today.peakRise - 0.15} bubbles={Math.min(1, rise * 0.8)} band={0.35} />
            </div>
            <div className="w-24 space-y-2 text-center">
              <ClockArt hours={hour} />
              <div className="text-xs font-bold">+%{Math.round(rise * 100)}</div>
              <div className="text-xs" style={{ color: C.soft }}>
                Koku: {SMELL[today.smell]}
              </div>
            </div>
          </div>
          {hour >= 24 && (
            <>
              <Tahsin>{STAGE_LINE[today.stage]}</Tahsin>
              {today.hooch && today.stage !== "ac" && (
                <Feedback tone="warn">Üstte biraz gri sıvı (hooch) birikti: maya günde bir beslemeye göre fazla sıcakta. Serine al ya da daha sık besle.</Feedback>
              )}
              <div className="flex justify-center">
                <LensButton onClick={() => setLens(true)} label="Kavanozun içine bak" />
              </div>
              {today.stage === "kuf" ? (
                <Btn onClick={restart}>Baştan başla</Btn>
              ) : (
                <>
                  <p className="text-sm font-bold">Yarın sabah:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["1:1:1", "1:2:2", "1:5:5", "yok"] as const).map((f) => (
                      <OptionCard key={f} active={feed === f} title={f === "yok" ? "Besleme" : f} sub={f === "yok" ? "bekle" : f === "1:1:1" ? "Tahsin'in" : "daha seyrek"} onClick={() => setFeed(f)} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(SPOT_TEMP) as StarterSpot[]).map((s) => (
                      <OptionCard key={s} active={spot === s} title={SPOT_LABEL[s]} sub={`${SPOT_TEMP[s]} °C`} onClick={() => setSpot(s)} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: C.soft }}>
                    1:1:1 = 1 ölçü eski maya + 1 un + 1 su; artanı dökülür. Dökmek, asidi seyreltip yeni yemeğe yer açar.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Btn variant="ghost" disabled={days.length >= MAX_DAYS} onClick={runDay}>
                      Ertesi gün →
                    </Btn>
                    <Btn disabled={readyDays === 0} onClick={() => setScene("isim")}>
                      {readyDays > 0 ? "Mayam hazır" : "Henüz hazır değil"}
                    </Btn>
                  </div>
                  {days.length >= MAX_DAYS && readyDays === 0 && (
                    <Feedback tone="warn">İki hafta oldu ve maya hâlâ kalkmıyor. Tam tahıllı unla ve tezgâhta yeniden dene.</Feedback>
                  )}
                </>
              )}
            </>
          )}
          <LensSheet
            open={lens}
            onClose={() => setLens(false)}
            samples={today.hours}
            startIndex={24}
            title={`${today.day}. gün · kavanozun içi`}
            onEntityTap={(k) => {
              const c = cardForEntity(k);
              if (c) hooks.unlock(c.id);
            }}
          >
            <p className="text-sm leading-relaxed">
              Kaydırıcıyla günün saatlerinde gez. Zeytin yeşili kamçılılar enterobakteriler, terakota çubuklar laktik bakteriler, bal rengi ovaller
              mayalar. pH düştükçe kimin çekildiğine bak.
            </p>
          </LensSheet>
        </>
      )}

      {scene === "isim" && profile && (
        <>
          <Tahsin>Bir canlıya baktın, büyüttün. Artık bir adı olmalı. Bizim mahallede mayalara isim koymak gelenektir.</Tahsin>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder="Mayanın adı"
            className="w-full min-h-[52px] px-4 rounded-2xl border-2 text-lg font-semibold"
            style={{ borderColor: C.ink, background: C.card }}
          />
          <div className="flex flex-wrap gap-2">
            {["Hamurabi", "Fokur", "Ekşi Bey", "Maya Hanım", "Kabarcık"].map((n) => (
              <button key={n} type="button" onClick={() => setName(n)} className="px-3 py-1.5 rounded-full border text-sm font-bold" style={{ borderColor: C.line }}>
                {n}
              </button>
            ))}
          </div>
          <div className="rounded-3xl border-2 p-4 space-y-2" style={{ borderColor: C.ink, background: C.card }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: C.accent }}>
              Maya karnesi
            </p>
            <p className="text-2xl font-semibold" style={serif}>
              {name.trim() || "Adsız maya"}
            </p>
            <ul className="text-sm space-y-1">
              <li>Un: {FLOURS[profile.flour].label}</li>
              <li>Hazır olduğu gün: {profile.readyDay ?? "—"}</li>
              <li>Canlılık: %{Math.round(profile.vigor * 100)}</li>
              <li>Ekşilik: %{Math.round(profile.acidity * 100)} · asetik payı %{Math.round(profile.aceticShare * 100)}</li>
              <li>
                Her {profile.labPerYeast} bakteriye 1 maya hücresi
                <span style={{ color: C.soft }}> (olgun mayalarda 10–100)</span>
              </li>
            </ul>
          </div>
          <Btn
            onClick={() => {
              sfx.ding(true);
              hooks.unlock("olay_ardisiklik", () => onDone({ ...profile, name: name.trim() || "Adsız maya" }));
            }}
          >
            Mayamla ekmek yapmaya
          </Btn>
        </>
      )}
    </div>
  );
}
