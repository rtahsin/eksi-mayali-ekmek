// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, avoid_print

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:get_it/get_it.dart';
import 'package:provider/provider.dart';

import '../../../services/auth_service.dart';
import '../../../theme/app_theme.dart';
import '../../../utils/logger.dart';

class AdminLoginPage extends StatefulWidget {
  const AdminLoginPage({Key? key}) : super(key: key);

  @override
  State<AdminLoginPage> createState() => _AdminLoginPageState();
}

class _AdminLoginPageState extends State<AdminLoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordFocusNode = FocusNode();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _rememberMe = true;

  @override
  void initState() {
    super.initState();
    // Saved credentials'ı yükle
    _loadSavedCredentials();

    Logger.info("Admin giriş sayfası yüklenme");
    _checkCurrentUser();

    // Otomatik girişi dene
    _tryAutoLogin();
  }

  // Kaydedilmiş giriş bilgilerini yükle
  Future<void> _loadSavedCredentials() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      // Sadece email'i yükle
      final savedEmail = await authService.getSavedEmail();
      if (savedEmail != null && savedEmail.isNotEmpty) {
        setState(() {
          _emailController.text = savedEmail;
        });
      }
    } catch (e) {
      print("Kaydedilmiş bilgileri yüklerken hata: $e");
    }
  }

  // Otomatik girişi dene - Şu an devre dışı
  Future<void> _tryAutoLogin() async {
    // Otomatik giriş özelliği devre dışı bırakıldı
    return;
  }

  // Mevcut giriş yapmış kullanıcıyı kontrol et
  Future<void> _checkCurrentUser() async {
    // Admin paneli için ayrı bir giriş kullanacağız, normal kullanıcı girişi ile bağlantısı olmayacak
    print("Admin giriş sayfası yüklenme");
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _passwordFocusNode.dispose();
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
      Logger.info("Admin giriş denenecek: ${_emailController.text.trim()}");

      // Provider yerine GetIt ile service'i al (AdminApp da GetIt kullanıyor)
      final authService = GetIt.I<AuthService>();

      final success = await authService.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      Logger.info("Admin giriş denemesi sonucu: $success");

      if (!success) {
        setState(() {
          _errorMessage = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
          _isLoading = false;
        });
        return;
      }

      Logger.info("Admin yetkisi kontrol ediliyor: ${authService.isAdmin}");

      if (!authService.isAdmin) {
        setState(() {
          _errorMessage = 'Bu hesap yönetici yetkisine sahip değil.';
          _isLoading = false;
        });
        await authService.logout();
        return;
      }

      // "Beni Hatırla" sadece email'i kaydeder
      if (_rememberMe) {
        await authService.saveEmail(_emailController.text.trim());
      } else {
        await authService.clearSavedEmail();
      }

      Logger.info("Admin olarak giriş başarılı: ${authService.currentUser?.email}");
      Logger.info("Yönlendirilecek rota: /admin");

      // Doğrudan admin paneline yönlendir
      if (!mounted) return;

      // Kısa bir bekleme ile geçiş yapalım
      setState(() {
        _isLoading = false; // Geçiş öncesi yükleniyor durumunu kapat
      });

      // BuildContext kullanımı ile ilgili sorunları önlemek için
      // Future.microtask kullanarak UI thread'ini bekletmeden yönlendirme yap
      Future.microtask(() {
        Navigator.of(context).pushNamedAndRemoveUntil('/admin', (route) => false);
      });
    } catch (e) {
      Logger.error("Admin giriş hatası: $e");
      setState(() {
        _errorMessage = 'Bir hata oluştu: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.primaryColor.withValues(alpha: 0.05),
              AppTheme.primaryColor.withValues(alpha: 0.1),
            ],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo ve başlık
                  Card(
                    elevation: 8,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Container(
                      width: 450,
                      padding: EdgeInsets.all(32),
                      child: Column(
                        children: [
                          // Logo
                          CircleAvatar(
                            radius: 40,
                            backgroundColor: AppTheme.primaryColor,
                            child: Text(
                              'E',
                              style: TextStyle(
                                fontSize: 36,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ).animate().scale(
                                duration: 400.ms,
                                curve: Curves.easeOutBack,
                              ),
                          SizedBox(height: 24),
                          Text(
                            'Ekşi Mayalı Ekmek',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                          ).animate().fadeIn(
                                duration: 500.ms,
                                delay: 200.ms,
                              ),
                          SizedBox(height: 8),
                          Text(
                            'Yönetici Paneli',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey[600],
                            ),
                          ).animate().fadeIn(
                                duration: 500.ms,
                                delay: 400.ms,
                              ),
                          SizedBox(height: 32),

                          // Hata mesajı
                          if (_errorMessage != null)
                            Container(
                              padding: EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red[50],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: Colors.red[200]!,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.error_outline,
                                    color: Colors.red,
                                  ),
                                  SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: TextStyle(
                                        color: Colors.red[800],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ).animate().shake(
                                  duration: 300.ms,
                                ),

                          SizedBox(height: _errorMessage != null ? 24 : 0),

                          // Form
                          Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Email
                                TextFormField(
                                  controller: _emailController,
                                  decoration: InputDecoration(
                                    labelText: 'E-posta',
                                    hintText: 'admin@example.com',
                                    prefixIcon: Icon(Icons.email_outlined),
                                  ),
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  onEditingComplete: () {
                                    FocusScope.of(context).requestFocus(_passwordFocusNode);
                                  },
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Lütfen e-posta adresinizi girin';
                                    }
                                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                                        .hasMatch(value)) {
                                      return 'Geçerli bir e-posta adresi girin';
                                    }
                                    return null;
                                  },
                                ).animate().fadeIn(
                                      duration: 500.ms,
                                      delay: 600.ms,
                                    ),
                                SizedBox(height: 16),

                                // Şifre
                                TextFormField(
                                  focusNode: _passwordFocusNode,
                                  controller: _passwordController,
                                  decoration: InputDecoration(
                                    labelText: 'Şifre',
                                    prefixIcon: Icon(Icons.lock_outline),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscurePassword = !_obscurePassword;
                                        });
                                      },
                                    ),
                                  ),
                                  obscureText: _obscurePassword,
                                  textInputAction: TextInputAction.done,
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Lütfen şifrenizi girin';
                                    }
                                    if (value.length < 6) {
                                      return 'Şifre en az 6 karakter olmalıdır';
                                    }
                                    return null;
                                  },
                                  onEditingComplete: () {
                                    if (!_isLoading) {
                                      _login();
                                    }
                                  },
                                  onFieldSubmitted: (_) {
                                    if (!_isLoading) {
                                      _login();
                                    }
                                  },
                                ).animate().fadeIn(
                                      duration: 500.ms,
                                      delay: 800.ms,
                                    ),
                                SizedBox(height: 24),

                                // Giriş butonu
                                ElevatedButton(
                                  onPressed: _isLoading ? null : _login,
                                  style: ElevatedButton.styleFrom(
                                    padding: EdgeInsets.symmetric(vertical: 16),
                                    backgroundColor: AppTheme.primaryColor,
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor:
                                        AppTheme.primaryColor.withValues(alpha: 0.5),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
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
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                ).animate().fadeIn(
                                      duration: 500.ms,
                                      delay: 1000.ms,
                                    ),
                                SizedBox(height: 12),

                                // Beni Hatırla - Otomatik Giriş
                                CheckboxListTile(
                                  value: _rememberMe,
                                  onChanged: (value) {
                                    setState(() {
                                      _rememberMe = value ?? true;
                                    });
                                  },
                                  title: Text('Beni Hatırla'),
                                  subtitle: Text(
                                    'Bir dahaki sefere otomatik giriş yap',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                  controlAffinity: ListTileControlAffinity.leading,
                                  contentPadding: EdgeInsets.zero,
                                ).animate().fadeIn(
                                      duration: 500.ms,
                                      delay: 1100.ms,
                                    ),
                                SizedBox(height: 16),

                                // Ana sayfaya dön
                                TextButton(
                                  onPressed: () {
                                    Navigator.of(context)
                                        .pushNamedAndRemoveUntil('/', (route) => false);
                                  },
                                  child: Text('Ana Sayfaya Dön'),
                                ).animate().fadeIn(
                                      duration: 500.ms,
                                      delay: 1200.ms,
                                    ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 24),
                  Text(
                    'Ekşi Mayalı Ekmek © ${DateTime.now().year}',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ).animate().fadeIn(
                        duration: 500.ms,
                        delay: 1400.ms,
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
