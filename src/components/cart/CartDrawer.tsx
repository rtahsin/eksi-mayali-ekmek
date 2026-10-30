"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useDeliveryDates, useStoreSettings } from "@/hooks/useStoreSettings";
import { computeShippingFee } from "@/lib/settings/schema";
import { CheckoutActions } from "./CheckoutActions";
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

const formatTl = (value: number) => `${value.toLocaleString("tr-TR")} ₺`;

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

  const { settings } = useStoreSettings();
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
  const [paymentMethod, setPaymentMethod] = useState<Exclude<CheckoutPaymentMethod, "whatsapp">>("cash_on_delivery");
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const startedRef = React.useRef(false);
  const markCheckoutStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("checkout_start", { once: true });
  };
  const clearError = (field: keyof CheckoutErrors) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Seçili gün artık uygun değilse (cutoff, satış günü, limit, kapasite…) ilk uygun güne geç
  useEffect(() => {
    if (!datesLoaded) return;
    const firstAvailable = dates.find((d) => d.available);
    if (!firstAvailable) {
      if (customerInfo.deliveryDate) setCustomerInfo({ deliveryDate: "" });
      return;
    }
    if (!dates.some((d) => d.available && d.date === customerInfo.deliveryDate)) {
      setCustomerInfo({ deliveryDate: firstAvailable.date });
    }
  }, [dates, datesLoaded, customerInfo.deliveryDate, setCustomerInfo]);

  // Mahalle ayarlardaki listede değilse seçimi boşalt
  useEffect(() => {
    if (customerInfo.neighborhood && !settings.neighborhoods.includes(customerInfo.neighborhood)) {
      setCustomerInfo({ neighborhood: "" });
    }
  }, [settings.neighborhoods, customerInfo.neighborhood, setCustomerInfo]);

  // Giriş yapmış müşterinin bilgilerini boş alanlara doldur
  useEffect(() => {
    if (!isLoggedIn || !profile) return;
    const patch: Partial<typeof customerInfo> = {};
    if (!customerInfo.name && profile.fullName) patch.name = profile.fullName;
    if (!customerInfo.phone && profile.phone) patch.phone = profile.phone;
    if (Object.keys(patch).length > 0) setCustomerInfo(patch);
  }, [isLoggedIn, profile, customerInfo.name, customerInfo.phone, setCustomerInfo]);

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

  // ESC ile kapat
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const orderingBlockedReason = !settings.orderAcceptanceOpen
    ? "Şu an sipariş almıyoruz. Lütfen daha sonra tekrar deneyin."
    : datesLoaded && dates.length === 0
    ? "Önümüzdeki günlerde teslimat günümüz bulunmuyor."
    : datesLoaded && items.length > 0 && availableDates.length === 0
    ? unavailableReasons[0] ?? "Sepetiniz için uygun teslim günü bulunamadı."
    : datesError;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Sepetim">
      <div className="fixed inset-0 bg-black/70 transition-opacity animate-fadeIn" onClick={closeCart} />

      <div className="relative z-10 w-full max-w-md bg-bg border-l border-line h-full flex flex-col shadow-2xl overflow-hidden animate-slideLeft">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-cream-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
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
            onClick={closeCart}
            aria-label="Sepeti kapat"
            className="p-2 rounded-lg touch-target-44 text-ink-muted hover:text-ink hover:bg-line/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
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
                <p className="text-xs text-ink-muted max-w-xs font-sans">
                  Taş fırında taze pişen ekşi mayalı ekmeklerimizden ve şarküteri ürünlerimizden seçin.
                </p>
              </div>
              <button
                onClick={closeCart}
                className="mt-2 px-6 py-2.5 rounded-xl touch-target-44 bg-artisan-terracotta text-white font-sans text-xs font-semibold hover:bg-artisan-terracotta-dark transition-colors shadow-xs"
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
                          Minimum sipariş için <strong className="text-accent">{formatTl(minBasketShortfall)}</strong> daha ekleyin
                        </>
                      }
                      goal={`${formatTl(settings.minBasketAmount)} minimum`}
                      ratio={subtotal / settings.minBasketAmount}
                    />
                  ) : subtotal >= threshold ? (
                    <span className="text-good text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Teslimat ücretsiz!</span>
                    </span>
                  ) : (
                    <ProgressRow
                      text={
                        <>
                          Ücretsiz teslimata <strong className="text-accent">{formatTl(threshold - subtotal)}</strong> kaldı
                        </>
                      }
                      goal={`${formatTl(threshold)} hedefi`}
                      ratio={subtotal / threshold}
                    />
                  )}
                </div>
              )}

              {/* Teslimat */}
              <div className="space-y-1.5">
                <div className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                  Teslimat
                </div>
                <div className="p-3 rounded-xl bg-cream-surface border border-line flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-ink">Beylikdüzü içi kapıya teslim</div>
                    <div className="text-xs text-ink-muted">
                      Teslimat saati: {settings.deliveryWindow}
                    </div>
                  </div>
                </div>
              </div>

              {/* Teslim günü */}
              <div className="space-y-2">
                <div className="text-xs font-sans font-semibold text-accent uppercase tracking-wider flex items-center justify-between">
                  <span>Teslim Günü</span>
                  <span className="text-xs text-ink-muted font-normal normal-case">
                    Aynı gün için son sipariş {settings.orderCutoffTime}
                  </span>
                </div>

                {!datesLoaded ? (
                  <div className="text-xs text-ink-muted flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uygun günler yükleniyor…
                  </div>
                ) : dates.length === 0 ? (
                  <div className="text-xs text-ink bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                    {orderingBlockedReason}
                  </div>
                ) : (
                  <>
                    <div id="checkout-dates" className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Teslim günü">
                      {dates.map((d) => {
                        const selected = d.available && customerInfo.deliveryDate === d.date;
                        return (
                          <button
                            key={d.date}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-disabled={!d.available}
                            disabled={!d.available}
                            title={d.reason ?? undefined}
                            onClick={() => {
                              if (!d.available) return;
                              setCustomerInfo({ deliveryDate: d.date });
                              clearError("deliveryDate");
                            }}
                            className={`px-3 py-2 rounded-xl border font-sans text-xs transition-all ${
                              !d.available
                                ? "bg-line/20 border-line/50 text-ink-muted/50 line-through cursor-not-allowed"
                                : selected
                                ? "bg-artisan-terracotta text-white font-semibold border-accent shadow-xs"
                                : "bg-cream-surface border-line text-ink-muted hover:text-ink"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
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
                        <div className="text-xs text-accent font-semibold">
                          Bu gün için son {sel.remainingCapacity} ekmeklik yer kaldı
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>

              {/* Ürünler */}
              <div className="space-y-3">
                <div className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                  Seçilen Ürünler
                </div>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 rounded-2xl bg-cream-surface border border-line flex gap-3 items-center justify-between shadow-2xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover bg-line/40 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-serif font-bold text-xs sm:text-sm text-ink truncate">{item.name}</div>
                        <div className="text-xs font-sans text-ink-muted mt-0.5">
                          {item.weight}gr · {formatTl(item.price)}
                        </div>
                        <div className="font-serif text-sm font-bold text-ink mt-1">
                          {formatTl(item.price * item.quantity)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          aria-label={`${item.name} ürününü sepetten çıkar`}
                          className="touch-target-44 text-ink-muted hover:text-bad transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center rounded-lg bg-line/40 border border-line">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            aria-label="Azalt"
                            className="touch-target-44 w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-serif text-xs font-bold text-ink">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            aria-label="Artır"
                            className="touch-target-44 w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Birlikte iyi gider (admin'in seçtiği öneriler) */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                    Birlikte iyi gider
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p, null, 1)}
                        className="px-2.5 py-1.5 rounded-lg bg-line/40 hover:bg-cream-surface text-ink border border-line text-xs font-sans flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>
                          {p.name} (+{formatTl(p.price)})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Müşteri ve adres */}
              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                    Teslimat & İletişim Bilgileri
                  </div>
                  {isLoggedIn ? (
                    <span className="text-xs font-sans text-good font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Müdavim Üye</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuthModal()}
                      className="text-xs font-sans text-accent hover:underline font-bold"
                    >
                      Giriş Yap
                    </button>
                  )}
                </div>

                {isLoggedIn && addresses.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-cream-surface border border-line space-y-1.5">
                    <div className="text-xs font-sans text-ink-muted">Kayıtlı adresleriniz:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() =>
                            setCustomerInfo({
                              neighborhood: stripMah(addr.neighborhood),
                              addressDetail: addr.addressDetail,
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-sans border transition-all flex items-center gap-1 ${
                            customerInfo.addressDetail === addr.addressDetail
                              ? "bg-accent/10 text-accent border-accent/40 font-bold shadow-2xs"
                              : "bg-line/40 border-line text-ink-muted hover:text-ink"
                          }`}
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
                      <label htmlFor="checkout-customer-name" className="block text-xs text-ink-muted mb-1">
                        Adınız Soyadınız *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-ink-muted/60 absolute left-2.5 top-2.5" />
                        <input
                          id="checkout-customer-name"
                          onFocus={markCheckoutStart}
                          type="text"
                          autoComplete="name"
                          value={customerInfo.name}
                          onChange={(e) => {
                            setCustomerInfo({ name: e.target.value });
                            clearError("name");
                          }}
                          aria-invalid={Boolean(errors.name)}
                          enterKeyHint="next"
                          placeholder="Ad Soyad"
                          className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-cream-surface border border-line text-base text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                        />
                        {errors.name && (
                          <p role="alert" className="mt-1 text-xs text-bad">
                            {errors.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="checkout-customer-phone" className="block text-xs text-ink-muted mb-1">
                        Cep Telefonu *
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-ink-muted/60 absolute left-2.5 top-2.5" />
                        <input
                          id="checkout-customer-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={customerInfo.phone}
                          onChange={(e) => {
                            setCustomerInfo({ phone: e.target.value });
                            clearError("phone");
                          }}
                          aria-invalid={Boolean(errors.phone)}
                          enterKeyHint="next"
                          placeholder="05XX XXX XX XX"
                          className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-cream-surface border border-line text-base text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                        />
                        {errors.phone && (
                          <p role="alert" className="mt-1 text-xs text-bad">
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="checkout-neighborhood" className="block text-xs text-ink-muted mb-1">
                      Beylikdüzü Mahallesi *
                    </label>
                    <select
                      id="checkout-neighborhood"
                      value={customerInfo.neighborhood}
                      onChange={(e) => {
                        setCustomerInfo({ neighborhood: e.target.value });
                        clearError("neighborhood");
                      }}
                      aria-invalid={Boolean(errors.neighborhood)}
                      autoComplete="address-level3"
                      className="w-full px-2.5 py-2 rounded-xl bg-cream-surface border border-line text-base text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    >
                      <option value="">Mahalle seçin…</option>
                      {settings.neighborhoods.map((nh) => (
                        <option key={nh} value={nh}>
                          {nh} Mah.
                        </option>
                      ))}
                    </select>
                    {errors.neighborhood && (
                      <p role="alert" className="mt-1 text-xs text-bad">
                        {errors.neighborhood}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="checkout-address-detail" className="block text-xs text-ink-muted mb-1">
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
                      placeholder="Örn: Çiftlik Cad. No: 14 D: 6"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-cream-surface border border-line text-base text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
                    />
                    {errors.addressDetail && (
                      <p role="alert" className="mt-1 text-xs text-bad">
                        {errors.addressDetail}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {hasLocation ? (
                        <span className="text-xs text-good flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Konumunuz kuryeye iletilecek
                          <button
                            type="button"
                            onClick={() => setLocation(null, null)}
                            className="ml-1 underline text-ink-muted hover:text-ink"
                          >
                            kaldır
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={locating}
                          onClick={handleGetLocation}
                          className="text-xs font-semibold text-accent flex items-center gap-1 disabled:opacity-50"
                          title="Kuryenin kapınızı kolay bulması için konumunuzu siparişe ekler (isteğe bağlı)"
                        >
                          {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                          <span>{locating ? "Konum alınıyor…" : "Konumumu ekle (isteğe bağlı)"}</span>
                        </button>
                      )}
                    </div>
                    {!hasLocation && (
                      <p className="text-xs text-ink-muted mt-1">
                        Konumun yalnızca kapını bulmak için kuryeye gösterilir; butona basmazsan paylaşılmaz.
                      </p>
                    )}
                    {locateError && <div className="text-xs text-warn mt-1">{locateError}</div>}
                    {canSaveAddress && (
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveThisAddress}
                          onChange={(e) => setSaveThisAddress(e.target.checked)}
                          className="h-3.5 w-3.5 accent-accent"
                        />
                        Bu adresi sonraki siparişlerim için kaydet
                      </label>
                    )}
                  </div>

                  <div>
                    <label htmlFor="checkout-order-note" className="block text-xs text-ink-muted mb-1">
                      Sipariş Notu (İsteğe bağlı)
                    </label>
                    <input
                      id="checkout-order-note"
                      type="text"
                      maxLength={300}
                      value={customerInfo.note || ""}
                      onChange={(e) => setCustomerInfo({ note: e.target.value })}
                      placeholder="Örn: Zili çalmayınız, kapıya asınız."
                      className="w-full px-2.5 py-2 rounded-xl bg-cream-surface border border-line text-base text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Ödeme yöntemi + özet */}
              <div className="space-y-2 pt-2 border-t border-line">
                <div className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                  Ödeme (teslimatta)
                </div>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ödeme yöntemi">
                  {(
                    [
                      ["cash_on_delivery", "Kapıda nakit"],
                      ["pos_at_door", "Kapıda kart"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === value}
                      onClick={() => setPaymentMethod(value)}
                      className={`touch-target-44 py-3 rounded-xl border font-sans text-sm transition-all ${
                        paymentMethod === value
                          ? "bg-accent/10 border-accent text-ink font-semibold"
                          : "bg-cream-surface border-line text-ink-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1 font-sans text-sm text-ink-muted pt-1">
                  <div className="flex items-center justify-between">
                    <span>Ara toplam</span>
                    <span className="text-ink font-serif font-bold">{formatTl(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Teslimat</span>
                    <span className={shippingFee === 0 ? "text-good font-bold" : "text-ink"}>
                      {shippingFee === 0 ? "ÜCRETSİZ" : formatTl(shippingFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-ink">
                    <span className="font-serif">Genel toplam</span>
                    <span className="text-lg font-serif text-accent">{formatTl(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="px-4 sm:px-5 pt-2.5 border-t border-line bg-cream-surface space-y-2"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          >
            <CheckoutActions
              paymentMethod={paymentMethod}
              totalAmount={totalAmount}
              errors={errors}
              onErrors={setErrors}
              minBasketShortfall={minBasketShortfall}
              orderingBlockedReason={orderingBlockedReason}
              onDatesStale={() => void reloadDates()}
              onOrderPlaced={handleOrderPlaced}
            />
          </div>
        )}
      </div>
    </div>
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
