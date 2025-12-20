import '../models/category.dart';
import '../models/product.dart';
import '../services/image_service.dart';

class SampleData {
  static const String defaultProductImage =
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'; // Varsayılan ekmek görseli (network)

  // Kategorileri getir
  static List<Category> getCategories() {
    return [
      Category(
        id: '1',
        name: 'Ekmek Çeşitleri',
        description:
            'Ekşi mayalı, tam buğdaylı, çavdarlı ve daha birçok ekmek çeşidi.',
        imageUrl: ImageService.getCategoryImage('Ekmek Çeşitleri'),
        productCount: 8,
      ),
      Category(
        id: '2',
        name: 'Kahvaltılık',
        description: 'Taze ve lezzetli kahvaltılık ürünler.',
        imageUrl: ImageService.getCategoryImage('Kahvaltılık'),
        productCount: 12,
      ),
      Category(
        id: '3',
        name: 'Tatlılar',
        description: 'El yapımı pasta, kurabiye ve diğer tatlı çeşitleri.',
        imageUrl: ImageService.getCategoryImage('Tatlılar'),
        productCount: 15,
      ),
      Category(
        id: '4',
        name: 'İçecekler',
        description: 'Sıcak ve soğuk içecek çeşitleri.',
        imageUrl: ImageService.getCategoryImage('İçecekler'),
        productCount: 6,
      ),
      Category(
        id: '5',
        name: 'Şarküteri',
        description: 'Kaliteli peynir ve şarküteri ürünleri.',
        imageUrl: ImageService.getCategoryImage('Şarküteri'),
        productCount: 10,
      ),
    ];
  }

