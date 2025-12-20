# 🤖 Ollama LLM Entegrasyonu - ChatBot

EkmekLab ChatBot'una yerel LLM (Ollama) desteği eklendi!

---

## 🎯 Özellikler

✅ Yerel LLM (Ollama) ile sohbet  
✅ Node.js backend proxy (CORS sorunu yok)  
✅ Özelleştirilebilir sistem promptu  
✅ EkmekLab context'i otomatik eklenir  
✅ Hızlı yanıtlar (max 200 token)  
✅ Model seçimi desteği  
✅ Health check & error handling  

---

## 📦 Kurulum

### 1. Ollama Kurulumu

```bash
# Windows/Mac/Linux
# https://ollama.ai/download

# Model yükle (önerilen)
ollama pull llama3.2:latest

# Diğer modeller:
ollama pull mistral:latest
ollama pull phi3:latest
ollama pull gemma:latest
```

### 2. Ollama Başlat

```bash
# Terminal 1
ollama serve

# Varsayılan: http://localhost:11434
```

### 3. Backend Kurulumu

```bash
cd local_llm_bridge

# Bağımlılıkları yükle
npm install

# Test et
npm test

# Sunucuyu başlat
npm start

# Varsayılan: http://localhost:3000
```

### 4. Flutter Paketi Ekle

```bash
# pubspec.yaml'a ekle
dependencies:
  http: ^1.1.0
```

---

## 🚀 Kullanım

### Backend API

#### 1. Health Check

```bash
GET http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-09T10:00:00.000Z"
}
```

#### 2. Model Listesi

```bash
GET http://localhost:3000/api/models
```

**Response:**

```json
{
  "models": [
    {"name": "llama3.2:latest", "size": 4700000000},
    {"name": "mistral:latest", "size": 7200000000}
  ]
}
```

#### 3. Chat

```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "Ekşi maya nedir?",
  "model": "llama3.2:latest"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Ekşi maya, doğal fermantasyon...",
  "model": "llama3.2:latest",
  "timestamp": "2025-12-09T10:00:00.000Z"
}
```

---

## 🎨 Flutter Entegrasyonu

### Basit Kullanım

```dart
import 'package:eksi_mayali_ekmek_web/services/ollama_service.dart';

final ollamaService = OllamaService();

// LLM ile sohbet
final response = await ollamaService.chat(
  message: 'Ekşi maya nedir?',
  model: 'llama3.2:latest',
);

if (response != null) {
  print('LLM: $response');
}
```

### ChatBot Widget'a Entegrasyon

```dart
// ChatBot widget'ında AI mode butonu ekle
bool _isAIMode = false;

// User mesaj gönderdiğinde
if (_isAIMode) {
  final aiResponse = await ollamaService.chat(
    message: userMessage,
    context: 'EkmekLab müşterisi',
  );
  
  if (aiResponse != null) {
    setState(() {
      _chatHistory.add(_ChatMessage(
        message: aiResponse,
        isBot: true,
        timestamp: DateTime.now(),
      ));
    });
  }
}
```

---

## ⚙️ Sistem Promptu Özelleştirme

`local_llm_bridge/server.js` dosyasında:

```javascript
const systemPrompt = `Sen EkmekLab'ın asistanısın.

Şirket Bilgileri:
- Ekşi mayalı ekmek üreticisi
- İstanbul teslimat
- Fiyatlar: 30-40 TL
- İletişim: 0501 012 66 53

Görevin:
- Nazik ve yardımsever ol
- Kısa ve öz cevaplar ver
- Emoji kullan 🍞
- Ürün bilgisi ver
- Sipariş yönlendir`;
```

---

## 🔧 Yapılandırma

### Backend (.env)

```env
PORT=3000
OLLAMA_URL=http://localhost:11434
NODE_ENV=development
```

### Flutter (ollama_service.dart)

```dart
// Development
static const String _backendUrl = 'http://localhost:3000';

// Production
// static const String _backendUrl = 'https://your-backend.com';
```

---

## 📊 Model Önerileri

| Model | Boyut | Hız | Kalite | Kullanım |
|-------|-------|-----|--------|----------|
| **llama3.2** | 2GB | ⚡⚡⚡ | ⭐⭐⭐ | Genel amaçlı (Önerilen) |
| phi3 | 2.3GB | ⚡⚡⚡⚡ | ⭐⭐ | Hızlı yanıtlar |
| mistral | 4GB | ⚡⚡ | ⭐⭐⭐⭐ | Daha iyi kalite |
| gemma | 3.5GB | ⚡⚡⚡ | ⭐⭐⭐ | Dengelidir |

---

## 🐛 Sorun Giderme

### Ollama bağlanmıyor

```bash
# Ollama çalışıyor mu kontrol et
curl http://localhost:11434

# Başlat
ollama serve
```

### Backend başlamıyor

```bash
# Port kullanımda mı?
netstat -ano | findstr :3000

# Dependency eksik mi?
npm install
```

### Flutter'dan bağlanamıyor

```dart
// CORS hatası: Backend'de cors middleware var mı?
// Network hatası: Backend URL doğru mu?
// Timeout: Ollama yanıt veriyor mu?

// Debug log ekle
Logger.info('Backend URL: $_backendUrl');
```

### Model yüklü değil

```bash
# Mevcut modeller
ollama list

# Model yükle
ollama pull llama3.2
```

---

## 🚀 Production Deployment

### Option 1: Cloud Backend (Önerilen)

1. Backend'i Railway/Render/Heroku'ya deploy et
2. Ollama cloud instance (costly!)
3. Flutter'da production URL kullan

### Option 2: Hybrid (Yerel LLM)

1. Backend yerel sunucuda çalıştır
2. Ngrok/Cloudflare Tunnel ile expose et
3. Flutter'dan tunnel URL kullan

```bash
# Ngrok ile
ngrok http 3000

# URL'i Flutter'da kullan
static const String _backendUrl = 'https://abc123.ngrok.io';
```

### Option 3: API Gateway

1. OpenAI/Claude/Gemini API kullan
2. Ollama backend yerine API gateway
3. Daha kolay deployment, maliyet var

---

## 📝 Test Komutları

```bash
# Backend test
cd local_llm_bridge
npm test

# Health check
curl http://localhost:3000/health

# Model listesi
curl http://localhost:3000/api/models

# Chat test
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Merhaba", "model":"llama3.2:latest"}'
```

---

## 🎯 Sonraki Adımlar

- [ ] Streaming response ekle (gerçek zamanlı)
- [ ] Conversation memory (context tracking)
- [ ] Multi-model support (model değiştirme)
- [ ] Rate limiting
- [ ] Analytics (kaç mesaj, hangi sorular)
- [ ] Fine-tuning (EkmekLab spesifik data)

---

## 📚 Kaynaklar

- [Ollama Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama Models](https://ollama.ai/library)
- [Express.js](https://expressjs.com/)
- [Flutter HTTP](https://pub.dev/packages/http)

---

**Hazırlayan:** GitHub Copilot  
**Tarih:** 9 Aralık 2025  
**Versiyon:** 1.0.0
