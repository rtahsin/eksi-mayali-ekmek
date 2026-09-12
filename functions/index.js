const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const https = require('https');
const {
  sanitizeIdempotencyKey,
  normalizeStructuredAddress,
  hasStructuredAddressCoreFields,
  resolveFulfillmentFromCoordinates,
  parseShippingPolicy,
  calculateShippingFee,
  validateLocationUrl,
  validateCreateOrderPayload,
  normalizePreferredDeliveryWindow,
  readProductMadeToOrder,
  isPreferredDeliveryWindowRequired,
  evaluateRateLimitState,
  normalizeTurkishPhone,
  evaluatePhoneOrderRateLimit,
  resolveOrderDeliveryDate,
  parseStaffDeliveryDateOverride,
  parseStaffFulfillmentOverride,
  formatShortOrderNumber,
} = require('./src/order_secure_helpers');
const {
  selectOrderStaffAdminUids,
  buildAdminNewOrderNotification,
  dedupeNotificationTargets,
} = require('./src/admin_order_notify_helpers');
// CORS allowlist: prod domain + localhost for local testing
const ALLOWED_ORIGINS = [
  'https://ekmeklab.com',
  'https://www.ekmeklab.com',
  'https://ekmeklab.tr',
  'https://www.ekmeklab.tr',
  'https://eksimayaliekmekweb.web.app',
  'https://eksimayaliekmekweb.firebaseapp.com',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const cors = require('cors')({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser clients (createOrderSecure vb.)
    try {
      const allowed = ALLOWED_ORIGINS.includes(origin) || /http:\/\/localhost:\d+/.test(origin) || /http:\/\/127\.0\.0\.1:\d+/.test(origin);
      return callback(null, allowed);
    } catch (_) {
      return callback(null, false);
    }
  },
  credentials: true,
});

/** OTP: bilinen Origin zorunlu VEYA native istemci header'ı (originless abuse azaltma). */
const OTP_CLIENT_HEADER = 'x-ekmeklab-client';
const OTP_CLIENT_VALUE = 'ekmeklab-app';

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) ||
    /http:\/\/localhost:\d+/.test(origin) ||
    /http:\/\/127\.0\.0\.1:\d+/.test(origin);
}

function otpCorsAllowed(req) {
  const origin = req.headers.origin;
  if (origin) return isAllowedOrigin(origin);
  const client = String(req.headers[OTP_CLIENT_HEADER] || '').trim().toLowerCase();
  return client === OTP_CLIENT_VALUE;
}

const otpCors = require('cors')({
  origin: (origin, callback) => {
    // Preflight / browser: yalnızca allowlist
    if (!origin) return callback(null, true);
    return callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
});

function rejectIfOtpOriginNotAllowed(req, res) {
  if (!otpCorsAllowed(req)) {
    res.status(403).send({ error: 'Origin not allowed', code: 'OTP_CORS_DENIED' });
    return true;
  }
  return false;
}
require('dotenv').config();

admin.initializeApp();

// Ortak mail transport oluşturucu
function getMailTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASSWORD;
  if (!user || !pass) {
    console.error('Mail transport yapılandırması eksik (GMAIL_USER / GMAIL_PASSWORD).');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

function getFromAddress(nameOverride) {
  const user = process.env.GMAIL_USER || 'ekmeklab@gmail.com';
  return { name: nameOverride || 'EkmekLab', address: user };
}

function canonicalNeighborhoods() {
  return [
    'Adnan Kahveci Mah.',
    'Barış Mah.',
    'Büyükşehir Mah.',
    'Cumhuriyet Mah.',
    'Dereağzı Mah.',
    'Gürpınar Mah.',
    'Kavaklı Mah.',
    'Sahil Mah.',
    'Marmara Mah.',
    'Yakuplu Mah.',
  ];
}

function fallbackStreets(neighborhood) {
  const defaults = {
    'Adnan Kahveci Mah.': ['Anadolu Caddesi', '1. Sokak', '2. Sokak', 'Gardenya Sokak'],
    'Barış Mah.': ['Barış Caddesi', 'Huzur Sokak', 'Dostluk Sokak', 'Egemenlik Sokak'],
    'Büyükşehir Mah.': ['Büyükşehir Bulvarı', 'Metropol Sokak', 'Şehir Caddesi'],
    'Cumhuriyet Mah.': ['Atatürk Caddesi', 'İnönü Sokak', 'Cumhuriyet Bulvarı'],
    'Dereağzı Mah.': ['Dereağzı Caddesi', 'Marmara Sokak', 'Deniz Sokak'],
    'Gürpınar Mah.': ['Gürpınar Caddesi', 'Sahil Yolu', 'Balıkçı Sokak'],
    'Kavaklı Mah.': ['Kavaklı Caddesi', 'Meşe Sokak', 'Lale Sokak'],
    'Sahil Mah.': ['Sahil Caddesi', 'Rıhtım Sokak', 'Liman Sokak'],
    'Yakuplu Mah.': ['Yakuplu Caddesi', 'Hürriyet Sokak', 'Vatan Caddesi'],
    'Marmara Mah.': ['Marmara Caddesi', 'Deniz Sokak', 'Sahil Sokak'],
  };

  return defaults[neighborhood] || ['Sokak bilgisi bulunamadı'];
}

function normalizeStreetName(value = '') {
  let text = String(value).trim();
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\bCd\.\b/g, 'Caddesi');
  text = text.replace(/\bSk\.\b/g, 'Sokak');
  return text;
}

function normalizeNeighborhoodName(value = '') {
  let text = String(value).trim();
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\bMahallesi\b/gi, 'Mah.');
  text = text.replace(/\bMah\b/gi, 'Mah.');
  text = text.replace(', Beylikdüzü', '');
  text = text.replace('Beylikdüzü ', '');
  return text.trim();
}

