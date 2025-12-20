// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, unused_field, unused_element, unused_local_variable

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import 'email_verification_screen.dart';
import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  static const routeName = '/register';

  const RegisterScreen({Key? key}) : super(key: key);

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _acceptTerms = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _togglePasswordVisibility() {
    setState(() {
      _obscurePassword = !_obscurePassword;
    });
  }

  void _toggleConfirmPasswordVisibility() {
    setState(() {
      _obscureConfirmPassword = !_obscureConfirmPassword;
    });
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate() || !_acceptTerms) {
      if (!_acceptTerms) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lütfen kullanım koşullarını kabul edin.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      Logger.info('Kayıt başlıyor ad=${_nameController.text} email=${_emailController.text}');

      final authService = Provider.of<AuthService>(context, listen: false);
      final success = await authService.register(
        _emailController.text.trim(),
        _passwordController.text.trim(),
        _nameController.text.trim(),
      );

      if (success) {
        Logger.info('Kayıt başarılı doğrulama ekranına yönlendiriliyor');
        if (!mounted) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => EmailVerificationScreen(email: _emailController.text.trim()),
          ),
        );
      } else {
        Logger.warning('Kayıt başarısız');
        setState(() {
          _errorMessage = 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.';
          _isLoading = false;
        });
      }
    } catch (error) {
      Logger.error('Kayıt hatası: $error');
      setState(() {
        _errorMessage = error.toString();
        _isLoading = false;
      });
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
    final authService = Provider.of<AuthService>(context);
    final theme = Theme.of(context);
    final screenSize = MediaQuery.of(context).size;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('Kayıt Ol'),
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo ve Başlık
                Column(
                  children: [
                    Image.asset(
                      'assets/images/logo.png',
                      height: 100,
                      errorBuilder: (context, error, stackTrace) {
                        Logger.warning('Logo yüklenme hatası: $error');
                        return Icon(
                          Icons.bakery_dining,
                          size: 80,
                          color: AppTheme.primaryColor,
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'EkmekLab',
                      style: GoogleFonts.playfairDisplay(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Yeni Hesap Oluşturun',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.grey[700],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Form Container
                Container(
                  width: screenSize.width > 600 ? 450 : screenSize.width * 0.9,
                  padding: const EdgeInsets.all(24),
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

                      // Kayıt Formu
                      Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Ad Soyad
                            TextFormField(
                              controller: _nameController,
                              decoration: InputDecoration(
                                labelText: 'Ad Soyad',
                                hintText: 'Adınız ve soyadınız',
                                prefixIcon: Icon(Icons.person_outline),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                filled: true,
                                fillColor: isDarkMode ? Colors.grey[800] : Colors.grey[100],
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Lütfen adınızı ve soyadınızı girin';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // E-posta
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: InputDecoration(
                                labelText: 'E-posta',
                                hintText: 'ornek@mail.com',
                                prefixIcon: Icon(Icons.email_outlined),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                filled: true,
                                fillColor: isDarkMode ? Colors.grey[800] : Colors.grey[100],
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Lütfen e-posta adresinizi girin';
                                }
                                if (!value.contains('@') || !value.contains('.')) {
                                  return 'Geçerli bir e-posta adresi girin';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Şifre
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              decoration: InputDecoration(
                                labelText: 'Şifre',
                                prefixIcon: Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                  onPressed: _togglePasswordVisibility,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                filled: true,
                                fillColor: isDarkMode ? Colors.grey[800] : Colors.grey[100],
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Lütfen şifrenizi girin';
                                }
                                if (value.length < 6) {
                                  return 'Şifre en az 6 karakter olmalıdır';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Şifre Tekrar
                            TextFormField(
                              controller: _confirmPasswordController,
                              obscureText: _obscureConfirmPassword,
                              decoration: InputDecoration(
                                labelText: 'Şifre Tekrar',
                                prefixIcon: Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscureConfirmPassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                  onPressed: _toggleConfirmPasswordVisibility,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                filled: true,
                                fillColor: isDarkMode ? Colors.grey[800] : Colors.grey[100],
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Lütfen şifrenizi tekrar girin';
                                }
                                if (value != _passwordController.text) {
                                  return 'Şifreler eşleşmiyor';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Kullanım Koşulları
                            Row(
                              children: [
                                Checkbox(
                                  value: _acceptTerms,
                                  onChanged: (value) {
                                    setState(() {
                                      _acceptTerms = value ?? false;
                                    });
                                  },
                                ),
                                Expanded(
                                  child: Wrap(
                                    children: [
                                      Text(
                                        'Kullanım koşullarını ve gizlilik politikasını kabul ediyorum ',
                                        style: TextStyle(fontSize: 14),
                                      ),
                                      GestureDetector(
                                        onTap: () => _showTermsDialog(context),
                                        child: Text(
                                          'Kullanım Koşulları',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: AppTheme.primaryColor,
                                            fontWeight: FontWeight.bold,
                                            decoration: TextDecoration.underline,
                                          ),
                                        ),
                                      ),
                                      Text(' ve ', style: TextStyle(fontSize: 14)),
                                      GestureDetector(
                                        onTap: () => _showPrivacyDialog(context),
                                        child: Text(
                                          'Gizlilik Politikası',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: AppTheme.primaryColor,
                                            fontWeight: FontWeight.bold,
                                            decoration: TextDecoration.underline,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            // Kayıt Ol Butonu
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _register,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryColor,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
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
                                        'Kayıt Ol',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.white,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(height: 24),

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
                            const SizedBox(height: 12),

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
                            const SizedBox(height: 24),

                            // Giriş Yap Linki
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Zaten hesabınız var mı?'),
                                TextButton(
                                  onPressed: () {
                                    Navigator.of(context)
                                        .pushReplacementNamed(LoginScreen.routeName);
                                  },
                                  child: Text('Giriş Yap'),
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
    );
  }
}
