"use client";

import React, { useState} from "react";
import { useCartStore} from "@/lib/store/useCartStore";
import { createOrderInFirestore, generateWhatsAppOrderUrl} from "@/lib/order/createOrder";
import { MessageSquare, CreditCard, Banknote, Loader2, AlertCircle, ArrowRight} from "lucide-react";
import { PaymentMethod} from "@/types";
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
 <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{errorMessage}</span>
 </div>
 )}

 {/* Primary Action: WhatsApp Fast Order */}
 <button
 type="button"
 onClick={handleWhatsAppOrder}
 disabled={loadingMethod !== null || items.length === 0}
 className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-stone-950 font-mono font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
 >
 {loadingMethod === "whatsapp" ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <MessageSquare className="w-4 h-4 fill-stone-950" />
 )}
 <span>WHATSAPP İLE HIZLI SİPARİŞ VER</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </button>

 {/* Secondary Pay-at-Door Actions */}
 <div className="grid grid-cols-2 gap-2 pt-1">
 {/* Cash on Delivery */}
 <button
 type="button"
 onClick={() => handleCodOrder("cash_on_delivery")}
 disabled={loadingMethod !== null || items.length === 0}
 className="py-3 px-2 rounded-xl bg-surface-panel hover:bg-surface-elevated active:scale-[0.99] border border-surface-border text-foreground/70 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
 >
 {loadingMethod === "cash_on_delivery" ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin text-artisan-gold" />
 ) : (
 <Banknote className="w-3.5 h-3.5 text-artisan-gold" />
 )}
 <span>Kapıda Nakit</span>
 </button>

 {/* POS on Delivery */}
 <button
 type="button"
 onClick={() => handleCodOrder("pos_at_door")}
 disabled={loadingMethod !== null || items.length === 0}
 className="py-3 px-2 rounded-xl bg-surface-panel hover:bg-surface-elevated active:scale-[0.99] border border-surface-border text-foreground/70 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
 >
 {loadingMethod === "pos_at_door" ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin text-artisan-temp" />
 ) : (
 <CreditCard className="w-3.5 h-3.5 text-artisan-temp" />
 )}
 <span>Kapıda POS / Kart</span>
 </button>
 </div>

 <div className="text-center text-[10px] font-mono text-zinc-500 pt-1">
 ⚡ Beylikdüzü kurye dağıtımı ile taze ve sıcak teslimat
 </div>
 </div>
 );
}
