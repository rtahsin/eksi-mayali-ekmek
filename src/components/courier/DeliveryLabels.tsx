import React from "react";
import { AdminOrder } from "@/types/admin";
import { formatTrDate } from "@/lib/time/istanbul";

function paymentLine(o: AdminOrder): string {
  const tl = `${o.totalAmount.toLocaleString("tr-TR")} ₺`;
  if (o.cariId || o.paymentMethod === "cari") return `CARİ — tahsilat yok (${tl})`;
  if (o.paymentStatus === "paid") return `ÖDENDİ (${tl})`;
  if (o.paymentMethod === "pos_at_door") return `KAPIDA POS: ${tl}`;
  if (o.paymentMethod === "transfer") return `HAVALE: ${tl}`;
  return `KAPIDA NAKİT: ${tl}`;
}

/**
 * Paket etiketleri: ekranda gizli, yazdırırken (window.print) görünür.
 * Siyah-beyaz, her etiket tek parça (sayfa arasında bölünmez).
 */
export function DeliveryLabels({ orders, date }: { orders: AdminOrder[]; date: string }) {
  return (
    <div className="hidden print:block bg-white text-black p-4 font-sans">
      <div className="text-xs mb-3">
        EkmekLab · {formatTrDate(date, "long")} · {orders.length} paket
      </div>
      <div className="grid grid-cols-2 gap-3">
        {orders.map((o, i) => (
          <div key={o.id} className="border-2 border-black rounded-lg p-3 break-inside-avoid text-[12px] leading-normal">
            <div className="flex justify-between font-bold text-[13px] pb-1">
              <span>
                {i + 1}. {o.customerName}
              </span>
              <span className="font-mono">#{o.orderNumber || o.id.slice(-6)}</span>
            </div>
            <div className="font-semibold">{o.neighborhood}</div>
            <div className="pb-1">{o.deliveryAddress}</div>
            {o.phone && <div className="font-mono pb-1">{o.phone}</div>}
            {o.orderNotes && <div className="italic pb-1">Not: {o.orderNotes}</div>}
            <ul className="border-t border-black pt-1 pb-1">
              {o.items.map((it, idx) => (
                <li key={idx}>
                  {it.quantity} × {it.productName}
                </li>
              ))}
            </ul>
            <div className="border-t border-black pt-1 font-bold">{paymentLine(o)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
