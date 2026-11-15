"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Courier, CourierVehicleType } from "@/types/courier";
import { getErrorMessage } from "@/lib/utils/error";

interface RawCourierRow {
  id: string;
  profile_id?: string | null;
  display_name: string;
  phone: string;
  vehicle_type?: string | null;
  is_active?: boolean | null;
  is_on_shift?: boolean | null;
  current_lat?: number | null;
  current_lng?: number | null;
  location_updated_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export function useCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const mapCourierRow = useCallback((row: RawCourierRow): Courier => {
    return {
      id: row.id,
      profileId: row.profile_id ?? null,
      displayName: row.display_name,
      phone: row.phone,
      vehicleType: (row.vehicle_type as CourierVehicleType) || "motorcycle",
      isActive: row.is_active ?? true,
      isOnShift: row.is_on_shift ?? false,
      currentLat: row.current_lat ?? null,
      currentLng: row.current_lng ?? null,
      locationUpdatedAt: row.location_updated_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
    };
  }, []);

  const fetchCouriers = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from("couriers")
        .select("*")
        .order("display_name", { ascending: true });

      if (fetchErr) {
        console.error("Fetch couriers error:", fetchErr);
        setError("Kuryeler listelenirken hata oluştu.");
      } else if (data) {
        const rawList = data as unknown as RawCourierRow[];
        setCouriers(rawList.map(mapCourierRow));
      }
    } catch (err: unknown) {
      console.warn("Fetch couriers exception:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase, mapCourierRow]);

  useEffect(() => {
    fetchCouriers();

    if (supabase && isSupabaseConfigured()) {
      const channelId = `couriers-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "couriers" },
          () => {
            fetchCouriers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchCouriers]);

  // Yeni kurye oluştur (sunucu /api/admin/team üzerinden; 031 tarayıcı yazma yasağına uyumlu)
  const createCourier = async (data: {
    displayName: string;
    phone: string;
    vehicleType?: CourierVehicleType;
    email?: string;
    profileId?: string | null;
  }) => {
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(data.email ? { email: data.email } : {}),
          role: "courier",
          displayName: data.displayName,
          phone: data.phone,
          vehicleType: data.vehicleType || "motorcycle",
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; courier?: Courier; courierId?: string }
        | null;
      if (!res.ok) {
        return { success: false, error: json?.error || "Kurye oluşturulamadı." };
      }

      await fetchCouriers();
      return { success: true, courier: json?.courier };
    } catch (err: unknown) {
      console.error("Create courier error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Kurye güncelle (sunucu API üzerinden)
  const updateCourier = async (id: string, updates: Partial<Courier>) => {
    try {
      const isShiftOnly =
        updates.isOnShift !== undefined &&
        updates.displayName === undefined &&
        updates.phone === undefined &&
        updates.vehicleType === undefined &&
        updates.isActive === undefined &&
        updates.profileId === undefined;

      if (isShiftOnly && typeof updates.isOnShift === "boolean") {
        const res = await fetch("/api/courier/shift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courierId: id, isOnShift: updates.isOnShift }),
        });
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          return { success: false, error: json?.error || "Vardiya güncellenemedi." };
        }
        setCouriers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isOnShift: updates.isOnShift! } : c))
        );
        return { success: true };
      }

      const existing = couriers.find((c) => c.id === id);
      const targetId = existing?.profileId ?? id;

      const payload: Record<string, unknown> = {};
      if (updates.displayName !== undefined) payload.displayName = updates.displayName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.vehicleType !== undefined) payload.vehicleType = updates.vehicleType;
      if (updates.isActive !== undefined) payload.isActive = updates.isActive;
      if (updates.isOnShift !== undefined) payload.isOnShift = updates.isOnShift;

      const res = await fetch(`/api/admin/team/${encodeURIComponent(targetId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        return { success: false, error: json?.error || "Kurye güncellenemedi." };
      }

      setCouriers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );

      return { success: true };
    } catch (err: unknown) {
      console.error("Update courier error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Vardiya aç/kapat
  const toggleCourierShift = async (id: string, isOnShift: boolean) => {
    return updateCourier(id, { isOnShift });
  };

  // Atanabilir tüm aktif kuryeler (vardiyada olanlar üstte, vardiya dışı da planlanabilir)
  const assignableCouriers = useMemo(() => {
    return couriers
      .filter((c) => c.isActive)
      .sort(
        (a, b) =>
          Number(b.isOnShift) - Number(a.isOnShift) ||
          a.displayName.localeCompare(b.displayName, "tr")
      );
  }, [couriers]);

  // Geriye dönük uyumlu alias: tüm aktif/atanabilir kuryeler
  const activeCouriers = assignableCouriers;

  return {
    couriers,
    assignableCouriers,
    activeCouriers,
    loading,
    error,
    createCourier,
    updateCourier,
    toggleCourierShift,
    refetch: fetchCouriers,
  };
}
