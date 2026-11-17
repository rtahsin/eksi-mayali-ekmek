"use client";

import { formatMoney } from "@/lib/format/currency";
import { storefrontAction } from "@/lib/design/storefront";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import { useDeliveryDates, useStoreSettings } from "@/hooks/useStoreSettings";
import { computeShippingFee } from "@/lib/settings/schema";
import { FoodComplianceNotice } from "@/components/storefront/FoodComplianceNotice";
import { CheckoutActions } from "./CheckoutActions";
import { Modal } from "@/components/common/Modal";
import { formatProductAmount } from "@/lib/products/format";
import { formatTrDate } from "@/lib/time/istanbul";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Truck,
  User,
  Phone,
  MapPin,
  Sparkles,
  Navigation,
  Loader2,
  Megaphone,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProducts } from "@/hooks/useProducts";
import { stripMah, type CheckoutErrors } from "@/lib/order/validate";
import type { CheckoutPaymentMethod } from "@/lib/order/createOrder";
import { trackEvent } from "@/lib/track";

function mergeDirectionsIntoNote(
  currentNote: string | undefined,
  directions: string | undefined
): string | undefined {
  const cleanDirections = (directions || "").trim();
  if (!cleanDirections) return undefined;
  const existing = (currentNote || "").trim();
  if (
    existing
      .toLocaleLowerCase("tr-TR")
      .includes(cleanDirections.toLocaleLowerCase("tr-TR"))
  ) {
    return undefined;
  }
  const combined = existing ? `${existing} · ${cleanDirections}` : cleanDirections;
  return combined.slice(0, 300);
}

