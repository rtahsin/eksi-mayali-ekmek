# T29. Tarih ve arkeoloji

> 4 kaynak · 5 bulgu · makine okunur hâli: `../veri/sentez/T29.json` · ham bulgular: `../veri/kanit_bulgulari.csv` içinde bu temanın kaynak kimlikleri.
> Durum: **ham kanıt sentezi, doğrulanmamış.** Siteye/oyun kartına girmeden önce `content/claims` sürecinden (ADR-0003) geçmeli.

## Uzlaşı

| Güç | Bulgu | Kaynaklar |
|---|---|---|
| B | Hamurda gaz oluşumu ve gazın hamur içinde genişlemesi, kabarma ve daha hafif/gözenekli bir iç yapı oluşumuna katkı sağlar. | [Grant 1889](https://pmc.ncbi.nlm.nih.gov/articles/PMC9238825), [Mohamed 2020](https://mb.journals.ekb.eg/article_99522.html) |

## Etkiyi değiştiren koşullar

- Natufien dönemi avcı-toplayıcıları ve kuzeydoğu Ürdün bağlamında yabani tahıl ile kök besinlerinin birlikte kullanımı bildirilmiştir.
- Eski Mısır ekmek yapımında maya kullanımı bildirilmiştir; maya dozu ve diğer işlem koşulları belirtilmemiştir.
- Fırın ısısının gazı genişletmesi pişirme sırasında gerçekleşir; sıcaklık ve süre düzeyi belirtilmemiştir.
- Tahıl öğütme bulgusu Eski Mısır evlerinde emmer veya arpa öğütülerek un elde edilmesi bağlamındadır; öğütme düzeyi ve araç koşulları verilmemiştir.

## Simülasyon kuralları (öneri)

| Kural | Fonksiyon biçimi | Parametre önerisi | Kaynak |
|---|---|---|---|
| Yabani tahıl ile kök besinlerinin birlikte kullanıldığı belirtilen Natufien bağlamında düz, ekmek benzeri ürün hazırlanmasını mümkün kıl. | Koşula bağlı kategorik kural; nicel doz-tepki fonksiyonu çıkarılamaz. | Yalnızca dönem ve bölge koşullarını kategorik girdiler olarak kullan; oran veya başarı olasılığı atamak için kanıt yok. | [Arranz-Otaegui 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6077754/) |
| Tahılın öğütülmesi, tahıldan un elde edilmesini artırır. | Niteliksel artış; öğütme düzeyine bağlı fonksiyonun şekli belirlenemez. | Öğütmeyi un elde etmenin işlem girdisi olarak kodla; öğütme inceliği veya verimi için sayısal parametre kullanma. | [Lang 2016](http://journals.ed.ac.uk/lithicstudies/article/download/1462/1995) |
| Maya kullanımını karbondioksit üretimi ve ekmeğin kabarmasıyla ilişkilendir. | Niteliksel nedensel zincir: maya kullanımı → CO₂ üretimi → kabarma. | Maya dozu, fermantasyon süresi ve kabarma katsayısı belirtilmediğinden parametre değeri önerilemez. | [Mohamed 2020](https://mb.journals.ekb.eg/article_99522.html) |
| Hamurda tutulan gazın genişlemesi iç yapıyı hafif ve gözenekli hâle getirir; fırın ısısı gazın genişlemesini artırarak kabarmayı sürdürür. | Gaz tutulması ve ısıtmayla genişleme üzerinden niteliksel artış; sıcaklık veya süreye bağlı fonksiyonun biçimi belirlenemez. | Gaz tutulumunu ve fırınlamayı ayrı süreç girdileri olarak kodla; sıcaklık, süre veya etki katsayısı için sayısal değer kullanma. | [Grant 1889](https://pmc.ncbi.nlm.nih.gov/articles/PMC9238825) |

## Kanıt boşlukları

- Birden fazla kaynağın desteklediği yalnızca gaz oluşumu/genişlemesi ile kabarma arasındaki genel ilişki bulunuyor; diğer bulgular tek kaynaklı olduğundan 6–12 maddelik çok kaynaklı bir konsensüs listesi kanıtla oluşturulamıyor.
- Satırlarda ölçülmüş nicel sonuç, işlem parametresi veya sayısal aralık yoktur; yayın yılları deneysel sonuç değeri değildir.
- Natufien düz ürünlerinde bileşen oranları ve hazırlama/pişirme koşulları bildirilmemiştir.
- Maya miktarı, karbondioksit üretim hızı, fermantasyon koşulları ve kabarma ölçümleri verilmemiştir.
- Fırın sıcaklığı ve süresi ile gaz genişlemesi veya gözenekli yapı arasındaki nicel ilişki belirtilmemiştir.
- Eski Mısır’da öğütme araçları ve öğütme inceliğinin un verimi ya da ekmek özellikleri üzerindeki etkisi açıklanmamıştır.
