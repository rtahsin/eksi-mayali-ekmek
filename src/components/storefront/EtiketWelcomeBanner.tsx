"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, Flame, ShoppingBag, X } from "lucide-react";
import { whatsappLink } from "@/lib/site";
import { trackEvent } from "@/lib/track";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Zm0 0a5 5 0 0 0 5 5m0 0h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1Z" />
    </svg>
  );
}

const ETIKET_WHATSAPP_TEXT =
  "Merhaba Tahsin Usta, şarküteriden aldığım ekmekteki etiketten ulaşıyorum. Sipariş vermek istiyorum.";

export function EtiketWelcomeBanner() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const isEtiketEntry =
    searchParams.get("etiket") === "1" ||
    searchParams.get("kaynak")?.toLowerCase() === "etiket";

  useEffect(() => {
    if (isEtiketEntry) {
      trackEvent("scan", { code: "etiket", once: true });
    }
  }, [isEtiketEntry]);

  if (!isEtiketEntry || dismissed) {
    return null;
  }

  return (
    <aside
      aria-labelledby="etiket-welcome-heading"
      className="w-full bg-cream-surface border-b border-line text-ink"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="relative rounded-2xl border border-accent/35 bg-bg p-4 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-white font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>TAŞ FIRIN PAKET MÜHRÜ · AFİYET OLSUN KOMŞU</span>
            </div>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Karşılama notunu kapat"
              className="touch-target-44 min-w-[44px] min-h-[44px] -mt-1.5 -mr-1.5 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-cream-surface border border-transparent hover:border-line transition-colors flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2 max-w-3xl">
            <h2
              id="etiket-welcome-heading"
              className="font-serif text-lg sm:text-xl font-bold text-ink leading-snug"
            >
              Aldığınız ekmeğin son dilime kadar taze kalması için küçük bir fırın notu:
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
              Ekmeğinizi +4 °C buzdolabına koymayın (soğukta nişasta 4 kat hızlı sertleşir); kesik yüzünü ahşap tahtaya kapatıp oda sıcaklığında saklayın. Sıcak taş fırın ekmeği ve günlük mandıra ürünlerini Beylikdüzü içinde minimum sepet veya teslimat ücreti olmadan kapınıza getiriyoruz.
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <a
              href="#ekmekler"
              className="touch-target-44 min-h-[44px] px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Ürünleri Gör</span>
            </a>

            <a
              href={whatsappLink(ETIKET_WHATSAPP_TEXT)}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target-44 min-h-[44px] px-4 py-2.5 rounded-xl bg-cream-surface hover:bg-bg border border-accent/35 hover:border-accent text-ink font-sans text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4 text-accent shrink-0" />
              <span>WhatsApp&apos;tan Yaz</span>
            </a>

            <Link
              href="/bilim/sayi/02"
              className="touch-target-44 min-h-[44px] px-4 py-2.5 rounded-xl bg-cream-surface hover:bg-bg border border-line hover:border-accent/40 text-ink-muted hover:text-ink font-sans text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
              <span>Saklama Bilimi</span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
