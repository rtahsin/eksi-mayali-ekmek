"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import { CheckoutPaymentMethod, OrderSubmitError, submitOrder } from "@/lib/order/createOrder";
import { rememberDeviceOrder } from "@/lib/orders/deviceOrders";
import { MessageSquare, CreditCard, Banknote, Loader2, AlertCircle } from "lucide-react";

interface CheckoutActionsProps {
  /** Minimum sepet sağlanmadıysa ödeme kilitli */
  minBasketShortfall: number;
  /** Sipariş alımı kapalı / seçilebilir tarih yok */
  orderingBlockedReason: string | null;
  /** Tarih listesi tazelenmeli (ör. 409 INVALID_DELIVERY_DATE sonrası) */
  onDatesStale: () => void;
  /** Sipariş başarıyla kaydedildikten sonra (sepet temizlenmeden önce) çağrılır */
  onOrderPlaced?: () => void;
}

const newAttemptKey = () => `IDEM-${crypto.randomUUID()}`;

export function CheckoutActions({ minBasketShortfall, orderingBlockedReason, onDatesStale, onOrderPlaced }: CheckoutActionsProps) {
  const items = useCartStore((s) => s.items);
  const customerInfo = useCartStore((s) => s.customerInfo);
  const clearCart = useCartStore((s) => s.clearCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const showSuccess = useCartStore((s) => s.showSuccess);

  const [loadingMethod, setLoadingMethod] = useState<CheckoutPaymentMethod | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Ödeme denemesi başına tek anahtar; sepet içeriği değişince yeni deneme sayılır.
  const attemptKeyRef = useRef<string>("");
  const cartSignature = JSON.stringify(items.map((i) => [i.productId, i.quantity]));
  useEffect(() => {
    attemptKeyRef.current = newAttemptKey();
  }, [cartSignature]);

  const validateForm = (): string | null => {
    if (orderingBlockedReason) return orderingBlockedReason;
    if (!customerInfo.deliveryDate) return "Lütfen bir teslim günü seçin.";
    if (!customerInfo.name || customerInfo.name.trim().length < 2) return "Lütfen ad ve soyadınızı giriniz.";
    if (customerInfo.phone.replace(/\D/g, "").length < 10) return "Lütfen geçerli bir telefon numarası giriniz.";
    if (!customerInfo.neighborhood) return "Lütfen mahallenizi seçin.";
    if (!customerInfo.addressDetail || customerInfo.addressDetail.trim().length < 5)
      return "Lütfen teslimat için açık adresinizi giriniz.";
    if (minBasketShortfall > 0)
      return `Minimum sipariş tutarına ${minBasketShortfall.toLocaleString("tr-TR")} ₺ kaldı.`;
    if (!termsAccepted) return "Devam etmek için sözleşmeyi ve aydınlatma metnini onaylayın.";
    return null;
  };

  const handleOrder = async (method: CheckoutPaymentMethod) => {
    const problem = validateForm();
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    setErrorMessage(null);
    setLoadingMethod(method);

    try {
      const { order, trackingToken } = await submitOrder({
        items,
        customerInfo,
        paymentMethod: method,
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
        });
      }

      attemptKeyRef.current = newAttemptKey();
      onOrderPlaced?.();
      clearCart();
      closeCart();
      setTermsAccepted(false);
      showSuccess({ order, trackingToken });
    } catch (err: unknown) {
      if (err instanceof OrderSubmitError) {
        setErrorMessage(err.message);
        if (err.code === "INVALID_DELIVERY_DATE") onDatesStale();
      } else {
        console.error("Order submission error:", err);
        setErrorMessage("Bağlantı hatası. Lütfen tekrar deneyin; aynı sipariş iki kez oluşmaz.");
      }
    } finally {
      setLoadingMethod(null);
    }
  };

  const disabled = loadingMethod !== null || items.length === 0;

  return (
    <div className="space-y-3 pt-2">
      {/* Yasal onay (mesafeli satış + KVKK) */}
      <label className="flex items-start gap-2.5 text-[11px] leading-snug font-sans text-espresso-wheat cursor-pointer select-none">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => {
            setTermsAccepted(e.target.checked);
            if (e.target.checked) setErrorMessage(null);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-artisan-terracotta"
        />
        <span>
          <Link href="/mesafeli-satis" target="_blank" className="underline text-espresso hover:text-artisan-terracotta">
            Mesafeli Satış Sözleşmesi
          </Link>
          {"'ni ve "}
          <Link href="/kvkk" target="_blank" className="underline text-espresso hover:text-artisan-terracotta">
            KVKK Aydınlatma Metni
          </Link>
          {"'ni okudum, onaylıyorum."}
        </span>
      </label>

      {errorMessage && (
        <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 text-xs font-sans flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleOrder("cash_on_delivery")}
          disabled={disabled}
          className="touch-target-44 py-3.5 px-2 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta-dark active:scale-[0.99] text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-xs"
        >
          {loadingMethod === "cash_on_delivery" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Banknote className="w-4 h-4" />
          )}
          <span>Kapıda Nakit</span>
        </button>

        <button
          type="button"
          onClick={() => handleOrder("pos_at_door")}
          disabled={disabled}
          className="touch-target-44 py-3.5 px-2 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta-dark active:scale-[0.99] text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-xs"
        >
          {loadingMethod === "pos_at_door" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          <span>Kapıda Kart</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => handleOrder("whatsapp")}
        disabled={disabled}
        className="touch-target-44 w-full py-3 px-4 rounded-xl bg-linen-surface hover:bg-linen-subtle active:scale-[0.99] border border-linen-border text-espresso font-sans text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-2xs"
      >
        {loadingMethod === "whatsapp" ? (
          <Loader2 className="w-4 h-4 animate-spin text-artisan-terracotta" />
        ) : (
          <MessageSquare className="w-4 h-4 text-artisan-terracotta" />
        )}
        <span>Siparişi Ver, Ödemeyi WhatsApp&apos;ta Konuşalım</span>
      </button>

      <p className="text-center text-[11px] font-sans text-espresso-muted">
        Siparişiniz her durumda kaydedilir; size takip linki verilir.
      </p>
    </div>
  );
}
