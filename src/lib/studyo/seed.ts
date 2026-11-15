import { SITE_URL, SOCIAL } from "@/lib/site";
import type {
  StudyoIssue,
  StudyoMechanismBeat,
  StudyoScene,
  StudyoScienceChartSpec,
} from "@/types/studyo";
import { estimateSpeechSeconds } from "./phonetics";

function makeScene(
  sceneNo: number,
  title: string,
  caption: string,
  voiceText: string,
  visualCue: string,
  flowPrompt: string,
  mechanismBeat?: StudyoMechanismBeat
): StudyoScene {
  return {
    sceneNo,
    title,
    caption,
    voiceText,
    estimatedSec: estimateSpeechSeconds(voiceText),
    visualCue,
    flowPrompt,
    mechanismBeat,
  };
}

interface RawCatalogTopic {
  konuId: string;
  issueNumber: number;
  partLabel: string;
  title: string;
  subtitle: string;
  productSlug: string;
  productName: string;
  status: "ready" | "in_progress" | "planned";
  coreMechanism: string;
  anchorPapers: string[];
  ftsPaperCount: number;
  defaultBeat: StudyoMechanismBeat;
  chart: StudyoScienceChartSpec;
  kisa01Lines?: [string, string, string, string, string];
  kisa02Lines?: [string, string, string, string, string];
  seriBLines?: [string, string, string, string];
  uzunSummary: string;
  benchRule: string;
  mythTitle: string;
  mythCorrection: string;
  pairingNote: string;
}

