"use client";

import React, { useState, useEffect } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { MessageSquare, Check, Phone, ShieldCheck } from "lucide-react";

export default function TercihlerPage() {
  const { user, profile } = useCustomerAuth();
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ekmeklab_pref_whatsapp");
      if (stored !== null) {
        setWhatsappConsent(stored === "true");
      }
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    setWhatsappConsent(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("ekmeklab_pref_whatsapp", String(checked));
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6 text-ink">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
          İletişim Tercihleri
        </h1>
        <p className="text-xs text-ink-muted mt-1 font-sans">
          Sipariş durumları, fırın çıkışı ve teslimat saatleriyle ilgili bildirim tercihlerinizi yönetin.
        </p>
      </div>

      <div className="bg-cream-surface border border-line rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs">
        {/* WhatsApp Notification Consent */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-good" />
              <h2 className="font-serif font-bold text-sm text-ink">
                WhatsApp ile Sipariş & Teslimat Bilgilendirmesi
              </h2>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed max-w-lg font-sans">
              Ekmekleriniz fırına girdiğinde, kuryemiz yola çıktığında ve özel ekmek eşik durumlarında WhatsApp üzerinden anlık bilgilendirme mesajı alırsınız.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={whatsappConsent}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-good" />
          </label>
        </div>

        {/* Registered Contact Info */}
        <div className="pt-4 border-t border-line space-y-3">
          <h3 className="font-serif font-semibold text-xs text-ink">Kayıtlı İletişim Bilgileri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-bg border border-line flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-accent shrink-0" />
              <div>
                <span className="text-ink-muted block text-[11px]">Telefon</span>
                <span className="font-medium text-ink">{profile?.phone || "Siparişte girilen numara"}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-bg border border-line flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-good shrink-0" />
              <div>
                <span className="text-ink-muted block text-[11px]">Gizlilik Güvencesi</span>
                <span className="font-medium text-ink">İletişim bilgileriniz 3. taraflarla paylaşılmaz</span>
              </div>
            </div>
          </div>
        </div>

        {savedNotice && (
          <div className="p-3 rounded-xl bg-good/15 border border-good/30 text-xs text-ink font-sans flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-good shrink-0" />
            <span>İletişim tercihiniz başarıyla güncellendi.</span>
          </div>
        )}
      </div>
    </div>
  );
}
