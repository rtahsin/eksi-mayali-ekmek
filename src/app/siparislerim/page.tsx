"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Loader2,
  PackageSearch,
  RotateCcw,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import {
  readDeviceOrders,
  updateDeviceOrderItems,
  type DeviceOrder,
  type DeviceOrderItem,
} from "@/lib/orders/deviceOrders";
import { formatTrDate } from "@/lib/time/istanbul";
import { ORDER_STATUS_LABELS, type CanonicalOrderStatus } from "@/lib/orders/normalize";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import type { TrackingOrder } from "@/types/tracking";

function mapTrackingItems(order: TrackingOrder): DeviceOrderItem[] {
  return order.items
    .filter((it) => Boolean(it.productId || it.name))
    .map((it) => ({
      productId: it.productId ?? "",
      name: it.name || "Ürün",
      quantity: Math.max(1, Math.floor(it.quantity) || 1),
    }));
}

/** Bu cihazdan verilen siparişler — giriş gerektirmez (imzalı takip token'ları cihazda). */
export default function DeviceOrdersPage() {
  const [orders, setOrders] = useState<DeviceOrder[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, CanonicalOrderStatus>>({});
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, string>>({});

  const { isLoggedIn, openAuthModal } = useAuth();
  const { allProducts, loading: productsLoading } = useProducts();
  const applyReorder = useCartStore((s) => s.applyReorder);
  const lastCompleted = useCartStore((s) => s.lastCompleted);

  useEffect(() => {
    const list = readDeviceOrders();
    setOrders(list);

    // En yeni 10 siparişin güncel durumunu (ve eksikse kalem özetini) getir
    list.slice(0, 10).forEach((o) => {
      fetch(`/api/orders/${encodeURIComponent(o.orderNumber)}?t=${encodeURIComponent(o.token)}`, {
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { order?: TrackingOrder } | null) => {
          const tracked = data?.order;
          if (!tracked) return;
          if (tracked.status) {
            setStatuses((prev) => ({ ...prev, [o.id]: tracked.status }));
          }
          if (o.items === undefined && Array.isArray(tracked.items)) {
            const mapped = mapTrackingItems(tracked);
            updateDeviceOrderItems(o.id, mapped);
            setOrders((prev) =>
              prev ? prev.map((item) => (item.id === o.id ? { ...item, items: mapped } : item)) : prev
            );
          }
        })
        .catch(() => {
          // durum gösterilmez, link yine çalışır
        });
    });
  }, []);

  // Bu sayfada çekmeceden yeni sipariş tamamlanırsa listeyi tazele
  useEffect(() => {
    if (!lastCompleted) return;
    setOrders(readDeviceOrders());
  }, [lastCompleted]);

  const setTemporaryNotice = (orderId: string, text: string) => {
    setNotices((prev) => ({ ...prev, [orderId]: text }));
    setTimeout(() => {
      setNotices((prev) => {
        if (prev[orderId] !== text) return prev;
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }, 4000);
  };

  const handleReorder = async (order: DeviceOrder) => {
    let itemsToUse = order.items;

    if (!itemsToUse || itemsToUse.length === 0) {
      setReorderingId(order.id);
      try {
        const lookup = order.orderNumber || order.id;
        const res = await fetch(
          `/api/orders/${encodeURIComponent(lookup)}?t=${encodeURIComponent(order.token)}`,
          { cache: "no-store" }
        );
        const data: { order?: TrackingOrder } | null = res.ok ? await res.json() : null;
        if (!data?.order) {
          setTemporaryNotice(order.id, "Sipariş kalemleri şu an alınamadı. Lütfen tekrar deneyin.");
          return;
        }
        itemsToUse = mapTrackingItems(data.order);
        updateDeviceOrderItems(order.id, itemsToUse);
        setOrders((prev) =>
          prev ? prev.map((item) => (item.id === order.id ? { ...item, items: itemsToUse } : item)) : prev
        );
      } catch {
        setTemporaryNotice(order.id, "Sipariş kalemleri şu an alınamadı. Lütfen tekrar deneyin.");
        return;
      } finally {
        setReorderingId(null);
      }
    }

    const result = applyReorder(allProducts, itemsToUse);
    if (result.addedCount === 0) {
      setTemporaryNotice(order.id, "Bu siparişteki ürünler şu anda satışta bulunmuyor.");
      return;
    }

    if (result.unavailableNames.length > 0) {
      setTemporaryNotice(
        order.id,
        `${result.addedCount} ürün sepete eklendi (${result.unavailableNames.join(", ")} şu an satışta değil).`
      );
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto space-y-5">
        <header className="text-center space-y-1">
          <Link href="/" className="font-serif text-lg font-bold text-foreground">
            Ekmek<span className="text-artisan-gold italic">Lab</span>
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">Siparişlerim</h1>
          <p className="text-xs text-foreground/50">Bu cihazdan verdiğiniz siparişler</p>
        </header>

        {orders === null ? null : orders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface-panel border border-surface-border text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-artisan-gold mx-auto" />
            <p className="text-sm text-foreground/70">Bu cihazda kayıtlı sipariş yok.</p>
            <p className="text-xs text-foreground/50">
              Başka bir cihazdan verdiyseniz sipariş sonrası verilen takip linkini kullanabilir ya da giriş yapabilirsiniz.
            </p>
            <Link href="/" className="inline-block px-5 py-2.5 rounded-xl bg-artisan-terracotta text-white text-sm font-semibold">
              Ürünlere göz at
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => {
              const status = statuses[o.id];
              const isBusy = reorderingId === o.id;
              const notice = notices[o.id];
              const itemSummary =
                o.items && o.items.length > 0
                  ? o.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")
                  : null;

              return (
                <li
                  key={o.id}
                  className="rounded-2xl bg-surface-panel border border-surface-border hover:border-artisan-gold/40 transition-colors overflow-hidden"
                >
                  <Link
                    href={`/siparis-takip/${encodeURIComponent(o.orderNumber)}?t=${encodeURIComponent(o.token)}`}
                    className="flex items-center gap-3 p-4"
                  >
                    <PackageSearch className="w-5 h-5 text-artisan-gold shrink-0" />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="font-mono text-sm font-bold text-foreground">{o.orderNumber}</div>
                      <div className="text-xs text-foreground/60">
                        {formatTrDate(o.deliveryDate, "long")} · {o.totalAmount.toLocaleString("tr-TR")} ₺
                      </div>
                      {itemSummary && (
                        <div className="text-xs text-foreground/50 truncate">{itemSummary}</div>
                      )}
                    </div>
                    {status && (
                      <span className="text-xs px-2 py-1 rounded-full bg-artisan-gold/10 text-artisan-gold border border-artisan-gold/20 shrink-0">
                        {ORDER_STATUS_LABELS[status]}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-foreground/30 shrink-0" />
                  </Link>

                  <div className="px-4 py-2.5 border-t border-surface-border/70 bg-surface/40 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReorder(o)}
                      disabled={isBusy || (productsLoading && allProducts.length === 0)}
                      className="touch-target-44 px-3.5 py-2 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta-dark text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Tekrar Sipariş Ver</span>
                    </button>

                    {notice && (
                      <span role="status" className="text-xs text-foreground/70">
                        {notice}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="p-4 rounded-2xl bg-surface-panel border border-surface-border text-xs text-foreground/60 flex items-start gap-2.5">
          <UserCheck className="w-4 h-4 text-artisan-gold shrink-0 mt-0.5" />
          {isLoggedIn ? (
            <span>
              Hesabınıza bağlı tüm siparişler için{" "}
              <Link href="/hesabim/siparisler" className="underline text-foreground">
                hesap sayfanıza
              </Link>{" "}
              gidin. Bu cihazdaki siparişler girişte hesabınıza otomatik eklenir.
            </span>
          ) : (
            <span>
              Siparişlerinizi her cihazdan görmek için{" "}
              <button type="button" onClick={() => openAuthModal()} className="underline text-foreground">
                giriş yapın
              </button>
              ; bu cihazdaki siparişler hesabınıza otomatik eklenir.
            </span>
          )}
        </div>
      </div>

      <CartDrawer />
      <OrderSuccessModal />
    </main>
  );
}
