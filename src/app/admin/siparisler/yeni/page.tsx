"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useProducts } from "@/hooks/useProducts";
import { useCariler } from "@/hooks/useCariler";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPaymentMethod, OrderItem, OrderSource } from "@/types/admin";
import { ArrowLeft, Plus, Minus, Check, MessageCircle, Truck, Store, Phone, MapPin, AlertCircle, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import { addDays, relativeTrDate } from "@/lib/time/istanbul";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { computeShippingFee, toWhatsAppNumber } from "@/lib/settings/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { isSoldOn } from "@/lib/ordering/saleDates";
import { orderMessage } from "@/lib/orders/adminFlow";
import { manualOrderProblem, type DeliveryMethod } from "@/lib/orders/manualOrder";

const SOURCES: { value: OrderSource; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telefon" },
  { value: "in_store", label: "Dükkân" },
];

const card = "bg-[#18130F] border border-[#261E17] rounded-2xl p-4 sm:p-5 space-y-4";
const label = "text-xs font-semibold text-stone-300";
const field =
  "w-full h-11 px-3 rounded-xl bg-[#1A1410] border border-[#2A201A] text-sm text-foreground placeholder:text-stone-600 focus:outline-none focus:border-artisan-gold";
const chip = (on: boolean) =>
  `h-10 px-3 rounded-xl border text-sm font-semibold transition-colors ${
    on ? "bg-artisan-terracotta/15 border-artisan-terracotta text-foreground" : "bg-[#1A1410] border-[#2A201A] text-stone-400 hover:text-stone-200"
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

  const { createManualOrder, allOrders } = useAdminOrders();
  const { products } = useProducts("all");
  const { cariler } = useCariler();
  const { settings: storeSettings } = useStoreSettings();
  // Aynı formun çift gönderimi tek sipariş olur (sunucu idempotency anahtarı)
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [selectedCariId, setSelectedCariId] = useState<string>(searchParams.get("cariId") || "");
  const selectedCari = cariler.find((c) => c.id === selectedCariId) || null;

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("courier");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [neighborhoodChoice, setNeighborhood] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<string>(today);
  // Boşsa ayardaki teslimat aralığı kullanılır
  const [timeWindowChoice, setTimeWindow] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<AdminPaymentMethod>("cash_on_delivery");
  const [source, setSource] = useState<OrderSource>("whatsapp");
  const [orderNotes, setOrderNotes] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  // null = ayardan hesaplanan ücret; elle yazılırsa o
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

  // Cari değişince önceki carinin doldurduğu (elle değiştirilmemiş) alanlar boşalır
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

  const activeProducts = products.filter((p) => p.isActive !== false);

  // Cari anlaşmalı fiyat varsa o, yoksa satış fiyatı
  const priceOf = (productId: string, retail: number) => selectedCari?.customPrices?.[productId] ?? retail;
  const selectedItems: OrderItem[] = activeProducts
    .filter((p) => (quantities[p.id] || 0) > 0)
    .map((p) => {
      const unitPrice = priceOf(p.id, p.price);
      const quantity = quantities[p.id];
      return { productId: p.id, productName: p.name, quantity, unitPrice, totalPrice: unitPrice * quantity, weight: p.weight, imageUrl: p.imageUrl };
    });

  const subtotal = selectedItems.reduce((sum, it) => sum + it.totalPrice, 0);
  // Fırından alımda ve cari siparişte ücret yok; adrese teslimde ayardaki kural, istenirse elle değişir
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
      cariId: selectedCariId || undefined,
      orderNotes: orderNotes.trim(),
    });

    if (!res.success || !res.id) {
      setErrorMsg(res.error || "Sipariş kaydedilemedi.");
      setIsSubmitting(false);
      return;
    }

    // Kayıttan sonra açılan pencereyi tarayıcı engelleyebilir; mesaj bağlantısı dokunarak açılsın
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
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-xl font-bold text-foreground">Sipariş kaydedildi</h1>
          {saved.orderNumber && <p className="text-xs font-mono text-stone-400">#{saved.orderNumber}</p>}
          <p className="text-sm text-stone-300 whitespace-pre-line text-left rounded-xl bg-[#1A1410] border border-[#2A201A] p-3">{saved.message}</p>
          <a
            href={whatsappLink(saved.message, toWhatsAppNumber(saved.phone))}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Müşteriye WhatsApp'tan gönder
          </a>
          <div className="flex gap-2">
            <Link href={`/admin/siparisler/${saved.id}`} className="flex-1 h-11 rounded-xl bg-[#201812] border border-[#2A201A] text-stone-300 text-sm flex items-center justify-center">
              Siparişi aç
            </Link>
            <Link href="/admin/siparisler" className="flex-1 h-11 rounded-xl bg-[#201812] border border-[#2A201A] text-stone-300 text-sm flex items-center justify-center">
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
          className="w-10 h-10 rounded-xl bg-[#201812] border border-[#2A201A] text-stone-300 hover:text-foreground flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Yeni sipariş</h1>
          <p className="text-xs text-stone-400 mt-0.5">Telefon, WhatsApp ya da dükkân siparişi.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Müşteri */}
          <section className={card}>
            {cariler.length > 0 && (
              <div className="space-y-1">
                <label htmlFor="cari" className={`${label} flex items-center gap-1.5`}>
                  <Building2 className="w-3.5 h-3.5" /> Cari
                </label>
                <select id="cari" value={selectedCariId} onChange={(e) => changeCari(e.target.value)} className={field}>
                  <option value="">Cari değil (perakende)</option>
                  {cariler.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.neighborhood ? `${c.businessName} (${c.neighborhood})` : c.businessName}
                    </option>
                  ))}
                </select>
                {selectedCari && <p className="text-xs text-stone-500">Anlaşmalı fiyatlar uygulanır, teslimat ücreti yok.</p>}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="ad" className={label}>{selectedCari ? "Firma adı" : "Ad soyad"}</label>
                <input id="ad" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ahmet Yılmaz" className={field} />
              </div>
              <div className="space-y-1">
                <label htmlFor="tel" className={label}>
                  Telefon <span className="font-normal text-stone-500">(isteğe bağlı)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="tel"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0532 …"
                    className={`${field} pl-9 font-mono`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className={label}>Teslim</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDeliveryMethod("courier")} className={`${chip(!isPickup)} flex items-center justify-center gap-2`}>
                  <Truck className="w-4 h-4" /> Adrese teslim
                </button>
                <button type="button" onClick={() => setDeliveryMethod("pickup")} className={`${chip(isPickup)} flex items-center justify-center gap-2`}>
                  <Store className="w-4 h-4" /> Fırından alacak
                </button>
              </div>
            </div>

            {!isPickup && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="mahalle" className={label}>Mahalle</label>
                  <select id="mahalle" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={field}>
                    {/* Mahalleler Ayarlar'dan; seçili değer listede yoksa (cari, eski sipariş) yine görünür. */}
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
                    <MapPin className="w-4 h-4 text-stone-500 absolute left-3 top-3.5" />
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
            <h2 className="font-serif text-base font-bold text-foreground">Ürünler</h2>
            {activeProducts.length === 0 && <p className="text-sm text-stone-500">Satışta ürün yok ya da liste yüklenemedi.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeProducts.map((prod) => {
                const qty = quantities[prod.id] || 0;
                const price = priceOf(prod.id, prod.price);
                const soldThatDay = isSoldOn(prod.saleWeekdays, deliveryDate);
                return (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      qty > 0 ? "bg-artisan-terracotta/10 border-artisan-terracotta/60" : "bg-[#1A1410] border-[#2A201A]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-200 leading-snug">{prod.name}</div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">
                        {fmt(price)}
                        {price !== prod.price && <span className="ml-1.5 line-through text-stone-600">{fmt(prod.price)}</span>}
                      </div>
                      {!soldThatDay && <div className="text-xs text-amber-400/80 mt-0.5">O gün satış günü değil</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`${prod.name} azalt`}
                        onClick={() => updateQuantity(prod.id, -1)}
                        disabled={qty === 0}
                        className="w-10 h-10 rounded-xl bg-[#201812] border border-[#2A201A] text-stone-300 flex items-center justify-center disabled:opacity-30"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-7 text-center font-bold text-base text-foreground font-mono">{qty}</span>
                      <button
                        type="button"
                        aria-label={`${prod.name} ekle`}
                        onClick={() => updateQuantity(prod.id, 1)}
                        className="w-10 h-10 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
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
                <button type="button" onClick={() => setDeliveryDate(today)} className={chip(deliveryDate === today)}>Bugün</button>
                <button type="button" onClick={() => setDeliveryDate(tomorrow)} className={chip(deliveryDate === tomorrow)}>Yarın</button>
                <input
                  type="date"
                  aria-label="Başka gün"
                  value={deliveryDate}
                  min={today}
                  onChange={(e) => e.target.value && setDeliveryDate(e.target.value)}
                  className={`${chip(deliveryDate !== today && deliveryDate !== tomorrow)} px-2 text-xs`}
                />
              </div>
            </div>

            {!isPickup && (
              <div className="space-y-1">
                <label htmlFor="saat" className={label}>Saat aralığı</label>
                <input id="saat" type="text" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className={field} />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="odeme" className={label}>Ödeme</label>
              <select id="odeme" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as AdminPaymentMethod)} className={field}>
                <option value="cash_on_delivery">Nakit</option>
                <option value="pos_at_door">Kart (POS)</option>
                <option value="transfer">Havale / EFT</option>
                {selectedCari && <option value="cari">Cariye yaz</option>}
              </select>
            </div>

            <div className="space-y-1">
              <span className={label}>Nereden geldi</span>
              <div className="grid grid-cols-3 gap-2">
                {SOURCES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSource(s.value)} className={chip(source === s.value)}>
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

            <div className="pt-3 border-t border-[#2A201A] space-y-2 text-sm">
              <div className="flex justify-between text-stone-400">
                <span>Ürünler</span>
                <span className="font-mono text-stone-200">{fmt(subtotal)}</span>
              </div>
              {!isPickup && (
                <div className="flex items-center justify-between gap-3 text-stone-400">
                  <label htmlFor="ucret">Teslimat ücreti</label>
                  <div className="relative w-28">
                    <input
                      id="ucret"
                      type="text"
                      inputMode="decimal"
                      value={feeOverride ?? String(suggestedFee)}
                      onChange={(e) => setFeeOverride(e.target.value)}
                      className="w-full h-9 pl-3 pr-7 rounded-lg bg-[#1A1410] border border-[#2A201A] text-right font-mono text-stone-200 focus:outline-none focus:border-artisan-gold"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500">₺</span>
                  </div>
                </div>
              )}
              {!isPickup && !selectedCari && storeSettings.freeShippingThreshold > 0 && (
                <p className="text-xs text-stone-500">
                  {fmt(storeSettings.freeShippingThreshold)} ve üstü ücretsiz (Ayarlar). Gerekirse elle değiştir.
                </p>
              )}
              <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-[#2A201A] font-serif">
                <span>Toplam</span>
                <span>{fmt(totalAmount)}</span>
              </div>
            </div>

            {phone.trim() && (
              <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} className="w-4 h-4 accent-[#B4532A]" />
                Kaydedince müşteriye WhatsApp mesajı hazırla
              </label>
            )}

            {errorMsg && (
              <div role="alert" className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
        <div className="p-16 text-center text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-xs">Yükleniyor…</p>
        </div>
      }
    >
      <ManualOrderForm />
    </Suspense>
  );
}
