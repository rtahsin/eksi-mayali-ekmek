import 'package:flutter/material.dart';

import '../../models/settings/store_settings.dart';
import '../../services/settings_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../../widgets/admin_app_bar.dart';
import '../../widgets/snackbar_helper.dart';

/// Admin panelinde mağaza ayarlarını düzenleme ekranı
class AdminSettingsScreen extends StatefulWidget {
  static const routeName = '/admin/settings';

  const AdminSettingsScreen({Key? key}) : super(key: key);

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _storeNameController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  // Sosyal medya link kontrolleri
  final _instagramController = TextEditingController();
  final _facebookController = TextEditingController();
  final _twitterController = TextEditingController();
  final _youtubeController = TextEditingController();
  final _whatsappController = TextEditingController();

  bool _isLoading = true;
  bool _maintenanceMode = false;

  final SettingsService _settingsService = SettingsService();

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _storeNameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _instagramController.dispose();
    _facebookController.dispose();
    _twitterController.dispose();
    _youtubeController.dispose();
    _whatsappController.dispose();
    super.dispose();
  }

  /// Mağaza ayarlarını yükler
  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final settings = await _settingsService.loadStoreSettings();

      // Form kontrollerine değerleri atayalım
      _storeNameController.text = settings.storeName;
      _addressController.text = settings.address;
      _phoneController.text = settings.phone;
      _emailController.text = settings.email;
      _maintenanceMode = settings.maintenanceMode;

      // Sosyal medya bağlantılarını atayalım
      final socialLinks = settings.socialMediaLinks ?? {};
      _instagramController.text = socialLinks['instagram'] ?? '';
      _facebookController.text = socialLinks['facebook'] ?? '';
      _twitterController.text = socialLinks['twitter'] ?? '';
      _youtubeController.text = socialLinks['youtube'] ?? '';
      _whatsappController.text = socialLinks['whatsapp'] ?? '';
    } catch (e) {
      Logger.error('Ayarlar yüklenirken hata: $e');
      if (mounted) {
        SnackbarHelper.showErrorSnackbar(
            context, 'Ayarlar yüklenirken bir hata oluştu');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  /// Ayarları kaydeder
  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Sosyal medya bağlantılarını oluşturalım
      final socialMediaLinks = {
        'instagram': _instagramController.text.trim(),
        'facebook': _facebookController.text.trim(),
        'twitter': _twitterController.text.trim(),
        'youtube': _youtubeController.text.trim(),
        'whatsapp': _whatsappController.text.trim(),
      };

      // Tüm boş değerleri kaldıralım
      socialMediaLinks.removeWhere((key, value) => value.isEmpty);

      // Mağaza ayarlarını oluşturalım
      final settings = StoreSettings(
        storeName: _storeNameController.text,
        address: _addressController.text,
        phone: _phoneController.text,
        email: _emailController.text,
        workingHours: _settingsService.storeSettings.workingHours,
        maintenanceMode: _maintenanceMode,
        currencySymbol: _settingsService.storeSettings.currencySymbol,
        socialMediaLinks: socialMediaLinks,
      );

      // Ayarları kaydedelim
      await _settingsService.saveStoreSettings(settings);

      if (mounted) {
        SnackbarHelper.showSuccessSnackbar(
            context, 'Ayarlar başarıyla kaydedildi');
      }
    } catch (e) {
      Logger.error('Ayarlar kaydedilirken hata: $e');
      if (mounted) {
        SnackbarHelper.showErrorSnackbar(
            context, 'Ayarlar kaydedilirken bir hata oluştu');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AdminAppBar(title: 'Mağaza Ayarları'),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildSettingsForm(),
      floatingActionButton: FloatingActionButton(
        onPressed: _saveSettings,
        child: const Icon(Icons.save),
      ),
    );
  }

  Widget _buildSettingsForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Genel Ayarlar Bölümü
            Card(
              margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spaceLg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Genel Ayarlar',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Divider(),
                    TextFormField(
                      controller: _storeNameController,
                      decoration: const InputDecoration(
                        labelText: 'Mağaza Adı',
                        hintText: 'Ekşi Mayalı Ekmek',
                        icon: Icon(Icons.store),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Mağaza adı boş olamaz';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _addressController,
                      decoration: const InputDecoration(
                        labelText: 'Adres',
                        hintText: 'İstanbul, Türkiye',
                        icon: Icon(Icons.location_on),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Adres boş olamaz';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phoneController,
                      decoration: const InputDecoration(
                        labelText: 'Telefon',
                        hintText: '+90 555 123 4567',
                        icon: Icon(Icons.phone),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Telefon boş olamaz';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'E-posta',
                        hintText: 'info@eksimayaliekmek.com',
                        icon: Icon(Icons.email),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'E-posta boş olamaz';
                        }
                        if (!value.contains('@')) {
                          return 'Geçerli bir e-posta adresi girin';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    SwitchListTile(
                      title: const Text('Bakım Modu'),
                      subtitle: const Text(
                        'Etkinleştirildiğinde site bakım modu mesajı gösterecektir',
                      ),
                      value: _maintenanceMode,
                      onChanged: (value) {
                        setState(() {
                          _maintenanceMode = value;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),

            // Sosyal Medya Bağlantıları Bölümü
            Card(
              margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spaceLg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Sosyal Medya Bağlantıları',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Divider(),
                    TextFormField(
                      controller: _instagramController,
                      decoration: const InputDecoration(
                        labelText: 'Instagram URL',
                        hintText: 'https://instagram.com/eksimayaliekmek',
                        icon: Icon(Icons.camera_alt),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _facebookController,
                      decoration: const InputDecoration(
                        labelText: 'Facebook URL',
                        hintText: 'https://facebook.com/eksimayaliekmek',
                        icon: Icon(Icons.facebook),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _twitterController,
                      decoration: const InputDecoration(
                        labelText: 'Twitter URL',
                        hintText: 'https://twitter.com/eksimayaliekmek',
                        icon: Icon(Icons.telegram),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _youtubeController,
                      decoration: const InputDecoration(
                        labelText: 'YouTube Kanal URL',
                        hintText: 'https://youtube.com/c/eksimayaliekmek',
                        icon: Icon(Icons.video_library),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _whatsappController,
                      decoration: const InputDecoration(
                        labelText: 'WhatsApp Telefon Numarası',
                        hintText: '+905551234567 (ülke kodu ile)',
                        icon: Icon(Icons.message),
                      ),
                      validator: (value) {
                        if (value != null && value.isNotEmpty) {
                          if (!value.startsWith('+')) {
                            return 'Numara + ile başlamalı (örn: +905551234567)';
                          }
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 60), // FloatingActionButton için boşluk
          ],
        ),
      ),
    );
  }
}
