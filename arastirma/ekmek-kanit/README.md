# Ekmek kanıt sentezi (ajanlar için giriş)

> **Ne bu?** Ekmek bilimine dair açık literatürün ve fırıncı deneyimlerinin sistematik sentezi: **1.048 kaynak → 3.913 yapılandırılmış bulgu → 29 tema**. Ekim 2026'da Perplexity Computer ile üretildi.
> **Ne değil?** Doğrulanmış iddia kaydı **değil**. `content/claims` (ADR-0003) ve `docs/BILIM.md` sitenin resmî kanıt katmanıdır; bu klasör onları besleyen **ham kanıt havuzu ve simülasyon kalibrasyon kaynağıdır**.

## Önce bunu oku (kurallar)

1. **Doğrulanmamış veri.** Bulgular makale özetlerinden ve sonuç bölümlerinden bir dil modeliyle çıkarıldı. Kaynakların ~%80'i yalnız özetten okundu. Her sayı, kullanılmadan önce bağlantılı kaynaktan kontrol edilmeli.
2. **Siteye doğrudan girmez.** Buradan bir cümle siteye, yazıya veya oyun kartına (`src/lib/game/content/cards.ts`) taşınacaksa önce `content/claims/` altında iddia olarak açılır (`review: null`). Ardından ADR-0003'teki iki adımlı inceleme uygulanır: DOI Crossref'te doğrulanır, `supportCheck` ve `locator` yazılır, Tahsin onaylar.
3. **Sağlık kuralı (K006, MARKA §3) geçerli.** T17, T20–T23 temaları sağlıkla ilgili bulgular içerir (GI, fitat, FODMAP, epidemiyoloji). Bunlar yalnızca mekanizma bilgisi ve modelleme için kullanılır. Fayda bildiren cümle olarak siteye yazılmaz, ürün sayfalarına hiç girmez.
4. **Telif.** Makale özetleri bilerek repoya konmadı. Burada yalnız kendi özetlerimiz, çıkarılmış bulgular ve bağlantılar var. Kanıtta alıntı alanı açma.
5. **Kanıt gücü.** A = çok sayıda tutarlı kaynak, derleme veya meta-analiz · B = birkaç tutarlı kaynak · C = tek veya az kaynak ya da yalnızca fırıncı deneyimi. Katman `practitioner` (W kimlikleri) kontrolsüz gözlemdir; tek başına A/B dayanağı sayılmaz.

## Klasör yapısı

```
arastirma/ekmek-kanit/
├── README.md               ← bu dosya
├── SENTEZ.md               ← yönetici özeti: yöntem, kanıt haritası, 18 ana ilke, mimari etkiler, tema uzlaşı tabloları
├── MOTOR_ESLEME.md         ← src/lib/game/engine parametreleri ↔ kanıt; sapmalar ve eksik modüller
├── kanit_haritasi.png      ← faktör × sonuç bulgu sayısı ısı haritası
├── temalar/                ← 29 dosya, tema başına: uzlaşı, sayısal bulgular, koşullar, çelişkiler, simülasyon kuralları, boşluklar
│   ├── T01-....md … T29-....md
└── veri/
    ├── temalar_index.json  ← tid → ad, dosya, kaynak/bulgu sayısı
    ├── sentez/T01.json …   ← tema sentezinin makine okunur hâli (şema aşağıda)
    ├── kanit_bulgulari.csv ← 3.913 bulgu (tek satır = bir faktör→sonuç gözlemi)
    └── kanit_kaynaklari.csv← 1.048 kaynak (kimlik, katman, tip, başlık, yıl, URL, DOI, Türkçe özet, temel sayılar)
```

**Bağlam penceresi ipucu:** `SENTEZ.md` (~160 KB) ve CSV'ler büyük. Bir konu üzerinde çalışırken önce `veri/temalar_index.json` dosyasını aç, sonra yalnızca ilgili `temalar/Txx-*.md` dosyasını oku. Sayısal sorgu için CSV'yi `rg` ile ya da küçük bir script ile filtrele. CSV'nin tamamını okuma.

## Tema listesi

