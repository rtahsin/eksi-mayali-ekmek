"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BakeDecisions, LevelId } from "@/types/game";
import { LEVELS, LEVEL_ORDER } from "@/lib/game/levels";
import { MASTER_DECISIONS, simulateBread } from "@/lib/game/sim";
import { NOTES, nextNoteFor, type NoteStage, type ScienceNote } from "@/lib/game/science";
import { loadProgress, saveProgress, type LabProgress } from "@/lib/game/progress";
import { sfx, buzz } from "@/lib/game/audio";
import { DoorArt } from "./art";
import { Btn, C, NoteCard, Tahsin, serif } from "./ui";
import { StarterStage } from "./stages/StarterStage";
import { MixStage } from "./stages/MixStage";
import { KneadStage } from "./stages/KneadStage";
import { BulkStage } from "./stages/BulkStage";
import { ShapeStage } from "./stages/ShapeStage";
import { ScoreStage } from "./stages/ScoreStage";
import { OvenStage } from "./stages/OvenStage";
import { CoolStage } from "./stages/CoolStage";
import { ResultStage } from "./stages/ResultStage";
import type { StageProps } from "./stages/types";

/** "Usta olabilir misin?" — EkmekLab simülatörü (docs/OYUN.md) */

type StageKey = "maya" | "hamur" | "yogurma" | "mayalanma" | "sekil" | "kesik" | "firin" | "sogutma";
const STAGES: { key: StageKey; label: string; notes: NoteStage[]; C: React.ComponentType<StageProps> }[] = [
  { key: "maya", label: "Maya", notes: ["maya"], C: StarterStage },
  { key: "hamur", label: "Hamur", notes: ["hamur"], C: MixStage },
  { key: "yogurma", label: "Yoğurma", notes: ["yogurma"], C: KneadStage },
  { key: "mayalanma", label: "Mayalanma", notes: ["mayalanma"], C: BulkStage },
  { key: "sekil", label: "Şekil", notes: ["sekil", "dolap"], C: ShapeStage },
  { key: "kesik", label: "Kesik", notes: ["kesik"], C: ScoreStage },
  { key: "firin", label: "Fırın", notes: ["firin"], C: OvenStage },
  { key: "sogutma", label: "Sabır", notes: ["sogutma"], C: CoolStage },
];

type Screen = { k: "kapi" } | { k: "secim" } | { k: "oyun"; i: number } | { k: "sonuc" };

const fresh = (level: LevelId): BakeDecisions => ({
  ...MASTER_DECISIONS,
  level,
  levainHours: 0,
  levainGrams: 0,
  waterGrams: 0,
  saltGrams: 0,
  kneadQuality: 0,
  foldTimes: [],
  bulkHours: 0,
  steam: false,
  ventMinute: null,
  bakeMinutes: 0,
  cutWaitHours: 0,
});

function isUnlocked(id: LevelId, p: LabProgress) {
  const lv = LEVELS[id];
  if (!lv.available) return false;
  return lv.unlockScore === undefined || (p.best.koy ?? 0) >= lv.unlockScore;
}

