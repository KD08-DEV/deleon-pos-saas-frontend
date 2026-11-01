/** Elimina caches de API antiguas sin borrar recursos offline de la PWA. */
export async function purgeLegacyApiCaches() {
    if (typeof window === "undefined" || !("caches" in window)) return;
    const keys = await window.caches.keys();
    await Promise.all(keys.map(async (key) => {
        if (/^pos-api-/.test(key) || /^api-cache(?:-|$)/.test(key)) {
            await window.caches.delete(key);
            return;
        }
        const cache = await window.caches.open(key);
        const requests = await cache.keys();
        await Promise.all(requests.filter((request) => {
            const pathname = new URL(request.url).pathname;
            return pathname === "/api" || pathname.startsWith("/api/");
        }).map((request) => cache.delete(request)));
    }));
}
