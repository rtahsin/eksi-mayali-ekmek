import { z } from "zod";
import type { CariAccount, CariStandingOrder } from "@/types/admin";

const ISO_WEEKDAY_REGEX = /^[1-7]$/;

export const CariStandingOrderSchema = z.object({
  enabled: z.boolean(),
  schedule: z.record(
    z.string().regex(ISO_WEEKDAY_REGEX, "Haftanın günü 1 (Pazartesi) ile 7 (Pazar) arasında olmalıdır."),
    z.record(
      z.string().min(1).max(80),
      z.coerce.number().int("Sipariş adedi tam sayı olmalıdır.").min(0).max(10_000),
    ),
  ),
  notes: z.string().trim().max(500).optional(),
});

/** Cari kartının düzenlenebilir alanları. Bakiye burada YOK — yalnız defterden değişir. */
export const CariProfileSchema = z
  .object({
    businessName: z.string().trim().min(1, "Firma adı zorunlu").max(120),
    contactPerson: z.string().trim().max(120),
    phone: z.string().trim().max(30),
    address: z.string().trim().max(500),
    district: z.string().trim().max(80),
    neighborhood: z.string().trim().max(80),
    companyTitle: z.string().trim().max(200),
    taxNumber: z.string().trim().max(20),
    taxOffice: z.string().trim().max(80),
    creditLimit: z.coerce.number().min(0, "Kredi limiti negatif olamaz.").finite(),
    defaultCourierId: z.string().uuid("Geçersiz varsayılan kurye kimliği.").nullable(),
    standingOrder: CariStandingOrderSchema,
    accountType: z.enum(["musteri", "gider"]),
    notes: z.string().trim().max(1000),
    customPrices: z.record(z.string().max(80), z.number().min(0).max(1_000_000).finite()),
  })
  .partial();

export type CariProfileInput = z.infer<typeof CariProfileSchema>;

export function parseCustomPrices(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = typeof v === "number" ? v : Number(v);
    if (k && Number.isFinite(n) && n >= 0) {
      result[k] = Math.round(n * 100) / 100;
    }
  }
  return result;
}

export function parseStandingOrder(raw: unknown): CariStandingOrder | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.enabled !== "boolean" && obj.schedule === undefined) {
    return undefined;
  }

  const schedule: Record<string, Record<string, number>> = {};
  if (obj.schedule && typeof obj.schedule === "object" && !Array.isArray(obj.schedule)) {
    for (const [dayKey, dayRaw] of Object.entries(obj.schedule)) {
      if (!ISO_WEEKDAY_REGEX.test(dayKey)) continue;
      if (!dayRaw || typeof dayRaw !== "object" || Array.isArray(dayRaw)) continue;
      const dayMap: Record<string, number> = {};
      for (const [pid, qtyRaw] of Object.entries(dayRaw)) {
        const qty = typeof qtyRaw === "number" ? qtyRaw : Number(qtyRaw);
        if (pid && Number.isFinite(qty) && qty >= 0) {
          dayMap[pid] = Math.trunc(qty);
        }
      }
      schedule[dayKey] = dayMap;
    }
  }

  const notes = typeof obj.notes === "string" && obj.notes.trim() ? obj.notes.trim() : undefined;
  return {
    enabled: obj.enabled === true,
    schedule,
    ...(notes ? { notes } : {}),
  };
}

export function profileToRow(p: CariProfileInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.businessName !== undefined) row.name = p.businessName;
  if (p.contactPerson !== undefined) row.contact_person = p.contactPerson;
  if (p.phone !== undefined) row.phone = p.phone;
  if (p.address !== undefined) row.address = p.address;
  if (p.district !== undefined) row.district = p.district.trim() || "Beylikdüzü";
  if (p.neighborhood !== undefined) row.neighborhood = p.neighborhood;
  if (p.companyTitle !== undefined) row.company_title = p.companyTitle.trim() || null;
  if (p.taxNumber !== undefined) row.tax_id = p.taxNumber;
  if (p.taxOffice !== undefined) row.tax_office = p.taxOffice;
  if (p.creditLimit !== undefined) row.credit_limit = Math.round(p.creditLimit * 100) / 100;
  if (p.defaultCourierId !== undefined) row.default_courier_id = p.defaultCourierId ?? null;
  if (p.standingOrder !== undefined) row.standing_order = p.standingOrder;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.customPrices !== undefined) row.custom_prices = p.customPrices;
  if (p.accountType !== undefined) {
    row.type = p.accountType;
    row.account_type = p.accountType;
  }
  return row;
}

/** `current_accounts` satırı → CariAccount */
export function mapAccount(d: Record<string, unknown>): CariAccount {
  const rawAccountType = (d.account_type as string) || (d.type as string) || "musteri";
  const district = typeof d.district === "string" && d.district.trim() ? d.district.trim() : "Beylikdüzü";
  const companyTitle = typeof d.company_title === "string" && d.company_title.trim() ? d.company_title.trim() : undefined;
  const defaultCourierId =
    typeof d.default_courier_id === "string" && d.default_courier_id.trim() ? d.default_courier_id.trim() : null;
  return {
    id: String(d.id ?? ""),
    businessName: (typeof d.name === "string" && d.name) || "İsimsiz Cari",
    contactPerson: typeof d.contact_person === "string" ? d.contact_person : "",
    phone: typeof d.phone === "string" ? d.phone : "",
    address: typeof d.address === "string" ? d.address : "",
    district,
    neighborhood: typeof d.neighborhood === "string" ? d.neighborhood : "",
    companyTitle,
    taxNumber: typeof d.tax_id === "string" ? d.tax_id : "",
    taxOffice: typeof d.tax_office === "string" ? d.tax_office : "",
    creditLimit: Math.round((Number(d.credit_limit) || 0) * 100) / 100,
    shareTokenVersion: Math.max(1, Math.trunc(Number(d.share_token_version) || 1)),
    defaultCourierId,
    standingOrder: parseStandingOrder(d.standing_order),
    balance: Number(d.balance) || 0,
    accountType: rawAccountType === "gider" ? "gider" : "musteri",
    customPrices: parseCustomPrices(d.custom_prices),
    notes: typeof d.notes === "string" ? d.notes : "",
    archivedAt: typeof d.archived_at === "string" ? d.archived_at : null,
    createdAt: typeof d.created_at === "string" ? d.created_at : "",
    updatedAt: typeof d.updated_at === "string" ? d.updated_at : undefined,
  };
}
