"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import { CheckoutPaymentMethod, OrderSubmitError, submitOrder } from "@/lib/order/createOrder";
import { rememberDeviceOrder } from "@/lib/orders/deviceOrders";
import { CHECKOUT_FIELD_ORDER, CheckoutErrors, normalizePhone, validateCheckout } from "@/lib/order/validate";
import { trackEvent } from "@/lib/track";
import { Loader2, AlertCircle } from "lucide-react";

interface CheckoutActionsProps {
  /** Seçili ödeme yöntemi (formdaki 2'li seçim) */
  paymentMethod: CheckoutPaymentMethod;
  /** Genel toplam (butonda gösterilir) */
  totalAmount: number;
  /** Minimum sepet sağlanmadıysa ödeme kilitli */
  minBasketShortfall: number;
  /** Sipariş alımı kapalı / seçilebilir tarih yok */
  orderingBlockedReason: string | null;
  /** Tarih listesi tazelenmeli (ör. 409 INVALID_DELIVERY_DATE sonrası) */
  onDatesStale: () => void;
  /** Alan bazlı hatalar (formda ilgili alanın altında gösterilir) */
  errors: CheckoutErrors;
  onErrors: (errors: CheckoutErrors) => void;
  /** Sipariş başarıyla kaydedildikten sonra (sepet temizlenmeden önce) çağrılır */
  onOrderPlaced?: () => void;
}

const newAttemptKey = () => `IDEM-${crypto.randomUUID()}`;

/** Bu hatalarda tarih listesi tazelenir (gün dolmuş / kapanmış olabilir). */
const DATE_RELATED_CODES = new Set([
  "INVALID_DELIVERY_DATE",
  "DATE_NOT_AVAILABLE",
  "NOT_ON_SALE_THIS_DAY",
  "LEAD_TIME_NOT_MET",
  "PRODUCT_LIMIT_REACHED",
  "DAILY_CAPACITY_FULL",
]);

const FIELD_IDS: Record<string, string> = {
  deliveryDate: "checkout-dates",
  name: "checkout-customer-name",
  phone: "checkout-customer-phone",
  neighborhood: "checkout-neighborhood",
  addressDetail: "checkout-address-detail",
  terms: "checkout-terms",
};

