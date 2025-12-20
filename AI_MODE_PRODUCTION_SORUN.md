# 🚨 AI Mode Kullanım Notu

## ⚠️ ÖNEMLİ: Mixed Content Sorunu

Production web sitesinde (<https://eksimayaliekmekweb.web.app>) AI Mode **şu anda çalışmıyor** çünkü:

- Web sitesi **HTTPS** protokolü kullanıyor
- Backend server **HTTP localhost:3000**'de çalışıyor
- Tarayıcılar güvenlik nedeniyle HTTPS sitelerinin HTTP kaynaklarına erişmesine izin vermiyor (**Mixed Content Policy**)

---

## ✅ ÇÖZÜMLER

### 1️⃣ Development Mode'da Test (HEMEN ÇALIŞIR)

```powershell
# Terminal 1: Backend başlat
cd local_llm_bridge
npm start

# Terminal 2: Flutter debug mode başlat
flutter run -d chrome --web-port=8080
```

Ardından **<http://localhost:8080>** adresini tarayıcıda açın. Bu adreste AI Mode çalışacaktır.

---

### 2️⃣ Ngrok ile Public HTTPS (GEÇİCİ ÇÖZÜM)

Backend'i public HTTPS URL'e açmak için:

```powershell
# 1. Ngrok indir ve kur: https://ngrok.com/download

# 2. Backend'i başlat
cd local_llm_bridge
npm start

# 3. Yeni terminal'de ngrok başlat
ngrok http 3000
```

Ngrok şuna benzer bir URL verecek: `https://abc123.ngrok.io`

Ardından `lib/services/ollama_service.dart` dosyasını düzenleyin:

```dart
class OllamaService {
  // static const String _backendUrl = 'http://localhost:3000';
  static const String _backendUrl = 'https://abc123.ngrok.io'; // Ngrok URL'i
```

Sonra build ve deploy:

```powershell
flutter build web --release
firebase deploy --only hosting
```

**Not**: Ngrok ücretsiz hesabında URL her yeniden başlatmada değişir. Pro hesap ile sabit URL alabilirsiniz.

---

### 3️⃣ Backend'i Cloud'a Deploy (KALICI ÇÖZÜM)

Backend'i bir cloud platformuna deploy edin:

#### **Render.com** (Ücretsiz)

1. <https://render.com'a> kayıt olun
2. "New Web Service" oluşturun
3. GitHub repo'nuzu bağlayın veya manuel deploy yapın
4. Start command: `cd local_llm_bridge && npm start`
5. Environment variables:
   - `OLLAMA_URL`: Ollama sunucunuzun public URL'i

**SORUN**: Render'da Ollama çalışmaz (GPU gerekiyor). Backend'i Render'a, Ollama'yı kendi sunucunuza koymalısınız.

#### **Railway.app** (Ücretli ama basit)

1. <https://railway.app'e> kayıt olun
2. "New Project" → "Deploy from GitHub"
3. `local_llm_bridge` klasörünü seçin
4. Otomatik HTTPS URL alırsınız: `https://your-app.railway.app`

#### **Vercel/Netlify Functions** (Serverless)

Backend'i serverless function'a dönüştürün.

---

### 4️⃣ Ollama'yı da Cloud'a Koy (TAM ÇÖZÜM)

Ollama'yı GPU'lu bir sunucuya kurun:

- **RunPod.io**: GPU sunucu kiralama ($0.20/saat)
- **AWS EC2 g4dn.xlarge**: GPU instance
- **Google Cloud AI Platform**
- **Azure ML Compute**

Ardından backend'i Ollama URL'i ile yapılandırın:

```javascript
// server.js
const OLLAMA_URL = process.env.OLLAMA_URL || 'https://your-ollama-server.com:11434';
```

---

## 🧪 HIZLI TEST: Localhost'ta Çalıştığını Doğrula

```powershell
# 1. Ollama çalışıyor mu?
Invoke-WebRequest -Uri "http://localhost:11434/api/tags"

# 2. Backend çalışıyor mu?
Invoke-WebRequest -Uri "http://localhost:3000/health"

# 3. Chat endpoint çalışıyor mu?
$body = @{message="test";model="qwen3:8b"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/chat" -Method POST -Body $body -ContentType "application/json"

# 4. Flutter debug mode başlat
flutter run -d chrome --web-port=8080
```

Tarayıcıda **<http://localhost:8080>** açıp AI Mode'u test edin.

---

## 🎯 ÖNERİ

**Kısa vadede**: Development mode'da test edin (`flutter run -d chrome`)

**Orta vadede**: Ngrok ile geçici public URL oluşturun

**Uzun vadede**: Backend + Ollama'yı cloud'a deploy edin (Railway + RunPod)

---

## 📞 Destek

Sorun yaşarsanız:

1. Backend loglarını kontrol edin: `cd local_llm_bridge && npm run dev`
2. Browser console'u açın (F12) ve hata mesajlarını okuyun
3. Ollama loglarını kontrol edin: `ollama logs`

---

**GÜNCELLEME**: 2025-12-10  
**DURUM**: ⚠️ Production'da çalışmıyor (Mixed Content)  
**ÇÖZÜM**: Development mode veya ngrok kullanın
