"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { TrustedDevice } from "@/types/admin";

export function useTrustedDevice() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("");
  const [isApproved, setIsApproved] = useState<boolean | null>(null); // null = checking
  const [loading, setLoading] = useState<boolean>(true);
  const [allDevices, setAllDevices] = useState<TrustedDevice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Get or create persistent deviceId
    let localId = localStorage.getItem("ekmeklab_trusted_device_id");
    if (!localId) {
      localId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("ekmeklab_trusted_device_id", localId);
    }
    setDeviceId(localId);

    // 2. Detect friendly device name
    const ua = navigator.userAgent;
    let detectedName = "Bilinmeyen Cihaz";
    if (/Windows/i.test(ua)) detectedName = "Windows PC (Masaüstü)";
    else if (/iPhone/i.test(ua)) detectedName = "iPhone";
    else if (/iPad/i.test(ua)) detectedName = "iPad";
    else if (/Android/i.test(ua)) detectedName = "Android Telefon";
    else if (/Macintosh|Mac OS/i.test(ua)) detectedName = "Mac";
    setDeviceName(detectedName);

    // 3. Verify against Firestore 'guvenli_cihazlar'
    const deviceRef = doc(db, "guvenli_cihazlar", localId);

    const unsubscribe = onSnapshot(
      deviceRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsApproved(Boolean(data.approved));
          setLoading(false);
        } else {
          // Check if any devices exist in the system.
          // If no devices exist at all (first-time deployment), auto-register and approve as Primary Device!
          try {
            const allSnap = await getDocs(collection(db, "guvenli_cihazlar"));
            if (allSnap.empty) {
              const primaryDevice: TrustedDevice = {
                id: localId,
                deviceId: localId,
                deviceName: `${detectedName} (Ana Yönetici)`,
                approved: true,
                approvedAt: new Date().toISOString(),
                lastUsedAt: new Date().toISOString(),
                userAgent: ua,
              };
              await setDoc(deviceRef, primaryDevice);
              setIsApproved(true);
            } else {
              setIsApproved(false);
            }
          } catch {
            setIsApproved(false);
          }
          setLoading(false);
        }
      },
      (error) => {
        console.warn("Trusted device check notice (Fail-secure active):", error);
        // Fail-secure: On network or permission error, deny access by default
        setIsApproved(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Request approval for this device
  const requestApproval = async (customName?: string) => {
    if (!deviceId) return;
    try {
      const deviceRef = doc(db, "guvenli_cihazlar", deviceId);
      await setDoc(
        deviceRef,
        {
          id: deviceId,
          deviceId: deviceId,
          deviceName: customName || deviceName,
          approved: false,
          lastUsedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error requesting approval:", e);
    }
  };

  // Approve a device (called from admin settings)
  const approveDevice = async (targetDeviceId: string, approverEmail: string) => {
    try {
      const deviceRef = doc(db, "guvenli_cihazlar", targetDeviceId);
      await setDoc(
        deviceRef,
        {
          approved: true,
          approvedAt: new Date().toISOString(),
          approvedBy: approverEmail,
          lastUsedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error approving device:", e);
    }
  };

  // Revoke device
  const revokeDevice = async (targetDeviceId: string) => {
    try {
      const deviceRef = doc(db, "guvenli_cihazlar", targetDeviceId);
      await setDoc(
        deviceRef,
        {
          approved: false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error revoking device:", e);
    }
  };

  return {
    deviceId,
    deviceName,
    isApproved,
    loading,
    requestApproval,
    approveDevice,
    revokeDevice,
  };
}
