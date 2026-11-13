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
| **Şerit 2 — Medya, Dergi, Gazete, Ses & 60fps Video** | ✅ Hazır | `KONU-01, 02, 05, 14` için **7 Kare Instagram Dergisi (`1080×1350`)**, **A5/A4 300 DPI Kese Kâğıdı Gazetesi (QR kodlu PDF)**, **S24 Prompter** (`haftalik_bolum_prompteri.html`), **Otomatik Cerrahi Ses Kurgu Motoru** (`gercek_ses_kurgu.py`) ve **Remotion 60fps Video Stüdyosu** (`video_studyosu/`) çalışır durumda. |

---

## 2. Aktif Ana Hedef: Pazarlama Lansmanı ve İlk Perakende Sipariş Hunisi (Kasım 2026)

**Stratejik Odak:** Elimizdeki hazır bilimsel otoriteyi ve medya cephaneliğini sosyal medyada (`@ekmeklabtr` Instagram, `@ekmeklab` YouTube, `@ekmek.lab` TikTok) yayına sokup, gelen trafiği Beylikdüzü içinde lojistik olarak kârlı **Ekmek + Sofralık Eşlikçi Paketlerine** dönüştürmek.

### Adım Adım Lansman Sırası

| Sıra | Hat | Aksiyon | Sorumlu | Durum |
| :---: | :---: | :--- | :---: | :---: |
| **M-1** | **Web Vitrin & Sepet Hazırlığı** | Admin panelinde (`ekmeklab.tr/admin`) kârlı teslimat ayarlarının girilmesi (`minBasketAmount`, Pazartesi kapalı `openWeekdays`, `wholesaleDailyLoaves: 32`), **Sofralık Eşlikçiler** ve **Sofra Paketleri (Paket A/B/C)** ürün kartlarının açılması; sitedeki sosyal medya linklerinin (`@ekmeklabtr`, `@ekmeklab`, `@ekmek.lab`) doğrulanması. | Komuta + Tahsin | 🎯 Sıradaki |
| **M-2** | **Kanal Kurulumu & İlk Vitrin (Grid)** | Instagram `@ekmeklabtr`, YouTube `@ekmeklab` ve TikTok `@ekmek.lab` biyografi, sabitlenmiş hikâye ve `ekmeklab.tr` (UTM/hunili) yönlendirme kurulumu; hazır olan **4 adet 7-Kare Instagram Dergisinin** (`Sayı #01–#04`) ve ilk Reels videolarının yayın takvimine dizilmesi. | Komuta + Tahsin | ⏳ Bekliyor |
| **M-3** | **S24 Çekim & Gerçek Ses Seri Üretimi** | Haftada 1 toplu oturumda S24 + DJI Osmo ile prompter okuma (`gelen_ham_ses/` → `gercek_ses_kurgu.py` otomatik kurgu) + taş fırın & eşlikçi sofra B-roll/fotoğraf çekimi (`sofra_eslikci_rehberi.md` 6 Reels senaryosu). | Tahsin + Şerit 2 | ⏳ Bekliyor |
| **M-4** | **Fiziksel Kanca (Şarküteri Kese Kâğıdı Gazetesi)** | Günlük 32 şarküteri ekmeğiyle Beylikdüzü hanelerine giren paketlere **A5 Taş Fırın Gazetesi (`Sayı #01`) + QR kod** eklenerek sıfır reklam maliyetiyle hazır hedef kitlenin `ekmeklab.tr` ve `@ekmeklabtr`'ye çekilmesi. | Tahsin | ⏳ Bekliyor |
| **M-5** | **1 Haftalık Canlı Operasyon Sınaması** | Gelen gerçek siparişlerin admin → üretim → `/kurye` teslimat ve "Fırından çıktı" akışıyla sınanması; yalnız sahada takılan noktalar için kod dokunuşu yapılması. | Tahsin + İşçi Ajan | ⏳ Bekliyor |
