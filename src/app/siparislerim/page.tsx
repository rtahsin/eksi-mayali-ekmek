"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, PackageSearch, ShoppingBag, UserCheck } from "lucide-react";
import { readDeviceOrders, type DeviceOrder } from "@/lib/orders/deviceOrders";
import { formatTrDate } from "@/lib/time/istanbul";
import { ORDER_STATUS_LABELS, type CanonicalOrderStatus } from "@/lib/orders/normalize";
import { useAuth } from "@/components/auth/AuthProvider";
import type { TrackingOrder } from "@/types/tracking";

/** Bu cihazdan verilen siparişler — giriş gerektirmez (imzalı takip token'ları cihazda). */
export default function DeviceOrdersPage() {
  const [orders, setOrders] = useState<DeviceOrder[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, CanonicalOrderStatus>>({});
  const { isLoggedIn, openAuthModal } = useAuth();

  useEffect(() => {
    const list = readDeviceOrders();
    setOrders(list);

    // En yeni 10 siparişin güncel durumunu getir
    list.slice(0, 10).forEach((o) => {
      fetch(`/api/orders/${encodeURIComponent(o.orderNumber)}?t=${encodeURIComponent(o.token)}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { order?: TrackingOrder } | null) => {
          const status = data?.order?.status;
          if (status) setStatuses((prev) => ({ ...prev, [o.id]: status }));
        })
        .catch(() => {
          // durum gösterilmez, link yine çalışır
        });
    });
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto space-y-5">
        <header className="text-center space-y-1">
          <Link href="/" className="font-serif text-lg font-bold text-foreground">
            Ekmek<span className="text-artisan-gold italic">Lab</span>
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">Siparişlerim</h1>
          <p className="text-xs text-foreground/50">Bu cihazdan verdiğiniz siparişler</p>
        </header>

        {orders === null ? null : orders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface-panel border border-surface-border text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-artisan-gold mx-auto" />
            <p className="text-sm text-foreground/70">Bu cihazda kayıtlı sipariş yok.</p>
            <p className="text-xs text-foreground/50">
              Başka bir cihazdan verdiyseniz sipariş sonrası verilen takip linkini kullanabilir ya da giriş yapabilirsiniz.
            </p>
            <Link href="/" className="inline-block px-5 py-2.5 rounded-xl bg-artisan-terracotta text-white text-sm font-semibold">
              Ürünlere göz at
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {orders.map((o) => {
              const status = statuses[o.id];
              return (
                <li key={o.id}>
                  <Link
                    href={`/siparis-takip/${encodeURIComponent(o.orderNumber)}?t=${encodeURIComponent(o.token)}`}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-surface-panel border border-surface-border hover:border-artisan-gold/40 transition-colors"
                  >
                    <PackageSearch className="w-5 h-5 text-artisan-gold shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-bold text-foreground">{o.orderNumber}</div>
                      <div className="text-xs text-foreground/60">
                        {formatTrDate(o.deliveryDate, "long")} · {o.totalAmount.toLocaleString("tr-TR")} ₺
                      </div>
                    </div>
                    {status && (
                      <span className="text-xs px-2 py-1 rounded-full bg-artisan-gold/10 text-artisan-gold border border-artisan-gold/20 shrink-0">
                        {ORDER_STATUS_LABELS[status]}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-foreground/30 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="p-4 rounded-2xl bg-surface-panel border border-surface-border text-xs text-foreground/60 flex items-start gap-2.5">
          <UserCheck className="w-4 h-4 text-artisan-gold shrink-0 mt-0.5" />
          {isLoggedIn ? (
            <span>
              Hesabınıza bağlı tüm siparişler için{" "}
              <Link href="/hesabim/siparisler" className="underline text-foreground">
                hesap sayfanıza
              </Link>{" "}
              gidin. Bu cihazdaki siparişler girişte hesabınıza otomatik eklenir.
            </span>
          ) : (
            <span>
              Siparişlerinizi her cihazdan görmek için{" "}
              <button type="button" onClick={() => openAuthModal()} className="underline text-foreground">
                giriş yapın
              </button>
              ; bu cihazdaki siparişler hesabınıza otomatik eklenir.
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
