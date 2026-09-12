function sanitizeIdempotencyKey(idempotencyKey) {
  return String(idempotencyKey).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function normalizeOptionalText(value, maxLength = 120) {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeStructuredAddress(structuredAddress) {
  if (structuredAddress == null) {
    return null;
  }

  if (typeof structuredAddress !== 'object' || Array.isArray(structuredAddress)) {
    return null;
  }

  const normalized = {
    city: normalizeOptionalText(structuredAddress.city, 80),
    district: normalizeOptionalText(structuredAddress.district, 80),
    neighborhood: normalizeOptionalText(structuredAddress.neighborhood, 120),
    street: normalizeOptionalText(structuredAddress.street, 160),
    buildingNo: normalizeOptionalText(structuredAddress.buildingNo, 20),
    apartment: normalizeOptionalText(structuredAddress.apartment, 20),
    doorNo: normalizeOptionalText(structuredAddress.doorNo, 20),
    site: normalizeOptionalText(structuredAddress.site, 80),
    block: normalizeOptionalText(structuredAddress.block, 20),
  };

  return normalized;
}

function hasStructuredAddressCoreFields(structuredAddress) {
  if (!structuredAddress) return false;
  return Boolean(structuredAddress.neighborhood && structuredAddress.street);
}

const BEYLIKDUZU_POLYGON = [
  [41.0726, 28.5734],
  [41.0477, 28.6210],
  [41.0094, 28.6640],
  [40.9829, 28.7032],
  [40.9573, 28.6998],
  [40.9414, 28.6655],
  [40.9488, 28.6244],
  [40.9733, 28.5905],
  [41.0111, 28.5662],
  [41.0472, 28.5587],
];

function isValidLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function validateCoordinates(latitude, longitude) {
  if (latitude == null && longitude == null) {
    return { ok: true };
  }

  if (latitude == null || longitude == null) {
    return {
      ok: false,
      code: 'INVALID_COORDINATES',
      message: 'Konum bilgisi eksik',
    };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return {
      ok: false,
      code: 'INVALID_COORDINATES',
      message: 'Koordinat aralığı geçersiz',
    };
  }

  return { ok: true, latitude: lat, longitude: lng };
}

function isPointInPolygon(latitude, longitude, polygon = BEYLIKDUZU_POLYGON) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0];
    const xi = polygon[i][1];
    const yj = polygon[j][0];
    const xj = polygon[j][1];

    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi || 0.0000001) + xi;

    if (intersects) inside = !inside;
  }
  return inside;
}

const BEYLIKDUZU_NEIGHBORHOODS = [
  'adnan kahveci',
  'barış',
  'büyükşehir',
  'cumhuriyet',
  'dereağzı',
  'gürpınar',
  'kavaklı',
  'sahil',
  'yakuplu',
  'marmara',
];

function normalizeNeighborhoodToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s*mah\.?$/i, '')
    .trim();
}

function inferFromStructuredAddress(structuredAddress) {
  if (!structuredAddress) return 'cargo';

  const district = String(structuredAddress.district || '')
    .trim()
    .toLowerCase();
  if (district.includes('beylikdüzü') || district.includes('beylikduzu')) {
    return 'same_day';
  }

  const neighborhood = normalizeNeighborhoodToken(structuredAddress.neighborhood);
  if (!neighborhood) return 'cargo';

  for (const canonical of BEYLIKDUZU_NEIGHBORHOODS) {
    if (neighborhood.includes(canonical) || canonical.includes(neighborhood)) {
      return 'same_day';
    }
  }

  return 'cargo';
}

function resolveFulfillmentFromCoordinates(
  latitude,
  longitude,
  polygon = BEYLIKDUZU_POLYGON,
  structuredAddress = null,
) {
  const coordinateValidation = validateCoordinates(latitude, longitude);
  if (!coordinateValidation.ok) {
    return coordinateValidation;
  }

  if (coordinateValidation.latitude == null || coordinateValidation.longitude == null) {
    return {
      ok: true,
      fulfillmentType: inferFromStructuredAddress(structuredAddress) || 'cargo',
      latitude: null,
      longitude: null,
    };
  }

  const inside = isPointInPolygon(
    coordinateValidation.latitude,
    coordinateValidation.longitude,
    polygon,
  );

  return {
    ok: true,
    latitude: coordinateValidation.latitude,
    longitude: coordinateValidation.longitude,
    fulfillmentType: inside ? 'same_day' : 'cargo',
  };
}

function parseShippingPolicy(rawPolicy = {}) {
  const flatFee = Number(rawPolicy.flatFee ?? 150);
  const freeShippingThreshold = Number(rawPolicy.freeShippingThreshold ?? 1000);
  return {
    flatFee: Number.isFinite(flatFee) && flatFee >= 0 ? flatFee : 150,
    freeShippingThreshold:
      Number.isFinite(freeShippingThreshold) && freeShippingThreshold >= 0
        ? freeShippingThreshold
        : 1000,
  };
}

