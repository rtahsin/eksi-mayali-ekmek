"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { MicroSnapshot } from "@/types/game";
import { Sparkles } from "lucide-react";

// Tembel yüklenen MicroScope (SSR kapalı, hafif yükleme)
const MicroScope = dynamic(
  () => import("@/components/game/micro/MicroScope").then((m) => m.MicroScope),
  { ssr: false, loading: () => <div className="w-full h-64 bg-surface-panel/40 animate-pulse rounded-2xl flex items-center justify-center text-xs text-foreground/40 font-mono">Büyüteç hazırlanıyor...</div> }
);

interface MicroProps {
  preset?: string;
  caption?: string;
  magnification?: "x100" | "x400" | "x1000";
}

const PRESET_SNAPSHOTS: Record<string, MicroSnapshot> = {
  starter_day1: {
    t: 24,
    phase: "kavanoz",
    matrix: "bugday",
    tempC: 24,
    pH: 6.0,
    pop: { ent: 6.8, lacP: 4.5, lacS: 0.5, yst: 2.1 },
    sugar: 0.8,
    damagedStarch: 0.1,
    water: 1,
    dissolvedCO2: 0.2,
    gas: 0.1,
    glutenDev: 0.2,
    glutenDamage: 0,
    glutenAlign: 0,
    salt: 0,
    lactic: 2,
    acetic: 1,
    amylase: 0.3,
    protease: 0.2,
    phytase: 0.1,
  },
  starter_day3: {
    t: 72,
    phase: "kavanoz",
    matrix: "bugday",
    tempC: 24,
    pH: 4.8,
    pop: { ent: 4.2, lacP: 7.2, lacS: 3.5, yst: 4.0 },
    sugar: 0.6,
    damagedStarch: 0.1,
    water: 1,
    dissolvedCO2: 0.5,
    gas: 0.3,
    glutenDev: 0.25,
    glutenDamage: 0.05,
    glutenAlign: 0,
    salt: 0,
    lactic: 18,
    acetic: 6,
    amylase: 0.4,
    protease: 0.3,
    phytase: 0.2,
  },
  starter_day6: {
    t: 144,
    phase: "kavanoz",
    matrix: "bugday",
    tempC: 24,
    pH: 3.8,
    pop: { ent: 1.0, lacP: 6.0, lacS: 9.2, yst: 7.6 },
    sugar: 0.4,
    damagedStarch: 0.05,
    water: 1,
    dissolvedCO2: 1.0,
    gas: 1.0,
    glutenDev: 0.3,
    glutenDamage: 0.1,
    glutenAlign: 0,
    salt: 0,
    lactic: 95,
    acetic: 30,
    amylase: 0.5,
    protease: 0.4,
    phytase: 0.3,
  },
  autolyse: {
    t: 0.75,
    phase: "otoliz",
    matrix: "bugday",
    tempC: 22,
    pH: 6.1,
    pop: { ent: 1.0, lacP: 5.0, lacS: 8.5, yst: 6.8 },
    sugar: 0.9,
    damagedStarch: 0.3,
    water: 0.8,
    dissolvedCO2: 0.1,
    gas: 0.05,
    glutenDev: 0.6,
    glutenDamage: 0.02,
    glutenAlign: 0.2,
    salt: 0,
    lactic: 10,
    acetic: 3,
    amylase: 0.6,
    protease: 0.3,
    phytase: 0.2,
  },
  bulk: {
    t: 3,
    phase: "mayalanma",
    matrix: "bugday",
    tempC: 26,
    pH: 4.4,
    pop: { ent: 0.5, lacP: 5.5, lacS: 9.0, yst: 7.4 },
    sugar: 0.5,
    damagedStarch: 0.1,
    water: 1,
    dissolvedCO2: 0.9,
    gas: 0.8,
    glutenDev: 0.9,
    glutenDamage: 0.05,
    glutenAlign: 0.7,
    salt: 1,
    lactic: 50,
    acetic: 15,
    amylase: 0.4,
    protease: 0.3,
    phytase: 0.4,
  },
  oven: {
    t: 5,
    phase: "firin",
    matrix: "bugday",
    tempC: 65,
    pH: 4.2,
    pop: { ent: 0, lacP: 0, lacS: 0, yst: 0 },
    sugar: 0.2,
    damagedStarch: 0,
    water: 0.8,
    dissolvedCO2: 0.2,
    gas: 1.8,
    glutenDev: 1.0,
    glutenDamage: 0.1,
    glutenAlign: 1.0,
    salt: 1,
    lactic: 55,
    acetic: 16,
    amylase: 0,
    protease: 0,
    phytase: 0,
    heat: {
      coreC: 65,
      surfaceC: 210,
      yeastAlive: 0,
      labAlive: 0,
      starchGel: 0.8,
      glutenSet: 0.9,
      crust: 0.6,
      retro: 0,
    },
  },
};

export function Micro({
  preset = "autolyse",
  caption,
  magnification = "x400",
}: MicroProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const snapshot = PRESET_SNAPSHOTS[preset] || PRESET_SNAPSHOTS.autolyse;

  return (
    <figure className="my-8 rounded-2xl overflow-hidden border border-surface-border bg-surface-panel/70 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-artisan-gold font-mono px-1">
        <span className="flex items-center gap-1.5 font-sans font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Lab Büyüteci ({magnification})</span>
        </span>
        <span className="text-[10px] text-foreground/50 uppercase">
          Faz: {snapshot.phase}
        </span>
      </div>

      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-surface-border">
        {mounted ? (
          <MicroScope
            snapshot={snapshot}
            magnification={magnification}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-foreground/40 font-mono">
            Büyüteç başlatılıyor...
          </div>
        )}
      </div>

      {caption && (
        <figcaption className="text-center text-xs text-foreground/60 italic font-serif pt-1">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
