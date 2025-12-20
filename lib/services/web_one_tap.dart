// ignore_for_file: avoid_web_libraries_in_flutter

// Conditional import: use package:web on web, stub on other platforms
import 'web_stub.dart' if (dart.library.html) 'package:web/web.dart' as web;

/// Web Google One Tap entegrasyonu için yardımcı sınıf.
/// window.postMessage ile index.html'den gelen credential yakalanır.
class WebOneTap {
  static bool _initialized = false;

  static void init(void Function(String idToken) onCredential) {
    if (_initialized) return;
    _initialized = true;

    web.window.onMessage.listen((event) {
      final data = event.data;
      // JSAny tipini kontrol et ve Map'e çevir
      try {
        // Web API'den gelen data'yı kontrol et
        if (data != null) {
          // data'yı dynamic olarak ele al
          final dynamic dynamicData = data;
          if (dynamicData is Map) {
            final type = dynamicData['type'];
            if (type == 'oneTapCredential') {
              final credential = dynamicData['credential'];
              if (credential is String && credential.isNotEmpty) {
                try {
                  onCredential(credential);
                } catch (_) {}
              }
            }
          }
        }
      } catch (_) {
        // Hata durumunda sessizce devam et
      }
    });
  }
}
