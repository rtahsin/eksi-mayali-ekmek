# EkmekLab Simülatörü — Oyun Fikri (taslak v1, 5 Ekim 2026)

> Tahsin'in fikri: atölyeye giriyorsun, ekmek yapılıyor, "ben de yapmak istiyorum" diyorsun ve seni simülasyona alıyorlar. Her kararın ekmeğin şeklini değiştiriyor; müşteri işin ne kadar ince ve zor olduğunu hissediyor. Eğlenceli, paylaşılabilir, viral olabilir.

## 1. Tek cümle

**"24 saatlik ekşi mayalı ekmeği 3 dakikada sen yap; sonucu gör, paylaş, beğenmezsen gerçeğini ustadan al."**

Çalışma adı: **"Usta Olabilir misin?"** (alternatif: "24 Saat", "Ekmek Laboratuvarı")

## 2. Senaryo

1. **Kapı:** Gravür tarzı çizilmiş atölye kapısı aralanır. İçeride fırın yanıyor.
2. **Tahsin karşılar** (kısa metin baloncukları, arkadaş tonu): "Selam, ben Tahsin. 2018'de bir gece evde ekmek yoktu, sobada kendim yaptım; o gün bugündür yapıyorum. Bir de sen denemek ister misin?"
3. **Simülasyon:** 6 aşama, her biri 20–40 saniyelik bir mini oyun. Her aşamada Tahsin'den kısa bir ipucu gelir; yanlış yaparsan da esprili bir yorum.
4. **Sonuç:** Ekmeğin fırından çıkar. Bütün hâli ve kesiti çizilir; puan ve unvan verilir.
5. **Paylaş:** Sonuç kartı (ekmeğin resmi + unvan + "ekmeklab.tr'de sen de dene") tek dokunuşla Instagram / WhatsApp.
6. **Köprü:** "Gerçeği 24 saat sürüyor. İstersen bu sefer usta yapsın." → sipariş. İkinci kez denemek bedava, sınırsız.

## 3. Aşamalar ve etkileri

| # | Aşama | Mini oyun | Ekmeğe etkisi |
|---|---|---|---|
| 1 | **Maya** | Kavanozdaki maya kabarıp iner; tam tepe noktasında dokun. | Mayanın gücü: erken = zayıf kabarma, geç = ekşi ve sönük |
| 2 | **Un + su** | Un karışımı (beyaz / tam buğday / siyez / çavdar) ve su oranı kaydırıcısı. | Yüksek su = açık iç yapı ama hamur zorlaşır; çavdar = yoğun, aromalı |
| 3 | **Katlama** | Ritimle kaydır (gerdir ve katla); gluten göstergesi dolar. | Gluten gücü = hamurun kabarmayı tutması |
| 4 | **Mayalanma** | Oda sıcaklığı düğmesi + zamanı hızlı akıt; hamur kabarır, kabarcıklar çıkar; "yeter" de. | Az = sıkı ve ağır; fazla = çöker, yayılır |
| 5 | **Şekil + bıçak** | Parmakla hamurun üstüne çizgi çiz; açı ve derinlik ölçülür. | Kulak (ekmeğin kalkan kabuk dudağı) ve fırındaki açılma |
| 6 | **Fırın** | Sıcaklık, buhar açık/kapalı, süre; kabuğun rengini izle ve çıkar. | Kabuk rengi, çıtırlık, fırında kabarma |

## 4. Sonuç ekranı

- **Ekmeğin resmi**, kararlarından hesaplanarak çizilir: yükseklik / yayvanlık, kulak, kabuk rengi (soluk → altın → yanık), **kesit** (deliklerin büyüklüğü ve dağılımı).
- **Puanlar:** kabarma, iç yapı, kabuk, aroma (ekşilik).
- **Unvanlar** (esprili): "Tuğla", "Pide oldu", "Fena değil komşu", "Kulaklı", "Usta işi".
- **Tahsin'in yorumu:** "Mayalanmayı biraz erken kesmişsin; bir dahakine kabarcıkları bekle." (öğretici, ukala değil)
- **Kıyas:** yanına Tahsin'in gerçek ekmeğinin fotoğrafı.

