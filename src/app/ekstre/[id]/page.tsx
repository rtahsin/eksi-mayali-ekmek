"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Phone,
  MessageCircle,
  Receipt,
  Printer,
  Share2,
  Check,
  Store,
  ExternalLink,
  ShieldCheck,
  ArrowUpRight,
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

  const totalBorc = useMemo(() => {
    return transactions.reduce((sum, tx) => (tx.type === "satis" || (tx.type === "devir" && tx.amount > 0) ? sum + tx.amount : sum), 0);
  }, [transactions]);

  const totalAlacak = useMemo(() => {
    return transactions.reduce((sum, tx) => (tx.type === "tahsilat" || tx.type === "odeme" ? sum + tx.amount : sum), 0);
  }, [transactions]);

  const handleShareWhatsApp = () => {
    if (!cari) return;
    const url = window.location.href;
    const text = `EkmekLab Taş Fırın - ${cari.businessName} Güncel Hesap Ekstresi:\n💰 Kalan Bakiye: ${cari.balance.toLocaleString("tr-TR")} ₺\n🔗 İncelemek için: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-400 font-medium">Cari hesap ekstresi hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md bg-stone-900 border border-stone-800 p-8 rounded-3xl">
          <Store className="w-12 h-12 text-stone-600 mx-auto" />
          <h1 className="text-lg font-bold font-serif">Hesap Ekstresi Bulunamadı</h1>
          <p className="text-xs text-stone-400">
            Aradığınız cari hesap veya ekstre kaydı silinmiş veya bağlantı hatalı olabilir.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl"
          >
            EkmekLab Ana Sayfasına Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Bakery Brand Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold tracking-wide text-stone-100 text-base">
                    EKMEKLAB
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                    Zanaatkar Taş Fırın
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Canlı Müşteri Hesap Ekstresi & Mutabakatı
                </p>
              </div>
            </div>

            {/* Print & Share actions */}
            <div className="print:hidden flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors"
                title="Ekstre Linkini Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? "Kopyalandı" : "Paylaş"}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Yazdır / PDF</span>
              </button>
            </div>
          </div>

          {/* Account Profile & Balance Highlight */}
          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-widest block">
                Hesap Sahibi / Firma
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-100">
                {cari.businessName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                {cari.contactPerson && (
                  <span>Yetkili: <strong className="text-stone-300">{cari.contactPerson}</strong></span>
                )}
                {cari.taxNumber && (
                  <>
                    <span>•</span>
                    <span>Vergi No: <strong className="font-mono text-stone-300">{cari.taxNumber}</strong></span>
                  </>
                )}
                {cari.phone && (
                  <>
                    <span>•</span>
                    <a href={`tel:${cari.phone}`} className="text-stone-300 hover:text-amber-400 font-mono">
                      {cari.phone}
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Current Balance Card */}
            <div className="bg-stone-950/80 border border-stone-800 p-5 rounded-2xl min-w-[240px] text-right space-y-1 shadow-inner">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Güncel Kalan Bakiye
              </span>
              <div
                className={`text-3xl font-bold font-serif ${
                  cari.balance > 0
                    ? "text-amber-400"
                    : cari.balance < 0
                    ? "text-emerald-400"
                    : "text-stone-300"
                }`}
              >
                {(cari.balance || 0).toLocaleString("tr-TR")} ₺
              </div>
              <p className="text-[11px] text-stone-400">
                {cari.balance > 0
                  ? "Ödenecek Toplam Borç"
                  : cari.balance < 0
                  ? "Avans / Fazla Bakiye"
                  : "Hesap Tamamen Dengede"}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Mini-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Toplam Sipariş & Satışlar
            </div>
            <div className="text-xl font-bold font-serif text-amber-400 mt-1">
              +{totalBorc.toLocaleString("tr-TR")} ₺
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">Teslim edilen tüm ürün bedeli</p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Toplam Yapılan Ödemeler
            </div>
            <div className="text-xl font-bold font-serif text-emerald-400 mt-1">
              -{totalAlacak.toLocaleString("tr-TR")} ₺
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">Havale, nakit ve POS tahsilatları</p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Kalan Net Borç
            </div>
            <div className={`text-xl font-bold font-serif mt-1 ${
              cari.balance > 0 ? "text-amber-400" : cari.balance < 0 ? "text-emerald-400" : "text-stone-300"
            }`}>
              {(cari.balance || 0).toLocaleString("tr-TR")} ₺
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">Anlık güncel durum</p>
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-sm text-stone-100 font-serif">
                Hesap Hareketleri & Teslimat Fişleri ({transactions.length})
              </h2>
            </div>
            <span className="text-[11px] text-stone-400">
              Yürüyen Bakiye Düzeni
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs">
              Kayıtlı herhangi bir işlem hareketi bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/40">
                    <th className="py-3.5 px-4">Tarih</th>
                    <th className="py-3.5 px-4">Belge / Fiş No</th>
                    <th className="py-3.5 px-4">Açıklama / Ürünler</th>
                    <th className="py-3.5 px-4 text-right">Borç (+)</th>
                    <th className="py-3.5 px-4 text-right">Alacak (-)</th>
                    <th className="py-3.5 px-4 text-right">Kalan Bakiye</th>
                    <th className="py-3.5 px-4 text-center print:hidden">Fiş Detayı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/70 text-xs">
                  {transactions.map((tx) => {
                    const isSale = tx.type === "satis";
                    const isTahsilat = tx.type === "tahsilat";
                    const isDevir = tx.type === "devir";

                    const isDebt = isSale || (isDevir && tx.amount > 0);
                    const isCredit = isTahsilat || tx.type === "odeme";

                    return (
                      <tr key={tx.id} className="hover:bg-stone-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-stone-300 whitespace-nowrap">
                          {tx.date}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isSale ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 text-[11px]">
                              {tx.slipNumber || "FİŞ"}
                            </span>
                          ) : isTahsilat ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-[11px]">
                              TAHSİLAT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20 text-[11px]">
                              DEVİR
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-medium text-stone-200 max-w-sm">
                          <div className="truncate" title={tx.description}>
                            {tx.description}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                          {isDebt ? `+${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {isCredit ? `-${tx.amount.toLocaleString("tr-TR")} ₺` : "—"}
                        </td>

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
                            "—"
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap print:hidden">
                          {isSale && tx.orderId ? (
                            <Link
                              href={`/fis/${tx.orderId}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-colors"
                              title="Dijital Fişi Aç"
                            >
                              <span>Fiş</span>
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
                      <td className="py-3 px-4 text-center print:hidden">—</td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr className="border-t-2 border-stone-800 bg-stone-950/80 font-semibold text-xs text-stone-300">
                    <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wider text-[11px] text-stone-400">
                      GENEL TOPLAM ({transactions.length} İşlem)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      +{totalBorc.toLocaleString("tr-TR")} ₺
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      -{totalAlacak.toLocaleString("tr-TR")} ₺
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                      cari.balance > 0 ? "text-amber-400" : cari.balance < 0 ? "text-emerald-400" : "text-stone-300"
                    }`}>
                      {(cari.balance || 0).toLocaleString("tr-TR")} ₺
                    </td>
                    <td className="py-3.5 px-4 text-center print:hidden text-stone-500">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer Contact & Bank Info */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bu ekstre sayfası EkmekLab Taş Fırın Muhasebe Sistemi tarafından otomatik üretilmiştir.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <a
              href="https://wa.me/905306389773"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Fırıncı Tahsin Usta'ya WhatsApp'tan Yaz</span>
            </a>

            <a
              href="tel:05306389773"
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl border border-stone-700 transition-colors"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>0530 638 97 73</span>
            </a>
          </div>

          <p className="text-[11px] text-stone-500">
            EkmekLab Zanaatkar Fırıncılık • Beylikdüzü / İstanbul • ekmeklab.tr
          </p>
        </div>

      </div>
    </div>
  );
}