function postOverpassQuery(query) {
  return new Promise((resolve, reject) => {
    const body = `data=${encodeURIComponent(query)}`;
    const req = https.request(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Overpass status=${res.statusCode}`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Overpass timeout'));
    });
    req.write(body);
    req.end();
  });
}

async function fetchNeighborhoodsFromOverpassServer() {
  const query = `
[out:json][timeout:90];
area["name"="Beylikdüzü"]["boundary"="administrative"]["admin_level"="8"]->.district;
(
  relation(area.district)["boundary"="administrative"]["admin_level"="10"]["name"];
  way(area.district)["boundary"="administrative"]["admin_level"="10"]["name"];
);
out tags;
`;

  const decoded = await postOverpassQuery(query);
  const elements = Array.isArray(decoded.elements) ? decoded.elements : [];
  const names = new Set();
  for (const element of elements) {
    const tags = element?.tags || {};
    const name = normalizeNeighborhoodName(tags.name || '');
    if (name) names.add(name);
  }

  return [...names].sort();
}

async function fetchStreetsFromOverpassServer(neighborhood) {
  const normalizedNeighborhood = neighborhood.replace('Mah.', 'Mahallesi').trim();
  const query = `
[out:json][timeout:90];
area["name"="Beylikdüzü"]["boundary"="administrative"]["admin_level"="8"]->.district;
(
  area["name"="${normalizedNeighborhood}"]["boundary"="administrative"](area.district)->.mah;
  area["name"="${normalizedNeighborhood}, Beylikdüzü"]["boundary"="administrative"](area.district)->.mah2;
);
(
  way(area.mah)["highway"]["name"];
  way(area.mah2)["highway"]["name"];
);
out tags;
`;

  const decoded = await postOverpassQuery(query);
  const elements = Array.isArray(decoded.elements) ? decoded.elements : [];
  const names = new Set();
  for (const element of elements) {
    const tags = element?.tags || {};
    const name = normalizeStreetName(tags.name || '');
    if (name) names.add(name);
  }

  return [...names].sort();
}

/**
 * Mahalle/sokak referans verisini server-side senkronize eder.
 * - Kaynak: Overpass (OSM)
 * - Fallback: kanonik mahalle/sokak seti
 * - Yazım: Firestore neighborhoods/* (admin SDK)
 */
exports.syncNeighborhoodsData = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method === 'OPTIONS') {
        return res.status(204).send('');
      }
      if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
      }

      const requiredToken = process.env.ADDRESS_SYNC_TOKEN || '';
      const providedToken = (req.headers['x-sync-token'] || '').toString();
      // Token zorunlu: boş config veya uyuşmayan token → 403 (açık endpoint olmasın)
      if (!requiredToken || providedToken !== requiredToken) {
        return res.status(403).send({
          code: 'FORBIDDEN',
          message: 'Geçersiz veya eksik senkronizasyon anahtarı',
        });
      }

      try {
        const canonical = canonicalNeighborhoods();
        const forceFallback =
          req.query?.forceFallback === '1' || req.body?.forceFallback === true;

        let remoteNeighborhoods = [];
        if (!forceFallback) {
          try {
            remoteNeighborhoods = await fetchNeighborhoodsFromOverpassServer();
          } catch (e) {
            console.warn('Overpass mahalle listesi alınamadı, kanonik liste kullanılacak:', e?.message || e);
          }
        } else {
          console.log('forceFallback=true: Overpass mahalle sorgusu atlandı');
        }

        const neighborhoods = [...new Set([...canonical, ...remoteNeighborhoods])].sort();
        const batch = admin.firestore().batch();
        const stats = {
          neighborhoods: neighborhoods.length,
          remoteNeighborhoods: remoteNeighborhoods.length,
          streetSourceFallbackCount: 0,
        };

        for (const neighborhood of neighborhoods) {
          let streets = [];
          let source = 'overpass';
          if (!forceFallback) {
            try {
              streets = await fetchStreetsFromOverpassServer(neighborhood);
            } catch (e) {
              console.warn(`Overpass sokak sorgusu başarısız (${neighborhood}):`, e?.message || e);
            }
          }

          if (!streets.length) {
            streets = fallbackStreets(neighborhood);
            source = 'fallback';
            stats.streetSourceFallbackCount += 1;
          }

          const unique = [...new Set(streets.map((s) => String(s).trim()).filter(Boolean))].sort();
          const ref = admin.firestore().collection('neighborhoods').doc(neighborhood);
          batch.set(
            ref,
            {
              name: neighborhood,
              district: 'Beylikdüzü',
              city: 'İstanbul',
              streets: unique,
              source,
              version: new Date().toISOString(),
              lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        await batch.commit();
        return res.status(200).send({
          success: true,
          stats,
        });
      } catch (error) {
        console.error('syncNeighborhoodsData error:', error);
        return res.status(500).send({
          code: 'SYNC_FAILED',
          message: error?.message || 'Senkronizasyon başarısız',
        });
      }
    });
  });

/**
 * Email OTP İsteme (HTTP)
 * Body: { uid, email, fullName }
 */
exports.requestEmailOtp = functions.https.onRequest((req, res) => {
  otpCors(req, res, async () => {
    // OPTIONS request için CORS pre-flight
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (rejectIfOtpOriginNotAllowed(req, res)) return;
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { uid, email, fullName } = req.body || {};
      if (!email) {
        return res.status(400).send({ error: 'email gereklidir' });
      }

      const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

      // IP bazlı saatlik rate limit (abuse koruması)
      const ipKey = ip || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ipKey).digest('hex');
      const otpRateRef = admin.firestore().collection('otp_rate_limits').doc(ipHash);
      const otpRateSnap = await otpRateRef.get();
      const otpRateData = otpRateSnap.exists ? (otpRateSnap.data() || {}) : {};
      const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const IP_HOURLY_OTP_LIMIT = 20;
      let ipHourlyCount = otpRateData.hourlyCount || 0;
      if (otpRateData.hourKey !== hourKey) {
        ipHourlyCount = 0;
      }
      if (ipHourlyCount >= IP_HOURLY_OTP_LIMIT) {
        return res.status(429).send({
          error: 'IP saatlik OTP limiti aşıldı',
          code: 'IP_RATE_LIMIT',
        });
      }

      // UID varsa user doc, yoksa pending_verifications kullan
      const collectionName = uid ? 'users' : 'pending_verifications';
      const docId = uid || email.replace(/[.@]/g, '_');
      const userRef = admin.firestore().collection(collectionName).doc(docId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const verification = (userData && userData.verification) || {};

      const now = Date.now();
      const lastSentAtMs = verification.lastSentAt && verification.lastSentAt.toMillis ? verification.lastSentAt.toMillis() : 0;
      const cooldownMs = 60 * 1000; // 60 saniye
      if (lastSentAtMs && now - lastSentAtMs < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - (now - lastSentAtMs)) / 1000);
        return res.status(429).send({ error: 'Çok sık istek', cooldownRemainingSec: remaining });
      }

      // Günlük limit: 10
      const today = new Date();
      const ymd = today.toISOString().slice(0, 10);
      let dailyCount = verification.dailyCount || 0;
      const dailyDate = verification.dailyDate || '';
      if (dailyDate !== ymd) {
        dailyCount = 0; // yeni gün
      }
      if (dailyCount >= 10) {
        return res.status(429).send({ error: 'Günlük OTP limiti aşıldı' });
      }

      // Eğer önceki kod halen geçerliyse ve çok yeni ise tekrar üretmeden kabul etme (idempotent davranış)
      const prevExpires = verification.expiresAt && verification.expiresAt.toMillis ? verification.expiresAt.toMillis() : 0;
      if (prevExpires && prevExpires > now && lastSentAtMs && now - lastSentAtMs < 2 * 60 * 1000) {
        // yeni mail göndermeden sadece "gönderildi" de
        await userRef.set({
          verification: {
            ...verification,
            lastRequestIp: ip,
            dailyCount: dailyCount + 1,
            dailyDate: ymd,
          }
        }, { merge: true });
        await otpRateRef.set({
          hourKey,
          hourlyCount: ipHourlyCount + 1,
          lastIp: ipKey,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.status(200).send({ success: true, reusedExisting: true });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt = admin.firestore.Timestamp.fromDate(new Date(now + 15 * 60 * 1000)); // 15 dk

      // Kullanıcı belgesine verification alanlarını yaz
      await userRef.set({
        verification: {
          type: 'email',
          codeHash,
          expiresAt,
          attempts: 0,
          status: 'pending',
          lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
          lastRequestIp: ip,
          dailyCount: dailyCount + 1,
          dailyDate: ymd,
        },
        emailVerified: false,
      }, { merge: true });

      // E-posta içeriği
      const html = `
        <div style="font-family: Arial, sans-serif; color:#333;">
          <h2>Doğrulama Kodunuz</h2>
          <p>Merhaba ${fullName || ''},</p>
          <p>EkmekLab hesabınızı doğrulamak için aşağıdaki kodu girin:</p>
          <div style="font-size:28px; font-weight:bold; letter-spacing:4px;">${code}</div>
          <p>Bu kod 15 dakika boyunca geçerlidir.</p>
        </div>`;

      const mailTransport = getMailTransport();

      await mailTransport.sendMail({
        from: getFromAddress(),
        to: email,
        subject: 'E-posta Doğrulama Kodunuz',
        html,
      });

      await otpRateRef.set({
        hourKey,
        hourlyCount: ipHourlyCount + 1,
        lastIp: ipKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.status(200).send({ success: true });
    } catch (error) {
      console.error('requestEmailOtp error:', error);
      return res.status(500).send({ error: error.message });
    }
  });
});

/**
 * Email OTP Doğrulama (HTTP)
 * Body: { uid, code }
 */
exports.verifyEmailOtp = functions.https.onRequest((req, res) => {
  otpCors(req, res, async () => {
    // OPTIONS request için CORS pre-flight
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (rejectIfOtpOriginNotAllowed(req, res)) return;
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { uid, code, isPending, docId, email } = req.body || {};

      // Pending verification mı yoksa normal user verification mı?
      const collectionName = isPending ? 'pending_verifications' : 'users';
      const documentId = isPending ? (docId || email?.replace(/[.@]/g, '_')) : uid;

      if (!documentId || !code) {
        return res.status(400).send({ error: 'Gerekli parametreler eksik' });
      }

      const docRef = admin.firestore().collection(collectionName).doc(documentId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return res.status(404).send({ error: isPending ? 'Doğrulama talebi bulunamadı' : 'Kullanıcı bulunamadı' });
      }

      const data = snap.data() || {};
      const verification = data.verification || {};
      if (!verification.codeHash || !verification.expiresAt) {
        return res.status(400).send({ error: 'Doğrulama kodu talep edilmemiş' });
      }

      const now = admin.firestore.Timestamp.now();
      if (verification.expiresAt.toMillis() < now.toMillis()) {
        return res.status(400).send({ error: 'Kodun süresi dolmuş' });
      }

      const attempts = verification.attempts || 0;
      if (attempts >= 5) {
        return res.status(429).send({ error: 'Deneme hakkı aşılmış' });
      }

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const isMatch = codeHash === verification.codeHash;

      if (!isMatch) {
        await docRef.set({ verification: { ...verification, attempts: attempts + 1 } }, { merge: true });
        return res.status(400).send({ error: 'Kod hatalı' });
      }

      // Başarılı doğrulama
      if (isPending) {
        // Pending verification için sadece success döndür
        // Gerçek hesap client tarafında oluşturulacak
        await docRef.set({
          verification: {
            status: 'verified',
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        }, { merge: true });
        return res.status(200).send({ success: true });
      } else {
        // Normal user verification: Firestore ve Auth güncelle
        await docRef.set({
          emailVerified: true,
          verification: { status: 'verified', verifiedAt: admin.firestore.FieldValue.serverTimestamp() },
          isActive: true,
        }, { merge: true });

        try { await admin.auth().updateUser(uid, { emailVerified: true }); } catch (_) { }

        return res.status(200).send({ success: true });
      }
    } catch (error) {
      console.error('verifyEmailOtp error:', error);
      return res.status(500).send({ error: error.message });
    }
  });
});

/**
 * Guest OTP doğrulaması sonrası hesabı tamamlar ve custom token döner.
 * Body: { email, fullName, phoneNumber? }
 */
exports.completeGuestOrderRegistration = functions.https.onRequest((req, res) => {
  otpCors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (rejectIfOtpOriginNotAllowed(req, res)) return;
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const { email, fullName, phoneNumber } = req.body || {};
      const normalizedEmail = (email || '').toString().trim().toLowerCase();
      const normalizedName = (fullName || '').toString().trim();

      if (!normalizedEmail || !normalizedName) {
        return res.status(400).send({
          code: 'INVALID_ARGUMENT',
          message: 'email ve fullName gereklidir',
        });
      }

      const pendingDocId = normalizedEmail.replace(/[.@]/g, '_');
      const pendingRef = admin.firestore().collection('pending_verifications').doc(pendingDocId);

      let uid = '';
      let isNewUser = false;

      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      } catch (e) {
        if (e.code !== 'auth/user-not-found') {
          throw e;
        }
      }

      if (!userRecord) {
        const randomPassword = `${crypto.randomBytes(12).toString('hex')}#Aa1`;
        try {
          userRecord = await admin.auth().createUser({
            email: normalizedEmail,
            emailVerified: true,
            displayName: normalizedName,
            password: randomPassword,
            disabled: false,
          });
          isNewUser = true;
        } catch (e) {
          if (e.code === 'auth/email-already-exists') {
            userRecord = await admin.auth().getUserByEmail(normalizedEmail);
          } else {
            throw e;
          }
        }
      }

      uid = userRecord.uid;

      await admin.firestore().runTransaction(async (tx) => {
        const pendingSnap = await tx.get(pendingRef);
        if (!pendingSnap.exists) {
          const err = new Error('Doğrulama kaydı bulunamadı');
          err.code = 'VERIFICATION_NOT_FOUND';
          throw err;
        }

        const pendingData = pendingSnap.data() || {};
        const verification = pendingData.verification || {};
        if (verification.status !== 'verified') {
          const err = new Error('Doğrulama tamamlanmadı');
          err.code = 'VERIFICATION_NOT_COMPLETED';
          throw err;
        }
        if (pendingData.consumed === true) {
          const err = new Error('Doğrulama kaydı daha önce kullanılmış');
          err.code = 'VERIFICATION_ALREADY_CONSUMED';
          throw err;
        }

        const userRef = admin.firestore().collection('users').doc(uid);
        tx.set(
          userRef,
          {
            email: normalizedEmail,
            fullName: normalizedName,
            ...(phoneNumber ? { phoneNumber } : {}),
            emailVerified: true,
            isActive: true,
            provider: 'password',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          pendingRef,
          {
            consumed: true,
            consumedAt: admin.firestore.FieldValue.serverTimestamp(),
            consumedByUid: uid,
          },
          { merge: true }
        );
      });

      await admin.auth().updateUser(uid, {
        emailVerified: true,
      });
      const customToken = await admin.auth().createCustomToken(uid);

      return res.status(200).send({
        success: true,
        uid,
        email: normalizedEmail,
        isNewUser,
        customToken,
      });
    } catch (error) {
      console.error('completeGuestOrderRegistration error:', error);
      const code = error.code || 'INTERNAL';
      const status =
        code === 'INVALID_ARGUMENT'
          ? 400
          : code.startsWith('VERIFICATION_')
            ? 409
            : 500;
      return res.status(status).send({
        code,
        message: error.message || 'Kayıt tamamlama hatası',
      });
    }
  });
});

