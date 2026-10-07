"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BakeDecisions, BakeResult, LevelProfile } from "@/types/game";
import { TIP_TEXT } from "@/lib/game/sim";
import { sfx, buzz } from "@/lib/game/audio";
import { renderShareCard, shareOrDownload } from "@/lib/game/shareCard";
import { CrumbSvg, LoafSvg } from "../BreadSvg";
import { Btn, C, Tahsin, mono, serif } from "../ui";

interface Props {
  d: BakeDecisions;
  r: BakeResult;
  level: LevelProfile;
  best: number | undefined;
  nextUnlocked: LevelProfile | null;
  notesCollected: number;
  notesTotal: number;
  onReplay: () => void;
  onNext: () => void;
  onNotebook: () => void;
}

function Row({ k, you, master, ok }: { k: string; you: string; master: string; ok: boolean }) {
  return (
    <tr className="border-t" style={{ borderColor: C.line }}>
      <td className="py-2 pr-2 text-sm">{k}</td>
      <td className="py-2 px-2 text-sm text-right font-bold" style={{ ...mono, color: ok ? C.good : C.accent }}>
        {you} {ok ? "✓" : "✗"}
      </td>
      <td className="py-2 pl-2 text-sm text-right" style={{ ...mono, color: C.soft }}>
        {master}
      </td>
    </tr>
  );
}

