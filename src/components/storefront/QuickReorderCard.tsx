"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, ShoppingBag, X } from "lucide-react";
import type { ExtendedProduct, OrderItem } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { buildReorderItems } from "@/lib/order/progression";
import {
  readDeviceOrders,
  updateDeviceOrderItems,
  type DeviceOrderItem,
} from "@/lib/orders/deviceOrders";
import {
  useCartStore,
  type ReorderRequestItem,
} from "@/lib/store/useCartStore";

interface QuickReorderCardProps {
  products: ExtendedProduct[];
}

const DISMISS_SESSION_KEY = "ekmeklab_quick_reorder_dismissed_v1";

function extractTrackingOrder(
  payload: unknown
): { status: string; items: DeviceOrderItem[] } | null {
  if (typeof payload !== "object" || payload === null) return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.order !== "object" || root.order === null) return null;
  const ord = root.order as Record<string, unknown>;
  const status = typeof ord.status === "string" ? ord.status : "";
  if (!Array.isArray(ord.items)) return null;

  const items: DeviceOrderItem[] = [];
  for (const raw of ord.items) {
    if (typeof raw !== "object" || raw === null) continue;
    const it = raw as Record<string, unknown>;
    const productId = typeof it.productId === "string" ? it.productId : "";
    const name = typeof it.name === "string" ? it.name : "";
    const quantity =
      typeof it.quantity === "number" && Number.isFinite(it.quantity) && it.quantity > 0
        ? Math.floor(it.quantity)
        : 1;
    if (productId || name) {
      items.push({ productId, name: name || "Ürün", quantity });
    }
  }

  return { status, items };
}

function isCancelledStatus(status: string | null | undefined): boolean {
  const s = (status || "").toLowerCase().trim();
  return s === "iptal" || s === "cancelled";
}

export function QuickReorderCard({ products }: QuickReorderCardProps) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const { fetchMyOrders } = useOrderHistory();
  const applyReorder = useCartStore((s) => s.applyReorder);

  const [dismissed, setDismissed] = useState(false);
  const [requestedItems, setRequestedItems] = useState<ReorderRequestItem[] | null>(null);
  const fetchedGuestIdRef = useRef<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_SESSION_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // sessionStorage kısıtlıysa yalnız bellek içi state kullanılır
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    if (authLoading && !isLoggedIn) return;

    let cancelled = false;

    const loadFromDevice = async () => {
      const deviceOrders = readDeviceOrders();
      if (deviceOrders.length === 0) {
        if (!cancelled) setRequestedItems(null);
        return;
      }

      const latest = deviceOrders[0];
      if (Array.isArray(latest.items)) {
        if (!cancelled) {
          setRequestedItems(latest.items.length > 0 ? latest.items : null);
        }
        return;
      }

      if (!latest.token) return;
      if (fetchedGuestIdRef.current === latest.id) return;
      fetchedGuestIdRef.current = latest.id;

      try {
        const lookup = latest.orderNumber || latest.id;
        const res = await fetch(
          `/api/orders/${encodeURIComponent(lookup)}?t=${encodeURIComponent(latest.token)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json: unknown = await res.json();
        const extracted = extractTrackingOrder(json);
        if (!extracted) return;

        updateDeviceOrderItems(latest.id, extracted.items);

        if (!cancelled && !isCancelledStatus(extracted.status) && extracted.items.length > 0) {
          setRequestedItems(extracted.items);
        }
      } catch {
        // Arka plan sorgusu başarısız olursa kart sessizce gizli kalır
      }
    };

    const run = async () => {
      if (isLoggedIn && user?.id) {
        if (loadedUserIdRef.current === user.id) return;
        loadedUserIdRef.current = user.id;

        const { orders } = await fetchMyOrders(user.id, 5, 0);
        if (cancelled) return;

        const latestValid = orders.find(
          (o) => !isCancelledStatus(o.status) && o.items.length > 0
        );
        if (latestValid) {
          setRequestedItems(
            latestValid.items.map((it) => ({
              productId: it.productId,
              name: it.productName,
              quantity: it.quantity,
            }))
          );
          return;
        }
      } else {
        loadedUserIdRef.current = null;
      }

      await loadFromDevice();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [authLoading, dismissed, fetchMyOrders, isLoggedIn, user?.id]);

  const plan = useMemo(() => {
    if (!requestedItems || requestedItems.length === 0 || products.length === 0) {
      return null;
    }
    const orderItems: OrderItem[] = requestedItems.map((req) => {
      let resolvedId = req.productId?.trim() || "";
      if (!resolvedId && req.name.trim()) {
        const targetName = req.name.trim().toLocaleLowerCase("tr-TR");
        const byName = products.find(
          (p) => p.name.trim().toLocaleLowerCase("tr-TR") === targetName
        );
        if (byName) resolvedId = byName.id;
      }
      return {
        productId: resolvedId,
        productName: req.name || "Ürün",
        quantity: Math.max(1, Math.floor(req.quantity) || 1),
        unitPrice: 0,
        totalPrice: 0,
      };
    });
    return buildReorderItems(orderItems, products);
  }, [products, requestedItems]);

  if (dismissed || !plan || plan.availableItems.length === 0) {
    return null;
  }

  const summaryText = plan.availableItems
    .map((entry) => `${entry.quantity}× ${entry.product.name}`)
    .join(", ");

  const unavailableSummary =
    plan.unavailableItems.length > 0
      ? plan.unavailableItems.map((u) => u.productName).join(", ")
      : null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    } catch {
      // yok say
    }
  };

  const handleQuickReorder = () => {
    if (!requestedItems) return;
    applyReorder(products, requestedItems);
  };

  return (
    <div className="mb-6 sm:mb-8 rounded-2xl bg-cream-surface border border-line p-4 sm:px-5 sm:py-4 shadow-xs animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 font-sans text-[11px] font-bold uppercase tracking-wider text-accent">
              <RotateCcw className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>MÜDAVİM HIZLI SİPARİŞ</span>
            </span>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Hızlı sipariş kartını kapat"
              className="sm:hidden touch-target-44 -mr-1 p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-line/40 transition-colors shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-sm sm:text-base font-sans text-ink leading-snug">
            Geçen siparişiniz hazır:{" "}
            <strong className="font-serif font-bold text-ink">{summaryText}</strong>
          </p>

          {unavailableSummary && (
            <p className="text-xs font-sans text-ink-muted">
              Şu an satışta olmayan kalemler eklenmeyecek: {unavailableSummary}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleQuickReorder}
            className="touch-target-44 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 active:scale-[0.99] text-white font-sans text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Tek Tıkla Sepete Ekle</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Hızlı sipariş kartını kapat"
            className="hidden sm:inline-flex touch-target-44 p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-line/40 transition-colors items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
