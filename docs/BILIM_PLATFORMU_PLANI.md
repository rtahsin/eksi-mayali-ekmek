# EkmekLab Bilim Platformu: Plan

> **Durum:** Tahsin ile birlikte aşama aşama kuruluyor (20 Ekim 2026). Her aşamanın kararı burada kayıtlı. Belge onaylanmadan iş başlamaz.
> **Ham madde:** Kütüphane v1, yani 6.066 denetlenmiş bilgi, 79 düğüm ve 310 kaynak (`arastirma/EkmekLab_Kutuphane_v1.zip`).

## Planlama sırası

1. Amaç ve kimlik ✔
2. Bilgi mimarisi ✔
3. Deneyim ✔
4. Dil ✔
5. Site yapısı ✔
6. İçerik hattı ✔
7. İmkân eşleştirme ✔
8. Yol haritası ✔

## 1. Amaç ve kimlik: kararlar

- **Kime:** herkese. Meraklı tüketici, ev fırıncısı ve usta aynı yerden beslenir.
- **Kimlik:** *Ekmeği yaşatan deneyim.* Ekmeğin içindeki anları görsel ve etkileşimli olarak yaşatan yer. Okumaktan çok görmek ve anlamak; kaynaklar arkada, her an erişilebilir.
- **Birim:** *an.* Ekmeğin yolculuğu boyunca yaklaşık 25–30 an, örneğin "fırının ilk 8 dakikası". Anlar bilginin ağırlığına göre kurulur, eşit boyda olmak zorunda değil.
- **Katmanlar:** *tek an, üç derinlik.* Herkes aynı sayfayı okur:
  - **Gör:** kesit, animasyon, kaydırıcı; herkes için.
  - **Anla:** mekanizma ve eşikler; meraklı okur ve ev fırıncısı için.
  - **Kanıt:** koşullar, çalışmalar, çelişkiler ve çekmece; usta ve akademisyen için.
- **Görsel yön:** *Isı* (karanlık, sinematik, sıcaklık = renk). Prototip: `arastirma/araclar/yonler/`.
- **Tahsin'in rolü:** *arka mutfak ve vitrin.* Tahsin'in içerikleri (videolar vb.) platformdan bağımsızdır ama buradan beslenir. Ona özel bir **üretici masası** olur: konu seçer; ilgili bilgiler, çelişkiler, deney fikirleri ve kaynaklar önüne gelir. Halka açık yüz ayrıdır.
- **Site:** *iki oda, iki dil.* Aynı sitede sıcak ve sade dükkân ile karanlık ve sinematik bilim yan yana durur; aralarında köprüler var (QR, "bu ekmekte ne oluyor?"). Gerekirse site baştan tasarlanır.

## 2. Bilgi mimarisi: kararlar

- **Anların listesi ekmeğin yolculuğundan çıkar.** Sıra kronolojik: tarla → değirmen → hamur → ekşi maya → fermantasyon → şekil → fırın → soğuma → raf. Her durakta 2–4 an olur. Okur baştan sona gezebilir ya da istediği duraktan girebilir.
- **Anlar ve karakterler.** An olmayan bilgi (mikrop türleri, maya, enzimler, gluten, nişasta, moleküller) ekmeğin "oyuncu kadrosu" olur:
  - Her karakterin kendi kartı vardır: kimlik, ne yer ne üretir, hangi koşulda, göründüğü anlar.
  - Karakterler farklı anlarda sahneye çıkar.
  - Tarih ve yerler (en eski ekmek, Anadolu, ekşi mayanın tarihi) ayrı bir **zaman şeridi** olur.
