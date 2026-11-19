"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Product } from "@/types";
import { useCartStore } from "@/lib/store/useCartStore";
import { storefrontAction } from "@/lib/design/storefront";

export interface QuickAddPairingButtonProps {
  product: Product;
  className?: string;
}

export function QuickAddPairingButton({
  product,
  className = "",
}: QuickAddPairingButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isUnavailable = product.isAvailable === false;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnavailable) return;

    const added = addItem(product, null, 1);
    if (!added) return;

    setJustAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setJustAdded(false);
    }, 1500);
  };

  return (
    <button
      type="button"
      disabled={isUnavailable}
      onClick={handleClick}
      aria-label={
        isUnavailable
          ? `${product.name} tükendi`
          : justAdded
          ? `${product.name} sepete eklendi`
          : `${product.name} sepete ekle`
      }
      className={storefrontAction({
        variant: justAdded ? "primary" : "secondary",
        size: "default",
        className: `inline-flex items-center justify-center gap-1.5 text-xs font-sans font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${className}`.trim(),
      })}
    >
      {isUnavailable ? (
        <span>Tükendi</span>
      ) : justAdded ? (
        <>
          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Eklendi</span>
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Sepete Ekle</span>
        </>
      )}
    </button>
  );
}
