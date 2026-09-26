"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Award,
  Calendar,
  MessageCircle,
  ExternalLink,
  Plus,
  Package,
  History,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { AdminOrder } from "@/types/admin";

interface RegisteredProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
  created_at: string;
  total_orders?: number;
  total_spent?: number;
  last_order_at?: string;
}

interface SavedAddress {
  id: string;
  title: string;
  district: string;
  neighborhood: string;
  address_detail: string;
}

export default function SingleCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const identifier = decodeURIComponent(resolvedParams.id);

  const { allOrders, loading: ordersLoading } = useAdminOrders();
  const [profile, setProfile] = useState<RegisteredProfile | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  // Fetch registered profile if exists
  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setLoadingProfile(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`id.eq.${identifier},phone.eq.${identifier}`)
          .maybeSingle();

        if (data) {
          setProfile(data);
          // Load addresses
          const { data: addrData } = await supabase
            .from("saved_addresses")
            .select("*")
            .eq("user_id", data.id);
          if (addrData) setAddresses(addrData);
        }
      } catch (err) {
        console.warn("Error loading customer profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [identifier, supabase]);

  // Filter orders matching customer
  const cleanId = identifier.replace(/\D/g, "");
  const customerOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const orderCleanPhone = (o.phone || "").replace(/\D/g, "");
      if (cleanId && orderCleanPhone && (orderCleanPhone === cleanId || cleanId.includes(orderCleanPhone))) {
        return true;
      }
      if (profile?.id && o.userId === profile.id) return true;
      if (o.customerName && o.customerName.toLowerCase() === identifier.toLowerCase()) return true;
      return false;
    });
  }, [allOrders, identifier, cleanId, profile?.id]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalSpent = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = customerOrders.length;
    const avgBasket = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

    // Favorite items
    const favMap: Record<string, number> = {};
    customerOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        favMap[it.productName] = (favMap[it.productName] || 0) + it.quantity;
      });
    });

    const favoriteList = Object.entries(favMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSpent,
      orderCount,
      avgBasket,
      favoriteList,
    };
  }, [customerOrders]);

  const customerName = profile?.full_name || customerOrders[0]?.customerName || identifier;
  const customerPhone = profile?.phone || customerOrders[0]?.phone || (cleanId ? identifier : "");
  const customerEmail = profile?.email || null;
  const customerAddress = customerOrders[0]?.deliveryAddress || addresses[0]?.address_detail || "Adres bulunmuyor";

  const isVip = stats.orderCount >= 4 || stats.totalSpent >= 1500;

  if (ordersLoading && loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-400 text-xs font-serif">Müşteri analitiği yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/musteriler"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Müşteri Listesine Geri Dön</span>
        </Link>

        <div className="flex items-center gap-2">
          {customerPhone && (
            <a
              href={`https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Merhaba ${customerName}, EkmekLab taş fırınından ulaşıyoruz.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          <Link
            href={`/admin/siparisler/yeni?phone=${encodeURIComponent(customerPhone)}&name=${encodeURIComponent(customerName)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black text-xs font-serif font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Sipariş Gir</span>
          </Link>
        </div>
      </div>

      {/* Customer Profile Banner */}
      <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B] text-xl font-serif font-bold shrink-0">
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#F7EBD3]">
                {customerName}
              </h1>
              {isVip ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  <span>VIP Müşteri</span>
                </span>
              ) : profile ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Kayıtlı Müdavim
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 font-mono pt-1">
              {customerPhone && (
                <a href={`tel:${customerPhone}`} className="hover:text-[#F59E0B] flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>{customerPhone}</span>
                </a>
              )}
              {customerEmail && (
                <span className="flex items-center gap-1 text-stone-300">
                  <Mail className="w-3 h-3" />
                  <span>{customerEmail}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Analytics Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <ShoppingBag className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Toplam Sipariş</span>
          </div>
          <div className="font-serif text-2xl font-bold text-stone-100">{stats.orderCount}</div>
          <div className="text-[10px] text-stone-500">Tamamlanan alışverişler</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Toplam Harcama</span>
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-400">
            {stats.totalSpent.toLocaleString("tr-TR")} ₺
          </div>
          <div className="text-[10px] text-stone-500">Kümülatif ciro</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span>Ortalama Sepet</span>
          </div>
          <div className="font-serif text-2xl font-bold text-stone-100">{stats.avgBasket} ₺</div>
          <div className="text-[10px] text-stone-500">Sipariş başı tutar</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Son Sipariş Tarihi</span>
          </div>
          <div className="font-serif text-sm font-bold text-stone-200 mt-2">
            {customerOrders[0]?.deliveryDate || "—"}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Orders & Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order History Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-4">
            <h3 className="font-serif font-bold text-stone-100 text-base flex items-center gap-2">
              <History className="w-4 h-4 text-[#F59E0B]" />
              <span>Sipariş Geçmişi ({customerOrders.length})</span>
            </h3>

            {customerOrders.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-4">Bu müşteriye ait kayıtlı sipariş bulunmuyor.</p>
            ) : (
              <div className="divide-y divide-[#261E17]">
                {customerOrders.map((o) => (
                  <div key={o.id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/siparisler/${o.id}`}
                          className="font-mono font-bold text-[#F59E0B] hover:underline"
                        >
                          #{o.orderNumber || o.id}
                        </Link>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {o.deliveryDate} • {o.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-stone-100 block">{o.totalAmount} ₺</span>
                      <Link
                        href={`/admin/siparisler/${o.id}`}
                        className="text-[10px] text-stone-400 hover:text-stone-200 inline-flex items-center gap-0.5 mt-0.5"
                      >
                        <span>Detay</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preferences & Addresses */}
        <div className="space-y-6">
          {/* Favorite Items */}
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-3 text-xs">
            <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F59E0B]" />
              <span>En Çok Sipariş Edilenler</span>
            </h3>

            {stats.favoriteList.length === 0 ? (
              <p className="text-xs text-stone-500 italic">Ürün verisi bulunmuyor.</p>
            ) : (
              <div className="divide-y divide-[#261E17]">
                {stats.favoriteList.slice(0, 5).map((fav, i) => (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <span className="text-stone-300 font-medium">{fav.name}</span>
                    <span className="font-mono font-bold text-[#F59E0B]">{fav.count} adet</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Addresses */}
          <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 shadow space-y-3 text-xs">
            <h3 className="font-serif font-bold text-stone-100 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F59E0B]" />
              <span>Kayıtlı / Son Adres</span>
            </h3>

            <p className="text-stone-300 leading-relaxed bg-[#120E0B] p-3 rounded-xl border border-[#261E17]">
              {customerAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
