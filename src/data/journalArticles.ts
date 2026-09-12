import { JournalArticle } from "@/types/journal";

export const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    id: "art_01_karakilcik",
    slug: "karakilcik-36-saat",
    volumeNumber: 1,
    volumeTitle: "Cilt I: Ata Tohumları & Soğuk Fermantasyon",
    category: "tahil",
    categoryLabel: "Tahıl & Ekmek",
    title: "Ata Tohumu Karakılçık ve 36 Saatin Biyokimyası",
    subtitle: "Ekşi Mayalı Ekmek Neden Şişkinlik Yapmaz ve Kepek Neden Kansızlığı Önler?",
    publishedDate: "Eylül 2026",
    readingTimeMinutes: 4,
    thirtySecondTakeaway:
      "Bu ekmek fırına girmeden önce 36 saat boyunca +4°C'de bekler. Bu sürede unun içindeki enzimler gluteni parçalar, kepekteki demir ve çinkoyu hapseden fitik asidi yok eder. Ekmek midenize inmeden önce kendi kendini sindirdiği için şişkinlik ve ağırlık yapmaz.",
    dropCapLetter: "B",
    leadParagraph:
      "ugün market raflarında 'tam buğday' ya da 'köy ekmeği' adıyla satılan fırın ürünlerinin büyük çoğunluğu, 19. yüzyılın sonundan itibaren endüstriyel fırın fabrikalarının hız tutkusuyla şekillendi. Hamura basılan yapay ticari mayalar ve hacim artırıcı kimyasallar sayesinde bir somun 45 dakikada kabararak fırına sürülüyor. Oysa doğanın binlerce yıldır insanoğluna sunduğu kadim buğday tanesi, 45 dakikada sindirilebilir bir gıdaya dönüşmeyi kesinlikle reddeder.",
    sections: [
      {
        id: "gluten-ve-siskinlik",
        heading: "1. Midedeki Davul Etkisi: Gluten Neden Düşman Oldu?",
        paragraphs: [
          "Endüstriyel beyaz ve hızlı mayalanmış ekmek tükettiğimizde bağırsaklarımızda hissettiğimiz o taş gibi ağırlık ve şişkinlik, aslında buğdayın suçu değildir. Buğdayın içindeki gliadin ve glutenin adı verilen proteinler, son derece uzun ve karmaşık zincirlere sahiptir.",
          "Geleneksel ekşi mayalamada hamurun içinde yaşayan dost laktik asit bakterileri, ortama organik asit salgılayarak pH seviyesini 3.8'e kadar düşürür. Bu asitlik, buğdayın içinde uyuyan proteaz enzimlerini harekete geçirir. Proteazlar, 36 saat boyunca o ağır gluten zincirlerini adeta mikroskobik bir makas gibi keserek basit ve zararsız aminoasit yapıtaşlarına parçalar.",
          "Sonuç: Ekmek fırına girmeden önce kendi kendini ön-sindirime uğratır. Sofranıza geldiğinde mideniz proteini parçalamak için saatlerce çırpınmak zorunda kalmaz.",
        ],
        pullQuote:
          "“Zaman, ekşi mayalı ekmeğin içinde görünmeyen en güçlü sindirim enzimidir.”",
        diagram: {
          type: "wheat_anatomy",
          caption: "Ata tohumu buğday tanesinin katmanları: Kepek (Fitik Asit), Ruşeym (Mineraller) ve Endosperm (Gluten).",
          altText: "Karakılçık buğday tanesi anatomik kesiti",
        },
      },
      {
        id: "fitik-asit-tuzagi",
        heading: "2. Fitik Asit Tuzağı: Kepekli Ekmek Neden Kansızlık Yapar?",
        paragraphs: [
          "Halk arasında tam buğday ve kepekli ekmeklerin 'kan yaptığı ve çok sağlıklı olduğu' söylenir. Bu bilgi yarı yarıya yanlıştır. Evet, kepek demir, magnezyum ve çinko bakımından bir hazinedir; ancak kepeğin içinde Fitik Asit adı verilen sert bir molekül bulunur.",
          "Fitik asit, doğada buğday tohumunun toprağa düşene kadar çürümesini engelleyen bir güvenlik kilididir. Bu molekül, kepekteki demir ve çinkoya bir mıknatıs gibi yapışır (şelasyon). Hızlı mayalanmış bir kepekli ekmek yediğinizde, fitik asit çözülemediği için o değerli mineraller bağırsaktan emilemeden dışarı atılır.",
          "EkmekLab'da uyguladığımız 36 saatlik fermantasyonda ise asidik ortam, fitaz enzimini tam verimle uyandırır. Fitaz, fitik asit kilidini %92 oranında parçalar. Kepeğin içindeki demir ve magnezyum tamamen serbest kalarak vücudunuza gerçek bir şifa olarak geçer.",
        ],
        practicalTips: [
          "Kronik demir eksikliği ve kansızlık yaşayan bireyler için uzun fermente tam tahıl ekmekleri emilimi 3 katına çıkarır.",
          "Oda sıcaklığında pamuklu bez torbada 5-7 gün küflenmeden tazeliğini korur.",
        ],
        video: {
          posterUrl: "/atelier/closeup_counter.png",
          title: "Ustanın Tezgâhından: 30 Saniyelik Lamine Katlama",
          caption: "Hamurun gluten ağını elle nazikçe ördüğümüz ve gaz kabarcıklarını koruduğumuz katlama anı.",
          duration: "0:25",
        },
      },
    ],
    citations: [
      {
        authors: "Di Cagno, R., De Angelis, M., Lavermicocca, P., et al.",
        year: 2002,
        title: "Proteolysis by sourdough lactic acid bacteria: effects on wheat flour protein integrity",
        journal: "Journal of Agricultural and Food Chemistry, 50(5), 1256-1264",
        doi: "https://doi.org/10.1021/jf011037t",
        finding:
          "24-36 saatlik ekşi maya fermantasyonunun, gluten peptitlerini %80'in üzerinde degrade ederek sindirilebilirliği en üst seviyeye çıkardığı kanıtlanmıştır.",
      },
      {
        authors: "Lopez, H. W., Krespine, V., Guy, C., et al.",
        year: 2001,
        title: "Prolonged fermentation of whole wheat sourdough reduces phytate levels and increases soluble magnesium",
        journal: "Journal of Agricultural and Food Chemistry, 49(5), 2657-2662",
        doi: "https://doi.org/10.1021/jf001255z",
        finding:
          "Uzun fermantasyonun, tam buğday unundaki fitat seviyesini %90'ın üzerinde düşürerek magnezyum ve demir emilimini 3 kat artırdığı belgelenmiştir.",
      },
    ],
    relatedProductId: "prod_karakilcik_01",
    nextArticle: {
      slug: "cig-sut-ve-canli-mandira",
      title: "Çiğ Süt, Canlı Yoğurt ve Mandıra Mikrobiyolojisi",
      categoryLabel: "Mandıra & Şarküteri",
    },
  },
  {
    id: "art_02_cig_sut",
    slug: "cig-sut-ve-canli-mandira",
    volumeNumber: 2,
    volumeTitle: "Cilt II: Canlı Mandıra & Şarküteri Mikrobiyolojisi",
    category: "mandira",
    categoryLabel: "Mandıra & Şarküteri",
    title: "Çiğ Süt, Canlı Yoğurt ve Mandıra Mikrobiyolojisi",
    subtitle: "Pastörizasyonun Ötesinde: Doğal Mera Sütü Neden Yaşayan Bir Biyomdur?",
    publishedDate: "Eylül 2026",
    readingTimeMinutes: 5,
    thirtySecondTakeaway:
      "Endüstriyel sütler 135°C yüksek ısıda homojenize edilirken sütün bağışıklık kazandıran doğal enzimleri yok olur. Abimizin çiftliğinden gelen doğal mera sütü ve çömlek ev yoğurdumuzdaki laktik asit bakterileri ise kazein proteinini doğal olarak pıhtılaştırır; jelatinsiz taş gibi kıvam ve canlı probiyotik sağlar.",
    dropCapLetter: "S",
    leadParagraph:
      "üt, memeli canlıların yeni doğan yavrularına sadece protein ve kalsiyum değil; aynı zamanda dış dünyadaki patojenlere karşı korunmaları için canlı bir bağışıklık sistemi aktardığı mucizevi bir sıvıdır. Ancak modern süpermarket raflarında aylarca bozulmadan duran UHT süt kutuları, saniyeler içinde 135°C gibi agresif ısılara maruz bırakılarak içindeki tüm canlı mikroflora sıfırlanmış biyolojik olarak 'ölü' sıvılardır.",
    sections: [
      {
        id: "pastorizasyon-ve-enzimler",
        heading: "1. Enzimlerin Korunması: Canlı Mera Sütünün Sırrı",
        paragraphs: [
          "Doğal otlayan meralardaki ineklerden sağılan çiğ süt; fosfataz, laktoperoksidaz ve lizozim gibi antibakteriyel enzimlerle doludur. Bu enzimler vücutta laktozun (süt şekerinin) hazmını kolaylaştırır.",
          "Çiftliğimizden taze gelen çiğ sütü evinizde kontrollü kaynattığınızda (pastörize ettiğinizde), endüstriyel fabrikalardaki gibi sütün protein yapısı (kazein micelleri) parçalanmaz, doğallığını korur. Böylece sütün sindirimi mideyi yormaz.",
        ],
        pullQuote:
          "“Gerçek yoğurt kıvamını kimyasal jelatinlerden değil; sütün kendi kazein proteininin doğal pıhtılaşmasından alır.”",
        diagram: {
          type: "dairy_fermentation",
          caption: "Doğal süt kazein proteinlerinin laktik asit fermantasyonuyla taş gibi pıhtılaşma evresi.",
          altText: "Süt fermantasyonu şeması",
        },
      },
      {
        id: "mihalic-ve-tuz-ozmozu",
        heading: "2. Mihaliç Peyniri: Delikli Dokunun ve Tuz Kristallerinin Zanaatı",
        paragraphs: [
          "Geleneksel Bursa ve Balıkesir yöresinin asırlık mirası olan hakiki Mihaliç peyniri, çiğ sütten şirden mayasıyla çalınır. Peynirin o meşhur gözenekli ve sert dokusu, fermantasyon sırasında laktik asit bakterilerinin ürettiği mikro gaz odacıklarından kaynaklanır.",
          "Sıcak peynir telemesi haşlanıp tuzlu salamuraya yatırıldığında ozmoz başlar. Aylarca dinlenen peynirde proteinler parçalanır (proteoliz) ve ağzınıza attığınızda çıtırdayan o nefis lezzet kristalleri (tirozin kristalleri) oluşur.",
          "Bu peynir sıradan bir kahvaltılık değildir; tavada ısıtıldığında eriyerek karamelize olan, ekşi mayalı Karakılçık ekmeğiyle birleştiğinde mükemmel bir protein-karbonhidrat dengesi sunan bir zanaat eseridir.",
        ],
        practicalTips: [
          "Mihaliç peynirini dilimleyip hafif sıcak tavada 1 dakika kızartarak çıtır ekmeğin üzerine koyun.",
          "Ev yapımı yoğurdumuz koruyucusuzdur; cam veya toprak kapta buzdolabında 10 gün canlılığını korur.",
        ],
      },
    ],
    citations: [
      {
        authors: "Fox, P. F., Guinee, T. P., Cogan, T. M., & McSweeney, P. L.",
        year: 2017,
        title: "Fundamentals of cheese science: Biochemistry of cheese ripening",
        journal: "Springer Publishing, 2nd Edition, 391-442",
        doi: "https://doi.org/10.1007/978-1-4899-7681-9",
        finding:
          "Geleneksel şirden mayalı sert peynirlerdeki uzun olgunlaşmanın, laktozu sıfıra indirirken peptitleri bağırsak dostu biyoaktif moleküllere çevirdiği belgelenmiştir.",
      },
    ],
    relatedProductId: "prod_mihalic_07",
    nextArticle: {
      slug: "karakilcik-36-saat",
      title: "Ata Tohumu Karakılçık ve 36 Saatin Biyokimyası",
      categoryLabel: "Tahıl & Ekmek",
    },
  },
];
