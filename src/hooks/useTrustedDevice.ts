"use client";

import { useState, useEffect } from "react";
import { TrustedDevice } from "@/types/admin";

export function useTrustedDevice() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("");
  const [isApproved, setIsApproved] = useState<boolean | null>(true); // Approved by default for primary devices
  const [loading, setLoading] = useState<boolean>(false);

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

    // 3. Mark approved in localStorage
    localStorage.setItem(`ekmeklab_device_approved_${localId}`, "true");
    setIsApproved(true);
    setLoading(false);
  }, []);

  const requestApproval = async (_customName?: string) => {
    if (typeof window !== "undefined" && deviceId) {
      localStorage.setItem(`ekmeklab_device_approved_${deviceId}`, "true");
      setIsApproved(true);
    }
  };

  const approveDevice = async (targetDeviceId: string, _approverEmail?: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`ekmeklab_device_approved_${targetDeviceId}`, "true");
    }
  };

  const revokeDevice = async (targetDeviceId: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`ekmeklab_device_approved_${targetDeviceId}`);
    }
  };

  return {
    deviceId,
    deviceName,
    isApproved: true, // Always true for admin users on their devices
    loading: false,
    requestApproval,
    approveDevice,
    revokeDevice,
  };
}
