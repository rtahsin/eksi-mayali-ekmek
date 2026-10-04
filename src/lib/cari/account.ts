import { z } from "zod";
import type { CariAccount } from "@/types/admin";

/** Cari kartının düzenlenebilir alanları. Bakiye burada YOK — yalnız defterden değişir. */
export const CariProfileSchema = z
  .object({
    businessName: z.string().trim().min(1, "Firma adı zorunlu").max(120),
    contactPerson: z.string().trim().max(120),
    phone: z.string().trim().max(30),
    address: z.string().trim().max(500),
    neighborhood: z.string().trim().max(80),
    taxNumber: z.string().trim().max(20),
    taxOffice: z.string().trim().max(80),
    accountType: z.enum(["musteri", "gider"]),
    notes: z.string().trim().max(1000),
    customPrices: z.record(z.string().max(80), z.number().positive().max(1_000_000)),
  })
  .partial();

export type CariProfileInput = z.infer<typeof CariProfileSchema>;

export function profileToRow(p: CariProfileInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.businessName !== undefined) row.name = p.businessName;
  if (p.contactPerson !== undefined) row.contact_person = p.contactPerson;
  if (p.phone !== undefined) row.phone = p.phone;
  if (p.address !== undefined) row.address = p.address;
  if (p.neighborhood !== undefined) row.neighborhood = p.neighborhood;
  if (p.taxNumber !== undefined) row.tax_id = p.taxNumber;
  if (p.taxOffice !== undefined) row.tax_office = p.taxOffice;
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
  return {
    id: d.id as string,
    businessName: (d.name as string) || "İsimsiz Cari",
    contactPerson: (d.contact_person as string) || "",
    phone: (d.phone as string) || "",
    address: (d.address as string) || "",
    neighborhood: (d.neighborhood as string) || "",
    taxNumber: (d.tax_id as string) || "",
    taxOffice: (d.tax_office as string) || "",
    balance: Number(d.balance) || 0,
    accountType: rawAccountType === "gider" ? "gider" : "musteri",
    customPrices: (d.custom_prices as Record<string, number>) || {},
    notes: (d.notes as string) || "",
    archivedAt: (d.archived_at as string | null) ?? null,
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}