function calculateShippingFee(subtotal, shippingPolicy = {}) {
  const { flatFee, freeShippingThreshold } = parseShippingPolicy(shippingPolicy);
  const normalizedSubtotal = Number(subtotal);
  if (!Number.isFinite(normalizedSubtotal) || normalizedSubtotal <= 0) {
    return 0;
  }
  if (normalizedSubtotal >= freeShippingThreshold) {
    return 0;
  }
  return flatFee;
}

function validateLocationUrl(locationUrl) {
  if (locationUrl == null) {
    return { ok: true };
  }

  const trimmed = String(locationUrl).trim();
  if (!trimmed) {
    return { ok: true, locationUrl: null };
  }

  if (trimmed.length > 500) {
    return {
      ok: false,
      code: 'INVALID_LOCATION_URL',
      message: 'Konum bağlantısı çok uzun',
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        ok: false,
        code: 'INVALID_LOCATION_URL',
        message: 'Konum bağlantısı formatı geçersiz',
      };
    }

    return { ok: true, locationUrl: trimmed };
  } catch (_) {
    return {
      ok: false,
      code: 'INVALID_LOCATION_URL',
      message: 'Konum bağlantısı formatı geçersiz',
    };
  }
}

function validateCreateOrderPayload(body = {}) {
  const {
    idempotencyKey,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    structuredAddress,
    addressDescription,
    items,
  } = body;

  if (!idempotencyKey || !customerName || !customerPhone || !shippingAddress) {
    return {
      ok: false,
      code: 'INVALID_ORDER_DATA',
      message: 'Sipariş alanları eksik',
    };
  }

  const emailRaw = customerEmail == null ? '' : String(customerEmail).trim();
  if (emailRaw) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw);
    if (!emailOk) {
      return {
        ok: false,
        code: 'INVALID_ORDER_DATA',
        message: 'E-posta adresi geçersiz',
      };
    }
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return {
      ok: false,
      code: 'INVALID_ORDER_ITEMS',
      message: 'Sipariş ürünleri geçersiz',
    };
  }

  const hasInvalidProductId = items.some((item) => !(item && item.productId));
  if (hasInvalidProductId) {
    return {
      ok: false,
      code: 'INVALID_ORDER_ITEMS',
      message: 'Ürün kimlikleri geçersiz',
    };
  }

  if (structuredAddress != null && (typeof structuredAddress !== 'object' || Array.isArray(structuredAddress))) {
    return {
      ok: false,
      code: 'INVALID_ORDER_ADDRESS',
      message: 'Yapılandırılmış adres formatı geçersiz',
    };
  }

  if (addressDescription != null && String(addressDescription).trim().length > 1000) {
    return {
      ok: false,
      code: 'INVALID_ORDER_ADDRESS',
      message: 'Adres açıklaması çok uzun',
    };
  }

  const normalizedStructuredAddress = normalizeStructuredAddress(structuredAddress);
  const normalizedAddressDescription =
    addressDescription == null ? '' : String(addressDescription).trim();
  if (!hasStructuredAddressCoreFields(normalizedStructuredAddress) && !normalizedAddressDescription) {
    return {
      ok: false,
      code: 'INVALID_ORDER_ADDRESS',
      message: 'Adres bilgisi eksik',
    };
  }

  return { ok: true };
}

const ALLOWED_DELIVERY_WINDOWS = [
  '10:00-12:00',
  '12:00-14:00',
  '14:00-16:00',
  '16:00-18:00',
  '18:00-20:00',
];

/** Müşteri tercih saat aralığı; geçersizse null. */
function normalizePreferredDeliveryWindow(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (ALLOWED_DELIVERY_WINDOWS.includes(trimmed)) return trimmed;
  return null;
}

/**
 * Saat penceresi zorunlu mu?
 * Staff manuel sipariş ve saf MTO (deliveryDate null) için zorunlu değil.
 */
function isPreferredDeliveryWindowRequired({
  isStaffManualOrder = false,
  onlyMadeToOrder = false,
} = {}) {
  if (isStaffManualOrder) return false;
  if (onlyMadeToOrder) return false;
  return true;
}

/** WhatsApp / FCM ile uyumlu kısa sipariş kodu (doc id ilk 8 karakter, büyük harf). */
function formatShortOrderNumber(orderId) {
  const id = orderId == null ? '' : String(orderId).trim();
  if (!id) return '';
  return id.substring(0, 8).toUpperCase();
}

function readProductMadeToOrder(productData = {}) {
  if (productData.madeToOrder === true) return true;
  const mode = String(productData.fulfillmentMode || '')
    .trim()
    .toLowerCase();
  return mode === 'made_to_order' || mode === 'madetoorder';
}

/**
 * TR telefon normalizasyonu → 10 hane (5XXXXXXXXX).
 * Geçersizse null.
 */
function normalizeTurkishPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('90') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10 || !digits.startsWith('5')) {
    return null;
  }
  return digits;
}

