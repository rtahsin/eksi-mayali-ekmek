"use client";

import { useEffect, useState } from "react";
import { istanbulToday } from "@/lib/time/istanbul";

/**
 * İstanbul'a göre bugünün tarihi (`YYYY-MM-DD`). Sayfa açık kalsa da gece yarısı
 * geçince güncellenir (admin/kurye PWA'ları gün boyu açık kalır).
 */
export function useIstanbulToday(): string {
  const [today, setToday] = useState(() => istanbulToday());

  useEffect(() => {
    const tick = () => {
      const now = istanbulToday();
      setToday((prev) => (prev === now ? prev : now));
    };
    const timer = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return today;
}
