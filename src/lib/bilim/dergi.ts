export type DergiSayiKodu = "01" | "02" | "03" | "04" | "05";

export interface DergiRakam {
  deger: string;
  birim: string;
  aciklama: string;
}

export interface DergiBolum {
  id: string;
  baslik: string;
  paragraflar: string[];
  formul?: string;
}

export interface DergiReelsSahne {
  sure: string;
  cekim: string;
  metin: string;
  ekranYazisi: string;
}

export interface DergiKaynak {
  yazarYil: string;
  baslik: string;
  dergi: string;
  doi?: string;
}

export interface DergiSayisi {
  kod: DergiSayiKodu;
  konuKodu: string;
  anId: string;
  ustEtiket: string;
  baslik: string;
  kancaSoru: string;
  ozet: string;
  okumaDakika: number;
  simulatorBreadType?: "wheat" | "rye";
  ilgiliArac?: { baslik: string; href: string };
  rakamlar: [DergiRakam, DergiRakam, DergiRakam];
  giris: string[];
  bolumler: DergiBolum[];
  efsane: {
    yanlis: string;
    gercek: string;
  };
  tezgahKurallari: [string, string, string];
  sepetOnerisi: {
    baslik: string;
    aciklama: string;
    birincilCta: { etiket: string; href: string };
    ikincilCta: { etiket: string; href: string };
  };
  reels: {
    baslik: string;
    toplamSure: string;
    sahneler: DergiReelsSahne[];
  };
  kaynaklar: DergiKaynak[];
}

