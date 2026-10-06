"use client";

import { useEffect, useRef } from "react";
import { trackLearningSession } from "@/lib/engagement/track";

export function LearningTracker({ path }: { path: string }) {
  const startRef = useRef(Date.now());

  useEffect(() => {
    const onHide = () => {
      const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
      trackLearningSession({
        durationSeconds,
        cardsViewed: 0,
        path,
      });
    };

    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [path]);

  return null;
}
