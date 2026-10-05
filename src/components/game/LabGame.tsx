"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BakeDecisions, CodexCard, LabProgressV3, LevelId, MicroPhase, Prediction, StarterProfile } from "@/types/game";
import { LEVELS, LEVEL_ORDER } from "@/lib/game/levels";
import { MASTER_DECISIONS, runFor, setActiveStarter, simulateBread } from "@/lib/game/sim";
import { CARD_BY_ID, CARDS, cardForEntity } from "@/lib/game/content/cards";
import { PREDICTION_AT } from "@/lib/game/content/predictions";
import { EMPTY_PROGRESS, loadProgress, saveProgress } from "@/lib/game/progress";
import { TAHSIN_STARTER } from "@/lib/game/engine/starter";
import { sfx, buzz } from "@/lib/game/audio";
import { DoorArt } from "./art";
import { Btn, C, Tahsin, serif } from "./ui";
import { BiographyChart } from "./BiographyChart";
import { MicroScope } from "./micro/MicroScope";
import { LensButton, LensSheet } from "./micro/LensSheet";
import { CardSheet, PredictionSheet } from "./codex/CardSheet";
import { Codex } from "./codex/Codex";
import { StarterChapter, type ChapterHooks } from "./chapters/StarterChapter";
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

/** "Usta olabilir misin?" v3 — görünmeyen fırıncılar (docs/OYUN_V3.md) */

type StageKey = "maya" | "hamur" | "yogurma" | "mayalanma" | "sekil" | "kesik" | "firin" | "sogutma";

interface StageDef {
  key: StageKey;
  label: string;
  C: React.ComponentType<StageProps>;
  /** Bu aşamada oyuncunun belirlediği kararlar (büyüteç geri kalanını usta ayarıyla tamamlar) */
  fields: (keyof BakeDecisions)[];
  /** Büyüteçte gösterilecek evreler */
  phases: MicroPhase[];
  /** Aşama bitince açılan kart */
  card?: string;
  lensTitle: string;
  lensNote: string;
}

const STAGES: StageDef[] = [
  { key: "maya", label: "Maya", C: StarterStage, fields: ["levainHours", "levainGrams"], phases: ["kavanoz"], card: "asitler", lensTitle: "Mayanın içi", lensNote: "Beslemeden sonra bakteriler ve mayalar çoğalır, şeker azalır, asit birikip pH düşer. Tepe noktası: gaz gücünün en yüksek olduğu an." },
  { key: "hamur", label: "Hamur", C: MixStage, fields: ["waterGrams", "waterTempC", "saltTiming", "autolyseMinutes"], phases: ["otoliz"], card: "olay_otoliz", lensTitle: "Otoliz", lensNote: "Su unla buluşuyor: kuru un parçaları yumuşar, gluten zincirleri kendiliğinden tutunmaya başlar, amilaz hasarlı nişastadan maltoz keser." },
  { key: "yogurma", label: "Yoğurma", C: KneadStage, fields: ["kneadQuality", "saltGrams"], phases: ["yogurma"], card: "gluten", lensTitle: "Yoğurma", lensNote: "Maya hamura karıştı. Yoğurdukça ağ bağları çoğalır ve hizalanır; tuz iyonları ağı sıkılaştırır." },
  { key: "mayalanma", label: "Mayalanma", C: BulkStage, fields: ["bulkHours", "foldTimes"], phases: ["mayalanma"], card: "co2", lensTitle: "Mayalanma", lensNote: "CO₂ önce suda çözünür; su doyunca yoğurmada giren hava çekirdeklerine geçer ve onları şişirir. Asit arttıkça proteaz uyanır." },
  { key: "sekil", label: "Şekil", C: ShapeStage, fields: ["preshapeTension", "finalTension", "fridgePlan"], phases: ["sekil", "dolap"], card: "olay_dolap", lensTitle: "Bir gece dolapta", lensNote: "Hamur saatler içinde soğur. 4 °C'de maya neredeyse durur, bakteriler yavaşça asit ve aroma üretir." },
  { key: "kesik", label: "Kesik", C: ScoreStage, fields: ["cut"], phases: ["dolap"], lensTitle: "Sabah, kesikten önce", lensNote: "Soğuk hamur sıkıdır; jilet yapışmadan temiz keser." },
  { key: "firin", label: "Fırın", C: OvenStage, fields: ["steam", "ventMinute", "bakeMinutes"], phases: ["firin"], card: "olay_firin", lensTitle: "Fırının içi", lensNote: "Isı merkeze ilerler: son gaz patlaması, ~60 °C'de mayaların ölümü, nişastanın jelleşmesi, ağın donması." },
  { key: "sogutma", label: "Sabır", C: CoolStage, fields: ["cutWaitHours"], phases: ["sogutma"], card: "olay_kesme", lensTitle: "Soğuma", lensNote: "Jelleşmiş nişasta soğudukça yeniden düzenlenir; içi oturtan budur." },
];

