"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types";

export interface MasterclassDetail {
  flourHeritage?: string; // Unun ve mayanın kökeni
  technique?: string; // Fermantasyon ve zanaat tekniği
  healthBenefit?: string; // Sindirim ve beden sağlığı etkisi
  pairingStorage?: string; // Nasıl tüketilmeli & saklanmalı
  videoUrl?: string; // Reels / Video linki
}

export interface ExtendedProduct extends Product {
  masterclass?: MasterclassDetail;
}

export function normalizeCategory(rawCategory?: string): "bread" | "specialty" | "gurme" {
  if (!rawCategory) return "bread";
  const lower = rawCategory.toLowerCase();
  if (
    lower.includes("sarkuteri") ||
    lower.includes("şarküteri") ||
    lower.includes("pantry") ||
    lower.includes("gurme") ||
    lower.includes("mandira") ||
    lower.includes("mandıra") ||
    lower.includes("dairy")
  ) {
    return "gurme";
  }
  if (lower.includes("ozel") || lower.includes("özel") || lower.includes("specialty")) {
    return "specialty";
  }
  return "bread";
}

export const INITIAL_PRODUCTS: ExtendedProduct[] = [
  // 1. Taş Fırın Ekmekleri (Günlük Taze Çıkış)
  {
    id: "sample-ekmek-1",
    name: "Taş Fırın Ekşi Mayalı Köy Ekmeği",
    description:
      "Taş değirmen atalık unlar, içme suyu, Çankırı kaya tuzu ve 8 yıllık canlı ekşi maya. 36 saatlik geleneksel soğuk fermantasyonla her gün taze pişer.",
    price: 150,
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2Fsample-ekmek-1%2F1766242431736_whatsapp_image_2025-12-19_at_18.44.09.jpeg.jpg?alt=media&token=e2c0a40d-5912-4387-8fb1-8ab39616fc6c",
    category: "bread",
    stock: 45,
    weight: 800,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Taş Değirmen Atalık Un", "Su", "8 Yıllık Ekşi Maya", "Çankırı Kaya Tuzu"],
    flourTypes: ["Taş Değirmen Atalık Buğday", "Karakılçık"],
    hydration: 76,
    masterclass: {
      flourHeritage:
        "Taş değirmende ruşeymi ve kepeği ayrıştırılmadan öğütülen yerli atalık buğdaylar kullanılır. 8 yıldır beslediğimiz ekşi mayamızla harmanlanır.",
      technique:
        "%76 hidrasyonla yoğrulur. Hamur teknelerinde 30 dakikada bir lamine katlama uygulanır. Şekillendirildikten sonra 36 saat boyunca +4°C'de soğuk fermantasyon geçirir.",
      healthBenefit:
        "Doğal laktik asit fermantasyonu tahıldaki fitik asidi parçalar, gluten zincirlerini yumuşatır; asla şişkinlik yapmaz, sindirimi son derece rahattır.",
      pairingStorage:
        "Bez torba içinde oda sıcaklığında 5 gün tazeliğini korur. Dilimleyip dondurabilirsiniz. Tost yapıldığında çıtır kabuğuyla benzersiz bir lezzet sunar.",
    },
  },
  {
    id: "prod_karakilcik_01",
    name: "%100 Karakılçık Ekşi Mayalı",
    description:
      "Genetiği bozulmamış ata tohumu Gediz Karakılçık buğdayı, canlı ekşi maya, su ve kaya tuzu. 36 saat soğuk fermantasyonla demlenir; her gün taze pişer.",
    price: 145,
    imageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
    category: "bread",
    stock: 40,
    weight: 850,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Karakılçık Tam Buğday Unu", "Su", "8 Yıllık Canlı Ekşi Maya", "Çankırı Kaya Tuzu"],
    flourTypes: ["Gediz Karakılçık Tam Buğday"],
    hydration: 78,
    masterclass: {
      flourHeritage:
        "Ege yöresinin atalık Karakılçık buğdayı taş değirmende ruşeymi ayrıştırılmadan öğütülür. Yoğun kehribar rengi ve fındıksı lezzeti buradan gelir.",
      technique:
        "%78 yüksek su oranıyla narin yoğrulur. Taş fırının taban sıcağında meşe odunu buharıyla pişirilir.",
      healthBenefit:
        "Yüksek antioksidan, çinko, demir ve lif içeriğine sahiptir. Kan şekerini dengeli yükseltir ve saatlerce tok tutar.",
      pairingStorage:
        "Oda sıcaklığında 5 gün tazedir. Tavada hafifçe ısıtıp köy tereyağı ve Mihaliç peyniri ile tüketmeniz tavsiye edilir.",
    },
  },
  {
    id: "eseWoYLrSinWrP2VGOmW",
    name: "%100 Taş Değirmen Siyez Ekmeği",
    description:
      "Kastamonu İhsangazi siyezi ve canlı ekşi maya ile 40 saatlik uzun fermentasyon süreciyle hazırlanır. Düşük glutenli, zengin mineralli.",
    price: 200,
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2FeseWoYLrSinWrP2VGOmW%2F1766243754267_d3d13c14-ed8a-4d37-a65d-aba92e1cafe0.png.jpg?alt=media&token=61e7044d-f693-4120-bd50-b8dc29695425",
    category: "bread",
    stock: 30,
    weight: 1000,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Kastamonu Siyez Unu", "İçme Suyu", "Canlı Ekşi Maya", "Kaya Tuzu"],
    flourTypes: ["Kastamonu Atalık Siyez"],
    hydration: 78,
    masterclass: {
      flourHeritage:
        "12.000 yıllık geçmişiyle dünyanın ilk buğdayı olan tek başaklı atalık Siyez buğdayı.",
      technique:
        "Siyezin narin gluten yapısını bozmamak için makine yerine elle katlanır. 40 saatlik soğuk fermantasyonla olgunlaştırılır.",
      healthBenefit:
        "A, B ve E vitaminleri, çinko, demir ve lutein deposudur. Düşük gluten indeksi sayesinde hassas mideler için en dost ekmektir.",
      pairingStorage:
        "Yoğun ve nemli bir iç yapıya sahiptir. Dilimlendiğinde günlerce kurumaz.",
    },
  },
  {
    id: "prod_yudane_03",
    name: "Japon Yudane Sütlü Tost Ekmeği",
    description:
      "Yudane haşlama hamur tekniğiyle kaynar suyla jelatinize edilmiş un bazlı. Pamuksu iç doku, 5 gün boyunca tazeliğini koruyan doğal nemlilik.",
    price: 130,
    imageUrl:
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=900&q=85",
    category: "bread",
    stock: 25,
    weight: 650,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Yüksek Proteinli Un", "Yudane Hamuru", "Taze Süt", "Köy Tereyağı", "Ekşi Maya", "Tuz"],
    flourTypes: ["Taş Değirmen Ekmeklik Un"],
    hydration: 75,
    masterclass: {
      flourHeritage:
        "Geleneksel Japon 'Yudane' tekniği: Unun bir kısmı kaynar su ile önceden demlenerek nişastası jelatinize edilir.",
      technique:
        "Jelatinleşen hamur, su tutma kapasitesini 2 katına çıkarır. İçine süt ve köy tereyağı eklenerek ipeksi bir doku elde edilir.",
      healthBenefit:
        "Hiçbir ticari koruyucu, emülgatör veya katkı olmadan tamamen doğal fiziksel yöntemle 5 gün boyunca pamuk gibi yumuşak kalır.",
      pairingStorage:
        "Tost makinesinde dışı çıtır, içi yumuşacık kabarır. Çocuklar ve gurme tost sevenler için idealdir.",
    },
  },

  // 2. Özel & Ön Sipariş Ekmekleri
  {
    id: "sample-ekmek-2",
    name: "EkmekLab Özel (Cevizli Çok Tahıllı)",
    description:
      "Taş fırında kavrulmuş yerli ceviz içi, siyez, karabuğday ve çavdar unlarının dengeli harmanıyla üretilen imza artisan ekşi mayalı.",
    price: 250,
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2Fsample-ekmek-2%2F1766243701366_unnamed_8_.jpg.jpg?alt=media&token=e55d6ee5-95fb-45ca-8771-a2e6624405c2",
    category: "specialty",
    stock: 20,
    weight: 850,
    weightUnit: "g",
    madeToOrder: true,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Kavrulmuş Ceviz İçi", "Siyez Unu", "Karabuğday Unu", "Çavdar Unu", "Su", "Ekşi Maya", "Kaya Tuzu"],
    flourTypes: ["Siyez", "Karabuğday", "Çavdar"],
    hydration: 79,
    masterclass: {
      flourHeritage:
        "Üç kadim tahılın taş değirmende harmanlanması: Kastamonu Siyezi, glütensiz karabuğday ve aromatik çavdar.",
      technique:
        "Fırında kavrulan cevizlerin yağı hamurun lezzetine geçer; 36 saatlik fermantasyonla nemli gözenekli yapı kazanır.",
      healthBenefit:
        "Omega-3 yağ asitleri, karabuğdayın antioksidanları ve çavdarın zengin lifleriyle kalp dostu ve tok tutucu.",
      pairingStorage:
        "Tulum peyniri, eski kaşar veya petek bal ile mükemmel eşleşir.",
    },
  },
  {
    id: "prod_kavilca_02",
    name: "Kavılca & Siyez Çavdarlı",
    description:
      "Kars Kavılcası ve Kastamonu Siyezi harmanı. 40 saatlik yavaş fermantasyonla olgunlaştırılmış zengin mineral profili ve doyurucu kıvam.",
    price: 160,
    imageUrl:
      "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=900&q=85",
    category: "specialty",
    stock: 20,
    weight: 800,
    weightUnit: "g",
    madeToOrder: true,
    isPopular: false,
    isNew: true,
    isAvailable: true,
    isActive: true,
    ingredients: ["Kavılca Unu", "Siyez Unu", "Taş Değirmen Çavdar", "Su", "Ekşi Maya", "Kaya Tuzu"],
    flourTypes: ["Kars Kavılca", "Kastamonu Siyez", "Çavdar"],
    hydration: 80,
    masterclass: {
      flourHeritage:
        "Soğuk dağ iklimine dayanıklı Kars Kavılcası ve dünyanın en kadim buğdayı Siyez taş değirmende harmanlanır.",
      technique:
        "Düşük gluten yapısı nedeniyle hassas yoğrulur. 40 saatlik soğuk fermantasyon süreciyle tahılın yoğun fındıksı aroması açığa çıkarılır.",
      healthBenefit:
        "Çok yüksek lif, düşük glisemik indeks ve zengin B vitamini kompleksi.",
      pairingStorage:
        "Yayık köy tereyağı ve süzme çiçek balı ile kusursuz bir uyum yakalar.",
    },
  },
  {
    id: "prod_ceviz_incir_04",
    name: "Kavrulmuş Cevizli & Dağ İncirli",
    description:
      "Taş fırında kavrulmuş yerli ceviz ve Aydın dağ inciri parçacıklarıyla zenginleştirilmiş özel artisan lezzet. Peynir tabakları için eşsiz.",
    price: 185,
    imageUrl:
      "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=85",
    category: "specialty",
    stock: 15,
    weight: 850,
    weightUnit: "g",
    madeToOrder: true,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Karakılçık Unu", "Kavrulmuş Yerli Ceviz", "Aydın Dağ İnciri", "Su", "Ekşi Maya", "Tuz"],
    flourTypes: ["Karakılçık", "Sarı Buğday"],
    hydration: 78,
    masterclass: {
      flourHeritage:
        "Ege dağlarından güneşte kurutulmuş incirler ve taze kırılmış yerli cevizler fırında hafif kavrularak hamura katlanır.",
      technique:
        "Meyve şekerinin fermantasyonu hızlandırmasını dengelemek için özel sıcaklık kontrolüyle 36 saat mayalandırılır.",
      healthBenefit:
        "Cevizden gelen Omega-3 yağ asitleri ve incirin doğal lifleri ile enerji veren gurme bir ekmektir.",
      pairingStorage:
        "Eski kaşar veya tulum peyniri ile eşleştirildiğinde tatlı-tuzlu dengesiyle büyüleyici bir sofra deneyimi yaratır.",
    },
  },

  // 3. Gurme Lezzetler & Mandıra Eşlikçileri
  {
    id: "YGnge5isqk1d4nI4YUx8",
    name: "Jersey Çiğ Sütü (3 Litre)",
    description:
      "Arı Jersey Çiftliğinden günlük sağılan, yüksek yağ ve A2 protein yapısına sahip, kaymağı üzerinde %100 doğal taze çiğ süt.",
    price: 200,
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2Fnew%2F1774227424263_promo-milk3l.png.jpg?alt=media&token=b6841382-489e-4d96-b9b8-9d80b302aa13",
    category: "gurme",
    stock: 40,
    weight: 3000,
    weightUnit: "ml",
    madeToOrder: false,
    isPopular: true,
    isNew: true,
    isAvailable: true,
    isActive: true,
    ingredients: ["%100 Doğal Jersey Çiğ İnek Sütü"],
    masterclass: {
      flourHeritage:
        "Yüksek A2 beta-kazein protein profiline sahip safkan Jersey ırkı ineklerin taze mera sütüdür.",
      technique:
        "El değmeden sağılıp hemen soğuk zincire alınır; pastörize edilmemiştir.",
      healthBenefit:
        "A2 proteini sindirimi kolaylaştırır, laktoz hassasiyeti olanlar için daha konforludur. Çok zengin kalsiyum ve doğal tereyağ kıvamında kaymak içerir.",
      pairingStorage:
        "Kaynatılıp yoğurt mayalandığında taş gibi tutar, kaymağı tatlılarda enfes sonuç verir.",
    },
  },
  {
    id: "prod_yogurt_05",
    name: "Özel Ev Yapımı Doğal Yoğurt",
    description:
      "Doğal mera sütünden geleneksel yöntemlerle mayalanmış, katkısız, kıvam artırıcısız, taş gibi tutan hakiki ev yoğurdu.",
    price: 110,
    imageUrl:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85",
    category: "gurme",
    stock: 30,
    weight: 1000,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["%100 Doğal Mera Çiğ Sütü", "Geleneksel Canlı Yoğurt Mayası"],
    masterclass: {
      flourHeritage:
        "Serbest otlayan hayvanların taze mera sütünden aile tarifimizle katkısız mayalanır.",
      technique:
        "Kaynatıldıktan sonra ideal derecede tülbentlerle sarılarak yavaşça dinlendirilir.",
      healthBenefit:
        "Zengin doğal probiyotik içeriğiyle bağırsak florasını onarır ve bağışıklığı destekler.",
      pairingStorage:
        "Karakılçık ekmeğini kızartıp üzerine yoğurt ve taze tereyağı sürerek tüketebilirsiniz.",
    },
  },
  {
    id: "prod_mihalic_07",
    name: "Hakiki Mihaliç Peyniri",
    description:
      "Geleneksel yöntemlerle gözenekli ve tuzlu salamurada olgunlaştırılmış, yoğun lezzetli hakiki sert Mihaliç peyniri.",
    price: 240,
    imageUrl:
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=85",
    category: "gurme",
    stock: 25,
    weight: 400,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: true,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Koyun ve İnek Sütü", "Şirden Mayası", "Kaya Tuzu"],
    masterclass: {
      flourHeritage:
        "Bursa/Balıkesir yöresinin asırlık peynir geleneği. Gözenekli yapısı ve sert dokusuyla bilinir.",
      technique:
        "Taze sütten şirden mayası ile pıhtılaştırılır, haşlanır ve aylarca dinlendirilir.",
      healthBenefit:
        "Yüksek protein ve kalsiyum deposudur.",
      pairingStorage:
        "Tavada ekşi mayalı ekmek üzerine koyup eritildiğinde veya tostta uzayan nefis bir lezzet verir.",
    },
  },
  {
    id: "prod_tereyag_09",
    name: "Yayık Köy Tereyağı",
    description:
      "Doğal mera sütü kaymağından geleneksel yayık yöntemiyle hazırlanmış, katkısız ve yoğun süt kokulu köy tereyağı.",
    price: 190,
    imageUrl:
      "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=85",
    category: "gurme",
    stock: 35,
    weight: 500,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: false,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["Doğal Süt Kaymağı", "Kaya Tuzu"],
    masterclass: {
      flourHeritage:
        "Geleneksel tahta yayıklarda dövülerek üretilen hakiki köy tereyağı.",
      technique:
        "Kaymaktan ayrıştırılıp soğuk pınar suyu ile yıkanarak asitliği alınır.",
      healthBenefit:
        "A, D, E vitaminleri zengini hakiki enerji kaynağıdır.",
      pairingStorage:
        "Fırından yeni çıkmış sıcak ekmeğe sürüldüğünde buram buram süt kokar.",
    },
  },
  {
    id: "prod_kavurma_08",
    name: "Taş Fırın Dana Kavurma",
    description:
      "Geleneksel usulde kendi yağında kısık ateşte saatlerce pişirilmiş, katkısız ve yumuşacık hakiki dana kavurma.",
    price: 320,
    imageUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85",
    category: "gurme",
    stock: 20,
    weight: 350,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: false,
    isNew: true,
    isAvailable: true,
    isActive: true,
    ingredients: ["Dana Eti", "Dana Yağı", "Kaya Tuzu"],
    masterclass: {
      flourHeritage:
        "Yerli besi dana etinin en lezzetli bölümleri seçilerek hazırlanır.",
      technique:
        "Taş fırının dinlenme sıcağında kendi yağı ile 6 saat lokum gibi pişirilir.",
      healthBenefit:
        "Hiçbir koruyucu, nitrit veya katkı maddesi içermez; saf et ve kaya tuzu.",
      pairingStorage:
        "Sıcak ekşi mayalı ekmek diliminin üzerine konulduğunda yağını bırakır ve harika bir lezzet sunar.",
    },
  },
  {
    id: "prod_un_10",
    name: "Taş Değirmen Karakılçık Unu",
    description:
      "Kendi ekmeğinizi yapmanız için taş değirmende ruşeymi ve kepeği ayrıştırılmadan öğütülmüş %100 atalık tam buğday unu.",
    price: 95,
    imageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
    category: "gurme",
    stock: 50,
    weight: 1000,
    weightUnit: "g",
    madeToOrder: false,
    isPopular: false,
    isNew: false,
    isAvailable: true,
    isActive: true,
    ingredients: ["%100 Atalık Karakılçık Buğdayı"],
    masterclass: {
      flourHeritage:
        "Ege yöresinin atalık Karakılçık buğdayı yavaş dönen taş değirmenlerde yakılmadan öğütülür.",
      technique:
        "Ruşeymi ve lifi içinde korunur; yüksek mineral ve protein değerine sahiptir.",
      healthBenefit:
        "Gluten indeksi düşüktür, sindirimi çok rahattır.",
      pairingStorage:
        "Serin ve kuru yerde bez torbada 6 ay boyunca saklanabilir.",
    },
  },
];

const getDeletedIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ekmeklab_deleted_products");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markIdAsDeletedLocally = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const arr = getDeletedIds();
    if (!arr.includes(id)) {
      arr.push(id);
      localStorage.setItem("ekmeklab_deleted_products", JSON.stringify(arr));
    }
  } catch {}
};

const unmarkIdAsDeletedLocally = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const arr = getDeletedIds().filter((d) => d !== id);
    localStorage.setItem("ekmeklab_deleted_products", JSON.stringify(arr));
  } catch {}
};

export function useProducts(category?: string) {
  const [products, setProducts] = useState<ExtendedProduct[]>(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const deletedIds = getDeletedIds();

      try {
        // 1. Try fetching from Supabase PostgreSQL first
        const supabase = createClient();
        if (supabase) {
          try {
            const { data: supaProducts, error: supaErr } = await supabase
              .from("products")
              .select("*")
              .eq("is_active", true)
              .order("is_popular", { ascending: false });

            if (supaProducts && !supaErr && supaProducts.length > 0) {
              const mapped: ExtendedProduct[] = supaProducts
                .map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description || "",
                  price: Number(p.price),
                  imageUrl:
                    p.image_url ||
                    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
                  category: normalizeCategory(p.category),
                  stock: Number(p.stock) || 25,
                  weight: Number(p.weight) || 800,
                  weightUnit: p.weight_unit || "g",
                  madeToOrder: Boolean(p.made_to_order),
                  isPopular: Boolean(p.is_popular),
                  isNew: Boolean(p.is_new),
                  isAvailable: p.is_available !== false,
                  isActive: true,
                  ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
                  flourTypes: Array.isArray(p.flour_types) ? p.flour_types : [],
                  hydration: p.hydration ? Number(p.hydration) : undefined,
                  atelierPlacement: p.atelier_placement || undefined,
                  masterclass: p.masterclass || undefined,
                }))
                .filter((p: ExtendedProduct) => !deletedIds.includes(p.id));

              setProducts(mapped);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("Supabase fetch notice, using initial products:", e);
          }
        }

        // 2. Fallback to rich initial artisan catalog
        setProducts(INITIAL_PRODUCTS.filter((p) => !deletedIds.includes(p.id)));
      } catch (err: any) {
        console.warn("Could not fetch products, using initial catalog:", err);
        setProducts(INITIAL_PRODUCTS.filter((p) => !deletedIds.includes(p.id)));
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    if (!category || category === "all") return true;
    if (category === "bread") return product.category === "bread";
    if (category === "specialty") return product.category === "specialty" || product.madeToOrder;
    if (category === "gurme" || category === "pantry") {
      return product.category === "gurme" || product.category === "pantry";
    }
    return product.category === category;
  });

  const reloadProducts = async () => {
    const deletedIds = getDeletedIds();
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: supaProducts } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("is_popular", { ascending: false });

      if (supaProducts) {
        const mapped: ExtendedProduct[] = supaProducts
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: Number(p.price),
            imageUrl:
              p.image_url ||
              "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
            category: normalizeCategory(p.category),
            stock: Number(p.stock) || 25,
            weight: Number(p.weight) || 800,
            weightUnit: p.weight_unit || "g",
            madeToOrder: Boolean(p.made_to_order),
            isPopular: Boolean(p.is_popular),
            isNew: Boolean(p.is_new),
            isAvailable: p.is_available !== false,
            isActive: true,
            ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
            flourTypes: Array.isArray(p.flour_types) ? p.flour_types : [],
            hydration: p.hydration ? Number(p.hydration) : undefined,
            atelierPlacement: p.atelier_placement || undefined,
            masterclass: p.masterclass || undefined,
          }))
          .filter((p: ExtendedProduct) => !deletedIds.includes(p.id));

        setProducts(mapped);
      }
    } catch (e) {
      console.warn("Reload products error:", e);
    }
  };

  const updateProductPrice = async (id: string, newPrice: number) => {
    // 1. Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, price: newPrice } : p))
    );

    // 2. Supabase update
    const supabase = createClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("products")
          .update({ price: newPrice, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return { success: true };
      } catch (e: any) {
        console.error("Supabase price update error:", e);
        return { success: false, error: e.message };
      }
    }
    return { success: true };
  };

  const toggleProductStock = async (id: string, currentStatus?: boolean) => {
    const nextStatus = currentStatus === false ? true : false;

    // 1. Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isAvailable: nextStatus } : p))
    );

    // 2. Supabase update
    const supabase = createClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("products")
          .update({ is_available: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return { success: true, isAvailable: nextStatus };
      } catch (e: any) {
        console.error("Supabase stock update error:", e);
        return { success: false, error: e.message };
      }
    }
    return { success: true, isAvailable: nextStatus };
  };

  const saveProduct = async (productData: Partial<ExtendedProduct>) => {
    const id = productData.id || `prod_${Date.now().toString(36)}`;
    unmarkIdAsDeletedLocally(id);

    // Try server API first for guaranteed permissions
    try {
      const apiRes = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, id }),
      });
      if (apiRes.ok) {
        await reloadProducts();
        return { success: true, id };
      }
    } catch (e) {
      console.warn("API save product notice, falling back to direct client:", e);
    }

    const supabase = createClient();
    if (!supabase) return { success: false, error: "Supabase bağlantısı kurulamadı" };

    const payload: any = {
      id,
      name: productData.name,
      description: productData.description || "",
      price: Number(productData.price) || 0,
      image_url: productData.imageUrl || null,
      category: productData.category || "bread",
      stock: Number(productData.stock) || 25,
      weight: Number(productData.weight) || 800,
      weight_unit: productData.weightUnit || "g",
      made_to_order: Boolean(productData.madeToOrder),
      is_popular: Boolean(productData.isPopular),
      is_new: Boolean(productData.isNew),
      is_available: productData.isAvailable !== false,
      is_active: true,
      ingredients: productData.ingredients || [],
      flour_types: productData.flourTypes || [],
      hydration: productData.hydration || null,
      atelier_placement: productData.atelierPlacement || null,
      masterclass: productData.masterclass || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("products").upsert(payload);
      if (error) throw error;
      await reloadProducts();
      return { success: true, id };
    } catch (e: any) {
      console.error("Supabase save product error:", e);
      return { success: false, error: e.message };
    }
  };

  const deleteProduct = async (id: string) => {
    // 1. Mark as deleted locally so it never resurfaces
    markIdAsDeletedLocally(id);

    // 2. Instant optimistic removal from UI
    setProducts((prev) => prev.filter((p) => p.id !== id));

    // 3. Call server API route with service role
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        return { success: true };
      }
    } catch (apiErr) {
      console.warn("Server API delete product warning:", apiErr);
    }

    // 4. Direct Supabase client fallback
    const supabase = createClient();
    if (supabase) {
      try {
        const { error: delErr } = await (supabase as any)
          .from("products")
          .delete()
          .eq("id", id);

        if (delErr) {
          await (supabase as any)
            .from("products")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", id);
        }
        return { success: true };
      } catch (e: any) {
        console.error("Supabase delete product error:", e);
        return { success: false, error: e.message };
      }
    }
    return { success: true };
  };

  return {
    products: filteredProducts,
    allProducts: products,
    loading,
    error,
    reloadProducts,
    updateProductPrice,
    toggleProductStock,
    saveProduct,
    deleteProduct,
  };
}
