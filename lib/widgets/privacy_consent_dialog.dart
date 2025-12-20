import 'package:flutter/material.dart';

import '../core/di/service_locator.dart';
import '../services/privacy_service.dart';

class PrivacyConsentDialog extends StatefulWidget {
  final String userId;
  final Function(Map<String, bool>) onConsentsUpdated;

  const PrivacyConsentDialog({
    Key? key,
    required this.userId,
    required this.onConsentsUpdated,
  }) : super(key: key);

  @override
  _PrivacyConsentDialogState createState() => _PrivacyConsentDialogState();
}

class _PrivacyConsentDialogState extends State<PrivacyConsentDialog> {
  final PrivacyService _privacyService = ServiceLocator.getIt<PrivacyService>();

  bool _isLoading = true;
  bool _marketingConsent = false;
  bool _analyticsConsent = false;
  bool _functionalitiesConsent = true; // Bu genellikle zorunludur
  bool _thirdPartyConsent = false;

  @override
  void initState() {
    super.initState();
    _loadConsents();
  }

  Future<void> _loadConsents() async {
    try {
      final consents = await _privacyService.getUserConsents(widget.userId);

      setState(() {
        _marketingConsent = consents['marketing'] ?? false;
        _analyticsConsent = consents['analytics'] ?? false;
        _functionalitiesConsent = consents['functionalities'] ?? true;
        _thirdPartyConsent = consents['thirdParty'] ?? false;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _saveConsents() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final consents = {
        'marketing': _marketingConsent,
        'analytics': _analyticsConsent,
        'functionalities': _functionalitiesConsent,
        'thirdParty': _thirdPartyConsent,
      };

      await _privacyService.updateUserConsent(widget.userId, consents);
      widget.onConsentsUpdated(consents);

      Navigator.of(context).pop(true);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('İzinler kaydedilirken bir hata oluştu')),
      );
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Gizlilik İzinleri'),
      content: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Lütfen kişisel verilerinizin işlenmesi ile ilgili izinlerinizi belirtin:',
                    style: TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 16),

                  // Zorunlu fonksiyonel izin
                  CheckboxListTile(
                    title: const Text('Gerekli İşlevsellik'),
                    subtitle: const Text(
                        'Sipariş verme, teslimat gibi temel hizmetler için gereklidir'),
                    value: _functionalitiesConsent,
                    onChanged: null, // Değiştirilemez
                    enabled: false,
                  ),

                  // Pazarlama izni
                  CheckboxListTile(
                    title: const Text('Pazarlama İletişimleri'),
                    subtitle: const Text(
                        'Kampanyalar, özel teklifler ve indirimler hakkında bilgilendirmeler'),
                    value: _marketingConsent,
                    onChanged: (value) {
                      setState(() {
                        _marketingConsent = value ?? false;
                      });
                    },
                  ),

                  // Analitik izni
                  CheckboxListTile(
                    title: const Text('Analitik ve İstatistikler'),
                    subtitle: const Text(
                        'Kullanım verilerini analiz etmemize izin verin'),
                    value: _analyticsConsent,
                    onChanged: (value) {
                      setState(() {
                        _analyticsConsent = value ?? false;
                      });
                    },
                  ),

                  // Üçüncü taraf izni
                  CheckboxListTile(
                    title: const Text('Üçüncü Taraflarla Paylaşım'),
                    subtitle: const Text(
                        'İş ortaklarımız ve üçüncü taraf hizmet sağlayıcılarla veri paylaşımı'),
                    value: _thirdPartyConsent,
                    onChanged: (value) {
                      setState(() {
                        _thirdPartyConsent = value ?? false;
                      });
                    },
                  ),

                  const SizedBox(height: 16),
                  const Text(
                    'Not: İstediğiniz zaman bu ayarları güncelleyebilirsiniz.',
                    style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.of(context).pop(false),
          child: const Text('İptal'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _saveConsents,
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Kaydet'),
        ),
      ],
    );
  }
}
