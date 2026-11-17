import { z } from "zod";
import { isIsoDate } from "@/lib/time/istanbul";
import { CariProfileSchema, CariStandingOrderSchema } from "./account";
import { roundCariMoney } from "./pricing";

export const CustomPriceRecordSchema = z.record(
  z.string().min(1, "Geçersiz ürün anahtarı"),
  z.coerce.number().min(0, "Özel fiyat 0 veya daha büyük olmalıdır.").max(1_000_000).finite()
);

export const CreateCariAccountSchema = CariProfileSchema.required({ businessName: true }).extend({
  district: z.string().trim().max(80, "İlçe adı en fazla 80 karakter olabilir.").optional(),
  companyTitle: z.string().trim().max(200, "Resmi unvan en fazla 200 karakter olabilir.").optional(),
  creditLimit: z.coerce.number().min(0, "Kredi limiti negatif olamaz.").finite().optional(),
  defaultCourierId: z.string().uuid("Geçersiz varsayılan kurye kimliği.").nullable().optional(),
  standingOrder: CariStandingOrderSchema.optional(),
  customPrices: CustomPriceRecordSchema.optional(),
  openingBalance: z.coerce.number().finite().optional(),
});

export const PatchCariAccountSchema = CariProfileSchema.extend({
  archived: z.boolean().optional(),
  district: z.string().trim().max(80, "İlçe adı en fazla 80 karakter olabilir.").optional(),
  companyTitle: z.string().trim().max(200, "Resmi unvan en fazla 200 karakter olabilir.").optional(),
  creditLimit: z.coerce.number().min(0, "Kredi limiti negatif olamaz.").finite().optional(),
  defaultCourierId: z.string().uuid("Geçersiz varsayılan kurye kimliği.").nullable().optional(),
  standingOrder: CariStandingOrderSchema.optional(),
  customPrices: CustomPriceRecordSchema.optional(),
});

const txAccountId = z.string().min(1).max(80);
const txDescription = z.string().trim().max(500).optional();
const txDate = z.string().refine(isIsoDate, "Tarih YYYY-AA-GG olmalı").optional();
const txMoney = z.number().finite().positive().max(10_000_000).transform(roundCariMoney);

export const LedgerTransactionItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(100000),
  unitPrice: z.number().min(0).max(1_000_000),
  productId: z.string().max(80).optional(),
});

export const RecordCariTransactionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("satis"),
    accountId: txAccountId,
    items: z.array(LedgerTransactionItemSchema).max(60).default([]),
    amount: txMoney.optional(),
    description: txDescription,
    date: txDate,
    orderId: z.string().max(80).optional(),
  }),
  z.object({
    kind: z.literal("tahsilat"),
    accountId: txAccountId,
    amount: txMoney,
    paymentMethod: z.enum(["nakit", "pos", "banka_havale", "diger"]),
    description: txDescription,
    date: txDate,
    orderId: z.string().max(80).optional(),
  }),
  z.object({
    kind: z.literal("devir"),
    accountId: txAccountId,
    amount: z
      .number()
      .finite()
      .transform(roundCariMoney)
      .refine((v) => v !== 0, "Tutar 0 olamaz")
      .refine((v) => Math.abs(v) <= 10_000_000),
    description: z.string().trim().min(3, "Açıklama yazın").max(500),
    date: txDate,
  }),
  z.object({
    kind: z.literal("set_balance"),
    accountId: txAccountId,
    targetBalance: z
      .number()
      .finite()
      .min(-10_000_000)
      .max(10_000_000)
      .transform(roundCariMoney),
    description: z.string().trim().min(3, "Neden yazın").max(500),
  }),
  z.object({
    kind: z.literal("storno"),
    accountId: txAccountId,
    reversesId: z.string().uuid(),
    description: txDescription,
  }),
]);

export const HotSaleQuantitySchema = z.coerce
  .number()
  .int("Miktar tam sayı olmalıdır.")
  .min(1, "Miktar en az 1 olmalıdır.")
  .max(5000, "Tek kalemde en fazla 5.000 adet girilebilir.");

export const CatalogHotSaleLineSchema = z.object({
  productId: z.string().trim().min(1, "Ürün kimliği zorunludur."),
  quantity: HotSaleQuantitySchema,
  unitPriceOverride: z.coerce
    .number()
    .min(0, "Birim fiyat negatif olamaz.")
    .max(1_000_000, "Birim fiyat çok yüksek.")
    .finite()
    .optional(),
});

export const CustomHotSaleLineSchema = z.object({
  productId: z.string().trim().max(0).nullable().optional(),
  customName: z
    .string()
    .trim()
    .min(1, "Özel kalem adı zorunludur.")
    .max(120, "Özel kalem adı en fazla 120 karakter olabilir."),
  unitPrice: z.coerce
    .number()
    .min(0, "Birim fiyat negatif olamaz.")
    .max(1_000_000, "Birim fiyat çok yüksek.")
    .finite(),
  quantity: HotSaleQuantitySchema,
});

export const HotSaleLineInputSchema = z.union([
  CatalogHotSaleLineSchema,
  CustomHotSaleLineSchema,
]);

export const HotSaleRequestSchema = z.object({
  accountId: z.string().trim().min(1, "Cari hesap seçimi zorunludur."),
  items: z.array(HotSaleLineInputSchema).min(1, "En az 1 teslimat kalemi seçilmelidir."),
  returnItems: z.array(HotSaleLineInputSchema).optional().default([]),
  collectedAmount: z.coerce
    .number()
    .min(0, "Tahsilat tutarı negatif olamaz.")
    .finite()
    .optional()
    .default(0),
  paymentMethod: z.enum(["nakit", "kredi_karti", "havale"]).optional(),
  description: z.string().trim().max(300, "Açıklama en fazla 300 karakter olabilir.").optional(),
  date: z
    .string()
    .trim()
    .refine((val) => isIsoDate(val), { message: "Tarih YYYY-MM-DD formatında olmalıdır." })
    .optional(),
  allowOverLimit: z.boolean().optional().default(false),
});

export const GenerateStandingOrdersSchema = z
  .object({
    deliveryDate: z
      .string()
      .trim()
      .refine(isIsoDate, "Teslim tarihi YYYY-AA-GG formatında olmalıdır.")
      .optional(),
  })
  .optional();

export type CreateCariAccountInput = z.infer<typeof CreateCariAccountSchema>;
export type PatchCariAccountInput = z.infer<typeof PatchCariAccountSchema>;
export type LedgerTransactionItemInput = z.infer<typeof LedgerTransactionItemSchema>;
export type RecordCariTransactionInput = z.infer<typeof RecordCariTransactionSchema>;
export type CatalogHotSaleLine = z.infer<typeof CatalogHotSaleLineSchema>;
export type CustomHotSaleLine = z.infer<typeof CustomHotSaleLineSchema>;
export type HotSaleLineInput = z.infer<typeof HotSaleLineInputSchema>;
export type HotSaleRequestInput = z.infer<typeof HotSaleRequestSchema>;
export type GenerateStandingOrdersInput = z.infer<typeof GenerateStandingOrdersSchema>;

export function isCatalogHotSaleLine(line: HotSaleLineInput): line is CatalogHotSaleLine {
  return typeof line.productId === "string" && line.productId.length > 0;
}
