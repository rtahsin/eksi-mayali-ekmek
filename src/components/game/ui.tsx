"use client";

import React, { useEffect, useState } from "react";
import type { ScienceNote } from "@/lib/game/science";

/** Oyunun krem paleti (docs/MARKA.md §8) */
export const C = {
  paper: "#F6EEDF",
  card: "#FBF6EC",
  ink: "#3B1E1A",
  soft: "#6E5148",
  line: "#E2D3BD",
  accent: "#B4532A",
  good: "#5E7F3E",
  warn: "#C8862C",
  bad: "#9B2C1F",
  dough: "#EAD3A2",
};
export const serif = { fontFamily: "var(--font-fraunces)" } as const;
export const mono = { fontFamily: "var(--font-jetbrains-mono)" } as const;

/** Tahsin konuşuyor: yazı harf harf akar, dokununca tamamlanır */
export function Tahsin({ children, speed = 18 }: { children: string; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = window.setInterval(() => setN((x) => (x >= children.length ? x : x + 2)), speed);
    return () => window.clearInterval(t);
  }, [children, speed]);
  const done = n >= children.length;
  return (
    <button type="button" onClick={() => setN(children.length)} className="flex gap-3 items-start text-left w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/logo.png" alt="" className="w-11 h-11 shrink-0 rounded-full" />
      <span
        className="relative rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed border shadow-sm min-h-[52px] w-full"
        style={{ background: C.card, borderColor: C.line, color: C.ink }}
      >
        <span className="block text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.accent }}>
          Tahsin
        </span>
        {children.slice(0, n)}
        {!done && <span className="inline-block w-1.5 h-4 align-middle ml-0.5 animate-pulse" style={{ background: C.accent }} />}
      </span>
    </button>
  );
}

export function Btn({
  children,
  onClick,
  disabled,
  variant = "solid",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "solid" | "ghost" | "dark";
  className?: string;
}) {
  const style =
    variant === "solid"
      ? { background: C.accent, color: "#fff", boxShadow: "0 6px 0 #7E3A1D" }
      : variant === "dark"
      ? { background: C.ink, color: C.paper, boxShadow: "0 6px 0 #1F0F0C" }
      : { border: `2px solid ${C.ink}`, color: C.ink, background: "transparent" };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-2xl text-base font-bold transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:active:translate-y-0 ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

/** Bölgeli gösterge: hedef aralık yeşil */
export function Gauge({ value, max, target, label, unit }: { value: number; max: number; target: [number, number]; label: string; unit: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const inTarget = value >= target[0] && value <= target[1];
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="font-bold" style={{ ...mono, color: inTarget ? C.good : C.accent }}>
          {Math.round(value)} {unit}
        </span>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: C.line }}>
        <div
          className="absolute inset-y-0 rounded-full"
          style={{ left: `${(target[0] / max) * 100}%`, width: `${((target[1] - target[0]) / max) * 100}%`, background: "#9DB47E66" }}
        />
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75" style={{ width: `${pct * 100}%`, background: inTarget ? C.good : C.accent }} />
      </div>
    </div>
  );
}

export function Readout({ value, label, tone = "ink" }: { value: string; label: string; tone?: "ink" | "good" | "bad" | "warn" }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.bad : tone === "warn" ? C.warn : C.ink;
  return (
    <div className="text-center">
      <div className="text-2xl font-bold" style={{ ...mono, color }}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider" style={{ color: C.soft }}>
        {label}
      </div>
    </div>
  );
}

export function Feedback({ tone, children }: { tone: "good" | "warn" | "bad"; children: React.ReactNode }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.bad : C.warn;
  return (
    <div className="rounded-xl px-4 py-2.5 text-sm font-semibold text-center border-2" style={{ borderColor: color, color, background: `${color}12` }}>
      {children}
    </div>
  );
}

/** Kazanılan bilim notu kartı */
export function NoteCard({ note, total, collected, onClose }: { note: ScienceNote; total: number; collected: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "#1E120CB3" }}>
      <div
        className="w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-[notein_.45s_cubic-bezier(.2,1.4,.4,1)]"
        style={{ background: C.card, color: C.ink, border: `2px solid ${C.ink}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: C.accent }}>
            Laboratuvar defteri · {collected}/{total}
          </span>
          {note.rare && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: C.ink, color: C.paper }}>
              ★ Ustalar bile bilmez
            </span>
          )}
        </div>
        <h3 className="text-2xl font-semibold leading-tight" style={serif}>
          {note.title}
        </h3>
        <p className="text-[15px] leading-relaxed">{note.body}</p>
        <p className="text-xs italic" style={{ color: C.soft }}>
          Kaynak: {note.source}
        </p>
        <Btn variant="dark" onClick={onClose}>
          Deftere ekle ✓
        </Btn>
      </div>
      <style>{`@keyframes notein{from{transform:translateY(40px) scale(.9);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

export function StageTitle({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: C.accent }}>
        Aşama {n}
      </div>
      <h2 className="text-3xl font-semibold leading-tight" style={serif}>
        {title}
      </h2>
      {sub && (
        <p className="text-sm" style={{ color: C.soft }}>
          {sub}
        </p>
      )}
    </div>
  );
}
