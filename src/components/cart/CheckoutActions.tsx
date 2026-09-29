"use client";

import React, { useState } from "react";
import { useCartStore } from "@/lib/store/useCartStore";
import { createOrderInFirestore, generateWhatsAppOrderUrl } from "@/lib/order/createOrder";
import { MessageSquare, CreditCard, Banknote, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { PaymentMethod } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";

export function CheckoutActions() {
  const { user } = useAuth();
  const {
    items,
    customerInfo,
    deliveryMethod,
    getSubtotal,
    getShippingFee,
    getTotalAmount,
    clearCart,
    closeCart,
    setSuccessModal,
  } = useCartStore();

  const [loadingMethod, setLoadingMethod] = useState<PaymentMethod | "whatsapp" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = getSubtotal();
  const shippingFee = getShippingFee();
  const totalAmount = getTotalAmount();

  const validateForm = (): boolean => {
    if (!customerInfo.name || customerInfo.name.trim().length < 2) {
      setErrorMessage("Lütfen ad ve soyadınızı giriniz.");
      return false;
    }
    if (!customerInfo.phone || customerInfo.phone.trim().length < 10) {
      setErrorMessage("Lütfen geçerli bir telefon numarası giriniz.");
      return false;
    }
    if (deliveryMethod === "courier" && (!customerInfo.addressDetail || customerInfo.addressDetail.trim().length < 5)) {
      setErrorMessage("Lütfen teslimat için açık adresinizi giriniz.");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleWhatsAppOrder = () => {
    if (!validateForm()) return;

    setLoadingMethod("whatsapp");
    const url = generateWhatsAppOrderUrl({
      items,
      customerInfo,
      deliveryMethod,
      paymentMethod: "whatsapp",
      subtotal,
      shippingFee,
      totalAmount,
    });

    window.open(url, "_blank");
    setLoadingMethod(null);
  };

  const handleCodOrder = async (method: "cash_on_delivery" | "pos_at_door") => {
    if (!validateForm()) return;

    setLoadingMethod(method);
    try {
      const order = await createOrderInFirestore({
        items,
        customerInfo,
        deliveryMethod,
        paymentMethod: method,
        subtotal,
        shippingFee,
        totalAmount,
        userId: user?.id,
      });

      clearCart();
      closeCart();
      setSuccessModal(true, order);
    } catch (err: unknown) {
      console.error("Order submission error:", err);
      setErrorMessage("Sipariş oluşturulurken bir hata oluştu. Lütfen WhatsApp ile sipariş vermeyi deneyin.");
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 text-xs font-sans flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary Action: WhatsApp Fast Order */}
      <button
        type="button"
        onClick={handleWhatsAppOrder}
        disabled={loadingMethod !== null || items.length === 0}
        className="touch-target-44 w-full py-3.5 px-4 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta-dark active:scale-[0.99] text-white font-sans font-semibold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs disabled:opacity-50"
      >
        {loadingMethod === "whatsapp" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageSquare className="w-4 h-4" />
        )}
        <span>WhatsApp ile Hızlı Sipariş Ver</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Secondary Pay-at-Door Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* Cash on Delivery */}
        <button
          type="button"
          onClick={() => handleCodOrder("cash_on_delivery")}
          disabled={loadingMethod !== null || items.length === 0}
          className="touch-target-44 py-2.5 px-2 rounded-xl bg-linen-surface hover:bg-linen-subtle active:scale-[0.99] border border-linen-border text-espresso font-sans text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-2xs"
        >
          {loadingMethod === "cash_on_delivery" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-artisan-terracotta" />
          ) : (
            <Banknote className="w-3.5 h-3.5 text-artisan-terracotta" />
          )}
          <span>Kapıda Nakit</span>
        </button>

        {/* POS on Delivery */}
        <button
          type="button"
          onClick={() => handleCodOrder("pos_at_door")}
          disabled={loadingMethod !== null || items.length === 0}
          className="touch-target-44 py-2.5 px-2 rounded-xl bg-linen-surface hover:bg-linen-subtle active:scale-[0.99] border border-linen-border text-espresso font-sans text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-2xs"
        >
          {loadingMethod === "pos_at_door" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-artisan-terracotta" />
          ) : (
            <CreditCard className="w-3.5 h-3.5 text-artisan-terracotta" />
          )}
          <span>Kapıda POS / Kart</span>
        </button>
      </div>

      <div className="text-center text-[11px] font-sans text-espresso-muted pt-1">
        ⚡ Beylikdüzü fırın kuryesi ile taze kapınızda
      </div>
    </div>
  );
}