type Screen = { k: "kapi" } | { k: "atolye" } | { k: "maya" } | { k: "oyun"; i: number } | { k: "sonuc" };

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

/** Büyüteç için: tamamlanan aşamalar oyuncudan, geri kalanı usta ayarından */
function lensDecisions(d: BakeDecisions, upTo: number): BakeDecisions {
  const out: BakeDecisions = { ...MASTER_DECISIONS, level: d.level };
  const rec = out as unknown as Record<string, unknown>;
  const src = d as unknown as Record<string, unknown>;
  STAGES.slice(0, upTo + 1).forEach((s) => s.fields.forEach((f) => (rec[f] = src[f])));
  // Henüz verilmemiş sayısal kararlar sıfırsa ustanınkini kullan
  if (!out.levainHours) out.levainHours = MASTER_DECISIONS.levainHours;
  if (!out.levainGrams) out.levainGrams = MASTER_DECISIONS.levainGrams;
  if (!out.waterGrams) out.waterGrams = MASTER_DECISIONS.waterGrams;
  if (!out.bulkHours) out.bulkHours = MASTER_DECISIONS.bulkHours;
  if (!out.bakeMinutes) out.bakeMinutes = MASTER_DECISIONS.bakeMinutes;
  if (!out.cutWaitHours) out.cutWaitHours = MASTER_DECISIONS.cutWaitHours;
  return out;
}

function isUnlocked(id: LevelId, p: LabProgressV3) {
  const lv = LEVELS[id];
  if (!lv.available) return false;
  return lv.unlockScore === undefined || (p.best.koy ?? 0) >= lv.unlockScore;
}

/** Prolog: mikro dünyaya ilk bakış (gerçek motor anlık görüntüsü) */
function FirstLook() {
  const snap = useMemo(() => {
    const run = runFor(MASTER_DECISIONS);
    return run.samples.find((s) => s.phase === "mayalanma" && s.t > run.marks.mayalanma + 2) ?? run.samples[0];
  }, []);
  return <MicroScope snapshot={snap} magnification="x400" caption="Bir tutam hamurun içi, 400 kez büyütülmüş" />;
}

type Overlay = { kind: "pred"; p: Prediction; then: () => void } | { kind: "card"; card: CodexCard; isNew: boolean; then?: () => void };

