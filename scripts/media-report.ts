import * as fs from "node:fs";
import * as path from "node:path";
import { media } from "../content/media/registry";

interface MediaReportItem {
  id: string;
  url: string;
  alt: string;
  license: string;
  credit?: string;
  sizeKb: number | null;
  dimensions?: { width: number; height: number };
  notes?: string;
}

function runMediaReport() {
  console.log("=".repeat(70));
  console.log("🍞 EKMEKLAB MEDYA KAYDI & GÖRSEL RAPORU (P1-06)");
  console.log("=".repeat(70));

  const items: MediaReportItem[] = [];
  const atelierDir = path.resolve(process.cwd(), "public/atelier");

  let maxFileSizeKb = 0;
  let maxFileName = "";

  // 1. Dosya boyutlarını tara
  if (fs.existsSync(atelierDir)) {
    const files = fs.readdirSync(atelierDir);
    console.log(`\n📁 public/atelier Dizini Dosya Analizi (${files.length} dosya):`);
    for (const f of files) {
      const p = path.join(atelierDir, f);
      const stat = fs.statSync(p);
      const sizeKb = Math.round(stat.size / 1024);
      if (sizeKb > maxFileSizeKb) {
        maxFileSizeKb = sizeKb;
        maxFileName = f;
      }
      const statusIcon = sizeKb < 300 ? "✅" : "❌ AŞIM (>300KB)";
      console.log(`  ${statusIcon} ${f.padEnd(28)}: ${sizeKb} KB`);
    }
  }

  // 2. Medya kaydını değerlendir
  for (const [id, item] of Object.entries(media)) {
    let sizeKb: number | null = null;
    if (item.url.startsWith("/")) {
      const localPath = path.resolve(process.cwd(), "public", item.url.replace(/^\//, ""));
      if (fs.existsSync(localPath)) {
        sizeKb = Math.round(fs.statSync(localPath).size / 1024);
      }
    }
    items.push({
      id,
      url: item.url,
      alt: item.alt,
      license: item.license,
      credit: item.credit,
      sizeKb,
      dimensions: item.dimensions,
      notes: item.notes,
    });
  }

  // 3. Stok listesi
  const stockItems = items.filter((i) => i.license === "stock-licensed");
  const ownItems = items.filter((i) => i.license === "own");
  const openItems = items.filter((i) => ["cc-by", "cc-by-sa", "cc0"].includes(i.license));
  const pubItems = items.filter((i) => i.license === "adapted-from-publication");

  console.log("\n" + "-".repeat(70));
  console.log(`📊 ÖZET: Toplam Kayıtlı Medya: ${items.length}`);
  console.log(`   - Kendi Çekimi (own)               : ${ownItems.length}`);
  console.log(`   - Açık Lisans (cc / cc0)           : ${openItems.length}`);
  console.log(`   - Yayından Uyarlama (adapted)      : ${pubItems.length}`);
  console.log(`   - ⚠️ Stok / Geçici (stock-licensed) : ${stockItems.length}`);
  console.log("-".repeat(70));

  console.log("\n⚠️  STOK LİSANSLI MEDYA LİSTESİ (Tahsin'in işaretleyeceği liste):");
  console.log("   (Bu görseller ürün yüzeyinde K007 kuralı gereğince YASAKTIR)\n");
  for (const s of stockItems) {
    console.log(`  • [${s.id}] ${s.url} (${s.sizeKb ?? "?"} KB)`);
    console.log(`    Alt: "${s.alt}"`);
    console.log(`    Not: ${s.notes || "Yok"}\n`);
  }

  console.log("-".repeat(70));
  console.log("🎯 KABUL KRİTERLERİ (DoD) DENETİMİ:");
  const sizePass = maxFileSizeKb < 300;
  console.log(`  1. En büyük atelier dosyası: ${maxFileName} (${maxFileSizeKb} KB) -> ${sizePass ? "✅ GEÇTİ (<300KB)" : "❌ BAŞARISIZ"}`);
  console.log(`  2. Stok listesi oluşturuldu: ${stockItems.length} stok görsel listelendi -> ✅ GEÇTİ`);
  console.log("=".repeat(70));
}

runMediaReport();
