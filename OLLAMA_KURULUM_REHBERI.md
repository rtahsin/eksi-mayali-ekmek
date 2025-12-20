# 🤖 OLLAMA DEVELOPMENT MODE KURULUM REHBERİ

Bu rehber, Ollama LLM'i local development ortamında çalıştırmak için adım adım talimatlar içerir.

---

## 📋 GEREKSİNİMLER

1. **Node.js** (v16+) - Backend server için
2. **Ollama** - LLM runtime
3. **Git** (opsiyonel)

---

## 🚀 ADIM 1: OLLAMA KURULUMU

### Windows için

1. Ollama'yı indirin:

   ```
   https://ollama.ai/download
   ```

2. İndirilen `OllamaSetup.exe` dosyasını çalıştırın

3. Kurulum sonrası Ollama otomatik başlayacak (arka planda çalışır)

4. Kontrol için PowerShell'de test edin:

   ```powershell
   ollama --version
   ```

### Mac için

```bash
brew install ollama
```

### Linux için

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

---

## 🤖 ADIM 2: LLM MODEL İNDİRME

Ollama kurduktan sonra bir model indirmeniz gerekiyor:

### Önerilen Modeller (Performans sırasına göre)

#### 1️⃣ **Llama 3.2 (3B)** - Hızlı, hafif (ÖNERILEN)

```powershell
ollama pull llama3.2:latest
```

**Boyut:** ~2GB  
**RAM:** 4GB minimum  
**Hız:** Çok hızlı ⚡

#### 2️⃣ **Qwen 2.5 (3B)** - Daha akıllı

```powershell
ollama pull qwen2.5:3b
```

**Boyut:** ~2GB  
**RAM:** 4GB minimum  
**Hız:** Hızlı ⚡

#### 3️⃣ **Mistral (7B)** - Dengeli

```powershell
ollama pull mistral:latest
```

**Boyut:** ~4.1GB  
**RAM:** 8GB önerilen  
**Hız:** Orta 🔥

#### 4️⃣ **Llama 3 (8B)** - Güçlü

```powershell
ollama pull llama3:8b
```

**Boyut:** ~4.7GB  
**RAM:** 8GB gerekli  
**Hız:** Yavaş 🐢

### İndirilen modelleri kontrol edin

```powershell
ollama list
```

Çıktı şöyle görünecek:

```
NAME                    ID              SIZE     MODIFIED
llama3.2:latest        abcd1234        1.9 GB   2 hours ago
```

---

## 🔧 ADIM 3: OLLAMA SERVİSİNİ BAŞLATMA

### Windows

Ollama kurulumdan sonra otomatik başlar. Kontrol için:

```powershell
# Çalışıyor mu kontrol et
curl http://localhost:11434
```

Cevap: `Ollama is running` ✅

### Manuel başlatma (gerekirse)

```powershell
ollama serve
```

---

## 🌐 ADIM 4: BACKEND SERVER KURULUMU

### 1. Klasöre gidin

```powershell
cd f:\ekmeklab_app\local_llm_bridge
```

### 2. Node modüllerini yükleyin

```powershell
npm install
```

Çıktı:

```
added 57 packages, and audited 58 packages in 3s
```

### 3. Backend'i başlatın

```powershell
npm start
```

veya development mode (otomatik reload):

```powershell
npm run dev
```

Başarılı çıktı:

```
✅ Ollama Bridge Server başlatıldı: http://localhost:3000
🤖 Ollama URL: http://localhost:11434
```

---

## ✅ ADIM 5: TEST EDİN

### 1. Yeni bir PowerShell penceresi açın

### 2. Health check

```powershell
curl http://localhost:3000/health
```

Cevap:

```json
{"status":"ok","timestamp":"2025-12-16T..."}
```

### 3. Modelleri listele

```powershell
curl http://localhost:3000/api/models
```

### 4. Chat test

