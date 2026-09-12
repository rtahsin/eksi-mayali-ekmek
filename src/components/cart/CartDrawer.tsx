"use client";

import React, { useState } from "react";
import { useCartStore } from "@/lib/store/useCartStore";
import { INITIAL_PRODUCTS } from "@/hooks/useProducts";
import { CheckoutActions } from "./CheckoutActions";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Truck,
  Store,
  Calendar,
  User,
  Phone,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";

const BEYLIKDUZU_NEIGHBORHOODS = [
  "Adnan Kahveci Mah.",
  "Barış Mah.",
  "Büyükşehir Mah.",
  "Cumhuriyet Mah.",
  "Dereağzı Mah.",
  "Gürpınar Mah.",
  "Kavaklı Mah.",
  "Marmara Mah.",
  "Sahil Mah.",
  "Yakuplu Mah.",
];

export function CartDrawer() {
  const {
    items,
    isOpen,
    deliveryMethod,
    customerInfo,
    closeCart,
    addItem,
    updateQuantity,
    removeItem,
    setDeliveryMethod,
    setCustomerInfo,
    getItemCount,
    getSubtotal,
    getShippingFee,
    getTotalAmount,
  } = useCartStore();

 const currentDeliveryDate = customerInfo?.deliveryDate || "today";
 const [showCustomDate, setShowCustomDate] = useState<boolean>(
 currentDeliveryDate.startsWith("custom:")
 );

 const itemCount = getItemCount();
 const subtotal = getSubtotal();
 const shippingFee = getShippingFee();
 const totalAmount = getTotalAmount();

 if (!isOpen) return null;

 const todayStr = new Date().toISOString().split("T")[0];

 return (
 <div className="fixed inset-0 z-50 flex justify-end">
 {/* Backdrop Overlay */}
 <div
 className="fixed inset-0 bg-black/70 transition-opacity animate-fadeIn"
 onClick={closeCart}
 />

 {/* Slide-out Drawer Panel */}
 <div className="relative z-10 w-full max-w-md bg-surface-panel border-l border-surface-border h-full flex flex-col shadow-2xl overflow-hidden animate-slideLeft">
 {/* Header */}
 <div className="p-4 sm:p-5 border-b border-surface-border flex items-center justify-between bg-surface/90">
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-artisan-gold/40 flex items-center justify-center text-artisan-gold">
 <ShoppingBag className="w-4 h-4" />
 </div>
 <div>
 <div className="font-serif text-base font-bold text-artisan-cream flex items-center gap-2">
 <span>Sepetim</span>
 <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-artisan-brown/40 text-artisan-cream border border-artisan-gold/30">
 {itemCount} Ürün
 </span>
 </div>
 <div className="text-[10px] font-sans text-artisan-cream/60">
 EkmekLab Taze Fırın Çıkışı
 </div>
 </div>
 </div>

 <button
 onClick={closeCart}
 className="p-2 rounded-lg text-artisan-cream/70 hover:text-artisan-cream hover:bg-surface-elevated transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Scrollable Body */}
 <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
 {items.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
 <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center text-zinc-600">
 <ShoppingBag className="w-8 h-8" />
 </div>
 <div className="space-y-1">
 <h4 className="font-serif text-base font-bold text-artisan-cream">
 Sepetiniz Henüz Boş
 </h4>
 <p className="text-xs text-artisan-cream/70 max-w-xs font-sans">
 Taş fırında taze pişen ekşi mayalı ekmeklerimizden ve şarküteri ürünlerimizden seçin.
 </p>
 </div>
 <button
 onClick={closeCart}
 className="mt-2 px-6 py-2.5 rounded-xl bg-artisan-brown text-artisan-cream font-sans text-xs font-bold hover:bg-artisan-crust transition-colors shadow-md border border-artisan-gold/30"
 >
 Ürünleri İncele
 </button>
 </div>
 ) : (
 <>
 {/* Free Shipping Progress Goal */}
 <div className="p-3.5 rounded-2xl bg-surface border border-surface-border space-y-2.5">
 <div className="flex items-center justify-between text-xs">
 {subtotal >= 1000 ? (
 <span className="text-emerald-400 font-bold flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5" />
 <span>Tebrikler! Fırın kuryesi teslimatınız ÜCRETSİZ!</span>
 </span>
 ) : (
 <span className="text-foreground/80 font-medium">
 Ücretsiz kurye teslimatına son <strong className="text-artisan-gold font-bold">{1000 - subtotal} TL</strong>
 </span>
 )}
 <span className="text-[10px] font-mono text-foreground/50">1.000 TL Hedefi</span>
 </div>

 <div className="w-full h-2 rounded-full bg-surface-panel overflow-hidden border border-surface-border">
 <div
 className="h-full bg-gradient-to-r from-artisan-terracotta via-artisan-amber to-artisan-gold transition-all duration-500 rounded-full"
 style={{ width: `${Math.min(100, (subtotal / 1000) * 100)}%` }}
 />
 </div>

 {subtotal < 1000 && (
 <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
 <span className="text-foreground/50 font-sans text-[10px]">Gurme Eşlikçi:</span>
 {!items.some((i) => i.productId === "YGnge5isqk1d4nI4YUx8") && (
 <button
 type="button"
 onClick={() => {
 const sut = INITIAL_PRODUCTS.find((p) => p.id === "YGnge5isqk1d4nI4YUx8");
 if (sut) addItem(sut, null, 1);
 }}
 className="px-2.5 py-1 rounded-lg bg-surface-panel hover:bg-surface-elevated text-artisan-gold border border-artisan-gold/30 transition-all font-sans flex items-center gap-1"
 >
 <Plus className="w-3 h-3" />
 <span>Jersey Sütü 3L (+200 ₺)</span>
 </button>
 )}
 {!items.some((i) => i.productId === "prod_mihalic_07") && (
 <button
 type="button"
 onClick={() => {
 const peynir = INITIAL_PRODUCTS.find((p) => p.id === "prod_mihalic_07");
 if (peynir) addItem(peynir, null, 1);
 }}
 className="px-2.5 py-1 rounded-lg bg-surface-panel hover:bg-surface-elevated text-artisan-gold border border-artisan-gold/30 transition-all font-sans flex items-center gap-1"
 >
 <Plus className="w-3 h-3" />
 <span>Mihaliç Peyniri (+240 ₺)</span>
 </button>
 )}
 </div>
 )}
 </div>

 {/* Delivery Method Toggle */}
 <div className="space-y-2">
 <div className="text-[11px] font-serif font-bold text-artisan-gold uppercase tracking-wider">
 Teslimat Tercihi
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setDeliveryMethod("courier")}
 className={`p-3 rounded-xl border font-sans text-xs text-left transition-all ${
 deliveryMethod === "courier"
 ? "bg-surface-elevated border-artisan-gold text-artisan-cream shadow-sm"
 : "bg-surface border-surface-border text-artisan-cream/60 hover:text-artisan-cream"
}`}
 >
 <div className="flex items-center gap-1.5 font-bold mb-0.5">
 <Truck className="w-4 h-4 text-artisan-gold" />
 <span>Beylikdüzü Kurye</span>
 </div>
 <div className="text-[10px] text-artisan-cream/60">Kapınıza Teslimat</div>
 </button>

 <button
 type="button"
 onClick={() => setDeliveryMethod("pickup")}
 className={`p-3 rounded-xl border font-sans text-xs text-left transition-all ${
 deliveryMethod === "pickup"
 ? "bg-surface-elevated border-artisan-gold text-artisan-cream shadow-sm"
 : "bg-surface border-surface-border text-artisan-cream/60 hover:text-artisan-cream"
}`}
 >
 <div className="flex items-center gap-1.5 font-bold mb-0.5">
 <Store className="w-4 h-4 text-artisan-gold" />
 <span>Gel-Al (Atölye)</span>
 </div>
 <div className="text-[10px] text-artisan-cream/60">İmalathaneden Teslim</div>
 </button>
 </div>
 </div>

 {/* Delivery Date Preference Picker */}
 <div className="space-y-2">
 <div className="text-[11px] font-serif font-bold text-artisan-gold uppercase tracking-wider flex items-center justify-between">
 <span>Teslimat Günü</span>
 <span className="text-[10px] text-artisan-cream/60 font-normal">Taze Pişirme</span>
 </div>

 <div className="grid grid-cols-3 gap-1.5">
 <button
 type="button"
 onClick={() => {
 setShowCustomDate(false);
 setCustomerInfo({ deliveryDate: "today"});
}}
 className={`p-2.5 rounded-xl border font-sans text-xs text-center transition-all ${
 currentDeliveryDate === "today"
 ? "bg-artisan-brown text-artisan-cream font-bold border-artisan-gold shadow-sm"
 : "bg-surface border-surface-border text-artisan-cream/70 hover:text-artisan-cream"
}`}
 >
 <div className="font-bold">Bugün</div>
 <div className="text-[9px] opacity-80">Aynı Gün</div>
 </button>

 <button
 type="button"
 onClick={() => {
 setShowCustomDate(false);
 setCustomerInfo({ deliveryDate: "tomorrow"});
}}
 className={`p-2.5 rounded-xl border font-sans text-xs text-center transition-all ${
 currentDeliveryDate === "tomorrow"
 ? "bg-artisan-brown text-artisan-cream font-bold border-artisan-gold shadow-sm"
 : "bg-surface border-surface-border text-artisan-cream/70 hover:text-artisan-cream"
}`}
 >
 <div className="font-bold">Yarın</div>
 <div className="text-[9px] opacity-80">Sabah Fırın</div>
 </button>

 <button
 type="button"
 onClick={() => {
 setShowCustomDate(true);
 setCustomerInfo({ deliveryDate: "custom:" + (customerInfo.customDate || todayStr)});
}}
 className={`p-2.5 rounded-xl border font-sans text-xs text-center transition-all ${
 showCustomDate
 ? "bg-artisan-brown text-artisan-cream font-bold border-artisan-gold shadow-sm"
 : "bg-surface border-surface-border text-artisan-cream/70 hover:text-artisan-cream"
}`}
 >
 <div className="font-bold">Tarih Seç</div>
 <div className="text-[9px] opacity-80">İleri Tarih</div>
 </button>
 </div>

 {/* Custom Date Input */}
 {showCustomDate && (
 <div className="pt-2">
 <label className="block text-[10px] font-sans text-artisan-cream/70 mb-1">
 İstediğiniz Teslimat Tarihi:
 </label>
 <input
 type="date"
 min={todayStr}
 value={customerInfo.customDate || todayStr}
 onChange={(e) => {
 const dateVal = e.target.value;
 setCustomerInfo({
 customDate: dateVal,
 deliveryDate: `custom:${dateVal}`,
});
}}
 className="w-full px-3 py-2 rounded-xl bg-surface border border-artisan-gold text-xs text-artisan-cream focus:outline-none font-sans"
 />
 </div>
 )}
 </div>

 {/* Items in Cart */}
 <div className="space-y-3">
 <div className="text-[11px] font-serif font-bold text-artisan-gold uppercase tracking-wider">
 Seçilen Ürünler
 </div>

 <div className="space-y-2.5">
 {items.map((item) => (
 <div
 key={item.productId}
 className="p-3 rounded-2xl bg-surface border border-surface-border flex gap-3 items-center justify-between"
 >
 <img
 src={item.imageUrl}
 alt={item.name}
 className="w-14 h-14 rounded-xl object-cover bg-surface-elevated shrink-0"
 />

 <div className="flex-1 min-w-0">
 <div className="font-serif font-bold text-xs sm:text-sm text-artisan-cream truncate">
 {item.name}
 </div>
 <div className="text-[10px] font-sans text-artisan-cream/60 mt-0.5">
 {item.weight}gr · {item.price} TL
 </div>
 <div className="font-serif text-sm font-bold text-artisan-gold mt-1">
 {item.price * item.quantity} TL
 </div>
 </div>

 <div className="flex flex-col items-end gap-1.5">
 <button
 type="button"
 onClick={() => removeItem(item.productId)}
 className="text-zinc-500 hover:text-red-400 transition-colors p-1"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>

 <div className="flex items-center rounded-lg bg-surface-panel border border-surface-border">
 <button
 type="button"
 onClick={() => updateQuantity(item.productId, item.quantity - 1)}
 className="w-6 h-6 flex items-center justify-center text-artisan-cream/70 hover:text-artisan-cream"
 >
 <Minus className="w-3 h-3" />
 </button>
 <span className="w-6 text-center font-serif text-xs font-bold text-artisan-cream">
 {item.quantity}
 </span>
 <button
 type="button"
 onClick={() => updateQuantity(item.productId, item.quantity + 1)}
 className="w-6 h-6 flex items-center justify-center text-artisan-cream/70 hover:text-artisan-cream"
 >
 <Plus className="w-3 h-3" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Customer & Address Form */}
 <div className="space-y-3 pt-2 border-t border-surface-border">
 <div className="text-[11px] font-serif font-bold text-artisan-gold uppercase tracking-wider">
 Teslimat & İletişim Bilgileri
 </div>

 <div className="space-y-2.5 font-sans">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <div>
 <label className="block text-[10px] font-sans text-artisan-cream/70 mb-1">
 Adınız Soyadınız *
 </label>
 <div className="relative">
 <User className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
 <input
 type="text"
 value={customerInfo.name}
 onChange={(e) => setCustomerInfo({ name: e.target.value})}
 placeholder="Ad Soyad"
 className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-surface border border-surface-border text-xs text-artisan-cream focus:border-artisan-gold outline-none"
 />
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-sans text-artisan-cream/70 mb-1">
 Telefon Numarası *
 </label>
 <div className="relative">
 <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
 <input
 type="tel"
 value={customerInfo.phone}
 onChange={(e) => setCustomerInfo({ phone: e.target.value})}
 placeholder="05XX XXX XX XX"
 className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-surface border border-surface-border text-xs text-artisan-cream focus:border-artisan-gold outline-none"
 />
 </div>
 </div>
 </div>

 {deliveryMethod === "courier" && (
 <>
 <div>
 <label className="block text-[10px] font-sans text-artisan-cream/70 mb-1">
 Beylikdüzü Mahallesi *
 </label>
 <select
 value={customerInfo.neighborhood}
 onChange={(e) => setCustomerInfo({ neighborhood: e.target.value})}
 className="w-full px-2.5 py-2 rounded-xl bg-surface border border-surface-border text-xs text-artisan-cream focus:border-artisan-gold outline-none font-sans"
 >
 {BEYLIKDUZU_NEIGHBORHOODS.map((nh) => (
 <option key={nh} value={nh} className="bg-surface-panel text-artisan-cream">
 {nh}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[10px] font-sans text-artisan-cream/70 mb-1">
 Açık Adres (Cadde / Sokak / Bina / Daire) *
 </label>
 <textarea
 rows={2}
 value={customerInfo.addressDetail}
 onChange={(e) => setCustomerInfo({ addressDetail: e.target.value})}
 placeholder="Örn: Barış Mah. Çiftlik Cad. No: 14 D: 6"
 className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-surface-border text-xs text-artisan-cream focus:border-artisan-gold outline-none resize-none"
 />
 </div>
 </>
 )}

 <div>
 <label className="block text-[10px] font-sans text-artisan-cream/70 mb-1">
 Sipariş Notu (Opsiyonel)
 </label>
 <input
 type="text"
 value={customerInfo.note || ""}
 onChange={(e) => setCustomerInfo({ note: e.target.value})}
 placeholder="Örn: Zili çalmayınız, kapıya asınız."
 className="w-full px-2.5 py-2 rounded-xl bg-surface border border-surface-border text-xs text-artisan-cream focus:border-artisan-gold outline-none"
 />
 </div>
 </div>
 </div>
 </>
 )}
 </div>

 {/* Footer & Price Breakdown */}
 {items.length > 0 && (
 <div className="p-4 sm:p-5 border-t border-surface-border bg-surface/95 space-y-3">
 <div className="space-y-1.5 font-sans text-xs text-artisan-cream/70">
 <div className="flex items-center justify-between">
 <span>Ara Toplam</span>
 <span className="text-artisan-cream font-serif font-bold">{subtotal} TL</span>
 </div>

 <div className="flex items-center justify-between">
 <span>Kurye Dağıtım</span>
 <span className={shippingFee === 0 ? "text-emerald-400 font-bold" : "text-artisan-cream"}>
 {shippingFee === 0 ? "ÜCRETSİZ" : `${shippingFee} TL`}
 </span>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-surface-border font-bold text-sm text-artisan-cream">
 <span className="font-serif">GENEL TOPLAM</span>
 <span className="text-lg font-serif text-artisan-gold">{totalAmount} TL</span>
 </div>
 </div>

 <CheckoutActions />
 </div>
 )}
 </div>
 </div>
 );
}
