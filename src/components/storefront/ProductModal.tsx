"use client";

import { storefrontAction } from "@/lib/design/storefront";
import React, { useState, useEffect, useId, useRef } from "react";
import { formatMoney } from "@/lib/format/currency";
import { Modal } from "@/components/common/Modal";
import { formatProductAmount } from "@/lib/products/format";
import type { ExtendedProduct } from "@/types";
import { productBadges } from "@/lib/products/badges";
import { isAccompaniment } from "@/lib/products/grouping";
import { getDefaultStorageGuidance } from "@/lib/products/foodCompliance";
import { FoodComplianceNotice } from "@/components/storefront/FoodComplianceNotice";
import {
  ProductShowcaseStage,
  type ShowcaseMode,
} from "@/components/storefront/ProductShowcaseStage";
import { useCartStore } from "@/lib/store/useCartStore";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { getSaleScheduleBadge } from "@/lib/ordering/saleDates";
import {
  X,
  ShoppingBag,
  Check,
  Plus,
  Minus,
  Wheat,
  Milk,
  Utensils,
  Flame,
  Droplets,
  CalendarDays,
} from "lucide-react";

interface ProductModalProps {
  product: ExtendedProduct | null;
  initialMode?: ShowcaseMode;
  onClose: () => void;
}

