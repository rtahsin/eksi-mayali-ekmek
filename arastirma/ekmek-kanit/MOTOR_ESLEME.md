# Motor ↔ kanıt eşlemesi

`src/lib/game/engine/params.ts` ve `bake.ts` içindeki değerlerin kanıt sentezindeki karşılıkları. Amaç parametreleri tek tek değiştirmek değil, nereye dokunmak gerektiğini göstermek. `fitted` değerler bilerek oyun kalibrasyonuna göre seçilmiş olabilir. Değişiklik yapmadan önce `engine.test.ts` ve `rye.test.ts` kalibrasyon testlerinin neyi koruduğuna bak (usta ayarı ≥ 90, maya bölümü ardışıklığı vb.).

Durum anahtarı: **uyumlu** = kanıtla örtüşüyor · **kontrol** = sapma var; bilinçli bir kalibrasyon kararı mı, değil mi netleştir · **eksik** = kanıt var, motorda karşılığı yok.

## 1. Parametre karşılaştırması

| Parametre | Motor | Kanıt | Durum | Kaynak · tema |
|---|---|---|---|---|
| `lacS_Topt` | 33 °C (claim) | 32–33 °C (iki *F. sanfranciscensis* suşu, mMRS) | uyumlu | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) · T01, T13 |
| `lacS_Tmax` | 41 °C (claim) | 41 °C'de 7 günde görünür büyüme yok | uyumlu | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) · T01 |
| `lacS_Tmin` | 3 °C | ≈3 °C (model parametresi) | uyumlu | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) · T24 |
| `lacS_muOpt` | 0,62 | ≈0,68 h⁻¹ (besiyerinde) | kontrol (birim/ölçek motorda h⁻¹ mi?) | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) |
| `lacS_pHmin` / `lacS_pHopt` | 3,55 / 5,6 | 3,90–3,94 / 5,47–5,53 (pHmax 6,64–6,67) | **kontrol**: motor pHmin'i 0,35 birim düşük. Motor ayrışmamış asit inhibisyonunu ayrıca uyguladığı için pH terimi Gänzle'deki gibi 3,9 olabilir. Değiştirirsen maya ardışıklık testleri kayabilir. | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) · T24 |
| `yst_Topt` | 27 °C | *K. humilis* (C. milleri) 27 °C | uyumlu | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) · T01 |
| `yst_Tmax` | 36 °C | ≈35,9 °C | uyumlu | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) |
| `yst_Tmin` | 6 °C | ≈8 °C | kontrol (küçük) | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) |
| `yst_pHmin` | 2,8 | *C. milleri* büyümesi pH 3,5–7 aralığında etkilenmedi | uyumlu (pH'a dayanıklı) | [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) |
| `DOUGH_YEAST.Topt` / `.Tmax` | 34 / 42 °C | *S. cerevisiae* Topt ≈32,3 °C, Tmax ≈45,4 °C. Fırıncı kaynağı: ticari kuru mayada 35 °C üstünde etki düşer. | **kontrol**: Tmax literatürde daha yüksek, Topt biraz düşük | [Salvadó ve ark. 2011](https://pubmed.ncbi.nlm.nih.gov/21317255/) · T01, T04 |
| `saltRate` | `1 − 0,1·tuz%` (%2 ≈ %20 yavaş), tüm loncalar aynı | NaCl 0→%3: toplam gaz 1518→1272 mL (≈−%16, yani ≈%5/puan). Laktobasiller %4 NaCl'de tamamen inhibe; *C. milleri* %8'e dayanır. | **kontrol**: etki muhtemelen ~2 kat güçlü ve organizmaya göre farklı olmalı (LAB > maya) | [NaCl kapsamlı çalışma](https://pmc.ncbi.nlm.nih.gov/articles/PMC7404662/), [Gänzle ve ark. 1998](https://pmc.ncbi.nlm.nih.gov/articles/PMC106434/) · T05 |
| Tuz → hamur | (yok) | %0 ve %2,5 NaCl karşılaştırmasında su absorbsiyonu düşer, gelişme süresi uzar. NaCl %2→%0'da özgül hacim 3,16→2,90. | eksik | [KCl ikamesi çalışması](https://pmc.ncbi.nlm.nih.gov/articles/PMC9760479/) · T05 |
| `bugday_gelStart` / `gelEnd` | 60 / 80 °C | NaCl pastalama sıcaklığını ~60→61,9 °C kaydırır. Gözenek açılması (hamurun gaz geçirir hâle gelmesi) 71–81 °C, geçiş ≈76 °C. | uyumlu; gözenek açılma eşiği fırın kabarmasının bitişi için kullanılabilir | [nem faz değişimi modeli](https://www.mdpi.com/2304-8158/14/9/1649) · T16 |
| Kabuk esmerleşmesi (`surf > 115`) | doğrusal birikim | Maillard tipik olarak >120 °C, her +10 °C'de 3–5 kat hızlanır | **kontrol**: doğrusal yerine Arrhenius/Q10 ≈ 3–5 | [Maillard derlemesi](https://pmc.ncbi.nlm.nih.gov/articles/PMC12345924/) · T16 |
| Pişme bitişi | `doneness` | Merkez 92–95 °C pişmiş kabul ediliyor | uyumlu (eşik olarak kullan) | [nişasta yapı–işlev derlemesi](https://onlinelibrary.wiley.com/doi/full/10.1111/1541-4337.13147) · T16 |
| Buhar (`steam`, `steamUntil`) | erken buhar yüzeyi 100 °C'de tutar | Fırıncı pratiği ilk 15–25 dk kapalı/buharlı | uyumlu | [The Fresh Loaf: taş ve Dutch oven](https://www.thefreshloaf.com/node/71979/baking-stone-vs-dutch) · T25, T16 |
| Dolap soğuması | üstel yaklaşım | Soğuma anlık değildir, geçişte fermantasyon sürer | uyumlu | [Domson: soğuk fermantasyon](https://domson.co.uk/gb/academy/bread-technology/cold-retarded-fermentation) · T25 |

## 2. Kalibrasyon testi adayları (fırıncı tabloları)

Bunlar kontrolsüz pratik tablolardır (C düzeyi). Mutlak değer için değil, **sıralama ve aralık testleri** için uygundur.

| Koşul | Beklenen | Kaynak |
|---|---|---|
| ~%20 starter, %70–78 hidrasyon, bulk 18 / 20 / 22 / 24 / 26 °C | ≈7–9 / 6–8 / 5–6,5 / 4–5 / 3,5–4,5 saat | [Weekend Bakery](https://www.weekendbakery.com/posts/the-temperature-equation-timing-your-fermentation/) |
| %20 starter, 65 / 70 / 75 / 80 °F'de hedef kabarma | %75–100 / %50–75 / %30–50 / ~%25 (sıcakta daha az kabarma hedeflenir) | [Sourdough Archive](https://sourdougharchive.com/sourdough-bulk-fermentation-chart/) |
| 75 °F, starter %5 / %10 / %20 / %25 | bulk ≈8–12 / 6–8 / 4–6 / 3–5 saat | [Sourdough Archive](https://sourdougharchive.com/sourdough-bulk-fermentation-chart/) |
| Genel kural | Her +5 °C'de aktivite ≈2 kat (≈Q10 4; yalnız optimum altında geçerli) | [Weekend Bakery](https://www.weekendbakery.com/posts/the-temperature-equation-timing-your-fermentation/) |
| Ekşi maya, 30 °C, 4→10 saat | pH 4,51–4,73 → 3,30–3,50; ideal pH'a 25 °C'de ≈11 saat, 35 °C'de ≈9 saat | [Sourdough Bread Quality derlemesi](https://pmc.ncbi.nlm.nih.gov/articles/PMC11241011/) · T02 |
| Ekşi maya bakımı 37 °C | *F. sanfranciscensis* payı %6,2'ye düşer, Pediococcus baskınlaşır | T13 (P134) |

## 3. Motorda olmayan ama kanıtı güçlü mekanizmalar

| Mekanizma | Kanıt gücü | Önerilen biçim | Tema |
|---|---|---|---|
| Hidrasyon → hacim optimumu | A | Çan eğrisi; optimum unun su emme kapasitesine bağlı (`hacim = Vmax − k·(h − h_opt(un))²`) | T07 |
| Yoğurma tepe noktası sonrası hacim kaybı | B | Tepe noktasından sonra eşikli azalma. 200 g pin mikserde tepe sonrası fazla yoğurma hacmi %16–68 düşürdü ([Cereal Chemistry](https://onlinelibrary.wiley.com/doi/10.1094/CCHEM-02-15-0021-R)). | T08 |
| Otoliz | B (az veri) | Yoğurma ihtiyacını azaltır, uzayabilirliği artırır; uzun sürede enzime bağlı zayıflama cezası | T08, T25 |
| Bayatlama (depolama) | A (süreyle sertleşme) / B (soğuk depolama) | Avrami; k(T) buzdolabında en yüksek, donmuşta ≈0 | T18 |
| Ekşi maya → küf gecikmesi | A | Raf ömrü = f(pH, asetik asit, antifungal LAB) | T19 |
| Fitat yıkımı | A | Birinci derece kinetik: fitaz × süre × pH × sıcaklık; endojen fitaz pH optimumu 4,3–4,6, pH 5,5'te bildirilen azalma ≈%70. Motorda `phytase` durumu var ama çıktıya bağlı değil. | T21 |
| Aroma | B | Laktik:asetik, süre ve sıcaklık; maya suşu ana belirleyici (`AromaProfile` ile bağla) | T03, T27 |

**Not:** Sağlık temalarındaki (T17, T20–T23) mekanizmalar motorda içsel durum olarak modellenebilir. Ancak sonuç ekranında, defterde veya ürün sayfasında fayda dili kullanılmaz (K006).
