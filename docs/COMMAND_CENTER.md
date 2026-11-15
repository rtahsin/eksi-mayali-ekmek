# EkmekLab Ana Komuta Merkezi (`COMMAND_CENTER.md`)

> **Son Güncelleme:** 2026-11-15  
> **Aktif Çalışma Paketi:** Kurumsal Admin, Kurye Dağıtım, RBAC/Güvenlik & B2B Araçtan Sıcak Satış (Faz 0 – Faz 4 ✅ Tamamlandı)  
> **Doğrulama Durumu:** `npm run typecheck` (0) · `npm test` (68 dosya / 451 test) · `npm run build` (152 rota / 0 hata)  
> **Kanonik Kök Belgeler:** [`MERKEZ.md`](../MERKEZ.md) · [`AGENTS.md`](../AGENTS.md) · [`docs/MIMARI.md`](MIMARI.md)

---

## 1. Kilitli Kurucu Kararları (Tahsin Onaylı)

### Vitrin & Lansman İlkeleri (`M-05`)
- **0 ₺ Teslimat & 0 ₺ Minimum Sepet:** Beylikdüzü dağıtımında sepet alt limiti veya teslimat ücreti yok; komşu kümeleme esaslı serbest sipariş.
- **Ödeme & WhatsApp Köprüsü:** Yalnızca Kapıda Nakit / Kapıda Kart + `CartDrawer` içinde tek tık WhatsApp sepet gönderimi.
- **Şarküteri Kraft Etiketi:** Günlük şarküteri ekmekleri pencereli kraft kese kâğıdında QR (`ekmeklab.tr/?etiket=1`) etiketli.
- **K006 (Sıfır Sağlık Beyanı):** Hiçbir müşteri veya bilimsel metinde tıbbi/fizyolojik fayda vaadi yok.

### Kurumsal Admin, Kurye & B2B Kararları (`A1`–`A4`)
- **A1 (Rol & Dağıtım Netliği):** Ana saha rolü `courier` (ve opsiyonel `staff`). Kurye `/kurye` konsolunda `SIP-YYMM-XXX` / `FİŞ-YYMM-XXX`, müşteri adı, telefon, açık adres, not, harita/GPS pini, ürün kalemleri ve tahsilat tutarını net görür. `staff` yalnız operasyon görür (Z-Özeti, cariler, fiyat/ayarlar kapalı).
- **A2 (B2B Araçtan Sıcak Satış):** Şarküteri/kafe kapısında bırakılan ekmek & eşlikçi adetleri (varsa fire/iade düşümü + kapıda nakit/kart tahsilat) anlaşmalı özel fiyatla (`custom_prices`) anında atomik Teslimat Fişi (`FİŞ-YYMM-XXX`) ve Sevk İrsaliyesi olarak kesilir.
- **A3 (Hibrit Zimmet & Kasa Mutabakatı):** Fırından kuryeye tekil/toplu zimmet + vardiyadaki kuryenin tezgahtan *"Üzerime Al"* çekmesi + gün sonu Nakit/POS/Cari kasa mutabakatı.
- **A4 (Açık Kurumsal Tema):** Tüm `/admin/**` ve `/kurye` ekranları yalnız Açık Kurumsal "Atölye Kremi / Sıcak Taş" paletinde (`#F6EEDF`, `#FFFFFF`/`#FBF6EC`, `#E2D3BD`, `#3B1E1A`, `#6E5148`, `#B4532A`).

---

## 2. Kalıcı Uzman Alt-Ajan Kadrosu (`.agents/agents/`)

