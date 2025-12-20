// Mevcut tüm blog yazılarına published: true field'ını ekle

const admin = require('firebase-admin');
const serviceAccount = require('../android/app/google-services.json');

// Firebase Admin SDK'yı başlat
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: serviceAccount.project_info.project_id,
    clientEmail: `firebase-adminsdk@${serviceAccount.project_info.project_id}.iam.gserviceaccount.com`,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

async function updateBlogPublished() {
  try {
    console.log('Blog yazıları güncelleniyor...');

    // Tüm blog yazılarını al
    const blogsSnapshot = await db.collection('blogs').get();

    if (blogsSnapshot.empty) {
      console.log('Hiç blog yazısı bulunamadı.');
      return;
    }

    console.log(`${blogsSnapshot.size} blog yazısı bulundu.`);

    // Her blog yazısına published: true ekle
    const batch = db.batch();
    let count = 0;

    blogsSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Eğer published field'ı yoksa ekle
      if (data.published === undefined) {
        batch.update(doc.ref, { published: true });
        count++;
        console.log(`Blog güncelleniyor: ${data.title || doc.id}`);
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ ${count} blog yazısı güncellendi.`);
    } else {
      console.log('Güncellenecek blog yazısı yok (tümünde zaten published var).');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Script'i çalıştır
updateBlogPublished();
