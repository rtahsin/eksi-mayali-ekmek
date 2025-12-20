// Backend Test
const axios = require('axios');

async function testBackend() {
  try {
    console.log('🧪 Backend test başlıyor...\n');

    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'Ekşi maya nedir? Kısa açıkla.',
      model: 'qwen3:8b'
    });

    console.log('✅ Yanıt alındı:');
    console.log('Success:', response.data.success);
    console.log('Model:', response.data.model);
    console.log('Message:', response.data.message);
    console.log('\n✅ Backend çalışıyor!');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testBackend();
