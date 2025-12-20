// ChatBot Demo Verileri Oluşturma Scripti
// Kullanım: node scripts/create_chatbot_demo_data.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createChatBotData() {
  console.log('🔄 ChatBot demo verileri oluşturuluyor...');

  // 1. Settings oluştur
  await db.collection('chatbot_settings').doc('default').set({
    welcomeMessage: 'Merhaba! EkmekLab\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
    botName: 'EkmekLab Asistan',
    botAvatar: 'https://via.placeholder.com/150',
    isEnabled: true,
    primaryColor: '#8B4513',
    position: 'bottom-right',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ Settings oluşturuldu');

  // 2. Karşılama Mesajı
  const greeting = await db.collection('chatbot_messages').add({
    message: 'Merhaba! 👋 EkmekLab\'a hoş geldiniz. Ben sizin asistanınızım. Aşağıdaki konularda size yardımcı olabilirim:',
    category: 'greeting',
    order: 0,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_products',
        text: '🍞 Ürünler Hakkında',
        nextMessageId: 'PLACEHOLDER_PRODUCTS',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_order',
        text: '🛒 Sipariş Vermek',
        nextMessageId: 'PLACEHOLDER_ORDER',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_delivery',
        text: '🚚 Teslimat Bilgisi',
        nextMessageId: 'PLACEHOLDER_DELIVERY',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_contact',
        text: '📞 İletişim',
        nextMessageId: 'PLACEHOLDER_CONTACT',
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Karşılama mesajı oluşturuldu:', greeting.id);

  // 3. Ürünler Hakkında
  const products = await db.collection('chatbot_messages').add({
    message: 'Ekşi mayalı ekmeklerimiz hakkında bilgi almak ister misiniz?',
    category: 'product_info',
    order: 1,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_sourdough',
        text: '🥖 Ekşi Maya Nedir?',
        nextMessageId: 'PLACEHOLDER_SOURDOUGH',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_benefits',
        text: '💚 Faydaları',
        nextMessageId: 'PLACEHOLDER_BENEFITS',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_types',
        text: '📋 Ekmek Çeşitleri',
        nextMessageId: 'PLACEHOLDER_TYPES',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_pricing',
        text: '💰 Fiyatlar',
        nextMessageId: 'PLACEHOLDER_PRICING',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_back_greeting',
        text: '⬅️ Ana Menü',
        nextMessageId: greeting.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Ürünler mesajı oluşturuldu:', products.id);

  // 4. Ekşi Maya Nedir
  const sourdough = await db.collection('chatbot_messages').add({
    message: 'Ekşi maya, doğal fermantasyon yöntemiyle hazırlanan geleneksel bir ekmek mayasıdır. Un ve su karışımının doğal bakteriler ve mayalarla fermantasyonu sonucu oluşur. Sağlıklı, sindirimi kolay ve lezzetlidir!',
    category: 'sourdough_info',
    order: 2,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_benefits2',
        text: '💚 Faydalarını öğren',
        nextMessageId: 'PLACEHOLDER_BENEFITS',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_back_products',
        text: '⬅️ Ürünlere Dön',
        nextMessageId: products.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Ekşi maya açıklama oluşturuldu:', sourdough.id);

  // 5. Faydaları
  const benefits = await db.collection('chatbot_messages').add({
    message: 'Ekşi mayalı ekmeğin faydaları:\n\n✅ Kolay sindirim\n✅ Düşük glisemik indeks\n✅ Doğal probiyotikler\n✅ Zengin vitamin ve mineral\n✅ Daha uzun tazelik\n✅ Katkısız ve doğal',
    category: 'benefits',
    order: 3,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_order_now',
        text: '🛒 Sipariş Ver',
        nextMessageId: 'PLACEHOLDER_ORDER',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_back_products2',
        text: '⬅️ Ürünlere Dön',
        nextMessageId: products.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Faydalar mesajı oluşturuldu:', benefits.id);

  // 6. Ekmek Çeşitleri
  const types = await db.collection('chatbot_messages').add({
    message: 'Ekmek çeşitlerimiz:\n\n🥖 Klasik Köy Ekmeği\n🌾 Tam Buğday Ekmeği\n🌰 Çekirdekli Ekmek\n🧄 Sarımsaklı Ekmek\n🥐 Çavdar Ekmeği\n🍞 Çok Tahıllı Ekmek',
    category: 'types',
    order: 4,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_see_products',
        text: '👀 Ürünleri Gör',
        nextMessageId: null,
        action: 'link',
        actionValue: '/#urunler'
      },
      {
        id: 'opt_pricing2',
        text: '💰 Fiyatlar',
        nextMessageId: 'PLACEHOLDER_PRICING',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_back_products3',
        text: '⬅️ Ürünlere Dön',
        nextMessageId: products.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Çeşitler mesajı oluşturuldu:', types.id);

  // 7. Fiyatlar
  const pricing = await db.collection('chatbot_messages').add({
    message: 'Fiyatlarımız:\n\n🥖 Klasik Köy: 30 TL\n🌾 Tam Buğday: 35 TL\n🌰 Çekirdekli: 40 TL\n🥐 Çavdar: 35 TL\n\n*Fiyatlar ekmek gramajına göre değişiklik gösterebilir.',
    category: 'pricing',
    order: 5,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_order_now2',
        text: '🛒 Sipariş Ver',
        nextMessageId: 'PLACEHOLDER_ORDER',
        action: null,
        actionValue: null
      },
      {
        id: 'opt_back_products4',
        text: '⬅️ Ürünlere Dön',
        nextMessageId: products.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Fiyatlar mesajı oluşturuldu:', pricing.id);

  // 8. Sipariş
  const order = await db.collection('chatbot_messages').add({
    message: 'Sipariş vermek için:\n\n1️⃣ Web sitemizden sepete ekleyin\n2️⃣ WhatsApp üzerinden sipariş verin\n3️⃣ Telefon ile arayın\n\nHangisini tercih edersiniz?',
    category: 'order_info',
    order: 6,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_web_order',
        text: '🌐 Web Sitesinden',
        nextMessageId: null,
        action: 'link',
        actionValue: '/'
      },
      {
        id: 'opt_whatsapp_order',
        text: '💬 WhatsApp',
        nextMessageId: null,
        action: 'whatsapp',
        actionValue: '905010126653'
      },
      {
        id: 'opt_phone_order',
        text: '📞 Telefon',
        nextMessageId: null,
        action: 'phone',
        actionValue: '905010126653'
      },
      {
        id: 'opt_back_greeting2',
        text: '⬅️ Ana Menü',
        nextMessageId: greeting.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Sipariş mesajı oluşturuldu:', order.id);

  // 9. Teslimat
  const delivery = await db.collection('chatbot_messages').add({
    message: 'Teslimat Bilgileri:\n\n📦 Sipariş sonrası 24-48 saat içinde hazırlanır\n🚚 İstanbul içi ücretsiz teslimat\n🌍 İstanbul dışı kargo ile gönderim\n⏰ Teslimat saatleri: 09:00-18:00',
    category: 'delivery_info',
    order: 7,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_order_now3',
        text: '🛒 Sipariş Ver',
        nextMessageId: order.id,
        action: null,
        actionValue: null
      },
      {
        id: 'opt_back_greeting3',
        text: '⬅️ Ana Menü',
        nextMessageId: greeting.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ Teslimat mesajı oluşturuldu:', delivery.id);

  // 10. İletişim
  const contact = await db.collection('chatbot_messages').add({
    message: 'Bizimle iletişime geçin:\n\n📞 Telefon: 0501 012 66 53\n💬 WhatsApp: 0501 012 66 53\n📧 E-posta: info@ekmeklab.com\n📍 Adres: İstanbul, Türkiye\n\nNasıl ulaşmak istersiniz?',
    category: 'contact_info',
    order: 8,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    options: [
      {
        id: 'opt_whatsapp_contact',
        text: '💬 WhatsApp',
        nextMessageId: null,
        action: 'whatsapp',
        actionValue: '905010126653'
      },
      {
        id: 'opt_phone_contact',
        text: '📞 Telefon',
        nextMessageId: null,
        action: 'phone',
        actionValue: '905010126653'
      },
      {
        id: 'opt_email_contact',
        text: '📧 E-posta',
        nextMessageId: null,
        action: 'email',
        actionValue: 'info@ekmeklab.com'
      },
      {
        id: 'opt_back_greeting4',
        text: '⬅️ Ana Menü',
        nextMessageId: greeting.id,
        action: null,
        actionValue: null
      }
    ]
  });
  console.log('✅ İletişim mesajı oluşturuldu:', contact.id);

  // Şimdi PLACEHOLDER'ları gerçek ID'lerle güncelle
  console.log('🔄 Placeholder ID\'ler güncelleniyor...');

  await db.collection('chatbot_messages').doc(greeting.id).update({
    'options.0.nextMessageId': products.id,
    'options.1.nextMessageId': order.id,
    'options.2.nextMessageId': delivery.id,
    'options.3.nextMessageId': contact.id,
  });

  await db.collection('chatbot_messages').doc(products.id).update({
    'options.0.nextMessageId': sourdough.id,
    'options.1.nextMessageId': benefits.id,
    'options.2.nextMessageId': types.id,
    'options.3.nextMessageId': pricing.id,
  });

  await db.collection('chatbot_messages').doc(sourdough.id).update({
    'options.0.nextMessageId': benefits.id,
  });

  await db.collection('chatbot_messages').doc(benefits.id).update({
    'options.0.nextMessageId': order.id,
  });

  await db.collection('chatbot_messages').doc(types.id).update({
    'options.1.nextMessageId': pricing.id,
  });

  await db.collection('chatbot_messages').doc(pricing.id).update({
    'options.0.nextMessageId': order.id,
  });

  console.log('✅ Tüm placeholder ID\'ler güncellendi');
  console.log('');
  console.log('🎉 ChatBot demo verileri başarıyla oluşturuldu!');
  console.log('📊 Toplam 10 mesaj oluşturuldu:');
  console.log('  - Karşılama:', greeting.id);
  console.log('  - Ürünler:', products.id);
  console.log('  - Ekşi Maya:', sourdough.id);
  console.log('  - Faydalar:', benefits.id);
  console.log('  - Çeşitler:', types.id);
  console.log('  - Fiyatlar:', pricing.id);
  console.log('  - Sipariş:', order.id);
  console.log('  - Teslimat:', delivery.id);
  console.log('  - İletişim:', contact.id);

  process.exit(0);
}

createChatBotData().catch(console.error);
