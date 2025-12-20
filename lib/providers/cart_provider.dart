// ignore_for_file: prefer_const_constructors, use_super_parameters, unused_field, unused_element, unused_local_variable

import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_item.dart';
import '../models/product.dart';
import '../utils/constants.dart';
import '../utils/logger.dart';

/// Sepet yönetimi için provider sınıfı
class CartProvider with ChangeNotifier {
  final Map<String, CartItem> _items = {};
  bool _isInitialized = false;
  String? _guestId; // Misafir kullanıcı için benzersiz ID
  String? _currentUserId; // Aktif kullanıcı ID'si (login olduysa)
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Kullanıcı ID'sini ayarla (login olunca çağrılmalı)
  void setUserId(String? userId) {
    if (_currentUserId != userId) {
      _currentUserId = userId;
      if (userId != null) {
        // Login olduysa Firestore'dan sepeti yükle
        _loadCartFromFirestore();
      }
    }
  }

  /// Misafir ID'sini al veya oluştur
  Future<String> _getOrCreateGuestId() async {
    if (_guestId != null) return _guestId!;

    final prefs = await SharedPreferences.getInstance();
    _guestId = prefs.getString('guest_cart_id');

    if (_guestId == null) {
      _guestId = 'guest_${DateTime.now().millisecondsSinceEpoch}';
      await prefs.setString('guest_cart_id', _guestId!);
    }

    return _guestId!;
  }

  /// Sepetteki ürünleri döndürür
  Map<String, CartItem> get items => {..._items};

  /// Sepetteki ürün sayısını döndürür
  int get itemCount => _items.length;

  /// Sepetteki ürünlerin toplam tutarını döndürür
  double get totalAmount {
    return _items.values.fold(0, (sum, item) => sum + item.total);
  }

  /// Sepete ürün ekler
  void addItem(Product product, {int quantity = 1}) {
    if (quantity <= 0) return;

    if (_items.containsKey(product.id)) {
      _items.update(
        product.id,
        (existingItem) => CartItem(
          product: existingItem.product,
          quantity: existingItem.quantity + quantity,
        ),
      );
    } else {
      _items.putIfAbsent(
        product.id,
        () => CartItem(product: product, quantity: quantity),
      );
    }
    notifyListeners();
    _saveCartToPrefs();
    _syncCartToFirestore();
  }

  /// Sepetten ürün çıkarır (1 adet)
  void removeItem(String productId) {
    if (!_items.containsKey(productId)) return;

    if (_items[productId]!.quantity > 1) {
      _items.update(
        productId,
        (existingItem) => CartItem(
          product: existingItem.product,
          quantity: existingItem.quantity - 1,
        ),
      );
    } else {
      _items.remove(productId);
    }
    notifyListeners();
    _saveCartToPrefs();
    _syncCartToFirestore();
  }

  /// Sepetten ürünü tamamen çıkarır
  void removeItemCompletely(String productId) {
    if (!_items.containsKey(productId)) return;

    _items.remove(productId);
    notifyListeners();
    _saveCartToPrefs();
    _syncCartToFirestore();
  }

  /// Ürün miktarını günceller
  void updateQuantity(String productId, int quantity) {
    if (!_items.containsKey(productId)) return;

    if (quantity <= 0) {
      removeItemCompletely(productId);
    } else {
      _items.update(
        productId,
        (existingItem) => CartItem(
          product: existingItem.product,
          quantity: quantity,
        ),
      );
      notifyListeners();
      _saveCartToPrefs();
      _syncCartToFirestore();
    }
  }

  /// Sepeti temizler
  void clear() {
    _items.clear();
    notifyListeners();
    _saveCartToPrefs();
    _syncCartToFirestore();
  }

  /// Ürünün sepette olup olmadığını kontrol eder
  bool isInCart(String productId) {
    return _items.containsKey(productId);
  }

  /// Ürünün sepetteki miktarını döndürür
  int getQuantity(String productId) {
    return _items[productId]?.quantity ?? 0;
  }

  /// Sepeti SharedPreferences'a kaydeder
  Future<void> _saveCartToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cartData = _items.map((key, item) => MapEntry(key, {
            'productId': item.product.id,
            'quantity': item.quantity,
            'productName': item.product.name,
            'productPrice': item.product.price,
            'productImageUrl': item.product.imageUrl,
          }));

