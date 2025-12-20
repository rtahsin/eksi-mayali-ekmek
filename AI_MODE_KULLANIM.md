# 🤖 ChatBot AI Mode - Kullanım Kılavuzu

## 📋 Genel Bakış

EkmekLab ChatBot artık **iki modda** çalışıyor:

1. **📋 Menü Modu** - Önceden tanımlanmış seçenekler ve akış
2. **🤖 AI Modu** - Ollama LLM ile doğal dil sohbeti

---

## 🚀 Backend Başlatma

AI Mode kullanmak için Ollama backend server'ı çalıştırmalısınız:

```powershell
# 1. Ollama'nın çalıştığından emin olun
Invoke-WebRequest -Uri "http://localhost:11434/api/tags"

# 2. Backend server'ı başlatın
cd local_llm_bridge
npm start

# Backend şu adreste çalışır: http://localhost:3000
```

---

## 💡 Kullanım

### Web Sitesinde

1. Sağ alt köşedeki **💬 ChatBot** butonuna tıklayın
2. Chat penceresi açılır (varsayılan: Menü Modu)
3. **🤖 AI Mode** butonuna tıklayarak AI moduna geçin
4. Mesajınızı yazıp **Enter** veya **Gönder** butonuna basın
5. AI yanıtı bekleyin (typing indicator gösterilir)

### Mod Değiştirme

- Header'daki **🤖/📋** ikonuna tıklayarak modlar arası geçiş yapabilirsiniz
- **Refresh** butonu chat'i sıfırlar ve Menü Moduna döner

---

## 🛠️ Teknik Detaylar

### Kullanılan Model

- **Model**: `qwen3:8b` (4.87 GB)
- **Alternatif modeller**: `qwen3:30b`, `gpt-oss:20b`, `qwen3-coder:30b`

### Backend Endpoints

- **Health Check**: `GET /health`
- **Models List**: `GET /api/models`
- **Chat**: `POST /api/chat` (body: `{message, context?, model?}`)
- **Stream Chat**: `POST /api/chat/stream` (streaming response)

### System Prompt

Backend'de EkmekLab'a özel bir system prompt tanımlı:

- Ürün bilgileri (Ekşi Mayalı Ekmek, Çavdar Ekmeği)
- Fiyatlar (30 TL, 35 TL)
- İletişim bilgileri (WhatsApp, Telefon, Email)
- Teslimat şartları
- Firma profili

---

## 🔧 Yapılandırma

### Model Değiştirme

`lib/widgets/chatbot_widget.dart` dosyasında:

```dart
// _sendAIMessage() metodunda
final response = await _ollamaService.chat(
  message: message,
  context: context.isNotEmpty ? context : null,
  model: 'qwen3:8b', // Burayı değiştir
);
```

### Backend URL

`lib/services/ollama_service.dart` dosyasında:

```dart
class OllamaService {
  static const String baseUrl = 'http://localhost:3000'; // Değiştir
  // ...
}
```

### Timeout Süresi

```dart
final response = await http.post(
  Uri.parse('$baseUrl/api/chat'),
  // ...
).timeout(Duration(seconds: 30)); // 30 saniye timeout
```

---

## 🐛 Sorun Giderme

### "AI bağlantısı kurulamadı" Hatası

**Çözüm**:

1. Ollama'nın çalıştığını kontrol edin: `curl http://localhost:11434/api/tags`
2. Backend server'ın çalıştığını kontrol edin: `curl http://localhost:3000/health`
3. Firewall/antivirus ayarlarını kontrol edin

### Boş Yanıt Geliyor

**Çözüm**:

1. Model yüklü mü kontrol edin: `ollama list`
2. Model adı doğru mu: `qwen3:8b`
3. Backend loglarını kontrol edin: `npm run dev` (nodemon ile)

### CORS Hatası (Production)

**Not**: Yerel development için backend localhost:3000'de çalışır. Production için:

- Backend'i bir sunucuya deploy edin (Render, Railway, Vercel Functions)
- `OllamaService.baseUrl`'i güncelleyin
- CORS ayarlarını yapılandırın

---

## 📊 Test Komutları

### Backend Test

```powershell
cd local_llm_bridge
node test-backend.js
```

**Beklenen çıktı**:

```
🧪 Backend test başlıyor...
✅ Yanıt alındı:
Success: true
Model: qwen3:8b
Message: [AI yanıtı...]
✅ Backend çalışıyor!
```

### Ollama Test

```powershell
cd local_llm_bridge
npm test
```

---

## 📝 Örnek Sohbet

**Kullanıcı**: "Ekşi mayalı ekmeğiniz var mı?"  
**AI**: "Evet, elimizde ekşi mayalı ekmek bulunuyor. 500g'lık paketler halinde satılıyor ve fiyatı 30 TL. Organik buğdaydan yapılmış, doğal fermentasyon ile hazırlanıyor. 🍞"

**Kullanıcı**: "Teslimat yapıyor musunuz?"  
**AI**: "Evet, Ankara içi ücretsiz teslimat yapıyoruz. Minimum sipariş tutarı 50 TL. Sipariş vermek için WhatsApp üzerinden iletişime geçebilirsiniz: 0501 012 6653"

---

## 🎯 Özellikler

### ✅ Tamamlanan

- [x] AI Mode toggle button
- [x] Text input + send button
- [x] Typing indicator
- [x] Context-aware chat (geçmiş mesajları hatırlar)
- [x] Error handling ve fallback mesajları
- [x] Mod değiştirme (AI ↔ Menu)
- [x] Ollama backend integration
- [x] System prompt ile özelleştirilmiş AI

### 🔄 İyileştirme Fikirleri

- [ ] Streaming responses (gerçek zamanlı AI yanıtı)
- [ ] Voice input (ses ile mesaj gönderme)
- [ ] Multi-language support (AI farklı dillerde yanıt)
- [ ] Chat history kaydetme (Firestore'a)
- [ ] Admin panel'den system prompt düzenleme
- [ ] Model seçimi (kullanıcı farklı model seçebilir)

---

## 📚 Daha Fazla Bilgi

- **Ollama Dokümantasyonu**: [OLLAMA_INTEGRATION.md](./OLLAMA_INTEGRATION.md)
- **ChatBot Sistemi**: [CHATBOT_README.md](./CHATBOT_README.md)
- **Backend API**: [local_llm_bridge/README.md](./local_llm_bridge/README.md)

---

**SON GÜNCELLEME**: 2025-12-09  
**DURUM**: ✅ Production Ready  
**DEPLOYMENT**: <https://eksimayaliekmekweb.web.app>
