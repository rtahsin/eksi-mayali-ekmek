# ChatBot Sistemi - Kullanım Kılavuzu

## 🎯 Özellikler

✅ Modern, temaya uygun UI tasarım  
✅ Yönlendirmeli soru-cevap akışı  
✅ Admin panelden tam kontrol  
✅ Demo mode (Firestore boşsa)  
✅ WhatsApp, telefon, email entegrasyonu  
✅ Responsive tasarım (mobil & desktop)  
✅ Smooth animasyonlar  

---

## 📦 Kurulum

### 1. Demo Verileri Oluşturma

```bash
# Firebase Admin SDK için service account key indir
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Dosyayı projeye serviceAccountKey.json olarak kaydet

# Script'i çalıştır
node scripts/create_chatbot_demo_data.js
```

Bu script şunları oluşturur:

- 1 settings belgesi (chatbot_settings/default)
- 10 mesaj belgesi (chatbot_messages koleksiyonu)
- Tam bağlantılı mesaj akışı

### 2. Manuel Oluşturma (Firebase Console)

**chatbot_settings/default:**

```json
{
  "welcomeMessage": "Merhaba! EkmekLab'a hoş geldiniz.",
  "botName": "EkmekLab Asistan",
  "isEnabled": true,
  "primaryColor": "#8B4513",
  "position": "bottom-right",
  "updatedAt": "2025-12-09T00:00:00Z"
}
```

**chatbot_messages (örnek):**

```json
{
  "message": "Merhaba! Size nasıl yardımcı olabilirim?",
  "category": "greeting",
  "order": 0,
  "isActive": true,
  "options": [
    {
      "id": "opt_1",
      "text": "🍞 Ürünler",
      "nextMessageId": "MESAJ_ID_BURAYA",
      "action": null,
      "actionValue": null
    }
  ],
  "createdAt": "2025-12-09T00:00:00Z",
  "updatedAt": "2025-12-09T00:00:00Z"
}
```

---

## 🎨 Admin Panel Kullanımı

### Mesaj Yönetimi

1. **Admin Panel** → **ChatBot Yönetimi**
2. **Mesajlar** sekmesi: Tüm mesajları listeler
3. **Yeni Mesaj Ekle** sekmesi: Form doldur

**Form Alanları:**

- **Mesaj**: ChatBot'un göstereceği metin
- **Kategori**: greeting, product_info, order_info, vs.
- **Sıra**: Görüntüleme sırası (0, 1, 2...)
- **Seçenekler**: "Seçenek Ekle" butonu ile ekle

**Seçenek Ekleme:**

- **Text**: Kullanıcıya gösterilecek metin (örn: "📞 Bizi Ara")
- **Sonraki Mesaj ID**: Tıklandığında gösterilecek mesajın ID'si
- **Aksiyon**: link, whatsapp, phone, email (opsiyonel)
- **Aksiyon Değeri**: URL, telefon, email adresi

### Mesaj Akışı Örneği

```
Karşılama (greeting)
├── Ürünler → Ürün Detay → Faydalar → Sipariş
├── Sipariş → Teslimat Bilgisi
├── Teslimat → Geri Ana Menü
└── İletişim → WhatsApp/Telefon/Email (action)
```

---

## 🔧 Teknik Detaylar

### Dosya Yapısı

```
lib/
├── models/
│   └── chatbot_message.dart        # ChatBotMessage, ChatBotOption, ChatBotSettings
├── services/
│   └── chatbot_service.dart        # Firestore CRUD operations
├── screens/admin/
│   └── admin_chatbot.dart          # Admin panel UI
└── widgets/
    └── chatbot_widget.dart         # User-facing widget

scripts/
└── create_chatbot_demo_data.js     # Demo data script
```

### Firestore Koleksiyonları

**chatbot_settings:**

- Tek belge: `default`
- Alan: welcomeMessage, botName, isEnabled, primaryColor, position

**chatbot_messages:**

- Çoklu belge
- Alanlar: message, category, order, isActive, options[], createdAt, updatedAt

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Ürün Bilgisi

```
Kullanıcı: "Ürünler" seçeneğine tıklar
Bot: Ürün kategorilerini gösterir
Kullanıcı: "Ekşi Maya Nedir?" seçer
Bot: Açıklama + "Faydaları" / "Geri Dön" seçenekleri
```

### Senaryo 2: Sipariş

```
Kullanıcı: "Sipariş Ver" tıklar
Bot: WhatsApp, Telefon, Web seçeneklerini gösterir
Kullanıcı: "WhatsApp" seçer
→ WhatsApp Web açılır (action: whatsapp)
```

### Senaryo 3: İletişim

```
Kullanıcı: "İletişim" tıklar
Bot: Telefon, WhatsApp, Email seçenekleri
Kullanıcı: Birini seçer
→ İlgili uygulama açılır (action: phone/email/whatsapp)
```

---

## 🐛 Sorun Giderme

### ChatBot görünmüyor

1. Console (F12) loglarını kontrol et
2. `🟢 LOADING FALSE` mesajını gördüysen widget render ediyor
3. Sayfayı scroll et, sağ alt köşeye bak
4. Cache temizle (Ctrl+Shift+R)

### Admin panelde kaydetme çalışmıyor

1. Console'da Firebase hatalarını kontrol et
2. Firestore rules'ları kontrol et
3. Admin yetkisi var mı kontrol et

### Mesaj akışı çalışmıyor

1. `nextMessageId` doğru mu kontrol et
2. Hedef mesaj `isActive: true` mu kontrol et
3. Console'da hata var mı bak

---

## 📝 En İyi Pratikler

✅ Her mesaj için anlamlı kategori kullan  
✅ Mesaj akışını basit tut (max 3 seviye)  
✅ Ana menüye dönüş seçeneği ekle  
✅ Aksiyon seçeneklerini net yaz (📞, 💬, 📧 emoji'leri kullan)  
✅ Mesajları kısa ve öz tut  
✅ Test et, test et, test et!  

---

## 🚀 Gelecek Geliştirmeler

- [ ] Mesaj arama/filtreleme
- [ ] Bulk import/export
- [ ] Mesaj istatistikleri
- [ ] A/B testing
- [ ] Çoklu dil desteği
- [ ] AI entegrasyonu

---

**Hazırlayan:** GitHub Copilot  
**Tarih:** 9 Aralık 2025  
**Versiyon:** 1.0.0
