"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Truck,
  Plus,
  ArrowLeft,
  Users,
  Power,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useCouriers } from "@/hooks/useCouriers";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { CourierCard } from "@/components/admin/kurye/CourierCard";
import { CourierFormModal } from "@/components/admin/kurye/CourierFormModal";
import { Courier } from "@/types/courier";

export default function AdminCourierManagementPage() {
  const {
    couriers,
    activeCouriers,
    loading,
    error,
    toggleCourierShift,
    updateCourier,
    refetch,
  } = useCouriers();

  const { allOrders } = useAdminOrders();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);

  const handleEditCourier = (courier: Courier) => {
    setSelectedCourier(courier);
    setFormModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedCourier(null);
    setFormModalOpen(true);
  };

  const handleToggleShift = async (courierId: string, currentShift: boolean) => {
    await toggleCourierShift(courierId, !currentShift);
  };

  const handleToggleActive = async (courierId: string, currentActive: boolean) => {
    await updateCourier(courierId, { isActive: !currentActive });
  };

  // Calculate stats for today
  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = allOrders.filter((o) => o.deliveryDate === todayStr);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-xs text-stone-400 hover:text-stone-200 inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Paneli</span>
            </Link>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F7EBD3]">
            Kurye Filosu Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 font-sans mt-0.5">
            Aktif kuryeler, vardiya durumları ve teslimat yükü takibi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/kurye"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#201812] hover:bg-[#2B2018] border border-[#261E17] text-stone-200 text-xs font-medium transition-all"
          >
            <ExternalLink className="w-4 h-4 text-[#F59E0B]" />
            <span>Kurye Mobil Konsolu</span>
          </Link>

          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black text-xs font-serif font-bold shadow-lg shadow-amber-500/10 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kurye Ekle</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <Users className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Toplam Kayıtlı Kurye</span>
          </div>
          <div className="font-serif text-2xl font-bold text-stone-100">{couriers.length}</div>
          <div className="text-[10px] text-stone-500 font-sans">Kayıtlı dağıtım personeli</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <Power className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vardiyada (Aktif)</span>
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-400">
            {activeCouriers.length}
          </div>
          <div className="text-[10px] text-emerald-500/80 font-sans">Sipariş almaya hazır</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Kuryedeki Paketler</span>
          </div>
          <div className="font-serif text-2xl font-bold text-blue-400">
            {todayOrders.filter((o) => o.status === "kuryede").length}
          </div>
          <div className="text-[10px] text-stone-500 font-sans">Şu an yolda</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Bugün Tamamlanan</span>
          </div>
          <div className="font-serif text-2xl font-bold text-stone-100">
            {todayOrders.filter((o) => o.status === "teslim_edildi").length}
          </div>
          <div className="text-[10px] text-stone-500 font-sans">Teslim edilen sipariş</div>
        </div>
      </div>

      {/* Courier Cards Grid */}
      {loading ? (
        <div className="p-16 text-center space-y-3 bg-[#18130F] rounded-3xl border border-[#261E17]">
          <div className="w-10 h-10 rounded-full border-2 border-[#F59E0B] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-stone-400">Kurye listesi yükleniyor...</p>
        </div>
      ) : couriers.length === 0 ? (
        <div className="p-16 text-center space-y-3 bg-[#18130F] rounded-3xl border border-[#261E17]">
          <Truck className="w-12 h-12 text-[#F59E0B] mx-auto opacity-70" />
          <h3 className="font-serif text-base font-bold text-[#F7EBD3]">
            Henüz Kayıtlı Kurye Bulunmuyor
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Siparişlerinizi kuryelere atayabilmek için sağ üstteki butondan yeni bir kurye ekleyin.
          </p>
          <div className="pt-2">
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold text-xs shadow transition-all"
            >
              İlk Kuryeyi Ekle
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {couriers.map((courier) => {
            const assignedCount = todayOrders.filter((o) => o.courierId === courier.id).length;
            const completedCount = todayOrders.filter(
              (o) => o.courierId === courier.id && o.status === "teslim_edildi"
            ).length;

            return (
              <CourierCard
                key={courier.id}
                courier={courier}
                assignedOrderCount={assignedCount}
                completedOrderCount={completedCount}
                onEdit={handleEditCourier}
                onToggleShift={handleToggleShift}
                onToggleActive={handleToggleActive}
              />
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <CourierFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        courier={selectedCourier}
        onSaved={refetch}
      />
    </div>
  );
}