function Notebook({ collected, onClose }: { collected: Set<string>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ background: C.paper }}>
      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-semibold" style={serif}>
            Laboratuvar defteri
          </h2>
          <button type="button" onClick={onClose} className="text-3xl px-3" aria-label="Kapat">
            ×
          </button>
        </div>
        <p className="text-sm" style={{ color: C.soft }}>
          {collected.size} / {NOTES.length} not. Her oyunda yenileri açılır; ★ olanları çoğu usta bile bilmez.
        </p>
        {NOTES.map((n) =>
          collected.has(n.id) ? (
            <div key={n.id} className="rounded-2xl border p-4 space-y-1.5" style={{ borderColor: C.line, background: C.card }}>
              <div className="font-semibold" style={serif}>
                {n.rare ? "★ " : ""}
                {n.title}
              </div>
              <p className="text-sm leading-relaxed">{n.body}</p>
              <p className="text-[11px] italic" style={{ color: C.soft }}>
                {n.source}
              </p>
            </div>
          ) : (
            <div key={n.id} className="rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: C.line, color: C.soft }}>
              ??? · kilitli not
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function LabGame() {
  const [screen, setScreen] = useState<Screen>({ k: "kapi" });
  const [doorOpen, setDoorOpen] = useState(false);
  const [progress, setProgress] = useState<LabProgress>({ best: {}, notes: [], plays: 0 });
  const [levelId, setLevelId] = useState<LevelId>("koy");
  const [d, setD] = useState<BakeDecisions>(() => fresh("koy"));
  const [note, setNote] = useState<{ n: ScienceNote; then: () => void } | null>(null);
  const [notebook, setNotebook] = useState(false);
  const [muted, setMuted] = useState(false);
  const [resultBest, setResultBest] = useState<number | undefined>(undefined);
  const [lockMsg, setLockMsg] = useState<string | null>(null);

  useEffect(() => setProgress(loadProgress()), []);
  useEffect(() => {
    if (screen.k === "oyun" || screen.k === "sonuc") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  const collected = useMemo(() => new Set(progress.notes), [progress.notes]);
  const level = LEVELS[levelId];
  const set = useCallback(<K extends keyof BakeDecisions>(k: K, v: BakeDecisions[K]) => setD((p) => ({ ...p, [k]: v })), []);

  const collect = (id: string) =>
    setProgress((p) => {
      if (p.notes.includes(id)) return p;
      const next = { ...p, notes: [...p.notes, id] };
      saveProgress(next);
      return next;
    });

  const showNote = (stages: NoteStage[], then: () => void) => {
    let n: ScienceNote | null = null;
    for (const s of stages) {
      n = nextNoteFor(s, collected);
      if (n) break;
    }
    if (n) {
      sfx.ding(true);
      setNote({ n, then });
    } else then();
  };

  const startLevel = (id: LevelId) => {
    sfx.unlock();
    setLockMsg(null);
    // Seviye verisi not kapanınca değişsin (arkadaki sonuç ekranı yeniden hesaplanmasın)
    const go = () => {
      setLevelId(id);
      setD(fresh(id));
      setScreen({ k: "oyun", i: 0 });
    };
    if (id === "siyez") showNote(["siyez"], go);
    else go();
  };

  const finishResult = () => {
    const r = simulateBread(d);
    setResultBest(progress.best[d.level]);
    const best = Math.max(progress.best[d.level] ?? 0, r.scores.toplam);
    const next = { ...progress, plays: progress.plays + 1, best: { ...progress.best, [d.level]: best } };
    setProgress(next);
    saveProgress(next);
    setScreen({ k: "sonuc" });
  };

  const finishStage = (i: number) => {
    showNote(STAGES[i].notes, () => {
      if (i + 1 < STAGES.length) setScreen({ k: "oyun", i: i + 1 });
      else setScreen({ k: "sonuc" });
    });
  };

  // Sonuç ekranına girince rekoru bir kez işle
  const [recorded, setRecorded] = useState(false);
  useEffect(() => {
    if (screen.k !== "sonuc") {
      setRecorded(false);
      return;
    }
    if (!recorded) {
      setRecorded(true);
      finishResult();
    }
    // finishResult kasıtlı olarak bağımlılık değil: yalnız girişte bir kez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.k, recorded]);

  const result = screen.k === "sonuc" ? simulateBread(d) : null;
  const nextLevel = useMemo(() => {
    if (!result) return null;
    const nid = LEVEL_ORDER[LEVEL_ORDER.indexOf(levelId) + 1];
    if (!nid) return null;
    const nl = LEVELS[nid];
    const wasLocked = (resultBest ?? 0) < (nl.unlockScore ?? 0);
    return nl.available && isUnlocked(nid, progress) && wasLocked ? nl : null;
  }, [result, levelId, progress, resultBest]);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    sfx.setMuted(m);
  };

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink, fontFamily: "var(--font-inter)" }}>
      <div className="max-w-md mx-auto px-5 pt-4 pb-12 space-y-5">
        <div className="flex items-center justify-between text-sm">
          {screen.k === "oyun" ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Bu ekmeği yarıda bırakıp seviye seçimine dönülsün mü?")) setScreen({ k: "secim" });
              }}
              className="font-semibold"
              style={{ color: C.soft }}
            >
              ← Çık
            </button>
          ) : screen.k === "sonuc" ? (
            <button type="button" onClick={() => setScreen({ k: "secim" })} className="font-semibold" style={{ color: C.soft }}>
              ← Seviyeler
            </button>
          ) : (
            <Link href="/" className="font-semibold" style={{ color: C.soft }}>
              EkmekLab
            </Link>
          )}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setNotebook(true)} className="px-2.5 py-1 rounded-lg border text-xs font-bold" style={{ borderColor: C.line }}>
              📓 {collected.size}/{NOTES.length}
            </button>
            <button type="button" onClick={toggleMute} className="text-lg" aria-label={muted ? "Sesi aç" : "Sesi kapat"}>
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>

        {screen.k === "oyun" && (
          <div className="flex gap-1.5" aria-label={`Aşama ${screen.i + 1} / ${STAGES.length}`}>
            {STAGES.map((s, i) => (
              <div key={s.key} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i <= screen.i ? C.accent : C.line }} />
            ))}
          </div>
        )}

        {screen.k === "kapi" && (
          <div className="space-y-6 pt-2 text-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: C.accent }}>
                Mahallenin ekmek laboratuvarı
              </p>
              <h1 className="text-[44px] font-semibold leading-[1.05] mt-2" style={serif}>
                Usta olabilir misin?
              </h1>
            </div>
            <DoorArt open={doorOpen} />
            <div className="text-left">
              <Tahsin>
                Selam, ben Tahsin. 2018&apos;de bir gece sucuklu yumurta yaptım, evde ekmek yoktu; sobada un, su, tuzla kendim
                yaptım. O gün bugündür yapıyorum. 24 saat süren bir ekmeği bir de sen dene; her kararın ekmeği değiştirecek.
              </Tahsin>
            </div>
            <Btn
              onClick={() => {
                sfx.unlock();
                sfx.creak();
                buzz(30);
                setDoorOpen(true);
                window.setTimeout(() => setScreen({ k: "secim" }), 1500);
              }}
              disabled={doorOpen}
            >
              Kapıyı arala
            </Btn>
          </div>
        )}

        {screen.k === "secim" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-semibold" style={serif}>
                Bugün ne pişiriyoruz?
              </h1>
              <p className="text-sm mt-1" style={{ color: C.soft }}>
                8 ekmeklik parti, 4 kilo un. Sekiz aşama, yaklaşık 4 dakika.
              </p>
            </div>
            {LEVEL_ORDER.map((id) => {
              const lv = LEVELS[id];
              const open = isUnlocked(id, progress);
              const best = progress.best[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (open) startLevel(id);
                    else if (!lv.available) {
                      setLockMsg("Gece Yarısı: Tahsin'in iki gün dinlenen mavi haşhaşlı çavdarı. Reçetesi gelince açılacak.");
                      showNote(["cavdar"], () => undefined);
                    } else setLockMsg(`${lv.name} için önce köy ekmeğinde ${lv.unlockScore} puan al.`);
                  }}
                  className="w-full text-left rounded-3xl p-5 border-2 transition-transform active:scale-[0.99]"
                  style={{ borderColor: open ? C.ink : C.line, background: open ? C.card : "transparent", opacity: open ? 1 : 0.7 }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full"
                      style={{ background: open ? C.ink : C.line, color: open ? C.paper : C.soft }}
                    >
                      {lv.rank}
                    </span>
                    <span className="text-sm font-bold">{!lv.available ? "Yakında" : open ? (best !== undefined ? `En iyi: ${best}` : "Yeni") : "🔒"}</span>
                  </div>
                  <div className="text-2xl font-semibold mt-3" style={serif}>
                    {lv.name}
                  </div>
                  <p className="text-sm mt-1" style={{ color: C.soft }}>
                    {lv.blurb}
                  </p>
                </button>
              );
            })}
            {lockMsg && (
              <p className="text-sm text-center font-semibold" style={{ color: C.accent }}>
                {lockMsg}
              </p>
            )}
          </div>
        )}

        {screen.k === "oyun" &&
          (() => {
            const S = STAGES[screen.i].C;
            return <S key={`${levelId}-${screen.i}`} d={d} set={set} level={level} done={() => finishStage(screen.i)} />;
          })()}

        {screen.k === "sonuc" && result && (
          <ResultStage
            d={d}
            r={result}
            level={level}
            best={resultBest}
            nextUnlocked={nextLevel}
            notesCollected={collected.size}
            notesTotal={NOTES.length}
            onReplay={() => startLevel(levelId)}
            onNext={() => nextLevel && startLevel(nextLevel.id)}
            onNotebook={() => setNotebook(true)}
          />
        )}
      </div>

      {note && (
        <NoteCard
          note={note.n}
          total={NOTES.length}
          collected={collected.size + (collected.has(note.n.id) ? 0 : 1)}
          onClose={() => {
            collect(note.n.id);
            const then = note.then;
            setNote(null);
            then();
          }}
        />
      )}
      {notebook && <Notebook collected={collected} onClose={() => setNotebook(false)} />}
    </div>
  );
}