export function ProductModal({ product, initialMode, onClose }: ProductModalProps) {
  const [mounted, setMounted] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"story" | "pairing">("story");
  const tabId = useId();
  const tabListRef = useRef<HTMLDivElement>(null);
  const handleTabKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle keys consistently even when a browser exposes focusGroup without tablist behavior.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "story" : event.key === "End" ? "pairing" : activeTab === "story" ? "pairing" : "story";
    setActiveTab(next);
    tabListRef.current?.querySelector<HTMLButtonElement>(`[data-detail-tab="${next}"]`)?.focus();
  };
  const addItem = useCartStore((state) => state.addItem);
  const today = useIstanbulToday();
  const scheduleBadge = product ? getSaleScheduleBadge(product, today) : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQuantity(1);
    setIsAdded(false);
    setActiveTab("story");
  }, [product?.id]);

  if (!product || !mounted) return null;

  const accompaniment = isAccompaniment(product);
  const masterclass = product.masterclass;
  const storageGuidance =
    masterclass?.pairingStorage?.trim() || getDefaultStorageGuidance(product);
  const badges = productBadges(product);

  const handleAddToCart = () => {
    const success = addItem(product, null, quantity);
    if (success) {
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
        onClose();
      }, 1000);
    }
  };

  const topStageBadges = (
    <>
      {product.saleWeekdays &&
      product.saleWeekdays.length > 0 &&
      product.saleWeekdays.length < 7 &&
      scheduleBadge ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full sf-accent-fill border border-accent text-xs font-sans font-bold tracking-wide shadow-md">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>{scheduleBadge}</span>
        </span>
      ) : accompaniment ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-surface text-ink border border-line text-xs font-sans font-bold tracking-wide shadow-md">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-good" />
          <span>
            {product.madeToOrder
              ? "Sipariş Üzerine Hazırlanır"
              : "Günlük Taze Mandıra & Şarküteri"}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-surface text-ink border border-line text-xs font-sans font-bold tracking-wide shadow-md">
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-good animate-pulse"
          />
          <span>
            {product.madeToOrder ? "Ön Siparişle Taze Pişer" : "Teslim günü sepette seçilir"}
          </span>
        </span>
      )}
    </>
  );

  const bottomStageMeta =
    product.weight > 0 ? (
      <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cream-surface/95 text-ink border border-line text-xs font-sans shadow-md backdrop-blur-sm">
        <span className="font-serif font-bold text-sm text-ink">
          {product.weight >= 1000 && product.weightUnit === "ml"
            ? `${product.weight / 1000}L`
            : `${product.weight}${product.weightUnit || "g"}`}
        </span>
        {!accompaniment && product.hydration ? (
          <>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1 text-xs text-ink-muted font-medium">
              <Droplets aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
              %{product.hydration} Hidrasyon
            </span>
          </>
        ) : null}
      </div>
    ) : undefined;

  return (
    <Modal open={Boolean(product)} onClose={onClose} labelledBy="product-modal-title"
      className="sf-dialog w-[calc(100%-1.5rem)] max-w-4xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-cream-surface shadow-2xl animate-fadeIn">
      <div className="relative w-full flex flex-col md:flex-row md:max-h-[92dvh] text-ink">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={storefrontAction({ variant: "secondary", size: "icon", className: "absolute top-3.5 right-3.5 z-30 flex items-center justify-center" })}
          title="Kapat"
          aria-label="Kapat"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>

        {/* Left: Interactive Showcase Stage */}
        <div className="w-full md:w-5/12 p-3 sm:p-4 bg-bg shrink-0 flex flex-col justify-center border-b md:border-b-0 md:border-r border-line md:overflow-y-auto">
          <ProductShowcaseStage
            product={product}
            variant="modal"
            initialMode={initialMode}
            priority
            topBadges={topStageBadges}
            bottomMeta={bottomStageMeta}
          />
        </div>

        {/* Right: Story, Food Compliance & Add to Cart */}
        <div className="p-5 sm:p-7 flex-1 min-w-0 flex flex-col justify-between md:overflow-y-auto space-y-5 bg-cream-surface">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono text-ink font-semibold uppercase tracking-wider">
                {accompaniment
                  ? "Üretim & Kaynak Notları"
                  : "Fırın Zanaatı & Reçete"}
              </div>
              <h2
                id="product-modal-title"
                className="sf-dialog-title font-serif text-2xl sm:text-3xl font-bold text-ink mt-1 leading-snug"
              >
                {product.name}
              </h2>
              <div className="font-serif text-2xl font-bold text-ink mt-1 flex items-baseline gap-1">
                <span className="sf-price">{formatMoney(product.price)}</span>
                <span className="text-sm font-sans font-normal text-ink-muted">/ {formatProductAmount(product)}</span>
                {product.compareAtPrice ? (
                  <span className="text-sm font-sans font-normal text-ink-muted line-through ml-1">
                    {formatMoney(product.compareAtPrice)}
                  </span>
                ) : null}
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {badges.map((b) => (
                    <span
                      key={b.label}
                      className="px-2 py-0.5 rounded-full bg-accent/15 text-ink border border-accent/30 text-xs font-bold uppercase"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sale Schedule Info */}
            {scheduleBadge && (
              <div className="p-3.5 rounded-2xl bg-bg border border-line flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <CalendarDays aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs font-semibold text-ink font-sans">
                    {scheduleBadge}
                  </span>
                </div>
                <span className="text-xs text-ink-muted font-sans font-medium">
                  {accompaniment
                    ? "Taze Tedarik Günü"
                    : product.saleWeekdays && product.saleWeekdays.length > 0
                    ? "Özel Fırın Günü"
                    : "Taş Fırın"}
                </span>
              </div>
            )}

            {/* Quick Specs Chips (Breads only) */}
            {!accompaniment && product.hydration ? (
              <div className="flex flex-wrap gap-2 text-xs font-sans">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-line text-ink-muted">
                  <Droplets aria-hidden="true" className="w-3 h-3 text-accent" />
                  %{product.hydration} Hidrasyon
                </span>
              </div>
            ) : null}

            {/* Sub-tabs */}
            <div ref={tabListRef} className="flex border-b border-line gap-1 pt-1 overflow-x-auto" role="tablist" aria-label="Ürün bilgileri"
              {...{ focusgroup: "tablist nomemory" }} onKeyDown={handleTabKey}>
              <button
                type="button"
                role="tab"
                id={`${tabId}-story-tab`}
                aria-controls={`${tabId}-story-panel`}
                data-detail-tab="story"
                tabIndex={activeTab === "story" ? 0 : -1}
                {...(activeTab === "story" ? { focusgroupstart: "" } : {})}
                aria-selected={activeTab === "story"}
                onFocus={() => setActiveTab("story")}
                onClick={() => setActiveTab("story")}
                className="sf-tab"
              >
                {accompaniment ? "Üretici & Kaynak" : "Zanaat & Un"}
              </button>
              <button
                type="button"
                role="tab"
                id={`${tabId}-pairing-tab`}
                aria-controls={`${tabId}-pairing-panel`}
                data-detail-tab="pairing"
                tabIndex={activeTab === "pairing" ? 0 : -1}
                {...(activeTab === "pairing" ? { focusgroupstart: "" } : {})}
                aria-selected={activeTab === "pairing"}
                onFocus={() => setActiveTab("pairing")}
                onClick={() => setActiveTab("pairing")}
                className="sf-tab"
              >
                Tüketim & Saklama
              </button>
            </div>

            {/* Tab 1 */}
            <div hidden={activeTab !== "story"} role="tabpanel" id={`${tabId}-story-panel`} aria-labelledby={`${tabId}-story-tab`} tabIndex={0} className="sf-copy space-y-3 text-ink-muted font-sans">
                <div className="p-3.5 rounded-2xl bg-bg border border-line space-y-1.5 shadow-xs">
                  <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                    {accompaniment ? (
                      <>
                        <Milk aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                        <span>Üretici & Kaynak:</span>
                      </>
                    ) : (
                      <>
                        <Wheat aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                        <span>Unun ve Mayanın Kökeni:</span>
                      </>
                    )}
                  </div>
                  <p className="sf-copy text-xs text-ink-muted">
                    {masterclass?.flourHeritage || product.description}
                  </p>
                </div>

                {masterclass?.technique && (
                  <div className="p-3.5 rounded-2xl bg-bg border border-line space-y-1.5 shadow-xs">
                    <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                      <Flame aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                      <span>
                        {accompaniment
                          ? "Üretim & Kaynak Notları:"
                          : "Fermantasyon ve Pişirme Tekniği:"}
                      </span>
                    </div>
                    <p className="sf-copy text-xs text-ink-muted">{masterclass.technique}</p>
                  </div>
                )}

                {!accompaniment && product.flourTypes && product.flourTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs font-sans text-ink-muted self-center mr-1">
                      Un Seçkisi:
                    </span>
                    {product.flourTypes.map((flour, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-bg border border-line text-xs font-sans font-medium text-ink"
                      >
                        {flour}
                      </span>
                    ))}
                  </div>
                )}

                {accompaniment && product.ingredients && product.ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs font-sans text-ink-muted self-center mr-1">
                      İçindekiler:
                    </span>
                    {product.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-bg border border-line text-xs font-sans font-medium text-ink"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                )}
              </div>


            {/* Tab 2: Tüketim & Saklama */}
            <div hidden={activeTab !== "pairing"} role="tabpanel" id={`${tabId}-pairing-panel`} aria-labelledby={`${tabId}-pairing-tab`} tabIndex={0} className="sf-copy space-y-3 text-ink-muted font-sans">
                <div className="sf-panel p-4 rounded-2xl bg-bg border border-line space-y-2 shadow-xs">
                  <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                    <Utensils aria-hidden="true" className="w-4 h-4 text-accent" />
                    <span>Nasıl Tüketilmeli & Saklanmalı?</span>
                  </div>
                  <p className="sf-copy text-xs text-ink-muted leading-relaxed">
                    {storageGuidance}
                  </p>
                </div>
              </div>


            {/* Mandatory TGK Raw Milk Shield & Allergen Notice (always visible before CTA) */}
            <FoodComplianceNotice product={product} variant="full" />
          </div>

          {/* Bottom Add to Cart CTA */}
          <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center justify-between rounded-xl bg-bg border border-line overflow-hidden shadow-xs">
              <button
                type="button"
                aria-label="Miktarı azalt"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className={storefrontAction({ variant: "secondary", size: "icon", className: "flex items-center justify-center" })}
              >
                <Minus aria-hidden="true" className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-serif text-sm font-bold text-ink">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Miktarı artır"
                onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                disabled={quantity >= 100}
                className={storefrontAction({ variant: "secondary", size: "icon", className: "flex items-center justify-center" })}
              >
                <Plus aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.isAvailable === false}
              className={storefrontAction({ variant: "primary", className: "flex-1" })}
            >
              {isAdded ? (
                <>
                  <Check aria-hidden="true" className="w-4 h-4 stroke-[2.5]" />
                  <span>Sepete eklendi</span>
                </>
              ) : (
                <>
                  <ShoppingBag aria-hidden="true" className="w-4 h-4" />
                  <span>
                    {product.isAvailable === false
                      ? "Tükendi"
                      : `Sepete ekle · ${formatMoney(product.price * quantity)}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