- **Bağlar an an kurulur.** Her an yazılırken o anın kaldıraç → mekanizma → sonuç bağları da çıkarılır ve her bağ bilgi kimliklerine dayanır. Kaydırıcılar ve ileride teşhis aracı bu bağlardan beslenir; harita anlarla birlikte büyür. Mevcut 1.049 not içi atıf başlangıç malzemesidir.
- **Kanıt dili: kelime ve çalışma sayısı.** Tek renk, açık söz kullanılır: "tek çalışma", "3 çalışma · uzlaşıyor", "derlemeden", "çelişiyor". Renk körlüğünde de okunur ve Isı paletine uyar.

## 3. Deneyim: kararlar

- **Giriş bir yolculuk haritası.** Tarladan dilime uzanan karanlık bir şerit; duraklar ve anlar üzerinde parlar. Birine dokunan o ana iner.
- **Gör katmanı:** 8–10 bayrak an kendine özgü bir etkileşim alır (fırının ilk 8 dakikası, ekşi mayanın ilk 10 günü gibi). Kalan anlar güçlü bir ortak kalıpla gelir: kesit görseli, zaman çizgisi ve kaldıraç kaydırıcısı.
- **Efsaneler hem anın içinde hem ayrı bir kapıda.** Her anda bir "Yüzleşme" bölümü olur. Ayrıca bütün efsaneleri ve tartışmaları toplayan, paylaşılabilir bir "Efsane dosyası" kapısı açılır.
- **Dükkânla köprü QR'dır.** Her ekmeğin QR'ı, o ekmeğin geçtiği anlara bağlanır ("Bu ekmekte ne oluyor?").
- **İlk sürümde yok:** halka açık "Fırında dene" kutusu, belirti bölümü ve ayrı teşhis aracı. Teşhis, an an kurulan bağlar olgunlaşınca yeniden ele alınır.

## 4. Dil: kararlar

- **Görsel malzeme:**
  - **Gerçek görüntü ve üzerine bilimsel işaretleme** (20 Eki revizyonu; FLUX stil denemeleri "yapay, ciddi değil" diye reddedildi). Mikroskop görüntüleri açık lisanslı arşivlerden (Wikimedia Commons vb.) gelir ve kaynakları gösterilir; Tahsin'in mikroskobu yok. Gri tonlu görüntülere **gece mavisi + köz** renk haritası uygulanır ve bunun bilgi eklemediği sayfada yazılır. İşaretlemeler (halka, etiket, kaynak numarası) Isı dilinde koddan gelir. Örnek: https://claude.ai/artifact/RwaodxPGCYzQwi6rUZyQTW · `arastirma/araclar/ornek/`. Üretilmiş (yapay) görsel kullanılmaz.
  - Tahsin'in fırınından gerçek çekimler.
- **Anlatım sesi: belgesel anlatıcı.** Sakin, üçüncü kişi, keşfettiren bir dil: "Fırının kapağı kapandığında hamurun içinde dört şey aynı anda başlar…". Görsel dil Isı, söz dili belgesel olur.
- **Hareket ve ses:** kaydırdıkça oynayan sahneler, bayrak anlarda okurun oynattığı simülasyonlar ve her anın sesli anlatımı.
- **Sahneler: gerçek görüntü ve kod hareketi.** Gerçek görüntüdeki hücre ve kabarcık sınırları A100'de bir segmentasyon modeliyle (SAM 2) çıkarılır. Kod bu sınırları oynatır, ölçer ve sayıları üstüne koyar.
- **Sesli anlatım:** Tahsin'in sesinden A100'de eğitilmiş bir ses modeliyle yapılır; sayfada "yapay ses (Tahsin'in sesinden)" diye belirtilir. Bunun için yaklaşık bir saatlik temiz kayıt gerekir.
- **Deneyler:** deney fikirleri üretici masasında durur. Tahsin bir deneyi yapıp yayımladığında sonucu ilgili ana "EkmekLab ölçtü" notu olarak eklenir.

## 5. Site yapısı: kararlar

