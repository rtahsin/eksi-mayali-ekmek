# EkmekLab Çalışma Merkezi

> **Tek Giriş Noktası.** Eski çok katmanlı denetim rehberleri ve `BS02` kuyrukları `docs/_arsiv/` ve `arastirma/bilgi_sentezi_v2/_arsiv/` altına kaldırılmıştır. Tüm üretim birbirini ezmeyen **3 bağımsız şeritte** yürür.

---

## 0. Fiziksel Düzen, Fırın Kapasitesi ve Kanal Profili

- **Ana Çalışma Dizini:** `F:\ekmeklab_app` (`main` dalı). Yeni ajan oturumları worktree dallanması olmadan doğrudan `F:\ekmeklab_app` üzerinde açılır.
  - `src/`, `public/`, `supabase/`, `content/` → **Canlı Web Uygulaması (`ekmeklab.tr`)**, git tarafından izlenir; her değişiklikte `npm run typecheck && npm test && npm run build` zorunludur.
  - `arastirma/` → **Bilim, Kitap ve Medya Mutfağı**, `.gitignore` içindedir; web kodunu asla bozmaz.
- **Taş Fırın ve Haftalık Ritim:**
  - **Fırın:** `120 × 80 cm` taş taban. Tek pişirimde **16 adet** `1000 g` açık ekşi mayalı somun/saat; **kalıp özel ekmeklerde** (ör. %100 Çavdar, Tost, Siyez Kalıp) tek pişirimde **30 adede kadar**.
  - **Takvim:** Pazartesi fırından ekmek çıkmaz (Salı hamuru yoğrulur); **Salı–Pazar (6 gün)** pişirim yapılır. Şarküterilere günlük sabit **32 adet** üretilir; perakende talebe göre ek fırın partileri açılır.
- **Perakende Lojistik & Komşu Apartman Stratejisi:**
  - Beylikdüzü dağıtım bölgesinde **minimum sepet sınırı ve teslimat ücreti yoktur (`0 ₺`)**. Apartman/site içi komşu tavsiyesiyle çoklu daire teslimatı ve **Ekmek + Günlük Mandıra/Şarküteri Eşlikçileri** (**yumurta, süt, yoğurt, sucuk, peynir, yufka, kavurma**) doğal olarak büyütülür. Şarküterilere giden günlük 32 ekmek pencereli kraft torbada, üzerinde QR kodlu (`ekmeklab.tr/?etiket=1`) bilgilendirme etiketiyle sunulur.
- **Ekipman & Resmi Kanallar:**
  - **Kayıt:** Samsung Galaxy S24 (4K B-roll + Prompter Okuma) + DJI Osmo kablosuz mikrofon (`48 kHz` doğal gerçek ses anlatımı ve fırın ASMR; yapay ses klonlama askıya alındı ve `_arsiv_klon_ses/` altında arşivlendi).
  - **Kanallar:** YouTube **`@ekmeklab`** (`16:9` + Shorts) · Instagram **`@ekmeklabtr`** (`9:16` Reels) · TikTok **`@ekmek.lab`** (`9:16`) · Web **`ekmeklab.tr`**.

---

## Şerit 1 — Bilimsel İçerik, Kıvılcım Madeni ve Kitap Hattı

**Hedef:** Yerel tam metin makale arşivinden referans fırıncılık kitabı ve haftalık çok kanallı yayın sayıları (`Sayı #01, #02...`) üretmek.

