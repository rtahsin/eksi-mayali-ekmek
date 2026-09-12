/**
 * Aktif ürünlere atelierPlacement atar (demo reyon dağılımı).
 *
 * Kullanım (service account gerekir — client write admin-only):
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccountKey.json
 *   node scripts/seed_atelier_placements.js
 *
 * Dry-run (yazmaz):
 *   node scripts/seed_atelier_placements.js --dry-run
 *
 * Not: Uygulama tarafında AtelierCatalog demo fallback da var;
 * bu script explicit Firestore alanını doldurur.
 */

const admin = require('firebase-admin');

const DRY = process.argv.includes('--dry-run');
const PROJECT = process.env.GCLOUD_PROJECT || 'eksimayaliekmekweb';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT,
    });
  } catch (e) {
    console.error(
      'Firebase Admin başlatılamadı. GOOGLE_APPLICATION_CREDENTIALS ayarlayın.\n',
      e.message || e,
    );
    process.exit(1);
  }
}

const db = admin.firestore();

const PANTRY = [
  'şarküteri', 'sarkuteri', 'charcuterie', 'pantry', 'deli', 'peynir',
  'cheese', 'süt', 'yogurt', 'yoğurt', 'tereyağ', 'tereyag', 'zeytin',
  'reçel', 'recel', 'sucuk', 'salam', 'pastırma', 'pastirma', 'meze',
];
const COUNTER = [
  'pasta', 'tatlı', 'tatli', 'kek', 'kurabiye', 'özel tarif', 'ozel tarif',
  'ekmeklab özel', 'ekmeklab ozel', 'vitrin', 'günün', 'gunun', 'special',
];
const BREAD = [
  'ekmek', 'bread', 'somun', 'baget', 'pide', 'simit', 'fırın', 'firin',
  'maya', 'siyez', 'çavdar', 'cavdar', 'tahıl', 'tahil', 'gluten', 'çörek',
  'corek', 'poğaça', 'pogaca', 'hamur',
];

function blobOf(data) {
  const cat = String(data.category || '').toLowerCase();
  const name = String(data.name || '').toLowerCase();
  const tags = Array.isArray(data.tags)
    ? data.tags.map((t) => String(t).toLowerCase()).join(' ')
    : '';
  return `${cat} ${name} ${tags}`;
}

function matches(blob, keys) {
  return keys.some((k) => blob.includes(k));
}

function inferScene(data) {
  const blob = blobOf(data);
  if (matches(blob, PANTRY)) return 'pantry';
  if (data.isFeatured === true || matches(blob, COUNTER)) return 'counter';
  if (matches(blob, BREAD)) return 'bread_shelf';
  return 'bread_shelf';
}

function sortOrder(data, sceneId) {
  let order = 100;
  if (data.isFeatured) order -= 40;
  if (data.isPopular) order -= 20;
  if (data.isNew) order -= 5;
  const name = String(data.name || '');
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  order += hash % 50;
  if (sceneId === 'counter' && !data.isFeatured) order += 200;
  return order;
}

async function main() {
  const snap = await db.collection('urunler').get();
  console.log(`Toplam doküman: ${snap.size}`);

  const counts = { bread_shelf: 0, pantry: 0, counter: 0, skipped: 0, already: 0 };
  const batch = db.batch();
  let writes = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.isDeleted === true || data.isActive === false) {
      counts.skipped++;
      continue;
    }

    const existing = data.atelierPlacement;
    if (
      existing &&
      typeof existing === 'object' &&
      existing.sceneId &&
      ['bread_shelf', 'pantry', 'counter'].includes(String(existing.sceneId))
    ) {
      counts.already++;
      counts[existing.sceneId] = (counts[existing.sceneId] || 0) + 1;
      console.log(`  [keep] ${data.name} → ${existing.sceneId}`);
      continue;
    }

    const sceneId = inferScene(data);
    const placement = { sceneId, sortOrder: sortOrder(data, sceneId) };
    counts[sceneId]++;
    console.log(`  [${DRY ? 'dry' : 'set'}] ${data.name} (${data.category}) → ${sceneId} #${placement.sortOrder}`);

    if (!DRY) {
      batch.update(doc.ref, { atelierPlacement: placement });
      writes++;
    }
  }

  if (!DRY && writes > 0) {
    await batch.commit();
    console.log(`\n✅ ${writes} ürün güncellendi.`);
  } else if (DRY) {
    console.log('\n(dry-run — yazılmadı)');
  } else {
    console.log('\nYazılacak yeni placement yok.');
  }

  console.log('\nÖzet:', counts);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