const CATALOG_TOPICS: readonly RawCatalogTopic[] = [
  {
    konuId: "KONU-01",
    issueNumber: 1,
    partLabel: "Kısım I · Canlı Kavanoz",
    title: "Ekşi Mayanın İlk 10 Günü ve pH 4,5 Duvarı",
    subtitle: "2. Gündeki Yalancı Kabarma, pKa Kinetiği ve 100:1 Ekosistemi",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    status: "ready",
    coreMechanism:
      "Ham undan uyanan Pantoea ve öncü Weissella/Lactococcus dalgası; pH 4,5 altında yüksüz asetik asit (%64 HA, pKa 4,75) difüzyonuyla yabancı bakterilerin silinmesi ve 5. günde maltoz fosforilaz ile maya uyanışı.",
    anchorPapers: [
      "10.1016/j.ijfoodmicro.2023.110445 (González-Alonso 2024)",
      "10.1128/aem.00315-07 (Van der Meulen 2007)",
      "10.1128/spectrum.00662-21 (Oshiro 2021)",
      "10.3390/foods11233942 (Di Biase 2022)",
    ],
    ftsPaperCount: 54,
    defaultBeat: "ph_duvari",
    chart: {
      title: "10 Günlük Ekşi Maya pH Düşüşü ve Mikroflorası",
      unit: "pH",
      primaryLabel: "Hamur pH Değeri",
      thresholdLabel: "Kritik Asit Duvarı (pH 4,5)",
      thresholdValue: 4.5,
      points: [
        { xLabel: "Gün 0", value: 6.2 },
        { xLabel: "Gün 2", value: 5.1 },
        { xLabel: "Gün 4", value: 4.3 },
        { xLabel: "Gün 7", value: 3.95 },
        { xLabel: "Gün 10", value: 3.85 },
      ],
    },
    kisa01Lines: [
      "Ekşi mayanız ikinci günde böyle kabardı diye sevindiniz mi? Sakın o hamurla ekmek pişirmeyin!",
      "Çünkü o köpüğü yapan şey ekmek mayası değil; undan uyanan Pantoya, enterobakteriler ve Vaysella ile Laktokokus gibi öncü koklardır.",
      "Başlangıçta pehaş altı virgül iki civarındadır; eğer pehaş dört virgül beşin altına inemezse Klostridyum ve enterobakteriler yüzde kırklara fırlayıp bütirik asit kokusu üretir.",
      "Ancak pehaş dört virgül beşin altına indiğinde yüksüz asetik ve laktik asit yabancı bakterileri tamamen siler; gerçek maya beşinci günden sonra çoğalır.",
      "İkinci gün köpüğüne aldanmayın; kararlı ekşi maya için kavanoza en az yedi gün verin!",
    ],
    kisa02Lines: [
      "Ekşi mayanın tek kahramanının maya olduğunu sanıyorsanız kavanozdaki gerçek oranı hiç görmediniz!",
      "Olgun bir buğday ekşi mayasında her bir maya hücresine karşılık yaklaşık yüz adet laktik asit bakterisi yaşar.",
      "Yani bir gram olgun ekşi mayada yaklaşık bir milyar laktobasil varken, maya sayısı on milyon civarında dengelenir.",
      "Bakteriler maltoz fosforilaz enzimiyle hamurdaki maltozu kesip mayaya glukoz bırakır ve pehaş değerini düşürerek kavanoz dengesini kurar.",
      "Aromayı ve asit dengesini bakteriler kurar, güçlü kabarmayı maya tamamlar!",
    ],
    seriBLines: [
      "Taş fırının önünde her sabah açtığımız kavanoz yedi günlük mikrobiyal seçilimin sonucudur.",
      "İkinci günün sahte köpüğünü değil, pehaş üç virgül dokuzda olgunlaşmış yüz bakteriye bir maya dengesini hamura katıyoruz.",
      "Soğuk fermantasyondan çıkan köy somunları iki yüz elli derece taş tabanla buluştuğunda buharla birlikte kulak açıyor.",
      "Fırından yeni çıkan çıtır kabuğun sesini dinleyin; taze tereyağı ve olgun tulum peyniriyle sofrada buluşmaya hazır!",
    ],
    uzunSummary:
      "12 sahnelik uzun belgesel akışı: 0. saat pH 6,20 başlangıcı -> Alternaria/Pantoea erken florası -> pH 4,5 Clostridium bütirik asit çatalı -> Weissella/Lactococcus bayrak devri -> Henderson-Hasselbalch pKa (3,86 vs 4,75) zar difüzyonu -> 5. gün maltoz fosforilaz maya uyanışı ve 4 tezgâh kaldıracı.",
    benchRule:
      "İlk 48 saatte kavanozu 28–30 °C ılıklıkta tutarak pH 4,5 eşiğini hızla geçin; 5. günden sonra 23–25 °C aralığına çekip düzenli kubbeleşmeyi bekleyin.",
    mythTitle: "2. Gündeki Dev Köpük Maya Tuttu Demektir",
    mythCorrection:
      "2. gün kabarması ekmek mayası değil, pH > 5,0 iken aktif kalan erken tahıl bakterilerinin gazıdır. Gerçek maya çoğalması pH < 4,5 duvarı ve maltoz fosforilaz sızıntısından sonra 5–7. günde oturur.",
    pairingNote: "Kızarmış köy somunu dilimi + yayık tereyağı + Erzincan tulum peyniri",
  },
  {
    konuId: "KONU-05",
    issueNumber: 2,
    partLabel: "Kısım II · Tanenin Mimarisi",
    title: "Çavdar Ekmeği ve Arabinoksilan Lif İskeleti",
    subtitle: "Neden Yoğrulmaz, Neden Ekşi Maya Zorunludur ve 24 Saat Dinlenir?",
    productSlug: "yuzde-yuz-eksi-mayali-kalip-cavdar",
    productName: "%100 Ekşi Mayalı Kalıp Çavdar",
    status: "ready",
    coreMechanism:
      "Sekalin proteinleri viskoelastik gluten ağı kuramaz; suyu WEAX/WUAX arabinoksilan hidrojeli bağlar. Çavdar nişastası 55–62 °C'de erken jelatinize olduğundan pH < 4,3 ekşi maya asitliği alfa-amilazı frenleyerek nişasta saldırısını durdurur.",
    anchorPapers: [
      "10.3390/foods9121900 (Rye Bread Defects: Dry-Baking and Starch Attack)",
      "10.1002/fsn3.2344",
      "10.1016/j.lwt.2021.111918",
    ],
    ftsPaperCount: 90,
    defaultBeat: "arabinoksilan_jeli",
    chart: {
      title: "Çavdar Nişasta Açılması vs Alfa-Amilaz Zirvesi",
      unit: "°C",
      primaryLabel: "Kritik Sıcaklık Eşikleri",
      thresholdLabel: "Nişasta Jelatinleşme Başlangıcı (55 °C)",
      thresholdValue: 55,
      points: [
        { xLabel: "Fermantasyon", value: 26 },
        { xLabel: "Çavdar Jel.", value: 55 },
        { xLabel: "Buğday Jel.", value: 65 },
        { xLabel: "Amilaz Zirve", value: 72 },
        { xLabel: "İç Kilitlenme", value: 96 },
      ],
    },
    kisa01Lines: [
      "Yüzde yüz çavdar hamurunu buğday gibi yoğurmaya kalktın mı? Ne kadar uzun yoğurursan toparlanmak yerine eline o kadar sıvanır ve ıslak bir çamura döner!",
      "Çünkü çavdar ununda yüzde on-on iki protein olsa bile bunlar sekalin proteinidir; düşük makropolimer yapısı ve yoğun lif perdesi yüzünden buğdaydaki esnek gluten ağını asla kuramazlar.",
      "Çavdar hamurunun gerçek iskeleti, kendi kütlesinin yüz katına kadar su emebilen arabinoksilan lifleridir. Bu çözünür lifler ferulik asit köprüleriyle kenetlenerek görünmez bir hidrojel ağı örer.",
      "Sen bu hassas süspansiyonu hızlı devirde sertçe yoğurursan olmayan gluteni güçlendirmezsin; tam tersine şişmiş lif jelini yırtıp bağlı suyu dışarı sızdırırsın.",
      "Kural çok net: çavdar hamurunu yoğurma, sadece altı-on dakika nazikçe karıştır, güçlü ekşi mayayla kur ve yanal destek için kalıpta pişir!",
    ],
    kisa02Lines: [
      "Çavdar ekmeğini fırından çıkar çıkmaz kesersen içi çiğ hamur gibi bıçağa sıvanır; ekşi mayasız pişirmeye kalkarsan üst kabuğu ayrılıp ortası çöker!",
      "Birinci sebep fırındaki elli beş derece tuzağıdır: çavdar nişastası elli iki-altmış beş derecede buğdaydan çok daha erken açılır ve yetmiş iki derecede zirve yapan alfa-amilaz şişen nişastayı doğrar.",
      "Fırıncılıkta nişasta saldırısı dediğimiz bu yıkımı durdurmanın tek doğal yolu olgun ekşi mayadır. Hamuru pehaş dört virgül iki civarına indirdiğinde alfa-amilaz kilitlenir ve iç iskelet kurtulur.",
      "İkinci sebep ise faz geçişidir: fırından çıktığı anda içerideki nişasta-arabinoksilan jeli hâlâ yarı akışkandır; amilozun yeniden kristalleşip kırıntıyı katılaştırması yirmi dört saat sürer.",
      "Özetle çavdarda ekşi mayadan asla vazgeçme ve kalıptan çıkan somununa yirmi dört saat dolmadan sakın bıçak vurma!",
    ],
    seriBLines: [
      "Yüzde yüz çavdar hamurunu kazanda yoğurmuyoruz; ağır kıvamlı bir kil gibi nazikçe karıştırıp kalıplara alıyoruz.",
      "Pehaş dört virgül ikiye inen ekşi mayamız taş fırının sıcaklığında alfa-amilazı durdurup yoğun gözenekleri ayakta tutuyor.",
      "Fırından çıkan kalıp çavdarları hemen kesmiyoruz; iç nişasta jelinin oturması için tam yirmi dört saat keten örtü altında dinlendiriyoruz.",
      "İnce dilim kalıp çavdar, tereyağda göz yumurta ve dana kavurmayla buluştuğunda tok ve nemli dokusunu günlerce muhafaza ediyor!",
    ],
    uzunSummary:
      "Çavdar sekalin proteinleri vs buğday glutenini, WEAX/WUAX arabinoksilan ferulik asit jelleşmesi, 55 °C erken jelatinizasyon ve pH < 4,3 ekşi maya alfa-amilaz kilidi.",
    benchRule:
      "%100 çavdar hamurunu yalnızca 6–10 dk düşük devirde karıştırın, hamur pH'sını 4,2–4,3 bandına indirin ve fırın sonrası 24 saat dinlendirmeden dilimlemeyin.",
    mythTitle: "Çavdar Ekmeği Az Yoğrulduğu İçin Sıkı Olur",
    mythCorrection:
      "Çavdar gluten ağı değil arabinoksilan lif jeliyle gaz tutar; fazla mekanik kesme bu lif jelini parçalayıp serbest su salımına yol açar.",
    pairingNote: "İnce dilim Kalıp Çavdar + tereyağda köy yumurtası + odun ateşinde dana kavurma",
  },
  {
    konuId: "KONU-02",
    issueNumber: 3,
    partLabel: "Kısım I · Canlı Kavanoz",
    title: "Büyük Ortaklık: F. sanfranciscensis ve K. humilis",
    subtitle: "Maltoz Fosforilaz Antlaşması, Fruktoz İndirgemesi ve Asetat Akışı",
    productSlug: "cevizli-uzumlu-eksi-mayali-somun",
    productName: "Atalık Buğday Ekşi Mayalı Somun",
    status: "ready",
    coreMechanism:
      "Maltoz-negatif Kazachstania humilis ile maltoz fosforilaz (EC 2.4.1.8) kullanan Fructilactobacillus sanfranciscensis arasındaki glukoz paylaşımı; fruktozun mannitole indirgenmesiyle ek ATP ve asetik asit üretimi.",
    anchorPapers: [
      "10.1007/s00217-021-03722-0",
      "10.1128/spectrum.00662-21",
      "10.1007/s11274-021-03027-0",
    ],
    ftsPaperCount: 101,
    defaultBeat: "maltoz_ortakligi",
    chart: {
      title: "Sıkı vs Sıvı Ekşi Mayada Laktat / Asetat Oranı",
      unit: "Molar Oran",
      primaryLabel: "Fermantasyon Katsayısı (FQ)",
      thresholdLabel: "Dengeli Köy Aroması (FQ 2,5)",
      thresholdValue: 2.5,
      points: [
        { xLabel: "%50 Sıkı", value: 2.2 },
        { xLabel: "%75 Klasik", value: 2.8 },
        { xLabel: "%100 Sıvı", value: 4.1 },
        { xLabel: "%150 Cıvık", value: 6.4 },
      ],
    },
    kisa01Lines: [
      "Ekşi maya kavanozundaki her yüz bakteriye karşılık yalnızca tek bir maya hücresi yaşar. Peki neden birbirlerini asitle boğup yok etmiyorlar?",
      "Çünkü sanfransiskensis bakterisi unun maltozunu maltoz fosforilaz ile sıfır enerji harcayarak parçalar ve arta kalan serbest glukozu dışarıya, hamura pompalar.",
      "Ortakları olan Kazahstanya humilis mayası ise maltoza tamamen kördür; unun maltozuna dokunamaz ama bakterinin dışarı attığı bu glukozla beslenip gaz üretir.",
      "Ticari fırıncı mayası bakterinin maltozuna saldırıp rekabet başlatırken, bu yabani maya bakteriyle asla yarışmaz; kusursuz bir iş bölümü kurar.",
      "Bakteri ortamı dengeler ve glukoz verir; maya ise gaz basıp ekmeği kabartır. Yüz yıllık ekşi mayanın sırrı bu antlaşmadır!",
    ],
    kisa02Lines: [
      "Ekşi mayanı cıvık sıvı mı yoksa sert hamur gibi mi besliyorsun? Aradaki fark yalnızca kıvam değil; ekmeğin kokusu ve enerjisidir!",
      "Ekşi maya bakterisi fazla elektronlarını boşaltmak için hamurdaki fruktozu elektron havuzu olarak kullanır ve onu mannitole indirger.",
      "Elektron havuzu boşalınca bakteri alkol üretmekten vazgeçer; asetat kinaz devresiyle sirke asidi üretir ve kasasına fazladan bir molekül a te pe koyar!",
      "Mayanı sert beslediğinde difüzyon kısıtlanır, asetat üretimi yükselir ve o meşhur meyvemsi köy ekmeği aroması iki buçukluk oranda kilitlenir.",
      "Sıvı maya yoğurdumsu kalır; derin kabuk aroması istiyorsan mayanı sıkı besle ve yirmi dört derecede tut!",
    ],
    seriBLines: [
      "Atölyede ana ekşi mayamızı yüzde altmış beş hidrasyonla sıkı kıvamda besliyoruz.",
      "Bu sıkı doku asetat akışını yükselterek taş fırında pişen somunlara derin ve kavruk tahıl aroması kazandırıyor.",
      "Jilet kesiğinden açılan parlak kabuk, yirmi dört derecelik sabırlı fermantasyonun imzasıdır.",
      "Akşamüstü dilimlenen ılık somun, kasap sucuğu ve eski kaşarla birleştiğinde fırın evinin bütün emeğini sofraya taşıyor!",
    ],
    uzunSummary:
      "Tip I ekşi mayada 100:1 bakteri-maya ortaklığı, maltoz fosforilaz glukoz pompası, fruktoz -> mannitol elektron alıcısı ve sıkı/sıvı hidrasyonda asetat kinaz ATP kazancı.",
    benchRule:
      "Yoğurdumsu yumuşak ekşilik için %100 sıvı besleme (26–28 °C), derin kavruk tahıl ve asetat aroması için %60–65 sıkı besleme (23–24 °C) uygulayın.",
    mythTitle: "Maya ve Bakteri Aynı Şeker İçin Kavga Eder",
    mythCorrection:
      "K. humilis maltoz enzimine sahip olmadığı için unun ana şekeri maltoza dokunamaz; F. sanfranciscensis'in dışarı bıraktığı serbest glukozu tüketerek rekabetsiz yaşar.",
    pairingNote: "Atalık Buğday Somunu + ızgara kasap sucuğu + Trakya eski kaşarı",
  },
  {
    konuId: "KONU-14",
    issueNumber: 4,
    partLabel: "Kısım V · Hamur Reolojisi",
    title: "Glutenin Makro-Polimeri (GMP) ve Disülfit Takası",
    subtitle: "Aşırı Yoğurma Çöküşü ve 60 Dakikalık Repolimerizasyon Penceresi",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    status: "ready",
    coreMechanism:
      "Mekanik kesme enerjisi SDS-çözünmez Glutenin Makro-Polimerini (GMP) depolimerize eder; kazandan çıkan hamur 60 dakikalık dinlenmede oksijen ve SH/SS takasıyla disülfit köprülerini yeniden kurar.",
    anchorPapers: [
      "10.1016/j.foodchem.2018.07.157",
      "10.3136/fstr.25.237",
    ],
    ftsPaperCount: 78,
    defaultBeat: "disulfit_agi",
    chart: {
      title: "Yoğurma ve Dinlenmede GMP Polimer Ağı (%)",
      unit: "% GMP",
      primaryLabel: "Bağlı Glutenin Makro-Polimeri",
      thresholdLabel: "Kritik Ağ Eşiği (%75)",
      thresholdValue: 75,
      points: [
        { xLabel: "Un/Su", value: 82 },
        { xLabel: "Optimum", value: 88 },
        { xLabel: "Aşırı Yoğ.", value: 64 },
        { xLabel: "+30 dk Din.", value: 79 },
        { xLabel: "+60 dk Din.", value: 93 },
      ],
    },
    kisa01Lines: [
      "Hamurun tül gibi incecik zar veriyor diye seviniyorsan dikkat: Hamurunu az önce aşırı yoğurarak çökertmiş olabilirsin!",
      "Pek çok fırıncı hamur ne kadar çok yoğrulursa o kadar güçlenir zanneder. Oysa kancayı fazladan birkaç dakika döndürdüğün an, hamur kazanın dibine yayılır ve yapışkan bir çamura döner.",
      "Çünkü aşırı yoğurma, unun içindeki devasa Glutenin Makro-Polimerini parçalar. Mekanik kesme kuvveti kovalent disülfit bağlarını koparır; elastik depolama modülü çöker.",
      "O gördüğün ince zar güç değil, iskeleti kırılmış protein enkazıdır! Hamur kazanı sıyırdığı anda makineyi durdur.",
      "Gerisini altmış dakikalık dinlenmeye ve nazik katlamaya bırak. Takipte kal, fırıncılığı bilimle yönet!",
    ],
    kisa02Lines: [
      "Kazandan ilk çıktığında yırtılan o pürüzlü hamur, tezgâhta bir saat bekleyince nasıl oluyor da pürüzsüz bir ipeğe dönüşüyor?",
      "Yoğurma sırasında kancanın mekanik darbesi, unun içindeki devasa Glutenin Makro-Polimerini parçalar; polimer içeriği sadece iki dakikada yüzde yirmi azalır.",
      "Fakat yoğurmayı durdurup hamuru dinlenmeye bıraktığın an mekanik stres sıfırlanır; serbest tiyoller yeniden disülfit köprüleri kurarak repolimerize olur.",
      "Disülfit bağları ve glutenin makropolimeri jeli tam altmışıncı dakikada zirveye ulaşır!",
      "Hamurunu kancada hırpalamak yerine altmış dakikalık repolimerizasyon penceresini kullan. Bilimle yoğur, kusursuz dokuya ulaş!",
    ],
    seriBLines: [
      "Atölyede kazanı dakikalarca yüksek devirde çalıştırmıyoruz; hamur kazan cidarını bıraktığı saniye duruyoruz.",
      "Tezgâh küvetlerinde tam altmış dakika dinlenen hamur, disülfit köprülerini kendi kendine yeniden örüyor.",
      "Islak elle yapılan nazik germe-katlama hamura hiç yırtmadan ipeksi bir yüzey gerilimi kazandırıyor.",
      "Taş fırından çıkan açık gözenekli iç doku, manda kaymağı ve doğal çiçek balıyla sofraya konuk oluyor!",
    ],
    uzunSummary:
      "Gliadin (viskoz uzama) vs Glutenin (elastik geri yaylanma), mekanik kesmede SH/SS kopuşu, aşırı yoğurma çöküşü ve 60 dakikalık repolimerizasyon kinetiği.",
    benchRule:
      "Hamur kazan cidarını temizlediği ve sıcaklığı 24 °C'yi aşmadığı an yoğurmayı kesin; ilk katlamadan önce 45–60 dk tam dinlenme verin.",
    mythTitle: "Pencere Zarı Testi Her Zaman Güçlü Gluten Gösterir",
    mythCorrection:
      "Aşırı yoğrulup disülfit iskeleti parçalanmış hamur da sıfır geri yaylanmayla ince zar açar; gerçek güç uzamayla birlikte elastik direnç göstermesidir.",
    pairingNote: "Açık gözenekli Köy Somunu + manda kaymağı + süzme çiçek balı",
  },
  {
    konuId: "KONU-06",
    issueNumber: 5,
    partLabel: "Kısım II · Tanenin Mimarisi",
    title: "Buğday Tanesinin 7 Katmanı, Aleuron ve Kül Tamponlaması",
    subtitle: "Sub-Aleuron Protein Gradyanı, Kepek Mekaniği ve TTA Tamponu",
    productSlug: "tam-bugday-eksi-mayali-somun",
    productName: "Tam Buğday Ekşi Mayalı Somun",
    status: "ready",
    coreMechanism:
      "Sub-aleuron tabakasındaki yoğun depo proteinleri, aleuron minerallerinin (kül oranının) pH düşüşünü tamponlayarak TTA asit havuzunu büyütmesi ve kaba kepek parçacıklarının gaz zarlarını kesme mekaniği.",
    anchorPapers: [
      "10.3390/plants11070889",
      "10.1111/1541-4337.12176",
    ],
    ftsPaperCount: 40,
    defaultBeat: "ph_duvari",
    chart: {
      title: "Un Kül Oranına Göre TTA Tamponlama Havuzu (mL)",
      unit: "TTA (mL)",
      primaryLabel: "pH 4,1'de Toplam Titre Edilebilir Asitlik",
      thresholdLabel: "Beyaz Un Üst Sınırı (10 mL)",
      thresholdValue: 10,
      points: [
        { xLabel: "Tip 550", value: 9 },
        { xLabel: "Tip 850", value: 14 },
        { xLabel: "Tam Buğday", value: 21 },
        { xLabel: "Tam Çavdar", value: 26 },
      ],
    },
    kisa01Lines: [
      "Tam buğday hamurunuz beyaz unla aynı sürede kabarmasına rağmen fırında neden daha basık kalıyor?",
      "Sebebi sadece kepek ağırlığı değil; kaba perikarp parçacıklarının gaz kabarcığı zarlarını jilet gibi mekanik olarak delmesidir.",
      "Üstelik aleuron katmanındaki mineraller asidi güçlü biçimde tamponlar; pehaş dört virgül bire inene kadar beyaz unun iki katından fazla organik asit birikir.",
      "Kepeği önceden suyla yumuşattığınızda keskin kenarlar esner ve gluten zarları yırtılmadan gaz tutar.",
      "Tam buğdayda ön ıslatma uygulayın ve fermantasyonu saatle değil hacim tepkisiyle yönetin!",
    ],
    kisa02Lines: [
      "Un çuvalındaki Tip beş yüz elli veya Tip bin yüz rakamının gerçekte neyi ölçtüğünü biliyor musunuz?",
      "Bu sayı dokuz yüz derecelik fırında un yakıldığında geriye kalan mineral külünün yüzdesidir ve doğrudan kepek ile aleuron oranını gösterir.",
      "Kül oranı yükseldikçe hamurun tamponlama kapasitesi artar; yani aynı pehaş değerinde çok daha zengin bir organik asit ve aroma havuzu kurulur.",
      "Ancak sub-aleuron proteinleri daha çok su ister; beyaz un reçetesiyle yoğrulan yüksek küllü un kuru ve sıkı kalır.",
      "Kül oranı yükseldikçe su oranını yüzde beş ila sekiz artırın; taş fırın ekmeğinin gerçek karakterini açığa çıkarın!",
    ],
    seriBLines: [
      "Tam buğday unumuzun kepek ve aleuron katmanlarını yoğurma öncesinde ılık suyla dinlendirip yumuşatıyoruz.",
      "Yüksek mineral tamponlaması sayesinde hamur ekşi maya fermantasyonunda derin ve dengeli bir tahıl aroması biriktiriyor.",
      "Taş tabanda bol buharla pişen somunlar basılmadan dik kabarıyor ve karamelize kabuk bağlıyor.",
      "Dilimlendiğinde cevizimsi buğday kokusu yayılan tam buğday somunu, olgun beyaz peynir ve soğuk sıkım zeytinyağıyla harika eşleşir!",
    ],
    uzunSummary:
      "Endosperm merkezinden sub-aleuron katmanına protein gradyanı, Tip 550–1600 kül analizi, mineral TTA tamponlaması ve kepek hidrasyon ön işlemi.",
    benchRule:
      "Tam buğday reçetesinde kepekli un kısmına en az 45 dk su ön dinlendirmesi verin ve beyaz una kıyasla hidrasyonu %5–8 yükseltin.",
    mythTitle: "Kepek Sadece Hareketsiz Bir Lif Dolgusudur",
    mythCorrection:
      "Aleuron ve perikarp katmanları hem suyu hızla çeker hem de mineralleriyle hamur pH tamponlamasını 2–3 kat artırarak fermantasyon kinetiğini değiştirir.",
    pairingNote: "Tam Buğday Somunu + Ezine koyun peyniri + soğuk sıkım zeytinyağı",
  },
];

