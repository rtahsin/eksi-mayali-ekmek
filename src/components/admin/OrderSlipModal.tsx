"use client";

import React, { useState, useMemo, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { AdminOrder, CariAccount } from "@/types/admin";
import { useCariler, getShareUrl } from "@/hooks/useCariler";
import {
  X,
  Check,
  Building2,
  MessageCircle,
  Copy,
  Printer,
  TrendingUp,
  ExternalLink,
  Link2,
} from "lucide-react";
import { istanbulToday } from "@/lib/time/istanbul";
import { CONTACT, SITE_URL } from "@/lib/site";

interface OrderSlipModalProps {
  order: AdminOrder;
  isOpen: boolean;
  onClose: () => void;
  // Optional pre-selected Cari
  cari?: CariAccount | null;
}

export function OrderSlipModal({ order, isOpen, onClose, cari: propCari }: OrderSlipModalProps) {
  const { cariler, addTransaction } = useCariler();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const cariSelectId = useId();
  const paymentInputId = useId();
  const paymentMethodId = useId();

  // Find linked Cari account
  const matchedCari = useMemo(() => {
    if (propCari) return propCari;
    if (order.cariId) {
      return cariler.find((c) => c.id === order.cariId) || null;
    }
    const cleanOrderPhone = order.phone.replace(/\D/g, "");
    if (cleanOrderPhone.length >= 10) {
      const byPhone = cariler.find((c) =>
        c.phone.replace(/\D/g, "").includes(cleanOrderPhone)
      );
      if (byPhone) return byPhone;
    }
    const byName = cariler.find(
      (c) => c.businessName.toLowerCase() === order.customerName.toLowerCase()
    );
    return byName || null;
  }, [propCari, order, cariler]);

  const [selectedCariId, setSelectedCariId] = useState<string>(
    matchedCari?.id || order.cariId || ""
  );

  const activeCari = useMemo(() => {
    return cariler.find((c) => c.id === selectedCariId) || matchedCari;
  }, [selectedCariId, cariler, matchedCari]);

  const [collectedPayment, setCollectedPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"nakit" | "banka_havale" | "pos">("nakit");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Müşteriye giden fiş linki imzalı (sipariş takip token'ı); imzasız /fis linki veri göstermez
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setPaymentError(null);
    getShareUrl({ orderId: order.id }).then((u) => {
      if (alive) setPublicUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [isOpen, order.id]);

  // Native <dialog> senkronizasyonu
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Cari borcu veritabanına YALNIZCA sipariş 'teslim_edildi' olduğunda yazılır (AGENTS.md §6).
  const isOrderAlreadyInBalance =
    order.status === "teslim_edildi" && Boolean(order.cariId || order.paymentMethod === "cari");

  const previousBalance = useMemo(() => {
    if (!activeCari) return 0;
    if (isOrderAlreadyInBalance) {
      return activeCari.balance - order.totalAmount;
    }
    return activeCari.balance;
  }, [activeCari, isOrderAlreadyInBalance, order.totalAmount]);

  const thisOrderTotal = order.totalAmount;
  const currentTotalDebt = previousBalance + thisOrderTotal;
  const finalBalance = currentTotalDebt - (collectedPayment || 0);

  // Build formatted text for WhatsApp and Clipboard
  const generateSlipText = () => {
    const lines: string[] = [];
    lines.push(`🍞 *EKMEKLAB TAŞ FIRIN - TESLİMAT & HESAP FİŞİ*`);
    lines.push(`📅 *Tarih:* ${order.deliveryDate || istanbulToday()} (${order.deliveryTimeWindow || "14:00 - 18:00"})`);
    lines.push(`🏢 *Firma / Müşteri:* ${activeCari?.businessName || order.customerName}`);
    if (activeCari?.taxNumber) {
      lines.push(`🏛️ *Vergi No:* ${activeCari.taxNumber}`);
    }
    lines.push(`📍 *Teslimat:* ${order.neighborhood || "Beylikdüzü"} - ${order.deliveryAddress}`);
    lines.push(``);
    lines.push(`📦 *TESLİM EDİLEN ÜRÜNLER:*`);

    order.items.forEach((it) => {
      lines.push(`• ${it.quantity}x ${it.productName}: ${it.totalPrice} ₺ (${it.unitPrice} ₺/ad)`);
    });

    lines.push(`──────────────────────`);
    lines.push(`*Bu Teslimat Tutarı:* ${thisOrderTotal} ₺`);

    if (activeCari) {
      lines.push(``);
      lines.push(`📊 *CARİ HESAP DURUMU:*`);
      lines.push(`• Önceki Bakiye: ${previousBalance.toLocaleString("tr-TR")} ₺`);
      lines.push(`• Bu Teslimat: +${thisOrderTotal.toLocaleString("tr-TR")} ₺`);
      if (collectedPayment > 0) {
        lines.push(
          `• Yapılan Ödeme: -${collectedPayment.toLocaleString("tr-TR")} ₺ (${paymentMethod === "nakit" ? "Nakit" : paymentMethod === "banka_havale" ? "Havale" : "POS"})`
        );
      }
      lines.push(`──────────────────────`);
      lines.push(`💰 *GÜNCEL KALAN BAKİYE: ${finalBalance.toLocaleString("tr-TR")} ₺*`);
    }

    if (publicUrl) {
      lines.push(``);
      lines.push(`🔗 *DİJİTAL FİŞ LİNKİNİZ:*`);
      lines.push(publicUrl);
    }
    lines.push(``);
    lines.push(`Afiyet olsun! EkmekLab Zanaatkar Fırın`);
    lines.push(`İletişim: ${CONTACT.phoneDisplay} • ${SITE_URL.replace(/^https?:\/\//, "")}`);

    return lines.join("\n");
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  const handleSendWhatsApp = () => {
    const rawPhone = activeCari?.phone || order.phone;
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("90")
      ? cleanPhone
      : cleanPhone.startsWith("0")
        ? `9${cleanPhone}`
        : `90${cleanPhone}`;

    const text = generateSlipText();
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateSlipText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  const handleRecordPayment = async () => {
    if (!activeCari || collectedPayment <= 0) return;
    setIsRecordingPayment(true);
    setPaymentError(null);
    try {
      const res = await addTransaction(activeCari.id, {
        kind: "tahsilat",
        amount: Number(collectedPayment),
        description: `Teslimatta Tahsilat - Sipariş #${order.orderNumber || order.id.substring(0, 6)}`,
        paymentMethod,
        orderId: order.id,
      });
      if (res.success) {
        setPaymentRecorded(true);
      } else {
        setPaymentError("Tahsilat işlenirken hata: " + (res.error || "Bilinmeyen hata"));
      }
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const isPointerOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  const printPortal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            id="ekmeklab-order-slip-print"
            className="hidden print:block bg-white text-black p-6 overflow-visible"
          >
            <style>{`
              @media print {
                @page { margin: 12mm; }
                body > *:not(#ekmeklab-order-slip-print) { display: none !important; }
                #ekmeklab-order-slip-print {
                  display: block !important;
                  background: #ffffff !important;
                  color: #111827 !important;
                  overflow: visible !important;
                }
              }
            `}</style>
            <div className="max-w-2xl mx-auto border border-stone-300 rounded-xl p-6 space-y-5 overflow-visible">
              <div className="flex items-start justify-between border-b border-stone-300 pb-4 overflow-visible">
                <div>
                  <h1 className="font-serif text-xl font-bold text-[#3B1E1A] leading-normal pb-1">
                    EkmekLab — Teslimat &amp; Hesap Fişi
                  </h1>
                  <p className="text-xs text-stone-700 font-mono tabular-nums leading-normal pb-1">
                    Sipariş #{order.orderNumber || order.id.substring(0, 6)} • {order.deliveryDate || istanbulToday()}
                  </p>
                </div>
                <div className="text-right text-xs text-stone-700 leading-normal pb-1">
                  <p className="font-semibold text-black">{activeCari?.businessName || order.customerName}</p>
                  <p className="font-mono tabular-nums">{activeCari?.phone || order.phone}</p>
                  {activeCari?.taxNumber && <p className="font-mono tabular-nums">VN: {activeCari.taxNumber}</p>}
                </div>
              </div>

              <div className="text-xs text-stone-800 leading-normal pb-1">
                <span className="font-semibold">Teslimat Adresi:</span>{" "}
                {order.neighborhood ? `${order.neighborhood} — ` : ""}
                {order.deliveryAddress}
              </div>

              <table className="w-full text-xs border-collapse overflow-visible">
                <thead>
                  <tr className="border-b border-stone-400 text-left text-stone-700">
                    <th className="py-2 pr-2 font-semibold">Ürün</th>
                    <th className="py-2 px-2 text-right font-semibold">Adet</th>
                    <th className="py-2 px-2 text-right font-semibold">Birim</th>
                    <th className="py-2 pl-2 text-right font-semibold">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {order.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-2 font-medium text-black leading-normal pb-1">{it.productName}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums leading-normal pb-1">{it.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums leading-normal pb-1">{it.unitPrice} ₺</td>
                      <td className="py-2 pl-2 text-right font-mono tabular-nums font-bold text-black leading-normal pb-1">
                        {it.totalPrice} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-stone-300 pt-3 flex items-center justify-between text-sm font-bold text-black overflow-visible">
                <span className="leading-normal pb-1">Bu Teslimat Tutarı</span>
                <span className="font-mono tabular-nums leading-normal pb-1">{thisOrderTotal.toLocaleString("tr-TR")} ₺</span>
              </div>

              {activeCari && (
                <div className="grid grid-cols-4 gap-3 pt-2 border-t border-stone-300 text-xs overflow-visible">
                  <div className="p-2 border border-stone-300 rounded-lg overflow-visible">
                    <div className="text-stone-600 leading-normal">Önceki Bakiye</div>
                    <div className="font-mono tabular-nums font-bold text-black mt-0.5 leading-normal pb-1">
                      {previousBalance.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                  <div className="p-2 border border-stone-300 rounded-lg overflow-visible">
                    <div className="text-stone-600 leading-normal">(+) Bu Fiş</div>
                    <div className="font-mono tabular-nums font-bold text-black mt-0.5 leading-normal pb-1">
                      +{thisOrderTotal.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                  <div className="p-2 border border-stone-300 rounded-lg overflow-visible">
                    <div className="text-stone-600 leading-normal">(-) Tahsilat</div>
                    <div className="font-mono tabular-nums font-bold text-black mt-0.5 leading-normal pb-1">
                      -{(collectedPayment || 0).toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                  <div className="p-2 border-2 border-stone-800 rounded-lg overflow-visible">
                    <div className="text-black font-semibold leading-normal">(=) Kalan Borç</div>
                    <div className="font-mono tabular-nums font-bold text-black mt-0.5 leading-normal pb-1">
                      {finalBalance.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby="slip-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        onPointerDown={(e) => {
          pointerDownOutsideRef.current = isPointerOutsideDialog(e);
        }}
        onPointerUp={(e) => {
          if (pointerDownOutsideRef.current && isPointerOutsideDialog(e)) {
            onClose();
          }
          pointerDownOutsideRef.current = false;
        }}
        className="m-auto w-[calc(100%-1.5rem)] max-w-xl max-h-[90dvh] rounded-2xl sm:rounded-3xl bg-white border border-[#E2D3BD] text-[#3B1E1A] p-0 shadow-2xl overflow-hidden backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-[2px] backdrop:overflow-hidden backdrop:overscroll-contain print:hidden"
      >
        {isOpen && (
          <div className="flex flex-col max-h-[90dvh]">
            {/* Top Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E2D3BD] bg-[#FBF6EC] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] flex items-center justify-center text-[#8E3D1B]">
                  <Building2 className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="slip-dialog-title" className="font-serif font-bold text-[#3B1E1A] text-sm sm:text-base">
                    Dijital Teslimat &amp; Hesap Fişi
                  </h3>
                  <p className="text-xs text-[#6E5148] font-mono tabular-nums">
                    Sipariş #{order.orderNumber || order.id.substring(0, 6)} • {order.deliveryDate}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Kapat"
                onClick={onClose}
                className="p-2 text-[#6E5148] hover:text-[#3B1E1A] rounded-xl hover:bg-[#F1E6D2] transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain">
              {/* Customer / Corporate Account Selector */}
              <div className="bg-[#FBF6EC] border border-[#E2D3BD] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={cariSelectId} className="text-xs font-semibold text-[#3B1E1A]">
                    Kurumsal Cari Hesabı
                  </label>
                  {activeCari && (
                    <span className="text-xs text-[#1D5130] bg-[#E5EFE7] border border-[#B4D3BC] px-2.5 py-0.5 rounded-full font-semibold">
                      Cari Eşleşti
                    </span>
                  )}
                </div>

                <select
                  id={cariSelectId}
                  value={selectedCariId}
                  onChange={(e) => setSelectedCariId(e.target.value)}
                  className="w-full bg-white border border-[#E2D3BD] rounded-xl px-3 py-2 text-xs font-semibold text-[#3B1E1A] focus:outline-none focus:border-[#B4532A]"
                >
                  <option value="">— Bireysel / Cari Bağlantısız ({order.customerName}) —</option>
                  {cariler.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} (Güncel Borç: {c.balance.toLocaleString("tr-TR")} ₺)
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6E5148] pt-0.5">
                  <span className="text-[#3B1E1A] font-semibold">
                    {activeCari ? activeCari.businessName : order.customerName}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span className="font-mono tabular-nums text-[#3B1E1A]">{activeCari?.phone || order.phone}</span>
                  {activeCari?.taxNumber && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span className="font-mono tabular-nums text-[#8E3D1B]">VN: {activeCari.taxNumber}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Delivered Products Card */}
              <div className="bg-white border border-[#E2D3BD] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2D3BD] pb-2">
                  <span className="text-xs font-bold text-[#6E5148] uppercase tracking-wider">
                    Teslim Edilen Ürünler
                  </span>
                  <span className="text-xs font-bold text-[#8E3D1B] font-mono tabular-nums">
                    {order.items.length} Kalem
                  </span>
                </div>

                <div className="space-y-2 divide-y divide-[#E2D3BD]/70">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-medium text-[#3B1E1A]">
                          <span className="font-bold text-[#8E3D1B] font-mono tabular-nums">{it.quantity}x</span>{" "}
                          {it.productName}
                        </div>
                        <div className="text-xs text-[#6E5148] font-mono tabular-nums">
                          Birim: {it.unitPrice} ₺
                        </div>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-[#3B1E1A] text-sm">
                        {it.totalPrice} ₺
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#E2D3BD] flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#6E5148]">Bu Fiş Tutarı:</span>
                  <span className="font-mono tabular-nums font-bold text-[#8E3D1B] text-base">
                    {thisOrderTotal.toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              </div>

              {/* Cari Balance & Payment Calculation Card */}
              {activeCari ? (
                <div className="bg-[#FBF6EC] border border-[#E2D3BD] rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E2D3BD] pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                      <span className="text-xs font-bold text-[#3B1E1A] uppercase tracking-wider">
                        Cari Hesap Bakiye Tablosu
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[#6E5148] truncate max-w-[160px]">
                      {activeCari.businessName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 rounded-xl bg-white border border-[#E2D3BD]">
                      <div className="text-xs text-[#6E5148] font-medium">Önceki Bakiye</div>
                      <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#3B1E1A] mt-1 pb-0.5">
                        {previousBalance.toLocaleString("tr-TR")} ₺
                      </div>
                      <div className="text-[11px] text-[#6E5148]">Eski Borç</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F3E2D4]/65 border border-[#DFB99F]">
                      <div className="text-xs text-[#8E3D1B] font-medium">(+) Bu Fiş Tutarı</div>
                      <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#8E3D1B] mt-1 pb-0.5">
                        +{thisOrderTotal.toLocaleString("tr-TR")} ₺
                      </div>
                      <div className="text-[11px] text-[#8E3D1B]">
                        {order.status === "teslim_edildi" ? "Teslim Edildi" : "Teslimde İşlenecek"}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC]">
                      <div className="text-xs text-[#1D5130] font-medium">(-) Alınan Ödeme</div>
                      <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#1D5130] mt-1 pb-0.5">
                        -{(collectedPayment || 0).toLocaleString("tr-TR")} ₺
                      </div>
                      <div className="text-[11px] text-[#1D5130]">Tahsilat</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border-2 border-[#B4532A]/45">
                      <div className="text-xs text-[#3B1E1A] font-bold">(=) Yeni Bakiye</div>
                      <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#8E3D1B] mt-1 pb-0.5">
                        {finalBalance.toLocaleString("tr-TR")} ₺
                      </div>
                      <div className="text-[11px] text-[#8E3D1B] font-semibold">Kalan Son Borç</div>
                    </div>
                  </div>

                  {/* Editable Payment Input */}
                  <div className="p-3 bg-white rounded-xl border border-[#E2D3BD] space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <label htmlFor={paymentInputId} className="block text-xs font-semibold text-[#3B1E1A]">
                          Bu Teslimatta Tahsilat Alındı mı?
                        </label>
                        <div className="text-xs text-[#6E5148]">
                          Elden nakit veya havale aldıysanız tutarı girin:
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id={paymentInputId}
                          type="number"
                          min={0}
                          placeholder="0 ₺"
                          value={collectedPayment || ""}
                          onChange={(e) => {
                            setCollectedPayment(Number(e.target.value));
                            setPaymentRecorded(false);
                            setPaymentError(null);
                          }}
                          className="w-28 bg-[#FBF6EC] border border-[#E2D3BD] rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono tabular-nums text-[#1D5130] focus:outline-none focus:border-[#1D5130] text-right"
                        />

                        <select
                          id={paymentMethodId}
                          aria-label="Tahsilat ödeme şekli"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as "nakit" | "banka_havale" | "pos")}
                          className="bg-[#FBF6EC] border border-[#E2D3BD] rounded-lg px-2 py-1.5 text-xs font-medium text-[#3B1E1A] focus:outline-none focus:border-[#B4532A]"
                        >
                          <option value="nakit">Nakit</option>
                          <option value="banka_havale">Havale</option>
                          <option value="pos">POS/Kart</option>
                        </select>

                        {collectedPayment > 0 && !paymentRecorded && (
                          <button
                            type="button"
                            onClick={handleRecordPayment}
                            disabled={isRecordingPayment}
                            className="px-3 py-1.5 bg-[#1D5130] hover:bg-[#163F25] text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{isRecordingPayment ? "..." : "İşle"}</span>
                          </button>
                        )}

                        {paymentRecorded && (
                          <span className="text-xs text-[#1D5130] font-bold flex items-center gap-1 shrink-0">
                            <Check className="w-4 h-4" aria-hidden="true" /> İşlendi
                          </span>
                        )}
                      </div>
                    </div>

                    {paymentError && (
                      <p role="alert" className="text-xs font-medium text-[#7D2114] bg-[#FCECE9] border border-[#E7B7AF] rounded-lg px-2.5 py-1.5">
                        {paymentError}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#FBF6EC] rounded-2xl border border-[#E2D3BD] text-center text-xs text-[#6E5148]">
                  Bu sipariş bir kurumsal cariye bağlı değil. Cari bakiye takibi için yukarıdan bir cari seçebilirsiniz.
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 sm:p-5 border-t border-[#E2D3BD] bg-[#FBF6EC] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-[#F1E6D2] text-[#3B1E1A] rounded-xl text-xs font-semibold border border-[#E2D3BD] transition-colors"
                  title="Müşteriye gönderilecek canlı dijital fiş linkini kopyala"
                >
                  {linkCopied ? (
                    <Check className="w-4 h-4 text-[#1D5130]" aria-hidden="true" />
                  ) : (
                    <Link2 className="w-4 h-4 text-[#8E3D1B]" aria-hidden="true" />
                  )}
                  <span>{linkCopied ? "Link Kopyalandı!" : "Fiş Linkini Kopyala"}</span>
                </button>

                <a
                  href={publicUrl || `/fis/${order.id}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Müşteri Görünümünü Yeni Sekmede Aç"
                  className="p-2.5 bg-white hover:bg-[#F1E6D2] text-[#3B1E1A] rounded-xl text-xs border border-[#E2D3BD] transition-colors flex items-center justify-center"
                  title="Müşteri Görünümünü Yeni Sekmede Aç"
                >
                  <ExternalLink className="w-4 h-4 text-[#6E5148]" aria-hidden="true" />
                </a>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-[#F1E6D2] text-[#3B1E1A] rounded-xl text-xs font-semibold border border-[#E2D3BD] transition-colors"
                  title="Metin olarak kopyala"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#1D5130]" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#6E5148]" aria-hidden="true" />
                  )}
                  <span>{copied ? "Kopyalandı" : "Metin"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  aria-label="Fişi Yazdır veya PDF Kaydet"
                  className="p-2.5 bg-white hover:bg-[#F1E6D2] text-[#3B1E1A] rounded-xl text-xs border border-[#E2D3BD] transition-colors"
                  title="İsteğe Bağlı Yazdır / PDF"
                >
                  <Printer className="w-4 h-4 text-[#8E3D1B]" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1D7A46] hover:bg-[#166037] text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>WhatsApp ile Müşteriye Gönder</span>
              </button>
            </div>
          </div>
        )}
      </dialog>
      {printPortal}
    </>
  );
}
