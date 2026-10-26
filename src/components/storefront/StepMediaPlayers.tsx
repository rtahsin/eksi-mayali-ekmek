"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

/**
 * Kısa klip: sessiz döngü, yalnız ekrandayken oynar (mobil veride bütün klipler birden inmesin).
 * `#t=0.1` ilk kareyi kapak olarak gösterir.
 */
export function LoopVideo({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !reduce) void v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={`${src}#t=0.1`}
      muted
      loop
      playsInline
      preload="metadata"
      controls
      aria-label={label}
      className="block w-full h-auto max-h-[80vh] bg-cream-surface"
    />
  );
}

/**
 * YouTube: tıklanana kadar yalnız kapak resmi; tıklanınca çerezsiz (youtube-nocookie) oynatıcı yüklenir.
 */
export function YouTubeFacade({ videoId, title }: { videoId: string; title: string }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Videoyu oynat: ${title}`}
      className="group relative block aspect-video w-full bg-ink/10 overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube kapak resmi */}
      <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <Play className="w-7 h-7 ml-1" fill="currentColor" />
        </span>
      </span>
    </button>
  );
}
