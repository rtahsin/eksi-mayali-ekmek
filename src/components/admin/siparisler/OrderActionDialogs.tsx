"use client";

import React, { useEffect, useState } from "react";
import { Check, ChevronRight, Loader2, X, XCircle } from "lucide-react";
import type { AdminOrder } from "@/types/admin";
import { DELIVERY_PAYMENT_LABELS, defaultDeliveryPayment, type DeliveryPayment } from "@/lib/orders/delivery";
import { orderMessage, ORDER_MESSAGE_LABELS, type OrderMessage } from "@/lib/orders/adminFlow";
import { relativeTrDate } from "@/lib/time/istanbul";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { useStoreSettings } from "@/hooks/useStoreSettings";

type Result = { success: boolean; error?: string };

function Sheet({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-[#18130F] border border-[#2A201A] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif font-bold text-base">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Kapat" className="w-10 h-10 rounded-xl text-stone-400 hover:bg-[#261E17] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Teslim et: ödeme nasıl alındı? Cari siparişte varsayılan "cariye yaz". */
export function DeliverDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: AdminOrder;
  onClose: () => void;
  onConfirm: (payment: DeliveryPayment) => Promise<Result>;
}) {
  const isCari = Boolean(order.cariId) || order.paymentMethod === "cari";
  // Ödeme önceden kaydedildiyse tekrar sorulmaz: cari siparişte ikinci tahsilat yazılmasın,
  // diğerlerinde mevcut ödeme satırı yeterli (mark_order_delivered yenisini eklemez).
  const alreadyPaid = order.paymentStatus === "paid";
  const [payment, setPayment] = useState<DeliveryPayment>(defaultDeliveryPayment(order.paymentMethod, isCari));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: DeliveryPayment[] = isCari ? ["unpaid", "cash", "pos", "transfer"] : ["cash", "pos", "transfer", "unpaid"];
  const label = (p: DeliveryPayment) => (p === "unpaid" ? (isCari ? "Cariye yaz (ödeme alınmadı)" : "Ödenmedi, sonra alınacak") : DELIVERY_PAYMENT_LABELS[p]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const res = await onConfirm(alreadyPaid ? (isCari ? "unpaid" : "cash") : payment);
    setBusy(false);
    if (res.success) onClose();
    else setError(res.error || "Teslim kaydedilemedi");
  };

  return (
    <Sheet title={`Teslim et · ${order.totalAmount.toLocaleString("tr-TR")} ₺`} onClose={onClose}>
      {alreadyPaid ? (
        <p className="text-sm text-emerald-300">{order.customerName} · ödemesi önceden alındı.</p>
      ) : (
        <>
      <p className="text-xs text-stone-400">{order.customerName} · ödeme nasıl alındı?</p>
      <div className="space-y-2" role="radiogroup" aria-label="Ödeme">
        {options.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={payment === p}
            onClick={() => setPayment(p)}
            className={`w-full h-12 px-4 rounded-xl border text-sm text-left flex items-center justify-between ${
              payment === p ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-200 font-bold" : "bg-[#120E0B] border-[#261E17] text-stone-300"
            }`}
          >
            {label(p)}
            {payment === p && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
      {isCari && payment !== "unpaid" && (
        <p className="text-xs text-stone-400">Teslimat fişi cariye yazılır, alınan ödeme aynı anda tahsilat olarak düşülür.</p>
      )}
        </>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy}
        className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Teslim edildi
      </button>
    </Sheet>
  );
}

/** İptal: sebep isteğe bağlı; cari hareketleri storno ile geri alınır. */
export function CancelDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: AdminOrder;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<Result>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const res = await onConfirm(reason.trim() || "Fırın iptal etti");
    setBusy(false);
    if (res.success) onClose();
    else setError(res.error || "İptal edilemedi");
  };

  return (
    <Sheet
      title={
        <span className="flex items-center gap-2 text-rose-300">
          <XCircle className="w-5 h-5" /> Sipariş iptal edilsin mi?
        </span>
      }
      onClose={onClose}
    >
      <p className="text-xs text-stone-400">
        #{order.orderNumber || order.id.slice(0, 6)} · {order.customerName} · {order.totalAmount.toLocaleString("tr-TR")} ₺. Geri alınamaz.
        {order.cariId ? " Cariye yazılmış hareket varsa ters kayıtla geri alınır." : ""}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 300))}
        placeholder="Sebep (isteğe bağlı), ör. müşteri vazgeçti"
        rows={2}
        className="w-full px-3 py-2 rounded-xl bg-[#120E0B] border border-[#261E17] text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-rose-400"
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="flex-1 h-12 rounded-xl bg-[#261E17] text-sm font-medium">
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy}
          className="flex-1 h-12 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} İptal et
        </button>
      </div>
    </Sheet>
  );
}

/** Müşteriye hazır WhatsApp mesajları (gel-al siparişinde "yola çıktı" yerine "hazır"). */
export function MessageDialog({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const { settings } = useStoreSettings();
  const pickup = order.deliveryMethod === "pickup";
  const messages: OrderMessage[] = pickup ? ["alindi", "hazir", "teslim"] : ["alindi", "yolda", "teslim"];
  const phone = toWhatsAppNumber(order.phone);
  const href = (type: OrderMessage) =>
    whatsappLink(
      orderMessage(type, order, {
        window: settings.deliveryWindow,
        dateLabel: relativeTrDate(order.deliveryDate),
        trackingUrl: trackingUrl(order.orderNumber || order.id),
      }),
      phone
    );

  return (
    <Sheet title={`${order.customerName} · WhatsApp`} onClose={onClose}>
      <div className="space-y-2">
        {messages.map((m) => (
          <a
            key={m}
            href={href(m)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full h-12 px-4 rounded-xl bg-[#120E0B] border border-[#261E17] text-sm text-stone-200 flex items-center justify-between hover:border-emerald-500/50"
          >
            {ORDER_MESSAGE_LABELS[m]}
            <ChevronRight className="w-4 h-4 text-stone-500" />
          </a>
        ))}
      </div>
      <a href={whatsappLink(undefined, phone)} target="_blank" rel="noopener noreferrer" onClick={onClose} className="block text-center text-xs text-stone-400 hover:text-stone-200">
        Boş mesaj aç
      </a>
    </Sheet>
  );
}
