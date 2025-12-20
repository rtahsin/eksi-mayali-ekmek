import 'package:cloud_firestore/cloud_firestore.dart';

import '../utils/logger.dart';

class AddressService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Beylikdüzü mahallelerini getiren metod
  Future<List<String>> getNeighborhoods() async {
    try {
      final snapshot = await _firestore.collection('neighborhoods').get();
      return snapshot.docs.map((doc) => doc.id).toList();
    } catch (e) {
      Logger.error('Mahalleler getirilirken hata: $e');
      // Firestore bağlantısında hata olursa varsayılan değerler
      return [
        'Adnan Kahveci Mah.',
        'Barış Mah.',
        'Büyükşehir Mah.',
        'Cumhuriyet Mah.',
        'Dereağzı Mah.',
        'Gürpınar Mah.',
        'Yakuplu Mah.',
        'Marmara Mah.',
      ];
    }
  }

  // Seçilen mahalleye ait sokakları getiren metod
  Future<List<String>> getStreets(String neighborhood) async {
    try {
      final doc =
          await _firestore.collection('neighborhoods').doc(neighborhood).get();
      if (doc.exists && doc.data()!.containsKey('streets')) {
        return List<String>.from(doc.data()!['streets']);
      }
      // Eğer mahalle veya sokaklar bulunamazsa varsayılan veriler
      return _getDefaultStreets(neighborhood);
    } catch (e) {
      Logger.error('$neighborhood için sokaklar getirilirken hata: $e');
      return _getDefaultStreets(neighborhood);
    }
  }

  // Mahallelere göre varsayılan sokaklar
  List<String> _getDefaultStreets(String neighborhood) {
    final streets = {
      'Adnan Kahveci Mah.': [
        'Anadolu Caddesi',
        '1. Sokak',
        '2. Sokak',
        'Gardenya Sokak'
      ],
      'Barış Mah.': [
        'Barış Caddesi',
        'Huzur Sokak',
        'Dostluk Sokak',
        'Egemenlik Sokak'
      ],
      'Büyükşehir Mah.': [
        'Büyükşehir Bulvarı',
        'Metropol Sokak',
        'Şehir Caddesi'
      ],
      'Cumhuriyet Mah.': [
        'Atatürk Caddesi',
        'İnönü Sokak',
        'Cumhuriyet Bulvarı'
      ],
      'Dereağzı Mah.': ['Dereağzı Caddesi', 'Marmara Sokak', 'Deniz Sokak'],
      'Gürpınar Mah.': ['Gürpınar Caddesi', 'Sahil Yolu', 'Balıkçı Sokak'],
      'Yakuplu Mah.': ['Yakuplu Caddesi', 'Hürriyet Sokak', 'Vatan Caddesi'],
      'Marmara Mah.': ['Marmara Caddesi', 'Deniz Sokak', 'Sahil Sokak'],
    };

    return streets[neighborhood] ?? ['Sokak bilgisi bulunamadı'];
  }

  // Firestore'a örnek adres verilerini eklemek için kullanılabilecek metod
  Future<void> addSampleAddressData() async {
    try {
      final neighborhoods = {
        'Adnan Kahveci Mah.': [
          'Anadolu Caddesi',
          '1. Sokak',
          '2. Sokak',
          'Gardenya Sokak'
        ],
        'Barış Mah.': [
          'Barış Caddesi',
          'Huzur Sokak',
          'Dostluk Sokak',
          'Egemenlik Sokak'
        ],
        'Büyükşehir Mah.': [
          'Büyükşehir Bulvarı',
          'Metropol Sokak',
          'Şehir Caddesi'
        ],
        'Cumhuriyet Mah.': [
          'Atatürk Caddesi',
          'İnönü Sokak',
          'Cumhuriyet Bulvarı'
        ],
        'Dereağzı Mah.': ['Dereağzı Caddesi', 'Marmara Sokak', 'Deniz Sokak'],
        'Gürpınar Mah.': ['Gürpınar Caddesi', 'Sahil Yolu', 'Balıkçı Sokak'],
        'Yakuplu Mah.': ['Yakuplu Caddesi', 'Hürriyet Sokak', 'Vatan Caddesi'],
        'Marmara Mah.': ['Marmara Caddesi', 'Deniz Sokak', 'Sahil Sokak'],
      };

      for (var entry in neighborhoods.entries) {
        await _firestore.collection('neighborhoods').doc(entry.key).set({
          'streets': entry.value,
        });
      }

      Logger.info('Örnek adres verileri başarıyla eklendi.');
    } catch (e) {
      Logger.error('Örnek adres verileri eklenirken hata: $e');
      rethrow;
    }
  }
}
