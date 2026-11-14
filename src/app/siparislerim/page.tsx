"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  PackageSearch,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import {
  readDeviceOrders,
  updateDeviceOrderItems,
  type DeviceOrder,
  type DeviceOrderItem,
} from "@/lib/orders/deviceOrders";
import { parseOrderLookup } from "@/lib/orders/orderId";
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

/** Sipariş numarası (`SIP-YYMM-XXX`) veya tam takip bağlantısından güvenli rota çıkarır. */
function resolveTrackingHref(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (trimmed.includes("/siparis-takip/")) {
    try {
      const parsedUrl = new URL(trimmed, "https://ekmeklab.tr");
      const match = /\/siparis-takip\/([^/?#]+)/i.exec(parsedUrl.pathname);
      if (match?.[1]) {
        const decodedId = decodeURIComponent(match[1]);
        const lookup = parseOrderLookup(decodedId);
        if (lookup) {
          const token = parsedUrl.searchParams.get("t");
          const validToken = token && token.length === 32 ? `?t=${encodeURIComponent(token)}` : "";
          return `/siparis-takip/${encodeURIComponent(lookup.value)}${validToken}`;
        }
      }
    } catch {
      // ham kod kontrolüne düş
    }
  }

  const cleanedCode = trimmed.replace(/^#+/, "").trim();
  const lookup = parseOrderLookup(cleanedCode);
  if (!lookup) return null;
  return `/siparis-takip/${encodeURIComponent(lookup.value)}`;
}

function StatusBadge({ status }: { status: CanonicalOrderStatus }) {
  if (status === "teslim_edildi") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-good/15 text-good border border-good/30 font-bold shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{ORDER_STATUS_LABELS[status]}</span>
      </span>
    );
  }
  if (status === "iptal") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bad/10 text-bad border border-bad/30 font-bold shrink-0">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{ORDER_STATUS_LABELS[status]}</span>
      </span>
    );
  }
  if (status === "firinda") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 font-bold shrink-0">
        <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{ORDER_STATUS_LABELS[status]}</span>
      </span>
    );
  }
  if (status === "kuryede") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 font-bold shrink-0">
        <Truck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{ORDER_STATUS_LABELS[status]}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg text-ink border border-line font-semibold shrink-0">
      <Clock className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
      <span>{ORDER_STATUS_LABELS[status]}</span>
    </span>
  );
}

