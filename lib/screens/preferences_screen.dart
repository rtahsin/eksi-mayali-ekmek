// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/user.dart';
import '../providers/notification_position_provider.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/notification_icon.dart';

/// Kullanıcı tercihleri ekranı.
/// Kullanıcının uygulama tercihlerini yönetmesini, kişiselleştirme
/// ayarlarını yapmasını ve dil/para birimi seçimlerini yapmasını sağlar.
class PreferencesScreen extends StatefulWidget {
  static const routeName = '/preferences';

  const PreferencesScreen({Key? key}) : super(key: key);

  @override
  State<PreferencesScreen> createState() => _PreferencesScreenState();
}

class _PreferencesScreenState extends State<PreferencesScreen> {
  bool _isLoading = false;
  late UserPreferences _preferences;

  final List<String> _availableCategories = [
    'Ekmek',
    'Simit',
    'Poğaça',
    'Börek',
    'Kurabiye',
    'Pasta',
    'Tatlı',
    'İçecek',
    'Kahvaltılık',
  ];

  final List<String> _dietaryOptions = [
    'Vejetaryen',
    'Vegan',
    'Glutensiz',
    'Şekersiz',
    'Düşük Karbonhidrat',
    'Yüksek Protein',
  ];

  final List<String> _allergyOptions = [
    'Gluten',
    'Süt',
    'Yumurta',
    'Fındık',
    'Ceviz',
    'Soya',
    'Susam',
  ];

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  /// Kullanıcı tercihlerini yükler
  Future<void> _loadPreferences() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      if (authService.isAuthenticated && authService.currentUser != null) {
        _preferences = authService.currentUser!.preferences;
      } else {
        _preferences = const UserPreferences();
      }
    } catch (e) {
      Logger.error('Tercihler yüklenirken hata: $e');
      _preferences = const UserPreferences();
    }

    setState(() {
      _isLoading = false;
    });
  }

  /// Kullanıcı tercihlerini kaydeder
  Future<void> _savePreferences() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      if (authService.isAuthenticated && authService.currentUser != null) {
        final user = authService.currentUser!;
        final updatedUser = user.updatePreferences(_preferences);

        // Firestore'da kullanıcı belgesini güncelle
        await FirebaseFirestore.instance.collection('users').doc(user.id).update({
          'preferences': _preferences.toJson(),
          'updatedAt': DateTime.now().toIso8601String(),
        });

        Helpers.showSnackBar(
          'Tercihleriniz başarıyla kaydedildi',
          context: context,
          isError: false,
        );
      }
    } catch (e) {
      Logger.error('Tercihler kaydedilirken hata: $e');
      Helpers.showSnackBar(
        'Tercihleriniz kaydedilirken bir hata oluştu',
        context: context,
        isError: true,
      );
    }

    setState(() {
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Tercihleriniz',
        showBackButton: true,
        actions: [
          TextButton.icon(
            onPressed: _savePreferences,
            icon: const Icon(Icons.save),
            label: const Text('Kaydet'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(isDesktop),
                  const SizedBox(height: 24),
                  _buildCategoriesSection(),
                  const SizedBox(height: 24),
                  _buildDietarySection(),
                  const SizedBox(height: 24),
                  _buildAllergiesSection(),
                  const SizedBox(height: 24),
                  _buildOtherPreferencesSection(),
                  const SizedBox(height: 24),
                  _buildNotificationPositionSection(),
                  const SizedBox(height: 24),
                  _buildLanguageAndCurrencySection(),
                  const SizedBox(height: 40),
                  _buildSaveButton(),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  /// Başlık ve açıklama widget'ı
  Widget _buildHeader(bool isDesktop) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Kişiselleştirme Tercihleri',
          style: GoogleFonts.playfairDisplay(
            fontSize: isDesktop ? 32 : 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.textDarkColor,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Size özel öneriler sunabilmemiz için tercihlerinizi belirleyin',
          style: GoogleFonts.poppins(
            fontSize: isDesktop ? 16 : 14,
            color: AppTheme.textDarkColor.withValues(alpha: 0.7),
          ),
        ),
      ],
    );
  }

  /// Kategoriler bölümü
  Widget _buildCategoriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Favori Kategorileriniz'),
        const SizedBox(height: 8),
        _buildCategoryChips(),
      ],
    );
  }

  /// Diyet tercihleri bölümü
  Widget _buildDietarySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Diyet Tercihleriniz'),
        const SizedBox(height: 8),
        _buildDietaryChips(),
      ],
    );
  }

  /// Alerji bilgileri bölümü
  Widget _buildAllergiesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Alerji Bilgileriniz'),
        const SizedBox(height: 8),
        _buildAllergyChips(),
      ],
    );
  }

  /// Diğer tercihler bölümü
  Widget _buildOtherPreferencesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Diğer Tercihler'),
        const SizedBox(height: 16),
        _buildSwitchPreference(
          'Yerel Ürünleri Tercih Et',
          'Yakın çevreden tedarik edilen ürünleri öncelikli göster',
          _preferences.preferLocalProducts,
          (value) {
            setState(() {
              _preferences = _preferences.copyWith(preferLocalProducts: value);
            });
          },
        ),
        const SizedBox(height: 12),
        _buildSwitchPreference(
          'Organik Ürünleri Tercih Et',
          'Organik sertifikalı ürünleri öncelikli göster',
          _preferences.preferOrganicProducts,
          (value) {
            setState(() {
              _preferences = _preferences.copyWith(preferOrganicProducts: value);
            });
          },
        ),
        const SizedBox(height: 12),
        _buildSwitchPreference(
          'Son Görüntülenen Ürünleri Göster',
          'Ana sayfada son baktığınız ürünleri göster',
          _preferences.showRecentlyViewed,
          (value) {
            setState(() {
              _preferences = _preferences.copyWith(showRecentlyViewed: value);
            });
          },
        ),
        const SizedBox(height: 12),
        _buildSwitchPreference(
          'Kişiselleştirilmiş Öneriler',
          'Tercihlerinize göre özel ürün önerileri alın',
          _preferences.enablePersonalizedRecommendations,
          (value) {
            setState(() {
              _preferences = _preferences.copyWith(enablePersonalizedRecommendations: value);
            });
          },
        ),
      ],
    );
  }

  /// Dil ve para birimi bölümü
  Widget _buildLanguageAndCurrencySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Dil ve Para Birimi'),
        const SizedBox(height: 16),
        _buildLanguageDropdown(),
        const SizedBox(height: 12),
        _buildCurrencyDropdown(),
      ],
    );
  }

  /// Kaydet butonu
  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _savePreferences,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : const Text(
                'Tercihleri Kaydet',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }

  /// Bölüm başlığı widget'ı
  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryColor,
      ),
    );
  }

  /// Kategori chip'leri
  Widget _buildCategoryChips() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _availableCategories.map((category) {
        final isSelected = _preferences.favoriteCategories.contains(category);
        return FilterChip(
          label: Text(category),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              if (selected) {
                final updatedCategories = List<String>.from(_preferences.favoriteCategories)
                  ..add(category);
                _preferences = _preferences.copyWith(favoriteCategories: updatedCategories);
              } else {
                final updatedCategories = List<String>.from(_preferences.favoriteCategories)
                  ..remove(category);
                _preferences = _preferences.copyWith(favoriteCategories: updatedCategories);
              }
            });
          },
          selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
          checkmarkColor: AppTheme.primaryColor,
        );
      }).toList(),
    );
  }

  /// Diyet tercihleri chip'leri
  Widget _buildDietaryChips() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _dietaryOptions.map((option) {
        final isSelected = _preferences.dietaryPreferences.contains(option);
        return FilterChip(
          label: Text(option),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              if (selected) {
                final updatedPreferences = List<String>.from(_preferences.dietaryPreferences)
                  ..add(option);
                _preferences = _preferences.copyWith(dietaryPreferences: updatedPreferences);
              } else {
                final updatedPreferences = List<String>.from(_preferences.dietaryPreferences)
                  ..remove(option);
                _preferences = _preferences.copyWith(dietaryPreferences: updatedPreferences);
              }
            });
          },
          selectedColor: Colors.green.withValues(alpha: 0.2),
          checkmarkColor: Colors.green,
        );
      }).toList(),
    );
  }

  /// Alerji bilgileri chip'leri
  Widget _buildAllergyChips() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _allergyOptions.map((option) {
        final isSelected = _preferences.allergyInformation.contains(option);
        return FilterChip(
          label: Text(option),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              if (selected) {
                final updatedAllergies = List<String>.from(_preferences.allergyInformation)
                  ..add(option);
                _preferences = _preferences.copyWith(allergyInformation: updatedAllergies);
              } else {
                final updatedAllergies = List<String>.from(_preferences.allergyInformation)
                  ..remove(option);
                _preferences = _preferences.copyWith(allergyInformation: updatedAllergies);
              }
            });
          },
          selectedColor: Colors.red.withValues(alpha: 0.2),
          checkmarkColor: Colors.red,
        );
      }).toList(),
    );
  }

  /// Switch tercihi widget'ı
  Widget _buildSwitchPreference(
    String title,
    String subtitle,
    bool value,
    Function(bool) onChanged,
  ) {
    return Card(
      elevation: 0,
      color: Colors.grey.shade100,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: SwitchListTile(
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w500,
          ),
        ),
        subtitle: Text(subtitle),
        value: value,
        onChanged: onChanged,
        activeColor: AppTheme.primaryColor,
      ),
    );
  }

  /// Dil seçimi dropdown'ı
  Widget _buildLanguageDropdown() {
    return Card(
      elevation: 0,
      color: Colors.grey.shade100,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: DropdownButtonFormField<String>(
          decoration: const InputDecoration(
            labelText: 'Dil',
            border: InputBorder.none,
          ),
          value: _preferences.preferredLanguage,
          items: const [
            DropdownMenuItem(value: 'tr', child: Text('Türkçe')),
            DropdownMenuItem(value: 'en', child: Text('English')),
            DropdownMenuItem(value: 'de', child: Text('Deutsch')),
            DropdownMenuItem(value: 'fr', child: Text('Français')),
          ],
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _preferences = _preferences.copyWith(preferredLanguage: value);
              });
            }
          },
        ),
      ),
    );
  }

  /// Para birimi seçimi dropdown'ı
  Widget _buildCurrencyDropdown() {
    return Card(
      elevation: 0,
      color: Colors.grey.shade100,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: DropdownButtonFormField<String>(
          decoration: const InputDecoration(
            labelText: 'Para Birimi',
            border: InputBorder.none,
          ),
          value: _preferences.preferredCurrency,
          items: const [
            DropdownMenuItem(value: 'TRY', child: Text('Türk Lirası (₺)')),
            DropdownMenuItem(value: 'USD', child: Text('US Dollar (\$)')),
            DropdownMenuItem(value: 'EUR', child: Text('Euro (€)')),
            DropdownMenuItem(value: 'GBP', child: Text('British Pound (£)')),
          ],
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _preferences = _preferences.copyWith(preferredCurrency: value);
              });
            }
          },
        ),
      ),
    );
  }

  /// Bildirim simgesi konumu bölümü
  Widget _buildNotificationPositionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Bildirim Simgesi Konumu'),
        const SizedBox(height: 16),
        _buildNotificationPositionSelector(),
      ],
    );
  }

  /// Bildirim simgesi konum seçici
  Widget _buildNotificationPositionSelector() {
    final notificationPositionProvider = Provider.of<NotificationPositionProvider>(context);
    final currentPosition = notificationPositionProvider.position;

    return Column(
      children: [
        ListTile(
          title: const Text('Appbar Başı (Sol)'),
          subtitle: const Text('Bildirim simgesi appbar\'ın başında gösterilir'),
          leading: Radio<NotificationIconPosition>(
            value: NotificationIconPosition.start,
            groupValue: currentPosition,
            onChanged: (NotificationIconPosition? value) {
              if (value != null) {
                notificationPositionProvider.setPosition(value);
              }
            },
          ),
          trailing: const NotificationIcon(
            position: NotificationIconPosition.start,
            badgeColor: Colors.red,
          ),
        ),
        ListTile(
          title: const Text('Appbar Sonu (Sağ)'),
          subtitle: const Text('Bildirim simgesi appbar\'ın sonunda gösterilir'),
          leading: Radio<NotificationIconPosition>(
            value: NotificationIconPosition.end,
            groupValue: currentPosition,
            onChanged: (NotificationIconPosition? value) {
              if (value != null) {
                notificationPositionProvider.setPosition(value);
              }
            },
          ),
          trailing: const NotificationIcon(
            position: NotificationIconPosition.end,
            badgeColor: Colors.red,
          ),
        ),
        ListTile(
          title: const Text('Özel Konum'),
          subtitle: const Text('Bildirim simgesi özel bir konumda gösterilir'),
          leading: Radio<NotificationIconPosition>(
            value: NotificationIconPosition.custom,
            groupValue: currentPosition,
            onChanged: (NotificationIconPosition? value) {
              if (value != null) {
                notificationPositionProvider.setPosition(value);
              }
            },
          ),
          trailing: const NotificationIcon(
            position: NotificationIconPosition.custom,
            badgeColor: Colors.red,
          ),
        ),
      ],
    );
  }
}
