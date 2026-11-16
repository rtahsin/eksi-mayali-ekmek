"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import type { ExtendedProduct } from "@/types";
import {
  hasShowcaseInteractiveMedia,
  isSafeShowcaseUrl,
  resolveSpecularTone,
  resolveSpinFrameUrls,
  wrapSpinFrameIndex,
} from "@/lib/products/showcase";
import { isAccompaniment } from "@/lib/products/grouping";
import { getProductPlaceholder } from "@/lib/products/map";
import { SafeProductImage } from "@/components/storefront/SafeProductImage";
import { Box, Film, Pause, Play, RotateCw, Scissors } from "lucide-react";

export type ShowcaseMode = "spin" | "3d" | "crumb" | "video";

export interface ProductShowcaseStageProps {
  product: ExtendedProduct;
  variant?: "modal" | "page";
  initialMode?: ShowcaseMode;
  priority?: boolean;
  topBadges?: React.ReactNode;
  bottomMeta?: React.ReactNode;
}

type CssVarStyle = React.CSSProperties & Record<`--${string}`, string | number>;

interface ModeOption {
  id: ShowcaseMode;
  label: string;
}

function SpinCanvasStage({
  product,
  spinFrames,
  priority,
  accompaniment,
  specularTone,
  reducedMotion,
}: {
  product: ExtendedProduct;
  spinFrames: string[];
  priority?: boolean;
  accompaniment: boolean;
  specularTone: "ember" | "frost";
  reducedMotion: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const framePosRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const inertiaRafRef = useRef<number | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const isHorizontalLockedRef = useRef<boolean>(false);
  const escapeToScrollRef = useRef<boolean>(false);
  const startPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMoveRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });
  const mountedRef = useRef<boolean>(true);

  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [firstFrameReady, setFirstFrameReady] = useState<boolean>(false);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isAutoSpin, setIsAutoSpin] = useState<boolean>(false);
  const [allFramesRequested, setAllFramesRequested] = useState<boolean>(false);

  const totalFrames = spinFrames.length;
  const spinFramesKey = spinFrames.join("|");

  const drawFrame = useCallback(
    (targetIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas || totalFrames === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const wrappedIdx = wrapSpinFrameIndex(targetIdx, totalFrames);
      let img = loadedImagesRef.current[wrappedIdx];

      if (!img) {
        // Henüz yüklenmeyen karelerde boşluk göstermemek için en yakın hazır kareyi çiz
        for (let offset = 1; offset < totalFrames; offset++) {
          const next = loadedImagesRef.current[wrapSpinFrameIndex(wrappedIdx + offset, totalFrames)];
          if (next) {
            img = next;
            break;
          }
          const prev = loadedImagesRef.current[wrapSpinFrameIndex(wrappedIdx - offset, totalFrames)];
          if (prev) {
            img = prev;
            break;
          }
        }
      }

      if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return;

      const cssWidth = canvas.clientWidth || 480;
      const cssHeight = canvas.clientHeight || 480;
      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
      const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Oranı muhafaza ederek sahne alanına yerleştir
      const pad = 0.92;
      const scale = Math.min((cssWidth * pad) / img.naturalWidth, (cssHeight * pad) / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const dx = (cssWidth - drawW) / 2;
      const dy = (cssHeight - drawH) / 2;

      ctx.drawImage(img, dx, dy, drawW, drawH);
    },
    [totalFrames],
  );

  // İlk 0° kareyi anında yükle
  useEffect(() => {
    mountedRef.current = true;
    loadedImagesRef.current = new Array<HTMLImageElement | null>(totalFrames).fill(null);
    framePosRef.current = 0;
    velocityRef.current = 0;
    setFrameIndex(0);
    setFirstFrameReady(false);
    setLoadedCount(0);
    setAllFramesRequested(false);
    setIsAutoSpin(false);

    if (totalFrames === 0) return;

    const firstImg = new Image();
    firstImg.decoding = "async";
    firstImg.onload = () => {
      if (!mountedRef.current) return;
      loadedImagesRef.current[0] = firstImg;
      setFirstFrameReady(true);
      setLoadedCount(1);
      drawFrame(0);
    };
    firstImg.src = spinFrames[0];

    return () => {
      mountedRef.current = false;
      if (inertiaRafRef.current !== null) {
        cancelAnimationFrame(inertiaRafRef.current);
        inertiaRafRef.current = null;
      }
    };
  }, [spinFramesKey, totalFrames, drawFrame, spinFrames]);

  // Görünür alana girince kalan kareleri progressive yükle
  useEffect(() => {
    if (totalFrames <= 1 || allFramesRequested) return;
    const node = containerRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setAllFramesRequested(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setAllFramesRequested(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [totalFrames, allFramesRequested]);

  useEffect(() => {
    if (!allFramesRequested || totalFrames <= 1) return;
    let active = true;
    const batchSize = 4;
    let cursor = 1;

    const loadBatch = () => {
      if (!active || cursor >= totalFrames) return;
      const batchEnd = Math.min(totalFrames, cursor + batchSize);
      let completedInBatch = 0;
      const expectedInBatch = batchEnd - cursor;

      for (let i = cursor; i < batchEnd; i++) {
        const frameIdx = i;
        const img = new Image();
        img.decoding = "async";
        const finalize = () => {
          if (!active) return;
          completedInBatch += 1;
          if (completedInBatch === expectedInBatch) {
            loadBatch();
          }
        };
        img.onload = () => {
          if (!active) return;
          loadedImagesRef.current[frameIdx] = img;
          setLoadedCount((prev) => prev + 1);
          const currentIdx = wrapSpinFrameIndex(Math.round(framePosRef.current), totalFrames);
          if (currentIdx === frameIdx) {
            drawFrame(currentIdx);
          }
          finalize();
        };
        img.onerror = finalize;
        img.src = spinFrames[frameIdx];
      }
      cursor = batchEnd;
    };

    loadBatch();

    return () => {
      active = false;
    };
  }, [allFramesRequested, totalFrames, spinFramesKey, spinFrames, drawFrame]);

  // Boyut değişiminde canvas'ı yeniden çiz
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      drawFrame(wrapSpinFrameIndex(Math.round(framePosRef.current), totalFrames));
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawFrame, totalFrames]);

  const stopInertia = useCallback(() => {
    if (inertiaRafRef.current !== null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
    velocityRef.current = 0;
  }, []);

  const stepToPosition = useCallback(
    (nextPos: number) => {
      framePosRef.current = nextPos;
      const nextIdx = wrapSpinFrameIndex(Math.round(nextPos), totalFrames);
      setFrameIndex(nextIdx);
      drawFrame(nextIdx);
    },
    [totalFrames, drawFrame],
  );

  // Otomatik tur zamanlayıcısı
  useEffect(() => {
    if (!isAutoSpin || totalFrames <= 1) return;
    let rafId = 0;
    let lastTs = performance.now();
    const speedFramesPerSec = reducedMotion ? 4 : 14;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      stepToPosition(framePosRef.current + dt * speedFramesPerSec);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isAutoSpin, totalFrames, reducedMotion, stepToPosition]);

  const startInertiaLoop = useCallback(() => {
    if (reducedMotion || Math.abs(velocityRef.current) < 0.04) {
      velocityRef.current = 0;
      return;
    }

    const tick = () => {
      velocityRef.current *= 0.93;
      if (Math.abs(velocityRef.current) < 0.03) {
        velocityRef.current = 0;
        inertiaRafRef.current = null;
        return;
      }
      stepToPosition(framePosRef.current + velocityRef.current);
      inertiaRafRef.current = requestAnimationFrame(tick);
    };

    inertiaRafRef.current = requestAnimationFrame(tick);
  }, [reducedMotion, stepToPosition]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    stopInertia();
    setIsAutoSpin(false);
    isPointerDownRef.current = true;
    isHorizontalLockedRef.current = false;
    escapeToScrollRef.current = false;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    lastMoveRef.current = { x: e.clientX, time: performance.now() };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || escapeToScrollRef.current || totalFrames <= 1) return;

    const dxTotal = e.clientX - startPointRef.current.x;
    const dyTotal = e.clientY - startPointRef.current.y;

    if (!isHorizontalLockedRef.current) {
      // Dikey kaydırma baskınsa sayfa kaydırmasını engelleme
      if (Math.abs(dyTotal) > Math.abs(dxTotal) + 8) {
        escapeToScrollRef.current = true;
        isPointerDownRef.current = false;
        return;
      }
      if (Math.abs(dxTotal) > 4) {
        isHorizontalLockedRef.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Tarayıcı pointer capture desteklemiyorsa sessiz geç
        }
      } else {
        return;
      }
    }

    const now = performance.now();
    const deltaX = e.clientX - lastMoveRef.current.x;
    const deltaTime = Math.max(8, now - lastMoveRef.current.time);
    const width = containerRef.current?.clientWidth || 360;
    const pxPerTurn = Math.max(180, width * 0.85);
    const deltaFrames = (deltaX / pxPerTurn) * totalFrames;

    velocityRef.current = deltaFrames * (16 / deltaTime);
    lastMoveRef.current = { x: e.clientX, time: now };
    stepToPosition(framePosRef.current + deltaFrames);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    if (isHorizontalLockedRef.current) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // yoksay
      }
      startInertiaLoop();
    }
    isHorizontalLockedRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stopInertia();
      setIsAutoSpin(false);
      stepToPosition(framePosRef.current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      stopInertia();
      setIsAutoSpin(false);
      stepToPosition(framePosRef.current - 1);
    }
  };

  const angleDeg = totalFrames > 0 ? Math.round((frameIndex / totalFrames) * 360) % 360 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${
        specularTone === "frost"
          ? "bg-gradient-to-br from-[#EEF4F7] via-[#E4EDF2] to-[#D8E5ED] dark:from-[#161E24] dark:via-[#12191E] dark:to-[#0E1317]"
          : "bg-gradient-to-br from-[#F3E5CE] via-[#EAD4B0] to-[#DFC092] dark:from-[#261E19] dark:via-[#1E1713] dark:to-[#17120E]"
      }`}
    >
      {!firstFrameReady && (
        <div className="absolute inset-0">
          <SafeProductImage
            src={product.imageUrl}
            fallbackSrc={getProductPlaceholder(product.category)}
            alt={product.name}
            priority={priority}
            isAccompanimentItem={accompaniment}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`${product.name} 360 derece döner sahne, açı ${angleDeg} derece. Sağ ve sol ok tuşlarıyla döndürülebilir.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
        className={`relative z-10 w-full h-full touch-pan-y cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-4px] transition-opacity duration-300 ${
          firstFrameReady ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Açı ve Otomatik Tur Alt Kontrol Şeridi */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-surface/90 border border-line text-xs font-mono font-semibold text-ink shadow-xs backdrop-blur-sm">
          <RotateCw aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
          <span className="tabular-nums">{angleDeg}°</span>
          {loadedCount < totalFrames && (
            <span className="text-[11px] text-ink-muted font-normal">
              · {loadedCount}/{totalFrames}
            </span>
          )}
        </div>

        <button
          type="button"
          aria-pressed={isAutoSpin}
          onClick={() => {
            stopInertia();
            setIsAutoSpin((prev) => !prev);
          }}
          className="pointer-events-auto touch-target-44 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-surface/95 hover:bg-cream-surface border border-line text-xs font-sans font-semibold text-ink shadow-xs transition-colors"
        >
          {isAutoSpin ? (
            <Pause aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
          ) : (
            <Play aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
          )}
          <span>Otomatik Tur</span>
        </button>
      </div>
    </div>
  );
}

function CrumbComparisonStage({
  product,
  crumbUrl,
  accompaniment,
  priority,
}: {
  product: ExtendedProduct;
  crumbUrl: string;
  accompaniment: boolean;
  priority?: boolean;
}) {
  const sliderId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);
  const escapeToScrollRef = useRef<boolean>(false);
  const startPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [splitPct, setSplitPct] = useState<number>(52);

  const crumbImgRef = useRef<HTMLImageElement>(null);
  const [crumbReady, setCrumbReady] = useState<boolean>(false);

  useEffect(() => {
    const img = crumbImgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setCrumbReady(true);
    } else {
      setCrumbReady(false);
    }
  }, [crumbUrl]);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
    setSplitPct(pct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    escapeToScrollRef.current = false;
    startPointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || escapeToScrollRef.current) return;
    const dx = e.clientX - startPointRef.current.x;
    const dy = e.clientY - startPointRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) + 8 && Math.abs(dx) < 12) {
      escapeToScrollRef.current = true;
      draggingRef.current = false;
      return;
    }
    updateSplitFromClientX(e.clientX);
  };

  const handlePointerEnd = () => {
    draggingRef.current = false;
  };

  const leftLabel = accompaniment ? "İç Doku" : "İç Gözenek";
  const rightLabel = accompaniment ? "Dış Görünüm" : "Kabuk";

  const sliderVars: CssVarStyle = {
    "--attr-min": 0,
    "--attr-max": 100,
    "--control-value": splitPct,
  };

  return (
    <div className="w-full h-full flex flex-col bg-cream-surface">
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="relative flex-1 min-h-[210px] w-full overflow-hidden touch-pan-y select-none cursor-ew-resize"
      >
        {/* Taban Katman: Kabuk / Dış Görünüm */}
        <SafeProductImage
          src={product.imageUrl}
          fallbackSrc={getProductPlaceholder(product.category)}
          alt={`${product.name} ${rightLabel.toLowerCase()}`}
          priority={priority}
          isAccompanimentItem={accompaniment}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Kesit Katmanı: İç Gözenek / İç Doku */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
        >
          <img
            ref={crumbImgRef}
            src={crumbUrl}
            alt={`${product.name} ${leftLabel.toLowerCase()}`}
            onLoad={() => setCrumbReady(true)}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              crumbReady ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {/* Bıçak Kesiti Ayraç Çizgisi */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-cream-surface shadow-[0_0_8px_rgba(59,30,26,0.45)] pointer-events-none"
          style={{ left: `${splitPct}%` }}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cream-surface border-2 border-accent flex items-center justify-center shadow-md">
            <Scissors className="w-3.5 h-3.5 text-accent" />
          </div>
        </div>

        {/* Kesit Etiketleri */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-ink/80 text-cream-surface text-[11px] font-sans font-semibold backdrop-blur-xs">
            {leftLabel}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-ink/80 text-cream-surface text-[11px] font-sans font-semibold backdrop-blur-xs">
            {rightLabel}
          </span>
        </div>
      </div>

      {/* Erişilebilir Native Kesit Sürgüsü */}
      <div className="px-4 py-2.5 bg-bg/90 border-t border-line flex items-center gap-3">
        <label htmlFor={sliderId} className="text-xs font-sans font-semibold text-ink shrink-0">
          {accompaniment ? "Doku Kesiti" : "Bıçak Kesiti"}
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={splitPct}
          onChange={(e) => setSplitPct(Number(e.target.value))}
          aria-valuetext={`${leftLabel} %${splitPct}, ${rightLabel} %${100 - splitPct}`}
          style={sliderVars}
          className="ekmeklab-slider flex-1"
        />
        <span className="text-xs font-mono font-semibold text-ink-muted tabular-nums w-10 text-right">
          %{splitPct}
        </span>
      </div>
    </div>
  );
}

function AmbientVideoStage({
  product,
  videoUrl,
  reducedMotion,
}: {
  product: ExtendedProduct;
  videoUrl: string;
  reducedMotion: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!reducedMotion) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [videoUrl, reducedMotion]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-bg overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={product.imageUrl}
        muted
        playsInline
        loop
        controls={false}
        preload="metadata"
        aria-label={`${product.name} canlı doku videosu`}
        className="w-full h-full object-cover"
      />

      <div className="absolute bottom-3 right-3 z-20">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={isPlaying ? "Canlı doku videosunu duraklat" : "Canlı doku videosunu oynat"}
          className="touch-target-44 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-surface/95 hover:bg-cream-surface border border-line text-xs font-sans font-semibold text-ink shadow-md transition-colors"
        >
          {isPlaying ? (
            <>
              <Pause aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
              <span>Duraklat</span>
            </>
          ) : (
            <>
              <Play aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
              <span>Oynat</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function ProductShowcaseStage({
  product,
  variant = "page",
  initialMode,
  priority = false,
  topBadges,
  bottomMeta,
}: ProductShowcaseStageProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const accompaniment = isAccompaniment(product);
  const showcase = product.masterclass?.showcase;
  const spinFrames = useMemo(() => resolveSpinFrameUrls(showcase), [showcase]);
  const media = useMemo(() => hasShowcaseInteractiveMedia(showcase), [showcase]);
  const specularTone = resolveSpecularTone(product);

  const availableModes = useMemo<ModeOption[]>(() => {
    const list: ModeOption[] = [];
    if (media.hasSpin && spinFrames.length > 0) {
      list.push({ id: "spin", label: "360° Çevir" });
    }
    list.push({ id: "3d", label: "3D Sahne" });
    if (media.hasCrumb) {
      list.push({ id: "crumb", label: accompaniment ? "İç Doku" : "Bıçak Kesiti" });
    }
    if (media.hasVideo) {
      list.push({ id: "video", label: "Canlı Doku" });
    }
    return list;
  }, [media.hasSpin, media.hasCrumb, media.hasVideo, spinFrames.length, accompaniment]);

  const resolvedDefaultMode = useMemo<ShowcaseMode>(() => {
    if (initialMode && availableModes.some((m) => m.id === initialMode)) {
      return initialMode;
    }
    if (media.hasSpin && spinFrames.length > 0) {
      return "spin";
    }
    return "3d";
  }, [initialMode, availableModes, media.hasSpin, spinFrames.length]);

  const [activeMode, setActiveMode] = useState<ShowcaseMode>(resolvedDefaultMode);

  useEffect(() => {
    setActiveMode(resolvedDefaultMode);
  }, [product.id, resolvedDefaultMode]);

  // 3D sahne için re-render üretmeyen ince optik perspektif katmanı
  const stageTiltRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 210, damping: 24, mass: 0.65 });
  const smoothY = useSpring(pointerY, { stiffness: 210, damping: 24, mass: 0.65 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);

  const handle3dPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || e.pointerType !== "mouse") return;
    const node = stageTiltRef.current;
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

  const handle3dPointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
    const node = stageTiltRef.current;
    if (node) {
      node.style.setProperty("--px", "50%");
      node.style.setProperty("--py", "50%");
    }
  };

  const crumbSrc = showcase?.crumbUrl && isSafeShowcaseUrl(showcase.crumbUrl) ? showcase.crumbUrl.trim() : null;
  const videoSrc =
    showcase?.ambientVideoUrl && isSafeShowcaseUrl(showcase.ambientVideoUrl)
      ? showcase.ambientVideoUrl.trim()
      : null;

  const showModeSelector = availableModes.length > 1;
  const stageHeightClass =
    variant === "modal"
      ? "min-h-[250px] sm:min-h-[300px] md:min-h-[420px]"
      : "aspect-[4/3] sm:aspect-square";

  return (
    <div className="flex flex-col gap-3 w-full">
      <div
        className={`relative w-full overflow-hidden rounded-3xl border border-line bg-cream-surface shadow-xl ${stageHeightClass}`}
      >
        {/* Üst Rozet Slotu */}
        {topBadges && (
          <div className="absolute top-3.5 left-3.5 right-12 z-30 flex flex-wrap gap-2 pointer-events-none">
            {topBadges}
          </div>
        )}

        {/* Aktif Sahne Modu */}
        {activeMode === "spin" && spinFrames.length > 0 ? (
          <SpinCanvasStage
            product={product}
            spinFrames={spinFrames}
            priority={priority}
            accompaniment={accompaniment}
            specularTone={specularTone}
            reducedMotion={reducedMotion}
          />
        ) : activeMode === "crumb" && crumbSrc ? (
          <CrumbComparisonStage
            product={product}
            crumbUrl={crumbSrc}
            accompaniment={accompaniment}
            priority={priority}
          />
        ) : activeMode === "video" && videoSrc ? (
          <AmbientVideoStage product={product} videoUrl={videoSrc} reducedMotion={reducedMotion} />
        ) : (
          <div className="w-full h-full atelier-perspective">
            <motion.div
              ref={stageTiltRef}
              onPointerMove={handle3dPointerMove}
              onPointerLeave={handle3dPointerLeave}
              style={reducedMotion ? undefined : { rotateX, rotateY }}
              className={`relative w-full h-full atelier-preserve-3d flex items-center justify-center ${
                specularTone === "frost"
                  ? "bg-gradient-to-br from-[#EEF4F7] via-[#E4EDF2] to-[#D8E5ED] dark:from-[#161E24] dark:via-[#12191E] dark:to-[#0E1317]"
                  : "bg-gradient-to-br from-[#F3E5CE] via-[#EAD4B0] to-[#DFC092] dark:from-[#261E19] dark:via-[#1E1713] dark:to-[#17120E]"
              }`}
            >
              <div className="relative w-full h-full overflow-hidden atelier-layer-mid">
                <SafeProductImage
                  src={product.imageUrl}
                  fallbackSrc={getProductPlaceholder(product.category)}
                  alt={product.name}
                  priority={priority}
                  isAccompanimentItem={accompaniment}
                  className="w-full h-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none"
                />
              </div>

              {/* Speküler Işık Katmanı */}
              <div
                aria-hidden="true"
                className={`absolute inset-0 z-20 ${
                  specularTone === "frost" ? "specular-frost" : "specular-ember"
                }`}
              />
            </motion.div>
          </div>
        )}

        {/* Alt Künye Slotu (spin ve crumb'da kendi alt kontrolü çakışmasın diye yalnız 3d / video'da içeride veya altta) */}
        {bottomMeta && activeMode !== "spin" && activeMode !== "crumb" && (
          <div className="absolute bottom-3.5 left-3.5 right-3.5 z-30 pointer-events-none">
            {bottomMeta}
          </div>
        )}
      </div>

      {/* Spin veya kesit modunda alt künye çakışmasın diye sahne dışında göster */}
      {bottomMeta && (activeMode === "spin" || activeMode === "crumb") && (
        <div className="px-1">{bottomMeta}</div>
      )}

      {/* Dinamik Mod Seçici Haplar */}
      {showModeSelector && (
        <div
          role="group"
          aria-label="Ürün görünüm modları"
          className="flex flex-wrap items-center gap-1.5"
        >
          {availableModes.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveMode(mode.id)}
                className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-sans font-semibold inline-flex items-center gap-1.5 transition-colors border ${
                  isActive
                    ? "bg-accent text-white border-accent shadow-xs"
                    : "bg-cream-surface text-ink border-line hover:border-accent/50"
                }`}
              >
                {mode.id === "spin" && <RotateCw aria-hidden="true" className="w-3.5 h-3.5" />}
                {mode.id === "3d" && <Box aria-hidden="true" className="w-3.5 h-3.5" />}
                {mode.id === "crumb" && <Scissors aria-hidden="true" className="w-3.5 h-3.5" />}
                {mode.id === "video" && <Film aria-hidden="true" className="w-3.5 h-3.5" />}
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
