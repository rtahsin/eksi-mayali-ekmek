"use client";

import React, { useState } from "react";
import { useCustomerAuth, SavedAddress } from "@/hooks/useCustomerAuth";
import { MapPin, Plus, Check, Trash2, Home, Building } from "lucide-react";

export default function AdreslerimPage() {
  const { user, addresses, saveAddress, loading } = useCustomerAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("Ev");
  const [district, setDistrict] = useState("Beylikdüzü");
  const [neighborhood, setNeighborhood] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [directions, setDirections] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressDetail.trim()) {
      setError("Lütfen açık adresinizi girin.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: saveErr } = await saveAddress({
        title,
        district,
        neighborhood,
        addressDetail,
        directions,
        isDefault,
      });

      if (saveErr) throw saveErr;

      setIsAdding(false);
      setTitle("Ev");
      setNeighborhood("");
      setAddressDetail("");
      setDirections("");
      setIsDefault(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Adres kaydedilemedi.");
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
            Kayıtlı Adreslerim
          </h1>
          <p className="text-xs text-ink-muted mt-1 font-sans">
            Siparişlerinizde hızlı teslimat için adreslerinizi yönetin.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="touch-target-44 px-3.5 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Adres Ekle</span>
          </button>
        )}
      </div>

      {/* Add Address Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-cream-surface border border-line rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-serif font-bold text-base text-ink">Yeni Teslimat Adresi</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="touch-target-44 text-xs text-ink-muted hover:text-ink font-medium"
            >
              Vazgeç
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Adres Başlığı
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ör. Ev, İş, Bahçe"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-xs text-ink focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                İlçe
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-xs text-ink focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Mahalle
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ör. Barış Mahallesi, Yakuplu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-xs text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Açık Adres (Sokak, Bina No, Daire)
              </label>
              <textarea
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                rows={2}
                placeholder="Cadde, sokak, bina, kat ve daire bilgisi..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-xs text-ink focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Kurye İçin Tarif / Not (İsteğe bağlı)
              </label>
              <input
                type="text"
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                placeholder="Ör. Zili çalmayın, kapıya bırakın"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line text-xs text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-line text-accent focus:ring-accent"
            />
            <label htmlFor="isDefault" className="text-xs text-ink-muted cursor-pointer font-sans">
              Varsayılan teslimat adresi olarak ayarla
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-bad/10 border border-bad/30 text-bad text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="touch-target-44 px-4 py-2 rounded-xl bg-bg border border-line hover:bg-cream-surface text-xs font-medium"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="touch-target-44 px-5 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Adresi Kaydet"}
            </button>
          </div>
        </form>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="bg-cream-surface border border-line rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-ink">Henüz Kayıtlı Adresiniz Yok</h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
            Siparişlerinizde kolayca seçmek için ev veya iş adresinizi kaydedebilirsiniz.
          </p>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="touch-target-44 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold mt-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Adresinizi Ekleyin</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-cream-surface border border-line rounded-2xl p-4 sm:p-5 space-y-2.5 relative shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-sm text-ink">{addr.title}</span>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-semibold">
                      <Check className="w-3 h-3" />
                      <span>Varsayılan</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-ink-muted leading-relaxed font-sans">
                {addr.neighborhood && <span className="block font-medium text-ink">{addr.neighborhood}</span>}
                <p>{addr.addressDetail}</p>
                <p className="text-ink-muted/80">{addr.district}</p>
                {addr.directions && (
                  <p className="italic text-[11px] text-accent mt-1">Not: {addr.directions}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
