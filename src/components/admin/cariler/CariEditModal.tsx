"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Info, Loader2, Search, ShieldAlert, Tag, X } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { createCariAccountClient, updateCariAccountClient } from "@/lib/cari/client";
import {
  BEYLIKDUZU_NEIGHBORHOODS,
  ISTANBUL_DISTRICTS,
  type CariAccount,
} from "@/types/admin";

export interface CariEditModalProps {
  cari?: CariAccount | null;
  isNew?: boolean;
  onClose: () => void;
  onSuccess?: (accountId?: string) => void;
  initialTab?: "info" | "prices";
}

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CariEditModal({
  cari = null,
  isNew = false,
  onClose,
  onSuccess,
  initialTab = "info",
}: CariEditModalProps) {
  const createMode = isNew || !cari?.id;
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const { products, loading: productsLoading } = useProducts();

  const [activeTab, setActiveTab] = useState<"info" | "prices">(initialTab);
  // Yeni cari oluştururken yalnızca B2B müşteri carisi açılır; mevcut gider carileri düzenlenirken korunur.
  const accountType: "musteri" | "gider" = createMode
    ? "musteri"
    : (cari?.accountType ?? "musteri");
  const [businessName, setBusinessName] = useState(cari?.businessName ?? "");
  const [companyTitle, setCompanyTitle] = useState(cari?.companyTitle ?? "");
  const [contactPerson, setContactPerson] = useState(cari?.contactPerson ?? "");
  const [phone, setPhone] = useState(cari?.phone ?? "");
  const [district, setDistrict] = useState(cari?.district ?? "Beylikdüzü");
  const [neighborhood, setNeighborhood] = useState(cari?.neighborhood ?? "");
  const [address, setAddress] = useState(cari?.address ?? "");
  const [taxOffice, setTaxOffice] = useState(cari?.taxOffice ?? "");
  const [taxNumber, setTaxNumber] = useState(cari?.taxNumber ?? "");
  const [creditLimitInput, setCreditLimitInput] = useState(
    cari?.creditLimit && cari.creditLimit > 0 ? String(cari.creditLimit) : "",
  );
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [notes, setNotes] = useState(cari?.notes ?? "");

  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (cari?.customPrices) {
      for (const [pid, price] of Object.entries(cari.customPrices)) {
        if (typeof price === "number" && price > 0) {
          initial[pid] = String(price);
        }
      }
    }
    return initial;
  });
  const [productQuery, setProductQuery] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLocaleLowerCase("tr-TR");
    const active = products.filter((p) => p.price > 0);
    const matches = q
      ? active.filter(
          (p) =>
            p.name.toLocaleLowerCase("tr-TR").includes(q) ||
            (p.category ?? "").toLocaleLowerCase("tr-TR").includes(q),
        )
      : active;

    return [...matches].sort((a, b) => {
      const aHas = Number(priceDrafts[a.id]?.replace(",", ".")) > 0 ? 1 : 0;
      const bHas = Number(priceDrafts[b.id]?.replace(",", ".")) > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return a.name.localeCompare(b.name, "tr-TR");
    });
  }, [products, productQuery, priceDrafts]);

  const customPriceCount = useMemo(() => {
    let count = 0;
    for (const val of Object.values(priceDrafts)) {
      const n = Number(val.replace(",", "."));
      if (Number.isFinite(n) && n > 0) count += 1;
    }
    return count;
  }, [priceDrafts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError("İşletme / Cari adı zorunludur.");
      setActiveTab("info");
      return;
    }

    if (accountType === "musteri" && !phone.trim()) {
      setError("Müşteri carisi için telefon numarası gereklidir.");
      setActiveTab("info");
      return;
    }

    const parsedCreditLimit = creditLimitInput.trim() ? Number(creditLimitInput.replace(",", ".")) : 0;
    if (!Number.isFinite(parsedCreditLimit) || parsedCreditLimit < 0) {
      setError("Kredi limiti 0 veya pozitif bir tutar olmalıdır.");
      setActiveTab("info");
      return;
    }

    const parsedOpeningBalance = openingBalanceInput.trim()
      ? Number(openingBalanceInput.replace(",", "."))
      : 0;
    if (createMode && !Number.isFinite(parsedOpeningBalance)) {
      setError("Açılış bakiyesi geçerli bir sayı olmalıdır.");
      setActiveTab("info");
      return;
    }

    const customPrices: Record<string, number> = {};
    for (const [pid, rawVal] of Object.entries(priceDrafts)) {
      const trimmed = rawVal.trim();
      if (!trimmed) continue;
      const num = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(num) || num <= 0) {
        setError("Özel anlaşmalı fiyatlar 0'dan büyük geçerli tutarlar olmalıdır.");
        setActiveTab("prices");
        return;
      }
      customPrices[pid] = Math.round(num * 100) / 100;
    }

    setSaving(true);
    try {
      const basePayload = {
        accountType,
        businessName: businessName.trim(),
        companyTitle: companyTitle.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        district: district.trim() || "Beylikdüzü",
        neighborhood: neighborhood.trim() || "Cumhuriyet",
        address: address.trim(),
        taxOffice: taxOffice.trim(),
        taxNumber: taxNumber.trim(),
        creditLimit: Math.round(parsedCreditLimit * 100) / 100,
        notes: notes.trim(),
        customPrices,
      };

      if (createMode) {
        const created = await createCariAccountClient({
          ...basePayload,
          ...(parsedOpeningBalance !== 0
            ? { openingBalance: Math.round(parsedOpeningBalance * 100) / 100 }
            : {}),
        });
        onSuccess?.(created.id || undefined);
      } else {
        await updateCariAccountClient(cari.id, basePayload);
        onSuccess?.(cari.id);
      }

      dialogRef.current?.close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cari hesap kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="closerequest"
      onCancel={(e) => {
        if (saving) e.preventDefault();
      }}
      aria-labelledby="cari-edit-modal-title"
      className="m-auto mb-0 w-full max-w-2xl rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl"
    >
      <div className="flex max-h-[92dvh] flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
              {createMode ? "Yeni B2B / Cari Kartı" : "Cari Kartı & Özel Fiyat Düzenle"}
            </p>
            <h2 id="cari-edit-modal-title" className="truncate font-serif text-lg font-bold text-[#3B1E1A] sm:text-xl">
              {createMode ? "Yeni Cari Hesap Aç" : cari?.businessName}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={saving}
            aria-label="Kapat"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Cari düzenleme sekmeleri" className="flex border-b border-[#E2D3BD] bg-white px-4 sm:px-6">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "info"}
            onClick={() => setActiveTab("info")}
            className={`flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-bold transition ${
              activeTab === "info"
                ? "border-[#B4532A] text-[#8E3D1B]"
                : "border-transparent text-[#6E5148] hover:text-[#3B1E1A]"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Kurumsal Bilgiler &amp; Limit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "prices"}
            onClick={() => setActiveTab("prices")}
            className={`flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-bold transition ${
              activeTab === "prices"
                ? "border-[#B4532A] text-[#8E3D1B]"
                : "border-transparent text-[#6E5148] hover:text-[#3B1E1A]"
            }`}
          >
            <Tag className="h-4 w-4" />
            Özel Fiyat Matrisi
            {customPriceCount > 0 && (
              <span className="rounded-full bg-[#B4532A] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                {customPriceCount}
              </span>
            )}
          </button>
        </div>

        {/* Form Body */}
        <form id="cari-edit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "info" ? (
            <div className="space-y-4">
              {createMode && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] px-3.5 py-2.5 text-xs text-[#6E5148]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#B4532A]" aria-hidden="true" />
                  <p className="leading-relaxed">
                    <strong className="text-[#3B1E1A]">B2B Müşteri Carisi</strong> olarak açılır. Tedarikçi ve işletme
                    giderleri{" "}
                    <Link
                      href="/admin/finans"
                      onClick={() => dialogRef.current?.close()}
                      className="font-bold text-[#8E3D1B] underline underline-offset-2 hover:text-[#3B1E1A]"
                    >
                      /admin/finans → Tedarikçiler
                    </Link>{" "}
                    bölümünden yönetilir.
                  </p>
                </div>
              )}

              {!createMode && accountType === "gider" && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#E2D3BD] bg-[#F6EEDF] px-3.5 py-2.5 text-xs text-[#6E5148]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6E5148]" aria-hidden="true" />
                  <p className="leading-relaxed">
                    Bu kayıt mevcut bir <strong className="text-[#3B1E1A]">Gider / Tedarikçi</strong> carisi olarak
                    korunmaktadır. Yeni tedarikçi ve gider kayıtlarını{" "}
                    <Link
                      href="/admin/finans"
                      onClick={() => dialogRef.current?.close()}
                      className="font-bold text-[#8E3D1B] underline underline-offset-2 hover:text-[#3B1E1A]"
                    >
                      /admin/finans → Tedarikçiler
                    </Link>{" "}
                    ekranından yönetebilirsiniz.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cari-business-name" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Tabela / İşletme Adı *
                  </label>
                  <input
                    id="cari-business-name"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Örn. Gurme Şarküteri"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cari-company-title" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Resmi Ticari Unvan (İrsaliye / Fatura)
                  </label>
                  <input
                    id="cari-company-title"
                    type="text"
                    value={companyTitle}
                    onChange={(e) => setCompanyTitle(e.target.value)}
                    placeholder="Örn. Gurme Gıda Turizm Ltd. Şti."
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cari-contact-person" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Yetkili Kişi
                  </label>
                  <input
                    id="cari-contact-person"
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Ad Soyad"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cari-phone" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Telefon {accountType === "musteri" ? "*" : ""}
                  </label>
                  <input
                    id="cari-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 font-mono text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
              </div>

              {/* Serbest İlçe + Serbest Mahalle/Semt */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cari-district" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    İlçe (Serbest Giriş / İstanbul)
                  </label>
                  <input
                    id="cari-district"
                    type="text"
                    list="istanbul-districts-datalist"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Örn. Beylikdüzü, Bakırköy, Kadıköy"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                  <datalist id="istanbul-districts-datalist">
                    {ISTANBUL_DISTRICTS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="cari-neighborhood" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Mahalle / Semt (Serbest Giriş)
                  </label>
                  <input
                    id="cari-neighborhood"
                    type="text"
                    list="beylikduzu-neighborhoods-datalist"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Örn. Adnan Kahveci veya semt adı"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                  <datalist id="beylikduzu-neighborhoods-datalist">
                    {BEYLIKDUZU_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label htmlFor="cari-address" className="mb-1 block text-xs font-bold text-[#6E5148]">
                  Teslimat / Sevk Adresi
                </label>
                <textarea
                  id="cari-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cadde, sokak, bina no, tarif..."
                  className="w-full rounded-xl border border-[#E2D3BD] bg-white p-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                />
              </div>

              {/* Vergi Dairesi, VKN, Kredi Limiti */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="cari-tax-office" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Vergi Dairesi
                  </label>
                  <input
                    id="cari-tax-office"
                    type="text"
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    placeholder="Örn. Beylikdüzü VD"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cari-tax-number" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    VKN / TCKN
                  </label>
                  <input
                    id="cari-tax-number"
                    type="text"
                    inputMode="numeric"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="10 veya 11 hane"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 font-mono text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cari-credit-limit" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Kredi Limiti (₺ · 0 = Limitsiz)
                  </label>
                  <input
                    id="cari-credit-limit"
                    type="text"
                    inputMode="decimal"
                    value={creditLimitInput}
                    onChange={(e) => setCreditLimitInput(e.target.value)}
                    placeholder="Örn. 15000"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
              </div>

              {createMode && (
                <div>
                  <label htmlFor="cari-opening-balance" className="mb-1 block text-xs font-bold text-[#6E5148]">
                    Açılış Devir Bakiyesi (₺ · Opsiyonel, Pozitif = Müşteri Borcu)
                  </label>
                  <input
                    id="cari-opening-balance"
                    type="text"
                    inputMode="decimal"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    placeholder="0.00"
                    className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                  />
                </div>
              )}

              <div>
                <label htmlFor="cari-notes" className="mb-1 block text-xs font-bold text-[#6E5148]">
                  İç Operasyon Notu
                </label>
                <textarea
                  id="cari-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Teslimat saati, sevkiyat günü veya ödeme anlaşması notu..."
                  className="w-full rounded-xl border border-[#E2D3BD] bg-white p-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#E2D3BD] bg-white p-3 text-xs text-[#6E5148]">
                Buraya girdiğiniz özel fiyatlar, hem <strong className="text-[#3B1E1A]">Araçtan Sıcak Satış</strong> hem
                de kurumsal fişlerde standart vitrin fiyatının yerine uygulanır. Boş bırakılan ürünlerde vitrin fiyatı
                geçerlidir.
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E5148]" />
                <label htmlFor="custom-price-product-search" className="sr-only">
                  Ürün ara
                </label>
                <input
                  id="custom-price-product-search"
                  type="search"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Ürün adı veya kategori ara..."
                  className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white pl-9 pr-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                />
              </div>

              {productsLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-[#6E5148]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Katalog yükleniyor...
                </div>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {filteredProducts.map((prod) => {
                    const draft = priceDrafts[prod.id] ?? "";
                    const parsedVal = Number(draft.replace(",", "."));
                    const hasCustom = draft.trim() !== "" && Number.isFinite(parsedVal) && parsedVal > 0;
                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                          hasCustom ? "border-[#B4532A] bg-white" : "border-[#E2D3BD] bg-white/75"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#3B1E1A]">{prod.name}</p>
                          <p className="mt-0.5 text-xs text-[#6E5148]">
                            Vitrin Fiyatı:{" "}
                            <span className="font-mono font-semibold tabular-nums">{formatMoney(prod.price)} ₺</span>
                            {hasCustom && (
                              <span className="ml-2 font-semibold text-[#8E3D1B]">
                                ({Math.round(((parsedVal - prod.price) / prod.price) * 100)}%)
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <label htmlFor={`custom-price-${prod.id}`} className="sr-only">
                            {prod.name} özel fiyatı
                          </label>
                          <input
                            id={`custom-price-${prod.id}`}
                            type="text"
                            inputMode="decimal"
                            value={draft}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({
                                ...prev,
                                [prod.id]: e.target.value,
                              }))
                            }
                            placeholder={prod.price.toFixed(2)}
                            className="min-h-11 w-24 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 text-right font-mono text-base font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
                          />
                          <span className="text-xs font-bold text-[#6E5148]">₺</span>
                          {draft !== "" && (
                            <button
                              type="button"
                              onClick={() =>
                                setPriceDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[prod.id];
                                  return next;
                                })
                              }
                              aria-label={`${prod.name} özel fiyatını temizle`}
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-[#6E5148] hover:text-[#3B1E1A]"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E2D3BD] bg-[#F6EEDF] px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={saving}
            className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-semibold text-[#3B1E1A] transition hover:bg-[#FBF6EC] disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            form="cari-edit-form"
            disabled={saving}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-[#B4532A] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#9C4421] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Kaydediliyor..." : createMode ? "Cariyi Oluştur" : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default CariEditModal;