export const DERGI_SAYILARI: readonly DergiSayisi[] = [
  {
    kod: "01",
    konuKodu: "KONU-01",
    anId: "eksi_mayanin_ilk_10_gunu",
    ustEtiket: "SAYI #01 · CANLI KAVANOZ & EKOLOJİ",
    baslik: "Kavanozdaki Görünmez Savaş: Ekşi Mayanın İlk 10 Günü",
    kancaSoru:
      "İkinci gündeki coşkulu köpük neden ekmek mayası değildir, dördüncü gündeki sessizlik neden ölüm sayılmaz ve pH 4,5 duvarı kavanozu nasıl temizler?",
    ozet:
      "Un ve suyun ilk buluşmasından 10. gündeki 100 bakteri : 1 maya dengesine kadar üç kuşaklık mikrobiyal bayrak yarışı, pKa asit fiziği ve maltoz kilidi.",
    okumaDakika: 7,
    ilgiliArac: {
      baslik: "Q10 Ekşi Maya Besleme Planlayıcısını Aç →",
      href: "/arac/maya-planlayici",
    },
    rakamlar: [
      {
        deger: "pH 4,5",
        birim: "güvenlik eşiği",
        aciklama:
          "İkinci günden sonra yabancı enterobakterileri ve bütirik asit üreten sporları devre dışı bırakan kritik asitlik sınırı.",
      },
      {
        deger: "4,75 / 3,86",
        birim: "asetik & laktik pKa",
        aciklama:
          "pH 4,5 çizgisinde asetik asidin %64'ü yüksüz hale geçerek yabancı bakteri zarından içeri sızar.",
      },
      {
        deger: "100 : 1",
        birim: "LAB : maya oranı",
        aciklama:
          "Olgun kavanozda gram başına yaklaşık 10⁹ laktik asit bakterisine karşılık 10⁷ maya hücresinin kurduğu denge.",
      },
    ],
    giris: [
      "Cam bir kavanoza yüz gram un ve yüz gram ılık su koyup tahta kaşıkla karıştırdığın an, dışarıdan bakıldığında son derece sakin, bej renkli bir hamur görürsün. Tezgâhta çıt çıkmaz. Oysa mikroskobik ölçekte, tahıl tarlasından ve değirmen taşından taşınan yüzlerce bakteri ve mantar türü için sert bir eleme yarışı başlamıştır.",
      "Ekşi maya kurmaya niyetlenen pek çok kişinin üçüncü veya dördüncü günde kavanozunu çöpe dökmesinin nedeni, iki kritik virajı yanlış okumasıdır: İkinci günde kapağı zorlayan iri köpükler 'mayam tuttu' sevinci yaratır; hemen ardından gelen dördüncü gündeki derin sessizlik ise 'mayam öldü' paniğine yol açar. Gerçekte ne ikinci gündeki kabarma ekmek mayasının eseridir ne de dördüncü gündeki durgunluk bir ölüm belirtisidir.",
    ],
    bolumler: [
      {
        id: "yalanci-kabarma",
        baslik: "1. İkinci Günün Tuzağı: Yalancı Kabarma ve pH 4,5 Çatalı",
        paragraflar: [
          "Yeni karıştırılmış un ve suyun başlangıç pH değeri nötre yakındır (pH 6,18–6,23). İlk yirmi dört saat boyunca kavanoza ekmeklik laktobasiller değil, başak yüzeyinden gelen Pantoea, Bacillus ve enterobakteriler hâkimdir; laktik asit bakterileri toplam okumaların henüz %1'inin bile altındadır.",
          "İkinci günde kavanozu iki katına çıkaran iri, sabun köpüğü benzeri kabarcıklar tam olarak bu öncü un bakterilerinin ve hızlı laktik kokların (Weissella, Lactococcus, Leuconostoc) glukozu parçalarken saldığı karbondioksit ve hidrojen gazıdır. Eğer kavanoz çok soğuk bırakılır veya ilk gün aşırı su-unla seyreltilirse pH 4,8–5,1 bandında takılı kalır ve Clostridium türleri bütirik asit üreterek keskin, bozuk tereyağımsı bir koku yayar. İkinci günün köpüklü hamuruyla ekmek pişirilmemesinin nedeni budur.",
        ],
      },
      {
        id: "bayrak-yarisi",
        baslik: "2. Üç Kuşaklık Bayrak Yarışı: Öncüler Neden Elendi?",
        paragraflar: [
          "İyi yönetilen bir kavanozda ikinci ile altıncı gün arasında üç basamaklı bir bayrak değişimi yaşanır. Birinci kuşakta (Gün 1–2) hızlı koklar ve Weissella hızla çoğalarak pH'yı 4,5'in altına çeker. Çavdar ve tam buğday unlarında 24. saatte Weissella okumaları %36 düzeyine kadar çıkar.",
          "Ancak pH 4,2'nin altına indiğinde bu öncüler kendi ürettikleri asitliğe dayanamaz; 72. saatte Weissella payı %5'e düşerken meydan Pediococcus ve çubuk formundaki laktobasillere geçer. Üçüncü günde tahılın kendi aspartik proteazları pH 3,5–4,5 aralığında en yüksek hızına ulaşır ve serbest amino asit derişimini 4,7 mmol/kg zirvesine taşır. Beşinci ve altıncı beslemeden sonra yabancı flora tamamen sıfırlanır; kavanoza Lactiplantibacillus plantarum ve Fructilactobacillus sanfranciscensis gibi asit ustaları yerleşir.",
        ],
      },
      {
        id: "pka-duvari",
        baslik: "3. pKa Fiziği: Asetik Asit Yabancı Hücre Zarını Nasıl Aşar?",
        formul: "pH = pKa + log10([A⁻] / [HA])",
        paragraflar: [
          "Hücre zarı yağsı bir çift katmandır; elektrik yüklü hidrojen iyonları (H⁺) bu duvardan doğrudan geçemez. Buna karşılık elektrik yükü taşımayan ayrışmamış organik asit molekülleri (HA) zardan içeri süzülür ve pH 7,0 civarındaki nötr sitoplazmaya girer girmez protonunu içeride bırakarak yabancı bakterinin enerji pompalarını tüketir.",
          "Laktik asidin pKa sabiti 3,86 iken asetik asidin pKa sabiti 4,75'tir. Hamur pH 4,5 eşiğine indiğinde laktik asidin %18,6'sı yüksüz formdayken, asetik asidin %64,0'ı yüksüz ve zar-geçirgen formdadır. Katı kıvamlı ve serin (23–25 °C) tutulan ekşi mayaların yabancı bakterilere ve küflere karşı çok daha dirençli olmasının arkasında bu pKa farkı yatar.",
        ],
      },
      {
        id: "dorduncu-gun-sessizligi",
        baslik: "4. Dördüncü Günün Sessizliği ve Maltoz Anahtarı",
        paragraflar: [
          "Üçüncü ve dördüncü günde köpüğün aniden sönmesi ölüm değil, görev değişimidir: gazcı un bakterileri elenmiş ama yabani mayalar henüz çoğalmamıştır. Çünkü buğday hamurunda serbest glukoz yalnızca 1–2 g/kg iken asıl yakıt 22 g/kg düzeyindeki maltozdur ve öncü bakteriler ilk günlerde serbest glukozu süpürür.",
          "Beşinci güne doğru yerleşik laktobasillerde maltoz fosforilaz enzimi devreye girip dışarıya serbest glukoz bıraktığında maya patlaması yaşanır: yabani mayalar gramda 10⁷ hücreye fırlar ve besleme sonrası 4–6 saat içinde kubbeli, düzenli kabarma başlar.",
        ],
      },
    ],
    efsane: {
      yanlis:
        "Kavanozum 2. günde taştı, ekşi mayam hazır! 4. günde ise hiç kabarmadı, mayam öldü; çöpe dökmeliyim.",
      gercek:
        "2. gün kabarması enterobakteri ve öncü kokların 'yalancı kabarmasıdır'. 4. gün sessizliği ise pH 4,5 duvarının yabancı florayı sildiği temizlik evresidir; düzenli beslemeyle 6–8. günde gerçek maya dengesi kurulur.",
    },
    tezgahKurallari: [
      "İlk 36 saatte kavanozu günde 2–3 kez yüksek un-su oranıyla yenileyip asidi seyreltme; pH 4,5 altına hızla inmesi için öncü asitleşmeye izin ver.",
      "İlk 3 günde beslemeye %25–50 taş değirmen tam çavdar veya tam buğday unu kat; kepek katmanı doğal bakteri-maya aşısını ve mineral tamponunu taşır.",
      "5. günden sonra kavanozu 23–25 °C aralığında tut; beslemeden 4–6 saat sonra hacim düzenli ikiye katlanıp yoğurt-olgun elma kokusu oturduğunda ilk hamurunu yoğur.",
    ],
    sepetOnerisi: {
      baslik: "Canlı Ekşi Mayanın Taş Fırındaki Somut Hali",
      aciklama:
        "Kavanozdaki 100:1 dengesiyle kurulan, ticari hazır maya girmeden 24 saat soğuk fermantasyonla olgunlaşan günlük taş fırın somunlarımızı ve doğal mandıra eşlikçilerini keşfet.",
      birincilCta: { etiket: "Günlük Taş Fırın Ekmeklerini Gör →", href: "/#ekmekler" },
      ikincilCta: { etiket: "Doğal Yoğurt & Mandıra Seçkisi →", href: "/#sarkuteri" },
    },
    reels: {
      baslik: "4. Günde Duran Ekşi Mayan Öldü mü? Sakın Çöpe Dökme!",
      toplamSure: "48 sn · 9:16 Dikey S24 Çekimi",
      sahneler: [
        {
          sure: "00:00 – 00:10",
          cekim: "Tezgâhta cam kavanozda 2. gün köpüren hamur ve hemen yanında 4. gün durgun kavanoz.",
          metin:
            "Ekşi mayan ikinci gün kavanozdan taştı, dördüncü gün ise bıçak gibi kesilip sustu diye çöpe mi döküyorsun? Dur, tam kazanmak üzereyken vazgeçiyorsun!",
          ekranYazisi: "4. GÜN SESSİZLİĞİ ÖLÜM DEĞİL!",
        },
        {
          sure: "00:10 – 00:24",
          cekim: "Kaşıkla kavanozun iç dokusunu gösterme; pH düşüşü notu.",
          metin:
            "İkinci gündeki o dev kabarcıklar ekmek mayası değil; unun içinden uyanan yabani öncü bakterilerin yalancı kabarmasıdır.",
          ekranYazisi: "2. Gün = Yalancı Kabarma",
        },
        {
          sure: "00:24 – 00:38",
          cekim: "Tam buğday/çavdar unuyla 1:1:1 besleme anı, tahta kaşıkla karıştırma.",
          metin:
            "Dördüncü günde pH dört buçuğun altına iner. Asetik ve laktik asit yabancı bakterileri temizler; kavanoz sessizleşir ve gerçek ekşi maya mayalarına yer açılır.",
          ekranYazisi: "pH < 4,5 Güvenlik Duvarı",
        },
        {
          sure: "00:38 – 00:48",
          cekim: "Olgun, ağsı gözenekli ana maya ve taş fırından çıkan somun kesiti.",
          metin:
            "Kavanozu dökme; günde bir kez düzenli beslemeye devam et. Altıncı günde yüz bakteriye bir maya dengesi kurulduğunda gerçek ekmeğin başlayacak!",
          ekranYazisi: "100 Bakteri : 1 Maya · EkmekLab",
        },
      ],
    },
    kaynaklar: [
      {
        yazarYil: "González-Alonso ve ark. (2024)",
        baslik: "Microbial succession and metabolite dynamics during spontaneous triticale sourdough backslopping",
        dergi: "Food Microbiology",
      },
      {
        yazarYil: "Van der Meulen ve ark. (2007)",
        baslik: "Population dynamics and metabolite target analysis of lactic acid bacteria during laboratory fermentations of wheat and spelt sourdoughs",
        dergi: "Applied and Environmental Microbiology, 73(15), 4741–4750",
        doi: "10.1128/AEM.00315-07",
      },
      {
        yazarYil: "Oshiro, Zendo & Nakayama (2021)",
        baslik: "Maltose liberation by lactic acid bacteria triggers yeast bloom in sourdough ecosystem",
        dergi: "Applied and Environmental Microbiology",
      },
      {
        yazarYil: "Di Biase ve ark. (2022)",
        baslik: "Cardinal growth parameters and undissociated lactic acid inhibition in Lactiplantibacillus plantarum",
        dergi: "Foods",
      },
    ],
  },
  {
    kod: "02",
    konuKodu: "KONU-05",
    anId: "cavdar_unu_suyla_bulusunca",
    ustEtiket: "SAYI #02 · ÇAVDAR FİZİĞİ & SAKLAMA DENEYİ",
    baslik: "Glutensiz İskelet: Çavdar Hamuru Neden Yoğrulmaz ve 24 Saat Bıçak Vurulmaz?",
    kancaSoru:
      "Yüzde yüz çavdar hamurunu buğday gibi yoğurursan neden çamura döner, fırından çıkar çıkmaz kesersen bıçağa neden zamk gibi sıvanır?",
    ozet:
      "Sekalin proteinleri, kendi ağırlığının 100 katı su bağlayan arabinoksilan jeli, 51,5–74 °C nişasta-amilaz yarışı ve +4 °C buzdolabı bayatlama tuzağı.",
    okumaDakika: 8,
    simulatorBreadType: "rye",
    rakamlar: [
      {
        deger: "100×",
        birim: "su bağlama",
        aciklama:
          "Çavdardaki çözünür arabinoksilan (pentozan) liflerinin kendi ağırlıklarına kıyasla tutabildiği su kapasitesi.",
      },
      {
        deger: "51,5–74 °C",
        birim: "amilaz penceresi",
        aciklama:
          "Fırında çavdar nişastasının jelatinleştiği ama alfa-amilaz enziminin henüz sönmediği tehlikeli sıcaklık kuşağı.",
      },
      {
        deger: "+%398",
        birim: "+8 °C'de sertleşme",
        aciklama:
          "Soğuk dolapta saklanan çavdar ekmeği içinin 7 günde uğradığı retrogradasyon sertlik artışı (oda sıcaklığında +%93).",
      },
    ],
    giris: [
      "Buğday hamuruyla çalışan bir el, her zaman gergin zarın peşindedir: yoğurdukça toparlanan, çekildiğinde incecik açılıp yay gibi geri dönen elastik bir gluten ağı arar. Aynı el yüzde yüz taş değirmen çavdar ununa su verdiğinde ise bambaşka bir fizik dünyasına çarpar. Hamuru ne kadar uzun yoğurursan eline o kadar zamk gibi sıvanır, parlaklığını yitirir ve ağır bir çamura döner.",
      "İkinci sürpriz fırından çıkışta yaşanır. Doksan sekiz derece iç sıcaklığa ulaşıp nar gibi kızarmış bir kalıp çavdar somununa daha dumanı tüterken bıçağı vurursan, dilim temizce ayrılmaz; bıçağın iki yüzüne yapışkan bir hamur tabakası bulaşır. Çavdar bozuk değildir — yalnızca iskeletini proteinden değil, şeker liflerinden ve zamandan kurar.",
    ],
    bolumler: [
      {
        id: "arabinoksilan-jeli",
        baslik: "1. Sekalin Neden Ağ Kuramaz, Hamuru Kim Taşır?",
        paragraflar: [
          "Çavdar ununda da %9–12 civarında protein vardır; ancak bu depo proteinleri buğdaydaki glutenin değil sekalindir (32–90 kDa). Hem molekül mimarileri kesintisiz dev ağlar kurmaya elverişsizdir hem de unun %7–9'unu oluşturan arabinoksilan (pentozan) lifleri protein uçlarının arasına fiziksel bir perde gibi girer.",
          "Çavdar hamurunun gerçek taşıyıcı kolonu işte bu arabinoksilan lifleridir. Suda çözünen arabinoksilanlar (WEAX) kendi kütlelerinin yüz katına kadar su bağlayarak ferulik asit köprüleriyle koyu kıvamlı bir hidrojel örer. Bu hassas jeli mikserde yüksek devirde uzun süre döversen olmayan gluteni geliştirmezsin; tam tersine şişmiş lif jelini mekanik olarak yırtıp bağlı suyu dışarı sızdırırsın. Çavdar yoğrulmaz; 6–10 dakika düşük devirde nazikçe karıştırılır.",
        ],
      },
      {
        id: "amilaz-saldirisi",
        baslik: "2. Fırındaki 22 Derecelik Tehlike: Nişasta Saldırısı ve Ekşi Maya Kilidi",
        paragraflar: [
          "Buğday nişastası fırında 58–64 °C civarında jelatinleşirken, çavdar nişastası çok daha erken, 51,5–53 °C'de şişip açılmaya başlar. Sorun şudur: tahılın kendi nişasta kesici enzimi olan alfa-amilaz, en yüksek yıkım hızına 60–65 °C'de ulaşır ve ancak 72–74 °C üzerinde ısısal olarak söner.",
          "Eğer çavdar hamurunu yalnızca ticari mayayla nötr pH'da fırına sürersen, iç sıcaklık 52 °C'den 74 °C'ye tırmanana kadar geçen dakikalar boyunca alfa-amilaz şişmiş nişasta zincirlerini makas gibi doğrar ve somunun ortasını yapışkan dekstrin çamuruna çevirir ('starch attack'). Güçlü ekşi maya kullanarak hamur pH'sını 4,1–4,3 bandına indirdiğinde ise alfa-amilaz erkenden frenlenir ve nişasta iskeleti fırından sağlam çıkar.",
        ],
      },
      {
        id: "yirmi-dort-saat-bekleme",
        baslik: "3. Neden Fırından Çıkınca 24 Saat Bıçak Vurulmaz?",
        paragraflar: [
          "Buğday somununda pişmiş gluten duvarları 1–2 saatlik soğumadan sonra bıçağı karşılayacak esnekliğe kavuşur. Yüzde yüz çavdar somununda ise yükü yeni jelatinleşmiş sıcak nişasta ve arabinoksilan jeli taşır; 70–90 °C iç sıcaklıkta bu jel henüz akışkan ve yapışkandır.",
          "Somun oda sıcaklığında keten bez içinde 18–24 saat dinlendiğinde iki kritik dönüşüm tamamlanır: amiloz zincirleri hızla kristalleşerek her dilime kesilebilir bir omurga kazandırır ve kabuk altındaki yoğun nem merkeze doğru yeniden dengelenir. İkinci günde kesilen kalıp çavdarın bıçağa hiç bulaşmadan tereyağı gibi dilimlenmesinin ve aromasının oturmasının sırrı bu 24 saatlik dinlenmedir.",
        ],
      },
      {
        id: "buzdolabi-tuzagi",
        baslik: "4. Buzdolabı Tuzağı: +4 °C Neden Bayatlamayı Hızlandırır?",
        paragraflar: [
          "Ekmeğin bayatlaması kuruma değil, nişastadaki amilopektin yan dallarının yeniden kristal kafesler kurarak suyu sert bir yapıya hapsetmesidir (retrogradasyon). Bu kristalleşmenin en hızlı çalıştığı sıcaklık penceresi +2 °C ile +8 °C arasıdır — yani tam olarak evdeki buzdolabının içi!",
          "Ölçümlerde oda sıcaklığında (20 °C) saklanan çavdar içi bir haftada %93 sertleşirken, +8 °C dolapta saklanan aynı ekmek %398 sertleşmiştir. Çavdar somunu ilk birkaç gün kesik yüzeyi tahtaya kapatılarak oda sıcaklığında muhafaza edilir; uzun saklanacaksa dilimlenip -18 °C derin dondurucuya konur ve yeneceği sabah kızartılarak >60 °C üzerinde kristalleri yeniden çözülür.",
        ],
      },
    ],
    efsane: {
      yanlis:
        "Ekmeği buzdolabına (+4 °C) koyarsam bayatlamaz; fırından sıcak çıkan çavdar ekmeği de en güzel sıcak sıcak kesilir.",
      gercek:
        "Sıcak kesilen %100 çavdarın nişasta jeli henüz oturmadığı için bıçağa sıvanır; 24 saat dinlenmelidir. +4 °C buzdolabı ise amilopektin kristalleşmesini oda sıcaklığına göre katbekat hızlandırır.",
    },
    tezgahKurallari: [
      "%100 çavdar hamurunu asla buğday gibi uzun yoğurma; 6–10 dakika nazikçe karıştır, pH 4,2 ekşi mayayla kur ve kalıpta pişir.",
      "Fırından çıkan kalıp çavdar somununa ilk 24 saat bıçak vurma; keten bez veya kraft torbada iç jelin kilitlenmesini bekle.",
      "Ekmeği asla +4 °C buzdolabına koyma; birkaç günlük tüketimde oda sıcaklığında tut, fazlasını dilimleyip -18 °C dondurucuya kaldır.",
    ],
    sepetOnerisi: {
      baslik: "Kalıp Çavdar × Tereyağı & Kavurma Uyumu",
      aciklama:
        "24 saat dinlendirilmiş yoğun gözenekli kalıp çavdar dilimi, üzerinde eriyen köy tereyağı ve taş fırın kavurmasıyla dağılmayan tok bir sofra tabanı kurar.",
      birincilCta: { etiket: "Çavdar ve Özel Somunları İncele →", href: "/#ekmekler" },
      ikincilCta: { etiket: "Tereyağı & Kavurma Eşlikçileri →", href: "/#sarkuteri" },
    },
    reels: {
      baslik: "Çavdar Hamurunu Yoğurursan Neden Çamura Döner?",
      toplamSure: "50 sn · 9:16 Dikey S24 Çekimi",
      sahneler: [
        {
          sure: "00:00 – 00:09",
          cekim: "Tezgâhta parmaklara zamk gibi sıvanan ıslak %100 tam çavdar hamuru.",
          metin:
            "Yüzde yüz çavdar hamurunu buğday gibi yoğurmaya kalktın mı? Ne kadar uzun yoğurursan toparlanmak yerine eline o kadar sıvanır ve çamura döner!",
          ekranYazisi: "ÇAVDAR NEDEN YOĞRULMAZ?",
        },
        {
          sure: "00:09 – 00:23",
          cekim: "Çavdar ununun dokusu ve su eklendiğinde koyulaşan kıvamı.",
          metin:
            "Çünkü çavdardaki sekalin proteinleri buğdaydaki gibi esnek bir gluten ağı kuramaz. Hamuru taşıyan asıl iskelet, kendi ağırlığının yüz katı su emen arabinoksilan lifleridir.",
          ekranYazisi: "Arabinoksilan Jeli: 100× Su",
        },
        {
          sure: "00:23 – 00:37",
          cekim: "Hamurun metal kalıba sıyrılması ve ıslak el/spatulayla üstünün düzeltilmesi.",
          metin:
            "Sen bu jeli hızlıca yoğurursan olmayan gluteni kurmazsın, şişmiş lif jelini yırtarsın. Üstelik güçlü ekşi maya kullanmazsan fırında amilaz enzimi ekmeğin içini hamur bırakır.",
          ekranYazisi: "Nazik Karışım + pH 4,2 Ekşi Maya",
        },
        {
          sure: "00:37 – 00:50",
          cekim: "24 saat dinlenmiş kalıp çavdarın bıçağa hiç yapışmadan pürüzsüz dilimlenmesi ve tereyağı sürülmesi.",
          metin:
            "Kural net: nazikçe karıştır, kalıpta pişir ve fırından çıkınca tam yirmi dört saat bıçak vurma. Ertesi gün tereyağıyla dilimlediğinde farkı göreceksin!",
          ekranYazisi: "24 Saat Dinlenme · EkmekLab",
        },
      ],
    },
    kaynaklar: [
      {
        yazarYil: "Oest ve ark. (2020)",
        baslik: "Rye bread defects: analysis of composition and viscosity during sourdough fermentation and baking",
        dergi: "Foods, 9(12), 1900",
        doi: "10.3390/foods9121900",
      },
      {
        yazarYil: "Alpers ve ark. (2021)",
        baslik: "Impact of storing condition on staling and microbial spoilage behavior of bread and their contribution to preventable food waste",
        dergi: "Foods, 10(1), 76",
        doi: "10.3390/foods10010076",
      },
      {
        yazarYil: "Stępniewska ve ark. (2021)",
        baslik: "Assessment of baking quality of rye flours based on enzymatic and viscometric profiles",
        dergi: "Cereal Chemistry",
      },
      {
        yazarYil: "Buksa ve ark. (2016)",
        baslik: "Arabinoxylan-protein cross-linking and water binding in wholemeal rye dough",
        dergi: "Journal of Cereal Science",
      },
    ],
  },
  {
    kod: "03",
    konuKodu: "KONU-02",
    anId: "ayni_sofrada",
    ustEtiket: "SAYI #03 · MİKROBİYAL BARIŞ ANTLAŞMASI",
    baslik: "100 Bakteriye 1 Maya: Ekşi Mayanın İki Ortağı Şekeri Nasıl Bölüşüyor?",
    kancaSoru:
      "Aynı besin kavanozunu paylaşan milyarlarca bakteri ile yabani maya neden birbirini aç bırakıp yok etmiyor?",
    ozet:
      "Maltoz fosforilaz enziminin sıfır ATP maliyetli şeker kırma tekniği, Kazachstania humilis'in maltoz körlüğü, fruktoz–mannitol elektron havuzu ve FQ 2,5 aroma dengesi.",
    okumaDakika: 7,
    ilgiliArac: {
      baslik: "Fırıncı Yüzdesi Ölçekleyicisini Aç →",
      href: "/arac/firinci-yuzdesi",
    },
    rakamlar: [
      {
        deger: "0 ATP",
        birim: "maltoz kırma maliyeti",
        aciklama:
          "F. sanfranciscensis maltoz fosforilaz (EC 2.4.1.8) ile inorganik fosfat kullanarak enerji harcamadan şekeri böler.",
      },
      {
        deger: "+1 ATP",
        birim: "fruktoz ikramiyesi",
        aciklama:
          "Fruktoz mannitole indirgendiğinde asetat kinaz yolu açılır; bakteri fazladan enerji ve asetik asit üretir.",
      },
      {
        deger: "2,0 – 2,7",
        birim: "fermantasyon katsayısı",
        aciklama:
          "Dengeli taş fırın aroması için laktik asidin asetik aside ideal molar oranı (FQ).",
      },
    ],
    giris: [
      "Ekolojinin temel kurallarından biri şunu söyler: Daracık bir ortamda aynı sınırlı yiyecek için yarışan iki tür sonsuza dek yan yana yaşayamaz; hızlı olan besini süpürür ve yavaş ortağı tasfiye eder. Oysa yüz yıllık ekşi maya kavanozlarını açtığında dünyanın her yerinde aynı iki ortağı omuz omuza görürsün: Fructilactobacillus sanfranciscensis bakterisi ve Kazachstania humilis yabani mayası.",
      "Hamurun her gramında yaklaşık bir milyar bakteriye karşılık on milyon maya hücresi yaşar — yani yüz bakteriye tek bir maya. Buna rağmen ne bakteri mayayı asitle boğar ne de maya unun şekerini bitirip bakteriyi aç bırakır. Çünkü aralarında romantik bir dostluk değil, atomik düzeyde imzalanmış bir şeker bölüşüm sözleşmesi vardır.",
    ],
    bolumler: [
      {
        id: "maltoz-fosforilaz",
        baslik: "1. Maltoz Fosforilaz: Bedava Enerji ve Dışarı Bırakılan Glukoz",
        formul: "Maltoz + Pᵢ → β-D-Glukoz-1-fosfat + Serbest D-Glukoz",
        paragraflar: [
          "Un suyla buluştuğunda tahılın amilaz enzimleri nişastayı kırarak ortamı iki halkalı maltoz şekerine doyurur. Sıradan fırıncı mayası veya klasik bakteriler maltozu suyla kesip iki glukoza ayırır ve bunları yakabilmek için cebinden 2 molekül ATP enerji harcar.",
          "F. sanfranciscensis ise maltoz fosforilaz (EC 2.4.1.8) enzimini kullanır: su yerine hücre içindeki inorganik fosfatı takarak tek kuruş ATP harcamadan bir adet glukoz-1-fosfat elde eder. Üstelik maltoz bolken kendi hekzokinaz enzimini kapattığı için, reaksiyonun diğer yarısı olan serbest glukozu içeride biriktirmez; osmotik yükü dengelemek için doğrudan dışarıya, hamurun içine pompalar.",
        ],
      },
      {
        id: "maltoz-korlugu",
        baslik: "2. Yabani Mayanın 'Maltoz Körlüğü' Kavganın Önünü Nasıl Keser?",
        paragraflar: [
          "Eğer kavanozdaki maya marketten alınan ticari maya (Saccharomyces cerevisiae) olsaydı hem maltoza hem glukoza saldırır ve bakteriyle doğrudan besin savaşına girerdi. Geleneksel ekşi mayanın asıl mayası Kazachstania humilis ise maltoz-negatiftir: maltoz şekerine karşı tamamen kördür, önüne saf maltoz koysan tüketemez.",
          "İşte barış antlaşması tam burada kilitlenir: bakteri mayanın dokunamadığı maltozu kırar; maya ise bakterinin dışarı attığı serbest glukozu toplayarak karbondioksit gazı üretir ve hamuru kabartır. Kimse diğerinin tabağına el uzatmadığı için ortaklık yıllarca bozulmadan sürer.",
        ],
      },
      {
        id: "fruktoz-mannitol",
        baslik: "3. Fruktoz–Mannitol Havuzu ve Fermantasyon Katsayısı (FQ)",
        paragraflar: [
          "Bu ortaklığın lezzet tarafını ise fruktoz yönetir. F. sanfranciscensis zorunlu heterofermentatif bir bakteridir; glukozu parçalarken içeride fazladan elektron (NADH) birikir. Ortamda undan gelen fruktoz varsa bakteri bunu mannitol dehidrogenaz enzimiyle mannitole çevirerek elektron yükünü boşaltır.",
          "Elektron yükü boşaldığı anda bakteri etanol yapmak yerine asetat kinaz yolunu açar; hem kendine fazladan +1 ATP enerji üretir hem de hamura meyvemsi, uçucu asetik asit bırakır. Laktik asidin asetik aside molar oranı olan Fermantasyon Katsayısı (FQ) 2,0–2,7 bandına oturduğunda, yoğurtsu yumuşak ekşilik ile taş fırın kabuğunda parlayan aromatik derinlik tam dengeye gelir.",
        ],
      },
    ],
    efsane: {
      yanlis:
        "Ekşi mayanın içine bir çimdik hazır paket maya atarsam ekşi mayam daha güçlü ve uyumlu çalışır.",
      gercek:
        "Ticari S. cerevisiae maltoz-pozitiftir; F. sanfranciscensis'in birincil yakıtı olan maltoza doğrudan ortak olup bakteriyi rekabet stresine sokar ve yüz yıllık niş ayrışmasını bozar.",
    },
    tezgahKurallari: [
      "Daha yumuşak ve yoğurtsu bir iç doku istiyorsan sıvı besleme (%100 hidrasyon) ve 26–27 °C ılık fermantasyon seç (laktik asit öne çıkar).",
      "Daha belirgin kabuk aroması ve küfe dayanıklı somun istiyorsan katı ön maya (%50–60 su) ve +4 °C uzun soğuk fermantasyon uygula (asetik denge FQ ~2,5 olur).",
      "Ana ekşi mayana dışarıdan ticari paket maya karıştırma; düzenli besleme ritmiyle kendi K. humilis – laktobasil ortaklığını sabit tut.",
    ],
    sepetOnerisi: {
      baslik: "24–36 Saat Soğuk Fermantasyonlu Somunlar",
      aciklama:
        "FQ 2,5 dengesiyle yoğrulan, keskin ekşilik yerine buğdayın fındıksı ve sütlü aromalarını öne çıkaran taş fırın ekmeklerimizi sofralık eşlikçilerle dene.",
      birincilCta: { etiket: "Taze Somunları Seç →", href: "/#ekmekler" },
      ikincilCta: { etiket: "Eşlikçileri İncele →", href: "/#sarkuteri" },
    },
    reels: {
      baslik: "100 Bakteriye 1 Maya: Neden Birbirlerini Yok Etmiyorlar?",
      toplamSure: "46 sn · 9:16 Dikey S24 Çekimi",
      sahneler: [
        {
          sure: "00:00 – 00:09",
          cekim: "Kavanozda kabarcıklanan canlı ekşi mayaya yakın plan.",
          metin:
            "Ekşi maya kavanozundaki her yüz bakteriye karşılık yalnızca tek bir maya hücresi yaşar. Peki neden birbirlerinin yiyeceğini bitirip yok etmiyorlar?",
          ekranYazisi: "100 BAKTERİYE 1 MAYA!",
        },
        {
          sure: "00:09 – 00:22",
          cekim: "Unun suyla karışması ve aktif levain dokusunun kaşıkla kaldırılması.",
          metin:
            "Çünkü ekşi maya bakterisi unun maltoz şekerini sıfır enerji harcayarak ikiye böler; yarısını kendi yakar, diğer yarısı olan serbest glukozu dışarı bırakır.",
          ekranYazisi: "Maltoz Fosforilaz: Sıfır ATP",
        },
        {
          sure: "00:22 – 00:35",
          cekim: "Kabaran hamur yüzeyi ve kesitteki gözenek yapısı.",
          metin:
            "Ortağı olan yabani maya ise maltoza tamamen kördür! Bakterinin maltozuna hiç dokunamaz; yalnızca dışarı sızan o serbest glukozla beslenip hamuru kabartır.",
          ekranYazisi: "Maltoz Körlüğü = Sıfır Kavga",
        },
        {
          sure: "00:35 – 00:46",
          cekim: "Taş fırından çıkan kızarmış somunun kabuk çıtırtısı.",
          metin:
            "Bakteri asit kalkanı kurup glukoz verir, maya ise gaz basıp somunu yükseltir. Gerçek ekşi mayanın sırrı bu kusursuz iş bölümüdür!",
          ekranYazisi: "Büyük Ortaklık · EkmekLab",
        },
      ],
    },
    kaynaklar: [
      {
        yazarYil: "Gänzle (2014)",
        baslik: "Enzymatic and bacterial conversions during sourdough fermentation",
        dergi: "Food Microbiology, 37, 2–10",
        doi: "10.1016/j.fm.2013.04.007",
      },
      {
        yazarYil: "De Vuyst, Van Kerrebroeck & Leroy (2017)",
        baslik: "Microbial Ecology and Process Technology of Sourdough Fermentation",
        dergi: "Advances in Applied Microbiology, 100, 49–160",
        doi: "10.1016/bs.aambs.2017.02.003",
      },
      {
        yazarYil: "Gobbetti, De Angelis, Corsetti & Di Cagno (2005)",
        baslik: "Biochemistry and physiology of sourdough lactic acid bacteria",
        dergi: "Trends in Food Science & Technology, 16, 57–69",
      },
    ],
  },
  {
    kod: "04",
    konuKodu: "KONU-14",
    anId: "yogurma_tezgahinda",
    ustEtiket: "SAYI #04 · HAMUR REOLOJİSİ & TEZGÂH FİZİĞİ",
    baslik: "Pencere Testi Yanılsaması: Hamur Yoğruldukça Nasıl Güçlenir ve Bir Anda Neden Çöker?",
    kancaSoru:
      "Tül gibi incecik açılan ama parmaklara yapışan zar neden ustalık değil aşırı yoğurma enkazıdır ve 60 dakikalık dinlenme ağı nasıl onarır?",
    ozet:
      "Gliadin akışkanlığı ile Glutenin Makro-Polimeri (GMP) devliği, tiyol–disülfit (SH–SS) takası, aşırı yoğurma kırılması ve 60 dakikalık repolimerizasyon penceresi.",
    okumaDakika: 8,
    ilgiliArac: {
      baslik: "DDT İstenen Hamur Sıcaklığı Hesaplayıcısı →",
      href: "/arac/ddt",
    },
    rakamlar: [
      {
        deger: "-%20,2",
        birim: "GMP kırılması",
        aciklama:
          "Yoğurma süresi 3 dakikadan 5 dakikaya çıktığında mekanik kesmeyle depolimerize olan dev glutenin jeli oranı.",
      },
      {
        deger: "60 dk",
        birim: "onarım zirvesi",
        aciklama:
          "Yoğurma sonrası dinlenmede serbest tiyollerin yeniden disülfit (—S—S—) köprüsü kurarak GMP'yi tepeye taşıdığı süre.",
      },
      {
        deger: "%2,0",
        birim: "tuz perdelemesi",
        aciklama:
          "Na⁺ ve Cl⁻ iyonlarının protein yüzey yüklerini perdeleyerek zincirlerin birbirine kenetlenmesini hızlandıran oranı.",
      },
    ],
    giris: [
      "Her fırıncının hafızasında en az bir kez yaşadığı şaşırtıcı bir an vardır: Mikser kazanında pürüzsüzleşip fildişi gibi parlayan, kazanın kenarlarını tok tokatlarla sıyıran hamur, yalnızca birkaç dakika fazla dönünce bir anda parlaklığını yitirir ve kazanın dibine zamk gibi yayılır.",
      "Elini uzatıp bir parça koparırsın; hamur iki parmağının arasında tül kadar incecik açılır. İlk bakışta kusursuz bir pencere testi sanırsın — ama o zarın hiçbir yaylanma direnci yoktur; parmağına yapışır ve tezgâhta su gibi akar. Gördüğün şey ustalık değil, kovalent bağları koparılmış bir protein enkazıdır.",
    ],
    bolumler: [
      {
        id: "gliadin-glutenin",
        baslik: "1. Gliadin Akışkanlığı ve Glutenin Makro-Polimeri (GMP)",
        paragraflar: [
          "Buğday gluteni tek bir madde değil, zıt huylu iki kardeş proteinin ortaklığıdır: tek zincirli yuvarlak gliadinler hamura uzama ve akışkanlık verirken, milyonlarca Dalton kütleye ulaşan polimerik gluteninler uç uca disülfit (—S—S—) köprüleriyle bağlanarak hamurun yay gibi geri çekilen elastik iskeletini kurar.",
          "Bu glutenin zincirlerinin en devasa bölümü SDS çözeltisinde bile çözünmeyen şeffaf bir jel oluşturur: Glutenin Makro-Polimeri (GMP). Fırın sıçramasını ve somun hacmini belirleyen birincil omurga tam olarak bu GMP tabakasıdır.",
        ],
      },
      {
        id: "sh-ss-takasi",
        baslik: "2. Tiyol–Disülfit Takası ve Aşırı Yoğurma Kırılması",
        paragraflar: [
          "Hamur yoğrulurken kuru undaki kaba GMP kümeleri mekanik kuvvetle parçalanır (-%20,2 azalma) ve açılan uçlar tüm hamura homojen yayılır. Zincirlerin kopmadan birbiri üzerinden kaymasını sağlayan motor tiyol–disülfit (SH–SS) takasıdır: serbest tiyol (—SH) uçları saniyede milyonlarca kez komşu disülfit bağlarıyla yer değiştirir; 5 dakikalık optimal yoğurmada serbest tiyol 6,27'den 4,11 µmol/g düzeyine inerek ağa kilitlenir.",
          "Ancak yoğurma haddinden fazla uzatıldığında mekanik kesme kuvveti bu takas hızını aşar ve kovalent disülfit bağlarını doğrudan koparır. 15 dakikalık aşırı yoğurmada serbest tiyoller yeniden 4,72 µmol/g'ye fırlar; elektron mikroskobunda ipeksi gluten çarşafının yırtılıp kopuk topaklara dönüştüğü görülür.",
        ],
      },
      {
        id: "altmis-dakika-dinlenme",
        baslik: "3. Dinlenmenin Fiziği: 60 Dakikalık Repolimerizasyon Zirvesi",
        paragraflar: [
          "Hamur yalnızca yoğrularak değil, dinlenerek inşa edilir. Mikser durduğunda kesme gerilimi sıfırlanır ve hamurdaki çözünmüş oksijen serbest tiyol uçlarını yeniden disülfit köprülerine bağlar (repolimerizasyon). Feng ve ekibinin ölçümlerinde bu onarım tam 60. dakikada zirveye ulaşır; disülfit bağları 3,02 µmol/g'ye tırmanırken proteinler gerilmeye en dayanıklı beta-tabaka dizilimine geçer.",
          "Yoğurma sonrası ilk saatte 45–60 dakika arayla yapılan 2–3 nazik katlama ve %2 tuzun yarattığı elektrostatik yük perdelemesi, kovalent bağları hiç yıpratmadan zincirleri tek yönde hizalar ve fırın sıçraması için gaz tutan ince zarları hazırlar.",
        ],
      },
    ],
    efsane: {
      yanlis:
        "Hamuru mikserde ne kadar uzun yoğurursam gluteni o kadar sağlam olur; çok ince açılan her pencere zarı başarı işaretidir.",
      gercek:
        "Aşırı yoğurma disülfit bağlarını fiziksel olarak koparır. Parmağa yapışan ve geri yaylanmayan tül zar güç değil, iskeleti yıkılmış gliadin akıntısıdır; hamur kazanı sıyırdığı an durulup 60 dakikalık dinlenme ve katlamaya geçilmelidir.",
    },
    tezgahKurallari: [
      "Kronometreye değil dokuya ve sıcaklığa bak: hamur kazanı sıyırıp parlaklaştığında dur; yoğurma sonu hamur sıcaklığını 24–26 °C bandında tut.",
      "Pencere testinde yalnız inceliğe değil geri yaylanmaya bak: sağlam zar parmağa zamk gibi yapışmaz, çekildiğinde esnekçe geri toplar.",
      "Yoğurma bitiminden sonraki ilk 60 dakikayı katlama ve dinlenme penceresi olarak kullan; eğer hamuru yanlışlıkla aşırı yoğurduysan un ekleme, hemen +4 °C soğuk dolaba alıp dinlendir.",
    ],
    sepetOnerisi: {
      baslik: "Doğru Yoğrulmuş & Katlanmış Atalık ve Taş Değirmen Somunları",
      aciklama:
        "Sıcaklığı ölçülerek yoğrulan, 60 dakikalık katlama pencereleriyle iskeleti kurulan ve taş tabanda 20 dakika buharla sıçrayan ekşi mayalı ekmeklerimiz.",
      birincilCta: { etiket: "Taş Fırın Somunlarını İncele →", href: "/#ekmekler" },
      ikincilCta: { etiket: "DDT Su Sıcaklığını Hesapla →", href: "/arac/ddt" },
    },
    reels: {
      baslik: "Pencere Testi Yanılsaması: Hamurunu Aşırı Yoğurarak Öldürme!",
      toplamSure: "48 sn · 9:16 Dikey S24 Çekimi",
      sahneler: [
        {
          sure: "00:00 – 00:10",
          cekim: "İki el arasında çok ince açılan ama sarkıp yapışan zar vs. yay gibi geri toparlanan sağlam zar.",
          metin:
            "Hamurun tül gibi incecik zar veriyor diye seviniyorsan dikkat: eğer o zar parmağına yapışıp geri yaylanmıyorsa hamurunu az önce aşırı yoğurmuş olabilirsin!",
          ekranYazisi: "PENCERE TESTİ YANILSAMASI",
        },
        {
          sure: "00:10 – 00:23",
          cekim: "Spiral kazanda pürüzsüz toparlanan hamur görüntüsü.",
          metin:
            "Hamuru taşıyan dev glutenin makropolimeri yoğurma uzadıkça sonsuza dek gelişmez; kanca fazladan döndüğünde kovalent disülfit bağları mekanik olarak kopar.",
          ekranYazisi: "Aşırı Yoğurma = Bağ Kırılması",
        },
        {
          sure: "00:23 – 00:36",
          cekim: "Teknede 45. dakikada yapılan pürüzsüz katlama (stretch & fold) hareketi.",
          metin:
            "Ölçümler gösteriyor ki yoğurma durduktan sonraki altmış dakikalık dinlenmede protein bağları kendi kendini yeniden onarır ve zirve gücüne ulaşır.",
          ekranYazisi: "60 Dakika Dinlenme = Onarım Zirvesi",
        },
        {
          sure: "00:36 – 00:48",
          cekim: "Bıçak atılan gergin hamurun taş fırında buharla kabarması.",
          metin:
            "Hamur kazanı temizlediği anda mikseri durdur; asıl gücü altmış dakikalık dinlenmeye ve nazik katlamalara bırak!",
          ekranYazisi: "Az Döndür, Doğru Dinlendir · EkmekLab",
        },
      ],
    },
    kaynaklar: [
      {
        yazarYil: "Feng ve ark. (2021)",
        baslik: "Depolymerization and repolymerization of glutenin macropolymer during dough mixing and resting",
        dergi: "Food Chemistry",
      },
      {
        yazarYil: "Matsushita ve ark. (2020)",
        baslik: "Viscoelastic relaxation time and bread loaf volume in fermented wheat dough",
        dergi: "Journal of Cereal Science",
      },
      {
        yazarYil: "Weegels, Hamer & Schofield (1996)",
        baslik: "Functional properties of wheat glutenin",
        dergi: "Journal of Cereal Science, 23(1), 1–18",
        doi: "10.1006/jcrs.1996.0001",
      },
    ],
  },
  {
    kod: "05",
    konuKodu: "SOFRA-01",
    anId: "rafta_ilk_hafta",
    ustEtiket: "SAYI #05 · SOFRANIN FİZİKOKİMYASI",
    baslik: "Sıcak Somun, Tereyağı, Yoğurt, Yumurta ve Sucuk: Sofranın Fizikokimyası",
    kancaSoru:
      "Tereyağı sıcak ekmeğin üzerinde neden göl olmaz, ekşi maya doğal yoğurdun sulanmasını nasıl durdurur ve fermente sucukla ekmek neden aynı bakterilerin kardeşidir?",
    ozet:
      "Süt yağının 32–35 °C erime fiziği, pH 4,6 yoğurt kazein kilidi, 63 °C yumurta sarısı lesitin kalkanı, sucukla ortak laktobasil mirası ve kavurma yağında çözünen kabuk pirazinleri.",
    okumaDakika: 8,
    simulatorBreadType: "wheat",
    rakamlar: [
      {
        deger: "32–35 °C",
        birim: "süt yağı geçişi",
        aciklama:
          "45 °C'lik ılık ekmek gözeneklerinde tereyağı kristallerinin sıvılaşıp Laplace kapiler çekimiyle emildiği aralık.",
      },
      {
        deger: "pH 4,6",
        birim: "kazein jel kilidi",
        aciklama:
          "pH 3,9–4,2 ekşi mayalı kırıntının doğal yoğurt jelini sulandırmadan sabit tuttuğu izoelektrik denge.",
      },
      {
        deger: "log P > 1,5",
        birim: "yağda çözünen kabuk",
        aciklama:
          "Taş fırın kabuğundaki kavruk pirazin ve tiyollerin suda değil, erimiş kavurma ve sucuk yağında çözünme katsayısı.",
      },
    ],
    giris: [
      "İyi bir taş fırın somunu sofrada tek başına duran kuru bir karbonhidrat dilimi değildir. İçi rastgele gözenekli nemli bir sünger, pH 3,9–4,2 aralığında doğal asidik bir matris ve 240 °C taş tabanda karamelize olmuş yüzlerce uçucu koku molekülünden oluşan canlı bir sahnedir.",
      "Bu somun tereyağı, doğal ev yoğurdu, çiftlik yumurtası, fermente kasap sucuğu veya kavurma ile buluştuğunda damakta hissettiğin uyum tesadüf değildir; doğrudan faz geçiş sıcaklıkları, yüzey gerilimi ve ortak fermantasyon bakterilerinin eseridir.",
    ],
    bolumler: [
      {
        id: "tereyagi-kapiler",
        baslik: "1. 34 Derecenin Sırrı: Tereyağı Sıcak Ekmekte Neden Göl Olmaz?",
        formul: "P_c = (2 · γ · cos θ) / r",
        paragraflar: [
          "Tereyağındaki süt yağı kristalleri 10 °C'de yarı katıyken, 32–35 °C aralığında hızla eriyerek 36 °C üzerinde tamamen sıvı faza geçer. Fırından yeni dinlenmiş veya 200 °C'de 4 dakika ısıtılmış bir somun dilimlendiğinde iç sıcaklığı 40–48 °C bandındadır.",
          "Soğuk tereyağı bu yüzeye değdiği an tabandan erir; fakat tabağa akıp göllenmez. Çünkü 0,3–1,8 mm çapındaki açık ekmek gözenekleri Laplace–Young kapiler çekimiyle erimiş yağı mikroskobik kanallarına çeker. Üstelik ekşi mayanın ürettiği diasetil (2,3-bütandion) ile tereyağının doğal ana koku molekülü birebir aynı bileşiktir.",
        ],
      },
      {
        id: "yogurt-kazein",
        baslik: "2. pH 4,6 İttifakı: Doğal Yoğurt ile Ekşi Maya Neden Sulanmaz?",
        paragraflar: [
          "Ev yoğurdundaki kazein proteinleri tam pH 4,6 izoelektrik noktasında üç boyutlu bir jel ağı kurarak kenetlenir. pH 6,0 civarındaki sıradan beyaz ekmek yoğurda batırıldığında ekmeğin yüksek pH'sı yoğurdun jel dengesini yukarı çeker; peynir altı suyu hızla ayrışır ve ekmek lapalaşır.",
          "pH 3,9–4,2 aralığındaki ekşi mayalı somun ise yoğurdun pH 4,6 kazein kilidini sabit tutar. Aynı zamanda ekşi maya bakterilerinin ürettiği doğal ekzopolisakkarit (EPS) polimerleri serbest nemi tutarak hem ekmeğin diri kalmasını hem de yoğurdun kremsi dokusunu muhafaza eder.",
        ],
      },
      {
        id: "yumurta-lesitin",
        baslik: "3. Kızarmış Kabuk ve 63 °C Yumurta Sarısının Lesitin Kalkanı",
        paragraflar: [
          "Ekşi mayalı dilimi döküm tavada kızarttığında yüzey nemi %38'den %8'in altına düşer ve gevrek, camsı bir Maillard zırhı oluşur. Üzerine 63–65 °C'de akışkan kalmış çiftlik yumurtası sarısı yayıldığında sarının %10'unu oluşturan doğal lesitin (fosfatidilkolin) devreye girer.",
          "Amfifilik bir emülsifiyer olan lesitin bir ucuyla kızarmış gözenek yüzeyine tutunur, diğer ucuyla yağ damlacıklarını bağlayarak yumurta akındaki serbest suyun ekmeği hamurlaştırmasını yavaşlatır. Isırdığında alt katman tok çıtırtısını sürdürürken üst katman kadifemsi bir sos gibi dağılır.",
        ],
      },
      {
        id: "sucuk-ve-kavurma",
        baslik: "4. Fermente Sucuğun Öz Kardeşliği ve Kavurmanın Pirazin Köprüsü",
        paragraflar: [
          "Geleneksel kuru kılıf sucuğu olgunlaştıran Lactiplantibacillus plantarum, Latilactobacillus sakei ve Pediococcus türleri, taş fırın ekşi mayamızda yaşayan laktik asit bakterileriyle aynı ailenin üyeleridir. Tavada eriyen baharatlı sucuk yağına ekşi mayalı ekmek banıldığında ekmeğin organik asitliği damaktaki yoğun yağ tabakasını dengeler.",
          "Taş tabanda pişen kabuğun fındıksı, kavruk kokusunu veren alkilpirazinler ve 2-furfuriltiyol ise hidrofobiktir (log P > 1,5); yani sulu tükürükte çözünmez, kuru yendiğinde çabucak uçar. Sıcak ekmek 42–48 °C'de eriyen dana kavurma yağıyla buluştuğunda et yağı bu kabuk aromalarını çözen doğal bir taşıyıcıya dönüşür ve yutkunma sonrası buruna vuran retro-nazal lezzeti dakikalarca uzatır.",
        ],
      },
    ],
    efsane: {
      yanlis:
        "Ertesi güne kalan ekşi mayalı ekmek bayatlamıştır; ancak tost makinesinde bastırılarak yenebilir.",
      gercek:
        "Kabuğunu elinle hafifçe nemlendirip 200 °C fırında yalnız 4–5 dakika ısıttığında iç sıcaklık 60 °C eşiğini aşar; amilopektin kristalleri erir ve somun ilk günkü ılık tereyağı emen dokusuna geri döner.",
    },
    tezgahKurallari: [
      "Tereyağını buzdolabından çıktığı gibi bayat soğuk dilime kazıma; dilimi 200 °C fırında 4 dakika ısıtıp içini 45 °C'ye getir ki süt yağı gözeneklere kapiler çekimle işlesin.",
      "Akışkan sarılı yumurta yapacaksan dilimi önce döküm tavada hafifçe kızart; camsı yüzey + lesitin kalkanı ekmeğin hamurlaşmasını engeller.",
      "Kavurma ve fermente sucuk gibi yoğun et yağlarını açık gözenekli taş fırın köy somunu veya 24 saat dinlenmiş kalıp çavdarla eşleştir.",
    ],
    sepetOnerisi: {
      baslik: "Haftanın Taş Fırın Somunları & Mandıra / Şarküteri Sepeti",
      aciklama:
        "Beylikdüzü bahçe fırınımızdan çıkan günlük ekşi mayalı ekmeklerin yanına Jersey sütüyle mayalanan ev yoğurdu, köy tereyağı, çiftlik yumurtası, fermente sucuk ve kavurma ekleyerek tek teslimatta sofranı kur.",
      birincilCta: { etiket: "Mandıra & Şarküteri Eşlikçileri →", href: "/#sarkuteri" },
      ikincilCta: { etiket: "Taze Taş Fırın Ekmekleri →", href: "/#ekmekler" },
    },
    reels: {
      baslik: "34 Derecenin Sırrı: Tereyağı Sıcak Ekmekte Neden Göl Olmaz?",
      toplamSure: "45 sn · 9:16 Dikey S24 Çekimi",
      sahneler: [
        {
          sure: "00:00 – 00:08",
          cekim: "Taş fırından çıkmış 1000 g köy somununa bıçak değdiği an çıkan kabuk çıtırtısı (DJI Osmo yakın ses).",
          metin:
            "Soğuk tereyağını ılık ekşi mayalı ekmeğin üzerine bıraktığında neden tabağa akıp göl olmaz da ekmeğin içinde kaybolur?",
          ekranYazisi: "34 DERECENİN SIRRI",
        },
        {
          sure: "00:08 – 00:21",
          cekim: "Buharı tüten dilimin üzerine bırakılan kalın köy tereyağının alttan şeffaflaşıp gözeneklere çekilmesi (3× makro).",
          metin:
            "Tereyağındaki süt yağı kristalleri tam otuz dört derecede sıvılaşır. Kırk beş derecelik ılık ekmeğin açık gözenek labirenti ise kapiler çekim kuvvetiyle eriyen yağı lif lif içine çeker.",
          ekranYazisi: "32–35 °C Erime + Kapiler Çekim",
        },
        {
          sure: "00:21 – 00:34",
          cekim: "Yanında doğal ev yoğurdu, çiftlik yumurtası ve tavada cızırdayan sucuk.",
          metin:
            "Üstelik ekşi mayanın ürettiği diasetil aroması ile tereyağının doğal kokusu aynı moleküldür; yoğurt ve fermente sucukla da aynı laktik bakteri dilini konuşur.",
          ekranYazisi: "Aynı Molekül, Aynı Fermantasyon Dili",
        },
        {
          sure: "00:34 – 00:45",
          cekim: "Tam hafta sonu kahvaltı masası ve kraft EkmekLab torbası.",
          metin:
            "Taş fırından çıkan taze somunlarımızı ve sofralık mandıra-şarküteri seçkimizi ekmeklab nokta tr'den Beylikdüzü içi kapına isteyebilirsin!",
          ekranYazisi: "Taş Fırın + Mandıra · ekmeklab.tr",
        },
      ],
    },
    kaynaklar: [
      {
        yazarYil: "Pico, Bernal & Gómez (2015)",
        baslik: "Wheat bread aroma compounds in crumb and crust: A review",
        dergi: "Food Research International, 75, 200–209",
        doi: "10.1016/j.foodres.2015.05.051",
      },
      {
        yazarYil: "Lynch, Coffey & Arendt (2021)",
        baslik: "Exopolysaccharides from lactic acid bacteria: Techno-functional application in the food industry",
        dergi: "Trends in Food Science & Technology, 110, 528–548",
        doi: "10.1016/j.tifs.2021.02.014",
      },
      {
        yazarYil: "Tamang ve ark. (2016)",
        baslik: "Diversity of Microorganisms in Global Fermented Foods and Beverages",
        dergi: "Frontiers in Microbiology, 7, 377",
        doi: "10.3389/fmicb.2016.00377",
      },
      {
        yazarYil: "Jourdren ve ark. (2017)",
        baslik: "Effect of Bread Crumb and Crust Structure on the in Vivo Release of Volatiles and the Dynamics of Aroma Perception",
        dergi: "Journal of Agricultural and Food Chemistry, 65(20), 4153–4160",
        doi: "10.1021/acs.jafc.7b00287",
      },
    ],
  },
] as const;

export function getDergiSayilari(): readonly DergiSayisi[] {
  return DERGI_SAYILARI;
}

export function getDergiSayi(kodParam: string | undefined | null): DergiSayisi | null {
  if (typeof kodParam !== "string") return null;
  const trimmed = kodParam.trim();
  if (!trimmed || trimmed.length > 2 || !/^\d+$/.test(trimmed)) return null;
  const normalized = trimmed.padStart(2, "0");
  return DERGI_SAYILARI.find((s) => s.kod === normalized) ?? null;
}

export function getKomsuDergiSayilari(kod: DergiSayiKodu): {
  onceki: DergiSayisi | null;
  sonraki: DergiSayisi | null;
} {
  const idx = DERGI_SAYILARI.findIndex((s) => s.kod === kod);
  if (idx === -1) return { onceki: null, sonraki: null };
  return {
    onceki: idx > 0 ? (DERGI_SAYILARI[idx - 1] ?? null) : null,
    sonraki: idx < DERGI_SAYILARI.length - 1 ? (DERGI_SAYILARI[idx + 1] ?? null) : null,
  };
}
