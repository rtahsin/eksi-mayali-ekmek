"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
  Receipt,
  Tag,
  ArrowRight,
  Phone,
  MapPin,
  Edit3,
  ExternalLink,
  Minus,
  Link2,
} from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { useFinans } from "@/hooks/useFinans";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useProducts, INITIAL_PRODUCTS } from "@/hooks/useProducts";
import {
  CariAccount,
  CariTransaction,
  ExpenseRecord,
  AdminOrder,
  OrderItem,
  BEYLIKDUZU_NEIGHBORHOODS,
} from "@/types/admin";
import { CourierSettlementModal } from "@/components/admin/CourierSettlementModal";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";

export default function AdminFinansPage() {
  // Hooks
  const {
    cariler,
    loading: carilerLoading,
    totalReceivable,
    addCari,
    updateCari,
    deleteCari,
    setManualBalance,
    addTransaction,
  } = useCariler();

  const { expenses, loading: expensesLoading, metrics, addExpense, deleteExpense } = useFinans();
  const { allOrders } = useAdminOrders();
  const { products } = useProducts("all");
  const activeProducts = products.length > 0 ? products : INITIAL_PRODUCTS;

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"cariler" | "expenses" | "courier_settlement">("cariler");

  // ==========================================
  // TAB 1: CARILER & MÜŞTERİLER (ÖN MUHASEBE)
  // ==========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "debtor" | "balanced" | "gider">("all");

  // Create / Edit Cari Modal
  const [cariModalOpen, setCariModalOpen] = useState(false);
  const [editingCari, setEditingCari] = useState<Partial<CariAccount> | null>(null);
  const [isNewCari, setIsNewCari] = useState(false);

  // Quick Payment / Collection Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedCariForPay, setSelectedCariForPay] = useState<CariAccount | null>(null);
  const [payType, setPayType] = useState<"tahsilat" | "odeme">("tahsilat");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<"nakit" | "banka_havale" | "kredi_karti">("banka_havale");
  const [payDescription, setPayDescription] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Quick Fiş Kes (Satış) Modal
  const [quickSlipModalOpen, setQuickSlipModalOpen] = useState(false);
  const [selectedCariForSlip, setSelectedCariForSlip] = useState<CariAccount | null>(null);
  const [slipQuantities, setSlipQuantities] = useState<Record<string, number>>({});
  const [slipDate, setSlipDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [slipPaymentCollected, setSlipPaymentCollected] = useState<number>(0);
  const [slipPaymentMethod, setSlipPaymentMethod] = useState<"nakit" | "banka_havale" | "kredi_karti">("nakit");
  const [slipNotes, setSlipNotes] = useState<string>("");
  const [slipSubmitting, setSlipSubmitting] = useState(false);

  // Active Slip for Preview Modal (OrderSlipModal)
  const [activeSlipOrder, setActiveSlipOrder] = useState<AdminOrder | null>(null);
  const [slipModalOpen, setSlipModalOpen] = useState(false);

  // Quick Balance Adjustment Modal (ETA / Logo Devir & Düzeltme)
  const [balanceAdjustModalOpen, setBalanceAdjustModalOpen] = useState(false);
  const [selectedCariForBalance, setSelectedCariForBalance] = useState<CariAccount | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState<number>(0);
  const [balanceAdjustReason, setBalanceAdjustReason] = useState<string>("");
  const [balanceAdjustSubmitting, setBalanceAdjustSubmitting] = useState(false);

  const openBalanceAdjustModal = (cari: CariAccount) => {
    setSelectedCariForBalance(cari);
    setNewBalanceInput(cari.balance || 0);
    setBalanceAdjustReason("Açılış / Bakiye Düzeltme Devri");
    setBalanceAdjustModalOpen(true);
  };

  const handleSaveBalanceAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCariForBalance) return;
    setBalanceAdjustSubmitting(true);
    const res = await setManualBalance(
      selectedCariForBalance.id,
      Number(newBalanceInput || 0),
      balanceAdjustReason || "Bakiye Düzeltme"
    );
    if (res.success) {
      setBalanceAdjustModalOpen(false);
      setSelectedCariForBalance(null);
    } else {
      alert("Bakiye güncellenirken hata: " + res.error);
    }
    setBalanceAdjustSubmitting(false);
  };

  // Filtered Cariler
  const filteredCariler = useMemo(() => {
    return cariler.filter((c) => {
      // Filter by type or balance
      if (balanceFilter === "debtor" && c.balance <= 0) return false;
      if (balanceFilter === "balanced" && c.balance !== 0) return false;
      if (balanceFilter === "gider" && c.accountType !== "gider") return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.businessName.toLowerCase().includes(q);
        const matchContact = (c.contactPerson || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").includes(q);
        const matchNeighborhood = (c.neighborhood || "").toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchPhone && !matchNeighborhood) return false;
      }

      return true;
    });
  }, [cariler, balanceFilter, searchQuery]);

  // Open Create Cari Modal
  const openCreateCariModal = (defaultType: "musteri" | "gider" = "musteri") => {
    setIsNewCari(true);
    setEditingCari({
      businessName: defaultType === "gider" ? "Dükkan Giderleri" : "",
      accountType: defaultType,
      contactPerson: defaultType === "gider" ? "Fırın Masrafı" : "",
      phone: "",
      address: "",
      neighborhood: "Adnan Kahveci",
      balance: 0,
      customPrices: {},
      notes: "",
    });
    setCariModalOpen(true);
  };

  // Open Edit Cari Modal
  const openEditCariModal = (cari: CariAccount) => {
    setIsNewCari(false);
    setEditingCari({
      ...cari,
      balance: cari.balance || 0,
      customPrices: { ...(cari.customPrices || {}) },
    });
    setCariModalOpen(true);
  };

  // Save Cari
  const handleSaveCari = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCari || !editingCari.businessName) return;

    if (isNewCari) {
      const res = await addCari({
        ...editingCari,
        initialBalance: Number(editingCari.balance || 0),
      } as any);
      if (res.success) {
        setCariModalOpen(false);
        setEditingCari(null);
      } else {
        alert("Cari hesap eklenirken hata: " + res.error);
      }
    } else if (editingCari.id) {
      const res = await updateCari(editingCari.id, {
        ...editingCari,
        newBalance: Number(editingCari.balance || 0),
      });
      if (res.success) {
        setCariModalOpen(false);
        setEditingCari(null);
      } else {
        alert("Cari hesap güncellenirken hata: " + res.error);
      }
    }
  };

  // Open Quick Fiş Modal for a Cari
  const openQuickSlipModal = (cari?: CariAccount) => {
    const targetCari = cari || cariler[0] || null;
    if (!targetCari) {
      alert("Henüz kayıtlı bir müşteri/cari hesap bulunmuyor. Lütfen önce 'Yeni Müşteri Ekle' butonundan bir müşteri tanımlayın.");
      openCreateCariModal("musteri");
      return;
    }
    setSelectedCariForSlip(targetCari);
    setSlipQuantities({});
    setSlipDate(new Date().toISOString().split("T")[0]);
    setSlipPaymentCollected(0);
    setSlipNotes("");
    setQuickSlipModalOpen(true);
  };

  // Update item quantity in Quick Fiş
  const updateSlipQuantity = (productId: string, delta: number) => {
    setSlipQuantities((prev) => {
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

  // Calculate items for Quick Fiş using agreed prices
  const quickSlipItems: OrderItem[] = useMemo(() => {
    return Object.entries(slipQuantities)
      .map(([pId, qty]) => {
        const prod = activeProducts.find((p) => p.id === pId);
        if (!prod || qty <= 0) return null;

        const customPrice = selectedCariForSlip?.customPrices?.[pId];
        const unitPrice = customPrice !== undefined ? customPrice : prod.price;

        return {
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
          weight: prod.weight,
        };
      })
      .filter(Boolean) as OrderItem[];
  }, [slipQuantities, activeProducts, selectedCariForSlip]);

  const quickSlipTotal = quickSlipItems.reduce((sum, it) => sum + it.totalPrice, 0);

  // Submit Quick Fiş
  const handleSaveQuickSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCariForSlip || quickSlipItems.length === 0) return;

    setSlipSubmitting(true);
    try {
      const itemsSummary = quickSlipItems
        .map((it) => `${it.quantity}x ${it.productName} (${it.unitPrice}₺)`)
        .join(", ");

      const generatedOrderId = `ord_${Date.now().toString(36)}`;

      // 1. Record Sale (Borç) Transaction
      const res = await addTransaction(selectedCariForSlip.id, {
        type: "satis",
        amount: quickSlipTotal,
        description: `Fiş: ${itemsSummary}`,
        date: slipDate,
        orderId: generatedOrderId,
      });

      // 2. If payment was collected at delivery, record collection transaction
      if (slipPaymentCollected > 0) {
        await addTransaction(selectedCariForSlip.id, {
          type: "tahsilat",
          amount: Number(slipPaymentCollected),
          description: `Teslimatta Tahsilat (${slipPaymentMethod === "nakit" ? "Nakit" : slipPaymentMethod === "banka_havale" ? "Havale" : "POS"})`,
          date: slipDate,
          paymentMethod: slipPaymentMethod,
          orderId: generatedOrderId,
        });
      }

      if (res.success) {
        setQuickSlipModalOpen(false);

        // Build AdminOrder representation to show in OrderSlipModal
        const slipOrder: AdminOrder = {
          id: generatedOrderId,
          orderNumber: generatedOrderId.substring(4, 10).toUpperCase(),
          customerName: selectedCariForSlip.businessName,
          phone: selectedCariForSlip.phone,
          deliveryAddress: selectedCariForSlip.address || "Belirtilmemiş",
          neighborhood: selectedCariForSlip.neighborhood || "Beylikdüzü",
          deliveryMethod: "courier",
          deliveryDate: slipDate,
          deliveryTimeWindow: "14:00 - 18:00",
          items: quickSlipItems,
          subtotal: quickSlipTotal,
          shippingFee: 0,
          totalAmount: quickSlipTotal,
          status: "teslim_edildi",
          paymentMethod: "cari",
          paymentStatus: "paid",
          source: "whatsapp",
          cariId: selectedCariForSlip.id,
          orderNotes: slipNotes,
          createdAt: new Date().toISOString(),
        };

        // Pop up the digital fiş modal immediately
        setActiveSlipOrder(slipOrder);
        setSlipModalOpen(true);
      } else {
        alert("Fiş kaydedilirken hata: " + res.error);
      }
    } finally {
      setSlipSubmitting(false);
    }
  };

  // Open Quick Payment / Collection Modal
  const openPaymentModal = (cari: CariAccount, defaultType: "tahsilat" | "odeme" = "tahsilat") => {
    setSelectedCariForPay(cari);
    setPayType(defaultType);
    setPayAmount(cari.balance > 0 ? cari.balance : 0);
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayDescription(
      defaultType === "tahsilat"
        ? `${cari.businessName} - Cari Tahsilat`
        : `${cari.businessName} - Ödeme / Masraf`
    );
    setPayModalOpen(true);
  };

  // Submit Payment / Collection
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCariForPay || payAmount <= 0) return;

    setPaySubmitting(true);
    const res = await addTransaction(selectedCariForPay.id, {
      type: payType,
      amount: Number(payAmount),
      description: payDescription || (payType === "tahsilat" ? "Cari Tahsilat" : "Cari Ödeme"),
      paymentMethod: payMethod,
      date: payDate,
    });

    if (res.success) {
      setPayModalOpen(false);
      setSelectedCariForPay(null);
      setPayAmount(0);
    } else {
      alert("İşlem kaydedilirken hata: " + res.error);
    }
    setPaySubmitting(false);
  };

  // Export Cariler CSV
  const handleExportCarilerCSV = () => {
    if (filteredCariler.length === 0) {
      alert("Dışa aktarılacak cari bulunamadı.");
      return;
    }

    const headers = ["Firma Adı", "Hesap Türü", "Yetkili", "Telefon", "Mahalle", "Adres", "Güncel Bakiye"];
    const rows = filteredCariler.map((c) => [
      `"${c.businessName}"`,
      `"${c.accountType === "gider" ? "Gider Hesabı" : "Müşteri"}"`,
      `"${c.contactPerson || ""}"`,
      `"${c.phone}"`,
      `"${c.neighborhood}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      c.balance.toString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cariler_Raporu_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // TAB 2: GİDERLER & MASRAFLAR STATE
  // ==========================================
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("all");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseRecord["category"]>("hammadde");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [expensePayMethod, setExpensePayMethod] = useState<ExpenseRecord["paymentMethod"]>("banka_havale");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expenseCategoryFilter !== "all" && e.category !== expenseCategoryFilter) return false;

      if (expenseSearchQuery.trim()) {
        const q = expenseSearchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchNotes = (e.notes || "").toLowerCase().includes(q);
        if (!matchTitle && !matchNotes) return false;
      }

      return true;
    });
  }, [expenses, expenseCategoryFilter, expenseSearchQuery]);

  // Handle Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) return;

    setExpenseSubmitting(true);
    const res = await addExpense({
      category: expenseCategory,
      title: expenseTitle.trim(),
      amount: Number(expenseAmount),
      date: expenseDate,
      paymentMethod: expensePayMethod,
      notes: expenseNotes.trim(),
    });

    if (res.success) {
      setExpenseModalOpen(false);
      setExpenseTitle("");
      setExpenseAmount(0);
      setExpenseNotes("");
    } else {
      alert("Gider kaydedilirken hata: " + res.error);
    }
    setExpenseSubmitting(false);
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "hammadde":
        return { label: "Hammadde (Un vb.)", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
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

  // Export Expenses CSV
  const handleExportExpensesCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("Dışa aktarılacak gider kaydı bulunamadı.");
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
    link.setAttribute("download", `Giderler_Raporu_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // TAB 3: KURYE MUTABAKAT STATE
  // ==========================================
  const [selectedSettlementDate, setSelectedSettlementDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [courierSettlementModalOpen, setCourierSettlementModalOpen] = useState(false);
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

  const dayOrders = useMemo(() => {
    return allOrders.filter((o) => {
      if (o.status === "iptal") return false;
      const oDate = o.deliveryDate || (o.createdAt ? String(o.createdAt).split("T")[0] : "");
      return oDate === selectedSettlementDate;
    });
  }, [allOrders, selectedSettlementDate]);

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
        if (isDelivered) cashCollected += o.totalAmount;
        else cashPending += o.totalAmount;
      } else if (o.paymentMethod === "pos_at_door") {
        if (isDelivered) posCollected += o.totalAmount;
        else posPending += o.totalAmount;
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
    const confirmMsg =
      `${selectedSettlementDate} tarihli kurye kasasını kapatmak ve mutabakatı onaylamak istediğinize emin misiniz?\n\n` +
      `💵 Toplanan Kapıda Nakit: ${(courierSummary.cashCollected || 0).toLocaleString("tr-TR")} ₺\n` +
      `💳 Çekilen Mobil POS: ${(courierSummary.posCollected || 0).toLocaleString("tr-TR")} ₺\n\n` +
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
    const text =
      `🥖 *EKMEKLAB TAŞ FIRIN - KURYE GÜN SONU KASA MUTABAKATI*\n` +
      `📅 *Tarih:* ${selectedSettlementDate}\n` +
      `📦 *Toplam Sipariş:* ${courierSummary.totalOrders} Adet\n` +
      `✅ *Teslim Edilen:* ${courierSummary.deliveredCount} Adet\n` +
      `⏳ *Kalan/Bekleyen:* ${courierSummary.pendingCount} Adet\n\n` +
      `💵 *Kapıda Nakit Tahsilat:* ${(courierSummary.cashCollected || 0).toLocaleString("tr-TR")} ₺\n` +
      `💳 *Kapıda Mobil POS Tahsilat:* ${(courierSummary.posCollected || 0).toLocaleString("tr-TR")} ₺\n` +
      `🌐 *Online / Havale:* ${(courierSummary.onlineTotal || 0).toLocaleString("tr-TR")} ₺\n` +
      `💰 *GENEL TOPLAM:* ${(courierSummary.grandTotal || 0).toLocaleString("tr-TR")} ₺\n\n` +
      `*Mutabakat Durumu:* ${isDaySettled ? "✅ KASA KAPATILDI" : "⏳ AÇIK KASA"}\n` +
      `_Tahsin Usta & EkmekLab Atölye_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/30 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>Fırın Ön Muhasebe & Kasa Komutası</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            Finans & Müşteri Masası
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Şarküteri ve kafelere toptan satış fişi kesme, tahsilat alma, dükkan giderleri ve bakiye takibi.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {activeTab === "cariler" && (
            <>
              <button
                onClick={handleExportCarilerCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#221A14] hover:bg-[#2C211A] text-amber-400 font-medium border border-amber-500/30 rounded-xl transition-all text-xs"
                title="Cari listesini Excel (CSV) olarak indir"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV İndir</span>
              </button>

              <button
                onClick={() => openQuickSlipModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-bold rounded-xl transition-all shadow-lg shadow-artisan-terracotta/20 border border-artisan-gold/30 text-xs active:scale-95"
              >
                <Receipt className="w-4 h-4" />
                <span>+ Hızlı Fiş Kes (Satış)</span>
              </button>

              <button
                onClick={() => openCreateCariModal("musteri")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 text-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Yeni Müşteri / Cari Ekle</span>
              </button>
            </>
          )}

          {activeTab === "expenses" && (
            <>
              <button
                onClick={handleExportExpensesCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#221A14] hover:bg-[#2C211A] text-amber-400 font-medium border border-amber-500/30 rounded-xl transition-all text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV İndir</span>
              </button>

              <button
                onClick={() => setExpenseModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 text-xs active:scale-95"
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
                className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium border border-stone-700 rounded-xl transition-all text-xs active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Z Fişi Yazdır</span>
              </button>

              <button
                onClick={handleShareCourierWhatsApp}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-medium border border-emerald-500/30 rounded-xl transition-all text-xs active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Paylaş</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("cariler")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-serif text-xs font-bold transition-all ${
            activeTab === "cariler"
              ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
              : "bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Müşteriler & Cariler (Ön Muhasebe)</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {cariler.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-serif text-xs font-bold transition-all ${
            activeTab === "expenses"
              ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
              : "bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Kasa & Dükkan Giderleri</span>
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
          <span>Kurye Kasası & Mutabakat</span>
          {courierSummary.pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
              {courierSummary.pendingCount} Bekleyen
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MÜŞTERİLER & CARİLER (ÖN MUHASEBE) */}
      {/* ========================================================================= */}
      {activeTab === "cariler" && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Toplam Cari Alacağımız</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-400 font-serif mt-2">
                {(totalReceivable || 0).toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-xs text-stone-400 mt-1">Carilerden tahsil edilecek tutar</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/50" />
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Borçlu Firma Sayısı</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-amber-400 font-serif mt-2">
                {cariler.filter((c) => c.balance > 0).length}{" "}
                <span className="text-sm font-normal text-stone-400">firma</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">Aktif bakiyesi olan cariler</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/50" />
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Kayıtlı Müşteri & Gider</span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif mt-2">
                {cariler.length} <span className="text-sm font-normal text-stone-400">hesap</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">Şarküteri, kafe ve gider hesapları</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/50" />
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Hızlı İşlem Masası</span>
                <Receipt className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => openQuickSlipModal()}
                  className="w-full py-2 bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-bold rounded-xl text-xs transition-all shadow border border-artisan-gold/30 text-center"
                >
                  🧾 Fiş Kes
                </button>
                <button
                  onClick={() => openCreateCariModal("gider")}
                  className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold rounded-xl text-xs transition-all border border-stone-700 text-center"
                >
                  + Gider Hesabı
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-artisan-gold/50" />
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Firma adı, yetkili, tel veya mahalle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              <button
                onClick={() => setBalanceFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  balanceFilter === "all"
                    ? "bg-amber-500 text-stone-950"
                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Tümü ({cariler.length})
              </button>
              <button
                onClick={() => setBalanceFilter("debtor")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  balanceFilter === "debtor"
                    ? "bg-amber-500 text-stone-950"
                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Alacaklı Olduklarımız ({cariler.filter((c) => c.balance > 0).length})
              </button>
              <button
                onClick={() => setBalanceFilter("balanced")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  balanceFilter === "balanced"
                    ? "bg-amber-500 text-stone-950"
                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Bakiyesi Sıfır ({cariler.filter((c) => c.balance === 0).length})
              </button>
              <button
                onClick={() => setBalanceFilter("gider")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  balanceFilter === "gider"
                    ? "bg-amber-500 text-stone-950"
                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Gider Hesapları ({cariler.filter((c) => c.accountType === "gider").length})
              </button>
            </div>
          </div>

          {/* Cariler Grid */}
          {carilerLoading ? (
            <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Müşteri carileri yükleniyor...
            </div>
          ) : filteredCariler.length === 0 ? (
            <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
              Kayıtlı cari hesap bulunamadı.
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => openCreateCariModal("musteri")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs"
                >
                  <Plus className="w-4 h-4" />
                  İlk Müşteriyi Ekle
                </button>
                <button
                  onClick={() => openCreateCariModal("gider")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-amber-400 font-bold rounded-xl text-xs border border-stone-700"
                >
                  <Plus className="w-4 h-4" />
                  Gider Hesabı Oluştur
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCariler.map((cari) => {
                const isExpense = cari.accountType === "gider";
                const customPriceCount = Object.keys(cari.customPrices || {}).length;
                const hasDebt = cari.balance > 0;

                return (
                  <div
                    key={cari.id}
                    className="bg-stone-900/80 border border-stone-800 hover:border-stone-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 group transition-all"
                  >
                    <div className="space-y-3">
                      {/* Title & Type Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-stone-100 font-serif group-hover:text-amber-400 transition-colors">
                              {cari.businessName}
                            </h3>
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {cari.contactPerson || (isExpense ? "Gider Hesabı" : "Yetkili Belirtilmedi")}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            isExpense
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {isExpense ? "Gider Hesabı" : "Müşteri"}
                        </span>
                      </div>

                      {/* Phone & WhatsApp */}
                      {cari.phone && (
                        <div className="flex items-center gap-3 text-xs">
                          <a
                            href={`tel:${cari.phone}`}
                            className="flex items-center gap-1.5 text-stone-300 hover:text-amber-400 font-mono transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-amber-500" />
                            <span>{cari.phone}</span>
                          </a>
                          <a
                            href={`https://wa.me/90${cari.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title="WhatsApp Mesajı Aç"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {/* Address & Neighborhood */}
                      {cari.address && (
                        <div className="flex items-start gap-1.5 text-xs text-stone-400 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                          <span>
                            {cari.neighborhood ? `${cari.neighborhood} Mah., ` : ""}
                            {cari.address}
                          </span>
                        </div>
                      )}

                      {/* Custom Prices Info */}
                      {!isExpense && (
                        <div className="pt-1 flex items-center gap-1.5 text-xs">
                          <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-stone-400">
                            {customPriceCount > 0 ? (
                              <span className="text-amber-400 font-semibold">
                                {customPriceCount} üründe özel toptan fiyat
                              </span>
                            ) : (
                              <span>Standart vitrin fiyatı</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Balance & Actions */}
                    <div className="pt-4 border-t border-stone-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs text-stone-400 font-medium">Güncel Bakiye:</span>
                          <div>
                            <button
                              type="button"
                              onClick={() => openBalanceAdjustModal(cari)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                              title="Bakiyeyi doğrudan değiştir veya devir gir"
                            >
                              ⚙️ Bakiye Ayarla
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            onClick={() => openBalanceAdjustModal(cari)}
                            className={`text-lg font-bold font-serif cursor-pointer hover:underline ${
                              hasDebt
                                ? "text-amber-400"
                                : cari.balance < 0
                                ? "text-emerald-400"
                                : "text-stone-300"
                            }`}
                            title="Bakiyeyi doğrudan düzenlemek için tıklayın"
                          >
                            {(cari.balance || 0).toLocaleString("tr-TR")} ₺
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

                      {/* Button Action Bar */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* 1. Main Action: Fiş Kes for Customer, or Ödeme for Gider */}
                        {!isExpense ? (
                          <button
                            onClick={() => openQuickSlipModal(cari)}
                            className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-xs font-bold transition-all border border-artisan-gold/30 shadow active:scale-95"
                            title="Bu müşteriye ekmek seçip fiş kes"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Fiş Kes</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openPaymentModal(cari, "odeme")}
                            className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold transition-all border border-red-500/30"
                            title="Bu gider hesabına ödeme kaydet"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Ödeme Yap</span>
                          </button>
                        )}

                        {/* 2. Tahsilat Al (or Ödeme Yap) */}
                        <button
                          onClick={() => openPaymentModal(cari, isExpense ? "odeme" : "tahsilat")}
                          className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20"
                          title={isExpense ? "Ödeme Kaydet" : "Tahsilat Al"}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{isExpense ? "Ödeme" : "Tahsilat"}</span>
                        </button>

                        {/* 3. Ekstre & Fişler */}
                        <Link
                          href={`/admin/cariler/${cari.id}`}
                          className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors border border-stone-700"
                          title="Hesap Ekstresi & Tüm Hareketler"
                        >
                          <span>Ekstre</span>
                          <ArrowRight className="w-3 h-3 text-stone-400" />
                        </Link>
                      </div>

                      {/* Secondary Row: Edit */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => openBalanceAdjustModal(cari)}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Bakiye Düzelt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditCariModal(cari)}
                          className="text-stone-400 hover:text-white flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Bilgileri & Fiyatları Düzenle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KASA & DÜKKAN GİDERLERİ */}
      {/* ========================================================================= */}
      {activeTab === "expenses" && (
        <div className="space-y-8">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Toplam Ciro (Gelir)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif mt-3">
                {(metrics?.totalRevenue || 0).toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-xs text-stone-400 mt-1">Web + WhatsApp + Fiş Satışları</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/50" />
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Toplam Dükkan Gideri</span>
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-red-400 font-serif mt-3">
                {(metrics?.totalExpenses || 0).toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-xs text-stone-400 mt-1">{expenses.length} adet harcama kalemi</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/50" />
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Net Bakiye / Kâr</span>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
              <div
                className={`text-2xl md:text-3xl font-bold font-serif mt-3 ${
                  (metrics?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {(metrics?.netProfit || 0) >= 0 ? "+" : ""}
                {(metrics?.netProfit || 0).toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {(metrics?.netProfit || 0) >= 0 ? "Kârlı Operasyon" : "Giderler Ciroyu Aştı"}
              </p>
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 ${
                  (metrics?.netProfit || 0) >= 0 ? "bg-emerald-500/50" : "bg-red-500/50"
                }`}
              />
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Cari Alacağımız</span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-400 font-serif mt-3">
                {(totalReceivable || 0).toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-xs text-stone-400 mt-1">Carilerden tahsil edilecek tutar</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/50" />
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-stone-100 font-serif">
                  Operasyonel Masraf Kayıtları
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
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Tüm Kategoriler</option>
                  <option value="hammadde">Hammadde (Un vb.)</option>
                  <option value="yakit_kurye">Yakıt & Kurye</option>
                  <option value="ambalaj">Ambalaj & Koli</option>
                  <option value="fatura_kira">Fatura & Kira</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>
            </div>

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
      {/* TAB 3: KURYE KASASI & MUTABAKAT */}
      {/* ========================================================================= */}
      {activeTab === "courier_settlement" && (
        <div className="space-y-6">
          <div className="bg-stone-900/80 border border-stone-800 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Kapıda Nakit Tahsilat</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-serif mt-2">
                {(courierSummary.cashCollected || 0).toLocaleString("tr-TR")} ₺
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                Bekleyen Nakit:{" "}
                <span className="font-mono font-semibold text-amber-400">
                  {(courierSummary.cashPending || 0).toLocaleString("tr-TR")} ₺
                </span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Mobil POS Tahsilat</span>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400 font-serif mt-2">
                {(courierSummary.posCollected || 0).toLocaleString("tr-TR")} ₺
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                Bekleyen POS:{" "}
                <span className="font-mono font-semibold text-amber-400">
                  {(courierSummary.posPending || 0).toLocaleString("tr-TR")} ₺
                </span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Online / Havale</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400 font-serif mt-2">
                {(courierSummary.onlineTotal || 0).toLocaleString("tr-TR")} ₺
              </div>
              <div className="mt-1 text-[11px] text-stone-400">Peşin / Kart ile ödenen</div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <span>Günün Toplam Cirosu</span>
                <Wallet className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-400 font-serif mt-2">
                {(courierSummary.grandTotal || 0).toLocaleString("tr-TR")} ₺
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                {courierSummary.deliveredCount} teslim / {courierSummary.totalOrders} toplam sipariş
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: HIZLI FİŞ KES (ÜRÜN SEÇİMLİ & DİJİTAL FİŞ) */}
      {/* ========================================================================= */}
      {quickSlipModalOpen && selectedCariForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-100 text-base">
                    {selectedCariForSlip.businessName} - Hızlı Fiş Kes
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Mevcut Bakiye:{" "}
                    <strong className="text-amber-400">
                      {(selectedCariForSlip.balance || 0).toLocaleString("tr-TR")} ₺
                    </strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setQuickSlipModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSlip} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Target Cari Selector (if user wants to switch) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Firma / Cari Seçimi</label>
                <select
                  value={selectedCariForSlip.id}
                  onChange={(e) => {
                    const found = cariler.find((c) => c.id === e.target.value);
                    if (found) setSelectedCariForSlip(found);
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-bold focus:outline-none focus:border-amber-500"
                >
                  {cariler.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({(c.balance || 0).toLocaleString("tr-TR")} ₺)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Note Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Teslimat Tarihi</label>
                  <input
                    type="date"
                    required
                    value={slipDate}
                    onChange={(e) => setSlipDate(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Fiş / Teslimat Notu (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    placeholder="Sabah servisi, şefe teslim vb..."
                    value={slipNotes}
                    onChange={(e) => setSlipNotes(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Bread & Product Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-300 uppercase tracking-wider">
                    Ekmek & Ürün Seçimi
                  </span>
                  <span className="text-[11px] text-amber-400 font-medium">
                    Anlaşmalı Toptan Fiyatlar Uygulanır
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {activeProducts.map((prod) => {
                    const qty = slipQuantities[prod.id] || 0;
                    const customPrice = selectedCariForSlip.customPrices?.[prod.id];
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
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateSlipQuantity(prod.id, -1)}
                            disabled={qty === 0}
                            className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center disabled:opacity-20"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={qty || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setSlipQuantities((prev) => {
                                if (val === 0) {
                                  const copy = { ...prev };
                                  delete copy[prod.id];
                                  return copy;
                                }
                                return { ...prev, [prod.id]: val };
                              });
                            }}
                            className="w-12 h-7 bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-lg text-center font-mono font-bold text-xs text-stone-100 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => updateSlipQuantity(prod.id, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center shadow"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          {/* Quick Chips +5, +10 */}
                          <button
                            type="button"
                            onClick={() => updateSlipQuantity(prod.id, 5)}
                            className="px-1.5 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-[10px] font-mono font-bold border border-stone-700"
                            title="+5 Adet Ekle"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSlipQuantity(prod.id, 10)}
                            className="px-1.5 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-[10px] font-mono font-bold border border-stone-700"
                            title="+10 Adet Ekle"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Balance Summary & Collection Input */}
              <div className="p-4 bg-stone-950/90 border border-stone-800 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="text-[10px] text-stone-400">Önceki Bakiye</div>
                    <div className="font-bold font-mono text-stone-200 mt-0.5">
                      {(selectedCariForSlip.balance || 0).toLocaleString("tr-TR")} ₺
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] text-amber-400">(+) Bu Fiş</div>
                    <div className="font-bold font-mono text-amber-400 mt-0.5">
                      +{(quickSlipTotal || 0).toLocaleString("tr-TR")} ₺
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400">(-) Tahsilat</div>
                    <div className="font-bold font-mono text-emerald-400 mt-0.5">
                      -{slipPaymentCollected || 0} ₺
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-stone-950 border border-amber-500/40">
                    <div className="text-[10px] text-stone-300 font-bold">(=) Yeni Bakiye</div>
                    <div className="font-bold font-mono text-amber-400 mt-0.5">
                      {(((selectedCariForSlip.balance || 0) + quickSlipTotal - (slipPaymentCollected || 0)) || 0).toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                </div>

                {/* Inline Collection */}
                <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-stone-200">
                      Teslimatta Tahsilat Alındı mı?
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Nakit veya havale alındıysa girin (isteğe bağlı):
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="0 ₺"
                      value={slipPaymentCollected || ""}
                      onChange={(e) => setSlipPaymentCollected(Number(e.target.value))}
                      className="w-28 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 text-right"
                    />

                    <select
                      value={slipPaymentMethod}
                      onChange={(e) => setSlipPaymentMethod(e.target.value as any)}
                      className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300 focus:outline-none"
                    >
                      <option value="nakit">Nakit</option>
                      <option value="banka_havale">Havale</option>
                      <option value="kredi_karti">POS/Kart</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickSlipModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={slipSubmitting || quickSlipItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-bold rounded-xl text-xs transition-all shadow-lg shadow-artisan-terracotta/20 border border-artisan-gold/30 disabled:opacity-50 active:scale-95"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{slipSubmitting ? "Kaydediliyor..." : "Fişi Kes & Fişi Aç"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK TAHSİLAT / ÖDEME MODAL */}
      {/* ========================================================================= */}
      {payModalOpen && selectedCariForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <DollarSign
                  className={`w-5 h-5 ${payType === "tahsilat" ? "text-emerald-400" : "text-red-400"}`}
                />
                <h3 className="font-bold text-stone-100 font-serif text-base">
                  {payType === "tahsilat" ? "Cari Tahsilat Al" : "Ödeme / Masraf Kaydet"}
                </h3>
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
                <div className="text-xs text-stone-400">Hesap / Firma:</div>
                <div className="font-bold text-stone-100">{selectedCariForPay.businessName}</div>
                <div className="text-xs text-stone-400 mt-1">
                  Mevcut Bakiye:{" "}
                  <strong className="text-amber-400">
                    {(selectedCariForPay.balance || 0).toLocaleString("tr-TR")} ₺
                  </strong>
                </div>
              </div>

              {/* Type Switcher */}
              <div className="flex items-center gap-2 p-1 bg-stone-950 border border-stone-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPayType("tahsilat")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    payType === "tahsilat"
                      ? "bg-emerald-500 text-stone-950 shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Tahsilat (Para Girişi)
                </button>
                <button
                  type="button"
                  onClick={() => setPayType("odeme")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    payType === "odeme"
                      ? "bg-red-500 text-stone-950 shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Ödeme (Para Çıkışı)
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tutar (₺)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount || ""}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="0"
                  className={`w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-base font-bold font-mono focus:outline-none ${
                    payType === "tahsilat"
                      ? "text-emerald-400 focus:border-emerald-500"
                      : "text-red-400 focus:border-red-500"
                  }`}
                />
              </div>

              {/* Live Mathematical Preview */}
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-stone-400">
                  <span>Mevcut Bakiye:</span>
                  <span className="font-bold text-stone-200">
                    {(selectedCariForPay.balance || 0).toLocaleString("tr-TR")} ₺
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={payType === "tahsilat" ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {payType === "tahsilat" ? "(-) Tahsilat (Para Girişi):" : "(+) Müşteriye Ödeme / İade:"}
                  </span>
                  <span className={`font-bold ${payType === "tahsilat" ? "text-emerald-400" : "text-amber-400"}`}>
                    {payType === "tahsilat" ? "-" : "+"}{(payAmount || 0).toLocaleString("tr-TR")} ₺
                  </span>
                </div>
                <div className="border-t border-stone-800 pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-stone-300">İşlem Sonrası Yeni Bakiye:</span>
                  <span
                    className={
                      (payType === "tahsilat"
                        ? (selectedCariForPay.balance || 0) - (payAmount || 0)
                        : (selectedCariForPay.balance || 0) + (payAmount || 0)
                      ) > 0
                        ? "text-amber-400"
                        : (payType === "tahsilat"
                            ? (selectedCariForPay.balance || 0) - (payAmount || 0)
                            : (selectedCariForPay.balance || 0) + (payAmount || 0)
                          ) < 0
                        ? "text-emerald-400"
                        : "text-stone-300"
                    }
                  >
                    {(
                      payType === "tahsilat"
                        ? (selectedCariForPay.balance || 0) - (payAmount || 0)
                        : (selectedCariForPay.balance || 0) + (payAmount || 0)
                    ).toLocaleString("tr-TR")}{" "}
                    ₺
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Ödeme Yöntemi</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="banka_havale">Banka Havalesi / EFT</option>
                    <option value="nakit">Elden Nakit</option>
                    <option value="kredi_karti">Kredi Kartı / POS</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Tarih</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama / Not</label>
                <input
                  type="text"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  placeholder={payType === "tahsilat" ? "Örn: Eylül ayı ekmek tahsilatı" : "Örn: Odun ödemesi"}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
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
                  className={`flex items-center gap-2 px-5 py-2 font-bold rounded-xl text-xs transition-all shadow-lg disabled:opacity-50 ${
                    payType === "tahsilat"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20"
                      : "bg-red-500 hover:bg-red-400 text-stone-950 shadow-red-500/20"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{paySubmitting ? "Kaydediliyor..." : payType === "tahsilat" ? "Tahsilatı Onayla" : "Ödemeyi Onayla"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT CARI MODAL */}
      {/* ========================================================================= */}
      {cariModalOpen && editingCari && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {isNewCari ? "Yeni Cari / Hesap Tanımla" : "Cariyi & Özel Fiyatları Düzenle"}
                </h3>
              </div>
              <button
                onClick={() => setCariModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCari} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Account Type Selector */}
              <div className="flex items-center gap-2 p-1.5 bg-stone-950 border border-stone-800 rounded-xl">
                <button
                  type="button"
                  onClick={() =>
                    setEditingCari({ ...editingCari, accountType: "musteri" })
                  }
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    editingCari.accountType !== "gider"
                      ? "bg-amber-500 text-stone-950 shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Kurumsal Müşteri (Şarküteri, Kafe, Restoran)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingCari({ ...editingCari, accountType: "gider" })
                  }
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    editingCari.accountType === "gider"
                      ? "bg-red-500 text-stone-950 shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Gider / Tedarikçi Hesabı (Dükkan Masrafları, Un, Odun vb.)
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-300">
                    {editingCari.accountType === "gider"
                      ? "Gider / Hesap Adı"
                      : "Firma / Kafe / Şarküteri Adı"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      editingCari.accountType === "gider"
                        ? "Örn: Dükkan Giderleri, Oduncu, Uncu Mehmet"
                        : "Örn: EspressoLab Marina Şubesi"
                    }
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
                  <label className="text-xs font-semibold text-stone-300">
                    Vergi No / T.C. (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    placeholder="Vergi no veya T.C."
                    value={editingCari.taxNumber || ""}
                    onChange={(e) => setEditingCari({ ...editingCari, taxNumber: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-amber-400 flex items-center justify-between">
                    <span>{isNewCari ? "Açılış / Devir Bakiyesi (₺)" : "Güncel Bakiye (₺)"}</span>
                    <span className="text-[10px] text-stone-500 font-normal">
                      {isNewCari ? "Başlangıç borcu varsa" : "Doğrudan düzeltilebilir"}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={editingCari.balance !== undefined ? editingCari.balance : ""}
                      onChange={(e) =>
                        setEditingCari({
                          ...editingCari,
                          balance: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-amber-500/50 rounded-xl px-3 py-2 text-sm font-bold font-mono text-amber-400 focus:outline-none focus:border-amber-400 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">
                      ₺
                    </span>
                  </div>
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

              {/* Custom Prices Section (For Customers) */}
              {editingCari.accountType !== "gider" && (
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

                  <div className="border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800 max-h-56 overflow-y-auto">
                    {activeProducts.map((prod) => {
                      const currentCustom = editingCari.customPrices?.[prod.id];

                      return (
                        <div
                          key={prod.id}
                          className="p-3 bg-stone-950/40 flex items-center justify-between gap-4 hover:bg-stone-900 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-stone-200">{prod.name}</div>
                            <div className="text-[11px] text-stone-500">
                              Normal Perakende:{" "}
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
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setCariModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{isNewCari ? "Cariyi Kaydet" : "Değişiklikleri Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: NEW EXPENSE MODAL */}
      {/* ========================================================================= */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-base">Yeni Gider Kaydet</h3>
              </div>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Gider Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 10 Çuval Taş Değirmen Unu"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
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
                    value={expenseAmount || ""}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-red-400 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Tarih</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Kategori</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="hammadde">Hammadde (Un, Maya vb.)</option>
                    <option value="yakit_kurye">Yakıt & Kurye</option>
                    <option value="ambalaj">Ambalaj & Koli</option>
                    <option value="fatura_kira">Fatura & Enerji</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Ödeme Yöntemi</label>
                  <select
                    value={expensePayMethod}
                    onChange={(e) => setExpensePayMethod(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="banka_havale">Banka Havalesi / EFT</option>
                    <option value="nakit">Nakit</option>
                    <option value="kredi_karti">Şirket Kartı</option>
                    <option value="cari_borc">Cari Borç</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Notlar (İsteğe Bağlı)</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Fatura no veya tedarikçi detayı..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting || expenseAmount <= 0}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{expenseSubmitting ? "Kaydediliyor..." : "Gideri Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DİJİTAL FİŞ GÖRÜNTÜLEME MODALI (OrderSlipModal) */}
      {/* ========================================================================= */}
      {slipModalOpen && activeSlipOrder && (
        <OrderSlipModal
          order={activeSlipOrder}
          isOpen={slipModalOpen}
          onClose={() => {
            setSlipModalOpen(false);
            setActiveSlipOrder(null);
          }}
          cari={selectedCariForSlip}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: KURYE Z RAPORU FİŞİ MODALI */}
      {/* ========================================================================= */}
      <CourierSettlementModal
        isOpen={courierSettlementModalOpen}
        onClose={() => setCourierSettlementModalOpen(false)}
        date={selectedSettlementDate}
        orders={dayOrders}
        summary={courierSummary}
      />

      {/* ========================================================================= */}
      {/* MODAL 7: QUICK BALANCE ADJUSTMENT MODAL (Devir / Bakiye Düzeltme) */}
      {/* ========================================================================= */}
      {balanceAdjustModalOpen && selectedCariForBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-base">
                  Cari Bakiye Ayarla / Devir Girişi
                </h3>
              </div>
              <button
                onClick={() => setBalanceAdjustModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBalanceAdjust} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="text-xs text-stone-400">Firma / Cari:</div>
                <div className="font-bold text-stone-100 text-sm">
                  {selectedCariForBalance.businessName}
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  Sistemdeki Mevcut Bakiye:{" "}
                  <strong className="text-amber-400">
                    {(selectedCariForBalance.balance || 0).toLocaleString("tr-TR")} ₺
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">
                  Yeni Güncel Bakiye (₺)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={newBalanceInput !== undefined ? newBalanceInput : ""}
                    onChange={(e) =>
                      setNewBalanceInput(e.target.value === "" ? 0 : Number(e.target.value))
                    }
                    placeholder="0"
                    className="w-full bg-stone-950 border border-amber-500/60 rounded-xl px-3 py-2.5 text-lg font-bold font-mono text-amber-400 focus:outline-none focus:border-amber-400 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500">
                    ₺
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Müşterinin borcunu doğrudan sıfırlamak veya net bakiyesini yazmak için yeni rakamı girin.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">
                  Düzeltme Nedeni / Açıklama (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={balanceAdjustReason}
                  onChange={(e) => setBalanceAdjustReason(e.target.value)}
                  placeholder="Örn: Açılış devri, mutabakat düzeltmesi vb."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setBalanceAdjustModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={balanceAdjustSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{balanceAdjustSubmitting ? "Güncelleniyor..." : "Bakiyeyi Güncelle"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
