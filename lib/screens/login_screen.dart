// ignore_for_file: use_key_in_widget_constructors, use_build_context_synchronously, library_private_types_in_public_api, prefer_const_constructors, unused_local_variable, unused_element, unused_field

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../providers/cart_provider.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../services/rate_limiter_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import 'email_verification_screen.dart';
import 'home_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  static const routeName = '/login';

  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;
  int _remainingAttempts = 5;
  bool _rememberMe = true; // Varsayılan olarak aktif

  @override
  void initState() {
    super.initState();
    _loadRemainingAttempts();
    _loadSavedEmail();
  }

  // Kaydedilmiş e-posta varsa yükle
  Future<void> _loadSavedEmail() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final savedEmail = await authService.getSavedEmail();
    if (savedEmail != null && savedEmail.isNotEmpty) {
      setState(() {
        _emailController.text = savedEmail;
        _rememberMe = true;
      });
    }
  }

  Future<void> _loadRemainingAttempts() async {
    final remaining = await RateLimiterService.getRemainingAttempts();
    if (mounted) {
      setState(() {
        _remainingAttempts = remaining;
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      Logger.info('Giriş işlemi başlatılıyor email=${_emailController.text}');

      final authService = Provider.of<AuthService>(context, listen: false);
      final success = await authService.login(
        _emailController.text.trim(),
        _passwordController.text.trim(),
      );

      if (success) {
        Logger.info('Giriş başarılı, yönlendirme yapılıyor');

        // Beni Hatırla seçeneğine göre e-posta kaydet veya temizle
        if (_rememberMe) {
          await authService.saveEmail(_emailController.text.trim());
        } else {
          await authService.clearSavedEmail();
        }

        // Login başarılı - CartProvider'a user ID bildir
        final cartProvider = Provider.of<CartProvider>(context, listen: false);
        cartProvider.setUserId(authService.currentUser?.id);

        // FCM Token'ı kaydet (push notification için)
        if (authService.currentUser?.id != null) {
          try {
            final notificationService = NotificationService();
            await notificationService.getFcmToken(
              userId: authService.currentUser!.id,
            );
            Logger.info('FCM Token kullanıcıya kaydedildi');
          } catch (e) {
            Logger.error('FCM Token kaydedilirken hata: $e');
            // Token kaydı hatası giriş işlemini engellemez
          }
        }

        // Giriş başarılı, ana sayfaya yönlendir
        if (!mounted) return;
        Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
      } else {
        Logger.warning('Giriş başarısız');
        setState(() {
          _errorMessage = 'Giriş işlemi başarısız oldu. Lütfen tekrar deneyin.';
          _isLoading = false;
        });
      }
    } catch (error) {
      Logger.error('Giriş hatası: $error');
      final msg = error.toString();
      if (msg.contains('E-posta doğrulanmamış')) {
        // Doğrulama ekranına yönlendir (mevcut kullanıcı için)
        if (!mounted) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => EmailVerificationScreen(
              email: _emailController.text.trim(),
              isPendingRegistration: false, // Mevcut kullanıcı
            ),
          ),
        );
      } else {
        setState(() {
          _errorMessage = msg;
          _isLoading = false;
        });
      }
      // Kalan deneme hakkını güncelle
      await _loadRemainingAttempts();
    }
  }

  void _showTermsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Kullanım Koşulları'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDialogSection('1. Genel Hükümler'),
              _buildDialogText(
                'EkmekLab platformunu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. '
                'Bu koşullar, platformumuzun kullanımı ve sizinle aramızdaki ilişkiyi düzenler.',
              ),
              _buildDialogSection('2. Kullanıcı Hesabı'),
              _buildDialogText(
                '• Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olmasından siz sorumlusunuz.\n'
                '• Hesap şifrenizi gizli tutmalı ve başkalarıyla paylaşmamalısınız.\n'
                '• Hesabınızda gerçekleşen tüm aktivitelerden siz sorumlusunuz.',
              ),
              _buildDialogSection('3. Sipariş ve Teslimat'),
              _buildDialogText(
                '• Verdiğiniz siparişler için doğru teslimat bilgilerini sağlamalısınız.\n'
                '• Teslimat süreleri tahmini olup değişkenlik gösterebilir.\n'
                '• Ürün fiyatları ve stok durumu değişebilir.',
              ),
              _buildDialogSection('4. Ödeme'),
              _buildDialogText(
                '• Tüm ödemeler güvenli ödeme sistemleri üzerinden yapılır.\n'
                '• Kredi kartı bilgileriniz bizde saklanmaz.\n'
                '• İptal ve iade koşulları için müşteri hizmetleriyle iletişime geçebilirsiniz.',
              ),
              _buildDialogSection('5. Gizlilik ve Veri Koruma'),
              _buildDialogText(
                'Kişisel verileriniz KVKK ve ilgili mevzuata uygun olarak işlenir. '
                'Detaylar için Gizlilik Politikamızı inceleyebilirsiniz.',
              ),
              _buildDialogSection('6. Sorumluluğun Sınırlandırılması'),
              _buildDialogText(
                '• Platformumuzu "olduğu gibi" sunmaktayız.\n'
                '• Hizmet kesintilerinden sorumlu değiliz.\n'
                '• Ürün kalitesi ve güvenliği için tüm önlemleri alırız.',
              ),
              _buildDialogSection('7. Değişiklikler'),
              _buildDialogText(
                'Bu kullanım koşullarını dilediğimiz zaman değiştirme hakkını saklı tutarız. '
                'Değişiklikler platform üzerinden duyurulacaktır.',
              ),
              SizedBox(height: 16),
              Text(
                'Son Güncelleme: Kasım 2025',
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Kapat'),
          ),
        ],
      ),
    );
  }

  void _showPrivacyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Gizlilik Politikası'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDialogSection('KVKK Aydınlatma Metni'),
              _buildDialogText(
                'Ekşi Mayalı Ekmek olarak kişisel verilerinizin güvenliği hakkında '
                'bilgilendirmek isteriz. 6698 sayılı Kişisel Verilerin Korunması Kanunu '
                'kapsamında haklarınızı ve verilerinizin nasıl işlendiğini açıklıyoruz.',
              ),
              _buildDialogSection('Toplanan Kişisel Veriler'),
              _buildDialogText(
                '• Kimlik Bilgileri: Ad, soyad, e-posta adresi\n'
                '• İletişim Bilgileri: Telefon numarası, teslimat adresi\n'
                '• İşlem Bilgileri: Sipariş geçmişi, ödeme bilgileri\n'
                '• Teknik Bilgiler: IP adresi, cihaz bilgileri, çerezler',
              ),
              _buildDialogSection('Verilerin İşlenme Amaçları'),
              _buildDialogText(
                '• Sipariş teslimatı gerçekleştirmek\n'
                '• Müşteri hizmetleri sunmak\n'
                '• Ürün ve hizmetlerimizi geliştirmek\n'
                '• Yasal yükümlülükleri yerine getirmek\n'
                '• Pazarlama faaliyetleri (onayınızla)',
              ),
              _buildDialogSection('Veri Güvenliği'),
              _buildDialogText(
                'Kişisel verileriniz en üst düzey güvenlik önlemleriyle korunmaktadır:\n'
                '• SSL/TLS şifreleme\n'
                '• Güvenli veri tabanları\n'
                '• Erişim kontrolü ve yetkilendirme\n'
                '• Düzenli güvenlik denetimleri',
              ),
              _buildDialogSection('KVKK Kapsamındaki Haklarınız'),
              _buildDialogText(
                '• Kişisel verilerinizin işlenip işlenmediğini öğrenme\n'
                '• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme\n'
                '• Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri bilme\n'
                '• Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme\n'
                '• Verilerin silinmesini veya yok edilmesini isteme\n'
                '• Yapılan işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme\n'
                '• İşlenen verilerin münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonuç doğmasına itiraz etme\n'
                '• Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme',
              ),
              _buildDialogSection('Çerez Politikası'),
              _buildDialogText(
                'Web sitemizde kullanıcı deneyimini iyileştirmek için çerezler kullanılmaktadır. '
                'Çerez tercihlerinizi tarayıcı ayarlarından yönetebilirsiniz.',
              ),
              _buildDialogSection('Veri Saklama Süresi'),
              _buildDialogText(
                'Kişisel verileriniz, işlenme amaçlarının gerektirdiği süreler ve yasal '
                'saklama süreleri boyunca saklanmaktadır. Süre sona erdiğinde veriler '
                'silinir, yok edilir veya anonim hale getirilir.',
              ),
              _buildDialogSection('İletişim'),
              _buildDialogText(
                'Kişisel verilerinizle ilgili taleplerinizi aşağıdaki kanallardan iletebilirsiniz:\n\n'
                '📧 E-posta: kvkk@ekmeklab.tr\n'
                '📞 Telefon: +90 (XXX) XXX XX XX\n'
                '📍 Adres: [Şirket Adresi]',
              ),
              SizedBox(height: 16),
              Text(
                'Son Güncelleme: Kasım 2025',
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Kapat'),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogSection(String title) {
    return Padding(
      padding: EdgeInsets.only(top: 16, bottom: 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }

  Widget _buildDialogText(String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: TextStyle(fontSize: 14, height: 1.5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: isDarkMode ? Colors.white : Colors.black,
          ),
          onPressed: () {
            Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
          },
        ),
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          image: DecorationImage(
            image: NetworkImage(
              'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            ),
            fit: BoxFit.cover,
            colorFilter: ColorFilter.mode(
              Colors.black.withValues(alpha: 0.5),
              BlendMode.darken,
            ),
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo ve Başlık
                  Column(
                    children: [
                      Icon(
                        Icons.bakery_dining,
                        size: 80,
                        color: Colors.white,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'EkmekLab',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 1.5,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Hesabınıza Giriş Yapın',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 32),

                  // Giriş Formu
                  Container(
                    width: screenSize.width > 600 ? 400 : screenSize.width * 0.85,
                    padding: EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: isDarkMode
                          ? Colors.grey[900]!.withValues(alpha: 0.9)
                          : Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 10,
                          offset: Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Hata Mesajı
                        if (_errorMessage != null)
                          Container(
                            padding: EdgeInsets.all(12),
                            margin: EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: Colors.red[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red[200]!),
                            ),
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(color: Colors.red[800]),
                            ),
                          ),

                        // Giriş Formu
                        Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // E-posta
                              TextFormField(
                                controller: _emailController,
                                decoration: InputDecoration(
                                  labelText: 'E-posta',
                                  prefixIcon: Icon(Icons.email),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  filled: true,
                                  fillColor: isDarkMode ? Colors.grey[800] : Colors.grey[100],
                                ),
                                keyboardType: TextInputType.emailAddress,
                                autofillHints: const [AutofillHints.email, AutofillHints.username],
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Lütfen e-posta adresinizi girin';
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: 16),

                              // Şifre
                              TextFormField(
                                controller: _passwordController,
                                decoration: InputDecoration(
                                  labelText: 'Şifre',
                                  prefixIcon: Icon(Icons.lock),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePassword ? Icons.visibility : Icons.visibility_off,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _obscurePassword = !_obscurePassword;
                                      });
                                    },
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  filled: true,
                                  fillColor: isDarkMode ? Colors.grey[800] : Colors.grey[100],
                                ),
                                obscureText: _obscurePassword,
                                autofillHints: const [AutofillHints.password],
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Lütfen şifrenizi girin';
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: 8),

                              // Beni Hatırla ve Şifremi Unuttum
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  // Beni Hatırla Checkbox
                                  Row(
                                    children: [
                                      Checkbox(
                                        value: _rememberMe,
                                        onChanged: (value) {
                                          setState(() {
                                            _rememberMe = value ?? true;
                                          });
                                        },
                                        activeColor: AppTheme.primaryColor,
                                      ),
                                      Text(
                                        'Beni Hatırla',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isDarkMode ? Colors.grey[300] : Colors.grey[700],
                                        ),
                                      ),
                                    ],
                                  ),
                                  // Şifremi Unuttum
                                  TextButton(
                                    onPressed: () {
                                      Navigator.of(context).pushNamed('/forgot-password');
                                    },
                                    child: Text('Şifremi Unuttum'),
                                  ),
                                ],
                              ),
                              SizedBox(height: 16),

                              // Giriş Yap Butonu
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _isLoading ? null : _login,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primaryColor,
                                    foregroundColor: Colors.white,
                                    padding: EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    elevation: 2,
                                  ),
                                  child: _isLoading
                                      ? SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                            color: Colors.white,
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : Text(
                                          'Giriş Yap',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                ),
                              ),
                              SizedBox(height: 16),

                              // Ayırıcı
                              Row(
                                children: [
                                  Expanded(child: Divider(thickness: 1)),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                                    child: Text('veya', style: TextStyle(color: Colors.grey[600])),
                                  ),
                                  Expanded(child: Divider(thickness: 1)),
                                ],
                              ),
                              SizedBox(height: 12),

                              // Google ile devam et
                              OutlinedButton.icon(
                                onPressed: _isLoading
                                    ? null
                                    : () async {
                                        setState(() => _isLoading = true);
                                        try {
                                          final authService =
                                              Provider.of<AuthService>(context, listen: false);
                                          final success = await authService.signInWithGoogle();
                                          if (success && mounted) {
                                            // CartProvider'a user ID bildir
                                            final cartProvider =
                                                Provider.of<CartProvider>(context, listen: false);
                                            cartProvider.setUserId(authService.currentUser?.id);

                                            // FCM Token'ı kaydet (push notification için)
                                            if (authService.currentUser?.id != null) {
                                              try {
                                                final notificationService = NotificationService();
                                                await notificationService.getFcmToken(
                                                  userId: authService.currentUser!.id,
                                                );
                                                Logger.info('FCM Token (Google Sign-In) kaydedildi');
                                              } catch (e) {
                                                Logger.error('FCM Token kaydedilirken hata: $e');
                                              }
                                            }

                                            Navigator.of(context)
                                                .pushNamedAndRemoveUntil('/', (route) => false);
                                          }
                                        } catch (e) {
                                          if (mounted) {
                                            final message =
                                                e.toString().replaceFirst('Exception: ', '');
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(message),
                                                backgroundColor: Colors.red,
                                                duration: Duration(seconds: 4),
                                              ),
                                            );
                                          }
                                        } finally {
                                          if (mounted) {
                                            setState(() => _isLoading = false);
                                          }
                                        }
                                      },
                                icon: SvgPicture.asset(
                                  'assets/icons/google_logo.svg',
                                  width: 24,
                                  height: 24,
                                ),
                                label: Text(
                                  'Google ile devam et',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                                style: OutlinedButton.styleFrom(
                                  padding: EdgeInsets.symmetric(vertical: 14),
                                  side: BorderSide(color: Colors.redAccent),
                                  foregroundColor: Colors.redAccent,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                              SizedBox(height: 16),

                              // Kayıt Ol Linki
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('Hesabınız yok mu?'),
                                  TextButton(
                                    onPressed: () {
                                      Navigator.of(context)
                                          .pushReplacementNamed(RegisterScreen.routeName);
                                    },
                                    child: Text('Kayıt Ol'),
                                  ),
                                ],
                              ),

                              // Anasayfaya Dön Butonu
                              TextButton.icon(
                                onPressed: () {
                                  Navigator.of(context).pushReplacementNamed(HomeScreen.routeName);
                                },
                                icon: Icon(Icons.home),
                                label: Text('Anasayfaya Dön'),
                              ),

                              SizedBox(height: 16),

                              // Gizlilik Politikası ve Kullanım Koşulları
                              Wrap(
                                alignment: WrapAlignment.center,
                                children: [
                                  Text(
                                    'Giriş yaparak ',
                                    style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                                  ),
                                  GestureDetector(
                                    onTap: () => _showTermsDialog(context),
                                    child: Text(
                                      'Kullanım Koşulları',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    ' ve ',
                                    style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                                  ),
                                  GestureDetector(
                                    onTap: () => _showPrivacyDialog(context),
                                    child: Text(
                                      'Gizlilik Politikası',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '\'nı kabul etmiş olursunuz.',
                                    style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
