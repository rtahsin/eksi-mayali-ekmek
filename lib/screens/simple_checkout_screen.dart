// ignore_for_file: use_super_parameters, prefer_const_constructors

/*
 * Basit Sipariş Ekranı - Elden Teslim İçin
 * 
 * PURPOSE: Elden teslim için optimize edilmiş basit sipariş formu
 * LAYER: UI
 * 
 * NOT: Kargo/teslimat yok, sadece kapıda ödeme (nakit/kart)
 * 
 * LAST UPDATED: 2026-01-28
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/delivery_day.dart';
import '../models/order_item.dart';
import '../models/saved_address.dart';
import '../providers/cart_provider.dart';
import '../services/auth_service.dart';
import '../services/delivery_schedule_service.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/location_loading_dialog.dart';
import '../widgets/map_location_picker.dart';
import '../widgets/saved_addresses_bottom_sheet.dart';

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

  // Konum paylaşımı için değişkenler
  double? _selectedLatitude;
  double? _selectedLongitude;
  String? _locationUrl;
  bool _isLoadingLocation = false;

  // Teslimat günü için değişkenler
  DeliveryDay? _availableDeliveryDay;
  bool _isLoadingDeliveryDay = true;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
    _loadDeliveryDay();
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

  // Teslimat gününü yükle
  Future<void> _loadDeliveryDay() async {
    setState(() => _isLoadingDeliveryDay = true);

    try {
      final deliveryScheduleService = Provider.of<DeliveryScheduleService>(context, listen: false);
      await deliveryScheduleService.init();

      final deliveryDay = deliveryScheduleService.getAvailableDeliveryDay();

      setState(() {
        _availableDeliveryDay = deliveryDay;
        _isLoadingDeliveryDay = false;
      });

      if (deliveryDay == null) {
        Logger.warning('Teslimat günü bulunamadı');
      } else {
        Logger.info('Teslimat günü yüklendi: ${deliveryDay.date}');
      }
    } catch (e) {
      Logger.error('Teslimat günü yüklenirken hata: $e');
      setState(() => _isLoadingDeliveryDay = false);
    }
  }

  // Konum paylaşımı - GPS ile mevcut konumu al
  Future<void> _getCurrentLocation() async {
    // Loading dialog ile konum al
    final Position? position = await showDialog<Position?>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => LocationLoadingDialog(showRationale: true),
    );

    if (position != null && mounted) {
      // Google Maps linki oluştur
      final String mapsUrl =
          'https://www.google.com/maps/dir/?api=1&destination=${position.latitude},${position.longitude}';

      setState(() {
        _selectedLatitude = position.latitude;
        _selectedLongitude = position.longitude;
        _locationUrl = mapsUrl;
      });

      Logger.info('Konum paylaşıldı: ${position.latitude}, ${position.longitude}');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Konumunuz başarıyla kaydedildi!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  // Konumu haritada aç (önizleme)
  Future<void> _openLocationInMaps() async {
    if (_locationUrl == null) return;

    try {
      final Uri url = Uri.parse(_locationUrl!);
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('Harita açılamadı');
      }
    } catch (e) {
      Logger.error('Harita açılırken hata: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Harita açılamadı'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Haritadan konum seç
  Future<void> _selectLocationFromMap() async {
    try {
      final result = await Navigator.push<Map<String, dynamic>>(
        context,
        MaterialPageRoute(
          builder: (ctx) => MapLocationPicker(
            initialLatitude: _selectedLatitude,
            initialLongitude: _selectedLongitude,
          ),
        ),
      );

      if (result != null && mounted) {
        final latitude = result['latitude'] as double;
        final longitude = result['longitude'] as double;
        final address = result['address'] as String?;

        // Google Maps linki oluştur
        final String mapsUrl =
            'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude';

        setState(() {
          _selectedLatitude = latitude;
          _selectedLongitude = longitude;
          _locationUrl = mapsUrl;
        });

        Logger.info('Haritadan konum seçildi: $latitude, $longitude');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ Konum seçildi: ${address ?? "Koordinatlar kaydedildi"}'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      Logger.error('Harita açma hatası: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Harita açılamadı: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Kayıtlı adreslerden seç
  Future<void> _showSavedAddresses() async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SavedAddressesBottomSheet(
        onAddressSelected: (SavedAddress address) {
          setState(() {
            _selectedLatitude = address.latitude;
            _selectedLongitude = address.longitude;
            _locationUrl =
                'https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}';
          });

          Logger.info('Kayıtlı adres seçildi: ${address.title}');

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ ${address.title} seçildi'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        },
      ),
    );
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

      // Kullanıcı kontrolü
      if (!authService.isAuthenticated || authService.currentUser == null) {
        throw Exception('Giriş yapmanız gerekiyor');
      }

      final user = authService.currentUser!;
      final userId = user.id;
      final customerEmail = user.email;

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

      // Teslimat tarihi (YYYY-MM-DD formatında)
      String? deliveryDateStr;
      if (_availableDeliveryDay != null) {
        deliveryDateStr = '${_availableDeliveryDay!.date.year}-'
            '${_availableDeliveryDay!.date.month.toString().padLeft(2, '0')}-'
            '${_availableDeliveryDay!.date.day.toString().padLeft(2, '0')}';
      }

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
        latitude: _selectedLatitude,
        longitude: _selectedLongitude,
        locationUrl: _locationUrl,
        deliveryDate: deliveryDateStr,
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
        // Error dialog with retry option
        final retry = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.red, size: 28),
                SizedBox(width: 12),
                Text('Sipariş Hatası'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Siparişiniz oluşturulurken bir sorun oluştu.',
                  style: TextStyle(fontSize: 16),
                ),
                SizedBox(height: 12),
                Text(
                  'Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.',
                  style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: Text('İptal'),
              ),
              ElevatedButton.icon(
                onPressed: () => Navigator.of(ctx).pop(true),
                icon: Icon(Icons.refresh),
                label: Text('Tekrar Dene'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
        );

        // Retry if user clicked "Tekrar Dene"
        if (retry == true && mounted) {
          _createOrder();
        }
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
    final authService = Provider.of<AuthService>(context);
    final isDesktop = MediaQuery.of(context).size.width > 600;

    // Kullanıcı giriş yapmamışsa -> Giriş/Kayıt yönlendir
    if (!authService.isAuthenticated) {
      return Scaffold(
        appBar: CustomAppBar(
          title: 'Sipariş Onayı',
          showBackButton: true,
        ),
        body: Center(
          child: Container(
            padding: EdgeInsets.all(32),
            margin: EdgeInsets.all(16),
            constraints: BoxConstraints(maxWidth: 500),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.shopping_cart_checkout, size: 64, color: AppTheme.primaryColor),
                SizedBox(height: 16),
                Text(
                  'Sipariş Tamamlama',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 12),
                Text(
                  'Siparişinizi tamamlamak için giriş yapın veya misafir olarak devam edin.',
                  style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 24),

                // Giriş Yap Butonu
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pushNamed(context, '/login');
                  },
                  icon: Icon(Icons.login),
                  label: Text('Giriş Yap'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    minimumSize: Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                SizedBox(height: 12),

                // Kayıt Ol Butonu
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pushNamed(context, '/register');
                  },
                  icon: Icon(Icons.person_add),
                  label: Text('Kayıt Ol'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    side: BorderSide(color: AppTheme.primaryColor, width: 2),
                  ),
                ),
                SizedBox(height: 16),

                // Bilgilendirme
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, size: 16, color: Colors.blue[700]),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Sipariş vermek için giriş yapmanız veya yeni hesap oluşturmanız gerekmektedir.',
                          style: TextStyle(fontSize: 12, color: Colors.blue[900]),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

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

                        // Teslimat günü kartı
                        _buildDeliveryDayCard(),
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

  Widget _buildDeliveryDayCard() {
    if (_isLoadingDeliveryDay) {
      return Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[300]!),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Teslimat günü yükleniyor...'),
          ],
        ),
      );
    }

    if (_availableDeliveryDay == null) {
      return Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange[200]!),
        ),
        child: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange[700]),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Teslimat Günü Belirlenmedi',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[900],
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Şu anda teslimat günü planlanmamış. Lütfen daha sonra tekrar deneyin.',
                    style: TextStyle(fontSize: 13, color: Colors.orange[800]),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final deliveryDay = _availableDeliveryDay!;
    final dateFormat = DateFormat('dd MMMM yyyy (EEEE)', 'tr_TR');
    final formattedDate = dateFormat.format(deliveryDay.date);
    final deliveryTimeRange = '${deliveryDay.deliveryStartTime} - ${deliveryDay.deliveryEndTime}';

    // Üretim başladı mı kontrolü
    final isProductionStarted = deliveryDay.ordersClosed;
    final canOrder = deliveryDay.isOpen;

    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: canOrder ? Colors.green[50] : Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: canOrder ? Colors.green[200]! : Colors.red[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                canOrder ? Icons.local_shipping_outlined : Icons.production_quantity_limits,
                color: canOrder ? Colors.green[700] : Colors.red[700],
                size: 28,
              ),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      canOrder ? '📦 Teslimat Günü' : '⚠️ Sipariş Kapandı',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: canOrder ? Colors.green[900] : Colors.red[900],
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      formattedDate,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: canOrder ? Colors.green[800] : Colors.red[800],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Container(
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.access_time, size: 16, color: Colors.grey[700]),
                    SizedBox(width: 8),
                    Text(
                      'Teslimat Saati: $deliveryTimeRange',
                      style: TextStyle(fontSize: 13),
                    ),
                  ],
                ),
                if (isProductionStarted) ...[
                  SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.info_outline, size: 16, color: Colors.red[700]),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Üretim başladı. Bu hafta için sipariş kapatıldı.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.red[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if (deliveryDay.orderCount > 0) ...[
                  SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.shopping_bag, size: 16, color: Colors.grey[700]),
                      SizedBox(width: 8),
                      Text(
                        '${deliveryDay.orderCount} sipariş alındı',
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1, end: 0);
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
        SizedBox(height: 24),

        // Konum Paylaşımı (İsteğe Bağlı) - Tüm platformlarda
        Container(
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.green.withValues(alpha: 0.4),
              width: 2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.location_on, color: Colors.green, size: 28),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '📍 Konumumu Paylaş (İsteğe Bağlı)',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.green[800],
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 8),
              Text(
                _selectedLatitude != null
                    ? '✅ Konumunuz kaydedildi! Teslimat adresinizi kolayca bulacağız.'
                    : 'Teslimat için konumunuzu paylaşabilirsiniz.',
                style: TextStyle(
                  color: _selectedLatitude != null ? Colors.green[700] : Colors.grey[700],
                  fontSize: 14,
                ),
              ),
              SizedBox(height: 12),
              // GPS ve Harita butonları
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isLoadingLocation ? null : _getCurrentLocation,
                      icon: _isLoadingLocation
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Icon(Icons.my_location, size: 20),
                      label: Text(
                        _isLoadingLocation ? 'Alınıyor...' : 'GPS',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: 14),
                        elevation: 3,
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _selectLocationFromMap,
                      icon: Icon(Icons.map, size: 20),
                      label: Text(
                        'Harita',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: 14),
                        elevation: 3,
                      ),
                    ),
                  ),
                  if (_selectedLatitude != null) ...[
                    SizedBox(width: 8),
                    IconButton(
                      onPressed: _openLocationInMaps,
                      icon: Icon(Icons.open_in_new, color: Colors.green, size: 24),
                      tooltip: 'Haritada Göster',
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.green.withValues(alpha: 0.2),
                      ),
                    ),
                  ],
                ],
              ),
              
              // Kayıtlı Adresler butonu
              SizedBox(height: 12),
              TextButton.icon(
                onPressed: _showSavedAddresses,
                icon: Icon(Icons.bookmark_outline, size: 20),
                label: Text('Kayıtlı Adreslerimden Seç'),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.primaryColor,
                  padding: EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ],
          ),
        ).animate().fadeIn(delay: 350.ms),
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
