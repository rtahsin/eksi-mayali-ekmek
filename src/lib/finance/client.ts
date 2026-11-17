import { apiGet, apiPost } from "@/lib/kernel/apiClient";
import type {
  CreateRecordInput,
  RecordSupplierTxInput,
  StornoRecordInput,
  StornoSupplierTxInput,
  UpsertSupplierInput,
} from "./schema";
import type {
  FinanceOverviewPayload,
  FinanceRecordActionPayload,
  SupplierTxRecordPayload,
  SupplierTxStornoPayload,
  SupplierUpsertPayload,
} from "./types";

export function getPreviousMonthRange(today: string): { from: string; to: string } {
  const [yStr, mStr] = today.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
  const lastDayPrevMonth = new Date(Date.UTC(y, m - 1, 0));
  return {
    from: prevMonthDate.toISOString().slice(0, 10),
    to: lastDayPrevMonth.toISOString().slice(0, 10),
  };
}

export function parsePositiveAmountInput(raw: string): number | null {
  const numeric = Number(raw.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

export function fetchFinanceDashboardData(params: {
  from: string;
  to: string;
  signal?: AbortSignal;
}): Promise<FinanceOverviewPayload> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  return apiGet<FinanceOverviewPayload>(`/api/admin/finance?${qs.toString()}`, {
    signal: params.signal,
  });
}

export function submitFinancialRecord(
  input: Omit<CreateRecordInput, "action">
): Promise<FinanceRecordActionPayload> {
  return apiPost<FinanceRecordActionPayload>("/api/admin/finance", {
    action: "create_record",
    ...input,
  });
}

export function submitFinancialRecordStorno(
  input: Omit<StornoRecordInput, "action">
): Promise<FinanceRecordActionPayload> {
  return apiPost<FinanceRecordActionPayload>("/api/admin/finance", {
    action: "storno_record",
    ...input,
  });
}

export function submitSupplierUpsert(
  input: Omit<UpsertSupplierInput, "action">
): Promise<SupplierUpsertPayload> {
  return apiPost<SupplierUpsertPayload>("/api/admin/finance/suppliers", {
    action: "upsert_supplier",
    ...input,
  });
}

export function submitSupplierTransaction(
  input: Omit<RecordSupplierTxInput, "action">
): Promise<SupplierTxRecordPayload> {
  return apiPost<SupplierTxRecordPayload>("/api/admin/finance/suppliers", {
    action: "record_transaction",
    ...input,
  });
}

export function submitSupplierTransactionStorno(
  input: Omit<StornoSupplierTxInput, "action">
): Promise<SupplierTxStornoPayload> {
  return apiPost<SupplierTxStornoPayload>("/api/admin/finance/suppliers", {
    action: "storno_transaction",
    ...input,
  });
}
