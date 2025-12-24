import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:get_it/get_it.dart';

import '../../data/repositories/delivery_repository.dart';
import '../../data/repositories/payment_repository.dart';
import '../../data/repositories/product_repository.dart';
import '../../data/repositories/user_repository.dart';
import '../../domain/repositories/i_delivery_repository.dart';
import '../../domain/repositories/i_payment_repository.dart';
import '../../domain/repositories/i_product_repository.dart';
import '../../domain/repositories/i_user_repository.dart';
import '../../services/address_service.dart';
import '../../services/auth_service.dart';
import '../../services/connection_service.dart';
import '../../services/delivery_service.dart';
import '../../services/feedback_service.dart';
import '../../services/notification_service.dart';
import '../../services/order_service.dart';
import '../../services/payment_service.dart';
import '../../services/privacy_service.dart';
import '../../services/product_service.dart';
import '../../services/settings_service.dart';
import '../../services/youtube_service.dart';
import '../../utils/logger.dart';

/// GetIt singleton instance - Bağımlılık enjeksiyon kontrolcüsü
///
/// Bu nesne üzerinden uygulama içerisindeki servislere
/// herhangi bir noktadan erişim sağlanabilir.
class ServiceLocator {
  static final GetIt getIt = GetIt.instance;

  /// Bağımlılık enjeksiyonu için gerekli tüm servisleri ve repository'leri kaydeder
  ///
  /// Bu fonksiyon uygulama başlangıcında çağrılarak tüm servislerin
  /// ve repository'lerin kayıt edilmesini sağlar.
  ///
  /// Neden GetIt kullanıyoruz?
  /// - Kod tekrarını azaltır
  /// - Bağımlılıkları merkezi olarak yönetir
  /// - Testleri kolaylaştırır (servisler kolayca taklit edilebilir)
  /// - Uygulama genelinde bir singleton oluşturur
  static void setup() {
    Logger.info('Service locator başlatılıyor...');

    // Repository'leri kaydet
    // Repository'ler veri katmanını temsil eder ve veritabanı işlemlerini yönetir
    // Interface üzerinden kayıt edilerek, gerçek implementasyon kolayca değiştirilebilir
    getIt.registerLazySingleton<IDeliveryRepository>(
      () => DeliveryRepository(FirebaseFirestore.instance),
    );
    getIt.registerLazySingleton<IPaymentRepository>(
      () => PaymentRepository(FirebaseFirestore.instance),
    );
    getIt.registerLazySingleton<IProductRepository>(
      () => ProductRepository(FirebaseFirestore.instance),
    );
    getIt.registerLazySingleton<IUserRepository>(
      () => UserRepository(FirebaseFirestore.instance),
    );
    Logger.debug('Repository sınıfları kaydedildi');

    // Servisleri kaydet
    // Servisler iş mantığını yönetir ve kullanıcı arayüzü ile veri katmanı arasında köprü görevi görür

    // Kullanıcı kimlik doğrulama servisi
    getIt.registerLazySingleton<AuthService>(() => AuthService(getIt<IUserRepository>()));

    // Sipariş yönetimi servisi
    getIt.registerLazySingleton<OrderService>(() => OrderService(getIt<AuthService>()));

    // Teslimat takip servisi
    getIt.registerLazySingleton<DeliveryService>(
      () => DeliveryService(getIt<IDeliveryRepository>(), FirebaseFirestore.instance),
    );

    // Ürün yönetimi servisi
    getIt.registerLazySingleton<ProductService>(() => ProductService(getIt<IProductRepository>()));

    // Ödeme işlemleri servisi
    getIt.registerLazySingleton<PaymentService>(() => PaymentService(getIt<IPaymentRepository>()));

    // YouTube servisi
    getIt.registerLazySingleton<YouTubeService>(() => YouTubeService());

    // Connection servisi
    getIt.registerLazySingleton<ConnectionService>(() => ConnectionService());

    // NOT: Aşağıdaki servisler artık lazy loading ile yükleniyor
    // Başlangıç hızını artırmak için sadece ihtiyaç duyulduğunda initialize edilecekler

    // Kişiselleştirilmiş öneri servisi - İhtiyaç duyulduğunda yüklenecek
    // getIt.registerLazySingleton<RecommendationService>(
    //   () => RecommendationService(getIt<ProductService>()),
    // );

    // Analitik servisi - İhtiyaç duyulduğunda yüklenecek
    // getIt.registerLazySingleton<AnalyticsService>(
    //   () => AnalyticsService(getIt<ProductService>(), getIt<OrderService>()),
    // );

    // YouTube API entegrasyon servisi - İhtiyaç duyulduğunda yüklenecek
    // getIt.registerLazySingleton<YouTubeService>(
    //   () => YouTubeService(),
    // );

    // Yapay zeka asistan servisi - İhtiyaç duyulduğunda yüklenecek
    // getIt.registerLazySingleton<AIService>(
    //   () => AIService(getIt<ProductService>(), getIt<RecommendationService>()),
    // );

    // Çevrimdışı veri senkronizasyon servisi - İhtiyaç duyulduğunda yüklenecek
    // getIt.registerLazySingleton<SyncService>(
    //   () => SyncService(),
    // );

    // İnternet bağlantısı kontrol servisi - İhtiyaç duyulduğunda yüklenecek
    // getIt.registerLazySingleton<ConnectionService>(
    //   () => ConnectionService(),
    // );

    // Yeni eklenen servis
    getIt.registerLazySingleton<SettingsService>(() => SettingsService());

    // Bildirim servisi
    getIt.registerLazySingleton<NotificationService>(() => NotificationService());

    // Feedback servisi
    getIt.registerLazySingleton<FeedbackService>(
      () => FeedbackService(FirebaseFirestore.instance),
    );

    // KVKK servisi
    getIt.registerLazySingleton<PrivacyService>(
      () => PrivacyService(),
    );

    // Address service
    getIt.registerLazySingleton<AddressService>(
      () => AddressService(),
    );

    Logger.debug('Servis sınıfları kaydedildi');

    Logger.info('Service locator başarıyla başlatıldı');
  }

  /// Servis locator'u initialize eder
  static Future<void> initialize() async {
    await getIt<NotificationService>().init();
  }

  /// Bildirim servisi
  static NotificationService get notificationService => getIt<NotificationService>();
}
