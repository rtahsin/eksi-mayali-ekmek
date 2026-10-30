"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Phone, MessageCircle, MapPin, ShoppingBag, Download, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { AdminOrder } from "@/types/admin";
import { createClient } from "@/lib/supabase/client";
import { addDays, formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { whatsappLink } from "@/lib/site";

// Müşteriler: sipariş verenler (telefona göre birleşir) + siteye Google ile giriş yapanlar.

interface RegisteredProfile {
  id: string;
  email: string | null;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

interface Customer {
  key: string;
  phone: string;
  name: string;
  email?: string;
  hasAccount: boolean;
  neighborhood: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  favoriteItems: Record<string, number>;
  orders: AdminOrder[];
}

type Filter = "all" | "ordered" | "away";

/** 30 günden uzun süredir sipariş vermeyen. */
const AWAY_DAYS = 30;

const tl = (v: number) => `${v.toLocaleString("tr-TR")} ₺`;

export default function AdminCustomersPage() {
  const { allOrders, loading: ordersLoading } = useAdminOrders({ history: true });
  const [profiles, setProfiles] = useState<RegisteredProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true);
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) console.warn("Profiles fetch error:", error);
      else if (data) setProfiles(data);
    } catch (err) {
      console.warn("Profiles catch error:", err);
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const customers = useMemo(() => {
    const map: Record<string, Customer> = {};

    const sortedOrders = [...allOrders].sort((a, b) =>
      (a.deliveryDate || a.createdAt || "").localeCompare(b.deliveryDate || b.createdAt || "")
    );

    const cancelledOrders: [string, AdminOrder][] = [];
    sortedOrders.forEach((order) => {
      const cleanPhone = (order.phone || "").replace(/\D/g, "");
      const key = cleanPhone.length >= 7 ? cleanPhone : order.customerName || "Bilinmeyen";
      const cancelled = order.status === "iptal";
      // Yalnız iptal siparişi olan (deneme vb.) müşteri listelenmez; var olanın geçmişinde görünür
      if (cancelled) {
        cancelledOrders.push([key, order]);
        return;
      }
      // Fırından alımda adres yok: mahalle/adres yalnız adrese teslimden
      const courier = order.deliveryMethod !== "pickup";
      if (!map[key]) {
        map[key] = {
          key,
          phone: order.phone || "",
          name: order.customerName || "İsimsiz",
          hasAccount: false,
          neighborhood: courier ? order.neighborhood || "" : "",
          address: courier ? order.deliveryAddress || "" : "",
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          favoriteItems: {},
          orders: [],
        };
      }
      const c = map[key];
      c.orderCount += 1;
      c.totalSpent += Number(order.totalAmount) || 0;
      c.lastOrderDate = order.deliveryDate || c.lastOrderDate;
      if (courier && order.neighborhood) c.neighborhood = order.neighborhood;
      if (courier && order.deliveryAddress) c.address = order.deliveryAddress;
      if (order.customerName && c.name === "İsimsiz") c.name = order.customerName;
      c.orders.unshift(order);
      (order.items || []).forEach((it) => {
        c.favoriteItems[it.productName] = (c.favoriteItems[it.productName] || 0) + it.quantity;
      });
    });

    for (const [key, order] of cancelledOrders) {
      const c = map[key];
      if (!c) continue;
      c.orders.push(order);
      c.orders.sort((a, b) =>
        (b.deliveryDate || b.createdAt || "").localeCompare(a.deliveryDate || a.createdAt || "")
      );
    }

    profiles.forEach((prof) => {
      const profPhone = (prof.phone || "").replace(/\D/g, "");
      const fallbackName = prof.full_name || (prof.email ? prof.email.split("@")[0] : "Kayıtlı müşteri");
      const existing = profPhone ? map[profPhone] : undefined;
      if (existing) {
        existing.hasAccount = true;
        existing.email = prof.email || undefined;
        if (existing.name === "İsimsiz") existing.name = fallbackName;
        return;
      }
      const key = profPhone || prof.email || prof.id;
      if (map[key]) return;
      map[key] = {
        key,
        phone: prof.phone || "",
        name: fallbackName,
        email: prof.email || undefined,
        hasAccount: true,
        neighborhood: "",
        address: "",
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        favoriteItems: {},
        orders: [],
      };
    });

    return Object.values(map).sort(
      (a, b) => (b.lastOrderDate || "").localeCompare(a.lastOrderDate || "") || b.orderCount - a.orderCount
    );
  }, [allOrders, profiles]);

  const awaySince = addDays(istanbulToday(), -AWAY_DAYS);
  const isAway = (c: Customer) => c.orderCount > 0 && !!c.lastOrderDate && c.lastOrderDate < awaySince;
  const orderedCount = customers.filter((c) => c.orderCount > 0).length;
  const awayCount = customers.filter(isAway).length;

  const filtered = customers.filter((c) => {
    if (filter === "ordered" && c.orderCount === 0) return false;
    if (filter === "away" && !isAway(c)) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.phone, c.email ?? "", c.neighborhood].some((v) => v.toLowerCase().includes(q));
  });

  const handleExportCSV = () => {
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [
      ["Ad", "Telefon", "E-posta", "Hesabı var", "Mahalle", "Sipariş", "Toplam (TL)", "Son sipariş"],
      ...customers.map((c) => [
        c.name,
        c.phone,
        c.email || "",
        c.hasAccount ? "Evet" : "Hayır",
        c.neighborhood,
        String(c.orderCount),
        String(c.totalSpent),
        c.lastOrderDate || "",
      ]),
    ];
    const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ekmeklab_musteriler_${istanbulToday()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loading = ordersLoading || profilesLoading;
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `Tümü (${customers.length})` },
    { key: "ordered", label: `Sipariş verenler (${orderedCount})` },
    { key: "away", label: `${AWAY_DAYS}+ gündür yok (${awayCount})` },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-100">Müşteriler</h1>
          <p className="text-xs text-stone-400 mt-0.5">Sipariş verenler ve siteye giriş yapanlar</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchProfiles}
            aria-label="Yenile"
            className="h-11 w-11 flex items-center justify-center rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="h-11 px-3 flex items-center gap-1.5 rounded-xl bg-stone-800 text-stone-200 text-xs font-semibold hover:bg-stone-700"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İsim, telefon, e-posta veya mahalle"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filter === f.key ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-stone-400 text-xs">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-stone-400 text-xs bg-stone-900/60 border border-stone-800 rounded-2xl">
          Bu süzgece uyan müşteri yok.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((c) => {
            const open = expanded === c.key;
            const favorites = Object.entries(c.favoriteItems).sort(([, a], [, b]) => b - a).slice(0, 5);
            return (
              <li key={c.key} className="bg-stone-900/70 border border-stone-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : c.key)}
                  aria-expanded={open}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-100">{c.name}</span>
                      {c.hasAccount && (
                        <span className="text-xs px-1.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">Hesabı var</span>
                      )}
                      {isAway(c) && (
                        <span className="text-xs px-1.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {AWAY_DAYS}+ gündür yok
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 font-mono truncate">{c.phone || c.email || "İletişim yok"}</div>
                    <div className="text-xs text-stone-400">
                      {c.orderCount > 0 ? (
                        <>
                          {c.orderCount} sipariş · <span className="text-amber-400 font-semibold">{tl(c.totalSpent)}</span>
                          {c.lastOrderDate && <> · son {formatTrDate(c.lastOrderDate)}</>}
                        </>
                      ) : (
                        "Henüz sipariş yok"
                      )}
                      {c.neighborhood && <> · {c.neighborhood}</>}
                    </div>
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-stone-500 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-500 mt-1" />}
                </button>

                {c.phone && (
                  <div className="px-4 pb-4 flex gap-2">
                    <a href={`tel:${c.phone}`} className="h-11 px-3 flex items-center gap-1.5 rounded-xl bg-stone-800 text-stone-200 text-xs font-semibold">
                      <Phone className="w-4 h-4" /> Ara
                    </a>
                    <a
                      href={whatsappLink(`Merhaba ${c.name}, EkmekLab'dan yazıyorum.`, toWhatsAppNumber(c.phone))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                    <Link
                      href={`/admin/siparisler/yeni?phone=${encodeURIComponent(c.phone)}`}
                      className="h-11 px-3 flex items-center gap-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold"
                    >
                      <ShoppingBag className="w-4 h-4" /> Sipariş
                    </Link>
                  </div>
                )}

                {open && (
                  <div className="border-t border-stone-800 p-4 space-y-4 text-xs">
                    <div className="space-y-1 text-stone-400">
                      {c.address && (
                        <div className="flex gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{c.address}</span>
                        </div>
                      )}
                      {c.email && <div>E-posta: {c.email}</div>}
                    </div>

                    {favorites.length > 0 && (
                      <div className="space-y-1">
                        <h3 className="font-bold text-stone-300">En çok aldıkları</h3>
                        {favorites.map(([name, qty]) => (
                          <div key={name} className="flex justify-between text-stone-400">
                            <span>{name}</span>
                            <span className="font-mono text-stone-200">{qty} adet</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {c.orders.length > 0 && (
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-stone-300">Son siparişler</h3>
                        {c.orders.slice(0, 5).map((o) => (
                          <Link
                            key={o.id}
                            href={`/admin/siparisler/${o.id}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-stone-700"
                          >
                            <span className="text-stone-300">
                              {o.deliveryDate ? formatTrDate(o.deliveryDate) : "—"}
                              {o.status === "iptal" && <span className="text-stone-500"> · iptal</span>}
                            </span>
                            <span className="font-mono text-amber-400">{tl(Number(o.totalAmount) || 0)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
