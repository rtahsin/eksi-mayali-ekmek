"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { MicroEntityKind, MicroSnapshot } from "@/types/game";
import { MicroScope } from "./MicroScope";
import type { Magnification } from "./world";

const C = { paper: "#F6EEDF", card: "#FBF6EC", ink: "#3B1E1A", soft: "#6E5148", line: "#E2D3BD", accent: "#B4532A" };

/** 10⁸ gibi üslü gösterim */
function sci(log: number) {
  if (log < 1) return "yok";
  const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const n = Math.round(log);
  return `10${String(n)
    .split("")
    .map((c) => sup[Number(c)])
    .join("")}`;
}

function Readout({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="w-2.5 h-2.5 rounded-full shrink-0 border" style={{ background: dot, borderColor: C.ink }} />
      <span style={{ color: C.soft }}>{label}</span>
      <span className="ml-auto font-bold tabular-nums">{value}</span>
    </div>
  );
}

export function LensButton({ onClick, label = "İçine bak" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-full border-2 font-bold active:scale-[0.98] transition-transform"
      style={{ borderColor: C.ink, background: C.card, color: C.ink }}
    >
      <span aria-hidden className="text-lg">
        🔬
      </span>
      {label}
    </button>
  );
}

export interface LensSheetProps {
  open: boolean;
  onClose: () => void;
  snapshot?: MicroSnapshot;
  samples?: MicroSnapshot[];
  startIndex?: number;
  title?: string;
  children?: React.ReactNode;
  onEntityTap?: (kind: MicroEntityKind) => void;
  focus?: MicroEntityKind[];
  magnification?: Magnification;
}

/** Büyüteç sayfası: mercek, canlı göstergeler, zaman kaydırıcısı ve açıklama alanı */
export function LensSheet({ open, onClose, snapshot, samples, startIndex, title, children, onEntityTap, focus, magnification }: LensSheetProps) {
  const [idx, setIdx] = useState(startIndex ?? 0);
  const [mag, setMag] = useState<Magnification>(magnification ?? "x400");
  useEffect(() => {
    if (open) setIdx(startIndex ?? (samples ? samples.length - 1 : 0));
  }, [open, startIndex, samples]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const snap = useMemo(() => (samples && samples.length ? samples[Math.min(idx, samples.length - 1)] : snapshot), [samples, idx, snapshot]);
  if (!open || !snap) return null;
  const lab = Math.log10(10 ** snap.pop.lacS + 10 ** snap.pop.lacP);
  const t0 = samples?.[0]?.t ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title ?? "Lab Büyüteci"}>
      <button type="button" aria-label="Kapat" className="absolute inset-0" style={{ background: "rgba(59,30,26,0.45)" }} onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[94vh] overflow-y-auto rounded-t-[28px] px-5 pt-4 pb-8 space-y-4" style={{ background: C.paper, color: C.ink }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: C.accent }}>
              Lab Büyüteci
            </p>
            <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
              {title ?? "Hamurun içi"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-3xl px-3 leading-none" aria-label="Kapat">
            ×
          </button>
        </div>

        <MicroScope snapshot={snap} magnification={mag} focus={focus} onEntityTap={onEntityTap} />

        <div className="flex justify-center gap-2">
          {(["x100", "x400", "x1000"] as Magnification[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMag(m)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border"
              style={{ borderColor: C.ink, background: mag === m ? C.ink : "transparent", color: mag === m ? C.paper : C.ink }}
            >
              {m.replace("x", "×")}
            </button>
          ))}
        </div>

        {samples && samples.length > 1 && (
          <label className="block">
            <span className="text-xs font-bold" style={{ color: C.soft }}>
              Zaman: {(snap.t - t0).toFixed(1).replace(".", ",")} saat
            </span>
            <input
              type="range"
              min={0}
              max={samples.length - 1}
              value={Math.min(idx, samples.length - 1)}
              onChange={(e) => setIdx(Number(e.target.value))}
              className="w-full accent-[#B4532A]"
            />
          </label>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-2xl border p-3" style={{ borderColor: C.line, background: C.card }}>
          <Readout label="Maya" value={`${sci(snap.pop.yst)}/g`} dot="#D9A441" />
          <Readout label="Laktik bakteri" value={`${sci(lab)}/g`} dot="#B4532A" />
          {snap.pop.ent > 3 && <Readout label="Enterobakteri" value={`${sci(snap.pop.ent)}/g`} dot="#7A8450" />}
          <Readout label="Şeker" value={`%${Math.round(snap.sugar * 100)}`} dot="#EAD3A2" />
          <Readout label={snap.matrix === "cavdar" ? "Pentozan jeli" : "Gluten ağı"} value={`%${Math.round(snap.glutenDev * (1 - snap.glutenDamage) * 100)}`} dot="#8A5A3C" />
          <Readout label="Hacim" value={`+%${Math.round(snap.gas * 100)}`} dot="#FFFDF7" />
          <Readout label="Laktik / asetik" value={`${Math.round(snap.lactic)} / ${Math.round(snap.acetic)}`} dot="#C0583A" />
          <Readout label="Amilaz · proteaz" value={`${Math.round(snap.amylase * 100)} · ${Math.round(snap.protease * 100)}`} dot="#7B4B6A" />
        </div>

        <p className="text-xs text-center" style={{ color: C.soft }}>
          Bir canlıya ya da yapıya dokun: adını gör, defterine ekle.
        </p>
        {children}
      </div>
    </div>
  );
}
