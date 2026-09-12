# Dependency Audit Plan (2026-03-14)

Bu doküman `flutter pub outdated` ve `npm audit` çıktılarından üretilmiştir.

## Güncelleme (2026-03-14 - Functions remediation)

- `functions` içinde major güvenlik güncellemeleri uygulandı:
  - `firebase-admin` → `^13.7.0`
  - `firebase-functions` → `^7.1.1`
  - `nodemailer` → `^8.0.2`
- Doğrulama sonuçları:
  - `npm ls firebase-admin firebase-functions nodemailer` sürümleri doğrulandı.
  - `node --check index.js` başarılı (syntax OK).
  - `npm audit --omit=dev` sonucu: **9 low**, **0 high**, **0 critical**.

Kalan 9 low açık, `@google-cloud/storage` transitif zincirinde (`teeny-request` / `@tootallnate/once`) görünüyor ve doğrudan uygulama kodundan çözülebilir bir override noktası sunmuyor. Bu yüzden şu an için **risk düşürülmüş ve kabul edilebilir** seviyede işaretlenmiştir; upstream paket güncellemeleri takip edilmelidir.

## 1) Özet Risk Durumu

### Flutter/Dart
- Çok sayıda major update mevcut (özellikle Firebase ailesi).
- **Discontinued paketler**:
  - `flutter_markdown` → `flutter_markdown_plus`
  - `js` → Dart 3 web interop (`dart:js_interop`) veya yeni desteklenen yol

### Node (repo root)
- `npm audit --omit=dev`: **0 vulnerability**

### Node (functions)
- (İlk durum) `npm audit --omit=dev`: **21 vulnerability** (8 low, 3 moderate, 5 high, 5 critical)
- (Güncel durum) major upgrade sonrası: **9 low**, **0 high**, **0 critical**.
- Kalan açıklar transitif dependency zincirinde ve upstream düzeltme bekliyor.

### Node (local_llm_bridge)
- `npm audit --omit=dev`: **2 vulnerability** (1 high, 1 moderate)
- `axios` ve `qs` kaynaklı; genellikle `npm audit fix` ile çözülebilir.

---

## 2) Uygulama Stratejisi (Güvenlik-Öncelikli)

## Aşama A — Hızlı ve düşük riskli güncellemeler

### Flutter (patch/minor)
- Güvenli patch/minor adayları:
  - `provider`, `http`, `url_launcher`, `shared_preferences`, `logger`, `uuid`, `timeago`, `image_picker`, `flutter_svg`
- Yöntem:
  1. `pubspec.yaml` içinde sadece patch/minor artır.
  2. `flutter pub get`
  3. `flutter analyze` + testler

### local_llm_bridge
- Komutlar:
  - `npm audit fix`
  - tekrar `npm audit --omit=dev`
- Hedef: 2 açığın kapanması.

---

## Aşama B — Functions güvenlik yükseltmesi (öncelikli)

Önerilen hedef sürüm yönü:
- `firebase-admin`: `^13.x`
- `firebase-functions`: `^6.x`
- `nodemailer`: güvenli güncel major

### Dikkat
Bu adım breaking change riski taşır. Aşağıdaki sırayla ilerlenmeli:
1. `functions` için ayrı branch aç.
2. Paketleri yükselt (`package.json`).
3. `npm install` + `npm audit --omit=dev`
4. Firebase emulator ile fonksiyon smoke testleri.
5. Staging deploy.
6. Production deploy.

---

## Aşama C — Flutter major geçişleri (kontrollü)

Yüksek etkili major paketler:
- Firebase ailesi (`firebase_core`, `firebase_auth`, `cloud_firestore`, `firebase_storage`, `firebase_messaging`, `firebase_analytics`, `cloud_functions`)
- `go_router`, `connectivity_plus`, `geolocator`, `geocoding`, `syncfusion_*`

Yöntem:
1. Firebase ailesini tek sprintte birlikte yükselt.
2. Kod uyarlamaları + analyzer temizliği.
3. Integration smoke test (auth/login, sipariş, admin CRUD, push).
4. Sonra diğer major paketleri parti parti yükselt.

---

## 3) Discontinued Paket Göç Planı

### `flutter_markdown` → `flutter_markdown_plus`
- `pubspec.yaml` değişimi
- import/path uyumluluğu kontrolü
- markdown ekranlarında görsel regresyon testi

### `js` paketi
- Mevcut kullanım yerleri taranacak.
- Mümkünse `dart:js_interop` veya plugin tabanlı çözümle değiştirilecek.

---

## 4) CI Gate Önerisi

PR merge için zorunlu kontroller:
- `flutter analyze`
- `flutter test`
- `npm audit --omit=dev` (root, functions, local_llm_bridge)
- Kritik/High açıkta merge blokla.

---

## 5) Bu Planın Uygulama Sırası

1. local_llm_bridge `npm audit fix`
2. functions bağımlılık major planı + emulator test
3. Flutter patch/minor güncellemeler
4. Discontinued paket migrasyonları
5. Firebase ve diğer major geçişler

---

Hazırlayan: Copilot (GPT-5.3-Codex)
Tarih: 2026-03-14