/**
 * Aktif destek/admin personeli mi?
 */
async function isActiveSupportStaff(uid) {
  const doc = await admin.firestore().collection('adminler').doc(uid).get();
  if (!doc.exists) return false;
  const data = doc.data() || {};
  if (data.isActive !== true) return false;
  const role = String(data.role || '').toLowerCase();
  return ['superadmin', 'admin', 'support'].includes(role);
}

/**
 * Güvenli sipariş oluşturma endpointi.
 * - Auth token zorunlu
 * - Server-side amount hesaplama
 * - Idempotency desteği
 * - 10 dakika içinde 3 başarılı sipariş sonrası 1 saat blok
 */
exports.createOrderSecure = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const authHeader = req.headers.authorization || '';
      const tokenMatch = authHeader.match(/^Bearer\s+(.*)$/i);
      if (!tokenMatch) {
        return res.status(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Authorization Bearer token gerekli',
        });
      }

      const decoded = await admin.auth().verifyIdToken(tokenMatch[1], true);
      const uid = decoded.uid;

      const {
        idempotencyKey,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        structuredAddress,
        addressDescription,
        paymentMethod,
        notes,
        items,
        clientAmount,
        latitude,
        longitude,
        locationUrl,
        customerUserId,
        deliveryDate: clientDeliveryDate,
        fulfillmentType: clientFulfillmentType,
        preferredDeliveryWindow: clientPreferredDeliveryWindow,
      } = req.body || {};

      const payloadValidation = validateCreateOrderPayload(req.body || {});
      if (!payloadValidation.ok) {
        return res.status(400).send({
          code: payloadValidation.code,
          message: payloadValidation.message,
        });
      }

      const normalizedPhone = normalizeTurkishPhone(customerPhone);
      if (!normalizedPhone) {
        return res.status(400).send({
          code: 'INVALID_PHONE',
          message: 'Geçerli bir Türkiye cep telefonu numarası girin (05XX...)',
        });
      }

      const requestedCustomerUserId =
        customerUserId == null ? '' : String(customerUserId).trim();
      const isStaffManualOrder =
        requestedCustomerUserId.length > 0 && requestedCustomerUserId !== uid;
      let orderUserId = uid;

      if (isStaffManualOrder) {
        const staffOk = await isActiveSupportStaff(uid);
        if (!staffOk) {
          return res.status(403).send({
            code: 'FORBIDDEN',
            message: 'Başka kullanıcı adına sipariş oluşturma yetkisi yok',
          });
        }
        orderUserId = requestedCustomerUserId;
      }

      const preferredDeliveryWindow = normalizePreferredDeliveryWindow(
        clientPreferredDeliveryWindow,
      );
      // Saat penceresi: günlük/karışık sepet zorunlu; saf MTO ve staff manuel siparişte opsiyonel.
      // Zorunluluk, ürünler okunduktan sonra (onlyMadeToOrder) transaction içinde doğrulanır.

      const staffDeliveryDateOverride = isStaffManualOrder
        ? parseStaffDeliveryDateOverride(clientDeliveryDate)
        : null;
      const staffFulfillmentOverride = isStaffManualOrder
        ? parseStaffFulfillmentOverride(clientFulfillmentType)
        : null;

      const normalizedStructuredAddress = normalizeStructuredAddress(structuredAddress);
      if (normalizedStructuredAddress) {
        if (!normalizedStructuredAddress.city) {
          normalizedStructuredAddress.city = 'İstanbul';
        }
        if (!normalizedStructuredAddress.district) {
          normalizedStructuredAddress.district = 'Beylikdüzü';
        }
      }

      const fulfillmentResult = resolveFulfillmentFromCoordinates(
        latitude,
        longitude,
        undefined,
        normalizedStructuredAddress,
      );
      if (!fulfillmentResult.ok) {
        return res.status(400).send({
          code: fulfillmentResult.code,
          message: fulfillmentResult.message,
        });
      }
      if (staffFulfillmentOverride) {
        fulfillmentResult.fulfillmentType = staffFulfillmentOverride;
      }

      const safeIdempotencyKey = sanitizeIdempotencyKey(idempotencyKey);
      const normalizedAddressDescription =
        addressDescription == null ? '' : String(addressDescription).trim().slice(0, 1000);

      const locationUrlValidation = validateLocationUrl(locationUrl);
      if (!locationUrlValidation.ok) {
        return res.status(400).send({
          code: locationUrlValidation.code,
          message: locationUrlValidation.message,
        });
      }

      const idempotencyRef = admin
        .firestore()
        .collection('order_idempotency')
        .doc(`${uid}_${safeIdempotencyKey}`);
      const rateRef = admin.firestore().collection('order_rate_limits').doc(uid);
      const phoneRateRef = admin
        .firestore()
        .collection('phone_order_rate_limits')
        .doc(normalizedPhone);

      const nowMs = Date.now();
      const windowMs = 10 * 60 * 1000;
      const blockMs = 60 * 60 * 1000;
      const phoneWindowMs = 5 * 60 * 1000;

      const txResult = await admin.firestore().runTransaction(async (tx) => {
        const existingIdempotency = await tx.get(idempotencyRef);
        if (existingIdempotency.exists) {
          const data = existingIdempotency.data() || {};
          const existingOrderId = data.orderId;
          if (existingOrderId) {
            return {
              orderId: existingOrderId,
              status: 'pending',
              reused: true,
              successCount: data.successCount || null,
              windowEndsAt: data.windowEndsAt || null,
            };
          }
        }

        if (!isStaffManualOrder) {
          const phoneRateSnap = await tx.get(phoneRateRef);
          const phoneRateData = phoneRateSnap.exists ? phoneRateSnap.data() || {} : {};
          const lastPhoneOrderAtMs =
            phoneRateData.lastOrderAt && phoneRateData.lastOrderAt.toMillis
              ? phoneRateData.lastOrderAt.toMillis()
              : Number(phoneRateData.lastOrderAtMs || 0);

          const phoneRateState = evaluatePhoneOrderRateLimit({
            lastOrderAtMs: lastPhoneOrderAtMs,
            nowMs,
            windowMs: phoneWindowMs,
          });

          if (!phoneRateState.allowed) {
            const err = new Error(phoneRateState.message);
            err.code = phoneRateState.code;
            err.blockedUntil = phoneRateState.blockedUntilMs;
            throw err;
          }
        }

        const rateSnap = await tx.get(rateRef);
        const rateData = rateSnap.exists ? rateSnap.data() || {} : {};

        const blockedUntil = rateData.blockedUntil && rateData.blockedUntil.toMillis
          ? rateData.blockedUntil.toMillis()
          : 0;
        let windowStartAtMs = rateData.windowStartAt && rateData.windowStartAt.toMillis
          ? rateData.windowStartAt.toMillis()
          : nowMs;
        let successCount = Number(rateData.successCount || 0);

        if (!isStaffManualOrder) {
          const rateState = evaluateRateLimitState({
            nowMs,
            blockedUntilMs: blockedUntil,
            windowStartAtMs,
            successCount,
            windowMs,
            blockMs,
          });

          if (!rateState.allowed) {
            tx.set(
              rateRef,
              {
                uid,
                blockedUntil: admin.firestore.Timestamp.fromMillis(rateState.blockedUntilMs),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            const err = new Error(rateState.message);
            err.code = rateState.code;
            err.blockedUntil = rateState.blockedUntilMs;
            throw err;
          }

          windowStartAtMs = rateState.windowStartAtMs;
          successCount = rateState.successCount;
        }

        const productIds = items
          .map((item) => (item && item.productId ? String(item.productId) : null))
          .filter(Boolean);
        if (productIds.length !== items.length) {
          const err = new Error('Ürün kimlikleri geçersiz');
          err.code = 'INVALID_ORDER_ITEMS';
          throw err;
        }

        let calculatedSubtotal = 0;
        const normalizedItems = [];
        // any isAvailable===false → deliveryDate = tomorrow (unless all MTO)
        let anyUnavailable = false;
        let anyMadeToOrder = false;
        let nonMadeToOrderCount = 0;
        for (const item of items) {
          const productId = String(item.productId);
          const quantity = Math.max(1, Number(item.quantity || 1));

          if (productId === 'manual_item' && isStaffManualOrder) {
            const manualPrice = Number(item.clientPrice != null ? item.clientPrice : item.price || 0);
            if (!Number.isFinite(manualPrice) || manualPrice <= 0 || manualPrice > 100000) {
              const err = new Error('Manuel sipariş tutarı geçersiz');
              err.code = 'INVALID_ORDER_AMOUNT';
              throw err;
            }
            calculatedSubtotal += manualPrice * quantity;
            const manualMadeToOrder = item.madeToOrder === true;
            if (manualMadeToOrder) anyMadeToOrder = true;
            else nonMadeToOrderCount += 1;
            normalizedItems.push({
              productId,
              name: String(item.name || 'Manuel Sipariş'),
              quantity,
              price: manualPrice,
              imageUrl: String(item.imageUrl || ''),
              ...(manualMadeToOrder ? { madeToOrder: true } : {}),
            });
            continue;
          }

          const productRef = admin.firestore().collection('urunler').doc(productId);
          const productSnap = await tx.get(productRef);
          if (!productSnap.exists) {
            const err = new Error(`Ürün bulunamadı: ${item.productId}`);
            err.code = 'PRODUCT_NOT_FOUND';
            throw err;
          }

          const productData = productSnap.data() || {};
          // Discontinued products cannot be ordered (catalog hidden via isActive=false)
          if (productData.isActive === false) {
            const err = new Error(`Ürün satışta değil: ${productData.name || productId}`);
            err.code = 'PRODUCT_INACTIVE';
            throw err;
          }
          const madeToOrder = readProductMadeToOrder(productData);
          if (madeToOrder) {
            anyMadeToOrder = true;
          } else {
            nonMadeToOrderCount += 1;
            // Sales closed for today: still accept order, stamp tomorrow (no stock decrement)
            if (productData.isAvailable === false) {
              anyUnavailable = true;
            }
          }
          const serverPrice = Number(productData.price || 0);
          calculatedSubtotal += serverPrice * quantity;
          normalizedItems.push({
            productId,
            name: String(productData.name || item.name || ''),
            quantity,
            price: serverPrice,
            imageUrl: String(productData.imageUrl || item.imageUrl || ''),
            ...(madeToOrder ? { madeToOrder: true } : {}),
          });
        }

        if (!Number.isFinite(calculatedSubtotal) || calculatedSubtotal <= 0 || calculatedSubtotal > 100000) {
          const err = new Error('Sipariş tutarı geçersiz');
          err.code = 'INVALID_ORDER_AMOUNT';
          throw err;
        }

        const onlyMadeToOrder = anyMadeToOrder && nonMadeToOrderCount === 0;

        if (
          isPreferredDeliveryWindowRequired({
            isStaffManualOrder,
            onlyMadeToOrder,
          }) &&
          !preferredDeliveryWindow
        ) {
          const err = new Error('Lütfen teslim saat aralığı seçin (örn. 14:00-16:00)');
          err.code = 'INVALID_DELIVERY_WINDOW';
          throw err;
        }

        const settingsRef = admin.firestore().collection('settings').doc('store');
        const settingsSnap = await tx.get(settingsRef);
        const settingsData = settingsSnap.exists ? settingsSnap.data() || {} : {};
        const shippingPolicy = parseShippingPolicy(settingsData.shippingPolicy || {});
        const calculatedDeliveryFee = isStaffManualOrder
          ? 0
          : calculateShippingFee(calculatedSubtotal, shippingPolicy);
        const calculatedAmount = calculatedSubtotal + calculatedDeliveryFee;
        const deliveryDate =
          staffDeliveryDateOverride ||
          resolveOrderDeliveryDate({
            anyUnavailable,
            onlyMadeToOrder,
            activeDeliveryDate: settingsData.activeDeliveryDate,
            nowMs,
          });

        const orderRef = admin.firestore().collection('siparisler').doc();
        const orderId = orderRef.id;
        const orderNumber = formatShortOrderNumber(orderId);
        const serverNowTs = admin.firestore.FieldValue.serverTimestamp();
        const windowEndsAtMs = windowStartAtMs + windowMs;

        tx.set(orderRef, {
          id: orderId,
          orderNumber,
          userId: orderUserId,
          customerName: String(customerName).trim(),
          customerEmail: String(customerEmail || '').trim().toLowerCase(),
          customerPhone: String(customerPhone).trim(),
          customerPhoneNormalized: normalizedPhone,
          shippingAddress: String(shippingAddress).trim(),
          ...(hasStructuredAddressCoreFields(normalizedStructuredAddress)
            ? { structuredAddress: normalizedStructuredAddress }
            : {}),
          ...(normalizedAddressDescription ? { addressDescription: normalizedAddressDescription } : {}),
          paymentMethod: String(paymentMethod || 'Kapıda nakit veya POS').trim(),
          notes: String(notes || '').trim(),
          items: normalizedItems,
          subtotal: calculatedSubtotal,
          deliveryFee: calculatedDeliveryFee,
          amount: calculatedAmount,
          ...(deliveryDate ? { deliveryDate } : {}),
          ...(preferredDeliveryWindow ? { preferredDeliveryWindow } : {}),
          ...(anyMadeToOrder ? { hasMadeToOrderItems: true } : {}),
          fulfillmentType: fulfillmentResult.fulfillmentType,
          shippingPolicySnapshot: {
            flatFee: shippingPolicy.flatFee,
            freeShippingThreshold: shippingPolicy.freeShippingThreshold,
            appliedAt: nowMs,
          },
          orderStatus: 'pending',
          status: 'pending',
          dateTime: admin.firestore.Timestamp.fromMillis(nowMs),
          orderDate: admin.firestore.Timestamp.fromMillis(nowMs),
          statusUpdatedAt: admin.firestore.Timestamp.fromMillis(nowMs),
          updatedBy: uid,
          ...(isStaffManualOrder ? { createdByStaffUid: uid, source: 'admin_manual' } : {}),
          createdAt: serverNowTs,
          updatedAt: serverNowTs,
          ...(fulfillmentResult.latitude != null
            ? { latitude: Number(fulfillmentResult.latitude) }
            : {}),
          ...(fulfillmentResult.longitude != null
            ? { longitude: Number(fulfillmentResult.longitude) }
            : {}),
          ...(locationUrlValidation.locationUrl
            ? { locationUrl: String(locationUrlValidation.locationUrl) }
            : {}),
        });

        tx.set(
          rateRef,
          {
            uid,
            windowStartAt: admin.firestore.Timestamp.fromMillis(windowStartAtMs),
            successCount: isStaffManualOrder ? successCount : successCount + 1,
            blockedUntil: null,
            lastOrderAt: admin.firestore.Timestamp.fromMillis(nowMs),
            updatedAt: serverNowTs,
          },
          { merge: true }
        );

        if (!isStaffManualOrder) {
          tx.set(
            phoneRateRef,
            {
              phone: normalizedPhone,
              lastOrderAt: admin.firestore.Timestamp.fromMillis(nowMs),
              lastOrderId: orderId,
              uid,
              updatedAt: serverNowTs,
            },
            { merge: true }
          );
        }

        if (!isStaffManualOrder) {
          tx.set(
            idempotencyRef,
            {
              uid,
              orderId,
              createdAt: serverNowTs,
              successCount: successCount + 1,
              windowEndsAt: admin.firestore.Timestamp.fromMillis(windowEndsAtMs),
              clientAmount: Number(clientAmount || 0),
              calculatedAmount,
              calculatedSubtotal,
              calculatedDeliveryFee,
              deliveryDate: deliveryDate || null,
              preferredDeliveryWindow: preferredDeliveryWindow || null,
            },
            { merge: true }
          );
        } else {
          tx.set(
            idempotencyRef,
            {
              uid,
              orderId,
              createdAt: serverNowTs,
              customerUserId: orderUserId,
              clientAmount: Number(clientAmount || 0),
              calculatedAmount,
              calculatedSubtotal,
              calculatedDeliveryFee,
              deliveryDate: deliveryDate || null,
              preferredDeliveryWindow: preferredDeliveryWindow || null,
              source: 'admin_manual',
            },
            { merge: true }
          );
        }

        return {
          orderId,
          status: 'pending',
          reused: false,
          deliveryDate: deliveryDate || null,
          preferredDeliveryWindow: preferredDeliveryWindow || null,
          successCount: isStaffManualOrder ? successCount : successCount + 1,
          windowEndsAt: new Date(windowEndsAtMs).toISOString(),
        };
      });

      return res.status(200).send({
        success: true,
        orderId: txResult.orderId,
        status: txResult.status,
        reused: txResult.reused,
        deliveryDate: txResult.deliveryDate || null,
        preferredDeliveryWindow: txResult.preferredDeliveryWindow || null,
        rateLimit: {
          successCount: txResult.successCount,
          windowEndsAt: txResult.windowEndsAt,
        },
      });
    } catch (error) {
      console.error('createOrderSecure error:', error);
      const code = error.code || 'ORDER_CREATE_FAILED';
      const blockedUntil = error.blockedUntil || null;
      const remainingSeconds = blockedUntil ? Math.max(0, Math.floor((blockedUntil - Date.now()) / 1000)) : null;
      const status =
        code === 'UNAUTHENTICATED'
          ? 401
          : code === 'ORDER_RATE_LIMITED' || code === 'PHONE_ORDER_RATE_LIMITED'
            ? 429
            : code.startsWith('INVALID_') ||
                code === 'PRODUCT_NOT_FOUND' ||
                code === 'PRODUCT_INACTIVE'
              ? 400
              : 500;

      return res.status(status).send({
        code,
        message: error.message || 'Sipariş oluşturulamadı',
        ...(blockedUntil ? { blockedUntil: new Date(blockedUntil).toISOString() } : {}),
        ...(remainingSeconds != null ? { remainingSeconds } : {}),
      });
    }
  });
});

