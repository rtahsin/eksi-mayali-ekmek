# 📱 WhatsApp Entegrasyonu - Kullanım Kılavuzu

## 📋 Genel Bakış

EkmekLab admin paneline WhatsApp Business entegrasyonu eklendi. Admin kullanıcılar artık müşterilere sipariş güncellemelerini **tek tıkla WhatsApp ile** gönderebilir.

**Özellikler:**

- ✅ Otomatik sipariş bildirimleri (durum değişikliğinde)
- ✅ Hazır mesaj şablonları (her durum için özel)
- ✅ Telefon numarası validasyonu (Türkiye formatı)
- ✅ Emoji destekli profesyonel mesajlar
- ✅ Web ve mobil uyumlu

---

## 🚀 Kullanım Senaryoları

### 1️⃣ Sipariş Listesinden Hızlı Mesaj

**Adımlar:**

1. Admin Panel → Siparişler sayfasına git
2. Sipariş kartında **yeşil WhatsApp ikonu**nu gör (telefon numarası geçerliyse)
3. İkona tıkla
4. WhatsApp Web/App otomatik açılır
5. Mesaj otomatik doldurulur (sipariş bilgileri ile)
6. İstersen mesajı düzenle
7. Gönder!

**Ne zaman kullan:**

- Müşteriyle hızlı iletişim kurmak istediğinde
- Sipariş hakkında ekstra bilgi vermek için
- Teslimat detaylarını netleştirmek için

---

### 2️⃣ Sipariş Detayından Mesaj Gönder

**Adımlar:**

1. Sipariş kartına tıkla → Detaylar açılır
2. Alt kısımda **"WhatsApp" butonu**nu gör (yeşil, chat ikonu)
3. Butona tıkla
4. WhatsApp açılır, sipariş özet mesajı hazır
5. Gönder!

**Ne zaman kullan:**

- Sipariş detaylarını gözden geçirdikten sonra
- Kapsamlı bilgilendirme yapmak için

---

### 3️⃣ Durum Güncellerken Otomatik Bildir (🌟 EN ÖNEMLİ)

**Adımlar:**

1. Sipariş detaylarında **"Durum Güncelle"** butonuna tıkla
2. Yeni durumu seç (Hazırlanıyor, Hazır, Teslim Edildi, vb.)
3. 📱 **"WhatsApp Bildirimi"** bölümünde checkbox'ı işaretle
   - Müşteri telefon numarası gösterilir
   - Otomatik mesaj gönderilecek
4. **"Güncelle"** butonuna tıkla
5. Durum değişir + WhatsApp otomatik açılır
6. Mesaj otomatik doldurulur (yeni durum bilgisi ile)
7. Gönder!

**Ne zaman kullan:**

- ✅ Sipariş hazırlandığında → "Hazırlanıyor" durumu
- ✅ Sipariş teslime hazır → "Hazır - Alınabilir" durumu
- ✅ Sipariş teslim edildi → "Teslim Edildi" durumu
- ✅ İptal durumunda → "İptal Edildi" (neden belirt)

---

## 📝 Mesaj Şablonları

WhatsApp Helper otomatik olarak her sipariş durumuna göre özel mesaj oluşturur:

### 1. **Sipariş Alındı** (pending)

```
Merhaba Ahmet! 👋

EkmekLab'tan sipariş onayı 🍞

✅ Sipariş No: #ABC12345
💰 Tutar: 125.50 ₺
📅 Tarih: 08 Ocak 2026 14:30

Siparişiniz alındı ve en kısa sürede hazırlanmaya başlayacak.

Sipariş detayları:
1. Ekşi Mayalı Ekmek x 2 adet
   80.00 ₺
2. Çavdarlı Ekmek x 1 adet
   45.50 ₺

Teşekkür ederiz! 🙏
EkmekLab Ekibi
```

---

### 2. **Hazırlanıyor** (processing)

```
Merhaba Ahmet! 👨‍🍳

Sipariş Durumu: HAZIRLANIYOR 🔥

📋 Sipariş No: #ABC12345
💰 Tutar: 125.50 ₺

Taze ekmeğiniz şu an fırında! 🍞✨
Kısa süre içinde hazır olacak ve teslim için sizi bilgilendireceğiz.

Sipariş içeriği:
1. Ekşi Mayalı Ekmek x 2 adet
2. Çavdarlı Ekmek x 1 adet

Afiyet olsun! 😊
EkmekLab
```

