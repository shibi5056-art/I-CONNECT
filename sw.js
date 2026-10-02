const CACHE_NAME = 'iconnect-pos-cache-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('Pre-cache non-blocking error:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API Calls: Route to Network with Tunnel Bypass Headers
    if (url.pathname.startsWith('/api/')) {
        const modifiedHeaders = new Headers(event.request.headers);
        modifiedHeaders.set('Bypass-Tunnel-Reminder', 'true');
        modifiedHeaders.set('X-Pinggy-No-Screen', 'true');

        const reqInit = {
            headers: modifiedHeaders,
            credentials: event.request.credentials
        };

        if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
            reqInit.method = event.request.method;
            try {
                reqInit.body = event.request.clone().body;
            } catch (e) {}
        }

        const modifiedRequest = new Request(event.request, reqInit);
        event.respondWith(
            fetch(modifiedRequest).catch(() => {
                // If offline and requesting API data: return offline JSON indicator
                return new Response(JSON.stringify({ offline: true, error: 'Device offline' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // 2. Navigation & Static Assets: Stale-While-Revalidate with Cache Fallback
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Offline fallback: If navigating to an HTML page, serve cached index.html
                if (cachedResponse) return cachedResponse;
                if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/index.html') || caches.match('/');
                }
            });

            return cachedResponse || networkFetch;
        })
    );
});