| Ajan Adı | Uzmanlık / Yazma Kapsamı |
| :--- | :--- |
| `guvenlik-ve-rbac-mimari` | `supabase/migrations/031*`, `supabase/tests/031*`, `src/lib/security/**`, `src/proxy.ts`, güvenlik/KVKK API düzeltmeleri |
| `kurye-ve-b2b-uzmani` | `/admin/ekip`, `/kurye`, `/api/admin/team/**`, `/api/courier/**`, `/api/admin/cari/**` (Sıcak Satış & İrsaliye) |
| `admin-kurumsal-mimari` | Açık Kurumsal `/admin/**` kabuğu, onaylı şalter, sunucu sayfalamalı `/admin/musteriler`, senkronlu `/admin/uretim`, toplu siparişler |
| `bas-elestirmen` | Salt okunur büyüme, birim ekonomi ve mimari denetçisi |
| `ekmeklab-uzman-isci` | Genel sıralı full-stack görevler ve birim testleri |
| `vitrin-ux-mimari` | Müşteri vitrini, sepet, `/urun`, `/e`, `/fis`, `/ekstre` |
| `admin-katalog-uzmani` | `/admin/urunler` ve S24 fotoğraf kataloğu |
| `pazarlama-ve-lansman-stratejisti` | `arastirma/pazarlama_lansman/**` yerel büyüme planları |
| `ultra-kreatif-studyo` | Google AI Ultra (Flow Veo 3.1, Nano Banana), `G:\Drive'ım\ekmeklab_ses\`, Remotion 60fps |

---

## 3. Faz İlerleme Tablosu (Kurumsal Admin & B2B Dönüşümü)

| Faz | Kapsam | Sorumlu Ajan | Durum |
| :--- | :--- | :--- | :--- |
| **Faz 0** | `COMMAND_CENTER.md`, `.agents/agents/` kalıcı kayıtları, `SKILL.md` güncellemesi | Orkestratör | ✅ Tamamlandı |
| **Faz 1** | `031_enterprise_admin_rbac_b2b.sql` + `031` test, `capabilities.ts`, `audit.ts`, `csv.ts`, `apiAuth.ts`, `proxy.ts`, KVKK & güvenlik yamaları | `guvenlik-ve-rbac-mimari` | ✅ Tamamlandı (SQL bekliyor) |
| **Faz 2** | `/admin/ekip`, `/kurye` Açık Kurumsal Hibrit Zimmet & Kasa Konsolu, `/api/admin/team`, `/api/courier/dispatch`, `/api/orders/[id]/claim`, `/api/admin/orders/bulk-status` | `kurye-ve-b2b-uzmani` | ✅ Tamamlandı |
| **Faz 3A** | Açık Kurumsal Admin Kabuğu, Onaylı Şalter, `staff` Finans Gizleme, Sunucu Sayfalamalı CRM (`/admin/musteriler`), Senkronlu `/admin/uretim` & Toplu Sipariş/Dağıtım (`/admin/siparisler`) | `admin-kurumsal-mimari` | ✅ Tamamlandı |
| **Faz 3B** | Kalan Admin Ekranları (`urunler`, `baski`, `ayarlar`, `login`, `siparisler/[id]`, `yeni`, alt modallar) Açık Kurumsal "Atölye Kremi" Tema Dönüşümü | `admin-kurumsal-mimari` | ✅ Tamamlandı |
| **Faz 4** | B2B Özel Fiyat Matrisi, Serbest İlçe & Kredi Limiti, Araçtan Sıcak Satış (`hot-sale`) & Sevk İrsaliyesi | `kurye-ve-b2b-uzmani` | ✅ Tamamlandı |

---

## 4. Kurucu (Tahsin) İçin Bekleyen Veritabanı Adımı (Tek Manuel Adım)
- Supabase Dashboard → SQL Editor içinde **`supabase/migrations/031_enterprise_admin_rbac_b2b.sql`** dosyasını önce `BEGIN; ... ROLLBACK;` ile deneyip ardından `COMMIT;` ile uygulayın ve **`supabase/tests/031_enterprise_admin_rbac_b2b.sql`** duman testini (`BEGIN ... ROLLBACK`) çalıştırın. (**Yeni `/admin/ekip`, kurye dağıtım veya B2B sıcak satış kullanılmadan ÖNCE uygulanmalıdır; mevcut vitrin siparişleri geriye dönük uyumludur.**)
