import 'product.dart';

class CartItem {
  final Product product;
  int quantity;

  CartItem({
    required this.product,
    this.quantity = 1,
  });

  // Toplam fiyatı hesaplayan getter
  double get totalPrice {
    if (product.discountPercentage > 0) {
      return product.discountedPrice * quantity;
    }
    return product.price * quantity;
  }

  // JSON'dan CartItem oluşturan factory metodu
  factory CartItem.fromJson(Map<String, dynamic> json, List<Product> products) {
    final productId = json['productId'];
    final product = products.firstWhere((p) => p.id == productId);

    return CartItem(
      product: product,
      quantity: json['quantity'],
    );
  }

  // CartItem'ı JSON'a dönüştüren metod
  Map<String, dynamic> toJson() {
    return {
      'productId': product.id,
      'quantity': quantity,
    };
  }
}

class Cart {
  List<CartItem> items;

  Cart({
    this.items = const [],
  });

  // Sepete ürün ekleme metodu
  void addItem(Product product, {int quantity = 1}) {
    final existingIndex =
        items.indexWhere((item) => item.product.id == product.id);

    if (existingIndex >= 0) {
      // Ürün zaten sepette varsa miktarını artır
      items[existingIndex].quantity += quantity;
    } else {
      // Ürün sepette yoksa yeni ekle
      items.add(CartItem(product: product, quantity: quantity));
    }
  }

  // Sepetten ürün çıkarma metodu
  void removeItem(String productId) {
    items.removeWhere((item) => item.product.id == productId);
  }

  // Ürün miktarını güncelleme metodu
  void updateQuantity(String productId, int quantity) {
    final index = items.indexWhere((item) => item.product.id == productId);

    if (index >= 0) {
      if (quantity <= 0) {
        // Miktar 0 veya negatifse ürünü sepetten çıkar
        removeItem(productId);
      } else {
        // Miktarı güncelle
        items[index].quantity = quantity;
      }
    }
  }

  // Sepeti temizleme metodu
  void clear() {
    items.clear();
  }

  // Toplam ürün sayısını hesaplayan getter
  int get totalItems {
    return items.fold(0, (sum, item) => sum + item.quantity);
  }

  // Toplam fiyatı hesaplayan getter
  double get totalPrice {
    return items.fold(0, (sum, item) => sum + item.totalPrice);
  }

  // Toplam indirim miktarını hesaplayan getter
  double get totalDiscount {
    return items.fold(0, (sum, item) {
      if (item.product.discountPercentage > 0) {
        return sum +
            ((item.product.price - item.product.discountedPrice) *
                item.quantity);
      }
      return sum;
    });
  }
}
