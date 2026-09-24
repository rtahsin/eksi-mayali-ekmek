"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Phone,
  Receipt,
  Printer,
  Share2,
  Check,
  ExternalLink,
  ShieldCheck,
  User,
  BarChart2,
  Package,
  Download,
  Filter,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CariAccount, CariTransaction } from "@/types/admin";

export default function CustomerStatementPage() {
  const params = useParams();
  const cariId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Date and type filters
  const [dateFilter, setDateFilter] = useState<"all" | "this_month" | "last_month" | "last_30_days" | "custom">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "satis" | "tahsilat">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (!cariId) return;

    const fetchStatement = async () => {
      try {
        const supabase = createClient();
        if (!supabase) {
          setLoading(false);
          return;
        }

        // 1. Fetch Cari Account
        const { data: acc } = await supabase!
          .from("current_accounts")
          .select("*")
          .eq("id", cariId)
          .single();

        if (acc) {
          const cariObj: CariAccount = {
            id: acc.id,
            businessName: acc.name || "Değerli Müşterimiz",
            contactPerson: acc.type || "",
            phone: acc.phone || "",
            address: acc.address || "",
            neighborhood: "",
            taxNumber: acc.tax_id || "",
            balance: Number(acc.balance) || 0,
            accountType: acc.type === "gider" ? "gider" : "musteri",
            createdAt: acc.created_at,
          };
          setCari(cariObj);

          // 2. Fetch Transactions
          const { data: txs } = await supabase!
            .from("account_transactions")
            .select("*")
            .eq("account_id", cariId)
            .order("date", { ascending: true })
            .order("created_at", { ascending: true });

          if (txs) {
            const isExpense = cariObj.accountType === "gider";
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

              const slipMatch = (t.description || "").match(/\[(FİŞ-[^\]]+)\]/i);
              const slipNumber = slipMatch ? slipMatch[1] : undefined;

              return {
                id: t.id,
                cariId: t.account_id,
                date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
                type: txType,
                amount: Number(t.amount) || 0,
                description: t.description || "",
                slipNumber,
                orderId: t.order_id,
                createdAt: t.created_at,
              };
            });

            // Compute Running Balance
            const getDelta = (t: CariTransaction, originalType: string) => {
              if (originalType === "credit") return -t.amount;
              if (originalType === "debt") return t.amount;
              if (t.type === "tahsilat") return -t.amount;
              return t.amount;
            };

            const totalDelta = mapped.reduce((sum, t, idx) => sum + getDelta(t, txs[idx]?.type), 0);
            const currentBal = cariObj.balance;
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

            setTransactions([...txsWithBalance].reverse());
          }
        }
      } catch (err) {
        console.error("Statement fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [cariId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter === "satis" && tx.type !== "satis" && tx.type !== "devir") return false;
      if (typeFilter === "tahsilat" && tx.type !== "tahsilat" && tx.type !== "odeme") return false;

      // Date filter
      if (!tx.date) return true;
      const txDate = new Date(tx.date);
      const now = new Date();

      if (dateFilter === "this_month") {
        return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
      }
      if (dateFilter === "last_month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return txDate.getFullYear() === lastMonth.getFullYear() && txDate.getMonth() === lastMonth.getMonth();
      }
      if (dateFilter === "last_30_days") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return txDate >= thirtyDaysAgo;
      }
      if (dateFilter === "custom") {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, typeFilter, startDate, endDate]);

  const totalBorc = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, tx) => (tx.type === "satis" || (tx.type === "devir" && tx.amount > 0) ? sum + tx.amount : sum),
      0
    );
  }, [filteredTransactions]);

  const totalAlacak = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, tx) => (tx.type === "tahsilat" || tx.type === "odeme" ? sum + tx.amount : sum),
      0
    );
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (!cari || filteredTransactions.length === 0) {
      alert("Dışa aktarılacak işlem bulunamadı.");
      return;
    }

    const headers = ["Tarih", "Belge / Fiş No", "İşlem Türü", "Açıklama", "Borç (TL)", "Alacak (TL)", "Yürüyen Bakiye (TL)"];
    const rows = filteredTransactions.map((tx) => {
      const isDebt = tx.type === "satis" || (tx.type === "devir" && tx.amount > 0);
      const isCredit = tx.type === "tahsilat" || tx.type === "odeme";
      const typeLabel = tx.type === "satis" ? "Teslimat Fişi" : tx.type === "tahsilat" ? "Tahsilat" : tx.type === "devir" ? "Devir/Düzeltme" : "İşlem";
      const slipNo = tx.slipNumber || "-";
      const cleanDesc = (tx.description || "").replace(/"/g, '""');
      const borc = isDebt ? tx.amount.toFixed(2) : "0.00";
      const alacak = isCredit ? tx.amount.toFixed(2) : "0.00";
      const bakiye = tx.balanceAfter !== undefined ? tx.balanceAfter.toFixed(2) : "";

      return [
        `"${tx.date}"`,
        `"${slipNo}"`,
        `"${typeLabel}"`,
        `"${cleanDesc}"`,
        borc,
        alacak,
        bakiye,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanBusinessName = cari.businessName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, "_");
    link.href = url;
    link.download = `EkmekLab_Ekstre_${cleanBusinessName}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0705] flex flex-col items-center justify-center p-4 text-stone-300">
        <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-serif text-amber-400/90 font-medium">Cari Hesap Ekstresi Hazırlanıyor...</p>
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="min-h-screen bg-[#0A0705] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#18130F] border border-[#2A201A] flex items-center justify-center text-amber-500 mb-4 shadow-xl">
          <Receipt className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold font-serif text-stone-100 mb-2">Hesap Ekstresi Bulunamadı</h1>
        <p className="text-xs text-stone-400 max-w-sm mb-6">
          Aradığınız cari hesap veya ekstre kaydı silinmiş veya bağlantı hatalı olabilir.
        </p>
        <Link
          href="/"
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          EkmekLab Ana Sayfasına Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0705] text-[#221610] py-6 sm:py-12 px-3 sm:px-6 lg:px-8 selection:bg-amber-500/30 selection:text-amber-300 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Main Artisan Document Card */}
        <div
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
          className="bg-[#FBF9F5] text-[#221610] p-5 sm:p-8 rounded-[32px] border border-[#EBE4D8] shadow-[0_20px_50px_rgba(34,22,16,0.12)] space-y-6 relative print:border-none print:shadow-none print:p-0 print:bg-white"
        >
          {/* Header: Logo & Brand Information (Horizontal Alignment) + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE4D8]">
            <div className="flex items-center gap-4">
              <div className="w-[74px] h-[74px] rounded-full overflow-hidden shrink-0 border border-[#E5DDCF] bg-white flex items-center justify-center p-0.5 shadow-sm">
                <img
                  src="/logo/logo.png"
                  alt="EkmekLAB"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[28px] font-black text-[#1E140F] tracking-tight leading-tight pb-0.5">
                  EkmekLAB
                </h1>
                <div className="text-xs font-semibold text-[#63554D] tracking-[0.2em] uppercase mt-0.5 leading-normal">
                  B e y l i k d ü z ü
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#3B2F28] mt-1 leading-normal">
                  <Phone className="w-3.5 h-3.5 text-[#8A7A70]" />
                  <span className="leading-normal pb-0.5">0501 012 66 53</span>
                </div>
              </div>
            </div>

            {/* Actions: Excel/CSV, Copy Link, Print */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#F5EFE6] hover:bg-[#EAE2D4] text-[#B45309] text-xs font-bold border border-[#E8DFC8] shadow-sm active:scale-95 transition-all"
                title="Excel / CSV Formatında İndir"
              >
                <Download className="w-4 h-4 text-[#B45309]" />
                <span>Excel / CSV İndir</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-[#F5EFE6] text-[#3B2F28] text-xs font-bold border border-[#EBE4D8] shadow-sm active:scale-95 transition-all"
                title="Ekstre Linkini Kopyala"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-[#8A7A70]" />}
                <span>{copied ? "Kopyalandı" : "Linki Kopyala"}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-[#F5EFE6] text-[#3B2F28] text-xs font-bold border border-[#EBE4D8] shadow-sm active:scale-95 transition-all"
                title="Yazdır / PDF"
              >
                <Printer className="w-4 h-4 text-[#8A7A70]" />
                <span>Yazdır / PDF</span>
              </button>
            </div>
          </div>

          {/* Account Profile & Statement Metadata Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info Box */}
            <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[#5C4C42] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
                    HESAP SAHİBİ / MÜŞTERİ
                  </div>
                  <div className="text-base sm:text-lg font-black text-[#1E140F] leading-snug break-words">
                    {cari.businessName}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[#63554D] pt-1">
                {cari.contactPerson && (
                  <span className="font-medium">
                    Yetkili: <strong className="text-[#1E140F] font-bold">{cari.contactPerson}</strong>
                  </span>
                )}
                {cari.phone && (
                  <>
                    <span className="text-[#D8CFC4]">•</span>
                    <a href={`tel:${cari.phone}`} className="font-bold text-[#1E140F] hover:text-amber-800">
                      {cari.phone}
                    </a>
                  </>
                )}
                {cari.taxNumber && (
                  <>
                    <span className="text-[#D8CFC4]">•</span>
                    <span className="font-mono text-xs text-[#7A6B62]">VKN/TCKN: {cari.taxNumber}</span>
                  </>
                )}
              </div>
            </div>

            {/* Statement Date & Movements Box */}
            <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[#5C4C42] shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
                    EKSTRE TARİHİ
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1E140F] leading-tight">
                    {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div className="text-[10px] text-[#8A7A70] mt-0.5 font-medium">
                    Canlı Mutabakat & Hesap Dökümü
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-2">
                <div className="text-[9px] font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
                  TOPLAM İŞLEM
                </div>
                <div className="bg-[#F5EFE6] px-3 py-1 rounded-xl text-xs sm:text-sm font-black text-[#B45309]">
                  {transactions.length} Hareket
                </div>
              </div>
            </div>
          </div>

          {/* Summary Mini-Cards (Alışlar, Ödemeler & Güncel Bakiye) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm space-y-1">
              <div className="text-[10px] font-bold text-[#8A7A70] uppercase tracking-wider">
                Toplam Sipariş & Alışlar
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#1E140F]">
                +{totalBorc.toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-[11px] text-[#7A6B62]">Teslim edilen ürün toplamı</p>
            </div>

            <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm space-y-1">
              <div className="text-[10px] font-bold text-[#8A7A70] uppercase tracking-wider">
                Toplam Yapılan Ödemeler
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-800">
                -{totalAlacak.toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-[11px] text-[#7A6B62]">Tahsilat & ödeme toplamı</p>
            </div>

            {/* Current Balance (Highlighted Tablet) */}
            <div className="bg-[#EFE8DD] border border-[#E5DAC8] rounded-2xl p-4 shadow-sm space-y-1">
              <div className="text-[10px] font-black text-[#5C4C42] uppercase tracking-wider">
                Güncel Toplam Bakiye
              </div>
              <div className={`text-xl sm:text-2xl font-black ${
                cari.balance > 0 ? "text-[#B45309]" : cari.balance < 0 ? "text-emerald-800" : "text-[#1E140F]"
              }`}>
                {(cari.balance || 0).toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-[11px] font-bold text-[#7A6B62]">
                {cari.balance > 0
                  ? "Ödenecek Kalan Borç"
                  : cari.balance < 0
                  ? "Avans / Fazla Bakiye"
                  : "Hesap Tamamen Dengede"}
              </p>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#EBE4D8] bg-[#FAF6F0] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#EFE8DC] flex items-center justify-center text-[#5C4C42]">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-black text-[#1E140F] tracking-wide uppercase">
                    Hesap Hareketleri & Teslimat Fişleri ({filteredTransactions.length})
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#8A7A70]">
                  Yürüyen Bakiye Düzeni
                </span>
              </div>

              {/* Filter Toolbar (Hidden on print) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EBE4D8]/60 print:hidden text-xs">
                {/* Period Pills */}
                <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFC8]">
                  {[
                    { id: "all", label: "Tüm Zamanlar" },
                    { id: "this_month", label: "Bu Ay" },
                    { id: "last_month", label: "Geçen Ay" },
                    { id: "last_30_days", label: "Son 30 Gün" },
                    { id: "custom", label: "Tarih Seç" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDateFilter(p.id as any)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        dateFilter === p.id
                          ? "bg-[#B45309] text-white shadow-sm"
                          : "text-[#63554D] hover:text-[#1E140F]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Type Filter Pills */}
                <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFC8]">
                  {[
                    { id: "all", label: "Tümü" },
                    { id: "satis", label: "Fişler" },
                    { id: "tahsilat", label: "Tahsilatlar" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTypeFilter(t.id as any)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        typeFilter === t.id
                          ? "bg-[#1E140F] text-white shadow-sm"
                          : "text-[#63554D] hover:text-[#1E140F]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                {dateFilter === "custom" && (
                  <div className="flex items-center gap-1.5 bg-[#F5EFE6] px-2.5 py-1 rounded-xl border border-[#E8DFC8]">
                    <span className="text-[10px] font-bold text-[#8A7A70] uppercase">Aralık:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border border-[#E8DFC8] rounded px-1.5 py-0.5 text-[11px] text-[#1E140F] font-mono focus:outline-none"
                    />
                    <span className="text-[#8A7A70]">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border border-[#E8DFC8] rounded px-1.5 py-0.5 text-[11px] text-[#1E140F] font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-[#7A6B62] text-xs">
                Seçilen filtrelere uygun hesap hareketi bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBE4D8] bg-[#F5EFE6]/70 text-[10px] font-bold text-[#8A7A70] uppercase tracking-wider">
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">Belge / Fiş No</th>
                      <th className="py-3 px-4">Açıklama / Kalemler</th>
                      <th className="py-3 px-4 text-right">Borç (+)</th>
                      <th className="py-3 px-4 text-right">Alacak (-)</th>
                      <th className="py-3 px-4 text-right">Bakiye</th>
                      <th className="py-3 px-4 text-center print:hidden">Fiş Detayı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE4D8]/80 text-xs">
                    {filteredTransactions.map((tx) => {
                      const isSale = tx.type === "satis";
                      const isTahsilat = tx.type === "tahsilat";
                      const isDevir = tx.type === "devir";

                      const isDebt = isSale || (isDevir && tx.amount > 0);
                      const isCredit = isTahsilat || tx.type === "odeme";

                      return (
                        <tr key={tx.id} className="hover:bg-[#FAF6F0] transition-colors">
                          <td className="py-3 px-4 font-medium text-[#5C4C42] whitespace-nowrap">
                            {tx.date}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {isSale ? (
                              <span className="px-2.5 py-1 rounded-lg bg-[#F5EFE6] text-[#B45309] font-bold border border-[#E8DFC8] text-[11px]">
                                {tx.slipNumber || "FİŞ"}
                              </span>
                            ) : isTahsilat ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                                TAHSİLAT
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold border border-sky-200 text-[11px]">
                                DEVİR
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-medium text-[#1E140F] max-w-sm">
                            <div className="truncate" title={tx.description}>
                              {tx.description}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-[#B45309] whitespace-nowrap">
                            {isDebt ? `+${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-emerald-800 whitespace-nowrap">
                            {isCredit ? `-${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                          </td>

                          <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                            {tx.balanceAfter !== undefined ? (
                              <span
                                className={
                                  tx.balanceAfter > 0
                                    ? "text-[#B45309]"
                                    : tx.balanceAfter < 0
                                    ? "text-emerald-800"
                                    : "text-[#5C4C42]"
                                }
                              >
                                {tx.balanceAfter.toLocaleString("tr-TR")} ₺
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap print:hidden">
                            {isSale || tx.type === "tahsilat" ? (
                              <Link
                                href={`/fis/${tx.orderId || tx.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5EFE6] hover:bg-[#EFE8DC] text-[#B45309] text-xs font-bold border border-[#E8DFC8] transition-colors"
                                title="Dijital Belgeyi Aç"
                              >
                                <span>{tx.type === "tahsilat" ? "Makbuz" : "Fiş"}</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {startingBalance !== 0 && (
                      <tr className="bg-[#FAF6F0] text-[#7A6B62] italic">
                        <td className="py-3 px-4 font-mono">—</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-[#EFE8DD] text-[#5C4C42] font-bold text-[11px]">
                            AÇILIŞ
                          </span>
                        </td>
                        <td className="py-3 px-4">Önceki Dönemden Devreden Açılış Bakiyesi</td>
                        <td className="py-3 px-4 text-right font-bold text-[#7A6B62]">
                          {startingBalance > 0 ? `+${startingBalance.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#7A6B62]">
                          {startingBalance < 0 ? `${startingBalance.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1E140F]">
                          {startingBalance.toLocaleString("tr-TR")} ₺
                        </td>
                        <td className="py-3 px-4 text-center print:hidden">—</td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="border-t-2 border-[#EBE4D8] bg-[#F5EFE6] font-bold text-xs text-[#1E140F]">
                      <td colSpan={3} className="py-4 px-4 uppercase tracking-wider text-[11px] text-[#5C4C42]">
                        GENEL TOPLAM ({filteredTransactions.length} İşlem)
                      </td>
                      <td className="py-4 px-4 text-right font-black text-[#B45309]">
                        +{totalBorc.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="py-4 px-4 text-right font-black text-emerald-800">
                        -{totalAlacak.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className={`py-4 px-4 text-right font-black text-sm ${
                        cari.balance > 0 ? "text-[#B45309]" : cari.balance < 0 ? "text-emerald-800" : "text-[#1E140F]"
                      }`}>
                        {(cari.balance || 0).toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="py-4 px-4 text-center print:hidden text-[#8A7A70]">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Document Footer: Wheat Stalk & Artisan Signature */}
          <div className="text-center space-y-2 pt-4 pb-2 border-t border-[#EBE4D8]">
            <div className="flex justify-center text-[#A89688]">
              <svg className="w-6 h-6 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 22 16 8" />
                <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0 4.94Z" />
                <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
              </svg>
            </div>
            <div className="italic font-serif text-[#5C4C42] text-sm">
              Bizi tercih ettiğiniz için teşekkür ederiz.
            </div>
            <div className="text-[11px] text-[#8A7A70] tracking-widest uppercase font-bold">
              EKMEKLAB TAŞ FIRIN · BEREKETLİ İŞLER
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#8A7A70] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bu canlı ekstre sayfası EkmekLab Taş Fırın Otomasyon Sistemi tarafından gerçek zamanlı üretilmiştir.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
