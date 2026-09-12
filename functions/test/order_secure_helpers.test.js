const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeIdempotencyKey,
  normalizeStructuredAddress,
  hasStructuredAddressCoreFields,
  validateCreateOrderPayload,
  evaluateRateLimitState,
  normalizeTurkishPhone,
  evaluatePhoneOrderRateLimit,
  resolveFulfillmentFromCoordinates,
  inferFromStructuredAddress,
  calculateShippingFee,
  parseShippingPolicy,
  isPointInPolygon,
  BEYLIKDUZU_POLYGON,
  resolveOrderDeliveryDate,
  resolveActiveDeliveryDate,
  parseStaffDeliveryDateOverride,
  parseStaffFulfillmentOverride,
  normalizePreferredDeliveryWindow,
  readProductMadeToOrder,
  isPreferredDeliveryWindowRequired,
  formatShortOrderNumber,
  tomorrowYmd,
  istanbulYmd,
} = require('../src/order_secure_helpers');

test('sanitizeIdempotencyKey replaces unsafe characters', () => {
  const result = sanitizeIdempotencyKey('abc-123?x/y z');
  assert.equal(result, 'abc-123_x_y_z');
});

test('validateCreateOrderPayload rejects missing required fields', () => {
  const result = validateCreateOrderPayload({
    customerName: 'Test',
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_ORDER_DATA');
});

test('validateCreateOrderPayload rejects empty items', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: 'test@example.com',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    items: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_ORDER_ITEMS');
});

test('validateCreateOrderPayload rejects item without productId', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: 'test@example.com',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    items: [{ quantity: 1 }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_ORDER_ITEMS');
});

test('validateCreateOrderPayload accepts valid payload', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: 'test@example.com',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    structuredAddress: {
      neighborhood: 'Adnan Kahveci',
      street: 'Yavuz Sultan Selim Cd.',
      buildingNo: '20',
    },
    items: [{ productId: 'p1', quantity: 1 }],
  });

  assert.deepEqual(result, { ok: true });
});

test('validateCreateOrderPayload accepts empty email', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: '',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    addressDescription: 'Kapı kodu 12',
    items: [{ productId: 'p1', quantity: 1 }],
  });

  assert.deepEqual(result, { ok: true });
});

test('validateCreateOrderPayload rejects invalid filled email', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: 'not-an-email',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    addressDescription: 'Not',
    items: [{ productId: 'p1', quantity: 1 }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_ORDER_DATA');
});

test('normalizeTurkishPhone normalizes common TR formats', () => {
  assert.equal(normalizeTurkishPhone('0532 123 45 67'), '5321234567');
  assert.equal(normalizeTurkishPhone('+90 532 123 45 67'), '5321234567');
  assert.equal(normalizeTurkishPhone('905321234567'), '5321234567');
  assert.equal(normalizeTurkishPhone('5321234567'), '5321234567');
  assert.equal(normalizeTurkishPhone('02121234567'), null);
  assert.equal(normalizeTurkishPhone('123'), null);
});

