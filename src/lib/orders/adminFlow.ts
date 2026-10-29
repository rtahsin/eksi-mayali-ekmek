import type { AdminOrder, AdminOrderStatus } from "@/types/admin";

/** Admin'de görünen durum adları (kurye kadrosu yok: "kuryede" = yola çıktı). */
export const ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  bekliyor: "Yeni",
  hazirlaniyor: "Hazırlanıyor",
  firinda: "Fırında",
  kuryede: "Yolda",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

export function statusLabel(status: AdminOrderStatus, deliveryMethod: AdminOrder["deliveryMethod"] = "courier"): string {
  if (status === "kuryede" && deliveryMethod === "pickup") return "Hazır, alınacak";
  return ORDER_STATUS_LABELS[status];
}

export interface NextStep {
  status: AdminOrderStatus;
  label: string;
}

/**
 * Siparişin bir sonraki adımı (kart üzerindeki tek büyük düğme).
 * Teslim (teslim_edildi) ödeme sorusu ister; iptal/teslim edilmişte adım yok.
 */
export function nextStep(order: Pick<AdminOrder, "status" | "deliveryMethod">): NextStep | null {
  const pickup = order.deliveryMethod === "pickup";
  switch (order.status) {
    case "bekliyor":
      return { status: "hazirlaniyor", label: "Onayla" };
    case "hazirlaniyor":
      return { status: "firinda", label: "Fırına girdi" };
    case "firinda":
      return pickup ? { status: "kuryede", label: "Hazır, alınacak" } : { status: "kuryede", label: "Yola çıktı" };
    case "kuryede":
      return { status: "teslim_edildi", label: "Teslim et" };
    default:
      return null;
  }
}

/** İptal edilebilir mi? Teslim edilmiş sipariş veritabanında iptal edilemez (ORDER_DELIVERED). */
export function canCancel(status: AdminOrderStatus): boolean {
  return status !== "iptal" && status !== "teslim_edildi";
}

/** Durum filtresi grupları: liste telefonda tek satıra sığsın. */
export type StatusGroup = "acik" | "yeni" | "hazirlik" | "yolda" | "teslim" | "iptal" | "hepsi";

export const STATUS_GROUP_LABELS: Record<StatusGroup, string> = {
  acik: "Açık",
  yeni: "Yeni",
  hazirlik: "Hazırlık",
  yolda: "Yolda / Hazır",
  teslim: "Teslim",
  iptal: "İptal",
  hepsi: "Hepsi",
};

export function inStatusGroup(status: AdminOrderStatus, group: StatusGroup): boolean {
  switch (group) {
    case "acik":
      return status !== "teslim_edildi" && status !== "iptal";
    case "yeni":
      return status === "bekliyor";
    case "hazirlik":
      return status === "hazirlaniyor" || status === "firinda";
    case "yolda":
      return status === "kuryede";
    case "teslim":
      return status === "teslim_edildi";
    case "iptal":
      return status === "iptal";
    case "hepsi":
      return true;
  }
}

/** Ödeme yöntemi etiketi; fırından alımda "kapıda" denmez. */
export function paymentLabel(method: string, deliveryMethod: AdminOrder["deliveryMethod"] = "courier"): string {
  const atDoor = deliveryMethod !== "pickup";
  switch (method) {
    case "cash_on_delivery":
      return atDoor ? "Kapıda nakit" : "Nakit";
    case "pos_at_door":
      return atDoor ? "Kapıda kart" : "Kart";
    case "transfer":
      return "Havale";
    case "online":
    case "online_card":
      return "Online";
    case "cari":
      return "Cari";
    default:
      return "Ödenecek";
  }
}

/** Teslim edilmiş ama parası alınmamış (cari sipariş hariç: onun borcu cariye yazılır). */
export function isUncollected(order: Pick<AdminOrder, "status" | "paymentStatus" | "cariId" | "paymentMethod">): boolean {
  return (
    order.status === "teslim_edildi" &&
    order.paymentStatus !== "paid" &&
    !order.cariId &&
    order.paymentMethod !== "cari"
  );
}

const STATUS_ORDER: Record<AdminOrderStatus, number> = {
  bekliyor: 0,
  hazirlaniyor: 1,
  firinda: 2,
  kuryede: 3,
  teslim_edildi: 4,
  iptal: 5,
};

/** Liste sırası: önce iş bekleyenler (yeni → yolda), sonra teslim ve iptal; aynı durumda mahalle, sonra geliş saati. */
export function compareForWork(a: AdminOrder, b: AdminOrder): number {
  return (
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    (a.neighborhood || "").localeCompare(b.neighborhood || "", "tr") ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

export type OrderMessage = "alindi" | "yolda" | "hazir" | "teslim";

export const ORDER_MESSAGE_LABELS: Record<OrderMessage, string> = {
  alindi: "Sipariş alındı",
  yolda: "Yola çıktı",
  hazir: "Hazır, gelip alabilirsiniz",
  teslim: "Teşekkür",
};

/** Müşteriye WhatsApp metni. Saat aralığı siparişte yoksa ayardaki teslimat aralığı verilir. */
export function orderMessage(
  type: OrderMessage,
  order: Pick<AdminOrder, "customerName" | "items" | "deliveryDate" | "deliveryTimeWindow" | "totalAmount"> & {
    deliveryMethod?: AdminOrder["deliveryMethod"];
  },
  opts: { window: string; dateLabel: string; trackingUrl?: string }
): string {
  const name = order.customerName.trim().split(/\s+/)[0] || "";
  const hello = name ? `Merhaba ${name},` : "Merhaba,";
  const window = order.deliveryTimeWindow || opts.window;
  switch (type) {
    case "alindi": {
      const items = order.items.map((it) => `${it.quantity}× ${it.productName}`).join(", ");
      const lines = [
        `${hello} EkmekLab'dan yazıyorum. Siparişinizi aldık: ${items}.`,
        order.deliveryMethod === "pickup"
          ? `Fırından teslim alma: ${opts.dateLabel}. Tutar: ${order.totalAmount.toLocaleString("tr-TR")} ₺.`
          : `Teslimat: ${opts.dateLabel}, ${window}. Tutar: ${order.totalAmount.toLocaleString("tr-TR")} ₺.`,
      ];
      if (opts.trackingUrl) lines.push(`Takip: ${opts.trackingUrl}`);
      return lines.join("\n");
    }
    case "yolda":
      return `${hello} ekmekleriniz yola çıktı, ${window} arasında kapınızda olacak. EkmekLab`;
    case "hazir":
      return `${hello} siparişiniz hazır, fırından gelip alabilirsiniz. EkmekLab`;
    case "teslim":
      return `${hello} siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz. EkmekLab`;
  }
}
