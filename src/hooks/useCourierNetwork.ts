"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getOfflineQueue,
  addToOfflineQueue,
  removeFromOfflineQueue,
  OfflineQueueItem,
  OfflinePaymentPayload,
  OfflineStatusPayload,
} from "@/lib/courier/offlineQueue";

interface SyncHandlers {
  createPayment: (data: OfflinePaymentPayload) => Promise<{ success?: boolean; error?: string } | void>;
  updateOrderStatus: (
    orderId: string,
    newStatus: any,
    courierNotes?: string,
    changedByRole?: any,
    changedById?: string,
    note?: string
  ) => Promise<{ success?: boolean; error?: string } | void>;
}

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

  // Sync queued items to backend
  const syncQueue = useCallback(
    async (handlers: SyncHandlers) => {
      const queue = getOfflineQueue();
      if (queue.length === 0) {
        setQueueLength(0);
        return { synced: 0, failed: 0 };
      }

      setIsSyncing(true);
      let syncedCount = 0;
      let failedCount = 0;

      for (const item of queue) {
        try {
          // 1. Process payment if attached
          if (item.paymentPayload) {
            await handlers.createPayment(item.paymentPayload);
          }

          // 2. Process order status update
          await handlers.updateOrderStatus(
            item.statusPayload.orderId,
            item.statusPayload.newStatus,
            item.statusPayload.courierNotes,
            item.statusPayload.changedByRole,
            item.statusPayload.changedById,
            item.statusPayload.note
          );

          // Remove successful item from queue
          removeFromOfflineQueue(item.id);
          syncedCount++;
        } catch (err) {
          console.error(`Failed to sync queued courier action ${item.id}:`, err);
          failedCount++;
          // Break to avoid cascading errors when connection drops again
          break;
        }
      }

      const remaining = getOfflineQueue();
      setQueueLength(remaining.length);
      setIsSyncing(false);

      const result = { synced: syncedCount, failed: failedCount, timestamp: Date.now() };
      setLastSyncResult(result);
      return result;
    },
    []
  );

  // Enqueue a delivery confirmation when offline or network fails
  const enqueueDelivery = useCallback(
    (orderId: string, paymentPayload?: OfflinePaymentPayload, statusPayload?: OfflineStatusPayload) => {
      const defaultStatusPayload: OfflineStatusPayload = statusPayload || {
        orderId,
        newStatus: "teslim_edildi",
        courierNotes: "Çevrimdışı teslim edildi",
        changedByRole: "courier",
        note: "Çevrimdışı teslimat kaydı",
      };

      const newItem = addToOfflineQueue({
        orderId,
        paymentPayload,
        statusPayload: defaultStatusPayload,
      });

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
    refreshQueueLength,
  };
}
