"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Check, Droplets, Flame, Milk, Play, Plus, RotateCw, Scissors } from "lucide-react";
import type { ExtendedProduct } from "@/types";
import { productBadges } from "@/lib/products/badges";
import { useCartStore } from "@/lib/store/useCartStore";
import { getProductUrl } from "@/lib/utils/slugify";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { getSaleScheduleBadge } from "@/lib/ordering/saleDates";
import { getProductPlaceholder } from "@/lib/products/map";
import { isAccompaniment } from "@/lib/products/grouping";
import {
  hasShowcaseInteractiveMedia,
  isSafeShowcaseUrl,
  resolveSpecularTone,
  resolveSpinFrameUrls,
} from "@/lib/products/showcase";
import { SafeProductImage } from "@/components/storefront/SafeProductImage";
import type { ShowcaseMode } from "@/components/storefront/ProductShowcaseStage";

export interface ProductCardProps {
  product: ExtendedProduct;
  onOpenDetails: (product: ExtendedProduct, initialMode?: ShowcaseMode) => void;
  featured?: boolean;
  priority?: boolean;
}

function CardCutoutImage({
  src,
  fallbackSrc,
  alt,
  priority,
  isAccompanimentItem,
}: {
  src: string;
  fallbackSrc: string;
  alt: string;
  priority?: boolean;
  isAccompanimentItem: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  if (failed) {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden">
        <SafeProductImage
          src={fallbackSrc}
          alt={alt}
          priority={priority}
          isAccompanimentItem={isAccompanimentItem}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? undefined : "lazy"}
      decoding="async"
      draggable={false}
      className={`-mt-6 max-h-[112%] max-w-[92%] w-auto h-auto object-contain select-none transition-all duration-500 group-hover:scale-[1.04] ${
        loaded ? "opacity-100" : "opacity-0"
      } ${
        isAccompanimentItem
          ? "drop-shadow-[0_18px_22px_rgba(32,52,66,0.26)]"
          : "drop-shadow-[0_20px_24px_rgba(59,30,26,0.32)]"
      }`}
    />
  );
}

