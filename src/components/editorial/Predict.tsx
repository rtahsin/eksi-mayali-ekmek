"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PREDICTIONS } from "@/lib/game/content/predictions";
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, BookOpen } from "lucide-react";

interface PredictProps {
  id: string;
}

export function Predict({ id }: PredictProps) {
  const prediction = PREDICTIONS.find((p) => p.id === id);
  const [selected, setSelected] = useState<string | null>(null);

  if (!prediction) {
    return (
      <div className="my-6 p-4 rounded-xl border border-dashed border-red-500/40 text-xs text-red-400 font-mono">
        Tahmin sorusu bulunamadı: {id}
      </div>
    );
  }

  const isAnswered = selected !== null;
  const isCorrect = selected === prediction.correct;

  return (
    <div className="my-8 rounded-2xl border border-artisan-gold/40 bg-surface-panel/80 p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-artisan-gold">
        <HelpCircle className="w-4 h-4" />
        <span>Tahmin Et & Gör</span>
      </div>

      <div className="font-serif text-base sm:text-lg font-bold text-foreground">
        {prediction.question}
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {prediction.options.map((opt) => {
          let btnStyle = "bg-surface-elevated hover:bg-surface border-surface-border text-foreground/80 hover:text-foreground";
          if (isAnswered) {
            if (opt.id === prediction.correct) {
              btnStyle = "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-medium";
            } else if (opt.id === selected) {
              btnStyle = "bg-red-950/60 border-red-500 text-red-200";
            } else {
              btnStyle = "bg-surface/40 border-surface-border/40 text-foreground/40";
            }
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isAnswered}
              onClick={() => setSelected(opt.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${btnStyle}`}
            >
              <span>{opt.text}</span>
              {isAnswered && opt.id === prediction.correct && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {isAnswered && opt.id === selected && !isCorrect && (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Reveal Explanation */}
      {isAnswered && (
        <div className="mt-4 pt-4 border-t border-surface-border/80 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
            <span className={isCorrect ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {isCorrect ? "Doğru!" : "Doğru Cevap:"}
            </span>
            <span>{prediction.reveal}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            {prediction.cardId && (
              <Link
                href={`/kavram/${prediction.cardId}`}
                className="inline-flex items-center gap-1.5 text-artisan-gold hover:underline font-medium"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kavramı İncele</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
