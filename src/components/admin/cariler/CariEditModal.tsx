"use client";

import React, { useState } from "react";
import { X, Edit, Loader2, Tag, Building2, TrendingUp } from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { useProducts } from "@/hooks/useProducts";
import { CariAccount, BEYLIKDUZU_NEIGHBORHOODS } from "@/types/admin";

interface CariEditModalProps {
  cari?: CariAccount | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CariEditModal({ cari, onClose, onSuccess }: CariEditModalProps) {
  const { updateCari, addCari } = useCariler();
  const { allProducts } = useProducts();

  const isNew = !cari;

  const [activeTab, setActiveTab] = useState<"info" | "prices">("info");

  const [formData, setFormData] = useState({
    businessName: cari?.businessName || "",
    contactPerson: cari?.contactPerson || "",
    phone: cari?.phone || "",
    neighborhood: cari?.neighborhood || "",
    address: cari?.address || "",
    taxOffice: cari?.taxOffice || "",
    taxNumber: cari?.taxNumber || "",
    accountType: cari?.accountType || "musteri",
    notes: cari?.notes || "",
  });

  const [customPrices, setCustomPrices] = useState<Record<string, number>>(
    cari?.customPrices || {}
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePriceChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    setCustomPrices((prev) => {
      const updated = { ...prev };
      if (isNaN(num) || num <= 0) {
        delete updated[productId];
      } else {
        updated[productId] = num;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim()) {
      setError("Müşteri adı zorunludur.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isNew) {
        const res = await addCari({
          ...formData,
          customPrices,
          initialBalance: 0,
        });

        if (!res.success) {
          throw new Error(res.error || "Müşteri oluşturulamadı.");
        }
      } else if (cari) {
        const res = await updateCari(cari.id, {
          ...formData,
          customPrices,
        });

        if (!res.success) {
          throw new Error(res.error || "Müşteri güncellenemedi.");
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "İşlem başarısız oldu.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const customPriceCount = Object.keys(customPrices).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-stone-900 border border-stone-800 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative z-10 my-0 sm:my-8 max-h-[90vh] flex flex-col animate-slideUp">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 font-serif text-base sm:text-lg">
                {isNew ? "Yeni Kurumsal Müşteri Ekle" : "Müşteri Kartını Düzenle"}
              </h3>
              <p className="text-xs text-stone-400">
                {isNew ? "Kurumsal cari hesap ve toptan anlaşmalı fiyatlar" : cari?.businessName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 bg-stone-800 rounded-xl text-stone-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-800 bg-stone-950/60 p-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "info"
                ? "bg-stone-800 text-stone-100 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Firma Bilgileri
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prices")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "prices"
                ? "bg-amber-500 text-stone-950 font-black shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Özel Fiyatlar {customPriceCount > 0 && `(${customPriceCount})`}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {activeTab === "info" ? (
            <div className="space-y-4">
              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">
                  İşletme / Firma Adı <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Örn: Beylikdüzü Cafe"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">Yetkili Kişi</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Serkan Bey"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0535 000 00 00"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Neighborhood */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Mahalle</label>
                <select
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50 appearance-none"
                >
                  <option value="">Mahalle Seçiniz...</option>
                  {BEYLIKDUZU_NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Tam Adres</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Cadde, sokak, bina no..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {/* Tax Office & Tax Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={formData.taxOffice}
                    onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                    placeholder="Beylikdüzü VD"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">Vergi / TC No</label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    placeholder="1234567890"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Account Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Hesap Türü</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: "musteri" })}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      formData.accountType !== "gider"
                        ? "bg-amber-500 text-stone-950 font-black"
                        : "bg-stone-800 text-stone-400 border border-stone-700"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Müşteri / Cari
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: "gider" })}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      formData.accountType === "gider"
                        ? "bg-rose-500 text-white font-black"
                        : "bg-stone-800 text-stone-400 border border-stone-700"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Gider / Tedarikçi
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Notlar</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Müşteriyle ilgili operasyonel notlar..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-stone-400">
                Bu müşteriye özel toptan satış fiyatı tanımlayabilirsiniz. Fiş keserken bu fiyatlar otomatik gelecektir. Boş bırakılan ürünlerde standart liste fiyatı uygulanır.
              </div>

              <div className="divide-y divide-stone-800 max-h-[45vh] overflow-y-auto pr-1">
                {allProducts.map((p) => {
                  const currentCustomPrice = customPrices[p.id];
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-stone-200 truncate">{p.name}</div>
                        <div className="text-xs text-stone-500">
                          Standart Fiyat: <span className="font-mono text-stone-400">{p.price} ₺</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 w-32">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder={String(p.price)}
                          value={currentCustomPrice !== undefined ? currentCustomPrice : ""}
                          onChange={(e) => handlePriceChange(p.id, e.target.value)}
                          className={`w-full bg-stone-950 border rounded-xl px-3 py-2 text-sm text-right font-mono focus:outline-none transition-colors ${
                            currentCustomPrice !== undefined
                              ? "border-amber-500 text-amber-400 font-bold"
                              : "border-stone-800 text-stone-300"
                          }`}
                        />
                        <span className="text-xs text-stone-500 font-bold">₺</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm font-bold transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-sm font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
