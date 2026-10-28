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
  bekliyor: "bg-amber-950/60 border-amber-500/40 text-amber-300",
  hazirlaniyor: "bg-orange-950/60 border-orange-500/40 text-orange-300",
  firinda: "bg-red-950/60 border-red-500/40 text-red-300",
  kuryede: "bg-blue-950/60 border-blue-500/40 text-blue-300",
  teslim_edildi: "bg-emerald-950/60 border-emerald-500/40 text-emerald-300",
  iptal: "bg-stone-900 border-stone-700 text-stone-400",
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
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${STYLES[status]}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{statusLabel(status, deliveryMethod)}</span>
    </span>
  );
}
