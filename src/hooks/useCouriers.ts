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

  // Yeni kurye oluştur
  const createCourier = async (data: {
    displayName: string;
    phone: string;
    vehicleType?: CourierVehicleType;
    profileId?: string | null;
  }) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };

      const { data: inserted, error: insErr } = await supabase
        .from("couriers")
        .insert({
          display_name: data.displayName,
          phone: data.phone,
          vehicle_type: data.vehicleType || "motorcycle",
          profile_id: data.profileId || null,
          is_active: true,
          is_on_shift: false,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      if (inserted) {
        const newCourier = mapCourierRow(inserted as unknown as RawCourierRow);
        setCouriers((prev) => [...prev, newCourier]);
        return { success: true, courier: newCourier };
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Create courier error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Kurye güncelle
  const updateCourier = async (id: string, updates: Partial<Courier>) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.displayName !== undefined) payload.display_name = updates.displayName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.vehicleType !== undefined) payload.vehicle_type = updates.vehicleType;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.isOnShift !== undefined) payload.is_on_shift = updates.isOnShift;
      if (updates.profileId !== undefined) payload.profile_id = updates.profileId;

      const { error: updErr } = await supabase
        .from("couriers")
        .update(payload)
        .eq("id", id);

      if (updErr) throw updErr;

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

  // Kurye konumunu güncelle
  const updateCourierLocation = async (id: string, lat: number, lng: number) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };
      const nowIso = new Date().toISOString();

      const { error: updErr } = await supabase
        .from("couriers")
        .update({
          current_lat: lat,
          current_lng: lng,
          location_updated_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", id);

      if (updErr) throw updErr;

      setCouriers((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, currentLat: lat, currentLng: lng, locationUpdatedAt: nowIso }
            : c
        )
      );

      return { success: true };
    } catch (err: unknown) {
      console.error("Update courier location error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Aktif ve vardiyadaki kuryeler
  const activeCouriers = useMemo(() => {
    return couriers.filter((c) => c.isActive && c.isOnShift);
  }, [couriers]);

  return {
    couriers,
    activeCouriers,
    loading,
    error,
    createCourier,
    updateCourier,
    toggleCourierShift,
    updateCourierLocation,
    refetch: fetchCouriers,
  };
}