/**
 * E-posta gönderim fonksiyonu
 * 
 * Bu fonksiyon, HTTP isteği olarak e-posta detaylarını alır ve
 * nodemailer kullanarak e-postayı gönderir.
 */
exports.sendEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      // Admin/support only — açık mail relay olmasın
      const authHeader = req.headers.authorization || '';
      const tokenMatch = authHeader.match(/^Bearer\s+(.*)$/i);
      if (!tokenMatch) {
        return res.status(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Authorization Bearer token gerekli',
        });
      }

      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(tokenMatch[1], true);
      } catch (authErr) {
        return res.status(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Geçersiz veya süresi dolmuş token',
        });
      }

      const staffOk = await isActiveSupportStaff(decoded.uid);
      const claimAdmin = decoded.isAdmin === true;
      if (!staffOk && !claimAdmin) {
        return res.status(403).send({
          code: 'FORBIDDEN',
          message: 'Bu işlem için admin/support yetkisi gereklidir',
        });
      }

      const { to, subject, html, from, fromName } = req.body || {};

      if (!to || !subject || !html) {
        return res.status(400).send({ error: 'E-posta, konu ve içerik gereklidir' });
      }

      const mailTransport = getMailTransport();

      const mailOptions = {
        from: from ? { name: fromName || 'EkmekLab', address: from } : getFromAddress(fromName),
        to,
        subject,
        html,
      };

      await mailTransport.sendMail(mailOptions);

      console.log(`E-posta gönderildi (admin): ${to} by ${decoded.uid}`);
      return res.status(200).send({ success: true, message: 'E-posta başarıyla gönderildi' });
    } catch (error) {
      console.error('E-posta gönderilirken hata:', error);
      return res.status(500).send({ error: error.message });
    }
  });
});

