// ChatBot Demo Verilerini Oluşturma Script'i
// Firebase Admin SDK kullanarak ChatBot mesajlarını ve ayarlarını oluşturur

const admin = require('firebase-admin');

// Firebase Admin SDK'yı başlat
admin.initializeApp();
const db = admin.firestore();

async function createChatBotData() {
  try {
    console.log('ChatBot demo verileri oluşturuluyor...');

    // 1. Ayarları oluştur
    await db.collection('chatbot_settings').doc('default').set({
      welcomeMessage: 'Merhaba! EkmekLab\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
      botName: 'EkmekLab Asistan',
      botAvatar: '',
      isEnabled: true,
      primaryColor: '#8B4513',
      position: 'bottom-right',
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Ayarlar oluşturuldu');

    // 2. Karşılama mesajı (greeting)
    await db.collection('chatbot_messages').doc('greeting_1').set({
      message: 'Merhaba! EkmekLab\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
      category: 'greeting',
      isActive: true,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_1',
          text: '🍞 Ürünler hakkında bilgi',
          nextMessageId: 'product_info',
        },
        {
          id: 'opt_2',
          text: '📦 Sipariş takibi',
          nextMessageId: 'order_tracking',
        },
        {
          id: 'opt_3',
          text: '🚚 Teslimat bilgileri',
          nextMessageId: 'delivery_info',
        },
        {
          id: 'opt_4',
          text: '📞 İletişim',
          nextMessageId: 'contact_info',
        },
      ],
    });
    console.log('✅ Karşılama mesajı oluşturuldu');

    // 3. Ürün bilgileri
    await db.collection('chatbot_messages').doc('product_info').set({
      message: 'EkmekLab olarak %100 ekşi maya ile doğal ekmekler üretiyoruz. Hangi konuda bilgi almak istersiniz?',
      category: 'product',
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_5',
          text: 'Ekşi maya nedir?',
          nextMessageId: 'sourdough_info',
        },
        {
          id: 'opt_6',
          text: 'Ürün çeşitleri',
          nextMessageId: 'product_types',
        },
        {
          id: 'opt_7',
          text: 'Fiyatlar',
          nextMessageId: 'pricing',
        },
        {
          id: 'opt_8',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });
    console.log('✅ Ürün bilgileri mesajı oluşturuldu');

    // 4. Ekşi maya açıklaması
    await db.collection('chatbot_messages').doc('sourdough_info').set({
      message: 'Ekşi maya, doğal fermantasyon süreciyle oluşan, sağlıklı ve sindirimi kolay bir maya türüdür. Kimyasal maya içermez, probiyotik açısından zengindir.',
      category: 'product',
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_9',
          text: 'Faydaları neler?',
          nextMessageId: 'sourdough_benefits',
        },
        {
          id: 'opt_10',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });

    // 5. Ekşi maya faydaları
    await db.collection('chatbot_messages').doc('sourdough_benefits').set({
      message: '🌾 Sindirimi kolaylaştırır\n🩺 Gluten hassasiyetini azaltır\n🔋 Enerji verir\n🦠 Bağırsak sağlığını destekler\n💪 Kan şekerini dengeler',
      category: 'product',
      isActive: true,
      order: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_11',
          text: '🛒 Ürünlere göz at',
          nextMessageId: 'product_types',
        },
        {
          id: 'opt_12',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });

    // 6. Ürün çeşitleri
    await db.collection('chatbot_messages').doc('product_types').set({
      message: 'Ürün çeşitlerimiz:\n\n🥖 Klasik Ekşi Mayalı Ekmek\n🌾 Tam Buğday Ekşi Maya\n🥐 Çavdarlı Ekşi Maya\n🍞 Özel Karışım Ekşi Maya\n\nDetaylı bilgi için ürünler sayfasını ziyaret edebilirsiniz.',
      category: 'product',
      isActive: true,
      order: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_13',
          text: '💰 Fiyatlar',
          nextMessageId: 'pricing',
        },
        {
          id: 'opt_14',
          text: '📞 İletişim',
          nextMessageId: 'contact_info',
        },
        {
          id: 'opt_15',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });

    // 7. Fiyat bilgisi
    await db.collection('chatbot_messages').doc('pricing').set({
      message: 'Ürünlerimizin fiyatları 45₺ ile 85₺ arasında değişmektedir. Güncel fiyatlar için ürünler sayfasını ziyaret edebilirsiniz.',
      category: 'product',
      isActive: true,
      order: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_16',
          text: '🛒 Sipariş ver',
          nextMessageId: 'order_info',
        },
        {
          id: 'opt_17',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });

    // 8. Sipariş bilgisi
    await db.collection('chatbot_messages').doc('order_info').set({
      message: 'Sipariş vermek için web sitemizden ürünleri sepete ekleyebilir ve checkout işlemini tamamlayabilirsiniz. Minimum sipariş tutarı 100₺\'dir.',
      category: 'order',
      isActive: true,
      order: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_18',
          text: '📦 Sipariş takibi',
          nextMessageId: 'order_tracking',
        },
        {
          id: 'opt_19',
          text: '🚚 Teslimat bilgileri',
          nextMessageId: 'delivery_info',
        },
        {
          id: 'opt_20',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });

    // 9. Sipariş takibi
    await db.collection('chatbot_messages').doc('order_tracking').set({
      message: 'Siparişinizi takip etmek için:\n1. Sağ üst menüden \"Siparişlerim\" bölümüne gidin\n2. Sipariş numaranızla siparişinizi görüntüleyin\n3. Kargo takip kodunu kullanarak teslimat durumunu öğrenin',
      category: 'order',
      isActive: true,
      order: 7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_21',
          text: '📞 Destek al',
          nextMessageId: 'contact_info',
        },
        {
          id: 'opt_22',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });

    // 10. Teslimat bilgileri
    await db.collection('chatbot_messages').doc('delivery_info').set({
      message: '🚚 Teslimat Bilgileri:\n\n📍 İstanbul içi: 1-2 iş günü\n📍 İstanbul dışı: 2-4 iş günü\n💳 150₺ üzeri siparişlerde kargo ücretsiz\n📦 Taze ürünler özel paketleme ile gönderilir',
      category: 'delivery',
      isActive: true,
      order: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_23',
          text: '🛒 Sipariş ver',
          nextMessageId: 'order_info',
        },
        {
          id: 'opt_24',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });

    // 11. İletişim bilgileri
    await db.collection('chatbot_messages').doc('contact_info').set({
      message: 'Bize ulaşın:\n\n📧 Email: info@ekmeklab.com\n📱 WhatsApp: 0501 012 6653\n🌐 Web: ekmeklab.com\n\nMesai saatleri: 09:00 - 18:00',
      category: 'general',
      isActive: true,
      order: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: [
        {
          id: 'opt_25',
          text: '📱 WhatsApp ile iletişime geç',
          nextMessageId: '',
          action: 'whatsapp',
          actionValue: '905010126653',
        },
        {
          id: 'opt_26',
          text: '🏠 Ana menüye dön',
          nextMessageId: 'greeting_1',
        },
      ],
    });
    console.log('✅ Tüm mesajlar oluşturuldu');

    console.log('\n🎉 ChatBot demo verileri başarıyla oluşturuldu!');
    console.log('Admin panelden /admin/chatbot adresinden mesajları yönetebilirsiniz.');

  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

createChatBotData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