interface PlannedTopicSeed {
  konuId: string;
  issueNumber: number;
  partLabel: string;
  title: string;
  subtitle: string;
  productSlug: string;
  productName: string;
  coreMechanism: string;
  anchorPaper: string;
  ftsPaperCount: number;
  beat: StudyoMechanismBeat;
  metricUnit: string;
  points: [string, number][];
  hook1: string;
  hook2: string;
  benchRule: string;
  mythTitle: string;
  mythCorrection: string;
  pairingNote: string;
}

const PLANNED_TOPICS: readonly PlannedTopicSeed[] = [
  {
    konuId: "KONU-20",
    issueNumber: 6,
    partLabel: "Kısım VI · Fırın Termodinamiği",
    title: "Fırın Sıçraması ve Köpükten Süngere Dönüşüm",
    subtitle: "İlk 12 Dakikada Gaz Genleşmesi ve 58–75 °C Jelatinizasyon Kilidi",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "35–55 °C arasında son maya CO2 üretimi ve etanol buharlaşması; 58–75 °C aralığında nişasta jelatinizasyonu ve gluten termoset kilitlenmesiyle kapalı köpüğün açık gözenekli süngere dönüşmesi.",
    anchorPaper: "10.3136/fstr.9.219",
    ftsPaperCount: 64,
    beat: "disulfit_agi",
    metricUnit: "°C",
    points: [["Giriş", 25], ["Gaz Zirve", 48], ["Maya Durur", 56], ["Sünger Geçiş", 68], ["Sabit Kabuk", 98]],
    hook1: "Somununuz fırındaki ilk on iki dakikada ne kadar kabardıysa o kadardır; yetmiş dereceden sonra büyüme tamamen durur!",
    hook2: "Hamur fırına kapalı balonlardan oluşan bir köpük olarak girer; peki nasıl olur da çökmeyen açık bir sünger olarak çıkar?",
    benchRule: "İlk 10 dakikada fırın kapağını asla açmayın; buharı ilk 2 dakikada verip 12. dakikada tahliye edin.",
    mythTitle: "Ekmek Pişme Süresinin Sonuna Kadar Kabarmaya Devam Eder",
    mythCorrection: "İç sıcaklık 68–75 °C'ye ulaştığında gluten pıhtılaşır ve nişasta jelleşir; 12. dakikadan sonra hacim artışı fiziksel olarak kilitlenir.",
    pairingNote: "Sıcak taş fırın somunu + tuzlu yayık tereyağı + köy sütü",
  },
  {
    konuId: "KONU-22",
    issueNumber: 7,
    partLabel: "Kısım VI · Fırın Termodinamiği",
    title: "Bayatlama Kurumak Değildir: Amilopektin Retrogradasyonu",
    subtitle: "Neden +4 °C Buzdolabı Ekmeği En Hızlı Sertleştiren Sıcaklıktır?",
    productSlug: "yuzde-yuz-eksi-mayali-kalip-cavdar",
    productName: "%100 Ekşi Mayalı Kalıp Çavdar",
    coreMechanism:
      "Su kaybetmeyen kapalı ekmekte bile amilopektin yan zincirlerinin B-tipi kristallere geri dönmesi; +4 °C buzdolabında kristalleşme hızının zirve yapması ve -18 °C dondurucuda camlaşarak durması.",
    anchorPaper: "10.1016/j.foodhyd.2020.105879",
    ftsPaperCount: 106,
    beat: "arabinoksilan_jeli",
    metricUnit: "Sertleşme Hızı",
    points: [["-18 °C Derin", 8], ["+4 °C Dolap", 95], ["+22 °C Tezgâh", 42], ["+60 °C Fırın", 5]],
    hook1: "Ekmeği taze kalsın diye buzdolabına koyuyorsanız onu oda sıcaklığından üç kat daha hızlı bayatlatıyorsunuz!",
    hook2: "Ağzı sımsıkı kapalı poşette bir damla bile su kaybetmeyen ekmek üç gün sonra neden taş gibi sertleşir?",
    benchRule: "2 günde tüketeceğiniz somunu keten torbada +20 °C'de tutun; fazlasını dilimleyip doğrudan -18 °C'de dondurun.",
    mythTitle: "Bayatlama Ekmeğin Suyunun Uçmasıdır",
    mythCorrection: "Bayatlama nem kaybından bağımsız olarak amilopektin zincirlerinin yeniden kristalleşip suyu kristal kafese hapsetmesidir; 60 °C ısıtmayla geçici olarak çözülür.",
    pairingNote: "Kızartılmış dilim çavdar + tereyağı + kasap sucuğu",
  },
  {
    konuId: "KONU-03",
    issueNumber: 8,
    partLabel: "Kısım I · Canlı Kavanoz",
    title: "Bakterilerin Ördüğü Görünmez Ağ: Dekstran ve Levan",
    subtitle: "Weissella ve Leuconostoc'un Sakkarozdan Doğal Jel Üretimi",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Weissella ve Leuconostoc türlerinin dekstransükraz/levansükraz enzimleriyle in situ ekzopolisakkarit (EPS) sentezi, su bağlama artışı ve bayatlama geciktirme penceresi.",
    anchorPaper: "10.3389/fmicb.2015.00834",
    ftsPaperCount: 118,
    beat: "arabinoksilan_jeli",
    metricUnit: "g/kg EPS",
    points: [["0 Saat", 0.2], ["6 Saat", 2.4], ["12 Saat", 5.8], ["18 Saat", 7.1]],
    hook1: "Hiçbir katkı maddesi kullanmadan pamuk gibi nemli kalan ekşi mayalı iç dokunun arkasında bakterilerin ördüğü doğal bir jel var!",
    hook2: "Aşırı ekşimiş ön hamurda neden dekstran üretimi durur? Enzimin pH 5,0 penceresini kaçırmayın!",
    benchRule: "Yumuşak iç doku için tatlı ön mayayı 25–28 °C'de aşırı asitlenmeden (pH 4,7–5,0 bandında) ana hamura katın.",
    mythTitle: "Ekşi Maya Sadece Asit ve Gaz Üretir",
    mythCorrection: "Belirli laktik koklar sakkarozdan yüksek su tutucu dekstran ve levan hidrokolloidleri örerek somun hacmini büyütür.",
    pairingNote: "Yumuşak iç dokulu somun + taze lor peyniri + ceviz",
  },
  {
    konuId: "KONU-04",
    issueNumber: 9,
    partLabel: "Kısım I · Canlı Kavanoz",
    title: "Küfe Karşı Kimyasal Kalkan: Fenillaktik Asit ve Asetat",
    subtitle: "Kalsiyum Propiyonatsız Doğal Raf Ömrünün Biyokimyası",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "L. plantarum ve L. brevis'in ürettiği 3-fenillaktik asit, hidroksi yağ asitleri ve asetik asidin sinerjik olarak küf spor çimlenmesini baskılaması.",
    anchorPaper: "10.1128/aem.66.9.4084-4090.2000 (Lavermicocca 2000)",
    ftsPaperCount: 60,
    beat: "ph_duvari",
    metricUnit: "Küfsüz Gün",
    points: [["Ticari Maya", 3], ["Kısa Ekşi", 5], ["Uzun Ekşi", 9], ["Çavdar Ekşi", 12]],
    hook1: "Hiçbir koruyucu içermeyen gerçek ekşi mayalı ekmek tezgâhta günlerce dururken paketli ekmek koruyucusuz neden üç günde küflenir?",
    hook2: "Tek başına laktik asit küfü durduramaz; asıl kalkan asetik asit ve fenillaktik asit ortaklığıdır!",
    benchRule: "Doğal raf dayanımı için ekşi mayada asetat oranını koruyun ve somun içi 28 °C'ye soğumadan poşete koymayın.",
    mythTitle: "Geç Küflenen Her Ekmekte Katkı Maddesi Vardır",
    mythCorrection: "Uzun ekşi maya fermantasyonunda oluşan organik asit ve siklik dipeptit sinerjisi küf sporlarının zarını doğal yoldan baskılar.",
    pairingNote: "Köy somunu + olgun kaşar + kuru et",
  },
  {
    konuId: "KONU-07",
    issueNumber: 10,
    partLabel: "Kısım II · Tanenin Mimarisi",
    title: "Siyez, Kavılca ve Modern Buğday: D Genomu Reolojisi",
    subtitle: "AA, AABB ve AABBDD Genomlarında Gliadin / Glutenin Oranı",
    productSlug: "cevizli-uzumlu-eksi-mayali-somun",
    productName: "Atalık Buğday Ekşi Mayalı Somun",
    coreMechanism:
      "1D kromozomundaki Glu-D1 yüksek molekül ağırlıklı glutenin alt-birimlerinin (Dx5+Dy10) elastikiyet farkı; kadim buğdaylarda yüksek gliadin/glutenin oranı nedeniyle yayılma eğilimi.",
    anchorPaper: "10.3390/foods8090409",
    ftsPaperCount: 267,
    beat: "disulfit_agi",
    metricUnit: "Gliadin/Glutenin",
    points: [["Ekmeklik (AABBDD)", 1.8], ["Spelt", 2.7], ["Kavılca (AABB)", 3.6], ["Siyez (AA)", 5.2]],
    hook1: "Siyez ve kavılca hamurunu modern buğday gibi yoğurup yüksek su verirseniz tezgâhta yayılıp kalır!",
    hook2: "Atalık buğdaylarda gluten yok değildir; sadece D genomundaki yay gibi geri çeken glutenin zincirleri eksiktir!",
    benchRule: "Siyez ve kavılcada hidrasyonu %62–66 bandında tutun, kısa karıştırın ve soğuk kalıp desteği kullanın.",
    mythTitle: "Siyez Ununda Hiç Gluten Yoktur",
    mythCorrection: "Siyez bolca gliadin proteini içerir; eksik olan şey elastik ağ kuran D-genomu glutenin alt birimleridir.",
    pairingNote: "Atalık buğday dilimi + köy tereyağı + petek balı",
  },
  {
    konuId: "KONU-08",
    issueNumber: 11,
    partLabel: "Kısım III · Değirmenden Tezgâha",
    title: "Zedelenmiş Nişasta: Su Kaldırma ile Yapışkan Hamur Çizgisi",
    subtitle: "%40 vs %300 Su Bağlama Kinetiği ve Beta-Amilaz Maltoz Salımı",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Sağlam nişasta granülü soğuk suda %40 su bağlarken zedelenmiş granülün %200–400 su çekmesi ve amilaz saldırısına açılarak maltoz ile dekstrin üretmesi.",
    anchorPaper: "10.1016/j.lwt.2021.111918",
    ftsPaperCount: 86,
    beat: "maltoz_ortakligi",
    metricUnit: "% Zedelenme",
    points: [["Çok Düşük", 4.0], ["İdeal Ekmeklik", 6.8], ["Sınır Bölge", 8.5], ["Yapışkan İç", 11.2]],
    hook1: "Aynı yüzde on iki proteine sahip iki unun biri suyu sünger gibi çekerken diğeri neden cıvıklaşıyor?",
    hook2: "Değirmen taşının kırdığı nişasta granülleri başlangıçta çok su tutar ama fermantasyonda o suyu geri kusar!",
    benchRule: "Yüksek zedelenmiş nişastalı taş değirmen unlarında başlangıç suyunu %3–4 kontrollü verip fermantasyon süresini aşırı uzatmayın.",
    mythTitle: "Unun Su Kaldırma Gücünü Yalnızca Protein Oranı Belirler",
    mythCorrection: "Zedelenmiş nişasta kendi ağırlığının 3 katına kadar soğuk su bağlar ve su kaldırma farkının ana belirleyicilerinden biridir.",
    pairingNote: "Taş değirmen somunu + manda yoğurdu + zeytinyağı",
  },
  {
    konuId: "KONU-09",
    issueNumber: 12,
    partLabel: "Kısım III · Değirmenden Tezgâha",
    title: "Taş Değirmen mi, Valsli Değirmen mi? Isınma ve Ruşeym Yağları",
    subtitle: "Öğütme Mekaniği, Lipoksijenaz ve Partikül Dağılımı",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Taş değirmende ruşeym lipitleri ve aleuron katmanının endosperme birlikte ezilmesi, karotenoid pigment korunumu ve taze öğütülmüş un oksidasyon dengesi.",
    anchorPaper: "10.1016/j.aoas.2013.01.008",
    ftsPaperCount: 40,
    beat: "arabinoksilan_jeli",
    metricUnit: "°C Öğütme",
    points: [["Soğuk Taş", 34], ["Hızlı Taş", 52], ["Valsli Kırma", 31], ["Aşırı Sürtünme", 62]],
    hook1: "Üzerinde taş değirmen yazan her un aynı değildir; taş hızlı dönerse un daha çuvala girmeden ısısıyla yorulur!",
    hook2: "Ruşeym yağı unun içinde kaldığında aromayı zenginleştirir ama çuvalın bekleme ömrünü kısaltır!",
    benchRule: "Taş değirmen ununu serin depolayın ve öğütmeden sonraki 2–6 hafta arasındaki olgun pencerede işleyin.",
    mythTitle: "Yeni Öğütülmüş Un Aynı Gün En Yüksek Hacmi Verir",
    mythCorrection: "Öğütme sonrası 10–14 günlük doğal oksidasyon serbest tiyolleri azaltarak gluten ağının dik durma gücünü artırır.",
    pairingNote: "Krem rengi taş değirmen somunu + tuzlu tereyağı + eski kaşar",
  },
  {
    konuId: "KONU-10",
    issueNumber: 13,
    partLabel: "Kısım III · Değirmenden Tezgâha",
    title: "Hagberg Düşme Sayısı (Falling Number): 250 mi 400 mü?",
    subtitle: "Alfa-Amilaz Hızı, Yapışkan İç Doku ve Soluk Kabuk Dengesi",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "FN < 200 saniyede aşırı alfa-amilazın fırında nişastayı sıvılaştırması; FN > 360 saniye kuru unlarda ise şeker kıtlığı yüzünden soluk kabuk ve düşük hacim oluşması.",
    anchorPaper: "10.3389/fpls.2018.01356",
    ftsPaperCount: 85,
    beat: "maltoz_ortakligi",
    metricUnit: "FN (sn)",
    points: [["Filizlenmiş", 165], ["İdeal Ekşi Maya", 275], ["Kuru Un", 380], ["Çok Kuru", 430]],
    hook1: "Un analiz raporundaki Düşme Sayısı iki yüzün altındaysa ekmeğinizin içi ne kadar pişirirseniz pişirin bıçağa sıvanır!",
    hook2: "Düşme sayısı dört yüzün üzerindeki çok kuru unlarda ise kabuk kızarmaz; çözüm şeker değil enzim dengesidir!",
    benchRule: "Uzun ekşi maya fermantasyonu için FN 260–320 sn bandındaki unları seçin; düşük FN unlarda asitliği hızla kurun.",
    mythTitle: "Düşme Sayısı Ne Kadar Yüksekse Un O Kadar Kalitelidir",
    mythCorrection: "Aşırı yüksek FN (>380 sn) çok düşük amilaz demektir; maya besini yavaşlar ve Maillard kızarması zayıf kalır.",
    pairingNote: "Karamelize kabuklu somun + kavurma + tulum peyniri",
  },
  {
    konuId: "KONU-11",
    issueNumber: 14,
    partLabel: "Kısım IV · Ölçüm ve Kavram Atlası",
    title: "pH Neden Tek Başına Yalan Söyler? TTA ve Tamponlama",
    subtitle: "pH 3,9 Gösteren İki Hamurdan Biri Neden Çok Daha Keskin Kokar?",
    productSlug: "tam-bugday-eksi-mayali-somun",
    productName: "Tam Buğday Ekşi Mayalı Somun",
    coreMechanism:
      "Serbest H+ aktivitesi (pH) logaritmiktir; algılanan ekşiliği toplam titre edilebilir asitlik (TTA) havuzu ve uçucu asetik asit oranı belirler.",
    anchorPaper: "10.3390/pr14172711",
    ftsPaperCount: 19,
    beat: "ph_duvari",
    metricUnit: "TTA (mL)",
    points: [["Beyaz pH 4,0", 8.5], ["Köy pH 4,0", 13.5], ["Tam Buğ. pH 4,0", 19.0], ["Çavdar pH 4,0", 25.5]],
    hook1: "Pehaş ölçeriniz üç virgül dokuz gösteriyor ama ekmeğiniz hiç ekşi değil; bir başka gün dört virgül ikide genzinizi yakıyor!",
    hook2: "Çünkü dilimiz sadece serbest protonları değil, nötralize olan toplam organik asit havuzunu yani te te a değerini tadar!",
    benchRule: "Tam tahıllı hamurlarda beyaz unla aynı pH hedefini kovalamayın; süreyi ve aromayı unun kül oranına göre ayarlayın.",
    mythTitle: "Aynı pH Değerindeki Tüm Hamurlar Aynı Ekşiliktedir",
    mythCorrection: "Yüksek küllü unlar asidi tamponladığı için aynı pH değerine ulaşana kadar 2–3 kat fazla organik asit (TTA) biriktirir.",
    pairingNote: "Tam buğday somunu + süzme yoğurt + ceviz",
  },
  {
    konuId: "KONU-12",
    issueNumber: 15,
    partLabel: "Kısım IV · Ölçüm ve Kavram Atlası",
    title: "Su Aktivitesi (aw) ve Kabuktan İçe Nem Göçü",
    subtitle: "Fırından Çıtır Çıkan Kabuk 4 Saat Sonra Neden Yumuşar?",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Ekmek içi (aw ~0,96) ile taze kabuk (aw <0,30) arasındaki kimyasal potansiyel farkı nedeniyle su buharının dışa göçüp kabuğu camsı halden kauçuksu hale geçirmesi.",
    anchorPaper: "10.1111/j.1745-4603.2012.00368.x",
    ftsPaperCount: 127,
    beat: "arabinoksilan_jeli",
    metricUnit: "Kabuk aw",
    points: [["Fırın Çıkışı", 0.22], ["1. Saat", 0.44], ["4. Saat", 0.68], ["Naylon Poşet", 0.86]],
    hook1: "Fırından çıkarken senfoni gibi çıtırdayan kabuk, sıcakken naylon poşete girerse otuz dakikada lastik gibi olur!",
    hook2: "Su her zaman çok olduğu yerden değil, su aktivitesi yüksek olan iç dokudan düşük olan kuru kabuğa doğru akar!",
    benchRule: "Somunu ızgara tel üzerinde en az 90 dk soğutun; çıtır kabuğu korumak için hava alan kese kâğıdı veya keten bez kullanın.",
    mythTitle: "Kabuk Havadaki Nemden Dolayı Yumuşar",
    mythCorrection: "Kabuğu yumuşatan ana su kaynağı dış hava değil, %96 su aktivitesine sahip kendi iç kırıntısından dışa yürüyen buhardır.",
    pairingNote: "Çıtır kabuklu somun + tereyağı + kahvaltılık zahter",
  },
  {
    konuId: "KONU-13",
    issueNumber: 16,
    partLabel: "Kısım IV · Ölçüm ve Kavram Atlası",
    title: "Alveograf W, P/L ve Gerinim Sertleşmesi (Strain Hardening)",
    subtitle: "Un Raporundaki Rakamları Tezgâhta Elle Hissetmek",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Gaz kabarcığı büyürken ince zarın yırtılmasını önleyen büyük deformasyonlu gerinim sertleşmesi (strain hardening) ve P/L direnç-uzama dengesi.",
    anchorPaper: "10.1006/jcrs.1999.0295",
    ftsPaperCount: 304,
    beat: "disulfit_agi",
    metricUnit: "Alveograf W",
    points: [["Bisküvilik", 130], ["Günlük Somun", 230], ["Uzun Soğuk", 310], ["Çok Sert", 390]],
    hook1: "Un çuvalının üzerindeki W ve P bölü L değerlerine bakmadan su oranı veriyorsanız her yeni çuvalda sürpriz yaşarsınız!",
    hook2: "Kabarcık zarının inceldikçe yırtılmak yerine sertleşmesine gerinim sertleşmesi denir ve açık gözeneklerin anahtarıdır!",
    benchRule: "18–24 saat soğuk fermantasyon için W 260–320 ve P/L 0,55–0,80 aralığındaki dengeli unları tercih edin.",
    mythTitle: "En Sert Un Her Zaman En Hacimli Somunu Verir",
    mythCorrection: "P/L oranı aşırı yüksek (>1,2) çok sert unlar gaz genleşmesine direnir ve somunu sıkı bir top halinde kilitler.",
    pairingNote: "Uzun fermantasyon somunu + eski kaşar + tereyağı",
  },
  {
    konuId: "KONU-15",
    issueNumber: 17,
    partLabel: "Kısım V · Hamur Reolojisi",
    title: "Otoliz, Fermentoliz ve Katlama Geometrisi",
    subtitle: "Yoğurmadan Güç Kazanmak ve Endojen Proteaz Sınırı",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Tuzsuz su-un ön dinlendirmesinde tam nişasta/protein hidrasyonu, kontrollü proteaz uzayabilirliği ve germe-katlama ile gaz hücrelerinin katlanması.",
    anchorPaper: "10.1021/jf502547a",
    ftsPaperCount: 57,
    beat: "disulfit_agi",
    metricUnit: "Uzayabilirlik",
    points: [["0 dk", 45], ["30 dk Otoliz", 78], ["60 dk Otoliz", 90], ["180 dk Zayıf Un", 62]],
    hook1: "Zayıf veya çavdar ağırlıklı bir una üç saat tuzsuz otoliz yaparsanız hamuru güçlendirmez, enzimlerle eritirsiniz!",
    hook2: "Kırk beş dakikalık doğru bir otoliz ise yoğurma süresini yarıya indirip hamura ipeksi bir uzama kazandırır!",
    benchRule: "Güçlü buğday unlarında 45–60 dk otoliz uygulayın; düşük düşme sayılı veya zayıf unlarda doğrudan tuzlu fermentolize geçin.",
    mythTitle: "Otoliz Ne Kadar Uzun Sürerse Hamur O Kadar Güçlenir",
    mythCorrection: "Tuz yokluğunda endojen proteazlar serbest çalışır; zayıf unlarda 2 saati aşan otoliz gluten ağını gevşetir.",
    pairingNote: "İnce kabuklu köy somunu + köy yumurtası + beyaz peynir",
  },
  {
    konuId: "KONU-16",
    issueNumber: 18,
    partLabel: "Kısım V · Hamur Reolojisi",
    title: "Tuzun (%2 NaCl) Üçlü Görevi: Yük Perdeleme ve Osmotik Fren",
    subtitle: "Tuzu Unutursanız Hamur Neden Yapışır, Hızla Taşar ve Soluk Pişer?",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Hamur pH'sında net pozitif yüklü gluten zincirlerinin Cl- iyonlarıyla perdelenerek yaklaşması, hidrofobik bağların sıkılaşması ve maya hızının dengelenmesi.",
    anchorPaper: "10.1016/j.foodchem.2018.07.157",
    ftsPaperCount: 580,
    beat: "disulfit_agi",
    metricUnit: "Elastik Direnç",
    points: [["%0 Tuz", 42], ["%1,0 Tuz", 68], ["%1,8 Tuz", 89], ["%2,2 Tuz", 94]],
    hook1: "Hamura tuzu unuttuğunuzu fırından bembeyaz ve yayvan çıktığında mı fark ettiniz? Tuz sadece tat vermez!",
    hook2: "Klorür iyonları gluten zincirlerindeki aynı kutuplu elektrik itişmesini susturup protein ağını birbirine kenetler!",
    benchRule: "Un ağırlığının %1,8–2,0'si oranında tuzu otoliz sonrasında ekleyin; tuzsuz hamurda mayanın tüm şekeri tüketip kabuğu soluk bırakacağını unutmayın.",
    mythTitle: "Tuz Hamura Yalnızca Lezzet İçin Katılır",
    mythCorrection: "NaCl elektrostatik itişmeyi perdeleyerek gluteni sıkılaştırır ve ozmotik basınçla maya CO2 hızını kontrol eder.",
    pairingNote: "Dengeli tuzlu taş fırın somunu + tuzsuz taze kaymak + bal",
  },
  {
    konuId: "KONU-17",
    issueNumber: 19,
    partLabel: "Kısım V · Hamur Reolojisi",
    title: "Glutenin Görünmez Ortağı: Polar Lipitler ve Sıvı Film",
    subtitle: "%2'lik Buğday Galaktolipitleri Gaz Kabarcığını Nasıl Kurtarır?",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Fırın ısısında gluten zarı inceldiğinde gaz-sıvı arayüzeyini stabilize eden digalaktozildigliserit (DGDG) sıvı lameller filmi.",
    anchorPaper: "10.1111/1541-4337.12616",
    ftsPaperCount: 40,
    beat: "arabinoksilan_jeli",
    metricUnit: "Somun Hacmi",
    points: [["Yağı Alınmış", 62], ["Serbest Yağ Asidi", 71], ["Doğal Polar Lipit", 100]],
    hook1: "Unun içinde sadece yüzde iki oranında bulunan kendi doğal lipitlerini çıkarırsanız en güçlü gluten bile fırında söner!",
    hook2: "Çünkü fırın ısısında gerilen protein zarının son savunma hattı polar galaktolipitlerin kurduğu sıvı filmdir!",
    benchRule: "Yüksek gözenekli açık iç doku istediğiniz somunlarda hamura yoğurma başında ağır sıvı yağ eklemeyin; unun doğal polar lipit filmini koruyun.",
    mythTitle: "Hamura Eklenen Her Yağ Açık Gözenek Yapar",
    mythCorrection: "Yüksek miktarda sıvı trigliseritler ince açık gözenek zarını değiştirebilir; asıl kabarcık koruyucu unun kendi polar galaktolipitleridir.",
    pairingNote: "Açık gözenekli somun + erken hasat zeytinyağı + kekik",
  },
  {
    konuId: "KONU-18",
    issueNumber: 20,
    partLabel: "Kısım V · Hamur Reolojisi",
    title: "Askorbik Asit ve Glutatyon: Hamurda Redoks Anahtarı",
    subtitle: "Oksijenli Yoğurmada Glutatyon Kapanı Nasıl Çalışır?",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Askorbik asidin oksijen varlığında dehidroaskorbik aside (DHAA) dönüşüp serbest indirgenmiş glutatyonu (GSH -> GSSG) bağlayarak disülfit kırılmasını önlemesi.",
    anchorPaper: "10.3136/fstr.25.237",
    ftsPaperCount: 23,
    beat: "disulfit_agi",
    metricUnit: "Serbest GSH",
    points: [["Havasız", 88], ["Normal Yoğurma", 54], ["Oksijen + DHAA", 16]],
    hook1: "İndirgeyici bir madde olan C vitamini hamura girdiğinde nasıl tam tersine yükseltgeyici bir ağ güçlendiriciye dönüşür?",
    hook2: "Sırrı kazana karışan oksijendedir; oksijen yoksa reaksiyon tersine döner ve hamur gevşer!",
    benchRule: "Katkısız artizan üretimde glutatyonu doğal yoldan dengelemek için yoğurma sonrası katlamalarla hamura temiz hava kazandırın.",
    mythTitle: "Havasız Yoğurma Her Zaman Daha Sıkı Gluten Kurar",
    mythCorrection: "Disülfit köprülerinin yeniden kurulması ve tiyol dengesi için yoğurma ve katlama aşamalarında çözünmüş oksijen şarttır.",
    pairingNote: "Taş fırın somunu + dana kavurma + köz biber",
  },
  {
    konuId: "KONU-19",
    issueNumber: 21,
    partLabel: "Kısım V · Hamur Reolojisi",
    title: "Ksilanazlar ve Suyun Yeniden Dağıtımı: Kepekli Hamuru Açmak",
    subtitle: "Çözünmez WUAX Liflerini Çözünür WEAX Jeline Dönüştürmek",
    productSlug: "tam-bugday-eksi-mayali-somun",
    productName: "Tam Buğday Ekşi Mayalı Somun",
    coreMechanism:
      "Buğdayda gaz zarlarını delen çözünmez WUAX liflerinin endo-ksilanaz ve uzun fermantasyonla çözünür WEAX'a kesilip suyun glutene iade edilmesi.",
    anchorPaper: "10.1111/1541-4337.12176",
    ftsPaperCount: 52,
    beat: "arabinoksilan_jeli",
    metricUnit: "% WEAX Payı",
    points: [["Kuru Karışım", 24], ["Ön Islatma", 34], ["Uzun Ekşi Maya", 48], ["Aşırı Kesim", 72]],
    hook1: "Tam buğday hamurunda lifler suyu glutenden çalar; peki bu suyu glutene geri iade etmek mümkün mü?",
    hook2: "Uzun fermantasyon çözünmez sert lifleri çözünür viskoz liflere dönüştürerek tam buğday somununu hafifletir!",
    benchRule: "Tam buğdayda ön ıslatma + soğuk fermantasyon ikilisini kullanarak sert liflerin su rekabetini yumuşatın.",
    mythTitle: "Tam Buğday Ekmeği Doğası Gereği Tuğla Gibi Sert Olmak Zorundadır",
    mythCorrection: "Yeterli hidrasyon ve lif yumuşatma penceresiyle tam buğdayda da esnek ve nemli kırıntı elde edilir.",
    pairingNote: "Tam buğday somunu + köy tereyağı + olgun tulum",
  },
  {
    konuId: "KONU-21",
    issueNumber: 22,
    partLabel: "Kısım VI · Fırın Termodinamiği",
    title: "Buharın İki Dakikalık Mucizesi, Jilet Atma ve Maillard",
    subtitle: "Yoğuşma Gizli Isısı, Parlak Kabuk ve 2-Asetil-1-Pirolin Aroması",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Soğuk hamur yüzeyinde yoğuşan buharın gizli ısı aktarımı ve yüzey nişasta jelatinizasyonu; >140 °C kuru fazda Maillard reaksiyonuyla kavruk kabuk aroması oluşumu.",
    anchorPaper: "10.26502/jfsnr.2642-11000056",
    ftsPaperCount: 52,
    beat: "maltoz_ortakligi",
    metricUnit: "Kabuk °C",
    points: [["Buhar Yoğuşma", 65], ["Jelatin Parlaklık", 95], ["Maillard Başlar", 142], ["Kavruk Kilit", 185]],
    hook1: "Fırına neden su püskürtüyoruz? Sanıldığı gibi hamuru ıslatmak için değil, yoğuşma gizli ısısıyla yüzeyi esnek tutmak için!",
    hook2: "İlk iki dakikadaki buhar yüzey nişastasını cam gibi parlatır; son on beş dakikadaki kuru ısı ise Maillard kokusunu üretir!",
    benchRule: "Buharı yalnızca ilk 2 dakikada yoğun verin; pişmenin ikinci yarısında buharı tahliye ederek >140 °C Maillard kızarmasını açın.",
    mythTitle: "Pişme Boyunca Sürekli Buhar Verilirse Kabuk Daha Çıtır Olur",
    mythCorrection: "Son aşamada içeride kalan buhar kabuk sıcaklığını düşürür ve Maillard gevrekliğini engelleyip lastiksi kabuk bırakır.",
    pairingNote: "Parlak kulaklı somun + kasap sucuğu + köy yumurtası",
  },
  {
    konuId: "KONU-23",
    issueNumber: 23,
    partLabel: "Kısım VII · Analitik Gıda Kimyası",
    title: "Fitik Asit, Tahıl Fitazı ve pH 5,0 Penceresi",
    subtitle: "Hamurda IP6 Hidrolizi: Ne Ölçülüyor, Sosyal Medyada Ne Abartılıyor?",
    productSlug: "tam-bugday-eksi-mayali-somun",
    productName: "Tam Buğday Ekşi Mayalı Somun",
    coreMechanism:
      "Tahılın kendi endojen fitaz enziminin pH 4,5–5,5 optimumunda miyoinositol hekzakisfosfatı (IP6) parçalaması; kısa mayalamada pH ~5,8 kaldığı için reaksiyonun sınırlı kalması.",
    anchorPaper: "10.3390/fermentation7020063",
    ftsPaperCount: 47,
    beat: "ph_duvari",
    metricUnit: "% IP6 Azalma",
    points: [["Ham Un", 0], ["Kısa Maya pH 5,8", 22], ["Ekşi Maya pH 5,0", 74], ["Aşırı Asit pH 3,3", 58]],
    hook1: "Fitik asidi parçalayan asıl aktör ekşi maya bakterisi değil, unun kendi içinde uyuyan tahıl fitazı enzimidir!",
    hook2: "Ancak bu enzim uyanmak için pehaş beş civarındaki orta asitlik penceresini bekler!",
    benchRule: "Tam tahıllı hamurlarda tahıl fitazının optimum pH 4,5–5,2 aralığında yeterli süre kalmasına izin veren uzun fermantasyon uygulayın.",
    mythTitle: "Fitik Asidi Yalnızca Bakteriler Doğrudan Yutar",
    mythCorrection: "Ekşi maya bakterilerinin ana rolü ortam pH'sını 5,0 bandına çekerek tahılın kendi güçlü fitaz enzimini aktive etmektir.",
    pairingNote: "Tam buğday somunu + ceviz + eski kaşar",
  },
  {
    konuId: "KONU-24",
    issueNumber: 24,
    partLabel: "Kısım VII · Analitik Gıda Kimyası",
    title: "Fruktanlar, İnvertaz ve Mannitol: Şeker Dönüşümü Sınırları",
    subtitle: "Uzun Fermantasyonda Karbonhidrat Dönüşümü ve Analitik Gerçekler",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "Buğday fruktanlarının (%1–2) maya invertazı ve LAB enzimleriyle fruktoza kesilmesi, fruktozun mannitole dönüşmesi ve glutenin >20 ppm üzerinde kalmaya devam etmesi.",
    anchorPaper: "10.1016/j.foodchem.2016.09.004",
    ftsPaperCount: 25,
    beat: "maltoz_ortakligi",
    metricUnit: "% Fruktan",
    points: [["Ham Un", 100], ["1 Saat Maya", 62], ["6 Saat Ekşi", 34], ["18 Saat Soğuk", 19]],
    hook1: "Ekşi maya glüteni tamamen yok eder sözü fırıncılık dünyasındaki en tehlikeli şehir efsanesidir!",
    hook2: "Uzun fermantasyonda asıl dönüşen şey protein iskeleti değil, unun içindeki graminan tipi fruktan şekerleridir!",
    benchRule: "Müşteriye asla glütensizleşir vaadi vermeyin; uzun fermantasyonu daima ölçülen karbonhidrat dönüşümü ve doku diliyle anlatın.",
    mythTitle: "Uzun Ekşi Maya Fermantasyonu Buğday Ekmeğini Glütensiz Yapar",
    mythCorrection: "Pişmiş buğday ekşi mayalı ekmeğinde binlerce ppm aktif gluten ağı kalır; aksi takdirde somun zaten kabarıp dik duramazdı.",
    pairingNote: "Soğuk fermantasyon köy somunu + tereyağı + köy sütü",
  },
  {
    konuId: "KONU-25",
    issueNumber: 25,
    partLabel: "Kısım VIII · Ekmeği Okuma Sanatı",
    title: "Gözenek Haritası ve Buhar Cebi: X-Işınıyla Somun Okumak",
    subtitle: "Tavanda Mağara, Tabanda Lastiksi Bant ve %99 Bağlantılı Labirent",
    productSlug: "tas-degirmen-koy-somunu",
    productName: "Taş Değirmen Köy Somunu",
    coreMechanism:
      "X-ışını mikro-BT tomografisinde somun gözeneklerinin %99 birbiriyle bağlantılı labirent yapısı; tavanda dev mağara (eksik asitlik / az olgunlaşma) ve taban kusur teşhisi.",
    anchorPaper: "10.1016/j.jcs.2011.05.004 (It's a maze)",
    ftsPaperCount: 90,
    beat: "disulfit_agi",
    metricUnit: "% Bağlantı",
    points: [["Ham Köpük", 14], ["Fırın 6. dk", 48], ["Sünger Geçişi", 96], ["Pişmiş Somun", 99]],
    hook1: "Somunu ortadan ikiye kestiğinizde gördüğünüz gözenekler size fırıncının nerede hata yaptığını saniyesinde anlatır!",
    hook2: "Üst kabuğun altında dev bir mağara, tabanda ise sıkı bir bant varsa sorun fırın değil fermantasyon zamanlamasıdır!",
    benchRule: "Her pişirimden bir kontrol somununu tam soğuduktan sonra ortadan kesip gözenek dağılımını kayıt altına alın.",
    mythTitle: "Dev Delikler Her Zaman Usta İşi Fermantasyon Gösterir",
    mythCorrection: "Tavanda toplanmış birkaç dev boşluk ve sıkı taban, hamurun erken fırınlandığının (underproofed) klasik imzasıdır.",
    pairingNote: "Dengeli gözenekli taş fırın somunu + tereyağı + kavurma + tulum peyniri",
  },
];

