import { defineConcepts } from "@/lib/knowledge/define";

export const concepts = defineConcepts({
  // ── Canlılar ──
  f_sanfranciscensis: {
    kind: "canli",
    name: "Fructilactobacillus sanfranciscensis",
    latin: "Fructilactobacillus sanfranciscensis",
    nick: "Sanfran",
    layers: {
      usta: "Ekşi mayanın simge bakterisi; ekşiliği ve aromayı o yapar.",
      neden: "Maltozu parçalayıp laktik asit, asetik asit ve biraz CO₂ üretir. Bölünürken çıkardığı glukozu mayalara bırakır.",
      bilim: "Zorunlu heterofermentatif çubuk bakteri. En hızlı ~33 °C'de büyür, 41 °C üstünde büyüyemez. Eski adı Lactobacillus sanfranciscensis; 2020'de yeni cinse taşındı.",
    },
  },

  l_plantarum: {
    kind: "canli",
    name: "Lactiplantibacillus plantarum",
    latin: "Lactiplantibacillus plantarum",
    nick: "Planto",
    layers: {
      usta: "Bitkilerden gelen dayanıklı bir laktik bakteri; yeni mayaların kurucularından.",
      neden: "Çok çeşitli şekerleri kullanabildiği için mayanın ilk günlerinde hızla çoğalır ve asidi yükseltir.",
      bilim: "Fakültatif heterofermentatif. Bitki yüzeylerinde, tahılda ve fermente gıdalarda yaygındır. Kendiliğinden kurulan mayalarda 4–6. günlerde öne çıkar.",
    },
  },

  oncu_lab: {
    kind: "canli",
    name: "Öncü laktik bakteriler",
    latin: "Leuconostoc, Weissella",
    nick: "Öncüler",
    layers: {
      usta: "Yeni mayanın ilk asitçileri; ortamı ekşi maya uzmanlarına hazırlarlar.",
      neden: "İlk 1–3 günde çoğalıp pH'ı 5'in altına indirirler. Asit arttıkça kendileri de çekilir; yerlerini aside daha dayanıklı bakteriler alır.",
      bilim: "Kok (yuvarlak) ya da kısa çubuk; çift ve zincir halinde. Heterofermentatif oldukları için biraz CO₂ de üretirler.",
    },
  },

  enterobakteri: {
    kind: "canli",
    name: "Enterobakteriler",
    latin: "Enterobacter ve akrabaları",
    nick: "Geçici misafir",
    layers: {
      usta: "1. günün sahte kabarması onların işi; asit yükselince elenirler.",
      neden: "Undan gelirler, nötr pH'ta çok hızlı çoğalıp gaz ve kötü koku üretirler. pH ~4,5 altına inince dayanamazlar.",
      bilim: "Kendiliğinden kurulan mayada ilk 24 saatin baskın grubu. Laktik bakterilerin asidi onları birkaç günde temizler.",
    },
  },

  k_humilis: {
    kind: "canli",
    name: "Kazachstania humilis",
    latin: "Kazachstania humilis",
    nick: "Humi",
    layers: {
      usta: "Ekşi mayanın yabani mayası; maltoz yemez, bakterinin artığıyla yaşar.",
      neden: "Maltozu kullanamaz; F. sanfranciscensis'in maltozu parçalarken bıraktığı glukozla beslenir. Yarış yerine iş bölümü.",
      bilim: "En hızlı ~27 °C'de büyür, 36 °C üstünde büyüyemez. Eski adı Candida humilis / C. milleri. Aside çok dayanıklıdır.",
    },
  },

  s_cerevisiae: {
    kind: "canli",
    name: "Saccharomyces cerevisiae",
    latin: "Saccharomyces cerevisiae",
    nick: "Saki",
    layers: {
      usta: "Fırıncı mayasının yabani kuzeni; ekşi mayada da yaşar.",
      neden: "Şekeri CO₂ ve etanole çevirir; hamuru kabartan gazın büyük kısmı mayalardan gelir.",
      bilim: "Hamurda gaz üretimi daha sıcakta (~32–36 °C) en hızlıdır. Saf fırıncı mayası 19. yüzyılda endüstriyel olarak üretilmeye başlandı.",
    },
  },

  // ── Moleküller ve Enzimler ──
  gluten: {
    kind: "molekul",
    name: "Gluten",
    layers: {
      usta: "Su ve emekle kurulan ağ; gazı balon gibi tutan odur.",
      neden: "Gliadin hamura akışkanlık ve uzama verir, glutenin esneklik ve direnç. Su değince birbirine tutunurlar; yoğurma zincirleri hizalar.",
      bilim: "Glutenin dev zincirleri disülfit köprüleriyle (–S–S–) bağlanır. Pencere testinde ışık geçiren zar, ağın gazı tutacak kadar geliştiğini gösterir.",
    },
  },

  nisasta: {
    kind: "molekul",
    name: "Nişasta taneleri",
    layers: {
      usta: "Unun çoğu nişastadır; büyük mercimek ve küçük top biçiminde taneler.",
      neden: "Fırında su emip şişerler, jelleşip iç yapıyı sabitlerler. Soğudukça yeniden düzenlenip içi oturturlar.",
      bilim: "Buğdayda büyük (A, 15–35 µm) ve küçük (B, 2–8 µm) taneler bulunur. Değirmende zedelenen 'hasarlı' taneler amilazın kesebildiği kısımdır.",
    },
  },

  amilaz: {
    kind: "enzim",
    name: "Amilaz",
    layers: {
      usta: "Nişastayı şekere kesen makas: mayanın yemeğini o hazırlar.",
      neden: "β-amilaz uçtan maltoz koparır, α-amilaz zinciri ortadan böler. Yalnız hasarlı nişastaya erişebilirler.",
      bilim: "β-amilaz en etkin 62–64 °C'de, 82–84 °C'de söner; α-amilaz daha ısıya dayanıklıdır. Düşük pH amilazı frenler; çavdarda bu yüzden ekşi maya şarttır.",
    },
  },

  proteaz: {
    kind: "enzim",
    name: "Proteaz",
    layers: {
      usta: "Asit yükselince uyanan ağ kesici; fazlası hamuru çorba yapar.",
      neden: "Unun kendi proteazları nötr pH'ta uyur; ekşi mayanın asidi pH'ı ~4'e indirince uyanıp gluteni keser.",
      bilim: "Aspartik proteinazlar. Kestikleri parçaları bakteri peptidazları amino asitlere ayırır: bunlar aromanın hammaddesidir. Aşırı mayalanmada ağ çözülür.",
    },
  },

  maltoz: {
    kind: "molekul",
    name: "Maltoz",
    layers: {
      usta: "İki glukozun el ele hali: hamurdaki ana yakıt.",
      neden: "Amilaz nişastadan maltoz keser; bakteriler ve mayalar bunu yakıp asit ve gaz üretir.",
      bilim: "F. sanfranciscensis maltozu fosforilazla parçalar ve glukozu dışarı bırakır; maltoz kullanamayan K. humilis bu glukozla beslenir.",
    },
  },

  co2: {
    kind: "molekul",
    name: "Karbondioksit",
    layers: {
      usta: "Hamuru kabartan gaz; önce suda çözünür.",
      neden: "Maya ve bazı bakteriler CO₂ üretir. Gaz önce hamurun suyunda çözünür; su doyunca kabarcıklara geçer.",
      bilim: "Fırında CO₂'nin çözünürlüğü düşer, gaz kabarcıklara geçip genleşir: fırın kabarmasının bir kısmı budur.",
    },
  },

  asitler: {
    kind: "molekul",
    name: "Laktik ve asetik asit",
    layers: {
      usta: "Laktik yoğurt gibi yumuşak, asetik sirke gibi keskin.",
      neden: "Sıcak ve sulu maya laktiği, serin ve sıkı maya asetiği artırır. Dolapta bekleyen hamurda asetik payı yükselir.",
      bilim: "İkisinin molar oranına fermentasyon katsayısı denir. Asit pH'ı düşürür, istenmeyen mikropları eler ve küfü geciktirir.",
    },
  },

  tuz: {
    kind: "molekul",
    name: "Tuz",
    layers: {
      usta: "Ağı sıkılaştırır, mayayı frenler, lezzeti açar.",
      neden: "Proteinlerdeki yükleri perdeleyerek hamuru daha sıkı ve daha az yapışkan yapar; ozmotik baskıyla mayaları ve bakterileri yavaşlatır.",
      bilim: "Unun %2'si civarı yaygındır. Tuzu en sonda eklemenin belirgin bir farkı denemelerde görülmemiştir; kural tartışmalıdır.",
    },
  },

  fitaz: {
    kind: "enzim",
    name: "Fitaz",
    layers: {
      usta: "Kepekteki fitik asidi parçalayan enzim; asit onu çalıştırır.",
      neden: "Ekşi mayanın düşürdüğü pH, unun kendi fitazını çalıştırır; fitik asit parçalanır ve ona bağlı mineraller serbest kalır.",
      bilim: "Uzun ekşi maya fermentasyonunda fitik asidin %50–70'ten fazlası parçalanabilir (Leenhardt ve ark. 2005).",
    },
  },

  pentozan: {
    kind: "molekul",
    name: "Pentozanlar",
    layers: {
      usta: "Çavdarın süngeri: gluten yerine yapıyı onlar taşır.",
      neden: "Arabinoksilanlar suyu sünger gibi çeker, şişip jel kurar. Çavdar hamurunu bu jel ayakta tutar.",
      bilim: "Çavdar proteinleri (secalin) ağ kuramaz. Asit pentozanların suda çözünmesini ve su tutmasını da artırır.",
    },
  },

  aroma_2ap: {
    kind: "molekul",
    name: "2-asetil-1-pirolin",
    layers: {
      usta: "Kabuğun kavrulmuş, fındıksı kokusu; tarifi bakteriden başlar.",
      neden: "Bazı laktik bakteriler arginini ornitine çevirir; ornitin fırında Maillard tepkimesiyle bu kokuya dönüşür.",
      bilim: "Ekşi mayalı ekmeğin kabuk aromasında önemli bir bileşik. Yani kabuğun kokusu bir gece önce dolapta hazırlanır.",
    },
  },

  // ── Olaylar ──
  olay_ardisiklik: {
    kind: "olay",
    name: "Bir mayanın doğuşu",
    layers: {
      usta: "1. gün sahte kabarma, 3. gün sessizlik, 5–7. gün gerçek maya.",
      neden: "İlk gün enterobakteriler patlar; öncü bakterilerin asidi onları eler; asit dayanıklılar ve mayalar yerleşince topluluk oturur.",
      bilim: "pH 6,2 → 5,0–5,5 (1. gün) → 4,0–4,5 (2–3) → 3,5–4,0 (olgun). Olgun mayada bakteri 10⁸–10⁹, maya 10⁶–10⁷ KOB/g.",
    },
  },

  olay_kabarcik: {
    kind: "olay",
    name: "Kabarcıklar yoğurmada doğar",
    layers: {
      usta: "Maya yeni kabarcık yaratamaz; yalnız var olanları şişirir.",
      neden: "Yoğururken hamura giren minik hava kabarcıkları çekirdektir. Çözünen CO₂ bunlara geçer. Katlama yeni kabarcık eklemez; büyükleri böler.",
      bilim: "Bu yüzden yoğurma ve katlama ekmeğin iç dokusunu belirler: gözeneklerin sayısı karıştırmada, büyüklüğü mayalanmada belirlenir.",
    },
  },

  olay_otoliz: {
    kind: "teknik",
    name: "Otoliz",
    layers: {
      usta: "Un ve su dinlenirken ağ kendiliğinden kurulmaya başlar.",
      neden: "Un suyu tamamen çeker, proteinler kendiliğinden bağlanır, proteazlar ağı hafifçe gevşetir, amilaz şeker hazırlar.",
      bilim: "Raymond Calvel'in 1974'te tanımladığı yöntem. Daha kısa yoğurma, daha uzayabilir hamur.",
    },
  },

  olay_soguk_su: {
    kind: "teknik",
    name: "Soğuk suyun sırrı",
    layers: {
      usta: "Yoğurma hamuru ısıtır; soğuk su onu dengeler.",
      neden: "Hedef hamur sıcaklığı ~27 °C. Oda, un ve maya sıcaklığına yoğurmanın sürtünme ısısı da eklenir; su sıcaklığı geri kalanı ayarlar.",
      bilim: "4 × hamur sıcaklığı ≈ oda + un + maya + su + sürtünme. Sıcak hamur fermentasyonu kaçırır; enzimler hızlanıp ağı zayıflatır.",
    },
  },

  olay_sicaklik_secer: {
    kind: "olay",
    name: "Sıcaklık kimi kayırır?",
    layers: {
      usta: "Serin hamur mayayı, ılık hamur bakteriyi kayırır.",
      neden: "K. humilis en hızlı ~27 °C'de, F. sanfranciscensis ~33 °C'de büyür. Sıcaklığı değiştirmek topluluğun dengesini değiştirir.",
      bilim: "Ilık ve sulu maya: daha çok laktik, daha yumuşak ekşi. Serin ve sıkı maya: daha çok asetik, daha keskin.",
    },
  },

  olay_dolap: {
    kind: "teknik",
    name: "Dolapta bir gece",
    layers: {
      usta: "4 °C'de maya neredeyse durur, bakteriler aromayı işler.",
      neden: "Soğukta gaz üretimi durur ama bakteriler yavaşça asit ve aroma üretmeye devam eder. Soğuk hamur kesik için de sıkılaşır.",
      bilim: "Hamurun dolapta 4 °C'ye inmesi saatler sürer; ilk saatlerde mayalanma sürer. Tahsin: şekilde tam kabardıysa 4 °C, erkense önce 12–13 °C.",
    },
  },

  olay_firin: {
    kind: "olay",
    name: "Fırının içindeki saat",
    layers: {
      usta: "~60 °C'de maya ölür, nişasta jelleşir, ağ donar; 92–98 °C'de iç pişer.",
      neden: "Isı merkeze ilerledikçe: son gaz patlaması, mayanın ölümü, nişastanın su emip jelleşmesi, proteinlerin pıhtılaşması.",
      bilim: "Su kaynamadan iç 100 °C'yi geçemez. Kabukta ise su uçtuktan sonra Maillard tepkimeleri renk ve koku verir.",
    },
  },

  olay_buhar: {
    kind: "teknik",
    name: "Buharın işi",
    layers: {
      usta: "Buhar kabuğu geciktirir: kulak kalkar, kabuk parlar.",
      neden: "Soğuk hamura yoğuşan buhar yüzeyi esnek tutar, kesik açılır. Yüzey nişastası jelleşip parlar. Kabarma bitince tahliye: kabuk kurur, renk alır.",
      bilim: "Kabarma pişmenin ilk ~15–30 dakikasında biter. Tahsin'in 20 dk buharlı + 20 dk buharsız düzeni bu aralıktadır.",
    },
  },

  olay_bayatlama: {
    kind: "olay",
    name: "Bayatlama kuruma değildir",
    layers: {
      usta: "Ekmeği buzdolabına koyma: en hızlı orada bayatlar. Dondur.",
      neden: "Jelleşmiş nişasta soğudukça yeniden kristalleşir (retrogradasyon). Bu tepkime ~4 °C civarında en hızlıdır; -20 °C'de durur.",
      bilim: "Isıtınca kristaller kısmen çözülür, ekmek bir süre tazelenir. Ekşi mayanın asidi küfü geciktirir.",
    },
  },

  olay_kesme: {
    kind: "teknik",
    name: "Kesmek için sabır",
    layers: {
      usta: "Sıcak ekmeği kesersen içi hamurumsu olur.",
      neden: "Nişasta oturmamış, nem dağılmamıştır. Köy ekmeği ~3 saat, yoğun siyez ~1 gün, çavdar 1–2 gün bekler.",
      bilim: "Çavdarda iç gluten değil jel ve nişastayla tutunur; oturması 24–48 saat sürer.",
    },
  },

  olay_haslama: {
    kind: "teknik",
    name: "Kaynar suyla haşlama",
    layers: {
      usta: "Tohumlara, kırmaya ve una kaynar su: bir gün sonra hem tatlı hem nemli.",
      neden: "Kaynar su o kısmın enzimlerini söndürür ve nişastanın bir kısmını önceden jelleştirir; jel suyu tutar, ekmek uzun süre nemli kalır. Karışım soğurken amilazın en sevdiği 60–70 °C'den geçer ve nişastanın bir kısmı şekere döner.",
      bilim: "Nişasta ~60–82 °C'de jelleşir, β-amilaz en etkin 62–64 °C'dedir ve 82–84 °C'de söner. Haşlama bu sıcaklıkları sırayla kullanır. Keten tohumunun müsilajı da suyu bağlar.",
    },
  },

  olay_catlak: {
    kind: "olay",
    name: "Çatlaklar konuşur",
    layers: {
      usta: "Çavdarın parmak testi yok; üstünde çatlaklar belirince hazırdır.",
      neden: "Çavdar hamuru ağ yerine jel ile gazı tutar ve az kabarır. Gaz yüzeyi gerdikçe haşhaş kaplı kabuk çatlar: bu, dolaba ya da fırına geçme işaretidir.",
      bilim: "Çatlaklar belirmeden pişen çavdar sıkı kalır ve yanlarından yırtılır; çatlaklar derinleşip açılırsa fazla mayalanmıştır, fırında çöker.",
    },
  },

  olay_dusen_firin: {
    kind: "teknik",
    name: "Düşen fırın",
    layers: {
      usta: "280 °C'de ısıt, 220'de yükle, ısıtıcıları kapat: sıcaklık kendiliğinden düşsün.",
      neden: "Yoğun çavdar iki saat fırında kalır. Sabit yüksek ısıda üst yanar; düşen ısı kabuğu yakmadan içi yavaşça 96 °C'nin üstüne taşır.",
      bilim: "Büyük ve yoğun kalıp ekmeğinde iç sıcaklık yavaş yükselir; su kaynamadan iç 100 °C'yi geçemez. Sonda kalıptan çıkarıp ters çevirmek alt kabuğu kurutur.",
    },
  },

  tarih_fruktan: {
    kind: "olay",
    name: "Uzun mayalanmada fruktanlar",
    layers: {
      usta: "Uzun fermentasyonda mayalar ve bakteriler fruktanların çoğunu tüketir.",
      neden: "Buğdaydaki fruktanlar mayaların invertaz enzimiyle parçalanıp yakıt olur.",
      bilim: "12–48 saatlik fermentasyonlarda fruktanların büyük bölümü kaybolur (Loponen & Gänzle 2018). Bu bir sağlık vaadi değil, fermentasyonun kimyasıdır.",
    },
  },

  // ── Efsaneler ──
  efsane_hava: {
    kind: "efsane",
    name: "Efsane: maya havadan yakalanır",
    layers: {
      usta: "Mikroplar çoğunlukla undan gelir; havada daha çok küf sporu var.",
      neden: "500 ekşi maya karşılaştırıldığında coğrafyanın belirleyici olmadığı görüldü. Ana kaynak un ve tahıl tanesidir.",
      bilim: "Fırıncının elleri de mikrop taşır ama ana yapıdaki payı küçüktür. F. sanfranciscensis un böceklerinin bağırsağında yaşar.",
    },
  },

  efsane_colyak: {
    kind: "efsane",
    name: "Efsane: ekşi maya çölyağa uygundur",
    layers: {
      usta: "Değildir. Buğday ve çavdarla yapılan ekşi maya ekmeği gluten içerir.",
      neden: "Fermentasyon gluteni bir miktar parçalar ama kalan miktar 20 ppm güvenlik sınırının çok üstündedir.",
      bilim: "Çölyak hastaları için yalnız doğal olarak glutensiz unlarla yapılan ekmekler uygundur.",
    },
  },

  efsane_olu_maya: {
    kind: "efsane",
    name: "Efsane: 3. gün sessizleşen maya öldü",
    layers: {
      usta: "Ölmedi; asit yükseliyor, asıl topluluk yerleşiyor. Sabret.",
      neden: "İlk günün kabarması enterobakterilerdendi. Asit onları eledi; mayalar henüz azken gaz azalır.",
      bilim: "Yeni başlayanların çoğu mayayı tam bu sessiz evrede atar. Birkaç gün düzenli besleme mayaları getirir.",
    },
  },

  efsane_dolap_ekmek: {
    kind: "efsane",
    name: "Efsane: ekmek buzdolabında taze kalır",
    layers: {
      usta: "Tersine: buzdolabı bayatlamayı hızlandırır.",
      neden: "Nişastanın yeniden kristalleşmesi ~4 °C'de en hızlıdır. Saklamak için oda sıcaklığı (kısa süre) ya da derin dondurucu.",
      bilim: "Dondurulmuş dilimler kızartılınca neredeyse taze ekmek gibi olur.",
    },
  },

  // ── Tarih ──
  tarih_shubayqa: {
    kind: "tarih",
    name: "14.400 yıllık ekmek",
    layers: {
      usta: "En eski ekmek tarımdan binlerce yıl önce, yabani siyezle yapıldı.",
      neden: "Ürdün'de Shubayqa 1'de Natufi avcı-toplayıcıların ocaklarında kömürleşmiş ekmek kırıntıları bulundu.",
      bilim: "Yabani siyez, arpa ve saz yumrularından yapılmış mayasız yassı ekmek. İnsanlar ekmeği tarımdan önce yapmış olabilir.",
    },
  },

  tarih_karacadag: {
    kind: "tarih",
    name: "Siyezin evi: Karacadağ",
    layers: {
      usta: "Siyez Güneydoğu Anadolu'da, Karacadağ'da evcilleştirildi.",
      neden: "Genetik karşılaştırma, ekili siyezin en yakın yabani akrabasının Karacadağ dağlarında yetiştiğini gösterdi.",
      bilim: "Siyez (Triticum monococcum) en eski evcil buğdaylardandır. Gluteni zayıf ve az elastiktir; sarı rengini karotenoidler (lutein) verir.",
    },
  },

  tarih_cavdar: {
    kind: "tarih",
    name: "Çavdar neden hep ekşi?",
    layers: {
      usta: "Çavdarda amilaz güçlüdür; asit olmadan içi vıcık vıcık olur.",
      neden: "Çavdar nişastası düşük sıcaklıkta jelleşir; fırında güçlü amilaz bu jeli keser. Ekşi mayanın asidi amilazı frenler.",
      bilim: "Bu yüzden Kuzey ve Doğu Avrupa'nın çavdar ekmekleri yüzyıllardır ekşi mayayla yapılır ve kesilmeden 1–2 gün dinlendirilir.",
    },
  },
});