/** Bu cihazdan verilen siparişler + doğrudan takip kodu / bağlantısı ile sorgulama. */
export default function DeviceOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<DeviceOrder[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, CanonicalOrderStatus>>({});
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, string>>({});

  const [lookupInput, setLookupInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);

  const { isLoggedIn, openAuthModal } = useAuth();
  const { allProducts, loading: productsLoading } = useProducts();
  const applyReorder = useCartStore((s) => s.applyReorder);
  const lastCompleted = useCartStore((s) => s.lastCompleted);

  useEffect(() => {
    const list = readDeviceOrders();
    setOrders(list);

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

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const href = resolveTrackingHref(lookupInput);
    if (!href) {
      setLookupError(
        "Geçerli bir sipariş numarası (Ör: SIP-2611-001) veya sipariş takip bağlantısı girin."
      );
      return;
    }
    setLookupError(null);
    router.push(href);
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
    <main className="min-h-screen bg-bg text-ink px-4 py-8 sm:py-12 selection:bg-accent selection:text-white">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Üst Başlık */}
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="touch-target-44 min-h-[44px] px-3 py-2 rounded-xl bg-cream-surface border border-line hover:border-accent text-ink-muted hover:text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Fırın Vitrini</span>
            </Link>
            <Link href="/" className="font-serif text-lg font-bold text-ink">
              Ekmek<span className="text-accent italic">Lab</span>
            </Link>
          </div>

          <div className="text-center space-y-1 pt-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Siparişlerim</h1>
            <p className="text-xs sm:text-sm text-ink-muted font-sans">
              Bu cihazdan verdiğiniz siparişler ve hızlı sipariş sorgulama
            </p>
          </div>
        </header>

        {/* Doğrudan Sipariş Kodu / Bağlantısı Sorgulama Kutusu */}
        <search>
          <form
            onSubmit={handleLookupSubmit}
            aria-labelledby="direct-order-lookup-heading"
            className="p-4 sm:p-5 rounded-3xl bg-cream-surface border border-line shadow-xs space-y-3"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
              <h2 id="direct-order-lookup-heading" className="font-serif font-bold text-sm sm:text-base text-ink">
                Sipariş Kodu veya Takip Bağlantısı ile Bul
              </h2>
            </div>
            <label htmlFor="order-lookup-input" className="block text-xs text-ink-muted font-sans">
              Farklı bir tarayıcıdan sipariş verdiyseniz{" "}
              <span className="font-mono text-ink font-semibold">SIP-YYMM-XXX</span> kodunuzu veya takip linkini yapıştırın:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="order-lookup-input"
                name="orderLookup"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={lookupInput}
                onChange={(e) => {
                  setLookupInput(e.target.value);
                  if (lookupError) setLookupError(null);
                }}
                placeholder="SIP-2611-001 veya takip linki"
                aria-invalid={Boolean(lookupError)}
                className="flex-1 min-w-0 min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm font-mono text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="touch-target-44 min-h-[48px] shrink-0 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Fişi Aç</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
            {lookupError && (
              <p role="alert" className="text-xs text-bad font-sans flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{lookupError}</span>
              </p>
            )}
          </form>
        </search>

        {/* Bu Cihazdaki Siparişler */}
        {orders === null ? null : orders.length === 0 ? (
          <div className="p-7 sm:p-8 rounded-3xl bg-cream-surface border border-line text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent mx-auto">
              <ShoppingBag className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="font-serif font-bold text-base text-ink">
              Bu Cihazda Kayıtlı Sipariş Bulunmuyor
            </h2>
            <p className="text-xs text-ink-muted font-sans leading-relaxed max-w-sm mx-auto">
              Yukarıdaki kutudan <span className="font-mono text-ink">SIP-...</span> kodunuzla sorgulama yapabilir, hesabınıza giriş yapabilir veya sıcak fırın vitrinine göz atabilirsiniz.
            </p>
            <div className="pt-1">
              <Link
                href="/#ekmekler"
                className="touch-target-44 min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs"
              >
                <span>Ürünlere Göz At</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </Link>
            </div>
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
                  className="rounded-3xl bg-cream-surface border border-line hover:border-accent/45 transition-colors overflow-hidden shadow-2xs"
                >
                  <Link
                    href={`/siparis-takip/${encodeURIComponent(o.orderNumber)}?t=${encodeURIComponent(o.token)}`}
                    className="flex items-center gap-3 p-4 sm:p-5"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                      <PackageSearch className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="font-mono text-sm font-bold text-ink">{o.orderNumber}</div>
                      <div className="text-xs text-ink-muted font-sans">
                        {formatTrDate(o.deliveryDate, "long")} ·{" "}
                        <strong className="text-ink">{o.totalAmount.toLocaleString("tr-TR")} ₺</strong>
                      </div>
                      {itemSummary && (
                        <div className="text-xs text-ink-muted truncate font-sans">{itemSummary}</div>
                      )}
                    </div>
                    {status && <StatusBadge status={status} />}
                    <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                  </Link>

                  <div className="px-4 sm:px-5 py-3 border-t border-line bg-bg/55 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReorder(o)}
                      disabled={isBusy || (productsLoading && allProducts.length === 0)}
                      className="touch-target-44 min-h-[44px] px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Tekrar Sipariş Ver</span>
                    </button>

                    {notice && (
                      <span role="status" className="text-xs text-ink font-sans">
                        {notice}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Müdavim Pasaportu Yönlendirme Kartı */}
        <div className="p-4 sm:p-5 rounded-3xl bg-cream-surface border border-line text-xs text-ink-muted flex items-start gap-3 shadow-2xs font-sans leading-relaxed">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
            <UserCheck className="w-4 h-4" aria-hidden="true" />
          </div>
          {isLoggedIn ? (
            <div>
              Hesabınıza bağlı tüm siparişler, adresler ve takvim hatırlatıcısı için{" "}
              <Link href="/hesabim" className="font-semibold underline text-ink hover:text-accent">
                Müdavim Pasaportunuza
              </Link>{" "}
              geçebilirsiniz. Bu cihazdaki siparişler girişte hesabınıza otomatik eklenir.
            </div>
          ) : (
            <div>
              Siparişlerinizi her cihazdan görmek ve adreslerinizi kaydetmek için{" "}
              <button
                type="button"
                onClick={() => openAuthModal("/hesabim")}
                className="touch-target-44 font-semibold underline text-ink hover:text-accent"
              >
                Müdavim Pasaportu ile giriş yapın
              </button>
              ; bu cihazdaki siparişler hesabınıza otomatik bağlanır.
            </div>
          )}
        </div>
      </div>

      <CartDrawer />
      <OrderSuccessModal />
    </main>
  );
}