- **Önce bilim odası kurulur.** Bilim odası sıfırdan yapılır. Dükkân şimdilik olduğu gibi kalır; aradaki köprüler (QR, menü) eklenir. Dükkânın yenilenmesi ayrı bir sonraki adımdır.
- **Önce telefon.** Sahneler dikey kurulur ve tek elle kaydırılır; masaüstü, telefonun genişletilmiş sürümüdür.
- İki oda, iki dil: dükkân sıcak ve sade, bilim karanlık ve sinematik (1. aşamadaki karar).

## 6. İçerik hattı: kararlar

- **Üretici masası** Tahsin'in bilgisayarında çalışan yerel bir araçtır. Dört işi vardır:
  - **Konu panosu:** an ya da karakter seçilir; çekirdek bilgiler, çelişkiler, efsaneler, sayılar ve kaynaklar tek ekranda gelir.
  - **Senaryo iskeleti:** seçilen bilgilerden kanca, akış, kapanış ve kaynak listesi çıkar. Her cümle bir bilgiye bağlıdır; Tahsin kendi diliyle yeniden yazar.
  - **Kısa içerik kartları:** tek bir bilgiden Reel ya da carousel metni ve görsel önerisi.
  - **Deney defteri:** deney fikirleri, yapılan deneylerin kaydı ve sonucun "EkmekLab ölçtü" notu olarak ana eklenmesi.
- **Anların yazımı:** modeller taslak yazar, betik denetler (her cümle bir bilgiye bağlı mı, sayılar kütüphaneyle tutuyor mu, sağlık terimi var mı), Claude kurguyu ve dili düzeltir. Tahsin yalnız anlatıya ve tona bakar, bilgi onaylamaz.
- **Yayın:** bütün anlar hazır olunca tek seferde açılış. Açılışa kadar geri bildirimin nasıl alınacağı 8. aşamada konuşulacak.

## 7. İmkân eşleştirme: kararlar

| Kim | Rolü |
|---|---|
| **Claude** | Mimar, kapı bekçisi ve kodcu: an listesi, bağ şeması, an kalıbı, denetim betikleri, son kurgu ve dil; bilim odası ve üretici masası kodu. |
| **OpenCode Go** | Yapımcı: an metin taslakları (paket paket) ve bağ çıkarımı. |
| **Argon (Gemini)** | Eleştirmen: her taslağı bağımsız okur; veri tutarsızlıklarını ve eksik kaynakları tarar. |
| **Colab A100** | İşlem odası: gerçek görüntülerin segmentasyonu ve renk haritası; ses modeli ve anlatım seslendirmesi. |
| **Tahsin** | Yön ve ses: ton ve anlatıya bakış, yaklaşık bir saatlik ses kaydı, fırın çekimleri, deneyler. |

- Aynı işi yazan model ile denetleyen model hep farklıdır.
- **A100 yönetimi:** Google'ın resmi colab-mcp sunucusuyla. Claude, tarayıcıda açık olan Colab defterinde hücre yazar ve çalıştırır. Bağlantı 20 Ekim'de kuruldu (A100 40 GB). SSH kullanılmaz.
- **Görsel stil:** gece mavisi + köz renk haritası ve Isı işaretleme dili. Stil modeli eğitimi yapılmaz.
- **Ses kaydı:** Claude, ekmek terimleri ve Latince tür adları dahil yaklaşık bir saatlik bir okuma metni hazırlar; Tahsin parça parça okur.

## 8. Yol haritası: kararlar

- **İlk dilim tek bir anı uçtan uca kurar.** Metin, bağlar, gerçek görüntü, sahne, simülasyon ve ses o tek anda bir kez denenir; kalıp oturunca kalan anlara yayılır.
- **İlk an: ekşi mayanın ilk 10 günü.** En zengin an; karakter kalıbını da ilk elden sınar. Beslendiği düğümler: kaynak, entero, oncu, ardisiklik, lab, fsan, lplant, khum, mayalar, besin, rekabet, sahte_kabarma, tipler, besleme.
- **Geri bildirim açılışa kadar yalnız Tahsin ve Claude arasında.**
- **Tempo:** acele yok, kalite önce. Tarih konmaz; her an kalite kapısından geçmeden ilerlenmez ve ilerleme dilim dilim görünür.

