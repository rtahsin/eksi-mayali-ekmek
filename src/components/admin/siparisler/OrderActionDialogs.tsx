"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronRight, Loader2, X, XCircle } from "lucide-react";
import type { AdminOrder } from "@/types/admin";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";
import { DELIVERY_PAYMENT_LABELS, defaultDeliveryPayment, type DeliveryPayment } from "@/lib/orders/delivery";
import { orderMessage, ORDER_MESSAGE_LABELS, type OrderMessage } from "@/lib/orders/adminFlow";
import { relativeTrDate } from "@/lib/time/istanbul";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { useStoreSettings } from "@/hooks/useStoreSettings";

type Result = { success: boolean; error?: string };

function isOutsideDialog(e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement): boolean {
  const r = dialog.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

function Sheet({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.returnValue = "";
    if (!dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={(e) => {
        e.currentTarget.returnValue = "";
        onClose();
      }}
      onPointerDown={(e) => {
        pressedOutsideRef.current = isOutsideDialog(e, e.currentTarget);
      }}
      onPointerUp={(e) => {
        if (pressedOutsideRef.current && isOutsideDialog(e, e.currentTarget)) {
          e.currentTarget.close();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto mb-0 sm:mb-auto w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2D3BD] pb-3">
          <h3 id={titleId} className="font-serif font-bold text-base text-[#3B1E1A]">
            {title}
          </h3>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Kapat"
            className="min-w-10 min-h-10 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
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
  const { adminUser } = useAdminAuth();
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");
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
    <Sheet
      title={
        canViewFinance ? (
          <span>
            Teslim et · <span className="font-mono tabular-nums">{order.totalAmount.toLocaleString("tr-TR")} ₺</span>
          </span>
        ) : (
          "Siparişi teslim et"
        )
      }
      onClose={onClose}
    >
      {alreadyPaid ? (
        <p className="text-sm text-[#1D5130] bg-[#E5EFE7] border border-[#B4D3BC] px-3 py-2.5 rounded-xl font-medium">
          {order.customerName} · ödemesi önceden alındı.
        </p>
      ) : (
        <>
          <p className="text-xs text-[#6E5148]">{order.customerName} · ödeme nasıl alındı?</p>
          <div className="space-y-2" role="radiogroup" aria-label="Ödeme yöntemi">
            {options.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={payment === p}
                onClick={() => setPayment(p)}
                className={`w-full min-h-12 px-4 rounded-xl border text-sm text-left flex items-center justify-between transition-colors ${
                  payment === p
                    ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130] font-bold"
                    : "bg-[#FBF6EC] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F1E6D2]"
                }`}
              >
                <span>{label(p)}</span>
                {payment === p && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
          {isCari && payment !== "unpaid" && (
            <p className="text-xs text-[#6E5148]">Teslimat fişi cariye yazılır, alınan ödeme aynı anda tahsilat olarak düşülür.</p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-xs text-[#7D2114] bg-[#FCECE9] border border-[#E7B7AF] px-3 py-2 rounded-xl">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy}
        className="w-full h-14 rounded-xl bg-[#1D5130] hover:bg-[#163F25] text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Check className="w-5 h-5" aria-hidden="true" />}
        <span>Teslim edildi</span>
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
  const { adminUser } = useAdminAuth();
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");
  const canReadCari = hasCapability(adminUser?.role, "cari.read");
  const reasonId = useId();
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
        <span className="flex items-center gap-2 text-[#7D2114]">
          <XCircle className="w-5 h-5" aria-hidden="true" /> Sipariş iptal edilsin mi?
        </span>
      }
      onClose={onClose}
    >
      <p className="text-xs text-[#6E5148] leading-relaxed">
        <span className="font-mono tabular-nums">#{order.orderNumber || order.id.slice(0, 6)}</span> · {order.customerName}
        {canViewFinance ? (
          <>
            {" "}
            · <span className="font-mono tabular-nums">{order.totalAmount.toLocaleString("tr-TR")} ₺</span>
          </>
        ) : null}
        . Geri alınamaz.
        {canReadCari && order.cariId ? " Cariye yazılmış hareket varsa ters kayıtla geri alınır." : ""}
      </p>
      <div className="space-y-1.5">
        <label htmlFor={reasonId} className="block text-xs font-semibold text-[#3B1E1A]">
          İptal sebebi (isteğe bağlı)
        </label>
        <textarea
          id={reasonId}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 300))}
          placeholder="Örn: Müşteri vazgeçti"
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-[#7D2114] bg-[#FCECE9] border border-[#E7B7AF] px-3 py-2 rounded-xl">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={onClose}
          disabled={busy}
          className="flex-1 h-12 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold transition-colors"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy}
          className="flex-1 h-12 rounded-xl bg-[#9B2C1F] hover:bg-[#7D2114] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          <span>İptal et</span>
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
            className="w-full h-12 px-4 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm font-medium text-[#3B1E1A] flex items-center justify-between hover:border-[#B4D3BC] hover:bg-[#E5EFE7]/60 transition-colors"
          >
            <span>{ORDER_MESSAGE_LABELS[m]}</span>
            <ChevronRight className="w-4 h-4 text-[#6E5148]" aria-hidden="true" />
          </a>
        ))}
      </div>
      <a
        href={whatsappLink(undefined, phone)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="block text-center text-xs font-medium text-[#6E5148] hover:text-[#3B1E1A] transition-colors pt-1"
      >
        Boş mesaj aç
      </a>
    </Sheet>
  );
}
