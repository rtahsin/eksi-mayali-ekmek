# Usta olabilir misin? — Sürüm 3 tasarımı ("Görünmeyen fırıncılar")

> Durum: tasarım + uygulama (5 Ekim 2026 gecesi). v2 (docs/OYUN.md §10) bu belgeyle yerini v3'e bırakır.
> Bilimsel dayanak: docs/BILIM.md (kaynaklı, doğrulanmış iddialar). Oyundaki her bilgi oradan gelir.

## 1. Fikir

Ekmeği usta yapmaz; milyarlarca canlı ve molekül makinesi yapar. Usta bir **orkestra şefidir**: sıcaklık,
zaman, su, un ve tuzla görünmeyen işçilerin doğru işi doğru anda yapmasını sağlar.

Oyunun kalbi **Lab Büyüteci**: oyuncu her an hamurun içine bakabilir. Elinin yaptığı (döktüğü su, yoğurma,
katlama, dolap, fırın) mikro dünyada anında görünür: maya hücreleri tomurcuklanır, laktik asit bakterileri
asit üretir ve pH düşer, amilaz makasları nişastayı maltoza keser, gluten zincirleri yoğurdukça ağ kurar,
CO₂ suda çözünür sonra karıştırırken giren hava çekirdeklerini şişirir, fırında 55 °C'de maya ölür,
nişasta taneleri jelleşir, ağ donar.

Öğretmenin üç kuralı:
1. **Önce göster, sonra anlat.** Her kavram önce görüntü/olay olarak gelir; açıklama isteyene.
2. **Tahmin et → gör → anla.** Kilit anlarda oyuncu önce tahmin eder (2–3 şık), sonra olanı görür, sonra tek
   cümlelik açıklama. Doğru tahminler "Sezgi" puanı verir.
3. **Katmanlı bilgi.** Usta sözü (1 satır) → "Neden?" (mekanizma, sade) → "Bilim" (sayılar + kaynak).
   Kimse duvar gibi yazıya mecbur bırakılmaz; meraklı olan derine iner.

Hata öğretir: kötü sonuç bir ceza değil, bir **otopsi**dir: sonuç ekranı mikro dünyada neyin ters gittiğini
gösterir (ör. "proteaz ağı yedi", "maya 55 °C'yi görmeden kabuk dondu").

Usta sözü ↔ bilim: Tahsin'in pratikleri doğrulanır ya da inceltilir. Oyun "Ustalar böyle der; bilim ne der?"
formatını kullanır; Tahsin'in ağzına kendisinin onaylamadığı bir söz konmaz.

Sağlık iddiası yok (MARKA.md §3). Biyokimyasal olaylar kaynağıyla "ne olur" diye anlatılır; "sağlıklı",
"sindirimi kolay" denmez. Çölyak efsanesi açıkça düzeltilir.

## 2. Yapı

```
Kapı (prolog) → Atölye (bölüm seçimi)
  Bölüm 1  Maya: görünmeyenleri yakala        (yeni; kendi mayanı yap, adını koy)
  Bölüm 2  Köy ekmeği: 24 saatlik yolculuk    (v2 aşamaları + büyüteç + tahminler + fırın olay haritası)
  Bölüm 3  %50 Siyez: 10.000 yıllık buğday   (zayıf gluten; bilinen aşamalar "hızlı mod")
  Bölüm 4  Gece Yarısı: çavdarın sırrı        (gluten yok, amilaz tehlikesi, asit şart, 2 gün dinlenme)
  Deney tezgâhı                               (Bölüm 2 sonrası; serbest deney + görevler)
  Defter                                      (canlılar, moleküller, olaylar, efsaneler, tarih kartları)
```

Bölüm 1 önerilir ama zorunlu değildir: atlayan "Tahsin'in mayası" ile Bölüm 2'ye geçer. Bölüm 1'i yapanın
mayası (adı ve karnesi) sonraki bölümlerde kullanılır; iyi bakılmış maya daha canlıdır.

### Prolog
Kapı aralanır → Tahsin: "Sana bir sır vereyim: bu ekmekleri ben yapmıyorum." → **dalış**: ekmek kesitinden
gözenek duvarına, oradan nişasta ve glutene, oradan maya ve bakterilere (ölçek çubuğu 1 cm → 10 µm).
→ "Ekmeği onlar yapar. Usta, onlara iyi bakan kişidir." → büyüteç oyuncuya verilir.

