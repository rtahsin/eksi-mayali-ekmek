# Google API Key Restriction Checklist (ekmeklab.tr)

Bu adımlar GCP Console üzerinde yapılır; repodan otomatik uygulanamaz.

## 1) Envanter (tespit edilen anahtar kullanımları)

- `web/index.html` (Google Maps JS script key)
- `lib/firebase_options.dart` (Firebase client API keys: platform bazlı)
- `android/app/google-services.json` (Android Firebase API key)
- `lib/backend/firebase_config.dart` içindeki hardcoded key kaldırıldı ve `DefaultFirebaseOptions.currentPlatform` kullanılıyor.

> Not: Firebase API key'leri tek başına gizli secret değildir; asıl koruma Firestore/Storage Rules + Auth ile sağlanır. Yine de abuse riskine karşı API restriction yapılmalıdır.

---

## 2) Key Bazlı Restriction Matrisi

## A) Web Google Maps Key
- Application restriction: **HTTP referrers (web sites)**
- İzinli referrer örnekleri:
  - `https://ekmeklab.tr/*`
  - `https://www.ekmeklab.tr/*`
  - `https://ekmeklab.com/*` (varsa aktif domain)
  - `https://www.ekmeklab.com/*`
- API restriction: sadece gerekli Maps API’ler (örn. Maps JavaScript API, Places gerekiyorsa sadece o).

## B) Android Key
- Application restriction: **Android apps**
- Package name + SHA-1 fingerprint zorunlu.
- API restriction: Firebase için gereken minimum API seti.

## C) Firebase Web Key
- Firebase API key public olabilir, ama:
  - Firestore Rules strict olmalı.
  - Auth zorunlulukları doğru olmalı.
  - Gerekirse API restrictions uygulanmalı (minimum gerekli servisler).

---

## 3) Uygulama Adımları (GCP Console)

1. Google Cloud Console → APIs & Services → Credentials
2. Her key için tek tek:
   - adını standardize et (`ekmeklab-web-maps-prod`, `ekmeklab-android-prod` vb.)
   - application restriction uygula
   - API restriction uygula
3. Kaydet ve 5-10 dk propagasyon bekle.
4. Production smoke test:
   - Harita açılıyor mu?
   - Android login/firebase işlemleri çalışıyor mu?
5. Eski/unrestricted key varsa disable et.

---

## 4) Doğrulama Checklist

- [ ] Web harita ekranı production’da çalışıyor
- [ ] Referrer dışı çağrılar 403 alıyor
- [ ] Android app package+SHA dışı kullanım engelli
- [ ] Firestore/Storage rules emülatör testleri geçiyor
- [ ] Kullanılmayan eski key’ler disable edildi

---

## 5) Operasyon Notu

Bu işlem repo dışı (GCP Console) olduğundan, tamamlandıktan sonra aşağıdaki formatta bir kayıt bırakın:

- Uygulayan kişi:
- Tarih:
- Kısıtlanan key adları:
- Test sonucu:
- Disable edilen eski key’ler:


Hazırlayan: Copilot (GPT-5.3-Codex)
Tarih: 2026-03-14
