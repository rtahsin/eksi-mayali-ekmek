"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CariAccount } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { mapAccount, type CariProfileInput } from "@/lib/cari/account";

/** Cari defter yazımı — tüm hareketler `/api/admin/cari/transactions` üzerinden (tek atomik RPC). */
export type LedgerWrite =
  | {
      kind: "satis";
      items?: { name: string; quantity: number; unitPrice: number; productId?: string }[];
      amount?: number;
      description?: string;
      date?: string;
      orderId?: string;
    }
  | {
      kind: "tahsilat";
      amount: number;
      paymentMethod: "nakit" | "pos" | "banka_havale" | "diger";
      description?: string;
      date?: string;
      orderId?: string;
    }
  | { kind: "devir"; amount: number; description: string; date?: string }
  | { kind: "set_balance"; targetBalance: number; description: string }
  | { kind: "storno"; reversesId: string; description?: string };

export interface LedgerWriteResult {
  success: boolean;
  error?: string;
  transactionId?: string;
  slipNumber?: string;
  balanceAfter?: number;
  shareUrl?: string | null;
}

async function postJson(url: string, method: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => null);
  const rec = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof rec.error === "string" ? rec.error : "İşlem başarısız");
  return rec;
}

export async function recordLedger(accountId: string, tx: LedgerWrite): Promise<LedgerWriteResult> {
  try {
    const r = await postJson("/api/admin/cari/transactions", "POST", { ...tx, accountId });
    return {
      success: true,
      transactionId: typeof r.transactionId === "string" ? r.transactionId : undefined,
      slipNumber: typeof r.slipNumber === "string" ? r.slipNumber : undefined,
      balanceAfter: typeof r.balanceAfter === "number" ? r.balanceAfter : undefined,
      shareUrl: typeof r.shareUrl === "string" ? r.shareUrl : null,
    };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/** Müşteriye gönderilecek imzalı ekstre / fiş linki. */
export type ShareTarget = { accountId: string } | { transactionId: string } | { orderId: string };

export async function getShareUrl(target: ShareTarget): Promise<string | null> {
  const [key, value] = Object.entries(target)[0] as [string, string];
  const qs = `${key}=${encodeURIComponent(value)}`;
  try {
    const res = await fetch(`/api/admin/cari/share?${qs}`);
    const data: unknown = await res.json().catch(() => null);
    const url = (data as { url?: unknown } | null)?.url;
    return res.ok && typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

export function useCariler() {
  const [allCariler, setAllCariler] = useState<CariAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCariler = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const { data, error: supaErr } = await supabase
        .from("current_accounts")
        .select("*")
        .order("name", { ascending: true });
      if (supaErr) throw supaErr;
      setAllCariler((data ?? []).map((d: Record<string, unknown>) => mapAccount(d)));
    } catch (err: unknown) {
      console.error("Cariler fetch error:", err);
      setError("Cari hesaplar yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCariler();

    if (supabase && isSupabaseConfigured()) {
      const channel = supabase
        .channel(`admin-cariler-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "current_accounts" }, () => {
          fetchCariler();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchCariler]);

  const cariler = useMemo(() => allCariler.filter((c) => !c.archivedAt), [allCariler]);
  const archivedCariler = useMemo(() => allCariler.filter((c) => c.archivedAt), [allCariler]);

  const addCari = async (data: CariProfileInput & { openingBalance?: number }) => {
    try {
      const r = await postJson("/api/admin/cari/accounts", "POST", data);
      await fetchCariler();
      return { success: true, id: r.id as string };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /** Kart bilgileri (bakiye hariç). Bakiye yalnız defter hareketiyle değişir. */
  const updateCari = async (id: string, data: CariProfileInput) => {
    try {
      await postJson(`/api/admin/cari/accounts/${encodeURIComponent(id)}`, "PATCH", data);
      await fetchCariler();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /** Silme yerine arşiv: bakiyesi 0 olmalı; geçmiş fişler korunur. */
  const archiveCari = async (id: string, archived = true) => {
    try {
      await postJson(`/api/admin/cari/accounts/${encodeURIComponent(id)}`, "PATCH", { archived });
      await fetchCariler();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /** Yalnız deneme carisi: tüm hareketleri iptal edilmiş olmalı (sunucu denetler). */
  const deleteCari = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cari/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (data as { error?: unknown } | null)?.error;
        throw new Error(typeof msg === "string" ? msg : "Cari silinemedi");
      }
      await fetchCariler();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const addTransaction = async (cariId: string, tx: LedgerWrite) => {
    const r = await recordLedger(cariId, tx);
    if (r.success && r.balanceAfter !== undefined) {
      const balance = r.balanceAfter;
      setAllCariler((prev) => prev.map((c) => (c.id === cariId ? { ...c, balance } : c)));
    }
    return r;
  };

  const totalReceivable = cariler
    .filter((c) => c.accountType !== "gider")
    .reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0);
  const totalCredit = cariler.reduce((sum, c) => (c.balance < 0 ? sum + Math.abs(c.balance) : sum), 0);

  return {
    cariler,
    archivedCariler,
    loading,
    error,
    totalReceivable,
    totalCredit,
    addCari,
    updateCari,
    archiveCari,
    deleteCari,
    addTransaction,
    refreshCariler: fetchCariler,
  };
}
