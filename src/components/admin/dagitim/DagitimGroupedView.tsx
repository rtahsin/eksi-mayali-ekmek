"use client";

import React from "react";
import { AdminOrder } from "@/types/admin";
import { Courier } from "@/types/courier";
import { MapPin, Phone, Navigation, Printer } from "lucide-react";
import { getMapUrls } from "./dagitimUtils";

interface DagitimGroupedViewProps {
  groupedOrders: [string, AdminOrder[]][];
  couriers: Courier[];
  onAssignCourier: (orderId: string, courierId: string) => void;
  onPrintSlip: (order: AdminOrder) => void;
  onToggleStatus: (orderId: string, isDelivered: boolean) => void;
}

export function DagitimGroupedView({
  groupedOrders,
  couriers,
  onAssignCourier,
  onPrintSlip,
  onToggleStatus,
}: DagitimGroupedViewProps) {
  return (
    <div className="space-y-6">
      {groupedOrders.map(([neighborhood, orders]) => (
        <div
          key={neighborhood}
          className="bg-[#18130F] border border-[#261E17] rounded-2xl overflow-hidden print:border-black print:bg-white"
        >
          <div className="bg-[#201812] px-4 py-3 border-b border-[#261E17] flex items-center justify-between print:bg-gray-100 print:text-black">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-artisan-gold print:text-black" />
              <span className="font-serif font-bold text-sm text-foreground print:text-black">
                {neighborhood}
              </span>
            </div>
            <div className="text-xs font-sans text-artisan-gold font-mono print:text-black">
              {orders.length} Adres / Paket
            </div>
          </div>

          <div className="divide-y divide-[#261E17] print:divide-black">
            {orders.map((order, idx) => {
              const isDelivered = order.status === "teslim_edildi";
              const urls = getMapUrls(order.deliveryAddress);
              const assignedCourier = couriers.find((c) => c.id === order.courierId);

              return (
                <div
                  key={order.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isDelivered ? "opacity-60 bg-emerald-950/10" : "hover:bg-[#1E1611]"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#291F18] flex items-center justify-center text-[10px] font-mono text-artisan-gold font-bold shrink-0 print:border print:border-black print:text-black">
                        {idx + 1}
                      </span>
                      <span className="font-serif font-bold text-sm text-foreground print:text-black">
                        {order.customerName}
                      </span>
                      <span className="text-xs font-mono text-foreground/50">
                        (#{order.orderNumber || order.id.slice(-6)})
                      </span>

                      {/* Courier Dropdown */}
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

                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="text-artisan-gold hover:underline text-xs font-mono flex items-center gap-1 print:text-black"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.phone}</span>
                        </a>
                      )}

                      {urls.coords && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          📍 GPS
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-foreground/80 font-sans pl-7 leading-relaxed print:text-black select-all">
                      {order.deliveryAddress}
                    </div>

                    <div className="text-xs text-foreground/60 pl-7 font-sans print:text-black">
                      <strong className="text-foreground/80 print:text-black">Paket:</strong>{" "}
                      {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
                    </div>

                    {order.orderNotes && (
                      <div className="text-[11px] text-amber-300/90 pl-7 italic print:text-black">
                        Not: {order.orderNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#261E17]">
                    <div className="text-right">
                      <div className="font-serif text-base font-bold text-foreground print:text-black">
                        {order.totalAmount} ₺
                      </div>
                      <div className="text-[11px] font-sans">
                        {order.paymentMethod === "cash_on_delivery" ? (
                          <span className="text-amber-400 font-bold print:text-black">Kapıda Nakit</span>
                        ) : order.paymentMethod === "pos_at_door" ? (
                          <span className="text-blue-400 print:text-black">Kapıda POS</span>
                        ) : (
                          <span className="text-emerald-400 print:text-black">Ödendi / Cari</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 print:hidden">
                      <a
                        href={urls.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-sans flex items-center gap-1 transition-colors border border-amber-500/30"
                        title="Google Haritalar"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigasyon</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onPrintSlip(order)}
                        className="p-2 rounded-xl bg-[#241A13] hover:bg-[#302218] text-artisan-gold text-xs font-sans flex items-center gap-1.5 transition-colors border border-[#34241A]"
                        title="Paket Fişi / Etiket Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(order.id, isDelivered)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all ${
                          isDelivered
                            ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                            : "bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground shadow-sm"
                        }`}
                      >
                        {isDelivered ? "Teslim Edildi ✓" : "Teslim Et"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
