"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  History,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useProducts } from "@/hooks/useProducts";
import { useCariler } from "@/hooks/useCariler";
import { useCouriers } from "@/hooks/useCouriers";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";
import { addDays, isIsoDate, isPastCutoff, relativeTrDate } from "@/lib/time/istanbul";
import { computeShippingFee, toWhatsAppNumber } from "@/lib/settings/schema";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { isSoldOn } from "@/lib/ordering/saleDates";
import { orderMessage } from "@/lib/orders/adminFlow";
import { manualOrderProblem, type DeliveryMethod } from "@/lib/orders/manualOrder";
import type { AdminPaymentMethod, OrderItem, OrderSource } from "@/types/admin";

const SOURCES: { value: OrderSource; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telefon" },
  { value: "in_store", label: "Dükkân" },
];

const card = "bg-white border border-[#E2D3BD] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm";
const labelCls = "text-xs font-semibold text-[#3B1E1A]";
const field =
  "w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-base sm:text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/65 focus:outline-none focus:border-[#B4532A]";
const chip = (on: boolean) =>
  `min-h-11 px-3 rounded-xl border text-sm font-semibold transition-colors ${
    on
      ? "bg-[#F3E2D4] border-[#B4532A] text-[#8E3D1B]"
      : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] hover:border-[#B4532A]/40"
  }`;

interface Saved {
  id: string;
  orderNumber?: string;
  customerName: string;
  totalAmount: number;
  message: string | null;
  phone: string;
}

interface FreeformLine {
  id: string;
  productName: string;
  unitPriceInput: string;
  quantity: number;
}

