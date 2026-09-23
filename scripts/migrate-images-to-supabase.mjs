import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Products definition with their current image sources and desired storage filenames
const PRODUCTS_TO_MIGRATE = [
  {
    id: "sample-ekmek-1",
    name: "Taş Fırın Ekşi Mayalı Köy Ekmeği",
    price: 150,
    weight: 800,
    category: "bread",
    filename: "koy-ekmegi.jpg",
    sourceUrl: "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2Fsample-ekmek-1%2F1766242431736_whatsapp_image_2025-12-19_at_18.44.09.jpeg.jpg?alt=media&token=e2c0a40d-5912-4387-8fb1-8ab39616fc6c",
  },
  {
    id: "prod_karakilcik_01",
    name: "%100 Karakılçık Ekşi Mayalı",
    price: 145,
    weight: 850,
    category: "bread",
    filename: "karakilcik.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "eseWoYLrSinWrP2VGOmW",
    name: "%100 Taş Değirmen Siyez Ekmeği",
    price: 200,
    weight: 1000,
    category: "bread",
    filename: "siyez.jpg",
    sourceUrl: "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2FeseWoYLrSinWrP2VGOmW%2F1766243754267_d3d13c14-ed8a-4d37-a65d-aba92e1cafe0.png.jpg?alt=media&token=61e7044d-f693-4120-bd50-b8dc29695425",
  },
  {
    id: "prod_yudane_03",
    name: "Japon Yudane Sütlü Tost Ekmeği",
    price: 130,
    weight: 650,
    category: "bread",
    filename: "yudane.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "sample-ekmek-2",
    name: "EkmekLab Özel (Cevizli Çok Tahıllı)",
    price: 175,
    weight: 850,
    category: "bread",
    filename: "ekmeklab-ozel.jpg",
    sourceUrl: "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2Fsample-ekmek-2%2F1766243701366_unnamed_8_.jpg.jpg?alt=media&token=e55d6ee5-95fb-45ca-8771-a2e6624405c2",
  },
  {
    id: "prod_kavilca_02",
    name: "Kavılca & Siyez Çavdarlı",
    price: 160,
    weight: 800,
    category: "specialty",
    filename: "kavilca-siyez.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "prod_ceviz_incir_04",
    name: "Kavrulmuş Cevizli & Dağ İncirli",
    price: 185,
    weight: 850,
    category: "specialty",
    filename: "ceviz-incir.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "YGnge5isqk1d4nI4YUx8",
    name: "Jersey Çiğ Sütü (3 Litre)",
    price: 200,
    weight: 3000,
    category: "gurme",
    filename: "jersey-sut-3l.jpg",
    sourceUrl: "https://firebasestorage.googleapis.com/v0/b/eksimayaliekmekweb.firebasestorage.app/o/product-images%2Fnew%2F1774227424263_promo-milk3l.png.jpg?alt=media&token=b6841382-489e-4d96-b9b8-9d80b302aa13",
  },
  {
    id: "prod_yogurt_05",
    name: "Özel Ev Yapımı Doğal Yoğurt",
    price: 140,
    weight: 1000,
    category: "gurme",
    filename: "dogal-yogurt.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "prod_tereyag_09",
    name: "Yayık Köy Tereyağı",
    price: 190,
    weight: 500,
    category: "gurme",
    filename: "koy-tereyagi.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "prod_mihalic_07",
    name: "Hakiki Mihaliç Peyniri",
    price: 220,
    weight: 400,
    category: "gurme",
    filename: "mihalic-peyniri.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "prod_kavurma_08",
    name: "Taş Fırın Dana Kavurma",
    price: 320,
    weight: 350,
    category: "gurme",
    filename: "dana-kavurma.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "prod_un_10",
    name: "Taş Değirmen Karakılçık Unu",
    price: 95,
    weight: 1000,
    category: "gurme",
    filename: "karakilcik-unu.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
  },
];

async function main() {
  console.log("1. Ensuring Supabase Storage bucket 'product-thumbnails' exists and is public...");
  const BUCKET_NAME = "product-thumbnails";

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!exists) {
    const { data: createData, error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
      fileSizeLimit: 10485760, // 10MB
    });
    if (createErr) {
      console.error("Failed to create bucket:", createErr);
    } else {
      console.log("Bucket created successfully:", createData);
    }
  } else {
    console.log("Bucket already exists.");
  }

  // Also ensure local backup folder exists
  const localBackupDir = path.join(process.cwd(), "public", "images", "products");
  if (!fs.existsSync(localBackupDir)) {
    fs.mkdirSync(localBackupDir, { recursive: true });
  }

  console.log("2. Downloading and uploading product images to Supabase Storage...");
  for (const prod of PRODUCTS_TO_MIGRATE) {
    try {
      console.log(`Processing: ${prod.name} (${prod.filename})...`);
      let imageBuffer = null;

      // Try fetching from sourceUrl
      if (prod.sourceUrl) {
        try {
          const res = await fetch(prod.sourceUrl);
          if (res.ok) {
            const arr = await res.arrayBuffer();
            imageBuffer = Buffer.from(arr);
          }
        } catch (fetchErr) {
          console.warn(`Could not fetch ${prod.sourceUrl}:`, fetchErr.message);
        }
      }

      // Fallback: try local category image
      if (!imageBuffer) {
        const catFallback = path.join(process.cwd(), "public", "images", "categories", "bread.jpg");
        if (fs.existsSync(catFallback)) {
          imageBuffer = fs.readFileSync(catFallback);
        }
      }

      if (!imageBuffer) {
        console.warn(`No image found for ${prod.name}, skipping upload.`);
        continue;
      }

      // Save locally to public/images/products for fast static fallback
      const localFilePath = path.join(localBackupDir, prod.filename);
      fs.writeFileSync(localFilePath, imageBuffer);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(prod.filename, imageBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadErr) {
        console.error(`Upload error for ${prod.filename}:`, uploadErr);
      }

      // Get public URL
      const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(prod.filename);
      const publicUrl = pubData.publicUrl;
      console.log(`-> Public URL: ${publicUrl}`);

      // Upsert into Supabase `products` table
      const { error: upsertErr } = await supabase.from("products").upsert(
        {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          weight: prod.weight,
          category: prod.category,
          image_url: publicUrl,
          is_active: true,
          is_available: true,
          stock: 50,
        },
        { onConflict: "id" }
      );

      if (upsertErr) {
        console.error(`DB Upsert error for ${prod.name}:`, upsertErr);
      } else {
        console.log(`-> Saved in DB with new Supabase image URL.`);
      }
    } catch (err) {
      console.error(`Error processing ${prod.name}:`, err);
    }
  }

  console.log("Migration complete!");
}

main();
