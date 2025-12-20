import '../models/blog_post.dart';

class BlogData {
  static List<BlogPost> getBlogPosts() {
    return [
      BlogPost(
        id: 'blog1',
        title: 'Ekşi Maya Nasıl Yapılır?',
        summary: 'Evde kendi ekşi mayanızı yapmak için adım adım rehber',
        content: '''
# Ekşi Maya Nasıl Yapılır?

Ekşi maya, doğal fermentasyon yoluyla oluşturulan ve ekmek yapımında kullanılan canlı bir kültürdür. Ekşi mayalı ekmekler, endüstriyel mayalı ekmeklere göre daha lezzetli, daha sağlıklı ve daha kolay sindirilebilir özelliktedir.

## Malzemeler

- 100 gram tam buğday unu (organik olması tercih edilir)
- 100 ml ılık su (klorsuz olması önemli)
- Geniş ağızlı cam kavanoz
- Temiz bir bez veya kağıt havlu
- Lastik veya ip

## Adım Adım Ekşi Maya Yapımı

### 1. Gün: Başlangıç

1. Cam kavanozun içine 50 gram tam buğday unu ve 50 ml ılık su ekleyin.
2. Tahta kaşık veya spatula ile iyice karıştırın. Karışım kalın bir çorba kıvamında olmalıdır.
3. Kavanozun ağzını bez ile kapatıp lastik veya ip ile sabitleyin. Bu, havanın girmesine izin verirken, toz ve böceklerin girmesini engeller.
4. Kavanozı 20-25°C sıcaklıkta, doğrudan güneş ışığı almayan bir yere koyun.

### 2. Gün: İlk Besleme

1. Kavanozı kontrol edin. Henüz belirgin bir aktivite görmeyebilirsiniz, bu normaldir.
2. Karışımın yarısını (yaklaşık 50 gram) atın.
3. Kavanoza 50 gram tam buğday unu ve 50 ml ılık su ekleyin.
4. İyice karıştırın ve kavanozı tekrar kapatıp aynı yere koyun.

### 3. Gün: İkinci Besleme

1. Kavanozı kontrol edin. Küçük kabarcıklar görmeye başlayabilirsiniz.
2. Karışımın yarısını atın.
3. Kavanoza 50 gram tam buğday unu ve 50 ml ılık su ekleyin.
4. İyice karıştırın ve kavanozı tekrar kapatıp aynı yere koyun.

### 4. Gün: Üçüncü Besleme

1. Kavanozı kontrol edin. Daha fazla kabarcık ve hafif bir kabarma görebilirsiniz.
2. Karışımın yarısını atın.
3. Kavanoza 50 gram tam buğday unu ve 50 ml ılık su ekleyin.
4. İyice karıştırın ve kavanozı tekrar kapatıp aynı yere koyun.

### 5. Gün: Dördüncü Besleme

1. Kavanozı kontrol edin. Belirgin kabarcıklar, kabarma ve ekşimsi bir koku hissetmelisiniz.
2. Karışımın yarısını atın.
3. Kavanoza 50 gram tam buğday unu ve 50 ml ılık su ekleyin.
4. İyice karıştırın ve kavanozı tekrar kapatıp aynı yere koyun.

### 6-7. Gün: Son Beslemeler

1. Bu aşamada mayanız aktif olmalı, beslemeden sonra 4-8 saat içinde hacminin iki katına çıkmalıdır.
2. Günlük besleme rutinine devam edin: Yarısını atın, 50 gram un ve 50 ml su ekleyin.
3. Mayanız düzenli olarak kabarıyorsa, artık ekmek yapmaya hazırsınız!

## Ekşi Mayanın Bakımı

- Düzenli kullanıyorsanız: Oda sıcaklığında saklayın ve günde bir kez besleyin.
- Haftalık kullanıyorsanız: Buzdolabında saklayın ve kullanmadan bir gün önce çıkarıp besleyin.
- Uzun süre kullanmayacaksanız: Daha katı bir kıvama getirip buzdolabında saklayın ve ayda bir besleyin.

## Sorun Giderme

- **Maya kabarmıyorsa:** Ortam sıcaklığını kontrol edin, daha sıcak bir yere taşıyın.
- **Kötü koku varsa:** Mayanız kontamine olmuş olabilir. Yeniden başlayın.
- **Sıvı ayrışması oluyorsa:** Bu normaldir, kullanmadan önce karıştırın.

Ekşi maya yapımı sabır gerektiren bir süreçtir, ancak sonuçları kesinlikle beklemeye değer. İyi fermentasyonlar!
''',
        imageUrl:
            'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        author: 'Ahmet Yılmaz',
        date: DateTime(2023, 5, 15),
        tags: ['Ekşi Maya', 'Yapım', 'Başlangıç', 'Fermentasyon'],
        category: 'Tarifler',
      ),
      BlogPost(
        id: 'blog2',
        title: 'Ekşi Mayalı Ekmek Tarifleri',
        summary: 'Farklı un ve malzemelerle ekşi maya tarifleri',
        content: '''
# Ekşi Mayalı Ekmek Tarifleri

Ekşi mayalı ekmekler, zengin lezzetleri ve sağlık faydalarıyla son yıllarda büyük ilgi görüyor. İşte farklı un ve malzemelerle hazırlayabileceğiniz birbirinden lezzetli ekşi mayalı ekmek tarifleri.

## Klasik Beyaz Ekşi Mayalı Ekmek

### Malzemeler
- 400 gram ekmeklik un
- 100 gram aktif ekşi maya başlangıcı
- 275 ml su
- 10 gram deniz tuzu

### Hazırlanışı
1. Unu geniş bir kaba alın ve ortasını havuz şeklinde açın.
2. Ekşi maya başlangıcını ve suyun çoğunu ekleyin, karıştırmaya başlayın.
3. Tuzu ekleyin ve kalan suyu yavaş yavaş ilave ederek yumuşak bir hamur elde edin.
4. Hamuru 10-15 dakika yoğurun.
5. Hamuru yağlanmış bir kaba alın, üzerini örtün ve oda sıcaklığında 4 saat fermente olmasını bekleyin.
6. Hamuru hafifçe unlanmış tezgaha alın, şekil verin ve ekmek sepetine yerleştirin.
7. Buzdolabında 12-16 saat daha fermente olmasını bekleyin.
8. Fırını 230°C'ye ısıtın. Hamuru fırın taşı veya dökme demir tencereye alın.
9. 20 dakika kapağı kapalı, 25-30 dakika kapağı açık pişirin.
10. Ekmek soğumaya bırakın.

## Tam Buğdaylı Ekşi Mayalı Ekmek

### Malzemeler
- 300 gram tam buğday unu
- 200 gram ekmeklik un
- 100 gram aktif ekşi maya başlangıcı
- 350 ml su
- 12 gram deniz tuzu
- 1 yemek kaşığı bal (isteğe bağlı)

### Hazırlanışı
1. Unları karıştırın ve geniş bir kaba alın.
2. Ekşi maya başlangıcını, suyu ve balı ekleyin, karıştırmaya başlayın.
3. Tuzu ekleyin ve yumuşak bir hamur elde edene kadar yoğurun.
4. Hamuru yağlanmış bir kaba alın, üzerini örtün ve oda sıcaklığında 5-6 saat fermente olmasını bekleyin.
5. Hamuru şekillendirin ve ekmek sepetine yerleştirin.
6. Buzdolabında 12-16 saat daha fermente olmasını bekleyin.
7. Fırını 220°C'ye ısıtın ve yukarıdaki gibi pişirin.

## Çavdarlı Ekşi Mayalı Ekmek

### Malzemeler
- 300 gram ekmeklik un
- 200 gram çavdar unu
- 100 gram aktif ekşi maya başlangıcı
- 350 ml su
- 12 gram deniz tuzu
- 1 yemek kaşığı pekmez

### Hazırlanışı
1. Unları karıştırın ve geniş bir kaba alın.
2. Ekşi maya başlangıcını, suyu ve pekmezi ekleyin, karıştırmaya başlayın.
3. Tuzu ekleyin ve yumuşak bir hamur elde edene kadar yoğurun.
4. Hamuru yağlanmış bir kaba alın, üzerini örtün ve oda sıcaklığında 5-6 saat fermente olmasını bekleyin.
5. Hamuru şekillendirin ve ekmek sepetine yerleştirin.
6. Buzdolabında 12-16 saat daha fermente olmasını bekleyin.
7. Fırını 220°C'ye ısıtın ve yukarıdaki gibi pişirin.

## Zeytinli ve Biberiyeli Ekşi Mayalı Ekmek

### Malzemeler
- 500 gram ekmeklik un
- 100 gram aktif ekşi maya başlangıcı
- 325 ml su
- 10 gram deniz tuzu
- 150 gram çekirdeksiz siyah zeytin, doğranmış
- 2 yemek kaşığı taze biberiye, doğranmış
- 2 yemek kaşığı zeytinyağı

### Hazırlanışı
1. Unu geniş bir kaba alın ve ortasını havuz şeklinde açın.
2. Ekşi maya başlangıcını, suyu ve zeytinyağını ekleyin, karıştırmaya başlayın.
3. Tuzu ekleyin ve yumuşak bir hamur elde edene kadar yoğurun.
4. Hamuru yağlanmış bir kaba alın, üzerini örtün ve oda sıcaklığında 4 saat fermente olmasını bekleyin.
5. Hamuru hafifçe unlanmış tezgaha alın, üzerine zeytinleri ve biberiyeyi ekleyin ve hamura yedirin.
6. Hamuru şekillendirin ve ekmek sepetine yerleştirin.
7. Buzdolabında 12-16 saat daha fermente olmasını bekleyin.
8. Fırını 230°C'ye ısıtın ve yukarıdaki gibi pişirin.

## Ekşi Mayalı Ekmek Yapımında Püf Noktaları

- Ekşi maya başlangıcınız aktif olmalıdır. Beslemeden 4-8 saat sonra hacminin iki katına çıkması gerekir.
- Hamur yoğurma süresi önemlidir. Gluten gelişimi için yeterince yoğurduğunuzdan emin olun.
- Uzun fermentasyon süresi, ekmeğin lezzetini ve sindirilebilirliğini artırır.
- Fırın ısısı ve buhar, iyi bir kabuk oluşumu için önemlidir.
- Ekmeği tamamen soğutmadan kesmemeye özen gösterin.

Bu tarifleri deneyerek kendi ekşi mayalı ekmek maceranıza başlayabilirsiniz. Her pişirme deneyiminizle birlikte tekniğinizi geliştirecek ve kendi tarzınızı oluşturacaksınız. Afiyet olsun!
''',
        imageUrl:
            'https://images.unsplash.com/photo-1565181917578-a87bdd95422b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        author: 'Zeynep Kaya',
        date: DateTime(2023, 6, 22),
        tags: ['Ekşi Maya', 'Ekmek', 'Tarifler', 'Pişirme'],
        category: 'Tarifler',
      ),
      BlogPost(
        id: 'blog3',
        title: 'Ekşi Mayanın Sağlık Faydaları',
        summary: 'Uzmanlar ekşi mayalı ekmeklerin sağlık faydalarını anlatıyor',
        content: '''
# Ekşi Mayanın Sağlık Faydaları

Ekşi mayalı ekmekler, sadece lezzetleri ile değil, sağlık açısından sundukları faydalarla da öne çıkıyor. Modern beslenme düzeninde giderek daha fazla ilgi gören ekşi mayalı ekmeklerin sağlığımıza olan katkılarını uzmanlar eşliğinde inceliyoruz.

## Daha Kolay Sindirim

Ekşi maya fermentasyonu, ekmekteki gluten proteinlerini kısmen parçalar. Bu sayede, normal mayalı ekmeklere göre daha kolay sindirilebilir hale gelir. Diyetisyen Dr. Ayşe Yılmaz, "Ekşi mayalı ekmekler, uzun fermentasyon süreci sayesinde sindirimi kolaylaştıran enzimlere sahiptir. Bu özellik, özellikle hafif gluten hassasiyeti olan kişiler için faydalıdır" diyor.

## Düşük Glisemik İndeks

Ekşi mayalı ekmekler, normal mayalı ekmeklere göre daha düşük glisemik indekse sahiptir. Bu, kan şekerinin daha yavaş yükselmesini sağlar. Endokrinolog Dr. Mehmet Kara, "Ekşi mayalı ekmeklerdeki organik asitler, nişastanın sindirim hızını yavaşlatır. Bu da kan şekerinin ani yükselmesini engeller ve daha uzun süre tokluk hissi sağlar" açıklamasını yapıyor.

## Prebiyotik Özellikler

Ekşi maya fermentasyonu sırasında oluşan prebiyotik bileşenler, bağırsak sağlığını destekler. Gastroenterolog Dr. Zeynep Demir, "Ekşi mayalı ekmeklerdeki prebiyotikler, bağırsak florasındaki yararlı bakterilerin beslenmesini sağlar. Bu da bağışıklık sisteminin güçlenmesine ve genel bağırsak sağlığının iyileşmesine katkıda bulunur" diyor.

## Mineral Emilimini Artırır

Tahıllarda doğal olarak bulunan fitik asit, demir, çinko ve magnezyum gibi minerallerin emilimini engeller. Ekşi maya fermentasyonu, fitik asit seviyesini düşürerek bu minerallerin vücut tarafından daha iyi emilmesini sağlar. Beslenme uzmanı Prof. Dr. Ali Yıldız, "Ekşi maya fermentasyonu, tahıllardaki fitik asidi parçalayarak minerallerin biyoyararlanımını artırır. Bu özellikle vejetaryen ve vegan beslenenlerde mineral eksikliklerini önlemek açısından önemlidir" diyor.

## Daha Az Gluten Hassasiyeti

Ekşi maya fermentasyonu, gluteni kısmen parçalayarak, gluten hassasiyeti olan bazı kişilerin bu ekmekleri daha rahat tüketmesini sağlayabilir. Ancak çölyak hastaları için uygun değildir. Gastroenterolog Dr. Zeynep Demir, "Ekşi mayalı ekmekler, hafif gluten hassasiyeti olan kişiler için daha iyi tolere edilebilir, ancak çölyak hastaları kesinlikle glutensiz beslenmeye devam etmelidir" uyarısında bulunuyor.

## Daha Uzun Raf Ömrü

Ekşi mayalı ekmekler, içerdikleri organik asitler sayesinde küf oluşumuna karşı daha dirençlidir ve daha uzun süre taze kalır. Bu, gıda israfını azaltmaya yardımcı olur. Gıda mühendisi Dr. Canan Yılmaz, "Ekşi mayalı ekmeklerdeki laktik ve asetik asitler doğal koruyucu görevi görür ve ekmeklerin daha uzun süre bozulmadan kalmasını sağlar" diyor.

## Zengin ve Kompleks Lezzet

Uzun fermentasyon süreci, ekmeğe zengin ve kompleks bir lezzet profili kazandırır. Bu da daha az miktarda ekmekle daha fazla tatmin olmanızı sağlayabilir. Şef Mustafa Özkan, "Ekşi mayalı ekmeklerdeki derin ve kompleks lezzet, yemek deneyimini zenginleştirir ve daha az miktarda ekmekle doygunluk hissi verir" açıklamasını yapıyor.

## Sonuç

Ekşi mayalı ekmekler, modern beslenme düzeninde sağlıklı bir alternatif sunuyor. Uzun fermentasyon süreci, sindirimi kolaylaştırıyor, besin değerlerini artırıyor ve kan şekerini dengeliyor. Ancak her besinde olduğu gibi, ekşi mayalı ekmekleri de dengeli bir şekilde tüketmek önemli.

Diyetisyen Dr. Ayşe Yılmaz, son olarak şu tavsiyede bulunuyor: "Ekşi mayalı ekmekler, sağlıklı beslenme düzeninin bir parçası olabilir. Ancak her besinde olduğu gibi, porsiyon kontrolüne dikkat etmek ve çeşitli besin gruplarından dengeli bir şekilde tüketmek önemlidir."
''',
        imageUrl:
            'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        author: 'Dr. Mehmet Kara',
        date: DateTime(2023, 7, 10),
        tags: ['Ekşi Maya', 'Sağlık', 'Beslenme', 'Sindirim'],
        category: 'Sağlık',
      ),
    ];
  }

  static BlogPost getBlogPostById(String id) {
    return getBlogPosts().firstWhere(
      (post) => post.id == id,
      orElse: () => BlogPost(
        id: 'not-found',
        title: 'Blog yazısı bulunamadı',
        summary: '',
        content: 'Aradığınız blog yazısı bulunamadı.',
        imageUrl: '',
        author: '',
        date: DateTime.now(),
        category: '',
      ),
    );
  }

  static List<BlogPost> getBlogPostsByCategory(String category) {
    if (category.isEmpty) return getBlogPosts();
    return getBlogPosts().where((post) => post.category == category).toList();
  }

  static BlogPost? getBlogById(String id) {
    try {
      return getBlogPosts().firstWhere((post) => post.id == id);
    } catch (e) {
      return null;
    }
  }
}
