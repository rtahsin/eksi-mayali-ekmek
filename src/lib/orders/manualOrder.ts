import type { AdminOrder } from "@/types/admin";

export type DeliveryMethod = AdminOrder["deliveryMethod"];

export interface ManualOrderDraft {
  customerName: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  neighborhood: string;
  itemCount: number;
  shippingFee: number;
}

/** Elle girilen siparişte eksik olan ilk şey (yoksa null). Telefon zorunlu değil: dükkân siparişinde olmayabilir. */
export function manualOrderProblem(d: ManualOrderDraft): string | null {
  if (!d.customerName.trim()) return "Müşteri adını yaz.";
  if (d.itemCount === 0) return "En az bir ürün ekle.";
  if (d.deliveryMethod === "courier") {
    if (!d.neighborhood.trim()) return "Mahalleyi seç.";
    if (!d.deliveryAddress.trim()) return "Teslimat adresini yaz.";
  }
  if (!Number.isFinite(d.shippingFee) || d.shippingFee < 0) return "Teslimat ücreti geçersiz.";
  if (d.phone.trim() && d.phone.replace(/\D/g, "").length < 10) return "Telefon numarası eksik görünüyor.";
  return null;
}
