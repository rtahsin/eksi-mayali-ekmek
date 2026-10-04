/** Teslimat yardımcıları: rota sırası, navigasyon linkleri, WhatsApp numarası (saf, testli). */

/** Beylikdüzü'nde fırından çıkışa göre mantıklı mahalle sırası (rota önerisi; elle değiştirilebilir). */
export const BEYLIKDUZU_ROUTE_ORDER = [
  "Yakuplu",
  "Marmara",
  "Barış",
  "Cumhuriyet",
  "Büyükşehir",
  "Adnan Kahveci",
  "Gürpınar",
  "Dereağzı",
  "Kavaklı",
  "Sahil",
  "Beylikdüzü OSB",
];

const fold = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

/** Mahallenin rota sırasındaki yeri; bilinmeyen mahalle sona. */
export function routeRank(neighborhood: string | null | undefined): number {
  const n = fold(neighborhood || "");
  if (!n) return BEYLIKDUZU_ROUTE_ORDER.length;
  const i = BEYLIKDUZU_ROUTE_ORDER.findIndex((x) => n.includes(fold(x)) || fold(x).includes(n));
  return i === -1 ? BEYLIKDUZU_ROUTE_ORDER.length : i;
}

export interface RoutableStop {
  id: string;
  neighborhood?: string | null;
  deliveryTimeWindow?: string | null;
  createdAt?: string | null;
}

/**
 * Durak sırası: elle verilmiş sıra (varsa) önce ve aynen; kalanlar mahalle sırası → saat aralığı → oluşturulma.
 * Elle sırada olup artık listede olmayan kimlikler yok sayılır.
 */
export function sortStops<T extends RoutableStop>(stops: T[], manualOrder: string[] = []): T[] {
  const byId = new Map(stops.map((s) => [s.id, s]));
  const pinned = manualOrder.map((id) => byId.get(id)).filter((s): s is T => s !== undefined);
  const pinnedIds = new Set(pinned.map((s) => s.id));
  const rest = stops
    .filter((s) => !pinnedIds.has(s.id))
    .sort(
      (a, b) =>
        routeRank(a.neighborhood) - routeRank(b.neighborhood) ||
        (a.deliveryTimeWindow || "").localeCompare(b.deliveryTimeWindow || "") ||
        (a.createdAt || "").localeCompare(b.createdAt || "")
    );
  return [...pinned, ...rest];
}

/** Sıradaki bir durağı yukarı/aşağı taşır; yeni kimlik sırasını döndürür. */
export function moveStop(ids: string[], id: string, direction: "up" | "down"): string[] {
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** wa.me için numara: 90XXXXXXXXXX; tanınmazsa null. */
export function waPhone(raw: string | null | undefined): string | null {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return d.length === 10 && d.startsWith("5") ? `90${d}` : null;
}

export function extractCoordinates(address?: string): { lat: string; lon: string } | null {
  if (!address) return null;
  const match = address.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  return match ? { lat: match[1], lon: match[2] } : null;
}

export interface NavigationUrls {
  google: string;
  apple: string;
  yandex: string;
  /** Müşterinin sipariş anında paylaştığı konum (adres metninden daha kesin) */
  hasCoordinates: boolean;
}

/** Navigasyon linkleri: müşteri konumu varsa koordinata, yoksa adres aramasına. */
export function getNavigationUrls(address: string, lat?: number | null, lng?: number | null): NavigationUrls {
  const coords =
    typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat: String(lat), lon: String(lng) }
      : extractCoordinates(address);
  if (coords) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`,
      apple: `https://maps.apple.com/?daddr=${coords.lat},${coords.lon}`,
      yandex: `https://yandex.com.tr/harita/?rtext=~${coords.lat}%2C${coords.lon}&rtt=auto`,
      hasCoordinates: true,
    };
  }
  const cleanAddress = address.replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/g, "").trim();
  const query = encodeURIComponent(`${cleanAddress}, Beylikdüzü, İstanbul`);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `https://maps.apple.com/?q=${query}`,
    yandex: `https://yandex.com.tr/harita/?text=${query}`,
    hasCoordinates: false,
  };
}
