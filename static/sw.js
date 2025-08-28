// Dragon World Alliance Manager - Service Worker
const CACHE_NAME = 'dragon-world-v1.0.0';
const STATIC_CACHE_NAME = 'dragon-world-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'dragon-world-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/guides',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/js/dashboard.js',
  '/static/manifest.json',
  // Bootstrap and external libraries
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://code.jquery.com/jquery-3.6.0.min.js'
];

// Files that should always be fetched from network
const NETWORK_FIRST = [
  '/api/',
  '/health'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('dragon-world-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// Fetch event - handle requests with different strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Network first for API calls
  if (NETWORK_FIRST.some(path => url.pathname.startsWith(path))) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Cache first for static resources
  if (isStaticResource(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Stale while revalidate for pages
  event.respondWith(staleWhileRevalidate(request));
});

// Cache first strategy (for static resources)
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || createOfflinePage();
    }
    
    // Return cached version or error
    return caches.match(request) || new Response('Offline', { status: 503 });
  }
}

// Network first strategy (for API calls)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses for short time
    if (networkResponse.status === 200 && request.url.includes('/api/')) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network first failed:', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Network unavailable', 
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale while revalidate strategy (for pages)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.error('[SW] Background fetch failed:', error);
      return cachedResponse;
    });
  
  // Return cached version immediately if available
  return cachedResponse || fetchPromise;
}

// Check if request is for a static resource
function isStaticResource(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') ||
         url.hostname !== location.hostname ||
         STATIC_FILES.includes(url.pathname);
}

// Create basic offline page
function createOfflinePage() {
  const offlineHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Dragon World</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                text-align: center;
                padding: 20px;
            }
            .offline-container {
                max-width: 400px;
            }
            .dragon-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            h1 {
                margin: 0 0 1rem 0;
                font-size: 2rem;
            }
            p {
                margin: 0 0 2rem 0;
                opacity: 0.9;
                line-height: 1.5;
            }
            button {
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            button:hover {
                background: rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.5);
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="dragon-icon">🐉</div>
            <h1>You're Offline</h1>
            <p>The Dragon World Alliance Manager is currently unavailable. Please check your internet connection and try again.</p>
            <button onclick="location.reload()">Try Again</button>
        </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHtml, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background sync for form submissions (when supported)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle any queued operations when back online
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    // Implement background sync logic here if needed
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handler (for future use)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);
    
    const options = {
      body: data.body,
      icon: '/static/icons/icon-192x192.png',
      badge: '/static/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/static/icons/icon-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service worker script loaded');