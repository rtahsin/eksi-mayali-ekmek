import React from "react";
import Link from "next/link";
import type { ExtendedProduct } from "@/types";
import type { LatestProductBake } from "@/lib/bake/server";
import { bakeClock } from "@/lib/bake/log";
import { formatTrDate } from "@/lib/time/istanbul";
import {
  inferBreadStarchProfile,
  STARCH_PROFILE_META,
} from "@/lib/baking/staling";

export interface QrPassportGreetingProps {
  productName: string;
  qrRef?: string | null;
}

export function isQrReferral(ref?: string | null): boolean {
  if (!ref) return false;
  const clean = ref.trim().toLowerCase();
  return clean === "qr" || clean.startsWith("qr-");
}

/**
 * Kese kâğıdı / somun etiketi üzerindeki QR mühürden (`?ref=qr` veya `?ref=qr-...`)
 * ürün sayfasına inen okuyucu için özel karşılama şeridi.
 */
export function QrPassportGreeting({
  productName,
  qrRef,
}: QrPassportGreetingProps) {
  if (!isQrReferral(qrRef)) return null;

  const partnerCode =
    qrRef && qrRef.toLowerCase().startsWith("qr-")
      ? qrRef.slice(3).replace(/[-_]+/g, " ").trim()
      : null;

  return (
    <section
      aria-label="Mühürlü somun künyesi karşılama"
      className="rounded-2xl border-2 border-line bg-cream-surface text-ink p-4 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <img
            src="/logo/logo_seal.png"
            alt="EkmekLab Taş Fırın Mührü"
            width={60}
            height={60}
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 rounded-full border border-line bg-bg p-1"
          />
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent font-semibold">
              KESE KÂĞIDI MÜHRÜ · DOĞRULANMIŞ TAŞ FIRIN SOMUNU
              {partnerCode ? ` · NOKTA: ${partnerCode.toUpperCase()}` : ""}
            </p>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink leading-snug">
              Elindeki {productName} somununun açık mutfak künyesine hoş geldin.
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-2xl">
              Bu somun Beylikdüzü&apos;ndeki bahçe taş fırınımızda canlı ekşi mayayla
              yoğrulup taş tabanda pişti. Aşağıda un harmanını, ilk bıçak dinlenme
              süresini ve evde saklama eğrisini görebilir; bir sonraki fırından doğrudan
              kapına ayırtabilirsin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          <a
            href="#siparis"
            className="min-h-11 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans font-semibold text-xs sm:text-sm inline-flex items-center justify-center transition-colors shadow-xs"
          >
            Bu Somundan Sipariş Ver ↓
          </a>
          <Link
            href="/#ekmekler"
            className="min-h-11 px-4 py-2.5 rounded-xl bg-bg hover:bg-cream-surface text-ink border border-line hover:border-accent font-mono text-xs inline-flex items-center justify-center transition-colors"
          >
            Tüm Fırın Seçkisi →
          </Link>
        </div>
      </div>
    </section>
  );
}

export interface BatchPassportProps {
  product: ExtendedProduct;
  latestBake?: LatestProductBake | null;
}

/**
 * 11 adet tekrarlı SaaS ikon kutusunun yerini alan, Tartine / atölye defteri tarzı
 * tek ve net Taş Fırın Reçete & Ölçüm Cetveli + Canlı Parti Pasaportu.
 */
