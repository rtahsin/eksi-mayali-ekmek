"use client";

import React from "react";
import { AdminOrder, AdminOrderStatus } from "@/types/admin";
import { Clock, ChefHat, Flame, Truck, CheckCircle2, XCircle, Store } from "lucide-react";
import { statusLabel } from "@/lib/orders/adminFlow";

interface OrderStatusBadgeProps {
  status: AdminOrderStatus;
  deliveryMethod?: AdminOrder["deliveryMethod"];
}

const STYLES: Record<AdminOrderStatus, string> = {
  bekliyor: "bg-[#FEF3D6] border-[#E8C587] text-[#7A4A0B]",
  hazirlaniyor: "bg-[#F3E2D4] border-[#DFB99F] text-[#8E3D1B]",
  firinda: "bg-[#B4532A] border-[#9C4421] text-white",
  kuryede: "bg-[#EEF3F8] border-[#C5D5E4] text-[#24476B]",
  teslim_edildi: "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]",
  iptal: "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]",
};

export function OrderStatusBadge({ status, deliveryMethod = "courier" }: OrderStatusBadgeProps) {
  const Icon =
    status === "bekliyor"
      ? Clock
      : status === "hazirlaniyor"
      ? ChefHat
      : status === "firinda"
      ? Flame
      : status === "kuryede"
      ? deliveryMethod === "pickup"
        ? Store
        : Truck
      : status === "teslim_edildi"
      ? CheckCircle2
      : XCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${STYLES[status]}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{statusLabel(status, deliveryMethod)}</span>
    </span>
  );
}
