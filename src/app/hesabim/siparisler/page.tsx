"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { OrderHistoryCard } from "@/components/customer/OrderHistoryCard";
import { Order } from "@/types";
import {
  Package,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  LogIn,
  AlertCircle,
} from "lucide-react";

export default function MusteriSiparislerPage() {
  const { user, loading: authLoading, openAuthModal } = useCustomerAuth();
  const { fetchMyOrders, loading: ordersLoading, error } = useOrderHistory();

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

  useEffect(() => {
    if (user?.id) {
      loadOrders(0, false);
      setOffset(0);
    }
  }, [user?.id, loadOrders]);

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

  // Filter orders by tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === "active") {
        return (
          o.status === "bekliyor" ||
          o.status === "onay_bekliyor" ||
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
      <div className="flex flex-col items-center justify-center py-20 text-stone-400">
        <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-serif">Kullanıcı oturumu kontrol ediliyor...</span>
      </div>
    );
  }

  // Not Logged In State
  if (!user) {
    return (
      <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
          <LogIn className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-serif font-bold text-[#F7EBD3]">
          Siparişlerinizi Görmek İçin Giriş Yapın
        </h2>
        <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
          Geçmiş siparişlerinizi, teslimat detaylarını ve canlı kurye takibinizi hesabınızdan görüntüleyebilirsiniz.
        </p>
        <div className="pt-3">
          <button
            onClick={() => openAuthModal("login")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Giriş Yap / Kayıt Ol</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#F7EBD3]">
            Sipariş Geçmişim
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Toplam {totalCount} siparişiniz kayıtlı.
          </p>
        </div>

        <button
          onClick={() => loadOrders(0, false)}
          disabled={ordersLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18130F] border border-[#261E17] hover:border-[#F59E0B]/40 text-stone-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#261E17]">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === "all"
              ? "bg-[#261E17] text-[#F59E0B] border border-[#F59E0B]/30 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Tümü ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === "active"
              ? "bg-[#261E17] text-blue-400 border border-blue-500/30 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Aktif Siparişler
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === "completed"
              ? "bg-[#261E17] text-emerald-400 border border-emerald-500/30 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          Teslim Edilenler
        </button>
        <button
          onClick={() => setActiveTab("cancelled")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === "cancelled"
              ? "bg-[#261E17] text-stone-300 border border-stone-600 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          İptal Edilenler
        </button>
      </div>

      {/* Orders List or Empty State */}
      {ordersLoading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-serif">Siparişleriniz yükleniyor...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-10 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#F7EBD3]">
            {activeTab === "all"
              ? "Henüz bir siparişiniz bulunmuyor"
              : "Bu filtreye ait bir sipariş bulunamadı"}
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
            Taş fırınımızdan çıkan taptaze ekşi mayalı ekmeklerimizi keşfetmek için hemen fırın vitrinimize göz atın.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fırın Vitrinine Git</span>
            </Link>
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

          {/* Load More Button */}
          {orders.length < totalCount && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={ordersLoading}
                className="px-6 py-2.5 rounded-xl bg-[#18130F] border border-[#261E17] hover:border-[#F59E0B]/40 text-stone-300 text-xs font-medium transition-colors disabled:opacity-50"
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
