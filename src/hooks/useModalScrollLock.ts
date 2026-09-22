"use client";

import { useEffect } from "react";

/**
 * Global hook to prevent body scrolling when any modal is open.
 * Can take a single boolean or an array of booleans.
 * If any boolean is true, the body is locked.
 */
export function useModalScrollLock(isOpenStates: boolean | boolean[]) {
  useEffect(() => {
    const statesArray = Array.isArray(isOpenStates) ? isOpenStates : [isOpenStates];
    const isAnyOpen = statesArray.some((state) => state === true);

    if (isAnyOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpenStates]);
}
