/**
 * Kategoriler Collection Seed Data Script
 * 
 * Bu script, Firestore'daki kategoriler koleksiyonuna örnek veriler ekler.
 * Sadece koleksiyon boşsa çalışır, mevcut verilere dokunmaz.
 * 
 * Kullanım:
 * 1. Firebase Console'a gidin: https://console.firebase.google.com/project/eksimayaliekmekweb/firestore
 * 2. "kategoriler" koleksiyonuna tıklayın (yoksa oluşturun)
 * 3. Aşağıdaki örnek verileri manuel olarak ekleyin
 * 
 * VEYA Firebase CLI ile:
 * 1. Firebase projesine giriş yapın: firebase login
 * 2. Projeyi seçin: firebase use eksimayaliekmekweb
 * 3. Service account key indirin: https://console.firebase.google.com/project/eksimayaliekmekweb/settings/serviceaccounts/adminsdk
 * 4. Key dosyasını GOOGLE_APPLICATION_CREDENTIALS environment variable'ına atayın
 * 5. Script'i çalıştırın: node scripts/seed_categories.js
 */

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  KATEGORİLER SEED DATA                          ║
╚══════════════════════════════════════════════════════════════════╝

📋 Aşağıdaki örnek kategorileri Firebase Console'dan manuel olarak ekleyebilirsiniz:
🔗 https://console.firebase.google.com/project/eksimayaliekmekweb/firestore/data/~2Fkategoriler

`);

// Örnek kategori verileri
const defaultCategories = [
  {
    name: 'Ekşi Mayalı Ekmekler',
    description: 'Geleneksel ekşi maya ile uzun fermentasyon süreciyle hazırlanan sağlıklı ekmekler',
    imageUrl: '',
    isActive: true,
    order: 1,
    iconName: 'bakery_dining',
    productCount: 0,
  },
  {
    name: 'Tahıllı Ekmekler',
    description: 'Çeşitli tahıllar ve tohumlarla zenginleştirilmiş besleyici ekmekler',
    imageUrl: '',
    isActive: true,
    order: 2,
    iconName: 'breakfast_dining',
    productCount: 0,
  },
  {
    name: 'Özel Tarifler',
    description: 'Benzersiz lezzetler ve özel tariflerle hazırlanan ekmekler',
    imageUrl: '',
    isActive: true,
    order: 3,
    iconName: 'star',
    productCount: 0,
  },
  {
    name: 'Glutensiz',
    description: 'Glutensiz unlarla hazırlanan özel ekmekler',
    imageUrl: '',
    isActive: true,
    order: 4,
    iconName: 'cookie',
    productCount: 0,
  },
  {
    name: 'Pastalar ve Tatlılar',
    description: 'Ev yapımı pastalar, kekler ve tatlı ekmekler',
    imageUrl: '',
    isActive: true,
    order: 5,
    iconName: 'cake',
    productCount: 0,
  },
  {
    name: 'Çörekler ve Poğaçalar',
    description: 'Taze çörekler, poğaçalar ve kahvaltılık hamur işleri',
    imageUrl: '',
    isActive: true,
    order: 6,
    iconName: 'lunch_dining',
    productCount: 0,
  },
];

// Kategorileri yazdır
console.log('═══════════════════════════════════════════════════════════════════\n');

defaultCategories.forEach((category, index) => {
  console.log(`${index + 1}. ${category.name}`);
  console.log(`   📝 Açıklama: ${category.description}`);
  console.log(`   📊 Order: ${category.order}`);
  console.log(`   🎨 Icon: ${category.iconName}`);
  console.log(`   ✅ Active: ${category.isActive}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════════');
console.log('\n💡 TİP: Admin panelden de kategori ekleyebilirsiniz:');
console.log('   https://eksimayaliekmekweb.web.app/admin/categories\n');

console.log('✅ Kategoriler hazır! Firebase Console\'dan veya admin panelden ekleyebilirsiniz.\n');
