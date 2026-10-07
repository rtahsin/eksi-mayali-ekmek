"use client";

import React from "react";
import { ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";
import { AdminOrder } from "@/types/admin";

interface CourierQueueListProps {
  pendingOrders: AdminOrder[];
  deliveredOrders: AdminOrder[];
  currentStopId?: string;
  onSelectStop: (index: number) => void;
  onMoveStop: (orderId: string, direction: "up" | "down") => void;
  onOpenSettlement: (order: AdminOrder) => void;
  totalCount: number;
}

export function CourierQueueList({
  pendingOrders,
  deliveredOrders,
  currentStopId,
  onSelectStop,
  onMoveStop,
  onOpenSettlement,
  totalCount,
}: CourierQueueListProps) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-stone-300 font-serif">
          Rota ({pendingOrders.length} bekleyen / {totalCount} toplam)
        </span>
        <span className="text-stone-500 text-xs">Oklarla sırala</span>
      </div>

      <div className="space-y-2">
        {pendingOrders.map((order, idx) => {
          const isCurrent = currentStopId === order.id;

          return (
            <div
              key={order.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isCurrent
                  ? "bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10"
                  : "bg-stone-900/80 border-stone-800 hover:border-stone-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Index + Reorder Arrows */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => onMoveStop(order.id, "up")}
                      disabled={idx === 0}
                      className="p-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-stone-800 text-stone-300 transition-colors"
                      title="Yukarı Taşı"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveStop(order.id, "down")}
                      disabled={idx === pendingOrders.length - 1}
                      className="p-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-stone-800 text-stone-300 transition-colors"
                      title="Aşağı Taşı"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      isCurrent
                        ? "bg-amber-500 text-stone-950 font-bold"
                        : "bg-stone-800 text-stone-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                </div>

                {/* Customer Info (clickable to select stop) */}
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectStop(idx)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-200 truncate">
                      {order.customerName}
                    </span>
                    {order.locationShared && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Canlı Konum Var" />
                    )}
                  </div>
                  <div className="text-xs text-stone-400 truncate">
                    {order.neighborhood} · {order.deliveryAddress}
                  </div>
                </div>

                {/* Amount & Fast Action */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="text-xs font-bold font-mono text-stone-100">
                      {order.totalAmount} ₺
                    </div>
                    <div className="text-xs font-semibold">
                      {order.cariId || order.paymentMethod === "cari" ? (
                        <span className="text-orange-300">Cari</span>
                      ) : order.paymentStatus === "paid" ? (
                        <span className="text-emerald-400">Ödendi</span>
                      ) : order.paymentMethod === "pos_at_door" ? (
                        <span className="text-amber-300">POS</span>
                      ) : order.paymentMethod === "transfer" ? (
                        <span className="text-amber-300">Havale</span>
                      ) : (
                        <span className="text-amber-400">Nakit</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenSettlement(order)}
                    className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-stone-950 text-xs font-bold rounded-xl border border-emerald-500/40 transition-colors"
                    title="Hızlı Teslim Onayı"
                  >
                    Teslim
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Delivered List Accordion/Section */}
        {deliveredOrders.length > 0 && (
          <div className="pt-3">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Tamamlanan Teslimatlar ({deliveredOrders.length})
            </div>
            <div className="space-y-1.5 opacity-60">
              {deliveredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-2.5 rounded-xl bg-stone-900/40 border border-stone-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-medium text-stone-300 truncate">{order.customerName}</span>
                  </div>
                  <div className="text-stone-400 font-mono text-xs">
                    {order.totalAmount} ₺ (Teslim Edildi)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
