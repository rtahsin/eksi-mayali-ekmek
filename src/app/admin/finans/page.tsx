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
  CreditCard,
  Printer,
  MessageCircle,
  Check,
  Clock,
  Lock,
  RefreshCw,
  FileText,
} from "lucide-react";
import { useFinans } from "@/hooks/useFinans";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { ExpenseRecord, AdminOrder } from "@/types/admin";
import { CourierSettlementModal } from "@/components/admin/CourierSettlementModal";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";

export default function AdminFinansPage() {
  const { expenses, loading, metrics, addExpense, deleteExpense } = useFinans();
  const { allOrders, updateOrderStatus } = useAdminOrders();

  const [activeTab, setActiveTab] = useState<"overview" | "courier_settlement">("overview");

  // Filtered Expenses Search & Category
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal State for New Expense
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseRecord["category"]>("hammadde");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<ExpenseRecord["paymentMethod"]>("banka_havale");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Courier Settlement State
  const [selectedSettlementDate, setSelectedSettlementDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [courierSettlementModalOpen, setCourierSettlementModalOpen] = useState(false);
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<AdminOrder | null>(null);
  const [settledDates, setSettledDates] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("ekmeklab_settled_dates") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

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

  // Calculate day orders for selected date
  const dayOrders = useMemo(() => {
    return allOrders.filter((o) => {
      if (o.status === "iptal") return false;
      const oDate = o.deliveryDate || (o.createdAt ? String(o.createdAt).split("T")[0] : "");
      return oDate === selectedSettlementDate;
    });
  }, [allOrders, selectedSettlementDate]);

  // Courier Summary for selected date
  const courierSummary = useMemo(() => {
    let cashCollected = 0;
    let cashPending = 0;
    let posCollected = 0;
    let posPending = 0;
    let onlineTotal = 0;
    let grandTotal = 0;
    let deliveredCount = 0;
    let pendingCount = 0;

    dayOrders.forEach((o) => {
      grandTotal += o.totalAmount;
      const isDelivered = o.status === "teslim_edildi";
      if (isDelivered) {
        deliveredCount++;
      } else {
        pendingCount++;
      }

      if (o.paymentMethod === "cash_on_delivery") {
        if (isDelivered) {
          cashCollected += o.totalAmount;
        } else {
          cashPending += o.totalAmount;
        }
      } else if (o.paymentMethod === "pos_at_door") {
        if (isDelivered) {
          posCollected += o.totalAmount;
        } else {
          posPending += o.totalAmount;
        }
      } else {
        onlineTotal += o.totalAmount;
      }
    });

    return {
      totalOrders: dayOrders.length,
      deliveredCount,
      pendingCount,
      cashCollected,
      cashPending,
      posCollected,
      posPending,
      onlineTotal,
      grandTotal,
    };
  }, [dayOrders]);

  const isDaySettled = settledDates.includes(selectedSettlementDate);

  const handleCloseCashier = async () => {
    if (dayOrders.length === 0) {
      alert("Bu tarihte teslimat siparişi bulunmuyor.");
      return;
    }
    const confirmMsg = `${selectedSettlementDate} tarihli kurye kasasını kapatmak ve mutabakatı onaylamak istediğinize emin misiniz?\n\n` +
      `💵 Toplanan Kapıda Nakit: ${courierSummary.cashCollected.toLocaleString("tr-TR")} ₺\n` +
      `💳 Çekilen Mobil POS: ${courierSummary.posCollected.toLocaleString("tr-TR")} ₺\n\n` +
      `Nakit tutar fırın ana kasasına işlenecektir.`;

    if (!confirm(confirmMsg)) return;

    if (courierSummary.cashCollected > 0) {
      await addExpense({
        category: "diger",
        title: `Kurye Gün Sonu Nakit Tahsilatı (${selectedSettlementDate})`,
        amount: courierSummary.cashCollected,
        date: selectedSettlementDate,
        paymentMethod: "nakit",
        notes: `Toplam ${courierSummary.deliveredCount} sipariş teslimatı mutabakatı. POS: ${courierSummary.posCollected} ₺`,
      });
    }

    const updatedSettled = Array.from(new Set([...settledDates, selectedSettlementDate]));
    setSettledDates(updatedSettled);
    if (typeof window !== "undefined") {
      localStorage.setItem("ekmeklab_settled_dates", JSON.stringify(updatedSettled));
    }

    alert("✅ Kurye gün sonu mutabakatı başarıyla tamamlandı ve kasa kapatıldı!");
  };

  const handleShareCourierWhatsApp = () => {
    const text = `🥖 *EKMEKLAB TAŞ FIRIN - KURYE GÜN SONU KASA MUTABAKATI*\n` +
      `📅 *Tarih:* ${selectedSettlementDate}\n` +
      `📦 *Toplam Sipariş:* ${courierSummary.totalOrders} Adet\n` +
      `✅ *Teslim Edilen:* ${courierSummary.deliveredCount} Adet\n` +
      `⏳ *Kalan/Bekleyen:* ${courierSummary.pendingCount} Adet\n\n` +
      `💵 *Kapıda Nakit Tahsilat:* ${courierSummary.cashCollected.toLocaleString("tr-TR")} ₺\n` +
      `💳 *Kapıda Mobil POS Tahsilat:* ${courierSummary.posCollected.toLocaleString("tr-TR")} ₺\n` +
      `🌐 *Online / Havale:* ${courierSummary.onlineTotal.toLocaleString("tr-TR")} ₺\n` +
      `💰 *GENEL TOPLAM:* ${courierSummary.grandTotal.toLocaleString("tr-TR")} ₺\n\n` +
      `*Mutabakat Durumu:* ${isDaySettled ? "✅ KASA KAPATILDI" : "⏳ AÇIK KASA"}\n` +
      `_Tahsin Usta & EkmekLab Atölye_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

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
    const rows = filteredExpenses.map((e) => [
      `"${e.date}"`,
      `"${getCategoryLabel(e.category).label}"`,
      `"${e.title}"`,
      e.amount.toString(),
      `"${e.paymentMethod}"`,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
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
            <span>Kasa, Gider & Kurye Mutabakatı</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            Finans & Kasa Komuta Masası
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Taş fırın satış gelirleri, kurye kapıda nakit/POS tahsilatları ve işletme bilançosu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "overview" && (
            <>
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
            </>
          )}

          {activeTab === "courier_settlement" && (
            <>
              <button
                onClick={() => setCourierSettlementModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium border border-stone-700 rounded-xl transition-all shadow active:scale-95 text-sm"
                title="Termal Kurye Z Raporu Fişi Yazdır"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Z Fişi Yazdır</span>
              </button>

              <button
                onClick={handleShareCourierWhatsApp}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-medium border border-emerald-500/30 rounded-xl transition-all shadow active:scale-95 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Paylaş</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-serif text-xs font-bold transition-all ${
            activeTab === "overview"
              ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
              : "bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Genel Finans & Kârlılık</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("courier_settlement")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-serif text-xs font-bold transition-all ${
            activeTab === "courier_settlement"
              ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
              : "bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Kurye Kasası & Gün Sonu Mutabakatı</span>
          {courierSummary.pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
              {courierSummary.pendingCount} Bekleyen
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (GENEL FINANS & KARLILIK) */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8">
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

              {/* Fatura & Kira */}
              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span>Fatura & Kira</span>
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
                  <span className="text-stone-300 font-medium flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                    <span>Diğer Giderler</span>
                  </span>
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

          {/* Expenses Table Section */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-stone-100 font-serif">
                  Operasyonel Gider Kayıtları
                </h2>
                <span className="text-xs text-stone-500">({filteredExpenses.length} kayıt)</span>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Gider ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-stone-500" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">Tüm Kategoriler</option>
                    <option value="hammadde">Hammadde</option>
                    <option value="yakit_kurye">Yakıt & Kurye</option>
                    <option value="ambalaj">Ambalaj & Koli</option>
                    <option value="fatura_kira">Fatura & Kira</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs bg-stone-950/40 rounded-xl border border-stone-800/60">
                Kayıtlı gider bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 text-stone-400 font-semibold border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Açıklama</th>
                      <th className="py-3 px-4">Ödeme Yöntemi</th>
                      <th className="py-3 px-4 text-right">Tutar</th>
                      <th className="py-3 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {filteredExpenses.map((exp) => {
                      const catInfo = getCategoryLabel(exp.category);
                      return (
                        <tr key={exp.id} className="hover:bg-stone-800/30 transition-colors">
                          <td className="py-3 px-4 text-stone-400 font-mono text-[11px]">
                            {exp.date}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${catInfo.color}`}
                            >
                              {catInfo.label}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COURIER SETTLEMENT (KURYE KASASI & GÜN SONU MUTABAKATI) */}
      {/* ========================================================================= */}
      {activeTab === "courier_settlement" && (
        <div className="space-y-6">
          {/* Settlement Control Bar */}
          <div className="bg-stone-900/80 border border-stone-800 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            {/* Date Picker & Presets */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-stone-300 font-serif">Teslimat Günü:</span>
              </div>

              <input
                type="date"
                value={selectedSettlementDate}
                onChange={(e) => setSelectedSettlementDate(e.target.value)}
                className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSettlementDate(new Date().toISOString().split("T")[0])}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium"
                >
                  Bugün
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setSelectedSettlementDate(d.toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium"
                >
                  Dün
                </button>
              </div>

              {/* Settlement Status Badge */}
              <div className="ml-2">
                {isDaySettled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Gün Sonu Kasası Kapatıldı</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-400 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Açık Kasa (Mutabakat Bekliyor)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Close Register Button */}
            <div>
              <button
                type="button"
                onClick={handleCloseCashier}
                disabled={isDaySettled || dayOrders.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold font-serif rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isDaySettled ? "Mutabakat Tamamlandı" : "Kasayı Kapat & Mutabakatı Onayla"}</span>
              </button>
            </div>
          </div>

          {/* 4 Courier Cashier Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cash Collected */}
            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Kapıda Nakit Tahsilat</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-serif mt-2">
                {courierSummary.cashCollected.toLocaleString("tr-TR")} ₺
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400">
                <span>Bekleyen Nakit:</span>
                <span className="font-mono font-semibold text-amber-400">
                  {courierSummary.cashPending.toLocaleString("tr-TR")} ₺
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/50" />
            </div>

            {/* POS Collected */}
            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Kapıda Mobil POS (Kart)</span>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400 font-serif mt-2">
                {courierSummary.posCollected.toLocaleString("tr-TR")} ₺
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400">
                <span>Bekleyen POS:</span>
                <span className="font-mono font-semibold text-amber-400">
                  {courierSummary.posPending.toLocaleString("tr-TR")} ₺
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/50" />
            </div>

            {/* Online / Transfer */}
            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Online / Havale Gelir</span>
                <Wallet className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-stone-100 font-serif mt-2">
                {courierSummary.onlineTotal.toLocaleString("tr-TR")} ₺
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                Önceden fırın hesabına geçenler
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/50" />
            </div>

            {/* Delivery Progress */}
            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Dağıtım İlerlemesi</span>
                <Truck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-stone-100 font-serif mt-2">
                {courierSummary.deliveredCount} / {courierSummary.totalOrders}
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                {courierSummary.pendingCount > 0 ? (
                  <span className="text-amber-400 font-medium">
                    {courierSummary.pendingCount} sipariş yolda / teslim bekliyor
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">
                    Tüm siparişler teslim edildi!
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500/50" />
            </div>
          </div>

          {/* Courier Orders Settlement Table */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-stone-100 font-serif">
                  {selectedSettlementDate} Tarihli Kurye Dağıtım & Tahsilat Listesi
                </h2>
                <span className="text-xs text-stone-500">({dayOrders.length} sipariş)</span>
              </div>
            </div>

            {dayOrders.length === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs bg-stone-950/40 rounded-xl border border-stone-800/60">
                Bu tarihe ait teslimat siparişi bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 text-stone-400 font-semibold border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Sipariş</th>
                      <th className="py-3 px-4">Müşteri</th>
                      <th className="py-3 px-4">Mahalle / Adres</th>
                      <th className="py-3 px-4">Ödeme Yöntemi</th>
                      <th className="py-3 px-4 text-right">Tutar</th>
                      <th className="py-3 px-4 text-center">Durum</th>
                      <th className="py-3 px-4 text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {dayOrders.map((o) => {
                      const isDelivered = o.status === "teslim_edildi";
                      const isCash = o.paymentMethod === "cash_on_delivery";
                      const isPos = o.paymentMethod === "pos_at_door";

                      return (
                        <tr key={o.id} className="hover:bg-stone-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            #{o.orderNumber || o.id.substring(0, 6)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-200">{o.customerName}</div>
                            <div className="text-[11px] text-stone-400">{o.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-stone-300">
                              {o.neighborhood || "Beylikdüzü"}
                            </div>
                            <div className="text-[10px] text-stone-500 line-clamp-1">
                              {o.deliveryAddress}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isCash && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                💵 Kapıda Nakit
                              </span>
                            )}
                            {isPos && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                                💳 Mobil POS
                              </span>
                            )}
                            {!isCash && !isPos && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 text-[10px]">
                                🌐 {o.paymentMethod === "online" ? "Online Kredi Kartı" : "Havale / EFT"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-stone-100 text-sm">
                            {o.totalAmount.toLocaleString("tr-TR")} ₺
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isDelivered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Teslim Edildi & Tahsil</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>{o.status === "kuryede" ? "Kuryede (Yolda)" : "Hazırlanıyor"}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isDelivered && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(o.id, "teslim_edildi", "paid")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-[11px] font-bold transition-all shadow"
                                  title="Teslim Edildi ve Tahsil Edildi Olarak İşaretle"
                                >
                                  ✓ Tahsil Et
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForSlip(o)}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                                title="Sipariş Fişi Yazdır"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

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

      {/* MODAL: KURYE GÜN SONU Z RAPORU / FİŞİ */}
      <CourierSettlementModal
        date={selectedSettlementDate}
        orders={dayOrders}
        summary={courierSummary}
        isOpen={courierSettlementModalOpen}
        onClose={() => setCourierSettlementModalOpen(false)}
      />

      {/* MODAL: TEKİL SİPARİŞ FİŞİ */}
      {selectedOrderForSlip && (
        <OrderSlipModal
          order={selectedOrderForSlip}
          isOpen={Boolean(selectedOrderForSlip)}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}
    </div>
  );
}