export function BatchPassport({ product, latestBake }: BatchPassportProps) {
  const starchProfile = inferBreadStarchProfile(product);
  const profileMeta = STARCH_PROFILE_META[starchProfile];

  const flourSummary =
    product.flourTypes && product.flourTypes.length > 0
      ? product.flourTypes.join(" + ")
      : product.ingredients && product.ingredients.length > 0
      ? product.ingredients[0]
      : "Taş değirmen buğday harmanı";

  const hydrationText = product.hydration
    ? `%${product.hydration} (Un = %100 fırıncı yüzdesi)`
    : "Doğal hamur kıvamı (Un = %100)";

  const bakingRegime =
    starchProfile === "rye"
      ? "20 dk buhar + 20 dk taş taban · Kalıpta düşen ısı ve buhar tahliyesi"
      : "20 dk buhar + 20 dk taş taban (taş tabanlı bahçe fırını)";

  const restingSpec =
    starchProfile === "rye"
      ? "48 saat (pentozan-su jeli ve nem dengelenmesi)"
      : starchProfile === "ancient"
      ? "24 saat (atalık tahıl matrisi iç nem oturması)"
      : "3 saat (gözenek duvarlarında amiloz jeli oturması)";

  const ingredientsList =
    product.ingredients && product.ingredients.length > 0
      ? product.ingredients
      : ["Taş değirmen unu", "İçme suyu", "Canlı ekşi maya", "Kaya tuzu"];

  return (
    <section
      aria-labelledby="batch-passport-heading"
      className="pt-6 border-t border-line"
    >
      <div className="rounded-2xl border border-line bg-cream-surface text-ink overflow-hidden shadow-xs">
        {/* Üst Künye Başlığı */}
        <div className="px-5 sm:px-8 py-5 border-b-4 border-double border-line flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent font-semibold">
              ATÖLYE REÇETE KÜNYESİ &amp; CANLI PARTİ PASAPORTU
            </p>
            <h2
              id="batch-passport-heading"
              className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1"
            >
              Taş Fırın Reçete &amp; Ölçüm Cetveli
            </h2>
          </div>
          <div className="font-mono text-xs text-ink-muted flex items-center gap-2">
            <span>Net Ağırlık:</span>
            <strong className="text-ink px-2.5 py-1 rounded-md bg-bg border border-line">
              {product.weight} {product.weightUnit || "g"}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line">
          {/* Sol/Orta: Tartine Tarzı Reçete Cetveli */}
          <div className="lg:col-span-7 p-5 sm:p-8 space-y-5">
            <dl className="divide-y divide-line text-sm">
              <div className="py-3 first:pt-0 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                <dt className="sm:col-span-5 font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Un Harmanı
                </dt>
                <dd className="sm:col-span-7 font-serif text-base font-bold text-ink">
                  {flourSummary}
                </dd>
              </div>

              <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                <dt className="sm:col-span-5 font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Hidrasyon (Su Oranı)
                </dt>
                <dd className="sm:col-span-7 font-mono text-sm font-semibold text-ink">
                  {hydrationText}
                </dd>
              </div>

              <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                <dt className="sm:col-span-5 font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Fermantasyon
                </dt>
                <dd className="sm:col-span-7 font-sans text-sm text-ink">
                  ~24 saat (+4°C soğuk olgunlaştırma · yalnız canlı ekşi maya, ticari maya yok)
                </dd>
              </div>

              <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                <dt className="sm:col-span-5 font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Pişirme Rejimi
                </dt>
                <dd className="sm:col-span-7 font-sans text-sm font-medium text-ink">
                  {bakingRegime}
                </dd>
              </div>

              <div className="py-3 last:pb-0 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                <dt className="sm:col-span-5 font-mono text-xs uppercase tracking-wider text-ink-muted">
                  İlk Bıçak Dinlenme Süresi
                </dt>
                <dd className="sm:col-span-7 font-sans text-sm text-ink">
                  <strong className="font-mono text-accent font-bold">
                    {profileMeta.restingHours} saat
                  </strong>{" "}
                  <span className="text-ink-muted">— {restingSpec}</span>
                </dd>
              </div>
            </dl>

            {/* İçindekiler Satırı */}
            <div className="pt-4 border-t border-line flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono uppercase tracking-wider text-ink-muted mr-1">
                İçindekiler:
              </span>
              {ingredientsList.map((ing, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-bg border border-line text-ink font-sans"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Sağ: Canlı Fırın Çıkış Kaydı (bake_logs varsa gerçek kayıt, yoksa atölye ritmi) */}
          <div className="lg:col-span-5 p-5 sm:p-8 bg-bg/50 flex flex-col justify-between space-y-4">
            {latestBake ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-good font-bold">
                    <span className="w-2 h-2 rounded-full bg-good" aria-hidden="true" />
                    <span>Kaydedilen Son Taş Fırın Çıkışı</span>
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    #{latestBake.id.slice(0, 6)}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-cream-surface border border-line text-xs">
                  <div>
                    <dt className="font-mono text-[10px] uppercase text-ink-muted">
                      Fırından Çıkış
                    </dt>
                    <dd className="font-serif text-base font-bold text-ink mt-0.5">
                      {formatTrDate(latestBake.day, "short")} · {bakeClock(latestBake.bakedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase text-ink-muted">
                      Parti Adedi
                    </dt>
                    <dd className="font-mono text-base font-bold text-ink mt-0.5">
                      {latestBake.count} somun
                    </dd>
                  </div>
                </dl>

                {latestBake.notes && (
                  <blockquote className="p-3.5 rounded-xl bg-cream-surface border-l-4 border-accent text-xs sm:text-sm text-ink italic leading-relaxed">
                    &ldquo;{latestBake.notes}&rdquo;
                    <footer className="not-italic font-mono text-[11px] text-ink-muted mt-1">
                      — Fırın tezgâhı notu
                    </footer>
                  </blockquote>
                )}

                {latestBake.photos.length > 0 && (
                  <figure className="space-y-1.5">
                    <div className="rounded-xl overflow-hidden border border-line aspect-[16/10] bg-cream-surface">
                      <img
                        src={latestBake.photos[0]}
                        alt={`${product.name} gerçek taş fırın çıkışı — ${formatTrDate(latestBake.day, "long")}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <figcaption className="font-mono text-[11px] text-ink-muted">
                      Atölye kamerasından gerçek parti fotoğrafı ({formatTrDate(latestBake.day, "long")})
                    </figcaption>
                  </figure>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo/logo_seal.png"
                    alt=""
                    aria-hidden="true"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain opacity-85"
                  />
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
                      TAŞ FIRIN RİTMİ
                    </p>
                    <p className="font-serif text-base font-bold text-ink">
                      Salı – Pazar Günlük Taze Parti
                    </p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Hamur bir gün önceden yoğrulup +4°C dolapta gece boyu olgunlaşır; sabah
                  120 × 80 cm taş tabanlı bahçe fırınında buharla pişer. Seçtiğin teslimat
                  gününde Beylikdüzü içinde kendi kuryemizle kapına ulaşır.
                </p>
              </div>
            )}

            <p className="font-mono text-[11px] text-ink-muted pt-3 border-t border-line">
              Tezgâh standardı: Yoğurma sonu hamur hedefi ~27 °C · Tartılı porsiyonlama
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
