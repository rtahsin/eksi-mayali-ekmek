/**
 * Laboratuvar Defteri: oyunda aşamalarda kazanılan bilim notları.
 * Kural: sağlık iddiası yok; mekanizma + kaynak. Kaynaklar docs/OYUN.md'de listelenir.
 */

export type NoteStage =
  | "kapi"
  | "maya"
  | "hamur"
  | "yogurma"
  | "mayalanma"
  | "sekil"
  | "dolap"
  | "kesik"
  | "firin"
  | "sogutma"
  | "siyez"
  | "cavdar";

export interface ScienceNote {
  id: string;
  stage: NoteStage;
  title: string;
  body: string;
  source: string;
  /** Ustaların bile çoğunun bilmediği türden bilgi */
  rare?: boolean;
}

export const NOTES: ScienceNote[] = [
  {
    id: "yuzde_bir",
    stage: "maya",
    title: "Kavanozda yüze bir",
    body: "Olgun bir ekşi mayada her maya hücresine yaklaşık 100 laktik asit bakterisi düşer. Ekmeği kabartan mayadır; ekşiliği ve aromanın büyük kısmını bakteriler verir.",
    source: "De Vuyst & Neysens, Trends in Food Science & Technology (2005)",
    rare: true,
  },
  {
    id: "tepe_noktasi",
    stage: "maya",
    title: "Tepe noktası neden önemli?",
    body: "Beslenen maya saatler içinde asitlenir. Tepe noktasında maya en canlı, asit henüz yumuşaktır. Beklettikçe ekşilik artar, kabartma gücü düşer; bu yüzden aynı maya hem tatlı hem ekşi ekmek yapabilir.",
    source: "Calvert ve ark., ekşi maya derlemesi, PMC8117929 (2021)",
  },
  {
    id: "lastik_hilesi",
    stage: "maya",
    title: "Ustanın lastik hilesi",
    body: "Mayayı besledikten sonra kavanoza bir lastik geçir. Ne kadar kabardığını ve ne zaman inmeye başladığını tek bakışta görürsün; tepe noktasını kaçırmazsın.",
    source: "Atölye pratiği",
  },
  {
    id: "otoliz",
    stage: "hamur",
    title: "Otoliz: 1974'ün buluşu",
    body: "Fransız usta Raymond Calvel 1974'te un ile suyu tuzsuz ve mayasız dinlendirmeyi önerdi. Un suyu kendi kendine çeker, gluten kendiliğinden örülmeye başlar; yoğurma yaklaşık %15 kısalır, hamur daha esnek olur.",
    source: "Raymond Calvel, Le Goût du Pain; Bakerpedia",
    rare: true,
  },
  {
    id: "ddt",
    stage: "hamur",
    title: "Hamur sıcaklığı hesaplanır",
    body: "Fırıncılar hamur sıcaklığını şansa bırakmaz: (hedef sıcaklık × 4) − (oda + un + maya + yoğurma ısısı) = suyun sıcaklığı. Bu yüzden yazın buz gibi, kışın ılık su kullanılır.",
    source: "Fırıncılıkta istenen hamur sıcaklığı (DDT) yöntemi",
    rare: true,
  },
  {
    id: "firinci_yuzdesi",
    stage: "hamur",
    title: "Fırıncı yüzdesi",
    body: "Reçetede her şey una göre yazılır, un hep %100'dür. \"%75 su\", 1 kg una 750 g su demektir. Böylece 1 ekmeği de 100 ekmeği de aynı oranla yaparsın.",
    source: "Fırıncılık temel ölçüsü",
  },
  {
    id: "gluten_dansi",
    stage: "yogurma",
    title: "Gluten iki proteinin dansı",
    body: "Gliadin hamura uzama, glutenin geri toplama gücü verir. Yoğurmak bu iki proteini bir ağ gibi örer; o ağ fırında gazı tutan balondur.",
    source: "Geisslitz ve ark., Foods 8(9) (2019)",
  },
  {
    id: "delikler",
    stage: "yogurma",
    title: "Delikleri maya açmaz",
    body: "Ekmekteki her delik yoğururken doğar. Maya yeni kabarcık yaratamaz; yalnızca yoğurmada hamura giren minik hava kabarcıklarını karbondioksitle şişirir.",
    source: "Sun ve ark., Cereal Chemistry (2023) derlemesi",
    rare: true,
  },
  {
    id: "tuz",
    stage: "yogurma",
    title: "Tuz neden sonda?",
    body: "Tuz gluteni sıkılaştırır, mayalanmayı frenler ve tadı açar. Otolizde tuz kullanılmaz; çünkü unun suyu çekmesini yavaşlatır.",
    source: "Calvel yöntemi; Bakerpedia",
  },
  {
    id: "pencere",
    stage: "yogurma",
    title: "Pencere testi",
    body: "İyi gelişmiş gluten, bir parça hamuru yırtılmadan ışık geçirecek kadar inceltebilmeni sağlar. Ustalar yoğurmanın bittiğini buna bakarak anlar.",
    source: "Atölye pratiği",
  },
  {
    id: "sicaklik_hiz",
    stage: "mayalanma",
    title: "Sıcaklık hızdır",
    body: "Canlı süreçlerde kabaca her 10 °C, hızı ikiye katlar. Hamurdaki birkaç derecelik fark mayalanmayı saatlerce öne alır ya da geciktirir.",
    source: "Biyolojide Q10 kuralı",
  },
  {
    id: "laktik_asetik",
    stage: "mayalanma",
    title: "Yoğurt mu, sirke mi?",
    body: "Sıcak ve yumuşak hamurda yoğurt gibi yumuşak laktik asit, serin ve sıkı hamurda sirke gibi keskin asetik asit artar. Ustalar ekşiliği sıcaklıkla ayarlar.",
    source: "Hamelman, Bread (2004); fermantasyon literatürü",
    rare: true,
  },
  {
    id: "kavanoz_yontemi",
    stage: "mayalanma",
    title: "Hamurdan küçük bir kavanoz",
    body: "Hamurdan bir parçayı düz kenarlı küçük bir kavanoza koy ve işaretle. Büyük kasadaki hamurun yüzde kaç kabardığını göz kararı değil, cetvel gibi okursun.",
    source: "Atölye pratiği",
    rare: true,
  },
  {
    id: "parmak_testi",
    stage: "sekil",
    title: "Parmak testi",
    body: "Unlu parmakla hamura hafifçe bastır. Hemen geri dönerse daha erken; yavaşça, biraz iz bırakarak dönerse tam vakti; hiç dönmezse fazla kabarmış.",
    source: "Atölye pratiği",
  },
  {
    id: "pirinc_unu",
    stage: "sekil",
    title: "Bannetona pirinç unu",
    body: "Ustalar bannetonu pirinç unuyla unlar: pirinç ununda gluten yoktur ve az su çeker, bu yüzden hamur sepete yapışmaz. Ekmeğin üstündeki halkalar da buradan gelir.",
    source: "Atölye pratiği",
  },
  {
    id: "yuzey_gerginligi",
    stage: "sekil",
    title: "Gergin yüzey, yukarı kabarma",
    body: "Şekil verirken oluşturulan gergin dış yüzey, fırında gazı yukarı yönlendirir. Gevşek hamur yana yayılır, aşırı zorlanan hamurun yüzeyi yırtılır ve gaz kaçar.",
    source: "Atölye pratiği",
  },
  {
    id: "soguk_bekleme",
    stage: "dolap",
    title: "Soğukta kim yavaşlar?",
    body: "Dolapta maya, bakteriden daha çok yavaşlar. Kabarma neredeyse durur ama asit ve aroma gelişmeye devam eder. Soğuk hamuru kesmek de çok daha kolaydır.",
    source: "Fermantasyon literatürü; atölye pratiği",
  },
  {
    id: "fitaz",
    stage: "dolap",
    title: "Uzun fermantasyonun gizli işi",
    body: "Uzun ve asidik fermantasyonda unun kendi fitaz enzimi, mineralleri bağlayan fitik asidi parçalar. Tam buğdaylı ekşi mayalı hamurda bu oranın %90'a yaklaştığı ölçülmüştür.",
    source: "Lopez ve ark. (2001); Leenhardt ve ark. (2005)",
    rare: true,
  },
  {
    id: "kulak",
    stage: "kesik",
    title: "Kulak nasıl kalkar?",
    body: "Bıçağı yüzeye yaklaşık 30° yatık tutup tek ve kararlı bir hareketle kesersen kesiğin bir tarafı diğerinin üstüne kalkar: kulak. Dik kesik ekmeği simetrik açar.",
    source: "Atölye pratiği",
  },
  {
    id: "kesik_neden",
    stage: "kesik",
    title: "Neden kesik atılır?",
    body: "Fırında ekmek hızla büyür. Kesik, büyümenin nereden olacağını sen seçesin diye atılır; kesik atmazsan ekmek en zayıf yerinden kendiliğinden yırtılır.",
    source: "Atölye pratiği",
  },
  {
    id: "buhar",
    stage: "firin",
    title: "Buharın görevi",
    body: "Buhar soğuk hamurun üstünde yoğuşur, ısıyı hızla aktarır ve kabuğu nemli tutar. Ekmek kabuk sertleşmeden açılır; yüzeydeki nişasta jelleşip kabuğa parlaklık verir.",
    source: "Fırıncılık bilimi",
  },
  {
    id: "firin_kabarmasi",
    stage: "firin",
    title: "Fırında son nefes",
    body: "Hamurun içi yaklaşık 60 °C'ye gelene kadar maya son hızla gaz üretir, sonra ölür. Kabarmayı genleşen gaz ve buhar sürdürür; 60–80 °C arasında nişasta jelleşip iskeleti dondurur.",
    source: "Bakerpedia; fırıncılık bilimi",
  },
  {
    id: "maillard",
    stage: "firin",
    title: "Kabuğun kokusu",
    body: "140 °C'nin üstünde şekerler ve amino asitler Maillard tepkimesine girer. Kraker kokusunu veren 2-asetil-1-pirolin, kabukta içe göre yaklaşık 30 kat fazladır.",
    source: "Schieberle & Grosch, TU München (1985, 1992)",
    rare: true,
  },
  {
    id: "ic_sicaklik",
    stage: "firin",
    title: "Pişti mi?",
    body: "Ustalar renge bakar, ekmeğin altına vurup tok sesi dinler. Termometre ise 96–98 °C der: iç bu sıcaklığa gelmeden nişasta tam oturmaz.",
    source: "Fırıncılık pratiği",
  },
  {
    id: "kabuk_sarkisi",
    stage: "sogutma",
    title: "Ekmek şarkı söyler",
    body: "Soğurken sert kabuk içten daha hızlı büzülür; minik çatlaklar çıtır çıtır ses çıkarır. Fırıncılar buna kabuğun şarkısı der; iyi pişmiş kabuğun işaretidir.",
    source: "Fırıncılık pratiği",
  },
  {
    id: "bayatlama",
    stage: "sogutma",
    title: "Bayatlama kurumak değildir",
    body: "Ekmek, nişasta yeniden kristalleştiği için bayatlar (retrogradasyon). Bu en hızlı 0–5 °C'de olur: buzdolabı ekmeği en hızlı bayatlatan yerdir. Dondurucu ise süreci durdurur.",
    source: "Nişasta retrogradasyonu literatürü",
    rare: true,
  },
  {
    id: "kesme_zamani",
    stage: "sogutma",
    title: "Sıcak ekmek kesilmez",
    body: "Fırından yeni çıkan ekmeğin içinde buhar var, nişasta henüz oturmadı. Erken kesince iç yapışkan ve hamurumsu olur; köy ekmeği yaklaşık 3 saat bekler.",
    source: "Fırıncılık pratiği",
  },
  {
    id: "siyez_karacadag",
    stage: "siyez",
    title: "Siyezin evi: Karacadağ",
    body: "Siyez (Triticum monococcum) insanlığın ilk evcilleştirdiği buğdaylardandır. DNA analizi, dünyadaki tüm evcil siyezin atasını Diyarbakır ile Şanlıurfa arasındaki Karacadağ'ın yabani siyezine bağladı.",
    source: "Heun ve ark., Science 278 (1997)",
    rare: true,
  },
  {
    id: "siyez_gluten",
    stage: "siyez",
    title: "Siyez neden naz yapar?",
    body: "Siyezde gliadinin glutenine oranı modern buğdaydan çok yüksektir: hamur kolay uzar ama şeklini zor tutar, daha az su kaldırır. İçinin altın sarısı rengi lutein pigmentinden gelir.",
    source: "Geisslitz ve ark., Foods 8(9) (2019)",
    rare: true,
  },
  {
    id: "cavdar",
    stage: "cavdar",
    title: "Çavdar başka bir dünya",
    body: "Çavdarda işi gluten değil pentozanlar görür. Çavdar ekmeği ekşi mayasız olmaz, çünkü asit nişastayı parçalayan enzimi frenler. Yüksek çavdarlı ekmek 1–2 gün dinlenmeden kesilmez.",
    source: "Hamelman, Bread (2004)",
  },
];

export const NOTE_BY_ID: Record<string, ScienceNote> = Object.fromEntries(NOTES.map((n) => [n.id, n]));

/** Bir aşamada henüz toplanmamış ilk not (tekrar oynayınca yenileri gelir) */
export function nextNoteFor(stage: NoteStage, collected: ReadonlySet<string>): ScienceNote | null {
  return NOTES.find((n) => n.stage === stage && !collected.has(n.id)) ?? null;
}
