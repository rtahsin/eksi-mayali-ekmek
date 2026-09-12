# Address Sync Pipeline (Beylikdüzü)

## Amaç
Beylikdüzü için mahalle/sokak verisini düzenli ve idempotent şekilde Firestore `neighborhoods` koleksiyonuna yazmak.

## Veri Kaynakları
- Mahalle referansı (birincil): OSM Overpass idari sınır verisi
  - Beylikdüzü ilçe alanı içindeki `admin_level=10` mahalle sınırları
- Mahalle referansı (ikincil/fallback): script içindeki kanonik Beylikdüzü mahalle listesi
- Sokak/cadde: OSM Overpass API (`highway` + `name`) mahalle bazında

## Script
- `lib/scripts/sync_beylikduzu_address_data.dart`

## Çalıştırma
- Web runner ile:
  - `flutter run -d chrome lib/scripts/sync_beylikduzu_address_data.dart`

## Firestore Yazım Şeması
Her mahalle için doküman id mahalle adıdır.

Alanlar:
- `name`
- `district` (`Beylikdüzü`)
- `city` (`İstanbul`)
- `streets` (normalize + dedupe + sorted)
- `source` (`ibb_reference+osm_overpass`)
- `version` (ISO timestamp)
- `lastSyncedAt` (server timestamp)

## İdempotency
Script tekrar çalıştırıldığında aynı mahalle dokümanları merge/upsert edilir; duplicate sokak oluşmaz.

## Güvenilirlik Stratejisi
- Mahalle listesi canlı Overpass idari sınırlarından çekilir.
- Overpass geçici hata/eksik veri döndürürse kanonik mahalle listesi otomatik devreye girer.
- Uygulama tarafında da Firestore + fallback mahalle birleştirme ile kritik mahalle kaybı önlenir.

## Operasyon Notları
- OSM endpoint geçici hata verirse script mahalle bazlı fallback sokak listesi kullanır.
- Üretime çıkmadan önce `lastSyncedAt` ve sokak sayıları kontrol edilmelidir.