## 5. Neden işe yarar

- **Viral:** sonuç kartı paylaşılır, arkadaşlar birbirine meydan okur ("benimki kulaklı çıktı").
- **Eğitir ama ders vermez:** müşteri 24 saatin, maya ve sıcaklığın önemini oynayarak öğrenir; "neden 150 ₺" sorusunun cevabını kendisi bulur.
- **Satışa bağlanır:** her oyun "gerçeğini ustadan al" ile biter.
- **İçerik üretir:** YouTube'da "takipçilerin simülatörde yaptığı ekmekleri gerçekte yapıyorum" gibi videolara dönüşür.

## 6. Teknik yaklaşım

- **Web'de, telefonda akıcı:** ağır 3D yerine **2D/2.5D çizim**. Ekmek, logodaki gravür tarzında **koddan üretilen SVG** ile çizilir; her parametre şekli değiştirir. Hızlı yüklenir, her telefonda çalışır.
- **Simülasyon modeli:** saf bir fonksiyon (`simulateBread(kararlar) → sonuç`), birim testli. Gerçek fiziğin basitleştirilmiş hâli: mayalanma = maya gücü × süre × sıcaklık; optimum pencere; fırın kabarması = mayalanma + gluten + buhar + bıçak…
- **Gerçekçilik:** "usta ayarları" Tahsin'in gerçek reçete aralıklarından gelir (su oranı, mayalanma saati ve sıcaklığı, fırın sıcaklığı ve süresi).
- **Paylaşım kartı:** tarayıcıda PNG üretilir, Web Share API ile paylaşılır.
- **İleride:** skor tablosu, haftalık meydan okuma ("bu hafta çavdar"), 3D sürüm.

## 7. Aşamalı yapım

1. **Oynanabilir prototip:** 6 aşamanın hepsi basit görsellerle + sonuç çizimi. Amaç: eğlenceli mi, anlaşılıyor mu? Tahsin telefonda oynar, geri bildirim verir.
2. **Cilalı sürüm:** gravür tarzı çizimler, animasyonlar, sesler (çıtırtı!), paylaşım kartı, Tahsin'in metinleri.
3. **Yayın:** ana sayfada "Ekmeğini kendin yap →", Instagram ve YouTube duyurusu.

## 8. Tahsin'den gerekenler ❓

- Gerçek aralıklar: köy ekmeği için su oranı (%), maya oranı, ilk mayalanma (saat / sıcaklık), soğukta bekleme (saat / derece), fırın sıcaklığı ve süresi, buhar kullanımı.
- Esprili hata yorumları için kendi ağzından birkaç cümle ("ilk ekmeğim de böyle çıkmıştı" gibi).
- İsim tercihi (§1).

---

## 9. Usta reçetesi — Köy Ekmeği (Tahsin'in anlatımı, 5 Ekim 2026)

> Oyunun "usta ayarı" ve ipuçları buradan gelir. Örnek parti: **8 ekmek, 4 kg un, 3 kg su.**

