// ===============================
// CONFIGURACIÓN DE CACHE
// ===============================
const STATIC_CACHE = "pos-static-v2";
const API_CACHE = "pos-api-v1";

const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// ===============================
// INSTALL – Precargar assets
// ===============================
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// ===============================
// ACTIVATE – Limpiar caches viejos
// ===============================
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ===============================
// PROTEGER VITE DEV SERVER 🛑
// ===============================
// Ignorar archivos especiales de Vite (HMR),
// estos solo existen en desarrollo y rompen el SW
const ignoreViteRequest = (url) =>
    url.includes("@react-refresh") ||
    url.includes("__vite") ||
    url.includes("vite") ||
    url.includes("hmr") ||
    url.includes("react-refresh");

const canCacheResponse = (response) => {
    // Cache API NO soporta 206 (partial content)
    if (!response) return false;
    if (response.status === 206) return false;

    // Solo cachear respuestas OK
    if (!response.ok) return false;

    // Opaque suele ser cross-origin sin CORS (mejor no cachearlo aquí)
    if (response.type === "opaque") return false;

    return true;
};


// ===============================
// FETCH – Caching avanzado
// ===============================
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Ignorar POST/PUT/etc
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.pathname.endsWith(".pdf") || url.pathname.includes("invoice")) {
        return; // que vaya directo a la red
    }

    // 🛑 Ignorar peticiones de Vite Dev Server
    if (ignoreViteRequest(url.pathname) || ignoreViteRequest(url.href)) {
        // IMPORTANTE: dejar que vayan directo a la red
        return;
    }

    // ===============================
    // 1) NAVEGACIÓN – fallback a index.html
    // ===============================
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (canCacheResponse(response)) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match("/index.html"))
        );
        return;
    }

    // ===============================
    // 2) API – Network-first
    // ===============================
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (canCacheResponse(response)) {
                        const clone = response.clone();
                        caches.open(API_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() =>
                    caches.open(API_CACHE).then((cache) =>
                        cache.match(request)
                    )
                )
        );
        return;
    }



    // ===============================
    // 3) STATIC – Cache-first
    // ===============================
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
                if (canCacheResponse(response)) {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                }
                return response;

            });
        })
    );
});
