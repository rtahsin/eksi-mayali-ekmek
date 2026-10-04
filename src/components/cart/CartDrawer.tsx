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
  Calendar,
  User,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Navigation,
  Loader2,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

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
    clearCart,
    setDeliveryMethod,
    setCustomerInfo,
    getItemCount,
    getSubtotal,
    getShippingFee,
    getTotalAmount,
  } = useCartStore();

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const handleGetLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }

    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Reverse geocode via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "tr-TR", "User-Agent": "EkmekLab-App" } }
          );

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            // Match neighborhood
            const detectedSub = (
              addr.suburb ||
              addr.neighbourhood ||
              addr.quarter ||
              ""
            ).toLowerCase();
            let matchedNeighborhood = "";

            for (const nh of BEYLIKDUZU_NEIGHBORHOODS) {
              const rootName = nh.replace(" Mah.", "").toLowerCase();
              if (detectedSub.includes(rootName)) {
                matchedNeighborhood = nh;
                break;
              }
            }

            // Road & house number
            const road = addr.road || "";
            const house = addr.house_number ? ` No: ${addr.house_number}` : "";
            const streetLine = road ? `${road}${house}` : "";

            const currentDetail = customerInfo.addressDetail
              ? customerInfo.addressDetail.trim()
              : "";
            const coordsTag = `[📍 GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}]`;

            const newDetail = streetLine
              ? currentDetail
                ? `${currentDetail}, ${streetLine}`
                : `${streetLine} ${coordsTag}`
              : currentDetail
              ? `${currentDetail} ${coordsTag}`
              : `Beylikdüzü ${coordsTag}`;

            setCustomerInfo({
              ...(matchedNeighborhood ? { neighborhood: matchedNeighborhood } : {}),
              addressDetail: newDetail,
            });
          } else {
             setLocateError("Adres servisi yanıt vermedi. Lütfen elle giriniz.");
          }
        } catch (err) {
          console.warn("Location reverse geocode error:", err);
          setLocateError("Konum servisine erişilemedi. Lütfen elle giriniz.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocateError("Konum izni reddedildi. Lütfen adresinizi elle giriniz.");
        } else {
          setLocateError("Konum alınamadı (GPS kapalı veya sinyal yok). Lütfen elle giriniz.");
        }
        setTimeout(() => setLocateError(null), 5000);
      },
      { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  const { user, profile, addresses, isLoggedIn, openAuthModal } = useAuth();

  // Auto-prefill customer info when logged in and current inputs are empty
  React.useEffect(() => {
    if (isLoggedIn && profile) {
      if (!customerInfo.name && profile.fullName) {
        setCustomerInfo({ name: profile.fullName });
      }
      if (!customerInfo.phone && profile.phone) {
        setCustomerInfo({ phone: profile.phone });
      }
    }
  }, [isLoggedIn, profile, customerInfo.name, customerInfo.phone, setCustomerInfo]);

  const [cutoffInfo, setCutoffInfo] = useState<{ cutoffTime: string; isCutoffPassed: boolean }>({
    cutoffTime: "12:00",
    isCutoffPassed: false,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  React.useEffect(() => {
    if (isOpen) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.cutoffTime) {
            setCutoffInfo(data);
            if (data.isCutoffPassed) {
              const curDate = customerInfo?.deliveryDate || "today";
              if (curDate === "today" || curDate === todayStr || curDate === `custom:${todayStr}`) {
                setCustomerInfo({ deliveryDate: "tomorrow" });
                setShowCustomDate(false);
              }
            }
          }
        })
        .catch((err) => console.error("Error checking cutoff time:", err));
    }
  }, [isOpen, customerInfo?.deliveryDate, setCustomerInfo, todayStr]);

  const currentDeliveryDate = customerInfo?.deliveryDate || "today";
  const [showCustomDate, setShowCustomDate] = useState<boolean>(
    currentDeliveryDate.startsWith("custom:")
  );

  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const shippingFee = getShippingFee();
  const totalAmount = getTotalAmount();

  if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex justify-end">
 {/* Backdrop Overlay */}
 <div
 className="fixed inset-0 bg-black/70 transition-opacity animate-fadeIn"
 onClick={closeCart}
 />

 {/* Slide-out Drawer Panel */}
 <div className="relative z-10 w-full max-w-md bg-linen border-l border-linen-border h-full flex flex-col shadow-2xl overflow-hidden animate-slideLeft">
 {/* Header */}
 <div className="p-4 sm:p-5 border-b border-linen-border flex items-center justify-between bg-linen-surface">
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-artisan-terracotta-soft border border-artisan-terracotta/20 flex items-center justify-center text-artisan-terracotta">
 <ShoppingBag className="w-4 h-4" />
 </div>
 <div>
 <div className="font-serif text-base font-bold text-espresso flex items-center gap-2">
 <span>Sepetim</span>
 <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-linen-subtle text-espresso border border-linen-border font-medium">
 {itemCount} Ürün
 </span>
 </div>
 <div className="text-[10px] font-sans text-espresso-wheat">
 EkmekLab Taze Fırın Çıkışı
 </div>
 </div>
 </div>

 <button
 onClick={closeCart}
 className="p-2 rounded-lg touch-target-44 text-espresso-muted hover:text-espresso hover:bg-linen-subtle transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Scrollable Body */}
 <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
 {items.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
 <div className="w-16 h-16 rounded-2xl bg-linen-surface border border-linen-border flex items-center justify-center text-espresso-muted shadow-2xs">
 <ShoppingBag className="w-8 h-8" />
 </div>
 <div className="space-y-1">
 <h4 className="font-serif text-base font-bold text-espresso">
 Sepetiniz Henüz Boş
 </h4>
 <p className="text-xs text-espresso-wheat max-w-xs font-sans">
 Taş fırında taze pişen ekşi mayalı ekmeklerimizden ve şarküteri ürünlerimizden seçin.
 </p>
 </div>
 <button
 onClick={closeCart}
 className="mt-2 px-6 py-2.5 rounded-xl touch-target-44 bg-artisan-terracotta text-white font-sans text-xs font-semibold hover:bg-artisan-terracotta-dark transition-colors shadow-xs"
 >
 Ürünleri İncele
 </button>
 </div>
 ) : (
 <>
 {/* Free Shipping Progress Goal */}
 <div className="p-3.5 rounded-2xl bg-linen-surface border border-linen-border space-y-2.5 shadow-2xs">
 <div className="flex items-center justify-between text-xs">
 {subtotal >= 1000 ? (
 <span className="text-emerald-400 font-bold flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5" />
 <span>Tebrikler! Fırın kuryesi teslimatınız ÜCRETSİZ!</span>
 </span>
 ) : (
 <span className="text-espresso-wheat font-medium">
 Ücretsiz kurye teslimatına son <strong className="text-artisan-terracotta font-bold">{1000 - subtotal} TL</strong>
 </span>
 )}
 <span className="text-[10px] font-sans text-espresso-muted">1.000 TL Hedefi</span>
 </div>

 <div className="w-full h-2 rounded-full bg-linen-subtle overflow-hidden border border-linen-border">
 <div
 className="h-full bg-gradient-to-r from-artisan-terracotta via-artisan-amber to-artisan-gold transition-all duration-500 rounded-full"
 style={{ width: `${Math.min(100, (subtotal / 1000) * 100)}%` }}
 />
 </div>

 {subtotal < 1000 && (
 <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
 <span className="text-espresso-wheat font-sans text-[10px]">Gurme Eşlikçi:</span>
 {!items.some((i) => i.productId === "YGnge5isqk1d4nI4YUx8") && (
 <button
 type="button"
 onClick={() => {
 const sut = INITIAL_PRODUCTS.find((p) => p.id === "YGnge5isqk1d4nI4YUx8");
 if (sut) addItem(sut, null, 1);
 }}
 className="px-2.5 py-1 rounded-lg touch-target-44 bg-linen-subtle hover:bg-linen text-espresso border border-linen-border transition-all font-sans flex items-center gap-1 text-[11px]"
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
 className="px-2.5 py-1 rounded-lg touch-target-44 bg-linen-subtle hover:bg-linen text-espresso border border-linen-border transition-all font-sans flex items-center gap-1 text-[11px]"
 >
 <Plus className="w-3 h-3" />
 <span>Mihaliç Peyniri (+240 ₺)</span>
 </button>
 )}
 </div>
 )}
 </div>

 {/* Delivery Method Indicator - Courier Only */}
 <div className="space-y-1.5">
 <div className="text-[11px] font-sans font-semibold text-artisan-terracotta uppercase tracking-wider">
 Teslimat Yöntemi
 </div>
 <div className="p-3 rounded-xl bg-linen-surface border border-linen-border flex items-center justify-between shadow-2xs">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-artisan-terracotta-soft border border-artisan-terracotta/20 flex items-center justify-center text-artisan-terracotta shrink-0">
 <Truck className="w-4 h-4" />
 </div>
 <div>
 <div className="font-bold text-xs text-espresso flex items-center gap-1.5">
 <span>Beylikdüzü Fırın Kuryesi</span>
 <span className="text-[9px] px-1.5 py-0.5 rounded bg-artisan-terracotta-soft text-artisan-terracotta font-sans font-bold">KAPINIZA TESLİM</span>
 </div>
 <div className="text-[10px] text-espresso-wheat">Taze taş fırın ekmekleriniz kapınıza ulaştırılır</div>
 </div>
 </div>
 </div>
 </div>

 {/* Delivery Date Preference Picker */}
 <div className="space-y-2">
 <div className="text-[11px] font-sans font-semibold text-artisan-terracotta uppercase tracking-wider flex items-center justify-between">
 <span>Teslimat Günü</span>
 <span className="text-[10px] text-espresso-wheat font-normal">Taze Pişirme</span>
 </div>

 <div className="grid grid-cols-3 gap-1.5">
 <button
 type="button"
 disabled={cutoffInfo.isCutoffPassed}
 onClick={() => {
 if (cutoffInfo.isCutoffPassed) return;
 setShowCustomDate(false);
 setCustomerInfo({ deliveryDate: "today"});
}}
 className={`p-2.5 rounded-xl border font-sans text-xs text-center transition-all ${
 cutoffInfo.isCutoffPassed
 ? "bg-linen-subtle/50 border-linen-border/40 text-espresso-muted/40 cursor-not-allowed"
 : currentDeliveryDate === "today"
 ? "bg-artisan-terracotta text-white font-semibold border-artisan-terracotta shadow-xs"
 : "bg-linen-surface border-linen-border text-espresso-wheat hover:text-espresso"
}`}
 title={
 cutoffInfo.isCutoffPassed
 ? `Bugün için son sipariş saati (${cutoffInfo.cutoffTime}) dolmuştur.`
 : "Aynı Gün Teslimat"
}
 >
 <div className={`font-bold ${cutoffInfo.isCutoffPassed ? "line-through opacity-60" : ""}`}>Bugün</div>
 <div className="text-[9px] opacity-80">{cutoffInfo.isCutoffPassed ? "Süre Doldu" : "Aynı Gün"}</div>
 </button>

 <button
 type="button"
 onClick={() => {
 setShowCustomDate(false);
 setCustomerInfo({ deliveryDate: "tomorrow"});
}}
 className={`p-2.5 rounded-xl border font-sans text-xs text-center transition-all ${
 currentDeliveryDate === "tomorrow"
 ? "bg-artisan-terracotta text-white font-semibold border-artisan-terracotta shadow-xs"
 : "bg-linen-surface border-linen-border text-espresso-wheat hover:text-espresso"
}`}
 >
 <div className="font-bold">Yarın</div>
 <div className="text-[9px] opacity-80">Sabah Fırın</div>
 </button>

 <button
 type="button"
 onClick={() => {
 setShowCustomDate(true);
 setCustomerInfo({ deliveryDate: "custom:" + (customerInfo.customDate || (cutoffInfo.isCutoffPassed ? tomorrowStr : todayStr))});
}}
 className={`p-2.5 rounded-xl border font-sans text-xs text-center transition-all ${
 showCustomDate
 ? "bg-artisan-terracotta text-white font-semibold border-artisan-terracotta shadow-xs"
 : "bg-linen-surface border-linen-border text-espresso-wheat hover:text-espresso"
}`}
 >
 <div className="font-bold">Tarih Seç</div>
 <div className="text-[9px] opacity-80">İleri Tarih</div>
 </button>
 </div>

 {/* Cutoff Notice */}
 {cutoffInfo.isCutoffPassed && (
 <div className="text-[10px] text-espresso bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-1.5 mt-1.5 leading-tight">
 <span>⏰</span>
 <span>
 Bugün için son sipariş saati ({cutoffInfo.cutoffTime}) dolmuştur. Siparişleriniz yarın fırından taze teslim edilecektir.
 </span>
 </div>
 )}

 {/* Custom Date Input */}
 {showCustomDate && (
 <div className="pt-2">
 <label className="block text-[10px] font-sans text-espresso-wheat mb-1">
 İstediğiniz Teslimat Tarihi:
 </label>
 <input
 type="date"
 min={cutoffInfo.isCutoffPassed ? tomorrowStr : todayStr}
 value={customerInfo.customDate || (cutoffInfo.isCutoffPassed ? tomorrowStr : todayStr)}
 onChange={(e) => {
 const dateVal = e.target.value;
 setCustomerInfo({
 customDate: dateVal,
 deliveryDate: `custom:${dateVal}`,
});
}}
 className="w-full px-3 py-2 rounded-xl bg-linen-surface border border-linen-border text-xs text-espresso focus:border-artisan-terracotta focus:outline-none font-sans"
 />
 </div>
 )}
 </div>

 {/* Items in Cart */}
 <div className="space-y-3">
 <div className="text-[11px] font-sans font-semibold text-artisan-terracotta uppercase tracking-wider">
 Seçilen Ürünler
 </div>

 <div className="space-y-2.5">
 {items.map((item) => (
 <div
 key={item.productId}
 className="p-3 rounded-2xl bg-linen-surface border border-linen-border flex gap-3 items-center justify-between shadow-2xs"
 >
 <img
 src={item.imageUrl}
 alt={item.name}
 className="w-14 h-14 rounded-xl object-cover bg-linen-subtle shrink-0"
 />

 <div className="flex-1 min-w-0">
 <div className="font-serif font-bold text-xs sm:text-sm text-espresso truncate">
 {item.name}
 </div>
 <div className="text-[10px] font-sans text-espresso-wheat mt-0.5">
 {item.weight}gr · {item.price} TL
 </div>
 <div className="font-serif text-sm font-bold text-espresso mt-1">
 {item.price * item.quantity} TL
 </div>
 </div>

 <div className="flex flex-col items-end gap-1.5">
 <button
 type="button"
 onClick={() => removeItem(item.productId)}
 className="touch-target-44 text-espresso-muted hover:text-red-500 transition-colors p-1"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>

 <div className="flex items-center rounded-lg bg-linen-subtle border border-linen-border">
 <button
 type="button"
 onClick={() => updateQuantity(item.productId, item.quantity - 1)}
 className="touch-target-44 w-8 h-8 flex items-center justify-center text-espresso-wheat hover:text-espresso"
 >
 <Minus className="w-3 h-3" />
 </button>
 <span className="w-8 text-center font-serif text-xs font-bold text-espresso">
 {item.quantity}
 </span>
 <button
 type="button"
 onClick={() => updateQuantity(item.productId, item.quantity + 1)}
 className="touch-target-44 w-8 h-8 flex items-center justify-center text-espresso-wheat hover:text-espresso"
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
  <div className="space-y-3 pt-2 border-t border-linen-border">
    <div className="flex items-center justify-between">
      <div className="text-[11px] font-sans font-semibold text-artisan-terracotta uppercase tracking-wider">
        Teslimat & İletişim Bilgileri
      </div>
      {isLoggedIn ? (
        <span className="text-[10px] font-sans text-emerald-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>Müdavim Üye</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => openAuthModal()}
          className="text-[10px] font-sans text-artisan-terracotta hover:underline font-bold flex items-center gap-1"
        >
          <span>Giriş Yap</span>
        </button>
      )}
    </div>

    {/* Saved Addresses for logged in user */}
    {isLoggedIn && addresses.length > 0 && deliveryMethod === "courier" && (
      <div className="p-2.5 rounded-xl bg-linen-surface border border-linen-border space-y-1.5">
        <div className="text-[10px] font-sans text-espresso-wheat flex items-center justify-between">
          <span>Kayıtlı Adresleriniz (Tek Tıkla Doldur):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              type="button"
              onClick={() => {
                setCustomerInfo({
                  neighborhood: addr.neighborhood,
                  addressDetail: addr.addressDetail,
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-sans border transition-all flex items-center gap-1 ${
                customerInfo.addressDetail === addr.addressDetail
                  ? "bg-artisan-terracotta-soft text-artisan-terracotta border-artisan-terracotta/40 font-bold shadow-2xs"
                  : "bg-linen-subtle border-linen-border text-espresso-wheat hover:text-espresso"
              }`}
            >
              <MapPin className="w-3 h-3 text-artisan-terracotta" />
              <span>{addr.title}</span>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Guest prompt if not logged in */}
    {!isLoggedIn && (
      <button
        type="button"
        onClick={() => openAuthModal()}
        className="w-full p-2.5 rounded-xl bg-linen-subtle hover:bg-linen-surface border border-linen-border text-xs text-artisan-terracotta flex items-center justify-between transition-colors text-left shadow-2xs"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Kayıtlı adreslerinizle 1 tıkla sipariş için giriş yapın</span>
        </span>
        <span className="underline text-[11px] font-bold shrink-0">Giriş</span>
      </button>
    )}

    <div className="space-y-2.5 font-sans">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <div>
 <label className="block text-[10px] font-sans text-espresso-wheat mb-1">
 Adınız Soyadınız *
 </label>
 <div className="relative">
 <User className="w-3.5 h-3.5 text-zinc-300 absolute left-2.5 top-2.5" />
 <input
 type="text"
 value={customerInfo.name}
 onChange={(e) => setCustomerInfo({ name: e.target.value})}
 placeholder="Ad Soyad"
 className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-linen-surface border border-linen-border text-xs text-espresso focus:border-artisan-terracotta focus:ring-1 focus:ring-artisan-terracotta outline-none"
 />
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-sans text-espresso-wheat mb-1">
 Telefon Numarası *
 </label>
 <div className="relative">
 <Phone className="w-3.5 h-3.5 text-zinc-300 absolute left-2.5 top-2.5" />
 <input
 type="tel"
 value={customerInfo.phone}
 onChange={(e) => setCustomerInfo({ phone: e.target.value})}
 placeholder="05XX XXX XX XX"
 className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-linen-surface border border-linen-border text-xs text-espresso focus:border-artisan-terracotta focus:ring-1 focus:ring-artisan-terracotta outline-none"
 />
 </div>
 </div>
 </div>

 {deliveryMethod === "courier" && (
 <>
 <div>
  <div className="flex items-center justify-between mb-1">
    <label className="text-[10px] font-sans text-espresso-wheat">
      Beylikdüzü Mahallesi *
    </label>
    <button
      type="button"
      disabled={locating}
      onClick={handleGetLocation}
      className="text-[10px] font-semibold text-artisan-terracotta hover:text-amber-300 flex items-center gap-1 transition-colors disabled:opacity-50"
      title="Telefon/Tarayıcı Konumunuzu Kullanarak Mahalleni ve Adresini Otomatik Bul"
    >
      {locating ? (
        <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
      ) : (
        <Navigation className="w-3 h-3 text-amber-400" />
      )}
      <span>{locating ? "Konum Alınıyor..." : "📍 Konumumu Otomatik Al"}</span>
    </button>
  </div>
  {locateError && (
    <div className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg mb-1.5 font-sans">
      {locateError}
    </div>
  )}
 <select
 value={customerInfo.neighborhood}
 onChange={(e) => setCustomerInfo({ neighborhood: e.target.value})}
 className="w-full px-2.5 py-2 rounded-xl bg-linen-surface border border-linen-border text-xs text-espresso focus:border-artisan-terracotta focus:ring-1 focus:ring-artisan-terracotta outline-none font-sans"
 >
 {BEYLIKDUZU_NEIGHBORHOODS.map((nh) => (
 <option key={nh} value={nh} className="bg-linen-surface text-espresso">
 {nh}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[10px] font-sans text-espresso-wheat mb-1">
 Açık Adres (Cadde / Sokak / Bina / Daire) *
 </label>
 <textarea
 rows={2}
 value={customerInfo.addressDetail}
 onChange={(e) => setCustomerInfo({ addressDetail: e.target.value})}
 placeholder="Örn: Barış Mah. Çiftlik Cad. No: 14 D: 6"
 className="w-full px-2.5 py-1.5 rounded-xl bg-linen-surface border border-linen-border text-xs text-espresso focus:border-artisan-terracotta focus:ring-1 focus:ring-artisan-terracotta outline-none resize-none"
 />
 </div>
 </>
 )}

 <div>
 <label className="block text-[10px] font-sans text-espresso-wheat mb-1">
 Sipariş Notu (Opsiyonel)
 </label>
 <input
 type="text"
 value={customerInfo.note || ""}
 onChange={(e) => setCustomerInfo({ note: e.target.value})}
 placeholder="Örn: Zili çalmayınız, kapıya asınız."
 className="w-full px-2.5 py-2 rounded-xl bg-linen-surface border border-linen-border text-xs text-espresso focus:border-artisan-terracotta focus:ring-1 focus:ring-artisan-terracotta outline-none"
 />
 </div>
 </div>
 </div>
 </>
 )}
 </div>

 {/* Footer & Price Breakdown */}
 {items.length > 0 && (
 <div className="p-4 sm:p-5 border-t border-linen-border bg-linen-surface space-y-3">
 <div className="space-y-1.5 font-sans text-xs text-espresso-wheat">
 <div className="flex items-center justify-between">
 <span>Ara Toplam</span>
 <span className="text-espresso font-serif font-bold">{subtotal} TL</span>
 </div>

 <div className="flex items-center justify-between">
 <span>Kurye Dağıtım</span>
 <span className={shippingFee === 0 ? "text-emerald-400 font-bold" : "text-espresso"}>
 {shippingFee === 0 ? "ÜCRETSİZ" : `${shippingFee} TL`}
 </span>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-linen-border font-bold text-sm text-espresso">
 <span className="font-serif">GENEL TOPLAM</span>
 <span className="text-lg font-serif text-artisan-terracotta">{totalAmount} TL</span>
 </div>
 </div>

 <CheckoutActions />
 </div>
 )}
 </div>
 </div>
 );
}
