"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  buildBakeDayReminderIcs,
  ICS_WEEKDAY_LABELS,
  ICS_WEEKDAY_ORDER,
  type IcsWeekday,
} from "@/lib/calendar/bakeReminderIcs";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Download,
  Loader2,
  LogIn,
  Phone,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

const REMINDER_TIME_OPTIONS = [
  { value: "09:00", label: "09:00 — Sabah hatırlatması" },
  { value: "11:00", label: "11:00 — Öğle öncesi" },
  { value: "14:00", label: "14:00 — Öğleden sonra" },
  { value: "18:00", label: "18:00 — Akşamüstü" },
  { value: "20:00", label: "20:00 — Akşam fırın planı" },
  { value: "21:00", label: "21:00 — Ertesi gün sipariş saati" },
] as const;

export default function TercihlerPage() {
  const { user, profile, loading, updateProfile, openAuthModal } = useAuth();

  // Modül 1: Teslimat Profilim
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Modül 2: iPhone & Google Takvim Fırın Günü Hatırlatıcısı (.ics)
  const [weekday, setWeekday] = useState<IcsWeekday>("SA");
  const [clockValue, setClockValue] = useState<string>("18:00");
  const [reminderNote, setReminderNote] = useState<string>("");
  const [icsNotice, setIcsNotice] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    setSavingProfile(true);
    const res = await updateProfile({ fullName, phone });
    setSavingProfile(false);
    if (res.success) {
      setProfileNotice({
        type: "ok",
        text: "Teslimat profiliniz kaydedildi. Sipariş ekranında bilgileriniz otomatik doldurulur.",
      });
    } else {
      setProfileNotice({
        type: "err",
        text: res.error || "Profil bilgileriniz güncellenemedi.",
      });
    }
  };

  const handleDownloadIcs = () => {
    const [hStr, mStr] = clockValue.split(":");
    const hour = Number(hStr) || 18;
    const minute = Number(mStr) || 0;

    const icsContent = buildBakeDayReminderIcs({
      weekday,
      hour,
      minute,
      note: reminderNote,
    });

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ekmeklab-firin-${weekday.toLowerCase()}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setIcsNotice(
      `Her ${ICS_WEEKDAY_LABELS[weekday]} ${clockValue} için takvim dosyanız hazırlandı. iPhone'da açılan ekrandan "Ekle" seçeneğine dokunarak haftalık hatırlatıcınızı başlatabilirsiniz.`
    );
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-ink-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-serif">Profil bilgileriniz yükleniyor...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-cream-surface border border-line rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 text-ink">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
          <UserCheck className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-serif font-bold text-ink">
          Profil &amp; Hatırlatıcı İçin Giriş Yapın
        </h1>
        <p className="text-xs text-ink-muted leading-relaxed max-w-sm mx-auto font-sans">
          Teslimat iletişim bilgilerinizi kaydetmek ve haftalık taş fırın takvim hatırlatıcısı kurmak için oturum açın.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => openAuthModal("/hesabim/tercihler")}
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
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
          Profil &amp; Fırın Hatırlatıcısı
        </h1>
        <p className="text-xs text-ink-muted mt-1 font-sans">
          Sepette hazır gelecek iletişim bilgilerinizi güncelleyin ve favori fırın gününüzü telefon takviminize ekleyin.
        </p>
      </div>

      {/* MODÜL 1: Teslimat Profilim (Ad Soyad & Telefon) */}
      <section
        aria-labelledby="delivery-profile-heading"
        className="bg-cream-surface border border-line rounded-3xl p-5 sm:p-7 space-y-5 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
            <UserCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 id="delivery-profile-heading" className="font-serif font-bold text-base sm:text-lg text-ink">
              Teslimat Profilim
            </h2>
            <p className="text-xs text-ink-muted font-sans leading-relaxed">
              Ad soyad ve telefon numaranız hesabınızda saklanır; her cihazdan sepete geçtiğinizde otomatik olarak doldurulur.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-fullname" className="block text-xs font-semibold text-ink mb-1">
                Ad ve Soyad *
              </label>
              <input
                id="profile-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (profileNotice) setProfileNotice(null);
                }}
                placeholder="Ör. Ayşe Yılmaz"
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none font-sans"
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className="block text-xs font-semibold text-ink mb-1">
                Cep Telefonu Numarası
              </label>
              <div className="relative">
                <Phone
                  className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (profileNotice) setProfileNotice(null);
                  }}
                  placeholder="05XX XXX XX XX"
                  className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm font-mono text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-ink-muted font-sans">
              <ShieldCheck className="w-4 h-4 text-good shrink-0" aria-hidden="true" />
              <span>Yalnızca teslimat ve sipariş bilgilendirmesi için kullanılır; 3. taraflarla paylaşılmaz.</span>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="touch-target-44 min-h-[48px] px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
            >
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{savingProfile ? "Kaydediliyor…" : "Profili Kaydet"}</span>
            </button>
          </div>

          {profileNotice && (
            <div
              role={profileNotice.type === "err" ? "alert" : "status"}
              className={`p-3.5 rounded-xl text-xs font-sans flex items-center gap-2 border ${
                profileNotice.type === "ok"
                  ? "bg-good/15 border-good/30 text-ink"
                  : "bg-bad/10 border-bad/30 text-bad"
              }`}
            >
              {profileNotice.type === "ok" ? (
                <CheckCircle2 className="w-4 h-4 text-good shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{profileNotice.text}</span>
            </div>
          )}
        </form>
      </section>

      {/* MODÜL 2: iPhone & Google Takvim Fırın Günü Hatırlatıcısı (.ics) */}
      <section
        id="takvim-hatirlatici"
        aria-labelledby="calendar-reminder-heading"
        className="bg-cream-surface border border-line rounded-3xl p-5 sm:p-7 space-y-5 shadow-xs scroll-mt-24"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
            <CalendarClock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 id="calendar-reminder-heading" className="font-serif font-bold text-base sm:text-lg text-ink">
              iPhone &amp; Google Takvim Fırın Günü Hatırlatıcısı
            </h2>
            <p className="text-xs text-ink-muted font-sans leading-relaxed">
              Uygulama bildirimi iznine gerek kalmadan, favori sipariş gününüz için Apple Takvim ve Google Takvim ile uyumlu haftalık hatırlatıcı (15 dk önceden uyarılı) ekleyin.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-ink">
              Hatırlatma Günü Seçin
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {ICS_WEEKDAY_ORDER.map((dayCode) => {
                const selected = weekday === dayCode;
                return (
                  <button
                    key={dayCode}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setWeekday(dayCode);
                      if (icsNotice) setIcsNotice(null);
                    }}
                    className={`touch-target-44 min-h-[44px] px-3 py-2 rounded-xl text-xs font-sans transition-all border ${
                      selected
                        ? "bg-accent text-white border-accent font-bold shadow-2xs"
                        : "bg-bg text-ink border-line hover:border-accent/45 font-medium"
                    }`}
                  >
                    {ICS_WEEKDAY_LABELS[dayCode]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ics-time" className="block text-xs font-semibold text-ink mb-1">
                Hatırlatma Saati (İstanbul)
              </label>
              <select
                id="ics-time"
                name="reminderTime"
                value={clockValue}
                onChange={(e) => {
                  setClockValue(e.target.value);
                  if (icsNotice) setIcsNotice(null);
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink focus:border-accent focus:outline-none font-sans"
              >
                {REMINDER_TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ics-note" className="block text-xs font-semibold text-ink mb-1">
                Kişisel Sepet Notunuz (İsteğe bağlı)
              </label>
              <input
                id="ics-note"
                name="reminderNote"
                type="text"
                maxLength={140}
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="Ör. Siyez somunu + Jersey çiğ süt"
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none font-sans"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="touch-target-44 min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Takvimime Ekle (.ics İndir)</span>
            </button>
          </div>

          {icsNotice && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-good/15 border border-good/30 text-xs text-ink font-sans flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-good shrink-0 mt-0.5" aria-hidden="true" />
              <span>{icsNotice}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
