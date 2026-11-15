"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crown,
  Download,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import type { AdminCustomerRow } from "@/app/api/admin/customers/route";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { whatsappLink } from "@/lib/site";
import { formatTrDate, istanbulToday } from "@/lib/time/istanbul";

type CustomerSegmentFilter = "all" | "vip" | "new" | "inactive_14d";

interface CustomersApiResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminCustomerRow[];
}

interface CustomersApiError {
  error?: string;
}

const PAGE_LIMIT = 50;

const SEGMENT_TABS: { id: CustomerSegmentFilter; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "vip", label: "VIP (3+ Sipariş)" },
  { id: "new", label: "Yeni" },
  { id: "inactive_14d", label: "14+ Gün Pasif" },
];

function getSegmentBadge(segment: string): {
  label: string;
  cls: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (segment) {
    case "vip":
      return {
        label: "VIP",
        cls: "bg-[#F3E2D4] text-[#8E3D1B] border-[#DFB99F]",
        icon: Crown,
      };
    case "new":
      return {
        label: "Yeni",
        cls: "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC]",
        icon: Sparkles,
      };
    case "inactive_14d":
      return {
        label: "14+ Gün Pasif",
        cls: "bg-[#FEF3D6] text-[#7A4A0B] border-[#E8C587]",
        icon: UserMinus,
      };
    case "lead":
      return {
        label: "Kayıtlı (Sipariş Yok)",
        cls: "bg-[#EEF3F8] text-[#24476B] border-[#C5D5E4]",
        icon: UserCheck,
      };
    default:
      return {
        label: "Düzenli",
        cls: "bg-[#F6EEDF] text-[#3B1E1A] border-[#E2D3BD]",
        icon: Users,
      };
  }
}

function formatLastOrderDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return formatTrDate(isoDate);
  }
  return isoDate.slice(0, 10);
}

