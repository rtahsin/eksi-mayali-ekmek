"use client";

import React, { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useTrustedDevice } from "@/hooks/useTrustedDevice";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, Laptop, CheckCircle2, LogOut, Loader2, KeyRound } from "lucide-react";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { adminUser, isAuthenticated, isSuperAdmin, loading: authLoading, logout } = useAdminAuth();
  const { deviceId, deviceName, isApproved, loading: deviceLoading, requestApproval } = useTrustedDevice();
  const router = useRouter();
  const pathname = usePathname();

  const [requested, setRequested] = useState(false);
  const [customDeviceName, setCustomDeviceName] = useState("");

  // Allow unrestricted access to the login page itself
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // 1. Loading State
  if (authLoading || (!isSuperAdmin && deviceLoading)) {
    return (
      <div className="min-h-screen bg-[#120E0B] flex flex-col items-center justify-center text-foreground font-sans p-4">
        <div className="flex flex-col items-center gap-4 bg-[#1A1410] p-8 rounded-3xl border border-[#2F241D] shadow-2xl">
          <div className="w-12 h-12 rounded-full border-2 border-artisan-gold/30 border-t-artisan-gold animate-spin" />
          <div className="text-center space-y-1">
            <div className="font-serif text-lg font-bold text-foreground">
              Ekmek<span className="text-artisan-gold italic">Lab</span> Operasyon
            </div>
            <p className="text-xs text-foreground/60">Güvenlik ve yetki doğrulaması yapılıyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Authenticated -> Redirect to Login
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }
    return null;
  }

  // 3. Super Admin bypasses device restriction completely
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // 4. Authenticated Staff BUT Untrusted Device
  if (isApproved === false) {
    return (
      <div className="min-h-screen bg-[#120E0B] flex items-center justify-center p-4 text-foreground font-sans">
        <div className="max-w-md w-full bg-[#1A1410] border border-artisan-terracotta/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-artisan-terracotta via-artisan-gold to-artisan-terracotta" />

          <div className="flex items-center gap-3 text-artisan-terracotta">
            <div className="w-12 h-12 rounded-2xl bg-artisan-terracotta/10 border border-artisan-terracotta/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-artisan-terracotta" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-foreground">Tanınmayan Cihaz Kilidi</h2>
              <p className="text-xs text-foreground/60">EkmekLab Güvenlik Protokolü</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-foreground/80 leading-relaxed bg-[#14100D] p-4 rounded-2xl border border-[#2A201A]">
            <p>
              Sayın <strong>{adminUser?.displayName || adminUser?.email}</strong>, şifreniz doğru ancak giriş yaptığınız bu cihaz henüz fırın yöneticisi tarafından yetkilendirilmemiştir.
            </p>
            <p className="text-foreground/60">
              Yetkisiz erişimleri önlemek amacıyla panel yalnızca onaylı bilgisayar ve telefonlardan kullanılabilir.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-foreground/50 font-mono text-[11px] flex items-center justify-between">
              <span>Cihaz Kimliği:</span>
              <span className="text-artisan-gold">{deviceId.substring(0, 16)}...</span>
            </div>
            <div className="text-foreground/50 font-mono text-[11px] flex items-center justify-between">
              <span>Algılanan Cihaz:</span>
              <span className="text-foreground">{deviceName}</span>
            </div>
          </div>

          {!requested ? (
            <div className="space-y-3">
              <input
                type="text"
                value={customDeviceName}
                onChange={(e) => setCustomDeviceName(e.target.value)}
                placeholder={`Örn: ${deviceName}`}
                className="w-full px-4 py-2.5 rounded-xl bg-[#14100D] border border-[#2F241D] text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-artisan-gold"
              />
              <button
                type="button"
                onClick={async () => {
                  await requestApproval(customDeviceName);
                  setRequested(true);
                }}
                className="w-full py-3 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-xs font-serif font-bold transition-all shadow-lg shadow-artisan-terracotta/20 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Bu Cihaz İçin Onay Talep Et</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Onay talebi oluşturuldu. Lütfen ana bilgisayarınızdan veya telefonunuzdan bu cihazı onaylayın.</span>
            </div>
          )}

          <div className="pt-2 border-t border-[#2F241D] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={logout}
              className="text-foreground/60 hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Farklı Hesapla Giriş</span>
            </button>
            <a href="/" className="text-artisan-gold hover:underline">
              Vitrini Ziyaret Et →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Approved & Authenticated -> Render Admin Pages
  return <>{children}</>;
}