- **Arama ve Keşif Motoru:**
  - **Tam Metin İndeksi:** [`bilgi_sentezi.sqlite`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/indeks/bilgi_sentezi.sqlite) (`fts_tam_metin`: `2.541` tam metin kaydı -> tekilleştirilmiş `1.427` makale: **`707` Çekirdek Ekmek** + `480` Yan Alan; indeksleyici: [`tam_metin_indeksle.py`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/araclar/tam_metin_indeksle.py)).
  - **Pazartesi Editör Masası (`707/707` %100 Türkçe Aydınlatıldı):** [`kivilcim_menusu.html`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/kivilcim_menusu.html) (`460` yeni Kıvılcım Kartı + `247` açık Türkçe kanıt özeti, `0` karanlık madde; üretici: [`makale_madeni.py`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/araclar/makale_madeni.py)). Her Pazartesi buradan 1–3 kıvılcım seçilip tek tıkla üretim komutu kopyalanır.
  - **25 Bölüm Kanıt Cephaneliği Stüdyosu (`25/25` Bölüm Eşlendi):** [`konu_cephaneligi.html`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/konu_cephaneligi.html) (`300` kart ataması, `251` tekil birincil tam metin makale, `2,91M` kelime; üretici: [`konu_cephaneligi_uret.py`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/araclar/konu_cephaneligi_uret.py)).
  - **Sofralık Eşlikçi Bilim & Pazarlama Rehberi:** [`sofra_eslikci_rehberi.md`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/sofra_eslikci_rehberi.md) (tereyağı, yoğurt, yumurta, fermente sucuk ve kavurma için hakemli fizikokimya köprüleri + 6 S24 Reels senaryosu + 3 Beylikdüzü kârlı teslimat sepeti).