export default function CustomersCrmPage() {
  const { adminUser, loading: authLoading } = useAdminAuth();
  const canReadCustomers = hasCapability(adminUser?.role, "customers.read");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [segment, setSegment] = useState<CustomerSegmentFilter>("all");
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState<AdminCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setOffset(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadCustomers = useCallback(async () => {
    if (authLoading) return;
    if (!canReadCustomers) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        search: debouncedSearch,
        segment,
        limit: String(PAGE_LIMIT),
        offset: String(offset),
        format: "json",
      });

      const res = await fetch(`/api/admin/customers?${qs.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as CustomersApiError;
        throw new Error(
          errBody.error ||
            (res.status === 503
              ? "Müşteri CRM veritabanı fonksiyonu henüz hazır değil (031 migration)."
              : `Müşteri listesi alınamadı (HTTP ${res.status}).`)
        );
      }

      const data = (await res.json()) as CustomersApiResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (err: unknown) {
      setItems([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Müşteriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, canReadCustomers, debouncedSearch, segment, offset]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers, reloadNonce]);

  const handleSegmentChange = (next: CustomerSegmentFilter) => {
    setSegment(next);
    setOffset(0);
    setExpandedKey(null);
  };

  const handleExportCsv = async () => {
    if (!canReadCustomers || exportingCsv) return;
    setExportingCsv(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        search: debouncedSearch,
        segment,
        format: "csv",
      });

      const res = await fetch(`/api/admin/customers?${qs.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as CustomersApiError;
        throw new Error(errBody.error || `CSV dışa aktarım başarısız (HTTP ${res.status}).`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `ekmeklab_musteriler_${istanbulToday()}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CSV dosyası indirilemedi.");
    } finally {
      setExportingCsv(false);
    }
  };

  const pageStats = useMemo(() => {
    let vipCount = 0;
    let totalSpent = 0;
    for (const c of items) {
      if (c.segment === "vip") vipCount += 1;
      totalSpent += Number(c.total_spent || 0);
    }
    return { vipCount, totalSpent };
  }, [items]);

  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(total, offset + items.length);

  if (!authLoading && !canReadCustomers) {
    return (
      <div className="max-w-2xl mx-auto my-8 bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-6 text-center space-y-2 shadow-sm">
        <Users className="w-8 h-8 text-[#8E3D1B] mx-auto" aria-hidden="true" />
        <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Yetkisiz Erişim</h1>
        <p className="text-sm text-[#6E5148]">
          Müşteri CRM kayıtlarını görüntülemek için yönetici yetkisi gereklidir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Başlık ve CSV / Yenile aksiyonları */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 id="customers-page-heading" className="font-serif text-2xl sm:text-3xl font-bold text-[#3B1E1A]">
            Müşteriler & CRM
          </h1>
          <p className="text-xs text-[#6E5148] mt-1">
            Sunucu sayfalamalı müşteri rehberi · segment analizi ve güvenli CSV dışa aktarımı
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => setReloadNonce((n) => n + 1)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>Yenile</span>
          </button>

          <button
            type="button"
            disabled={exportingCsv || loading}
            onClick={() => void handleExportCsv()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
          >
            {exportingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{exportingCsv ? "Hazırlanıyor…" : "CSV İndir"}</span>
          </button>
        </div>
      </div>

      {/* Özet metrik şeridi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[#6E5148]">Eşleşen Kayıt</div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#3B1E1A] mt-1">{total}</div>
          <div className="text-[11px] text-[#6E5148] mt-0.5">Sunucu toplamı</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[#6E5148]">Gösterilen Aralık</div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#3B1E1A] mt-1">
            {total === 0 ? "0" : `${rangeStart}–${rangeEnd}`}
          </div>
          <div className="text-[11px] text-[#6E5148] mt-0.5">Sayfa başına {PAGE_LIMIT} kayıt</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[#6E5148]">Bu Sayfadaki VIP</div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#8E3D1B] mt-1">{pageStats.vipCount}</div>
          <div className="text-[11px] text-[#6E5148] mt-0.5">3+ sipariş verenler</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[#6E5148]">Sayfa Toplam Ciro</div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#1D5130] mt-1">
            {pageStats.totalSpent.toLocaleString("tr-TR")} ₺
          </div>
          <div className="text-[11px] text-[#6E5148] mt-0.5">Görüntülenen satırlar</div>
        </div>
      </div>

      {/* Arama + Segment Filtreleri */}
      <search
        aria-label="Müşteri arama ve segment filtresi"
        className="block bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-4 space-y-3 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <label htmlFor="customer-search-input" className="sr-only">
              Müşteri ara
            </label>
            <Search
              className="w-4 h-4 text-[#6E5148] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="customer-search-input"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ad, telefon, mahalle veya e-posta ara…"
              className="w-full min-h-[44px] pl-10 pr-12 py-2 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-base sm:text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                  setOffset(0);
                }}
                aria-label="Aramayı temizle"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-[#6E5148] hover:text-[#3B1E1A]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Müşteri segment filtresi"
            className="flex flex-wrap items-center gap-1.5"
          >
            {SEGMENT_TABS.map((tab) => {
              const active = segment === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSegmentChange(tab.id)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    active
                      ? "bg-[#B4532A] text-white border-[#B4532A]"
                      : "bg-[#FBF6EC] text-[#3B1E1A] border-[#E2D3BD] hover:bg-[#F3E2D4]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </search>

      {/* Hata banner'ı (ör. 031 henüz uygulanmadıysa 503) */}
      {error && (
        <div
          role="alert"
          className="bg-[#FCECE9] border border-[#E7B7AF] rounded-2xl p-4 text-sm text-[#7D2114] flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold">Müşteri listesi alınamadı</div>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E7B7AF] text-xs font-bold text-[#7D2114] hover:bg-[#FBF6EC]"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Müşteri Veri Tablosu */}
      <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl overflow-hidden shadow-sm">
        <div className="px-4 py-3.5 border-b border-[#E2D3BD] bg-[#FBF6EC] flex items-center justify-between gap-2">
          <h2 id="customers-table-heading" className="font-serif font-bold text-base text-[#3B1E1A]">
            Müşteri Kayıtları
          </h2>
          <span className="text-xs font-mono tabular-nums text-[#6E5148]">
            Sayfa {currentPage} / {totalPages}
          </span>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="customers-table-heading"
          className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#B4532A]"
        >
          <table className="w-full text-left border-collapse min-w-[760px]">
            <caption className="sr-only">
              EkmekLab sunucu sayfalamalı müşteri rehberi tablosu
            </caption>
            <thead>
              <tr className="bg-[#FBF6EC] border-b border-[#E2D3BD] text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                <th scope="col" className="px-4 py-3">
                  Müşteri
                </th>
                <th scope="col" className="px-4 py-3">
                  İletişim & Mahalle
                </th>
                <th scope="col" className="px-4 py-3">
                  Segment
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Sipariş
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Toplam Harcama
                </th>
                <th scope="col" className="px-4 py-3">
                  Son Sipariş
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D3BD] text-sm text-[#3B1E1A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#6E5148]">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2 text-[#B4532A]" aria-hidden="true" />
                    Müşteriler yükleniyor…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#6E5148]">
                    Arama veya segment kriterlerine uyan müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const badge = getSegmentBadge(c.segment);
                  const BadgeIcon = badge.icon;
                  const isExpanded = expandedKey === c.customer_key;
                  const waHref = c.phone
                    ? whatsappLink(`Merhaba ${c.name}, EkmekLab'dan yazıyoruz.`, toWhatsAppNumber(c.phone))
                    : null;

                  return (
                    <React.Fragment key={c.customer_key}>
                      <tr className="hover:bg-[#FBF6EC]/70 transition-colors">
                        <th scope="row" className="px-4 py-3 font-semibold text-left align-top">
                          <div className="flex items-center gap-2">
                            <span>{c.name || "İsimsiz Müşteri"}</span>
                            {c.has_account && (
                              <span
                                title="Üyelik hesabı mevcut"
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#EEF3F8] border border-[#C5D5E4] text-[10px] font-bold text-[#24476B]"
                              >
                                Üye
                              </span>
                            )}
                          </div>
                          {c.email && <div className="text-xs font-normal text-[#6E5148] mt-0.5">{c.email}</div>}
                        </th>

                        <td className="px-4 py-3 align-top">
                          <div className="font-mono tabular-nums text-xs font-medium text-[#3B1E1A]">
                            {c.phone || "—"}
                          </div>
                          <div className="text-xs text-[#6E5148] mt-0.5">{c.neighborhood || "Mahalle belirtilmemiş"}</div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.cls}`}
                          >
                            <BadgeIcon className="w-3 h-3" aria-hidden="true" />
                            {badge.label}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold align-top">
                          {c.order_count}
                        </td>

                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#1D5130] align-top">
                          {Number(c.total_spent || 0).toLocaleString("tr-TR")} ₺
                        </td>

                        <td className="px-4 py-3 font-mono tabular-nums text-xs text-[#6E5148] align-top">
                          {formatLastOrderDate(c.last_order_date)}
                        </td>

                        <td className="px-4 py-3 text-right align-top">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {c.phone && (
                              <a
                                href={`tel:${c.phone.replace(/\s+/g, "")}`}
                                aria-label={`${c.name} telefon et`}
                                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F3E2D4]"
                              >
                                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                              </a>
                            )}
                            {waHref && (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${c.name} WhatsApp mesajı gönder`}
                                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-[#1D5130] hover:bg-[#D4E7D8]"
                              >
                                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              </a>
                            )}
                            <Link
                              href={`/admin/siparisler/yeni?phone=${encodeURIComponent(c.phone)}&name=${encodeURIComponent(c.name)}&neighborhood=${encodeURIComponent(c.neighborhood || "")}&address=${encodeURIComponent(c.address || "")}`}
                              aria-label={`${c.name} için yeni sipariş`}
                              className="min-h-[44px] px-2.5 inline-flex items-center gap-1 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] hover:bg-[#F3E2D4]"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
                              <span className="hidden xl:inline">Sipariş</span>
                            </Link>
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-label={`${c.name} detayını ${isExpanded ? "gizle" : "göster"}`}
                              onClick={() => setExpandedKey(isExpanded ? null : c.customer_key)}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A]"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="w-4 h-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[#FBF6EC]/60">
                          <td colSpan={7} className="px-4 py-3 text-xs text-[#3B1E1A]">
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-[#8E3D1B] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>
                                  <strong>Adres:</strong> {c.address || "Kayıtlı adres yok"}
                                </span>
                              </div>
                              {c.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-[#8E3D1B] shrink-0" aria-hidden="true" />
                                  <span>{c.email}</span>
                                </div>
                              )}
                              <div className="text-[#6E5148] font-mono tabular-nums">
                                Anahtar: {c.customer_key}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama Çubuğu */}
        <div className="px-4 py-3.5 border-t border-[#E2D3BD] bg-[#FBF6EC] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#6E5148]">
            Toplam <strong className="font-mono tabular-nums text-[#3B1E1A]">{total}</strong> kayıttan{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {rangeStart}–{rangeEnd}
            </strong>{" "}
            arası gösteriliyor
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset <= 0 || loading}
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_LIMIT))}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] hover:bg-[#F3E2D4] inline-flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Önceki</span>
            </button>

            <span className="text-xs font-mono tabular-nums font-semibold text-[#3B1E1A] px-2">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={offset + PAGE_LIMIT >= total || loading}
              onClick={() => setOffset((prev) => prev + PAGE_LIMIT)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] hover:bg-[#F3E2D4] inline-flex items-center gap-1 disabled:opacity-40"
            >
              <span>Sonraki</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
