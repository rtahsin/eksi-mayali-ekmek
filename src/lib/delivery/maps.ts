/** Teslimat yardımcıları: rota sırası, navigasyon linkleri, WhatsApp numarası (saf, testli). */

/** Beylikdüzü'nde fırından çıkışa göre mantıklı mahalle sırası (rota önerisi; elle değiştirilebilir). */
export const BEYLIKDUZU_ROUTE_ORDER = [
  "Yakuplu",
  "Marmara",
  "Barış",
  "Cumhuriyet",
  "Büyükşehir",
  "Beykent",
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

export interface ClusterableOrder {
  id: string;
  neighborhood?: string | null;
  deliveryAddress?: string | null;
  deliveryMethod?: string | null;
  status: string;
  courierId?: string | null;
  items?: Array<{ quantity: number }>;
}

export interface BuildingCluster {
  key: string;
  label: string;
  orderIds: string[];
  count: number;
}

export interface NeighborhoodCluster {
  neighborhood: string;
  rank: number;
  orderIds: string[];
  unassignedOrderIds: string[];
  totalOrders: number;
  totalUnits: number;
  unassignedCount: number;
  buildingClusters: BuildingCluster[];
}

const UNSPECIFIED_NEIGHBORHOOD = "Diğer / Belirtilmemiş";

/**
 * Adresten daire/kat/iç kapı eklerini temizleyip apartman/site/bina gövdesini döndürür.
 * Aynı binadaki farklı dairelerin aynı anahtarda toplanmasını sağlar.
 */
export function normalizeBuildingBody(address: string | null | undefined): { key: string; label: string } | null {
  if (!address) return null;

  const stripFloorAndUnit = (text: string): string =>
    text
      .replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/gi, " ")
      .replace(/\(\s*(?:GPS|Konum):[^)]+\)/gi, " ")
      // No: 8/14 veya sonda 12/5 -> bina numarasını koru, daire ekini ayır
      .replace(/(\b(?:no|numara)\s*[:.]?\s*\d+[a-zçğıöşü]?)\s*\/\s*\d+[a-zçğıöşü]*/gi, "$1")
      .replace(/(\b\d+[a-zçğıöşü]?)\s*\/\s*\d+[a-zçğıöşü]*\s*$/gi, "$1")
      // İç kapı, daire, kat eklerini kaldır ([iİı] Türkçe karakter uyumu)
      .replace(/(?:^|[\s,;-])[iİı]ç\s*kap[iıI](?:\s*no)?\s*[:.]?\s*[a-z0-9-]+/gi, " ")
      .replace(/(?:^|[\s,;-])da[iİ]re(?:\s*no)?\s*[:.]?\s*[a-z0-9-]+/gi, " ")
      .replace(/(?:^|[\s,;-])d\s*[:.]\s*\d+[a-zçğıöşü0-9-]*/gi, " ")
      .replace(/(?:^|[\s,;-])kat\s*[:.]?\s*-?\d+[a-zçğıöşü]*/gi, " ")
      .replace(/(?:^|[\s,;-])k\s*[:.]\s*-?\d+[a-zçğıöşü]*/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s,.;:/-]+|[\s,.;:/-]+$/g, "")
      .trim();

  let cleaned = stripFloorAndUnit(address);
  if (!cleaned) return null;

  const key = stripFloorAndUnit(address.toLocaleLowerCase("tr-TR"))
    .replace(/\bmahallesi(?=\s|$|[.,;])|\bmah\.?(?=\s|$|[.,;])/g, "mah")
    .replace(/\bsokağı(?=\s|$|[.,;])|\bsokak(?=\s|$|[.,;])|\bsok\.?(?=\s|$|[.,;])|\bsk\.?(?=\s|$|[.,;])/g, "sk")
    .replace(/\bcaddesi(?=\s|$|[.,;])|\bcadde(?=\s|$|[.,;])|\bcad\.?(?=\s|$|[.,;])|\bcd\.?(?=\s|$|[.,;])/g, "cd")
    .replace(/\bbulvarı(?=\s|$|[.,;])|\bbulvar(?=\s|$|[.,;])|\bblv\.?(?=\s|$|[.,;])/g, "blv")
    .replace(/\bapartmanı(?=\s|$|[.,;])|\bapt\.?(?=\s|$|[.,;])/g, "apt")
    .replace(/\bsitesi(?=\s|$|[.,;])|\bsit\.?(?=\s|$|[.,;])/g, "sit")
    .replace(/\bnumara(?=\s|$|[.,;])|\bno\s*[:.]/g, "no ")
    .replace(/[.,;:/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (key.length < 5) return null;
  cleaned = cleaned.replace(/\s*,\s*/g, ", ");
  const label = cleaned.length > 64 ? `${cleaned.slice(0, 61).trimEnd()}...` : cleaned;
  return { key, label };
}

/** Teslimata uygun siparişleri mahalle rota sırasına ve aynı apartman/site kümelerine göre gruplar. */
export function clusterOrdersByNeighborhood<T extends ClusterableOrder>(orders: T[]): NeighborhoodCluster[] {
  interface InternalBucket {
    neighborhood: string;
    rank: number;
    orderIds: string[];
    unassignedOrderIds: string[];
    totalUnits: number;
    buildings: Map<string, { label: string; orderIds: string[] }>;
  }

  const buckets = new Map<string, InternalBucket>();

  for (const order of orders) {
    if (order.deliveryMethod === "pickup") continue;
    if (order.status === "iptal" || order.status === "teslim_edildi") continue;

    const rawNeighborhood = (order.neighborhood || "").trim();
    const rank = routeRank(rawNeighborhood);
    const isKnown = rawNeighborhood.length > 0 && rank < BEYLIKDUZU_ROUTE_ORDER.length;
    const neighborhood = isKnown
      ? BEYLIKDUZU_ROUTE_ORDER[rank]
      : rawNeighborhood || UNSPECIFIED_NEIGHBORHOOD;
    const bucketKey = isKnown
      ? `known:${rank}`
      : rawNeighborhood
        ? `other:${fold(rawNeighborhood)}`
        : "other:__unspecified__";

    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        neighborhood,
        rank,
        orderIds: [],
        unassignedOrderIds: [],
        totalUnits: 0,
        buildings: new Map(),
      };
      buckets.set(bucketKey, bucket);
    }

    bucket.orderIds.push(order.id);
    if (!order.courierId) {
      bucket.unassignedOrderIds.push(order.id);
    }
    const orderUnits = (order.items ?? []).reduce(
      (sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0),
      0
    );
    bucket.totalUnits += orderUnits;

    const building = normalizeBuildingBody(order.deliveryAddress);
    if (building) {
      const existing = bucket.buildings.get(building.key);
      if (existing) {
        existing.orderIds.push(order.id);
      } else {
        bucket.buildings.set(building.key, {
          label: building.label,
          orderIds: [order.id],
        });
      }
    }
  }

  return Array.from(buckets.values())
    .map((bucket): NeighborhoodCluster => {
      const buildingClusters: BuildingCluster[] = [];
      for (const [key, b] of bucket.buildings.entries()) {
        if (b.orderIds.length >= 2) {
          buildingClusters.push({
            key,
            label: b.label,
            orderIds: b.orderIds,
            count: b.orderIds.length,
          });
        }
      }
      buildingClusters.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "tr"));

      return {
        neighborhood: bucket.neighborhood,
        rank: bucket.rank,
        orderIds: bucket.orderIds,
        unassignedOrderIds: bucket.unassignedOrderIds,
        totalOrders: bucket.orderIds.length,
        totalUnits: bucket.totalUnits,
        unassignedCount: bucket.unassignedOrderIds.length,
        buildingClusters,
      };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.totalOrders - a.totalOrders ||
        a.neighborhood.localeCompare(b.neighborhood, "tr")
    );
}
