"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  ArrowLeft,
  Printer,
  Plus,
  DollarSign,
  Receipt,
  Calendar,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  PlusCircle,
  Minus,
  Check,
  Share2,
  Trash2,
  Eye,
  RotateCcw,
  FileText,
  Wallet,
  Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCariler } from "@/hooks/useCariler";
import { useProducts, INITIAL_PRODUCTS } from "@/hooks/useProducts";
import { CariAccount, CariTransaction, AdminOrder, OrderItem } from "@/types/admin";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";

export default function CariDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cariId = params?.id as string;

  const { addTransaction, setManualBalance, deleteTransaction } = useCariler();
  const { products } = useProducts("all");

  const [cari, setCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"satis" | "tahsilat" | "odeme">("tahsilat");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDescription, setTxDescription] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [txMethod, setTxMethod] = useState<"banka_havale" | "nakit" | "kredi_karti">("banka_havale");
  const [submitting, setSubmitting] = useState(false);

  // Quick Digital Fiş Modal State
  const [quickSlipModalOpen, setQuickSlipModalOpen] = useState(false);
  const [slipQuantities, setSlipQuantities] = useState<Record<string, number>>({});
  const [slipFreeItems, setSlipFreeItems] = useState<Record<string, boolean>>({});
  const [slipStaleReturn, setSlipStaleReturn] = useState<number>(0);
  const [slipDiscount, setSlipDiscount] = useState<number>(0);
  const [slipDate, setSlipDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [slipPaymentCollected, setSlipPaymentCollected] = useState<number>(0);
  const [slipPaymentMethod, setSlipPaymentMethod] = useState<"nakit" | "banka_havale" | "kredi_karti">("nakit");
  const [slipNotes, setSlipNotes] = useState<string>("");
  const [slipSubmitting, setSlipSubmitting] = useState(false);

  // Digital Slip Preview Modal (OrderSlipModal)
  const [activeSlipOrder, setActiveSlipOrder] = useState<AdminOrder | null>(null);
  const [slipModalOpen, setSlipModalOpen] = useState(false);

  // Quick Balance Adjustment Modal
  const [balanceAdjustModalOpen, setBalanceAdjustModalOpen] = useState(false);
  const [newBalanceInput, setNewBalanceInput] = useState<number>(0);
  const [balanceAdjustReason, setBalanceAdjustReason] = useState<string>("");
  const [balanceAdjustSubmitting, setBalanceAdjustSubmitting] = useState(false);

  const openBalanceAdjustModal = () => {
    if (!cari) return;
    setNewBalanceInput(cari.balance || 0);
    setBalanceAdjustReason("Açılış / Bakiye Düzeltme Devri");
    setBalanceAdjustModalOpen(true);
  };

  const handleSaveBalanceAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cari) return;
    setBalanceAdjustSubmitting(true);
    const res = await setManualBalance(
      cari.id,
      Number(newBalanceInput || 0),
      balanceAdjustReason || "Bakiye Düzeltme"
    );
    if (res.success) {
      setCari((prev) => (prev ? { ...prev, balance: Number(newBalanceInput || 0) } : null));
      setBalanceAdjustModalOpen(false);
      fetchCariData();
    } else {
      alert("Bakiye güncellenirken hata: " + res.error);
    }
    setBalanceAdjustSubmitting(false);
  };

  // Active Tab
  const [activeTab, setActiveTab] = useState<"ekstre" | "fiyatlar">("ekstre");

  // Fetch Cari details and calculate Running Balance
  const fetchCariData = async () => {
    if (!cariId) return;

    const supabase = createClient();
    if (!supabase) return;

    try {
      // 1. Fetch Account
      const { data: acc } = await (supabase as any)
        .from("current_accounts")
        .select("*")
        .eq("id", cariId)
        .single();

      let currentAcc: CariAccount | null = null;
      if (acc) {
        currentAcc = {
          id: acc.id,
          businessName: acc.name || "Cari Hesap",
          contactPerson: acc.type || "",
          phone: acc.phone || "",
          address: acc.address || "",
          neighborhood: "",
          taxNumber: acc.tax_id || "",
          taxOffice: "",
          balance: Number(acc.balance) || 0,
          accountType: acc.type === "gider" || (acc.name && acc.name.toLowerCase().includes("gider")) ? "gider" : "musteri",
          notes: acc.status || "",
          createdAt: acc.created_at,
          updatedAt: acc.updated_at,
        };
        setCari(currentAcc);
      }

      // 2. Fetch Transactions ordered chronologically ascending to compute running balances
      const { data: txs } = await (supabase as any)
        .from("account_transactions")
        .select("*")
        .eq("account_id", cariId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (txs) {
        const isExpense = currentAcc?.accountType === "gider";
        const mapped: CariTransaction[] = txs.map((t: any) => {
          const descLower = (t.description || "").toLowerCase();
          let txType: "satis" | "tahsilat" | "odeme" | "devir" = "satis";

          if (descLower.includes("devir") || descLower.includes("açılış") || descLower.includes("düzeltme")) {
            txType = "devir";
          } else if (t.type === "debt") {
            txType = "satis";
          } else if (t.type === "credit") {
            txType = isExpense ? "odeme" : "tahsilat";
          }

          // Extract slipNumber if present in description e.g. [FİŞ-2609-001]
          const slipMatch = (t.description || "").match(/\[(FİŞ-[^\]]+)\]/i);
          const slipNumber = slipMatch ? slipMatch[1] : undefined;

          return {
            id: t.id,
            cariId: t.account_id,
            date: t.date ? new Date(t.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            type: txType,
            amount: Number(t.amount) || 0,
            description: t.description || "",
            paymentMethod: "banka_havale",
            orderId: t.order_id,
            slipNumber,
            createdAt: t.created_at,
          };
        });

        // Compute delta for each transaction
        // debt (Satış, borç devri): +amount
        // credit (Tahsilat, ödeme, alacak devri): -amount
        const getDelta = (t: CariTransaction, originalType: string) => {
          if (originalType === "credit") return -t.amount;
          if (originalType === "debt") return t.amount;
          if (t.type === "tahsilat") return -t.amount;
          if (t.type === "odeme") return isExpense ? -t.amount : t.amount;
          return t.amount;
        };

        const totalDelta = mapped.reduce((sum, t, idx) => sum + getDelta(t, txs[idx]?.type), 0);
        const currentBal = currentAcc ? currentAcc.balance : 0;
        const startBal = currentBal - totalDelta;
        setStartingBalance(Math.round(startBal * 100) / 100);

        let running = startBal;
        const txsWithBalance = mapped.map((t, idx) => {
          running += getDelta(t, txs[idx]?.type);
          return {
            ...t,
            balanceAfter: Math.round(running * 100) / 100,
          };
        });

        // Store newest first for the user-facing ledger view
        setTransactions([...txsWithBalance].reverse());
      }
    } catch (err) {
      console.warn("Cari fetch notice:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cariId) return;

    fetchCariData();

    const supabase = createClient();
    if (!supabase) return;

    const channelId = `cari-detail-${cariId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_transactions", filter: `account_id=eq.${cariId}` },
        () => {
          fetchCariData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cariId]);

  // Delete transaction with automatic reverse balance adjustment (Ters Kayıt)
  const handleDeleteTransaction = async (tx: CariTransaction) => {
    if (!cari) return;

    const isSale = tx.type === "satis";
    const isTahsilat = tx.type === "tahsilat";
    const actionDesc = isSale ? "satış / fiş kaydını" : isTahsilat ? "tahsilat kaydını" : "işlem kaydını";
    const confirmMessage = `Bu ${actionDesc} silmek ve iptal etmek istediğinize emin misiniz?\n\nİşlem: ${tx.description}\nTutar: ${tx.amount.toLocaleString("tr-TR")} ₺\n\nSilindiğinde cari bakiye otomatik olarak ters kayıt ile düzeltilecektir.`;

    if (!window.confirm(confirmMessage)) return;

    const isCredit = tx.type === "tahsilat" || (tx.type === "odeme" && cari.accountType === "gider");
    const res = await deleteTransaction(
      cari.id,
      tx.id,
      tx.type,
      tx.amount,
      cari.accountType,
      isCredit
    );

    if (res.success) {
      // Re-fetch to get complete, exact state from database
      await fetchCariData();
    } else {
      alert("İşlem silinirken hata oluştu: " + res.error);
    }
  };

  // Open Quick Digital Fiş Modal
  const handleOpenQuickSlipModal = () => {
    setSlipQuantities({});
    setSlipFreeItems({});
    setSlipStaleReturn(0);
    setSlipDiscount(0);
    setSlipDate(new Date().toISOString().split("T")[0]);
    setSlipPaymentCollected(0);
    setSlipNotes("");
    setQuickSlipModalOpen(true);
  };

  // Toggle item as free/ikram
  const toggleSlipFreeItem = (productId: string) => {
    setSlipFreeItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
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

  // Calculate items for Quick Fiş using agreed prices and free/ikram overrides
  const activeProducts = products.length > 0 ? products : INITIAL_PRODUCTS;

  const quickSlipItems: OrderItem[] = useMemo(() => {
    return Object.entries(slipQuantities)
      .map(([pId, qty]) => {
        const prod = activeProducts.find((p) => p.id === pId);
        if (!prod || qty <= 0) return null;

        const isFree = Boolean(slipFreeItems[pId]);
        const customPrice = cari?.customPrices?.[pId];
        const normalPrice = customPrice !== undefined ? customPrice : prod.price;
        const unitPrice = isFree ? 0 : normalPrice;

        return {
          productId: prod.id,
          productName: isFree ? `${prod.name} (İkram)` : prod.name,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
          weight: prod.weight,
        };
      })
      .filter(Boolean) as OrderItem[];
  }, [slipQuantities, slipFreeItems, activeProducts, cari]);

  const rawSlipSubtotal = quickSlipItems.reduce((sum, it) => sum + it.totalPrice, 0);
  const quickSlipTotal = Math.max(0, rawSlipSubtotal - (slipStaleReturn || 0) - (slipDiscount || 0));

  // Submit Quick Fiş with Sequential Numbering (FİŞ-2609-001) & Deductions
  const handleSaveQuickSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cari || quickSlipItems.length === 0) return;

    setSlipSubmitting(true);
    try {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const slipsCount = transactions.filter((t) => t.type === "satis").length + 1;
      const seq = String(slipsCount).padStart(3, "0");
      const generatedSlipNumber = `FİŞ-${yy}${mm}-${seq}`;

      const itemsSummary = quickSlipItems
        .map((it) => `${it.quantity}x ${it.productName}${it.unitPrice > 0 ? ` (${it.unitPrice}₺)` : ""}`)
        .join(", ");

      const deductionDetails: string[] = [];
      if (slipStaleReturn > 0) deductionDetails.push(`Bayat İadesi: -${slipStaleReturn}₺`);
      if (slipDiscount > 0) deductionDetails.push(`İskonto: -${slipDiscount}₺`);

      const fullDescription = `[${generatedSlipNumber}] ${itemsSummary}${
        deductionDetails.length > 0 ? ` [${deductionDetails.join(", ")}]` : ""
      }`;

      const generatedOrderId = `ord_${Date.now().toString(36)}`;

      // 1. Record Sale (Borç) Transaction
      const res = await addTransaction(cari.id, {
        type: "satis",
        amount: quickSlipTotal,
        description: fullDescription,
        date: slipDate,
        orderId: generatedOrderId,
      });

      // 2. If payment was collected at delivery, record collection transaction
      if (slipPaymentCollected > 0) {
        await addTransaction(cari.id, {
          type: "tahsilat",
          amount: Number(slipPaymentCollected),
          description: `Teslimatta Tahsilat - ${generatedSlipNumber} (${slipPaymentMethod === "nakit" ? "Nakit" : slipPaymentMethod === "banka_havale" ? "Havale" : "POS"})`,
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
          orderNumber: generatedSlipNumber,
          customerName: cari.businessName,
          phone: cari.phone,
          deliveryAddress: cari.address || "Belirtilmemiş",
          neighborhood: cari.neighborhood || "Beylikdüzü",
          deliveryMethod: "courier",
          deliveryDate: slipDate,
          deliveryTimeWindow: "14:00 - 18:00",
          items: quickSlipItems,
          subtotal: rawSlipSubtotal,
          shippingFee: 0,
          totalAmount: quickSlipTotal,
          status: "teslim_edildi",
          paymentMethod: "cari",
          paymentStatus: "paid",
          source: "whatsapp",
          cariId: cari.id,
          orderNotes: slipNotes ? `${slipNotes}${deductionDetails.length > 0 ? ` • ${deductionDetails.join(", ")}` : ""}` : deductionDetails.join(", "),
          createdAt: new Date().toISOString(),
        };

        // Pop up the digital fiş modal immediately
        setActiveSlipOrder(slipOrder);
        setSlipModalOpen(true);
        fetchCariData();
      } else {
        alert("Fiş kaydedilirken hata: " + res.error);
      }
    } finally {
      setSlipSubmitting(false);
    }
  };

  // WhatsApp Statement Share Link
  const handleSendWhatsAppStatement = () => {
    if (!cari) return;
    const cleanPhone = cari.phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("90")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `9${cleanPhone}`
      : `90${cleanPhone}`;

    const origin = typeof window !== "undefined" ? window.location.origin : "https://ekmeklab.tr";
    const statementUrl = `${origin}/ekstre/${cari.id}`;

    const text = [
      `🍞 *EKMEKLAB TAŞ FIRIN - CARİ HESAP EKSTRESİ*`,
      `Sayın *${cari.businessName}*,`,
      ``,
      `📊 *Güncel Kalan Bakiye:* ${cari.balance.toLocaleString("tr-TR")} ₺`,
      `📅 *Tarih:* ${new Date().toLocaleDateString("tr-TR")}`,
      ``,
      `🔗 *Canlı Ekstre & Teslimat Dökümünüz:*`,
      statementUrl,
      ``,
      `Tüm teslimat fişlerinizi ve ödeme hareketlerinizi yukarıdaki bağlantıdan anlık olarak inceleyebilirsiniz.`,
      `Bereketli işler dileriz!`,
      `EkmekLab Zanaatkar Fırın • 0530 638 97 73`,
    ].join("\n");

    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Open existing transaction as Digital Fiş
  const handleViewTransactionSlip = (tx: CariTransaction) => {
    if (!cari) return;

    // Parse items if available in description
    const desc = tx.description || "";
    const items: OrderItem[] = [];

    // Synthetic single item if not parsed
    items.push({
      productId: "custom",
      productName: desc.replace(/^Fiş:\s*/i, "") || "Toptan Ekmek Teslimatı",
      quantity: 1,
      unitPrice: tx.amount,
      totalPrice: tx.amount,
    });

    const slipOrder: AdminOrder = {
      id: tx.id || `tx_${Date.now()}`,
      orderNumber: (tx.id || "").substring(0, 6).toUpperCase() || "CARİ",
      customerName: cari.businessName,
      phone: cari.phone,
      deliveryAddress: cari.address || "",
      neighborhood: cari.neighborhood || "Beylikdüzü",
      deliveryMethod: "courier",
      deliveryDate: tx.date,
      items: items,
      subtotal: tx.amount,
      shippingFee: 0,
      totalAmount: tx.amount,
      status: "teslim_edildi",
      paymentMethod: "cari",
      paymentStatus: "paid",
      source: "whatsapp",
      cariId: cari.id,
      createdAt: tx.createdAt || new Date().toISOString(),
    };

    setActiveSlipOrder(slipOrder);
    setSlipModalOpen(true);
  };

  // Open Simple Transaction Modal (Satış / Tahsilat / Ödeme)
  const openModal = (type: "satis" | "tahsilat" | "odeme") => {
    setTxType(type);
    setTxAmount(0);
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxDescription(
      type === "satis"
        ? "Toplu ekmek teslimatı"
        : type === "tahsilat"
        ? "Banka havalesi ile cari tahsilat"
        : "Cariye yapılan ödeme / masraf"
    );
    setTxModalOpen(true);
  };

  // Submit Simple Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cari || txAmount <= 0) return;

    setSubmitting(true);
    const res = await addTransaction(cari.id, {
      type: txType,
      amount: Number(txAmount),
      description: txDescription,
      date: txDate,
      paymentMethod: txMethod,
    });

    if (res.success) {
      setTxModalOpen(false);
    } else {
      alert("Hareket kaydedilirken hata: " + res.error);
    }
    setSubmitting(false);
  };

  // Print Statement
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-stone-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Cari bilgileri yükleniyor...
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="p-16 text-center text-stone-400 space-y-4">
        <div>Aradığınız cari hesap bulunamadı.</div>
        <Link
          href="/admin/cariler"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-stone-200 rounded-xl text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Cariler Listesine Dön
        </Link>
      </div>
    );
  }

  const customPricesList = Object.entries(cari.customPrices || {});

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Action Bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/cariler"
          className="flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tüm Carilere Dön</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Action: + Hızlı Fiş Kes */}
          <button
            onClick={handleOpenQuickSlipModal}
            className="flex items-center gap-2 px-4 py-2 bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-bold rounded-xl text-xs shadow-lg shadow-artisan-terracotta/20 transition-all active:scale-95 border border-artisan-gold/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ Hızlı Fiş Kes (Ürün Seç)</span>
          </button>

          <button
            onClick={() => openModal("tahsilat")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>+ Tahsilat Al</span>
          </button>

          {/* WhatsApp Canlı Ekstre Gönder */}
          <button
            onClick={handleSendWhatsAppStatement}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            title="Müşteriye Canlı Ekstre Linkini WhatsApp'tan Gönder"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Ekstre Gönder</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold border border-stone-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Yazdır</span>
          </button>
        </div>
      </div>

      {/* Account Profile Header */}
      <div className="bg-stone-900/80 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                Kurumsal Müşteri
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700">
                {cari.neighborhood || "Beylikdüzü"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
              {cari.businessName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
              <span className="text-stone-300 font-medium">Yetkili: {cari.contactPerson}</span>
              <span>•</span>
              <a
                href={`tel:${cari.phone}`}
                className="flex items-center gap-1 text-stone-300 hover:text-amber-400 font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>{cari.phone}</span>
              </a>
              {cari.phone && (
                <a
                  href={`https://wa.me/90${cari.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  title="WhatsApp'tan Aç"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Current Balance Card */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl min-w-[220px] text-right space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-400 uppercase tracking-wider">
              <button
                type="button"
                onClick={openBalanceAdjustModal}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold"
                title="Bakiyeyi doğrudan değiştir veya devir gir"
              >
                ⚙️ Bakiye Ayarla
              </button>
              <span>Güncel Cari Bakiye</span>
            </div>
            <div
              onClick={openBalanceAdjustModal}
              className={`text-2xl font-bold font-serif cursor-pointer hover:underline ${
                cari.balance > 0
                  ? "text-amber-400"
                  : cari.balance < 0
                  ? "text-emerald-400"
                  : "text-stone-300"
              }`}
              title="Bakiyeyi doğrudan düzenlemek için tıklayın"
            >
              {(cari.balance || 0).toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-[11px] text-stone-400">
              {cari.balance > 0
                ? "Alacağımız Var"
                : cari.balance < 0
                ? "Avans / Fazla Ödeme"
                : "Hesap Dengede"}
            </div>
          </div>
        </div>

        {/* Info Rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-300">
          <div>
            <span className="text-stone-500 block mb-0.5">Açık Adres:</span>
            <span>{cari.address || "Belirtilmemiş"}</span>
          </div>
          <div>
            <span className="text-stone-500 block mb-0.5">Vergi Dairesi / No:</span>
            <span>
              {cari.taxOffice || "—"} / {cari.taxNumber || "—"}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block mb-0.5">Kayıt Tarihi:</span>
            <span>{new Date(cari.createdAt).toLocaleDateString("tr-TR")}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="print:hidden flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab("ekstre")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "ekstre"
              ? "bg-amber-500 text-stone-950"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Hesap Hareketleri & Fişler ({transactions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("fiyatlar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "fiyatlar"
              ? "bg-amber-500 text-stone-950"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>İkili Anlaşmalı Fiyat Listesi ({customPricesList.length})</span>
        </button>
      </div>

      {/* TAB 1: Ekstre / Hareketler & Fişler */}
      {activeTab === "ekstre" && (
        <div className="space-y-4">
          {/* Summary Mini-Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Toplam Borç (Satışlar)
              </div>
              <div className="text-xl font-bold font-serif text-amber-400 mt-1">
                +{(transactions.reduce((sum, tx) => tx.type === "satis" || (tx.type === "devir" && tx.amount > 0) ? sum + tx.amount : sum, 0)).toLocaleString("tr-TR")} ₺
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Toplam Alacak (Tahsilatlar)
              </div>
              <div className="text-xl font-bold font-serif text-emerald-400 mt-1">
                -{(transactions.reduce((sum, tx) => tx.type === "tahsilat" || tx.type === "odeme" ? sum + tx.amount : sum, 0)).toLocaleString("tr-TR")} ₺
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Güncel Kalan Bakiye
              </div>
              <div className={`text-xl font-bold font-serif mt-1 ${
                cari.balance > 0 ? "text-amber-400" : cari.balance < 0 ? "text-emerald-400" : "text-stone-300"
              }`}>
                {(cari.balance || 0).toLocaleString("tr-TR")} ₺
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-stone-400 text-xs">
                Bu cari hesaba ait henüz işlem hareketi (satış veya tahsilat) bulunmuyor.
                <div className="mt-4">
                  <button
                    onClick={handleOpenQuickSlipModal}
                    className="px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    İlk Fişi Kesin
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/60">
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">Belge No / İşlem</th>
                      <th className="py-3 px-4">Açıklama / Detay</th>
                      <th className="py-3 px-4 text-right">Borç (+) [Satış]</th>
                      <th className="py-3 px-4 text-right">Alacak (-) [Tahsilat]</th>
                      <th className="py-3 px-4 text-right">Kalan Bakiye</th>
                      <th className="py-3 px-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/70 text-xs">
                    {transactions.map((tx) => {
                      const isSale = tx.type === "satis";
                      const isTahsilat = tx.type === "tahsilat";
                      const isDevir = tx.type === "devir";
                      const isOdeme = tx.type === "odeme";

                      const isDebt = isSale || (isDevir && tx.amount > 0);
                      const isCredit = isTahsilat || isOdeme;

                      return (
                        <tr key={tx.id} className="hover:bg-stone-800/30 transition-colors">
                          {/* Tarih */}
                          <td className="py-3 px-4 font-mono text-stone-300 whitespace-nowrap">
                            {tx.date}
                          </td>

                          {/* Belge No / İşlem Türü */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {isSale ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 text-[11px]">
                                  {tx.slipNumber || (tx.orderId ? `#${tx.orderId.substring(4, 10).toUpperCase()}` : "FİŞ")}
                                </span>
                              ) : isTahsilat ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-[11px]">
                                  TAHSİLAT
                                </span>
                              ) : isDevir ? (
                                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20 text-[11px]">
                                  DEVİR
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20 text-[11px]">
                                  ÖDEME
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Açıklama / Detay */}
                          <td className="py-3 px-4 font-medium text-stone-200 max-w-sm">
                            <div className="truncate" title={tx.description}>
                              {tx.description}
                            </div>
                            {tx.paymentMethod && (
                              <div className="text-[10px] text-stone-500 mt-0.5 font-sans">
                                Ödeme: {tx.paymentMethod === "nakit" ? "Nakit" : tx.paymentMethod === "banka_havale" ? "Banka Havale" : tx.paymentMethod === "kredi_karti" ? "Kredi Kartı / POS" : tx.paymentMethod}
                              </div>
                            )}
                          </td>

                          {/* Borç (+) [Satış] */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                            {isDebt ? `+${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                          </td>

                          {/* Alacak (-) [Tahsilat] */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {isCredit ? `-${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                          </td>

                          {/* Yürüyen Bakiye (Balance After) */}
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                            {tx.balanceAfter !== undefined ? (
                              <span
                                className={
                                  tx.balanceAfter > 0
                                    ? "text-amber-400"
                                    : tx.balanceAfter < 0
                                    ? "text-emerald-400"
                                    : "text-stone-400"
                                }
                              >
                                {tx.balanceAfter.toLocaleString("tr-TR")} ₺
                              </span>
                            ) : (
                              <span className="text-stone-500">—</span>
                            )}
                          </td>

                          {/* İşlemler */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {isSale && (
                                <button
                                  onClick={() => handleViewTransactionSlip(tx)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-colors"
                                  title="Dijital Fişi Gör & Paylaş"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Fiş</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteTransaction(tx)}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Bu işlemi iptal et / sil (Ters kayıt ile bakiye düzeltilir)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Initial Starting Balance Row if present */}
                    {startingBalance !== 0 && (
                      <tr className="bg-stone-950/40 text-stone-400 italic">
                        <td className="py-3 px-4 font-mono">—</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 font-semibold text-[11px]">
                            AÇILIŞ
                          </span>
                        </td>
                        <td className="py-3 px-4">Önceki Dönemden Devreden Açılış Bakiyesi</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-400">
                          {startingBalance > 0 ? `+${startingBalance.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-400">
                          {startingBalance < 0 ? `${startingBalance.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-300">
                          {startingBalance.toLocaleString("tr-TR")} ₺
                        </td>
                        <td className="py-3 px-4 text-center">—</td>
                      </tr>
                    )}
                  </tbody>

                  {/* Table Footer Totals */}
                  <tfoot>
                    <tr className="border-t-2 border-stone-800 bg-stone-950/80 font-semibold text-xs text-stone-300">
                      <td colSpan={3} className="py-3 px-4 uppercase tracking-wider text-[11px] text-stone-400">
                        GENEL TOPLAM ({transactions.length} İşlem)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                        +{(transactions.reduce((sum, tx) => tx.type === "satis" || (tx.type === "devir" && tx.amount > 0) ? sum + tx.amount : sum, 0)).toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        -{(transactions.reduce((sum, tx) => tx.type === "tahsilat" || tx.type === "odeme" ? sum + tx.amount : sum, 0)).toLocaleString("tr-TR")} ₺
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                        cari.balance > 0 ? "text-amber-400" : cari.balance < 0 ? "text-emerald-400" : "text-stone-300"
                      }`}>
                        {(cari.balance || 0).toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="py-3 px-4 text-center text-stone-500">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Anlaşmalı Fiyatlar */}
      {activeTab === "fiyatlar" && (
        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-100 font-serif">
                {cari.businessName} Özel Fiyat Tarifesi
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Bu müşteriye özel fiş kesildiğinde otomatik olarak uygulanan toptan birim fiyatlar.
              </p>
            </div>
          </div>

          {customPricesList.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs bg-stone-950/40 rounded-xl border border-stone-800">
              Bu firmaya tanımlanmış özel toptan fiyat bulunmuyor. Fişlerde standart vitrin fiyatları uygulanır.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customPricesList.map(([prodId, customPrice]) => {
                const product = activeProducts.find((p) => p.id === prodId);
                const retailPrice = product ? product.price : 0;
                const diff = retailPrice - customPrice;

                return (
                  <div
                    key={prodId}
                    className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-200">
                        {product ? product.name : prodId}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Standart Perakende: <span className="line-through">{retailPrice} ₺</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-amber-400 font-serif">
                        {customPrice} ₺
                      </div>
                      {diff > 0 && (
                        <div className="text-[10px] text-emerald-400 font-semibold">
                          %{Math.round((diff / retailPrice) * 100)} İskonto
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: HIZLI FİŞ KES (ÜRÜN SEÇİMLİ & DİJİTAL FİŞ) */}
      {quickSlipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-100 text-base">
                    {cari.businessName} - Hızlı Fiş Kes
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Mevcut Bakiye: <strong className="text-amber-400">{cari.balance.toLocaleString("tr-TR")} ₺</strong>
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
              {/* Date Input */}
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
                    placeholder="Sabah servisi, şefe elden teslim vb..."
                    value={slipNotes}
                    onChange={(e) => setSlipNotes(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Product Selection List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-300 uppercase tracking-wider">
                    Ekmek & Ürün Seçimi
                  </span>
                  <span className="text-[11px] text-amber-400 font-medium">
                    Anlaşmalı Toptan Fiyatlar Uygulanır
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {activeProducts.map((prod) => {
                    const qty = slipQuantities[prod.id] || 0;
                    const customPrice = cari?.customPrices?.[prod.id];
                    const activePrice = customPrice !== undefined ? customPrice : prod.price;
                    const isFree = Boolean(slipFreeItems[prod.id]);

                    return (
                      <div
                        key={prod.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                          qty > 0
                            ? "bg-amber-500/10 border-amber-500/40"
                            : "bg-stone-950/60 border-stone-800 hover:border-stone-700"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-stone-200 line-clamp-1">
                            {prod.name}
                          </div>
                          <div className="text-[11px] flex items-center gap-1.5 font-mono">
                            {isFree ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                                🎁 İkram (0 ₺)
                              </span>
                            ) : (
                              <>
                                <span className="text-amber-400 font-bold">{activePrice} ₺</span>
                                {customPrice !== undefined && (
                                  <span className="text-[10px] text-stone-500 line-through">
                                    {prod.price} ₺
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* İkram / Free Toggle */}
                          {qty > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleSlipFreeItem(prod.id)}
                              className={`px-1.5 h-7 rounded-lg text-[10px] font-bold flex items-center gap-0.5 transition-all ${
                                isFree
                                  ? "bg-purple-600 text-white shadow"
                                  : "bg-stone-800 hover:bg-stone-700 text-stone-400 border border-stone-700"
                              }`}
                              title="Bu ürünü ikram / numune olarak ver (0 ₺)"
                            >
                              <Gift className="w-2.5 h-2.5" />
                              <span>{isFree ? "İkram" : "İkram"}</span>
                            </button>
                          )}

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

              {/* Deductions: Bayat İadesi & İskonto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-rose-400 flex items-center justify-between">
                    <span>Bayat Ekmek İadesi / Fire (-₺)</span>
                    <span className="text-[10px] text-stone-500 font-normal">Dünkü kalanlar</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 ₺"
                    value={slipStaleReturn || ""}
                    onChange={(e) => setSlipStaleReturn(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-stone-900 border border-stone-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
                    <span>Genel İskonto / Yuvarlama (-₺)</span>
                    <span className="text-[10px] text-stone-500 font-normal">Tutar indirimi</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 ₺"
                    value={slipDiscount || ""}
                    onChange={(e) => setSlipDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Balance Summary & Collection Input */}
              <div className="p-4 bg-stone-950/90 border border-stone-800 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="text-[10px] text-stone-400">Önceki Bakiye</div>
                    <div className="font-bold font-mono text-stone-200 mt-0.5">
                      {cari.balance.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] text-amber-400">(+) Bu Fiş Tutarı</div>
                    <div className="font-bold font-mono text-amber-400 mt-0.5">
                      +{quickSlipTotal.toLocaleString("tr-TR")} ₺
                    </div>
                    {(slipStaleReturn > 0 || slipDiscount > 0) && (
                      <div className="text-[9px] text-stone-400">
                        (Ham: {rawSlipSubtotal} ₺)
                      </div>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400">(-) Tahsilat</div>
                    <div className="font-bold font-mono text-emerald-400 mt-0.5">
                      -{slipPaymentCollected || 0} ₺
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-stone-900 border border-amber-500/30">
                    <div className="text-[10px] text-stone-300">(=) Yeni Bakiye</div>
                    <div className="font-bold font-mono text-amber-400 mt-0.5">
                      {(cari.balance + quickSlipTotal - (slipPaymentCollected || 0)).toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                </div>

                {/* Optional instant collection input */}
                <div className="pt-2 border-t border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="text-xs text-stone-300 font-medium">
                    Teslimat anında tahsilat alındı mı?
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="0 ₺"
                      value={slipPaymentCollected || ""}
                      onChange={(e) => setSlipPaymentCollected(Number(e.target.value))}
                      className="w-24 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-bold font-mono text-emerald-400 text-right focus:outline-none"
                    />
                    <select
                      value={slipPaymentMethod}
                      onChange={(e) => setSlipPaymentMethod(e.target.value as any)}
                      className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-300 focus:outline-none"
                    >
                      <option value="nakit">Nakit</option>
                      <option value="banka_havale">Havale</option>
                      <option value="kredi_karti">POS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-bold rounded-xl text-xs transition-all shadow-lg shadow-artisan-terracotta/20 disabled:opacity-50 border border-artisan-gold/30"
                >
                  <Check className="w-4 h-4" />
                  <span>{slipSubmitting ? "Kaydediliyor..." : "Fişi Kaydet & Dijital Gör"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BASİT TAHSİLAT MODAL */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {txType === "tahsilat" ? "Tahsilat Al" : "Satış Yaz"}
                </h3>
              </div>
              <button
                onClick={() => setTxModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tarih</label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tutar (₺)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={txAmount || ""}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Ödeme Şekli</label>
                <select
                  value={txMethod}
                  onChange={(e) => setTxMethod(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="banka_havale">Banka Havalesi / EFT</option>
                  <option value="nakit">Nakit</option>
                  <option value="kredi_karti">Kredi Kartı / POS</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama</label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Örn: Cari ödeme"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setTxModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting || txAmount <= 0}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? "Kaydediliyor..." : "Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DİJİTAL FİŞ GÖRÜNÜMÜ & WHATSAPP GÖNDERİMİ (OrderSlipModal) */}
      {activeSlipOrder && (
        <OrderSlipModal
          order={activeSlipOrder}
          isOpen={slipModalOpen}
          onClose={() => {
            setSlipModalOpen(false);
            setActiveSlipOrder(null);
          }}
          cari={cari}
        />
      )}

      {/* MODAL 4: QUICK BALANCE ADJUSTMENT MODAL */}
      {balanceAdjustModalOpen && cari && (
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
                  {cari.businessName}
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  Sistemdeki Mevcut Bakiye:{" "}
                  <strong className="text-amber-400">
                    {(cari.balance || 0).toLocaleString("tr-TR")} ₺
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
