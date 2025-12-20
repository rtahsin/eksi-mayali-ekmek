// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/address.dart' as address_models;
import '../models/order.dart';
import '../models/product.dart';
import '../models/user.dart' as user_models;
import '../utils/logger.dart';

class ApiService {
  // API temel URL'si
  static const String baseUrl = 'https://api.eksimayaliekmek.com/api';

  // API endpoint'leri
  static const String _productsEndpoint = '/products';
  static const String _usersEndpoint = '/users';
  static const String _authEndpoint = '/auth';
  static const String _ordersEndpoint = '/orders';
  static const String _adminEndpoint = '/admin';

  // API anahtarı
  static const String _apiKey = 'your_api_key_here';

  // HTTP istek başlıkları
  Map<String, String> _headers({String? token}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': _apiKey,
    };

    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  // Hata işleme
  Exception _handleError(http.Response response) {
    if (kDebugMode) {
      Logger.error('API Hatası: ${response.statusCode} - ${response.body}');
    }

    switch (response.statusCode) {
      case 400:
        return Exception('Geçersiz istek: ${response.body}');
      case 401:
        return Exception('Yetkilendirme hatası');
      case 403:
        return Exception('Erişim reddedildi');
      case 404:
        return Exception('Kaynak bulunamadı');
      case 500:
        return Exception('Sunucu hatası');
      default:
        return Exception('Bir hata oluştu: ${response.statusCode}');
    }
  }

