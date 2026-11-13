# EkmekLab Kitap & YouTube İçerik Planı (25 Ana Başlık)

> **Operasyonel Merkez:** [`MERKEZ.md`](../MERKEZ.md) (Şerit 1 — 3 Adımlı Tam Metin Hattı)  
> **İnteraktif 25-Bölüm Kanıt Cephaneliği:** [`arastirma/bilgi_sentezi_v2/konu_cephaneligi.html`](../arastirma/bilgi_sentezi_v2/konu_cephaneligi.html) (`300` kart ataması, `251` tekil birincil tam metin makale, 1-tıkla üretim komutu)  
> **Veri Tabanı:** `arastirma/bilgi_sentezi_v2/indeks/bilgi_sentezi.sqlite` (`fts_tam_metin` — **2.541** tam metin kaydı: `arastirma/metin/*.txt` **1.480** tam metin + `arastirma/bolumler/` **818** ana bölüm eseri; **243** `_ilgisiz_suphe` dışlanmış, **4** kör sınama eseri `BLIND-01..04` izole edilmiştir)  
> **Marka & Bilim Sınırı:** [`docs/MARKA.md`](MARKA.md) §3 ve [`AGENTS.md`](../AGENTS.md) §7 uyarınca hiçbir kitap bölümünde veya video metninde sağlık vaadi ("şifa, önler, iyileştirir, sindirimi kolaylaştırır, bağırsak dostu" vb.) yer almaz; biyokimyasal süreçler yalnızca "hamurda ve fırında ne olur?" diliyle ve ölçüm sınırlarıyla anlatılır.

---

## 1. Yerel Tam Metin Arşivi Yoğunluk Haritası (`arastirma/bolumler/`)

Aşağıdaki tablo, sıfır-LLM deterministik indeksleyici (`araclar/tam_metin_indeksle.py --istatistik`) ile doğrulanan 10 klasörlük arşiv dağılımını ve bu plandaki 25 başlığın (`KONU-01` .. `KONU-25`) dağılımını gösterir:

| Arşiv Klasörü | Ana Tam Metin Eser | Toplam Kelime | `_ilgisiz_suphe` (Dışlanan) | Kitap / Seri Eksenindeki Rolü | Atanan Konular |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `00_kanit_ve_deney` | 120 | 1,42M | 32 | Empirik vs. temel reoloji, fırın deneyi tasarımı, ölçüm okuryazarlığı | `KONU-13` |
| `01_kavram_atlasi` | 194 | 2,49M | 29 | pH/TTA tamponlama, zayıf asit $\mathrm{p}K_a$ kinetiği, su aktivitesi ($a_w$), enzim hızları | `KONU-11`, `KONU-12` |
| `02_tane` | 196 | 2,19M | 29 | Buğday ve çavdar anatomisi, aleuron, **çavdar arabinoksilanları**, kadim buğdaylar | `KONU-05`, `KONU-06`, `KONU-07` |
| `03_tarladan_una` | 222 | 2,79M | 45 | Taş vs. valsli değirmen, zedelenmiş nişasta, Düşme Sayısı (Falling Number) ve $\alpha$-amilaz | `KONU-08`, `KONU-09`, `KONU-10` |
| `04_hamur` | 134 | 1,82M | 27 | Glutenin makro-polimeri, otoliz, tuz, polar lipit sıvı filmi, redoks, ksilanaz | `KONU-14` – `KONU-19` |
| `05_mikroplar_ve_kabarma` | 160 | 2,05M | 30 | 10 günlük ardıllık, maltoz simbiyozu, EPS/dekstran, antifungal metabolitler | `KONU-01` – `KONU-04` |
| `06_firin_ve_sonrasi` | 171 | 1,99M | 24 | Köpükten süngere geçiş ($T_{\text{open}}$), buhar-kabuk fiziği, Maillard, retrogradasyon | `KONU-20` – `KONU-22` |
| `07_vucutta_ekmek` | 195 | 1,84M | 10 | Fitaz/fitat parçalanması ve fruktan/invertaz kimyası *(saf gıda kimyası; sağlık vaadi yok)* | `KONU-23`, `KONU-24` |
| `08_tarih_ve_tipler` | 85 | 0,77M | 15 | Bereketli Hilal/Anadolu evcilleştirmesi, yüksek sıcaklıklı yassı ekmek buhar cebi fiziği | `KONU-25` *(birleşik)* |
| `09_ekmegi_okumak` | 91 | 0,76M | 2 | X-ışını mikro-BT gözenek tomografisi, kabuk pullanması ve fırıncı hata teşhisi | `KONU-25` *(birleşik)* |

---

## 2. Üretim Standardı: Her Başlık İçin Çıktı Paketi

Her `KONU-XX` başlığı, genel özet taramasına girmeden doğrudan **3 Adımlı Tam Metin Hattı** ile üretilir:

