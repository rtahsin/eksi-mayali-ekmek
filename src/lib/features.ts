/**
 * Özellik bayrakları. Şimdilik teslimatı Tahsin kendisi yapıyor; kurye kadrosu yönetimi
 * (kurye ekleme, vardiya, siparişe kurye atama) gerektiğinde açılır.
 */
export const FEATURES = {
  courierManagement: false,
  /** Bilim odasının açılışı: ürün sayfalarındaki QR köprüsü ve arama motorlarına açılma. Karar Tahsin'in. */
  bilimOdasi: false,
} as const;
