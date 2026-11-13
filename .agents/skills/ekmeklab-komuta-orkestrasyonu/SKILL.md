---
name: ekmeklab-komuta-orkestrasyonu
description: EkmekLab Ana Komuta Merkezi çalışma ve alt-ajan (subagent) orkestrasyon protokolü. Ana sohbetin bağlamını (context) şişirmeden sıralı veya ayrık kapsamlı uzman alt-ajanlarla denetim, geliştirme, test ve canlıya çıkış yürütürken etkinleştir.
---

# EkmekLab Komuta Merkezi & Alt-Ajan Orkestrasyon Protokolü

## 1. Bağlam (Context) Koruma İlkesi
- **Ana Sohbet = Kurmay Karargâh:** Ana sohbet strateji, mimari karar, iş emri üretimi ve son kalite kapısı (`typecheck` + `vitest` + `next build` + `git push`) merkezidir. Uzun dosya okumaları, geniş güvenlik/sürtünme taramaları ve çok dosyalı kod yazımları **alt-ajanlara (`invoke_subagent`)** devredilir.
- **Sıralı Orkestrasyon Akışı:**
  1. **Keşif & Denetim (`research` alt-ajanı):** Salt-okunur tarama ile güvenlik açıkları, sipariş sürtünmeleri, etkilenen dosyalar ve mevcut test sözleşmeleri çıkarılır.
  2. **Uygulama (`define_subagent` + uzman işçi alt-ajanlar):** Yalnızca açık `Yazma Kapsamı` verilen alt-ajanlar sırayla (veya %100 ayrık dosya kapsamıyla) çalıştırılır. Paralel alt-ajanlar `.next` çakışması yaratmamak için `npm run build` çalıştırmaz; kendi birim testlerini (`vitest run <dosya>`) ve `tsc --noEmit` kontrolünü çalıştırır.
  3. **Merkez Kalite Kapısı & Yayın:** Komuta Merkezi `git status` / `git diff --stat` denetimini yapar, `npm run typecheck && npm test && npm run build` üçlüsünü `0` hatayla doğrular ve commit/push işlemini tamamlar.

## 2. Uzman Masalar (Standart Roller)
1. **Masa 0 — Denetim & Keşif (`research`):** Sipariş hunisi sürtünmesi, API/RLS güvenliği, rate-limit, KVKK/PII sızıntısı ve ölü/çift mimari tespiti.
2. **Masa 1 — Vitrin, Sepet & Müdavim UX (`.agents/skills/ekmeklab-vitrin-ux`):** Ana sayfa, ürün kartları, `CartDrawer`, tek tık tekrar sipariş ve mobil dönüşüm ergonomisi.
3. **Masa 2 — Admin, Katalog & Cari Operasyon (`.agents/skills/ekmeklab-admin-operasyon`):** `/admin/**`, S24 fotoğraf hattı, `capacityUnits = 0` eşlikçi kuralları, atomik RPC ve cari muhasebe.
4. **Masa 3 — Bilim, Medya & Pazarlama (`.agents/skills/ekmeklab-bilim-ve-pazarlama`):** `/bilim` tekil bilim kapısı, `arastirma/studyo/` (`localhost:8787`), `gercek_ses_kurgu.py`, Remotion 60fps ve Beylikdüzü büyüme döngüsü.

## 3. Kesin İş ve Ürün Sınırları (Tahsin Onaylı Demir Kurallar)
- **Özellik Dondurma (Feature Freeze):** İlk 1.000 gerçek siparişe ulaşana kadar `/laboratuvar` oyun motoruna (`src/components/game`, `src/lib/game`) ve yerel içerik stüdyosuna (`arastirma/studyo/`) yeni özellik eklenmez; yalnızca ciroyu, sepet tutarını, tekrar siparişi ve operasyonel hızı artıran geliştirmeler yapılır.
- **Ödeme Yöntemi Sınırı:** Tahsin açıkça değiştirene kadar ödeme seçenekleri yalnızca **Kapıda Nakit** ve **Kapıda Kart** (+ mevcut WhatsApp sipariş hattı) olarak kalır; kredi kartı sanal POS, IBAN/havale veya farklı ödeme kurguları eklenmez.
- **Sıfır Sağlık Vaadi (`K006`):** Hiçbir metinde tıbbi/fizyolojik sağlık iddiası yer alamaz (`src/lib/knowledge/lint.ts`).
- **Windows Kabuk Notu:** PowerShell'de `rg` kurulu değildir; kod aramalarında `git grep` kullanılır.
