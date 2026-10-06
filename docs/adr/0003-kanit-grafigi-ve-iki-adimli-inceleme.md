# ADR-0003 Kanıt grafiği ve iki adımlı inceleme

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi · **İlgili:** MIMARI.md V1, V2, §2.5 knowledge, K-kodları

## Bağlam
"Ahkâm kesmeyeceğim": yalnız kanıtlı bilgi. Bugün kaynaklar 3 uyumsuz biçimde (yazı, oyun kartı, BILIM.md); DOI kesişimi 0; canlı tohum yazıda kaynaksız sağlık iddiaları var. Tahsin'in zamanı ~15 saat/hafta.

## Karar
1. **Grafik:** Kaynak → İddia (tek cümle; durum, güven, hassasiyet, sayılar) → Kavram (3 katman: usta / neden / bilim). Sitedeki her bilimsel cümle bir iddia kimliğine izlenir. Kanıtta alıntı alanı yok (telif).
2. **İki adımlı inceleme:** (a) Kanıt ajanı NotebookLM'e "bu kaynak bu cümleyi destekliyor mu, nerede?" diye sorar, DOI'yi Crossref'te doğrular, `supportCheck` + `locator` yazar. (b) Tahsin iddianın ifadesini (~2 dk) ve yazının çerçevesini (~10–15 dk/yazı) okur.
3. **Onay içeriğe bağlı:** `review.hash` = {metin, kanıt, sayılar, durum, hassasiyet} özeti. Onaydan sonra değişen iddia incelenmemiş sayılır (K011).
4. **Sağlık kuralı (K006):** sağlık terimi yalnız efsane düzeltmede serbest; fayda bildiren sağlık iddiası hukuki teyit (`legalCheck`) olmadan hata; ürüne bağlı yüzeyde her durumda hata. Nötr mekanizma cümlesi fayda fiili taşımadıkça serbest. Dayanak: MARKA §3, BILIM.md, TGK Beslenme ve Sağlık Beyanları Yönetmeliği.
5. **Tipleme iki aşamalı:** girdi tipleri düz `string` referans + `readonly` diziler; registry birleştirir, kimlik tiplerini türetir, referansları ayrı ifadede denetler (döngüsel tip ve `const` çıkarımının `string`'e düşmesi önlenir).

## Sonuç
- Kanıt kontrolü iddia başına bir kez; çerçeve okuması yazı başına kalır (dürüst maliyet).
- Tahsin'in onayı sessizce eskiyemez.
- Ürün sayfalarına sağlık iddiası yapısal olarak giremez.

## Tetikleyici
İnceleme kuyruğu Tahsin'in haftalık süresini aşarsa: ikinci bir alan uzmanı onaylayıcı.