  // Tüm ürünleri getir
  static List<Product> getProducts() {
    return [
      Product(
        id: '1',
        name: 'Ekşi Mayalı Köy Ekmeği',
        description:
            'Geleneksel yöntemlerle hazırlanmış, ekşi maya ile 24 saat fermente edilmiş köy ekmeği. İçerisinde sadece un, su, tuz ve ekşi maya bulunur.',
        price: 35.00,
        imageUrl: ImageService.getDefaultProductImage('ekmek'),
        imageUrls: [
          ImageService.getDefaultProductImage('ekmek'),
          ImageService.getDefaultProductImage('çavdar'),
          ImageService.getDefaultProductImage('zeytinli'),
        ],
        category: 'Ekmek Çeşitleri',
        isNew: true,
        isPopular: true,
        ingredients: ['Organik un', 'Su', 'Deniz tuzu', 'Ekşi maya kültürü'],
        stock: 15,
      ),
      Product(
        id: '2',
        name: 'Çavdarlı Tam Buğday Ekmeği',
        description:
            'Tam buğday ve çavdar unu karışımı ile yapılan, lif bakımından zengin, ekşi maya ekmeği. Uzun süre tokluk hissi verir.',
        price: 40.00,
        imageUrl: ImageService.getDefaultProductImage('çavdar'),
        imageUrls: [
          ImageService.getDefaultProductImage('çavdar'),
          ImageService.getDefaultProductImage('ekmek'),
          ImageService.getDefaultProductImage('zeytinli'),
        ],
        category: 'Ekmek Çeşitleri',
        discountPercentage: 10,
        isPopular: true,
        ingredients: [
          'Tam buğday unu',
          'Çavdar unu',
          'Su',
          'Deniz tuzu',
          'Ekşi Maya'
        ],
        stock: 20,
      ),
      Product(
        id: '3',
        name: 'Cevizli Ekşi Mayalı Ekmek',
        description:
            'Ceviz parçaları ile zenginleştirilmiş, kahvaltılarınıza lezzet katacak özel bir ekşi maya ekmek çeşidi.',
        price: 50.00,
        imageUrl: ImageService.getDefaultProductImage('cevizli'),
        imageUrls: [
          ImageService.getDefaultProductImage('cevizli'),
          ImageService.getDefaultProductImage('ekmek'),
          ImageService.getDefaultProductImage('çavdar'),
        ],
        category: 'Ekmek Çeşitleri',
        ingredients: ['Organik un', 'Su', 'Deniz tuzu', 'Ekşi maya', 'Ceviz'],
        stock: 12,
      ),
      Product(
        id: '4',
        name: 'Simit',
        description:
            'Geleneksel Türk simidi, çıtır dış yüzeyi ve yumuşak içi ile susam kaplı lezzet.',
        price: 7.50,
        imageUrl: ImageService.getDefaultProductImage('poğaça'),
        imageUrls: [
          ImageService.getDefaultProductImage('poğaça'),
          ImageService.getDefaultProductImage('ekmek'),
          ImageService.getDefaultProductImage('çavdar'),
        ],
        category: 'Ekmek Çeşitleri',
        isNew: true,
        isPopular: true,
        ingredients: ['Un', 'Su', 'Maya', 'Susam', 'Pekmez'],
        stock: 30,
      ),
      Product(
        id: '5',
        name: 'Zeytinli Akdeniz Ekmeği',
        description:
            'Siyah ve yeşil zeytin parçaları ile zenginleştirilmiş, Akdeniz esintisi taşıyan ekşi maya ekmek.',
        price: 45.00,
        imageUrl: ImageService.getDefaultProductImage('zeytinli'),
        imageUrls: [
          ImageService.getDefaultProductImage('zeytinli'),
          ImageService.getDefaultProductImage('ekmek'),
          ImageService.getDefaultProductImage('çavdar'),
        ],
        category: 'Ekmek Çeşitleri',
        discountPercentage: 15,
        ingredients: [
          'Organik Un',
          'Su',
          'Tuz',
          'Ekşi Maya',
          'Siyah Zeytin',
          'Yeşil Zeytin',
          'Zeytinyağı'
        ],
        stock: 25,
      ),

      // Şarküteri Ürünleri
      Product(
        id: '6',
        name: 'Kelle Sucuk',
        description:
            'Tamamen doğal malzemelerle üretilen, Kayseri usulü fermente edilmiş kelle sucuk.',
        price: 180.0,
        imageUrl: ImageService.getDefaultProductImage('sucuk'),
        imageUrls: [
          ImageService.getDefaultProductImage('sucuk'),
          ImageService.getDefaultProductImage('kaşar'),
          ImageService.getDefaultProductImage('peynir'),
        ],
        category: 'Şarküteri',
        ingredients: ['Dana Eti', 'Baharatlar', 'Doğal Bağırsak'],
        stock: 8,
      ),
      Product(
        id: '7',
        name: 'Ezine Beyaz Peynir',
        description:
            'Ezine yöresinin doğal florası ile olgunlaştırılmış, tam yağlı, olgun beyaz peynir.',
        price: 150.0,
        imageUrl: ImageService.getDefaultProductImage('peynir'),
        imageUrls: [
          ImageService.getDefaultProductImage('peynir'),
          ImageService.getDefaultProductImage('kaşar'),
          ImageService.getDefaultProductImage('sucuk'),
        ],
        category: 'Şarküteri',
        isPopular: true,
        ingredients: [
          'Pastörize Koyun, İnek ve Keçi Sütü',
          'Tuz',
          'Peynir Mayası'
        ],
        stock: 10,
      ),
      Product(
        id: '8',
        name: 'Çikolatalı Kurabiye',
        description:
            'Kaliteli bitter çikolata parçaları ile hazırlanmış ev yapımı kurabiye.',
        price: 40.00,
        imageUrl: ImageService.getDefaultProductImage('kurabiye'),
        imageUrls: [
          ImageService.getDefaultProductImage('kurabiye'),
          ImageService.getDefaultProductImage('pasta'),
          ImageService.getDefaultProductImage('croissant'),
        ],
        category: 'Tatlılar',
        isNew: true,
        ingredients: ['Un', 'Tereyağı', 'Şeker', 'Yumurta', 'Bitter çikolata'],
        stock: 20,
      ),

      // Pastane Ürünleri
      Product(
        id: '9',
        name: 'Croissant',
        description:
            'Fransız usulü, tereyağlı ve katmanlı croissant. Kahvenizin yanında ideal.',
        price: 15.0,
        imageUrl: ImageService.getDefaultProductImage('croissant'),
        imageUrls: [
          ImageService.getDefaultProductImage('croissant'),
          ImageService.getDefaultProductImage('kurabiye'),
          ImageService.getDefaultProductImage('pasta'),
        ],
        category: 'Pastane Ürünleri',
        isPopular: true,
        ingredients: ['Un', 'Tereyağı', 'Su', 'Maya', 'Tuz', 'Şeker'],
        stock: 18,
      ),
      Product(
        id: '10',
        name: 'Tahinli Çörek',
        description:
            'Bol tahin ve şekerle hazırlanmış, ağızda dağılan geleneksel tahinli çörek.',
        price: 20.0,
        imageUrl: ImageService.getDefaultProductImage('tahinli'),
        imageUrls: [
          ImageService.getDefaultProductImage('tahinli'),
          ImageService.getDefaultProductImage('croissant'),
          ImageService.getDefaultProductImage('kurabiye'),
        ],
        category: 'Pastane Ürünleri',
        isNew: true,
        ingredients: ['Un', 'Tahin', 'Şeker', 'Tereyağı', 'Yumurta', 'Maya'],
        stock: 15,
      ),
      Product(
        id: '11',
        name: 'Filtre Kahve',
        description:
            'Özenle kavrulmuş özel çekirdeklerden hazırlanan filtre kahve.',
        price: 25.0,
        imageUrl: ImageService.getDefaultProductImage('kahve'),
        imageUrls: [
          ImageService.getDefaultProductImage('kahve'),
          ImageService.getDefaultProductImage('limonata'),
        ],
        category: 'İçecekler',
        isPopular: true,
        ingredients: ['Özel Kavurma Kahve Çekirdeği'],
        stock: 22,
      ),
      Product(
        id: '12',
        name: 'Ev Yapımı Limonata',
        description:
            'Taze sıkılmış limonlar ve doğal şeker ile hazırlanan serinletici içecek.',
        price: 20.0,
        imageUrl: ImageService.getDefaultProductImage('limonata'),
        imageUrls: [
          ImageService.getDefaultProductImage('limonata'),
          ImageService.getDefaultProductImage('kahve'),
        ],
        category: 'İçecekler',
        ingredients: ['Limon', 'Şeker', 'Su', 'Nane'],
        stock: 14,
      ),
    ];
  }

