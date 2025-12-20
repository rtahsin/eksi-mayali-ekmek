// ignore_for_file: prefer_collection_literals

// OrderItem modeli
class OrderItem {
  final String productId;
  final String name;
  final double price;
  final int quantity;
  final String imageUrl;

  OrderItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.quantity,
    required this.imageUrl,
  });

  // JSON'dan model oluştur
  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] as num).toDouble(),
      quantity: json['quantity'] ?? 1,
      imageUrl: json['imageUrl'] ?? '',
    );
  }

  // Model'den JSON oluştur
  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'name': name,
      'price': price,
      'quantity': quantity,
      'imageUrl': imageUrl,
    };
  }

  OrderItem copyWith({
    String? productId,
    String? name,
    double? price,
    int? quantity,
    String? imageUrl,
  }) {
    return OrderItem(
      productId: productId ?? this.productId,
      name: name ?? this.name,
      price: price ?? this.price,
      quantity: quantity ?? this.quantity,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }

  // Toplam fiyat hesapla
  double get total => price * quantity;
}
