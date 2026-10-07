"use client";

import React, { useState } from "react";
import type { CodexCard, Prediction } from "@/types/game";
import { KIND_LABEL } from "@/lib/game/content/cards";
import { CardArt } from "./CardArt";

const C = { paper: "#F6EEDF", card: "#FBF6EC", ink: "#3B1E1A", soft: "#6E5148", line: "#E2D3BD", accent: "#B4532A", good: "#5E7F3E", bad: "#9B2C1F" };
const serif = { fontFamily: "var(--font-fraunces)" } as const;

/** Kartın üç katmanı: usta sözü → Neden? → Bilim (sayılar ve kaynak) */
export function CardBody({ card }: { card: CodexCard }) {
  const [depth, setDepth] = useState(0);
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center">
        <div className="rounded-2xl border p-1 shrink-0" style={{ borderColor: C.line, background: C.paper }}>
          <CardArt art={card.art} size={60} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: C.accent }}>
            {KIND_LABEL[card.kind]} {card.rare ? "· ★ ustalar bile bilmez" : ""}
          </p>
          <h3 className="text-xl font-semibold leading-tight" style={serif}>
            {card.nick ? `${card.nick}` : card.name}
          </h3>
          {card.latin && (
            <p className="text-xs italic" style={{ color: C.soft }}>
              {card.latin}
            </p>
          )}
        </div>
      </div>
      <p className="text-[15px] leading-relaxed font-medium">{card.short}</p>
      {card.stats && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs rounded-xl p-3" style={{ background: C.paper }}>
          {(
            [
              ["Şekil", card.stats.shape],
              ["Boy (µm)", card.stats.sizeUm],
              ["Sevdiği sıcaklık", card.stats.tempOpt],
              ["pH", card.stats.pH],
              ["Ne yer", card.stats.eats],
              ["Ne üretir", card.stats.makes],
              ["Nerede yaşar", card.stats.foundIn],
            ] as [string, string | undefined][]
          )
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <React.Fragment key={k}>
                <dt style={{ color: C.soft }}>{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </React.Fragment>
            ))}
        </dl>
      )}
      {depth >= 1 && (
        <div className="rounded-xl border-l-4 pl-3 py-1" style={{ borderColor: C.accent }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: C.accent }}>
            Neden?
          </p>
          <p className="text-sm leading-relaxed">{card.why}</p>
        </div>
      )}
      {depth >= 2 && (
        <div className="rounded-xl border-l-4 pl-3 py-1 space-y-2" style={{ borderColor: C.ink }}>
          <p className="text-xs font-bold uppercase tracking-wider">Bilim</p>
          <p className="text-sm leading-relaxed">{card.deep}</p>
          <ul className="space-y-1">
            {card.sources.map((s) => (
              <li key={s.url} className="text-xs italic" style={{ color: C.soft }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {s.citation}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {depth < 2 && (
        <button type="button" onClick={() => setDepth((x) => x + 1)} className="text-sm font-bold underline" style={{ color: C.accent }}>
          {depth === 0 ? "Neden? →" : "Bilim ne diyor? →"}
        </button>
      )}
    </div>
  );
}

/** Yeni ya da seçilen kart: alttan açılan sayfa */
export function CardSheet({ card, isNew, onClose }: { card: CodexCard; isNew?: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={card.name}>
      <button type="button" aria-label="Kapat" className="absolute inset-0" style={{ background: "rgba(59,30,26,0.45)" }} onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-[28px] px-5 pt-5 pb-8 space-y-4 animate-[rise_.35s_ease-out]" style={{ background: C.card, color: C.ink }}>
        {isNew && (
          <p className="text-center text-xs font-black uppercase tracking-[0.25em]" style={{ color: C.good }}>
            Deftere eklendi
          </p>
        )}
        <CardBody card={card} />
        <button type="button" onClick={onClose} className="w-full min-h-[52px] rounded-2xl font-bold text-lg" style={{ background: C.ink, color: C.paper }}>
          Tamam
        </button>
      </div>
      <style>{`@keyframes rise{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

/** Tahmin et → gör → anla */
export function PredictionSheet({ p, onAnswer, onDone }: { p: Prediction; onAnswer: (right: boolean) => void; onDone: () => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const right = chosen === p.correct;
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Tahmin et">
      <div className="absolute inset-0" style={{ background: "rgba(59,30,26,0.45)" }} />
      <div className="relative w-full max-w-md rounded-t-[28px] px-5 pt-5 pb-8 space-y-4" style={{ background: C.paper, color: C.ink }}>
        <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: C.accent }}>
          Tahmin et
        </p>
        <h3 className="text-2xl font-semibold leading-snug" style={serif}>
          {p.question}
        </h3>
        <div className="space-y-2">
          {p.options.map((o) => {
            const isC = chosen !== null && o.id === p.correct;
            const isWrong = chosen === o.id && !right;
            return (
              <button
                key={o.id}
                type="button"
                disabled={chosen !== null}
                onClick={() => {
                  setChosen(o.id);
                  onAnswer(o.id === p.correct);
                }}
                className="w-full text-left min-h-[52px] px-4 py-3 rounded-2xl border-2 font-semibold transition-colors"
                style={{
                  borderColor: isC ? C.good : isWrong ? C.bad : C.ink,
                  background: isC ? "#E4EDD8" : isWrong ? "#F3DAD3" : C.card,
                }}
              >
                {o.text}
              </button>
            );
          })}
        </div>
        {chosen !== null && (
          <div className="space-y-3">
            <p className="font-bold" style={{ color: right ? C.good : C.bad }}>
              {right ? "Doğru! Sezgin güçlü." : "Çoğu kişi böyle düşünür. Ama…"}
            </p>
            <p className="text-[15px] leading-relaxed">{p.reveal}</p>
            <button type="button" onClick={onDone} className="w-full min-h-[52px] rounded-2xl font-bold text-lg" style={{ background: C.ink, color: C.paper }}>
              Devam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
