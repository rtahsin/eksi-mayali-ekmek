# 🔧 CORS Sorunu - Çözüm Adımları

## Problem

Banner görselleri Firebase Storage'da duruyor ama tarayıcı CORS hatası veriyor:

```text
Access to XMLHttpRequest blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

## ✅ En Kolay Çözüm (3 DK)

### Yöntem 1: Firebase Console Üzerinden

1. **Firebase Console'a gir:**
   - <https://console.firebase.google.com/project/eksimayaliekmekweb/storage>

2. **Storage sayfasında:**
   - Sol menüden "Storage" → "Files" tıkla
   - Sağ üstte "⋮" (3 nokta) menüsüne tıkla
   - "Bucket Details" seç

3. **CORS Yapılandırması:**
   - "Configuration" sekmesine git
   - "CORS configuration" bölümünü bul
   - Aşağıdaki JSON'u yapıştır:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

1. **Kaydet ve test et:**
   - Save → Web siteni yenile

---

### Yöntem 2: Google Cloud Console (Alternatif)

1. **Cloud Console'a gir:**
   - <https://console.cloud.google.com/storage/browser?project=eksimayaliekmekweb>

2. **Bucket ayarlarını aç:**
   - `eksimayaliekmekweb.firebasestorage.app` bucket'ına tıkla
   - Üstte "PERMISSIONS" sekmesi
   - "ADD PRINCIPAL" → `allUsers` ekle
   - Role: "Storage Object Viewer"

1. **CORS için Cloud Shell'i aç:**
   - Sağ üstte terminal ikonu (">_") tıkla
   - Cloud Shell otomatik açılır
   - Aşağıdaki komutu çalıştır:

```bash
gsutil cors set cors.json gs://eksimayaliekmekweb.firebasestorage.app
```

---

### Yöntem 3: Cloud Shell Direkt Link (EN KOLAY)

1. **Bu linke tıkla:**
   <https://shell.cloud.google.com/?project=eksimayaliekmekweb&show=terminal>

2. **Terminal açılınca bu komutları çalıştır:**

```bash
# CORS dosyasını oluştur
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# CORS'u uygula
gsutil cors set cors.json gs://eksimayaliekmekweb.firebasestorage.app

# Kontrol et
gsutil cors get gs://eksimayaliekmekweb.firebasestorage.app
```

1. **Başarılı olursa şunu göreceksin:**

```text
Setting CORS on gs://eksimayaliekmekweb.firebasestorage.app/...
```

---

## 🎯 Hangi Yöntem?

- **Firebase Console yeterli** → Yöntem 1
- **Cloud Console'a alışkınsan** → Yöntem 2
- **Terminal kullanmak istiyorsan** → Yöntem 3

---

## ✅ Test

CORS uygulandıktan sonra:

1. Web siteni yenile (Hard Refresh: Ctrl+Shift+R)
2. Console'u aç (F12)
3. Anasayfaya git
4. Banner görsellerini kontrol et

**Başarılı olursa:**

```text
✅ [BANNER] URL loaded: https://firebasestorage.googleapis.com/...
✅ [CAROUSEL] Banner yükklendi: home
```

**Hala hata varsa:**

- Tarayıcı cache'ini temizle
- Incognito/Private mode dene
- Firebase Hosting'i yeniden deploy et:

  ```bash
  flutter build web --release
  firebase deploy --only hosting
  ```

---

## 📞 Destek

Eğer hiçbiri çalışmazsa:

1. Cloud Shell ekran görüntüsü at
2. Firebase Console CORS ayarı ekran görüntüsü at
3. Browser console hata mesajını kopyala

**Proje Bilgileri:**

- Project ID: `eksimayaliekmekweb`
- Project Number: `984417239539`
- Bucket: `gs://eksimayaliekmekweb.firebasestorage.app`
- Domain: `https://eksimayaliekmekweb.web.app`
