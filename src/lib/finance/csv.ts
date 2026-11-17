import { buildCsvContent } from "@/lib/security/csv";
import { FINANCIAL_PAYMENT_METHOD_LABELS, getExpenseCategoryLabel } from "./domain";
import type { FinancialPaymentMethod, FinancialRecord, Supplier } from "./types";

export function buildFinancialRecordsCsv(records: readonly FinancialRecord[]): string {
  const headers = [
    "Tarih",
    "Tür",
    "Kategori",
    "Açıklama",
    "Ödeme Yöntemi",
    "Tutar (TL)",
    "Net Etki (TL)",
    "Durum",
  ];

  const rows = records.map((rec) => [
    rec.date,
    rec.type,
    getExpenseCategoryLabel(rec.category),
    rec.description,
    FINANCIAL_PAYMENT_METHOD_LABELS[rec.paymentMethod as FinancialPaymentMethod] ?? rec.paymentMethod,
    rec.amount.toFixed(2).replace(".", ","),
    rec.signedEffect.toFixed(2).replace(".", ","),
    rec.isReversed ? "İptal Edildi (Storno)" : "Aktif",
  ]);

  return buildCsvContent(headers, rows);
}

export function buildSuppliersCsv(suppliers: readonly Supplier[]): string {
  const headers = [
    "Tedarikçi Adı",
    "Kategori",
    "Yetkili",
    "Telefon",
    "E-posta",
    "Adres",
    "Açık Borç Bakiyesi (TL)",
  ];

  const rows = suppliers.map((s) => [
    s.name,
    s.category,
    s.contactPerson,
    s.phone,
    s.email,
    s.address,
    s.balance.toFixed(2).replace(".", ","),
  ]);

  return buildCsvContent(headers, rows);
}
