import React from "react";
import Link from "next/link";
import { mediaUrl, type StoryStep } from "@/lib/hikaye/story";
import { LoopVideo, YouTubeFacade } from "./StepMediaPlayers";

// Ürün sayfası: ustanın anlattığı yapılış adımları. Bilimsel açıklama burada değil, Bilim odasında;
// adım yalnız ilgili ana bağlantı verir. Adım yoksa bölüm hiç görünmez.

export interface AnBaglantisi {
  id: string;
  baslik: string;
}

function Medya({ step, mediaBase, name }: { step: StoryStep; mediaBase: string | null; name: string }) {
  const m = step.media;
  if (!m) return null;
  if (m.kind === "youtube") return <YouTubeFacade videoId={m.videoId} title={`${name} · ${step.title}`} />;
  if (!mediaBase) return null;
  const src = mediaUrl(mediaBase, m.path);
  if (m.kind === "video") return <LoopVideo src={src} label={`${name} · ${step.title}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Supabase'deki fotoğraf, telefonda küçültülmüş
    <img src={src} alt={`${name} · ${step.title}`} loading="lazy" className="block w-full h-auto" />
  );
}

export function NasilYapiliyor({
  name,
  steps,
  mediaBase,
  anlar,
}: {
  name: string;
  steps: StoryStep[];
  mediaBase: string | null;
  anlar: Record<string, AnBaglantisi>;
}) {
  if (steps.length === 0) return null;
  return (
    <section className="pt-6 border-t border-line" aria-labelledby="nasil-yapiliyor">
      <div className="mb-8">
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent font-semibold">Nasıl yapılıyor</span>
        <h2 id="nasil-yapiliyor" className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
          {name}, adım adım
        </h2>
      </div>

      <ol className="space-y-10 sm:space-y-14">
        {steps.map((step, i) => {
          const an = step.anId ? anlar[step.anId] : undefined;
          const medya = step.media !== null;
          return (
            <li key={step.id} className={`grid gap-5 md:gap-10 items-start ${medya ? "md:grid-cols-12" : ""}`}>
              {medya && (
                <div className="md:col-span-5 rounded-2xl overflow-hidden border border-line bg-cream-surface">
                  <Medya step={step} mediaBase={mediaBase} name={name} />
                </div>
              )}
              <div className={`space-y-3 ${medya ? "md:col-span-7 md:pt-2" : "max-w-2xl"}`}>
                <span className="font-serif text-4xl font-bold text-accent/80 block" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink">{step.title}</h3>
                {step.text && (
                  <p className="text-sm sm:text-base text-ink-muted leading-relaxed whitespace-pre-line">{step.text}</p>
                )}
                {an && (
                  <Link
                    href={`/bilim/${an.id}`}
                    className="inline-flex items-center min-h-11 text-sm font-serif text-accent underline underline-offset-4 hover:text-ink"
                  >
                    Bilimi: {an.baslik} →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