export function ResultStage({ d, r, level, best, nextUnlocked, notesCollected, notesTotal, onReplay, onNext, onNotebook }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [count, setCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  const loafRef = useRef<HTMLDivElement>(null);
  const crumbRef = useRef<HTMLDivElement>(null);
  const stars = r.scores.toplam >= 90 ? 3 : r.scores.toplam >= 75 ? 2 : r.scores.toplam >= 55 ? 1 : 0;

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      sfx.slice();
      setRevealed(true);
    }, 900);
    return () => window.clearTimeout(t1);
  }, []);
  useEffect(() => {
    if (!revealed) return;
    const iv = window.setInterval(() => {
      setCount((c) => {
        if (c >= r.scores.toplam) {
          window.clearInterval(iv);
          return c;
        }
        return c + 1;
      });
    }, 18);
    const t = window.setTimeout(() => {
      sfx.ding(stars >= 2);
      if (stars >= 2) buzz([30, 40, 30, 40, 80]);
    }, 18 * r.scores.toplam + 100);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(t);
    };
  }, [revealed, r.scores.toplam, stars]);

  const share = async () => {
    setSharing(true);
    try {
      const blob = await renderShareCard({
        loaf: loafRef.current?.querySelector("svg") ?? null,
        crumb: crumbRef.current?.querySelector("svg") ?? null,
        title: r.title,
        total: r.scores.toplam,
        levelName: level.name,
        scores: r.scores,
      });
      if (blob) await shareOrDownload(blob, `EkmekLab'da "${r.title}" çıktı (${r.scores.toplam}/100). Sen de dene: ekmeklab.tr/laboratuvar`);
    } finally {
      setSharing(false);
    }
  };

  const folds = d.foldTimes.filter((t) => t <= d.bulkHours).length;
  const steamMin = d.steam ? Math.min(d.bakeMinutes, d.ventMinute ?? d.bakeMinutes) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: C.accent }}>
          {level.name} · senin ekmeğin
        </p>
        <h2
          className="text-5xl font-semibold leading-tight transition-all duration-700"
          style={{ ...serif, opacity: revealed ? 1 : 0, transform: revealed ? "none" : "translateY(10px)" }}
        >
          {r.title}
        </h2>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold" style={mono}>
            {count} / 100
          </span>
          <span className="text-2xl" aria-label={`${stars} yıldız`}>
            {"★".repeat(stars)}
            <span style={{ color: C.line }}>{"★".repeat(3 - stars)}</span>
          </span>
        </div>
        {best !== undefined && r.scores.toplam > best && revealed && (
          <p className="text-sm font-bold" style={{ color: C.good }}>
            Yeni rekor! (önceki {best})
          </p>
        )}
      </div>

      <div ref={loafRef} className="relative">
        <LoafSvg look={r} crackles={r.crust >= 0.45 ? r.crust : 0} className="w-full" />
        {!revealed && <div className="absolute inset-x-[20%] top-[30%] h-[3px] rounded-full animate-[knife_.9s_ease-in-out]" style={{ background: C.ink }} />}
      </div>
      <div ref={crumbRef} className="transition-all duration-700" style={{ opacity: revealed ? 1 : 0, transform: revealed ? "none" : "scale(.94)" }}>
        <CrumbSvg look={r} className="w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["Kabarma", r.scores.kabarma],
            ["İç yapı", r.scores.ic],
            ["Kabuk", r.scores.kabuk],
            ["Lezzet", r.scores.lezzet],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-xl border p-3" style={{ borderColor: C.line, background: C.card }}>
            <div className="flex justify-between text-sm">
              <span>{k}</span>
              <span className="font-bold" style={mono}>
                {v}
              </span>
            </div>
            <div className="h-1.5 rounded-full mt-2" style={{ background: C.line }}>
              <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: revealed ? `${v}%` : 0, background: C.accent }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: C.line, background: C.card }}>
        <div className="text-sm font-bold">Aroma</div>
        {(
          [
            ["Laktik (yoğurt gibi yumuşak)", r.aroma.laktik],
            ["Asetik (sirke gibi keskin)", r.aroma.asetik],
            ["Kavrulmuş kabuk (Maillard)", r.aroma.kavrulmus],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="space-y-1">
            <div className="text-xs" style={{ color: C.soft }}>
              {k}
            </div>
            <div className="h-2 rounded-full" style={{ background: C.line }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(v * 100)}%`, background: C.ink }} />
            </div>
          </div>
        ))}
      </div>

      {r.tips.length > 0 ? (
        <div className="space-y-3">
          {r.tips.map((t) => (
            <Tahsin key={t}>{TIP_TEXT[t]}</Tahsin>
          ))}
        </div>
      ) : (
        <Tahsin>Valla bu ekmeği ben yapsam bu kadar olurdu. Eline sağlık usta!</Tahsin>
      )}

      <div className="rounded-2xl border p-4" style={{ borderColor: C.line, background: C.card }}>
        <div className="text-sm font-bold mb-1">Sen ve usta</div>
        <table className="w-full">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: C.soft }}>
              <th className="text-left font-semibold pb-1"> </th>
              <th className="text-right font-semibold pb-1">sen</th>
              <th className="text-right font-semibold pb-1">Tahsin</th>
            </tr>
          </thead>
          <tbody>
            <Row k="Maya saati" you={`${d.levainHours.toFixed(1)} sa`} master="4–5 sa" ok={d.levainHours >= 3.5 && d.levainHours <= 6.5} />
            <Row k="Maya oranı" you={`%${r.levainPct}`} master="%15–20" ok={r.levainPct >= 14 && r.levainPct <= 21} />
            <Row
              k="Su oranı"
              you={`%${r.hydration}`}
              master={`%${level.idealHydration[0]}–${level.idealHydration[1]}`}
              ok={r.hydration >= level.idealHydration[0] - 2 && r.hydration <= level.maxHydration + 1}
            />
            <Row k="Tuz" you={`%${r.saltPct}`} master="%2, sonda" ok={r.saltPct >= 1.6 && r.saltPct <= 2.4 && d.saltTiming === "son"} />
            <Row k="Hamur sıcaklığı" you={`${r.doughTemp}°`} master="27–28°" ok={r.doughTemp >= 26 && r.doughTemp <= 28.5} />
            <Row k="Katlama" you={`${folds}`} master="4–6" ok={folds >= 4 && folds <= 7} />
            <Row k="Fırına girerken olgunluk" you={`%${Math.round(r.proof * 100)}`} master="%85–120" ok={r.proof >= 0.85 && r.proof <= 1.2} />
            <Row k="Buharlı süre" you={`${steamMin} dk`} master="20 dk" ok={steamMin >= 15 && steamMin <= 25} />
            <Row k="Pişme" you={`${d.bakeMinutes} dk`} master="40–45 dk" ok={d.bakeMinutes >= 38 && d.bakeMinutes <= 48} />
            <Row
              k="Kesmeden önce"
              you={`${d.cutWaitHours} sa`}
              master={level.cutIdealHours >= 24 ? `${level.cutIdealHours / 24} gün` : `${level.cutIdealHours} sa`}
              ok={d.cutWaitHours >= level.cutIdealHours * 0.8}
            />
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <Btn onClick={share} disabled={sharing}>
          {sharing ? "Kart hazırlanıyor…" : "Ekmeğimi paylaş"}
        </Btn>
        {nextUnlocked && (
          <Btn variant="dark" onClick={onNext}>
            Yeni seviye açıldı: {nextUnlocked.name} ({nextUnlocked.rank}) →
          </Btn>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="ghost" onClick={onReplay}>
            Tekrar dene
          </Btn>
          <Btn variant="ghost" onClick={onNotebook}>
            Defter {notesCollected}/{notesTotal}
          </Btn>
        </div>
        <Link href="/" className="block text-center py-3 font-semibold underline" style={{ color: C.accent }}>
          Gerçeği 24 saat sürüyor. Bu sefer usta yapsın →
        </Link>
      </div>
      <style>{`@keyframes knife{from{transform:translateX(-60%);opacity:0}30%{opacity:1}to{transform:translateX(60%);opacity:0}}`}</style>
    </div>
  );
}