```powershell
curl -X POST http://localhost:3000/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"message\":\"Merhaba, ürünleriniz hakkında bilgi alabilir miyim?\"}'
```

Başarılı cevap:

```json
{
  "success": true,
  "message": "Merhaba! 🍞 Tabii ki...",
  "model": "llama3.2:latest"
}
```

---

## 🎨 ADIM 6: FLUTTER UYGULAMASINI AYARLAYYIN

### 1. OllamaService'i development mode'a alın

Dosya: `lib/services/ollama_service.dart`

```dart
// Line 23-24 civarı:
static const bool _isLocalhost = true;  // ⚠️ BUNU TRUE YAP
```

### 2. Flutter uygulamasını yeniden başlatın

```powershell
cd f:\ekmeklab_app
flutter run -d chrome
```

### 3. Test edin

- Ana sayfada sağ altta **"Canlı Destek"** butonuna tıklayın
- Bir mesaj gönderin
- AI yanıt vermeli! 🎉

---

## 🔍 SORUN GİDERME

### ❌ Ollama çalışmıyor

**Çözüm:**

```powershell
# Servisi yeniden başlat
ollama serve
```

### ❌ Backend bağlanamıyor

**Kontrol:**

```powershell
# Ollama çalışıyor mu?
curl http://localhost:11434

# Backend çalışıyor mu?
curl http://localhost:3000/health
```

### ❌ Model indirme takılı kaldı

**Çözüm:**

```powershell
# İndirmeyi iptal et (Ctrl+C)
# Yeniden dene
ollama pull llama3.2:latest
```

### ❌ "Cannot find module 'express'"

**Çözüm:**

```powershell
cd f:\ekmeklab_app\local_llm_bridge
npm install
```

### ❌ Port 3000 zaten kullanımda

**Çözüm:**

```powershell
# Port değiştir
$env:PORT=3001
npm start
```

Sonra `ollama_service.dart`'ta:

```dart
static const String _backendUrl = 'http://localhost:3001';
```

---

## 📊 PERFORMANS İPUÇLARI

### Bilgisayarınıza göre model seçimi

| RAM      | CPU       | Önerilen Model        | Yanıt Süresi |
|----------|-----------|----------------------|--------------|
| 4GB      | Düşük     | llama3.2:latest (3B) | 2-3 saniye   |
| 8GB      | Orta      | qwen2.5:3b           | 3-5 saniye   |
| 16GB     | İyi       | mistral:latest (7B)  | 5-8 saniye   |
| 16GB+    | Yüksek    | llama3:8b            | 8-12 saniye  |

### GPU Kullanımı

Eğer NVIDIA GPU'nuz varsa, Ollama otomatik kullanır (CUDA desteği ile).

Kontrol:

```powershell
ollama ps
```

---

## 🎯 PRODUCTION'A GEÇİŞ

Production'da Ollama çalışmayacağı için:

### 1. OllamaService'i kapatın

```dart
static const bool _isLocalhost = false;  // Production
```

### 2. Alternatif çözümler

- **OpenAI API** kullanın (ücretli)
- **Cloud Ollama** (Railway, Render vb.)
- **Firebase Functions** ile OpenAI/Anthropic entegrasyonu

---

## ✅ BAŞARILI KURULUM KONTROLÜ

Eğer aşağıdaki adımlar çalışıyorsa, kurulum başarılı:

- [ ] `ollama --version` çalışıyor
- [ ] `ollama list` model gösteriyor
- [ ] `curl http://localhost:11434` çalışıyor
- [ ] `npm start` backend başlatıyor
- [ ] `curl http://localhost:3000/health` OK dönüyor
- [ ] Flutter uygulamasında chat yanıt veriyor

---

## 📞 YARDIM

Sorun yaşıyorsanız:

1. Terminal çıktılarını kontrol edin
2. Log'lara bakın
3. GitHub Issues açın

**Başarılar!** 🚀🍞
