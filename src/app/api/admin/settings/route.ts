import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client unconfigured" }, { status: 500 });
    }

    const { data, error } = await (supabase as any)
      .from("bakery_settings")
      .select("*");

    if (error) {
      console.error("Fetch settings error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settingsMap: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      settingsMap[row.key] = row.value;
    });

    // Defaults if not set yet
    const operational = settingsMap["operational_settings"] || {
      freeShippingThreshold: 1000,
      shippingFee: 150,
      deliveryWindow: "14:00 - 18:00",
      whatsappPhone: "0530 638 97 73",
      orderAcceptanceOpen: true,
      announcementText: "",
    };

    const devices = settingsMap["trusted_devices"] || [];

    return NextResponse.json({
      operational,
      devices,
    });
  } catch (err: any) {
    console.error("Settings GET handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client unconfigured" }, { status: 500 });
    }

    const body = await request.json();
    const { action, value } = body;

    if (action === "save_operational") {
      const { error } = await (supabase as any)
        .from("bakery_settings")
        .upsert(
          {
            key: "operational_settings",
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Ayarlar güncellendi" });
    }

    if (action === "save_devices") {
      const { error } = await (supabase as any)
        .from("bakery_settings")
        .upsert(
          {
            key: "trusted_devices",
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Cihazlar güncellendi" });
    }

    if (action === "authorize_device") {
      const { deviceId, deviceName, approvedBy } = body;
      if (!deviceId) {
        return NextResponse.json({ error: "deviceId required" }, { status: 400 });
      }

      // Fetch existing
      const { data: existingRow } = await (supabase as any)
        .from("bakery_settings")
        .select("value")
        .eq("key", "trusted_devices")
        .maybeSingle();

      let devicesList: any[] = Array.isArray(existingRow?.value) ? [...existingRow.value] : [];
      const now = new Date().toISOString();

      const existingIndex = devicesList.findIndex((d) => d.id === deviceId || d.deviceId === deviceId);
      if (existingIndex >= 0) {
        devicesList[existingIndex] = {
          ...devicesList[existingIndex],
          deviceName: deviceName || devicesList[existingIndex].deviceName,
          approved: true,
          approvedAt: now,
          approvedBy: approvedBy || "Superadmin",
          lastUsedAt: now,
        };
      } else {
        devicesList.push({
          id: deviceId,
          deviceId,
          deviceName: deviceName || "Mobil / Masaüstü Yetkili",
          approved: true,
          approvedAt: now,
          approvedBy: approvedBy || "Superadmin",
          lastUsedAt: now,
        });
      }

      const { error } = await (supabase as any).from("bakery_settings").upsert(
        {
          key: "trusted_devices",
          value: devicesList,
          updated_at: now,
        },
        { onConflict: "key" }
      );

      if (error) throw error;
      return NextResponse.json({ success: true, devices: devicesList });
    }

    if (action === "revoke_device" || action === "delete_device") {
      const { deviceId } = body;
      const { data: existingRow } = await (supabase as any)
        .from("bakery_settings")
        .select("value")
        .eq("key", "trusted_devices")
        .maybeSingle();

      let devicesList: any[] = Array.isArray(existingRow?.value) ? [...existingRow.value] : [];
      const now = new Date().toISOString();

      if (action === "delete_device") {
        devicesList = devicesList.filter((d) => d.id !== deviceId && d.deviceId !== deviceId);
      } else {
        devicesList = devicesList.map((d) => {
          if (d.id === deviceId || d.deviceId === deviceId) {
            return { ...d, approved: false, revokedAt: now };
          }
          return d;
        });
      }

      const { error } = await (supabase as any).from("bakery_settings").upsert(
        {
          key: "trusted_devices",
          value: devicesList,
          updated_at: now,
        },
        { onConflict: "key" }
      );

      if (error) throw error;
      return NextResponse.json({ success: true, devices: devicesList });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Settings POST handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
