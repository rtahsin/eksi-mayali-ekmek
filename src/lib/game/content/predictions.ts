import type { Prediction } from "@/types/game";

/**
 * Tahmin et → gör → anla. Her soru oyunun bir anında sorulur; cevaptan sonra kısa açıklama ve kart.
 * İçerik docs/BILIM.md'den.
 */
export const PREDICTIONS: Prediction[] = [
  {
    id: "kaynak",
    at: "maya:kaynak",
    question: "Ekşi mayadaki canlılar en çok nereden gelir?",
    options: [
      { id: "hava", text: "Havadan" },
      { id: "un", text: "Unun kendisinden" },
      { id: "su", text: "Sudan" },
    ],
    correct: "un",
    reveal: "Undan. Mikroplar tahıl tanesinin yüzeyinden una geçer. 500 maya karşılaştırıldığında hava ve coğrafya belirleyici çıkmadı.",
    cardId: "efsane_hava",
  },
  {
    id: "sahte",
    at: "maya:sahte_kabarma",
    question: "Kavanoz bir günde iki katına çıktı. Mayan hazır mı?",
    options: [
      { id: "evet", text: "Evet, hemen ekmek yapalım" },
      { id: "hayir", text: "Hayır, bu sahte kabarma" },
    ],
    correct: "hayir",
    reveal: "Bu gazı mayalar değil enterobakteriler yaptı. Asit yükselince elenecekler. Peynirimsi koku da onlardan.",
    cardId: "enterobakteri",
  },
  {
    id: "sessiz",
    at: "maya:sessizlik",
    question: "Dün kabaran maya bugün kıpırdamıyor. Ne yaparsın?",
    options: [
      { id: "at", text: "Öldü, atıp baştan başlarım" },
      { id: "sabret", text: "Beslemeye devam eder, sabrederim" },
    ],
    correct: "sabret",
    reveal: "Ölmedi. Asit yükseldi, öncüler çekildi; mayalar henüz az. Yeni başlayanların çoğu mayayı tam burada atar.",
    cardId: "efsane_olu_maya",
  },
  {
    id: "tepe",
    at: "koy:maya",
    question: "Maya tepe noktasını geçip çökmeye başlarsa ne olur?",
    options: [
      { id: "guclu", text: "Daha güçlü olur" },
      { id: "eksi", text: "Daha ekşi olur, kabartma gücü düşer" },
      { id: "fark", text: "Hiçbir şey değişmez" },
    ],
    correct: "eksi",
    reveal: "Şeker azalır, asit birikir. Ekmek daha ekşi olur; çok beklerse kabartma gücü de düşer. Biraz geç kullanmak tercih meselesidir.",
    cardId: "asitler",
  },
  {
    id: "su",
    at: "koy:hamur",
    question: "Usta neden buz gibi suyla hamur yapar?",
    options: [
      { id: "lezzet", text: "Soğuk su lezzet verir" },
      { id: "sicaklik", text: "Yoğurma hamuru ısıtır; hedef ~27 °C" },
      { id: "gluten", text: "Soğuk su gluteni sertleştirir" },
    ],
    correct: "sicaklik",
    reveal: "Yoğurmanın sürtünmesi hamuru ısıtır. Oda, un ve mayanın sıcaklığıyla birlikte suyu ayarlayarak hamuru ~27 °C'de tutarsın.",
    cardId: "olay_soguk_su",
  },
  {
    id: "tuz",
    at: "koy:yogurma",
    question: "Tuz gluten ağını ne yapar?",
    options: [
      { id: "zayif", text: "Zayıflatır" },
      { id: "guclu", text: "Sıkılaştırır" },
      { id: "yok", text: "Etkilemez, yalnız tat verir" },
    ],
    correct: "guclu",
    reveal: "Proteinlerdeki yükleri perdeler; hamur daha sıkı ve daha az yapışkan olur. Mayayı da biraz yavaşlatır.",
    cardId: "tuz",
  },
  {
    id: "kabarcik",
    at: "koy:mayalanma",
    question: "Hamurdaki kabarcıklar nereden geliyor?",
    options: [
      { id: "maya", text: "Maya yeni kabarcıklar yaratır" },
      { id: "hava", text: "Yoğururken giren havayı maya şişirir" },
    ],
    correct: "hava",
    reveal: "Maya yeni kabarcık yaratamaz. CO₂ önce suda çözünür, sonra yoğurmada giren minik hava çekirdeklerini şişirir.",
    cardId: "olay_kabarcik",
  },
  {
    id: "dolap",
    at: "koy:sekil",
    question: "Hamur dolapta (4 °C) bütün gece ne yapar?",
    options: [
      { id: "uyur", text: "Her şey durur" },
      { id: "bakteri", text: "Maya neredeyse durur, bakteriler aroma işler" },
      { id: "kabarir", text: "İki katına çıkar" },
    ],
    correct: "bakteri",
    reveal: "Soğukta gaz üretimi neredeyse durur ama bakteriler yavaşça asit ve aroma üretir. Soğuk hamur kesik için de sıkılaşır.",
    cardId: "olay_dolap",
  },
  {
    id: "buhar",
    at: "koy:firin",
    question: "Fırına neden buhar verilir?",
    options: [
      { id: "nem", text: "İç kurumasın diye" },
      { id: "kabuk", text: "Kabuk geç donsun, ekmek açılsın" },
      { id: "renk", text: "Kabuk hemen kızarsın diye" },
    ],
    correct: "kabuk",
    reveal: "Buhar yüzeyi esnek tutar; kesik açılır, kulak kalkar, yüzey nişastası jelleşip parlar. Kabarma bitince tahliye: kabuk renk alır.",
    cardId: "olay_buhar",
  },
  {
    id: "maya_olum",
    at: "koy:firin_ic",
    question: "Mayalar fırında ekmeğin içi kaç dereceye gelince ölür?",
    options: [
      { id: "40", text: "~40 °C" },
      { id: "60", text: "~60 °C" },
      { id: "100", text: "~100 °C" },
    ],
    correct: "60",
    reveal: "~60 °C. O ana kadar son bir gaz patlaması yaparlar. Hemen ardından nişasta jelleşir, ağ donar.",
    cardId: "olay_firin",
  },
  {
    id: "kesme",
    at: "koy:sogutma",
    question: "Fırından yeni çıkan ekmeği hemen kesersen?",
    options: [
      { id: "lezzetli", text: "En lezzetli hali" },
      { id: "hamur", text: "İçi hamurumsu olur" },
    ],
    correct: "hamur",
    reveal: "Nişasta henüz oturmadı, nem dağılmadı. Köy ekmeği ~3 saat sonra, yoğun ekmekler daha da geç kesilir.",
    cardId: "olay_kesme",
  },
  {
    id: "saklama",
    at: "koy:sonuc",
    question: "Ekmeği en uzun nerede taze tutarsın?",
    options: [
      { id: "buzdolabi", text: "Buzdolabında" },
      { id: "dondurucu", text: "Dondurucuda" },
      { id: "tezgah", text: "Tezgâhta, açıkta" },
    ],
    correct: "dondurucu",
    reveal: "Dondurucuda. Bayatlama nişastanın yeniden kristalleşmesidir ve ~4 °C'de en hızlıdır: buzdolabı bayatlatır.",
    cardId: "olay_bayatlama",
  },
  {
    id: "siyez",
    at: "siyez:giris",
    question: "Siyez hamuru neden daha nazlıdır?",
    options: [
      { id: "protein", text: "Proteini az" },
      { id: "gluten", text: "Proteini çok ama gluteni zayıf, az elastik" },
      { id: "nisasta", text: "Nişastası yok" },
    ],
    correct: "gluten",
    reveal: "Proteini bol ama ağı zayıf ve az elastik: yapışkan hamur, daha az su, daha nazik katlama.",
    cardId: "tarih_karacadag",
  },
];

export const PREDICTION_AT: Record<string, Prediction> = Object.fromEntries(PREDICTIONS.map((p) => [p.at, p]));
