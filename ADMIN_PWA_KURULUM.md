# Admin PWA Kurulum Rehberi

## 📱 Telefonunuza Admin Panel Uygulaması Nasıl Yüklenir?

Admin paneline telefonunuzdan **direkt erişim** için aşağıdaki adımları izleyin:

---

## ✅ Adım 1: Admin Panel Sayfasına Gidin

1. Telefonunuzun tarayıcısını (Chrome/Safari) açın
2. Şu adrese gidin: **<https://eksimayaliekmekweb.web.app/admin>**
3. Admin giriş ekranını göreceksiniz

---

## ✅ Adım 2: "Ana Ekrana Ekle" (Install)

### Android (Chrome)

1. Tarayıcının **sağ üst menüsüne** (3 nokta) tıklayın
2. **"Ana ekrana ekle"** veya **"Install app"** seçeneğini bulun
3. Açılan pencerede **"Yükle"** veya **"Ekle"** butonuna tıklayın
4. Uygulama simgesi ana ekranınıza eklenir

### iOS (Safari)

1. Ekranın **alt kısmındaki Paylaş butonuna** (yukarı ok) tıklayın
2. Aşağı kaydırın ve **"Ana Ekrana Ekle"** seçeneğini bulun
3. Uygulama adını onaylayın (varsayılan: "Admin Panel")
4. Sağ üst köşedeki **"Ekle"** butonuna tıklayın
5. Uygulama simgesi ana ekranınızda görünür

---

## ✅ Adım 3: Admin Panel Uygulamasını Açın

1. Ana ekranınızda **"Admin Panel"** simgesini bulun
2. Simgeye dokunarak uygulamayı açın
3. **Direkt olarak admin giriş ekranı** açılacak (anasayfa değil!)
4. Email ve şifrenizle giriş yapın

---

## 🎯 Özellikler

### Direkt Erişim

- Uygulama açıldığında **direkt admin/login** sayfası açılır
- Anasayfaya yönlendirilmezsiniz
- Her açışta admin paneli hazırdır

### Hızlı İşlemler (Shortcuts)

Uygulama simgesine **uzun basarak** hızlı menüye erişebilirsiniz:

- 📊 **Dashboard** - Anlık istatistikler
- 🍞 **Ürünler** - Ürün yönetimi
- 📦 **Siparişler** - Sipariş takibi
- 📦 **Stok Durumu** - Envanter kontrolü

### Offline Çalışma

- İnternet kesilse bile son görüntülediğiniz veriler açılır
- İnternet geri geldiğinde otomatik senkronize olur

### Ana Uygulamadan Bağımsız

- Müşteri uygulaması (EkmekLab) ile **ayrı simge** olarak kurulur
- Her iki uygulamayı yan yana kullanabilirsiniz
- Her birinin kendi önbelleği ve oturum bilgisi vardır

---

## 🔐 Güvenlik Notları

### Oturum Süresi

- Admin oturumu **30 gün** geçerlidir
- Her giriş yaptığınızda süre yenilenir
- Otomatik çıkış için "Çıkış Yap" kullanın

### Cihaz Güvenliği

- Uygulamayı **sadece kendi cihazınıza** kurun
- Telefonunuzda **ekran kilidi** kullanın
- Paylaşılan cihazlara kurmayın

---

## ❓ Sorun Giderme

### "Ana ekrana ekle" seçeneği görünmüyor

- Zaten kurulu olabilir → Ana ekranınızı kontrol edin
- Tarayıcıyı kapatıp tekrar açın
- `/admin` adresinde olduğunuzdan emin olun

### Uygulama anasayfaya yönlendiriyor

- Eski PWA kurulu olabilir → Simgeyi silin ve tekrar kurun
- Tarayıcı cache'ini temizleyin
- Adresin `/admin` ile başladığından emin olun

### Giriş bilgileri hatırlanmıyor

- Tarayıcıda "Çerezleri engelle" ayarını kontrol edin
- Firebase oturumu 30 gün sonra sona erer
- Tekrar giriş yapmanız gerekir

### Uygulama yavaş çalışıyor

- İnternet bağlantınızı kontrol edin
- Uygulamayı kapatıp yeniden açın
- Cache temizleme: Simgeyi silin, tarayıcıdan `/admin` açın, tekrar kurun

---

## 🔄 Güncelleme

Uygulama otomatik güncellenir:

- Yeni özellikler geldiğinde Firebase'den indirilir
- Uygulamayı yeniden yüklemenize gerek yok
- Bazen tarayıcı cache'ini temizlemek gerekebilir

---

## 📞 Destek

Sorun yaşarsanız:

1. Bu rehberi tekrar okuyun
2. Tarayıcı cache'ini temizleyin
3. Uygulamayı kaldırıp tekrar kurun
4. Geliştirici desteği için iletişime geçin

---

**Son Güncelleme**: 2025-01-27  
**Uyumlu Tarayıcılar**: Chrome 90+, Safari 15+, Edge 90+  
**Test Edildi**: Android 11+, iOS 15+

---

## ✨ Artık Hazırsınız

Admin paneline **tek dokunuşla** erişebilir, stok güncellemelerini ve siparişleri anında kontrol edebilirsiniz! 🎉
