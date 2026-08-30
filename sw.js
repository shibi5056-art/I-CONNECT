const BYPASS_HEADER = 'X-Pinggy-No-Screen';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Only intercept requests destined for our own origin
    if (url.origin === self.location.origin) {
        // We cannot modify headers of navigation requests in some environments directly, 
        // but we can clone and modify headers for standard fetch and sub-resources.
        const modifiedHeaders = new Headers(event.request.headers);
        modifiedHeaders.set(BYPASS_HEADER, 'true');

        // Build a new request configuration
        const reqInit = {
            headers: modifiedHeaders,
            credentials: event.request.credentials
        };

        // For non-GET requests (POST, etc.), clone the body
        if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
            reqInit.method = event.request.method;
            // Service workers require cloning the request body stream
            reqInit.body = event.request.clone().body;
        }

        const modifiedRequest = new Request(event.request, reqInit);

        event.respondWith(
            fetch(modifiedRequest).catch(() => {
                // Fallback to original request in case of any issues
                return fetch(event.request);
            })
        );
    }
});
