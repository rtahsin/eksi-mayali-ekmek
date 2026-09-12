"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  TrendingUp,
  Award,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { AdminOrder } from "@/types/admin";
import Link from "next/link";

interface CustomerProfile {
  phone: string;
  name: string;
  neighborhood: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
  favoriteItems: Record<string, number>;
  status: "vip" | "yeni" | "aktif" | "pasif";
}

export default function AdminCustomersPage() {
  const { allOrders, loading } = useAdminOrders();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Aggregate Customer Profiles from All Orders
  const customers = useMemo(() => {
    const map: Record<string, CustomerProfile> = {};

    // Sort chronologically
    const sorted = [...allOrders].sort((a, b) => {
      const dateA = a.deliveryDate || "";
      const dateB = b.deliveryDate || "";
      return dateA.localeCompare(dateB);
    });

    sorted.forEach((order) => {
      const cleanPhone = order.phone.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 7) return;

      if (!map[cleanPhone]) {
        map[cleanPhone] = {
          phone: order.phone,
          name: order.customerName || "İsimsiz",
          neighborhood: order.neighborhood || "Beylikdüzü",
          address: order.deliveryAddress || "",
          orderCount: 0,
          totalSpent: 0,
          firstOrderDate: order.deliveryDate,
          lastOrderDate: order.deliveryDate,
          favoriteItems: {},
          status: "yeni",
        };
      }

      const c = map[cleanPhone];
      c.orderCount += 1;
      c.totalSpent += Number(order.totalAmount) || 0;
      c.lastOrderDate = order.deliveryDate;
      if (order.neighborhood) c.neighborhood = order.neighborhood;
      if (order.deliveryAddress) c.address = order.deliveryAddress;
      if (order.customerName && (!c.name || c.name === "İsimsiz")) c.name = order.customerName;

      // Track favorite products
      order.items.forEach((it) => {
        c.favoriteItems[it.productName] = (c.favoriteItems[it.productName] || 0) + it.quantity;
      });
    });

    // Compute status
    const now = new Date().getTime();
    Object.values(map).forEach((c) => {
      const lastDate = new Date(c.lastOrderDate).getTime();
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

      if (c.orderCount >= 4 || c.totalSpent >= 1500) {
        c.status = "vip";
      } else if (diffDays > 30) {
        c.status = "pasif";
      } else if (c.orderCount === 1) {
        c.status = "yeni";
      } else {
        c.status = "aktif";
      }
    });

    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [allOrders]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchNeighborhood = c.neighborhood.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNeighborhood) return false;
      }

      return true;
    });
  }, [customers, filterStatus, searchQuery]);

  // KPIs
  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => c.status === "vip").length;
  const passiveCount = customers.filter((c) => c.status === "pasif").length;
  const avgSpend =
    totalCustomers > 0
      ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / totalCustomers)
      : 0;

  // WhatsApp Reactivation Message
  const openReactivationWhatsApp = (c: CustomerProfile) => {
    const cleanPhone = c.phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("90")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `9${cleanPhone}`
      : `90${cleanPhone}`;

    const text = `Merhaba ${c.name} Hanım/Bey, EkmekLab taş fırınımızdan sıcacık selamlar! 🌾 36 saatlik soğuk fermantasyonla hazırladığımız taze ekşi mayalı ekmeklerimiz fırından yeni çıktı. Beylikdüzü kuryemiz bugün sizin mahallenize de uğrayacak. Tekrar sipariş oluşturmak ister misiniz? Afiyetle kalın! 🍞`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Müşteri Sadakati & CRM</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-100 font-serif">
            Müşteri Masası & VIP Analitiği
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Sipariş geçmişi, toplam harcama (LTV), sadık VIP müşteriler ve pasif müşterileri geri kazanma.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Toplam Tekil Müşteri</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-stone-100 font-serif mt-2">
            {totalCustomers} <span className="text-sm font-normal text-stone-400">kişi</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Beylikdüzü ve çevresi</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>VIP & Sadık Müşteri</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-amber-400 font-serif mt-2">
            {vipCount} <span className="text-sm font-normal text-stone-400">müşteri</span>
          </div>
          <p className="text-xs text-amber-500/80 mt-1">Yüksek hacimli devamlı alıcılar</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Ortalama Müşteri Değeri</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-400 font-serif mt-2">
            {avgSpend.toLocaleString("tr-TR")} ₺
          </div>
          <p className="text-xs text-emerald-500/80 mt-1">Müşteri başı ortalama harcama</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Pasif Müşteriler</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-orange-400 font-serif mt-2">
            {passiveCount} <span className="text-sm font-normal text-stone-400">müşteri</span>
          </div>
          <p className="text-xs text-orange-500/80 mt-1">30+ gündür sipariş vermemiş</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İsim, telefon veya mahalle ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "all"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Tüm Müşteriler ({totalCustomers})
          </button>
          <button
            onClick={() => setFilterStatus("vip")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "vip"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            ⭐ VIP ({vipCount})
          </button>
          <button
            onClick={() => setFilterStatus("aktif")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "aktif"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setFilterStatus("yeni")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "yeni"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Yeni
          </button>
          <button
            onClick={() => setFilterStatus("pasif")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "pasif"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            💤 Pasif ({passiveCount})
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-stone-400 text-xs">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Müşteri veritabanı taranıyor...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center text-stone-400 text-xs">
            Kriterlere uygun müşteri bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/40">
                  <th className="py-3 px-4">Müşteri</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Mahalle / Konum</th>
                  <th className="py-3 px-4">Sipariş Sayısı</th>
                  <th className="py-3 px-4">Toplam Harcama</th>
                  <th className="py-3 px-4">Son Sipariş</th>
                  <th className="py-3 px-4 text-right">İletişim & Geri Kazan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70 text-xs">
                {filteredCustomers.map((c) => {
                  const isPassive = c.status === "pasif";
                  const isVip = c.status === "vip";

                  return (
                    <tr key={c.phone} className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-stone-100">{c.name}</div>
                          <div className="font-mono text-[11px] text-stone-400">{c.phone}</div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isVip && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                            ⭐ VIP Müşteri
                          </span>
                        )}
                        {c.status === "aktif" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                            Aktif
                          </span>
                        )}
                        {c.status === "yeni" && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                            Yeni
                          </span>
                        )}
                        {isPassive && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20">
                            💤 Pasif (30+ gün)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1 text-stone-300">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          <span>{c.neighborhood}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-stone-200">
                        {c.orderCount} sipariş
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {c.totalSpent.toLocaleString("tr-TR")} ₺
                      </td>

                      <td className="py-3.5 px-4 text-stone-400 font-mono text-[11px]">
                        {c.lastOrderDate}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`tel:${c.phone}`}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                            title="Müşteriyi Ara"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => openReactivationWhatsApp(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-all"
                            title="Taze Fırın WhatsApp Bildirimi Gönder"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{isPassive ? "Geri Kazan" : "WhatsApp"}</span>
                          </button>

                          <Link
                            href={`/admin/siparisler/yeni?phone=${c.phone}`}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                            title="Hızlı Sipariş Aç"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </Link>
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
  );
}
