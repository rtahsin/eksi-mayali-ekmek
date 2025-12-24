// ignore_for_file: unused_import, use_super_parameters, unused_local_variable, prefer_const_constructors, prefer_const_literals_to_create_immutables, deprecated_member_use, unnecessary_to_list_in_spreads, unused_field, unused_element

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../data/beylikduzu_neighborhoods.dart';
import '../data/turkey_cities.dart';
import '../models/address.dart';
import '../models/cart_item.dart';
import '../models/delivery_zone.dart';
import '../models/order.dart';
import '../models/order_item.dart';
import '../models/payment_method.dart';
import '../models/payment_transaction.dart';
import '../providers/cart_provider.dart';
import '../services/analytics_service.dart';
import '../services/auth_service.dart';
import '../services/delivery_service.dart';
import '../services/order_service.dart';
import '../services/payment_service.dart';
import '../theme/app_theme.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../widgets/address_selection_widget.dart';
import '../widgets/custom_app_bar.dart';
import 'order_history_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _noteController = TextEditingController();
  final _addressLine1Controller = TextEditingController();
  final _addressLine2Controller = TextEditingController();
  final _districtController = TextEditingController(text: 'Beylikdüzü');
  final _cityController = TextEditingController(text: 'İstanbul');
  final _postalCodeController = TextEditingController();
  final _neighborhoodController = TextEditingController();

  // Adres bilgileri
  String _fullName = '';
  String _phoneNumber = '';
  String _addressLine1 = '';
  String _addressLine2 = '';
  String _city = 'İstanbul';
  String _district = 'Beylikdüzü';
  String _postalCode = '';
  String _neighborhood = '';

  // İl-İlçe-Mahalle seçimleri için
  List<String> _availableCities = ['İstanbul'];
  List<String> _availableDistricts = ['Beylikdüzü'];
  List<String> _availableNeighborhoods = [];

  // Ödeme yöntemi
  String _paymentMethod = 'cash_on_delivery';
  PaymentMethod? _cashOnDeliveryMethod;

  // Teslimat seçenekleri
  String _selectedDeliveryOption = 'standardDelivery';
  String _selectedDeliveryDate = '';
  String _selectedDeliveryTime = '';
  String _selectedDeliveryZone = 'zone1';
  double _deliveryFee = 15.0;
  bool _isLoadingDeliveryOptions = false;
  Map<String, dynamic> _deliveryOptions = {};
  Map<String, dynamic> _deliveryZones = {};

  // Kayıtlı adresler
  List<Address> _savedAddresses = [];
  Address? _selectedAddress;

  bool _isLoading = false;
  bool _saveAddress = false;

  // Teslimat bölgesi seçimi
  String _selectedZoneId = '';
  Map<String, dynamic>? _selectedZone;
  double _minOrderAmount = 0.0;
  double _maxDistance = 0.0;
  double _cartTotal = 0.0;
  double _distance = 0.0;
  bool _isValidDeliveryLocation = true;

  // Ödeme yöntemi seçenekleri
  List<PaymentMethod> _paymentMethods = [];
  PaymentMethod? _selectedPaymentMethod;
  bool _isLoadingPaymentMethods = false;

  // E-posta doğrulama durumu
  bool _isEmailVerified = false;
  bool _isCheckingEmailVerification = true;

  @override
  void initState() {
    super.initState();
    _checkEmailVerification();
    _loadUserAddresses();
    _loadDeliveryOptions();
    _loadCartTotal();
    _loadDeliveryZones();

    // Beylikdüzü mahallelerini yükle
    _loadBeylikduzuNeighborhoods();

    // Kapıda ödeme seçeneği oluştur
    _createCashOnDeliveryMethod();

    // Diğer ödeme yöntemlerini yükle
    _loadPaymentMethods();

    // Form kontrollerini oluştur
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initFormControllers();
    });
  }

  // E-posta doğrulama durumunu kontrol et
  Future<void> _checkEmailVerification() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final user = authService.currentUser;

      if (user == null) {
        setState(() {
          _isEmailVerified = false;
          _isCheckingEmailVerification = false;
        });
        return;
      }

      // Firestore'dan kullanıcı bilgilerini al
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.id).get();

      bool isVerified = false;

      if (userDoc.exists) {
        final isGoogleUser = userDoc.data()?['provider'] == 'google';
        final firestoreEmailVerified = userDoc.data()?['emailVerified'] == true;
        final firebaseEmailVerified = await authService.checkEmailVerified();

        // Google kullanıcısı otomatik doğrulanmış sayılır
        // Ya da Firestore'da veya Firebase Auth'da emailVerified true ise
        isVerified = isGoogleUser || firestoreEmailVerified || firebaseEmailVerified;
      } else {
        // Firestore'da kullanıcı yoksa Firebase Auth'u kontrol et
        isVerified = await authService.checkEmailVerified();
      }

      if (mounted) {
        setState(() {
          _isEmailVerified = isVerified;
          _isCheckingEmailVerification = false;
        });
      }
    } catch (e) {
      Logger.error('E-posta doğrulama kontrolü hatası: $e');
      if (mounted) {
        setState(() {
          _isEmailVerified = false;
          _isCheckingEmailVerification = false;
        });
      }
    }
  }

  // Beylikdüzü mahallelerini yükle
  void _loadBeylikduzuNeighborhoods() {
    setState(() {
      _availableNeighborhoods = getBeylikduzuNeighborhoods();
    });
  }

  // İl ve ilçe verilerini yükle (Bu fonksiyonu kullanmayacağız çünkü İstanbul/Beylikdüzü sabit)
  void _loadCitiesAndDistricts() {
    // İl İstanbul, ilçe Beylikdüzü olarak sabit
    _availableCities = ['İstanbul'];
    _availableDistricts = ['Beylikdüzü'];
    _city = 'İstanbul';
    _district = 'Beylikdüzü';
  }

  // Teslimat bölgesi kontrolü - Beylikdüzü'ne sabit olarak teslimat yapıyoruz
  void _checkDeliveryLocation(String district) {
    // Beylikdüzü'ne teslimat yapabiliyoruz
    setState(() {
      _isValidDeliveryLocation = district == 'Beylikdüzü';
    });
  }

  // Kapıda ödeme seçeneği oluştur
  void _createCashOnDeliveryMethod() {
    final authService = Provider.of<AuthService>(context, listen: false);
    final userId = authService.isAuthenticated && authService.currentUser != null
        ? authService.currentUser!.id
        : 'guest_${DateTime.now().millisecondsSinceEpoch}';

    _cashOnDeliveryMethod = PaymentMethod(
      id: 'cash_on_delivery_default',
      userId: userId,
      type: 'cash_on_delivery',
      title: 'Kapıda Ödeme',
      details: {'paymentType': 'cash'},
      isDefault: true,
    );

    // Varsayılan olarak kapıda ödeme seçili olsun
    _selectedPaymentMethod = _cashOnDeliveryMethod;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _noteController.dispose();
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _districtController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _neighborhoodController.dispose();
    super.dispose();
  }

  // Form kontrollerini başlat ve doldur
  void _initFormControllers() {
    final authService = Provider.of<AuthService>(context, listen: false);
    if (authService.isAuthenticated && authService.currentUser != null) {
      final user = authService.currentUser!;

      // Ad Soyad ve email için kullanıcı bilgilerini kullan
      _nameController.text = user.fullName;
      _emailController.text = user.email;
      _phoneController.text = user.phoneNumber;

      // Eğer seçili adres varsa adres formunu doldur
      if (_selectedAddress != null && _selectedAddress!.id.isNotEmpty) {
        _addressController.text = _selectedAddress!.formattedAddress;
        _addressLine1Controller.text = _selectedAddress!.addressLine1;
        _addressLine2Controller.text = _selectedAddress!.addressLine2 ?? '';
        _cityController.text = 'İstanbul'; // Her zaman İstanbul
        _districtController.text = 'Beylikdüzü'; // Her zaman Beylikdüzü
        _postalCodeController.text = _selectedAddress!.postalCode;

        // Mahalle değerini adres içinden çıkarmaya çalışalım
        String addressText = _selectedAddress!.addressLine1.toLowerCase();
        String foundNeighborhood = '';

        for (String neighborhood in _availableNeighborhoods) {
          if (addressText.contains(neighborhood.toLowerCase())) {
            foundNeighborhood = neighborhood;
            break;
          }
        }

        if (foundNeighborhood.isNotEmpty) {
          _neighborhood = foundNeighborhood;
          _neighborhoodController.text = foundNeighborhood;
        }

        // İl ve ilçe değerlerini güncelle
        _city = 'İstanbul';
        _district = 'Beylikdüzü';
      } else {
        // Varsayılan olarak İstanbul/Beylikdüzü seçili olsun
        _cityController.text = 'İstanbul';
        _districtController.text = 'Beylikdüzü';
        _city = 'İstanbul';
        _district = 'Beylikdüzü';
      }
    }
  }

  // Teslimat seçeneklerini yükle
  Future<void> _loadDeliveryOptions() async {
    setState(() {
      _isLoadingDeliveryOptions = true;
    });

    try {
      final deliveryService = Provider.of<DeliveryService>(context, listen: false);
      final options = await deliveryService.loadDeliveryOptions();

      if (mounted) {
        setState(() {
          _deliveryOptions = options;
          _deliveryZones = deliveryService.deliveryZones;

          // Varsayılan teslimat seçeneğini ayarla
          if (_deliveryOptions.containsKey('standardDelivery')) {
            _selectedDeliveryOption = 'standardDelivery';
            final availableDates =
                _deliveryOptions['standardDelivery']['availableDates'] as Map<String, dynamic>;
            if (availableDates.isNotEmpty) {
              _selectedDeliveryDate = availableDates.keys.first;
              final availableTimes = availableDates[_selectedDeliveryDate] as List;
              if (availableTimes.isNotEmpty) {
                _selectedDeliveryTime = availableTimes.first.toString();
              }
            }
            _deliveryFee = 50.0; // Teslimat ücreti 50 TL olarak güncellendi
          }

          // Varsayılan teslimat bölgesini ayarla
          if (_deliveryZones.containsKey('zone1')) {
            _selectedDeliveryZone = 'zone1';
          }

          _isLoadingDeliveryOptions = false;
        });
      }
    } catch (e) {
      if (mounted) {
        Helpers.showSnackBar('Teslimat seçenekleri yüklenirken bir hata oluştu', isError: true);
        setState(() {
          _isLoadingDeliveryOptions = false;
        });
      }
    }
  }

  // Teslimat seçeneği değiştiğinde
  void _onDeliveryOptionChanged(String? value) {
    if (value == null || !_deliveryOptions.containsKey(value)) return;

    setState(() {
      _selectedDeliveryOption = value;
      _deliveryFee = _deliveryOptions[value]['price'];

      // Tarih ve saat seçimini sıfırla
      final availableDates = _deliveryOptions[value]['availableDates'] as Map<String, dynamic>;
      if (availableDates.isNotEmpty) {
        _selectedDeliveryDate = availableDates.keys.first;
        final availableTimes = availableDates[_selectedDeliveryDate] as List;
        if (availableTimes.isNotEmpty) {
          _selectedDeliveryTime = availableTimes.first.toString();
        } else {
          _selectedDeliveryTime = '';
        }
      } else {
        _selectedDeliveryDate = '';
        _selectedDeliveryTime = '';
      }
    });
  }

  // Teslimat tarihi değiştiğinde
  void _onDeliveryDateChanged(String? value) {
    if (value == null || value.isEmpty) return;

    setState(() {
      _selectedDeliveryDate = value;

      // Saat seçimini sıfırla
      final availableTimes =
          _deliveryOptions[_selectedDeliveryOption]['availableDates'][value] as List;
      if (availableTimes.isNotEmpty) {
        _selectedDeliveryTime = availableTimes.first.toString();
      } else {
        _selectedDeliveryTime = '';
      }
    });
  }

  // Teslimat bölgesi değiştiğinde
  void _onDeliveryZoneChanged(String? value) {
    if (value == null || !_deliveryZones.containsKey(value)) return;

    setState(() {
      _selectedDeliveryZone = value;
      // Bölgeye göre ek ücret ekle
      final additionalFee = _deliveryZones[value]['additionalFee'] as double;
      _deliveryFee = _deliveryOptions[_selectedDeliveryOption]['price'] + additionalFee;
    });
  }

  // Adresleri ve kullanıcı bilgilerini yükle
  Future<void> _loadUserAddresses() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    if (authService.isAuthenticated) {
      setState(() {
        _isLoading = true;
      });

      try {
        // Kullanıcının kayıtlı adreslerini al
        final user = authService.currentUser;
        if (user != null) {
          if (mounted) {
            setState(() {
              // Adres türü dönüşümü yapılıyor
              _savedAddresses = user.addresses
                  .map((userAddress) => Address(
                        id: userAddress.id,
                        fullName: userAddress.title,
                        // Kullanıcının telefon numarasını kullan, yoksa boş bırak
                        phoneNumber: user.phoneNumber.isNotEmpty ? user.phoneNumber : '',
                        addressLine1: userAddress.fullAddress,
                        city: userAddress.city,
                        district: userAddress.district,
                        postalCode: userAddress.postalCode,
                        isDefault: userAddress.isDefault,
                      ))
                  .toList();

              // Varsayılan adresi seç
              _selectedAddress = _savedAddresses.firstWhere(
                (address) => address.isDefault,
                orElse: () => _savedAddresses.isNotEmpty
                    ? _savedAddresses.first
                    : Address(
                        id: '',
                        fullName: '',
                        phoneNumber: '',
                        addressLine1: '',
                        addressLine2: '',
                        city: '',
                        district: '',
                        postalCode: '',
                        isDefault: false,
                      ),
              );

              // Kullanıcı telefon numarasını controller'a ekle
              if (user.phoneNumber.isNotEmpty) {
                _phoneController.text = user.phoneNumber;
              }

              if (_selectedAddress != null && _selectedAddress!.id.isNotEmpty) {
                _fullName = _selectedAddress!.fullName;
                _phoneNumber = _selectedAddress!.phoneNumber.isNotEmpty
                    ? _selectedAddress!.phoneNumber
                    : user.phoneNumber;
                _addressLine1 = _selectedAddress!.addressLine1;
                _addressLine2 = _selectedAddress!.addressLine2 ?? '';
                _city = _selectedAddress!.city;
                _district = _selectedAddress!.district;
                _postalCode = _selectedAddress!.postalCode;

                // Telefon controller'ı güncelle
                _phoneController.text = _phoneNumber;
              } else if (user.fullName.isNotEmpty) {
                // Kullanıcı bilgilerinden doldur
                _fullName = user.fullName;
                _phoneNumber = user.phoneNumber;
                _phoneController.text = user.phoneNumber;
              }
            });
          }
        }
      } catch (error) {
        if (mounted) {
          Helpers.showSnackBar('Adresler yüklenirken bir hata oluştu', isError: true);
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  // Ödeme yöntemlerini yükle
  Future<void> _loadPaymentMethods() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    if (authService.isAuthenticated) {
      setState(() {
        _isLoadingPaymentMethods = true;
      });

      try {
        final paymentService = Provider.of<PaymentService>(context, listen: false);
        await paymentService.loadUserPaymentMethods(authService.currentUser!.id);

        if (mounted) {
          setState(() {
            // Kayıtlı ödeme yöntemlerini al
            _paymentMethods = paymentService.userPaymentMethods;

            // Kapıda ödemeyi listeye ekle (eğer zaten yoksa)
            if (_cashOnDeliveryMethod != null &&
                !_paymentMethods.any((method) => method.type == 'cash_on_delivery')) {
              _paymentMethods.add(_cashOnDeliveryMethod!);
            }

            // Varsayılan seçimi belirle - eğer kapıda ödeme varsa, onu seç
            if (_cashOnDeliveryMethod != null) {
              _selectedPaymentMethod = _cashOnDeliveryMethod;
            } else if (_paymentMethods.isNotEmpty) {
              _selectedPaymentMethod = _paymentMethods.firstWhere(
                (method) => method.isDefault,
                orElse: () => _paymentMethods.first,
              );
            }

            _isLoadingPaymentMethods = false;
          });
        }
      } catch (error) {
        if (mounted) {
          Helpers.showSnackBar('Ödeme yöntemleri yüklenirken bir hata oluştu', isError: true);

          // Hata olsa bile kapıda ödeme seçeneğini ekle
          setState(() {
            if (_cashOnDeliveryMethod != null) {
              _paymentMethods = [_cashOnDeliveryMethod!];
              _selectedPaymentMethod = _cashOnDeliveryMethod;
            }
            _isLoadingPaymentMethods = false;
          });
        }
      }
    } else {
      // Giriş yapmamış kullanıcılar için kapıda ödeme seçeneği ekle
      setState(() {
        if (_cashOnDeliveryMethod != null) {
          _paymentMethods = [_cashOnDeliveryMethod!];
          _selectedPaymentMethod = _cashOnDeliveryMethod;
        }
      });
    }
  }

  // Giriş yapılması gerektiğini bildiren dialog
  void _showLoginRequiredDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.lock_outline, color: AppTheme.primaryColor),
              SizedBox(width: 12),
              Text('Giriş Yapmanız Gerekiyor'),
            ],
          ),
          content: Text(
            'Sipariş verebilmek için önce giriş yapmanız veya kayıt olmanız gerekmektedir.',
            style: TextStyle(fontSize: 16),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pop(); // Checkout ekranından çık
              },
              child: Text('İptal'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushNamed('/login');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
              child: Text('Giriş Yap'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushNamed('/register');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.secondaryColor,
                foregroundColor: Colors.white,
              ),
              child: Text('Kayıt Ol'),
            ),
          ],
        );
      },
    );
  }

  // E-posta doğrulaması gerektiğini bildiren dialog
  void _showEmailVerificationRequiredDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.email_outlined, color: Colors.orange),
              SizedBox(width: 12),
              Text('E-posta Doğrulaması Gerekli'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Sipariş verebilmek için e-posta adresinizi doğrulamanız gerekmektedir.',
                style: TextStyle(fontSize: 16),
              ),
              SizedBox(height: 12),
              Text(
                'E-postanıza gönderilen doğrulama kodunu girerek hesabınızı aktifleştirebilirsiniz.',
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pop(); // Checkout ekranından çık
              },
              child: Text('İptal'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(context).pop();
                final authService = Provider.of<AuthService>(context, listen: false);
                // E-posta doğrulama ekranına yönlendir
                Navigator.of(context).pushNamed(
                  '/email-verification',
                  arguments: {'email': authService.currentUser?.email ?? ''},
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
              ),
              child: Text('Doğrula'),
            ),
          ],
        );
      },
    );
  }

  // Siparişi tamamla
  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedPaymentMethod == null) {
      // Eğer ödeme yöntemi seçilmemişse ve kapıda ödeme varsa, onu kullan
      if (_cashOnDeliveryMethod != null) {
        _selectedPaymentMethod = _cashOnDeliveryMethod;
      } else {
        Helpers.showSnackBar('Lütfen bir ödeme yöntemi seçin', isError: true);
        return;
      }
    }

    // Beylikdüzü kontrolü
    if (!_isValidDeliveryLocation) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Şu an sadece Beylikdüzü ilçesine teslimat yapabiliyoruz'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    _formKey.currentState!.save();

    setState(() {
      _isLoading = true;
    });

    try {
      final cartProvider = Provider.of<CartProvider>(context, listen: false);
      final orderService = Provider.of<OrderService>(context, listen: false);
      final authService = Provider.of<AuthService>(context, listen: false);
      final deliveryService = Provider.of<DeliveryService>(context, listen: false);
      final paymentService = Provider.of<PaymentService>(context, listen: false);

      // Kullanıcı bilgilerini al - Artık misafir kullanıcı yok, sadece kayıtlı kullanıcılar
      final user = authService.currentUser;

      // Güvenlik kontrolü - Build metodunda zaten kontrol edildi ama yine de emin olalım
      if (user == null) {
        Helpers.showSnackBar('Oturum sonlandı. Lütfen tekrar giriş yapın.', isError: true);
        Navigator.of(context).pushReplacementNamed('/login');
        return;
      }

      // E-posta doğrulama kontrolü build'de yapıldı, buraya kadar geldiyse kullanıcı doğrulanmış demektir
      // Ancak session değişmiş olabilir, Firestore'dan son durumu kontrol edelim
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.id).get();

      if (userDoc.exists) {
        final isGoogleUser = userDoc.data()?['provider'] == 'google';
        final firestoreEmailVerified = userDoc.data()?['emailVerified'] == true;
        final isActive = userDoc.data()?['isActive'] == true;

        // Google kullanıcısı değilse e-posta doğrulama ve aktiflik kontrolü
        if (!isGoogleUser && (!firestoreEmailVerified || !isActive)) {
          Helpers.showSnackBar('E-posta doğrulamanızı tamamlayın.', isError: true);
          Navigator.of(context).pushReplacementNamed('/verify-email');
          return;
        }
      }

      final userId = user.id;
      final customerEmail = user.email;

      // Yeni adres oluştur
      final address = Address(
        id: DateTime.now().toString(),
        fullName: _fullName,
        phoneNumber: _phoneNumber,
        addressLine1: _addressLine1,
        addressLine2: _addressLine2,
        city: _city,
        district: _district,
        neighborhood: _neighborhood,
        postalCode: _postalCode,
        isDefault: false,
      );

      // Adresi kaydet - Artık tüm kullanıcılar kayıtlı olduğu için isGuest kontrolüne gerek yok
      if (_saveAddress || user.addresses.isEmpty) {
        try {
          // Kullanıcının ilk siparişi ise ve kaydetme seçeneği işaretlenmediyse, otomatik kaydediyoruz
          if (user.addresses.isEmpty && !_saveAddress) {
            // İlk sipariş için adres otomatik olarak kaydediliyor
            Logger.info('İlk sipariş için adres otomatik olarak kaydediliyor');
            final success = await authService.saveAddressFromOrder(address);
            if (success) {
              Helpers.showSuccessSnackBar('Teslimat adresiniz otomatik olarak kaydedildi');
            }
          } else if (_saveAddress) {
            // Kullanıcı onayı ile adres kaydediliyor
            await authService.addUserAddress(address);
            Helpers.showSuccessSnackBar('Adres başarıyla kaydedildi');
          }
        } catch (e) {
          Logger.error('Adres kaydedilirken hata: $e');
          // Adres kaydedilemedi ama sipariş işlemine devam edebiliriz
          Helpers.showSnackBar('Adres kaydedilemedi, ancak siparişiniz alınacak', isError: true);
        }
      }

      // Siparişi oluştur
      final orderId = await orderService.createOrder(
        items: cartProvider.items.values
            .map((item) => OrderItem(
                  productId: item.product.id,
                  name: item.product.name,
                  price: item.product.price,
                  quantity: item.quantity,
                  imageUrl: item.product.imageUrl,
                ))
            .toList(),
        amount: cartProvider.totalAmount >= 300
            ? cartProvider.totalAmount
            : cartProvider.totalAmount + _deliveryFee,
        customerName: _fullName,
        customerEmail: customerEmail,
        customerPhone: _phoneNumber,
        shippingAddress: _getFullAddress(),
        paymentMethod: _selectedPaymentMethod!.type,
        userId: userId,
        notes: _noteController.text.isNotEmpty ? _noteController.text : 'Standart teslimat',
      );

      // Ödeme işlemini oluştur
      final transaction = PaymentTransaction(
        id: DateTime.now().toString(),
        orderId: orderId,
        userId: userId,
        paymentMethodId: _selectedPaymentMethod!.id,
        amount: cartProvider.totalAmount >= 300
            ? cartProvider.totalAmount
            : cartProvider.totalAmount + _deliveryFee,
        currency: 'TRY',
        status: _selectedPaymentMethod!.type == 'cash_on_delivery' ? 'pending_delivery' : 'pending',
        metadata: {
          'deliveryFee': cartProvider.totalAmount >= 300 ? 0.0 : _deliveryFee,
          'subtotal': cartProvider.totalAmount,
          'items': cartProvider.items.values
              .map((item) => {
                    'productId': item.product.id,
                    'name': item.product.name,
                    'price': item.product.price,
                    'quantity': item.quantity,
                  })
              .toList(),
        },
      );

      await paymentService.createTransaction(transaction);

      // Sepeti temizle
      cartProvider.clear();

      // Başarı mesajı göster ve sipariş onay sayfasına yönlendir
      if (mounted) {
        Navigator.of(context).pushReplacementNamed(
          '/order-confirmation',
          arguments: orderId,
        );
      }
    } catch (error) {
      // Hata durumunda kullanıcıya bildir
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sipariş oluşturulurken bir hata oluştu: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // Ödeme yöntemi seçili değilse (özellikle listenin boş olduğu durumlarda)
  // ve kapıda ödeme seçeneği varsa onu göster ve seç
  void _checkAndSetDefaultPaymentMethod() {
    if (_selectedPaymentMethod == null && _cashOnDeliveryMethod != null) {
      setState(() {
        _selectedPaymentMethod = _cashOnDeliveryMethod;
      });
    }
  }

  // Tam adres bilgisini oluştur
  String _getFullAddress() {
    final selectedAddr = _selectedAddress;
    if (selectedAddr != null && selectedAddr.id.isNotEmpty) {
      return '${selectedAddr.addressLine1} ${selectedAddr.addressLine2 ?? ''}, ${selectedAddr.neighborhood}, ${selectedAddr.district}/${selectedAddr.city} ${selectedAddr.postalCode}';
    }

    String addrLine2 = _addressLine2.isNotEmpty ? ' $_addressLine2' : '';
    return '$_addressLine1$addrLine2, $_neighborhood, $_district/$_city $_postalCode';
  }

  // Teslimat bölgesi seçimi
  void _onDeliveryZoneSelected(DeliveryZone zone) {
    setState(() {
      _selectedZoneId = zone.id;
      _selectedZone = zone.toJson();
      _deliveryFee = zone.fee;
      _minOrderAmount = zone.minOrderAmount;
      _maxDistance = zone.maxDistance;
    });
  }

  // Teslimat bölgesi kontrolü
  bool isDeliveryAvailable() {
    if (_selectedZone == null) return false;

    final minOrderAmount = _selectedZone!['minOrderAmount'] as double? ?? 0.0;
    final maxDistance = _selectedZone!['maxDistance'] as double? ?? 0.0;
    final isActive = _selectedZone!['isActive'] as bool? ?? false;

    return isActive && _cartTotal >= minOrderAmount && _distance <= maxDistance;
  }

  Future<void> _loadCartTotal() async {
    final cart = Provider.of<CartProvider>(context, listen: false);
    setState(() {
      _cartTotal = cart.totalAmount;
    });
  }

  Future<void> _loadDeliveryZones() async {
    try {
      setState(() => _isLoading = true);
      final deliveryService = Provider.of<DeliveryService>(context, listen: false);
      final zones = await deliveryService.getActiveDeliveryZones();

      if (zones.isNotEmpty) {
        _onDeliveryZoneSelected(zones.first);
      }

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Teslimat bölgeleri yüklenirken bir hata oluştu')),
      );
    }
  }

  // Teslimat bölgesi seçimi
  Future<void> _selectDeliveryZone(String zoneId) async {
    try {
      final deliveryService = Provider.of<DeliveryService>(context, listen: false);
      final success = await deliveryService.selectDeliveryZone(zoneId, 'standard');

      if (!success) {
        throw Exception('Teslimat bölgesi seçilemedi');
      }

      setState(() {
        _selectedDeliveryZone = zoneId;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Teslimat bölgesi seçilirken bir hata oluştu: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cartProvider = Provider.of<CartProvider>(context);
    final authService = Provider.of<AuthService>(context);
    final subtotal = cartProvider.totalAmount;
    final isFreeShipping = subtotal >= 300;
    final total = isFreeShipping ? subtotal : subtotal + _deliveryFee;

    // Kullanıcı giriş kontrolü - Giriş yapmamış veya e-posta doğrulanmamış kullanıcıları engelle
    if (!authService.isAuthenticated) {
      // Giriş yapmamış kullanıcı için dialog göster
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showLoginRequiredDialog(context);
      });
      return Scaffold(
        appBar: CustomAppBar(title: 'Sipariş Özeti'),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // E-posta doğrulama kontrolü yüklenirken
    if (_isCheckingEmailVerification) {
      return Scaffold(
        appBar: CustomAppBar(title: 'Sipariş Özeti'),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // E-posta doğrulanmamış kullanıcı kontrolü
    if (authService.currentUser != null && !_isEmailVerified) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showEmailVerificationRequiredDialog(context);
      });
      return Scaffold(
        appBar: CustomAppBar(title: 'Sipariş Özeti'),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // Sayfa yüklenirken kapıda ödeme seçeneğini kontrol et
    _checkAndSetDefaultPaymentMethod();

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Sipariş Özeti',
        showBackButton: true,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Beylikdüzü dışına teslimat yapılmadığına dair bilgilendirme
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(16),
                      margin: EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color:
                            isDark ? Colors.amber[900]!.withValues(alpha: 0.2) : Colors.amber[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.amber[700]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.info_outline, color: Colors.amber[800]),
                              SizedBox(width: 8),
                              Text(
                                'Teslimat Bölgesi',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber[800],
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Şu anda sadece İstanbul / Beylikdüzü içerisindeki adreslere teslimat yapabiliyoruz.',
                            style: TextStyle(
                              color: Colors.amber[800],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Adres bilgileri
                    Text(
                      'Teslimat Bilgileri',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),

                    // Misafir kullanıcı bilgilendirmesi
                    Consumer<AuthService>(
                      builder: (context, authService, _) {
                        if (!authService.isAuthenticated) {
                          return Container(
                            margin: EdgeInsets.only(bottom: 16),
                            padding: EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.blue[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.blue[200]!),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.info_outline, color: Colors.blue[700]),
                                SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Misafir olarak alışveriş yapıyorsunuz. Üye olarak sipariş geçmişinizi takip edebilir ve hızlı alışveriş yapabilirsiniz.',
                                    style: TextStyle(color: Colors.blue[900], fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }
                        return SizedBox.shrink();
                      },
                    ),

                    // Ad soyad
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'Ad Soyad',
                        prefixIcon: Icon(Icons.person),
                        border: OutlineInputBorder(),
                        hintText: 'Ahmet Yılmaz',
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Lütfen adınızı ve soyadınızı girin';
                        }
                        if (value.trim().length < 3) {
                          return 'Ad soyad en az 3 karakter olmalıdır';
                        }
                        // En az bir boşluk olmalı (ad ve soyad)
                        if (!value.trim().contains(' ')) {
                          return 'Lütfen ad ve soyadınızı girin';
                        }
                        return null;
                      },
                      onSaved: (newValue) {
                        _fullName = newValue?.trim() ?? '';
                      },
                    ),
                    SizedBox(height: 12),

                    // Email (misafir kullanıcılar için)
                    Consumer<AuthService>(
                      builder: (context, authService, _) {
                        if (!authService.isAuthenticated) {
                          return Column(
                            children: [
                              TextFormField(
                                controller: _emailController,
                                decoration: InputDecoration(
                                  labelText: 'Email',
                                  prefixIcon: Icon(Icons.email),
                                  border: OutlineInputBorder(),
                                  hintText: 'ornek@mail.com',
                                ),
                                keyboardType: TextInputType.emailAddress,
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Lütfen email adresinizi girin';
                                  }
                                  // Email regex pattern
                                  final emailRegex = RegExp(
                                    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                                  );
                                  if (!emailRegex.hasMatch(value.trim())) {
                                    return 'Geçerli bir email adresi girin (örn: ornek@mail.com)';
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: 12),
                            ],
                          );
                        }
                        return SizedBox.shrink();
                      },
                    ),

                    // Telefon numarası
                    TextFormField(
                      controller: _phoneController,
                      decoration: InputDecoration(
                        labelText: 'Telefon Numarası',
                        prefixIcon: Icon(Icons.phone),
                        border: OutlineInputBorder(),
                        hintText: '05XX XXX XX XX',
                      ),
                      keyboardType: TextInputType.phone,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Lütfen telefon numaranızı girin';
                        }
                        // Boşlukları ve tire işaretlerini temizle
                        final cleanPhone = value.replaceAll(RegExp(r'[\s-]'), '');
                        
                        // Türkiye cep telefonu formatı: 05XX XXX XX XX
                        final phoneRegex = RegExp(r'^05\d{9}$');
                        if (!phoneRegex.hasMatch(cleanPhone)) {
                          return 'Geçerli bir telefon numarası girin (05XX XXX XX XX)';
                        }
                        return null;
                      },
                      onSaved: (newValue) {
                        // Telefonu temiz formatda kaydet
                        _phoneNumber = newValue?.replaceAll(RegExp(r'[\s-]'), '') ?? '';
                      },
                    ),
                    SizedBox(height: 16),

                    // İl ve İlçe - Devre dışı ve sabit gösterimi
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _cityController,
                            decoration: InputDecoration(
                              labelText: 'İl',
                              prefixIcon: Icon(Icons.location_city),
                              border: OutlineInputBorder(),
                            ),
                            enabled: false, // Devre dışı, değiştirilemez
                          ),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _districtController,
                            decoration: InputDecoration(
                              labelText: 'İlçe',
                              prefixIcon: Icon(Icons.location_on),
                              border: OutlineInputBorder(),
                            ),
                            enabled: false, // Devre dışı, değiştirilemez
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),

                    // Mahalle seçimi - Dropdown
                    DropdownButtonFormField<String>(
                      value: _neighborhood.isNotEmpty ? _neighborhood : null,
                      decoration: InputDecoration(
                        labelText: 'Mahalle',
                        prefixIcon: Icon(Icons.home),
                        border: OutlineInputBorder(),
                      ),
                      items: _availableNeighborhoods.map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Lütfen mahallenizi seçin';
                        }
                        return null;
                      },
                      onChanged: (newValue) {
                        setState(() {
                          _neighborhood = newValue ?? '';
                          _neighborhoodController.text = _neighborhood;
                        });
                      },
                      onSaved: (newValue) {
                        _neighborhood = newValue ?? '';
                      },
                    ),
                    SizedBox(height: 12),

                    // Adres satırı 1
                    TextFormField(
                      controller: _addressLine1Controller,
                      decoration: InputDecoration(
                        labelText: 'Sokak ve Cadde',
                        prefixIcon: Icon(Icons.home),
                        border: OutlineInputBorder(),
                        hintText: 'örn: Cumhuriyet Caddesi No:15',
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Lütfen cadde ve sokak bilgilerinizi girin';
                        }
                        if (value.trim().length < 5) {
                          return 'Adres en az 5 karakter olmalıdır';
                        }
                        return null;
                      },
                      onSaved: (newValue) {
                        _addressLine1 = newValue?.trim() ?? '';
                      },
                    ),
                    SizedBox(height: 12),

                    // Adres satırı 2
                    TextFormField(
                      controller: _addressLine2Controller,
                      decoration: InputDecoration(
                        labelText: 'Bina No, Daire No (İsteğe bağlı)',
                        prefixIcon: Icon(Icons.apartment),
                        border: OutlineInputBorder(),
                      ),
                      onSaved: (newValue) {
                        _addressLine2 = newValue ?? '';
                      },
                    ),
                    SizedBox(height: 12),

                    // Posta kodu
                    TextFormField(
                      controller: _postalCodeController,
                      decoration: InputDecoration(
                        labelText: 'Posta Kodu',
                        prefixIcon: Icon(Icons.markunread_mailbox),
                        border: OutlineInputBorder(),
                        hintText: '34520',
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value != null && value.trim().isNotEmpty) {
                          // Posta kodu girilmişse 5 haneli olmalı
                          final postalRegex = RegExp(r'^\d{5}$');
                          if (!postalRegex.hasMatch(value.trim())) {
                            return 'Posta kodu 5 haneli olmalıdır';
                          }
                        }
                        return null;
                      },
                      onSaved: (newValue) {
                        _postalCode = newValue?.trim() ?? '';
                      },
                    ),
                    SizedBox(height: 16),

                    // Adres kaydetme onayı
                    CheckboxListTile(
                      title: Text('Bu adresi kaydet'),
                      value: _saveAddress,
                      onChanged: (newValue) {
                        setState(() {
                          _saveAddress = newValue ?? false;
                        });
                      },
                      controlAffinity: ListTileControlAffinity.leading,
                    ),

                    // Sipariş notu
                    const SizedBox(height: 24),
                    const Text(
                      'Sipariş Notu',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _noteController,
                      decoration: const InputDecoration(
                        labelText: 'Not (Opsiyonel)',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 3,
                    ),

                    // Ödeme yöntemleri
                    const SizedBox(height: 24),
                    const Text(
                      'Ödeme Yöntemi',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (_isLoadingPaymentMethods)
                      const Center(child: CircularProgressIndicator())
                    else
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Kapıda ödeme seçeneği her zaman görünür olsun
                          if (_cashOnDeliveryMethod != null)
                            Card(
                              elevation: 2,
                              margin: const EdgeInsets.only(bottom: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                  color: _selectedPaymentMethod?.id == _cashOnDeliveryMethod!.id
                                      ? AppTheme.primaryColor
                                      : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                              child: RadioListTile<PaymentMethod>(
                                value: _cashOnDeliveryMethod!,
                                groupValue: _selectedPaymentMethod,
                                onChanged: (value) {
                                  setState(() {
                                    _selectedPaymentMethod = value;
                                  });
                                },
                                title: Row(
                                  children: [
                                    Icon(Icons.monetization_on, color: AppTheme.primaryColor),
                                    SizedBox(width: 8),
                                    Text('Kapıda Ödeme',
                                        style: TextStyle(fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                subtitle: Text(
                                    'Siparişiniz teslim edildiğinde kapıda ödeme yapabilirsiniz'),
                                secondary: Icon(Icons.check_circle,
                                    color: _selectedPaymentMethod?.id == _cashOnDeliveryMethod!.id
                                        ? AppTheme.primaryColor
                                        : Colors.transparent),
                                contentPadding: EdgeInsets.all(12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),

                          // Diğer kayıtlı ödeme yöntemleri
                          ..._paymentMethods
                              .where((method) => method.type != 'cash_on_delivery')
                              .map((method) => Card(
                                    elevation: 2,
                                    margin: const EdgeInsets.only(bottom: 8),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      side: BorderSide(
                                        color: _selectedPaymentMethod?.id == method.id
                                            ? AppTheme.primaryColor
                                            : Colors.transparent,
                                        width: 2,
                                      ),
                                    ),
                                    child: RadioListTile<PaymentMethod>(
                                      value: method,
                                      groupValue: _selectedPaymentMethod,
                                      onChanged: (value) {
                                        setState(() {
                                          _selectedPaymentMethod = value;
                                        });
                                      },
                                      title: Text(method.title),
                                      subtitle: Text(method.type),
                                      secondary: Icon(_getPaymentMethodIcon(method.type)),
                                      contentPadding: EdgeInsets.all(8),
                                    ),
                                  )),

                          // Yeni ödeme yöntemi ekleme butonu
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: TextButton.icon(
                              onPressed: _addPaymentMethod,
                              icon: const Icon(Icons.add),
                              label: const Text('Yeni Ödeme Yöntemi Ekle'),
                            ),
                          ),
                        ],
                      ),

                    // Teslimat bilgileri card
                    const SizedBox(height: 24),
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.local_shipping, color: AppTheme.primaryColor),
                                SizedBox(width: 8),
                                Text(
                                  'Teslimat Bilgileri',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 8),
                            Divider(),
                            SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Teslimat Ücreti:',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                                Consumer<CartProvider>(
                                  builder: (context, cartProvider, _) {
                                    final cartTotal = cartProvider.totalAmount;
                                    return Text(
                                      cartTotal >= 300
                                          ? 'Bedava'
                                          : '${_deliveryFee.toStringAsFixed(2)} ₺',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color:
                                            cartTotal >= 300 ? Colors.green : AppTheme.primaryColor,
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Sipariş özeti
                    const SizedBox(height: 24),
                    const Text(
                      'Sipariş Özeti',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            ...cartProvider.items.values.map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${item.product.name} x ${item.quantity}',
                                    ),
                                    Text(
                                      '${(item.product.price * item.quantity).toStringAsFixed(2)} ₺',
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const Divider(),
                            _buildPriceSummaryRow('Ara Toplam', subtotal),
                            if (_deliveryFee > 0)
                              _buildPriceSummaryRow('Teslimat Ücreti', _deliveryFee),
                            const Divider(),
                            _buildPriceSummaryRow(
                              'Toplam',
                              total,
                              isTotal: true,
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Siparişi tamamla butonu
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _placeOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: _isLoading
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text('Siparişi Tamamla'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildPriceSummaryRow(String label, double amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 18 : 16,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            '${amount.toStringAsFixed(2)} ₺',
            style: TextStyle(
              fontSize: isTotal ? 20 : 16,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? AppTheme.primaryColor : null,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getPaymentMethodIcon(String type) {
    switch (type) {
      case 'credit_card':
        return Icons.credit_card;
      case 'bank_transfer':
        return Icons.account_balance;
      case 'wallet':
        return Icons.account_balance_wallet;
      case 'cash_on_delivery':
        return Icons.monetization_on;
      default:
        return Icons.payment;
    }
  }

  // Yeni ödeme yöntemi ekle
  Future<void> _addPaymentMethod() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    if (!authService.isAuthenticated) return;

    // Ödeme yöntemi ekleme dialogunu göster
    final result = await showDialog<PaymentMethod>(
      context: context,
      builder: (context) => _AddPaymentMethodDialog(),
    );

    if (result != null) {
      setState(() {
        _isLoadingPaymentMethods = true;
      });

      try {
        final paymentService = Provider.of<PaymentService>(context, listen: false);
        final newMethod = await paymentService.addPaymentMethod(result);

        setState(() {
          _paymentMethods.add(newMethod);
          _selectedPaymentMethod = newMethod;
          _isLoadingPaymentMethods = false;
        });
      } catch (error) {
        Helpers.showSnackBar('Ödeme yöntemi eklenirken bir hata oluştu', isError: true);
        setState(() {
          _isLoadingPaymentMethods = false;
        });
      }
    }
  }
}

class _AddPaymentMethodDialog extends StatefulWidget {
  @override
  State<_AddPaymentMethodDialog> createState() => _AddPaymentMethodDialogState();
}

class _AddPaymentMethodDialogState extends State<_AddPaymentMethodDialog> {
  final _formKey = GlobalKey<FormState>();
  String _type = 'credit_card';
  String _title = '';
  Map<String, dynamic> _details = {};

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Yeni Ödeme Yöntemi'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(
                labelText: 'Ödeme Yöntemi Türü',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(
                  value: 'credit_card',
                  child: Text('Kredi Kartı'),
                ),
                DropdownMenuItem(
                  value: 'bank_transfer',
                  child: Text('Banka Transferi'),
                ),
                DropdownMenuItem(
                  value: 'wallet',
                  child: Text('Dijital Cüzdan'),
                ),
                DropdownMenuItem(
                  value: 'cash_on_delivery',
                  child: Text('Kapıda Ödeme'),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  _type = value!;
                });
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              decoration: const InputDecoration(
                labelText: 'Başlık',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Lütfen bir başlık girin';
                }
                return null;
              },
              onSaved: (value) {
                _title = value!;
              },
            ),
            const SizedBox(height: 16),
            if (_type == 'credit_card') ...[
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Kart Numarası',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen kart numarasını girin';
                  }
                  return null;
                },
                onSaved: (value) {
                  _details['cardNumber'] = value;
                },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      decoration: const InputDecoration(
                        labelText: 'Son Kullanma Tarihi',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Lütfen tarihi girin';
                        }
                        return null;
                      },
                      onSaved: (value) {
                        _details['expiryDate'] = value;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      decoration: const InputDecoration(
                        labelText: 'CVV',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Lütfen CVV girin';
                        }
                        return null;
                      },
                      onSaved: (value) {
                        _details['cvv'] = value;
                      },
                    ),
                  ),
                ],
              ),
            ] else if (_type == 'bank_transfer') ...[
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Banka Adı',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen banka adını girin';
                  }
                  return null;
                },
                onSaved: (value) {
                  _details['bankName'] = value;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'IBAN',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen IBAN girin';
                  }
                  return null;
                },
                onSaved: (value) {
                  _details['iban'] = value;
                },
              ),
            ] else if (_type == 'wallet') ...[
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Cüzdan Numarası',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen cüzdan numarasını girin';
                  }
                  return null;
                },
                onSaved: (value) {
                  _details['walletNumber'] = value;
                },
              ),
            ] else if (_type == 'cash_on_delivery') ...[
              // Kapıda ödeme için bilgilendirme
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.green),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Kapıda Ödeme Seçeneği',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Siparişiniz teslim edildiğinde kurye tarafından tahsilat yapılacaktır.',
                      style: TextStyle(color: Colors.green.shade800),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _details['paymentType'] ?? 'cash',
                decoration: const InputDecoration(
                  labelText: 'Ödeme Tipi',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'cash',
                    child: Text('Nakit'),
                  ),
                  DropdownMenuItem(
                    value: 'card',
                    child: Text('Kredi Kartı'),
                  ),
                ],
                onChanged: (value) {
                  setState(() {
                    _details['paymentType'] = value;
                  });
                },
                onSaved: (value) {
                  _details['paymentType'] = value;
                },
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('İptal'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              _formKey.currentState!.save();
              final authService = Provider.of<AuthService>(context, listen: false);
              final method = PaymentMethod(
                id: DateTime.now().toString(),
                userId: authService.currentUser!.id,
                type: _type,
                title: _title,
                details: _details,
              );
              Navigator.of(context).pop(method);
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
          ),
          child: const Text('Kaydet'),
        ),
      ],
    );
  }
}
