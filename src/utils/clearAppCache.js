export async function clearAppCache() {
    // 1) Borra Cache Storage (lo que usa el Service Worker)
    if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 2) Des-registra Service Workers (para evitar que siga sirviendo assets viejos)
    if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
    }
}

export async function clearAuthAndReload({ redirect = "/login" } = {}) {
    // Borra auth/scope
    localStorage.removeItem("token");
    localStorage.removeItem("scope");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("clientId");

    await clearAppCache();

    // Hard reload con cache-busting
    window.location.href = `${redirect}?t=${Date.now()}`;
}