/**
 * Aynı telefon ile 5 dakika içinde yeni sipariş engeli.
 */
function evaluatePhoneOrderRateLimit({
  lastOrderAtMs = 0,
  nowMs = Date.now(),
  windowMs = 5 * 60 * 1000,
}) {
  const last = Number(lastOrderAtMs || 0);
  if (last > 0 && nowMs - last < windowMs) {
    const blockedUntilMs = last + windowMs;
    return {
      allowed: false,
      code: 'PHONE_ORDER_RATE_LIMITED',
      message:
        'Bu telefon numarası ile kısa süre önce sipariş verildi. Lütfen birkaç dakika sonra tekrar deneyin.',
      blockedUntilMs,
      remainingMs: blockedUntilMs - nowMs,
    };
  }

  return { allowed: true };
}

function evaluateRateLimitState({
  nowMs,
  blockedUntilMs = 0,
  windowStartAtMs,
  successCount = 0,
  windowMs = 10 * 60 * 1000,
  blockMs = 60 * 60 * 1000,
}) {
  if (blockedUntilMs && nowMs < blockedUntilMs) {
    return {
      allowed: false,
      code: 'ORDER_RATE_LIMITED',
      message: '1 saat boyunca sipariş veremezsiniz',
      blockedUntilMs,
    };
  }

  let normalizedWindowStartAtMs = windowStartAtMs || nowMs;
  let normalizedSuccessCount = Number(successCount || 0);

  if (nowMs - normalizedWindowStartAtMs > windowMs) {
    normalizedWindowStartAtMs = nowMs;
    normalizedSuccessCount = 0;
  }

  if (normalizedSuccessCount >= 3) {
    return {
      allowed: false,
      code: 'ORDER_RATE_LIMITED',
      message: 'Kısa sürede çok fazla sipariş oluşturuldu',
      blockedUntilMs: nowMs + blockMs,
      windowStartAtMs: normalizedWindowStartAtMs,
      successCount: normalizedSuccessCount,
    };
  }

  return {
    allowed: true,
    windowStartAtMs: normalizedWindowStartAtMs,
    successCount: normalizedSuccessCount,
  };
}

/**
 * Delivery date resolution.
 * - onlyMadeToOrder → null (fırın sonra bildirir)
 * - anyUnavailable (isAvailable===false) → tomorrow
 * - else activeDeliveryDate (default tomorrow)
 * Does NOT decrement stock. isActive===false products are discontinued.
 */
function formatDateYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Calendar YYYY-MM-DD in Europe/Istanbul (not server/UTC local). */
function istanbulYmd(nowMs = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));
}

/**
 * Tomorrow's calendar date in Europe/Istanbul.
 * Avoids UTC setHours drift around TR midnight (UTC+3).
 */
function tomorrowYmd(nowMs = Date.now()) {
  const today = istanbulYmd(nowMs);
  const [y, m, d] = today.split('-').map((v) => Number(v));
  const next = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function resolveActiveDeliveryDate(activeDeliveryDate, nowMs = Date.now()) {
  const raw = activeDeliveryDate == null ? '' : String(activeDeliveryDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  return tomorrowYmd(nowMs);
}

function resolveOrderDeliveryDate({
  anyUnavailable,
  onlyMadeToOrder = false,
  activeDeliveryDate,
  nowMs = Date.now(),
}) {
  if (onlyMadeToOrder) {
    return null;
  }
  if (anyUnavailable) {
    return tomorrowYmd(nowMs);
  }
  return resolveActiveDeliveryDate(activeDeliveryDate, nowMs);
}

/** Staff manual order may pin YYYY-MM-DD; invalid/empty → null (caller uses resolve). */
function parseStaffDeliveryDateOverride(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

/** Staff may force same_day | cargo; otherwise null. */
function parseStaffFulfillmentOverride(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim().toLowerCase();
  if (trimmed === 'same_day' || trimmed === 'cargo') return trimmed;
  return null;
}

module.exports = {
  BEYLIKDUZU_POLYGON,
  sanitizeIdempotencyKey,
  normalizeStructuredAddress,
  hasStructuredAddressCoreFields,
  validateCoordinates,
  isPointInPolygon,
  resolveFulfillmentFromCoordinates,
  inferFromStructuredAddress,
  parseShippingPolicy,
  calculateShippingFee,
  validateLocationUrl,
  validateCreateOrderPayload,
  ALLOWED_DELIVERY_WINDOWS,
  normalizePreferredDeliveryWindow,
  isPreferredDeliveryWindowRequired,
  formatShortOrderNumber,
  readProductMadeToOrder,
  evaluateRateLimitState,
  normalizeTurkishPhone,
  evaluatePhoneOrderRateLimit,
  formatDateYmd,
  istanbulYmd,
  tomorrowYmd,
  resolveActiveDeliveryDate,
  resolveOrderDeliveryDate,
  parseStaffDeliveryDateOverride,
  parseStaffFulfillmentOverride,
};