export function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const customerInfo = useCartStore((s) => s.customerInfo);
  const closeCart = useCartStore((s) => s.closeCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const addItem = useCartStore((s) => s.addItem);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const setLocation = useCartStore((s) => s.setLocation);
  const itemCount = useCartStore((s) => s.getItemCount());
  const subtotal = useCartStore((s) => s.getSubtotal());

  const { settings, loaded: settingsLoaded, settingsError, reloadSettings } = useStoreSettings();
  const { allProducts } = useProducts();
  const inCart = new Set(items.map((i) => i.productId));
  const suggestions = Array.from(
    new Set(items.flatMap((i) => allProducts.find((p) => p.id === i.productId)?.crossSell ?? []))
  )
    .filter((id) => !inCart.has(id))
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.isAvailable !== false))
    .slice(0, 3);
  const { dates, datesLoaded, datesError, reloadDates } = useDeliveryDates(isOpen, items);
  const availableDates = dates.filter((d) => d.available);
  const unavailableReasons = Array.from(new Set(dates.filter((d) => !d.available && d.reason).map((d) => d.reason as string)));
  const { profile, addresses, isLoggedIn, openAuthModal, saveAddress } = useAuth();
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("cash_on_delivery");
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [dateChange, setDateChange] = useState<string | null>(null);
  const startedRef = React.useRef(false);
  const autoFilledAddrUserRef = React.useRef<string | null>(null);
  const markCheckoutStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("checkout_start", { once: true });
  };
  const clearError = (field: keyof CheckoutErrors) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Seçili gün artık uygun değilse (satış günü, limit, kapasite…) ilk uygun güne geç
  useEffect(() => {
    if (!isOpen || !datesLoaded || datesError) return;
    const firstAvailable = dates.find((d) => d.available);
    if (!firstAvailable) {
      if (customerInfo.deliveryDate) {
        setDateChange("Sepetinizdeki ürünler için uygun ortak teslim günü bulunamadı. Ürünleri veya adetleri düzenleyin.");
        setCustomerInfo({ deliveryDate: "" });
      }
      return;
    }
    if (!dates.some((d) => d.available && d.date === customerInfo.deliveryDate)) {
      if (customerInfo.deliveryDate) {
        const reason = dates.find((d) => d.date === customerInfo.deliveryDate)?.reason;
        setDateChange(`Teslim günün ${formatTrDate(customerInfo.deliveryDate, "long")} yerine ${formatTrDate(firstAvailable.date, "long")} olarak güncellendi.${reason ? ` ${reason}.` : " Önceki gün artık sepetiniz için uygun değil."}`);
      }
      setCustomerInfo({ deliveryDate: firstAvailable.date });
    }
  }, [isOpen, dates, datesLoaded, datesError, customerInfo.deliveryDate, setCustomerInfo]);

  // Mahalle ayarlardaki listede değilse seçimi boşalt
  useEffect(() => {
    if (settingsLoaded && customerInfo.neighborhood && !settings.neighborhoods.includes(customerInfo.neighborhood)) {
      setCustomerInfo({ neighborhood: "" });
    }
  }, [settingsLoaded, settings.neighborhoods, customerInfo.neighborhood, setCustomerInfo]);

  // Giriş yapmış müşterinin bilgilerini boş alanlara doldur
  useEffect(() => {
    if (!isLoggedIn || !profile) return;
    const patch: Partial<typeof customerInfo> = {};
    if (!customerInfo.name && profile.fullName) patch.name = profile.fullName;
    if (!customerInfo.phone && profile.phone) patch.phone = profile.phone;
    if (Object.keys(patch).length > 0) setCustomerInfo(patch);
  }, [isLoggedIn, profile, customerInfo.name, customerInfo.phone, setCustomerInfo]);

  // Giriş yapmış müşterinin kayıtlı adresi varsa boş mahalle/adres alanlarını varsayılan (veya ilk) adresle doldur
  useEffect(() => {
    if (!isLoggedIn) {
      autoFilledAddrUserRef.current = null;
      return;
    }
    if (addresses.length === 0 || settings.neighborhoods.length === 0) return;
    const userKey = profile?.id ?? addresses[0].userId;
    if (autoFilledAddrUserRef.current === userKey) return;
    autoFilledAddrUserRef.current = userKey;

    const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
    const matchedNh =
      settings.neighborhoods.find(
        (n) => stripMah(n).toLocaleLowerCase("tr-TR") === stripMah(preferred.neighborhood).toLocaleLowerCase("tr-TR")
      ) ?? "";
    const patch: Partial<typeof customerInfo> = {};
    if (!customerInfo.neighborhood && matchedNh) patch.neighborhood = matchedNh;
    if (!customerInfo.addressDetail && preferred.addressDetail.trim()) {
      patch.addressDetail = preferred.addressDetail.trim();
    }
    const mergedNote = mergeDirectionsIntoNote(customerInfo.note, preferred.directions);
    if (!customerInfo.note && mergedNote) {
      patch.note = mergedNote;
    }
    if (Object.keys(patch).length > 0) setCustomerInfo(patch);
  }, [
    isLoggedIn,
    profile?.id,
    addresses,
    settings.neighborhoods,
    customerInfo.neighborhood,
    customerInfo.addressDetail,
    customerInfo.note,
    setCustomerInfo,
  ]);

  useEffect(() => {
    if (isOpen) trackEvent("cart_open", { once: true });
  }, [isOpen]);

  // Telefonun Geri tuşu siteden çıkarmak yerine çekmeceyi kapatsın
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ ekmeklabCart: true }, "");
    const onPop = () => closeCart();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if ((window.history.state as { ekmeklabCart?: boolean } | null)?.ekmeklabCart) window.history.back();
    };
  }, [isOpen, closeCart]);

  const handleGetLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocateError("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(
          Math.round(position.coords.latitude * 1e6) / 1e6,
          Math.round(position.coords.longitude * 1e6) / 1e6
        );
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? "Konum izni verilmedi. Adres tarifi yeterli olacaktır."
            : "Konum alınamadı. Adres tarifi yeterli olacaktır."
        );
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
    );
  };

  if (!isOpen) return null;

  const shippingFee = computeShippingFee(subtotal, settings);
  const totalAmount = subtotal + shippingFee;
  const threshold = settings.freeShippingThreshold;
  const minBasketShortfall = Math.max(0, settings.minBasketAmount - subtotal);
  const hasLocation = typeof customerInfo.customerLat === "number" && typeof customerInfo.customerLng === "number";
  const addressIsSaved = addresses.some(
    (a) => a.addressDetail.trim() === customerInfo.addressDetail.trim() &&
      stripMah(a.neighborhood) === customerInfo.neighborhood
  );
  const canSaveAddress = isLoggedIn && !addressIsSaved && customerInfo.addressDetail.trim().length >= 5 && Boolean(customerInfo.neighborhood);

  const handleOrderPlaced = () => {
    if (!canSaveAddress || !saveThisAddress) return;
    void saveAddress({
      title: addresses.length === 0 ? "Ev" : `Adres ${addresses.length + 1}`,
      district: "Beylikdüzü",
      neighborhood: customerInfo.neighborhood,
      addressDetail: customerInfo.addressDetail.trim(),
      isDefault: addresses.length === 0,
    }).catch(() => undefined);
  };

  const orderingBlockedReason = settingsError ? settingsError : !settingsLoaded
    ? "Sipariş bilgileri yükleniyor. Lütfen bekle."
    : !datesLoaded
    ? "Teslim günleri kontrol ediliyor. Lütfen bekle."
    : !settings.orderAcceptanceOpen
    ? "Şu an sipariş almıyoruz. Lütfen daha sonra tekrar dene."
    : datesError
    ? datesError
    : datesLoaded && dates.length === 0
    ? "Önümüzdeki günlerde teslimat günümüz bulunmuyor."
    : datesLoaded && items.length > 0 && availableDates.length === 0
    ? unavailableReasons[0] ?? "Sepetiniz için uygun teslim günü bulunamadı."
    : datesError;

  return (
    <Modal open={isOpen} onClose={closeCart} label="Sepetim"
      className="fixed inset-y-0 left-auto right-0 m-0 w-full max-w-md max-h-none h-dvh bg-bg shadow-2xl overflow-hidden animate-slideLeft">
      <div className="w-full h-full min-h-0 flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-line flex items-center justify-between bg-cream-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-ink">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <span>Sepetim</span>
                <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-line/40 text-ink border border-line font-medium">
                  {itemCount} Ürün
                </span>
              </div>
              <div className="text-xs font-sans text-ink-muted">EkmekLab Taze Fırın Çıkışı</div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Sepeti kapat"
            className={storefrontAction({ variant: "secondary", size: "default", className: "" })}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <CheckoutActions
          paymentMethod={paymentMethod} totalAmount={totalAmount} deliveryWindow={settings.deliveryWindow}
          errors={errors} onErrors={setErrors} minBasketShortfall={minBasketShortfall}
          orderingBlockedReason={orderingBlockedReason} onDatesStale={reloadDates}
          onOrderPlaced={handleOrderPlaced}
          deliveryDateLabel={dates.find((d) => d.date === customerInfo.deliveryDate)?.label ?? null}
          whatsappPhone={settings.whatsappPhone}
        >
          {settingsError && <div role="alert" className="space-y-2 rounded-xl border border-line bg-cream-surface p-3 text-sm">
            <p>{settingsError}</p>
            <button type="button" onClick={() => void reloadSettings()} className={storefrontAction({ variant: "secondary", size: "default", className: "" })}>Mağaza ayarlarını yeniden yükle</button>
          </div>}
          {settings.announcementText && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-ink font-sans flex items-start gap-2">
              <Megaphone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>{settings.announcementText}</span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cream-surface border border-line flex items-center justify-center text-ink-muted shadow-2xs">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-base font-bold text-ink">Sepetiniz Henüz Boş</h4>
                <p className="sf-copy text-xs text-ink-muted max-w-xs font-sans">
                  Taş fırında taze pişen ekşi mayalı ekmeklerimizden ve şarküteri ürünlerimizden seçin.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className={storefrontAction({ variant: "primary", size: "default", className: "mt-2" })}
              >
                Ürünleri İncele
              </button>
            </div>
          ) : (
            <>
              {/* Minimum sepet + ücretsiz teslimat ilerlemesi */}
              {(minBasketShortfall > 0 || threshold > 0) && (
                <div className="p-3.5 rounded-2xl bg-cream-surface border border-line space-y-2.5 shadow-2xs">
                  {minBasketShortfall > 0 ? (
                    <ProgressRow
                      text={
                        <>
                          Minimum sipariş için <strong className="text-ink">{formatMoney(minBasketShortfall)}</strong> daha ekleyin
                        </>
                      }
                      goal={`${formatMoney(settings.minBasketAmount)} minimum`}
                      ratio={subtotal / settings.minBasketAmount}
                    />
                  ) : subtotal >= threshold ? (
                    <span className="sf-success text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Teslimat ücretsiz!</span>
                    </span>
                  ) : (
                    <ProgressRow
                      text={
                        <>
                          Ücretsiz teslimata <strong className="text-ink">{formatMoney(threshold - subtotal)}</strong> kaldı
                        </>
                      }
                      goal={`${formatMoney(threshold)} hedefi`}
                      ratio={subtotal / threshold}
                    />
                  )}
                </div>
              )}

              {/* Teslimat */}
              <div className="space-y-1.5">
                <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider">
                  Teslimat
                </div>
                <div className="p-3 rounded-xl bg-cream-surface border border-line flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-ink shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-ink">
                      {shippingFee === 0
                        ? "Beylikdüzü içi kapıya ücretsiz teslim"
                        : "Beylikdüzü içi kapıya teslim"}
                    </div>
                    <div className="text-xs text-ink-muted">
                      Teslimat saati: {settings.deliveryWindow} · Minimum sepet sınırı yok
                    </div>
                  </div>
                </div>
              </div>

              {/* Teslim günü */}
              <div className="space-y-2">
                <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>Teslim Günü</span>
                </div>

                {!datesLoaded ? (
                  <div className="text-xs text-ink-muted flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uygun günler yükleniyor…
                  </div>
                ) : datesError ? null : dates.length === 0 ? (
                  <div className="sf-notice sf-warning">
                    {orderingBlockedReason}
                  </div>
                ) : (
                  <>
                    <fieldset id="checkout-dates" className="flex flex-wrap gap-1.5" aria-label="Teslim günü">
                      <legend className="sr-only">Teslim günü</legend>
                      {dates.map((d) => {
                        const selected = d.available && customerInfo.deliveryDate === d.date;
                        return (
                          <label
                            key={d.date}
                            title={d.reason ?? undefined}
                            className={`sf-choice ${selected ? "sf-choice--selected" : ""} ${!d.available ? "sf-choice--disabled line-through" : ""}`}
                          >
                            <input type="radio" name="deliveryDate" value={d.date} checked={selected} disabled={!d.available}
                              className="sr-only" onChange={() => {
                                setCustomerInfo({ deliveryDate: d.date });
                                setDateChange(null);
                                clearError("deliveryDate");
                              }} />
                            {d.label}
                          </label>
                        );
                      })}
                    </fieldset>
                    {unavailableReasons.length > 0 && (
                      <ul className="text-xs text-ink-muted space-y-0.5">
                        {unavailableReasons.slice(0, 3).map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    )}
                    {(() => {
                      const sel = dates.find((d) => d.date === customerInfo.deliveryDate);
                      return sel && sel.remainingCapacity !== null && sel.remainingCapacity <= 10 ? (
                        <div className="text-xs text-ink font-semibold">
                          Bu gün için son {sel.remainingCapacity} ekmeklik yer kaldı
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>

              {dateChange && <p role="status" className="sf-copy rounded-xl border border-line bg-cream-surface p-3 text-sm leading-relaxed text-ink">{dateChange}</p>}
              {datesError && <div role="alert" className="space-y-2 text-sm text-ink">
                <p>{datesError}</p>
                <button type="button" onClick={reloadDates} className={storefrontAction({ variant: "secondary", size: "default", className: "" })}>Teslim günlerini yeniden yükle</button>
              </div>}

              {/* Ürünler */}
              <div className="space-y-3">
                <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider">
                  Seçilen Ürünler
                </div>
                <div className="space-y-2.5">
                  {items.map((item) => {
                    const catalogProduct = allProducts.find(
                      (p) => p.id === item.productId
                    );
                    return (
                      <div
                        key={item.productId}
                        className="p-3 rounded-2xl bg-cream-surface border border-line space-y-2.5 shadow-2xs"
                      >
                        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 items-start">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-14 h-14 rounded-xl object-cover bg-line/40 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-serif font-bold text-sm text-ink break-words">
                              {item.name}
                            </div>
                            <div className="text-xs font-sans text-ink-muted mt-0.5">
                              {formatProductAmount({ weight: item.weight, weightUnit: item.weightUnit ?? catalogProduct?.weightUnit })} · {formatMoney(item.price)}
                            </div>
                            <div className="font-serif text-sm font-bold text-ink mt-1">
                              {formatMoney(item.price * item.quantity)}
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              aria-label={`${item.name} ürününü sepetten çıkar`}
                              className={storefrontAction({ variant: "danger", size: "icon", className: "" })}
                            >
                              <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center rounded-lg bg-line/40 border border-line">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.productId, item.quantity - 1)
                                }
                                aria-label="Azalt"
                                className={storefrontAction({ variant: "quiet", size: "icon", className: "flex items-center justify-center" })}
                              >
                                <Minus aria-hidden="true" className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-serif text-xs font-bold text-ink">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.productId, item.quantity + 1)
                                }
                                aria-label="Artır"
                                className={storefrontAction({ variant: "quiet", size: "icon", className: "flex items-center justify-center" })}
                              >
                                <Plus aria-hidden="true" className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-line/70">
                          <FoodComplianceNotice
                            product={catalogProduct ?? item}
                            variant="compact"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Birlikte iyi gider (admin'in seçtiği öneriler) */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider">
                    Birlikte iyi gider
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p, null, 1)}
                        className={storefrontAction({ variant: "secondary", size: "default", className: "flex items-center gap-1" })}
                      >
                        <Plus className="w-3 h-3" />
                        <span>
                          {p.name} (+{formatMoney(p.price)})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Müşteri ve adres */}
              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider">
                    Teslimat & İletişim Bilgileri
                  </div>
                  {isLoggedIn ? (
                    <span className="sf-success text-xs font-sans font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Müdavim Üye</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuthModal()}
                      className={storefrontAction({ variant: "quiet", size: "default", className: "hover:underline" })}
                    >
                      Giriş yap
                    </button>
                  )}
                </div>

                {isLoggedIn && addresses.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-cream-surface border border-line space-y-1.5">
                    <div className="text-xs font-sans text-ink-muted">Kayıtlı adreslerin:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            const matchedNh =
                              settings.neighborhoods.find(
                                (n) =>
                                  stripMah(n).toLocaleLowerCase("tr-TR") ===
                                  stripMah(addr.neighborhood).toLocaleLowerCase("tr-TR")
                              ) ?? "";
                            const mergedNote = mergeDirectionsIntoNote(
                              customerInfo.note,
                              addr.directions
                            );
                            setCustomerInfo({
                              neighborhood: matchedNh,
                              addressDetail: addr.addressDetail,
                              ...(mergedNote !== undefined ? { note: mergedNote } : {}),
                            });
                            if (matchedNh) clearError("neighborhood");
                            if (addr.addressDetail.trim().length >= 5) clearError("addressDetail");
                          }}
                          className={"sf-action sf-action--default " + (` flex items-center gap-1 ${
                            customerInfo.addressDetail === addr.addressDetail
                              ? "sf-action--primary "
                              : "sf-action--secondary "
                          }  `)}
                        >
                          <MapPin className="w-3 h-3 text-accent" />
                          <span>{addr.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="checkout-customer-name" className="sf-label block text-xs text-ink-muted mb-1">
                        Ad soyad *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-4" />
                        <input
                          id="checkout-customer-name"
                          name="name"
                          onFocus={markCheckoutStart}
                          type="text"
                          autoComplete="name"
                          value={customerInfo.name}
                          onChange={(e) => {
                            setCustomerInfo({ name: e.target.value });
                            clearError("name");
                          }}
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errors.name ? "checkout-name-error" : undefined}
                          enterKeyHint="next"
                          placeholder="Ad Soyad"
                          className="sf-field sf-field--leading-icon w-full"
                        />
                        {errors.name && (
                          <p id="checkout-name-error" role="alert" className="sf-copy mt-1 text-xs sf-error">
                            {errors.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="checkout-customer-phone" className="sf-label block text-xs text-ink-muted mb-1">
                        Cep Telefonu *
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-4" />
                        <input
                          id="checkout-customer-phone"
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={customerInfo.phone}
                          onChange={(e) => {
                            setCustomerInfo({ phone: e.target.value });
                            clearError("phone");
                          }}
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
                          enterKeyHint="next"
                          placeholder="05XX XXX XX XX"
                          className="sf-field sf-field--leading-icon w-full"
                        />
                        {errors.phone && (
                          <p id="checkout-phone-error" role="alert" className="sf-copy mt-1 text-xs sf-error">
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="checkout-neighborhood" className="sf-label block text-xs text-ink-muted mb-1">
                      Beylikdüzü Mahallesi *
                    </label>
                    <select
                      id="checkout-neighborhood"
                          name="neighborhood"
                      value={customerInfo.neighborhood}
                      onChange={(e) => {
                        setCustomerInfo({ neighborhood: e.target.value });
                        clearError("neighborhood");
                      }}
                      aria-invalid={Boolean(errors.neighborhood)}
                      aria-describedby={errors.neighborhood ? "checkout-neighborhood-error" : undefined}
                      autoComplete="address-level3"
                      className="sf-field w-full"
                    >
                      <option value="">Mahalle seçin…</option>
                      {settings.neighborhoods.map((nh) => (
                        <option key={nh} value={nh}>
                          {nh} Mah.
                        </option>
                      ))}
                    </select>
                    {errors.neighborhood && (
                      <p id="checkout-neighborhood-error" role="alert" className="sf-copy mt-1 text-xs sf-error">
                        {errors.neighborhood}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="checkout-address-detail" className="sf-label block text-xs text-ink-muted mb-1">
                      Açık Adres (Cadde / Sokak / Bina / Daire) *
                    </label>
                    <textarea
                      id="checkout-address-detail"
                      rows={2}
                      autoComplete="street-address"
                      value={customerInfo.addressDetail}
                      onChange={(e) => {
                        setCustomerInfo({ addressDetail: e.target.value });
                        clearError("addressDetail");
                      }}
                      aria-invalid={Boolean(errors.addressDetail)}
                      aria-describedby={errors.addressDetail ? "checkout-address-error" : undefined}
                      placeholder="Örn: Çiftlik Cad. No: 14 D: 6"
                      className="sf-field w-full"
                    />
                    {errors.addressDetail && (
                      <p id="checkout-address-error" role="alert" className="sf-copy mt-1 text-xs sf-error">
                        {errors.addressDetail}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      {hasLocation ? (
                        <span className="sf-success text-xs flex items-center gap-1">
                          <CheckCircle2 aria-hidden="true" className="w-3 h-3" /> Konumunuz kuryeye iletilecek
                          <button
                            type="button"
                            onClick={() => setLocation(null, null)}
                            className={storefrontAction({ variant: "quiet", size: "default", className: "ml-1 underline" })}
                          >
                            kaldır
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={locating}
                          onClick={handleGetLocation}
                          className={storefrontAction({ variant: "quiet", size: "default", className: "flex items-center gap-1 disabled:opacity-50" })}
                          title="Kuryenin kapınızı kolay bulması için konumunuzu siparişe ekler (isteğe bağlı)"
                        >
                          {locating ? (
                            <Loader2 aria-hidden="true" className="w-3 h-3 animate-spin" />
                          ) : (
                            <Navigation aria-hidden="true" className="w-3 h-3" />
                          )}
                          <span>{locating ? "Konum alınıyor…" : "Konumumu ekle (isteğe bağlı)"}</span>
                        </button>
                      )}
                      <Link
                        href="/kvkk#konum-verisi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sf-link text-xs underline text-ink-muted hover:text-accent transition-colors"
                      >
                        Konum aydınlatması
                      </Link>
                    </div>
                    {!hasLocation && (
                      <p className="sf-copy text-xs text-ink-muted mt-1">
                        Konumun yalnızca kapını bulmak için kuryeye gösterilir; butona basmazsan paylaşılmaz.
                      </p>
                    )}
                    {locateError && <div className="text-xs text-warn mt-1">{locateError}</div>}
                    {canSaveAddress && (
                      <label className="sf-label mt-1.5 flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveThisAddress}
                          onChange={(e) => setSaveThisAddress(e.target.checked)}
                          className="sf-check h-3.5 w-3.5 accent-accent"
                        />
                        Bu adresi sonraki siparişlerim için kaydet
                      </label>
                    )}
                  </div>

                  <div>
                    <label htmlFor="checkout-order-note" className="sf-label block text-xs text-ink-muted mb-1">
                      Sipariş Notu (İsteğe bağlı)
                    </label>
                    <input
                      id="checkout-order-note"
                      type="text"
                      maxLength={300}
                      value={customerInfo.note || ""}
                      onChange={(e) => setCustomerInfo({ note: e.target.value })}
                      placeholder="Örn: Zili çalmayınız, kapıya asınız."
                      className="sf-field w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Ödeme yöntemi + özet */}
              <div className="space-y-2 pt-2 border-t border-line">
                <div className="text-xs font-sans font-semibold text-ink uppercase tracking-wider">
                  Ödeme (teslimatta)
                </div>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ödeme yöntemi">
                  {(
                    [
                      ["cash_on_delivery", "Kapıda nakit"],
                      ["pos_at_door", "Kapıda kart"],
                    ] as const
                  ).map(([value, label]) => (
                      <label
                      key={value}
                        className={`sf-choice justify-center ${paymentMethod === value ? "sf-choice--selected" : ""}`}
                    >
                        <input type="radio" name="paymentMethod" value={value} checked={paymentMethod === value}
                          onChange={() => setPaymentMethod(value)} className="sr-only" />
                      {label}
                      </label>
                  ))}
                </div>
                <div className="space-y-1 font-sans text-sm text-ink-muted pt-1">
                  <div className="flex items-center justify-between">
                    <span>Ara toplam</span>
                    <span className="text-ink font-serif font-bold">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Teslimat</span>
                    <span className={shippingFee === 0 ? "sf-success font-bold" : "text-ink"}>
                      {shippingFee === 0 ? "ÜCRETSİZ" : formatMoney(shippingFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-ink">
                    <span className="font-serif">Genel toplam</span>
                    <span className="text-lg font-serif text-ink">{formatMoney(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CheckoutActions>
      </div>
    </Modal>
  );
}

function ProgressRow({ text, goal, ratio }: { text: React.ReactNode; goal: string; ratio: number }) {
  return (
    <>
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="text-ink-muted font-medium">{text}</span>
        <span className="text-xs font-sans text-ink-muted shrink-0">{goal}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-line/40 overflow-hidden border border-line">
        <div
          className="h-full bg-gradient-to-r from-accent via-warn to-accent transition-all duration-500 rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
      </div>
    </>
  );
}
