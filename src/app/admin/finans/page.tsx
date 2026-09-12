"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Wheat,
  Truck,
  Package,
  Zap,
  Building2,
  Calendar,
  Layers,
  Download,
} from "lucide-react";
import { useFinans } from "@/hooks/useFinans";
import { ExpenseRecord } from "@/types/admin";

export default function AdminFinansPage() {
  const { expenses, loading, metrics, addExpense, deleteExpense } = useFinans();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseRecord["category"]>("hammadde");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<ExpenseRecord["paymentMethod"]>("banka_havale");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchNotes = e.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchNotes) return false;
      }

      return true;
    });
  }, [expenses, categoryFilter, searchQuery]);

  // Handle Add Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    setSubmitting(true);
    const res = await addExpense({
      category,
      title: title.trim(),
      amount: Number(amount),
      date,
      paymentMethod,
      notes: notes.trim(),
    });

    if (res.success) {
      setModalOpen(false);
      setTitle("");
      setAmount(0);
      setNotes("");
    } else {
      alert("Gider kaydedilirken hata: " + res.error);
    }
    setSubmitting(false);
  };

  // Helper for category label
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "hammadde":
        return { label: "Hammadde", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case "yakit_kurye":
        return { label: "Yakıt & Kurye", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case "ambalaj":
        return { label: "Ambalaj & Koli", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
      case "fatura_kira":
        return { label: "Fatura & Enerji", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
      default:
        return { label: "Diğer Gider", color: "bg-stone-800 text-stone-300 border-stone-700" };
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("Dışa aktarılacak gider/gelir kaydı bulunamadı.");
      return;
    }

    const headers = ["Tarih", "Kategori", "Açıklama", "Tutar", "Ödeme Yöntemi", "Notlar"];
    const rows = filteredExpenses.map(e => [
      `"${e.date}"`,
      `"${getCategoryLabel(e.category).label}"`,
      `"${e.title}"`,
      e.amount.toString(),
      `"${e.paymentMethod}"`,
      `"${(e.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Finans_Raporu_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/30 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>Kasa, Gider & Kârlılık Takibi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            Finans & Net Kâr Yönetimi
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Taş fırın satış gelirleri, hammadde alışları, kurye yakıtı ve işletme giderlerinin net bilançosu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#221A14] hover:bg-[#2C211A] text-amber-500 font-medium border border-amber-500/30 rounded-xl transition-all shadow-lg active:scale-95 text-sm"
            title="Görünür listeyi Excel (CSV) olarak indir"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV İndir</span>
          </button>
          
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yeni Gider Kaydet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: 4 Big Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Toplam Gelir (Ciro)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif mt-3">
            {metrics.totalRevenue.toLocaleString("tr-TR")} ₺
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {metrics.orderCount} sipariş (Web + WhatsApp + B2B)
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/50" />
        </div>

        {/* Total Expenses */}
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Toplam Gider</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-red-400 font-serif mt-3">
            {metrics.totalExpenses.toLocaleString("tr-TR")} ₺
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {expenses.length} adet operasyonel masraf
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/50" />
        </div>

        {/* Net Profit */}
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Net Kâr / Bakiye</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div
            className={`text-2xl md:text-3xl font-bold font-serif mt-3 ${
              metrics.netProfit >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {metrics.netProfit >= 0 ? "+" : ""}
            {metrics.netProfit.toLocaleString("tr-TR")} ₺
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {metrics.netProfit >= 0 ? "Kârlı Operasyon" : "Giderler Ciroyu Aştı"}
          </p>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${
              metrics.netProfit >= 0 ? "bg-emerald-500/50" : "bg-red-500/50"
            }`}
          />
        </div>

        {/* Balances: Receivable vs Debt */}
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Alacak & Borç Durumu</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-stone-400">Cari Alacağımız:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {metrics.totalReceivable.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-stone-400">Tedarikçi Borcumuz:</span>
              <span className="font-bold text-red-400 font-mono">
                {metrics.totalDebt.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/50" />
        </div>
      </div>

      {/* Expense Category Breakdown Section */}
      <div className="bg-stone-900/70 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-stone-100 font-serif">
              Gider Kategorileri Dağılımı
            </h2>
          </div>
          <span className="text-xs text-stone-400">
            Toplam: {metrics.totalExpenses.toLocaleString("tr-TR")} ₺
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Hammadde */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-medium flex items-center gap-1.5">
                <Wheat className="w-3.5 h-3.5 text-amber-500" />
                <span>Hammadde</span>
              </span>
              <span className="font-bold font-mono text-amber-400">
                {metrics.breakdown.hammadde.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{
                  width: `${
                    metrics.totalExpenses > 0
                      ? Math.round((metrics.breakdown.hammadde / metrics.totalExpenses) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Yakıt & Kurye */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-medium flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>Yakıt & Kurye</span>
              </span>
              <span className="font-bold font-mono text-blue-400">
                {metrics.breakdown.yakit_kurye.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${
                    metrics.totalExpenses > 0
                      ? Math.round((metrics.breakdown.yakit_kurye / metrics.totalExpenses) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Ambalaj */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-medium flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-purple-400" />
                <span>Ambalaj & Koli</span>
              </span>
              <span className="font-bold font-mono text-purple-400">
                {metrics.breakdown.ambalaj.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{
                  width: `${
                    metrics.totalExpenses > 0
                      ? Math.round((metrics.breakdown.ambalaj / metrics.totalExpenses) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Fatura & Enerji */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span>Fatura & Enerji</span>
              </span>
              <span className="font-bold font-mono text-orange-400">
                {metrics.breakdown.fatura_kira.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full"
                style={{
                  width: `${
                    metrics.totalExpenses > 0
                      ? Math.round((metrics.breakdown.fatura_kira / metrics.totalExpenses) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Diğer */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-medium">Diğer Giderler</span>
              <span className="font-bold font-mono text-stone-300">
                {metrics.breakdown.diger.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-500 rounded-full"
                style={{
                  width: `${
                    metrics.totalExpenses > 0
                      ? Math.round((metrics.breakdown.diger / metrics.totalExpenses) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Gider başlığı veya not..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === "all"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Tüm Masraflar
          </button>
          <button
            onClick={() => setCategoryFilter("hammadde")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === "hammadde"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            🌾 Hammadde
          </button>
          <button
            onClick={() => setCategoryFilter("yakit_kurye")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === "yakit_kurye"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            🛵 Yakıt & Kurye
          </button>
          <button
            onClick={() => setCategoryFilter("ambalaj")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === "ambalaj"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            📦 Ambalaj
          </button>
          <button
            onClick={() => setCategoryFilter("fatura_kira")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === "fatura_kira"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            ⚡ Enerji & Fatura
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-stone-400 text-xs">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Finans kayıtları yükleniyor...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-16 text-center text-stone-400 text-xs">
            Kayıtlı gider bulunamadı.
            <div className="mt-4">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs"
              >
                <Plus className="w-4 h-4" />
                İlk Gider Kaydını Oluştur
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/40">
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Gider Başlığı</th>
                  <th className="py-3 px-4">Ödeme Yolu</th>
                  <th className="py-3 px-4 text-right">Tutar (₺)</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70 text-xs">
                {filteredExpenses.map((exp) => {
                  const cat = getCategoryLabel(exp.category);

                  return (
                    <tr key={exp.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-300">{exp.date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${cat.color}`}
                        >
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-200">
                        <div>{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-stone-500 line-clamp-1">
                            {exp.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-400">
                        {exp.paymentMethod === "banka_havale" && "Banka Havalesi / EFT"}
                        {exp.paymentMethod === "nakit" && "Nakit"}
                        {exp.paymentMethod === "kredi_karti" && "Şirket Kredi Kartı"}
                        {exp.paymentMethod === "cari_borc" && "Cari Borç Kaydı"}
                        {!exp.paymentMethod && "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-400">
                        {Number(exp.amount).toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`"${exp.title}" gider kaydı silinsin mi?`)) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: YENİ GİDER KAYDET */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">Yeni Gider Kaydet</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Gider Kategorisi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="hammadde">🌾 Hammadde (Un, Süt, Maya vb.)</option>
                  <option value="yakit_kurye">🛵 Yakıt & Kurye Dağıtım Masrafı</option>
                  <option value="ambalaj">📦 Ambalaj, Kese Kağıdı & Koli</option>
                  <option value="fatura_kira">⚡ Doğalgaz, Elektrik, Fırın Kirası</option>
                  <option value="diger">🏷️ Diğer İşletme Giderleri</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Gider Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kurye motor yakıtı (Beylikdüzü dağıtım)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Tutar (₺)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="0"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-base font-bold text-red-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Tarih</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Ödeme Şekli</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="banka_havale">Banka Havalesi / EFT</option>
                  <option value="nakit">Nakit Kasa Çıkışı</option>
                  <option value="kredi_karti">Şirket Kredi Kartı</option>
                  <option value="cari_borc">Cari Borç Olarak Yaz</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama / Fiş No</label>
                <textarea
                  rows={2}
                  placeholder="Fiş / fatura numarası veya detay notu..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  disabled={submitting || amount <= 0}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? "Kaydediliyor..." : "Gideri Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