interface LastOrderApiResponse {
  items?: Array<{
    productId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  sourceDate?: string | null;
  sourceKind?: "order" | "ledger" | null;
  error?: string;
}

function ManualOrderForm() {
  const searchParams = useSearchParams();
  const today = useIstanbulToday();
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  const { adminUser } = useAdminAuth();
  const canManageOrders = hasCapability(adminUser?.role, "orders.ops");
  const canReadCari = hasCapability(adminUser?.role, "cari.read");
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");

  const { createManualOrder, allOrders } = useAdminOrders();
  const { products } = useProducts("all");
  const { cariler } = useCariler();
  const { assignableCouriers } = useCouriers();
  const { settings: storeSettings } = useStoreSettings();

  const selectableCariler = useMemo(
    () => cariler.filter((c) => c.accountType !== "gider" && !c.archivedAt),
    [cariler],
  );

  // Aynı formun çift gönderimi tek sipariş olur (sunucu idempotency anahtarı)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const urlCariId = canReadCari ? searchParams.get("cariId") || "" : "";
  const urlDate = searchParams.get("date");

  const [selectedCariId, setSelectedCariId] = useState<string>(urlCariId);
  const selectedCari = useMemo(
    () => (canReadCari ? selectableCariler.find((c) => c.id === selectedCariId) || null : null),
    [canReadCari, selectableCariler, selectedCariId],
  );

  const [customerName, setCustomerName] = useState(() => searchParams.get("name") || "");
  const [phone, setPhone] = useState(() => searchParams.get("phone") || "");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("courier");
  const [deliveryAddress, setDeliveryAddress] = useState(() => searchParams.get("address") || "");
  const [neighborhoodChoice, setNeighborhood] = useState(() => searchParams.get("neighborhood") || "");
  const [courierId, setCourierId] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    if (urlDate && isIsoDate(urlDate)) return urlDate;
    return urlCariId ? tomorrow : today;
  });
  const dateTouchedRef = useRef(Boolean(urlDate && isIsoDate(urlDate)));
  const lastAppliedCariRef = useRef<string | null>(null);

  const [timeWindowChoice, setTimeWindow] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<AdminPaymentMethod>(
    urlCariId ? "cari" : "cash_on_delivery",
  );
  const [source, setSource] = useState<OrderSource>("whatsapp");
  const [orderNotes, setOrderNotes] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [feeOverride, setFeeOverride] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [freeformLines, setFreeformLines] = useState<FreeformLine[]>([]);
  const [loadingLastOrder, setLoadingLastOrder] = useState(false);
  const [lastOrderNote, setLastOrderNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  // Store cutoff geçtiyse veya cari seçiliyse kullanıcı değiştirmediyse Yarın varsayılan olur
  useEffect(() => {
    if (dateTouchedRef.current) return;
    if (selectedCariId || isPastCutoff(storeSettings.orderCutoffTime)) {
      setDeliveryDate(tomorrow);
    } else {
      setDeliveryDate(today);
    }
  }, [storeSettings.orderCutoffTime, selectedCariId, today, tomorrow]);

  const neighborhood = neighborhoodChoice || storeSettings.neighborhoods[0] || "";
  const timeWindow = timeWindowChoice ?? storeSettings.deliveryWindow;
  const isPickup = deliveryMethod === "pickup";

  // Cari seçilince bilgileri doldur (yalnız cari değişiminde bir kez)
  useEffect(() => {
    if (!selectedCari) {
      lastAppliedCariRef.current = null;
      setPaymentMethod((p) => (p === "cari" ? "cash_on_delivery" : p));
      return;
    }
    if (lastAppliedCariRef.current === selectedCari.id) return;
    lastAppliedCariRef.current = selectedCari.id;
    setCustomerName(selectedCari.businessName);
    setPhone(selectedCari.phone || "");
    setDeliveryAddress(selectedCari.address || "");
    setNeighborhood(selectedCari.neighborhood || "");
    setCourierId(selectedCari.defaultCourierId || "");
    setFeeOverride(null);
    setPaymentMethod("cari");
    setLastOrderNote(null);
  }, [selectedCari]);

  const changeCari = (id: string) => {
    // Önceki cariden veya perakende formundan state sızıntısını tamamen temizle
    lastAppliedCariRef.current = null;
    setCustomerName("");
    setPhone("");
    setDeliveryAddress("");
    setNeighborhood("");
    setFeeOverride(null);
    setCourierId("");
    setLastOrderNote(null);
    if (!id) {
      setPaymentMethod((p) => (p === "cari" ? "cash_on_delivery" : p));
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

  const activeProducts = useMemo(() => products.filter((p) => p.isActive !== false), [products]);

  const productById = useMemo(() => {
    const map = new Map<string, (typeof activeProducts)[number]>();
    for (const p of activeProducts) map.set(p.id, p);
    return map;
  }, [activeProducts]);

  const sortedProducts = useMemo(() => {
    const customPrices = selectedCari?.customPrices ?? {};
    const q = productSearch.trim().toLocaleLowerCase("tr-TR");
    const list = activeProducts.filter((p) => {
      if (!q) return true;
      return p.name.toLocaleLowerCase("tr-TR").includes(q) || (p.category ?? "").toLocaleLowerCase("tr-TR").includes(q);
    });
    return [...list].sort((a, b) => {
      const aCustom = customPrices[a.id] !== undefined ? 1 : 0;
      const bCustom = customPrices[b.id] !== undefined ? 1 : 0;
      if (aCustom !== bCustom) return bCustom - aCustom;
      return a.name.localeCompare(b.name, "tr-TR");
    });
  }, [activeProducts, productSearch, selectedCari?.customPrices]);

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(10000, (prev[productId] || 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  };

  const setExactQuantity = (productId: string, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    const n = cleaned ? parseInt(cleaned, 10) : 0;
    setQuantities((prev) => {
      const copy = { ...prev };
      if (!Number.isFinite(n) || n <= 0) delete copy[productId];
      else copy[productId] = Math.min(10000, n);
      return copy;
    });
  };

  const handleLoadLastOrder = async () => {
    if (!selectedCari) return;
    setLoadingLastOrder(true);
    setErrorMsg(null);
    setLastOrderNote(null);

    try {
      const res = await fetch(`/api/admin/cari/accounts/${encodeURIComponent(selectedCari.id)}/last-order`);
      const data = (await res.json().catch(() => null)) as LastOrderApiResponse | null;
      if (!res.ok) {
        throw new Error(data?.error || "Son sipariş okunamadı.");
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length === 0) {
        setLastOrderNote("Bu cari için önceki sipariş veya fiş kaydı bulunamadı.");
        return;
      }

      const nextQty: Record<string, number> = {};
      const nextFree: FreeformLine[] = [];
      items.forEach((it, idx) => {
        if (it.productId && productById.has(it.productId)) {
          nextQty[it.productId] = (nextQty[it.productId] ?? 0) + Math.trunc(it.quantity);
        } else {
          nextFree.push({
            id: `hist-${Date.now()}-${idx}`,
            productName: it.name,
            unitPriceInput: String(it.unitPrice),
            quantity: Math.trunc(it.quantity),
          });
        }
      });

      setQuantities(nextQty);
      setFreeformLines(nextFree);
      const kindLabel = data?.sourceKind === "ledger" ? "Teslimat Fişi" : "Sipariş";
      setLastOrderNote(`Son ${kindLabel} kalemleri (${items.length} satır) dolduruldu.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Son sipariş yüklenemedi.");
    } finally {
      setLoadingLastOrder(false);
    }
  };

  const resetForNewOrder = () => {
    lastAppliedCariRef.current = null;
    setSaved(null);
    setIdempotencyKey(crypto.randomUUID());
    setSelectedCariId("");
    setCustomerName("");
    setPhone("");
    setDeliveryAddress("");
    setNeighborhood("");
    setCourierId("");
    setFeeOverride(null);
    setOrderNotes("");
    setQuantities({});
    setFreeformLines([]);
    setLastOrderNote(null);
    setErrorMsg(null);
    setPaymentMethod("cash_on_delivery");
    setSendWhatsApp(false);
    dateTouchedRef.current = false;
    setDeliveryDate(isPastCutoff(storeSettings.orderCutoffTime) ? tomorrow : today);
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

  const priceOf = (productId: string, retail: number) => selectedCari?.customPrices?.[productId] ?? retail;

  const catalogSelectedItems = activeProducts
    .filter((p) => (quantities[p.id] || 0) > 0)
    .map((p) => {
      const unitPrice = priceOf(p.id, p.price);
      const quantity = quantities[p.id];
      return {
        productId: p.id,
        productName: p.name,
        quantity,
        unitPrice,
        totalPrice: Math.round(unitPrice * quantity * 100) / 100,
        weight: p.weight,
        imageUrl: p.imageUrl,
      };
    });

  const validFreeformItems = freeformLines
    .filter((l) => l.productName.trim() && l.quantity > 0)
    .map((l) => {
      const parsedPrice = Number(l.unitPriceInput.replace(",", "."));
      const unitPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? Math.round(parsedPrice * 100) / 100 : 0;
      return {
        productId: null,
        productName: l.productName.trim(),
        quantity: l.quantity,
        unitPrice,
        totalPrice: Math.round(unitPrice * l.quantity * 100) / 100,
      };
    });

  const allSelectedItems = [...catalogSelectedItems, ...validFreeformItems];
  const subtotal = Math.round(allSelectedItems.reduce((sum, it) => sum + it.totalPrice, 0) * 100) / 100;
  const suggestedFee = isPickup || selectedCariId ? 0 : computeShippingFee(subtotal, storeSettings);
  const shippingFee = feeOverride === null || feeOverride.trim() === "" ? suggestedFee : Number(feeOverride.replace(",", "."));
  const totalAmount = Math.round((subtotal + (Number.isFinite(shippingFee) ? shippingFee : 0)) * 100) / 100;
  const fmt = (n: number) => `${n.toLocaleString("tr-TR")} ₺`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const line of freeformLines) {
      if (line.quantity > 0 && !line.productName.trim()) {
        setErrorMsg("Serbest kalem satırında ürün adı boş olamaz.");
        return;
      }
      const p = Number(line.unitPriceInput.replace(",", "."));
      if (line.productName.trim() && (!Number.isFinite(p) || p < 0)) {
        setErrorMsg(`"${line.productName}" için geçerli birim fiyat girin.`);
        return;
      }
    }

    const effectiveAddress = isPickup
      ? ""
      : deliveryAddress.trim() ||
        (selectedCari ? `${neighborhood || selectedCari.neighborhood || "Merkez"} — ${customerName.trim() || selectedCari.businessName}` : "");

    const problem = manualOrderProblem({
      customerName,
      phone,
      deliveryMethod,
      deliveryAddress: effectiveAddress,
      neighborhood,
      itemCount: allSelectedItems.length,
      shippingFee,
    });
    if (problem) {
      setErrorMsg(problem);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const whatsappSummaryItems: OrderItem[] = allSelectedItems.map((it) => ({
      productId: it.productId ?? "custom",
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      ...("weight" in it && it.weight ? { weight: it.weight } : {}),
      ...("imageUrl" in it && it.imageUrl ? { imageUrl: it.imageUrl } : {}),
    }));

    const res = await createManualOrder({
      customerName: customerName.trim(),
      items: allSelectedItems,
      deliveryDate,
      deliveryMethod,
      deliveryTimeWindow: isPickup ? undefined : timeWindow,
      totalAmount,
      idempotencyKey,
      phone: phone.trim(),
      deliveryAddress: effectiveAddress,
      district: selectedCari?.district || "Beylikdüzü",
      neighborhood: isPickup ? "" : neighborhood,
      subtotal,
      shippingFee,
      status: "hazirlaniyor",
      paymentMethod,
      source,
      cariId: canReadCari ? selectedCariId || undefined : undefined,
      courierId: isPickup ? null : courierId || null,
      orderNotes: orderNotes.trim(),
    });

    if (!res.success || !res.id) {
      setErrorMsg(res.error || "Sipariş kaydedilemedi.");
      setIsSubmitting(false);
      return;
    }

    const msg =
      sendWhatsApp && phone.trim()
        ? orderMessage(
            "alindi",
            {
              customerName: customerName.trim(),
              items: whatsappSummaryItems,
              deliveryDate,
              deliveryMethod,
              deliveryTimeWindow: isPickup ? undefined : timeWindow,
              totalAmount,
            },
            {
              window: storeSettings.deliveryWindow,
              dateLabel: relativeTrDate(deliveryDate),
              trackingUrl: trackingUrl(res.orderNumber || res.id),
            },
          )
        : null;

    setSaved({
      id: res.id,
      orderNumber: res.orderNumber,
      customerName: customerName.trim(),
      totalAmount,
      message: msg,
      phone: phone.trim(),
    });
    setIsSubmitting(false);
  };

  if (saved) {
    return (
      <div className="max-w-md mx-auto pt-6 pb-16 space-y-4">
        <div className={`${card} text-center`}>
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E5EFE7] border border-[#B4D3BC] text-[#1D5130] flex items-center justify-center">
            <Check className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Sipariş kaydedildi</h1>
          <p className="text-sm font-semibold text-[#3B1E1A]">
            {saved.customerName} · <span className="font-mono tabular-nums">{fmt(saved.totalAmount)}</span>
          </p>
          {saved.orderNumber && <p className="text-xs font-mono tabular-nums text-[#6E5148]">#{saved.orderNumber}</p>}
          {saved.message && (
            <>
              <p className="text-sm text-[#3B1E1A] whitespace-pre-line text-left rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] p-3">
                {saved.message}
              </p>
              <a
                href={whatsappLink(saved.message, toWhatsAppNumber(saved.phone))}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-12 rounded-xl bg-[#1D7A46] hover:bg-[#166037] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" /> Müşteriye WhatsApp&apos;tan gönder
              </a>
            </>
          )}
          <button
            type="button"
            onClick={resetForNewOrder}
            className="w-full min-h-12 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Yeni Sipariş Oluştur
          </button>
          <div className="flex gap-2">
            <Link
              href={`/admin/siparisler/${saved.id}`}
              className="flex-1 min-h-11 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center justify-center transition-colors"
            >
              Siparişi aç
            </Link>
            <Link
              href="/admin/siparisler"
              className="flex-1 min-h-11 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center justify-center transition-colors"
            >
              Siparişlere dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/siparisler"
          aria-label="Siparişlere dön"
          className="w-11 h-11 rounded-xl bg-white hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#3B1E1A]">Yeni sipariş</h1>
          <p className="text-xs text-[#6E5148] mt-0.5">Telefon, WhatsApp, dükkân veya B2B cari siparişi.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Müşteri */}
          <section className={card}>
            {canReadCari && selectableCariler.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="cari" className={`${labelCls} flex items-center gap-1.5`}>
                    <Building2 className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" /> Cari
                  </label>
                  {selectedCari && (
                    <button
                      type="button"
                      onClick={handleLoadLastOrder}
                      disabled={loadingLastOrder}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-[#FBF6EC] px-3 text-xs font-bold text-[#8E3D1B] hover:bg-[#F6EEDF] disabled:opacity-50"
                    >
                      {loadingLastOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
                      Son Siparişi Doldur
                    </button>
                  )}
                </div>
                <select id="cari" value={selectedCariId} onChange={(e) => changeCari(e.target.value)} className={field}>
                  <option value="">Cari değil (perakende)</option>
                  {selectableCariler.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.neighborhood ? `${c.businessName} (${c.neighborhood})` : c.businessName}
                    </option>
                  ))}
                </select>
                {selectedCari && (
                  <p className="text-xs text-[#8E3D1B] font-medium">
                    Anlaşmalı fiyatlar uygulanır, teslimat ücreti yok{selectedCari.address ? "." : " (adres boş bırakılabilir)."}
                  </p>
                )}
                {lastOrderNote && (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                    {lastOrderNote}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="ad" className={labelCls}>{selectedCari ? "Firma adı" : "Ad soyad"}</label>
                <input id="ad" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ahmet Yılmaz" className={field} />
              </div>
              <div className="space-y-1">
                <label htmlFor="tel" className={labelCls}>
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
              <span className={labelCls}>Teslim</span>
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
                  <label htmlFor="mahalle" className={labelCls}>Mahalle</label>
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
                  <label htmlFor="adres" className={labelCls}>
                    Adres {selectedCari ? <span className="font-normal text-[#6E5148]">(boşsa işletme/mahalle kullanılır)</span> : null}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#6E5148] absolute left-3 top-3.5" aria-hidden="true" />
                    <textarea
                      id="adres"
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={
                        selectedCari
                          ? `${neighborhood || "Merkez"} — ${customerName || selectedCari.businessName}`
                          : "Sokak, site, blok, daire"
                      }
                      className={`${field} h-auto py-2.5 pl-9`}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Ürünler */}
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-base font-bold text-[#3B1E1A]">Ürünler</h2>
              <button
                type="button"
                onClick={() =>
                  setFreeformLines((prev) => [
                    ...prev,
                    { id: `free-${Date.now()}-${prev.length}`, productName: "", unitPriceInput: "", quantity: 1 },
                  ])
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-[#FBF6EC] px-3 text-xs font-bold text-[#8E3D1B] hover:bg-[#F6EEDF]"
              >
                <Plus className="w-4 h-4" />
                Serbest Kalem Ekle
              </button>
            </div>

            <search className="relative block">
              <Search className="w-4 h-4 text-[#6E5148] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <label htmlFor="yeni-urun-ara" className="sr-only">Ürün ara</label>
              <input
                id="yeni-urun-ara"
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Ürün ara..."
                className={`${field} pl-10`}
              />
            </search>

            {sortedProducts.length === 0 && <p className="text-sm text-[#6E5148]">Eşleşen veya satışta ürün yok.</p>}
            <div className="grid grid-cols-1 gap-2">
              {sortedProducts.map((prod) => {
                const qty = quantities[prod.id] || 0;
                const isCustom = selectedCari?.customPrices?.[prod.id] !== undefined;
                const price = priceOf(prod.id, prod.price);
                const soldThatDay = isSoldOn(prod.saleWeekdays, deliveryDate);
                return (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors ${
                      qty > 0 ? "bg-[#F3E2D4]/70 border-[#B4532A]/60" : "bg-[#FBF6EC] border-[#E2D3BD]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-[#3B1E1A] leading-snug">{prod.name}</span>
                        {isCustom && (
                          <span className="rounded-md bg-[#B4532A] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Özel Fiyat
                          </span>
                        )}
                      </div>
                      {canViewFinance && (
                        <div className="text-xs text-[#6E5148] font-mono tabular-nums mt-0.5">
                          {fmt(price)}
                          {price !== prod.price && <span className="ml-1.5 line-through opacity-60">{fmt(prod.price)}</span>}
                        </div>
                      )}
                      {!soldThatDay && <div className="text-xs text-[#7A4A0B] font-medium mt-0.5">O gün satış günü değil</div>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`${prod.name} azalt`}
                        onClick={() => updateQuantity(prod.id, -1)}
                        disabled={qty === 0}
                        className="min-w-11 min-h-11 rounded-xl bg-white hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center disabled:opacity-35 transition-colors"
                      >
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        enterKeyHint="next"
                        aria-label={`${prod.name} adedi`}
                        value={qty === 0 ? "" : String(qty)}
                        placeholder="0"
                        onChange={(e) => setExactQuantity(prod.id, e.target.value)}
                        className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-bold text-base text-[#3B1E1A] font-mono tabular-nums focus:outline-none focus:border-[#B4532A]"
                      />
                      <button
                        type="button"
                        aria-label={`${prod.name} ekle`}
                        onClick={() => updateQuantity(prod.id, 1)}
                        className="min-w-11 min-h-11 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white flex items-center justify-center transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, 5)}
                        className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-2.5 font-mono text-xs font-bold text-[#3B1E1A] hover:bg-[#F1E6D2]"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, 10)}
                        className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-2.5 font-mono text-xs font-bold text-[#3B1E1A] hover:bg-[#F1E6D2]"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {freeformLines.length > 0 && (
              <div className="space-y-2 border-t border-[#E2D3BD] pt-3">
                <span className="text-xs font-bold text-[#6E5148]">Serbest Kalemler</span>
                {freeformLines.map((line, idx) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-2.5 sm:items-center"
                  >
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        maxLength={160}
                        aria-label={`Serbest kalem adı #${idx + 1}`}
                        value={line.productName}
                        onChange={(e) =>
                          setFreeformLines((prev) =>
                            prev.map((r) => (r.id === line.id ? { ...r, productName: e.target.value } : r)),
                          )
                        }
                        placeholder="Ürün / kalem adı..."
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base sm:text-sm text-[#3B1E1A]"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Serbest kalem fiyatı #${idx + 1}`}
                        value={line.unitPriceInput}
                        onChange={(e) =>
                          setFreeformLines((prev) =>
                            prev.map((r) => (r.id === line.id ? { ...r, unitPriceInput: e.target.value } : r)),
                          )
                        }
                        placeholder="Fiyat ₺"
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-2.5 font-mono text-base font-semibold tabular-nums text-[#3B1E1A]"
                      />
                      <span className="text-xs font-bold text-[#6E5148]">₺</span>
                    </div>
                    <div className="sm:col-span-4 flex items-center justify-end gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        enterKeyHint="next"
                        aria-label={`Serbest kalem adedi #${idx + 1}`}
                        value={line.quantity === 0 ? "" : String(line.quantity)}
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          setFreeformLines((prev) =>
                            prev.map((r) =>
                              r.id === line.id ? { ...r, quantity: Number.isFinite(n) && n > 0 ? Math.min(10000, n) : 0 } : r,
                            ),
                          );
                        }}
                        className="min-h-11 w-14 rounded-xl border border-[#E2D3BD] bg-white text-center font-mono text-base font-bold tabular-nums text-[#3B1E1A]"
                      />
                      <button
                        type="button"
                        onClick={() => setFreeformLines((prev) => prev.filter((r) => r.id !== line.id))}
                        aria-label={`Serbest kalemi sil #${idx + 1}`}
                        className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className={card}>
            <div className="space-y-1">
              <span className={labelCls}>{isPickup ? "Alacağı gün" : "Teslim günü"}</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  aria-pressed={deliveryDate === today}
                  onClick={() => {
                    dateTouchedRef.current = true;
                    setDeliveryDate(today);
                  }}
                  className={chip(deliveryDate === today)}
                >
                  Bugün
                </button>
                <button
                  type="button"
                  aria-pressed={deliveryDate === tomorrow}
                  onClick={() => {
                    dateTouchedRef.current = true;
                    setDeliveryDate(tomorrow);
                  }}
                  className={chip(deliveryDate === tomorrow)}
                >
                  Yarın
                </button>
                <input
                  type="date"
                  aria-label="Başka gün"
                  value={deliveryDate}
                  min={today}
                  onChange={(e) => {
                    if (e.target.value) {
                      dateTouchedRef.current = true;
                      setDeliveryDate(e.target.value);
                    }
                  }}
                  className={`${chip(deliveryDate !== today && deliveryDate !== tomorrow)} px-2 text-xs font-mono tabular-nums`}
                />
              </div>
            </div>

            {!isPickup && (
              <>
                <div className="space-y-1">
                  <label htmlFor="saat" className={labelCls}>Saat aralığı</label>
                  <input id="saat" type="text" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className={`${field} font-mono tabular-nums`} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="kurye" className={labelCls}>Dağıtım Kuryesi</label>
                  <select
                    id="kurye"
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    className={field}
                  >
                    <option value="">Atama Yok (Tezgah / Havuz)</option>
                    {assignableCouriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} {c.isOnShift ? "· Mesai Açık" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label htmlFor="odeme" className={labelCls}>Ödeme</label>
              <select id="odeme" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as AdminPaymentMethod)} className={field}>
                <option value="cash_on_delivery">Nakit</option>
                <option value="pos_at_door">Kart (POS)</option>
                <option value="transfer">Havale / EFT</option>
                {canReadCari && selectedCari && <option value="cari">Cariye yaz</option>}
              </select>
            </div>

            <div className="space-y-1">
              <span className={labelCls}>Nereden geldi</span>
              <div className="grid grid-cols-3 gap-2">
                {SOURCES.map((s) => (
                  <button key={s.value} type="button" aria-pressed={source === s.value} onClick={() => setSource(s.value)} className={chip(source === s.value)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="not" className={labelCls}>Not</label>
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
                        className="w-full min-h-11 pl-3 pr-7 rounded-lg bg-[#FBF6EC] border border-[#E2D3BD] text-right font-mono tabular-nums text-base sm:text-sm text-[#3B1E1A] focus:outline-none focus:border-[#B4532A]"
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
              className="w-full min-h-12 bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
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
