"use client";

import type { LabProgressV3, StarterProfile } from "@/types/game";

/**
 * Oyuncunun ilerlemesi (bu cihazda): en iyi puanlar, defter kartları, sezgi, kendi mayası.
 * Tarayıcı depolaması kapalıysa oyun yine çalışır, yalnız hatırlamaz.
 */
const KEY = "ekmeklab_lab_v3";
const OLD_KEY = "ekmeklab_lab_v1";

export const EMPTY_PROGRESS: LabProgressV3 = {
  version: 3,
  best: {},
  cards: [],
  sezgi: { right: 0, total: 0 },
  answered: [],
  starter: null,
  plays: 0,
  quests: [],
};

const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);

function isStarter(x: unknown): x is StarterProfile {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return typeof s.name === "string" && typeof s.vigor === "number" && typeof s.acidity === "number";
}

export function loadProgress(): LabProgressV3 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // v1'den yalnız en iyi puanlar taşınır (eski not kimlikleri kartlarla aynı değil)
      const old = localStorage.getItem(OLD_KEY);
      if (old) {
        const o: unknown = JSON.parse(old);
        if (o && typeof o === "object" && "best" in o) {
          const best = (o as { best: unknown }).best;
          return { ...EMPTY_PROGRESS, best: best && typeof best === "object" ? (best as LabProgressV3["best"]) : {} };
        }
      }
      return { ...EMPTY_PROGRESS };
    }
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== "object") return { ...EMPTY_PROGRESS };
    const q = p as Partial<LabProgressV3>;
    return {
      version: 3,
      best: q.best && typeof q.best === "object" ? q.best : {},
      cards: strings(q.cards),
      sezgi: q.sezgi && typeof q.sezgi.right === "number" && typeof q.sezgi.total === "number" ? q.sezgi : { right: 0, total: 0 },
      answered: strings(q.answered),
      starter: isStarter(q.starter) ? q.starter : null,
      plays: typeof q.plays === "number" ? q.plays : 0,
      quests: strings(q.quests),
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveProgress(p: LabProgressV3): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
