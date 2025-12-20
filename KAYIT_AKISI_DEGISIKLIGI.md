# YENİ KAYIT AKIŞI

## Sorun

- E-posta doğrulanmadan Firebase'e kullanıcı kaydediliyor
- Doğrulama başarısız olsa bile kullanıcı sistemde kalıyor
- Admin dışındaki eski kayıtların temizlenmesi gerekiyor

## Çözüm

### Adım 1: Firebase Console'dan Manuel Temizlik

<https://console.firebase.google.com/project/eksimayaliekmekweb/authentication/users>

Admin (`tahsinreyhan@gmail.com`) dışındaki TÜM kullanıcıları sil.

### Adım 2: Yeni Kayıt Akışı

**ESKİ AKIŞ (YANLIŞ):**

```text
1. Firebase Auth kaydı yap
2. Firestore'a yaz
3. E-posta gönder
4. Başarısız olursa geri al (ama bazen çalışmıyor)
```

**YENİ AKIŞ (DOĞRU):**

```text
1. E-posta doğrulama kodu gönder (Firebase kaydı YOK)
2. Kodu doğrula
3. Doğrulama başarılıysa:
   a. Firebase Auth kaydı yap
   b. Firestore'a yaz
   c. Kullanıcı aktif
```

### Adım 3: Kod Değişiklikleri

**functions/index.js:**

- `requestEmailOtp`: UID opsiyonel yap
- UID yoksa `pending_verifications` koleksiyonu kullan

**lib/services/auth_service.dart:**

- `_pendingRegistration` map ekle
- `register()`: Sadece e-posta gönder, Firebase kaydı yapma
- `completeRegistration()`: Yeni metod - doğrulama sonrası Firebase kaydını tamamla
- `verifyEmailOtp()`: Pending registration varsa `completeRegistration()` çağır

**lib/screens/email_verification_screen.dart:**

- Doğrulama başarılı olunca `completeRegistration()` çağır

## Sonuç

E-posta doğrulanmadan Firebase'de kullanıcı oluşmayacak!
