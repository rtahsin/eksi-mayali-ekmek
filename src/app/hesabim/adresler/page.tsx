"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { stripMah } from "@/lib/order/validate";
import {
  MapPin,
  Plus,
  Check,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogIn,
} from "lucide-react";

export default function AdreslerimPage() {
  const {
    user,
    addresses,
    saveAddress,
    setDefaultAddress,
    deleteAddress,
    loading,
    openAuthModal,
  } = useAuth();
  const { settings } = useStoreSettings();

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("Ev");
  const [district, setDistrict] = useState("Beylikdüzü");
  const [neighborhood, setNeighborhood] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [directions, setDirections] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busyAddrId, setBusyAddrId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const selectedNeighborhood =
    settings.neighborhoods.find(
      (nh) =>
        stripMah(nh).toLocaleLowerCase("tr-TR") ===
        stripMah(neighborhood).toLocaleLowerCase("tr-TR")
    ) ?? "";

  const openAddForm = () => {
    setError(null);
    setActionNotice(null);
    setIsDefault(addresses.length === 0);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNeighborhood) {
      setError("Lütfen teslimat bölgemizdeki bir mahalleyi seçin.");
      return;
    }
    if (!addressDetail.trim()) {
      setError("Lütfen açık adresinizi girin.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: saveErr } = await saveAddress({
        title: title.trim() || "Ev",
        district: district.trim() || "Beylikdüzü",
        neighborhood: selectedNeighborhood,
        addressDetail: addressDetail.trim(),
        directions: directions.trim(),
        isDefault: addresses.length === 0 ? true : isDefault,
      });

      if (saveErr) throw saveErr;

      setIsAdding(false);
      setTitle("Ev");
      setNeighborhood("");
      setAddressDetail("");
      setDirections("");
      setIsDefault(false);
      setActionNotice({ type: "ok", text: "Yeni teslimat adresiniz kaydedildi." });
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Adres kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (addrId: string) => {
    setBusyAddrId(addrId);
    setActionNotice(null);
    const res = await setDefaultAddress(addrId);
    setBusyAddrId(null);
    if (res.success) {
      setActionNotice({ type: "ok", text: "Varsayılan teslimat adresiniz güncellendi." });
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      setActionNotice({ type: "err", text: res.error || "Varsayılan adres seçilemedi." });
    }
  };

  const handleConfirmDelete = async (addrId: string) => {
    setBusyAddrId(addrId);
    setActionNotice(null);
    const res = await deleteAddress(addrId);
    setBusyAddrId(null);
    setConfirmDeleteId(null);
    if (res.success) {
      setActionNotice({ type: "ok", text: "Adres kaydınız silindi." });
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      setActionNotice({ type: "err", text: res.error || "Adres silinemedi." });
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-ink-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-serif">Adresleriniz yükleniyor...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-cream-surface border border-line rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 text-ink">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
          <MapPin className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-serif font-bold text-ink">
          Adreslerinizi Yönetmek İçin Giriş Yapın
        </h1>
        <p className="text-xs text-ink-muted leading-relaxed max-w-sm mx-auto font-sans">
          Ev veya iş yeri teslimat adreslerinizi bir kez kaydedip siparişlerinizde tek dokunuşla seçebilirsiniz.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => openAuthModal("/hesabim/adresler")}
            className="touch-target-44 min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-accent/90 transition-all"
          >
            <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Giriş Yap / Kayıt Ol</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-ink">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
            Kayıtlı Adreslerim
          </h1>
          <p className="text-xs text-ink-muted mt-1 font-sans">
            Siparişlerinizde hızlı seçim için teslimat adreslerinizi düzenleyin.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={openAddForm}
            className="touch-target-44 min-h-[44px] px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Yeni Adres Ekle</span>
          </button>
        )}
      </div>

      {actionNotice && (
        <div
          role={actionNotice.type === "err" ? "alert" : "status"}
          className={`p-3.5 rounded-xl text-xs font-sans flex items-center gap-2 border ${
            actionNotice.type === "ok"
              ? "bg-good/15 border-good/30 text-ink"
              : "bg-bad/10 border-bad/30 text-bad"
          }`}
        >
          {actionNotice.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 text-good shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Add Address Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-cream-surface border border-line rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-serif font-bold text-base text-ink">Yeni Teslimat Adresi</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="touch-target-44 px-2 py-1 text-xs text-ink-muted hover:text-ink font-medium"
            >
              Vazgeç
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="addr-title" className="block text-xs font-semibold text-ink mb-1">
                Adres Başlığı
              </label>
              <input
                id="addr-title"
                name="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ör. Ev, İş, Atölye"
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label htmlFor="addr-district" className="block text-xs font-semibold text-ink mb-1">
                İlçe
              </label>
              <input
                id="addr-district"
                name="district"
                type="text"
                autoComplete="address-level2"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="addr-neighborhood" className="block text-xs font-semibold text-ink mb-1">
                Mahalle *
              </label>
              <select
                id="addr-neighborhood"
                name="neighborhood"
                autoComplete="address-level3"
                value={selectedNeighborhood}
                onChange={(e) => {
                  setNeighborhood(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink focus:outline-none focus:border-accent"
                required
              >
                <option value="">Mahalle seçin…</option>
                {settings.neighborhoods.map((nh) => (
                  <option key={nh} value={nh}>
                    {nh} Mah.
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="addr-detail" className="block text-xs font-semibold text-ink mb-1">
                Açık Adres (Sokak, Bina No, Daire) *
              </label>
              <textarea
                id="addr-detail"
                name="addressDetail"
                autoComplete="street-address"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                rows={2}
                placeholder="Cadde, sokak, bina, kat ve daire bilgisi..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="addr-directions" className="block text-xs font-semibold text-ink mb-1">
                Kurye İçin Tarif / Not (İsteğe bağlı)
              </label>
              <input
                id="addr-directions"
                name="directions"
                type="text"
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                placeholder="Ör. Zili çalmayın, kapıya asın"
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={addresses.length === 0 ? true : isDefault}
              disabled={addresses.length === 0}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-line text-accent focus:ring-accent"
            />
            <label htmlFor="isDefault" className="text-xs text-ink font-sans cursor-pointer py-1">
              Varsayılan teslimat adresi olarak ayarla
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-bad/10 border border-bad/30 text-bad text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="touch-target-44 min-h-[44px] px-4 py-2 rounded-xl bg-bg border border-line hover:bg-cream-surface text-xs font-medium"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="touch-target-44 min-h-[44px] px-5 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Adresi Kaydet"}
            </button>
          </div>
        </form>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="bg-cream-surface border border-line rounded-3xl p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <MapPin className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="font-serif font-bold text-base text-ink">Henüz Kayıtlı Adresiniz Yok</h2>
          <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed font-sans">
            Siparişlerinizde hızlıca seçmek için ev veya iş adresinizi kaydedebilirsiniz.
          </p>
          {!isAdding && (
            <button
              type="button"
              onClick={openAddForm}
              className="touch-target-44 min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold mt-2 shadow-xs"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>İlk Adresinizi Ekleyin</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            const isBusy = busyAddrId === addr.id;
            const isConfirmingDelete = confirmDeleteId === addr.id;

            return (
              <div
                key={addr.id}
                className={`bg-cream-surface border rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-2xs transition-colors ${
                  addr.isDefault ? "border-accent/45" : "border-line"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-serif font-bold text-sm sm:text-base text-ink truncate">
                        {addr.title}
                      </span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-bold shrink-0">
                          <Check className="w-3 h-3" aria-hidden="true" />
                          <span>Varsayılan</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-ink-muted leading-relaxed font-sans space-y-0.5">
                    {addr.neighborhood && (
                      <span className="block font-semibold text-ink">{addr.neighborhood} Mah.</span>
                    )}
                    <p>{addr.addressDetail}</p>
                    <p className="text-ink-muted/85">{addr.district}</p>
                    {addr.directions && (
                      <p className="italic text-[11px] text-ink pt-1">
                        Teslimat notu: {addr.directions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Kart Aksiyon Satırı: Varsayılan Yap & Satır İçi Onaylı Sil */}
                <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                  {isConfirmingDelete ? (
                    <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-bad/10 border border-bad/25 rounded-xl px-3 py-2">
                      <span className="text-xs font-semibold text-bad">
                        Bu adres silinsin mi?
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(null)}
                          className="touch-target-44 min-h-[38px] px-3 py-1.5 rounded-lg bg-cream-surface border border-line text-xs font-medium text-ink"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleConfirmDelete(addr.id)}
                          className="touch-target-44 min-h-[38px] px-3 py-1.5 rounded-lg bg-bad text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Evet, Sil</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!addr.isDefault ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleMakeDefault(addr.id)}
                          aria-label={`${addr.title} adresini varsayılan yap`}
                          className="touch-target-44 min-h-[40px] px-3 py-1.5 rounded-xl bg-bg hover:bg-line/40 border border-line text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" aria-hidden="true" />
                          ) : (
                            <Star className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                          )}
                          <span>Varsayılan Yap</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink-muted font-sans">
                          Sepette otomatik seçilir
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(addr.id)}
                        aria-label={`${addr.title} adresini sil`}
                        className="touch-target-44 min-h-[40px] px-3 py-1.5 rounded-xl text-bad hover:bg-bad/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ml-auto disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Sil</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
