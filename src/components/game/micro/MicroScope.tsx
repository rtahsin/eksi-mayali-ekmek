"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MicroEntityKind, MicroPhase, MicroSnapshot } from "@/types/game";
import { ENTITY_LABEL, MicroWorld, SCALE_BAR, type Magnification } from "./world";

/** Lab Büyüteci: hamurun içindeki canlı dünya (canvas). Snapshot değiştikçe dünya yumuşakça ona akar. */

const PHASE_LABEL: Record<MicroPhase, string> = {
  kavanoz: "Maya kavanozu",
  otoliz: "Otoliz",
  yogurma: "Yoğurma",
  mayalanma: "Mayalanma",
  sekil: "Şekil",
  dolap: "Dolap",
  firin: "Fırın",
  sogutma: "Soğuma",
};

function phColor(pH: number) {
  if (pH > 5.5) return "#5E7F3E";
  if (pH > 4.6) return "#C8862C";
  if (pH > 4.0) return "#B4532A";
  return "#9B2C1F";
}

export interface MicroScopeProps {
  snapshot: MicroSnapshot;
  magnification?: Magnification;
  focus?: MicroEntityKind[];
  onEntityTap?: (kind: MicroEntityKind) => void;
  paused?: boolean;
  caption?: string;
  className?: string;
}

export function MicroScope({ snapshot, magnification = "x400", focus, onEntityTap, paused, caption, className = "" }: MicroScopeProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<MicroWorld | null>(null);
  const focusRef = useRef(focus);
  const pausedRef = useRef(paused);
  const [label, setLabel] = useState<{ text: string; x: number; y: number } | null>(null);

  if (!world.current) world.current = new MicroWorld();
  focusRef.current = focus;
  pausedRef.current = paused;

  useEffect(() => {
    world.current?.setSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const cv = canvas.current;
    const box = wrap.current;
    const w = world.current;
    if (!cv || !box || !w) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let slowFrames = 0;

    const fit = () => {
      const size = box.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(size * dpr);
      cv.height = Math.round(size * dpr);
      cv.style.width = `${size}px`;
      cv.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      w.resize(size, size, magnification);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
    });
    io.observe(box);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      // Kare süresi kötüyse varlık sayısını azalt
      if (dt > 0.03) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 30 && w.quality > 0.5) {
        w.quality -= 0.15;
        slowFrames = 0;
      }
      if (!pausedRef.current) w.step(dt, !!reduced);
      w.draw(ctx, focusRef.current);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [magnification]);

  const onTap = (e: React.PointerEvent) => {
    const w = world.current;
    const box = wrap.current;
    if (!w || !box) return;
    const r = box.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const kind = w.hit(x, y);
    if (!kind) return;
    setLabel({ text: ENTITY_LABEL[kind], x, y });
    window.setTimeout(() => setLabel((l) => (l && l.x === x && l.y === y ? null : l)), 1600);
    onEntityTap?.(kind);
  };

  const bar = SCALE_BAR[magnification];
  const heat = snapshot.heat;

  return (
    <figure className={`w-full max-w-[380px] mx-auto ${className}`}>
      <div
        className="relative rounded-full p-[10px] shadow-[0_6px_24px_rgba(59,30,26,0.25)]"
        style={{ background: "conic-gradient(from 210deg, #8C6A3B, #E8C97E, #A67C3D, #F3DC9A, #8C6A3B)" }}
      >
        <div className="relative rounded-full p-[3px]" style={{ background: "#3B1E1A" }}>
          <div ref={wrap} className="relative aspect-square rounded-full overflow-hidden touch-none select-none" onPointerDown={onTap}>
            <canvas ref={canvas} className="block" aria-label="Hamurun mikroskobik görüntüsü" role="img" />
            {/* Vinyet ve mercek kenarı */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: "inset 0 0 40px 14px rgba(59,30,26,0.45), inset 0 0 3px 2px rgba(120,80,160,0.15)" }}
            />
            {/* Göstergeler */}
            <div className="pointer-events-none absolute top-[11%] inset-x-0 flex justify-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-full" style={{ background: "#FBF6ECE6", color: "#3B1E1A" }}>
                {Math.round(heat ? heat.coreC : snapshot.tempC)} °C
              </span>
              <span className="px-2 py-0.5 rounded-full text-white" style={{ background: phColor(snapshot.pH) }}>
                pH {snapshot.pH.toFixed(1).replace(".", ",")}
              </span>
            </div>
            <div className="pointer-events-none absolute bottom-[12%] inset-x-0 flex flex-col items-center gap-0.5 text-xs font-bold" style={{ color: "#FBF6EC" }}>
              <div className="h-[3px] rounded" style={{ width: bar.px, background: "#FBF6EC" }} />
              <span style={{ textShadow: "0 1px 2px #3B1E1A" }}>
                {bar.um} µm · {magnification.replace("x", "×")}
              </span>
            </div>
            <div className="pointer-events-none absolute top-1/2 left-[5%] -translate-y-1/2 text-xs font-bold -rotate-90 origin-left" style={{ color: "#FBF6ECCC" }}>
              {PHASE_LABEL[snapshot.phase]}
            </div>
            {label && (
              <div
                className="pointer-events-none absolute px-2 py-1 rounded-lg text-xs font-bold shadow"
                style={{ left: Math.min(label.x, 240), top: Math.max(8, label.y - 34), background: "#3B1E1A", color: "#FBF6EC" }}
              >
                {label.text}
              </div>
            )}
          </div>
        </div>
      </div>
      {caption && (
        <figcaption className="text-center text-sm mt-3" style={{ color: "#6E5148" }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
