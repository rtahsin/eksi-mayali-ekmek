# Firebase Deploy Adımları

Bu dosya, Ekşi Mayalı Ekmek web uygulamasını ve admin panelini Firebase'e nasıl deploy edeceğinizi adım adım açıklar.

## Ön Gereksinimler

1. Node.js ve npm kurulu olmalıdır
2. Firebase CLI kurulu olmalıdır (`npm install -g firebase-tools`)
3. Google hesabınızla Firebase'e giriş yapılmış olmalıdır

## 1. Firebase'e Giriş Yapma

```bash
firebase login
```

## 2. Web Uygulamasını Derleme

Flutter web uygulamasını derlemek için:

```bash
flutter clean
flutter pub get
flutter build web --release
```

Bu komutlar, `build/web` klasöründe derlenmiş web uygulamasını oluşturacaktır.

## 3. Firebase Yapılandırma Dosyalarını Kontrol Etme

Aşağıdaki dosyaların projenizde olduğundan ve güncel olduğundan emin olun:

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`

## 4. Firebase'e Deploy Etme

```bash
firebase deploy
```

Bu komut tüm kaynakları (hosting, firestore kuralları, storage vb.) Firebase'e deploy edecektir.

Sadece hosting'i deploy etmek isterseniz:

```bash
firebase deploy --only hosting
```

Sadece Firestore kurallarını deploy etmek isterseniz:

```bash
firebase deploy --only firestore:rules
```

## 5. Uygulamaya Erişim

Deploy tamamlandıktan sonra, uygulamanıza şu URL'den erişebileceksiniz:

```
https://eksimayaliekmekweb.web.app
```

## Admin Paneline Giriş Yapma

Admin paneline aşağıdaki adımları izleyerek giriş yapabilirsiniz:

1. Tarayıcınızı açın ve `https://eksimayaliekmekweb.web.app/admin/login` adresine gidin.
2. E-posta ve şifre bilgilerinizi girin:
   - E-posta: `tahsinreyhan@gmail.com`
   - Şifre: `123456` (Güvenlik için bu şifreyi değiştirmeniz önerilir)

3. Giriş yaptıktan sonra, admin paneli dashboard'una yönlendirileceksiniz.

## Admin Paneli ve Ana Uygulama Koordinasyonu

Admin paneli ve ana uygulama arasındaki veri senkronizasyonu, `SyncService` tarafından sağlanmaktadır. Bu servis, Firestore'daki değişiklikleri dinleyerek hem admin panelinde hem de ana uygulamada güncel verilerin görüntülenmesini sağlar.

### Admin Yetkilendirmesi

Admin yetkisi, Firestore'daki `adminler` koleksiyonunda saklanmaktadır. Bir kullanıcıya admin yetkisi vermek için:

1. Firebase Console'a giriş yapın
2. Firestore Database bölümüne gidin
3. `adminler` koleksiyonunu seçin
4. Yeni bir belge ekleyin:
   - Belge ID'si: Kullanıcının UID'si
   - Alanlar:
     - `email`: Kullanıcının e-posta adresi
     - `isActive`: `true` (Boolean)
     - `role`: `admin` veya `superadmin`
     - `createdAt`: Geçerli tarih ve saat

## Hata Durumunda

Eğer deploy sırasında bir hata alırsanız, Firebase CLI'nin çıktısını kontrol edin. Genellikle sorunun nedeni ve çözümü hakkında bilgi verir.

En yaygın hatalar:
- Firestore kuralları sözdizimi hataları
- Web uygulamasının doğru şekilde derlenmemesi
- Firebase izinleri ve yetkilendirme sorunları

## Güvenlik Notları

1. Admin paneline erişim, Firestore kuralları ve AuthService tarafından korunmaktadır.
2. Sadece `adminler` koleksiyonunda kayıtlı ve `isActive` değeri `true` olan kullanıcılar admin paneline erişebilir.
3. Admin panelinde yapılan değişiklikler, gerçek zamanlı olarak ana uygulamaya yansıtılır.
4. Güvenlik için, admin kullanıcılarının güçlü şifreler kullanması ve düzenli olarak şifrelerini değiştirmesi önerilir. 