      await prefs.setString(PreferenceKeys.cart, jsonEncode(cartData));
      Logger.debug('Sepet kaydedildi: ${_items.length} ürün');
    } catch (e) {
      Logger.error('Sepet kaydedilirken hata oluştu: $e');
    }
  }

  /// Sepeti SharedPreferences'dan yükler
  Future<void> loadCartFromPrefs() async {
    if (_isInitialized) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final cartString = prefs.getString(PreferenceKeys.cart);

      if (cartString != null && cartString.isNotEmpty) {
        final cartData = jsonDecode(cartString) as Map<String, dynamic>;

        cartData.forEach((productId, itemData) {
          final product = Product(
            id: productId,
            name: itemData['productName'] ?? '',
            price: (itemData['productPrice'] ?? 0).toDouble(),
            imageUrl: itemData['productImageUrl'] ?? '',
            description: '',
            category: '',
          );

          _items[productId] = CartItem(
            product: product,
            quantity: itemData['quantity'] ?? 1,
          );
        });

        Logger.info('Sepet yüklendi: ${_items.length} ürün');
      }

      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      Logger.error('Sepet yüklenirken hata oluştu: $e');
      _isInitialized = true;
    }
  }

  /// Sepeti Firestore'a senkronize eder
  Future<void> _syncCartToFirestore() async {
    if (_currentUserId == null) return; // Login olmamışsa senkronlama yapma

    try {
      final cartData = _items.map((key, item) => MapEntry(key, {
            'productId': item.product.id,
            'quantity': item.quantity,
            'productName': item.product.name,
            'productPrice': item.product.price,
            'productImageUrl': item.product.imageUrl,
            'addedAt': DateTime.now().toIso8601String(),
          }));

      await _firestore
          .collection('users')
          .doc(_currentUserId)
          .collection('cart')
          .doc('current')
          .set({
        'items': cartData,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      Logger.debug('Sepet Firestore\'a senkronize edildi: ${_items.length} ürün');
    } catch (e) {
      Logger.error('Firestore senkronizasyon hatası: $e');
    }
  }

  /// Sepeti Firestore'dan yükler
  Future<void> _loadCartFromFirestore() async {
    if (_currentUserId == null) return;

    try {
      final doc = await _firestore
          .collection('users')
          .doc(_currentUserId)
          .collection('cart')
          .doc('current')
          .get();

      if (doc.exists) {
        final data = doc.data() as Map<String, dynamic>;
        final items = data['items'] as Map<String, dynamic>? ?? {};

        _items.clear();
        items.forEach((productId, itemData) {
          final product = Product(
            id: productId,
            name: itemData['productName'] ?? '',
            price: (itemData['productPrice'] ?? 0).toDouble(),
            imageUrl: itemData['productImageUrl'] ?? '',
            description: '',
            category: '',
          );

          _items[productId] = CartItem(
            product: product,
            quantity: itemData['quantity'] ?? 1,
          );
        });

        Logger.info('Sepet Firestore\'dan yüklendi: ${_items.length} ürün');
        notifyListeners();
        _saveCartToPrefs(); // Local'e de kaydet
      }
    } catch (e) {
      Logger.error('Firestore\'dan sepet yükleme hatası: $e');
    }
  }

  // Sepetten tek bir ürünü kaldır
  void removeSingleItem(String productId) {
    if (!_items.containsKey(productId)) {
      return;
    }
    if (_items[productId]!.quantity > 1) {
      _items.update(
        productId,
        (existingCartItem) => CartItem(
          product: existingCartItem.product,
          quantity: existingCartItem.quantity - 1,
        ),
      );
    } else {
      _items.remove(productId);
    }
    notifyListeners();
    _saveCartToPrefs();
    _syncCartToFirestore();
  }

  /// Ürün miktarını bir adet artırır
  void increaseQuantity(String productId) {
    if (!_items.containsKey(productId)) {
      return;
    }

    _items.update(
      productId,
      (existingCartItem) => CartItem(
        product: existingCartItem.product,
        quantity: existingCartItem.quantity + 1,
      ),
    );

    notifyListeners();
    _saveCartToPrefs();
    _syncCartToFirestore();
  }

  /// Ürün miktarını bir adet azaltır
  void decreaseQuantity(String productId) {
    if (!_items.containsKey(productId)) {
      return;
    }

    if (_items[productId]!.quantity > 1) {
      _items.update(
        productId,
        (existingCartItem) => CartItem(
          product: existingCartItem.product,
          quantity: existingCartItem.quantity - 1,
        ),
      );
    } else {
      _items.remove(productId);
    }

    notifyListeners();
    _saveCartToPrefs();
    _syncCartToFirestore();
  }
}
