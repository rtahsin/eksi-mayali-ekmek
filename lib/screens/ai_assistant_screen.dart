import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/ai_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/loading_indicator.dart';

class AIAssistantScreen extends StatefulWidget {
  static const routeName = '/ai-assistant';

  const AIAssistantScreen({Key? key}) : super(key: key);

  @override
  State<AIAssistantScreen> createState() => _AIAssistantScreenState();
}

class _AIAssistantScreenState extends State<AIAssistantScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _shoppingSuggestions = [];
  List<Map<String, dynamic>> _autoOrderSuggestions = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadSuggestions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSuggestions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Kullanıcı oturum açmış mı kontrol et
      final authService = Provider.of<AuthService>(context, listen: false);
      if (!authService.isAuthenticated || authService.currentUser == null) {
        setState(() {
          _error = 'Bu özelliği kullanmak için giriş yapmalısınız';
          _isLoading = false;
        });
        return;
      }

      final aiService = Provider.of<AIService>(context, listen: false);
      final user = authService.currentUser!;

      // Önerileri yükle
      final shoppingSuggestions =
          await aiService.generateShoppingSuggestions(user);
      final autoOrderSuggestions =
          await aiService.generateAutoOrderSuggestions(user);

      setState(() {
        _shoppingSuggestions = shoppingSuggestions;
        _autoOrderSuggestions = autoOrderSuggestions;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Öneriler yüklenirken bir hata oluştu: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Akıllı Asistan'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Alışveriş Asistanı'),
            Tab(text: 'Otomatik Sipariş'),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: LoadingIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline,
                          size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(fontSize: 16)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadSuggestions,
                        child: const Text('Tekrar Dene'),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildShoppingAssistantTab(),
                    _buildAutoOrderTab(),
                  ],
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _loadSuggestions,
        child: const Icon(Icons.refresh),
        tooltip: 'Önerileri Yenile',
      ),
    );
  }

  Widget _buildShoppingAssistantTab() {
    if (_shoppingSuggestions.isEmpty) {
      return const Center(
        child: Text('Şu anda sizin için bir alışveriş önerimiz bulunmuyor.'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      itemCount: _shoppingSuggestions.length,
      itemBuilder: (ctx, index) {
        final suggestion = _shoppingSuggestions[index];
        final product = suggestion['product'];
        final reason = suggestion['reason'];
        final confidence = suggestion['confidence'];

        return Card(
          elevation: 3,
          margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      child: Image.network(
                        product.imageUrl,
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, error, _) => Container(
                          width: 80,
                          height: 80,
                          color: Colors.grey[300],
                          child: const Icon(Icons.image_not_supported),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.title,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${product.price.toStringAsFixed(2)} ₺',
                            style: const TextStyle(
                              fontSize: 16,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(reason),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.insights, size: 16),
                        const SizedBox(width: 4),
                        Text('Güven: %$confidence'),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () {
                        // Sepete ekle
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('${product.title} sepete eklendi'),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      },
                      child: const Text('Sepete Ekle'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAutoOrderTab() {
    if (_autoOrderSuggestions.isEmpty) {
      return const Center(
        child: Text(
            'Şu anda sizin için bir otomatik sipariş önerimiz bulunmuyor.'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      itemCount: _autoOrderSuggestions.length,
      itemBuilder: (ctx, index) {
        final suggestion = _autoOrderSuggestions[index];
        final product = suggestion['product'];
        final lastOrderDate = suggestion['lastOrderDate'] as DateTime;
        final daysSinceLastOrder = suggestion['daysSinceLastOrder'] as int;
        final typicalOrderFrequency =
            suggestion['typicalOrderFrequency'] as int;
        final confidence = suggestion['confidence'] as int;

        return Card(
          elevation: 3,
          margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      child: Image.network(
                        product.imageUrl,
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, error, _) => Container(
                          width: 80,
                          height: 80,
                          color: Colors.grey[300],
                          child: const Icon(Icons.image_not_supported),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.title,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${product.price.toStringAsFixed(2)} ₺',
                            style: const TextStyle(
                              fontSize: 16,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Son sipariş: ${_formatDate(lastOrderDate)} ($daysSinceLastOrder gün önce)',
                          ),
                          Text(
                              'Tipik sipariş sıklığı: $typicalOrderFrequency gün'),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.insights, size: 16),
                        const SizedBox(width: 4),
                        Text('Güven: %$confidence'),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () {
                        // Otomatik sipariş ver
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                                '${product.title} için otomatik sipariş verildi'),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      },
                      child: const Text('Sipariş Ver'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}.${date.month}.${date.year}';
  }
}
