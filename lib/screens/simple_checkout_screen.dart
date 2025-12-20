// ignore_for_file: use_super_parameters, prefer_const_constructors

/*
 * Basit Sipariş Ekranı - Elden Teslim İçin
 * 
 * PURPOSE: Elden teslim için optimize edilmiş basit sipariş formu
 * LAYER: UI
 * 
 * NOT: Kargo/teslimat yok, sadece kapıda ödeme (nakit/kart)
 * 
 * LAST UPDATED: 2025-12-15
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../models/order_item.dart';
import '../providers/cart_provider.dart';
import '../services/auth_service.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../widgets/custom_app_bar.dart';

class SimpleCheckoutScreen extends StatefulWidget {
  const SimpleCheckoutScreen({Key? key}) : super(key: key);

  @override
  State<SimpleCheckoutScreen> createState() => _SimpleCheckoutScreenState();
}

class _SimpleCheckoutScreenState extends State<SimpleCheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _noteController = TextEditingController();

  String _paymentMethod = 'cash'; // 'cash' veya 'card'
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  // Kullanıcı bilgilerini yükle
  Future<void> _loadUserInfo() async {
    final authService = Provider.of<AuthService>(context, listen: false);

    if (authService.isAuthenticated) {
      final user = authService.currentUser;
      if (user != null) {
        setState(() {
          _nameController.text = user.displayName;
          _phoneController.text = user.phoneNumber ?? '';
        });
      }
    }
  }

  // Sipariş oluştur
  Future<void> _createOrder() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final cartProvider = Provider.of<CartProvider>(context, listen: false);

    if (cartProvider.items.isEmpty) {
      Helpers.showSnackBar('Sepetinizde ürün bulunmamaktadır', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final orderService = Provider.of<OrderService>(context, listen: false);

      // Kullanıcı ID'si (guest veya logged in)
      final userId =
          authService.currentUser?.id ?? 'guest_${DateTime.now().millisecondsSinceEpoch}';
      final customerEmail = authService.currentUser?.email ?? 'guest@ekmeklab.com';

      // Sipariş öğelerini hazırla
      final orderItems = cartProvider.items.values
          .map((item) => OrderItem(
                productId: item.product.id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                imageUrl: item.product.imageUrl,
              ))
          .toList();

      // Ödeme yöntemi metni
      final paymentMethodText = _paymentMethod == 'cash' ? 'Kapıda Nakit' : 'Kapıda Kart';

      // Sipariş notları
      final notes =
          _noteController.text.isNotEmpty ? _noteController.text : 'Elden teslim siparişi';

      // Siparişi oluştur
      final orderId = await orderService.createOrder(
        items: orderItems,
        amount: cartProvider.totalAmount,
        customerName: _nameController.text.trim(),
        customerEmail: customerEmail,
        customerPhone: _phoneController.text.trim(),
        shippingAddress: 'Elden Teslim - ${_nameController.text.trim()}',
        paymentMethod: paymentMethodText,
        userId: userId,
        notes: notes,
      );

      Logger.info('Sipariş oluşturuldu: $orderId');

      // Sepeti temizle
      cartProvider.clear();

      // Başarı mesajı
      if (mounted) {
        Helpers.showSuccessSnackBar('✅ Siparişiniz alındı!');

        // Sipariş geçmişine yönlendir
        Navigator.of(context).pushReplacementNamed(
          '/orders',
          arguments: orderId,
        );
      }
    } catch (error) {
      Logger.error('Sipariş oluşturulurken hata: $error');

      if (mounted) {
        Helpers.showSnackBar(
          'Sipariş oluşturulurken bir hata oluştu',
          isError: true,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);
    final isDesktop = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Sipariş Onayı',
        showBackButton: true,
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: AppTheme.primaryColor),
                  SizedBox(height: 16),
                  Text('Siparişiniz oluşturuluyor...'),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: EdgeInsets.all(isDesktop ? 32 : 16),
              child: Center(
                child: Container(
                  constraints: BoxConstraints(maxWidth: 600),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Başlık
                        _buildHeader(),
                        SizedBox(height: 24),

                        // Bilgi kartı
                        _buildInfoCard(),
                        SizedBox(height: 24),

                        // Form alanları
                        _buildFormFields(),
                        SizedBox(height: 24),

                        // Ödeme yöntemi
                        _buildPaymentMethod(),
                        SizedBox(height: 24),

                        // Sipariş özeti
                        _buildOrderSummary(cartProvider),
                        SizedBox(height: 32),

                        // Sipariş butonu
                        _buildOrderButton(cartProvider),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Icon(
          Icons.shopping_bag_outlined,
          size: 64,
          color: AppTheme.primaryColor,
        ).animate().scale(duration: 300.ms),
        SizedBox(height: 16),
        Text(
          'Sipariş Bilgileri',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ).animate().fadeIn(delay: 100.ms),
      ],
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: Colors.blue[700]),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Siparişiniz hazırlandığında sizi arayacağız. Elden teslim alabilirsiniz.',
              style: TextStyle(
                color: Colors.blue[900],
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    ).animate().slideY(begin: 0.2, end: 0, duration: 300.ms);
  }

  Widget _buildFormFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // İsim Soyisim
        TextFormField(
          controller: _nameController,
          decoration: InputDecoration(
            labelText: 'İsim Soyisim *',
            prefixIcon: Icon(Icons.person_outline, color: AppTheme.primaryColor),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
            ),
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'İsim soyisim gereklidir';
            }
            return null;
          },
        ).animate().fadeIn(delay: 200.ms),
        SizedBox(height: 16),

        // Telefon
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: 'Telefon *',
            prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.primaryColor),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
            ),
            hintText: '05XX XXX XX XX',
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Telefon numarası gereklidir';
            }
            if (value.trim().length < 10) {
              return 'Geçerli bir telefon numarası giriniz';
            }
            return null;
          },
        ).animate().fadeIn(delay: 300.ms),
        SizedBox(height: 16),

        // Not (opsiyonel)
        TextFormField(
          controller: _noteController,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Sipariş Notu (Opsiyonel)',
            prefixIcon: Padding(
              padding: EdgeInsets.only(bottom: 48),
              child: Icon(Icons.note_outlined, color: AppTheme.primaryColor),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
            ),
            hintText: 'Özel talepleriniz varsa buraya yazabilirsiniz',
          ),
        ).animate().fadeIn(delay: 400.ms),
      ],
    );
  }

  Widget _buildPaymentMethod() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Ödeme Yöntemi',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ),
        SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildPaymentOption(
                'cash',
                'Nakit',
                Icons.money,
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _buildPaymentOption(
                'card',
                'Kart',
                Icons.credit_card,
              ),
            ),
          ],
        ),
      ],
    ).animate().fadeIn(delay: 500.ms);
  }

  Widget _buildPaymentOption(String value, String label, IconData icon) {
    final isSelected = _paymentMethod == value;

    return InkWell(
      onTap: () => setState(() => _paymentMethod = value),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.1) : Colors.white,
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 32,
              color: isSelected ? AppTheme.primaryColor : Colors.grey[600],
            ),
            SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? AppTheme.primaryColor : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderSummary(CartProvider cartProvider) {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sipariş Özeti',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
          SizedBox(height: 16),

          // Ürün sayısı
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Ürün Sayısı:', style: TextStyle(fontSize: 15)),
              Text(
                '${cartProvider.itemCount} adet',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          SizedBox(height: 8),

          Divider(),
          SizedBox(height: 8),

          // Toplam
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Toplam:',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '${cartProvider.totalAmount.toStringAsFixed(2)} ₺',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),

          SizedBox(height: 12),

          // Bilgi notu
          Container(
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green[700], size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Ödeme teslim alırken yapılacak',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.green[900],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().slideY(begin: 0.2, end: 0, duration: 300.ms, delay: 600.ms);
  }

  Widget _buildOrderButton(CartProvider cartProvider) {
    return ElevatedButton(
      onPressed: cartProvider.items.isEmpty ? null : _createOrder,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        padding: EdgeInsets.symmetric(vertical: 18),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 2,
      ),
      child: Text(
        'SİPARİŞİ ONAYLA',
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
        ),
      ),
    ).animate().scale(duration: 300.ms, delay: 700.ms);
  }
}
