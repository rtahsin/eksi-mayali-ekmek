"use client";

import React from "react";
import { C } from "./ui";

/** Dökmenin yanında ince ayar düğmeleri */
export function Nudge({ onNudge, step, unit = "g" }: { onNudge: (delta: number) => void; step: number; unit?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[-step, step].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onNudge(d)}
          className="min-h-[44px] rounded-xl border-2 text-sm font-bold"
          style={{ borderColor: C.line, background: C.card, color: C.ink }}
        >
          {d > 0 ? "+" : "−"}
          {Math.abs(d)} {unit}
        </button>
      ))}
    </div>
  );
}