| Tema | Konu | Motor/site karşılığı |
|---|---|---|
| T01 | Fermantasyon sıcaklığı → gaz, hacim, mikrobiyal hız | `kinetics.ts` CTMI, `GUILDS` |
| T02 | Sıcaklık/süre/ekşi maya → organik asit, pH, TTA, laktik:asetik | asit + tampon (`kinetics.ts`) |
| T03 | Süre ve soğuk mayalanma → aroma, duyusal | `BakeResult.aroma`, `sourness` |
| T04 | Maya dozu ve suşu | `DOUGH_YEAST`, `yst_*` |
| T05 | Tuz | `saltRate` (`bake.ts`) |
| T06 | Şeker ve yağ | (motorda yok) |
| T07 | Hidrasyon | `hydration` (`bake.ts`) |
| T08 | Yoğurma, otoliz, katlama | gluten gelişimi (`dev`, `align`) |
| T09 | Protein ve gluten kalitesi | `glutenCapacity`, `glutenRobust` |
| T10 | Hasarlı nişasta, kül, kepek, partikül | `FLOURS.damagedStarch`, `buffer` |
| T11 | Tahıl türü ve antik buğdaylar (siyez, gernik, spelt) | `MATRIX.siyez`, `FLOURS` |
| T12 | Ekşi maya → hacim, sertlik, raf ömrü | `levainPct` etkileri |
| T13 | Ekşi maya ekolojisi, ardışıklık, besleme | `starter.ts` |
| T14 | Enzimler, oksidanlar, emülgatörler | (motorda yok; amilaz/proteaz var) |
| T15 | Hidrokolloidler ve glutensiz | (kapsam dışı olabilir — Tahsin kararı) |
| T16 | Pişirme sıcaklığı/süresi, buhar, esmerleşme | `bake.ts` fırın döngüsü |
| T17 | Akrilamid | (sağlık — K006) |
| T18 | Bayatlama, depolama, dondurma | (motorda yok) |
| T19 | Küf ve raf ömrü | (motorda yok) |
| T20 | Glisemik yanıt | (sağlık — K006) |
| T21 | Fitat ve mineraller | `phytase` (`bake.ts`, `starter.ts`) |
| T22 | FODMAP, sindirilebilirlik, gluten immünojenitesi | (sağlık — K006) |
| T23 | Sağlık epidemiyolojisi | (sağlık — K006) |
| T24 | Matematiksel ve kinetik modeller | tüm motor |
| T25 | Fırıncı deneyimleri (bulk süreleri, soğuk prova, buhar) | kalibrasyon testleri |
| T26 | Türk ekmekleri (DergiPark) | ürün/yazı bağlamı |
| T27 | Aroma uçucuları | `AromaProfile` |
| T28 | Buğday dışı katkılar | (motorda yok) |
| T29 | Tarih | yazı/defter kartları (zayıf: 5 bulgu) |

## Veri şemaları

**`veri/sentez/Txx.json`**
```ts
{
  tid: string; name: string; n_sources: number; n_findings: number; theme_source_ids: string[];
  consensus: { claim_tr: string; strength: "A_güçlü" | "B_orta" | "C_zayıf"; n_supporting: number; source_ids: string[] }[];
  quantitative: { quantity_tr: string; value_or_range: string; unit: string; conditions_tr: string; source_ids: string[] }[];
  moderators_tr: string[];
  conflicts: { issue_tr: string; likely_reason_tr: string; source_ids: string[] }[];
  simulation_rules: { rule_tr: string; functional_form: string; param_suggestions: string; source_ids: string[] }[];
  gaps_tr: string[];
}
```

**`veri/kanit_bulgulari.csv`** (UTF-8, virgül ayraçlı; alanlar tırnaklı olabilir, çok satırlı hücre var — satır sayarak okuma, CSV ayrıştırıcı kullan)
`kaynak_id, katman, calisma_tipi, sistem, faktor_kategori, faktor, degisim, sonuc_kategori, sonuc, yon, buyukluk, kosullar, baslik, yil, url`

