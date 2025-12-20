import '../models/product.dart';

class SampleData {
  static final List<Product> products = [
    Product(
      id: '1',
      name: 'Ekşi Mayalı Ekmek',
      description: 'Geleneksel yöntemlerle hazırlanmış ekşi mayalı ekmek.',
      price: 25.00,
      imageUrl: 'https://example.com/ekmek.jpg',
      category: 'Ekşi Mayalı Ekmekler',
    ),
    Product(
      id: '2',
      name: 'Simit',
      description: 'Susamlı, taze simit.',
      price: 15.00,
      imageUrl: 'https://example.com/simit.jpg',
      category: 'Ekşi Mayalı Ekmekler',
    ),
    Product(
      id: '3',
      name: 'Pogaca',
      description: 'Peynirli, patatesli veya zeytinli pogaca.',
      price: 20.00,
      imageUrl: 'https://example.com/pogaca.jpg',
      category: 'Ekşi Mayalı Ekmekler',
    ),
    Product(
      id: '4',
      name: 'Kurabiye',
      description: 'Ev yapımı kurabiye.',
      price: 30.00,
      imageUrl: 'https://example.com/kurabiye.jpg',
      category: 'Tatlılar',
    ),
    Product(
      id: '5',
      name: 'Pasta',
      description: 'Ev yapımı pasta.',
      price: 50.00,
      imageUrl: 'https://example.com/pasta.jpg',
      category: 'Tatlılar',
    ),
    Product(
      id: '6',
      name: 'Kahve',
      description: 'Taze çekilmiş kahve.',
      price: 35.00,
      imageUrl: 'https://example.com/kahve.jpg',
      category: 'İçecekler',
    ),
    Product(
      id: '7',
      name: 'Çay',
      description: 'Demlik çay.',
      price: 25.00,
      imageUrl: 'https://example.com/cay.jpg',
      category: 'İçecekler',
    ),
  ];
}
