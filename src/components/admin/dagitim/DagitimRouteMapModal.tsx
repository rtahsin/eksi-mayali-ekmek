"use client";

import React from "react";
import { AdminOrder } from "@/types/admin";
import { Courier } from "@/types/courier";
import { Map as MapIcon, X, Navigation, ExternalLink } from "lucide-react";
import { getMapUrls } from "./dagitimUtils";

interface DagitimRouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  deliveryOrders: AdminOrder[];
  couriers: Courier[];
  totalCashToCollect: number;
}

export function DagitimRouteMapModal({
  isOpen,
  onClose,
  selectedDate,
  deliveryOrders,
  couriers,
  totalCashToCollect,
}: DagitimRouteMapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-serif font-bold text-stone-100 text-base">
                Beylikdüzü Canlı Dağıtım Haritası ({selectedDate})
              </h3>
              <p className="text-stone-400 text-xs">
                Toplam {deliveryOrders.length} teslimat noktası mahallelere göre listelenmiştir.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          <div className="md:col-span-2 relative min-h-[350px] bg-stone-950 flex flex-col items-center justify-center">
            <iframe
              title="Beylikdüzü Dağıtım Haritası"
              width="100%"
              height="100%"
              className="w-full h-full min-h-[400px] border-0"
              src="https://www.openstreetmap.org/export/embed.html?bbox=28.59,40.95,28.72,41.03&layer=mapnik"
            />
            <div className="absolute bottom-3 left-3 bg-stone-900/90 border border-stone-700 px-3 py-1.5 rounded-xl text-[11px] text-stone-200 font-sans backdrop-blur-sm flex items-center gap-2 shadow">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>Merkez: Beylikdüzü Taş Fırın Dağıtım Bölgesi</span>
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-[500px] space-y-3 bg-stone-950/40 border-t md:border-t-0 md:border-l border-stone-800">
            <div className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center justify-between">
              <span>Teslimat Sırası ({deliveryOrders.length})</span>
              <span className="text-amber-400 font-mono">{totalCashToCollect} ₺</span>
            </div>

            {deliveryOrders.length === 0 ? (
              <div className="text-stone-500 text-xs p-4 text-center">Bu tarihte durak yok</div>
            ) : (
              deliveryOrders.map((o, idx) => {
                const urls = getMapUrls(o.deliveryAddress);
                const isDone = o.status === "teslim_edildi";
                const cObj = couriers.find((c) => c.id === o.courierId);

                return (
                  <div
                    key={o.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                      isDone
                        ? "bg-emerald-950/20 border-emerald-500/20 opacity-60"
                        : "bg-stone-900/80 border-stone-800 hover:border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-200 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono font-bold">
                          {idx + 1}
                        </span>
                        <span>{o.customerName}</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        {o.totalAmount} ₺
                      </span>
                    </div>

                    {cObj && (
                      <div className="text-[10px] font-medium text-emerald-400">
                        🛵 Kurye: {cObj.displayName}
                      </div>
                    )}

                    <div className="text-stone-400 text-[11px] line-clamp-1">
                      {o.neighborhood} · {o.deliveryAddress}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={urls.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Navigasyonu Başlat</span>
                      </a>

                      <a
                        href={urls.yandex}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-0.5"
                      >
                        <span>Yandex</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
