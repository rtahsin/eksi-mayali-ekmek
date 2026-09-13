"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Download,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Mail,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { AdminOrder } from "@/types/admin";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface RegisteredProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
  created_at: string;
}

interface CustomerProfile {
  id?: string;
  phone: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isMudavim: boolean; // Registered user
  neighborhood: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
  favoriteItems: Record<string, number>;
  status: "vip" | "aktif" | "yeni" | "pasif" | "kayitli";
  orders: AdminOrder[];
}

export default function AdminCustomersPage() {
  const { allOrders, loading: ordersLoading } = useAdminOrders();
  const [registeredProfiles, setRegisteredProfiles] = useState<RegisteredProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);

  // Fetch registered profiles from Supabase
  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Profiles fetch error:", error);
      } else if (data) {
        setRegisteredProfiles(data);
      }
    } catch (err) {
      console.warn("Profiles catch error:", err);
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Aggregate Customer Profiles from Both Orders and Registered Profiles
  const customers = useMemo(() => {
    const map: Record<string, CustomerProfile> = {};

    // 1. Process all orders
    const sortedOrders = [...allOrders].sort((a, b) => {
      const dateA = a.deliveryDate || a.createdAt || "";
      const dateB = b.deliveryDate || b.createdAt || "";
      return dateA.localeCompare(dateB);
    });

    sortedOrders.forEach((order) => {
      const cleanPhone = (order.phone || "").replace(/\D/g, "");
      const key = cleanPhone && cleanPhone.length >= 7 ? cleanPhone : (order.customerName || "Bilinmeyen");

      if (!map[key]) {
        map[key] = {
          phone: order.phone || "",
          name: order.customerName || "İsimsiz",
          neighborhood: order.neighborhood || "Beylikdüzü",
          address: order.deliveryAddress || "",
          isMudavim: false,
          orderCount: 0,
          totalSpent: 0,
          firstOrderDate: order.deliveryDate || "",
          lastOrderDate: order.deliveryDate || "",
          favoriteItems: {},
          status: "yeni",
          orders: [],
        };
      }

      const c = map[key];
      c.orderCount += 1;
      c.totalSpent += Number(order.totalAmount) || 0;
      c.lastOrderDate = order.deliveryDate || c.lastOrderDate;
      if (order.neighborhood) c.neighborhood = order.neighborhood;
      if (order.deliveryAddress) c.address = order.deliveryAddress;
      if (order.customerName && (!c.name || c.name === "İsimsiz")) c.name = order.customerName;
      c.orders.unshift(order);

      // Favorite products
      (order.items || []).forEach((it) => {
        c.favoriteItems[it.productName] = (c.favoriteItems[it.productName] || 0) + it.quantity;
      });
    });

    // 2. Link registered profiles
    registeredProfiles.forEach((prof) => {
      const profCleanPhone = (prof.phone || "").replace(/\D/g, "");
      const matchKey = profCleanPhone && map[profCleanPhone] ? profCleanPhone : null;

      if (matchKey) {
        map[matchKey].isMudavim = true;
        map[matchKey].email = prof.email;
        map[matchKey].avatarUrl = prof.avatar_url;
        map[matchKey].id = prof.id;
        if (!map[matchKey].name || map[matchKey].name === "İsimsiz") {
          map[matchKey].name = prof.full_name || prof.email.split("@")[0];
        }
      } else {
        // Registered profile without orders yet
        const profKey = profCleanPhone || prof.email;
        if (!map[profKey]) {
          map[profKey] = {
            id: prof.id,
            phone: prof.phone || "",
            name: prof.full_name || prof.email.split("@")[0],
            email: prof.email,
            avatarUrl: prof.avatar_url,
            isMudavim: true,
            neighborhood: "Kayıtlı Üye",
            address: "Adres girilmedi",
            orderCount: 0,
            totalSpent: 0,
            firstOrderDate: prof.created_at.split("T")[0],
            lastOrderDate: "—",
            favoriteItems: {},
            status: "kayitli",
            orders: [],
          };
        }
      }
    });

    // 3. Compute status
    const now = new Date().getTime();
    Object.values(map).forEach((c) => {
      if (c.orderCount === 0) {
        c.status = "kayitli";
        return;
      }

      const lastDate = c.lastOrderDate && c.lastOrderDate !== "—" ? new Date(c.lastOrderDate).getTime() : now;
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

    return Object.values(map).sort((a, b) => {
      if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
      return b.orderCount - a.orderCount;
    });
  }, [allOrders, registeredProfiles]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterStatus === "vip" && c.status !== "vip") return false;
      if (filterStatus === "aktif" && c.status !== "aktif") return false;
      if (filterStatus === "yeni" && c.status !== "yeni") return false;
      if (filterStatus === "pasif" && c.status !== "pasif") return false;
      if (filterStatus === "kayitli" && !c.isMudavim) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchNeighborhood = (c.neighborhood || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchNeighborhood) return false;
      }

      return true;
    });
  }, [customers, filterStatus, searchQuery]);

  // KPIs
  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => c.status === "vip").length;
  const mudavimCount = customers.filter((c) => c.isMudavim).length;
  const passiveCount = customers.filter((c) => c.status === "pasif").length;
  const payingCustomers = customers.filter((c) => c.orderCount > 0);
  const avgSpend =
    payingCustomers.length > 0
      ? Math.round(payingCustomers.reduce((s, c) => s + c.totalSpent, 0) / payingCustomers.length)
      : 0;

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ["Müşteri Adı", "Telefon", "E-posta", "Müdavim Mi", "Durum", "Mahalle", "Sipariş Sayısı", "Toplam Harcama (TL)", "Son Sipariş"],
      ...customers.map((c) => [
        c.name,
        c.phone,
        c.email || "",
        c.isMudavim ? "Evet" : "Hayır",
        c.status,
        c.neighborhood,
        c.orderCount.toString(),
        c.totalSpent.toString(),
        c.lastOrderDate,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ekmeklab_musteri_listesi_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Reactivation Message
  const openReactivationWhatsApp = (c: CustomerProfile) => {
    const cleanPhone = c.phone.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("Bu müşteriye ait kayıtlı telefon numarası bulunmuyor.");
      return;
    }
    const formatted = cleanPhone.startsWith("90")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `9${cleanPhone}`
      : `90${cleanPhone}`;

    const text = `Merhaba ${c.name} Hanım/Bey, EkmekLab taş fırınımızdan sıcacık selamlar! 🌾 36 saatlik soğuk fermantasyonla hazırladığımız taze ekşi mayalı ekmeklerimiz fırından yeni çıktı. Beylikdüzü kuryemiz bugün sizin mahallenize de uğrayacak. Tekrar sipariş oluşturmak ister misiniz? Afiyetle kalın! 🍞`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const loading = ordersLoading || profilesLoading;

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
            Müşteri Masası & Müdavim Kulübü
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Kayıtlı üyeler, sipariş geçmişi, LTV harcama analizleri ve WhatsApp iletişimi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchProfiles}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-all"
            title="Yenile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel / CSV İndir</span>
          </button>
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
            <span>Müdavim Kulübü Üyesi</span>
            <UserCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-sky-400 font-serif mt-2">
            {mudavimCount} <span className="text-sm font-normal text-stone-400">kayıtlı</span>
          </div>
          <p className="text-xs text-sky-500/80 mt-1">Google / E-posta ile giriş yapanlar</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>VIP Sadık Alıcılar</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-amber-400 font-serif mt-2">
            {vipCount} <span className="text-sm font-normal text-stone-400">müşteri</span>
          </div>
          <p className="text-xs text-amber-500/80 mt-1">4+ sipariş veya 1.500 ₺ üzeri</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
            <span>Ortalama Müşteri Harcaması</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-400 font-serif mt-2">
            {avgSpend.toLocaleString("tr-TR")} ₺
          </div>
          <p className="text-xs text-emerald-500/80 mt-1">Sipariş veren müşteri ortalaması</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İsim, telefon, e-posta veya mahalle ile ara..."
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
                ? "bg-amber-500 text-stone-950 font-bold"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Tüm Müşteriler ({totalCustomers})
          </button>
          <button
            onClick={() => setFilterStatus("kayitli")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "kayitli"
                ? "bg-sky-500 text-stone-950 font-bold"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Müdavim Üyeler ({mudavimCount})
          </button>
          <button
            onClick={() => setFilterStatus("vip")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "vip"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            ⭐ VIP ({vipCount})
          </button>
          <button
            onClick={() => setFilterStatus("aktif")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "aktif"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setFilterStatus("pasif")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "pasif"
                ? "bg-amber-500 text-stone-950 font-bold"
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
            Müşteri ve Müdavim veritabanı taranıyor...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center text-stone-400 text-xs">
            Kriterlere uygun müşteri veya üye bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/40">
                  <th className="py-3 px-4">Müşteri / Üye</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Mahalle / Konum</th>
                  <th className="py-3 px-4">Sipariş Sayısı</th>
                  <th className="py-3 px-4">Toplam Harcama</th>
                  <th className="py-3 px-4">Son Sipariş</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70 text-xs">
                {filteredCustomers.map((c) => {
                  const isPassive = c.status === "pasif";
                  const isVip = c.status === "vip";
                  const isExpanded = expandedPhone === (c.phone || c.email || c.name);

                  return (
                    <React.Fragment key={c.phone || c.email || c.name}>
                      <tr className="hover:bg-stone-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 font-bold shrink-0">
                              {c.name ? c.name.charAt(0).toUpperCase() : "M"}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-stone-100">{c.name}</span>
                                {c.isMudavim && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold" title="Müdavim Kulübü Üyesi">
                                    Müdavim
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-stone-400">
                                {c.phone || (c.email ? c.email : "Telefon yok")}
                              </div>
                            </div>
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
                              Yeni Müşteri
                            </span>
                          )}
                          {c.status === "kayitli" && (
                            <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-medium border border-stone-700">
                              Kayıtlı (Siparişsiz)
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
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{c.neighborhood}</span>
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
                          <div className="flex items-center justify-end gap-1.5">
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                                title="Müşteriyi Ara"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {c.phone && (
                              <button
                                onClick={() => openReactivationWhatsApp(c)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-all"
                                title="WhatsApp Mesajı Aç"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isPassive ? "Geri Kazan" : "WhatsApp"}</span>
                              </button>
                            )}

                            {c.phone && (
                              <Link
                                href={`/admin/siparisler/yeni?phone=${encodeURIComponent(c.phone)}`}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                                title="Hızlı Sipariş Aç"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                              </Link>
                            )}

                            <button
                              onClick={() => setExpandedPhone(isExpanded ? null : (c.phone || c.email || c.name))}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                              title="Detayları Göster"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-stone-950/60 border-b border-stone-800">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Address & Contact */}
                              <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800 space-y-2">
                                <h4 className="font-bold text-stone-200 flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Teslimat & İletişim Bilgileri</span>
                                </h4>
                                <div className="text-stone-400 space-y-1">
                                  <div><strong>Adres:</strong> {c.address || "Belirtilmemiş"}</div>
                                  <div><strong>Mahalle:</strong> {c.neighborhood}</div>
                                  {c.email && <div><strong>E-posta:</strong> {c.email}</div>}
                                  {c.phone && <div><strong>Telefon:</strong> {c.phone}</div>}
                                </div>
                              </div>

                              {/* Favorite Items */}
                              <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800 space-y-2">
                                <h4 className="font-bold text-stone-200 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Favori Ürünler</span>
                                </h4>
                                {Object.keys(c.favoriteItems).length === 0 ? (
                                  <div className="text-stone-500">Henüz ürün geçmişi yok</div>
                                ) : (
                                  <div className="space-y-1">
                                    {Object.entries(c.favoriteItems)
                                      .sort(([, a], [, b]) => b - a)
                                      .slice(0, 5)
                                      .map(([name, qty]) => (
                                        <div key={name} className="flex justify-between text-stone-300">
                                          <span>{name}</span>
                                          <span className="font-mono text-amber-400 font-bold">{qty} adet</span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>

                              {/* Recent Orders List */}
                              <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800 space-y-2">
                                <h4 className="font-bold text-stone-200 flex items-center gap-1.5">
                                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Son Siparişler ({c.orders.length})</span>
                                </h4>
                                {c.orders.length === 0 ? (
                                  <div className="text-stone-500">Henüz sipariş vermedi</div>
                                ) : (
                                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                    {c.orders.slice(0, 4).map((o) => (
                                      <div key={o.id} className="flex items-center justify-between p-1.5 rounded-lg bg-stone-950/60 border border-stone-800/80">
                                        <div>
                                          <div className="font-mono font-bold text-stone-200 text-[11px]">{o.id}</div>
                                          <div className="text-[10px] text-stone-400">{o.deliveryDate}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-mono font-bold text-amber-400 text-[11px]">{o.totalAmount} ₺</div>
                                          <Link
                                            href={`/admin/siparisler/${o.id}`}
                                            className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5 justify-end"
                                          >
                                            Detay <ExternalLink className="w-2.5 h-2.5" />
                                          </Link>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
