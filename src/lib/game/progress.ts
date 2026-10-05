"use client";

import type { LevelId } from "@/types/game";

/**
 * Oyuncunun ilerlemesi (bu cihazda): seviye en iyi puanları ve toplanan bilim notları.
 * Tarayıcı depolaması kapalıysa oyun yine çalışır, yalnız hatırlamaz.
 */
const KEY = "ekmeklab_lab_v1";

export interface LabProgress {
  best: Partial<Record<LevelId, number>>;
  notes: string[];
  plays: number;
}

const EMPTY: LabProgress = { best: {}, notes: [], plays: 0 };

export function loadProgress(): LabProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...EMPTY };
    const p = parsed as Partial<LabProgress>;
    return {
      best: p.best && typeof p.best === "object" ? p.best : {},
      notes: Array.isArray(p.notes) ? p.notes.filter((x): x is string => typeof x === "string") : [],
      plays: typeof p.plays === "number" ? p.plays : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveProgress(p: LabProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
