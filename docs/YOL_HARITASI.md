# EkmekLab — Canlı Yol Haritası ve Durum Özeti

> **Tek Giriş Noktası:** Günlük 3 şeritli operasyon, araçlar ve hazır yayın envanteri **[`MERKEZ.md`](../MERKEZ.md)** içindedir.
> **25 Bölümlük Kitap & Video Omurgası:** **[`docs/ICERIK_PLANI.md`](ICERIK_PLANI.md)**
> **Tamamlanan Fazların Tüm Tarihçesi (Ekim–Kasım 2026):** Yerel arşivde `docs/_arsiv/YOL_HARITASI_2026_10_11_TAM_TARIHCE.md` altında eksiksiz korunmaktadır (yeni ajan oturumlarında okunmaz).

---

## 1. Tamamlanan Altyapı Özeti (Canlıda Aktif ✅)

| Katman | Durum | Özet |
| :--- | :---: | :--- |
| **Web & Ticaret Çekirdeği (`ekmeklab.tr`)** | ✅ Canlı | Next.js 16 + Supabase (`001`–`030` migration'lar). Atomik sipariş (`create_order_atomic`), tek-yazar güvenliği (`024`), cari/şarküteri ön muhasebesi (`016`–`018`), `/kurye` teslimat ekranı, Telegram KVKK uyumlu bildirim, Atölye Kremi + gece teması, ürün satış günleri (`026`), fırından çıktı günlüğü (`027`). |
| **Web Bilim & Araçlar (`/bilim`, `/arac`, `/laboratuvar`)** | ✅ Canlı | 26 ekmek bilimi anı (`content/bilim/`, PR #73–#74 kalite kapısı) ve 26 video metni (`content/video/`, PR #75–#77), profesyonel fırıncı araçları (`/arac`), interaktif simülasyon (`/laboratuvar`). |
| **Şerit 1 — Tam Metin Bilim & Kitap Motoru** | ✅ Hazır | `bilgi_sentezi.sqlite` (`2.541` tam metin FTS5, `707/707` Türkçe Kıvılcım Kartı, `25/25` bölüm kanıt cephaneliği) + deterministik doğrulayıcı (`paket_dogrula.py`). İlk **4 Sayı** (`KONU-01`, `KONU-05`, `KONU-02`, `KONU-14`) ve **Sofra Eşlikçi Rehberi** (`sofra_eslikci_rehberi.md`) tamamlandı. |
| **Şerit 2 — Medya, Dergi, Gazete, Ses & 60fps Video** | ✅ Hazır | `KONU-01, 02, 05, 14` için **7 Kare Instagram Dergisi (`1080×1350`)**, **A5/A4 300 DPI Kese Kâğıdı Gazetesi (QR kodlu PDF)**, **İçerik Üretim Stüdyosu v2** (`arastirma/studyo/` — `localhost:8787` masaüstü + `/s24` cep kumandası), **Otomatik Cerrahi Ses Kurgu Motoru** (`gercek_ses_kurgu.py`) ve **Remotion 60fps Video Stüdyosu** (`video_studyosu/`) çalışır durumda. |
| **Komuta Merkezi & Uzman Yetenekler (`.agents/skills/`)** | ✅ Hazır | `ekmeklab-vitrin-ux`, `ekmeklab-admin-operasyon` ve `ekmeklab-bilim-ve-pazarlama` proje yetenekleri devrede. `M-01` (gazete QR `?sayi=01..04` karşılama + resmi sosyal hesaplar) ve `M-02` (SSR ürün görseli onarımı, Atölye Kremi SVG yer tutucular, eşlikçi dil ayrımı, `/admin/urunler` `capacityUnits = 0` koruması + S24 fotoğraf hattı) `main` dalında tamamlandı. |

---

## 2. Aktif Ana Hedef: Pazarlama Lansmanı ve İlk Perakende Sipariş Hunisi (Kasım 2026)

**Stratejik Odak:** Elimizdeki hazır bilimsel otoriteyi ve medya cephaneliğini sosyal medyada (`@ekmeklabtr` Instagram, `@ekmeklab` YouTube, `@ekmek.lab` TikTok) yayına sokup, gelen trafiği Beylikdüzü içinde lojistik olarak kârlı **Ekmek + Sofralık Eşlikçi Paketlerine** dönüştürmek.

### Adım Adım Lansman Sırası

| Sıra | Hat | Aksiyon | Sorumlu | Durum |
| :---: | :---: | :--- | :---: | :---: |
| **M-1** | **Web Vitrin, Admin & QR Altyapısı (`M-01` + `M-02`)** | Resmi sosyal kanallar (`@ekmeklabtr`, `@ekmeklab`, `@ekmek.lab`), `/bilim?sayi=01..04` QR karşılama kartı, `/arac` sipariş köprüsü, SSR görsel onarımı, eşlikçi dil ayrımı ve `/admin/urunler` S24 hızlı eşlikçi girişi (`capacityUnits = 0`) tamamlandı. | Komuta + Masa 1–3 | ✅ Tamamlandı |
| **M-2** | **S24 Fotoğraf Çekimi & Eşlikçi Katalog Girişi** | `arastirma/pazarlama_lansman/s24_cekim_ve_eslikci_plani.md` rehberiyle 15 dakikada gerçek taş fırın + ağabeyin şarküteri ürün fotoğraflarının (Jersey ev yoğurdu, çiğ süt, sucuk, yumurta, yufka, peynir, kavurma) çekilip `/admin/urunler` üzerinden yayına alınması ve 3 sepet büyüten paketin açılması. | Tahsin | 🎯 Yarın Sabah |
| **M-3** | **Kanal Kurulumu & İlk Hafta Beylikdüzü Akışı** | `arastirma/pazarlama_lansman/ilk_hafta_beylikduzu_lansman_akisi.md` takvimiyle Instagram/YouTube/TikTok vitrin açılışı, ağabeyin şarküteri kasasında A5 QR kartı ve günlük 32 şarküteri somununda **Taş Fırın Gazetesi (`Sayı #01`)** dağıtımı. | Tahsin + Komuta | ⏳ Sıradaki |
| **M-4** | **S24 Çekim & Gerçek Ses Seri Üretimi (`Stüdyo v2`)** | Haftada 1 toplu oturumda `STUDYOYU_AC.bat` (`localhost:8787/s24`) prompteri + DJI Osmo ile ses kaydı (`gercek_ses_kurgu.py`) ve Remotion 60fps video üretimi. | Tahsin + Şerit 2 | ⏳ Bekliyor |
| **M-5** | **1 Haftalık Canlı Operasyon Sınaması** | Gelen gerçek siparişlerin admin → üretim → `/kurye` teslimat ve "Fırından çıktı" akışıyla sınanması; yalnız sahada takılan noktalar için kod dokunuşu yapılması. | Tahsin + İşçi Ajan | ⏳ Bekliyor |