  // Tüm ürünleri getir
  Future<List<Product>> getProducts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_productsEndpoint'),
        headers: _headers(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Product.fromJson(json)).toList();
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Ürünler alınırken bir hata oluştu: $e');
    }
  }

  // Kategori bazında ürünleri getir
  Future<List<Product>> getProductsByCategory(String category) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_productsEndpoint?category=$category'),
        headers: _headers(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Product.fromJson(json)).toList();
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Kategori ürünleri alınırken bir hata oluştu: $e');
    }
  }

  // Ürün detaylarını getir
  Future<Product> getProductDetails(String productId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_productsEndpoint/$productId'),
        headers: _headers(),
      );

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        return Product.fromJson(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Ürün detayları alınırken bir hata oluştu: $e');
    }
  }

  // Kullanıcı girişi
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$_authEndpoint/login'),
        headers: _headers(),
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Giriş yapılırken bir hata oluştu: $e');
    }
  }

  // Kullanıcı kaydı
  Future<Map<String, dynamic>> register(String email, String password, String fullName) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$_authEndpoint/register'),
        headers: _headers(),
        body: json.encode({
          'email': email,
          'password': password,
          'fullName': fullName,
        }),
      );

      if (response.statusCode == 201) {
        return json.decode(response.body);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Kayıt olunurken bir hata oluştu: $e');
    }
  }

  // Kullanıcı bilgilerini getir
  Future<user_models.User> getUserProfile(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_usersEndpoint/profile'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        return user_models.User.fromJson(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Kullanıcı profili alınırken bir hata oluştu: $e');
    }
  }

  // Kullanıcı bilgilerini güncelle
  Future<user_models.User> updateUserProfile(String token, Map<String, dynamic> userData) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$_usersEndpoint/profile'),
        headers: _headers(token: token),
        body: json.encode(userData),
      );

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        return user_models.User.fromJson(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Kullanıcı profili güncellenirken bir hata oluştu: $e');
    }
  }

  // Kullanıcıya adres ekle
  Future<user_models.User> addAddress(String token, address_models.Address address) async {
    try {
      // Address modelini API'ye uygun formata dönüştür
      final addressData = {
        'id': address.id,
        'title': address.fullName,
        'fullAddress': address.addressLine1 +
            (address.addressLine2 != null ? ", ${address.addressLine2}" : ""),
        'city': address.city,
        'district': address.district,
        'postalCode': address.postalCode,
        'isDefault': address.isDefault,
      };

      final response = await http.post(
        Uri.parse('$baseUrl$_usersEndpoint/addresses'),
        headers: _headers(token: token),
        body: json.encode(addressData),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final dynamic data = json.decode(response.body);
        return user_models.User.fromJson(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Adres eklenirken bir hata oluştu: $e');
    }
  }

  // Kullanıcı adresini güncelle
  Future<user_models.User> updateAddress(String token, address_models.Address address) async {
    try {
      // Address modelini API'ye uygun formata dönüştür
      final addressData = {
        'id': address.id,
        'title': address.fullName,
        'fullAddress': address.addressLine1 +
            (address.addressLine2 != null ? ", ${address.addressLine2}" : ""),
        'city': address.city,
        'district': address.district,
        'postalCode': address.postalCode,
        'isDefault': address.isDefault,
      };

      final response = await http.put(
        Uri.parse('$baseUrl$_usersEndpoint/addresses/${address.id}'),
        headers: _headers(token: token),
        body: json.encode(addressData),
      );

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        return user_models.User.fromJson(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Adres güncellenirken bir hata oluştu: $e');
    }
  }

  // Kullanıcı adresini sil
  Future<user_models.User> deleteAddress(String token, String addressId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl$_usersEndpoint/addresses/$addressId'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        return user_models.User.fromJson(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Adres silinirken bir hata oluştu: $e');
    }
  }

  // Favorilere ürün ekle
  Future<void> addToFavorites(String token, String productId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$_usersEndpoint/favorites'),
        headers: _headers(token: token),
        body: json.encode({
          'productId': productId,
        }),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Favorilere eklenirken bir hata oluştu: $e');
    }
  }

  // Favorilerden ürün çıkar
  Future<void> removeFromFavorites(String token, String productId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl$_usersEndpoint/favorites/$productId'),
        headers: _headers(token: token),
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Favorilerden çıkarılırken bir hata oluştu: $e');
    }
  }

  // Favori ürünleri getir
  Future<List<Product>> getFavoriteProducts(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_usersEndpoint/favorites'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Product.fromJson(json)).toList();
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Favori ürünler alınırken bir hata oluştu: $e');
    }
  }

  // Sipariş oluştur
  Future<Order> createOrder(String token, Map<String, dynamic> orderData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$_ordersEndpoint'),
        headers: _headers(token: token),
        body: json.encode(orderData),
      );

      if (response.statusCode == 201) {
        final dynamic data = json.decode(response.body);
        return Order.fromJson(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Sipariş oluşturulurken bir hata oluştu: $e');
    }
  }

  // Siparişleri getir
  Future<List<dynamic>> getOrders(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_ordersEndpoint'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Siparişler alınırken bir hata oluştu: $e');
    }
  }

  // Sipariş detaylarını getir
  Future<Map<String, dynamic>> getOrderDetails(String token, String orderId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_ordersEndpoint/$orderId'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Sipariş detayları alınırken bir hata oluştu: $e');
    }
  }

  // Sipariş iptal et
  Future<void> cancelOrder(String token, String orderId) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$_ordersEndpoint/$orderId/cancel'),
        headers: _headers(token: token),
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Sipariş iptal edilirken bir hata oluştu: $e');
    }
  }

  // Admin: Tüm siparişleri getir
  Future<List<dynamic>> getAllOrders(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_adminEndpoint/orders'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Tüm siparişler alınırken bir hata oluştu: $e');
    }
  }

  // Admin: Sipariş durumunu güncelle
  Future<void> updateOrderStatus(String token, String orderId, String status) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$_adminEndpoint/orders/$orderId/status'),
        headers: _headers(token: token),
        body: json.encode({
          'status': status,
        }),
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Sipariş durumu güncellenirken bir hata oluştu: $e');
    }
  }

  // Admin: Tüm kullanıcıları getir
  Future<List<dynamic>> getAllUsers(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_adminEndpoint/users'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Tüm kullanıcılar alınırken bir hata oluştu: $e');
    }
  }

  // Admin: Kullanıcı bilgilerini güncelle
  Future<void> updateUser(String token, String userId, Map<String, dynamic> userData) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$_adminEndpoint/users/$userId'),
        headers: _headers(token: token),
        body: json.encode(userData),
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Kullanıcı bilgileri güncellenirken bir hata oluştu: $e');
    }
  }

  // Admin: Yeni ürün ekle
  Future<void> addProduct(String token, Map<String, dynamic> productData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$_adminEndpoint/products'),
        headers: _headers(token: token),
        body: json.encode(productData),
      );

      if (response.statusCode != 201) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Ürün eklenirken bir hata oluştu: $e');
    }
  }

  // Admin: Ürün güncelle
  Future<void> updateProduct(
      String token, String productId, Map<String, dynamic> productData) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$_adminEndpoint/products/$productId'),
        headers: _headers(token: token),
        body: json.encode(productData),
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Ürün güncellenirken bir hata oluştu: $e');
    }
  }

  // Admin: Ürün sil
  Future<void> deleteProduct(String token, String productId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl$_adminEndpoint/products/$productId'),
        headers: _headers(token: token),
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('Ürün silinirken bir hata oluştu: $e');
    }
  }

  // Admin: İstatistikleri getir
  Future<Map<String, dynamic>> getStatistics(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_adminEndpoint/statistics'),
        headers: _headers(token: token),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      throw Exception('İstatistikler alınırken bir hata oluştu: $e');
    }
  }
}
