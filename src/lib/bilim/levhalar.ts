import type { LevhaTanimi } from "./grafik";

// Levha düzenindeki anların rakamları ve grafikleri (bayrak sahnesi olmayan 16 an). Her etiket bağlı bilginin
// metnindeki sayıyı yazar; başlık ve notlar anın cümlelerindeki koşulları tekrarlar, yeni bilgi eklemez.
// Denetim: src/app/__checks__/levha.check.test.ts.

const SOGUMA: LevhaTanimi = {
  rakamlar: [
    { deger: "41,2", birim: "g su / 100 g", aciklama: "taze ekmeğin içinde", bilgi: "nem_gocu.taze_ic_kabuk_nemi", renk: "ic" },
    { deger: "15,0", birim: "g su / 100 g", aciklama: "aynı ekmeğin kabuğunda", bilgi: "nem_gocu.taze_ic_kabuk_nemi", renk: "kabuk" },
    { deger: "%4,2", birim: "200 °C", aciklama: "fırında merkezin neminde varılan artış", bilgi: "nem_gocu.pisirmede_merkez_nem_kazanir" },
    { deger: "%29,7", birim: "14 gün", aciklama: "kâğıt torbada kaybedilen ağırlık", bilgi: "nem_gocu.kagit_torba_agirlik_kaybi" },
  ],
  grafikler: [
    { tur: "sema", sema: "nem_kesiti", baslik: "Merkezden kenara", bilgi: "nem_gocu.merkez_100_derece", yer: { bolum: 0 } },
    {
      tur: "sutun",
      baslik: "Fırın ısındıkça kaybedilen nem",
      birim: "%",
      bilgi: "nem_gocu.pisirme_sicakligi_nem_kaybi",
      not: "Küçük kalıp ekmeği.",
      yer: { bolum: 0 },
      ogeler: [
        { ad: "180 °C", deger: 11, etiket: "%11" },
        { ad: "200 °C", deger: 15, etiket: "%15" },
        { ad: "220 °C", deger: 17, etiket: "%17" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Merkezde nem hangi sıcaklıkta artıyor?",
      birim: "°C",
      alt: 20,
      ust: 100,
      adim: 20,
      bilgi: "nem_gocu.merkez_nem_artisi_65c_altinda",
      not: "Kaynaklar ayrışıyor.",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Wagner vd., 2007", kadar: 65, etiket: "≤ 65 °C" },
        { ad: "Thorvaldsson ve Skjöldebrand, 1998", nokta: 70, pay: 5, etiket: "70 ± 5 °C", bilgi: "nem_gocu.core_nem_70c_esigi" },
        { ad: "Buhar kenara göçer", cizgi: 100, etiket: "100 °C", bilgi: "nem_gocu.merkez_100_derece", renk: "notr" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Su nerede: iç ve kabuk",
      birim: "g / 100 g",
      ust: 50,
      adim: 10,
      bilgi: "nem_gocu.taze_ic_kabuk_nemi",
      not: "İki değer aynı koşulda ölçülmedi.",
      yer: { bolum: 1 },
      lejant: { nokta: "taze ekmek", aralik: "soğumuş ekmek" },
      satirlar: [
        { ad: "İç, taze", nokta: 41.2, etiket: "41,2", renk: "ic" },
        { ad: "İç, soğumuş", aralik: [35, 40], etiket: "%35–40", renk: "ic", bilgi: "nem_gocu.sogumus_ekmek_ic_kabuk_nemi" },
        { ad: "Kabuk, taze", nokta: 15, etiket: "15,0", renk: "kabuk" },
        { ad: "Kabuk, soğumuş", aralik: [3, 7], etiket: "%3–7", renk: "kabuk", bilgi: "nem_gocu.sogumus_ekmek_ic_kabuk_nemi" },
      ],
    },
    {
      tur: "once_sonra",
      baslik: "Saklamanın ilk 7 gününde suyun yeri",
      ust: 80,
      xEtiket: ["gün 0", "gün 7"],
      bilgi: "nem_gocu.nmr_a_azalir_b_artar",
      not: "NMR proton gruplarının payı; gruplara yapılan atamalar bir yorumdur.",
      yer: { bolum: 2 },
      paneller: [
        { ad: "Su–proteine atanan grup", once: { deger: [28, 29], etiket: "%28–29" }, sonra: { deger: [21, 23.5], etiket: "%21–23,5" } },
        { ad: "Jelleşmiş nişastaya atanan grup", once: { deger: [67, 68], etiket: "%67–68" }, sonra: { deger: [71, 73], etiket: "%71–73" } },
      ],
    },
    {
      tur: "olcek",
      baslik: "Soğutma yöntemi ve kütle kaybı",
      birim: "%",
      ust: 10,
      adim: 2,
      bilgi: "nem_gocu.vakumlu_sogutmada_kutle_kaybi_ve_nem_degisimi",
      not: "Fırıncılık ürünleri.",
      yer: { bolum: 3 },
      satirlar: [
        { ad: "Konvansiyonel", aralik: [3, 5], etiket: "%3–5" },
        { ad: "Vakumlu", nokta: 7, etiket: "≈ %7" },
      ],
    },
    {
      tur: "cizgi",
      baslik: "Kâğıt torbada kaybedilen ağırlık",
      xBirim: "gün",
      yBirim: "%",
      xUst: 14,
      yUst: 30,
      yAdim: 10,
      sifirdan: true,
      bilgi: "nem_gocu.kagit_torba_agirlik_kaybi",
      not: "Kaplamasız ekmek, 23 °C ve %65 bağıl nem; başlangıç ağırlığına göre.",
      yer: { yuzlesme: 1 },
      noktalar: [
        { x: 4, y: 12.5, etiket: "%12,5", xEtiket: "4. gün" },
        { x: 14, y: 29.7, etiket: "%29,7", xEtiket: "14. gün" },
      ],
    },
  ],
};

const ATALIK: LevhaTanimi = {
  rakamlar: [
    { deger: "%30–60", birim: "daha düşük", aciklama: "tane verimi, ekmeklik buğdaya kıyasla", bilgi: "atalik_bugday.atalik_verim_ve_pisirme_dezavantajlari" },
    { deger: "555,8", birim: "cm³", aciklama: "100 g un başına en yüksek hacim, yaygın buğday ekmeği", bilgi: "atalik_bugday.yuz_gram_un_basina_hacim_karsilastirma" },
    { deger: "%28,50", birim: "yaş gluten", aciklama: "ekmeklik buğday unu; atalık unlarda daha yüksek", bilgi: "atalik_bugday.yas_gluten_atalik_unlarda_ekmeklikten_yuksek" },
  ],
  grafikler: [
    {
      tur: "sutun",
      baslik: "Ekmek içinin özgül ağırlığı",
      birim: "",
      bilgi: "atalik_bugday.ekmek_ici_ozgul_agirlik",
      yer: { bolum: 0 },
      ogeler: [
        { ad: "Spelt", deger: 0.35, etiket: "0,35" },
        { ad: "Siyez", deger: 0.38, etiket: "0,38" },
        { ad: "Gernik", deger: 0.38, etiket: "0,38" },
        { ad: "Geleneksel buğday", deger: 0.22, etiket: "0,22" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Gliadin / glutenin oranı, ortalama",
      birim: "",
      bilgi: "gliadin_glutenin.turler_arasi_ortalama_oranlar",
      yer: { bolum: 1 },
      ogeler: [
        { ad: "Ekmeklik buğday", deger: 2.5, etiket: "2,5" },
        { ad: "Spelt", deger: 3.3, etiket: "3,3" },
        { ad: "Durum", deger: 4, etiket: "4,0" },
        { ad: "Emmer", deger: 4.9, etiket: "4,9" },
        { ad: "Siyez", deger: 6.5, etiket: "6,5" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Somun hacmi",
      birim: "cm³",
      bilgi: "atalik_bugday.somun_hacmi_gernikte_en_dusuk",
      yer: { bolum: 2 },
      ogeler: [
        { ad: "Kontrol ekmeği", deger: 862.5, etiket: "862,5" },
        { ad: "Gernik ekmeği", deger: 547.5, etiket: "547,5" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Hamur stabilitesi",
      birim: "dk",
      bilgi: "atalik_bugday.hamur_stabilitesi_spelt_ve_ekmeklik",
      yer: { bolum: 3 },
      ogeler: [
        { ad: "Spelt", deger: 3.58, etiket: "3,58 dk" },
        { ad: "Ekmeklik buğday", deger: 11.1, etiket: "11,1 dk" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Siyez somunlarının hacmi",
      birim: "cm³",
      alt: 500,
      ust: 1000,
      adim: 100,
      bilgi: "atalik_bugday.siyez_somun_hacmi_genis_aralik_atif",
      not: "Farklı çalışmalardan.",
      yer: { yuzlesme: 2 },
      satirlar: [
        { ad: "Bildirilen aralık", aralik: [635, 918], etiket: "635,0–918,0" },
        { ad: "Monlis ortalaması", nokta: 740, etiket: "740", bilgi: "atalik_bugday.siyez_monlis_ve_id331_somun_hacmi" },
        { ad: "Siyez ve spelt ortalaması", nokta: 609, etiket: "609,0", bilgi: "atalik_bugday.siyez_ve_spelt_hacim_benzerligi" },
      ],
    },
  ],
};

const UN: LevhaTanimi = {
  rakamlar: [
    { deger: "%8–15", birim: "protein", aciklama: "bir buğday tanesinde, tipik olarak", bilgi: "un_olcum.bugday_danesi_protein_araligi" },
    { deger: "%10,5", birim: "en az", aciklama: "'ekmek' ununda kuru maddede protein (Türk Gıda Kodeksi)", bilgi: "un_olcum.turk_gida_kodeksi_protein_10_5" },
    { deger: "250–350", birim: "s", aciklama: "düşme sayısı eşiği, buğday sınıfına ve bölgeye göre", bilgi: "un_olcum.dusme_sayisi_esik" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Protein: tane, kodeks, fırıncılık",
      birim: "%",
      ust: 20,
      adim: 5,
      bilgi: "un_olcum.bugday_danesi_protein_araligi",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Buğday tanesi", aralik: [8, 15], etiket: "%8–15" },
        { ad: "'Ekmek' unu, en az", den: 10.5, etiket: "%10,5", bilgi: "un_olcum.turk_gida_kodeksi_protein_10_5" },
        { ad: "Fırıncılık için uygun", aralik: [10.5, 13], etiket: "%10,5–13", bilgi: "un_olcum.uygun_protein_10_5_13" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Zeleny sedimantasyon sınıfları",
      birim: "ml",
      ust: 80,
      adim: 20,
      bilgi: "un_olcum.ts2974_sedimantasyon_sinif_uyarini",
      not: "Ulusal buğday unu standardına göre.",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Birinci sınıf", den: 37, etiket: "37 ve üzeri" },
        { ad: "İkinci sınıf", aralik: [31, 36], etiket: "31–36" },
        { ad: "Üçüncü sınıf", aralik: [22, 30], etiket: "22–30" },
        { ad: "Düşük kaliteli", kadar: 22, etiket: "22'nin altı", renk: "notr" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Düşme sayısı",
      birim: "s",
      ust: 400,
      adim: 100,
      bilgi: "un_olcum.dusme_sayisi_esik",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Eşik, sınıf ve bölgeye göre", aralik: [250, 350], etiket: "250–350" },
        { ad: "Fielder ve iki hat", aralik: [228, 301.5], etiket: "228–301,5", bilgi: "un_olcum.lma_hat_dusme_62" },
        { ad: "Bx17A1OE hatları ve Chara", nokta: 62, etiket: "62 (ölçülebilen en düşük)", bilgi: "un_olcum.lma_hat_dusme_62", renk: "notr" },
      ],
    },
    {
      tur: "sutun",
      baslik: "İnce öğütülmüş tam unda ekmek hacmi",
      birim: "mL",
      bilgi: "un_katki.vital_gluten_ince_unda",
      yer: { bolum: 2 },
      ogeler: [
        { ad: "Katkısız", deger: 320.4, etiket: "320,4" },
        { ad: "%10 vital gluten", deger: 403.5, etiket: "403,5" },
        { ad: "50 ppm C vitamini", deger: 371.4, etiket: "371,4", bilgi: "un_katki.askorbik_asit_ince_unda" },
      ],
    },
  ],
};

const KEPEK: LevhaTanimi = {
  rakamlar: [
    { deger: "%25", birim: "dane ağırlığı", aciklama: "kepeğin payı, öğütme yan ürünlerinin en büyüğü", bilgi: "kepek.ogutme_verimi_ve_kepek_payi" },
    { deger: "150", birim: "milyon ton", aciklama: "yılda üretilen buğday kepeği", bilgi: "kepek.yillik_kuresel_uretim_miktari" },
    { deger: "%37–53", birim: "diyet lifi", aciklama: "buğday kepeğinde, bir aktarıma göre", bilgi: "kepek.bugday_kepegi_lif_fraksiyon_oranlari" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Kuru maddede lif",
      birim: "%",
      ust: 50,
      adim: 10,
      bilgi: "kepek.lif_dis_katmanlarda",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "İri kepek", aralik: [39.8, 46.5], etiket: "%39,8–46,5", renk: "kabuk" },
        { ad: "İnce kepek", aralik: [20.7, 27.9], etiket: "%20,7–27,9", renk: "kabuk" },
        { ad: "Tam tahıllı un", aralik: [10.2, 11.9], etiket: "%10,2–11,9" },
        { ad: "Beyaz un", aralik: [1.8, 2.7], etiket: "%1,8–2,7", renk: "ic" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Kepeğin ortanca tanecik boyu",
      birim: "µm",
      bilgi: "kepek.elek_analizinde_uc_kepek_boyutu_medyan_caplari",
      yer: { bolum: 1 },
      ogeler: [
        { ad: "Kaba", deger: 1262, etiket: "1262 µm" },
        { ad: "Orta", deger: 385, etiket: "385 µm" },
        { ad: "İnce", deger: 174, etiket: "174 µm" },
      ],
    },
    {
      tur: "sutun",
      baslik: "100 g ekmekte hacim",
      birim: "cm³",
      bilgi: "tam_bugday.hacim_dusuk",
      yer: { bolum: 2 },
      ogeler: [
        { ad: "Açık renkli un", deger: 332, etiket: "332 cm³" },
        { ad: "Tam buğday unu", deger: 290, etiket: "290 cm³" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Hamur 12 yerine 6 mm'de açılınca somun hacmi",
      birim: "% artış",
      ust: 20,
      adim: 5,
      bilgi: "kepek.alti_milimetre_silindirlemede_hacim_kazanci",
      not: "İnce kepekli hamurlarda artış ihmal edilebilir kaldı.",
      yer: { bolum: 3 },
      satirlar: [
        { ad: "Orta boy kepek", nokta: 6, etiket: "≈ %6" },
        { ad: "Kaba kepek", aralik: [10, 15], etiket: "%10–15" },
      ],
    },
  ],
};

const SU_TUZ: LevhaTanimi = {
  rakamlar: [
    { deger: "%86", birim: "güçlenme", aciklama: "tuz eklenince gluten ağında, en çok", bilgi: "tuz.gluten_aginin_yuzde_86_guclenmesi" },
    { deger: "0,55", birim: "su / un", aciklama: "standart hamur protokolünde seçilen oran", bilgi: "hidrasyon.standart_su_un_orani_0_55" },
    { deger: "%30–50", birim: "kayıp", aciklama: "tuzlu hamurda fermantasyon kapasitesi, gliserol üretimi azaltılmış maya soylarında", bilgi: "tuz.su_aktivitesi_maya" },
  ],
  grafikler: [
    {
      tur: "sutun",
      baslik: "Farinograf su kaldırması, ortalama",
      birim: "%",
      bilgi: "hidrasyon.tuz_ilavesi_farinograf_su_kaldirma_dususu",
      yer: { bolum: 1 },
      ogeler: [
        { ad: "Tuzsuz hamur", deger: 55.5, etiket: "%55,5" },
        { ad: "%1,5 tuzlu hamur", deger: 54.4, etiket: "%54,4" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Hamurun su aktivitesi",
      birim: "",
      alt: 0.9,
      ust: 1,
      adim: 0.02,
      bilgi: "tuz.su_aktivitesi_maya",
      yer: { bolum: 2 },
      satirlar: [
        { ad: "Tuzsuz", nokta: 0.99, etiket: "0,99", renk: "ic" },
        { ad: "Tuzlu", nokta: 0.97, etiket: "0,97" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Su kaldırma, unun proteinine göre",
      birim: "%",
      bilgi: "hidrasyon.yuksek_ve_dusuk_proteinli_un_su_kaldirma",
      yer: { yuzlesme: 2 },
      ogeler: [
        { ad: "Yüksek proteinli", deger: 58.5, etiket: "%58,5" },
        { ad: "Düşük proteinli", deger: 53, etiket: "%53" },
      ],
    },
  ],
};

const CAVDAR: LevhaTanimi = {
  rakamlar: [
    { deger: "%65", birim: "nişasta", aciklama: "çavdar ununda, ortalama", bilgi: "cavdar.un_bilesimi_nisasta_protein_arabinoksilan" },
    { deger: "%5–7", birim: "arabinoksilan", aciklama: "çavdar ununda; buğday ununda %1,5–2,5", bilgi: "arabinoksilan.cavdar_ve_bugday_ax_orani_karsilastirma" },
    { deger: "45 °C", birim: "eşik", aciklama: "altında pentozanlar, üstünde nişasta belirleyici", bilgi: "arabinoksilan.pentozanlar_ve_nisasta_45c_esigi" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Çavdar ununun bileşimi, ortalama",
      birim: "%",
      ust: 80,
      adim: 20,
      bilgi: "cavdar.un_bilesimi_nisasta_protein_arabinoksilan",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Nişasta", nokta: 65, etiket: "%65" },
        { ad: "Protein", aralik: [10, 12], etiket: "%10–12" },
        { ad: "Arabinoksilan", aralik: [6, 8], etiket: "%6–8", renk: "ic" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Arabinoksilan: buğday ve çavdar unu",
      birim: "%",
      ust: 10,
      adim: 2,
      bilgi: "arabinoksilan.cavdar_ve_bugday_ax_orani_karsilastirma",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Buğday unu", aralik: [1.5, 2.5], etiket: "%1,5–2,5", renk: "notr" },
        { ad: "Çavdar unu", aralik: [5, 7], etiket: "%5–7", renk: "ic" },
      ],
    },
    {
      tur: "pay",
      baslik: "Bir çavdar ununda arabinoksilan",
      birim: "%",
      bilgi: "cavdar.unu_nisasta_ve_toplam_arabinoksilan",
      yer: { bolum: 1 },
      toplam: { ad: "toplam", deger: 8.12, etiket: "%8,12" },
      parcalar: [
        { ad: "çözünür", deger: 2.11, etiket: "%2,11" },
        { ad: "çözünmeyen", deger: 6.01, etiket: "%6,01" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Çavdar hamurunda 45 °C",
      birim: "°C",
      alt: 20,
      ust: 100,
      adim: 20,
      bilgi: "arabinoksilan.pentozanlar_ve_nisasta_45c_esigi",
      yer: { bolum: 2 },
      satirlar: [
        { ad: "Hamuru pentozanlar belirler", kadar: 45, etiket: "45 °C'nin altı", renk: "ic" },
        { ad: "Ekmek içini nişasta belirler", den: 45, etiket: "45 °C'nin üstü", renk: "kabuk" },
      ],
    },
  ],
};

const KABARCIK: LevhaTanimi = {
  rakamlar: [
    { deger: "%9–20", birim: "hamur hacmi", aciklama: "yoğurma sonunda kabarcıkların payı", bilgi: "kabarcik.yogurma_sonu_gaz_hacim_payi" },
    { deger: "1,01", birim: "atm", aciklama: "gaz hücresinin içindeki basınç", bilgi: "kabarcik.hucre_basinci" },
    { deger: "%70", birim: "üzeri", aciklama: "somun hacminde gaz hücrelerinin payı", bilgi: "kabarcik.somun_hacminin_yuzde_yetmisi_gaz_hucreleridir" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Kabarcıkların boyu",
      birim: "µm",
      alt: 1,
      ust: 1000,
      adim: 10,
      log: true,
      bilgi: "kabarcik.un_su_karisiminda_gaz_hucre_boyutu",
      not: "Logaritmik ölçek.",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Un ve su karışınca gaz hücreleri", aralik: [10, 100], etiket: "0,01–0,1 mm", carpan: 1000 },
        { ad: "Ortalama, sert hamur", nokta: 100, etiket: "100 µm", bilgi: "kabarcik.sert_ve_yumusak_hamurda_lognormal_dagilim" },
        { ad: "Ortalama, yumuşak hamur", nokta: 109, etiket: "109 µm", bilgi: "kabarcik.sert_ve_yumusak_hamurda_lognormal_dagilim" },
        { ad: "Şekil vermede kapalı boşluklar", aralik: [500, 800], etiket: "0,5–0,8 mm", carpan: 1000, bilgi: "kabarcik.sekil_vermede_kabarciklarin_birlesmesi" },
        { ad: "Tomografinin ayırabildiği", cizgi: 10, etiket: "10 µm", bilgi: "kabarcik.mikrotomografi_ile_10um_cozunurluk", renk: "notr" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Komşu kabarcıklar arası ortalama mesafe",
      birim: "µm",
      bilgi: "kabarcik.kabarciklar_arasi_mesafe_dagilimi",
      yer: { bolum: 1 },
      ogeler: [
        { ad: "Sert hamur", deger: 338, etiket: "338 µm" },
        { ad: "Yumuşak hamur", deger: 460, etiket: "460 µm" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Hamur hacminde gazın payı",
      birim: "%",
      ust: 100,
      adim: 20,
      bilgi: "kabarcik.yogurma_sonu_gaz_hacim_payi",
      yer: { bolum: 2 },
      satirlar: [
        { ad: "Yoğurma sonu", aralik: [9, 20], etiket: "%9–20" },
        { ad: "Son mayalanma sonu", aralik: [70, 75], etiket: "%70–75", bilgi: "kabarcik.mayalanma_sonu_gaz_hacim_payi" },
        { ad: "Pişmiş somun", den: 70, etiket: "%70'ten fazla", bilgi: "kabarcik.somun_hacminin_yuzde_yetmisi_gaz_hucreleridir" },
      ],
    },
  ],
};

const BESLEME: LevhaTanimi = {
  rakamlar: [
    { deger: "%20", birim: "ortanca", aciklama: "yayımlanmış yöntemlerde aşı oranı", bilgi: "besleme.literatur_asi_orani" },
    { deger: "30 °C", birim: "en sık", aciklama: "yayımlanmış çalışmalarda fermantasyon sıcaklığı", bilgi: "besleme.literatur_sicaklik" },
    { deger: "100", birim: "yıl üzeri", aciklama: "kesintisiz sürdürüldüğü belgelenen mayalar", bilgi: "besleme.yuz_yili_asan_surdurme" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Aşı oranı",
      birim: "%",
      ust: 30,
      adim: 5,
      bilgi: "besleme.literatur_asi_orani",
      not: "Bir sistematik derlemede yayımlanmış yöntemler.",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Genellikle", aralik: [10, 25], etiket: "%10–25" },
        { ad: "Ortanca", nokta: 20, etiket: "%20" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Hamur verimi",
      birim: "",
      alt: 100,
      ust: 300,
      adim: 50,
      bilgi: "besleme.siki_ve_yari_sivi_hamur_verimi",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Sıkı ekşi mayalar", aralik: [150, 160], etiket: "150–160", renk: "kabuk" },
        { ad: "Yarı sıvı ekşi mayalar", aralik: [200, 300], etiket: "200–300", renk: "ic" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Fermantasyon sıcaklığı",
      birim: "°C",
      alt: 20,
      ust: 45,
      adim: 5,
      bilgi: "besleme.literatur_sicaklik",
      yer: { bolum: 2 },
      satirlar: [
        { ad: "Yayımlanmış çalışmalar", aralik: [22, 40], etiket: "22–40 °C" },
        { ad: "En sık", nokta: 30, etiket: "30 °C" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Olgunluk günü",
      birim: "gün",
      ust: 15,
      adim: 5,
      bilgi: "besleme.olgunlugun_firinci_tanimi",
      yer: { yuzlesme: 0 },
      satirlar: [
        { ad: "Fırıncıların tanımı", aralik: [7, 14], etiket: "7–14 gün" },
        { ad: "On farklı unla, kararlı", nokta: 10, etiket: "10. gün", bilgi: "besleme.olgunluk_yaklasik_10_gun" },
        { ad: "Çavdar ve çok amaçlı unda en yüksek kabarma", nokta: 14, etiket: "14. gün", bilgi: "besleme.tepe_kabarma_gunu_un_turu" },
      ],
    },
  ],
};

const SOFRA: LevhaTanimi = {
  rakamlar: [
    { deger: "≈ 100", birim: "bakteri", aciklama: "tipik bir ekşi mayada her maya hücresine karşılık", bilgi: "mayalar.bakteri_maya_orani" },
    { deger: "1,87", birim: "kat", aciklama: "bakterilerle birlikteyken mayanın ulaştığı yoğunlukta ortalama düşüş", bilgi: "rekabet.maya_kokulturde_azalir" },
    { deger: "%77", birim: "örnek", aciklama: "mantar DNA'sının yarısından fazlası Saccharomyces cerevisiae", bilgi: "scer.cogu_eksi_mayada_baskin" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Laktik asit bakterisi : maya oranı",
      birim: ": 1",
      alt: 1,
      ust: 1000,
      adim: 10,
      log: true,
      bilgi: "mayalar.bakteri_maya_orani",
      not: "Logaritmik ölçek.",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Değişebildiği aralık", aralik: [1, 1000], etiket: "1:1 – 1000:1" },
        { ad: "Tipik ekşi maya", nokta: 100, etiket: "≈ 100:1" },
        { ad: "İtalya'da 19 ekşi maya", aralik: [10, 100], etiket: "10:1 – 100:1", bilgi: "mayalar.italya_lab_maya_orani" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Model buğday ekşi mayasında sayımlar",
      birim: "log KOB/g",
      alt: 6,
      ust: 10,
      adim: 1,
      bilgi: "besin.model_sayimlar",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Laktobasiller", aralik: [8.12, 9.37], etiket: "8,12–9,37", renk: "kabuk" },
        { ad: "Mayalar", aralik: [6.7, 7.98], etiket: "6,70–7,98", renk: "ic" },
      ],
    },
    {
      tur: "pay",
      baslik: "500 ekşi mayada birlikte bulunma ilişkileri",
      birim: "",
      bilgi: "rekabet.krallik_ici_iliskiler",
      yer: { yuzlesme: 1 },
      toplam: { ad: "anlamlı ilişki", deger: 16, etiket: "16" },
      parcalar: [{ ad: "aynı krallık içinde", deger: 14, etiket: "14" }],
    },
  ],
};

const SEKER: LevhaTanimi = {
  rakamlar: [
    { deger: "%56", birim: "şeker", aciklama: "iki saatlik fermantasyonda tüketilenlerden amilazların ürettiği pay", bilgi: "amilaz.fermantasyonda_seker_uretim_payi" },
    { deger: "%18,4", birim: "kalan", aciklama: "180 dakika sonunda kolay fermente edilebilir karbonhidrat", bilgi: "seker_yolu.180_dakikada_kalan_seker_orani" },
    { deger: "22", birim: "g/kg", aciklama: "yenilenen ekşi maya partilerinde ortalama maltoz", bilgi: "seker_yolu.eksimaya_maltoz_22_g_kg_diger_sekerler_dusuk" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Buğday ununun bileşimi",
      birim: "%",
      ust: 80,
      adim: 20,
      bilgi: "nisasta.bugday_ununun_ana_bileseni",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Nişasta", aralik: [70, 75], etiket: "%70–75" },
        { ad: "Su", nokta: 14, etiket: "≈ %14", renk: "ic" },
        { ad: "Protein", aralik: [10, 12], etiket: "%10–12" },
        { ad: "Nişasta dışı polisakkarit", aralik: [2, 3], etiket: "%2–3", renk: "notr" },
        { ad: "Lipit", nokta: 2, etiket: "%2", renk: "notr" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Nişasta granülleri",
      birim: "µm",
      ust: 30,
      adim: 10,
      bilgi: "nisasta.granul_tipleri_ve_boyut_siniflari",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "A tipi", aralik: [23, 28], etiket: "23–28 µm" },
        { ad: "B tipi", aralik: [9, 11], etiket: "9–11 µm" },
        { ad: "C tipi", aralik: [2, 3], etiket: "2–3 µm" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Nişastada amilopektin ve amiloz",
      birim: "%",
      ust: 100,
      adim: 25,
      bilgi: "nisasta.bugday_ununda_amiloz_amilopektin_orani",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Amilopektin", aralik: [72, 75], etiket: "%72–75" },
        { ad: "Amiloz", aralik: [25, 28], etiket: "%25–28", renk: "ic" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Un ve su karışınca başlangıçtaki şekerler",
      birim: "mM",
      bilgi: "seker_yolu.baslangicta_maltoz_baskin",
      not: "Belçika'da bir buğday unu-su karışımı.",
      yer: { bolum: 2 },
      ogeler: [
        { ad: "Maltoz", deger: 26, etiket: "26,0" },
        { ad: "Glukoz", deger: 4.8, etiket: "4,8" },
        { ad: "Sakaroz", deger: 2.6, etiket: "2,6" },
        { ad: "Fruktoz", deger: 2.5, etiket: "2,5" },
      ],
    },
  ],
};

const ASIT: LevhaTanimi = {
  rakamlar: [
    { deger: "6,2–6,5", birim: "pH", aciklama: "buğday ununun doğal pH'ı", bilgi: "ph_tta.bugday_unu_dogal_ph" },
    { deger: "4,6", birim: "pH", aciklama: "ekşi maya süreciyle yapılan ekmek", bilgi: "ph_tta.beyaz_tamun_ve_eksimaya_ekmek_ph" },
    { deger: "75", birim: "mM", aciklama: "ekşi mayada laktik asit, ortanca", bilgi: "hetero.asit_aralik" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "pH ölçeğinde un, hamur ve ekmek",
      birim: "pH",
      alt: 3,
      ust: 7,
      adim: 1,
      bilgi: "ph_tta.asitlenmenin_kaynagi",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Buğday unu", aralik: [6.2, 6.5], etiket: "6,2–6,5", bilgi: "ph_tta.bugday_unu_dogal_ph", renk: "notr" },
        { ad: "Ekşi maya fermantasyonu", aralik: [3.5, 4.5], etiket: "3,5–4,5" },
        { ad: "Ekşi maya ekmeği", nokta: 4.6, etiket: "4,6", bilgi: "ph_tta.beyaz_tamun_ve_eksimaya_ekmek_ph" },
        { ad: "Ekşi mayasız ekmek, ortanca", nokta: 5.78, etiket: "5,78", bilgi: "ph_tta.eksimayasiz_kontrol_ekmek_medyan_ph", renk: "notr" },
        { ad: "Küçük somun hacmi bildirilen", kadar: 5, etiket: "5,0'ın altı", bilgi: "ph_tta.ekmek_ici_ph_5_alti_kucuk_hacim", renk: "kabuk" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Ekşi mayada asitler",
      birim: "mM",
      ust: 160,
      adim: 40,
      bilgi: "hetero.asit_aralik",
      not: "Bir derlemeye göre.",
      yer: { bolum: 0 },
      lejant: { nokta: "ortanca", aralik: "aralık" },
      satirlar: [
        { ad: "Laktik asit", aralik: [15, 150], etiket: "15–150" },
        { ad: "Laktik asit, ortanca", nokta: 75, etiket: "75" },
        { ad: "Asetik asit", aralik: [1, 50], etiket: "1–50", renk: "ic" },
        { ad: "Asetik asit, ortanca", nokta: 20, etiket: "20", renk: "ic" },
      ],
    },
  ],
};

const SEKIL: LevhaTanimi = {
  rakamlar: [
    { deger: "%26,6", birim: "kısalma", aciklama: "iki saat dinlenen hamurda protein damarlarının uzunluğu", bilgi: "gluten.dinlenmede_iplik_kasilmasi_ve_damar_kisalmasi" },
    { deger: "0,5–0,8", birim: "mm", aciklama: "şekil vermede oluşabilen kapalı boşluklar", bilgi: "kabarcik.sekil_vermede_kabarciklarin_birlesmesi" },
    { deger: "%70–75", birim: "gaz", aciklama: "son mayalanma sonunda kabarcıkların toplam hacimdeki payı", bilgi: "kabarcik.mayalanma_sonu_gaz_hacim_payi" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Hamur hacminde gazın payı",
      birim: "%",
      ust: 100,
      adim: 20,
      bilgi: "kabarcik.yogurma_sonu_gaz_hacim_payi",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Yoğurma sonu", aralik: [9, 20], etiket: "%9–20" },
        { ad: "Son mayalanma sonu", aralik: [70, 75], etiket: "%70–75", bilgi: "kabarcik.mayalanma_sonu_gaz_hacim_payi" },
      ],
    },
    {
      tur: "olcek",
      baslik: "Uzayabilirlik, dinlenme süresine göre",
      birim: "mm",
      alt: 60,
      ust: 160,
      adim: 20,
      bilgi: "reoloji.dinlenme_surelerine_gore_ekstensograf_uzayabilirlik_araligi",
      not: "Ekstensograf; un örnekleri arasında.",
      yer: { yuzlesme: 0 },
      satirlar: [
        { ad: "45 dakika dinlenme", aralik: [80, 142], etiket: "80,00–142,00" },
        { ad: "135 dakika dinlenme", aralik: [74, 113], etiket: "74,00–113,00" },
      ],
    },
  ],
};

const SON_MAYALANMA: LevhaTanimi = {
  rakamlar: [
    { deger: "%66,25", birim: "hacim artışı", aciklama: "45 dakikalık son mayalanmada, 38 °C ve %80 nem", bilgi: "gaz.hamur_hacmi_yuzde_66" },
    { deger: "%0,5–2,5", birim: "maya", aciklama: "endüstriyel fırıncılıkta hamura eklenen oran", bilgi: "scer.ekmek_hamuruna_eklenme_oranlari_0_5_2_5" },
    { deger: "%93", birim: "gaz tutma", aciklama: "tuzlu ve tuzsuz hamurda, yaklaşık", bilgi: "gaz.tuz_eklenmesi_co2_uretimini_ve_gaz_hacmini_azaltir" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Ne kadar bekler?",
      birim: "saat",
      ust: 24,
      adim: 6,
      bilgi: "sure.eksimayali_ekmek_toplam_fermantasyon_araligi",
      yer: { bolum: 0 },
      satirlar: [
        { ad: "Ekşi mayalı ekmek, derlenen literatür", aralik: [0.5, 20], etiket: "30 dakika – 20 saat", carpan: 1 / 60 },
        { ad: "Fırıncı mayalı ekmek", aralik: [0.5, 3], etiket: "0,5–3 saat", bilgi: "sure.firin_mayali_ekmek_kisa_fermantasyon_sure_ve_hidroliz", renk: "ic" },
        { ad: "5 °C, kilogram una 20 g maya", nokta: 21, etiket: "21 saat", bilgi: "sure.sicaklik_ve_maya_ile_sure", renk: "notr" },
        { ad: "35 °C, kilogram una 60 g maya", nokta: 0.25, etiket: "15 dakika", carpan: 1 / 60, bilgi: "sure.sicaklik_ve_maya_ile_sure", renk: "notr" },
      ],
    },
    {
      tur: "sutun",
      baslik: "En yüksek hacim artışı",
      birim: "%",
      bilgi: "gaz.khumilis_ve_scerevisiae_hacim_artisi_karsilastirmasi",
      not: "Un ve su 4:5, 30 °C.",
      yer: { bolum: 1 },
      ogeler: [
        { ad: "Kazachstania humilis, 3 saatte", deger: 72.19, etiket: "%72,19" },
        { ad: "Saccharomyces cerevisiae, 2,5 saatte", deger: 82.2, etiket: "%82,20" },
      ],
    },
    {
      tur: "sutun",
      baslik: "İki saatte üretilen karbondioksit",
      birim: "ml",
      bilgi: "gaz.tuz_eklenmesi_co2_uretimini_ve_gaz_hacmini_azaltir",
      yer: { bolum: 2 },
      ogeler: [
        { ad: "Tuzsuz hamur", deger: 1203, etiket: "1203 ± 27" },
        { ad: "%1,5 tuzlu hamur", deger: 987, etiket: "987 ± 36" },
      ],
    },
  ],
};

const JELLESME: LevhaTanimi = {
  rakamlar: [
    { deger: "60–85", birim: "°C", aciklama: "protein denatürasyonu ve nişasta jelleşmesi, derlemeye göre", bilgi: "jelesme.60_85_derece_hamurdan_ice" },
    { deger: "77", birim: "°C", aciklama: "proteinlerin birbirine bağlanmaya başladığı hamur sıcaklığı", bilgi: "protein_pihtilasmasi.77_derecede_polimerizasyon_baslangici" },
    { deger: "98", birim: "°C", aciklama: "pişirme sonunda çekirdek; iyi şekillenmiş somunlar, tek deneme", bilgi: "jelesme.doksan_sekiz_derece_cekirdek_sicakligi_ve_yapi" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Isınan hamurda sıra",
      birim: "°C",
      alt: 40,
      ust: 100,
      adim: 10,
      bilgi: "jelesme.60_85_derece_hamurdan_ice",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Kıvam artmaya başlar", nokta: 45, etiket: "≈ 45 °C", bilgi: "jelesme.kirk_bes_derecede_baslangic_yetmiste_tepe_viskozite", renk: "notr" },
        { ad: "Proteinler denatüre olur", nokta: 50, etiket: "≈ 50 °C", bilgi: "protein_pihtilasmasi.protein_50_derecede_nisasta_60_derecede" },
        { ad: "Nişasta şişer", nokta: 60, etiket: "≈ 60 °C", bilgi: "protein_pihtilasmasi.protein_50_derecede_nisasta_60_derecede", renk: "ic" },
        { ad: "Kıvam en yüksekte", nokta: 70, etiket: "≈ 70 °C", bilgi: "jelesme.kirk_bes_derecede_baslangic_yetmiste_tepe_viskozite", renk: "notr" },
        { ad: "Proteinler bağlanmaya başlar", nokta: 77, etiket: "77 °C", bilgi: "protein_pihtilasmasi.77_derecede_polimerizasyon_baslangici" },
        { ad: "Denatürasyon ve jelleşme, genel", aralik: [60, 85], etiket: "60–85 °C" },
        { ad: "Çekirdek, pişirme sonu", cizgi: 98, etiket: "98 °C", bilgi: "jelesme.doksan_sekiz_derece_cekirdek_sicakligi_ve_yapi", renk: "notr" },
      ],
    },
    {
      tur: "once_sonra",
      baslik: "SDS ile özütlenebilir protein",
      ust: 100,
      xEtiket: ["başlangıç", "24. dakika"],
      bilgi: "protein_pihtilasmasi.77_derecede_polimerizasyon_baslangici",
      not: "Sc1 referans suşuyla pişirme; düşüş 12. dakikadan sonra başlar.",
      yer: { bolum: 2 },
      paneller: [{ ad: "Özütlenebilir protein", once: { deger: [92.4, 92.4], etiket: "%92,4" }, sonra: { deger: [43.6, 43.6], etiket: "%43,6" } }],
    },
  ],
};

const BUHAR: LevhaTanimi = {
  rakamlar: [
    { deger: "%5–10", birim: "nem", aciklama: "kabuğu içten ayıran düşük nem", bilgi: "kabuk.dusuk_nem_orani_ve_ic_dehidrasyon_engeli", renk: "kabuk" },
    { deger: "120 °C", birim: "üzeri", aciklama: "renk oluşumu için asgari sıcaklık, su aktivitesi 0,6'nın altında", bilgi: "kabuk.renk_olusumu_asgari_kosullari", renk: "kabuk" },
    { deger: "%4,2", birim: "artış", aciklama: "200 °C'de merkezin nem içeriğinde, en çok", bilgi: "nem_gocu.pisirmede_merkez_nem_kazanir", renk: "ic" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "İki bölge: iç ve kabuk",
      birim: "°C",
      alt: 60,
      ust: 140,
      adim: 20,
      bilgi: "kabuk.buharlasma_cephesi_ve_iki_bolge",
      yer: { bolum: 1 },
      satirlar: [
        { ad: "Ekmek içi", nokta: 100, etiket: "≈ 100 °C", renk: "ic" },
        { ad: "Kabuk oluşur", den: 100, etiket: "100 °C'nin üstü", bilgi: "kabuk.kabuk_ve_renk_olusum_mekanizmasi", renk: "kabuk" },
        { ad: "Renk oluşur (su aktivitesi < 0,6)", den: 120, etiket: "120 °C'nin üstü", bilgi: "kabuk.renk_olusumu_asgari_kosullari", renk: "kabuk" },
      ],
    },
    { tur: "sema", sema: "nem_kesiti", baslik: "Merkezden kenara", bilgi: "nem_gocu.merkez_100_derece", yer: { bolum: 2 } },
  ],
};

const KUF: LevhaTanimi = {
  rakamlar: [
    { deger: "%40", birim: "su", aciklama: "ekmeğin yaklaşık su içeriği; su aktivitesi 0,94–0,97", bilgi: "kuf.ekmek_bilesimi_kufe_elverisli" },
    { deger: "%424", birim: "sertlik", aciklama: "buzdolabında 10 günde, başlangıca göre", bilgi: "saklama.buzdolabi_daha_cok_sertlesir" },
    { deger: "4–6", birim: "gün", aciklama: "nemli torbada ve kutuda küflenme, oda sıcaklığı", bilgi: "kuf.bagil_nem_90_alti" },
  ],
  grafikler: [
    {
      tur: "olcek",
      baslik: "Saklama kabının içindeki bağıl nem",
      birim: "%",
      alt: 70,
      ust: 100,
      adim: 10,
      bilgi: "saklama.ekmek_kutusu_nemli",
      not: "Almanya'da evde saklama denemesi.",
      yer: { yuzlesme: 0 },
      satirlar: [
        { ad: "Plastik torba", nokta: 89.9, etiket: "%89,9", bilgi: "kuf.plastik_torba_oda_sicakligi" },
        { ad: "Metal ekmek kutusu", nokta: 89, etiket: "%89,0" },
        { ad: "Mikro delikli kâğıt torba", nokta: 80.5, etiket: "%80,5", renk: "ic" },
      ],
    },
    {
      tur: "sutun",
      baslik: "Soğukta saklanan ekmekte küflü yüzey",
      birim: "%",
      bilgi: "kuf.soguk_depolamada_kontrol_ekmeginde_kuf_gelisimi",
      not: "Kısmen pişmiş kontrol ekmeği.",
      yer: { bolum: 3 },
      ogeler: [
        { ad: "14. gün", deger: 50, etiket: "%50" },
        { ad: "21. gün", deger: 100, etiket: "%100" },
      ],
    },
  ],
};

/** Bayrak sahnesi olmayan anlar; anahtar anın kimliği. */
export const LEVHALAR: Record<string, LevhaTanimi> = {
  atalik_bugdayin_hasadi: ATALIK,
  unun_karsisinda_firinci: UN,
  kepek_una_karisinca: KEPEK,
  su_ve_tuz_bulusunca: SU_TUZ,
  cavdar_unu_suyla_bulusunca: CAVDAR,
  ilk_hava_kabarciklari: KABARCIK,
  mayayi_beslerken: BESLEME,
  ayni_sofrada: SOFRA,
  sekerin_yolu: SEKER,
  asitler_ve_ph: ASIT,
  hamuru_sekillendirmek: SEKIL,
  son_mayalanma: SON_MAYALANMA,
  nisastanin_jellesmesi: JELLESME,
  buhar_ve_kabuk: BUHAR,
  soguma_ani: SOGUMA,
  saklama_ve_kuf: KUF,
};
