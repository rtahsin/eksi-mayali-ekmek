// Ollama Bağlantı Test Scripti

const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';

async function testOllama() {
  console.log('🧪 Ollama bağlantısı test ediliyor...\n');

  try {
    // 1. Health check
    console.log('1️⃣ Health check...');
    const health = await axios.get(`${OLLAMA_URL}`);
    console.log('✅ Ollama çalışıyor!\n');

    // 2. Model listesi
    console.log('2️⃣ Mevcut modeller:');
    const models = await axios.get(`${OLLAMA_URL}/api/tags`);
    if (models.data.models && models.data.models.length > 0) {
      models.data.models.forEach((model, index) => {
        console.log(`   ${index + 1}. ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
      });
    } else {
      console.log('   ⚠️ Hiç model yüklü değil!');
      console.log('   Model yüklemek için: ollama pull llama3.2');
    }
    console.log('');

    // 3. Test mesajı
    console.log('3️⃣ Test mesajı gönderiliyor...');
    const testPrompt = 'Merhaba, sen kimsin?';
    console.log(`   Prompt: "${testPrompt}"`);

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'qwen3:8b', // Yüklü model
      prompt: testPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 100
      }
    });

    console.log(`   Yanıt: "${response.data.response.trim()}"`);
    console.log('');
    console.log('✅ Tüm testler başarılı! Ollama hazır.');

  } catch (error) {
    console.error('❌ Hata:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️ Ollama çalışmıyor!');
      console.log('Başlatmak için: ollama serve');
    } else if (error.response?.status === 404) {
      console.log('\n⚠️ Model bulunamadı!');
      console.log('Model yüklemek için: ollama pull llama3.2');
    }
  }
}

testOllama();