  // Popüler ürünleri getir
  static List<Product> getPopularProducts() {
    final allProducts = getProducts();
    // Ürünlerin %30'unu popüler olarak işaretle (rastgele)
    final popularProducts = allProducts
        .where((product) => product.id.hashCode % 3 == 0 || product.isPopular)
        .toList();

    // En az 3 ürün olsun
    if (popularProducts.length < 3) {
      return allProducts.sublist(0, 3);
    }

    return popularProducts;
  }

  // Yeni ürünleri getir
  static List<Product> getNewProducts() {
    final allProducts = getProducts();
    // Ürünlerin %30'unu yeni olarak işaretle (rastgele)
    final newProducts = allProducts
        .where((product) => product.isNew || product.id.hashCode % 4 == 0)
        .toList();

    // En az 3 ürün olsun
    if (newProducts.length < 3) {
      return allProducts.sublist(0, 3);
    }

    return newProducts;
  }

  // Kategoriye göre ürünleri getir
  static List<Product> getProductsByCategory(String category) {
    if (category.isEmpty || category == 'Tümü') {
      return getProducts();
    }
    return getProducts()
        .where((product) => product.category == category)
        .toList();
  }

  // Örnek ürün verileri
  static List<Map<String, dynamic>> getSampleProducts() {
    return [
      {
        'name': 'Ekşi Mayalı Köy Ekmeği',
        'description':
            'Geleneksel yöntemlerle hazırlanan, ekşi maya kullanılarak 24 saat fermente edilen köy ekmeği.',
        'price': 30.00,
        'category': 'Ekmekler',
        'imageUrl':
            'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        'stock': 20,
        'ingredients': ['Un', 'Su', 'Tuz', 'Ekşi Maya'],
        'isPopular': true,
        'isNew': false,
      },
      {
        'name': 'Çavdarlı Tam Buğday Ekmeği',
        'description':
            'Tam buğday unu ve çavdar unu karışımı ile hazırlanan sağlıklı ve lezzetli ekmek.',
        'price': 35.00,
        'category': 'Ekmekler',
        'imageUrl':
            'https://images.unsplash.com/photo-1598373182133-52452f7691ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        'stock': 15,
        'ingredients': ['Tam Buğday Unu', 'Çavdar Unu', 'Su', 'Tuz', 'Maya'],
        'isPopular': false,
        'isNew': true,
      },
      {
        'name': 'Cevizli Kurabiye',
        'description': 'Tereyağlı hamura ceviz eklenmiş geleneksel kurabiye.',
        'price': 8.00,
        'category': 'Kurabiyeler',
        'imageUrl':
            'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        'stock': 30,
        'ingredients': ['Un', 'Tereyağı', 'Şeker', 'Ceviz'],
        'isPopular': true,
        'isNew': false,
      },
      {
        'name': 'Ev Yapımı Limonata',
        'description':
            'Taze sıkılmış limon suyu, şeker ve nane ile hazırlanan serinletici içecek.',
        'price': 15.00,
        'category': 'İçecekler',
        'imageUrl':
            'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        'stock': 10,
        'ingredients': ['Limon', 'Su', 'Şeker', 'Nane'],
        'isPopular': true,
        'isNew': false,
      },
      {
        'name': 'Filtre Kahve',
        'description':
            'Özenle kavrulmuş özel çekirdeklerden hazırlanan filtre kahve.',
        'price': 20.00,
        'category': 'İçecekler',
        'imageUrl':
            'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        'stock': 25,
        'ingredients': ['Kahve Çekirdeği'],
        'isPopular': false,
        'isNew': true,
      },
      {
        'name': 'Pastırma',
        'description':
            'Özel baharatlarla marine edilmiş ve kurutulmuş dana eti dilimleri.',
        'price': 50.00,
        'category': 'Şarküteri',
        'imageUrl':
            'https://images.pexels.com/photos/7893992/pexels-photo-7893992.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&dpr=1',
        'stock': 5,
        'ingredients': ['Dana Eti', 'Çemen', 'Baharat'],
        'isPopular': true,
        'isNew': false,
      },
      {
        'name': 'Sucuk',
        'description':
            'Geleneksel yöntemlerle hazırlanan, baharatlı fermente sucuk.',
        'price': 45.00,
        'category': 'Şarküteri',
        'imageUrl':
            'https://images.pexels.com/photos/1927377/pexels-photo-1927377.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&dpr=1',
        'stock': 8,
        'ingredients': ['Dana Eti', 'Baharat', 'Tuz', 'Sarımsak'],
        'isPopular': false,
        'isNew': false,
      },
      {
        'name': 'Çikolatalı Pasta',
        'description':
            'Özel belçika çikolatası ile hazırlanmış, kremalı pasta.',
        'price': 60.00,
        'category': 'Pastalar',
        'imageUrl':
            'https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        'stock': 3,
        'ingredients': [
          'Un',
          'Çikolata',
          'Şeker',
          'Tereyağı',
          'Yumurta',
          'Krema'
        ],
        'isPopular': true,
        'isNew': true,
      },
      {
        'name': 'Zeytinli Poğaça',
        'description': 'Yeşil zeytin ile hazırlanmış, yumuşak hamurlu poğaça.',
        'price': 10.00,
        'category': 'Poğaçalar',
        'imageUrl':
            'https://media.istockphoto.com/id/1388892387/tr/foto%C4%9Fraf/ev-yap%C4%B1m%C4%B1-po%C4%9Fa%C3%A7a-peynir-hamur-i%C5%9Fi-beyaz-zemin-geleneksel-t%C3%BCrk-ye%C5%9Fil-zeytin.jpg?s=612x612&w=0&k=20&c=C6QSr-HBW8N1yS9K5jWL00d93K8I6wWr_cTk7IEZiTQ=',
        'stock': 20,
        'ingredients': ['Un', 'Tereyağı', 'Su', 'Tuz', 'Maya', 'Yeşil Zeytin'],
        'isPopular': false,
        'isNew': false,
      },
      {
        'name': 'Fırında Sütlaç',
        'description':
            'Geleneksel tarif ile hazırlanmış, fırında kızartılmış sütlaç.',
        'price': 25.00,
        'category': 'Tatlılar',
        'imageUrl':
            'https://images.pexels.com/photos/6273537/pexels-photo-6273537.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&dpr=1',
        'stock': 12,
        'ingredients': ['Pirinç', 'Süt', 'Şeker', 'Vanilya'],
        'isPopular': true,
        'isNew': false,
      },
    ];
  }
}