- **25 Başlıklık Kitap & Seri Omurgası:** [`docs/ICERIK_PLANI.md`](file:///F:/ekmeklab_app/docs/ICERIK_PLANI.md) · **Araştırma Dizin Haritası:** [`arastirma/README.md`](file:///F:/ekmeklab_app/arastirma/README.md).
- **3 Adımlı Üretim Standardı:**
  1. **Tam Metin Kanıt:** FTS5 ile konunun en güçlü 8–16 tam metnini seç (`BLIND-01..04` hariç), birebir konum + `SHA-256` ile `kanit_kartlari.jsonl` çıkar.
  2. **Deterministik Doğrulama:** `kanonik_iddialar.jsonl` oluştur ve [`paket_dogrula.py`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/araclar/paket_dogrula.py) (`--konu KONU-XX` veya `--hepsi`) ile alıntı, sayı ve `K006` sağlık-vaadi yasağını doğrula.
  3. **Derin Anlatı:** Kitap bölümü (`2.500+` düz metin kelimesi) + YouTube Uzun (`1.200–1.400` konuşma kelimesi) + 2 dikey Kısa Video üret.

| Sayı | Konu Kodu | Başlık | Durum |
| :---: | :---: | :--- | :--- |
| `Sayı #01` | `KONU-01` | Kavanozdaki Görünmez Savaş: Ekşi Mayanın İlk 10 Günü ($\mathrm{p}K_a$ Duvarı, 100:1 Dengesi) | ✅ Kitap + Prompter + 7 Kare Dergi + A5/A4 Gazete Hazır ([`BS06`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/isler/BS06_icerik_taslaklari/kitap_bolumu_iskeleti.md)) |
| `Sayı #02` | `KONU-05` | Çavdar Hamuru Neden Yoğrulmaz ve 24 Saat Bıçak Vurulmaz? (`WEAX`/`WUAX` & Kalıp Çavdar) | ✅ Kitap + Prompter + 7 Kare Dergi + A5/A4 Gazete Hazır ([`KONU05`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/isler/KONU05_cavdar_arabinoksilan/kitap_bolumu.md)) |
| `Sayı #03` | `KONU-02` | 100 Bakteriye 1 Maya: *F. sanfranciscensis* ve *K. humilis* Maltoz Fosforilaz Antlaşması | ✅ Canlı Web (`/bilim/sayi/03`) + Kitap + Prompter + Gazete Hazır ([`KONU02`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/isler/KONU02_maltoz_simbiyozu/kitap_bolumu.md)) |
| `Sayı #04` | `KONU-14` | Hamur Yoğruldukça Nasıl Güçlenir ve Neden Çöker? Glutenin Makro-Polimeri (`GMP`) & $\text{SH/SS}$ | ✅ Canlı Web (`/bilim/sayi/04`) + Kitap + Prompter + Gazete Hazır ([`KONU14`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/isler/KONU14_glutenin_makropolimeri/kitap_bolumu.md)) |
| `Sayı #05` | `SOFRA-01` | Sıcak Somun, Tereyağı, Yoğurt, Yumurta ve Sucuk: Sofranın Fizikokimyası | ✅ Canlı Web (`/bilim/sayi/05`) + 45 sn S24 Reels + Eşlikçi Sepet Köprüsü Hazır ([`dergi.ts`](file:///F:/ekmeklab_app/src/lib/bilim/dergi.ts)) |
| `Sayı #06+` | *Pazartesi Seçimi* | [`konu_cephaneligi.html`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/konu_cephaneligi.html) veya [`kivilcim_menusu.html`](file:///F:/ekmeklab_app/arastirma/bilgi_sentezi_v2/kivilcim_menusu.html) üzerinden 1-tıkla üretim | ⏳ 21 Bölüm Cephaneliği Hazır · Rehber: [`docs/S24_CEKIM_VE_YAYIN_EL_KITABI.md`](file:///F:/ekmeklab_app/docs/S24_CEKIM_VE_YAYIN_EL_KITABI.md) |

---

## Şerit 2 — Medya, Haftalık Dergi, Basılı Gazete ve Gerçek Ses Kurgu Hattı

> **Birleşik Masaüstü & S24 Stüdyosu (`http://localhost:8787`):** Dağınık HTML araçlarını ve terminal betiklerini tek ekranda toplayan yerel web uygulaması [`STUDYOYU_AC.bat`](file:///F:/ekmeklab_app/arastirma/STUDYOYU_AC.bat) ([`studyo_sunucu.py`](file:///F:/ekmeklab_app/arastirma/studyo/studyo_sunucu.py)) ile tek tıkla açılır.

**Hedef:** Tek bir doğrulanmış sayıdan sıfır yapaylık ve sıfır elle kurgu zahmetiyle **5 yayın formatını** üretmek:

1. **Grafik, 7 Kare Instagram Dergisi & Basılı Kese Kâğıdı Gazetesi:** [`konu_medya_uret.py`](file:///F:/ekmeklab_app/arastirma/medya_hatti/konu_medya_uret.py) (`--konu KONU-XX`) ve [`dergi_ve_gazete_uret.py`](file:///F:/ekmeklab_app/arastirma/medya_hatti/dergi_ve_gazete_uret.py) (`--hepsi`):
   - `16:9` ve `9:16` bilimsel makale grafikleri + `sahne_plani.json` + S24 prompter senkronu,
   - **`@ekmeklabtr` 7 Kare Instagram Mini Dergi (`1080 × 1350 px`)** (`cikti/<KONU>/instagram_dergi/`),
   - **Basılı Kese Kâğıdı Gazetesi (`300 DPI` A5 Ön + Arka Yüz + Taranabilir QR Kod + Çift Yön Kesimli A4 PDF)** (`cikti/<KONU>/baski_gazete/`).
2. **Gerçek Ses Stüdyosu & Otomatik Cerrahi Kurgu Hattı (`48 kHz` Doğal Ses):**
   - **Haftalık S24 Kayıt Prompter'ı:** [`haftalik_bolum_prompteri.html`](file:///F:/ekmeklab_app/arastirma/ses/haftalik_bolum_prompteri.html) (`G:\Drive'ım\ekmeklab_ses\haftalik_bolum_prompteri.html`; üretici: [`bolum_prompteri_uret.py`](file:///F:/ekmeklab_app/arastirma/ses/bolum_prompteri_uret.py) + [`normalize.py`](file:///F:/ekmeklab_app/arastirma/ses/normalize.py)). Tüm hazır sayıları 2 cümlelik ferah kartlar ve ilk geçişte Türkçe okunuş ipuçlarıyla (`[Fruktilaktobasillus...]`) sunar.
   - **Tek Klasör Ham Ses Kutusu:** Kaydı hiç durdurmadan (sürçmede 1 sn es verip cümleyi baştan okuyarak) alınan `.wav` dosyaları isim değiştirmeden `G:\Drive'ım\ekmeklab_ses\gelen_ham_ses\` içine bırakılır.
   - **Otomatik Cerrahi Kurgu Motoru:** [`gercek_ses_kurgu.py`](file:///F:/ekmeklab_app/arastirma/ses/gercek_ses_kurgu.py) yerel `faster-whisper` ile konuyu otomatik tanır, sürçmeli ilk okumaları eler (son temiz okunuşu seçer), buton kliklerini ve uzun duraksamaları gerçek oda havası (`room tone`) + `25 ms` kosinüs geçişiyle daraltır, bölüm genelinde tek çarpanlı doğrusal mastering (`-16.0 LUFS` YouTube / `-14.5 LUFS` Reels, `-1.5 dBTP` tavan, sıfır `loudnorm` pompalaması) uygular. *(Not: Askıya alınan ses klonlama denemeleri `_arsiv_klon_ses/` altında dondurulmuştur.)*
3. **2-Serili `60 fps` Remotion Video Stüdyosu (`arastirma/video_studyosu/`):**
   - **Seri A — Bilimsel Belgesel (`BilimselBelgesel9x16` & `BilimselBelgesel16x9`):** Kamera karşısına geçmeden yalnızca gerçek ses kaydıyla (*Audio-First*) yürür. Görsel akış: **Nano Banana** referans kareleri → **Google AI Ultra Flow / Veo 3.1** ([`flow_studyosu.html`](file:///F:/ekmeklab_app/arastirma/video_studyosu/flow_studyosu.html) → `gelen_flow_video/`) mikro-evren klipleri + **Remotion `60 fps`** canlı çizilen bilimsel eğriler + milisaniyelik kelime vurgulu altyazılar ([`remotion_kurgu_uret.py`](file:///F:/ekmeklab_app/arastirma/video_studyosu/remotion_kurgu_uret.py)).
   - **Seri B — Gerçek Taş Fırın Günlüğü (`TasFirinGunlugu9x16`):** S24 ile çekilen gerçek Beylikdüzü taş fırın / hamur / kesim videoları (`gelen_firin_videolari/`), fırının doğal çıtırtısı (`-18 dB` ASMR) korunarak gerçek seslendirmeyle birleşir ([`firin_gunlugu_kurgu.py`](file:///F:/ekmeklab_app/arastirma/video_studyosu/firin_gunlugu_kurgu.py)).

---

## Şerit 3 — Web, Kütüphane ve Satış Hattı (`ekmeklab.tr`)

**Hedef:** Bilimsel otoriteyi ve sosyal medya trafiğini **yüksek sepet ortalamalı** (Ekmek + Sofralık Eşlikçiler) Beylikdüzü ön siparişine dönüştürmek.

- **Ana Mimari ve Faz Kaydı:** [`docs/YOL_HARITASI.md`](file:///F:/ekmeklab_app/docs/YOL_HARITASI.md) · [`docs/MIMARI.md`](file:///F:/ekmeklab_app/docs/MIMARI.md) · [`docs/MARKA.md`](file:///F:/ekmeklab_app/docs/MARKA.md).
- **Sıradaki Web & Operasyon Adımları:**
  - [ ] Admin panelinde **Sofralık Eşlikçiler** kategorisi (yumurta, süt, yoğurt, sucuk, kavurma) + lojistik başa-baş noktasını koruyan **minimum sepet tutarı** ve **kalıp özel ekmek günü** (ör. Cuma/Cumartesi 30 adetlik Kalıp Çavdar kotası) ayarlarının girilmesi.
  - [ ] Samsung S24 ile ekmek + eşlikçi sofra fotoğraflarının çekilip vitrine yüklenmesi ve 1 haftalık canlı sipariş/teslimat (`/kurye` + "Fırından çıktı") sınaması.
