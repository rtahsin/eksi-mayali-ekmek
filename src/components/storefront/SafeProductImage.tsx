"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [failedOnce, setFailedOnce] = useState<boolean>(false);
  const [prevPropKey, setPrevPropKey] = useState<string>(
    `${normalizedSrc}|${resolvedFallback}`
  );

  const propKey = `${normalizedSrc}|${resolvedFallback}`;
  if (propKey !== prevPropKey) {
    setPrevPropKey(propKey);
    setCurrentSrc(normalizedSrc);
    setFailedOnce(false);
  }

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth === 0 && !failedOnce && currentSrc !== resolvedFallback) {
      setFailedOnce(true);
      setCurrentSrc(resolvedFallback);
    }
  }, [currentSrc, resolvedFallback, failedOnce]);

  const handleError = () => {
    if (!failedOnce && currentSrc !== resolvedFallback) {
      setFailedOnce(true);
      setCurrentSrc(resolvedFallback);
    }
  };

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      onError={handleError}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={`${className} opacity-100`.trim()}
    />
  );
}