1. **Adım 1 — Hedefli FTS5 Seçimi & Tam Metin Okuma:** `fts_tam_metin` indeksinden konuya en doğrudan cevap veren **8–15 birincil tam metin makale** seçilir (`kor_sinama_mi = 0`, `ilgisiz_suphe_mi = 0`) ve karakter-birebir alıntılarla `kanit_kartlari.jsonl` çıkarılır.
2. **Adım 2 — Kanonik İddia Doğrulaması:** Sayısal veriler, pH/sıcaklık/süre sınırları ve çelişkiler `kanonik_iddialar.jsonl` ve `konu_dosyasi.md` içine kilitlenir.
3. **Adım 3 — Doğrudan İçerik Üretimi:**
   - **Kitap Bölümü Taslağı:** `2.500+` kelime, biyokimyasal/fiziksel mekanizma + tezgâh üstü kontrol parametreleri.
   - **YouTube Uzun Video Senaryosu:** `8–10` dakika (`1.200–1.400` konuşma kelimesi) + görsel/grafik planı + 2 adet Shorts/Reels kancası.

---

## 3. 25 Ana Başlıklık Kitap ve YouTube Yol Haritası

### Kısım I — Canlı Kavanoz: Ekşi Maya Mikrobiyolojisi ve Fermantasyon Ekolojisi (`05_mikroplar_ve_kabarma`)

