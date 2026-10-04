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
