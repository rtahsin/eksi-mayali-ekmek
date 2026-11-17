"use client";

import { formatMoney } from "@/lib/format/currency";
import { storefrontAction } from "@/lib/design/storefront";
import React, { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/common/Modal";
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

const tl = formatMoney;
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
  const verifyPhoneRef = useRef<HTMLInputElement>(null);
  const cancelPhoneRef = useRef<HTMLInputElement>(null);
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


  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizePhone(phoneInput);
    if (!clean) {
      setVerifyError("Lütfen siparişte verdiğin cep telefonu numarasını gir (05XX XXX XX XX).");
      verifyPhoneRef.current?.focus();
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
        setCancelError("Lütfen siparişte verdiğin cep telefonu numarasını gir (05XX XXX XX XX).");
        cancelPhoneRef.current?.focus();
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
        <div className="sf-panel max-w-sm w-full text-center space-y-4 p-7 rounded-3xl bg-cream-surface border border-line shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-ink mx-auto">
            <PackageSearch className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-xl font-bold text-ink">Siparişi bulunamadı</h1>
          <p className="sf-copy text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">{error}</p>
          <a
            href={whatsappLink(`Merhaba, ${id} numaralı siparişimi takip edemiyorum.`, waNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className={storefrontAction({ variant: "primary", size: "default", className: "w-full inline-flex items-center justify-center gap-2" })}
          >
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>WhatsApp&apos;tan Sorun</span>
          </a>
          <Link
            href="/"
            className={storefrontAction({ variant: "quiet", size: "default", className: "inline-flex items-center justify-center underline" })}
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
            className={storefrontAction({ variant: "secondary", size: "default", className: "inline-flex items-center gap-1.5" })}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Siparişlerim</span>
          </Link>
          <Link href="/" className="sf-brand-link font-serif text-lg font-bold text-ink">
            Ekmek<span className="text-accent italic">Lab</span>
          </Link>
        </div>

        {/* MÜHÜRLÜ TAŞ FIRIN TESLİMAT FİŞİ */}
        <article className="sf-panel rounded-3xl bg-cream-surface border border-line shadow-sm overflow-visible p-5 sm:p-7 space-y-5">
          {/* Fiş Mühür Başlığı */}
          <header className="text-center space-y-2 border-b border-dashed border-line pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-[11px] font-sans font-bold uppercase tracking-wider text-ink">
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
              className={`sf-badge inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                cancelled
                  ? "sf-error"
                  : order.status === "teslim_edildi"
                  ? "sf-success"
                  : "sf-accent-fill"
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
              className="sf-error p-4 rounded-2xl bg-bad/10 border border-bad/30 text-sm flex items-start gap-2.5 font-sans"
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
                            ? "sf-accent-fill"
                            : isCompleted
                            ? "sf-status-icon"
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
              <label htmlFor="track-phone" className="sf-label block text-xs text-ink-muted font-sans">
                Siparişte verdiğin cep telefonu numarası ({order.phone}):
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
                  ref={verifyPhoneRef}
                  aria-describedby={verifyError ? "tracking-verify-error" : undefined}
                  aria-invalid={Boolean(verifyError)}
                  className="sf-field flex-1 min-w-0"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className={storefrontAction({ variant: "primary", size: "default", className: "shrink-0 inline-flex items-center justify-center gap-1.5 disabled:opacity-50" })}
                >
                  {verifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <span>Fişi aç</span>
                  )}
                </button>
              </div>
              {verifyError && (
                <p id="tracking-verify-error" role="alert" className="sf-copy text-xs sf-error font-sans flex items-center gap-1.5">
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
                    <span className="font-mono text-xs font-bold text-ink shrink-0">
                      {it.quantity}×
                    </span>
                    <span className="font-medium break-words">{it.name}</span>
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
                    if (result.needsConfirmation) { setReorderNotice(null); return; }
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
                      setReorderNotice("Ürünler güncel fiyatlarıyla sepetine eklendi!");
                      setTimeout(() => setReorderNotice(null), 3500);
                    }
                  }}
                  disabled={productsLoading && allProducts.length === 0}
                  className={storefrontAction({ variant: "primary", size: "default", className: "w-full flex items-center justify-center gap-2 disabled:opacity-50" })}
                >
                  <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Tekrar sipariş ver</span>
                </button>
                {reorderNotice && (
                  <p
                    role="status"
                    className="sf-copy text-xs text-ink text-center font-sans flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="sf-success w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
              className={storefrontAction({ variant: "primary", size: "default", className: "w-full flex items-center justify-center gap-2" })}
            >
              <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>WhatsApp&apos;tan Yazın</span>
            </a>

            <a
              href={`tel:+${waNumber}`}
              className={storefrontAction({ variant: "secondary", size: "default", className: "w-full flex items-center justify-center gap-2" })}
            >
              <Phone className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
              <span>Taş fırını ara</span>
            </a>
          </div>

          {order.canCancel && (
            <button
              type="button"
              onClick={openCancelModal}
              className={storefrontAction({ variant: "danger", size: "default", className: "w-full" })}
            >
              Siparişi iptal et
            </button>
          )}
        </section>

        <p className="sf-copy text-center text-xs text-ink-muted font-sans">
          Bu cihazdan verdiğin diğer siparişler:{" "}
          <Link href="/siparislerim" className="sf-link font-semibold underline text-ink hover:text-accent">
            Siparişlerim
          </Link>
        </p>
      </div>

      {/* İptal Onay Modalı */}
      {cancelOpen && (
        <Modal open={cancelOpen} onClose={() => { if (!cancelling) setCancelOpen(false); }} dismissible={!cancelling} labelledBy="cancel-title" className="sf-dialog max-w-sm">
          <div className="sf-dialog-body space-y-4">
            <h2 id="cancel-title" className="sf-dialog-title font-serif text-lg font-bold text-ink">
              Siparişi iptal et
            </h2>

            {needsPhoneForCancel && (
              <div className="space-y-1">
                <label htmlFor="cancel-phone" className="sf-label block text-xs font-semibold text-ink">
                  Siparişte verdiğin cep telefonu numarası
                </label>
                <input
                  id="cancel-phone"
                  ref={cancelPhoneRef}
                  aria-invalid={Boolean(cancelError)}
                  aria-describedby={cancelError ? "tracking-cancel-error" : undefined}
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
                  className="sf-field w-full"
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="cancel-reason" className="sf-label block text-xs font-semibold text-ink">
                İptal nedeni (isteğe bağlı)
              </label>
              <textarea
                id="cancel-reason"
                name="cancelReason"
                rows={2}
                maxLength={300}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="İptal sebebin…"
                className="sf-field w-full"
              />
            </div>

            {cancelError && (
              <p
                id="tracking-cancel-error"
                role="alert"
                className="sf-copy text-xs sf-error bg-bad/10 border border-bad/25 p-3 rounded-xl flex items-center gap-2 font-sans"
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
                className={storefrontAction({ variant: "secondary", size: "default", className: "flex-1" })}
               ref={(node) => { if (node) node.autofocus = true; }}>
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className={storefrontAction({ variant: "danger", size: "default", className: "flex-1 disabled:opacity-50" })}
              >
                {cancelling ? "İptal ediliyor…" : "Evet, iptal et"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <CartDrawer />
      <OrderSuccessModal />
    </main>
  );
}