---

### 3. **Hazır - Alınabilir** (ready) ⭐ EN ÖNEMLİ

```
🎉 Harika Haber, Ahmet!

SİPARİŞİNİZ HAZIR! ✅

📋 Sipariş No: #ABC12345
💰 Tutar: 125.50 ₺

📍 Teslimat Adresi:
Atatürk Cad. No:123 Beylikdüzü/İstanbul

Taze ekmeğiniz sizi bekliyor! 🥖🍞

Sipariş içeriği:
1. Ekşi Mayalı Ekmek x 2 adet
2. Çavdarlı Ekmek x 1 adet

💵 Ödeme: Kapıda nakit

Sorularınız için bize yazabilirsiniz.
Teşekkürler! 🙏
EkmekLab
```

---

### 4. **Teslim Edildi** (delivered)

```
Merhaba Ahmet! 🎊

SİPARİŞ TESLİM EDİLDİ ✅

📋 Sipariş No: #ABC12345
💰 Tutar: 125.50 ₺

Siparişinizi teslim ettik. Afiyet olsun! 🍞😋

Ürünlerimizden memnun kaldıysanız:
⭐ Sipariş sayfasından değerlendirme yapabilirsiniz
📢 Bizi arkadaşlarınıza önerebilirsiniz

Bir sonraki siparişinizde görüşmek üzere!
EkmekLab Ekibi 🙏
```

---

### 5. **İptal Edildi** (cancelled)

```
Merhaba Ahmet,

Sipariş iptal edildi ❌

📋 Sipariş No: #ABC12345
💰 Tutar: 125.50 ₺

Siparişiniz iptal edildi.

İptal nedeni: Stok yetersizliği

Herhangi bir sorunuz varsa lütfen bize ulaşın. 
Size yardımcı olmaktan memnuniyet duyarız.

EkmekLab
```

---

## ✅ Telefon Numarası Formatı

WhatsApp entegrasyonu **Türkiye telefon numaralarını** otomatik temizler ve formatlar.

### Kabul Edilen Formatlar

```
✅ 0530 123 45 67
✅ +90 530 123 45 67
✅ (0530) 123-45-67
✅ 05301234567
✅ 905301234567
```

### Geçerli Operatörler

- 050X (Turkcell)
- 053X (Turkcell)
- 054X (Vodafone)
- 055X (Vodafone)
- 050X (Turk Telekom)

**Not:** Geçersiz telefon numaraları için WhatsApp ikonu/butonu gösterilmez.

---

## 🎯 İyi Pratikler

### ✅ YAPILMASI GEREKENLER

1. **Her durum değişikliğinde bildir**
   - Müşteri siparişin hangi aşamada olduğunu bilmeli
   - Özellikle "Hazır" durumunda **MUTLAKA** bildir

2. **Mesajı gözden geçir**
   - Otomatik mesaj oluşur ama gönder öncesi kontrol et
   - Gerekirse kişiselleştir (müşteri adı, özel not, vb.)

3. **Hızlı yanıt ver**
   - Müşteri WhatsApp'tan yazarsa hızlı cevapla
   - Profesyonel ve nazik ol

4. **Sipariş iptalinde neden belirt**
   - İptal notuna açıklama yaz
   - Müşteriye alternatif öner

5. **Teslimat zamanı bildir**
   - "Hazır" mesajında tahmini teslimat saati ekle
   - Örn: "14:00-15:00 arası teslim edilecek"

---

### ❌ YAPILMAMASI GEREKENLER

1. **Gece geç saatlerde mesaj gönderme**
   - 09:00 - 21:00 arası kullan
   - Mesai saatleri dışında acil değilse beklemeyi tercih et

2. **Aynı müşteriye çok sık mesaj**
   - Her durum değişikliğinde 1 mesaj yeterli
   - Spam yaratma

3. **Kişisel telefon kullanma**
   - İş için ayrı WhatsApp Business hesabı kullan
   - Profesyonel görünüm önemli

4. **Otomatik mesajı olduğu gibi gönderme**
   - Mutlaka gözden geçir
   - Eksik bilgi varsa tamamla

---