function buildScenesFromLines(
  lines: readonly string[],
  beat: StudyoMechanismBeat,
  konuId: string,
  kind: "seri_a" | "seri_b"
): StudyoScene[] {
  return lines.map((line, index) => {
    const sceneNo = index + 1;
    const isHook = index === 0;
    const isClose = index === lines.length - 1;
    const title = isHook
      ? "Kanca (İlk 3 sn)"
      : isClose
      ? "Tezgâh Kuralı & Kapanış"
      : `Mekanizma Adımı ${index}`;
    const visualCue =
      kind === "seri_b"
        ? `S24 Gerçek Taş Fırın Klibi #${sceneNo} · Atölye Kremi Kinetik Kart`
        : index === 1 || index === 2
        ? `${konuId} Canlı Bilim Grafiği (60 fps) + Mekanizma Kartı`
        : `${konuId} Makro Hamur / Kavanoz Dokusu + Kelime Senkron Altyazı`;
    const flowPrompt =
      kind === "seri_b"
        ? "Gerçek S24 taş fırın klibi kullanılır (Seri B'de yapay zekâ ekmek görüntüsü yasaktır)."
        : `Macro scientific visualization for ${konuId} scene ${sceneNo}, warm stone bakery lighting, shallow depth of field, 9:16 vertical, crisp texture, zero text overlay.`;
    return makeScene(sceneNo, title, line, line, visualCue, flowPrompt, beat);
  });
}

