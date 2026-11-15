"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useProducts } from "@/hooks/useProducts";
import { useCariler } from "@/hooks/useCariler";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPaymentMethod, OrderItem, OrderSource } from "@/types/admin";
import { ArrowLeft, Plus, Minus, Check, MessageCircle, Truck, Store, Phone, MapPin, AlertCircle, Loader2, Building2, Lock } from "lucide-react";
import Link from "next/link";
import { addDays, relativeTrDate } from "@/lib/time/istanbul";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { computeShippingFee, toWhatsAppNumber } from "@/lib/settings/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { isSoldOn } from "@/lib/ordering/saleDates";
import { orderMessage } from "@/lib/orders/adminFlow";
import { manualOrderProblem, type DeliveryMethod } from "@/lib/orders/manualOrder";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";

const SOURCES: { value: OrderSource; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telefon" },
  { value: "in_store", label: "Dükkân" },
];

const card = "bg-white border border-[#E2D3BD] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm";
const label = "text-xs font-semibold text-[#3B1E1A]";
const field =
  "w-full h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/65 focus:outline-none focus:border-[#B4532A]";
const chip = (on: boolean) =>
  `h-10 px-3 rounded-xl border text-sm font-semibold transition-colors ${
    on
      ? "bg-[#F3E2D4] border-[#B4532A] text-[#8E3D1B]"
      : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] hover:border-[#B4532A]/40"
  }`;

interface Saved {
  id: string;
  orderNumber?: string;
  message: string;
  phone: string;
}

function ManualOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useIstanbulToday();

  const { adminUser } = useAdminAuth();
  const canManageOrders = hasCapability(adminUser?.role, "orders.ops");
  const canReadCari = hasCapability(adminUser?.role, "cari.read");
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");

  const { createManualOrder, allOrders } = useAdminOrders();
  const { products } = useProducts("all");
  const { cariler } = useCariler();
  const { settings: storeSettings } = useStoreSettings();
  // Aynı formun çift gönderimi tek sipariş olur (sunucu idempotency anahtarı)
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [selectedCariId, setSelectedCariId] = useState<string>(canReadCari ? searchParams.get("cariId") || "" : "");
  const selectedCari = canReadCari ? cariler.find((c) => c.id === selectedCariId) || null : null;

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("courier");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [neighborhoodChoice, setNeighborhood] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<string>(today);
  const [timeWindowChoice, setTimeWindow] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<AdminPaymentMethod>("cash_on_delivery");
  const [source, setSource] = useState<OrderSource>("whatsapp");
  const [orderNotes, setOrderNotes] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [feeOverride, setFeeOverride] = useState<string | null>(null);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  const neighborhood = neighborhoodChoice || storeSettings.neighborhoods[0] || "";
  const timeWindow = timeWindowChoice ?? storeSettings.deliveryWindow;
  const isPickup = deliveryMethod === "pickup";

  // Cari seçilince bilgileri doldur; cari kaldırılınca "cariye yaz" ödemesi de kalkar
  useEffect(() => {
    if (selectedCari) {
      setCustomerName(selectedCari.businessName);
      if (selectedCari.phone) setPhone(selectedCari.phone);
      if (selectedCari.address) setDeliveryAddress(selectedCari.address);
      if (selectedCari.neighborhood) setNeighborhood(selectedCari.neighborhood);
      setPaymentMethod("cari");
    } else {
      setPaymentMethod((p) => (p === "cari" ? "cash_on_delivery" : p));
    }
  }, [selectedCari]);

  const changeCari = (id: string) => {
    if (selectedCari) {
      const prev = selectedCari;
      setCustomerName((v) => (v === prev.businessName ? "" : v));
      setPhone((v) => (prev.phone && v === prev.phone ? "" : v));
      setDeliveryAddress((v) => (prev.address && v === prev.address ? "" : v));
      setNeighborhood((v) => (prev.neighborhood && v === prev.neighborhood ? "" : v));
    }
    setSelectedCariId(id);
  };

  // Daha önce sipariş vermiş numara yazılınca ad ve adres dolar (cari seçiliyken dokunmaz)
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (selectedCariId) return;
    const clean = val.replace(/\D/g, "");
    if (clean.length < 10) return;
    const past = allOrders.find((o) => o.phone.replace(/\D/g, "").includes(clean.slice(-10)));
    if (!past) return;
    setCustomerName((n) => n || past.customerName);
    setDeliveryAddress((a) => a || past.deliveryAddress);
    if (past.neighborhood) setNeighborhood(past.neighborhood);
  };

  useEffect(() => {
    const qPhone = searchParams.get("phone");
    if (qPhone && !selectedCariId) handlePhoneChange(qPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- başlangıç URL telefonu için
  }, [searchParams, allOrders.length]);

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[productId] || 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  };

  if (!canManageOrders) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white border border-[#E2D3BD] rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] text-[#8E3D1B] flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Yetki Gerekli</h1>
        <p className="text-sm text-[#6E5148]">Yeni sipariş oluşturma yetkiniz bulunmuyor.</p>
        <Link
          href="/admin/siparisler"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold transition-colors"
        >
          Siparişlere Dön
        </Link>
      </div>
    );
  }

  const activeProducts = products.filter((p) => p.isActive !== false);

  const priceOf = (productId: string, retail: number) => selectedCari?.customPrices?.[productId] ?? retail;
  const selectedItems: OrderItem[] = activeProducts
    .filter((p) => (quantities[p.id] || 0) > 0)
    .map((p) => {
      const unitPrice = priceOf(p.id, p.price);
      const quantity = quantities[p.id];
      return { productId: p.id, productName: p.name, quantity, unitPrice, totalPrice: unitPrice * quantity, weight: p.weight, imageUrl: p.imageUrl };
    });

  const subtotal = selectedItems.reduce((sum, it) => sum + it.totalPrice, 0);
  const suggestedFee = isPickup || selectedCariId ? 0 : computeShippingFee(subtotal, storeSettings);
  const shippingFee = feeOverride === null || feeOverride.trim() === "" ? suggestedFee : Number(feeOverride.replace(",", "."));
  const totalAmount = subtotal + (Number.isFinite(shippingFee) ? shippingFee : 0);
  const fmt = (n: number) => `${n.toLocaleString("tr-TR")} ₺`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = manualOrderProblem({
      customerName,
      phone,
      deliveryMethod,
      deliveryAddress,
      neighborhood,
      itemCount: selectedItems.length,
      shippingFee,
    });
    if (problem) {
      setErrorMsg(problem);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const order = {
      customerName: customerName.trim(),
      items: selectedItems,
      deliveryDate,
      deliveryMethod,
      deliveryTimeWindow: isPickup ? undefined : timeWindow,
      totalAmount,
    };
    const res = await createManualOrder({
      ...order,
      idempotencyKey,
      phone: phone.trim(),
      deliveryAddress: isPickup ? "" : deliveryAddress.trim(),
      neighborhood: isPickup ? "" : neighborhood,
      subtotal,
      shippingFee,
      status: "hazirlaniyor",
      paymentMethod,
      source,
      cariId: canReadCari ? selectedCariId || undefined : undefined,
      orderNotes: orderNotes.trim(),
    });

    if (!res.success || !res.id) {
      setErrorMsg(res.error || "Sipariş kaydedilemedi.");
      setIsSubmitting(false);
      return;
    }

    if (sendWhatsApp && phone.trim()) {
      const message = orderMessage("alindi", order, {
        window: storeSettings.deliveryWindow,
        dateLabel: relativeTrDate(deliveryDate),
        trackingUrl: trackingUrl(res.orderNumber || res.id),
      });
      setSaved({ id: res.id, orderNumber: res.orderNumber, message, phone: phone.trim() });
      setIsSubmitting(false);
      return;
    }
    router.push("/admin/siparisler");
  };

  if (saved) {
    return (
      <div className="max-w-md mx-auto pt-6 pb-16 space-y-4">
        <div className={`${card} text-center`}>
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E5EFE7] border border-[#B4D3BC] text-[#1D5130] flex items-center justify-center">
            <Check className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Sipariş kaydedildi</h1>
          {saved.orderNumber && <p className="text-xs font-mono tabular-nums text-[#6E5148]">#{saved.orderNumber}</p>}
          <p className="text-sm text-[#3B1E1A] whitespace-pre-line text-left rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] p-3">
            {saved.message}
          </p>
          <a
            href={whatsappLink(saved.message, toWhatsAppNumber(saved.phone))}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-xl bg-[#1D7A46] hover:bg-[#166037] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" /> Müşteriye WhatsApp&apos;tan gönder
          </a>
          <div className="flex gap-2">
            <Link
              href={`/admin/siparisler/${saved.id}`}
              className="flex-1 h-11 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center justify-center transition-colors"
            >
              Siparişi aç
            </Link>
            <Link
              href="/admin/siparisler"
              className="flex-1 h-11 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center justify-center transition-colors"
            >
              Siparişlere dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tomorrow = addDays(today, 1);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/siparisler"
          aria-label="Siparişlere dön"
          className="w-10 h-10 rounded-xl bg-white hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#3B1E1A]">Yeni sipariş</h1>
          <p className="text-xs text-[#6E5148] mt-0.5">Telefon, WhatsApp ya da dükkân siparişi.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Müşteri */}
          <section className={card}>
            {canReadCari && cariler.length > 0 && (
              <div className="space-y-1">
                <label htmlFor="cari" className={`${label} flex items-center gap-1.5`}>
                  <Building2 className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" /> Cari
                </label>
                <select id="cari" value={selectedCariId} onChange={(e) => changeCari(e.target.value)} className={field}>
                  <option value="">Cari değil (perakende)</option>
                  {cariler.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.neighborhood ? `${c.businessName} (${c.neighborhood})` : c.businessName}
                    </option>
                  ))}
                </select>
                {selectedCari && <p className="text-xs text-[#8E3D1B] font-medium">Anlaşmalı fiyatlar uygulanır, teslimat ücreti yok.</p>}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="ad" className={label}>{selectedCari ? "Firma adı" : "Ad soyad"}</label>
                <input id="ad" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ahmet Yılmaz" className={field} />
              </div>
              <div className="space-y-1">
                <label htmlFor="tel" className={label}>
                  Telefon <span className="font-normal text-[#6E5148]">(isteğe bağlı)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#6E5148] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="tel"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0532 …"
                    className={`${field} pl-9 font-mono tabular-nums`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className={label}>Teslim</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={!isPickup}
                  onClick={() => setDeliveryMethod("courier")}
                  className={`${chip(!isPickup)} flex items-center justify-center gap-2`}
                >
                  <Truck className="w-4 h-4" aria-hidden="true" /> Adrese teslim
                </button>
                <button
                  type="button"
                  aria-pressed={isPickup}
                  onClick={() => setDeliveryMethod("pickup")}
                  className={`${chip(isPickup)} flex items-center justify-center gap-2`}
                >
                  <Store className="w-4 h-4" aria-hidden="true" /> Fırından alacak
                </button>
              </div>
            </div>

            {!isPickup && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="mahalle" className={label}>Mahalle</label>
                  <select id="mahalle" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={field}>
                    {(neighborhood && !storeSettings.neighborhoods.includes(neighborhood)
                      ? [neighborhood, ...storeSettings.neighborhoods]
                      : storeSettings.neighborhoods
                    ).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="adres" className={label}>Adres</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#6E5148] absolute left-3 top-3.5" aria-hidden="true" />
                    <textarea
                      id="adres"
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Sokak, site, blok, daire"
                      className={`${field} h-auto py-2.5 pl-9`}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Ürünler */}
          <section className={card}>
            <h2 className="font-serif text-base font-bold text-[#3B1E1A]">Ürünler</h2>
            {activeProducts.length === 0 && <p className="text-sm text-[#6E5148]">Satışta ürün yok ya da liste yüklenemedi.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeProducts.map((prod) => {
                const qty = quantities[prod.id] || 0;
                const price = priceOf(prod.id, prod.price);
                const soldThatDay = isSoldOn(prod.saleWeekdays, deliveryDate);
                return (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      qty > 0 ? "bg-[#F3E2D4]/70 border-[#B4532A]/60" : "bg-[#FBF6EC] border-[#E2D3BD]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#3B1E1A] leading-snug">{prod.name}</div>
                      {canViewFinance && (
                        <div className="text-xs text-[#6E5148] font-mono tabular-nums mt-0.5">
                          {fmt(price)}
                          {price !== prod.price && <span className="ml-1.5 line-through opacity-60">{fmt(prod.price)}</span>}
                        </div>
                      )}
                      {!soldThatDay && <div className="text-xs text-[#7A4A0B] font-medium mt-0.5">O gün satış günü değil</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`${prod.name} azalt`}
                        onClick={() => updateQuantity(prod.id, -1)}
                        disabled={qty === 0}
                        className="w-10 h-10 rounded-xl bg-white hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center disabled:opacity-35 transition-colors"
                      >
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <span className="w-7 text-center font-bold text-base text-[#3B1E1A] font-mono tabular-nums">{qty}</span>
                      <button
                        type="button"
                        aria-label={`${prod.name} ekle`}
                        onClick={() => updateQuantity(prod.id, 1)}
                        className="w-10 h-10 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white flex items-center justify-center transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={card}>
            <div className="space-y-1">
              <span className={label}>{isPickup ? "Alacağı gün" : "Teslim günü"}</span>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" aria-pressed={deliveryDate === today} onClick={() => setDeliveryDate(today)} className={chip(deliveryDate === today)}>
                  Bugün
                </button>
                <button type="button" aria-pressed={deliveryDate === tomorrow} onClick={() => setDeliveryDate(tomorrow)} className={chip(deliveryDate === tomorrow)}>
                  Yarın
                </button>
                <input
                  type="date"
                  aria-label="Başka gün"
                  value={deliveryDate}
                  min={today}
                  onChange={(e) => e.target.value && setDeliveryDate(e.target.value)}
                  className={`${chip(deliveryDate !== today && deliveryDate !== tomorrow)} px-2 text-xs font-mono tabular-nums`}
                />
              </div>
            </div>

            {!isPickup && (
              <div className="space-y-1">
                <label htmlFor="saat" className={label}>Saat aralığı</label>
                <input id="saat" type="text" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className={`${field} font-mono tabular-nums`} />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="odeme" className={label}>Ödeme</label>
              <select id="odeme" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as AdminPaymentMethod)} className={field}>
                <option value="cash_on_delivery">Nakit</option>
                <option value="pos_at_door">Kart (POS)</option>
                <option value="transfer">Havale / EFT</option>
                {canReadCari && selectedCari && <option value="cari">Cariye yaz</option>}
              </select>
            </div>

            <div className="space-y-1">
              <span className={label}>Nereden geldi</span>
              <div className="grid grid-cols-3 gap-2">
                {SOURCES.map((s) => (
                  <button key={s.value} type="button" aria-pressed={source === s.value} onClick={() => setSource(s.value)} className={chip(source === s.value)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="not" className={label}>Not</label>
              <textarea
                id="not"
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={isPickup ? "Örn. öğlen uğrayacak" : "Örn. zili çalmayın"}
                className={`${field} h-auto py-2.5`}
              />
            </div>

            {canViewFinance && (
              <div className="pt-3 border-t border-[#E2D3BD] space-y-2 text-sm">
                <div className="flex justify-between text-[#6E5148]">
                  <span>Ürünler</span>
                  <span className="font-mono tabular-nums text-[#3B1E1A] font-medium">{fmt(subtotal)}</span>
                </div>
                {!isPickup && (
                  <div className="flex items-center justify-between gap-3 text-[#6E5148]">
                    <label htmlFor="ucret">Teslimat ücreti</label>
                    <div className="relative w-28">
                      <input
                        id="ucret"
                        type="text"
                        inputMode="decimal"
                        value={feeOverride ?? String(suggestedFee)}
                        onChange={(e) => setFeeOverride(e.target.value)}
                        className="w-full h-9 pl-3 pr-7 rounded-lg bg-[#FBF6EC] border border-[#E2D3BD] text-right font-mono tabular-nums text-[#3B1E1A] focus:outline-none focus:border-[#B4532A]"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E5148]">₺</span>
                    </div>
                  </div>
                )}
                {!isPickup && !selectedCari && storeSettings.freeShippingThreshold > 0 && (
                  <p className="text-xs text-[#6E5148]">
                    {fmt(storeSettings.freeShippingThreshold)} ve üstü ücretsiz (Ayarlar). Gerekirse elle değiştir.
                  </p>
                )}
                <div className="flex justify-between text-lg font-bold text-[#3B1E1A] pt-2 border-t border-[#E2D3BD] font-serif">
                  <span>Toplam</span>
                  <span className="font-mono tabular-nums text-[#8E3D1B]">{fmt(totalAmount)}</span>
                </div>
              </div>
            )}

            {phone.trim() && (
              <label className="flex items-center gap-2 text-sm text-[#3B1E1A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="w-4 h-4 accent-[#B4532A]"
                />
                Kaydedince müşteriye WhatsApp mesajı hazırla
              </label>
            )}

            {errorMsg && (
              <div role="alert" className="p-3 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
              {isSubmitting ? "Kaydediliyor…" : "Siparişi kaydet"}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}

export default function NewManualOrderPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-[#6E5148]">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#B4532A]" aria-hidden="true" />
          <p className="text-xs">Yükleniyor…</p>
        </div>
      }
    >
      <ManualOrderForm />
    </Suspense>
  );
}