test('evaluatePhoneOrderRateLimit blocks within 5 minutes', () => {
  const nowMs = 1_000_000;
  const blocked = evaluatePhoneOrderRateLimit({
    lastOrderAtMs: nowMs - 60_000,
    nowMs,
    windowMs: 5 * 60 * 1000,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.code, 'PHONE_ORDER_RATE_LIMITED');

  const allowed = evaluatePhoneOrderRateLimit({
    lastOrderAtMs: nowMs - 6 * 60 * 1000,
    nowMs,
    windowMs: 5 * 60 * 1000,
  });
  assert.equal(allowed.allowed, true);
});

test('evaluatePhoneOrderRateLimit allows first order', () => {
  const result = evaluatePhoneOrderRateLimit({ lastOrderAtMs: 0, nowMs: Date.now() });
  assert.equal(result.allowed, true);
});

test('validateCreateOrderPayload rejects invalid structuredAddress type', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: 'test@example.com',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    structuredAddress: 'invalid',
    items: [{ productId: 'p1', quantity: 1 }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_ORDER_ADDRESS');
});

test('validateCreateOrderPayload rejects when both structured and description are missing', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: 'test@example.com',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    items: [{ productId: 'p1', quantity: 1 }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_ORDER_ADDRESS');
});

test('validateCreateOrderPayload accepts fallback addressDescription without structured', () => {
  const result = validateCreateOrderPayload({
    idempotencyKey: 'k1',
    customerName: 'Test',
    customerEmail: 'test@example.com',
    customerPhone: '05550000000',
    shippingAddress: 'Adres',
    addressDescription: 'Sokak listede yok, fırının karşısı.',
    items: [{ productId: 'p1', quantity: 1 }],
  });

  assert.deepEqual(result, { ok: true });
});

test('normalizeStructuredAddress trims and keeps known fields only', () => {
  const result = normalizeStructuredAddress({
    neighborhood: '  Gürpınar  ',
    street: '  Atatürk Cd  ',
    buildingNo: ' 7 ',
    unknown: 'value',
  });

  assert.equal(result.neighborhood, 'Gürpınar');
  assert.equal(result.street, 'Atatürk Cd');
  assert.equal(result.buildingNo, '7');
  assert.equal(result.unknown, undefined);
});

test('hasStructuredAddressCoreFields returns true only when neighborhood and street exist', () => {
  assert.equal(hasStructuredAddressCoreFields({ neighborhood: 'A', street: 'B' }), true);
  assert.equal(hasStructuredAddressCoreFields({ neighborhood: 'A', street: null }), false);
  assert.equal(hasStructuredAddressCoreFields(null), false);
});

test('evaluateRateLimitState blocks when blockedUntil is in future', () => {
  const nowMs = 1000;
  const result = evaluateRateLimitState({
    nowMs,
    blockedUntilMs: 2000,
    windowStartAtMs: 500,
    successCount: 1,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.code, 'ORDER_RATE_LIMITED');
  assert.equal(result.blockedUntilMs, 2000);
});

test('evaluateRateLimitState resets window when expired', () => {
  const nowMs = 11 * 60 * 1000;
  const result = evaluateRateLimitState({
    nowMs,
    windowStartAtMs: 1,
    successCount: 2,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.windowStartAtMs, nowMs);
  assert.equal(result.successCount, 0);
});

test('evaluateRateLimitState blocks after 3 successful orders in window', () => {
  const nowMs = 5000;
  const result = evaluateRateLimitState({
    nowMs,
    windowStartAtMs: 1000,
    successCount: 3,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.code, 'ORDER_RATE_LIMITED');
  assert.equal(result.blockedUntilMs, nowMs + 60 * 60 * 1000);
});

test('evaluateRateLimitState allows below threshold in same window', () => {
  const result = evaluateRateLimitState({
    nowMs: 5000,
    windowStartAtMs: 1000,
    successCount: 2,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.windowStartAtMs, 1000);
  assert.equal(result.successCount, 2);
});

test('calculateShippingFee applies flat fee below threshold', () => {
  assert.equal(calculateShippingFee(500, { flatFee: 150, freeShippingThreshold: 1000 }), 150);
  assert.equal(calculateShippingFee(1000, { flatFee: 150, freeShippingThreshold: 1000 }), 0);
});

test('resolveFulfillmentFromCoordinates infers same_day from structured address without coordinates', () => {
  const result = resolveFulfillmentFromCoordinates(null, null, BEYLIKDUZU_POLYGON, {
    district: 'Beylikdüzü',
    neighborhood: 'Gürpınar Mah.',
    street: 'Atatürk Cd.',
  });
  assert.equal(result.ok, true);
  assert.equal(result.fulfillmentType, 'same_day');
  assert.equal(result.latitude, null);
  assert.equal(result.longitude, null);
});

test('resolveFulfillmentFromCoordinates defaults to cargo without coordinates and unknown address', () => {
  const result = resolveFulfillmentFromCoordinates(null, null);
  assert.equal(result.ok, true);
  assert.equal(result.fulfillmentType, 'cargo');
});

test('inferFromStructuredAddress recognizes Beylikduzu neighborhoods', () => {
  assert.equal(
    inferFromStructuredAddress({ neighborhood: 'Adnan Kahveci Mah.', street: 'X' }),
    'same_day',
  );
  assert.equal(
    inferFromStructuredAddress({ neighborhood: 'Kadıköy', street: 'X', district: 'İstanbul' }),
    'cargo',
  );
});

test('resolveFulfillmentFromCoordinates marks Beylikduzu as same_day', () => {
  const result = resolveFulfillmentFromCoordinates(41.0016, 28.6405);
  assert.equal(result.ok, true);
  assert.equal(result.fulfillmentType, 'same_day');
});

test('resolveFulfillmentFromCoordinates marks outside polygon as cargo', () => {
  const result = resolveFulfillmentFromCoordinates(41.5, 29.0);
  assert.equal(result.ok, true);
  assert.equal(result.fulfillmentType, 'cargo');
});

test('isPointInPolygon detects point inside Beylikduzu center', () => {
  assert.equal(isPointInPolygon(41.0016, 28.6405), true);
});

test('parseShippingPolicy falls back to defaults', () => {
  const policy = parseShippingPolicy({});
  assert.equal(policy.flatFee, 150);
  assert.equal(policy.freeShippingThreshold, 1000);
});

test('resolveOrderDeliveryDate: any unavailable → tomorrow', () => {
  const nowMs = Date.parse('2026-07-13T10:00:00+03:00');
  assert.equal(
    resolveOrderDeliveryDate({
      anyUnavailable: true,
      activeDeliveryDate: '2026-07-20',
      nowMs,
    }),
    '2026-07-14'
  );
});

test('tomorrowYmd uses Europe/Istanbul across UTC midnight edge', () => {
  // 2026-07-13 22:30 UTC = 2026-07-14 01:30 Istanbul → tomorrow = 2026-07-15
  const afterTrMidnight = Date.parse('2026-07-13T22:30:00.000Z');
  assert.equal(istanbulYmd(afterTrMidnight), '2026-07-14');
  assert.equal(tomorrowYmd(afterTrMidnight), '2026-07-15');

  // 2026-07-13 20:30 UTC = 2026-07-13 23:30 Istanbul → tomorrow = 2026-07-14
  const beforeTrMidnight = Date.parse('2026-07-13T20:30:00.000Z');
  assert.equal(istanbulYmd(beforeTrMidnight), '2026-07-13');
  assert.equal(tomorrowYmd(beforeTrMidnight), '2026-07-14');
});

test('resolveOrderDeliveryDate unavailable uses Istanbul tomorrow at TZ edge', () => {
  const nowMs = Date.parse('2026-07-13T22:30:00.000Z');
  assert.equal(
    resolveOrderDeliveryDate({
      anyUnavailable: true,
      activeDeliveryDate: '2026-07-20',
      nowMs,
    }),
    '2026-07-15'
  );
});

test('resolveOrderDeliveryDate: all available uses activeDeliveryDate', () => {
  const nowMs = Date.parse('2026-07-13T10:00:00+03:00');
  assert.equal(
    resolveOrderDeliveryDate({
      anyUnavailable: false,
      activeDeliveryDate: '2026-07-18',
      nowMs,
    }),
    '2026-07-18'
  );
});

test('resolveOrderDeliveryDate: onlyMadeToOrder returns null', () => {
  const nowMs = Date.parse('2026-07-13T10:00:00+03:00');
  assert.equal(
    resolveOrderDeliveryDate({
      anyUnavailable: false,
      onlyMadeToOrder: true,
      activeDeliveryDate: '2026-07-18',
      nowMs,
    }),
    null
  );
});

test('normalizePreferredDeliveryWindow accepts 2-hour slots', () => {
  assert.equal(normalizePreferredDeliveryWindow('14:00-16:00'), '14:00-16:00');
  assert.equal(normalizePreferredDeliveryWindow('09:00-11:00'), null);
  assert.equal(normalizePreferredDeliveryWindow(null), null);
});

test('isPreferredDeliveryWindowRequired skips staff and pure MTO', () => {
  assert.equal(isPreferredDeliveryWindowRequired({}), true);
  assert.equal(
    isPreferredDeliveryWindowRequired({ isStaffManualOrder: true }),
    false
  );
  assert.equal(
    isPreferredDeliveryWindowRequired({ onlyMadeToOrder: true }),
    false
  );
  assert.equal(
    isPreferredDeliveryWindowRequired({
      isStaffManualOrder: false,
      onlyMadeToOrder: false,
    }),
    true
  );
});

test('formatShortOrderNumber uses first 8 chars uppercase', () => {
  assert.equal(formatShortOrderNumber('abc12345xyz'), 'ABC12345');
  assert.equal(formatShortOrderNumber(''), '');
  assert.equal(formatShortOrderNumber(null), '');
});

test('readProductMadeToOrder reads flag and fulfillmentMode', () => {
  assert.equal(readProductMadeToOrder({ madeToOrder: true }), true);
  assert.equal(readProductMadeToOrder({ fulfillmentMode: 'made_to_order' }), true);
  assert.equal(readProductMadeToOrder({ fulfillmentMode: 'daily' }), false);
});

test('resolveActiveDeliveryDate defaults to tomorrow when missing', () => {
  const nowMs = Date.parse('2026-07-13T10:00:00+03:00');
  assert.equal(resolveActiveDeliveryDate(null, nowMs), '2026-07-14');
  assert.equal(resolveActiveDeliveryDate('bad', nowMs), '2026-07-14');
});

test('parseStaffDeliveryDateOverride accepts YYYY-MM-DD only', () => {
  assert.equal(parseStaffDeliveryDateOverride('2026-07-20'), '2026-07-20');
  assert.equal(parseStaffDeliveryDateOverride('bad'), null);
  assert.equal(parseStaffDeliveryDateOverride(null), null);
});

test('parseStaffFulfillmentOverride accepts same_day|cargo', () => {
  assert.equal(parseStaffFulfillmentOverride('same_day'), 'same_day');
  assert.equal(parseStaffFulfillmentOverride('Cargo'), 'cargo');
  assert.equal(parseStaffFulfillmentOverride('pickup'), null);
});
