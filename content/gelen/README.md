# 📥 EkmekLab — Gelen Kutusu (`content/gelen/`)

Bu dizin, fırıncı Tahsin'in atölyeden, fırın başından ve videolardan getirdiği ham malzemelerin bırakıldığı gelen kutusudur.

---

## 1. Tahsin Ne Bırakır?

Tahsin bu dizine markdown dosyası formatında (`YYYY-MM-DD-<konu>.md`) ham içerik bırakır:

1. **Video dökümleri**: YouTube çekimleri, reels konuşmaları veya atölyede kaydedilmiş ses kayıtlarının dökümleri.
2. **Atölye defteri & notlar**: Karışım oranları, ortam sıcaklıkları, mayalanma süreleri, fermantasyon gözlemleri veya defter fotoğraflarının metin aktarımı.
3. **Mutfak laboratuvarı deneyimleri**: "2018'deki o gece sucuklu yumurta yerken başlayan merak", unun kokusu, taş değirmende unun ısınması, mahalledeki komşuların ve müşterilerin soruları.

---

## 2. Ajan Ne Üretir? ("Gelenden Taslağa" Hattı)

Gelen kutusundaki her girdi için ajan şu aşamaları izler:

1. **Ses ve Tonu Koru (MARKA §3)**:
   - Sitede dil **"sen"**dir; sıcak, arkadaş canlısı, merak uyandıran ve öğrendiğini paylaşan bir mahalle ekmekçisi tonu.
   - Ukala uzman dili ve resmi kurum dili kullanılmaz.
   - **Kesinlikle sağlık vaadi / fayda beyanı yer alamaz** (yönetmelik ve güven ilkesi).

2. **Bilimsel İddiaları ve Kavramları Bağla**:
   - Yazıdaki bilimsel mekanizma cümleleri `<Claim id="...">` bileşeniyle `content/claims/` altındaki iddialara bağlanır.
   - Bahsi geçen temel fırıncılık ve biyoloji terimleri `<Concept id="...">` ile `content/concepts/` kayıtlarına bağlanır.
   - Mevcut bir iddia yoksa, yeni iddia `review: null` olarak önerilir.

3. **Taslak ve Meta Üretimi**:
   - `content/articles/<slug>/meta.ts`: `status: "inceleme"`, `fromInbox: "content/gelen/<dosya>.md"`, `levels: [1, 2]`, `summary` (maksimum 160 karakter).
   - `content/articles/<slug>/index.mdx`: Yapılandırılmış editoryal MDX gövdesi.

4. **Kanıt Doğrulama (Kanıt Ajanı)**:
   - İddia kaynakları Crossref API üzerinden doğrulanır.
   - NotebookLM üzerinden `supportCheck` (`desteklemiyor`, `kismen`, `destekliyor`) ve sayfa/bölüm `locator` bilgisi eklenir.

5. **Tahsin'in Çerçeve Okuması ve Yayın**:
   - Tahsin "benim ağzımdan böyle denir mi?" okuması yaparak ifadeyi ve çerçeveyi onaylar.
   - Onaylanan iddialara `review: { by: "tahsin", at: "YYYY-MM-DD", hash: claimHash(...) }` işlenir.
   - Yazının durumu `status: "yayinda"` olarak güncellenir.