### Bölüm 1 — Maya
A. **Nereden gelirler?** Resimli doğa sahnesi: buğday tarlası, çiçek, bal arısı, eşek arısı yuvası, toprak,
değirmen/un çuvalı, ustanın eli. Dokunulan her nokta mikro bir pencere açar ve kart verir. Önce tahmin:
"Ekşi mayadaki canlılar en çok nereden gelir? Hava / Un / Su" (cevap: un; hava efsanedir).
B. **Kavanoz.** Un seç (beyaz / tam buğday / tam çavdar: ne getirdikleri), suyu dök, karıştır, lastiği tak,
yer seç (serin 18 °C / tezgâh 24 °C / ılık 28 °C).
C. **Bir hafta.** Her gün kavanozun 24 saati birkaç saniyede akar (kabarma, kabarcık, koku). Büyüteçle o günün
toplulukları görülür. Ertesi gün için karar: besle (1:1:1 / 1:2:2 / 1:5:5) ya da bekle; yeri değiştir.
   - 1–2. gün: büyük **sahte kabarma** (enterobakteriler; peynirimsi koku). Tahmin: "Maya hazır mı?" (Hayır.)
   - 3–4. gün: **sessizlik**. Asit yükselir, pH düşer, öncüler çekilir, yeni başlayanlar burada mayayı atar.
     Tahmin: "Öldü mü?" (Hayır, sabret.)
   - 5–7. gün: mayalar yerleşir, beslemeden sonra düzenli kabarma; F. sanfranciscensis ↔ K. humilis
     maltoz ortaklığı.
   - Aç bırakılırsa hooch; çok uzun ihmal edilirse küf ve "at" uyarısı.
D. **İsim + karne.** Mayana isim ver; hazır olma günü, kabarma süresi, laktik/asetik, bakteri:maya oranı.

### Bölüm 2 — Köy ekmeği (aşamalar)
1. Tazeleme ve tepe noktası (mayanın 1:1:1 beslemesi, kullanım saati) — tahmin: tepe geçerse ne olur?
2. Su ve otoliz (DDT bulmacası, döküm, otoliz süresi) — büyüteç: su unla buluşur, gluten kendiliğinden bağ kurar, amilaz başlar.
3. Yoğurma ve tuz (ritim, pencere testi, tuz zamanı) — büyüteç: ağ yoğurdukça kurulur; tuz ağı sıkılaştırır.
4. Katlamalı mayalanma (katlama hareketi, alikot kavanoz) — büyüteç: CO₂ önce suda çözünür, sonra hava çekirdeklerini şişirir; mayalar kabarcık yaratamaz.
5. Şekil, parmak testi, dolap — hamurun dolapta saatlerce soğuduğu eğri; soğukta canlıların yavaşlaması.
6. Kesik.
7. Fırın — iç sıcaklık sondası olay haritasını sürer: son maya patlaması → ~55 °C maya ölür → nişasta jelleşir → ağ donar → amilaz durur → 96–98 °C pişti; kabukta buhar/Maillard.
8. Sabır — kabuğun şarkısı, nişastanın oturması, kesme zamanı.
Sonuç: kesit, puanlar, **ekmeğin biyografisi** (24 saatlik sıcaklık, pH, maya/bakteri, hacim grafiği),
"Sen ve usta", otopsi (ne ters gitti, büyüteçte), paylaşım kartı.

### Bölüm 3 — Siyez
Karacadağ girişi (diploid siyez vs heksaploid ekmeklik buğday). Aynı akış; daha az su, zayıf ağ, daha nazik
katlama, hızlı mayalanma, sarı iç (karotenoid). Ustalaşılan aşamalar "hızlı mod" ile kaydırıcıyla geçilebilir.

### Bölüm 4 — Gece Yarısı (çavdar)
Gluten ağı kurulamaz; yapıyı pentozan jeli ve nişasta taşır. Çavdarda amilaz güçlüdür ve nişasta düşük
sıcaklıkta jelleşir: fırında amilaz jelleşmiş nişastayı keserse iç yapışkan olur ("nişasta saldırısı").
Bunu ekşi mayanın asidi önler: çavdar bu yüzden tarih boyunca ekşi mayayla yapılmıştır.
Akış: ekşi hamur (unun büyük kısmı) → karıştırma (pencere testi yok) → kısa mayalanma (yüzey çatlakları) →
kalıp + mavi haşhaş → uzun fırın → 24–48 saat dinlenme. Usta ayarı literatürden; Tahsin'in reçetesiyle ince ayar.

### Deney tezgâhı
Kaydırıcılar (su sıcaklığı, maya %, hidrasyon, tuz, otoliz, mayalanma süresi, dolap, un); çalıştır → hızlı
zaman akışı, biyografi grafiği, ekmek, büyüteç kaydırıcısı. Görevler: "en ekşi ekmek", "bilerek pide yap",
"tuzsuz hamur", "30 °C'de bakterileri kazandır", "en yüksek kulak"…