| # | Aşama | Usta ne yapıyor | Hazır olduğunu nasıl anlıyor | Yanlış giderse |
|---|---|---|---|---|
| 1 | **Maya besleme** | 12 saatte bir **1:1:1** (eski maya : un : su). 8 ekmek için: 200 g eski maya + 400 g un + 400 g su = 1 kg; **800 g kullanılır, 200 g** akşam beslemesine kalır. Temiz su, katkısız taş değirmen unu. | Beslemeden **4–5 saat sonra** tepe noktası: kubbeli, kabarcıklı, gözenekli, "fokurduyor". | **8 saat** bekleyen maya daha asidik → ekmek **ekşi** kokar/tadar (tercih meselesi, hata değil). Erken kullanılan maya zayıf kalır. |
| 2 | **Maya miktarı** | Unun **%15–20'si** (4 kg una 600–800 g). | Mayalanma yönetilebilir hızda. | Fazla → çok hızlı mayalanır, **yönetilemez**. Az → **yetmez**, kabarmaz. |
| 3 | **Otoliz** | Maya beklerken 3. saatte un + **soğuk su (~4 °C, dolapta)** sadece karıştırılır, yoğrulmaz; **1 saat**. Köy ekmeği **%75–80 hidrasyon** (4 kg / 3 kg = %75). | — | Su kaldırma **una göre** değişir: bazı unlar %70, bazıları %65'e kadar. Unun kaldıracağından fazla su → hamur yayılır. |
| 4 | **Yoğurma + tuz** | Otolize maya eklenir, yoğrulur (elle ya da makine). **Tuz sonda, %2** (4 kg una 80 g); kaya tuzu lezzeti artırır. | **Gluten penceresi** görülür. Hamur sıcaklığı **27–28 °C** (en fazla). | — |
| 5 | **Katlamalı mayalanma** | Hamur kasasında **30 dakikada bir gerdir-katla**, **2–3 saat**. | Hamur yaklaşık **iki katına** çıkar (~3 saat). | Hızla yayılıyorsa **hemen katla**, gerginleştir. Yayılmıyorsa katlamanın anlamı yok, **bekle**. Süre hidrasyona ve kıvama göre değişir. |
| 6 | **Porsiyon + ön şekil** | Tartılır, porsiyonlanır; spatula/elle **gergin, oval** ön şekil. Üstü **açık**, tezgâhta **~30 dk** dinlenir. | Biraz yayılır, üstü hafif kurur, **ele yapışmaz**. | — |
| 7 | **Son şekil + dolap** | Gergin son şekil, **bannetona ters** (dikiş yukarı) konur, dolaba girer. | — | Şekil anında **tam kabardıysa → 4 °C**, ertesi güne kadar (çok az daha kabarır). **Erken** şekil verildiyse → önce **12–13 °C**'de ideal kabarmaya kadar, sonra **4 °C**. |
| 8 | **Fırın** | Üst/alt **280 °C** ön ısıtma → **220 °C**'ye düşür; ~5 dk sonra hamurlar dolaptan, **kesik atılır**, fırına. **20 dk buharlı + 20 dk buharsız** (buhar tahliye). Gerekirse +5–10 dk. | Renk ve pişme. | — |
| 9 | **Soğuma** | Tel rafta. | Köy ekmeği 30–60 dk sonra kesilebilir, **ideali ~3 saat**. %50 siyez gibi yoğun ekmekler **~1 gün**, çavdar (imza) **2 gün**. | Erken kesilen ekmeğin içi **hamurumsu** olur. |

### Oyun kuralına çeviri

- **Maya saati** (0–12 sa): 4–5 sa = dengeli "umami"; 6–8 sa = daha ekşi (lezzet farkı, ceza yok); <3 sa = zayıf; >9 sa = fazla asidik ve zayıf.
- **Maya oranı** (%5–30): %15–20 ideal; fazlası mayalanmayı hızlandırır (kabarma penceresi daralır), azı yavaşlatır.
- **Hidrasyon** (%60–90): unun kaldırabileceği sınır (köy karışımı ≈ %78) aşılırsa hamur gevşer → daha çok katlama gerekir, ekmek yayvanlaşır.
- **Su sıcaklığı + yoğurma** → hamur sıcaklığı: soğuk su + iyi yoğurma ≈ 27–28 °C; ılık su → hamur çok ısınır, mayalanma kaçar.
- **Tuz** (%0–4): %2 ideal; tuzsuz = yavan ve hızlı, fazla = tuzlu ve yavaş.
- **Katlama:** yayılan hamuru katlamak gluteni güçlendirir; yayılmayanı katlamak boşa.
- **Dolap kararı:** şekil anındaki kabarmaya göre 4 °C ya da 12 °C → 4 °C.
- **Fırın:** buharlı süre fırında kabarmayı ve kulağı, buharsız süre kabuğu belirler.
- **Kesme zamanı:** erken kesmek iç yapıyı hamurumsu yapar.
