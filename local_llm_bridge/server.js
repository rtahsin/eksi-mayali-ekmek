// Ollama ChatBot Backend - Express Server
// Ollama'yı Flutter Web'e bağlayan proxy sunucu

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ollama modelleri listesi
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    res.json(response.data);
  } catch (error) {
    console.error('Ollama models error:', error.message);
    res.status(500).json({ error: 'Ollama\'ya bağlanılamadı' });
  }
});

// ChatBot mesaj gönder
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, model } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mesaj gerekli' });
    }

    // EkmekLab için özel sistem promptu
    const systemPrompt = `Sen EkmekLab'ın müşteri hizmetleri asistanısın. 
Ekşi mayalı ekmek konusunda uzman bir asistandın. 
Müşterilere nazik, yardımsever ve bilgilendirici şekilde cevap ver.

EkmekLab Hakkında:
- Ekşi mayalı (sourdough) ekmek üretiyoruz
- İstanbul'da teslimat yapıyoruz
- Ürünlerimiz: Klasik Köy, Tam Buğday, Çekirdekli, Çavdar ekmeği
- Fiyatlar: 30-40 TL arası
- Teslimat: 24-48 saat içinde
- İletişim: 0501 012 66 53 (WhatsApp)

Kısa ve öz cevaplar ver. Emoji kullanabilirsin 🍞`;

    // Ollama'ya gönder
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: model || 'qwen3:8b', // Varsayılan model qwen3:8b
      prompt: `${systemPrompt}\n\nKullanıcı: ${message}\n\nAsistan:`,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 200, // Kısa cevaplar
      }
    });

    const aiResponse = response.data.response.trim();

    // Yanıt oluştur
    res.json({
      success: true,
      message: aiResponse,
      model: model || 'qwen3:8b', // Model adını doğru döndür
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ollama chat error:', error.message);
    res.status(500).json({
      success: false,
      error: 'LLM yanıt veremedi',
      details: error.message
    });
  }
});

// Streaming chat (opsiyonel - daha gelişmiş)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, model } = req.body;

    const systemPrompt = `Sen EkmekLab'ın asistanısın. Kısa ve öz cevaplar ver.`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: model || 'qwen3:8b',
      prompt: `${systemPrompt}\n\nKullanıcı: ${message}\n\nAsistan:`,
      stream: true,
    }, {
      responseType: 'stream'
    });

    response.data.on('data', (chunk) => {
      const text = chunk.toString();
      res.write(`data: ${text}\n\n`);
    });

    response.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

  } catch (error) {
    console.error('Streaming error:', error.message);
    res.status(500).json({ error: 'Streaming başarısız' });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`🚀 Ollama ChatBot Backend running on http://localhost:${PORT}`);
  console.log(`📡 Ollama URL: ${OLLAMA_URL}`);
  console.log(`🧪 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API Endpoints:`);
  console.log(`   GET  /api/models`);
  console.log(`   POST /api/chat`);
  console.log(`   POST /api/chat/stream`);
});

module.exports = app;
