"use client";

import type { LabProgressV3, StarterProfile, LearnerProgressV4 } from "@/types/game";
import type { ConceptId } from "@/lib/knowledge/registry";

/**
 * Oyuncunun ilerlemesi (bu cihazda): en iyi puanlar, defter kartları, sezgi, kendi mayası.
 * Tarayıcı depolaması kapalıysa oyun yine çalışır, yalnız hatırlamaz.
 */
const KEY = "ekmeklab_lab_v3";
const KEY_V4 = "ekmeklab_lab_v4";
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

export const EMPTY_PROGRESS_V4: LearnerProgressV4 = {
  v: 4,
  cards: {},
  predictions: {},
  chapters: {},
  reads: {},
};

const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);

function isStarter(x: unknown): x is StarterProfile {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return typeof s.name === "string" && typeof s.vigor === "number" && typeof s.acidity === "number";
}

/**
 * v1 veya v3 ilerleme verisini kayıpsız olarak v4'e dönüştürür (MIMARI §2.5 / P1-05).
 */
export function migrateProgress(raw: unknown): LearnerProgressV4 {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_PROGRESS_V4 };
  }

  const obj = raw as Record<string, unknown>;

  // Zaten v4 formatında
  if (obj.v === 4) {
    return {
      v: 4,
      cards: (obj.cards && typeof obj.cards === "object" ? obj.cards : {}) as LearnerProgressV4["cards"],
      predictions: (obj.predictions && typeof obj.predictions === "object" ? obj.predictions : {}) as LearnerProgressV4["predictions"],
      chapters: (obj.chapters && typeof obj.chapters === "object" ? obj.chapters : {}) as LearnerProgressV4["chapters"],
      reads: (obj.reads && typeof obj.reads === "object" ? obj.reads : {}) as LearnerProgressV4["reads"],
    };
  }

  // v3 formatından dönüştürme
  if (obj.version === 3) {
    const cards: LearnerProgressV4["cards"] = {};
    const rawCards = strings(obj.cards);
    const now = Date.now();
    for (const c of rawCards) {
      cards[c as ConceptId] = { at: now, via: "lens" };
    }

    const predictions: LearnerProgressV4["predictions"] = {};
    const rawAnswered = strings(obj.answered);
    for (const a of rawAnswered) {
      predictions[a] = { pick: 0, correct: true, at: now };
    }

    const chapters: LearnerProgressV4["chapters"] = {};
    if (obj.best && typeof obj.best === "object") {
      for (const [k, score] of Object.entries(obj.best as Record<string, unknown>)) {
        if (typeof score === "number") {
          chapters[k] = { done: true, best: score };
        }
      }
    }

    return {
      v: 4,
      cards,
      predictions,
      chapters,
      reads: {},
    };
  }

  // v1 formatından dönüştürme (yalnızca best skorlar)
  if ("best" in obj && obj.best && typeof obj.best === "object") {
    const chapters: LearnerProgressV4["chapters"] = {};
    for (const [k, score] of Object.entries(obj.best as Record<string, unknown>)) {
      if (typeof score === "number") {
        chapters[k] = { done: true, best: score };
      }
    }
    return {
      v: 4,
      cards: {},
      predictions: {},
      chapters,
      reads: {},
    };
  }

  return { ...EMPTY_PROGRESS_V4 };
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
    // Otomatik v4 senkronu
    const v4 = migrateProgress(p);
    localStorage.setItem(KEY_V4, JSON.stringify(v4));
  } catch {}
}

export function loadProgressV4(): LearnerProgressV4 {
  try {
    const rawV4 = localStorage.getItem(KEY_V4);
    if (rawV4) {
      return migrateProgress(JSON.parse(rawV4));
    }
    // v3 varsa v4'e göç et
    const v3 = loadProgress();
    return migrateProgress(v3);
  } catch {
    return { ...EMPTY_PROGRESS_V4 };
  }
}

export function saveProgressV4(p: LearnerProgressV4): void {
  try {
    localStorage.setItem(KEY_V4, JSON.stringify(p));
  } catch {}
}
