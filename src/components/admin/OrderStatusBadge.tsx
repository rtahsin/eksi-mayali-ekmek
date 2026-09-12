"use client";

import React from "react";
import { AdminOrderStatus } from "@/types/admin";
import { Clock, ChefHat, Flame, Truck, CheckCircle2, XCircle } from "lucide-react";

interface OrderStatusBadgeProps {
  status: AdminOrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  switch (status) {
    case "bekliyor":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-sans font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Yeni / Bekliyor</span>
        </span>
      );
    case "hazirlaniyor":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-500/40 text-orange-300 text-xs font-sans font-medium">
          <ChefHat className="w-3.5 h-3.5 text-orange-400" />
          <span>Hazırlanıyor</span>
        </span>
      );
    case "firinda":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-sans font-medium animate-pulse">
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>Fırında Pişiyor</span>
        </span>
      );
    case "kuryede":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-sans font-medium">
          <Truck className="w-3.5 h-3.5 text-blue-400" />
          <span>Kurye Dağıtımda</span>
        </span>
      );
    case "teslim_edildi":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-sans font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Teslim Edildi</span>
        </span>
      );
    case "iptal":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 text-stone-400 text-xs font-sans">
          <XCircle className="w-3.5 h-3.5 text-stone-500" />
          <span>İptal Edildi</span>
        </span>
      );
    default:
      return null;
  }
}
