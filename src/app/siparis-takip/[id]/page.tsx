"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Loader2,
  MapPin,
  MessageSquare,
  PackageSearch,
  ShieldCheck,
  Truck,
  XCircle,
  AlertCircle,
  Phone,
  RotateCcw,
  ArrowLeft,
  Check,
  type LucideIcon,
} from "lucide-react";
import type { TrackingOrder } from "@/types/tracking";
import {
  ORDER_STATUS_LABELS,
  isFinalStatus,
  type CanonicalOrderStatus,
} from "@/lib/orders/normalize";
import { formatTrDate } from "@/lib/time/istanbul";
import { paymentLabel } from "@/lib/order/createOrder";
import { normalizePhone } from "@/lib/order/validate";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import { updateDeviceOrderItems } from "@/lib/orders/deviceOrders";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { whatsappLink } from "@/lib/site";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

const tl = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("tr-TR")} ₺`);
const timeOf = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

interface FourStepItem {
  id: "prep" | "oven" | "courier" | "delivered";
  title: string;
  subtitle: string;
  icon: LucideIcon;
  matchStatuses: readonly CanonicalOrderStatus[];
}

function getFourStepIndex(status: CanonicalOrderStatus): number {
  if (status === "bekliyor" || status === "hazirlaniyor") return 0;
  if (status === "firinda") return 1;
  if (status === "kuryede") return 2;
  if (status === "teslim_edildi") return 3;
  return -1;
}

export default function OrderTrackingPage({ params, searchParams }: PageProps) {
  const { id } = use(params);
  const { t: token } = use(searchParams);
  const { settings } = useStoreSettings();
  const { isLoggedIn } = useAuth();
  const { allProducts, loading: productsLoading } = useProducts();
  const applyReorder = useCartStore((s) => s.applyReorder);

  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPhone, setCancelPhone] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(
    async (phoneValue: string | null) => {
      const qs = new URLSearchParams();
      if (token) qs.set("t", token);
      if (phoneValue) qs.set("phone", phoneValue);
      const res = await fetch(
        `/api/orders/${encodeURIComponent(id)}${qs.size ? `?${qs}` : ""}`,
        { cache: "no-store" }
      );
      const data: { order?: TrackingOrder; error?: string; code?: string } = await res
        .json()
        .catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    },
    [id, token]
  );

  useEffect(() => {
    let cancelled = false;
    load(null).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok && data.order) {
        setOrder(data.order);
        if (data.order.items.length > 0) {
          updateDeviceOrderItems(
            data.order.id,
            data.order.items.map((it) => ({
              productId: it.productId ?? "",
              name: it.name || "Ürün",
              quantity: Math.max(1, Math.floor(it.quantity) || 1),
            }))
          );
        }
      } else {
        setError(data.error || "Sipariş bulunamadı.");
      }
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
      load(null).then(({ ok, data }) => {
        if (!ok || !data.order) return;
        const latest = data.order;
        setOrder((prev) => {
          if (!prev) return latest;
          if (!latest.isMasked || prev.isMasked) return latest;
          return {
            ...prev,
            status: latest.status,
            history: latest.history,
            cancelReason: latest.cancelReason,
            deliveryDate: latest.deliveryDate,
            deliveryTimeWindow: latest.deliveryTimeWindow,
            canCancel: prev.canCancel && latest.status === "bekliyor",
          };
        });
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [order, load]);

  useEffect(() => {
    if (!cancelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cancelling) {
        setCancelOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelOpen, cancelling]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizePhone(phoneInput);
    if (!clean) {
      setVerifyError("Lütfen siparişte verdiğiniz cep telefonu numarasını girin (05XX XXX XX XX).");
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    const { ok, data } = await load(clean);
    setVerifying(false);
    if (ok && data.order) {
      setOrder(data.order);
      setVerifiedPhone(clean);
      setCancelPhone(clean);
    } else {
      setVerifyError(data.error || "Doğrulanamadı.");
    }
  };

  const needsPhoneForCancel = !token && (verifiedPhone !== null || !isLoggedIn);

  const openCancelModal = () => {
    setCancelPhone(verifiedPhone ?? phoneInput);
    setCancelError(null);
    setCancelOpen(true);
  };

  const handleCancel = async () => {
    if (!order) return;
    let phoneToSend: string | undefined;
    if (needsPhoneForCancel) {
      const clean = normalizePhone(cancelPhone);
      if (!clean) {
        setCancelError("Lütfen siparişte verdiğiniz cep telefonu numarasını girin (05XX XXX XX XX).");
        return;
      }
      phoneToSend = clean;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason.trim() || "Müşteri takip ekranından iptal etti",
          token: token || undefined,
          phone: phoneToSend,
        }),
      });
      const data: { success?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "İptal edilemedi.");
      setCancelOpen(false);
      const refreshed = await load(phoneToSend ?? verifiedPhone);
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
      <main className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin" aria-label="Yükleniyor" />
        <span className="text-xs font-serif text-ink-muted">Taş fırın teslimat fişi açılıyor…</span>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-bg text-ink flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4 p-7 rounded-3xl bg-cream-surface border border-line shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent mx-auto">
            <PackageSearch className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-xl font-bold text-ink">Sipariş Bulunamadı</h1>
          <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">{error}</p>
          <a
            href={whatsappLink(`Merhaba, ${id} numaralı siparişimi takip edemiyorum.`, waNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target-44 min-h-[48px] w-full px-4 py-3 rounded-xl bg-good hover:bg-good/90 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>WhatsApp&apos;tan Sorun</span>
          </a>
          <Link
            href="/"
            className="touch-target-44 min-h-[44px] inline-flex items-center justify-center text-xs sm:text-sm text-ink-muted hover:text-ink underline font-sans"
          >
            Fırın vitrinine dön
          </Link>
        </div>
      </main>
    );
  }

  const cancelled = order.status === "iptal";
  const activeStepIndex = getFourStepIndex(order.status);

  const fourSteps: readonly FourStepItem[] = [
    {
      id: "prep",
      title: order.status === "hazirlaniyor" ? "Hazırlanıyor" : "Sipariş Alındı",
      subtitle: order.status === "hazirlaniyor" ? "Hamur tezgahta" : "Kayıt açıldı",
      icon: order.status === "hazirlaniyor" ? ChefHat : Clock,
      matchStatuses: ["bekliyor", "hazirlaniyor"],
    },
    {
      id: "oven",
      title: "Taş Fırında",
      subtitle: "Pişirim aşaması",
      icon: Flame,
      matchStatuses: ["firinda"],
    },
    {
      id: "courier",
      title: "Dağıtımda",
      subtitle: "Kuryemiz yolda",
      icon: Truck,
      matchStatuses: ["kuryede"],
    },
    {
      id: "delivered",
      title: "Teslim Edildi",
      subtitle: "Afiyet olsun",
      icon: CheckCircle2,
      matchStatuses: ["teslim_edildi"],
    },
  ];

  const stepReachedAt = (statuses: readonly CanonicalOrderStatus[]): string | undefined => {
    for (let idx = order.history.length - 1; idx >= 0; idx -= 1) {
      const entry = order.history[idx];
      if (statuses.includes(entry.status)) return entry.at;
    }
    return undefined;
  };

  return (
    <main className="min-h-screen bg-bg text-ink px-4 py-7 sm:py-12 selection:bg-accent selection:text-white">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Üst Gezinti */}
        <div className="flex items-center justify-between">
          <Link
            href="/siparislerim"
            className="touch-target-44 min-h-[44px] px-3 py-2 rounded-xl bg-cream-surface border border-line hover:border-accent text-ink-muted hover:text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Siparişlerim</span>
          </Link>
          <Link href="/" className="font-serif text-lg font-bold text-ink">
            Ekmek<span className="text-accent italic">Lab</span>
          </Link>
        </div>

        {/* MÜHÜRLÜ TAŞ FIRIN TESLİMAT FİŞİ */}
        <article className="rounded-3xl bg-cream-surface border border-line shadow-sm overflow-visible p-5 sm:p-7 space-y-5">
          {/* Fiş Mühür Başlığı */}
          <header className="text-center space-y-2 border-b border-dashed border-line pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-[11px] font-sans font-bold uppercase tracking-wider text-accent">
              <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Taş Fırın Teslimat Fişi</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink pb-0.5">
              Sipariş Takibi
            </h1>
            <div className="inline-block px-3.5 py-1 rounded-xl bg-bg border border-line font-mono text-sm sm:text-base font-bold text-ink tracking-wide">
              {order.orderNumber}
            </div>
          </header>

          {/* Teslim Tarihi & Güncel Durum Rozeti */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-dashed border-line">
            <div className="space-y-0.5">
              <div className="text-[11px] uppercase tracking-wider text-ink-muted font-sans font-semibold">
                Planlanan Teslimat
              </div>
              <div className="font-serif text-lg font-bold text-ink leading-normal pb-0.5">
                {formatTrDate(order.deliveryDate, "long")}
              </div>
              {order.deliveryTimeWindow && (
                <div className="text-xs text-ink-muted font-sans">{order.deliveryTimeWindow}</div>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                cancelled
                  ? "bg-bad/10 text-bad border-bad/30"
                  : order.status === "teslim_edildi"
                  ? "bg-good/15 text-good border-good/30"
                  : "bg-accent text-white border-accent"
              }`}
            >
              {cancelled ? (
                <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : order.status === "teslim_edildi" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{ORDER_STATUS_LABELS[order.status]}</span>
            </span>
          </div>

          {/* 4 Adımlı İkon + Metinli Durum Çubuğu */}
          {cancelled ? (
            <div
              role="status"
              className="p-4 rounded-2xl bg-bad/10 border border-bad/30 text-sm text-bad flex items-start gap-2.5 font-sans"
            >
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="font-bold block">Bu sipariş iptal edildi</strong>
                {order.cancelReason && (
                  <span className="text-xs text-ink-muted block mt-0.5">
                    Neden: {order.cancelReason}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <ol
              aria-label="Sipariş aşamaları (4 adım)"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
            >
              {fourSteps.map((step, index) => {
                const isCompleted = index < activeStepIndex || order.status === "teslim_edildi";
                const isCurrent = index === activeStepIndex && order.status !== "teslim_edildi";
                const StepIcon = isCompleted ? Check : step.icon;
                const timestamp = stepReachedAt(step.matchStatuses);

                return (
                  <li
                    key={step.id}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 transition-all ${
                      isCurrent
                        ? "bg-accent/10 border-accent text-ink shadow-2xs"
                        : isCompleted
                        ? "bg-good/10 border-good/35 text-ink"
                        : "bg-bg/65 border-line text-ink-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? "bg-accent text-white"
                            : isCompleted
                            ? "bg-good text-white"
                            : "bg-cream-surface border border-line text-ink-muted"
                        }`}
                      >
                        <StepIcon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-tight">
                        {isCompleted ? "Tamam" : isCurrent ? "Şu An" : `${index + 1}. Adım`}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-serif font-bold text-xs sm:text-sm text-ink leading-snug">
                        {step.title}
                      </div>
                      <div className="text-[11px] text-ink-muted font-sans">
                        {(isCompleted || isCurrent) && timestamp ? timeOf(timestamp) : step.subtitle}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Maskeli Görünüm: Telefon Doğrulama Formu */}
          {order.isMasked && (
            <form
              onSubmit={handleVerify}
              className="p-4 rounded-2xl bg-bg border border-accent/35 space-y-3"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm font-serif font-bold text-ink">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <span>Tutar ve Adres Ayrıntıları İçin Doğrulayın</span>
              </div>
              <label htmlFor="track-phone" className="block text-xs text-ink-muted font-sans">
                Siparişte verdiğiniz cep telefonu numarası ({order.phone}):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="track-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    if (verifyError) setVerifyError(null);
                  }}
                  placeholder="05XX XXX XX XX"
                  aria-invalid={Boolean(verifyError)}
                  className="flex-1 min-w-0 min-h-[48px] px-4 py-2.5 rounded-xl bg-cream-surface border border-line text-base sm:text-sm font-mono text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="touch-target-44 min-h-[48px] shrink-0 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-2xs"
                >
                  {verifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <span>Fişi Aç</span>
                  )}
                </button>
              </div>
              {verifyError && (
                <p role="alert" className="text-xs text-bad font-sans flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{verifyError}</span>
                </p>
              )}
            </form>
          )}

          {/* Ürün Kalemleri ve Tutar Dökümü */}
          <section className="pt-2 border-t border-dashed border-line space-y-3">
            <h2 className="text-[11px] uppercase tracking-wider text-ink-muted font-sans font-semibold">
              Sipariş Kalemleri
            </h2>
            <ul className="divide-y divide-line/70">
              {order.items.map((it, i) => (
                <li
                  key={`${it.name}-${i}`}
                  className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-ink font-sans flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-accent shrink-0">
                      {it.quantity}×
                    </span>
                    <span className="font-medium truncate">{it.name}</span>
                  </span>
                  {it.totalPrice !== null && (
                    <span className="font-mono text-xs sm:text-sm text-ink shrink-0">
                      {tl(it.totalPrice)}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {!order.isMasked && (
              <div className="pt-3 border-t border-dashed border-line space-y-1.5 text-xs sm:text-sm font-sans">
                <div className="flex justify-between text-ink-muted">
                  <span>Teslimat Ücreti</span>
                  <span className="font-mono">
                    {order.shippingFee === 0 ? "Ücretsiz" : tl(order.shippingFee)}
                  </span>
                </div>
                {order.paymentMethod && (
                  <div className="flex justify-between text-ink-muted">
                    <span>Ödeme Yöntemi</span>
                    <span>{paymentLabel(order.paymentMethod)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 text-ink font-bold">
                  <span className="font-serif text-base">Genel Toplam</span>
                  <span className="font-mono text-base sm:text-lg pb-0.5">
                    {tl(order.totalAmount)}
                  </span>
                </div>
              </div>
            )}

            {!order.isMasked && (order.neighborhood || order.addressDetail) && (
              <div className="p-3 rounded-2xl bg-bg/75 border border-line text-xs text-ink-muted font-sans flex items-start gap-2 leading-relaxed">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong className="text-ink">{order.neighborhood} Mah.</strong>
                  {order.addressDetail ? `, ${order.addressDetail}` : ""}
                </span>
              </div>
            )}

            {order.items.length > 0 && (
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const result = applyReorder(
                      allProducts,
                      order.items.map((it) => ({
                        productId: it.productId,
                        name: it.name,
                        quantity: it.quantity,
                      }))
                    );
                    if (result.addedCount === 0) {
                      setReorderNotice("Bu siparişteki ürünler şu anda satışta bulunmuyor.");
                      setTimeout(() => setReorderNotice(null), 4000);
                      return;
                    }
                    if (result.unavailableNames.length > 0) {
                      setReorderNotice(
                        `${result.addedCount} ürün sepete eklendi (${result.unavailableNames.join(", ")} şu an satışta değil).`
                      );
                      setTimeout(() => setReorderNotice(null), 4000);
                    } else {
                      setReorderNotice("Ürünler güncel fiyatlarıyla sepetinize eklendi!");
                      setTimeout(() => setReorderNotice(null), 3500);
                    }
                  }}
                  disabled={productsLoading && allProducts.length === 0}
                  className="touch-target-44 min-h-[48px] w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Aynı Sepeti Tekrar Oluştur</span>
                </button>
                {reorderNotice && (
                  <p
                    role="status"
                    className="text-xs text-ink text-center font-sans flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-good shrink-0" aria-hidden="true" />
                    <span>{reorderNotice}</span>
                  </p>
                )}
              </div>
            )}
          </section>
        </article>

        {/* Tek Elle Ulaşılabilir Büyük İletişim & İptal Butonları */}
        <section aria-label="Fırın iletişim ve sipariş işlemleri" className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={whatsappLink(
                `Merhaba, ${order.orderNumber} numaralı siparişim hakkında yazıyorum.`,
                waNumber
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target-44 min-h-[52px] w-full px-4 py-3.5 rounded-2xl bg-good hover:bg-good/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>WhatsApp&apos;tan Yazın</span>
            </a>

            <a
              href={`tel:+${waNumber}`}
              className="touch-target-44 min-h-[52px] w-full px-4 py-3.5 rounded-2xl bg-cream-surface hover:bg-line/40 border border-line text-ink font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <Phone className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
              <span>Taş Fırını Arayın</span>
            </a>
          </div>

          {order.canCancel && (
            <button
              type="button"
              onClick={openCancelModal}
              className="touch-target-44 min-h-[48px] w-full py-3 rounded-2xl text-bad bg-cream-surface border border-bad/30 hover:bg-bad/10 font-semibold text-sm transition-colors"
            >
              Siparişi İptal Et
            </button>
          )}
        </section>

        <p className="text-center text-xs text-ink-muted font-sans">
          Bu cihazdan verdiğiniz diğer siparişler:{" "}
          <Link href="/siparislerim" className="font-semibold underline text-ink hover:text-accent">
            Siparişlerim
          </Link>
        </p>
      </div>

      {/* İptal Onay Modalı */}
      {cancelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/55 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          <div className="w-full max-w-sm p-6 rounded-3xl bg-cream-surface border border-line space-y-4 text-ink shadow-2xl">
            <h2 id="cancel-title" className="font-serif text-lg font-bold text-ink">
              Siparişi İptal Et
            </h2>

            {needsPhoneForCancel && (
              <div className="space-y-1">
                <label htmlFor="cancel-phone" className="block text-xs font-semibold text-ink">
                  Siparişte verdiğiniz cep telefonu numarası
                </label>
                <input
                  id="cancel-phone"
                  name="cancelPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={cancelPhone}
                  onChange={(e) => {
                    setCancelPhone(e.target.value);
                    if (cancelError) setCancelError(null);
                  }}
                  placeholder="05XX XXX XX XX"
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm font-mono text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="cancel-reason" className="block text-xs font-semibold text-ink">
                İptal nedeni (isteğe bağlı)
              </label>
              <textarea
                id="cancel-reason"
                name="cancelReason"
                rows={2}
                maxLength={300}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="İptal sebebiniz..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none font-sans"
              />
            </div>

            {cancelError && (
              <p
                role="alert"
                className="text-xs text-bad bg-bad/10 border border-bad/25 p-3 rounded-xl flex items-center gap-2 font-sans"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{cancelError}</span>
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
                className="touch-target-44 min-h-[48px] flex-1 py-2.5 rounded-xl bg-bg border border-line text-ink font-semibold text-xs sm:text-sm"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="touch-target-44 min-h-[48px] flex-1 py-2.5 rounded-xl bg-bad hover:bg-bad/90 text-white font-bold text-xs sm:text-sm disabled:opacity-50"
              >
                {cancelling ? "İptal ediliyor…" : "Evet, İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CartDrawer />
      <OrderSuccessModal />
    </main>
  );
}