export function CheckoutActions({
  paymentMethod,
  totalAmount,
  minBasketShortfall,
  orderingBlockedReason,
  onDatesStale,
  errors,
  onErrors,
  onOrderPlaced,
}: CheckoutActionsProps) {
  const items = useCartStore((s) => s.items);
  const customerInfo = useCartStore((s) => s.customerInfo);
  const termsAccepted = useCartStore((s) => s.termsAccepted);
  const setTermsAccepted = useCartStore((s) => s.setTermsAccepted);
  const clearCart = useCartStore((s) => s.clearCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const showSuccess = useCartStore((s) => s.showSuccess);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ödeme denemesi başına tek anahtar; sepet, bilgi veya ödeme yöntemi değişince yeni deneme sayılır.
  const attemptKeyRef = useRef<string>("");
  const attemptSignature = JSON.stringify([
    items.map((i) => [i.productId, i.quantity]),
    customerInfo.deliveryDate,
    customerInfo.neighborhood,
    customerInfo.addressDetail,
    normalizePhone(customerInfo.phone) ?? customerInfo.phone.trim(),
    paymentMethod,
  ]);
  useEffect(() => {
    attemptKeyRef.current = newAttemptKey();
  }, [attemptSignature]);

  const focusFirstError = (errs: CheckoutErrors) => {
    const first = CHECKOUT_FIELD_ORDER.find((f) => errs[f]);
    if (!first) return;
    const el = document.getElementById(FIELD_IDS[first]);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if ("focus" in el && first !== "deliveryDate") (el as HTMLElement).focus({ preventScroll: true });
  };

  const handleOrder = async () => {
    setErrorMessage(null);
    if (orderingBlockedReason) {
      setErrorMessage(orderingBlockedReason);
      return;
    }
    const fieldErrors = validateCheckout({
      deliveryDate: customerInfo.deliveryDate,
      name: customerInfo.name,
      phone: customerInfo.phone,
      neighborhood: customerInfo.neighborhood,
      addressDetail: customerInfo.addressDetail,
      termsAccepted,
    });
    onErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setErrorMessage("Lütfen işaretli alanları tamamlayın.");
      focusFirstError(fieldErrors);
      return;
    }
    if (minBasketShortfall > 0) {
      setErrorMessage(`Minimum sipariş tutarına ${minBasketShortfall.toLocaleString("tr-TR")} ₺ kaldı.`);
      return;
    }
    setSubmitting(true);

    try {
      const { order, trackingToken } = await submitOrder({
        items,
        customerInfo,
        paymentMethod,
        idempotencyKey: attemptKeyRef.current || newAttemptKey(),
        termsAccepted,
      });

      if (trackingToken) {
        rememberDeviceOrder({
          id: order.id,
          orderNumber: order.orderNumber || order.id,
          token: trackingToken,
          deliveryDate: order.deliveryDate || customerInfo.deliveryDate,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
          })),
        });
      }

      trackEvent("order_ok", { orderId: order.orderNumber || order.id });
      attemptKeyRef.current = newAttemptKey();
      onOrderPlaced?.();
      clearCart();
      closeCart();
      setTermsAccepted(false);
      showSuccess({ order, trackingToken });
    } catch (err: unknown) {
      if (err instanceof OrderSubmitError) {
        trackEvent("order_error", { code: err.code || "unknown" });
        setErrorMessage(err.message);
        if (err.code && DATE_RELATED_CODES.has(err.code)) onDatesStale();
      } else {
        trackEvent("order_error", { code: "network" });
        console.error("Order submission error:", err);
        setErrorMessage("Bağlantı hatası. Lütfen tekrar deneyin; aynı sipariş iki kez oluşmaz.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || items.length === 0;

  return (
    <div className="space-y-2">
      <label
        htmlFor="checkout-terms"
        className="touch-target-44 min-h-[44px] py-2 px-3 rounded-xl bg-bg/60 border border-line hover:border-accent/40 flex items-center gap-3 text-xs leading-snug font-sans text-ink-muted cursor-pointer select-none transition-colors"
      >
        <input
          id="checkout-terms"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => {
            setTermsAccepted(e.target.checked);
            if (e.target.checked) onErrors({ ...errors, terms: undefined });
          }}
          className="h-5 w-5 shrink-0 accent-accent"
          aria-invalid={Boolean(errors.terms)}
          aria-describedby={errors.terms ? "checkout-terms-error" : undefined}
        />
        <span>
          <Link
            href="/mesafeli-satis"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline font-medium text-ink hover:text-accent"
          >
            Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi
          </Link>
          {"'ni okudum, kabul ediyorum."}
        </span>
      </label>
      {errors.terms && (
        <p id="checkout-terms-error" role="alert" className="text-xs text-bad font-sans -mt-1">
          {errors.terms}
        </p>
      )}

      {errorMessage && (
        <div role="alert" className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-bad text-xs font-sans flex items-center gap-2">
          <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleOrder}
        disabled={disabled}
        className="touch-target-44 w-full py-3.5 px-4 rounded-xl bg-artisan-terracotta-dark hover:bg-artisan-terracotta active:scale-[0.99] text-white font-sans text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs"
      >
        {submitting && <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />}
        <span>Siparişi onayla · {totalAmount.toLocaleString("tr-TR")} ₺</span>
      </button>
      <p className="text-center text-xs leading-snug font-sans text-ink-muted">
        Sipariş vermek ödeme yükümlülüğü doğurur; ödeme teslimatta kapıda nakit veya kapıda kredi/banka kartı (POS) ile yapılır. Kişisel verileriniz{" "}
        <Link
          href="/kvkk"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-ink hover:text-accent"
        >
          KVKK Aydınlatma Metni
        </Link>{" "}
        kapsamında işlenir.
      </p>
    </div>
  );
}
