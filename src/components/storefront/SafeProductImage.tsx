"use client";

import React, { useEffect, useRef, useState } from "react";
import { Milk, Wheat } from "lucide-react";
import {
  ACCOMPANIMENT_IMAGE_PLACEHOLDER,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "@/lib/products/map";

export interface SafeProductImageProps {
  src: string | null | undefined;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  isAccompanimentItem?: boolean;
}

export function SafeProductImage({
  src,
  fallbackSrc,
  alt,
  className = "",
  priority = false,
  isAccompanimentItem = false,
}: SafeProductImageProps) {
  const resolvedFallback =
    fallbackSrc ||
    (isAccompanimentItem ? ACCOMPANIMENT_IMAGE_PLACEHOLDER : PRODUCT_IMAGE_PLACEHOLDER);
  const normalizedSrc = src && src.trim().length > 0 ? src.trim() : resolvedFallback;

  const imgRef = useRef<HTMLImageElement>(null);
  const [currentSrc, setCurrentSrc] = useState<string>(normalizedSrc);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [failedOnce, setFailedOnce] = useState<boolean>(false);
  const [prevPropKey, setPrevPropKey] = useState<string>(
    `${normalizedSrc}|${resolvedFallback}`
  );

  const propKey = `${normalizedSrc}|${resolvedFallback}`;
  if (propKey !== prevPropKey) {
    setPrevPropKey(propKey);
    setCurrentSrc(normalizedSrc);
    setLoaded(false);
    setFailedOnce(false);
  }

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true);
      } else if (!failedOnce && currentSrc !== resolvedFallback) {
        setFailedOnce(true);
        setCurrentSrc(resolvedFallback);
        setLoaded(true);
      } else {
        setLoaded(true);
      }
    }
  }, [currentSrc, resolvedFallback, failedOnce]);

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleError = () => {
    if (!failedOnce && currentSrc !== resolvedFallback) {
      setFailedOnce(true);
      setCurrentSrc(resolvedFallback);
    }
    setLoaded(true);
  };

  return (
    <>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cream-surface/85 animate-pulse flex items-center justify-center pointer-events-none"
        >
          <div className="w-11 h-11 rounded-full bg-bg/80 border border-line/70 flex items-center justify-center shadow-xs">
            {isAccompanimentItem ? (
              <Milk className="w-5 h-5 text-accent/55" strokeWidth={1.75} />
            ) : (
              <Wheat className="w-5 h-5 text-accent/55" strokeWidth={1.75} />
            )}
          </div>
        </div>
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? undefined : "lazy"}
        decoding="async"
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"}`.trim()}
      />
    </>
  );
}