function createPlannedIssue(seed: PlannedTopicSeed): StudyoIssue {
  const kisa01Lines = [
    seed.hook1,
    `Tezgâhta gördüğümüz bu davranışın arkasında net bir fizikokimya vardır: ${seed.coreMechanism}`,
    `Tam metin laboratuvar ölçümlerinde (${seed.anchorPaper}) kritik eşik aşıldığında hamur dokusunun yön değiştirdiği açıkça görülür.`,
    seed.benchRule,
    `Efsanelerle değil ölçümlerle ekmek pişirin; tüm veri grafikleri EkmekLab bilim arşivinde!`,
  ];

  const kisa02Lines = [
    seed.hook2,
    `Pek çok fırıncı "${seed.mythTitle}" yanılgısına düşer. Oysa gerçek mekanizma bambaşkadır.`,
    seed.mythCorrection,
    seed.benchRule,
    `Haftalık taş fırın üretimi ve bölüm notları için EkmekLab sayfasını takip edin!`,
  ];

  const seriBLines = [
    `Taş fırın atölyemizde ${seed.productName} hazırlarken ${seed.title.toLowerCase()} ilkesini adım adım uyguluyoruz.`,
    seed.benchRule,
    `Odun ve taş taban ısısında kabuk karamelize olurken iç doku dengesini koruyor.`,
    `Fırından yeni çıkan somunumuz ${seed.pairingNote} eşleşmesiyle sofraya hazır!`,
  ];

  const qrTargetPath = `/urun/${seed.productSlug}?kaynak=gazete-${seed.konuId.toLowerCase()}`;

  return {
    konuId: seed.konuId,
    issueNumber: seed.issueNumber,
    partLabel: seed.partLabel,
    title: seed.title,
    subtitle: seed.subtitle,
    productSlug: seed.productSlug,
    productName: seed.productName,
    status: "planned",
    coreMechanism: seed.coreMechanism,
    anchorPapers: [seed.anchorPaper],
    ftsPaperCount: seed.ftsPaperCount,
    audioMode: "voice_ducking",
    approvedFormats: [],
    publishedChannels: [],
    directorNotes: "",
    bookSummary: `${seed.title}: ${seed.coreMechanism} Tezgâh kuralı: ${seed.benchRule}`,
    chart: {
      title: `${seed.konuId} · Ölçüm Eğrisi`,
      unit: seed.metricUnit,
      primaryLabel: seed.subtitle,
      points: seed.points.map(([xLabel, value]) => ({ xLabel, value })),
    },
    defaultBeat: seed.beat,
    newspaper: {
      headline: `Sayı #${String(seed.issueNumber).padStart(2, "0")} — ${seed.title}`,
      subheadline: seed.subtitle,
      leadFact: seed.coreMechanism,
      benchRule: seed.benchRule,
      mythTitle: seed.mythTitle,
      mythCorrection: seed.mythCorrection,
      pairingNote: seed.pairingNote,
      qrTargetPath,
    },
    social: {
      reelsCaption: `${seed.hook1}\n\n🔬 Mekanizma: ${seed.coreMechanism}\n🍞 Tezgâh Kuralı: ${seed.benchRule}\n\nTaş fırın somunları ve bilim arşivi: ${SITE_URL}/bilim (${SOCIAL.instagram.handle})`,
      tiktokCaption: `${seed.hook1} #ekmeklab #eksimaya #tasfirin #ekmekbilimi`,
      youtubeTitle: `${seed.title} | EkmekLab Sayı #${String(seed.issueNumber).padStart(2, "0")}`,
      youtubeDescription: `00:00 Kanca\n00:08 Fizikokimyasal Mekanizma (${seed.anchorPaper})\n00:24 Tezgâh Kuralı\n\nBilim Odası: ${SITE_URL}/bilim\nÜrün: ${SITE_URL}/urun/${seed.productSlug}`,
      accompanimentCta: `Bu haftanın taş fırın eşleşmesi: ${seed.pairingNote} — ${SITE_URL}`,
    },
    scenes: {
      kisa_01: buildScenesFromLines(kisa01Lines, seed.beat, seed.konuId, "seri_a"),
      kisa_02: buildScenesFromLines(kisa02Lines, seed.beat, seed.konuId, "seri_a"),
      seri_b: buildScenesFromLines(seriBLines, seed.beat, seed.konuId, "seri_b"),
      uzun: [
        makeScene(
          1,
          "Bölüm Özeti & Kanca",
          seed.hook1,
          `${seed.hook1} ${seed.coreMechanism}`,
          "16:9 Geniş Bilim Grafiği",
          `Wide 16:9 scientific documentary frame for ${seed.konuId}, stone bakery tone.`,
          seed.beat
        ),
        makeScene(
          2,
          "Tezgâh Kuralı",
          seed.benchRule,
          `${seed.mythCorrection} ${seed.benchRule}`,
          "16:9 Tezgâh Parametre Tablosu",
          `Wide 16:9 artisan dough bench measurement scene for ${seed.konuId}.`,
          seed.beat
        ),
      ],
    },
    voiceTakes: {},
    ovenClips: [],
    readyAssets: [],
    updatedAt: "2026-11-15T12:00:00+03:00",
  };
}

