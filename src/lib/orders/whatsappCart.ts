import { CONTACT, whatsappLink } from "@/lib/site";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { formatTrDate, isIsoDate } from "@/lib/time/istanbul";

export interface WhatsappCartLine {
  name: string;
  quantity: number;
  price: number;
}

export interface WhatsappCartCustomerDraft {
  name?: string;
  phone?: string;
  neighborhood?: string;
  addressDetail?: string;
  deliveryDate?: string;
  note?: string;
}

export type WhatsappCartPaymentPreference =
  | "cash_on_delivery"
  | "pos_at_door"
  | "whatsapp";

export interface WhatsappCartInput {
  items: readonly WhatsappCartLine[];
  customerInfo?: WhatsappCartCustomerDraft;
  /** Seçili günün okunur etiketi (ör. "Yarın" veya "Sal 15 Kas"); yoksa ISO tarih formatlanır */
  deliveryDateLabel?: string | null;
  paymentMethod?: WhatsappCartPaymentPreference;
  /** İşletme WhatsApp hattı (ayarlardan gelirse wa.me biçimine çevrilir) */
  whatsappPhone?: string | null;
}

const formatTl = (amount: number): string => `${amount.toLocaleString("tr-TR")} ₺`;

const stripMah = (value: string): string =>
  value.replace(/\s+Mah(\.|allesi)?$/i, "").trim();

function formatDeliveryLine(
  isoDate: string | undefined,
  label: string | null | undefined
): string | null {
  const cleanLabel = (label ?? "").trim();
  const cleanIso = (isoDate ?? "").trim();

  if (cleanLabel && cleanIso && isIsoDate(cleanIso)) {
    const longDate = formatTrDate(cleanIso, "long");
    return cleanLabel.toLocaleLowerCase("tr-TR") === longDate.toLocaleLowerCase("tr-TR")
      ? cleanLabel
      : `${cleanLabel} (${longDate})`;
  }
  if (cleanLabel) return cleanLabel;
  if (cleanIso && isIsoDate(cleanIso)) return formatTrDate(cleanIso, "long");
  return null;
}

function formatPaymentLabel(
  paymentMethod: WhatsappCartPaymentPreference | undefined
): string | null {
  if (paymentMethod === "cash_on_delivery") return "Kapıda nakit";
  if (paymentMethod === "pos_at_door") return "Kapıda kart";
  return null;
}

/**
 * Sepet kalemlerini ve formda o ana kadar girilmiş (zorunlu olmayan) bilgileri
 * temiz bir Türkçe WhatsApp sipariş metnine dönüştürür.
 */
export function buildCartWhatsappMessage(input: WhatsappCartInput): string {
  const validItems = input.items.filter((it) => it.quantity > 0 && it.name.trim().length > 0);
  if (validItems.length === 0) {
    return "Merhaba EkmekLab, sipariş vermek istiyorum.";
  }

  const lines: string[] = [
    "Merhaba EkmekLab, sepetimi buradan iletmek istiyorum:",
    "",
  ];

  let subtotal = 0;
  for (const item of validItems) {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    lines.push(`• ${item.quantity}× ${item.name.trim()} — ${formatTl(lineTotal)}`);
  }

  lines.push("");
  lines.push(`Toplam: ${formatTl(subtotal)} (Teslimat Ücretsiz)`);

  const info = input.customerInfo;
  const details: string[] = [];

  const deliveryText = formatDeliveryLine(info?.deliveryDate, input.deliveryDateLabel);
  if (deliveryText) {
    details.push(`Teslim günü: ${deliveryText}`);
  }

  const paymentText = formatPaymentLabel(input.paymentMethod);
  if (paymentText) {
    details.push(`Ödeme tercihi: ${paymentText}`);
  }

  const name = (info?.name ?? "").trim();
  if (name) {
    details.push(`Ad Soyad: ${name}`);
  }

  const neighborhood = stripMah(info?.neighborhood ?? "");
  if (neighborhood) {
    details.push(`Mahalle: ${neighborhood} Mah. / Beylikdüzü`);
  }

  const addressDetail = (info?.addressDetail ?? "").trim();
  if (addressDetail) {
    details.push(`Adres: ${addressDetail}`);
  }

  const note = (info?.note ?? "").trim();
  if (note) {
    details.push(`Not: ${note}`);
  }

  if (details.length > 0) {
    lines.push("");
    lines.push(...details);
  }

  if (!addressDetail) {
    lines.push("");
    lines.push("Mahalle / adres bilgimi buradan iletiyorum:");
  }

  return lines.join("\n");
}

/**
 * Sepet içeriğiyle doğrudan yeni sekmede açılacak wa.me bağlantısını üretir.
 */
export function buildCartWhatsappUrl(input: WhatsappCartInput): string {
  const rawPhone = (input.whatsappPhone ?? "").trim();
  const digits = rawPhone.replace(/\D/g, "");
  const phoneE164 = digits.length >= 10 ? toWhatsAppNumber(rawPhone) : CONTACT.phoneE164;
  return whatsappLink(buildCartWhatsappMessage(input), phoneE164);
}
