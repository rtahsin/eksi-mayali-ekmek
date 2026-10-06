import { defineClaims } from "@/lib/knowledge/define";

export const claims = defineClaims({
  // ── Mayanın Canlıları ──
  claim_f_sanfran_growth: {
    text: "Fructilactobacillus sanfranciscensis optimum 30-33 °C sıcaklıkta ürer, 41 °C üzerinde büyümesi durur.",
    about: ["f_sanfranciscensis", "olay_sicaklik_secer"],
    evidence: [
      {
        source: "ganzle_1998",
        locator: "s. 2618, Şekil 2",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_f_sanfran_maltose: {
    text: "Fructilactobacillus sanfranciscensis maltozu hücre içinde fosforilazla parçalayarak glukozu dış ortama salar.",
    about: ["f_sanfranciscensis", "maltoz"],
    evidence: [
      {
        source: "ganzle_1998",
        locator: "s. 2616-2617",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_f_sanfran_beetle: {
    text: "Fructilactobacillus sanfranciscensis depolanmış tahıllarda un böceklerinin (Tribolium confusum) sindirim sisteminde yaşar ve yayılır.",
    about: ["f_sanfranciscensis", "efsane_hava"],
    evidence: [
      {
        source: "boiocchi_2017",
        locator: "s. 945-947",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_l_plantarum_versatile: {
    text: "Lactiplantibacillus plantarum geniş karbonhidrat spektrumunu fermente edebildiği için kendiliğinden kurulan mayanın 4-6. günlerinde baskın hale gelir.",
    about: ["l_plantarum", "olay_ardisiklik"],
    evidence: [
      {
        source: "devuyst_2014",
        locator: "s. 14-16",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_oncu_lab_pioneer: {
    text: "Weissella ve Leuconostoc cinsi öncü laktik bakteriler mayanın ilk 2 gününde laktik asit üreterek pH değerini 5'in altına indirir.",
    about: ["oncu_lab", "olay_ardisiklik", "asitler"],
    evidence: [
      {
        source: "devuyst_2005",
        locator: "s. 44-46",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_enterobacter_false_rise: {
    text: "Un mikrobiyotasından gelen enterobakteriler ilk 24 saatte hızlı gaz üreterek sahte kabarma yapar ve pH 4,5 altına inince elenir.",
    about: ["enterobakteri", "olay_ardisiklik"],
    evidence: [
      {
        source: "devuyst_2005",
        locator: "s. 45",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_k_humilis_maltose_negative: {
    text: "Kazachstania humilis maltozu kullanamaz; bakterilerin serbest bıraktığı glukozla beslenir ve optimum 27 °C sıcaklıkta ürer.",
    about: ["k_humilis", "maltoz", "olay_sicaklik_secer"],
    evidence: [
      {
        source: "ganzle_1998",
        locator: "s. 2619, Tablo 1",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_s_cerevisiae_ferment: {
    text: "Saccharomyces cerevisiae glukoz ve fruktozu fermente ederek hamuru kabartan karbondioksit gazı ve etanol üretir.",
    about: ["s_cerevisiae", "co2"],
    evidence: [
      {
        source: "devuyst_2005",
        locator: "s. 46-47",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  // ── Gluten, Nişasta ve Enzimler ──
  claim_gluten_structure: {
    text: "Gliadin hamura akışkanlık ve uzama sağlarken, glutenin makropolimerleri disülfit köprüleriyle hamura elastik direnç kazandırır.",
    about: ["gluten"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 4, s. 72-76",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: {
      by: "tahsin",
      at: "2026-10-06",
      hash: "f4e06712e9d9",
    },
  },

  claim_starch_gelatinization: {
    text: "Nişasta taneleri fırında 60-82 °C aralığında su emip jelleşerek ekmek içinin gözenekli yapısını sabitler.",
    about: ["nisasta", "olay_firin"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 3, s. 45-50",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_damaged_starch: {
    text: "Değirmende zedelenen hasarlı nişasta taneleri, amilaz enzimlerinin fermente edilebilir şeker üretmek için erişebildiği birincil kaynaktır.",
    about: ["nisasta", "amilaz"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 3, s. 52",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: {
      by: "tahsin",
      at: "2026-10-06",
      hash: "69bbf2ba1c5e",
    },
  },

  claim_amylase_activity: {
    text: "Beta-amilaz 62-64 °C sıcaklıkta en yüksek aktiviteyi gösterip 82-84 °C'de inaktive olurken, alfa-amilaz 70-74 °C'ye kadar çalışır.",
    about: ["amilaz"],
    evidence: [
      {
        source: "auerman_2003",
        locator: "Bölüm 2, s. 88-92",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_acid_inhibits_amylase: {
    text: "Düşük hamur pH değeri alfa-amilaz enzimini baskılayarak çavdar ve tam tahıllı hamurlarda nişastanın aşırı sıvılaşmasını sınırlandırır.",
    about: ["amilaz", "asitler", "tarih_cavdar"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 8, s. 160-163",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_protease_activation: {
    text: "Unun aspartik proteinazları pH 3,8-4,0 seviyesine indiğinde aktive olarak gluten ağını kontrollü şekilde gevşetir.",
    about: ["proteaz", "gluten", "asitler"],
    evidence: [
      {
        source: "ganzle_prot_2008",
        locator: "s. 514-516",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_maltose_fuel: {
    text: "Beta-amilaz enzimi hasarlı nişastanın indirgeyici olmayan uçlarından iki glukozdan oluşan maltoz moleküllerini koparır.",
    about: ["maltoz", "amilaz"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 3, s. 48",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_co2_solubility: {
    text: "Fermantasyon gazı olan karbondioksit önce hamur suyunda çözünür, doyum noktası aşıldığında mevcut hava gözeneklerine geçerek genleşir.",
    about: ["co2", "olay_kabarcik"],
    evidence: [
      {
        source: "campbell_2020",
        locator: "s. 312-315",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_lactic_acetic_ratio: {
    text: "Yüksek hidrasyon ve ılık ortam laktik asit fermantasyonunu, serin sıcaklık ve sıkı hamur ise asetik asit fermantasyonunu artırır.",
    about: ["asitler", "olay_sicaklik_secer"],
    evidence: [
      {
        source: "ganzle_1998",
        locator: "s. 2620",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_salt_ionic_strength: {
    text: "Tuz proteinlerdeki elektrostatik yükleri perdeleyerek hamurun yapışkanlığını azaltır ve mayaları ozmotik basınçla yavaşlatır.",
    about: ["tuz", "gluten"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 4, s. 80-82",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_phytase_activation: {
    text: "Ekşi mayanın asit ortamı unun kendi fitaz enzimini çalıştırarak fitik asit düzeyini %50-70 oranında düşürür.",
    about: ["fitaz"],
    evidence: [
      {
        source: "leenhardt_2005",
        locator: "s. 100-102",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_pentosan_water_binding: {
    text: "Çavdar unundaki arabinoksilanlar (pentozanlar) ağırlıklarının katlarca fazlası su bağlayarak hamurun viskoz yapısını taşır.",
    about: ["pentozan", "tarih_cavdar"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 8, s. 158-160",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_aroma_2ap_synthesis: {
    text: "Laktik asit bakterilerinin argininden ürettiği ornitin, fırında Maillard reaksiyonuyla ekmek kabuğundaki 2-asetil-1-pirolin aromasına dönüşür.",
    about: ["aroma_2ap"],
    evidence: [
      {
        source: "thiele_2002",
        locator: "s. 48-50",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  // ── Olaylar ve Teknikler ──
  claim_spontaneous_succession: {
    text: "Kendiliğinden kurulan ekşi mayada un mikrobiyotası, öncü heterofermentatif koklar ve aside dayanıklı nihai türler ardışık olarak yerleşir.",
    about: ["olay_ardisiklik"],
    evidence: [
      {
        source: "devuyst_2014",
        locator: "s. 12-14",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_bubble_nucleation: {
    text: "Maya hamurda sıfırdan gaz kabarcığı üretemez; karıştırma sırasında hamura giren mikroskobik hava kabarcıklarını çekirdek alarak şişirir.",
    about: ["olay_kabarcik"],
    evidence: [
      {
        source: "campbell_2020",
        locator: "s. 310-312",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_autolyse_effect: {
    text: "Un ve suyun önceden dinlendirilmesi (otoliz), gluten proteinlerinin hidrate olmasını hızlandırarak gereken yoğurma süresini kısaltır.",
    about: ["olay_otoliz", "gluten"],
    evidence: [
      {
        source: "calvel_1974",
        locator: "Bölüm 3, s. 42-45",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: {
      by: "tahsin",
      at: "2026-10-06",
      hash: "72f2f8961904",
    },
  },

  claim_ddt_control: {
    text: "Yoğurma makinesinin sürtünme ısısı hamur sıcaklığını yükselttiğinden, hedef 27 °C fermantasyon sıcaklığı soğuk su ile dengelenir.",
    about: ["olay_soguk_su"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 5, s. 102",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_temp_selection: {
    text: "20-24 °C serin hamur sıcaklığı maya fermantasyonunu desteklerken, 28-32 °C ılık sıcaklık laktik asit bakterilerinin çoğalmasını hızlandırır.",
    about: ["olay_sicaklik_secer"],
    evidence: [
      {
        source: "ganzle_1998",
        locator: "s. 2618",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_cold_retardation: {
    text: "4 °C dolap fermantasyonunda maya gaz üretimi neredeyse dururken bakteriler yavaşça asit ve aroma üretmeye devam eder.",
    about: ["olay_dolap"],
    evidence: [
      {
        source: "ganzle_1998",
        locator: "s. 2621",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_oven_internal_temp: {
    text: "Fırında ekmek merkez sıcaklığı 60 °C'ye ulaştığında mayalar inaktive olur, 92-98 °C aralığında ise nişasta jelleşmesi tamamlanarak pişme gerçekleşir.",
    about: ["olay_firin"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 6, s. 120-124",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_steam_physics: {
    text: "Pişirme başlangıcında uygulanan buhar, hamur yüzeyini esnek tutarak kesiğin açılmasını sağlar ve yüzey nişastasını jelleştirerek parlak kabuk oluşturur.",
    about: ["olay_buhar"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 6, s. 126",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_staling_retrogradation: {
    text: "Ekmeğin bayatlaması temel olarak nişastanın soğudukça yeniden kristalleşmesi (retrogradasyon) sürecidir ve ~4 °C buzdolabı sıcaklığında en hızlı gerçekleşir.",
    about: ["olay_bayatlama", "nisasta"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 7, s. 140-144",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_crumb_settling: {
    text: "Sıcak ekmek fırından çıktıktan sonra nemin eşit dağılması ve nişasta jel matrisinin oturması için soğumaya bırakılmalıdır.",
    about: ["olay_kesme"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 6, s. 128",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_scalding_rye: {
    text: "Kaynar suyla haşlama yöntemi çavdarda amilazları inaktive edip nişastayı önceden jelleştirerek ekmeğin nemli kalmasını sağlar.",
    about: ["olay_haslama", "amilaz", "nisasta"],
    evidence: [
      {
        source: "auerman_2003",
        locator: "Bölüm 5, s. 210-214",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_rye_surface_cracking: {
    text: "Gluten ağı kuramayan çavdar hamurlarında yüzeyde beliren çatlaklar iç gaz basıncının olgunlaştığını gösterir.",
    about: ["olay_catlak", "pentozan"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 8, s. 162",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_falling_oven_temp: {
    text: "Büyük kalıp çavdar ekmeklerinde düşen fırın sıcaklığı, dış kabuğu yakmadan iç merkez sıcaklığının 96 °C'ye ulaşmasını sağlar.",
    about: ["olay_dusen_firin", "olay_firin"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 8, s. 164",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_fructan_degradation: {
    text: "12-48 saatlik uzun ekşi maya fermantasyonunda mikrobiyal enzimler tahıldaki fruktanların büyük bölümünü parçalar.",
    about: ["tarih_fruktan"],
    evidence: [
      {
        source: "loponen_2018",
        locator: "s. 98-100",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  // ── Efsaneler ──
  claim_myth_airborne_starter: {
    text: "Ekşi mayayı başlatan mikroorganizmalar havadan değil; tahıl tanesi ve unun kendi mikrobiyotasından kaynaklanır.",
    about: ["efsane_hava"],
    evidence: [
      {
        source: "landis_2021",
        locator: "s. 4-6",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "efsane",
    confidence: "yuksek",
    review: null,
  },

  claim_myth_celiac_safety: {
    text: "Standart ekşi maya fermantasyonu buğdaydaki gluten proteinlerini çölyak hastaları için güvenli 20 ppm sınırının altına indiremez.",
    about: ["efsane_colyak"],
    evidence: [
      {
        source: "greco_2011",
        locator: "s. 26-28",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "efsane",
    confidence: "yuksek",
    review: null,
  },

  claim_myth_dead_starter: {
    text: "Yeni mayanın 3. gününde gaz çıkışının durması topluluğun öldüğü anlamına gelmez; asit artışıyla öncü bakterilerin elendiği sessiz evredir.",
    about: ["efsane_olu_maya", "olay_ardisiklik"],
    evidence: [
      {
        source: "devuyst_2014",
        locator: "s. 15",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "efsane",
    confidence: "yuksek",
    review: null,
  },

  claim_myth_fridge_bread: {
    text: "Ekmeği buzdolabında (~4 °C) saklamak bayatlamayı geciktirmez; nişasta retrogradasyonunu hızlandırarak ekmeğin daha çabuk bayatlamasına yol açar.",
    about: ["efsane_dolap_ekmek", "olay_bayatlama"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 7, s. 142",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "efsane",
    confidence: "yuksek",
    review: null,
  },

  // ── Tarih ──
  claim_shubayqa_earliest_bread: {
    text: "Ürdün'deki Shubayqa 1 alanında bulunan 14.400 yıllık ekmek kırıntıları, yabani siyez ve arpayla ekmek yapımının tarımdan önce başladığını gösterir.",
    about: ["tarih_shubayqa"],
    evidence: [
      {
        source: "arranz_2018",
        locator: "s. 7926-7928",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_karacadag_einkorn: {
    text: "DNA parmak izi çalışmaları evcil siyez buğdayının yabani atasının Güneydoğu Anadolu'daki Karacadağ yamaçlarında evcilleştirildiğini gösterir.",
    about: ["tarih_karacadag"],
    evidence: [
      {
        source: "heun_1997",
        locator: "s. 1312-1314",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },

  claim_rye_sourdough_necessity: {
    text: "Çavdar ununda secalin proteinleri gluten ağı kuramadığı ve amilaz aktivitesi yüksek olduğu için ekmek yapımında ekşi mayanın asidi zorunludur.",
    about: ["tarih_cavdar", "pentozan", "amilaz"],
    evidence: [
      {
        source: "delcour_2010",
        locator: "Bölüm 8, s. 160",
        supportCheck: {
          via: "notebooklm",
          verdict: "destekliyor",
          at: "2026-10-06",
        },
      },
    ],
    status: "dogrulandi",
    confidence: "yuksek",
    review: null,
  },
});
