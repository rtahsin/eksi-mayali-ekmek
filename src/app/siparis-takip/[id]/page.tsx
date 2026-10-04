"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquare,
  PackageSearch,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Phone,
} from "lucide-react";
import type { TrackingOrder } from "@/types/tracking";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, isFinalStatus } from "@/lib/orders/normalize";
import { formatTrDate } from "@/lib/time/istanbul";
import { paymentLabel } from "@/lib/order/createOrder";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { whatsappLink } from "@/lib/site";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

const tl = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("tr-TR")} ₺`);
const timeOf = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function OrderTrackingPage({ params, searchParams }: PageProps) {
  const { id } = use(params);
  const { t: token } = use(searchParams);
  const { settings } = useStoreSettings();

  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [last4, setLast4] = useState("");
  const [verifiedLast4, setVerifiedLast4] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(
    async (phone4: string | null) => {
      const qs = new URLSearchParams();
      if (token) qs.set("t", token);
      if (phone4) qs.set("phone", phone4);
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}${qs.size ? `?${qs}` : ""}`, { cache: "no-store" });
      const data: { order?: TrackingOrder; error?: string; code?: string } = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    },
    [id, token]
  );

  // İlk yükleme
  useEffect(() => {
    let cancelled = false;
    load(null).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok && data.order) setOrder(data.order);
      else setError(data.error || "Sipariş bulunamadı.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Son durum değilse 60 sn'de bir yenile (sekme görünürken)
  useEffect(() => {
    if (!order || isFinalStatus(order.status)) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load(verifiedLast4).then(({ ok, data }) => ok && data.order && setOrder(data.order));
    }, 60000);
    return () => clearInterval(timer);
  }, [order, load, verifiedLast4]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = last4.replace(/\D/g, "");
    if (digits.length !== 4) {
      setVerifyError("Lütfen telefonunuzun son 4 hanesini girin.");
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    const { ok, data } = await load(digits);
    setVerifying(false);
    if (ok && data.order) {
      setOrder(data.order);
      setVerifiedLast4(digits);
    } else {
      setVerifyError(data.error || "Doğrulanamadı.");
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason.trim() || "Müşteri takip ekranından iptal etti",
          token: token || undefined,
          phone: verifiedLast4 || undefined,
        }),
      });
      const data: { success?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "İptal edilemedi.");
      setCancelOpen(false);
      const refreshed = await load(verifiedLast4);
      if (refreshed.ok && refreshed.data.order) setOrder(refreshed.data.order);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "İptal edilemedi.");
    } finally {
      setCancelling(false);
    }
  };

  const waNumber = toWhatsAppNumber(settings.whatsappPhone);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-artisan-gold animate-spin" aria-label="Yükleniyor" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4 p-6 rounded-2xl bg-surface-panel border border-surface-border">
          <PackageSearch className="w-10 h-10 text-artisan-gold mx-auto" />
          <h1 className="font-serif text-xl font-bold text-foreground">Sipariş bulunamadı</h1>
          <p className="text-sm text-foreground/60">{error}</p>
          <a
            href={whatsappLink(`Merhaba, ${id} numaralı siparişimi takip edemiyorum.`, waNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm"
          >
            WhatsApp&apos;tan Sorun
          </a>
          <Link href="/" className="block text-sm text-foreground/60 underline">
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  const cancelled = order.status === "iptal";
  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const reachedAt = (status: string) => order.history.find((h) => h.status === status)?.at;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto space-y-5">
        <header className="text-center space-y-1">
          <Link href="/" className="font-serif text-lg font-bold text-foreground">
            Ekmek<span className="text-artisan-gold italic">Lab</span>
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">Sipariş Takibi</h1>
          <p className="font-mono text-sm text-artisan-gold font-bold">{order.orderNumber}</p>
        </header>

        {/* Durum */}
        <section className="p-5 rounded-2xl bg-surface-panel border border-surface-border space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-foreground/50">Teslim</div>
              <div className="font-serif text-lg font-bold text-foreground">{formatTrDate(order.deliveryDate, "long")}</div>
              {order.deliveryTimeWindow && <div className="text-xs text-foreground/60">{order.deliveryTimeWindow}</div>}
            </div>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                cancelled
                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                  : order.status === "teslim_edildi"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-artisan-gold/10 text-artisan-gold border border-artisan-gold/30"
              }`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          {cancelled ? (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Bu sipariş iptal edildi{order.cancelReason ? `: ${order.cancelReason}` : "."}</span>
            </div>
          ) : (
            <ol className="space-y-2.5" aria-label="Sipariş aşamaları">
              {ORDER_STATUS_FLOW.map((step, i) => {
                const done = i <= currentIndex;
                const at = reachedAt(step);
                return (
                  <li key={step} className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-foreground/20 shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${done ? "text-foreground font-semibold" : "text-foreground/40"}`}>
                      {ORDER_STATUS_LABELS[step]}
                    </span>
                    {done && at && <span className="text-[11px] text-foreground/40">{timeOf(at)}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Maskeli görünüm: doğrulama formu */}
        {order.isMasked && (
          <form onSubmit={handleVerify} className="p-5 rounded-2xl bg-surface-panel border border-artisan-gold/30 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-artisan-gold" /> Ayrıntıları görmek için doğrulayın
            </div>
            <label htmlFor="track-last4" className="block text-xs text-foreground/60">
              Siparişte verdiğiniz telefonun son 4 hanesi ({order.phone})
            </label>
            <div className="flex gap-2">
              <input
                id="track-last4"
                inputMode="numeric"
                maxLength={4}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-surface border border-surface-border text-lg tracking-[0.4em] font-mono text-foreground text-center focus:border-artisan-gold outline-none"
              />
              <button
                type="submit"
                disabled={verifying}
                className="shrink-0 px-5 py-3 rounded-xl bg-artisan-gold text-stone-950 font-bold text-sm disabled:opacity-50"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Göster"}
              </button>
            </div>
            {verifyError && (
              <p role="alert" className="text-xs text-red-400">
                {verifyError}
              </p>
            )}
          </form>
        )}

        {/* Ürünler ve tutar */}
        <section className="p-5 rounded-2xl bg-surface-panel border border-surface-border space-y-3">
          <h2 className="text-[11px] uppercase tracking-wider text-foreground/50">Ürünler</h2>
          <ul className="space-y-2">
            {order.items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {it.quantity} × {it.name}
                </span>
                {it.totalPrice !== null && <span className="text-foreground/70">{tl(it.totalPrice)}</span>}
              </li>
            ))}
          </ul>
          {!order.isMasked && (
            <div className="pt-3 border-t border-surface-border space-y-1 text-sm">
              <div className="flex justify-between text-foreground/60">
                <span>Teslimat</span>
                <span>{order.shippingFee === 0 ? "Ücretsiz" : tl(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Toplam</span>
                <span>{tl(order.totalAmount)}</span>
              </div>
              {order.paymentMethod && (
                <div className="flex justify-between text-foreground/60">
                  <span>Ödeme</span>
                  <span>{paymentLabel(order.paymentMethod)}</span>
                </div>
              )}
            </div>
          )}
          {!order.isMasked && (order.neighborhood || order.addressDetail) && (
            <div className="pt-3 border-t border-surface-border text-xs text-foreground/60">
              {order.neighborhood} Mah.{order.addressDetail ? `, ${order.addressDetail}` : ""}
            </div>
          )}
        </section>

        {/* İşlemler */}
        <section className="space-y-2.5">
          <a
            href={whatsappLink(`Merhaba, ${order.orderNumber} numaralı siparişim hakkında yazıyorum.`, waNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> WhatsApp&apos;tan Yazın
          </a>
          <a
            href={`tel:+${waNumber}`}
            className="w-full py-3 rounded-xl bg-surface-panel border border-surface-border text-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" /> Fırını Arayın
          </a>
          {order.canCancel && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="w-full py-3 rounded-xl text-red-400 border border-red-500/30 hover:bg-red-500/10 font-semibold text-sm"
            >
              Siparişi İptal Et
            </button>
          )}
        </section>

        <p className="text-center text-xs text-foreground/40">
          Bu cihazdan verdiğiniz diğer siparişler:{" "}
          <Link href="/siparislerim" className="underline">
            Siparişlerim
          </Link>
        </p>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-surface-panel border border-surface-border space-y-3">
            <h2 id="cancel-title" className="font-serif text-lg font-bold text-foreground">
              Siparişi iptal et
            </h2>
            <label htmlFor="cancel-reason" className="block text-xs text-foreground/60">
              İptal nedeni (isteğe bağlı)
            </label>
            <textarea
              id="cancel-reason"
              rows={2}
              maxLength={300}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-sm text-foreground focus:border-artisan-gold outline-none resize-none"
            />
            {cancelError && (
              <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {cancelError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl border border-surface-border text-foreground text-sm"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50"
              >
                {cancelling ? "İptal ediliyor…" : "Evet, iptal et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