## İş akışı

Her adımın sonunda Tahsin'e görebileceği bir çıktı gelir. ⏸ işaretli adımlar Tahsin'in kararını bekler.

**A0 · Hazırlık**
1. ✔ Veri düzeltmeleri: 23 bozuk kaynak Crossref'te doğrulanıp yeniden eşlenir; iki boş düğüm birleştirilir. Sonuç: Kütüphane v1.1. *Claude yapar, Argon kontrol eder.*
2. ✔ A100 bağlantısı colab-mcp ile kuruldu ve doğrulandı (20 Eki).

**A1 · İskelet**
3. ✔ (21 Eki onaylandı: 26 an, 20 karakter, 4 zaman öğesi; `arastirma/bilim_isler/teslim/A1-04.json`) 25–30 anın, karakterlerin ve zaman şeridinin listesi çıkarılır. *Claude taslak yazar, Argon eleştirir.* ⏸ Tahsin onaylar (site iskeleti onun kararıdır).
4. Kalıplar ve kurallar: an kalıbı (Gör, Anla, Kanıt, Yüzleşme), karakter kartı, bağ biçimi (kaldıraç → mekanizma → sonuç, bilgi kimlikleriyle) ve denetim betiğinin kuralları. *Claude.*

**A2 · İlk anın metni: ekşi mayanın ilk 10 günü**
5. Bilgi paketi betikle çıkarılır: ilgili düğümlerin bilgileri ve not içi atıflar.
6. *OpenCode Go* metin ve bağ taslağını yazar.
7. *Argon* bağımsız eleştiri yazar.
8. Betik kapısından geçer: her cümle bir bilgiye bağlı mı, sayılar tutuyor mu, sağlık terimi var mı, kanıt dili doğru mu.
9. *Claude* kurguyu ve dili belgesel anlatıcı sesine getirir.
10. ⏸ Tahsin tona ve anlatıya bakar.
11. Bu anda sahneye çıkan karakterlerin kartları aynı hattan geçer.

**A3 · Görsel dil** (A2 ile paralel yürür)
12. ✔ (22 Eki, bütün anlar ve kartlar için) Açık lisanslı kaynak avı yapılır (işçi paketleri A3-12/13/14). Lisans Commons ve Europe PMC kaydından yeniden doğrulanır, dosyalar yerele alınır (`arastirma/araclar/gorsel/yerel.py` → `public/bilim/gorsel/`).
13. ½ Renk haritası yerelde uygulandı, yalnız gri tonlu mikroskop görüntülerine (fotoğraf ve makale şekli olduğu gibi kalır). Hücre/kabarcık sınırlarının A100'de segmentasyonu sırada.
14. İşaretleme katmanları hazırlanır: halkalar, etiketler, kaynak numaraları. ⏸ Tahsin görsellere bakar.

