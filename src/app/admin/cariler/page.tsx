"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Plus,
  Phone,
  MessageCircle,
  MapPin,
  TrendingUp,
  FileText,
  DollarSign,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Tag,
  ArrowRight,
  Receipt,
  Wallet,
  Download,
} from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { INITIAL_PRODUCTS } from "@/hooks/useProducts";
import { CariAccount, BEYLIKDUZU_NEIGHBORHOODS } from "@/types/admin";

export default function AdminCarilerPage() {
  const {
    cariler,
    loading,
    totalReceivable,
    totalCredit,
    addCari,
    updateCari,
    deleteCari,
    addTransaction,
  } = useCariler();

  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "debtor" | "balanced">("all");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCari, setEditingCari] = useState<Partial<CariAccount> | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Quick Payment / Collection Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedCariForPay, setSelectedCariForPay] = useState<CariAccount | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<"nakit" | "banka_havale" | "kredi_karti">("banka_havale");
  const [payDescription, setPayDescription] = useState<string>("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Filtered Cariler
  const filteredCariler = useMemo(() => {
    return cariler.filter((c) => {
      // Balance filter
      if (balanceFilter === "debtor" && c.balance <= 0) return false;
      if (balanceFilter === "balanced" && c.balance !== 0) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.businessName.toLowerCase().includes(q);
        const matchContact = c.contactPerson.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchNeighborhood = c.neighborhood.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchPhone && !matchNeighborhood) return false;
      }

      return true;
    });
  }, [cariler, balanceFilter, searchQuery]);

  // Open Create Modal
  const openCreateModal = () => {
    setIsNew(true);
    setEditingCari({
      businessName: "",
      contactPerson: "",
      phone: "",
      address: "",
      neighborhood: "Adnan Kahveci",
      customPrices: {},
      notes: "",
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cari: CariAccount) => {
    setIsNew(false);
    setEditingCari({ ...cari, customPrices: { ...(cari.customPrices || {}) } });
    setModalOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredCariler.length === 0) {
      alert("Dışa aktarılacak cari bulunamadı.");
      return;
    }

    const headers = ["Firma Adı", "Yetkili", "Telefon", "Mahalle", "Adres", "Güncel Bakiye"];
    const rows = filteredCariler.map(c => [
      `"${c.businessName}"`,
      `"${c.contactPerson || ""}"`,
      `"${c.phone}"`,
      `"${c.neighborhood}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      c.balance.toString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cariler_Raporu_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Cari
  const handleSaveCari = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCari || !editingCari.businessName) return;

    if (isNew) {
      const res = await addCari(editingCari as any);
      if (res.success) {
        setModalOpen(false);
        setEditingCari(null);
      } else {
        alert("Cari hesap eklenirken hata: " + res.error);
      }
    } else if (editingCari.id) {
      const res = await updateCari(editingCari.id, editingCari);
      if (res.success) {
        setModalOpen(false);
        setEditingCari(null);
      } else {
        alert("Cari hesap güncellenirken hata: " + res.error);
      }
    }
  };

  // Open Quick Collection Modal
  const openPaymentModal = (cari: CariAccount) => {
    setSelectedCariForPay(cari);
    setPayAmount(cari.balance > 0 ? cari.balance : 0);
    setPayDescription(`${cari.businessName} - Cari Tahsilat`);
    setPayModalOpen(true);
  };

  // Submit Collection
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCariForPay || payAmount <= 0) return;

    setPaySubmitting(true);
    const res = await addTransaction(selectedCariForPay.id, {
      type: "tahsilat",
      amount: Number(payAmount),
      description: payDescription || "Cari Tahsilat",
      paymentMethod: payMethod,
    });

    if (res.success) {
      setPayModalOpen(false);
      setSelectedCariForPay(null);
      setPayAmount(0);
    } else {
      alert("Tahsilat kaydedilirken hata: " + res.error);
    }
    setPaySubmitting(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/30 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Toptan & Kurumsal Müşteri Yönetimi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            Kurumsal Cariler (B2B)
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Kafe, restoran ve oteller için ikili anlaşmalı toptan fiyatlar, borç/alacak takibi ve ekstre yönetimi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#221A14] hover:bg-[#2C211A] text-artisan-gold font-medium border border-artisan-gold/30 rounded-xl transition-all shadow-lg active:scale-95 text-sm"
            title="Görünür listeyi Excel (CSV) olarak indir"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV İndir</span>
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-bold rounded-xl transition-all shadow-lg shadow-artisan-terracotta/20 active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yeni Kurumsal Cari Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Toplam Kurumsal Cari</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif mt-2">
            {cariler.length} <span className="text-sm font-normal text-stone-400">firma</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Beylikdüzü restoran ve kafeler</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Toplam Cari Alacağımız</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-400 font-serif mt-2">
            {totalReceivable.toLocaleString("tr-TR")} ₺
          </div>
          <p className="text-xs text-emerald-500/80 mt-1">Carilerden tahsil edilecek tutar</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Borçlu Firma Sayısı</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-amber-400 font-serif mt-2">
            {cariler.filter((c) => c.balance > 0).length} <span className="text-sm font-normal text-stone-400">firma</span>
          </div>
          <p className="text-xs text-amber-500/80 mt-1">Aktif bakiyesi olan cariler</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Firma, yetkili, mahalle veya tel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setBalanceFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              balanceFilter === "all"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Tüm Cariler ({cariler.length})
          </button>
          <button
            onClick={() => setBalanceFilter("debtor")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              balanceFilter === "debtor"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Alacaklı Olduklarımız ({cariler.filter((c) => c.balance > 0).length})
          </button>
          <button
            onClick={() => setBalanceFilter("balanced")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              balanceFilter === "balanced"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Bakiyesi Sıfır ({cariler.filter((c) => c.balance === 0).length})
          </button>
        </div>
      </div>

      {/* Cari Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Cari hesaplar yükleniyor...
        </div>
      ) : filteredCariler.length === 0 ? (
        <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
          Kayıtlı kurumsal cari bulunamadı.
          <div className="mt-4">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs"
            >
              <Plus className="w-4 h-4" />
              İlk Carinizi Ekleyin
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCariler.map((cari) => {
            const customPriceCount = Object.keys(cari.customPrices || {}).length;
            const hasDebt = cari.balance > 0;

            return (
              <div
                key={cari.id}
                className="bg-stone-900/80 border border-stone-800 hover:border-stone-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-3">
                  {/* Title & Neighborhood */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-stone-100 font-serif group-hover:text-amber-400 transition-colors">
                        {cari.businessName}
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">{cari.contactPerson}</p>
                    </div>

                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700 shrink-0">
                      {cari.neighborhood || "Beylikdüzü"}
                    </span>
                  </div>

                  {/* Contact Phone & Quick Actions */}
                  <div className="flex items-center gap-3 text-xs">
                    <a
                      href={`tel:${cari.phone}`}
                      className="flex items-center gap-1.5 text-stone-300 hover:text-amber-400 font-mono transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      <span>{cari.phone}</span>
                    </a>
                    {cari.phone && (
                      <a
                        href={`https://wa.me/90${cari.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                        title="WhatsApp Mesajı Aç"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Address */}
                  {cari.address && (
                    <div className="flex items-start gap-1.5 text-xs text-stone-400 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span>{cari.address}</span>
                    </div>
                  )}

                  {/* Custom Prices Badge */}
                  <div className="pt-2 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-stone-300">
                      {customPriceCount > 0 ? (
                        <span className="text-amber-400 font-semibold">
                          {customPriceCount} üründe ikili anlaşmalı fiyat
                        </span>
                      ) : (
                        <span className="text-stone-500">Standart perakende fiyatlar</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Bottom Balance & Actions */}
                <div className="pt-4 border-t border-stone-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">Güncel Bakiye:</span>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold font-serif ${
                          hasDebt
                            ? "text-amber-400"
                            : cari.balance < 0
                            ? "text-emerald-400"
                            : "text-stone-300"
                        }`}
                      >
                        {cari.balance.toLocaleString("tr-TR")} ₺
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {hasDebt
                          ? "Alacağımız Var"
                          : cari.balance < 0
                          ? "Avans / Fazla Ödeme"
                          : "Hesap Dengede"}
                      </div>
                    </div>
                  </div>

                  {/* Button Toolbar */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Link
                      href={`/admin/cariler/${cari.id}`}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors border border-stone-700"
                      title="Hesap Ekstresi & Tüm Hareketler"
                    >
                      <Receipt className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ekstre</span>
                    </Link>

                    <button
                      onClick={() => openPaymentModal(cari)}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20"
                      title="Tahsilat Al"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Tahsilat</span>
                    </button>

                    <button
                      onClick={() => openEditModal(cari)}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold transition-colors"
                      title="Firma & Anlaşmalı Fiyat Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Düzenle</span>
                    </button>
                  </div>

                  {/* Fast New Order Link for this Cari */}
                  <Link
                    href={`/admin/siparisler/yeni?cariId=${cari.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-all border border-amber-500/20"
                  >
                    <span>+ Bu Firmaya Hızlı Sipariş Aç</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CARI MODAL */}
      {modalOpen && editingCari && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {isNew ? "Yeni Kurumsal Cari Hesap Tanımla" : "Cariyi & Özel Fiyatları Düzenle"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCari} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-300">
                    Firma / Kafe / Restoran Adı
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: EspressoLab Marina Şubesi"
                    value={editingCari.businessName || ""}
                    onChange={(e) =>
                      setEditingCari({ ...editingCari, businessName: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Yetkili Kişi</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Burak Bey (Mutfak Şefi)"
                    value={editingCari.contactPerson || ""}
                    onChange={(e) =>
                      setEditingCari({ ...editingCari, contactPerson: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Telefon Numarası</label>
                  <input
                    type="tel"
                    required
                    placeholder="0532..."
                    value={editingCari.phone || ""}
                    onChange={(e) => setEditingCari({ ...editingCari, phone: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Beylikdüzü Mahallesi</label>
                  <select
                    value={editingCari.neighborhood || "Adnan Kahveci"}
                    onChange={(e) =>
                      setEditingCari({ ...editingCari, neighborhood: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    {BEYLIKDUZU_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>
                        {n} Mahallesi
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Vergi No / T.C. (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    placeholder="Fatura için vergi no"
                    value={editingCari.taxNumber || ""}
                    onChange={(e) => setEditingCari({ ...editingCari, taxNumber: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Açık Adres</label>
                  <textarea
                    rows={2}
                    placeholder="Sokak, bina no, kat/daire..."
                    value={editingCari.address || ""}
                    onChange={(e) => setEditingCari({ ...editingCari, address: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* CUSTOM AGREED PRICES SECTION */}
              <div className="pt-4 border-t border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      İkili Anlaşmalı Toptan Fiyat Listesi
                    </h4>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    Boş bırakılan ürünlerde normal vitrin fiyatı geçerlidir.
                  </span>
                </div>

                <div className="border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800 max-h-60 overflow-y-auto">
                  {INITIAL_PRODUCTS.map((prod) => {
                    const currentCustom = editingCari.customPrices?.[prod.id];

                    return (
                      <div
                        key={prod.id}
                        className="p-3 bg-stone-950/40 flex items-center justify-between gap-4 hover:bg-stone-900 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-stone-200">{prod.name}</div>
                          <div className="text-[11px] text-stone-500">
                            Normal Perakende Fiyatı:{" "}
                            <span className="text-stone-300 font-semibold">{prod.price} ₺</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-stone-400 font-medium">Anlaşma Fiyatı:</span>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              placeholder={`${prod.price}`}
                              value={currentCustom !== undefined ? currentCustom : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedPrices = { ...(editingCari.customPrices || {}) };
                                if (val === "") {
                                  delete updatedPrices[prod.id];
                                } else {
                                  updatedPrices[prod.id] = Number(val);
                                }
                                setEditingCari({
                                  ...editingCari,
                                  customPrices: updatedPrices,
                                });
                              }}
                              className="w-24 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500 text-right pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">
                              ₺
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{isNew ? "Cariyi Kaydet" : "Değişiklikleri Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK COLLECTION (TAHSİLAT) MODAL */}
      {payModalOpen && selectedCariForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">Cari Tahsilat Al</h3>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="text-xs text-stone-400">Firma:</div>
                <div className="font-bold text-stone-100">{selectedCariForPay.businessName}</div>
                <div className="text-xs text-stone-400 mt-1">
                  Mevcut Borç:{" "}
                  <strong className="text-amber-400">
                    {selectedCariForPay.balance.toLocaleString("tr-TR")} ₺
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tahsil Edilen Tutar (₺)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount || ""}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Ödeme Yöntemi</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="banka_havale">Banka Havalesi / EFT</option>
                  <option value="nakit">Elden Nakit Tahsilat</option>
                  <option value="kredi_karti">Kredi Kartı / POS</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama</label>
                <input
                  type="text"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  placeholder="Örn: Eylül ayı ilk parti ekmek tahsilatı"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting || payAmount <= 0}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{paySubmitting ? "Kaydediliyor..." : "Tahsilatı Onayla"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