- `katman`: `academic_abstract` (835) · `academic_fulltext` (132) · `academic_tr` (36, DergiPark) · `practitioner` (45)
- `yon`: `increase` · `decrease` · `no_effect` · `nonmonotonic_optimum` · `mixed`
- `faktor_kategori` (33): `flour_protein_gluten, flour_starch_damaged, flour_ash_extraction_bran, flour_fiber_arabinoxylan, grain_species_variety, flour_particle_milling, hydration, salt, sugar, fat, yeast_dose, yeast_strain_species, sourdough_addition, starter_microbiota_LAB, fermentation_time, fermentation_temperature, proofing_conditions, cold_retardation, mixing, autolysis, oxidants_ascorbic, enzymes, emulsifiers, hydrocolloids, gluten_free_ingredients, nonwheat_inclusion, baking_temperature_time, steam, storage_conditions, freezing, bread_type_comparison, diet_consumption, other`
- `sonuc_kategori` (26): `loaf_volume, crumb_structure, crumb_firmness_staling, crust_color_browning, dough_rheology, gas_production, gas_retention, pH_TTA, organic_acids, aroma_volatiles, sensory, acrylamide_contaminants, glycemic_response, phytate_minerals, FODMAP_fructans, protein_digestibility_gluten_immunogenicity, fiber_gut_microbiota, mold_shelf_life, microbial_growth_ecology, yeast_viability, moisture_water, starch_gelatinization_digestibility, nutrient_composition, health_outcome, other`
- Kaynak kimlikleri: `P…` akademik tarama, `Q…` hedefli tam metin taraması, `W…` fırıncı sayfası.

Örnek sorgu (repo kökünden):
```bash
# Tuzun gaz üretimine etkisi, sayısal büyüklüğü olan bulgular
python3 -c "import csv;[print(r['buyukluk'],'|',r['kosullar'],'|',r['url']) for r in csv.DictReader(open('arastirma/ekmek-kanit/veri/kanit_bulgulari.csv')) if r['faktor_kategori']=='salt' and r['sonuc_kategori']=='gas_production' and r['buyukluk']]"
```

## Yöntem (kısa)

1. 15 alanda 106 akademik sorgu → 1.255 benzersiz makale; özeti olan 922'si işlendi.
2. Süreç değişkenleri ve Türk ekmekleri için 40 hedefli sorgu yapıldı. Kaynaklar açık erişimli yayıncılardı (PMC, MDPI, Frontiers, DergiPark, Springer, Wiley, Nature). Bu turda 168 makalenin sonuç bölümleri okundu.
3. 45 fırıncı sayfası okundu: The Fresh Loaf, The Perfect Loaf, King Arthur, Breadtopia, Foodgeek, Weekend Bakery, Reddit ve benzerleri.
4. Her kaynağa aynı çıkarım şeması uygulandı: faktör → sonuç, yön, büyüklük, koşul. Sayılar yalnızca metinde geçiyorsa alındı.
5. Bulgular 29 temada sentezlendi: uzlaşı, sayısal aralık, çelişki, kural ve boşluk. Her madde kaynak kimliğine bağlı.

**Bilinen sınırlar:** Tarama İngilizce ve Türkçe ile sınırlı; Almanca, Fransızca ve İtalyanca uygulamalı literatür eksik. Ücretli dergilerde yalnızca özet okunabildi. Sağlık bulgularının çoğu in vitro, hayvan veya gözlemsel çalışmalara dayanıyor. Motorun çekirdek girdileri en az çalışılmış alanlar: hamur sıcaklığı, soğuk mayalanma, otoliz, yoğurma ve oksidanlar (bkz. `kanit_haritasi.png`).

## Ajan iş akışları

- **Motor kalibrasyonu:** `MOTOR_ESLEME.md` → ilgili tema dosyası → kaynakta sayıyı doğrula. Ardından `params.ts` değerini değiştir ve `claim`/`fitted` alanını güncelle. Son olarak `engine.test.ts` kalibrasyon testlerini çalıştır.
- **Yeni defter kartı veya yazı:** tema dosyasındaki A/B uzlaşı maddesi → `content/claims/` altında yeni iddia (`review: null`) → ADR-0003 incelemesi.
- **Efsane düzeltme:** sentezde "çelişkiler" bölümleri ve B/C maddeleri iyi aday. Örnekler: ekşi mayanın GI etkisi, soğuk bekletmede lezzetin süreyle düzenli artmaması.
- **Bu klasörü güncelleme:** tema dosyaları `veri/sentez/*.json` dosyalarından üretildi. Elle düzeltme yaparsan JSON'u da düzelt ki ikisi ayrışmasın.
