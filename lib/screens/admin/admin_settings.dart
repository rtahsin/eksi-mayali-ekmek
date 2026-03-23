// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, unused_field, unused_element, unused_local_variable

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../models/settings/store_settings.dart';
import '../../services/settings_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminSettings extends StatefulWidget {
  const AdminSettings({Key? key}) : super(key: key);

  @override
  State<AdminSettings> createState() => _AdminSettingsState();
}

class _AdminSettingsState extends State<AdminSettings> {
  final SettingsService _settingsService = SettingsService();

  // Form için controller'lar
  final TextEditingController _storeNameController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _seoTitleController = TextEditingController();
  final TextEditingController _seoDescriptionController = TextEditingController();
  final TextEditingController _seoKeywordsController = TextEditingController();

  // Formun durumu
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;

  // Ayarlar değişkenleri
  bool _notificationsEnabled = true;
  bool _darkModeEnabled = false;
  bool _maintenanceMode = false;
  String _selectedLanguage = 'Türkçe';
  final List<String> _languages = ['Türkçe', 'English', 'Deutsch', 'Français'];

  // Çalışma saatleri
  final List<TextEditingController> _workingHoursControllers = [];

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    // Controller'ları dispose et
    _storeNameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _seoTitleController.dispose();
    _seoDescriptionController.dispose();
    _seoKeywordsController.dispose();

    // Çalışma saatleri controller'larını dispose et
    for (var controller in _workingHoursControllers) {
      controller.dispose();
    }