export function LabGame() {
  const [screen, setScreen] = useState<Screen>({ k: "kapi" });
  const [door, setDoor] = useState<"kapali" | "acik" | "sir">("kapali");
  const [progress, setProgress] = useState<LabProgressV3>(EMPTY_PROGRESS);
  const [levelId, setLevelId] = useState<LevelId>("koy");
  const [d, setD] = useState<BakeDecisions>(() => fresh("koy"));
  const [queue, setQueue] = useState<Overlay[]>([]);
  const [codex, setCodex] = useState(false);
  const [lens, setLens] = useState(false);
  const [muted, setMuted] = useState(false);
  const [resultBest, setResultBest] = useState<number | undefined>(undefined);
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setActiveStarter(p.starter);
  }, []);
  useEffect(() => {
    if (screen.k !== "kapi") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  const update = useCallback((f: (p: LabProgressV3) => LabProgressV3) => {
    setProgress((p) => {
      const n = f(p);
      saveProgress(n);
      return n;
    });
  }, []);

  const cards = useMemo(() => new Set(progress.cards), [progress.cards]);
  const level = LEVELS[levelId];
  const set = useCallback(<K extends keyof BakeDecisions>(k: K, v: BakeDecisions[K]) => setD((p) => ({ ...p, [k]: v })), []);

  // ── Kuyruk: tahmin soruları ve yeni kartlar sırayla gösterilir ──
  const push = useCallback((o: Overlay) => setQueue((q) => [...q, o]), []);
  const unlock = useCallback(
    (cardId: string, then?: () => void) => {
      const card = CARD_BY_ID[cardId];
      if (!card || progressRef.current.cards.includes(cardId)) {
        then?.();
        return;
      }
      progressRef.current = { ...progressRef.current, cards: [...progressRef.current.cards, cardId] };
      update((p) => (p.cards.includes(cardId) ? p : { ...p, cards: [...p.cards, cardId] }));
      sfx.ding(true);
      push({ kind: "card", card, isNew: true, then });
    },
    [push, update]
  );
  const ask = useCallback(
    (at: string, then: () => void) => {
      const p = PREDICTION_AT[at];
      if (!p || progressRef.current.answered.includes(p.id)) {
        then();
        return;
      }
      progressRef.current = { ...progressRef.current, answered: [...progressRef.current.answered, p.id] };
      push({ kind: "pred", p, then });
    },
    [push]
  );
  const hooks: ChapterHooks = useMemo(() => ({ ask, unlock }), [ask, unlock]);
  const closeTop = () => setQueue((q) => q.slice(1));
  const top = queue[0];

  const startLevel = (id: LevelId) => {
    sfx.unlock();
    setLockMsg(null);
    setActiveStarter(progressRef.current.starter);
    const go = () => {
      setLevelId(id);
      setD(fresh(id));
      setScreen({ k: "oyun", i: 0 });
      ask(`koy:maya`, () => undefined);
    };
    if (id === "siyez") ask("siyez:giris", () => unlock("tarih_karacadag", go));
    else go();
  };

  const finishStage = (i: number) => {
    const s = STAGES[i];
    const next = () => {
      if (i + 1 < STAGES.length) {
        setScreen({ k: "oyun", i: i + 1 });
        ask(`koy:${STAGES[i + 1].key}`, () => undefined);
      } else setScreen({ k: "sonuc" });
    };
    const afterCard = () => (s.key === "firin" ? ask("koy:firin_ic", next) : next());
    if (s.card) unlock(s.card, afterCard);
    else afterCard();
  };

  // Sonuç ekranına girince rekoru bir kez işle
  const recorded = useRef(false);
  useEffect(() => {
    if (screen.k !== "sonuc") {
      recorded.current = false;
      return;
    }
    if (recorded.current) return;
    recorded.current = true;
    const r = simulateBread(d);
    setResultBest(progressRef.current.best[d.level]);
    update((p) => ({ ...p, plays: p.plays + 1, best: { ...p.best, [d.level]: Math.max(p.best[d.level] ?? 0, r.scores.toplam) } }));
    ask("koy:sonuc", () => undefined);
  }, [screen.k, d, update, ask]);

  const result = screen.k === "sonuc" ? simulateBread(d) : null;
  const finalRun = screen.k === "sonuc" ? runFor(d) : null;
  const nextLevel = useMemo(() => {
    if (!result) return null;
    const nid = LEVEL_ORDER[LEVEL_ORDER.indexOf(levelId) + 1];
    if (!nid) return null;
    const nl = LEVELS[nid];
    const wasLocked = (resultBest ?? 0) < (nl.unlockScore ?? 0);
    return nl.available && isUnlocked(nid, progress) && wasLocked ? nl : null;
  }, [result, levelId, progress, resultBest]);

  // Aşamadaki büyüteç örnekleri
  const lensSamples = useMemo(() => {
    if (screen.k !== "oyun") return [];
    const st = STAGES[screen.i];
    const run = runFor(lensDecisions(d, screen.i));
    const xs = run.samples.filter((s) => st.phases.includes(s.phase));
    return xs.length ? xs : run.samples.slice(0, 1);
  }, [screen, d]);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    sfx.setMuted(m);
  };
  const onEntityTap = (k: string) => {
    const c = cardForEntity(k);
    if (c) unlock(c.id);
  };
  const starter: StarterProfile = progress.starter ?? TAHSIN_STARTER;

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink, fontFamily: "var(--font-inter)" }}>
      <div className="max-w-md mx-auto px-5 pt-4 pb-12 space-y-5">
        <div className="flex items-center justify-between text-sm">
          {screen.k === "oyun" || screen.k === "maya" ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Yarıda bırakıp atölyeye dönülsün mü?")) setScreen({ k: "atolye" });
              }}
              className="font-semibold"
              style={{ color: C.soft }}
            >
              ← Atölye
            </button>
          ) : screen.k === "sonuc" ? (
            <button type="button" onClick={() => setScreen({ k: "atolye" })} className="font-semibold" style={{ color: C.soft }}>
              ← Atölye
            </button>
          ) : (
            <Link href="/" className="font-semibold" style={{ color: C.soft }}>
              EkmekLab
            </Link>
          )}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setCodex(true)} className="px-2.5 py-1 rounded-lg border text-xs font-bold" style={{ borderColor: C.line }}>
              📓 {cards.size}/{CARDS.length}
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
            {door !== "sir" ? <DoorArt open={door === "acik"} /> : <FirstLook />}
            <div className="text-left">
              {door === "kapali" && (
                <Tahsin>
                  Selam, ben Tahsin. 2018&apos;de bir gece evde ekmek yoktu; sobada un, su ve tuzla kendim yaptım. O gün bugündür yapıyorum. Gel, içeri
                  gir.
                </Tahsin>
              )}
              {door === "sir" && (
                <Tahsin>
                  Sana bir sır vereyim: bu ekmekleri ben yapmıyorum. Şu gördüğün canlılar yapıyor; bir yemek kaşığı olgun mayada milyarlarcası var. Usta,
                  onlara iyi bakan kişidir. Al bu büyüteci; her adımda içeri bakabilirsin.
                </Tahsin>
              )}
            </div>
            {door === "kapali" && (
              <Btn
                onClick={() => {
                  sfx.unlock();
                  sfx.creak();
                  buzz(30);
                  setDoor("acik");
                  window.setTimeout(() => setDoor("sir"), 1500);
                }}
              >
                Kapıyı arala
              </Btn>
            )}
            {door === "sir" && <Btn onClick={() => setScreen({ k: "atolye" })}>Büyüteci al</Btn>}
          </div>
        )}

        {screen.k === "atolye" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold" style={serif}>
                Atölye
              </h1>
              <p className="text-sm mt-1" style={{ color: C.soft }}>
                Sezgi {progress.sezgi.right}/{progress.sezgi.total} · Defter {cards.size}/{CARDS.length}
                {progress.starter ? ` · Mayan: ${progress.starter.name}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sfx.unlock();
                setScreen({ k: "maya" });
              }}
              className="w-full text-left rounded-3xl p-5 border-2 active:scale-[0.99] transition-transform"
              style={{ borderColor: C.ink, background: C.card }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full" style={{ background: C.ink, color: C.paper }}>
                  Bölüm 1
                </span>
                <span className="text-sm font-bold">{progress.starter ? `✓ ${progress.starter.name}` : "Önerilen"}</span>
              </div>
              <div className="text-2xl font-semibold mt-3" style={serif}>
                Maya: görünmeyenleri yakala
              </div>
              <p className="text-sm mt-1" style={{ color: C.soft }}>
                Un ve sudan kendi ekşi mayanı yap. Mikroplar nereden gelir, ilk günün sahte kabarması, sessizlik, mayaların gelişi.
              </p>
            </button>
            {LEVEL_ORDER.map((id, n) => {
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
                      setLockMsg("Gece Yarısı: iki gün dinlenen mavi haşhaşlı çavdar. Yakında.");
                      unlock("tarih_cavdar");
                    } else setLockMsg(`${lv.name} için önce köy ekmeğinde ${lv.unlockScore} puan al.`);
                  }}
                  className="w-full text-left rounded-3xl p-5 border-2 transition-transform active:scale-[0.99]"
                  style={{ borderColor: open ? C.ink : C.line, background: open ? C.card : "transparent", opacity: open ? 1 : 0.7 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full" style={{ background: open ? C.ink : C.line, color: open ? C.paper : C.soft }}>
                      Bölüm {n + 2} · {lv.rank}
                    </span>
                    <span className="text-sm font-bold">{!lv.available ? "Yakında" : open ? (best !== undefined ? `En iyi: ${best}` : "Yeni") : "🔒"}</span>
                  </div>
                  <div className="text-2xl font-semibold mt-3" style={serif}>
                    {lv.name}
                  </div>
                  <p className="text-sm mt-1" style={{ color: C.soft }}>
                    {lv.blurb}
                  </p>
                  {open && id === "koy" && (
                    <p className="text-xs mt-2 font-semibold" style={{ color: C.accent }}>
                      Maya: {starter.name}
                    </p>
                  )}
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

        {screen.k === "maya" && (
          <StarterChapter
            hooks={hooks}
            onDone={(p) => {
              update((x) => ({ ...x, starter: p, best: { ...x.best, maya: Math.round(100 * p.vigor) } }));
              setActiveStarter(p);
              setScreen({ k: "atolye" });
            }}
          />
        )}

        {screen.k === "oyun" &&
          (() => {
            const st = STAGES[screen.i];
            const S = st.C;
            return (
              <>
                <S key={`${levelId}-${screen.i}`} d={d} set={set} level={level} done={() => finishStage(screen.i)} />
                <div className="flex justify-center pt-1">
                  <LensButton onClick={() => setLens(true)} />
                </div>
                <LensSheet
                  open={lens}
                  onClose={() => setLens(false)}
                  samples={lensSamples}
                  startIndex={lensSamples.length - 1}
                  title={st.lensTitle}
                  onEntityTap={onEntityTap}
                >
                  <p className="text-sm leading-relaxed">{st.lensNote}</p>
                  <p className="text-xs" style={{ color: C.soft }}>
                    Gördüğün, şimdiye kadarki kararlarınla hesaplanan hamur; sonraki adımlar için usta ayarı varsayıldı.
                  </p>
                </LensSheet>
              </>
            );
          })()}

        {screen.k === "sonuc" && result && finalRun && (
          <>
            <ResultStage
              d={d}
              r={result}
              level={level}
              best={resultBest}
              nextUnlocked={nextLevel}
              notesCollected={cards.size}
              notesTotal={CARDS.length}
              onReplay={() => startLevel(levelId)}
              onNext={() => nextLevel && startLevel(nextLevel.id)}
              onNotebook={() => setCodex(true)}
            />
            <section className="rounded-3xl border-2 p-4 space-y-3" style={{ borderColor: C.ink, background: C.card }}>
              <h2 className="text-xl font-semibold" style={serif}>
                Ekmeğinin biyografisi
              </h2>
              <p className="text-sm" style={{ color: C.soft }}>
                {starter.name} ile beslemeden fırına {Math.round(finalRun.marks.firin)} saat. Mayalar ve bakteriler çoğaldı, asit pH&apos;ı düşürdü, gaz hamuru
                kabarttı; fırında ısı hepsini durdurdu.
              </p>
              <BiographyChart run={finalRun} />
              <div className="flex justify-center">
                <LensButton onClick={() => setLens(true)} label="Otopsi: baştan sona içine bak" />
              </div>
              <LensSheet open={lens} onClose={() => setLens(false)} samples={finalRun.samples} startIndex={0} title="Ekmeğinin 24 saati" onEntityTap={onEntityTap} />
            </section>
          </>
        )}
      </div>

      {top?.kind === "pred" && (
        <PredictionSheet
          key={top.p.id}
          p={top.p}
          onAnswer={(right) => {
            update((p) => ({ ...p, answered: p.answered.includes(top.p.id) ? p.answered : [...p.answered, top.p.id], sezgi: { right: p.sezgi.right + (right ? 1 : 0), total: p.sezgi.total + 1 } }));
            sfx.ding(right);
          }}
          onDone={() => {
            const then = top.then;
            closeTop();
            if (top.p.cardId) unlock(top.p.cardId, then);
            else then();
          }}
        />
      )}
      {top?.kind === "card" && (
        <CardSheet
          key={top.card.id}
          card={top.card}
          isNew={top.isNew}
          onClose={() => {
            const then = top.then;
            closeTop();
            then?.();
          }}
        />
      )}
      {codex && <Codex unlocked={cards} sezgi={progress.sezgi} onClose={() => setCodex(false)} />}
    </div>
  );
}
