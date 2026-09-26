"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getErrorMessage } from "@/lib/utils/error";

export interface LocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  isSharing: boolean;
  error: string | null;
}

export function useCustomerLocation(orderId?: string) {
  const [locationState, setLocationState] = useState<LocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    isSharing: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);
  const lastInsertTimeRef = useRef<number>(0);
  const activeOrderIdRef = useRef<string | null>(orderId || null);

  const supabase = createClient();

  useEffect(() => {
    activeOrderIdRef.current = orderId || null;
  }, [orderId]);

  const stopLocationSharing = useCallback(async () => {
    if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (broadcastChannelRef.current && supabase) {
      supabase.removeChannel(broadcastChannelRef.current);
      broadcastChannelRef.current = null;
    }

    const currentOrderId = activeOrderIdRef.current;
    if (currentOrderId && supabase && isSupabaseConfigured()) {
      try {
        await supabase
          .from("orders")
          .update({
            location_shared: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentOrderId);
      } catch (err: unknown) {
        console.warn("Could not set location_shared=false on stop:", err);
      }
    }

    setLocationState((prev) => ({
      ...prev,
      isSharing: false,
    }));
  }, [supabase]);

  const startLocationSharing = useCallback(
    async (targetOrderId?: string) => {
      const orderIdToUse = targetOrderId || activeOrderIdRef.current;
      if (!orderIdToUse) {
        setLocationState((prev) => ({ ...prev, error: "Geçerli bir sipariş ID belirtilmedi." }));
        return false;
      }

      if (typeof window === "undefined" || !navigator.geolocation) {
        setLocationState((prev) => ({
          ...prev,
          error: "Tarayıcınız konum servisini desteklemiyor.",
        }));
        return false;
      }

      try {
        const nowIso = new Date().toISOString();

        // 1. orders tablosunda rıza ve paylaşım durumunu güncelle
        if (supabase && isSupabaseConfigured()) {
          await supabase
            .from("orders")
            .update({
              location_shared: true,
              location_consent_at: nowIso,
              updated_at: nowIso,
            })
            .eq("id", orderIdToUse);

          // 2. Realtime broadcast kanalını aç
          if (!broadcastChannelRef.current) {
            const ch = supabase.channel(`customer-location-${orderIdToUse}`);
            broadcastChannelRef.current = ch;
            ch.subscribe();
          }
        }

        // 3. Geolocation watch başlat
        const id = navigator.geolocation.watchPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy;

            setLocationState({
              lat,
              lng,
              accuracy,
              isSharing: true,
              error: null,
            });

            // Realtime broadcast yayını
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.send({
                type: "broadcast",
                event: "location",
                payload: { lat, lng, accuracy, timestamp: Date.now() },
              });
            }

            // DB'ye throttle ile kayıt (en az 5 saniyede bir)
            const now = Date.now();
            if (now - lastInsertTimeRef.current >= 5000) {
              lastInsertTimeRef.current = now;

              if (supabase && isSupabaseConfigured()) {
                // Kalıcı log tablosu
                await supabase.from("customer_locations").insert({
                  order_id: orderIdToUse,
                  lat,
                  lng,
                  accuracy,
                });

                // orders tablosundaki son konum
                await supabase
                  .from("orders")
                  .update({
                    customer_lat: lat,
                    customer_lng: lng,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", orderIdToUse);
              }
            }
          },
          (err) => {
            let errorMsg = "Konum alınamadı.";
            if (err.code === err.PERMISSION_DENIED) {
              errorMsg = "Konum izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.";
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              errorMsg = "GPS konumu belirlenemiyor.";
            } else if (err.code === err.TIMEOUT) {
              errorMsg = "Konum alma zaman aşımına uğradı.";
            }

            setLocationState((prev) => ({
              ...prev,
              isSharing: false,
              error: errorMsg,
            }));
            stopLocationSharing();
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000,
          }
        );

        watchIdRef.current = id;
        return true;
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        setLocationState((prev) => ({
          ...prev,
          isSharing: false,
          error: errorMsg,
        }));
        return false;
      }
    },
    [supabase, stopLocationSharing]
  );

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (broadcastChannelRef.current && supabase) {
        supabase.removeChannel(broadcastChannelRef.current);
      }
    };
  }, [supabase]);

  return {
    locationState,
    startLocationSharing,
    stopLocationSharing,
    isSharing: locationState.isSharing,
    error: locationState.error,
  };
}
