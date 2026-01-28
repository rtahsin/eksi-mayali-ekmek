const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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
    if (!origin) return callback(null, true); // allow non-browser clients
    try {
      const allowed = ALLOWED_ORIGINS.includes(origin) || /http:\/\/localhost:\d+/.test(origin) || /http:\/\/127\.0\.0\.1:\d+/.test(origin);
      return callback(null, allowed);
    } catch (_) {
      return callback(null, false);
    }
  },
  credentials: true,
});
require('dotenv').config();

admin.initializeApp();

// Ortak mail transport oluşturucu
function getMailTransport() {
  const user = process.env.GMAIL_USER || functions.config().gmail?.user;
  const pass = process.env.GMAIL_PASSWORD || functions.config().gmail?.pass;
  if (!user || !pass) {
    console.error('Mail transport yapılandırması eksik (GMAIL_USER / GMAIL_PASSWORD).');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

function getFromAddress(nameOverride) {
  const user = process.env.GMAIL_USER || functions.config().gmail?.user || 'ekmeklab@gmail.com';
  return { name: nameOverride || 'Ekşi Mayalı Ekmek', address: user };
}

/**
 * Email OTP İsteme (HTTP)
 * Body: { uid, email, fullName }
 */
exports.requestEmailOtp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // OPTIONS request için CORS pre-flight
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { uid, email, fullName } = req.body || {};
      if (!email) {
        return res.status(400).send({ error: 'email gereklidir' });
      }

      const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

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
          <p>Ekşi Mayalı Ekmek hesabınızı doğrulamak için aşağıdaki kodu girin:</p>
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
  cors(req, res, async () => {
    // OPTIONS request için CORS pre-flight
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
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
 * E-posta gönderim fonksiyonu
 * 
 * Bu fonksiyon, HTTP isteği olarak e-posta detaylarını alır ve
 * nodemailer kullanarak e-postayı gönderir.
 */
exports.sendEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const { to, subject, html, from, fromName } = req.body;

      if (!to || !subject || !html) {
        return res.status(400).send({ error: 'E-posta, konu ve içerik gereklidir' });
      }

      // E-posta gönderimi için yapılandırma
      // NOT: Gerçek uygulamada bu bilgileri environment variables olarak saklayın
      const mailTransport = getMailTransport();

      const mailOptions = {
        from: from ? { name: fromName || 'Ekşi Mayalı Ekmek', address: from } : getFromAddress(fromName),
        to,
        subject,
        html,
      };

      await mailTransport.sendMail(mailOptions);

      // Başarılı gönderim
      console.log(`E-posta gönderildi: ${to}`);
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
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">Doğal Ekşi Mayalı Ekmek</p>
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
        subject: 'Siparişiniz Alındı - Ekşi Mayalı Ekmek',
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
            <h1>Ekşi Mayalı Ekmek</h1>
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
              <p><strong>Ekşi Mayalı Ekmek</strong></p>
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
        subject: `Sipariş Durumu: ${statusTitle} - Ekşi Mayalı Ekmek`,
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
 * Sipariş durumu değiştiğinde push notification gönder
 * Trigger: onUpdate -> siparisler/{orderId}
 */
exports.sendOrderStatusNotification = functions.firestore
  .document('siparisler/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Durum değişmemişse işlem yapma
      if (before.orderStatus === after.orderStatus) {
        console.log('Sipariş durumu değişmedi, notification gönderilmiyor');
        return null;
      }

      const orderId = context.params.orderId;
      const customerId = after.userId;

      if (!customerId) {
        console.log('Müşteri ID bulunamadı, notification gönderilmiyor');
        return null;
      }

      // Durum mesajlarını oluştur
      const statusMessages = {
        'pending': {
          title: '📦 Siparişiniz Alındı',
          body: `Sipariş numaranız: ${after.orderNumber}. Siparişiniz hazırlanmaya başlanacak.`
        },
        'processing': {
          title: '👨‍🍳 Siparişiniz Hazırlanıyor',
          body: `${after.orderNumber} numaralı siparişiniz hazırlanıyor. Taze ekmekleriniz fırından çıkıyor!`
        },
        'ready': {
          title: '✅ Siparişiniz Hazır',
          body: `${after.orderNumber} numaralı siparişiniz hazır! Kargoya verilmek üzere bekleniyor.`
        },
        'shipped': {
          title: '🚚 Siparişiniz Kargoda',
          body: `${after.orderNumber} numaralı siparişiniz yola çıktı! Yakında kapınızda olacak.`
        },
        'delivered': {
          title: '🎉 Siparişiniz Teslim Edildi',
          body: `${after.orderNumber} numaralı siparişiniz teslim edildi. Afiyet olsun!`
        },
        'cancelled': {
          title: '❌ Sipariş İptal Edildi',
          body: `${after.orderNumber} numaralı siparişiniz iptal edildi. Sorularınız için bize ulaşabilirsiniz.`
        }
      };

      const statusMessage = statusMessages[after.orderStatus] || {
        title: '📬 Sipariş Durumu Güncellendi',
        body: `${after.orderNumber} numaralı siparişinizde güncelleme var.`
      };

      // Kullanıcının cihaz tokenlerini al
      const devicesSnapshot = await admin.firestore()
        .collection('users')
        .doc(customerId)
        .collection('devices')
        .where('active', '==', true)
        .get();

      if (devicesSnapshot.empty) {
        console.log('Kullanıcının aktif cihazı yok');
        return null;
      }

      // FCM mesajlarını hazırla
      const messages = devicesSnapshot.docs.map(doc => {
        const deviceData = doc.data();
        return {
          token: deviceData.token,
          notification: {
            title: statusMessage.title,
            body: statusMessage.body,
          },
          data: {
            orderId: orderId,
            orderNumber: after.orderNumber,
            orderStatus: after.orderStatus,
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

      // Firestore'a bildirim kaydı ekle
      const notificationData = {
        title: statusMessage.title,
        body: statusMessage.body,
        type: 'order',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
        data: {
          orderId: orderId,
          orderNumber: after.orderNumber,
          orderStatus: after.orderStatus,
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
      const adminDoc = await admin.firestore().collection('adminler').doc(uid).get();
      const isActive = adminDoc.exists && adminDoc.data()?.isActive === true;

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
    let tokens = [];
    let targetUserIds = [];

    if (targetType === 'all') {
      // Tüm kullanıcıların token'larını al
      const usersSnapshot = await admin.firestore().collection('users').get();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
          targetUserIds.push(doc.id);
        }
      });
    } else if (targetType === 'user' && targetUserId) {
      // Belirli kullanıcının token'ını al
      const userDoc = await admin.firestore().collection('users').doc(targetUserId).get();
      if (userDoc.exists && userDoc.data().fcmToken) {
        tokens.push(userDoc.data().fcmToken);
        targetUserIds.push(targetUserId);
      }
    } else if (targetType === 'order' && targetOrderId) {
      // Sipariş sahibinin token'ını al
      const orderDoc = await admin.firestore().collection('siparisler').doc(targetOrderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        const userId = orderData.userId;

        if (userId) {
          const userDoc = await admin.firestore().collection('users').doc(userId).get();
          if (userDoc.exists && userDoc.data().fcmToken) {
            tokens.push(userDoc.data().fcmToken);
            targetUserIds.push(userId);
          }
        }
      }
    }

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
            const tokenIndex = tokens.indexOf(failedToken);
            if (tokenIndex !== -1) {
              const userId = targetUserIds[tokenIndex];
              await admin.firestore().collection('users').doc(userId).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
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