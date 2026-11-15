/**
 * Özellik bayrakları. Kurye kadrosu ve hibrit dağıtım konsolu (`/admin/ekip`, `/kurye`)
 * aktif edilmiştir.
 */
export const FEATURES = {
  courierManagement: true,
  /** Bilim odasının açılışı: ürün sayfalarındaki QR köprüsü ve arama motorlarına açılma. Karar Tahsin'in. */
  bilimOdasi: true,
  /** "Nasıl Üretiyoruz?" vitrin bölümü ve menü bağlantıları: Tahsin gerçek fırın videolarını çekene kadar kapalı. */
  nasilUretiyoruz: false,
} as const;
