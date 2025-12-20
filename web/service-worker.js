// EkmekLab Service Worker
// Version: 1.0.0

const CACHE_VERSION = 'ekmeklab-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}-${Date.now()}`;

// Cache stratejisi için URL patterns
const CACHE_URLS = {
  // Static assets - cache first
  static: [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.png',
  ],
  // Images - cache with fallback
  images: /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i,
  // API calls - network first
  api: /firestore\.googleapis\.com|firebasestorage\.googleapis\.com/,
};

// Install event - önbelleğe temel dosyaları al
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(CACHE_URLS.static);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Yeni service worker'ı hemen aktif et
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - eski cache'leri temizle
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Mevcut cache dışındaki tüm eski cache'leri sil
            if (cacheName !== CACHE_NAME && cacheName.startsWith('ekmeklab-')) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        // Tüm açık sayfaları kontrol et
        return self.clients.claim();
      })
  );
});

// Fetch event - akıllı cache stratejisi
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece GET isteklerini cache'le
  if (request.method !== 'GET') {
    return;
  }

  // API calls - network first, fallback to cache
  if (CACHE_URLS.api.test(url.href)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Images - cache first, fallback to network
  if (CACHE_URLS.images.test(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages - network first with timeout
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithTimeout(request, 3000));
    return;
  }

  // Default - stale-while-revalidate
  event.respondWith(staleWhileRevalidateStrategy(request));
});

// Cache stratejileri
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache and network failed:', error);
    throw error;
  }
}

async function networkFirstWithTimeout(request, timeout) {
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    );

    const networkResponse = await Promise.race([networkPromise, timeoutPromise]);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network timeout or failed, trying cache');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback to index.html for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => {
    // Network hatası sessizce yoksay
  });

  return cachedResponse || fetchPromise;
}

// Message event - cache temizleme komutları
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }
});

console.log(`[Service Worker] Version ${CACHE_VERSION} loaded`);
