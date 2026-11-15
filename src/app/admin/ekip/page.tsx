"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate } from "@/lib/time/istanbul";

type AssignableRole = "courier" | "staff" | "admin";
type VehicleType = "motorcycle" | "car" | "bicycle" | "on_foot";

interface SettlementDetail {
  id: string;
  cashHandedOver: number;
  cardSlipTotal: number;
  cashExpected: number;
  cardExpected: number;
  cariDeliveredTotal: number;
  deliveredCount: number;
  note: string | null;
  settledAt: string;
}

interface CourierDaySummary {
  courierId: string;
  activeStopCount: number;
  deliveredCount: number;
  cashExpected: number;
  cardExpected: number;
  cariDeliveredTotal: number;
  settlement: SettlementDetail | null;
}

interface TeamMember {
  profileId: string;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  createdAt: string;
  courier: {
    id: string;
    displayName: string;
    phone: string;
    vehicleType: string;
    isActive: boolean;
    isOnShift: boolean;
  } | null;
  summary: CourierDaySummary | null;
}

interface CourierRow {
  id: string;
  profileId: string | null;
  displayName: string;
  phone: string;
  vehicleType: string;
  isActive: boolean;
  isOnShift: boolean;
  summary: CourierDaySummary;
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  displayName: string;
  phone: string;
  vehicleType: string;
  isActive: boolean;
  acceptedProfileId: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface TeamPayload {
  date: string;
  currentUserId: string | null;
  members: TeamMember[];
  couriers: CourierRow[];
  invitations: InvitationRow[];
  auditLogs: AuditLogRow[];
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ISTANBUL_DATETIME_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatCurrency(value: number): string {
  return `₺${CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0)}`;
}

function formatIstanbulTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return ISTANBUL_DATETIME_FORMATTER.format(parsed);
}

function formatRoleLabel(role: string): string {
  switch (role) {
    case "superadmin":
      return "Süper Yönetici";
    case "admin":
      return "Yönetici (Admin)";
    case "staff":
      return "Operasyon / Fırın";
    case "courier":
      return "Kurye";
    case "customer":
      return "Müşteri";
    default:
      return role;
  }
}

function formatVehicleLabel(vehicleType: string): string {
  switch (vehicleType) {
    case "motorcycle":
      return "Motosiklet";
    case "car":
      return "Araç / Panelvan";
    case "bicycle":
      return "Bisiklet";
    case "on_foot":
      return "Yaya";
    default:
      return vehicleType;
  }
}

export default function AdminEkipPage() {
  const today = useIstanbulToday();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [data, setData] = useState<TeamPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  // Add / Invite form state
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("courier");
  const [invitePhone, setInvitePhone] = useState<string>("");
  const [inviteVehicle, setInviteVehicle] = useState<VehicleType>("motorcycle");
  const [inviteBusy, setInviteBusy] = useState<boolean>(false);

  // Row role drafts (explicit submit per row)
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AssignableRole>>({});
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  // Native <dialog> Settlement modal
  const settleDialogRef = useRef<HTMLDialogElement | null>(null);
  const [settleCourier, setSettleCourier] = useState<CourierRow | null>(null);
  const [cashInput, setCashInput] = useState<string>("0");
  const [cardInput, setCardInput] = useState<string>("0");
  const [settleNote, setSettleNote] = useState<string>("");
  const [settleBusy, setSettleBusy] = useState<boolean>(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Native <dialog> Remove / Revoke confirmation modal
  const removeDialogRef = useRef<HTMLDialogElement | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    label: string;
    kind: "member" | "invitation";
  } | null>(null);
  const [removeBusy, setRemoveBusy] = useState<boolean>(false);

  const loadTeam = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/admin/team?date=${encodeURIComponent(selectedDate)}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | (TeamPayload & { error?: string })
          | { error?: string }
          | null;

        if (!res.ok) {
          setErrorMsg(
            json && "error" in json && typeof json.error === "string"
              ? json.error
              : `Ekip verileri alınamadı (HTTP ${res.status}).`,
          );
          return;
        }

        if (json && "members" in json) {
          setData(json);
          const nextDrafts: Record<string, AssignableRole> = {};
          for (const member of json.members) {
            if (
              member.role === "courier" ||
              member.role === "staff" ||
              member.role === "admin"
            ) {
              nextDrafts[member.profileId] = member.role;
            }
          }
          setRoleDrafts(nextDrafts);
        }
      } catch {
        setErrorMsg("Sunucuya bağlanılamadı.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    const dlg = settleDialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      dlg.returnValue = "";
      setSettleCourier(null);
      setSettleError(null);
    };
    dlg.addEventListener("close", handleClose);
    return () => dlg.removeEventListener("close", handleClose);
  }, []);

  useEffect(() => {
    const dlg = removeDialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      dlg.returnValue = "";
      setRemoveTarget(null);
    };
    dlg.addEventListener("close", handleClose);
    return () => dlg.removeEventListener("close", handleClose);
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteBusy(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim() || undefined,
          displayName: inviteName.trim(),
          role: inviteRole,
          phone: invitePhone.trim() || undefined,
          vehicleType: inviteRole === "courier" ? inviteVehicle : undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; mode?: string }
        | null;

      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Ekip üyesi kaydedilemedi.",
        });
        return;
      }

      setFeedback({
        kind: "success",
        text:
          json?.mode === "field_courier"
            ? `${inviteName.trim()} saha kuryesi olarak eklendi ve hemen sipariş atanabilir.`
            : json?.mode === "assigned" || json?.mode === "assigned_existing_profile"
              ? `${inviteName.trim()} (${inviteEmail.trim()}) için yetki doğrudan atandı.`
              : `${inviteEmail.trim()} için davet oluşturuldu; kurye şimdiden planlanabilir ve ilk girişte eşleşir.`,
      });
      setInviteEmail("");
      setInviteName("");
      setInvitePhone("");
      await loadTeam({ silent: true });
    } catch {
      setFeedback({ kind: "error", text: "Bağlantı hatası nedeniyle kayıt yapılamadı." });
    } finally {
      setInviteBusy(false);
    }
  };

  const handlePatchTeam = async (
    targetId: string,
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    setBusyRowId(targetId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/team/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Güncelleme başarısız.",
        });
        return;
      }
      setFeedback({ kind: "success", text: successMessage });
      await loadTeam({ silent: true });
    } catch {
      setFeedback({ kind: "error", text: "Bağlantı hatası." });
    } finally {
      setBusyRowId(null);
    }
  };

  const openSettleDialog = (courier: CourierRow) => {
    setSettleCourier(courier);
    setSettleError(null);
    const existing = courier.summary.settlement;
    setCashInput(
      String(existing ? existing.cashHandedOver : courier.summary.cashExpected),
    );
    setCardInput(
      String(existing ? existing.cardSlipTotal : courier.summary.cardExpected),
    );
    setSettleNote(existing?.note ?? "");
    settleDialogRef.current?.showModal();
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCourier) return;
    setSettleError(null);

    const cashHandedOver = Number(cashInput.replace(",", "."));
    const cardSlipTotal = Number(cardInput.replace(",", "."));
    if (!Number.isFinite(cashHandedOver) || cashHandedOver < 0) {
      setSettleError("Geçerli bir teslim edilen nakit tutarı girin.");
      return;
    }
    if (!Number.isFinite(cardSlipTotal) || cardSlipTotal < 0) {
      setSettleError("Geçerli bir POS slip toplamı girin.");
      return;
    }

    setSettleBusy(true);
    try {
      const res = await fetch(`/api/admin/couriers/${settleCourier.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          cashHandedOver,
          cardSlipTotal,
          note: settleNote.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setSettleError(json?.error || "Mutabakat kaydedilemedi.");
        return;
      }
      setFeedback({
        kind: "success",
        text: `${settleCourier.displayName} için ${formatTrDate(selectedDate)} kasa mutabakatı kaydedildi.`,
      });
      settleDialogRef.current?.close("confirmed");
      await loadTeam({ silent: true });
    } catch {
      setSettleError("Sunucuya bağlanılamadı.");
    } finally {
      setSettleBusy(false);
    }
  };

  const openRemoveDialog = (id: string, label: string, kind: "member" | "invitation") => {
    setRemoveTarget({ id, label, kind });
    removeDialogRef.current?.showModal();
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setRemoveBusy(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/team/${removeTarget.id}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Yetki kaldırma işlemi başarısız.",
        });
        removeDialogRef.current?.close("error");
        return;
      }

      setFeedback({
        kind: "success",
        text:
          removeTarget.kind === "invitation"
            ? `${removeTarget.label} daveti iptal edildi.`
            : `${removeTarget.label} kullanıcısının ekip yetkisi kaldırıldı.`,
      });
      removeDialogRef.current?.close("confirmed");
      await loadTeam({ silent: true });
    } catch {
      setFeedback({ kind: "error", text: "Bağlantı hatası." });
      removeDialogRef.current?.close("error");
    } finally {
      setRemoveBusy(false);
    }
  };

  const cashNum = Number(cashInput.replace(",", ".")) || 0;
  const cardNum = Number(cardInput.replace(",", ".")) || 0;
  const cashDiff = settleCourier ? cashNum - settleCourier.summary.cashExpected : 0;
  const cardDiff = settleCourier ? cardNum - settleCourier.summary.cardExpected : 0;

  return (
    <div className="min-h-screen bg-[#F6EEDF] px-3 py-5 text-[#3B1E1A] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider text-[#6E5148] uppercase">
                Atölye Kremi · Kurumsal Yönetim
              </p>
              <h1 className="mt-1 font-serif text-2xl font-bold text-[#B4532A] sm:text-3xl">
                Ekip, Kurye &amp; Gün Sonu Kasa Yönetimi
              </h1>
              <p className="mt-1 text-sm text-[#6E5148]">
                {formatTrDate(selectedDate)} · Rol yetkilendirme, vardiya takibi, kasa mutabakatı
                ve denetim izi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadTeam({ silent: true })}
                disabled={refreshing || loading}
                className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-4 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>
              <Link
                href="/kurye"
                className="inline-flex min-h-11 items-center rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white transition hover:bg-[#9C4421]"
              >
                Kurye Dağıtım Konsolu
              </Link>
              <Link
                href="/admin/siparisler"
                className="inline-flex min-h-11 items-center rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] px-4 text-sm font-semibold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
              >
                Siparişler
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#E2D3BD] pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(today, -1))}
                className={`min-h-11 rounded-xl border px-3.5 text-sm font-semibold ${
                  selectedDate === addDays(today, -1)
                    ? "border-[#B4532A] bg-[#B4532A] text-white"
                    : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A]"
                }`}
              >
                Dün
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className={`min-h-11 rounded-xl border px-3.5 text-sm font-semibold ${
                  selectedDate === today
                    ? "border-[#B4532A] bg-[#B4532A] text-white"
                    : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A]"
                }`}
              >
                Bugün
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="ekip-date-input" className="text-xs font-bold text-[#6E5148]">
                Kasa &amp; Dağıtım Tarihi
              </label>
              <input
                id="ekip-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base font-mono text-[#3B1E1A]"
              />
            </div>
          </div>
        </header>

        {/* Feedback Banner */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-sm ${
              feedback.kind === "success"
                ? "border-[#B4D3BC] bg-[#E5EFE7] text-[#1D5130]"
                : "border-[#E5B0A5] bg-[#FCECE9] text-[#7D2114]"
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="min-h-11 rounded-xl border border-current/20 bg-white/70 px-3 text-xs font-bold"
            >
              Kapat
            </button>
          </div>
        )}

        {loading && !data ? (
          <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-[#3B1E1A]">Ekip verileri yükleniyor...</p>
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl border border-[#E5B0A5] bg-[#FFFFFF] p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[#7D2114]">
              Yetki veya Bağlantı Hatası
            </h2>
            <p className="mt-2 text-sm text-[#3B1E1A]">{errorMsg}</p>
            <button
              type="button"
              onClick={() => void loadTeam()}
              className="mt-4 min-h-11 rounded-xl bg-[#B4532A] px-5 text-sm font-bold text-white"
            >
              Tekrar Dene
            </button>
          </div>
        ) : data ? (
          <>
            {/* 1. ADD / INVITE TEAM MEMBER FORM */}
            <section className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-5 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-[#3B1E1A]">
                Ekip Üyesi Ekle veya Davet Et
              </h2>
              <p className="mt-1 text-sm text-[#6E5148]">
                Google OAuth ile sisteme daha önce girmiş kişiye rol hemen verilir; henüz
                girmemişse bekleyen davet kaydı oluşturulur. Saha kuryeleri e-posta olmadan da
                yalnızca ad ve telefonla eklenebilir.
              </p>

              <form
                onSubmit={handleInviteSubmit}
                className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div className="flex flex-col gap-1">
                  <label htmlFor="invite-email" className="text-xs font-bold text-[#6E5148]">
                    {inviteRole === "courier"
                      ? "Kurye Google E-postası (Opsiyonel — telefonu /kurye ekranına girecekse doldurun)"
                      : "E-posta Adresi (Google Hesabı) *"}
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required={inviteRole !== "courier"}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={
                      inviteRole === "courier"
                        ? "Opsiyonel (ornek@ekmeklab.com)"
                        : "ornek@ekmeklab.com"
                    }
                    className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-base text-[#3B1E1A]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="invite-name" className="text-xs font-bold text-[#6E5148]">
                    Ad Soyad *
                  </label>
                  <input
                    id="invite-name"
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-base text-[#3B1E1A]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="invite-role" className="text-xs font-bold text-[#6E5148]">
                    Yetki Rolü *
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as AssignableRole)}
                    className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A]"
                  >
                    <option value="courier">Kurye (/kurye konsolu)</option>
                    <option value="staff">Fırın / Operasyon Personeli</option>
                    <option value="admin">Yönetici (Admin)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="invite-phone" className="text-xs font-bold text-[#6E5148]">
                    {inviteRole === "courier" && !inviteEmail.trim()
                      ? "Telefon *"
                      : "Telefon (Opsiyonel)"}
                  </label>
                  <input
                    id="invite-phone"
                    type="tel"
                    required={inviteRole === "courier" && !inviteEmail.trim()}
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-base text-[#3B1E1A]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="invite-vehicle" className="text-xs font-bold text-[#6E5148]">
                    Araç Tipi (Kurye ise)
                  </label>
                  <select
                    id="invite-vehicle"
                    value={inviteVehicle}
                    disabled={inviteRole !== "courier"}
                    onChange={(e) => setInviteVehicle(e.target.value as VehicleType)}
                    className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] disabled:opacity-50"
                  >
                    <option value="motorcycle">Motosiklet</option>
                    <option value="car">Araç / Panelvan</option>
                    <option value="bicycle">Bisiklet</option>
                    <option value="on_foot">Yaya</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={inviteBusy}
                    className="min-h-11 w-full rounded-xl bg-[#B4532A] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#9C4421] disabled:opacity-60"
                  >
                    {inviteBusy ? "Kaydediliyor..." : "Ekip Üyesini Kaydet / Davet Et"}
                  </button>
                </div>
              </form>
            </section>

            {/* 2. ACTIVE COURIERS & DAILY CASH SETTLEMENT */}
            <section className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#3B1E1A]">
                    Kuryeler, Vardiya &amp; Gün Sonu Kasa Teslimi
                  </h2>
                  <p className="mt-1 text-sm text-[#6E5148]">
                    {formatTrDate(selectedDate)} tarihli beklenen nakit/POS/cari dağılımı ve
                    vardiya kontrolü.
                  </p>
                </div>
                <span className="rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 py-1.5 font-mono text-xs font-bold text-[#3B1E1A]">
                  {data.couriers.length} Kurye
                </span>
              </div>

              {data.couriers.length === 0 ? (
                <p className="mt-4 text-sm text-[#6E5148]">Kayıtlı kurye bulunmuyor.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {data.couriers.map((courier) => {
                    const settled = courier.summary.settlement;
                    const busy = busyRowId === courier.id;
                    const targetPatchId = courier.profileId ?? courier.id;

                    return (
                      <article
                        key={courier.id}
                        className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E2D3BD] pb-3">
                          <div>
                            <h3 className="font-serif text-lg font-bold text-[#3B1E1A]">
                              {courier.displayName}
                            </h3>
                            <p className="text-xs text-[#6E5148]">
                              {formatVehicleLabel(courier.vehicleType)}
                              {courier.phone ? ` · ${courier.phone}` : ""}
                              {!courier.profileId ? " · Saha Kuryesi (E-posta yok)" : ""}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                                courier.isActive
                                  ? "bg-[#E5EFE7] text-[#1D5130]"
                                  : "bg-[#FCECE9] text-[#7D2114]"
                              }`}
                            >
                              {courier.isActive ? "Aktif" : "Pasif"}
                            </span>
                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                                courier.isOnShift
                                  ? "bg-[#F3E2D4] text-[#8E3D1B]"
                                  : "border border-[#E2D3BD] bg-white text-[#6E5148]"
                              }`}
                            >
                              {courier.isOnShift ? "Vardiyada" : "Vardiya Dışı"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl border border-[#E2D3BD] bg-white p-2.5">
                            <span className="text-xs text-[#6E5148]">Aktif / Teslim</span>
                            <p className="font-mono font-bold tabular-nums text-[#3B1E1A]">
                              {courier.summary.activeStopCount} / {courier.summary.deliveredCount}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#E2D3BD] bg-white p-2.5">
                            <span className="text-xs text-[#6E5148]">Beklenen Nakit</span>
                            <p className="font-mono font-bold tabular-nums text-[#3B1E1A]">
                              {formatCurrency(courier.summary.cashExpected)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#E2D3BD] bg-white p-2.5">
                            <span className="text-xs text-[#6E5148]">Beklenen POS</span>
                            <p className="font-mono font-bold tabular-nums text-[#3B1E1A]">
                              {formatCurrency(courier.summary.cardExpected)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#E2D3BD] bg-white p-2.5">
                            <span className="text-xs text-[#6E5148]">Cari Teslimat</span>
                            <p className="font-mono font-bold tabular-nums text-[#3B1E1A]">
                              {formatCurrency(courier.summary.cariDeliveredTotal)}
                            </p>
                          </div>
                        </div>

                        {settled && (
                          <div className="mt-3 rounded-xl border border-[#B4D3BC] bg-[#E5EFE7] px-3 py-2 text-xs text-[#1D5130]">
                            <strong>Mutabakat Kayıtlı:</strong> Teslim Nakit{" "}
                            <span className="font-mono font-bold">
                              {formatCurrency(settled.cashHandedOver)}
                            </span>{" "}
                            · POS Slip{" "}
                            <span className="font-mono font-bold">
                              {formatCurrency(settled.cardSlipTotal)}
                            </span>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handlePatchTeam(
                                targetPatchId,
                                { isOnShift: !courier.isOnShift },
                                `${courier.displayName} vardiya durumu güncellendi.`,
                              )
                            }
                            className="min-h-11 flex-1 rounded-xl border border-[#E2D3BD] bg-white px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-50"
                          >
                            {courier.isOnShift ? "Vardiyadan Çıkar" : "Vardiyaya Al"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handlePatchTeam(
                                targetPatchId,
                                { isActive: !courier.isActive },
                                `${courier.displayName} aktiflik durumu güncellendi.`,
                              )
                            }
                            className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-50"
                          >
                            {courier.isActive ? "Pasife Al" : "Aktifleştir"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openSettleDialog(courier)}
                            className="min-h-11 flex-1 rounded-xl bg-[#245A38] px-3 text-xs font-bold text-white transition hover:bg-[#1B452B]"
                          >
                            {settled ? "Kasayı Güncelle" : "Kasa Teslim Al"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. TEAM MEMBERS & INVITATIONS TABLE */}
            <section className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-5 shadow-sm">
              <h2 id="team-table-caption" className="font-serif text-xl font-bold text-[#3B1E1A]">
                Yetkili Ekip Üyeleri ({data.members.length})
              </h2>
              <p className="mt-1 text-sm text-[#6E5148]">
                Süper yönetici hesapları korunur ve kişi kendi rolünü düşüremez.
              </p>

              <div
                role="region"
                aria-labelledby="team-table-caption"
                tabIndex={0}
                className="mt-4 overflow-x-auto rounded-xl border border-[#E2D3BD]"
              >
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <caption className="sr-only">Yetkili Ekip Üyeleri Listesi</caption>
                  <thead className="bg-[#FBF6EC] text-xs font-bold text-[#6E5148] uppercase">
                    <tr>
                      <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                        Üye
                      </th>
                      <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                        E-posta / Telefon
                      </th>
                      <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                        Mevcut Rol
                      </th>
                      <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                        Rol Güncelle
                      </th>
                      <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                        Yetki İşlemi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D3BD]">
                    {data.members.map((member) => {
                      const isSuperAdmin = member.role === "superadmin";
                      const isSelf = data.currentUserId === member.profileId;
                      const draftRole = roleDrafts[member.profileId] ?? "staff";
                      const busy = busyRowId === member.profileId;

                      return (
                        <tr key={member.profileId} className="bg-white">
                          <td className="px-4 py-3 font-semibold text-[#3B1E1A]">
                            <div>{member.displayName}</div>
                            {isSelf && (
                              <span className="mt-0.5 inline-block rounded bg-[#F3E2D4] px-2 py-0.5 text-[11px] font-bold text-[#8E3D1B]">
                                Mevcut Oturum
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#6E5148]">
                            <div className="font-mono text-[#3B1E1A]">{member.email}</div>
                            {member.phone && <div className="mt-0.5 font-mono">{member.phone}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-lg border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 py-1 text-xs font-bold text-[#3B1E1A]">
                              {formatRoleLabel(member.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isSuperAdmin ? (
                              <span className="text-xs font-semibold text-[#6E5148]">
                                Korumalı rol
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  aria-label={`${member.displayName} rol seçimi`}
                                  value={draftRole}
                                  disabled={busy || isSelf}
                                  onChange={(e) =>
                                    setRoleDrafts((prev) => ({
                                      ...prev,
                                      [member.profileId]: e.target.value as AssignableRole,
                                    }))
                                  }
                                  className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 text-sm text-[#3B1E1A] disabled:opacity-50"
                                >
                                  <option value="courier">Kurye</option>
                                  <option value="staff">Personel</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button
                                  type="button"
                                  disabled={busy || isSelf || draftRole === member.role}
                                  onClick={() =>
                                    void handlePatchTeam(
                                      member.profileId,
                                      { role: draftRole },
                                      `${member.displayName} rolü güncellendi.`,
                                    )
                                  }
                                  className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-50"
                                >
                                  Kaydet
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={busy || isSuperAdmin || isSelf}
                              onClick={() =>
                                openRemoveDialog(
                                  member.profileId,
                                  `${member.displayName} (${member.email})`,
                                  "member",
                                )
                              }
                              className="min-h-11 rounded-xl border border-[#E5B0A5] bg-[#FCECE9] px-3 text-xs font-bold text-[#7D2114] transition hover:bg-[#F7D7D0] disabled:opacity-40"
                            >
                              Yetkiyi Kaldır
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Invitations subsection */}
              <div className="mt-6">
                <h3
                  id="invitations-table-caption"
                  className="font-serif text-lg font-bold text-[#3B1E1A]"
                >
                  Bekleyen &amp; Kabul Edilmiş Davetler ({data.invitations.length})
                </h3>
                {data.invitations.length === 0 ? (
                  <p className="mt-2 text-sm text-[#6E5148]">Davet kaydı bulunmuyor.</p>
                ) : (
                  <div
                    role="region"
                    aria-labelledby="invitations-table-caption"
                    tabIndex={0}
                    className="mt-3 overflow-x-auto rounded-xl border border-[#E2D3BD]"
                  >
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <caption className="sr-only">Ekip Davetleri</caption>
                      <thead className="bg-[#FBF6EC] text-xs font-bold text-[#6E5148] uppercase">
                        <tr>
                          <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                            E-posta
                          </th>
                          <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                            Ad Soyad
                          </th>
                          <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                            Rol
                          </th>
                          <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                            Durum
                          </th>
                          <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                            İşlem
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2D3BD]">
                        {data.invitations.map((inv) => (
                          <tr key={inv.id} className="bg-white">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-[#3B1E1A]">
                              {inv.email}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#3B1E1A]">
                              {inv.displayName}
                            </td>
                            <td className="px-4 py-3">{formatRoleLabel(inv.role)}</td>
                            <td className="px-4 py-3">
                              {inv.acceptedAt ? (
                                <span className="rounded-md bg-[#E5EFE7] px-2 py-1 text-xs font-bold text-[#1D5130]">
                                  Kabul Edildi
                                </span>
                              ) : inv.isActive ? (
                                <span className="rounded-md bg-[#FFF8EB] px-2 py-1 text-xs font-bold text-[#6B4211]">
                                  İlk Giriş Bekleniyor
                                </span>
                              ) : (
                                <span className="rounded-md bg-[#FBF6EC] px-2 py-1 text-xs font-bold text-[#6E5148]">
                                  Pasif
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {inv.isActive && !inv.acceptedAt && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openRemoveDialog(inv.id, inv.email, "invitation")
                                  }
                                  className="min-h-11 rounded-xl border border-[#E5B0A5] bg-[#FCECE9] px-3 text-xs font-bold text-[#7D2114]"
                                >
                                  Daveti İptal Et
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* 4. AUDIT LOGS TABLE */}
            <section className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-5 shadow-sm">
              <h2 id="audit-table-caption" className="font-serif text-xl font-bold text-[#3B1E1A]">
                Denetim İzi (Son 50 Kayıt)
              </h2>
              <p className="mt-1 text-sm text-[#6E5148]">
                Rol atamaları, kurye zimmetleri, kasa mutabakatları ve toplu sipariş işlemleri.
              </p>

              {data.auditLogs.length === 0 ? (
                <p className="mt-3 text-sm text-[#6E5148]">Henüz denetim kaydı bulunmuyor.</p>
              ) : (
                <div
                  role="region"
                  aria-labelledby="audit-table-caption"
                  tabIndex={0}
                  className="mt-4 overflow-x-auto rounded-xl border border-[#E2D3BD]"
                >
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <caption className="sr-only">Denetim İzi Kayıtları</caption>
                    <thead className="bg-[#FBF6EC] text-xs font-bold text-[#6E5148] uppercase">
                      <tr>
                        <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                          Zaman (İstanbul)
                        </th>
                        <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                          Yetkili
                        </th>
                        <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                          Aksiyon
                        </th>
                        <th scope="col" className="border-b border-[#E2D3BD] px-4 py-3">
                          Özet
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2D3BD]">
                      {data.auditLogs.map((log) => (
                        <tr key={log.id} className="bg-white">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#6E5148]">
                            {formatIstanbulTimestamp(log.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-bold text-[#3B1E1A]">
                              {log.actorName || "Sistem"}
                            </div>
                            <div className="text-[#6E5148]">{formatRoleLabel(log.actorRole)}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-[#8E3D1B]">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#3B1E1A]">{log.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      {/* Native <dialog> — Kasa Teslim Alma / Mutabakat */}
      <dialog
        ref={settleDialogRef}
        aria-labelledby="settle-dialog-title"
        className="m-auto w-[min(94vw,32rem)] rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:bg-[#3B1E1A]/45 backdrop:overscroll-contain"
      >
        {settleCourier && (
          <form onSubmit={handleSettleSubmit} className="max-h-[90dvh] overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2D3BD] pb-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-[#6E5148] uppercase">
                  {formatTrDate(selectedDate)} · Gün Sonu Mutabakatı
                </p>
                <h2 id="settle-dialog-title" className="font-serif text-xl font-bold text-[#3B1E1A]">
                  Kasa Teslim Al — {settleCourier.displayName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => settleDialogRef.current?.close("cancel")}
                className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-sm font-bold text-[#3B1E1A]"
              >
                Kapat
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3 text-center">
              <div>
                <p className="text-[11px] font-semibold text-[#6E5148]">Beklenen Nakit</p>
                <p className="font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                  {formatCurrency(settleCourier.summary.cashExpected)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6E5148]">Beklenen POS</p>
                <p className="font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                  {formatCurrency(settleCourier.summary.cardExpected)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6E5148]">Cari / Adet</p>
                <p className="font-mono text-sm font-bold tabular-nums text-[#3B1E1A]">
                  {formatCurrency(settleCourier.summary.cariDeliveredTotal)} (
                  {settleCourier.summary.deliveredCount})
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="settle-cash-input" className="text-xs font-bold text-[#6E5148]">
                  Teslim Alınan Nakit (₺)
                </label>
                <input
                  id="settle-cash-input"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-base font-mono font-bold text-[#3B1E1A]"
                />
                <span className="font-mono text-xs text-[#6E5148]">
                  Nakit Farkı: {cashDiff >= 0 ? "+" : ""}
                  {formatCurrency(cashDiff)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="settle-card-input" className="text-xs font-bold text-[#6E5148]">
                  POS Slip Toplamı (₺)
                </label>
                <input
                  id="settle-card-input"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={cardInput}
                  onChange={(e) => setCardInput(e.target.value)}
                  className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 text-base font-mono font-bold text-[#3B1E1A]"
                />
                <span className="font-mono text-xs text-[#6E5148]">
                  POS Farkı: {cardDiff >= 0 ? "+" : ""}
                  {formatCurrency(cardDiff)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="settle-note-input" className="text-xs font-bold text-[#6E5148]">
                  Kasa Notu (Opsiyonel)
                </label>
                <textarea
                  id="settle-note-input"
                  rows={2}
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="Eksik/fazla açıklaması veya fiş notu..."
                  className="rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3 text-base text-[#3B1E1A]"
                />
              </div>
            </div>

            {settleError && (
              <div className="mt-3 rounded-xl border border-[#E5B0A5] bg-[#FCECE9] p-3 text-sm font-semibold text-[#7D2114]">
                {settleError}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={settleBusy}
                onClick={() => settleDialogRef.current?.close("cancel")}
                className="min-h-12 flex-1 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-4 text-sm font-bold text-[#3B1E1A]"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                autoFocus
                disabled={settleBusy}
                className="min-h-12 flex-[2] rounded-xl bg-[#245A38] px-5 text-base font-bold text-white transition hover:bg-[#1B452B] disabled:opacity-60"
              >
                {settleBusy ? "Kaydediliyor..." : "Kasa Mutabakatını Onayla"}
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Native <dialog> — Remove / Revoke Confirmation */}
      <dialog
        ref={removeDialogRef}
        aria-labelledby="remove-dialog-title"
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-5 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:bg-[#3B1E1A]/45 backdrop:overscroll-contain"
      >
        {removeTarget && (
          <div>
            <h2 id="remove-dialog-title" className="font-serif text-xl font-bold text-[#7D2114]">
              {removeTarget.kind === "invitation" ? "Daveti İptal Et" : "Ekip Yetkisini Kaldır"}
            </h2>
            <p className="mt-2 text-sm text-[#3B1E1A]">
              <strong>{removeTarget.label}</strong> için{" "}
              {removeTarget.kind === "invitation"
                ? "bekleyen ekip daveti pasife alınacaktır."
                : "ekip yetkisi kaldırılıp rolü müşteri seviyesine çekilecektir."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={removeBusy}
                onClick={() => removeDialogRef.current?.close("cancel")}
                className="min-h-11 flex-1 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-4 text-sm font-bold text-[#3B1E1A]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                autoFocus
                disabled={removeBusy}
                onClick={() => void handleConfirmRemove()}
                className="min-h-11 flex-1 rounded-xl bg-[#7D2114] px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {removeBusy ? "İşleniyor..." : "Onayla ve Kaldır"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
