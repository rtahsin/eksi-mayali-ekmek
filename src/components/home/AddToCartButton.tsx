"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Product } from "@/types";
import { useCartStore } from "@/lib/store/useCartStore";

/** Kartın tek etkileşimli parçası: sepete ekler (sepet kuralları useCartStore'da). */
export function AddToCartButton({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const soldOut = product.isAvailable === false;

  const onClick = () => {
    if (addItem(product, null, 1)) {
      setAdded(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setAdded(false), 1200);
    }
  };

  const base =
    size === "lg"
      ? "h-12 px-6 text-[15px]"
      : "h-10 px-4 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soldOut}
      aria-label={soldOut ? `${product.name} tükendi` : `${product.name} sepete ekle`}
      className={`${base} inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors active:scale-[0.97] disabled:cursor-not-allowed ${
        soldOut
          ? "bg-krem-line text-krem-soft"
          : added
          ? "bg-krem-ink text-white"
          : "bg-krem-accent text-white hover:bg-krem-accent-ink"
      }`}
    >
      {soldOut ? (
        "Tükendi"
      ) : added ? (
        <>
          <Check className="w-4 h-4" aria-hidden="true" /> Eklendi
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" aria-hidden="true" /> Ekle
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {added ? "Sepete eklendi" : ""}
      </span>
    </button>
  );
}
