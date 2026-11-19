"use client";

import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { FoodComplianceNotice } from "@/components/storefront/FoodComplianceNotice";
import { SafeProductImage } from "@/components/storefront/SafeProductImage";
import { storefrontAction } from "@/lib/design/storefront";
import { formatMoney } from "@/lib/format/currency";
import { getFoodComplianceSummary } from "@/lib/products/foodCompliance";
import { formatProductAmount } from "@/lib/products/format";
import { isAccompaniment } from "@/lib/products/grouping";
import type { Product } from "@/types";
import type { CartItem } from "@/types/cart";

export interface CartItemListProps {
  items: CartItem[];
  allProducts: Product[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export function CartItemList({
  items,
  allProducts,
  onRemoveItem,
  onUpdateQuantity,
}: CartItemListProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider">
        Seçilen Ürünler
      </div>
      <div className="space-y-1.5">
        {items.map((item) => {
          const catalogProduct = allProducts.find((p) => p.id === item.productId);
          const complianceProduct = catalogProduct ?? item;
          const complianceSummary = getFoodComplianceSummary(complianceProduct);
          const hasComplianceNotice =
            complianceSummary.isRawMilk || complianceSummary.allergens.length > 0;
          const accompaniment = catalogProduct ? isAccompaniment(catalogProduct) : false;
          const amountLabel = formatProductAmount({
            weight: item.weight,
            weightUnit: item.weightUnit ?? catalogProduct?.weightUnit,
          });

          return (
            <div
              key={item.productId}
              className="p-2.5 rounded-2xl bg-cream-surface border border-line space-y-1.5 shadow-2xs"
            >
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 items-start">
                <SafeProductImage
                  src={catalogProduct?.imageUrl || item.imageUrl}
                  alt={item.name}
                  isAccompanimentItem={accompaniment}
                  className="w-12 h-12 rounded-xl object-cover bg-line/40 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-bold text-sm leading-snug text-ink break-words">
                    {item.name}
                  </div>
                  <div className="text-xs font-sans leading-snug text-ink-muted">
                    {amountLabel ? `${amountLabel} · ${formatMoney(item.price)}` : formatMoney(item.price)}
                  </div>
                  <div className="font-serif text-sm font-bold leading-snug text-ink mt-0.5">
                    {formatMoney(item.price * item.quantity)}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.productId)}
                    aria-label={`${item.name} ürününü sepetten çıkar`}
                    className={storefrontAction({ variant: "danger", size: "icon", className: "" })}
                  >
                    <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center rounded-lg bg-line/40 border border-line">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                      aria-label="Azalt"
                      className={storefrontAction({
                        variant: "quiet",
                        size: "icon",
                        className: "flex items-center justify-center",
                      })}
                    >
                      <Minus aria-hidden="true" className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-serif text-xs font-bold text-ink">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                      aria-label="Artır"
                      className={storefrontAction({
                        variant: "quiet",
                        size: "icon",
                        className: "flex items-center justify-center",
                      })}
                    >
                      <Plus aria-hidden="true" className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              {hasComplianceNotice && (
                <div className="pt-1.5 border-t border-line/70">
                  <FoodComplianceNotice product={complianceProduct} variant="compact" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