    super.dispose();
  }

  /// Ayarları yükler
  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      StoreSettings settings = await _settingsService.loadStoreSettings();

      // Form controller'larını ayarla
      _storeNameController.text = settings.storeName;
      _addressController.text = settings.address;
      _phoneController.text = settings.phone;
      _emailController.text = settings.email;
      _seoTitleController.text = settings.seoTitle ?? '';
      _seoDescriptionController.text = settings.seoDescription ?? '';
      _seoKeywordsController.text = settings.seoKeywords ?? '';

      // Çalışma saatleri controller'larını ayarla
      _workingHoursControllers.clear();
      for (var hour in settings.workingHours) {
        _workingHoursControllers.add(TextEditingController(text: hour));
      }

      // 3 satırdan az çalışma saati varsa, yeni satırlar ekle
      while (_workingHoursControllers.length < 3) {
        _workingHoursControllers.add(TextEditingController());
      }

      // Diğer ayarları ayarla
      setState(() {
        _maintenanceMode = settings.maintenanceMode;
        _isLoading = false;
      });

      Logger.info('Ayarlar başarıyla yüklendi');
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Ayarlar yüklenirken bir hata oluştu: $e';
      });
      Logger.error('Ayarlar yüklenirken hata: $e');
    }
  }

  /// Ayarları kaydeder
  Future<void> _saveSettings() async {
    // Form doğrulama
    if (_storeNameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Mağaza adı boş olamaz')),
      );
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      // Çalışma saatlerini filtrele (boş olmayanları al)
      List<String> workingHours = _workingHoursControllers
          .map((controller) => controller.text)
          .where((text) => text.isNotEmpty)
          .toList();

      // StoreSettings nesnesini oluştur
      StoreSettings settings = StoreSettings(
        id: _settingsService.storeSettings.id,
        storeName: _storeNameController.text,
        address: _addressController.text,
        phone: _phoneController.text,
        email: _emailController.text,
        logoUrl: _settingsService.storeSettings.logoUrl,
        workingHours: workingHours,
        maintenanceMode: _maintenanceMode,
        currencySymbol: _settingsService.storeSettings.currencySymbol,
        seoTitle: _seoTitleController.text.isEmpty ? null : _seoTitleController.text,
        seoDescription:
            _seoDescriptionController.text.isEmpty ? null : _seoDescriptionController.text,
        seoKeywords: _seoKeywordsController.text.isEmpty ? null : _seoKeywordsController.text,
        socialMediaLinks: _settingsService.storeSettings.socialMediaLinks,
      );

      // Ayarları kaydet
      await _settingsService.saveStoreSettings(settings);

      setState(() {
        _isSaving = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ayarlar başarıyla kaydedildi'),
          backgroundColor: Colors.green,
        ),
      );

      Logger.info('Ayarlar başarıyla kaydedildi');
    } catch (e) {
      setState(() {
        _isSaving = false;
        _errorMessage = 'Ayarlar kaydedilirken bir hata oluştu: $e';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ayarlar kaydedilirken bir hata oluştu'),
          backgroundColor: Colors.red,
        ),
      );

      Logger.error('Ayarlar kaydedilirken hata: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Ekran boyutuna göre responsive tasarım için değişkenler
    final Size screenSize = MediaQuery.of(context).size;
    final bool isSmallScreen = screenSize.width < 600;
    final bool isMediumScreen = screenSize.width >= 600 && screenSize.width < 900;
    final bool isLargeScreen = screenSize.width >= 900;

    // Responsive değerler
    final double contentPadding = isSmallScreen ? 12.0 : 16.0;
    final double cardElevation = isSmallScreen ? 1.0 : 2.0;
    final double inputSpacing = isSmallScreen ? 12.0 : 16.0;
    final double sectionSpacing = isSmallScreen ? 16.0 : 24.0;

    return Scaffold(
      body: _isLoading
          ? _buildLoadingView()
          : _errorMessage != null
              ? _buildErrorView()
              : SingleChildScrollView(
                  padding: EdgeInsets.all(contentPadding),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Başlık
                      Text(
                        'Ayarlar',
                        style: TextStyle(
                          fontSize: isSmallScreen ? 20 : 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ).animate().fadeIn(duration: 600.ms).slideY(
                            begin: 0.2,
                            end: 0,
                            curve: Curves.easeOutQuad,
                            duration: 600.ms,
                          ),

                      SizedBox(height: sectionSpacing),

                      // Mağaza Bilgileri
                      _buildSectionTitle('Mağaza Bilgileri', isSmallScreen),

                      Card(
                        elevation: cardElevation,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(contentPadding),
                          child: Column(
                            children: [
                              TextFormField(
                                controller: _storeNameController,
                                decoration: InputDecoration(
                                  labelText: 'Mağaza Adı',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: AppTheme.spaceMd,
                                    vertical: isSmallScreen ? AppTheme.spaceSm : AppTheme.spaceLg,
                                  ),
                                ),
                              ),
                              SizedBox(height: inputSpacing),
                              TextFormField(
                                controller: _addressController,
                                decoration: InputDecoration(
                                  labelText: 'Adres',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: AppTheme.spaceMd,
                                    vertical: isSmallScreen ? AppTheme.spaceSm : AppTheme.spaceLg,
                                  ),
                                ),
                                maxLines: 2,
                              ),
                              SizedBox(height: inputSpacing),
                              // Mobil görünümde telefon ve e-posta formu için üst üste düzenleme
                              isSmallScreen
                                  ? Column(
                                      children: [
                                        TextFormField(
                                          controller: _phoneController,
                                          decoration: InputDecoration(
                                            labelText: 'Telefon',
                                            border: OutlineInputBorder(),
                                            contentPadding: EdgeInsets.symmetric(
                                              horizontal: AppTheme.spaceMd,
                                              vertical: AppTheme.spaceSm,
                                            ),
                                          ),
                                        ),
                                        SizedBox(height: inputSpacing),
                                        TextFormField(
                                          controller: _emailController,
                                          decoration: InputDecoration(
                                            labelText: 'E-posta',
                                            border: OutlineInputBorder(),
                                            contentPadding: EdgeInsets.symmetric(
                                              horizontal: AppTheme.spaceMd,
                                              vertical: AppTheme.spaceSm,
                                            ),
                                          ),
                                        ),
                                      ],
                                    )
                                  : Row(
                                      children: [
                                        Expanded(
                                          child: TextFormField(
                                            controller: _phoneController,
                                            decoration: InputDecoration(
                                              labelText: 'Telefon',
                                              border: OutlineInputBorder(),
                                              contentPadding: EdgeInsets.symmetric(
                                                horizontal: AppTheme.spaceMd,
                                                vertical: AppTheme.spaceLg,
                                              ),
                                            ),
                                          ),
                                        ),
                                        SizedBox(width: inputSpacing),
                                        Expanded(
                                          child: TextFormField(
                                            controller: _emailController,
                                            decoration: InputDecoration(
                                              labelText: 'E-posta',
                                              border: OutlineInputBorder(),
                                              contentPadding: EdgeInsets.symmetric(
                                                horizontal: AppTheme.spaceMd,
                                                vertical: AppTheme.spaceLg,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(
                            duration: 600.ms,
                            delay: 200.ms,
                          ),

                      SizedBox(height: sectionSpacing),

                      // Çalışma Saatleri
                      _buildSectionTitle('Çalışma Saatleri', isSmallScreen),

                      Card(
                        elevation: cardElevation,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(contentPadding),
                          child: Column(
                            children: [
                              ..._workingHoursControllers.map((controller) {
                                return Padding(
                                  padding: EdgeInsets.only(
                                      bottom: isSmallScreen ? AppTheme.space2xs : AppTheme.spaceXs),
                                  child: TextFormField(
                                    controller: controller,
                                    decoration: InputDecoration(
                                      labelText: 'Çalışma Saati',
                                      hintText: 'Örn: Pazartesi - Cuma: 09:00 - 18:00',
                                      border: OutlineInputBorder(),
                                      contentPadding: EdgeInsets.symmetric(
                                        horizontal: AppTheme.spaceMd,
                                        vertical: isSmallScreen ? AppTheme.spaceSm : AppTheme.spaceLg,
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                              SizedBox(height: inputSpacing / 2),
                              SizedBox(
                                width: isSmallScreen ? double.infinity : null,
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      _workingHoursControllers.add(TextEditingController());
                                    });
                                  },
                                  icon: Icon(Icons.add, size: isSmallScreen ? 16 : 20),
                                  label: Text('Yeni Saat Ekle'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primaryColor,
                                    padding: EdgeInsets.symmetric(
                                        horizontal: isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg,
                                        vertical: isSmallScreen ? AppTheme.spaceXs : AppTheme.spaceMd),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(
                            duration: 600.ms,
                            delay: 400.ms,
                          ),

                      SizedBox(height: sectionSpacing),

                      // SEO Ayarları
                      _buildSectionTitle('SEO Ayarları', isSmallScreen),

                      Card(
                        elevation: cardElevation,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(contentPadding),
                          child: Column(
                            children: [
                              TextFormField(
                                controller: _seoTitleController,
                                decoration: InputDecoration(
                                  labelText: 'SEO Başlık',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: AppTheme.spaceMd,
                                    vertical: isSmallScreen ? AppTheme.spaceSm : AppTheme.spaceLg,
                                  ),
                                ),
                              ),
                              SizedBox(height: inputSpacing),
                              TextFormField(
                                controller: _seoDescriptionController,
                                decoration: InputDecoration(
                                  labelText: 'SEO Açıklama',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: AppTheme.spaceMd,
                                    vertical: isSmallScreen ? AppTheme.spaceSm : AppTheme.spaceLg,
                                  ),
                                ),
                                maxLines: isSmallScreen ? 2 : 3,
                              ),
                              SizedBox(height: inputSpacing),
                              TextFormField(
                                controller: _seoKeywordsController,
                                decoration: InputDecoration(
                                  labelText: 'SEO Anahtar Kelimeler',
                                  hintText: 'Virgülle ayırın',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: AppTheme.spaceMd,
                                    vertical: isSmallScreen ? AppTheme.spaceSm : AppTheme.spaceLg,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(
                            duration: 600.ms,
                            delay: 600.ms,
                          ),

                      SizedBox(height: sectionSpacing),

                      // Sistem Ayarları
                      _buildSectionTitle('Sistem Ayarları', isSmallScreen),

                      Card(
                        elevation: cardElevation,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(contentPadding),
                          child: Column(
                            children: [
                              _buildSettingItemResponsive(
                                icon: Icons.construction,
                                title: 'Bakım Modu',
                                subtitle: 'Siteyi bakım moduna al',
                                trailing: Switch(
                                  value: _maintenanceMode,
                                  onChanged: (value) {
                                    _showMaintenanceModeDialog(value);
                                  },
                                  activeColor: Colors.orange,
                                ),
                                isSmallScreen: isSmallScreen,
                              ),
                              const Divider(),
                              _buildSettingItemResponsive(
                                icon: Icons.backup,
                                title: 'Yedekleme',
                                subtitle: 'Veritabanı yedeklemesi oluştur',
                                trailing: IconButton(
                                  icon: Icon(Icons.play_arrow, size: isSmallScreen ? 20 : 24),
                                  onPressed: () {
                                    _showBackupDialog();
                                  },
                                ),
                                isSmallScreen: isSmallScreen,
                              ),
                              const Divider(),
                              _buildSettingItemResponsive(
                                icon: Icons.delete_sweep,
                                title: 'Önbelleği Temizle',
                                subtitle: 'Uygulama önbelleğini temizle',
                                trailing: IconButton(
                                  icon:
                                      Icon(Icons.cleaning_services, size: isSmallScreen ? 20 : 24),
                                  onPressed: () {
                                    _showClearCacheDialog();
                                  },
                                ),
                                isSmallScreen: isSmallScreen,
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(
                            duration: 600.ms,
                            delay: 800.ms,
                          ),

                      SizedBox(height: sectionSpacing + (isSmallScreen ? 8 : 16)),

                      // Kaydet Butonu - Mobil için tam genişlikte
                      Center(
                        child: SizedBox(
                          width: isSmallScreen ? double.infinity : null,
                          child: ElevatedButton.icon(
                            onPressed: _isSaving ? null : _saveSettings,
                            icon: _isSaving
                                ? SizedBox(
                                    width: isSmallScreen ? 16 : 20,
                                    height: isSmallScreen ? 16 : 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: isSmallScreen ? 1.5 : 2,
                                      color: Colors.white,
                                    ))
                                : Icon(Icons.save, size: isSmallScreen ? 20 : 24),
                            label: Text(_isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              padding: EdgeInsets.symmetric(
                                  horizontal: isSmallScreen ? AppTheme.spaceLg : AppTheme.space3xl,
                                  vertical: isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg),
                              textStyle: TextStyle(
                                fontSize: isSmallScreen ? 14 : 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ).animate().fadeIn(
                            duration: 600.ms,
                            delay: 1000.ms,
                          ),

                      // Mobil için alt boşluk
                      if (isSmallScreen) SizedBox(height: 24),
                    ],
                  ),
                ),
    );
  }

  // Yükleniyor görünümünü responsive hale getirme
  Widget _buildLoadingView() {
    final bool isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            strokeWidth: isSmallScreen ? 3 : 4,
          ),
          SizedBox(height: 16),
          Text(
            'Ayarlar yükleniyor...',
            style: TextStyle(
              fontSize: isSmallScreen ? 14 : 16,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  // Hata görünümünü responsive hale getirme
  Widget _buildErrorView() {
    final bool isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            color: Colors.red,
            size: isSmallScreen ? 38 : 48,
          ),
          SizedBox(height: isSmallScreen ? 12 : 16),
          Text(
            'Hata',
            style: TextStyle(
              fontSize: isSmallScreen ? 16 : 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: isSmallScreen ? 6 : 8),
          Padding(
            padding: EdgeInsets.symmetric(
                horizontal: isSmallScreen ? AppTheme.space2xl : AppTheme.space3xl),
            child: Text(
              _errorMessage ?? 'Bilinmeyen bir hata oluştu',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: isSmallScreen ? 12 : 14,
              ),
            ),
          ),
          SizedBox(height: isSmallScreen ? 20 : 24),
          ElevatedButton.icon(
            onPressed: _loadSettings,
            icon: Icon(Icons.refresh, size: isSmallScreen ? 18 : 20),
            label: Text('Tekrar Dene'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              padding: EdgeInsets.symmetric(
                  horizontal: isSmallScreen ? AppTheme.spaceLg : AppTheme.spaceXl, vertical: isSmallScreen ? AppTheme.spaceXs : AppTheme.spaceSm),
            ),
          ),
        ],
      ),
    );
  }

  // Responsive section title
  Widget _buildSectionTitle(String title, bool isSmallScreen) {
    return Padding(
      padding: EdgeInsets.only(bottom: isSmallScreen ? AppTheme.spaceXs : AppTheme.spaceMd),
      child: Text(
        title,
        style: TextStyle(
          fontSize: isSmallScreen ? 16 : 18,
          fontWeight: FontWeight.bold,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }

  // Responsive setting item
  Widget _buildSettingItemResponsive({
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget? trailing,
    required bool isSmallScreen,
  }) {
    return Row(
      children: [
        Container(
          padding: EdgeInsets.all(isSmallScreen ? AppTheme.spaceXxs + 2 : AppTheme.spaceXs),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withAlpha(26),
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: AppTheme.primaryColor,
            size: isSmallScreen ? 20 : 24,
          ),
        ),
        SizedBox(width: isSmallScreen ? 12 : 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: isSmallScreen ? 14 : 16,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: isSmallScreen ? 12 : 14,
                ),
              ),
            ],
          ),
        ),
        if (trailing != null) trailing,
      ],
    );
  }

  // Mevcut _buildSettingItem metodunu da korumalıyız, çağrıları değiştirmek yerine
  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget? trailing,
  }) {
    return _buildSettingItemResponsive(
      icon: icon,
      title: title,
      subtitle: subtitle,
      trailing: trailing,
      isSmallScreen: MediaQuery.of(context).size.width < 600,
    );
  }

  // Dialog metodlarını da responsive hale getirelim
  void _showMaintenanceModeDialog(bool value) {
    final bool isSmallScreen = MediaQuery.of(context).size.width < 600;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          value ? 'Bakım Modunu Etkinleştir' : 'Bakım Modunu Devre Dışı Bırak',
          style: TextStyle(
            fontSize: isSmallScreen ? 16 : 18,
          ),
        ),
        content: Text(
          value
              ? 'Bakım modu etkinleştirildiğinde kullanıcılar siteye erişemeyecek. Devam etmek istiyor musunuz?'
              : 'Bakım modunu devre dışı bırakmak istediğinize emin misiniz?',
          style: TextStyle(
            fontSize: isSmallScreen ? 14 : 16,
          ),
        ),
        contentPadding: const EdgeInsets.fromLTRB(
          AppTheme.space2xl,
          AppTheme.spaceXl,
          AppTheme.space2xl,
          AppTheme.spaceZero,
        ),
        titlePadding: const EdgeInsets.fromLTRB(
          AppTheme.space2xl,
          AppTheme.space2xl,
          AppTheme.space2xl,
          AppTheme.spaceZero,
        ),
        actionsPadding: const EdgeInsets.fromLTRB(
          AppTheme.spaceXs,
          AppTheme.spaceXs,
          AppTheme.spaceLg,
          AppTheme.spaceLg,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: Text(
              'İptal',
              style: TextStyle(
                fontSize: isSmallScreen ? 13 : 14,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();

              setState(() {
                _isSaving = true;
              });

              try {
                await _settingsService.toggleMaintenanceMode(value);

                setState(() {
                  _maintenanceMode = value;
                  _isSaving = false;
                });

                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                        value ? 'Bakım modu etkinleştirildi' : 'Bakım modu devre dışı bırakıldı'),
                    backgroundColor: Colors.green,
                  ),
                );
              } catch (e) {
                setState(() {
                  _isSaving = false;
                });

                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('İşlem sırasında bir hata oluştu'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: value ? Colors.orange : AppTheme.primaryColor,
              padding: EdgeInsets.symmetric(
                  horizontal: isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg, vertical: isSmallScreen ? AppTheme.space2xs : AppTheme.spaceXs),
            ),
            child: Text(
              value ? 'Etkinleştir' : 'Devre Dışı Bırak',
              style: TextStyle(
                fontSize: isSmallScreen ? 13 : 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showBackupDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Yedekleme'),
        content: const Text(
            'Veritabanı yedeklemesi oluşturmak istiyor musunuz? Bu işlem biraz zaman alabilir.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _startBackup();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('Yedekle'),
          ),
        ],
      ),
    );
  }

  void _startBackup() {
    // Yedekleme işlemi simülasyonu
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Yedekleme yapılıyor...'),
          ],
        ),
      ),
    );

    Future.delayed(const Duration(seconds: 3), () {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Yedekleme başarıyla tamamlandı.'),
          backgroundColor: Colors.green,
        ),
      );
    });
  }

  void _showClearCacheDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Önbelleği Temizle'),
        content: const Text(
            'Uygulama önbelleğini temizlemek istediğinize emin misiniz? Bu işlem uygulamanın performansını geçici olarak etkileyebilir.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _clearCache();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Temizle'),
          ),
        ],
      ),
    );
  }

  void _clearCache() {
    // Önbellek temizleme işlemi simülasyonu
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Önbellek temizleniyor...'),
          ],
        ),
      ),
    );

    Future.delayed(const Duration(seconds: 2), () {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Önbellek başarıyla temizlendi.'),
          backgroundColor: Colors.green,
        ),
      );
    });
  }
}
