import { z } from "zod";
import { isIsoDate, istanbulToday } from "@/lib/time/istanbul";
import { EXPENSE_CATEGORIES, round2 } from "./domain";

export const ExpenseCategoryEnum = z.enum(EXPENSE_CATEGORIES);
export const PaymentMethodEnum = z.enum(["nakit", "kredi_karti", "havale", "pos"]);
export const IsoDateSchema = z.string().trim().refine(isIsoDate, "Tarih YYYY-AA-GG formatında olmalı");

export const CreateRecordSchema = z.object({
  action: z.literal("create_record"),
  type: z.enum(["gider", "gelir"]),
  category: ExpenseCategoryEnum.default("diger"),
  amount: z.coerce
    .number()
    .finite("Geçerli bir tutar giriniz")
    .positive("Tutar sıfırdan büyük olmalı")
    .max(10_000_000, "Tutar sınırı aşıyor")
    .transform(round2),
  paymentMethod: PaymentMethodEnum.default("nakit"),
  date: IsoDateSchema.optional(),
  description: z.string().trim().min(2, "Kısa bir açıklama yazınız").max(280),
});

export const StornoRecordSchema = z.object({
  action: z.literal("storno_record"),
  recordId: z.string().uuid("Geçersiz kayıt kimliği"),
  reason: z.string().trim().min(2, "İptal (storno) nedenini yazınız").max(200),
});

export const FinancePostSchema = z.discriminatedUnion("action", [CreateRecordSchema, StornoRecordSchema]);

export type CreateRecordInput = z.infer<typeof CreateRecordSchema>;
export type StornoRecordInput = z.infer<typeof StornoRecordSchema>;
export type FinancePostInput = z.infer<typeof FinancePostSchema>;

export const UpsertSupplierSchema = z.object({
  action: z.literal("upsert_supplier"),
  id: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(2, "Tedarikçi adı en az 2 karakter olmalı").max(120),
  category: z.string().trim().max(80).optional().default("Un & Tahıl"),
  contactPerson: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
});

export const RecordSupplierTxSchema = z.object({
  action: z.literal("record_transaction"),
  supplierId: z.string().trim().min(1).max(80),
  type: z.enum(["alis", "odeme"]),
  amount: z.coerce
    .number()
    .finite("Geçerli bir tutar giriniz")
    .positive("Tutar sıfırdan büyük olmalı")
    .max(10_000_000, "Tutar sınırı aşıyor")
    .transform(round2),
  invoiceNo: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(240).optional().default(""),
  date: IsoDateSchema.optional(),
  alsoRecordExpense: z.boolean().optional().default(false),
  expenseCategory: ExpenseCategoryEnum.optional().nullable(),
  paymentMethod: PaymentMethodEnum.optional().nullable(),
});

export const StornoSupplierTxSchema = z.object({
  action: z.literal("storno_transaction"),
  supplierId: z.string().trim().min(1).max(80),
  transactionId: z.string().uuid("Geçersiz hareket kimliği"),
  reason: z.string().trim().min(2, "Storno nedeni yazınız").max(200),
});

export const SuppliersPostSchema = z.discriminatedUnion("action", [
  UpsertSupplierSchema,
  RecordSupplierTxSchema,
  StornoSupplierTxSchema,
]);

export type UpsertSupplierInput = z.infer<typeof UpsertSupplierSchema>;
export type RecordSupplierTxInput = z.infer<typeof RecordSupplierTxSchema>;
export type StornoSupplierTxInput = z.infer<typeof StornoSupplierTxSchema>;
export type SuppliersPostInput = z.infer<typeof SuppliersPostSchema>;

export type FinanceDateRangeResult =
  | { ok: true; from: string; to: string }
  | { ok: false; error: string; code: "INVALID_DATE_RANGE" };

export function parseFinanceDateRange(
  fromParam: string | null | undefined,
  toParam: string | null | undefined,
  today = istanbulToday()
): FinanceDateRangeResult {
  const defaultFrom = `${today.slice(0, 7)}-01`;
  const from = fromParam?.trim() || defaultFrom;
  const to = toParam?.trim() || today;

  if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
    return {
      ok: false,
      error: "Geçersiz tarih aralığı",
      code: "INVALID_DATE_RANGE",
    };
  }

  return { ok: true, from, to };
}
