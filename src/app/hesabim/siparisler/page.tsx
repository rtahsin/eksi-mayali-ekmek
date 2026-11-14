"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { OrderHistoryCard } from "@/components/customer/OrderHistoryCard";
import { Order } from "@/types";
import {
  ShoppingBag,
  RefreshCw,
  LogIn,
  ArrowRight,
  Link2,
} from "lucide-react";

export default function MusteriSiparislerPage() {
  const { user, loading: authLoading, claimVersion, openAuthModal } = useAuth();
  const { fetchMyOrders, loading: ordersLoading } = useOrderHistory();

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed" | "cancelled">("all");
  const limit = 10;

  const loadOrders = useCallback(
    async (currentOffset = 0, append = false) => {
      if (!user?.id) return;
      const res = await fetchMyOrders(user.id, limit, currentOffset);
      if (append) {
        setOrders((prev) => [...prev, ...res.orders]);
      } else {
        setOrders(res.orders);
      }
      setTotalCount(res.totalCount);
    },
    [user?.id, fetchMyOrders]
  );

  // Giriş yapıldığında ve yeni bir misafir siparişi hesaba bağlandığında (`claimVersion`) listeyi yenile
  useEffect(() => {
    if (user?.id) {
      void loadOrders(0, false);
      setOffset(0);
    }
  }, [user?.id, claimVersion, loadOrders]);

  const handleLoadMore = async () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    await loadOrders(nextOffset, true);
  };

  const handleOrderCancelled = (cancelledOrderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === cancelledOrderId ? { ...o, status: "iptal" } : o))
    );
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === "active") {
        return (
          o.status === "bekliyor" ||
          o.status === "hazirlaniyor" ||
          o.status === "firinda" ||
          o.status === "kuryede"
        );
      }
      if (activeTab === "completed") {
        return o.status === "teslim_edildi";
      }
      if (activeTab === "cancelled") {
        return o.status === "iptal";
      }
      return true;
    });
  }, [orders, activeTab]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-serif">Kullanıcı oturumu kontrol ediliyor...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-cream-surface border border-line rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 text-ink">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
          <LogIn className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-serif font-bold text-ink">
          Siparişlerinizi Görmek İçin Giriş Yapın
        </h1>
        <p className="text-xs text-ink-muted leading-relaxed max-w-sm mx-auto font-sans">
          Geçmiş siparişlerinizi, teslimat fişlerinizi ve tek dokunuşla sipariş tekrarını hesabınızdan görüntüleyebilirsiniz.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => openAuthModal("/hesabim/siparisler")}
            className="touch-target-44 min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-accent/90 transition-all"
          >
            <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Giriş Yap / Kayıt Ol</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-ink">
      {/* Page Title & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
            Sipariş Geçmişim
          </h1>
          <p className="text-xs text-ink-muted mt-1 font-sans">
            Toplam {totalCount} siparişiniz kayıtlı.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/hesabim#claim-guest-order-heading"
            className="touch-target-44 min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cream-surface border border-line hover:border-accent/45 text-ink-muted hover:text-ink text-xs font-semibold transition-colors shadow-2xs"
          >
            <Link2 className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
            <span>Misafir Siparişi Bağla</span>
          </Link>
          <button
            type="button"
            onClick={() => void loadOrders(0, false)}
            disabled={ordersLoading}
            className="touch-target-44 min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cream-surface border border-line hover:border-accent text-ink-muted hover:text-ink text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${ordersLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        role="group"
        aria-label="Sipariş durumu filtresi"
        className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-line no-scrollbar"
      >
        {(
          [
            { key: "all", label: `Tümü (${orders.length})` },
            { key: "active", label: "Aktif Siparişler" },
            { key: "completed", label: "Teslim Edilenler" },
            { key: "cancelled", label: "İptal Edilenler" },
          ] as const
        ).map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveTab(tab.key)}
              className={`touch-target-44 min-h-[44px] px-4 py-2 rounded-xl text-xs font-sans transition-colors whitespace-nowrap ${
                selected
                  ? "bg-accent text-white font-bold shadow-2xs"
                  : "bg-cream-surface text-ink-muted hover:text-ink border border-line"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Orders List or Empty State */}
      {ordersLoading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-serif">Siparişleriniz yükleniyor...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-cream-surface border border-line rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-2xs text-ink">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <ShoppingBag className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="font-serif font-bold text-base sm:text-lg text-ink">
            {activeTab === "all"
              ? "Henüz hesabınıza bağlı bir sipariş bulunmuyor"
              : "Bu filtreye ait bir sipariş bulunamadı"}
          </h2>
          <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed font-sans">
            Taş fırınımızdan çıkan ekşi mayalı ekmeklerimizi ve günlük mandıra eşlikçilerimizi keşfetmek için vitrinimize göz atın.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              href="/#ekmekler"
              className="touch-target-44 min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-accent/90 transition-all"
            >
              <span>Fırın Vitrinine Git</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </Link>
            {activeTab === "all" && (
              <Link
                href="/hesabim#claim-guest-order-heading"
                className="touch-target-44 min-h-[48px] inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-bg border border-line hover:border-accent/40 text-ink font-semibold text-xs sm:text-sm transition-colors"
              >
                <Link2 className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <span>Instagram / Misafir Siparişi Bağla</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderHistoryCard
              key={order.id}
              order={order}
              onOrderCancelled={handleOrderCancelled}
            />
          ))}

          {orders.length < totalCount && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={ordersLoading}
                className="touch-target-44 min-h-[44px] px-6 py-2.5 rounded-xl bg-cream-surface border border-line hover:border-accent text-ink-muted hover:text-ink text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs"
              >
                {ordersLoading ? "Yükleniyor..." : "Daha Fazla Göster"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
