"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Wheat,
  Search,
  Plus,
  Phone,
  MessageCircle,
  TrendingDown,
  DollarSign,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Package,
  ArrowRight,
  Receipt,
  Truck,
  PlusCircle,
} from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier } from "@/types/admin";

export default function AdminSuppliersPage() {
  const {
    suppliers,
    loading,
    totalDebt,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierTransaction,
  } = useSuppliers();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Payment Modal (Ödeme Yap)
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<"banka_havale" | "nakit" | "kredi_karti">("banka_havale");
  const [payDescription, setPayDescription] = useState<string>("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Purchase Modal (Hammadde Alımı)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedSupplierForPurchase, setSelectedSupplierForPurchase] = useState<Supplier | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [purchaseDescription, setPurchaseDescription] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (filterType === "debtor" && s.balance <= 0) return false;
      if (filterType === "zero" && s.balance !== 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.companyName.toLowerCase().includes(q);
        const matchMaterial = s.materialType.toLowerCase().includes(q);
        const matchContact = s.contactPerson?.toLowerCase().includes(q);
        const matchPhone = s.phone.includes(q);
        if (!matchName && !matchMaterial && !matchContact && !matchPhone) return false;
      }

      return true;
    });
  }, [suppliers, filterType, searchQuery]);

  // Open Create Modal
  const openCreateModal = () => {
    setIsNew(true);
    setEditingSupplier({
      companyName: "",
      materialType: "Atalık Un & Değirmen",
      contactPerson: "",
      phone: "",
      notes: "",
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (sup: Supplier) => {
    setIsNew(false);
    setEditingSupplier({ ...sup });
    setModalOpen(true);
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.companyName) return;

    if (isNew) {
      const res = await addSupplier(editingSupplier as any);
      if (res.success) {
        setModalOpen(false);
        setEditingSupplier(null);
      } else {
        alert("Tedarikçi eklenirken hata: " + res.error);
      }
    } else if (editingSupplier.id) {
      const res = await updateSupplier(editingSupplier.id, editingSupplier);
      if (res.success) {
        setModalOpen(false);
        setEditingSupplier(null);
      } else {
        alert("Tedarikçi güncellenirken hata: " + res.error);
      }
    }
  };

  // Open Payment Modal
  const openPaymentModal = (sup: Supplier) => {
    setSelectedSupplierForPay(sup);
    setPayAmount(sup.balance > 0 ? sup.balance : 0);
    setPayDescription(`${sup.companyName} - Fatura Ödemesi`);
    setPayModalOpen(true);
  };

  // Open Purchase Modal
  const openPurchaseModal = (sup: Supplier) => {
    setSelectedSupplierForPurchase(sup);
    setPurchaseAmount(0);
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseDescription(`${sup.materialType} hammadde alımı`);
    setPurchaseModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay || payAmount <= 0) return;

    setPaySubmitting(true);
    const res = await addSupplierTransaction(selectedSupplierForPay.id, {
      type: "odeme",
      amount: Number(payAmount),
      description: payDescription || "Tedarikçi Ödemesi",
      paymentMethod: payMethod,
    });

    if (res.success) {
      setPayModalOpen(false);
      setSelectedSupplierForPay(null);
      setPayAmount(0);
    } else {
      alert("Ödeme kaydedilirken hata: " + res.error);
    }
    setPaySubmitting(false);
  };

  // Submit Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPurchase || purchaseAmount <= 0) return;

    setPurchaseSubmitting(true);
    const res = await addSupplierTransaction(selectedSupplierForPurchase.id, {
      type: "alis",
      amount: Number(purchaseAmount),
      description: purchaseDescription || "Hammadde Alımı",
      date: purchaseDate,
    });

    if (res.success) {
      setPurchaseModalOpen(false);
      setSelectedSupplierForPurchase(null);
      setPurchaseAmount(0);
    } else {
      alert("Hammadde alımı kaydedilirken hata: " + res.error);
    }
    setPurchaseSubmitting(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/30 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Wheat className="w-3.5 h-3.5" />
            <span>Hammadde, Değirmen & Mandıra Çiftlikleri</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            Tedarikçiler & Hammadde Borçları
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Taş değirmen unları, Jersey çiftliği çiğ sütü, maya ve ambalaj alımları ile borç/ödeme takibi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yeni Tedarikçi Tanımla</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Toplam Tedarikçi</span>
            <Wheat className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif mt-2">
            {suppliers.length} <span className="text-sm font-normal text-stone-400">firma/çiftlik</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Değirmen, mandıra ve ambalaj</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Toplam Tedarikçi Borcumuz</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-red-400 font-serif mt-2">
            {totalDebt.toLocaleString("tr-TR")} ₺
          </div>
          <p className="text-xs text-red-500/80 mt-1">Ödenecek hammadde faturaları</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Borçlu Olduğumuz Tedarikçi</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-amber-400 font-serif mt-2">
            {suppliers.filter((s) => s.balance > 0).length} <span className="text-sm font-normal text-stone-400">firma</span>
          </div>
          <p className="text-xs text-amber-500/80 mt-1">Açık bakiyesi olan tedarikçiler</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Firma adı, hammadde türü veya yetkili..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === "all"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Tüm Tedarikçiler ({suppliers.length})
          </button>
          <button
            onClick={() => setFilterType("debtor")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === "debtor"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Borcumuz Olanlar ({suppliers.filter((s) => s.balance > 0).length})
          </button>
          <button
            onClick={() => setFilterType("zero")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === "zero"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Bakiyesi Sıfır ({suppliers.filter((s) => s.balance === 0).length})
          </button>
        </div>
      </div>

      {/* Supplier Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Tedarikçiler yükleniyor...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
          Kayıtlı hammadde tedarikçisi bulunamadı.
          <div className="mt-4">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs"
            >
              <Plus className="w-4 h-4" />
              İlk Tedarikçinizi Ekleyin
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((sup) => {
            const hasDebt = sup.balance > 0;

            return (
              <div
                key={sup.id}
                className="bg-stone-900/80 border border-stone-800 hover:border-stone-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-stone-100 font-serif group-hover:text-amber-400 transition-colors">
                        {sup.companyName}
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {sup.contactPerson || "Yetkili belirtilmemiş"}
                      </p>
                    </div>

                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 border border-stone-700 shrink-0">
                      {sup.materialType}
                    </span>
                  </div>

                  {/* Contact Phone */}
                  <div className="flex items-center gap-3 text-xs">
                    <a
                      href={`tel:${sup.phone}`}
                      className="flex items-center gap-1.5 text-stone-300 hover:text-amber-400 font-mono transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      <span>{sup.phone}</span>
                    </a>
                    {sup.phone && (
                      <a
                        href={`https://wa.me/90${sup.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                        title="WhatsApp Mesajı Aç"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {sup.notes && (
                    <div className="text-xs text-stone-500 line-clamp-1 italic">
                      {sup.notes}
                    </div>
                  )}
                </div>

                {/* Bottom Balance & Actions */}
                <div className="pt-4 border-t border-stone-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">Bizim Borcumuz:</span>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold font-serif ${
                          hasDebt ? "text-red-400" : "text-stone-300"
                        }`}
                      >
                        {sup.balance.toLocaleString("tr-TR")} ₺
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {hasDebt ? "Ödenmesi Gereken Bakiye" : "Borcumuz Yok (Dengede)"}
                      </div>
                    </div>
                  </div>

                  {/* Button Toolbar */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => openPurchaseModal(sup)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-all border border-amber-500/20"
                      title="Hammadde Alımı (Fatura Gir)"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Hammadde Alımı</span>
                    </button>

                    <button
                      onClick={() => openPaymentModal(sup)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all border border-emerald-500/20"
                      title="Tedarikçiye Ödeme Yap"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Ödeme Yap</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <Link
                      href={`/admin/tedarikciler/${sup.id}`}
                      className="text-stone-400 hover:text-amber-400 transition-colors flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5 text-amber-500" />
                      <span>Tüm Hareketler & Ekstre</span>
                    </Link>

                    <button
                      onClick={() => openEditModal(sup)}
                      className="text-stone-500 hover:text-stone-200 transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Düzenle</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT SUPPLIER */}
      {modalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {isNew ? "Yeni Tedarikçi Tanımla" : "Tedarikçi Bilgilerini Düzenle"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">
                  Tedarikçi / Değirmen / Çiftlik Adı
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Karakılçık Taş Değirmeni A.Ş."
                  value={editingSupplier.companyName || ""}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, companyName: e.target.value })
                  }
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">
                  Tedarik Edilen Hammadde Türü
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Atalık Karakılçık & Kavılca Unu, Jersey Çiğ Süt, Ambalaj Koli"
                  value={editingSupplier.materialType || ""}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, materialType: e.target.value })
                  }
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Yetkili Kişi</label>
                  <input
                    type="text"
                    placeholder="Örn: Mehmet Usta"
                    value={editingSupplier.contactPerson || ""}
                    onChange={(e) =>
                      setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Telefon</label>
                  <input
                    type="tel"
                    required
                    placeholder="0532..."
                    value={editingSupplier.phone || ""}
                    onChange={(e) =>
                      setEditingSupplier({ ...editingSupplier, phone: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Notlar</label>
                <textarea
                  rows={2}
                  placeholder="Sevkiyat günleri, asgari sipariş miktarı vb..."
                  value={editingSupplier.notes || ""}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, notes: e.target.value })
                  }
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{isNew ? "Tedarikçiyi Kaydet" : "Güncelle"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HAMMADDE ALIMI (FATURA / GİRİŞ) */}
      {purchaseModalOpen && selectedSupplierForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">Hammadde Alımı Girişi</h3>
              </div>
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="text-xs text-stone-400">Tedarikçi:</div>
                <div className="font-bold text-stone-100">
                  {selectedSupplierForPurchase.companyName}
                </div>
                <div className="text-xs text-amber-400">
                  {selectedSupplierForPurchase.materialType}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tarih</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Fatura Tutarı (₺)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={purchaseAmount || ""}
                  onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-stone-500">
                  Bu tutar tedarikçiye olan borcumuza eklenecektir.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama / Miktar</label>
                <input
                  type="text"
                  required
                  value={purchaseDescription}
                  onChange={(e) => setPurchaseDescription(e.target.value)}
                  placeholder="Örn: 20 Çuval (500kg) Karakılçık Atalık Un"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={purchaseSubmitting || purchaseAmount <= 0}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{purchaseSubmitting ? "Kaydediliyor..." : "Alışı Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TEDARİKÇİYE ÖDEME YAP */}
      {payModalOpen && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">Tedarikçiye Ödeme Yap</h3>
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
                <div className="text-xs text-stone-400">Tedarikçi:</div>
                <div className="font-bold text-stone-100">
                  {selectedSupplierForPay.companyName}
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  Toplam Borcumuz:{" "}
                  <strong className="text-red-400">
                    {selectedSupplierForPay.balance.toLocaleString("tr-TR")} ₺
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Ödenen Tutar (₺)</label>
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
                <label className="text-xs font-semibold text-stone-300">Ödeme Şekli</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="banka_havale">Banka Havalesi / EFT</option>
                  <option value="nakit">Nakit Ödeme</option>
                  <option value="kredi_karti">Kredi Kartı / Şirket Kartı</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama</label>
                <input
                  type="text"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  placeholder="Örn: Un sevkiyatı kısmi ödeme"
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
                  <span>{paySubmitting ? "Kaydediliyor..." : "Ödemeyi Onayla"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
