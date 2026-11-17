"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CariAccount } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";
import type { CariProfileInput } from "@/lib/cari/account";
import {
  createCariAccountClient,
  deleteCariAccountClient,
  fetchCariAccounts,
  getShareUrl,
  recordLedger,
  updateCariAccountClient,
  type LedgerWrite,
  type LedgerWriteResult,
  type ShareTarget,
} from "@/lib/cari/client";

export type { LedgerWrite, LedgerWriteResult, ShareTarget };
export { recordLedger, getShareUrl };

export function useCariler() {
  const [allCariler, setAllCariler] = useState<CariAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCariler = useCallback(async () => {
    try {
      const accounts = await fetchCariAccounts();
      setAllCariler(accounts);
      setError(null);
    } catch (err: unknown) {
      console.error("Cariler fetch error:", err);
      setError(getErrorMessage(err) || "Cari hesaplar yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCariler();

    if (supabase && isSupabaseConfigured()) {
      const channel = supabase
        .channel(`admin-cariler-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "current_accounts" }, () => {
          void fetchCariler();
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
      const r = await createCariAccountClient(data);
      await fetchCariler();
      return { success: true, id: r.id };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /** Kart bilgileri (bakiye hariç). Bakiye yalnız defter hareketiyle değişir. */
  const updateCari = async (id: string, data: CariProfileInput) => {
    try {
      await updateCariAccountClient(id, data);
      await fetchCariler();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /** Silme yerine arşiv: bakiyesi 0 olmalı; geçmiş fişler korunur. */
  const archiveCari = async (id: string, archived = true) => {
    try {
      await updateCariAccountClient(id, { archived });
      await fetchCariler();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /** Yalnız deneme carisi: tüm hareketleri iptal edilmiş olmalı (sunucu denetler). */
  const deleteCari = async (id: string) => {
    try {
      await deleteCariAccountClient(id);
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