### Defter
Kart türleri: Canlılar, Moleküller ve enzimler, Olaylar, Efsaneler, Tarih. Kilitli kartlar silüet.
Kart: çizim, kimlik (canlılar için şekil, boy µm, sevdiği sıcaklık, pH dayanımı, ne yer, ne üretir, doğada
nerede), üç katman metin, kaynak bağlantıları. Kartlar büyüteçte canlıya dokunarak, tahminlerle,
bölümlerle ve görevlerle açılır.

## 3. Mikro dünya (büyüteç) görsel dili
- Pirinç halkalı dairesel mercek, ölçek çubuğu ve büyütme etiketi, hafif vinyet; gravür/mürekkep çizgisi.
- Renkler (krem paletle uyumlu): maya bal sarısı `#D9A441`, laktik bakteri terakota `#B4532A`, öncü/enterobakteri
  zeytin `#7A8450`, enzim mürdüm `#7B4B6A`, nişasta krem `#FBF6EC` + mürekkep halkalar, gluten kahve `#8A5A3C`,
  kabarcık beyaz + mürekkep kontur, asit (H⁺) küçük terakota noktalar.
- Canlılar sim'den gelen yoğunluğa doğru yumuşakça çoğalır (maya tomurcuk, bakteri ikiye bölünme) ya da
  ölür (soluklaşır; fırında "pat"). Enzim makasları nişasta zincirini keser → maltoz → canlılar yer → CO₂.
- Dokununca canlı vurgulanır, kartı açılır (yeniyse toplanır).
- Canvas 2D, devicePixelRatio, önceden çizilmiş sprite'lar; kare süresi kötüleşirse varlık sayısı azalır;
  `prefers-reduced-motion` desteklenir.

## 4. Simülasyon motoru (src/lib/game/engine)
Zaman adımlı (5 dk) model, saf ve deterministik:
- Canlı loncaları: `ent` (enterobakteri ve benzeri öncüler, aside duyarlı), `lacP` (öncü LAB: Leuconostoc,
  Weissella…), `lacS` (ekşi maya uzmanı LAB: F. sanfranciscensis, L. plantarum…), `yst` (maya: K. humilis,
  S. cerevisiae). Nüfus log10 KOB/g. Büyüme: kardinal sıcaklık modeli (CTMI) × pH × ayrışmamış asit × şeker.
- Şeker: başlangıç şekeri + amilazın hasarlı nişastadan ürettiği maltoz (sıcaklık, pH).
- Asit: laktik + asetik (heterofermentatif pay, sıcaklık ve hidrasyonla değişir) → tampon modeliyle pH.
- Gaz: CO₂ önce çözünür (doygunluk), sonra serbest gaz → hacim; tutma = gluten ağı gücü.
- Gluten: gelişim (otoliz, yoğurma enerjisi, katlama) − hasar (düşük pH'ta proteaz × sıcaklık × süre).
- Dolap: hamur sıcaklığı 4 °C'ye üstel yaklaşır (saatler sürer).
- Fırın: iç ve yüzey sıcaklık eğrileri; eşikler olay üretir; fırın kabarması = gaz genleşmesi + çözünmüş CO₂ +
  buhar/etanol, kabuk donana dek (buhar geciktirir), ağ gücüyle sınırlı.
- Çavdar: ağ yerine pentozan; fırında jelleşmiş nişasta × amilaz × (pH) = nişasta saldırısı.
- Çıktı: `BakeResult` (puanlar, unvan, ipuçları) + `MicroSnapshot[]` zaman çizelgesi + olaylar.
Kalibrasyon testleri: usta ayarı ≥ 90; ılık su + uzun mayalanma → pide; erken maya → zayıf; 12 °C dolap
kurtarır; çavdarda az asit → yapışkan iç; maya bölümünde ardışıklık (ent 1–2. gün tepe, pH < 4,5'te çekilir,
mayalar 5–7. gün).

## 5. Dosyalar
- `src/types/game.ts` — tüm tipler (v3 sözleşmesi).
- `src/lib/game/engine/` — `params.ts` (kaynaklı sabitler), `kinetics.ts`, `starter.ts`, `bake.ts`, `snapshot.ts`.
- `src/lib/game/content/` — `cards.ts` (defter), `predictions.ts` (tahminler), `chapters.ts`.
- `src/components/game/micro/` — `MicroScope.tsx` (canvas), `sprites.ts`, `world.ts` (varlık sistemi), `Dive.tsx` (prolog dalışı).
- `src/components/game/chapters/` — `StarterChapter.tsx` (Bölüm 1), `RyeChapter.tsx` (Bölüm 4).
- `src/components/game/codex/` — `Codex.tsx`, `CardArt.tsx`.
- `src/components/game/sandbox/` — `Sandbox.tsx`, `BiographyChart.tsx`.
- `src/components/game/LabGame.tsx` — kabuk (kapı, atölye, bölümler, defter, ses).
