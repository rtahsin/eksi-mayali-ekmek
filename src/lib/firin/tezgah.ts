import type { ExtendedProduct } from "@/types";
import type { DeliveryDateOption } from "@/types/settings";
import { addDays, istanbulToday, istanbulWeekday } from "@/lib/time/istanbul";

// Tezgâh: her ekmeğin sıradaki satış günü. Teslim edilebilir günler (computeDeliveryDates) ile ürünün
// kendi kuralları (satış günleri, haftanın günleri, önceden sipariş süresi) kesişir. Kapasite ve günlük
// sınır burada yok; onları sipariş anında create_order_atomic denetler.

export interface TezgahDurumu {
  /** Sıradaki satış günü (YYYY-MM-DD) ya da yok */
  gun: string | null;
  /** Tezgâhta görünen kısa cümle */
  yazi: string;
  /** Bugün ya da yarın ayrılabilir mi */
  yakin: boolean;
}

const GUN_ADLARI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function urunSatilirMi(product: ExtendedProduct, date: string, today: string): boolean {
  if (product.isAvailable === false) return false;
  if ((product.leadTimeDays ?? 0) > 0 && date < addDays(today, product.leadTimeDays ?? 0)) return false;
  if (product.availability === "dates") return (product.saleDates ?? []).some((d) => d.date === date);
  const gunler = product.saleWeekdays;
  if (gunler && gunler.length > 0 && gunler.length < 7) {
    const js = istanbulWeekday(date);
    return gunler.includes(js === 0 ? 7 : js);
  }
  return true;
}

export function tezgahDurumu(product: ExtendedProduct, teslimGunleri: DeliveryDateOption[], now: Date = new Date()): TezgahDurumu {
  const today = istanbulToday(now);
  const yarin = addDays(today, 1);
  if (product.isAvailable === false) return { gun: null, yazi: "şimdilik yok", yakin: false };

  const gun = teslimGunleri.find((o) => urunSatilirMi(product, o.date, today))?.date ?? null;
  if (!gun) return { gun: null, yazi: "yakında yeniden", yakin: false };
  if (gun === today) return { gun, yazi: "bugün var", yakin: true };
  if (gun === yarin) return { gun, yazi: "yarın var", yakin: true };
  return { gun, yazi: `sıradaki ${GUN_ADLARI[istanbulWeekday(gun)]}`, yakin: false };
}
