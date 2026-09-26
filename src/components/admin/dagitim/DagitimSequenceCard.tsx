"use client";

import React from "react";
import { AdminOrder } from "@/types/admin";
import { Courier } from "@/types/courier";
import {
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Phone,
  Navigation,
  Printer,
} from "lucide-react";
import { getMapUrls } from "./dagitimUtils";

interface DagitimSequenceCardProps {
  order: AdminOrder;
  idx: number;
  totalOrders: number;
  isSelected: boolean;
  couriers: Courier[];
  onToggleSelect: (id: string) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onAssignCourier: (orderId: string, courierId: string) => void;
  onPrintSlip: (order: AdminOrder) => void;
  onToggleStatus: (orderId: string, isDelivered: boolean) => void;
}

export function DagitimSequenceCard({
  order,
  idx,
  totalOrders,
  isSelected,
  couriers,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  onAssignCourier,
  onPrintSlip,
  onToggleStatus,
}: DagitimSequenceCardProps) {
  const isDelivered = order.status === "teslim_edildi";
  const urls = getMapUrls(order.deliveryAddress);
  const assignedCourier = couriers.find((c) => c.id === order.courierId);

  // Estimated arrival (starting at 14:00, +15 mins each)
  const startHour = 14;
  const totalMinutes = idx * 15;
  const etaHour = startHour + Math.floor(totalMinutes / 60);
  const etaMin = totalMinutes % 60;
  const etaFormatted = `${String(etaHour).padStart(2, "0")}:${String(etaMin).padStart(2, "0")}`;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isDelivered
          ? "bg-[#14100D] border-stone-800/60 opacity-60"
          : isSelected
          ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
          : "bg-[#18130F] border-[#261E17] hover:border-stone-700"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Checkbox + Reorder Controls + Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Checkbox */}
          <button
            type="button"
            onClick={() => onToggleSelect(order.id)}
            className="mt-1 text-stone-400 hover:text-amber-400 print:hidden"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-stone-600" />
            )}
          </button>

          {/* Move Up/Down Controls */}
          <div className="flex flex-col items-center gap-1 shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => onMoveUp(idx)}
              disabled={idx === 0}
              className="p-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-400 disabled:opacity-30 transition-colors"
              title="Yukarı Taşı"
            >
              <ArrowUp className="w-3 h-3" />
            </button>

            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
              {idx + 1}
            </span>

            <button
              type="button"
              onClick={() => onMoveDown(idx)}
              disabled={idx === totalOrders - 1}
              className="p-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-400 disabled:opacity-30 transition-colors"
              title="Aşağı Taşı"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif font-bold text-sm text-foreground">
                {order.customerName}
              </span>
              <span className="text-xs font-mono text-stone-400">
                (#{order.orderNumber || order.id.slice(-6)})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                {order.neighborhood}
              </span>
              <span className="text-[10px] font-mono text-amber-400/90 font-bold">
                ⏱️ Tahmini: ~{etaFormatted}
              </span>
              {urls.coords && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  📍 GPS
                </span>
              )}

              {/* Courier Badge or Dropdown */}
              <div className="print:hidden">
                <select
                  value={order.courierId || ""}
                  onChange={(e) => onAssignCourier(order.id, e.target.value)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border focus:outline-none transition-colors ${
                    assignedCourier
                      ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                      : "bg-stone-900 border-amber-500/30 text-amber-400/80 hover:border-amber-400"
                  }`}
                >
                  <option value="">Kurye Ata...</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      🛵 {c.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-stone-300 font-sans leading-relaxed select-all">
              {order.deliveryAddress}
            </div>

            <div className="text-xs text-stone-400 font-sans">
              <strong className="text-stone-300">Paket:</strong>{" "}
              {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
            </div>

            {order.orderNotes && (
              <div className="text-[11px] text-amber-300/90 italic">
                Not: {order.orderNotes}
              </div>
            )}
          </div>
        </div>

        {/* Right: Amount & Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-800">
          <div className="text-right">
            <div className="font-serif text-base font-bold text-foreground">
              {order.totalAmount} ₺
            </div>
            <div className="text-[11px]">
              {order.paymentMethod === "cash_on_delivery" ? (
                <span className="text-amber-400 font-bold">Kapıda Nakit</span>
              ) : order.paymentMethod === "pos_at_door" ? (
                <span className="text-blue-400">Kapıda POS</span>
              ) : (
                <span className="text-emerald-400">Ödendi / Cari</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 print:hidden">
            {order.phone && (
              <a
                href={`tel:${order.phone}`}
                className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                title="Müşteriyi Ara"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}

            <a
              href={urls.google}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs flex items-center gap-1 transition-colors"
              title="Google Navigasyon"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Navigasyon</span>
            </a>

            <button
              type="button"
              onClick={() => onPrintSlip(order)}
              className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:bg-stone-800 transition-colors"
              title="Paket Fişi / Etiket Yazdır"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onToggleStatus(order.id, isDelivered)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isDelivered
                  ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                  : "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm"
              }`}
            >
              {isDelivered ? "Teslim Edildi ✓" : "Teslim Et"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
