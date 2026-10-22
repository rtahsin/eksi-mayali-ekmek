"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface SahneOlcumu {
  el: HTMLElement;
  /** Sahnenin içindeki ilerleme, 0–1 (sabit kısım ekranı terk edene kadar). */
  p: number;
  ust: number;
}

// Kökteki her [data-sahne] öğesine kaydırma ilerlemesini --p olarak yazar; CSS hareketleri buradan okur.
// Her karede isteğe bağlı geri çağırma, ölçümlerle çağrılır (gün cetveli gibi sayfaya özel davranışlar için).
export function useSahneIlerleme(kok: RefObject<HTMLElement | null>, kare?: (olcum: SahneOlcumu[]) => void) {
  const kareRef = useRef(kare);
  useEffect(() => {
    kareRef.current = kare;
  });

  useEffect(() => {
    const el = kok.current;
    if (!el) return;
    let bekleyen = false;
    function ciz() {
      bekleyen = false;
      const vh = window.innerHeight;
      const olcum = Array.from(el!.querySelectorAll<HTMLElement>("[data-sahne]")).map((s) => {
        const r = s.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
        s.style.setProperty("--p", p.toFixed(4));
        return { el: s, p, ust: r.top };
      });
      kareRef.current?.(olcum);
    }
    function iste() {
      if (!bekleyen) {
        bekleyen = true;
        requestAnimationFrame(ciz);
      }
    }
    window.addEventListener("scroll", iste, { passive: true });
    window.addEventListener("resize", iste);
    ciz();
    return () => {
      window.removeEventListener("scroll", iste);
      window.removeEventListener("resize", iste);
    };
  }, [kok]);
}
