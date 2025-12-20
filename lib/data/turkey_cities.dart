/// Türkiye illeri ve ilçeleri için veri dosyası
///
/// Bu dosya, Türkiye'deki illerin ve her ilin ilçelerinin listesini içerir.

class TurkeyCity {
  final String id;
  final String name;
  final List<String> districts;

  const TurkeyCity({
    required this.id,
    required this.name,
    required this.districts,
  });
}

/// Türkiye illeri
///
/// Tüm iller içinden şimdilik sadece İstanbul'u ekledim
final List<TurkeyCity> turkeyCities = [
  const TurkeyCity(
    id: 'istanbul',
    name: 'İstanbul',
    districts: [
      'Adalar',
      'Arnavutköy',
      'Ataşehir',
      'Avcılar',
      'Bağcılar',
      'Bahçelievler',
      'Bakırköy',
      'Başakşehir',
      'Bayrampaşa',
      'Beşiktaş',
      'Beykoz',
      'Beylikdüzü',
      'Beyoğlu',
      'Büyükçekmece',
      'Çatalca',
      'Çekmeköy',
      'Esenler',
      'Esenyurt',
      'Eyüpsultan',
      'Fatih',
      'Gaziosmanpaşa',
      'Güngören',
      'Kadıköy',
      'Kağıthane',
      'Kartal',
      'Küçükçekmece',
      'Maltepe',
      'Pendik',
      'Sancaktepe',
      'Sarıyer',
      'Silivri',
      'Sultanbeyli',
      'Sultangazi',
      'Şile',
      'Şişli',
      'Tuzla',
      'Ümraniye',
      'Üsküdar',
      'Zeytinburnu',
    ],
  ),
  // Diğer iller ihtiyaç halinde buraya eklenebilir
];

/// İlleri getir
List<String> getCityNames() {
  return turkeyCities.map((city) => city.name).toList();
}

/// Belirli bir ilin ilçelerini getir
List<String> getDistrictsOfCity(String cityName) {
  final city = turkeyCities.firstWhere(
    (city) => city.name == cityName,
    orElse: () => const TurkeyCity(id: '', name: '', districts: []),
  );

  return city.districts;
}

/// İl adından id'sini bul
String getCityId(String cityName) {
  final city = turkeyCities.firstWhere(
    (city) => city.name == cityName,
    orElse: () => const TurkeyCity(id: '', name: '', districts: []),
  );

  return city.id;
}
