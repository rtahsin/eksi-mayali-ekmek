"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Link2,
  Loader2,
  LogIn,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import { rememberDeviceOrder } from "@/lib/orders/deviceOrders";
import { ORDER_STATUS_LABELS, isFinalStatus } from "@/lib/orders/normalize";
import { formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import type { Order } from "@/types";

interface ClaimResponse {
  success?: boolean;
  linked?: number;
  orderId?: string;
  orderNumber?: string;
  trackingToken?: string | null;
  deliveryDate?: string;
  totalAmount?: number;
  createdAt?: string;
  error?: string;
}

export default function HesabimOzetPage() {
  const {
    user,
    profile,
    addresses,
    loading: authLoading,
    claimVersion,
    triggerOrderClaim,
    openAuthModal,
  } = useAuth();
  const { fetchMyOrders, loading: ordersLoading } = useOrderHistory();
  const { allProducts, loading: catalogLoading } = useProducts("all");
  const applyReorder = useCartStore((s) => s.applyReorder);

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [reorderNotice, setReorderNotice] = useState<{ type: "ok" | "warn"; text: string } | null>(
    null
  );

  // Misafir / Instagram Siparişini Bağlama Formu
  const [claimOrderNo, setClaimOrderNo] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    type: "ok" | "err";
    text: string;
    orderNumber?: string;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetchMyOrders(user.id, 5, 0);
    setOrders(res.orders);
    setTotalCount(res.totalCount);
  }, [user?.id, fetchMyOrders]);

  useEffect(() => {
    if (user?.id) {
      void loadSummary();
    }
  }, [user?.id, claimVersion, loadSummary]);

  // Profilde telefon varsa sipariş bağlama formuna varsayılan olarak öner
  useEffect(() => {
    if (profile?.phone && !claimPhone) {
      setClaimPhone(profile.phone);
    }
  }, [profile?.phone, claimPhone]);

  const activeOrder = useMemo(
    () => orders.find((o) => !isFinalStatus(o.status)) ?? null,
    [orders]
  );

  const latestOrder = orders[0] ?? null;
  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    [addresses]
  );

  const handleQuickReorder = () => {
    if (!latestOrder) return;
    const result = applyReorder(
      allProducts,
      latestOrder.items.map((it) => ({
        productId: it.productId,
        name: it.productName,
        quantity: it.quantity,
      }))
    );

    if (result.addedCount === 0) {
      setReorderNotice({
        type: "warn",
        text: "Son siparişinizdeki ürünler şu an satışta bulunmuyor.",
      });
    } else if (result.unavailableNames.length > 0) {
      setReorderNotice({
        type: "ok",
        text: `${result.addedCount} kalem sepete eklendi (${result.unavailableNames.join(", ")} şu an satışta değil).`,
      });
    } else {
      setReorderNotice({
        type: "ok",
        text: "Son siparişiniz güncel fiyatlarıyla sepetinize eklendi!",
      });
    }
    setTimeout(() => setReorderNotice(null), 4000);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimResult(null);

    const trimmedNo = claimOrderNo.trim();
    const trimmedPhone = claimPhone.trim();
    if (!trimmedNo || !trimmedPhone) {
      setClaimResult({
        type: "err",
        text: "Lütfen hem sipariş numarasını (SIP-YYMM-XXX) hem de cep telefonu numarasını girin.",
      });
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch("/api/orders/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: trimmedNo,
          phone: trimmedPhone,
        }),
      });
      const data: ClaimResponse = await res.json().catch(() => ({}));

      if (!res.ok || !data.linked) {
        setClaimResult({
          type: "err",
          text:
            data.error ||
            "Sipariş bağlanamadı. Sipariş numaranızı ve siparişte girdiğiniz telefonu kontrol edin.",
        });
        return;
      }

      if (
        data.orderId &&
        data.orderNumber &&
        typeof data.trackingToken === "string" &&
        data.trackingToken.length === 32
      ) {
        rememberDeviceOrder({
          id: data.orderId,
          orderNumber: data.orderNumber,
          token: data.trackingToken,
          deliveryDate: data.deliveryDate || istanbulToday(),
          totalAmount: typeof data.totalAmount === "number" ? data.totalAmount : 0,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }

      await triggerOrderClaim();
      setClaimOrderNo("");
      setClaimResult({
        type: "ok",
        text: `${data.orderNumber} numaralı sipariş hesabınıza ve bu cihaza bağlandı!`,
        orderNumber: data.orderNumber,
      });
    } catch {
      setClaimResult({
        type: "err",
        text: "Bağlantı hatası oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-serif">Müdavim Pasaportunuz hazırlanıyor...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-cream-surface border border-line rounded-3xl p-7 sm:p-10 text-center max-w-lg mx-auto shadow-xs space-y-4 text-ink">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
          <ShieldCheck className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
          EkmekLab Müdavim Pasaportu
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-md mx-auto font-sans">
          Kayıtlı teslimat adreslerinize, geçmiş siparişlerinizin tek dokunuşla tekrarına ve
          haftalık taş fırın takvim hatırlatıcınıza erişmek için giriş yapın.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => openAuthModal("/hesabim")}
            className="touch-target-44 min-h-[48px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-accent/90 transition-all"
          >
            <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Giriş Yap / Pasaport Aç</span>
          </button>
          <Link
            href="/siparislerim"
            className="touch-target-44 min-h-[48px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-bg border border-line hover:border-accent/40 text-ink font-medium text-xs sm:text-sm transition-colors"
          >
            <Package className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
            <span>Bu Cihazdaki Siparişlerim</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-ink">
      {/* 1. Müdavim Karşılama & Özet Kartı */}
      <section className="bg-cream-surface border border-line rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-[11px] font-sans font-semibold text-accent">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Müdavim Özeti</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
              Merhaba, {profile?.fullName || "Fırın Dostumuz"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted font-sans">
              <span>{profile?.email || user.email}</span>
              {profile?.phone ? (
                <span className="inline-flex items-center gap-1 text-ink font-mono">
                  <Phone className="w-3 h-3 text-accent" aria-hidden="true" />
                  {profile.phone}
                </span>
              ) : (
                <Link
                  href="/hesabim/tercihler"
                  className="text-accent font-semibold hover:underline"
                >
                  + Teslimat telefonu ekleyin
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:min-w-[220px]">
            <div className="p-3 rounded-2xl bg-bg border border-line text-center">
              <div className="font-serif font-bold text-lg sm:text-xl text-ink">
                {ordersLoading && totalCount === 0 ? "…" : totalCount}
              </div>
              <div className="text-[11px] text-ink-muted font-sans">Toplam Sipariş</div>
            </div>
            <div className="p-3 rounded-2xl bg-bg border border-line text-center">
              <div className="font-serif font-bold text-lg sm:text-xl text-ink">
                {addresses.length}
              </div>
              <div className="text-[11px] text-ink-muted font-sans">Kayıtlı Adres</div>
            </div>
          </div>
        </div>

        {/* Aktif Sipariş Canlı Şeridi */}
        {activeOrder && (
          <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cream-surface border border-accent/25 flex items-center justify-center text-accent shrink-0">
                <Flame className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink">
                    {activeOrder.orderNumber}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-[11px] font-bold">
                    {ORDER_STATUS_LABELS[activeOrder.status]}
                  </span>
                </div>
                <p className="text-xs text-ink-muted font-sans">
                  Teslim günü:{" "}
                  <strong className="text-ink">
                    {activeOrder.deliveryDate
                      ? formatTrDate(activeOrder.deliveryDate, "long")
                      : "Planlanıyor"}
                  </strong>
                </p>
              </div>
            </div>
            <Link
              href={`/siparis-takip/${encodeURIComponent(activeOrder.orderNumber || activeOrder.id)}`}
              className="touch-target-44 min-h-[44px] px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <span>Canlı Teslimat Fişi</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Hızlı Aksiyonlar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {latestOrder ? (
            <button
              type="button"
              onClick={handleQuickReorder}
              disabled={catalogLoading && allProducts.length === 0}
              className="touch-target-44 min-h-[64px] p-4 rounded-2xl bg-bg hover:bg-line/35 border border-line hover:border-accent/45 text-left flex items-start gap-3 transition-all disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="font-serif font-bold text-sm text-ink">Son Siparişi Tekrarla</div>
                <div className="text-xs text-ink-muted font-sans truncate mt-0.5">
                  {latestOrder.orderNumber} · {latestOrder.items.length} kalem
                </div>
              </div>
            </button>
          ) : (
            <Link
              href="/#ekmekler"
              className="touch-target-44 min-h-[64px] p-4 rounded-2xl bg-bg hover:bg-line/35 border border-line hover:border-accent/45 flex items-start gap-3 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="font-serif font-bold text-sm text-ink">Sıcak Somun Seç</div>
                <div className="text-xs text-ink-muted font-sans mt-0.5">
                  Taş fırın ve mandıra vitrini
                </div>
              </div>
            </Link>
          )}

          <Link
            href="/hesabim/adresler"
            className="touch-target-44 min-h-[64px] p-4 rounded-2xl bg-bg hover:bg-line/35 border border-line hover:border-accent/45 flex items-start gap-3 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-serif font-bold text-sm text-ink">Adreslerim</div>
              <div className="text-xs text-ink-muted font-sans truncate mt-0.5">
                {defaultAddress
                  ? `${defaultAddress.title} · ${defaultAddress.neighborhood}`
                  : "Teslimat adresi ekleyin"}
              </div>
            </div>
          </Link>

          <Link
            href="/hesabim/tercihler#takvim-hatirlatici"
            className="touch-target-44 min-h-[64px] p-4 rounded-2xl bg-bg hover:bg-line/35 border border-line hover:border-accent/45 flex items-start gap-3 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <CalendarClock className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-serif font-bold text-sm text-ink">Fırın Günü Hatırlatıcısı</div>
              <div className="text-xs text-ink-muted font-sans mt-0.5">
                iPhone &amp; Google Takvim (.ics)
              </div>
            </div>
          </Link>
        </div>

        {reorderNotice && (
          <div
            role="status"
            className={`p-3 rounded-xl text-xs font-sans flex items-center gap-2 border ${
              reorderNotice.type === "ok"
                ? "bg-good/15 border-good/30 text-ink"
                : "bg-warn/15 border-warn/35 text-ink"
            }`}
          >
            {reorderNotice.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-good shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-warn shrink-0" aria-hidden="true" />
            )}
            <span>{reorderNotice.text}</span>
          </div>
        )}
      </section>

      {/* 2. Misafir / Instagram Siparişini Hesaba Bağlama Köprüsü */}
      <section
        aria-labelledby="claim-guest-order-heading"
        className="bg-cream-surface border border-line rounded-3xl p-5 sm:p-7 shadow-xs space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
            <Link2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 id="claim-guest-order-heading" className="font-serif font-bold text-base sm:text-lg text-ink">
              Misafir / Instagram Siparişini Hesabıma Bağla
            </h2>
            <p className="text-xs text-ink-muted font-sans leading-relaxed">
              Instagram içi tarayıcıdan veya farklı bir cihazdan üyeliksiz verdiğiniz siparişi,
              sipariş numaranız ve telefon numaranızla Müdavim Pasaportunuza ekleyebilirsiniz.
            </p>
          </div>
        </div>

        <form onSubmit={handleClaimSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-5">
            <label htmlFor="claim-order-number" className="block text-xs font-semibold text-ink mb-1">
              Sipariş Numarası
            </label>
            <input
              id="claim-order-number"
              name="orderNumber"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={claimOrderNo}
              onChange={(e) => {
                setClaimOrderNo(e.target.value.toUpperCase());
                if (claimResult) setClaimResult(null);
              }}
              placeholder="SIP-2611-001"
              required
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm font-mono uppercase text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="claim-order-phone" className="block text-xs font-semibold text-ink mb-1">
              Siparişteki Cep Telefonu
            </label>
            <input
              id="claim-order-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={claimPhone}
              onChange={(e) => {
                setClaimPhone(e.target.value);
                if (claimResult) setClaimResult(null);
              }}
              placeholder="05XX XXX XX XX"
              required
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm font-mono text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={claiming}
              className="touch-target-44 min-h-[48px] w-full px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
            >
              {claiming ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              ) : (
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{claiming ? "Bağlanıyor…" : "Hesaba Bağla"}</span>
            </button>
          </div>
        </form>

        {claimResult && (
          <div
            role={claimResult.type === "err" ? "alert" : "status"}
            className={`p-3.5 rounded-xl text-xs font-sans flex flex-wrap items-center justify-between gap-2 border ${
              claimResult.type === "ok"
                ? "bg-good/15 border-good/30 text-ink"
                : "bg-bad/10 border-bad/30 text-bad"
            }`}
          >
            <span className="flex items-center gap-2">
              {claimResult.type === "ok" ? (
                <CheckCircle2 className="w-4 h-4 text-good shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{claimResult.text}</span>
            </span>

            {claimResult.orderNumber && (
              <Link
                href={`/siparis-takip/${encodeURIComponent(claimResult.orderNumber)}`}
                className="touch-target-44 font-semibold text-accent hover:underline inline-flex items-center gap-1"
              >
                <span>Teslimat Fişini Gör</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* 3. Son Siparişler Özeti */}
      {orders.length > 0 && (
        <section className="bg-cream-surface border border-line rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-base sm:text-lg text-ink">
              Son Siparişleriniz
            </h2>
            <Link
              href="/hesabim/siparisler"
              className="touch-target-44 text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>Tümünü Gör ({totalCount})</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <ul className="divide-y divide-line">
            {orders.slice(0, 3).map((ord) => (
              <li key={ord.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-bold text-ink">
                      {ord.orderNumber}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg border border-line text-ink-muted font-medium">
                      {ORDER_STATUS_LABELS[ord.status]}
                    </span>
                  </div>
                  <div className="text-xs text-ink-muted font-sans truncate">
                    {ord.deliveryDate ? formatTrDate(ord.deliveryDate, "long") : ""} ·{" "}
                    {ord.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                  </div>
                </div>
                <Link
                  href={`/siparis-takip/${encodeURIComponent(ord.orderNumber || ord.id)}`}
                  className="touch-target-44 min-h-[44px] px-3 py-2 rounded-xl bg-bg border border-line hover:border-accent text-xs font-semibold text-ink inline-flex items-center gap-1 shrink-0"
                >
                  <span>Takip</span>
                  <ChevronRight className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