/**
 * Firestore tetikleyicisi - Sipariş oluşturulduğunda e-posta gönder
 * 
 * Bu fonksiyon, "orders" koleksiyonunda yeni bir belge oluşturulduğunda
 * tetiklenir ve ilgili kullanıcıya sipariş onay e-postası gönderir.
 */
exports.sendOrderConfirmationEmail = functions.firestore
  .document('siparisler/{orderId}')
  .onCreate(async (snapshot, context) => {
    try {
      const orderData = snapshot.data();
      const orderId = context.params.orderId;

      if (!orderData) {
        console.error('Sipariş verisi bulunamadı');
        return null;
      }

      // Mevcut onCreate tetikleyicisine bağla (ayrı export: eur3 Firestore + us-central1 uyumsuz)
      try {
        await notifyAdminsOnNewOrderInternal(orderId, orderData);
      } catch (adminNotifyError) {
        console.error('Admin yeni sipariş bildirimi hatası:', adminNotifyError);
      }

      const { customerEmail, customerName, items, amount } = orderData;

      if (!customerEmail) {
        console.error('Müşteri e-postası bulunamadı');
        return null;
      }

      // E-posta içeriğini oluştur
      const emailBody = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sipariş Onayı</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🍞 EkmekLab</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">Beylikdüzü Atölyesi</p>
                    </td>
                  </tr>

                  <!-- Onay Mesajı -->
                  <tr>
                    <td style="padding: 30px; text-align: center;">
                      <div style="background-color: #4CAF50; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="margin: 0; font-size: 24px;">✅ Siparişiniz Alındı!</h2>
                      </div>
                      <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Merhaba <strong>${customerName}</strong>,<br>
                        Siparişiniz başarıyla alınmıştır. En kısa sürede hazırlayıp size ulaştıracağız.
                      </p>
                    </td>
                  </tr>

                  <!-- Sipariş Bilgileri -->
                  <tr>
                    <td style="padding: 0 30px 20px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 15px;">
                        <tr>
                          <td style="padding: 5px 0;">
                            <strong>📋 Sipariş No:</strong> #${orderId.substring(0, 8).toUpperCase()}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0;">
                            <strong>📅 Tarih:</strong> ${new Date().toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
                          </td>
                        </tr>
                        ${orderData.customerPhone ? `
                        <tr>
                          <td style="padding: 5px 0;">
                            <strong>📞 Telefon:</strong> ${orderData.customerPhone}
                          </td>
                        </tr>
                        ` : ''}
                        ${orderData.paymentMethod ? `
                        <tr>
                          <td style="padding: 5px 0;">
                            <strong>💳 Ödeme:</strong> ${orderData.paymentMethod}
                          </td>
                        </tr>
                        ` : ''}
                      </table>
                    </td>
                  </tr>

                  <!-- Ürün Listesi -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <h3 style="color: #8B4513; margin-bottom: 15px;">🛒 Sipariş Detayları</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <thead>
                          <tr style="background-color: #8B4513; color: white;">
                            <th style="padding: 12px; text-align: left;">Ürün</th>
                            <th style="padding: 12px; text-align: center;">Adet</th>
                            <th style="padding: 12px; text-align: right;">Fiyat</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${items.map(item => `
                            <tr>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <strong>${item.name}</strong>
                              </td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                                ${item.quantity} adet
                              </td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                                ${(item.price * item.quantity).toFixed(2)} ₺
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                        <tfoot>
                          <tr style="background-color: #f9f9f9;">
                            <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px;">
                              TOPLAM:
                            </td>
                            <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 20px; color: #4CAF50;">
                              ${amount.toFixed(2)} ₺
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </td>
                  </tr>

                  ${orderData.notes ? `
                  <!-- Not -->
                  <tr>
                    <td style="padding: 0 30px 20px 30px;">
                      <div style="background-color: #FFF9C4; border-left: 4px solid #FBC02D; padding: 15px; border-radius: 4px;">
                        <strong>📝 Not:</strong> ${orderData.notes}
                      </div>
                    </td>
                  </tr>
                  ` : ''}

                  <!-- İletişim -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #ddd;">
                      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                        Sorularınız için bize ulaşın:
                      </p>
                      <p style="margin: 0; color: #8B4513; font-size: 16px; font-weight: bold;">
                        📞 <a href="tel:+905551234567" style="color: #8B4513; text-decoration: none;">0555 123 45 67</a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px; background-color: #333; text-align: center;">
                      <p style="margin: 0; color: #fff; font-size: 12px;">
                        © ${new Date().getFullYear()} EkmekLab - Tüm hakları saklıdır.
                      </p>
                      <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">
                        Bu email otomatik olarak gönderilmiştir.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // E-posta gönderimi için yapılandırma
      const mailTransport = getMailTransport();

      const mailOptions = {
        from: getFromAddress(),
        to: customerEmail,
        subject: 'Siparişiniz Alındı - EkmekLab',
        html: emailBody,
      };

      await mailTransport.sendMail(mailOptions);
      console.log(`Sipariş onay e-postası gönderildi: ${customerEmail}`);

      // Başarılı gönderim durumunu kaydet
      await admin.firestore().collection('email_logs').add({
        orderId,
        customerEmail,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        type: 'order_confirmation'
      });

      return null;
    } catch (error) {
      console.error('E-posta gönderilirken hata:', error);

      // Hata durumunu kaydet
      await admin.firestore().collection('email_logs').add({
        orderId: context.params.orderId,
        error: error.message,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'error',
        type: 'order_confirmation'
      });

      return null;
    }
  });

/**
 * Yeni sipariş → aktif sipariş yetkili adminlere FCM (+ opsiyonel yedek e-posta).
 * sendOrderConfirmationEmail onCreate içinden çağrılır (ayrı Firestore trigger yok —
 * eur3 DB + us-central1 yeni trigger engeli).
 */
async function notifyAdminsOnNewOrderInternal(orderId, orderData) {
  const message = buildAdminNewOrderNotification({
    orderId,
    orderData: orderData || {},
    formatShortOrderNumber,
  });

  const adminsSnap = await admin.firestore()
    .collection('adminler')
    .where('isActive', '==', true)
    .get();

  const adminDocs = adminsSnap.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() || {},
  }));
  const staffUids = selectOrderStaffAdminUids(adminDocs);

  if (staffUids.length === 0) {
    console.log('notifyAdminsOnNewOrder: aktif sipariş yetkilisi yok');
  } else {
    let allTargets = [];
    for (const uid of staffUids) {
      const targets = await getUserNotificationTargets(uid);
      allTargets.push(...targets);
    }
    allTargets = dedupeNotificationTargets(allTargets);

    if (allTargets.length === 0) {
      console.log('notifyAdminsOnNewOrder: aktif FCM token yok');
    } else {
      const messages = allTargets.map((target) => ({
        token: target.token,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: message.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel',
            sound: 'default',
            color: '#8B4513',
            icon: 'ic_notification',
          },
        },
        webpush: {
          fcmOptions: {
            link: '/admin/orders',
          },
          notification: {
            title: message.title,
            body: message.body,
          },
        },
      }));

      const responses = await admin.messaging().sendAll(messages);
      console.log(
        `notifyAdminsOnNewOrder: ${responses.successCount} ok, ${responses.failureCount} fail`
      );

      if (responses.failureCount > 0) {
        for (let i = 0; i < responses.responses.length; i++) {
          const response = responses.responses[i];
          if (response.success) continue;
          const failedTarget = allTargets[i];
          if (!failedTarget) continue;
          try {
            if (failedTarget.source === 'legacy') {
              await admin.firestore().collection('users').doc(failedTarget.userId).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            } else if (failedTarget.source === 'devices' && failedTarget.deviceDocId) {
              await admin.firestore()
                .collection('users')
                .doc(failedTarget.userId)
                .collection('devices')
                .doc(failedTarget.deviceDocId)
                .set(
                  { active: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
                  { merge: true }
                );
            }
          } catch (cleanupError) {
            console.error('notifyAdminsOnNewOrder token cleanup:', cleanupError);
          }
        }
      }
    }
  }

  const adminNotifyEmail =
    (process.env.ADMIN_NOTIFY_EMAIL || process.env.GMAIL_USER || '').trim();
  if (adminNotifyEmail) {
    try {
      const mailTransport = getMailTransport();
      await mailTransport.sendMail({
        from: getFromAddress('EkmekLab Ops'),
        to: adminNotifyEmail,
        subject: `${message.title}: ${message.body}`,
        text: `${message.body}\n\nPanel: /admin/orders\nSipariş: ${orderId}`,
      });
      console.log(`notifyAdminsOnNewOrder: yedek e-posta gönderildi → ${adminNotifyEmail}`);
    } catch (mailError) {
      console.error('notifyAdminsOnNewOrder e-posta hatası:', mailError);
    }
  }
}

/**
 * Firestore tetikleyicisi - Sipariş durumu güncellendiğinde e-posta gönder
 * 
 * Bu fonksiyon, "orders" koleksiyonunda bir belge güncellendiğinde
 * tetiklenir ve sipariş durumu değiştiyse kullanıcıya bildirim e-postası gönderir.
 */
exports.sendOrderStatusEmail = functions.firestore
  .document('siparisler/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      const orderId = context.params.orderId;
      const newOrderData = change.after.data();
      const oldOrderData = change.before.data();

      // Sipariş durumu değişmediyse işlem yapma
      if (newOrderData.status === oldOrderData.status) {
        return null;
      }

      const { customerEmail, customerName, items, amount, status } = newOrderData;

      if (!customerEmail) {
        console.error('Müşteri e-postası bulunamadı');
        return null;
      }

      // Durum için başlık ve açıklama belirle
      let statusTitle = '';
      let statusDescription = '';
      let buttonText = '';
      let buttonUrl = '';
      let statusColor = '';

      switch (status) {
        case 'processing':
          statusTitle = 'Siparişiniz Hazırlanıyor';
          statusDescription = 'Siparişiniz şu anda fırınımızda özenle hazırlanıyor. Taze ekmeğiniz yakında hazır olacak!';
          buttonText = 'Siparişi Görüntüle';
          buttonUrl = `https://ekmeklab.com/orders/${orderId}`;
          statusColor = '#FF9800'; // Turuncu
          break;
        case 'ready':
          statusTitle = 'Siparişiniz Hazır - Alınabilir!';
          statusDescription = 'Taze ekmeğiniz hazır! Belirlediğimiz adresten teslim alabilirsiniz.';
          buttonText = 'Teslim Alma Bilgileri';
          buttonUrl = `https://ekmeklab.com/orders/${orderId}`;
          statusColor = '#9C27B0'; // Mor
          break;
        case 'delivered':
          statusTitle = 'Siparişiniz Teslim Edildi';
          statusDescription = 'Siparişiniz başarıyla teslim edildi. Afiyet olsun! Deneyiminizi değerlendirmeyi unutmayın.';
          buttonText = 'Siparişi Değerlendir';
          buttonUrl = `https://ekmeklab.com/orders/${orderId}/review`;
          statusColor = '#4CAF50'; // Yeşil
          break;
        case 'cancelled':
          statusTitle = 'Siparişiniz İptal Edildi';
          statusDescription = 'Siparişiniz iptal edildi. Detaylı bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.';
          buttonText = 'Müşteri Hizmetleri';
          buttonUrl = 'https://ekmeklab.com/contact';
          statusColor = '#F44336'; // Kırmızı
          break;
        default:
          return null; // Bilinmeyen durum için işlem yapma
      }

      // E-posta içeriğini oluştur
      const emailBody = `
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #8B4513; padding: 20px; text-align: center; color: white;">
            <h1>EkmekLab</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2>Merhaba ${customerName},</h2>
            
            <div style="background-color: ${statusColor}; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <h2 style="margin: 0;">${statusTitle}</h2>
            </div>
            
            <p>${statusDescription}</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #8B4513;">📋 Sipariş Detayları:</h3>
              <p><strong>Sipariş No:</strong> ${orderId}</p>
              <p><strong>Toplam Tutar:</strong> ${amount.toFixed(2)} ₺</p>
              <p><strong>Durum:</strong> ${statusTitle}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${buttonUrl}" style="background-color: #8B4513; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                ${buttonText}
              </a>
            </div>
            
            <p>Sorularınız için bize ulaşabilirsiniz: <a href="tel:05551234567" style="color: #8B4513;">0555 123 4567</a></p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
              <p>Bizi tercih ettiğiniz için teşekkürler!</p>
              <p><strong>EkmekLab</strong></p>
              <p style="font-size: 12px; color: #777;">
                Bu e-posta otomatik olarak gönderilmiştir, lütfen cevaplamayınız.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // E-posta gönderimi için yapılandırma
      const mailTransport = getMailTransport();

      const mailOptions = {
        from: getFromAddress(),
        to: customerEmail,
        subject: `Sipariş Durumu: ${statusTitle} - EkmekLab`,
        html: emailBody,
      };

      await mailTransport.sendMail(mailOptions);
      console.log(`Sipariş durum e-postası gönderildi: ${customerEmail}, Durum: ${status}`);

      // Başarılı gönderim durumunu kaydet
      await admin.firestore().collection('email_logs').add({
        orderId,
        customerEmail,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        type: 'order_status_update',
        orderStatus: status
      });

      return null;
    } catch (error) {
      console.error('E-posta gönderilirken hata:', error);

      // Hata durumunu kaydet
      await admin.firestore().collection('email_logs').add({
        orderId: context.params.orderId,
        error: error.message,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'error',
        type: 'order_status_update'
      });

      return null;
    }
  });

/**
 * Kullanıcı tokenlarını topla (öncelik: users/{uid}/devices, fallback: users/{uid}.fcmToken)
 */
async function getUserNotificationTargets(userId) {
  const targets = [];

  try {
    const devicesSnapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('devices')
      .where('active', '==', true)
      .get();

    devicesSnapshot.forEach((doc) => {
      const deviceData = doc.data() || {};
      if (deviceData.token) {
        targets.push({
          token: deviceData.token,
          userId,
          source: 'devices',
          deviceDocId: doc.id,
        });
      }
    });

    if (targets.length > 0) {
      return targets;
    }

    // Legacy fallback
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    if (userData && userData.fcmToken) {
      targets.push({
        token: userData.fcmToken,
        userId,
        source: 'legacy',
      });
    }
  } catch (error) {
    console.error(`Token toplama hatası (${userId}):`, error);
  }

  return targets;
}

/**
 * Sipariş durumu değiştiğinde push notification gönder
 * Trigger: onUpdate -> siparisler/{orderId}
 */
exports.sendOrderStatusNotification = functions.firestore
  .document('siparisler/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      const previousStatus = before.orderStatus || before.status;
      const nextStatus = after.orderStatus || after.status;

      // Durum değişmemişse işlem yapma
      if (previousStatus === nextStatus) {
        console.log('Sipariş durumu değişmedi, notification gönderilmiyor');
        return null;
      }

      const orderId = context.params.orderId;
      const customerId = after.userId;
      const displayOrderNumber =
        (after.orderNumber && String(after.orderNumber).trim()) ||
        formatShortOrderNumber(orderId);

      if (!customerId) {
        console.log('Müşteri ID bulunamadı, notification gönderilmiyor');
        return null;
      }

      // Durum mesajlarını oluştur
      const statusMessages = {
        'pending': {
          title: '📦 Siparişiniz Alındı',
          body: `Sipariş numaranız: ${displayOrderNumber}. Siparişiniz hazırlanmaya başlanacak.`
        },
        'processing': {
          title: '👨‍🍳 Siparişiniz Hazırlanıyor',
          body: `${displayOrderNumber} numaralı siparişiniz hazırlanıyor. Taze ekmekleriniz fırından çıkıyor!`
        },
        'ready': {
          title: '✅ Siparişiniz Hazır',
          body: `${displayOrderNumber} numaralı siparişiniz hazır! Teslimata çıkmak üzere.`
        },
        'shipped': {
          title: '🚚 Siparişiniz Yolda',
          body: `${displayOrderNumber} numaralı siparişiniz yola çıktı! Yakında kapınızda olacak.`
        },
        'delivered': {
          title: '🎉 Siparişiniz Teslim Edildi',
          body: `${displayOrderNumber} numaralı siparişiniz teslim edildi. Afiyet olsun!`
        },
        'cancelled': {
          title: '❌ Sipariş İptal Edildi',
          body: `${displayOrderNumber} numaralı siparişiniz iptal edildi. Sorularınız için bize ulaşabilirsiniz.`
        }
      };

      const statusMessage = statusMessages[nextStatus] || {
        title: '📬 Sipariş Durumu Güncellendi',
        body: `${displayOrderNumber} numaralı siparişinizde güncelleme var.`
      };

      // Kullanıcının tokenlerini al (devices öncelikli, legacy fallback)
      const targets = await getUserNotificationTargets(customerId);
      const uniqueTargets = Array.from(
        new Map(targets.map((t) => [t.token, t])).values()
      );

      if (uniqueTargets.length === 0) {
        console.log('Kullanıcının aktif cihazı yok');
        return null;
      }

      // FCM mesajlarını hazırla
      const messages = uniqueTargets.map((target) => {
        return {
          token: target.token,
          notification: {
            title: statusMessage.title,
            body: statusMessage.body,
          },
          data: {
            orderId: orderId,
            orderNumber: displayOrderNumber,
            orderStatus: nextStatus || 'updated',
            type: 'order_update',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'high_importance_channel',
              sound: 'default',
              color: '#8B4513',
              icon: 'ic_notification',
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              }
            }
          }
        };
      });

      // FCM ile bildirimleri gönder
      const responses = await admin.messaging().sendAll(messages);
      console.log(`${responses.successCount} bildirim başarıyla gönderildi`);
      console.log(`${responses.failureCount} bildirim gönderilemedi`);

      if (responses.failureCount > 0) {
        for (let i = 0; i < responses.responses.length; i++) {
          const response = responses.responses[i];
          if (response.success) continue;

          const failedTarget = uniqueTargets[i];
          if (!failedTarget) continue;

          try {
            if (failedTarget.source === 'legacy') {
              await admin.firestore().collection('users').doc(failedTarget.userId).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            } else if (failedTarget.source === 'devices' && failedTarget.deviceDocId) {
              await admin.firestore()
                .collection('users')
                .doc(failedTarget.userId)
                .collection('devices')
                .doc(failedTarget.deviceDocId)
                .set({ active: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            }
          } catch (cleanupError) {
            console.error('Başarısız token temizleme hatası:', cleanupError);
          }
        }
      }

      // Firestore'a bildirim kaydı ekle
      const notificationData = {
        title: statusMessage.title,
        body: statusMessage.body,
        type: 'order',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
        data: {
          orderId: orderId,
          orderNumber: displayOrderNumber,
          orderStatus: nextStatus || 'updated',
        }
      };

      await admin.firestore()
        .collection('users')
        .doc(customerId)
        .collection('notifications')
        .add(notificationData);

      console.log('Bildirim Firestore\'a kaydedildi');

      return null;
    } catch (error) {
      console.error('Sipariş bildirimi gönderilirken hata:', error);
      return null;
    }
  });

/**
 * Admin claim senkronizasyonu
 * İstek: Authorization: Bearer <idToken>
 * Akış: Token doğrulanır -> adminler/{uid} isActive kontrol edilir -> customClaims.isAdmin = true/false set edilir
 */
exports.ensureAdminClaim = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const authHeader = req.headers.authorization || '';
      const m = authHeader.match(/^Bearer\s+(.*)$/i);
      if (!m) return res.status(401).send({ error: 'Missing Authorization Bearer token' });
      const idToken = m[1];

      const decoded = await admin.auth().verifyIdToken(idToken, true);
      const uid = decoded.uid;

      // Admin koleksiyonundan kontrol et
      const adminRef = admin.firestore().collection('adminler').doc(uid);
      const adminDoc = await adminRef.get();
      const adminData = adminDoc.exists ? (adminDoc.data() || {}) : {};
      const isActive = adminDoc.exists && adminData.isActive === true;

      // Role yoksa legacy admin kayıtlarını CF staff check ile hizala (Admin SDK)
      if (isActive) {
        const existingRole = String(adminData.role || '').trim().toLowerCase();
        if (!existingRole) {
          await adminRef.set({
            role: 'admin',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      // Mevcut claim'leri al
      const userRecord = await admin.auth().getUser(uid);
      const claims = userRecord.customClaims || {};
      const want = !!isActive;
      const have = !!claims.isAdmin;

      if (want !== have) {
        await admin.auth().setCustomUserClaims(uid, { ...claims, isAdmin: want });
      }

      // Token yenileme bilgisini döndür
      return res.status(200).send({ success: true, isAdmin: want, mustRefreshToken: true });
    } catch (e) {
      console.error('ensureAdminClaim error:', e);
      return res.status(500).send({ error: e.message });
    }
  });
});

/**
 * Manuel Push Notification Gönderimi
 * 
 * Admin panelden manuel bildirim gönderir.
 * Hedef: Tüm kullanıcılar, belirli kullanıcı veya sipariş bazlı
 */
exports.sendManualNotification = functions.https.onCall(async (data, context) => {
  try {
    // Admin kontrolü
    if (!context.auth || !context.auth.token.isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Bu işlem için admin yetkisi gereklidir'
      );
    }

    const {
      title,
      body,
      template,
      targetType,
      targetUserId,
      targetOrderId,
      data: additionalData,
    } = data;

    // Validasyon
    if (!title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Başlık ve mesaj gereklidir'
      );
    }

    if (!['all', 'user', 'order'].includes(targetType)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Geçersiz hedef tipi'
      );
    }

    // FCM token'larını topla
    let tokenTargets = [];

    if (targetType === 'all') {
      // Tüm kullanıcıların token'larını al
      const usersSnapshot = await admin.firestore().collection('users').get();
      for (const doc of usersSnapshot.docs) {
        const targets = await getUserNotificationTargets(doc.id);
        tokenTargets.push(...targets);
      }
    } else if (targetType === 'user' && targetUserId) {
      // Belirli kullanıcının tokenlarını al
      const targets = await getUserNotificationTargets(targetUserId);
      tokenTargets.push(...targets);
    } else if (targetType === 'order' && targetOrderId) {
      // Sipariş sahibinin token'ını al
      const orderDoc = await admin.firestore().collection('siparisler').doc(targetOrderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        const userId = orderData.userId;

        if (userId) {
          const targets = await getUserNotificationTargets(userId);
          tokenTargets.push(...targets);
        }
      }
    }

    // Mükerrer tokenları temizle
    tokenTargets = Array.from(new Map(tokenTargets.map((t) => [t.token, t])).values());
    const tokens = tokenTargets.map((t) => t.token);

    if (tokens.length === 0) {
      throw new functions.https.HttpsError(
        'not-found',
        'Bildirim gönderilebilecek kullanıcı bulunamadı'
      );
    }

    // FCM mesajı oluştur
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        template: template || 'custom',
        ...(additionalData || {}),
      },
      android: {
        notification: {
          sound: 'default',
          channelId: 'high_importance_channel',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Batch gönderim (500'er token)
    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);

      try {
        const response = await admin.messaging().sendMulticast({
          tokens: batchTokens,
          ...message,
        });

        sentCount += response.successCount;
        failedCount += response.failureCount;

        // Başarısız token'ları temizle
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(batchTokens[idx]);
            }
          });

          // Geçersiz token'ları user dokümanlarından kaldır
          for (const failedToken of failedTokens) {
            const failedTarget = tokenTargets.find((target) => target.token === failedToken);
            if (!failedTarget) continue;

            if (failedTarget.source === 'legacy') {
              await admin.firestore().collection('users').doc(failedTarget.userId).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            } else if (failedTarget.source === 'devices' && failedTarget.deviceDocId) {
              await admin.firestore()
                .collection('users')
                .doc(failedTarget.userId)
                .collection('devices')
                .doc(failedTarget.deviceDocId)
                .set({ active: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            }
          }
        }
      } catch (error) {
        console.error(`Batch gönderim hatası (${i}-${i + batchSize}):`, error);
        failedCount += batchTokens.length;
      }
    }

    // Bildirim kaydı oluştur (istatistik için)
    await admin.firestore().collection('notification_logs').add({
      title,
      body,
      template,
      targetType,
      targetUserId: targetUserId || null,
      targetOrderId: targetOrderId || null,
      sentCount,
      failedCount,
      totalTargets: tokens.length,
      sentBy: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Manuel bildirim gönderildi: ${sentCount}/${tokens.length} başarılı`);

    return {
      success: true,
      sentCount,
      failedCount,
      totalTargets: tokens.length,
    };
  } catch (error) {
    console.error('sendManualNotification error:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Bildirim gönderimi sırasında hata oluştu: ' + error.message
    );
  }
});
/**
 * Anonim oturumdan kalıcı hesaba sipariş/profil ownership migrasyonu.
 * Client, anonim ID token'ı (oturum değişmeden önce alınmış) gönderir;
 * hedef UID authenticated caller'dır. Client doğrudan userId yazamaz.
 */
exports.migrateAnonymousOwnership = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ code: 'UNAUTHENTICATED', message: 'Bearer token gerekli' });
      }
      const idToken = authHeader.slice('Bearer '.length).trim();
      const decoded = await admin.auth().verifyIdToken(idToken);
      const targetUid = decoded.uid;
      if (!targetUid) {
        return res.status(401).send({ code: 'UNAUTHENTICATED', message: 'Geçersiz oturum' });
      }
      if (decoded.firebase && decoded.firebase.sign_in_provider === 'anonymous') {
        return res.status(400).send({
          code: 'FAILED_PRECONDITION',
          message: 'Migrasyon hedefi anonim olamaz',
        });
      }

      const anonymousIdToken = (req.body && req.body.anonymousIdToken) || '';
      if (!anonymousIdToken || typeof anonymousIdToken !== 'string') {
        return res.status(400).send({
          code: 'INVALID_ARGUMENT',
          message: 'anonymousIdToken gerekli',
        });
      }

      let anonymousDecoded;
      try {
        anonymousDecoded = await admin.auth().verifyIdToken(anonymousIdToken);
      } catch (e) {
        return res.status(401).send({
          code: 'INVALID_ANONYMOUS_TOKEN',
          message: 'Anonim token doğrulanamadı',
        });
      }

      const fromUid = anonymousDecoded.uid;
      if (!fromUid || fromUid === targetUid) {
        return res.status(200).send({
          success: true,
          migratedOrders: 0,
          skipped: true,
          reason: 'same_uid_or_empty',
        });
      }

      const provider = anonymousDecoded.firebase && anonymousDecoded.firebase.sign_in_provider;
      if (provider !== 'anonymous') {
        return res.status(403).send({
          code: 'PERMISSION_DENIED',
          message: 'Kaynak token anonim değil',
        });
      }

      // Token yaşı (max 30 dk)
      const authTimeMs = (anonymousDecoded.auth_time || 0) * 1000;
      if (authTimeMs && Date.now() - authTimeMs > 30 * 60 * 1000) {
        return res.status(403).send({
          code: 'TOKEN_EXPIRED',
          message: 'Anonim migrasyon penceresi doldu',
        });
      }

      const db = admin.firestore();
      const ordersSnap = await db
        .collection('siparisler')
        .where('userId', '==', fromUid)
        .get();

      let migratedOrders = 0;
      const batchSize = 400;
      let batch = db.batch();
      let ops = 0;

      for (const doc of ordersSnap.docs) {
        batch.update(doc.ref, {
          userId: targetUid,
          previousAnonymousUserId: fromUid,
          ownershipMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        migratedOrders += 1;
        ops += 1;
        if (ops >= batchSize) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }

      const addressesSnap = await db
        .collection('saved_addresses')
        .where('userId', '==', fromUid)
        .get();
      let migratedAddresses = 0;
      for (const doc of addressesSnap.docs) {
        batch.update(doc.ref, {
          userId: targetUid,
          previousAnonymousUserId: fromUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        migratedAddresses += 1;
        ops += 1;
        if (ops >= batchSize) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }

      const fromUserRef = db.collection('users').doc(fromUid);
      const toUserRef = db.collection('users').doc(targetUid);
      const fromUserSnap = await fromUserRef.get();
      if (fromUserSnap.exists) {
        const fromData = fromUserSnap.data() || {};
        const mergeFields = {};
        ['fullName', 'phoneNumber', 'email', 'address'].forEach((key) => {
          if (fromData[key] && typeof fromData[key] === 'string' && fromData[key].trim()) {
            mergeFields[key] = fromData[key];
          }
        });
        if (Object.keys(mergeFields).length > 0) {
          mergeFields.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          mergeFields.migratedFromAnonymousUid = fromUid;
          batch.set(toUserRef, mergeFields, { merge: true });
          ops += 1;
        }
      }

      batch.set(
        db.collection('account_migrations').doc(fromUid + '_' + targetUid),
        {
          fromUid,
          targetUid,
          migratedOrders,
          migratedAddresses,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      ops += 1;

      if (ops > 0) {
        await batch.commit();
      }

      // Anonim Auth kullanıcısını temizlemeyi dene (opsiyonel)
      try {
        await admin.auth().deleteUser(fromUid);
      } catch (e) {
        console.warn('Anonymous user delete skipped:', e.message || e);
      }

      return res.status(200).send({
        success: true,
        fromUid,
        targetUid,
        migratedOrders,
        migratedAddresses,
      });
    } catch (error) {
      console.error('migrateAnonymousOwnership error:', error);
      return res.status(500).send({
        code: 'INTERNAL',
        message: error.message || 'Migrasyon hatası',
      });
    }
  });
});
