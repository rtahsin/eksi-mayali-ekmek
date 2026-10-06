/** Sipariş formu doğrulaması: istemci ve sunucu aynı telefon/mahalle kurallarını kullanır. */

/** "Barış Mah." / "Barış Mahallesi" → "Barış" */
export const stripMah = (value: string) => value.replace(/\s+Mah(\.|allesi)?$/i, "").trim();

/** Telefonu tek biçime getirir: 05XXXXXXXXX; geçersizse null. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("5")) digits = `0${digits}`;
  return /^05\d{9}$/.test(digits) ? digits : null;
}

export type CheckoutField = "deliveryDate" | "name" | "phone" | "neighborhood" | "addressDetail" | "terms";
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

export interface CheckoutFormValues {
  deliveryDate: string;
  name: string;
  phone: string;
  neighborhood: string;
  addressDetail: string;
  termsAccepted: boolean;
}

/** Tüm eksikleri aynı anda döndürür (ilk hata değil). */
export function validateCheckout(v: CheckoutFormValues): CheckoutErrors {
  const e: CheckoutErrors = {};
  if (!v.deliveryDate) e.deliveryDate = "Lütfen bir teslim günü seçin.";
  if (v.name.trim().length < 2) e.name = "Lütfen ad ve soyadınızı yazın.";
  if (!normalizePhone(v.phone)) e.phone = "Geçerli bir cep telefonu yazın (05XX XXX XX XX).";
  if (!v.neighborhood) e.neighborhood = "Lütfen mahallenizi seçin.";
  if (v.addressDetail.trim().length < 5) e.addressDetail = "Kapıyı bulabilmemiz için açık adresi yazın.";
  if (!v.termsAccepted) e.terms = "Devam etmek için sözleşmeyi onaylayın.";
  return e;
}

/** Hata alanlarının sayfadaki sırası (ilk hataya kaydırmak için). */
export const CHECKOUT_FIELD_ORDER: CheckoutField[] = ["deliveryDate", "name", "phone", "neighborhood", "addressDetail", "terms"];