export function ProductCard({
  product,
  onOpenDetails,
  featured = false,
  priority = false,
}: ProductCardProps) {
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [showCrumb, setShowCrumb] = useState<boolean>(false);
  const [videoActive, setVideoActive] = useState<boolean>(false);

  const addItem = useCartStore((state) => state.addItem);
  const today = useIstanbulToday();
  const scheduleBadge = getSaleScheduleBadge(product, today);
  const accompaniment = isAccompaniment(product);
  const reducedMotion = Boolean(useReducedMotion());

  const showcase = product.masterclass?.showcase;
  const media = hasShowcaseInteractiveMedia(showcase);
  const spinFrames = resolveSpinFrameUrls(showcase);
  const specularTone = resolveSpecularTone(product);

  const cutoutSrc =
    media.hasCutout && isSafeShowcaseUrl(showcase?.cutoutUrl)
      ? showcase.cutoutUrl.trim()
      : null;
  const crumbSrc =
    media.hasCrumb && isSafeShowcaseUrl(showcase?.crumbUrl)
      ? showcase.crumbUrl.trim()
      : null;
  const videoSrc =
    media.hasVideo && isSafeShowcaseUrl(showcase?.ambientVideoUrl)
      ? showcase.ambientVideoUrl.trim()
      : null;

  // Sıfır React re-render üreten 3D eğim & speküler katmanı
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 230, damping: 24, mass: 0.55 });
  const smoothY = useSpring(pointerY, { stiffness: 230, damping: 24, mass: 0.55 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || e.pointerType !== "mouse") return;
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    pointerX.set(Math.max(-0.5, Math.min(0.5, relX - 0.5)));
    pointerY.set(Math.max(-0.5, Math.min(0.5, relY - 0.5)));
    node.style.setProperty("--px", `${Math.round(relX * 100)}%`);
    node.style.setProperty("--py", `${Math.round(relY * 100)}%`);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
    const node = cardRef.current;
    if (node) {
      node.style.setProperty("--px", "50%");
      node.style.setProperty("--py", "50%");
    }
    if (videoActive) {
      setVideoActive(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    if (videoActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoActive, videoSrc]);

  const handleMouseEnter = () => {
    if (videoSrc && !reducedMotion) {
      setVideoActive(true);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = addItem(product, null, 1);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1200);
    }
  };

  const badges = productBadges(product);
  const soldOut = product.isAvailable === false;

  const weightLabel =
    product.weight >= 1000 && product.weightUnit === "ml"
      ? `${product.weight / 1000}L`
      : `${product.weight}${product.weightUnit || "g"}`;

  const openModalDefault = () => {
    onOpenDetails(product, spinFrames.length > 0 ? "spin" : undefined);
  };

  const visualStage = (
    <div
      className={`relative w-full overflow-visible ${
        featured
          ? "aspect-[4/3] md:aspect-auto md:min-h-[340px] md:h-full"
          : "aspect-[4/3]"
      }`}
    >
      {/* Arka Atölye Plakası (translateZ(-12px)) */}
      <div
        className={`absolute inset-0 overflow-hidden atelier-layer-back border-b ${
          featured
            ? "rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl md:border-b-0 md:border-r"
            : "rounded-t-2xl"
        } border-line/70 ${
          specularTone === "frost"
            ? "bg-gradient-to-br from-[#EEF4F7] via-[#E4EDF2] to-[#D8E5ED] dark:from-[#161E24] dark:via-[#12191E] dark:to-[#0E1317]"
            : "bg-gradient-to-br from-[#F3E5CE] via-[#EAD4B0] to-[#DFC092] dark:from-[#261E19] dark:via-[#1E1713] dark:to-[#17120E]"
        }`}
      >
        {!cutoutSrc && (
          <div className="relative w-full h-full ring-1 ring-inset ring-ink/10">
            <SafeProductImage
              src={product.imageUrl}
              fallbackSrc={getProductPlaceholder(product.category)}
              alt={product.name}
              priority={priority}
              isAccompanimentItem={accompaniment}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none"
            />
          </div>
        )}

        {/* Mikro-Video Katmanı (hover veya dokunma ile oynatılır) */}
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={product.imageUrl}
            muted
            playsInline
            loop
            preload="none"
            aria-hidden="true"
            className={`absolute inset-0 z-10 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
              videoActive ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Kart Ortası Bıçak Kesiti (clip-path katmanı) */}
        {crumbSrc && showCrumb && (
          <div
            className="absolute inset-0 z-20 pointer-events-none animate-fadeIn"
            style={{ clipPath: "polygon(44% 0, 100% 0, 100% 100%, 38% 100%)" }}
          >
            <img
              src={crumbSrc}
              alt={`${product.name} ${accompaniment ? "iç dokusu" : "iç gözenek kesiti"}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {crumbSrc && showCrumb && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-[41%] z-20 w-0.5 bg-cream-surface/90 shadow-[0_0_10px_rgba(59,30,26,0.45)] pointer-events-none rotate-[4deg] scale-y-110"
          />
        )}

        {/* Speküler Işık Katmanı */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-20 ${
            specularTone === "frost" ? "specular-frost" : "specular-ember"
          }`}
        />
      </div>

      {/* Üst Kenardan Taşan Dekupe Katmanı (translateZ(+32px)) */}
      {cutoutSrc && !(crumbSrc && showCrumb) && !videoActive && (
        <div className="relative z-10 w-full h-full flex items-center justify-center px-4 pb-3 pointer-events-none atelier-layer-front">
          <CardCutoutImage
            src={cutoutSrc}
            fallbackSrc={product.imageUrl}
            alt={product.name}
            priority={priority}
            isAccompanimentItem={accompaniment}
          />
        </div>
      )}

      {/* Yüzen Üst Rozetler (translateZ(+16px)) */}
      {badges.length > 0 && (
        <div className="absolute top-2.5 left-2.5 z-30 flex flex-col items-start gap-1 pointer-events-none atelier-layer-mid">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`px-2.5 py-0.5 rounded-full text-xs font-sans font-bold uppercase tracking-wide shadow-xs ${
                b.tone === "danger"
                  ? "bg-bad text-white"
                  : b.tone === "gold"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-accent text-white"
              }`}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Sağ Üst Mikro-Etkileşim Düğmeleri (360° & Kesit & Video) */}
      {(spinFrames.length > 0 || crumbSrc || videoSrc) && (
        <div className="absolute top-2.5 right-2.5 z-30 flex flex-col items-end gap-1.5 atelier-layer-mid">
          {spinFrames.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(product, "spin");
              }}
              className="touch-target-44 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream-surface/95 hover:bg-cream-surface border border-line text-[11px] font-sans font-bold text-ink shadow-xs backdrop-blur-sm transition-colors"
            >
              <RotateCw aria-hidden="true" className="w-3 h-3 text-accent" />
              <span>360° Çevir</span>
            </button>
          )}

          {crumbSrc && (
            <button
              type="button"
              aria-pressed={showCrumb}
              onClick={(e) => {
                e.stopPropagation();
                setShowCrumb((prev) => !prev);
              }}
              className={`touch-target-44 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-sans font-bold shadow-xs backdrop-blur-sm transition-colors ${
                showCrumb
                  ? "bg-ink text-cream-surface border-ink"
                  : "bg-cream-surface/95 hover:bg-cream-surface text-ink border-line"
              }`}
            >
              <Scissors aria-hidden="true" className="w-3 h-3 text-accent" />
              <span>
                {showCrumb
                  ? accompaniment
                    ? "Dış Görünüm"
                    : "Kabuk"
                  : accompaniment
                  ? "İç Doku"
                  : "İç Kesit"}
              </span>
            </button>
          )}

          {videoSrc && (
            <button
              type="button"
              aria-pressed={videoActive}
              onClick={(e) => {
                e.stopPropagation();
                setVideoActive((prev) => !prev);
              }}
              aria-label={videoActive ? `${product.name} canlı dokuyu duraklat` : `${product.name} canlı dokuyu oynat`}
              className={`md:hidden touch-target-44 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-sans font-bold shadow-xs backdrop-blur-sm transition-colors ${
                videoActive
                  ? "bg-accent text-white border-accent"
                  : "bg-cream-surface/95 text-ink border-line"
              }`}
            >
              <Play aria-hidden="true" className="w-3 h-3" />
              <span>Canlı</span>
            </button>
          )}
        </div>
      )}

      {/* Yüzen Gramaj Rozeti (translateZ(+16px)) */}
      {product.weight > 0 && (
        <div className="absolute bottom-2.5 right-2.5 z-30 text-xs font-mono font-medium text-ink px-2.5 py-0.5 rounded-md bg-cream-surface/95 backdrop-blur-sm border border-line shadow-xs pointer-events-none atelier-layer-mid">
          {weightLabel}
        </div>
      )}
    </div>
  );

  const editorialSpecs = accompaniment ? (
    <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans text-ink-muted">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-line text-ink font-medium">
        <Milk aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
        <span>Mandıra &amp; Şarküteri</span>
      </span>
      <span className="px-2.5 py-1 rounded-lg bg-bg border border-line text-ink-muted">
        {product.madeToOrder ? "Sipariş Üzerine" : "Günlük Taze · Soğuk Zincir"}
      </span>
      {product.ingredients &&
        product.ingredients.slice(0, 2).map((ing) => (
          <span
            key={ing}
            className="px-2.5 py-1 rounded-lg bg-bg border border-line text-ink-muted"
          >
            {ing}
          </span>
        ))}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans text-ink-muted">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-line text-ink font-medium">
        <Flame aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
        <span>Taş Fırın</span>
      </span>
      {product.hydration ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-line text-ink font-medium">
          <Droplets aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
          <span>%{product.hydration} Hidrasyon</span>
        </span>
      ) : null}
      {product.flourTypes &&
        product.flourTypes.slice(0, 2).map((flour) => (
          <span
            key={flour}
            className="px-2.5 py-1 rounded-lg bg-bg border border-line text-ink-muted"
          >
            {flour}
          </span>
        ))}
    </div>
  );

  return (
    <div className="atelier-perspective h-full">
      <motion.div
        ref={cardRef}
        onClick={openModalDefault}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onMouseEnter={handleMouseEnter}
        style={reducedMotion ? undefined : { rotateX, rotateY }}
        className={`group atelier-preserve-3d cursor-pointer rounded-2xl bg-cream-surface border border-line hover:border-accent/60 hover:shadow-lg transition-shadow duration-300 overflow-visible shadow-xs h-full ${
          featured ? "flex flex-col md:grid md:grid-cols-12" : "flex flex-col"
        }`}
      >
        <div className={featured ? "md:col-span-7 h-full" : "w-full"}>{visualStage}</div>

        {/* Kart İçerik Alanı */}
        <div
          className={`flex-1 flex flex-col justify-between gap-3 ${
            featured ? "md:col-span-5 p-5 sm:p-7" : "p-4 sm:p-5"
          }`}
        >
          <div className="space-y-2.5">
            {featured && (
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-ink">
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent" />
                <span>
                  {accompaniment ? "Mandıra & Şarküteri Seçkisi" : "İmza Taş Fırın Sahnesi"}
                </span>
              </div>
            )}

            <h3
              className={`font-serif font-bold text-ink leading-snug group-hover:text-accent transition-colors ${
                featured
                  ? "text-xl sm:text-2xl lg:text-3xl"
                  : "text-base sm:text-lg line-clamp-2 min-h-[2.5rem] sm:min-h-0"
              }`}
            >
              <Link
                href={getProductUrl(product)}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                {product.name}
              </Link>
            </h3>

            {product.description ? (
              <p
                className={`text-ink-muted font-sans leading-relaxed ${
                  featured ? "text-sm line-clamp-3" : "text-xs line-clamp-2"
                }`}
              >
                {product.description}
              </p>
            ) : null}

            {featured && <div className="pt-1">{editorialSpecs}</div>}
          </div>

          <div className="space-y-3">
            {/* Satış Günü Rozeti */}
            {scheduleBadge ? (
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-sans font-medium px-2.5 py-0.5 rounded-full ${
                    product.saleWeekdays && product.saleWeekdays.length > 0
                      ? "bg-accent/15 text-ink border border-accent/30"
                      : "text-ink-muted bg-bg border border-line"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      product.saleWeekdays && product.saleWeekdays.length > 0
                        ? "bg-accent"
                        : "bg-good"
                    }`}
                  />
                  <span>{scheduleBadge}</span>
                </span>
              </div>
            ) : null}

            {/* Fiyat + Sepete Ekle */}
            <div className="pt-2.5 sm:pt-3 border-t border-line/60 flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-xs text-ink-muted line-through font-mono">
                    {product.compareAtPrice.toLocaleString("tr-TR")} ₺
                  </span>
                )}
                <span
                  className={`font-serif font-bold text-ink ${
                    featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-2xl"
                  }`}
                >
                  {product.price.toLocaleString("tr-TR")} ₺
                </span>
              </div>

              <button
                type="button"
                disabled={soldOut}
                onClick={handleAddToCart}
                aria-label={`${product.name} sepete ekle`}
                className={`touch-target-44 min-w-[44px] min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                  soldOut
                    ? "bg-line text-ink-muted cursor-not-allowed"
                    : isAdded
                    ? "bg-good text-white"
                    : "bg-accent text-white hover:bg-accent/90 active:scale-95"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span className={featured ? "inline" : "hidden sm:inline"}>Eklendi</span>
                  </>
                ) : soldOut ? (
                  <span>Tükendi</span>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span className={featured ? "inline" : "hidden sm:inline"}>
                      {featured ? "Sepete Ekle" : "Ekle"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
