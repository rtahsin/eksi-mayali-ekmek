"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Tag, FileText, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { useCariProfile } from "@/hooks/useCariProfile";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { CariTransaction, AdminOrder } from "@/types/admin";
import { OrderItem } from "@/types";

// Extracted Components
import { CariHeaderCard } from "@/components/admin/cariler/CariHeaderCard";
import { CariTransactionHistory } from "@/components/admin/cariler/CariTransactionHistory";
import { QuickSlipModal } from "@/components/admin/cariler/QuickSlipModal";
import { CariCollectionModal } from "@/components/admin/cariler/CariCollectionModal";
import { CariBalanceAdjustModal } from "@/components/admin/cariler/CariBalanceAdjustModal";
import { CariCustomPricesModal } from "@/components/admin/cariler/CariCustomPricesModal";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal"; // Existing global modal

export default function CariDetailPage() {
  const router = useRouter();
  const params = useParams();
  const cariId = params.id as string;

  const { cari, transactions, activeProducts, loading, error, refetch } = useCariProfile(cariId);

  // Tab State
  const [activeTab, setActiveTab] = useState<"hareketler" | "fiyatlar">("hareketler");

  // Modal States
  const [quickSlipOpen, setQuickSlipOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [balanceAdjustOpen, setBalanceAdjustOpen] = useState(false);
  const [customPriceOpen, setCustomPriceOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);

  // Modal Context Data
  const [activeSlipOrder, setActiveSlipOrder] = useState<AdminOrder | null>(null);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState("");
  const [initialCustomPrice, setInitialCustomPrice] = useState<number | undefined>(undefined);

  // Global scroll lock for all modals
  useModalScrollLock([quickSlipOpen, collectionOpen, balanceAdjustOpen, customPriceOpen, slipModalOpen]);

  // Handlers
  const handleWhatsAppStatement = () => {
    if (!cari) return;
    const cleanPhone = cari.phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("90") ? cleanPhone : cleanPhone.startsWith("0") ? `9${cleanPhone}` : `90${cleanPhone}`;
    const statementUrl = `https://ekmeklab.tr/ekstre/${cari.id}`;
    const text = [
      `🍞 *EKMEKLAB TAŞ FIRIN - CARİ HESAP EKSTRESİ*`,
      `Sayın *${cari.businessName}*,`,
      ``,
      `📊 *Güncel Kalan Bakiye:* ${cari.balance.toLocaleString("tr-TR")} ₺`,
      `📅 *Tarih:* ${new Date().toLocaleDateString("tr-TR")}`,
      ``,
      `🔗 *Canlı Ekstre & Teslimat Dökümünüz:*`,
      statementUrl,
    ].join("\n");
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDeleteTransaction = async (tx: CariTransaction) => {
    if (!cari) return;
    if (!confirm(`Bu işlemi silmek storno (ters kayıt) oluşturacaktır. Onaylıyor musunuz?\n\nİşlem: ${tx.description}\nTutar: ${tx.amount} ₺`)) return;

    try {
      const supabase = createClient();
      if (!supabase) return;
      const reverseAmount = -tx.amount;
      const { data: res, error: rpcError } = await supabase.rpc("adjust_cari_balance", {
        p_account_id: cari.id,
        p_amount: reverseAmount,
        p_type: "storno",
        p_description: `İPTAL STORNO: ${tx.description} (İşlem No: ${tx.id.substring(0, 8)})`,
        p_related_order_id: tx.relatedOrderId,
      });
      if (rpcError || !res?.success) throw new Error(rpcError?.message || res?.error || "Storno hatası");
      alert("İşlem başarıyla iptal edildi (Ters Kayıt oluşturuldu).");
    } catch (err: any) {
      alert("Hata: " + err.message);
    }
  };

  const handleOpenCustomPrice = (prodId = "", price?: number) => {
    setSelectedProductForPrice(prodId);
    setInitialCustomPrice(price);
    setCustomPriceOpen(true);
  };

  const handleDeleteCustomPrice = async (prodId: string) => {
    if (!cari) return;
    if (!confirm("Bu ürüne ait özel fiyatı kaldırmak istediğinize emin misiniz?")) return;
    try {
      const supabase = createClient();
      if (!supabase) return;
      const newPrices = { ...cari.customPrices };
      delete newPrices[prodId];
      const { error } = await supabase.from("current_accounts").update({ custom_prices: newPrices }).eq("id", cari.id);
      if (error) throw error;
      refetch();
    } catch (err: any) {
      alert("Hata: " + err.message);
    }
  };

  const handleViewSlip = (tx: CariTransaction) => {
    if (!cari) return;
    const desc = tx.description || "";
    const items: OrderItem[] = [{
      productId: "custom",
      productName: desc.replace(/^Fiş:\s*/i, "") || "Toptan Ekmek Teslimatı",
      quantity: 1,
      unitPrice: tx.amount,
      totalPrice: tx.amount,
    }];
    const slipOrder: AdminOrder = {
      id: tx.id || `tx_${Date.now()}`,
      orderNumber: (tx.id || "").substring(0, 6).toUpperCase() || "CARİ",
      customerName: cari.businessName,
      phone: cari.phone,
      deliveryAddress: cari.address || "",
      neighborhood: cari.neighborhood || "Beylikdüzü",
      deliveryMethod: "courier",
      deliveryDate: new Date(tx.createdAt).toISOString().split("T")[0],
      deliveryTimeWindow: "14:00 - 18:00",
      items,
      subtotal: tx.amount,
      shippingFee: 0,
      totalAmount: tx.amount,
      status: "teslim_edildi",
      paymentMethod: "cari",
      paymentStatus: tx.type === "tahsilat" ? "paid" : "pending",
      source: "web",
      cariId: cari.id,
      createdAt: tx.createdAt,
    };
    setActiveSlipOrder(slipOrder);
    setSlipModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-stone-500 flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (error || !cari) return <div className="p-8 text-center text-rose-500 bg-rose-500/10 rounded-xl">{error || "Cari bulunamadı."}</div>;

  const customPricesList = Object.entries(cari.customPrices || {});

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header Navigation */}
      <div className="flex items-center gap-3 text-stone-400">
        <button onClick={() => router.push("/admin/cariler")} className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-sm font-semibold">Cari Hesaplar / {cari.businessName}</div>
      </div>

      <CariHeaderCard cari={cari} onSendWhatsApp={handleWhatsAppStatement} />

      {/* Tabs */}
      <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("hareketler")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${
            activeTab === "hareketler" ? "bg-stone-800 text-stone-100 shadow" : "text-stone-400 hover:text-stone-300"
          }`}
        >
          <FileText className="w-4 h-4" /> Cari Hareketler
        </button>
        <button
          onClick={() => setActiveTab("fiyatlar")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${
            activeTab === "fiyatlar" ? "bg-stone-800 text-stone-100 shadow" : "text-stone-400 hover:text-stone-300"
          }`}
        >
          <Tag className="w-4 h-4" /> Özel Anlaşmalı Fiyatlar
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "hareketler" && (
        <CariTransactionHistory
          cari={cari}
          transactions={transactions}
          onOpenQuickSlip={() => setQuickSlipOpen(true)}
          onOpenCollection={() => setCollectionOpen(true)}
          onOpenBalanceAdjust={() => setBalanceAdjustOpen(true)}
          onViewTransactionSlip={handleViewSlip}
          onDeleteTransaction={handleDeleteTransaction}
        />
      )}

      {activeTab === "fiyatlar" && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-stone-100 font-serif">Özel Fiyat Tarifesi</h3>
              <p className="text-xs text-stone-400 mt-0.5">Fiş kesildiğinde otomatik olarak uygulanan toptan birim fiyatlar.</p>
            </div>
            <button
              onClick={() => handleOpenCustomPrice()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors shrink-0"
            >
              <Tag className="w-4 h-4" /> Yeni Fiyat Ekle
            </button>
          </div>
          {customPricesList.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs bg-stone-950/40 rounded-xl border border-stone-800">
              Bu firmaya tanımlanmış özel toptan fiyat bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customPricesList.map(([prodId, customPrice]) => {
                const product = activeProducts.find((p) => p.id === prodId);
                const retailPrice = product?.price || 0;
                return (
                  <div key={prodId} className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex items-center justify-between group hover:border-stone-700 transition-colors">
                    <div>
                      <div className="text-xs font-bold text-stone-200">{product ? product.name : prodId}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">Standart: <span className="line-through">{retailPrice} ₺</span></div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-base font-bold text-amber-400 font-serif">{customPrice} ₺</div>
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenCustomPrice(prodId, customPrice)} className="p-1 rounded text-stone-400 hover:text-amber-400 bg-stone-800">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteCustomPrice(prodId)} className="p-1 rounded text-stone-400 hover:text-rose-400 bg-stone-800">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <QuickSlipModal
        isOpen={quickSlipOpen}
        onClose={() => setQuickSlipOpen(false)}
        cari={cari}
        activeProducts={activeProducts}
        onSuccess={() => { setQuickSlipOpen(false); refetch(); }}
      />
      <CariCollectionModal
        isOpen={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        cari={cari}
        onSuccess={() => { setCollectionOpen(false); refetch(); }}
      />
      <CariBalanceAdjustModal
        isOpen={balanceAdjustOpen}
        onClose={() => setBalanceAdjustOpen(false)}
        cari={cari}
        onSuccess={() => { setBalanceAdjustOpen(false); refetch(); }}
      />
      <CariCustomPricesModal
        isOpen={customPriceOpen}
        onClose={() => setCustomPriceOpen(false)}
        cari={cari}
        activeProducts={activeProducts}
        initialProductId={selectedProductForPrice}
        initialPrice={initialCustomPrice}
        onSuccess={() => { setCustomPriceOpen(false); refetch(); }}
      />
      
      {/* Existing Digital Fiş Modal */}
      {slipModalOpen && activeSlipOrder && (
        <OrderSlipModal
          isOpen={slipModalOpen}
          onClose={() => setSlipModalOpen(false)}
          order={activeSlipOrder}
        />
      )}
    </div>
  );
}
