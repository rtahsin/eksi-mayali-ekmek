"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
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
  Download,
  X,
} from "lucide-react";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { CariTransaction } from "@/types/admin";
import {
  formatCariDateRangeLabel,
  isTransactionInDateRange,
  resolveCariDateRange,
  summarizeBalanceByDate,
  type CariDateFilter,
} from "@/lib/cari/balanceSummary";
import { LEDGER_TYPE_LABELS } from "@/lib/cari/ledger";
import { buildCsvContent, sanitizeCsvCell } from "@/lib/security/csv";
import { CONTACT } from "@/lib/site";
import { formatTrDate } from "@/lib/time/istanbul";

interface StatementAccount {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  taxNumber: string;
  balance: number;
}

type StatementTx = CariTransaction & { slipToken: string | null };

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedMoney(n: number): string {
  if (n === 0) return "0,00 ₺";
  const sign = n > 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(n))} ₺`;
}

export default function CustomerStatementPage() {
  const params = useParams();
  const cariId = params?.id as string;
  const linkToken = useSearchParams()?.get("t") || "";
  const today = useIstanbulToday();

  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState<StatementAccount | null>(null);
  const [transactions, setTransactions] = useState<StatementTx[]>([]);
  const [copied, setCopied] = useState(false);
  const [csvNotice, setCsvNotice] = useState<string | null>(null);

  // Date and type filters
  type StatementTypeFilter = "all" | "satis" | "tahsilat";

  const [dateFilter, setDateFilter] = useState<CariDateFilter>("all");
  const [typeFilter, setTypeFilter] = useState<StatementTypeFilter>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (!cariId) return;

    // Veri sunucudan: imzalı link (?t=) doğrulanır; tarayıcı tabloya doğrudan erişmez
    const fetchStatement = async () => {
      try {
        const qs = linkToken ? `?t=${encodeURIComponent(linkToken)}` : "";
        const res = await fetch(`/api/ekstre/${encodeURIComponent(cariId)}${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as { cari: StatementAccount; transactions: StatementTx[] };
        setCari(data.cari);
        setTransactions(data.transactions);
      } catch (err) {
        console.error("Statement fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchStatement();
  }, [cariId, linkToken]);

  const activeDateRange = useMemo(
    () => resolveCariDateRange(dateFilter, today, startDate, endDate),
    [dateFilter, today, startDate, endDate]
  );

  const periodLabel = useMemo(
    () => formatCariDateRangeLabel(dateFilter, activeDateRange),
    [dateFilter, activeDateRange]
  );

  const dateBalanceSummary = useMemo(
    () => summarizeBalanceByDate(transactions, activeDateRange),
    [transactions, activeDateRange]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter === "satis" && !(tx.delta > 0)) return false;
      if (typeFilter === "tahsilat" && !(tx.delta < 0)) return false;
      return isTransactionInDateRange(tx.date, activeDateRange);
    });
  }, [transactions, typeFilter, activeDateRange]);

  const totalBorc = useMemo(
    () => filteredTransactions.reduce((sum, tx) => (tx.delta > 0 ? sum + tx.delta : sum), 0),
    [filteredTransactions]
  );

  const totalAlacak = useMemo(
    () => filteredTransactions.reduce((sum, tx) => (tx.delta < 0 ? sum - tx.delta : sum), 0),
    [filteredTransactions]
  );

  const handleExportCSV = () => {
    if (!cari || filteredTransactions.length === 0) {
      setCsvNotice("Seçili tarih veya işlem filtresinde dışa aktarılacak hareket bulunamadı.");
      return;
    }

    setCsvNotice(null);
    const headers = [
      "Tarih",
      "Belge / Fiş No",
      "İşlem Türü",
      "Açıklama",
      "Borç (TL)",
      "Alacak (TL)",
      "Yürüyen Bakiye (TL)",
    ];
    const money = (n: number) => n.toFixed(2).replace(".", ",");
    const rows = filteredTransactions.map((tx) => {
      const typeLabel = LEDGER_TYPE_LABELS[tx.type] + (tx.reversedById ? " (iptal edildi)" : "");
      const slipNo = tx.slipNumber || "-";
      const desc = tx.description || LEDGER_TYPE_LABELS[tx.type];
      const borc = tx.delta > 0 ? money(tx.delta) : "0,00";
      const alacak = tx.delta < 0 ? money(-tx.delta) : "0,00";
      const bakiye = tx.balanceAfter !== undefined ? money(tx.balanceAfter) : "";

      return [tx.date, slipNo, typeLabel, desc, borc, alacak, bakiye];
    });

    // UTF-8 BOM + ';' ayracı + formül enjeksiyon koruması (@/lib/security/csv)
    const csvContent = buildCsvContent(headers, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanBusinessName = sanitizeCsvCell(cari.businessName)
      .replace(/"/g, "")
      .replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, "_");
    link.href = url;
    link.download = `EkmekLab_Ekstre_${cleanBusinessName}_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          className="bg-[#FBF9F5] text-[#221610] p-5 sm:p-8 rounded-[32px] border border-[#EBE4D8] shadow-[0_20px_50px_rgba(34,22,16,0.12)] space-y-6 relative overflow-visible print:border-none print:shadow-none print:p-0 print:bg-white"
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
                  <span className="leading-normal pb-0.5">{CONTACT.phoneDisplay}</span>
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

          {csvNotice && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950 print:hidden"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>{csvNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCsvNotice(null)}
                aria-label="Uyarıyı kapat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Account Profile & Statement Metadata Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info Box */}
            <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[#5C4C42] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
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
                  <div className="text-xs font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
                    EKSTRE TARİHİ
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1E140F] leading-normal pb-1">
                    {formatTrDate(today, "long")}
                  </div>
                  <div className="text-xs text-[#8A7A70] mt-0.5 font-medium">
                    Canlı Mutabakat &amp; Hesap Dökümü · {periodLabel}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-2">
                <div className="text-xs font-bold text-[#8A7A70] tracking-wider uppercase leading-none mb-1">
                  GÜNCEL BAKİYE
                </div>
                <div className="bg-[#F5EFE6] px-3 py-1 rounded-xl text-xs sm:text-sm font-black font-mono tabular-nums text-[#8E3D1B] leading-normal pb-1">
                  {formatMoney(cari.balance || 0)} ₺
                </div>
              </div>
            </div>
          </div>

          {/* Summary Mini-Cards (Dönem Başı Devir, Dönem Borç, Dönem Alacak, Dönem Sonu Bakiye) */}
          {dateBalanceSummary.isInvalidRange ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>Başlangıç tarihi bitiş tarihinden sonra olamaz. Lütfen tarih aralığını düzeltin.</span>
            </div>
          ) : (
            <div className="space-y-2 overflow-visible">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E5148]">
                <span className="font-bold text-[#3B1E1A]">
                  Dönem Özeti: <span className="text-[#8E3D1B]">{periodLabel}</span>
                </span>
                <span className="font-mono text-[11px]">
                  Devir + Borç − Alacak = Dönem Sonu ({dateBalanceSummary.transactionCount} hareket)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-visible">
                <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm space-y-1 overflow-visible">
                  <div className="text-xs font-bold text-[#8A7A70] uppercase tracking-wider">
                    Dönem Başı Devir
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#1E140F] leading-normal pb-1">
                    {formatMoney(dateBalanceSummary.openingBalance)} ₺
                  </div>
                  <p className="text-xs text-[#7A6B62]">
                    {activeDateRange.startDate
                      ? `${formatTrDate(activeDateRange.startDate)} öncesi bakiye`
                      : "Hesap başlangıcı"}
                  </p>
                </div>

                <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm space-y-1 overflow-visible">
                  <div className="text-xs font-bold text-[#8A7A70] uppercase tracking-wider">
                    Dönem Borç (+)
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#8E3D1B] leading-normal pb-1">
                    +{formatMoney(dateBalanceSummary.periodDebt)} ₺
                  </div>
                  <p className="text-xs text-[#7A6B62]">Teslim edilen ürün &amp; borç toplamı</p>
                </div>

                <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl p-4 shadow-sm space-y-1 overflow-visible">
                  <div className="text-xs font-bold text-[#8A7A70] uppercase tracking-wider">
                    Dönem Alacak (−)
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-800 leading-normal pb-1">
                    −{formatMoney(dateBalanceSummary.periodCredit)} ₺
                  </div>
                  <p className="text-xs text-[#7A6B62]">Tahsilat &amp; ödeme toplamı</p>
                </div>

                <div className="bg-[#EFE8DD] border border-[#E5DAC8] rounded-2xl p-4 shadow-sm space-y-1 overflow-visible">
                  <div className="text-xs font-black text-[#5C4C42] uppercase tracking-wider">
                    Dönem Sonu Bakiye
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-black font-mono tabular-nums leading-normal pb-1 ${
                      dateBalanceSummary.closingBalance > 0
                        ? "text-[#8E3D1B]"
                        : dateBalanceSummary.closingBalance < 0
                          ? "text-emerald-800"
                          : "text-[#1E140F]"
                    }`}
                  >
                    {formatMoney(dateBalanceSummary.closingBalance)} ₺
                  </div>
                  <p className="text-xs font-bold text-[#7A6B62]">
                    Dönem net: {formatSignedMoney(dateBalanceSummary.periodNet)} ·{" "}
                    {dateBalanceSummary.closingBalance > 0
                      ? "Kalan Borç"
                      : dateBalanceSummary.closingBalance < 0
                        ? "Avans / Fazla"
                        : "Dengede"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Ledger Table */}
          <div className="bg-white/90 border border-[#EBE4D8] rounded-2xl shadow-sm overflow-visible">
            <div className="p-4 sm:p-5 border-b border-[#EBE4D8] bg-[#FAF6F0] rounded-t-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#EFE8DC] flex items-center justify-center text-[#5C4C42]">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-black text-[#1E140F] tracking-wide uppercase">
                    Hesap Hareketleri &amp; Teslimat Fişleri ({filteredTransactions.length})
                  </h2>
                </div>
                <span className="text-xs font-semibold text-[#8A7A70]">
                  Yürüyen Bakiye Düzeni · {transactions.length} Toplam Hareket
                </span>
              </div>

              {/* Filter Toolbar (Hidden on print) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EBE4D8]/60 print:hidden text-xs">
                {/* Period Pills */}
                <div className="flex flex-wrap items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFC8]">
                  {(
                    [
                      { id: "all", label: "Tüm Zamanlar" },
                      { id: "this_month", label: "Bu Ay" },
                      { id: "last_month", label: "Geçen Ay" },
                      { id: "last_30", label: "Son 30 Gün" },
                      { id: "custom", label: "Tarih Seç" },
                    ] as const
                  ).map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setDateFilter(p.id);
                        setCsvNotice(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                        dateFilter === p.id
                          ? "bg-[#B4532A] text-white shadow-sm"
                          : "text-[#63554D] hover:text-[#1E140F]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Type Filter Pills */}
                <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFC8]">
                  {(
                    [
                      { id: "all", label: "Tümü" },
                      { id: "satis", label: "Fişler" },
                      { id: "tahsilat", label: "Tahsilatlar" },
                    ] as const
                  ).map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        setTypeFilter(t.id);
                        setCsvNotice(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
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
                    <span className="text-xs font-bold text-[#8A7A70] uppercase">Aralık:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCsvNotice(null);
                      }}
                      className="bg-white border border-[#E8DFC8] rounded px-1.5 py-0.5 text-xs text-[#1E140F] font-mono focus:outline-none"
                    />
                    <span className="text-[#8A7A70]">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCsvNotice(null);
                      }}
                      className="bg-white border border-[#E8DFC8] rounded px-1.5 py-0.5 text-xs text-[#1E140F] font-mono focus:outline-none"
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
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBE4D8] bg-[#F5EFE6]/70 text-xs font-bold text-[#8A7A70] uppercase tracking-wider">
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
                      const isDebt = tx.delta > 0;
                      const isCredit = tx.delta < 0;
                      const cancelled = Boolean(tx.reversedById);

                      return (
                        <tr key={tx.id} className={`hover:bg-[#FAF6F0] transition-colors ${cancelled ? "opacity-60" : ""}`}>
                          <td className="py-3 px-4 font-medium text-[#5C4C42] whitespace-nowrap">
                            {tx.date.split("-").reverse().join(".")}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold border text-xs ${
                                tx.type === "satis"
                                  ? "bg-[#F5EFE6] text-[#B45309] border-[#E8DFC8]"
                                  : tx.type === "tahsilat"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : tx.type === "storno"
                                  ? "bg-stone-100 text-stone-700 border-stone-300"
                                  : "bg-sky-50 text-sky-800 border-sky-200"
                              }`}
                            >
                              {tx.slipNumber || LEDGER_TYPE_LABELS[tx.type]}
                            </span>
                            {cancelled && <span className="ml-1.5 text-xs font-bold text-rose-700">İPTAL</span>}
                          </td>

                          <td className="py-3 px-4 font-medium text-[#1E140F] max-w-sm">
                            <div className="truncate" title={tx.description}>
                              {tx.description || LEDGER_TYPE_LABELS[tx.type]}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-[#B45309] whitespace-nowrap">
                            {isDebt ? `+${tx.delta.toLocaleString("tr-TR")} ₺` : "—"}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-emerald-800 whitespace-nowrap">
                            {isCredit ? `−${(-tx.delta).toLocaleString("tr-TR")} ₺` : "—"}
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
                            {tx.slipToken ? (
                              <a
                                href={`/fis/${tx.id}?t=${tx.slipToken}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5EFE6] hover:bg-[#EFE8DC] text-[#B45309] text-xs font-bold border border-[#E8DFC8] transition-colors"
                                title="Dijital Belgeyi Aç"
                              >
                                <span>{tx.type === "satis" ? "Fiş" : "Makbuz"}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>

                  <tfoot>
                    <tr className="border-t-2 border-[#EBE4D8] bg-[#F5EFE6] font-bold text-xs text-[#1E140F]">
                      <td colSpan={3} className="py-4 px-4 uppercase tracking-wider text-xs text-[#5C4C42]">
                        DÖNEM TOPLAMI ({filteredTransactions.length} İşlem)
                      </td>
                      <td className="py-4 px-4 text-right font-black font-mono tabular-nums text-[#8E3D1B] pb-1">
                        +{formatMoney(totalBorc)} ₺
                      </td>
                      <td className="py-4 px-4 text-right font-black font-mono tabular-nums text-emerald-800 pb-1">
                        −{formatMoney(totalAlacak)} ₺
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-black font-mono tabular-nums text-sm pb-1 ${
                          dateBalanceSummary.closingBalance > 0
                            ? "text-[#8E3D1B]"
                            : dateBalanceSummary.closingBalance < 0
                              ? "text-emerald-800"
                              : "text-[#1E140F]"
                        }`}
                      >
                        {formatMoney(dateBalanceSummary.closingBalance)} ₺
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
            <div className="text-xs text-[#8A7A70] tracking-widest uppercase font-bold">
              EKMEKLAB TAŞ FIRIN · BEREKETLİ İŞLER
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#8A7A70] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bu canlı ekstre sayfası EkmekLab Taş Fırın Otomasyon Sistemi tarafından gerçek zamanlı üretilmiştir.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
