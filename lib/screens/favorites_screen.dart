// ignore_for_file: unused_import, use_key_in_widget_constructors

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../services/auth_service.dart';
import '../services/product_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import 'login_screen.dart';
import 'product_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  static const routeName = '/favorites';

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  bool _isLoading = false;
  List<Product> _favoriteProducts = [];

  @override
  void initState() {
    super.initState();
    // Sayfa açıldığında favorileri yükle
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    final authService = Provider.of<AuthService>(context, listen: false);

    if (!authService.isAuthenticated) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final user = authService.currentUser;
      if (user == null) {
        setState(() {
          _isLoading = false;
        });
        return;
      }

      final favoriteIds = user.favoriteProductIds;
      Logger.error('Favori ürün ID\'leri: $favoriteIds'); // Debug için

      if (favoriteIds.isEmpty) {
        setState(() {
          _isLoading = false;
          _favoriteProducts = [];
        });
        return;
      }

      final productService = Provider.of<ProductService>(context, listen: false);
      final products = await productService.getProductsByIds(favoriteIds);

      Logger.error('Yüklenen favori ürün sayısı: ${products.length}'); // Debug için

      if (mounted) {
        setState(() {
          _favoriteProducts = products;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Favoriler yüklenirken hata: $e'); // Debug için

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Favoriler yüklenirken hata: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Favorilerim'),
      ),
      body: Consumer<AuthService>(
        builder: (ctx, authService, _) {
          // Kullanıcı giriş yapmamışsa giriş ekranını göster
          if (!authService.isAuthenticated) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Favorilerinizi görmek için\ngiriş yapmalısınız',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18),
                  ),
                  const SizedBox(height: AppTheme.spaceLg),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pushReplacementNamed(LoginScreen.routeName);
                    },
                    child: const Text('Giriş Yap'),
                  ),
                ],
              ),
            );
          }

          if (_isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final user = authService.currentUser;
          if (user == null) {
            return const Center(
              child: Text('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.'),
            );
          }

          // Favori ürünleri kontrol et
          if (_favoriteProducts.isEmpty) {
            return _buildEmptyFavorites(context);
          }

          return _buildFavoritesList(context, _favoriteProducts);
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _loadFavorites,
        child: const Icon(Icons.refresh),
        tooltip: 'Favorileri Yenile',
      ),
    );
  }

  Widget _buildEmptyFavorites(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.favorite_border,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: AppTheme.spaceMd),
          Text(
            'Henüz favori ürününüz yok',
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppTheme.spaceSm),
          Text(
            'Beğendiğiniz ürünleri favorilere ekleyerek\ndaha sonra kolayca bulabilirsiniz',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.grey[600],
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppTheme.spaceXl),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pushReplacementNamed('/');
            },
            child: const Text('Ürünleri Keşfet'),
          ),
        ],
      ),
    );
  }

  Widget _buildFavoritesList(BuildContext context, List<Product> favoriteProducts) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppTheme.spaceMd),
      itemCount: favoriteProducts.length,
      itemBuilder: (ctx, index) {
        final product = favoriteProducts[index];

        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: AppTheme.spaceMd),
          child: InkWell(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (ctx) => ProductDetailScreen(product: product),
                ),
              );
            },
            child: Padding(
              padding: const EdgeInsets.all(AppTheme.spaceMd),
              child: Row(
                children: [
                  // Ürün resmi
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    child: Image.network(
                      product.imageUrl,
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          width: 100,
                          height: 100,
                          color: Colors.grey[300],
                          child: const Icon(Icons.error),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: AppTheme.spaceMd),
                  // Ürün bilgileri
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: AppTheme.spaceXs),
                        Text(
                          product.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: AppTheme.spaceSm),
                        Text(
                          '${product.price.toStringAsFixed(2)} ₺',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Favorilerden çıkarma butonu
                  IconButton(
                    icon: const Icon(
                      Icons.favorite,
                      color: Colors.red,
                    ),
                    onPressed: () async {
                      final authService = Provider.of<AuthService>(context, listen: false);

                      try {
                        await authService.toggleFavorite(product.id);

                        if (!mounted) return;

                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('${product.name} favorilerden çıkarıldı'),
                            backgroundColor: Colors.green,
                          ),
                        );

                        // Sayfayı yenile
                        setState(() {});
                      } catch (e) {
                        if (!mounted) return;

                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Favorilerden çıkarılırken bir hata oluştu'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
