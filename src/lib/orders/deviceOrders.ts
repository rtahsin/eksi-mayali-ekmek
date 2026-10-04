/**
 * Bu cihazdan verilen siparişlerin hafızası (giriş yapmadan "Siparişlerim").
 * Yalnızca sipariş no + imzalı takip token'ı + özet saklanır; kişisel veri saklanmaz.
 * Tarayıcı depolaması erişilemezse (gizli pencere vb.) sessizce boş döner.
 */

export interface DeviceOrder {
  id: string;
  orderNumber: string;
  token: string;
  deliveryDate: string;
  totalAmount: number;
  createdAt: string;
}

const KEY = "ekmeklab_device_orders_v1";
const MAX = 30;

function isDeviceOrder(value: unknown): value is DeviceOrder {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.orderNumber === "string" &&
    typeof v.token === "string" &&
    typeof v.deliveryDate === "string" &&
    typeof v.totalAmount === "number" &&
    typeof v.createdAt === "string"
  );
}

export function readDeviceOrders(): DeviceOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isDeviceOrder) : [];
  } catch {
    return [];
  }
}

export function rememberDeviceOrder(order: DeviceOrder): void {
  if (typeof window === "undefined") return;
  try {
    const rest = readDeviceOrders().filter((o) => o.id !== order.id);
    localStorage.setItem(KEY, JSON.stringify([order, ...rest].slice(0, MAX)));
  } catch {
    // depolama yoksa yapılacak bir şey yok
  }
}

export function forgetDeviceOrders(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const drop = new Set(ids);
    localStorage.setItem(KEY, JSON.stringify(readDeviceOrders().filter((o) => !drop.has(o.id))));
  } catch {
    // yok say
  }
}