#### `KONU-01` — Ekşi Mayanın İlk 10 Günü: Mikrobiyal Savaş, $\mathrm{p}K_a$ Duvarı ve Kararlı Ekosistem
- **Durum:** ✅ **Tamamlandı (`BS05` / `BS06` — Tam Metin Hattı v1)**
- **Kitap Bölümü:** *Kavanozdaki Sessiz Savaş: Un Florasından Kararlı Ekşi Mayaya 10 Günlük Mikrobiyal Ardıllık*
- **YouTube Bölümü:** *Ekşi Mayanın İlk 10 Günü: 2. Gündeki Yalancı Kabarma ve pH 4,5 Duvarının Biyokimyası*
- **Çekirdek Mekanizma:** Ham undaki *Pantoea*, *Bacillus* ve *Enterobacteriaceae* florası; *Weissella*/*Lactococcus* öncü dalgası; laktik asit ($\mathrm{p}K_a = 3{,}86$) ile asetik asit ($\mathrm{p}K_a = 4{,}75$) arasındaki ayrışmamış lipofilik asit ($\mathrm{HA}$) difüzyon farkı; maltoz fosforilaz aracılı maya patlaması ve steril laboratuvar vs. fırın evi mikrobiyotası paradoksu.
- **FTS5 Tam Metin Yoğunluğu:** `54+` doğrudan ardıllık tam metni (`23` çekirdek backslopping kinetiği eseri)
- **Çapa Tam Metinler:** `METIN-0372` (`10.1016/j.ijfoodmicro.2023.110445`, González-Alonso 2024), `BOLUM-0615` (`10.1128/aem.00315-07`, Van der Meulen 2007), `METIN-1446` (`10.1128/spectrum.00662-21`, Oshiro 2021), `METIN-0985` (`10.3390/foods11233942`, Di Biase 2022).

#### `KONU-02` — Büyük Ortaklık: *Fructilactobacillus sanfranciscensis* ve *Kazachstania humilis* Neden Birbirini Öldürmez?
- **Durum:** ✅ **Tamamlandı (`arastirma/bilgi_sentezi_v2/isler/KONU02_maltoz_simbiyozu/` + `arastirma/medya_hatti/cikti/KONU-02/` — Sayı #03)**
- **Kitap Bölümü:** *Maltoz Fosforilaz Antlaşması: Tip I Ekşi Mayada Niş Paylaşımı ve Asetat Akışı*
- **YouTube Bölümü:** *100 Bakteriye 1 Maya: Ekşi Mayanın İki Başrol Oyuncusu Şekeri Nasıl Bölüşüyor?*
- **Çekirdek Mekanizma:** Maltoz-negatif *K. humilis* ile maltoz fosforilaz ($\text{EC 2.4.1.8}$) kullanan *F. sanfranciscensis* arasındaki glukoz sızıntısı, fruktozun elektron alıcısı olarak mannitol'e indirgenmesi ve fazladan $\text{ATP}$ + asetik asit üretimi.
- **FTS5 Tam Metin Yoğunluğu:** `101` yerel tam metin
- **Çapa Tam Metinler:** `METIN-0020` (`10.1007/s00217-021-03722-0`), `METIN-1446` (`10.1128/spectrum.00662-21`), `METIN-1432` (`10.1007/s11274-021-03027-0`).

#### `KONU-03` — Bakterilerin Ördüğü Görünmez Ağ: Ekzopolisakkaritler (Dekstran ve Levan)
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Mikrobiyal Hidrokolloidler: Dekstransükraz ve Levansükraz Hamur Reolojisini Nasıl Değiştirir?*
- **YouTube Bölümü:** *Katkısız Yumuşaklığın Sırrı: Ekşi Maya Bakterileri Sakkarozdan Nasıl Doğal Jel Üretir?*
- **Çekirdek Mekanizma:** *Weissella* ve *Leuconostoc* türlerinin sükrozdan *in situ* dekstran/levan sentezi, su bağlama kapasitesi, somun özgül hacmi artışı ve aşırı asitlenmeden önce EPS penceresini yakalama koşulları.
- **FTS5 Tam Metin Yoğunluğu:** `118` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0634` (`10.3389/fmicb.2015.00834`), `METIN-0942` (`10.3390/fermentation8100571`).

#### `KONU-04` — Küfe Karşı Kimyasal Kalkan: Fenillaktik Asit, Hidroksi Yağ Asitleri ve Biyokoruma
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Asetik Asidin Ötesinde: Ekşi Mayada Antifungal Karboksilik Asitler ve Sinerjik Küf Baskılama*
- **YouTube Bölümü:** *Ekşi Mayalı Ekmek Neden Geç Küflenir? Kalsiyum Propiyonatsız Raf Ömrünün Kimyası*
- **Çekirdek Mekanizma:** *L. plantarum* ve *L. brevis* tarafından fenilalaninden üretilen 3-fenillaktik asit, hidroksi yağ asitleri ve siklik dipeptitlerin asetik asitle sinerjik membran bozucu etkisi (*Penicillium*, *Aspergillus*, *Fusarium* spor çimlenmesi baskısı).
- **FTS5 Tam Metin Yoğunluğu:** `60` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0607` (`10.1128/aem.66.9.4084-4090.2000`, Lavermicocca 2000), `METIN-0985` (`10.3390/foods11233942`).

---

### Kısım II — Tanenin Mimarisi ve Çavdarın Özel Dünyası (`02_tane`)

#### `KONU-05` — Çavdar Ekmeği ve Çözünebilir Lif / Arabinoksilanlar: Glutensiz İskeletin Fiziği
- **Durum:** ✅ Tamamlandı (`arastirma/bilgi_sentezi_v2/isler/KONU05_cavdar_arabinoksilan/` + `arastirma/medya_hatti/cikti/KONU-05/`)
- **Kitap Bölümü:** *Gluten Ağının Olmadığı Yerde: Çavdar Pentozanları, Arabinoksilan Jelleşmesi ve Nişasta Saldırısı* (`3.860` düz metin kelimesi)
- **YouTube Bölümü:** *Çavdar Hamuru Neden Yoğrulmaz? Arabinoksilanların Su Tutma Gücü ve Ekşi Maya Zorunluluğu* (`1.264` konuşma kelimesi + 2 dikey kısa video)
- **Çekirdek Mekanizma:** Çavdar sekalin proteinlerinin sürekli viskoelastik gluten ağı kuramaması; ağırlığının katbekat fazlası suyu bağlayan suda ekstrakte edilebilir (**WEAX**) ve edilemeyen (**WUAX**) arabinoksilanların (pentozanların) viskoz sıvı film oluşturması; ferulik asit oksidatif çapraz bağlanması; çavdar nişastasının düşük jelatinizasyon sıcaklığı (`55–62 °C`) yüzünden $\alpha$-amilazın iç dokuyu çökertmesi (*starch attack* / hamurlaşma) ve ekşi maya asitliğinin ($\text{pH} < 4{,}3$) $\alpha$-amilazı durdurarak çavdar ekmeğini ayakta tutması.
- **FTS5 Tam Metin Yoğunluğu:** `90` doğrudan çavdar + arabinoksilan tam metni (`128` genel arabinoksilan tam metni)
- **Çapa Tam Metinler:** `METIN-1415` (`10.3390/foods9121900`, *Rye Bread Defects: Dry-Baking and Starch Attack*), `METIN-1440` (`10.1002/fsn3.2344`), `METIN-0424` (`10.1016/j.lwt.2021.111918`).

#### `KONU-06` — Buğday Tanesinin Gizli Katmanı: Perikarp, Aleuron Hücre Duvarı ve Kül Tamponlaması
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Endospermden Kabuğa: Sub-Aleuron Protein Gradyanı, Kepek Mekaniği ve Mineral Tamponlama*
- **YouTube Bölümü:** *Kepek Sadece "Kabuk" Değildir: Buğday Tanesinin 7 Katmanı Hamuru Nasıl Değiştirir?*
- **Çekirdek Mekanizma:** Merkeze kıyasla sub-aleuron tabakasında yoğunlaşan depo proteinleri, aleuron hücrelerindeki fitat-mineral kompleksleri (kül oranının TTA tamponlama kapasitesine etkisi) ve kaba kepek parçacıklarının gaz hücre zarlarını mekanik olarak delme (*steric hindrance*) mekanizması.
- **FTS5 Tam Metin Yoğunluğu:** `40` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0303` (`10.3390/plants11070889`), `BOLUM-0517` (`10.1111/1541-4337.12176`).

#### `KONU-07` — Siyez, Kavılca, Kılçıksız Buğday (Spelt) ve Modern Ekmeklik Buğday: D Genomu Farkı
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Diploidden Hekzaploid'e: AA, AABB ve AABBDD Genomlarında Gliadin/Glutenin Oranı*
- **YouTube Bölümü:** *Siyez ve Kavılca Hamuru Neden Yayılır? "Modern Buğday" Efsaneleri ve D Genomunun Gerçek Rolü*
- **Çekirdek Mekanizma:** *Triticum monococcum* (AA), *T. dicoccum* (AABB) ve *T. spelta* / *T. aestivum* (AABBDD) arasında 1D kromozomundaki `Glu-D1` yüksek molekül ağırlıklı glutenin alt-birimlerinin (`Dx5 + Dy10`) elastikiyet farkı; yüksek gliadin/glutenin oranı nedeniyle kadim unlarda aşırı yoğurmadan kaçınma ve kalıp/soğuk fermantasyon stratejisi *(sağlık efsanelerine girmeden saf protein reolojisi)*.
- **FTS5 Tam Metin Yoğunluğu:** `267` yerel tam metin
- **Çapa Tam Metinler:** `METIN-1387` (`10.3390/foods8090409`), `BOLUM-0290` (`10.3390/foods8090409`).

---

### Kısım III — Değirmenden Tezgâha: Un Fiziği ve Enzim Dengesi (`03_tarladan_una`)

#### `KONU-08` — Zedelenmiş Nişasta (Damaged Starch): Su Kaldırma ile Yapışkan Hamur Arasındaki İnce Çizgi
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Kırık Granülün İki Yüzü: Zedelenmiş Nişastanın Hidrasyon Kinetiği ve $\beta$-Amilaz Maltoz Üretimi*
- **YouTube Bölümü:** *Aynı Protein Oranlı İki Un Neden Farklı Su Alır? Zedelenmiş Nişasta Gerçeği*
- **Çekirdek Mekanizma:** Sağlam nişasta granülü soğuk suda ağırlığının ~%40'ını bağlarken mekanik olarak zedelenmiş granülün %200–400 su çekmesi; $\alpha$- ve $\beta$-amilazın yalnızca zedelenmiş granüle hızla saldırıp maltoz üretmesi ve aşırı zedelenmede (>%8–9) fırın aşamasında dekstrinleşip iç dokuyu çökertmesi.
- **FTS5 Tam Metin Yoğunluğu:** `86` yerel tam metin
- **Çapa Tam Metinler:** `METIN-0424` (`10.1016/j.lwt.2021.111918`), `METIN-0039` (`10.1016/j.foodchem.2016.09.004`).

#### `KONU-09` — Taş Değirmen mi, Valsli Değirmen mi? Sıcaklık, Ruşeym Yağları ve Partikül Dağılımı
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Öğütme Mekaniği: Kırma-Redüksiyon Valsleri ile Taş Değirmen Arasında Lipit Oksidasyonu ve Kepek Boyutu*
- **YouTube Bölümü:** *Taş Değirmen Unu Gerçekten Daha mı İyi? Öğütme Fiziği, Isınma ve Bayatlama Testi*
- **Çekirdek Mekanizma:** Taş değirmende ruşeym lipitleri ve lipoksijenaz enziminin endosperme birlikte dağılması (raf ömrü vs. karotenoid oksidasyonu), partikül boyutu bimodalitesi ve valsli sistemde akış ayırma kontrolü.
- **FTS5 Tam Metin Yoğunluğu:** `40` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0407` (`10.1016/j.aoas.2013.01.008`), `BOLUM-0517` (`10.1111/1541-4337.12176`).

#### `KONU-10` — Hagberg Düşme Sayısı (Falling Number) ve Filizlenmiş Buğday: $\alpha$-Amilaz Kinetiği
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Saniyelerle Ölçülen Viskozite: Düşme Sayısı, Geç Olgunlaşma $\alpha$-Amilazı ve Malt Unu Ayarı*
- **YouTube Bölümü:** *Un Çuvalındaki Gizli Rakam: "Falling Number" 250 mi 400 mü Olmalı?*
- **Çekirdek Mekanizma:** Hasat öncesi çimlenme (PHS) ve geç olgunlaşma $\alpha$-amilazı (LMA); `FN < 200 s` olduğunda sıvılaşan iç doku ve bıçak sırtına yapışan kırıntı; `FN > 350 s` kuru unlarda diyastatik malt dozajı ve soluk kabuk sorunu.
- **FTS5 Tam Metin Yoğunluğu:** `85` yerel tam metin
- **Çapa Tam Metinler:** `METIN-1366` (`10.3389/fpls.2018.01356`, *Does Late Maturity Alpha-Amylase Impact Wheat Baking Quality?*).

---

### Kısım IV — Ölçüm ve Kavram Atlası: Fırıncının Fizikokimya Alet Çantası (`01_kavram_atlasi` & `00_kanit_ve_deney`)

#### `KONU-11` — pH Neden Tek Başına Yalan Söyler? TTA, Tamponlama Kapasitesi ve Fermantasyon Katsayısı
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Logaritmik Yanılsama: pH, Titre Edilebilir Asitlik (TTA) ve Laktat/Asetat Molar Oranı*
- **YouTube Bölümü:** *pH Ölçeriniz 3,9 Gösteriyor Ama Ekmeğiniz Neden Ekşi Değil? pH ve TTA Farkı*
- **Çekirdek Mekanizma:** Serbest $\text{H}^+$ aktivitesi (pH) ile toplam nötralize edilebilir organik asit havuzu (TTA) arasındaki fark; Tip 550 beyaz un ile tam çavdar unu arasında 3–5 kat değişen tamponlama kapasitesi; algılanan keskin sirke ekşiliğinde asetik asit uçuculuğunun rolü.
- **FTS5 Tam Metin Yoğunluğu:** `19` doğrudan tamponlama + TTA tam metni (`194` kavram atlası eseri)
- **Çapa Tam Metinler:** `BOLUM-0058` (`10.3390/pr14172711`), `BOLUM-0612` (`10.1128/aem.69.1.475-482.2003`).

#### `KONU-12` — Serbest Su Yoktur, Su Aktivitesi ($a_w$) Vardır: Kabuktan İçe Nem Göçü
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Hidrasyon Yüzdesinin Ötesinde: Su Aktivitesi ($a_w$), Camlaşma Sıcaklığı ($T_g$) ve Kabuk Yumuşaması*
- **YouTube Bölümü:** *Fırından Çıtır Çıkan Kabuk 4 Saat Sonra Neden Lastikleşir? Su Aktivitesi ($a_w$) Fiziği*
- **Çekirdek Mekanizma:** Pişmiş ekmek içi ($a_w \approx 0{,}95\text{–}0{,}97$) ile taze kabuk ($a_w < 0{,}30$) arasındaki kimyasal potansiyel farkı; buhar difüzyonuyla kabuğun camsı halden (*glassy state*) kauçuksu hale (*rubbery state*) geçişi.
- **FTS5 Tam Metin Yoğunluğu:** `127` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0024` (`10.1111/j.1745-4603.2012.00368.x`), `METIN-0340` (`10.1016/j.foodchem.2025.145194`).

#### `KONU-13` — Farinograf, Alveograf ve Gerinim Sertleşmesi: Hamur Testlerini Tezgâha Tercüme Etmek
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Un Raporunu Okumak: $W$, $P/L$, Gelişme Süresi ve Biaxial Uzamada Gerinim Sertleşmesi (Strain Hardening)*
- **YouTube Bölümü:** *Un Çuvalındaki W ve P/L Değerleri Ne Anlama Geliyor? Laboratuvar Cihazlarını Elle Hissetmek*
- **Çekirdek Mekanizma:** Küçük deformasyonlu salınımlı reometri ($G', G''$) neden fırın performansını tek başına tahmin edemez? Gaz kabarcığı büyürken zarın incelip yırtılmasını önleyen büyük deformasyonlu **gerinim sertleşmesi** (*strain hardening*) ilkesi.
- **FTS5 Tam Metin Yoğunluğu:** `304` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0002` (`10.1006/jcrs.1999.0295`), `BOLUM-0533` (`10.3136/fstr.25.237`).

---

### Kısım V — Hamur Reolojisi: Viskoelastik Köpüğün İnşası (`04_hamur`)

#### `KONU-14` — Glutenin Makro-Polimeri (GMP): Yoğurma, Aşırı Yoğurma ve Disülfit Takası
- **Durum:** ✅ **Tamamlandı (`arastirma/bilgi_sentezi_v2/isler/KONU14_glutenin_makropolimeri/` + `arastirma/medya_hatti/cikti/KONU-14/` — Sayı #04)**
- **Kitap Bölümü:** *Bağların Kırılıp Yeniden Kurulması: Glutenin Polimerizasyonu, $\text{SH/SS}$ Takası ve Aşırı Yoğurma Çöküşü*
- **YouTube Bölümü:** *Hamur Yoğruldukça Nasıl Güçlenir ve Bir Anda Neden Çöker? Gluten Ağının Moleküler Fiziği*
- **Çekirdek Mekanizma:** Monomerik gliadinler (viskozite/uzayabilirlik) ile polimerik gluteninlerin (elastikiyet) etkileşimi; mekanik kesme enerjisiyle SDS-çözünmez Glutenin Makro-Polimerinin (GMP) depolimerizasyonu ve dinlenmede yeniden polimerizasyonu.
- **FTS5 Tam Metin Yoğunluğu:** `78` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0539` (`10.1016/j.foodchem.2018.07.157`), `BOLUM-0533` (`10.3136/fstr.25.237`).

#### `KONU-15` — Otoliz (Autolyse), Fermentoliz ve Katlama Mekaniği: Yoğurmadan Güç Kazanmak
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Zamana Bırakılan Hidrasyon: Otolizde Endojen Proteazlar, Gerilim Gevşemesi ve Katlama Geometrisi*
- **YouTube Bölümü:** *Otoliz Gerçekten Fark Yaratıyor mu? Tuzlu, Tuzsuz ve Ekşi Mayalı Bekletme Karşılaştırması*
- **Çekirdek Mekanizma:** Su-un ön dinlendirmesinde tam hidrasyon, buğday endojen aspartik proteazlarının kontrollü uzayabilirlik artışı, aşırı uzun otolizde yüksek amilazlı/zayıf unlarda ağ gevşemesi riski ve germe-katlama (*stretch & fold*) ile gaz hücrelerinin yeniden bölünmesi.
- **FTS5 Tam Metin Yoğunluğu:** `57` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0512` (`10.1021/jf502547a`), `BOLUM-0002` (`10.1006/jcrs.1999.0295`).

#### `KONU-16` — Tuzun ($\text{NaCl}$) Üçlü Görevi: Yük Perdeleme, Su Aktivitesi ve Fermantasyon Freni
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Yüzde İkinin Fiziği: $\text{Na}^+$ ve $\text{Cl}^-$ İyonları Gluten İtişmesini Nasıl Susturur?*
- **YouTube Bölümü:** *Tuzu Unutursanız Hamura Ne Olur? Tuzun Lezzet Dışındaki 3 Kritik Fiziksel Görevi*
- **Çekirdek Mekanizma:** Hamur pH'sında net pozitif yüklü gluten zincirleri arasındaki elektrostatik itişmenin $\text{Cl}^-$ iyonlarıyla perdelenmesi (*charge shielding*), hidrofobik etkileşimlerin güçlenmesi ve ozmotik basınçla maya $\text{CO}_2$ üretim hızının dizginlenmesi.
- **FTS5 Tam Metin Yoğunluğu:** `580` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0539` (`10.1016/j.foodchem.2018.07.157`), `METIN-0985` (`10.3390/foods11233942`).

#### `KONU-17` — Glutenin Göremediğimiz Ortağı: Polar Lipitler (Galaktolipitler) ve Sıvı Film Teorisi
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Kabarcığın İkinci Zarı: Gaz-Sıvı Arayüzeyinde Digalaktozildigliseritler ve Puroindolinler*
- **YouTube Bölümü:** *%2'lik Gizli Kahraman: Unun Kendi Yağları Olmasa Ekmek Neden Kabaramaz?*
- **Çekirdek Mekanizma:** Gluten-nişasta matrisi ısı ve gerilimle inceldiğinde gaz hücresini sönmekten kurtaran **sıvı lameller film**; polar galaktolipitlerin yüzey gerilimini düşürmesi vs. serbest doymamış yağ asitlerinin köpük kırıcı etkisi.
- **FTS5 Tam Metin Yoğunluğu:** `6` çekirdek sıvı-film derlemesi (`40+` buğday lipit tam metni)
- **Çapa Tam Metinler:** `BOLUM-0162` (`10.1111/1541-4337.12616`, *Impact of wheat endogenous lipids on the quality of fresh bread*).

#### `KONU-18` — C Vitamini (Askorbik Asit) ve Glutatyon: Hamurda Redoks Anahtarı
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *İndirgeyiciden Yükseltgeyiciye: Askorbik Asit Oksidaz, Dehidroaskorbik Asit ve Glutatyon Kapanı*
- **YouTube Bölümü:** *Bir Çimdik C Vitamini Hamuru Nasıl Dikleştirir? Ve Havasız Yoğurmada Neden Ters Teper?*
- **Çekirdek Mekanizma:** L-askorbik asidin kendisi indirgeyici olduğu halde yoğurma sırasında oksijen ve askorbik asit oksidaz ile **dehidroaskorbik aside (DHAA)** dönüşmesi; glutatyon dehidrogenaz üzerinden serbest indirgenmiş glutatyonu ($\text{GSH} \to \text{GSSG}$) yakalayarak glutenin disülfit kırılmasını önlemesi.
- **FTS5 Tam Metin Yoğunluğu:** `23` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0533` (`10.3136/fstr.25.237`).

#### `KONU-19` — Ksilanazlar ve Suyun Yeniden Dağıtımı: Kepekli Buğday Hamurunu Açmanın Yolu
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Seçici Makas: Endo-1,4-$\beta$-Ksilanazların WUAX'ı WEAX'a Dönüştürmesi ve Suyu Glutene İade Etmesi*
- **YouTube Bölümü:** *Tam Buğday Ekmeği Neden Sıkı Olur? Liflerin Çaldığı Suyu Glutene Geri Vermek*
- **Çekirdek Mekanizma:** Buğdayda gaz zarlarını delen çözünmez arabinoksilanların (**WUAX**) seçici endo-ksilanazlarla çözünür yüksek viskoziteli **WEAX**'a kesilmesi; aşırı ksilanaz dozunda ise serbest kalan suyun hamuru yayması (*slackening*).
- **FTS5 Tam Metin Yoğunluğu:** `52` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0517` (`10.1111/1541-4337.12176`), `METIN-0424` (`10.1016/j.lwt.2021.111918`).

---

### Kısım VI — Fırın Termodinamiği, Kabuk Kimyası ve Bayatlama (`06_firin_ve_sonrasi`)

#### `KONU-20` — Fırın Sıçraması (Oven Spring) ve Köpükten Süngere Dönüşüm
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Kapalı Hücreden Açık Gözenekli Süngere: Gaz Genleşmesi, Etanol Buharlaşması ve Jelatinizasyon Kilitlenmesi*
- **YouTube Bölümü:** *Fırındaki İlk 12 Dakika: Hamur Ne Zaman Kabarır, Ne Zaman Donar?*
- **Çekirdek Mekanizma:** `35–55 °C` arasında son maya hamlesi + çözünmüş $\text{CO}_2$ desorpsiyonu + su/etanol buhar basıncı artışı; `58–75 °C` aralığında nişasta jelatinizasyonu ve gluten termoset çapraz bağlanmasıyla kapalı gaz köpüğünün (**foam**) yırtılıp sürekli açık gözenekli süngere (**sponge**) dönüşmesi.
- **FTS5 Tam Metin Yoğunluğu:** `64` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0718` (`10.3136/fstr.9.219`).

#### `KONU-21` — Buharın İki Dakikalık Mucizesi, Jilet Atma (Scoring) ve Maillard Aromaları
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Yoğuşma Gizli Isısı: Çiy Noktası, Yüzey Nişasta Jelatinizasyonu ve 2-Asetil-1-Pirolin*
- **YouTube Bölümü:** *Fırına Neden Buhar Veriyoruz? Parlak Kabuk, Kulak Açılması ve Kızarmış Kabuk Aromasının Fiziği*
- **Çekirdek Mekanizma:** Soğuk hamur yüzeyine (`~25 °C`) çarpan su buharının yoğuşarak gizli ısı bırakması, kabuğun erken kurumasını geciktirerek fırın sıçramasına izin vermesi, yüzey nişastasının jelatinize olup cam gibi parlaması; ardından `>140 °C` ve düşük nemde Maillard reaksiyonu (indirgen şekerler + ornitin/prolin $\to$ 2-asetil-1-pirolin) ve akrilamid sınırı.
- **FTS5 Tam Metin Yoğunluğu:** `52` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0765` (`10.26502/jfsnr.2642-11000056`).

#### `KONU-22` — Bayatlama Kurumak Değildir: Amilopektin Retrogradasyonu ve Buzdolabı Hatası
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Kristalin Geri Dönüş: Amilozun İlk Saatlerdeki Jelleşmesi ve Amilopektin Yan Zincirlerinin Yavaş Kristalizasyonu*
- **YouTube Bölümü:** *Ekmeği Neden Asla Buzdolabına Koymamalısınız? Bayatlamanın Gerçek Moleküler Nedeni*
- **Çekirdek Mekanizma:** Kapalı poşette su kaybetmeyen ekmeğin bile sertleşmesi; amilozun soğuma anında (`0–2 saat`) hızla kristalleşerek dilimlenebilirlik sağlaması, amilopektin B-tipi çift sarmal kristalizasyonunun ise `+4 °C` civarında çekirdeklenme-büyüme maksimumuna ulaşması (`-18 °C` dondurma vs. `60 °C` yeniden tazeleme termodinamiği).
- **FTS5 Tam Metin Yoğunluğu:** `106` yerel tam metin
- **Çapa Tam Metinler:** `METIN-0346` (`10.1016/j.foodhyd.2020.105879`), `BOLUM-0730` (`10.1007/s11947-013-1099-3`).

---

### Kısım VII — Analitik Gıda Kimyası ve Efsanelerin Sınırları (`07_vucutta_ekmek`)

> **Katı Kural (`MARKA.md` §3 & `AGENTS.md` §7):** Bu kısımdaki iki başlıkta hiçbir klinik/tıbbi vaat, "şifa / bağırsak onarımı / sindirimi kolay / glütensizleşir" söylemi **kurulamaz**. Yalnızca hamur içinde ölçülen enzimatik substrat dönüşümleri ve popüler efsanelerin deneysel sınırları anlatılır.

#### `KONU-23` — Fitik Asit, Tahıl Fitazı ve pH 5,0 Penceresi: Hamurda Ne Ölçülüyor, Ne Abartılıyor?
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Miyoinositol Hekzakisfosfat ($\text{IP}_6$) Hidrolizi: Buğday ve Çavdar Endojen Fitazının pH-Sıcaklık Kinetiği*
- **YouTube Bölümü:** *Ekşi Maya Fitik Asidi Nasıl Parçalar? pH 5,0 Optimumu ve Sosyal Medya Abartılarının Sınırı*
- **Çekirdek Mekanizma:** Tahılın kendi fitaz enziminin (`pH 4,5–5,5` optimumu) mikrobiyal fitazdan çok daha baskın olması; kısa maya fermantasyonunda pH `~5,8`'de kaldığı için sınırlı kalan $\text{IP}_6$ parçalanmasının, orta asitlikteki uzun fermantasyonda hızlanması ve aşırı düşük pH'da (`<3,5`) tekrar yavaşlaması.
- **FTS5 Tam Metin Yoğunluğu:** `47` yerel tam metin
- **Çapa Tam Metinler:** `BOLUM-0924` (`10.3390/fermentation7020063`).

#### `KONU-24` — Fruktanlar, İnvertaz ve Mannitol: Uzun Fermantasyonda Karbonhidrat Dönüşümü ve Efsane Düzeltmesi
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Graminan Tipi Fruktanların Parçalanması: Maya İnvertazı, Ekstraselüler Fruktansükrazlar ve Mannitol Dengesi*
- **YouTube Bölümü:** *"Ekşi Maya Glüteni Yok Eder" Yanılgısı ve Hamurdaki Gerçek Şeker Dönüşümü (Fruktan & Mannitol)*
- **Çekirdek Mekanizma:** Buğday unundaki başlıca fermente olabilir oligosakkarit olan fruktanların (`%1–2` kuru ağırlık) *S. cerevisiae* invertazı ve ekşi maya $\beta$-fruktofuranozidazlarıyla fruktoza parçalanması; heterofermentatif LAB'ların fruktozu **mannitol**'e dönüştürmesi (bir şeker azalırken bir poliolün artması) ve ekşi mayanın çölyak açısından glüteni güvenli seviyeye **indirmediğinin** (`>20 ppm` kalıntı) net analitik sınırı.
- **FTS5 Tam Metin Yoğunluğu:** `25` yerel tam metin
- **Çapa Tam Metinler:** `METIN-0039` (`10.1016/j.foodchem.2016.09.004`), `METIN-1361` (`10.3390/foods7070096`).

---

### Kısım VIII — Tarihsel Tipoloji ve Ekmeği Okuma Sanatı (`08_tarih_ve_tipler` & `09_ekmegi_okumak`)

#### `KONU-25` — Gözenek Haritası ve Buhar Cebi: X-Işını Tomografisiyle Somun ve Pide Kusurlarını Okumak
- **Durum:** 📋 Planlandı
- **Kitap Bölümü:** *Somunun Otopsisi: Bereketli Hilal Yassı Ekmeklerinden Modern Somuna Gözenek Mimarisi ve Kusur Teşhisi*
- **YouTube Bölümü:** *Ekmeğin İçini Okuma Rehberi: Basık Somun, Tavanda Mağara, Kabuk Pullanması ve Pidenin Buhar Cebi*
- **Çekirdek Mekanizma:** Yüksek sıcaklıklı (`>350 °C`) yassı ekmeklerde/pidelerde hızlı kabuk bağlama ile tek dev buhar cebi oluşumu (`08_tarih_ve_tipler`) ile somun ekmekte X-ışını mikro-BT'nin ortaya koyduğu `%99` birbiriyle bağlantılı gözenek labirenti (`09_ekmegi_okumak`); "tavanda dev boşluk (*flying crust* = eksik asitlik / aşırı amilaz / az olgunlaşma)" ve "tabanda sıkı lastiksi bant (*gummy layer*)" teşhis matrisi.
- **FTS5 Tam Metin Yoğunluğu:** `90` gözenek tomografisi + `175` geleneksel/yassı ekmek tam metni
- **Çapa Tam Metinler:** `BOLUM-1017` (`10.1016/j.jcs.2011.05.004`, *It's a maze: The pore structure of bread crumbs*), `BOLUM-0990` (`10.51745/najfnr.9.19.41-56`).

---

## 4. Önerilen Üretim Sırası (İlk 6 Paketlik Sprint)

1. **`KONU-01` (`BS05`/`BS06`)** — *Ekşi Mayanın İlk 10 Günü* → ✅ **Tamamlandı (Sayı #01 — Referans Şablon)**
2. **`KONU-05` (`KONU05_cavdar_arabinoksilan`)** — *Çavdar Ekmeği ve Çözünebilir Lif / Arabinoksilanlar* → ✅ **Tamamlandı (Sayı #02 — Kalıp Çavdar Amiral Ürünü)**
3. **`KONU-02` (`KONU02_maltoz_simbiyozu`)** — *F. sanfranciscensis & K. humilis Maltoz-Fruktoz Ortaklığı* → ✅ **Tamamlandı (Sayı #03)**
4. **`KONU-14` (`KONU14_glutenin_makropolimeri`)** — *Glutenin Makro-Polimeri, Yoğurma ve Disülfit Takası* → ✅ **Tamamlandı (Sayı #04)**
5. **`KONU-20`** — *Fırın Sıçraması ve Köpükten Süngere Geçiş* → 📋 Sıradaki 1. üretim paketi (`konu_cephaneligi.html` hazır)
6. **`KONU-22`** — *Amilopektin Retrogradasyonu ve Bayatlama Termodinamiği* → 📋 Sıradaki 2. üretim paketi (`konu_cephaneligi.html` hazır)