function createReadyCatalogIssue(raw: RawCatalogTopic): StudyoIssue {
  const qrTargetPath = `/urun/${raw.productSlug}?kaynak=gazete-${raw.konuId.toLowerCase()}`;
  const kisa01 = raw.kisa01Lines ?? [
    raw.subtitle,
    raw.coreMechanism,
    raw.benchRule,
    raw.mythCorrection,
    raw.pairingNote,
  ];
  const kisa02 = raw.kisa02Lines ?? kisa01;
  const seriB = raw.seriBLines ?? [
    raw.subtitle,
    raw.benchRule,
    raw.mythCorrection,
    raw.pairingNote,
  ];

  return {
    konuId: raw.konuId,
    issueNumber: raw.issueNumber,
    partLabel: raw.partLabel,
    title: raw.title,
    subtitle: raw.subtitle,
    productSlug: raw.productSlug,
    productName: raw.productName,
    status: raw.status,
    coreMechanism: raw.coreMechanism,
    anchorPapers: raw.anchorPapers,
    ftsPaperCount: raw.ftsPaperCount,
    audioMode: "voice_ducking",
    approvedFormats: ["kisa_01", "kisa_02"],
    publishedChannels: [],
    directorNotes: "",
    bookSummary: raw.uzunSummary,
    chart: raw.chart,
    defaultBeat: raw.defaultBeat,
    newspaper: {
      headline: `Sayı #${String(raw.issueNumber).padStart(2, "0")} — ${raw.title}`,
      subheadline: raw.subtitle,
      leadFact: raw.coreMechanism,
      benchRule: raw.benchRule,
      mythTitle: raw.mythTitle,
      mythCorrection: raw.mythCorrection,
      pairingNote: raw.pairingNote,
      qrTargetPath,
    },
    social: {
      reelsCaption: `${kisa01[0]}\n\n🔬 Mekanizma: ${raw.coreMechanism}\n🍞 Tezgâh Kuralı: ${raw.benchRule}\n\nKaynaklar ve taş fırın takvimi: ${SITE_URL}/bilim (${SOCIAL.instagram.handle})`,
      tiktokCaption: `${kisa01[0]} #ekmeklab #eksimaya #tasfirin #fermantasyon`,
      youtubeTitle: `${raw.title} | EkmekLab Sayı #${String(raw.issueNumber).padStart(2, "0")}`,
      youtubeDescription: `00:00 Kanca\n00:07 Fizikokimyasal Mekanizma\n00:25 Tezgâh Kuralı\n\nÇapa Makaleler: ${raw.anchorPapers.join(" · ")}\nBilim Odası: ${SITE_URL}/bilim\nÜrün: ${SITE_URL}/urun/${raw.productSlug}`,
      accompanimentCta: `Bu haftanın taş fırın sofrası: ${raw.pairingNote} — Sipariş: ${SITE_URL}`,
    },
    scenes: {
      kisa_01: buildScenesFromLines(kisa01, raw.defaultBeat, raw.konuId, "seri_a"),
      kisa_02: buildScenesFromLines(kisa02, raw.defaultBeat, raw.konuId, "seri_a"),
      seri_b: buildScenesFromLines(seriB, raw.defaultBeat, raw.konuId, "seri_b"),
      uzun: [
        makeScene(
          1,
          "Uzun Bölüm Çekirdek Özeti",
          raw.uzunSummary,
          raw.uzunSummary,
          "16:9 Geniş Bilim Grafiği",
          `Wide 16:9 documentary visual for ${raw.konuId}.`,
          raw.defaultBeat
        ),
        makeScene(
          2,
          "Tezgâh Parametreleri",
          raw.benchRule,
          `${raw.mythCorrection} ${raw.benchRule}`,
          "16:9 Fırın Evi Parametre Kartı",
          `Wide 16:9 stone oven bench scene for ${raw.konuId}.`,
          raw.defaultBeat
        ),
      ],
    },
    voiceTakes: {},
    ovenClips: [],
    readyAssets: [],
    updatedAt: "2026-11-15T12:00:00+03:00",
  };
}

/** 25 sayının tamamını (Sayı #01–#05 tam paket + #06–#25 yapılandırılmış başlangıç paketleri) üretir. */
export function buildInitialStudyoCatalog(): StudyoIssue[] {
  const ready = CATALOG_TOPICS.map(createReadyCatalogIssue);
  const planned = PLANNED_TOPICS.map(createPlannedIssue);
  return [...ready, ...planned].sort((a, b) => a.issueNumber - b.issueNumber);
}
