---
name: ekmeklab-bilim-ve-pazarlama
description: EkmekLab bilim sentezi (bilgi_sentezi_v2 SQLite FTS5 + paket_dogrula.py), yerel İçerik Üretim Stüdyosu (arastirma/studyo localhost:8787), 60fps video/ses hattı ve Ekmek + Eşlikçi yerel pazarlama büyüme döngüsü. Bilimsel içerik, gazete/dergi/video üretimi veya pazarlama hunisi üzerinde çalışırken etkinleştir.
---

# EkmekLab Bilim, İçerik Stüdyosu & Pazarlama Hunisi

## 1. Şerit Ayrımı ve Doğrulama Kapıları
- **`arastirma/` (Şerit 1 & 2 — Yerel Mutfak):** `.gitignore` altındadır; `npm run build` gerektirmez.
  - Bilimsel kaynak motoru: `arastirma/bilgi_sentezi_v2/bilgi_sentezi.sqlite` (FTS5 tam metin arama, 2.541 kayıt).
  - Deterministik paket doğrulayıcı: `python -X utf8 arastirma/bilgi_sentezi_v2/araclar/paket_dogrula.py --konu KONU-XX` (veya `--hepsi`).
  - İçerik Üretim Stüdyosu: `arastirma/studyo/studyo_sunucu.py` (`http://localhost:8787` masaüstü + `/s24` mobil prompter & Wi-Fi medya kumandası). Python çalıştırırken `arastirma/ses/.venv_tts/Scripts/python.exe -X utf8` tercih edilir.
- **`content/` & `src/app/bilim/` (Şerit 3 — Canlı Web):** Git altındadır. Değişiklik sonrası `npm run typecheck`, `npm test` ve `npm run build` 0 hata ile geçmelidir. `content/claims` içindeki `review` alanı Tahsin'in açık onayı olmadan yazılmaz (`claimHash` kuralı `K011`).

## 2. K006 — Fizikokimyasal Bilim Dili (Sıfır Sağlık Vaadi)
- Hiçbir mecrada (web, kitap, Instagram, YouTube, kese kâğıdı gazetesi) *"sağlıklı, şifa, sindirimi kolay, bağırsak dostu, kan şekeri, insülin, glisemik indeks, hastalığı önler"* ifadeleri kullanılamaz.
- Bilim daima **hamurda, fırında ve sofrada ne olduğu** üzerinden anlatılır: pH düşüşü, laktik/asetik asit dengesi, fitaz aktivitesi, nişasta jelatinleşmesi ve retrogradasyonu, Maillard reaksiyonu, kabuk çıtırtısı ve gözenek mimarisi.

## 3. Ekmek + Eşlikçi Büyüme Döngüsü (Beylikdüzü & Sosyal)
- **Fiziksel → Dijital:** Her somun kese kâğıdındaki **Taş Fırın Gazetesi** (`ekmeklab.tr/bilim?sayi=01..04`) QR koduyla okuyucuyu ilgili bilimsel levhaya ve tek tıkla sıcak fırın sepetine taşır.
- **Sepet Büyütme (Ücretsiz Teslimat Eşiği):** Günlük taş fırın ekmeği müşteri mıknatısıdır; günlük taze Jersey yoğurdu, çiğ Jersey sütü, sucuk, yumurta, yufka, peynir ve kavurma gibi **fırın kapasitesi tüketmeyen (`capacityUnits = 0`) eşlikçiler** sepet tutarını ücretsiz teslimat eşiğinin üzerine taşır ve kurye birim ekonomisini kârlı hale getirir.
- Resmi sosyal hesaplar `src/lib/site.ts` içindeki `SOCIAL` sabitinden okunur (`@ekmeklabtr` Instagram, `@ekmeklab` YouTube, `@ekmek.lab` TikTok).
