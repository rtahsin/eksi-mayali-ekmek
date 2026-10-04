"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getOfflineQueue, addToOfflineQueue, removeFromOfflineQueue } from "@/lib/courier/offlineQueue";
import { deliverOrder, type DeliveryPayment } from "@/lib/orders/delivery";

export function useCourierNetwork() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [queueLength, setQueueLength] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    failed: number;
    timestamp: number;
  } | null>(null);

  // Sync state with localStorage
  const refreshQueueLength = useCallback(() => {
    const queue = getOfflineQueue();
    setQueueLength(queue.length);
  }, []);

  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  // Kuyruğu sunucuya gönder: teslim rotası tekrar güvenli (aynı teslim iki kez yazılmaz).
  // Ağ/sunucu hatasında dur (sonra yeniden dene); kalıcı hatada (iptal edilmiş vb.) kaydı çıkar ve göster.
  const syncQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      setQueueLength(0);
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const item of queue) {
      const res = await deliverOrder(item.orderId, item.payment, item.note);
      if (res.ok) {
        removeFromOfflineQueue(item.id);
        syncedCount++;
      } else if (res.retryable) {
        failedCount++;
        break;
      } else {
        removeFromOfflineQueue(item.id);
        failedCount++;
        errors.push(`${item.orderId.slice(0, 8)}: ${res.error}`);
      }
    }

    setQueueLength(getOfflineQueue().length);
    setIsSyncing(false);
    if (errors.length) setSyncErrors((prev) => [...prev, ...errors]);

    const result = { synced: syncedCount, failed: failedCount, timestamp: Date.now() };
    setLastSyncResult(result);
    return result;
  }, []);

  const enqueueDelivery = useCallback(
    (orderId: string, payment: DeliveryPayment, note?: string) => {
      const newItem = addToOfflineQueue({ orderId, payment, note: note ?? "Çevrimdışı teslim" });
      refreshQueueLength();
      return newItem;
    },
    [refreshQueueLength]
  );

  // Listen to network status changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    refreshQueueLength();

    const handleOnline = () => {
      setIsOnline(true);
      refreshQueueLength();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshQueueLength();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshQueueLength]);

  return {
    isOnline,
    queueLength,
    isSyncing,
    lastSyncResult,
    enqueueDelivery,
    syncQueue,
    syncErrors,
    clearSyncErrors: () => setSyncErrors([]),
    refreshQueueLength,
  };
}
