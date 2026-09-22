"use client";

import React, { useState } from "react";
import { X, Edit, Loader2 } from "lucide-react";
import { useCariler } from "@/hooks/useCariler";
import { CariAccount } from "@/types/admin";

interface CariEditModalProps {
  cari: CariAccount;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CariEditModal({ cari, onClose, onSuccess }: CariEditModalProps) {
  const { updateCari } = useCariler();
  
  const [formData, setFormData] = useState({
    businessName: cari.businessName || "",
    contactPerson: cari.contactPerson || "",
    phone: cari.phone || "",
    address: cari.address || "",
    taxOffice: cari.taxOffice || "",
    taxNumber: cari.taxNumber || "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName) {
      setError("Müşteri adı zorunludur.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await updateCari(cari.id, formData);
      if (!res.success) {
        throw new Error(res.error || "Müşteri güncellenemedi.");
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-stone-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative border border-stone-800 animate-slideUp">
        <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 font-serif">Müşteri Bilgilerini Düzenle</h3>
              <p className="text-[10px] text-stone-400">{cari.businessName}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Firma / Müşteri Adı *</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Yetkili Kişi</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Telefon</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Vergi Dairesi</label>
                <input
                  type="text"
                  value={formData.taxOffice}
                  onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Vergi Numarası</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Tam Adres</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-blue-500 transition-colors min-h-[80px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-blue-950 font-black rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Bilgileri Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