**A4 · Sahne ve sayfa**
- ✔ (22 Eki) İçerik siteye hazır: `content/bilim/` (yolculuk, 26 an, 20 kart, atıf yapılan bilgiler, sözlük, kaynaklar, görsel kaydı; `arastirma/bilim_isler/siteye_aktar.py` üretir), okuyucu ve şema `src/lib/bilim/`, bütünlük testi `src/app/__checks__/bilim.check.test.ts`.
15. Bilim odası iskeleti Next.js içinde, telefon önce kurulur; yanında yolculuk haritasının ilk hâli. *Claude.* ⏸ Tasarım yönü (T-01, Argon'un üç önerisinden Tahsin seçer).
16. Kaydırmalı sahne ve simülasyon: on günde topluluğun değişimi ve pH'ın düşüşü, okurun oynattığı gün kaydırıcısı. *Claude.*
17. Kanıt katmanı, çekmece, Yüzleşme bölümü ve karakter kartları. *Claude.*
18. Telefon ve masaüstü testi.

**A5 · Ses** (A2–A4 ile paralel yürür)
19. Claude okuma metnini hazırlar; Tahsin yaklaşık bir saat kaydeder.
20. A100'de ses modeli eğitilir ve anın anlatımı seslendirilir ("yapay ses" etiketiyle).

**A6 · Değerlendirme**
21. ⏸ İkimiz birlikte bakarız. Kalıp düzeltilir ve kalan anlara yayma planı çıkarılır (paket boyutu, sıra, bayrak anlar).

**Sonra:** kalan anlar ve karakterler, efsane dosyası, QR köprüsü, üretici masası (yerel araç, kalıp oturduktan sonra) ve açılış.

### Bir an ne zaman "hazır" sayılır

- Betik kapısı temiz geçmiştir.
- Argon'un itirazı kalmamıştır ya da itirazlar kayıtla çözülmüştür.
- Sahnedeki ve simülasyondaki her sayı kütüphanedeki kayıtla aynıdır.
- Telefonda akıcı çalışır, erişilebilirdir ve hareket azaltma ayarına uyar.
- Tahsin "ton tamam" demiştir.

## Tasarım: monografi levhası (22 Eki)

Argon'un T-01 üç yönünden (`arastirma/bilim_isler/tasarim/`) **Yön 3** temel alındı; Tahsin seçimi Claude'a bıraktı. Yön 1'den karakter kartlarının "tip örnek föyü" biçimi, Yön 2'den numaralı levha dizini alındı.
- **Renk:** beyaz levha `#FFFFFF`, porselen kenar `#ECEFF1`, grafit mürekkep `#101418`, ikincil `#4A5560`, çizgi `#C9D1D6`, tek vurgu kobalt `#0047AB` (kanıt etiketi, işaretleme, bağlantı). Koyu zemin ve krem zemin yok.
- **Yazı:** Crimson Pro (başlık, tür adları), Plus Jakarta Sans (gövde), Azeret Mono yalnız şekil numarası, DOI ve kaynak satırında. Büyük harfli sıkışık başlık yok.
- **Düzen:** sola yaslı asimetrik ızgara, ince çizgiler; yuvarlak köşe ve gölge yok. An görüntüyle açılır; Gör katmanında görüntü sabit kalır, metin kayar (telefonda üstte, masaüstünde solda). Şekil numarası `Şek. <levha>.<adım>`.
- **Kanıt:** cümle sonunda küçük kobalt kelime ("tek çalışma"); dokununca kaynak kartı (telefonda alttan, masaüstünde yandan).
- Bilim odası yayına kadar arama motorlarına kapalıdır (`noindex`).

## Değişmez ilkeler

- Kütüphanede olmayan hiçbir sayı ya da iddia yayına çıkmaz; bu bir betikle denetlenir.
- Kanıt düzeyi her zaman görünür. Tek çalışmaya "kesin" ya da karşıtına "yalan" denmez.
- Sağlık beyanı yoktur (MARKA §3, AGENTS §7). Fruktan, fitaz ve akrilamid gibi hassas kayıtlar ürün sayfasına çıkmaz.
- Kaynakların ayrıldığı yerde hakem Tahsin'in fırınıdır: 17 tartışmalı kayıt aynı zamanda bir deney listesidir.

## Bilinen veri işleri (yayından önce)

- 23 bilgi bozuk kaynak anahtarına bağlı (`request username`; Güney İtalya, katı ve sıvı Tip I ekşi maya çalışması). Gerçek DOI bulunup yeniden eşlenecek.
- `ekmege_etkisi` ve `ekmek_dokusu` düğümleri tek kayıtlı; birleştirilecek.
- Bilgiler arası bağlar yarım: 1.049 kaydın notunda başka bir bilgiye atıf var. Anlar ve teşhis için bağ katmanı gerekiyor (2. aşamada karar verilecek).