## 🔧 Teknik Detaylar

### WhatsApp Helper Özellikleri

**Dosya:** `lib/utils/whatsapp_helper.dart`

**Fonksiyonlar:**

- `cleanPhoneNumber()` - Telefon numarasını temizle (905XXXXXXXXX formatı)
- `isValidTurkishPhone()` - Türkiye numarası kontrolü
- `createWhatsAppUrl()` - wa.me link oluştur
- `createOrderStatusMessage()` - Durum bazlı mesaj
- `createOrderInfoMessage()` - Genel sipariş bilgisi mesajı
- `formatPhoneForDisplay()` - Güzel görünüm (+90 530 123 45 67)
- `openWhatsApp()` - WhatsApp'ı aç (web/mobil)

**Web Uyumluluğu:**

- Web'de: `https://wa.me/905301234567?text=...` (yeni sekme)
- Mobil'de: WhatsApp app açılır

---

## 🐞 Sorun Giderme

### Sorun: WhatsApp açılmıyor

**Çözüm:**

- Telefon numarasının doğru formatta olduğunu kontrol et
- Browser'ın popup engelini kaldır
- WhatsApp Web'e giriş yaptığından emin ol

---

### Sorun: WhatsApp butonu görünmüyor

**Çözüm:**

- Sipariş'te telefon numarası var mı kontrol et
- Telefon numarası geçerli mi? (05XX XXX XX XX)
- Admin panelinde oturum açık mı?

---

### Sorun: Mesaj otomatik doldurulmuyor

**Çözüm:**

- URL encoding sorunu olabilir
- Logger'dan hata mesajını kontrol et
- Sipariş bilgileri eksik olabilir (items, amount, vb.)

---

### Sorun: Emoji'ler görünmüyor

**Çözüm:**

- UTF-8 encoding kullanıldığından emin ol
- Modern browser kullan
- WhatsApp güncel sürümde mi?

---

## 📊 İstatistikler & Takip

### Önerilen Metrikler

- WhatsApp ile gönderilen mesaj sayısı (günlük/haftalık)
- Müşteri yanıt oranı
- Sipariş tamamlama süresi (WhatsApp ile bildirilen vs bildirilmeyen)
- Müşteri memnuniyeti (WhatsApp kullanan vs kullanmayan siparişler)

### Logger Kullanımı

```dart
// WhatsApp entegrasyonu loglama yapar
Logger.info('WhatsApp açılıyor: https://wa.me/...');
Logger.error('WhatsApp açılırken hata: ...');
```

Admin panelde `F12` → Console'dan logları görebilirsin.

---

## 🎓 Video Eğitim (Gelecek)

**İçerik:**

1. WhatsApp Business hesabı kurulumu
2. Admin panelde WhatsApp kullanımı
3. Mesaj şablonlarını özelleştirme
4. Müşteri iletişimi best practices

---

## 📞 Destek

**Sorun/Öneri için:**

- GitHub Issue aç
- Email: <tahsinreyhan@gmail.com>
- Dokümantasyon: Bu dosya + `lib/utils/whatsapp_helper.dart` kod yorumları

---

## 🔄 Gelecek İyileştirmeler

### Planlanan Özellikler

- [ ] WhatsApp Business API entegrasyonu (otomatik mesaj gönderimi)
- [ ] Mesaj şablonlarını admin panelden düzenleyebilme
- [ ] Müşteri yanıt geçmişi takibi
- [ ] WhatsApp mesaj istatistikleri dashboard'u
- [ ] Çok dilli mesaj desteği (İngilizce, Almanca)
- [ ] QR kod ile WhatsApp bağlantısı (fiziksel mağaza için)

---

## 📝 Changelog

### v1.0.0 (08 Ocak 2026)

- ✅ WhatsApp Helper utility eklendi
- ✅ Admin sipariş listesine WhatsApp ikonu
- ✅ Sipariş detayında WhatsApp butonu
- ✅ Durum güncellerken WhatsApp bildirimi checkbox
- ✅ Her durum için özel mesaj şablonları
- ✅ Telefon numarası validasyonu (Türkiye)
- ✅ Web ve mobil uyumlu

---

**Güncelleme Tarihi:** 08 Ocak 2026  
**Versiyon:** 1.0.0  
**Yazar:** EkmekLab Development Team
