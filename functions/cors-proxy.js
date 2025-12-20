// Firebase Cloud Function - CORS Proxy
// Bu fonksiyon Storage URL'lerini CORS header'ları ile proxy eder

const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

exports.storageProxy = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    // CORS header'larını ekle
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');

    // Storage URL'sini al
    const storageUrl = req.query.url;
    if (!storageUrl) {
      res.status(400).send('Missing URL parameter');
      return;
    }

    // Storage'dan görseli al ve client'a gönder
    const https = require('https');
    https.get(storageUrl, (storageRes) => {
      res.set('Content-Type', storageRes.headers['content-type']);
      storageRes.pipe(res);
    }).on('error', (error) => {
      console.error('Proxy error:', error);
      res.status(500).send('Proxy error');
    });
  });
});
