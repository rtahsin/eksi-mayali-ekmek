"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useProducts } from "@/hooks/useProducts";
import { useCariler } from "@/hooks/useCariler";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BEYLIKDUZU_NEIGHBORHOODS,
  AdminPaymentMethod,
  OrderItem,
  OrderSource,
  CariAccount,
} from "@/types/admin";
import {
  ArrowLeft,
  Plus,
  Minus,
  Check,
  MessageSquare,
  Truck,
  Store,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  Building2,
  Tag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { WhatsAppOrderParserModal } from "@/components/admin/WhatsAppOrderParserModal";

function ManualOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCariId = searchParams.get("cariId") || "";

  const { createManualOrder, allOrders } = useAdminOrders();
  const { products } = useProducts("all");
  const { cariler, addTransaction } = useCariler();

  // Selected Cari
  const [selectedCariId, setSelectedCariId] = useState<string>(initialCariId);
  const selectedCari = cariler.find((c) => c.id === selectedCariId) || null;

  // WhatsApp Parser Modal
  const [showWhatsAppParserModal, setShowWhatsAppParserModal] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>("Adnan Kahveci");
  const [deliveryMethod, setDeliveryMethod] = useState<"courier" | "pickup">("courier");
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const d = new Date();
    if (d.getHours() >= 13) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split("T")[0];
  });
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState("14:00 - 18:00");
  const [paymentMethod, setPaymentMethod] = useState<AdminPaymentMethod>("cash_on_delivery");
  const [source, setSource] = useState<OrderSource>("whatsapp");
  const [orderNotes, setOrderNotes] = useState("");
  const [autoOpenWhatsApp, setAutoOpenWhatsApp] = useState(true);

  // Selected quantities: productId -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When initialCariId is set or changed, autofill Cari information
  useEffect(() => {
    if (selectedCari) {
      setCustomerName(selectedCari.businessName);
      if (selectedCari.phone) setPhone(selectedCari.phone);
      if (selectedCari.address) setDeliveryAddress(selectedCari.address);
      if (selectedCari.neighborhood) setNeighborhood(selectedCari.neighborhood);
      setPaymentMethod("cari");
    }
  }, [selectedCari]);

  // When phone query param is provided, autofill customer
  useEffect(() => {
    const qPhone = searchParams.get("phone");
    if (qPhone && !selectedCariId) {
      handlePhoneChange(qPhone);
    }
  }, [searchParams, allOrders, selectedCariId]);

  // Auto-fill from past orders when phone matches (if not cari)
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (selectedCariId) return; // Don't overwrite if Cari selected
    const clean = val.replace(/\D/g, "");
    if (clean.length >= 10) {
      const past = allOrders.find((o) => o.phone.replace(/\D/g, "").includes(clean));
      if (past) {
        if (!customerName) setCustomerName(past.customerName);
        if (!deliveryAddress) setDeliveryAddress(past.deliveryAddress);
        if (past.neighborhood) setNeighborhood(past.neighborhood);
      }
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Calculate order items using custom agreed Cari prices or retail prices
  const selectedItems: OrderItem[] = Object.entries(quantities)
    .map(([pId, qty]) => {
      const prod = products.find((p) => p.id === pId);
      if (!prod || qty <= 0) return null;

      // Check if Cari has negotiated custom wholesale price
      const customPrice = selectedCari?.customPrices?.[pId];
      const unitPrice = customPrice !== undefined ? customPrice : prod.price;

      return {
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
        weight: prod.weight,
        imageUrl: prod.imageUrl,
      };
    })
    .filter(Boolean) as OrderItem[];

  const subtotal = selectedItems.reduce((sum, it) => sum + it.totalPrice, 0);
  const shippingFee = deliveryMethod === "pickup" ? 0 : subtotal >= 1000 ? 0 : 150;
  const totalAmount = subtotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg("Lütfen müşteri veya firma adını girin.");
      return;
    }
    if (deliveryMethod === "courier" && !deliveryAddress.trim()) {
      setErrorMsg("Lütfen kurye teslimat adresini girin.");
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg("Lütfen siparişe en az bir ürün ekleyin.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createManualOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      deliveryAddress: deliveryMethod === "pickup" ? "Atölyeden Gel-Al" : deliveryAddress.trim(),
      neighborhood: deliveryMethod === "pickup" ? "Atölye" : neighborhood,
      deliveryMethod,
      deliveryDate,
      deliveryTimeWindow,
      items: selectedItems,
      subtotal,
      shippingFee,
      totalAmount,
      status: "hazirlaniyor",
      paymentMethod,
      source,
      cariId: selectedCariId || undefined,
      orderNotes: orderNotes.trim(),
    });

    if (res.success) {
      // If Cari order, record transaction in cari_hareketler automatically
      if (selectedCariId) {
        const itemsSummary = selectedItems
          .map((it) => `${it.quantity}x ${it.productName}`)
          .join(", ");
        await addTransaction(selectedCariId, {
          type: "satis",
          amount: totalAmount,
          description: `Sipariş: ${itemsSummary}`,
          date: deliveryDate,
          orderId: res.id,
        });
      }

      // If WhatsApp pre-confirmation requested
      if (autoOpenWhatsApp && phone.trim()) {
        const cleanPhone = phone.replace(/\D/g, "");
        const formatted = cleanPhone.startsWith("90")
          ? cleanPhone
          : cleanPhone.startsWith("0")
          ? `9${cleanPhone}`
          : `90${cleanPhone}`;
        const itemsSummary = selectedItems
          .map((it) => `${it.quantity}x ${it.productName}`)
          .join(", ");
        const trackingUrl = typeof window !== "undefined"
          ? `${window.location.origin}/siparis-takip/${res.id || ""}`
          : `https://ekmeklab.tr/siparis-takip/${res.id || ""}`;
        const text = `Merhaba ${customerName},\nEkmekLab taş fırın siparişiniz kaydedildi: ${itemsSummary}.\n\n📅 Teslimat Günü: ${deliveryDate} (${deliveryTimeWindow})\n💰 Toplam Tutar: ${totalAmount} ₺\n\n🔗 Siparişinizi canlı takip etmek için:\n${trackingUrl}\n\nTeşekkür ederiz! 🍞🌾`;
        window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
      }

      router.push("/admin/siparisler");
    } else {
      setErrorMsg(res.error || "Sipariş kaydedilemedi.");
      setIsSubmitting(false);
    }
  };

  const handleApplyWhatsAppParsed = (parsed: {
    customerName?: string;
    phone?: string;
    neighborhood?: string;
    deliveryAddress?: string;
    paymentMethod?: AdminPaymentMethod;
    quantities: Record<string, number>;
    orderNotes?: string;
  }) => {
    if (parsed.customerName) setCustomerName(parsed.customerName);
    if (parsed.phone) setPhone(parsed.phone);
    if (parsed.neighborhood) setNeighborhood(parsed.neighborhood);
    if (parsed.deliveryAddress) setDeliveryAddress(parsed.deliveryAddress);
    if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
    if (parsed.orderNotes) setOrderNotes(parsed.orderNotes);
    if (Object.keys(parsed.quantities).length > 0) {
      setQuantities(parsed.quantities);
    }
    setDeliveryMethod("courier");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumb, Title & WhatsApp Parser Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/siparisler"
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
              Hızlı Sipariş Girişi
            </h1>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              WhatsApp, telefon veya kurumsal cari siparişini anında Beylikdüzü kurye rota listesine ekleyin.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowWhatsAppParserModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>📋 WhatsApp Metnini Yapıştır & Doldur</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cari Selection Banner */}
      <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-200">Kurumsal Müşteri / Cari Seçimi</div>
            <div className="text-[11px] text-stone-400">
              Toptan cari seçilirse ikili anlaşmalı özel fiyatlar otomatik uygulanır.
            </div>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedCariId}
            onChange={(e) => setSelectedCariId(e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs font-semibold text-amber-400 focus:outline-none focus:border-amber-500"
          >
            <option value="">— Bireysel / Perakende Müşteri —</option>
            {cariler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName} ({c.neighborhood})
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer & Delivery Info + Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Address Details */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-amber-500 font-serif flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Müşteri & Teslimat Bilgileri</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">
                  {selectedCari ? "Firma / Cari Adı" : "Müşteri Adı Soyadı"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Telefon Numarası</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="0532..."
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Teslimat Yöntemi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("courier")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                      deliveryMethod === "courier"
                        ? "bg-amber-500 text-stone-950 border-amber-500"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Özel Kurye</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("pickup")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                      deliveryMethod === "pickup"
                        ? "bg-amber-500 text-stone-950 border-amber-500"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Atölyeden Gel-Al</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Beylikdüzü Mahallesi</label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  disabled={deliveryMethod === "pickup"}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  {BEYLIKDUZU_NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>
                      {n} Mahallesi
                    </option>
                  ))}
                </select>
              </div>

              {deliveryMethod === "courier" && (
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Açık Adres</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      required
                      placeholder="Sokak, site adı, blok, daire no..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-500 font-serif flex items-center gap-2">
                <Store className="w-4 h-4" />
                <span>Ürün Seçimi & Adetler</span>
              </h2>
              {selectedCari && (
                <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {selectedCari.businessName} Anlaşmalı Fiyatları Aktif
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {products.map((prod) => {
                const qty = quantities[prod.id] || 0;
                const customPrice = selectedCari?.customPrices?.[prod.id];
                const activePrice = customPrice !== undefined ? customPrice : prod.price;

                return (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                      qty > 0
                        ? "bg-amber-500/10 border-amber-500/40"
                        : "bg-stone-950/60 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-stone-200 line-clamp-1">
                        {prod.name}
                      </div>
                      <div className="text-[11px] flex items-center gap-1.5 font-mono">
                        <span className="text-amber-400 font-bold">{activePrice} ₺</span>
                        {customPrice !== undefined && (
                          <span className="text-[10px] text-stone-500 line-through">
                            {prod.price} ₺
                          </span>
                        )}
                        <span className="text-stone-500">/ {prod.weight ? `${prod.weight}g` : "adet"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, -1)}
                        disabled={qty === 0}
                        className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-stone-100 font-mono">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Summary, Payment & Submission */}
        <div className="space-y-6">
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-stone-200 font-serif">
              Tarih, Ödeme & Kaynak
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Teslimat Tarihi</label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Teslimat Saat Aralığı</label>
                <input
                  type="text"
                  value={deliveryTimeWindow}
                  onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                  placeholder="14:00 - 18:00"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Ödeme Yöntemi</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as AdminPaymentMethod)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="cash_on_delivery">Kapıda Nakit</option>
                  <option value="pos_at_door">Kapıda Mobil POS (Kart)</option>
                  <option value="transfer">Havale / EFT</option>
                  <option value="cari">Kurumsal Cari Hesaba Yaz</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Sipariş Kaynağı</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as OrderSource)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="whatsapp">WhatsApp Hattı</option>
                  <option value="phone">Telefon Araması</option>
                  <option value="in_store">Atölye Yüz Yüze</option>
                  <option value="web">Web Sitesi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Özel Sipariş / Kurye Notu</label>
                <textarea
                  rows={2}
                  placeholder="Zil çalmasın, kapıya asın vb..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Total Calculation */}
            <div className="pt-4 border-t border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Ara Toplam:</span>
                <span className="font-mono font-bold text-stone-200">{subtotal} ₺</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Kurye Teslimatı:</span>
                <span className="font-mono">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-400 font-semibold">Ücretsiz</span>
                  ) : (
                    `${shippingFee} ₺`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-amber-400 pt-2 border-t border-stone-800/80 font-serif">
                <span>Genel Toplam:</span>
                <span>{totalAmount} ₺</span>
              </div>
            </div>

            {/* Auto WhatsApp Option */}
            <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={autoOpenWhatsApp}
                onChange={(e) => setAutoOpenWhatsApp(e.target.checked)}
                className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
              />
              <span>Kaydedince WhatsApp Onay Mesajını Aç</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sipariş Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Siparişi Kaydet & Rotaya Ekle</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* WhatsApp Quick Order Parser Modal */}
      <WhatsAppOrderParserModal
        isOpen={showWhatsAppParserModal}
        onClose={() => setShowWhatsAppParserModal(false)}
        products={products}
        allOrders={allOrders}
        onApply={handleApplyWhatsAppParsed}
      />
    </div>
  );
}

export default function NewManualOrderPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-stone-400">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-xs">Yükleniyor...</p>
        </div>
      }
    >
      <ManualOrderForm />
    </Suspense>
  );
}
