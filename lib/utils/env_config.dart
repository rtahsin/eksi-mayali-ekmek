/// Ortam değişkenleri yapılandırması
///
/// API anahtarları build-time'da --dart-define ile enjekte edilir.
/// Örnek build komutu:
///   flutter build web --dart-define=IMGBB_API_KEY=xxx --dart-define=YOUTUBE_API_KEY=xxx
///
/// Geliştirme ortamında varsayılan değerler kullanılır.
class EnvConfig {
  static const String imgbbApiKey = String.fromEnvironment(
    'IMGBB_API_KEY',
    defaultValue: '',
  );

  static const String youtubeApiKey = String.fromEnvironment(
    'YOUTUBE_API_KEY',
    defaultValue: '',
  );

  static const String youtubeChannelId = String.fromEnvironment(
    'YOUTUBE_CHANNEL_ID',
    defaultValue: '',
  );

  static const String googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: '',
  );
}
