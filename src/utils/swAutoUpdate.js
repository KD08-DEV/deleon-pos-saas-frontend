// Aplica automáticamente las versiones nuevas publicadas en Vercel.
//
// El service worker (vite-plugin-pwa, autoUpdate + skipWaiting) instala la versión
// nueva en segundo plano, pero la pestaña abierta sigue con el código viejo hasta
// recargar. Las cajas dejan el POS abierto todo el día, así que nunca lo veían.
//
// - Al abrir la app: si llega una versión nueva en los primeros segundos, recarga ya.
// - Con la app abierta: revisa cada 15 minutos; si hay versión nueva, NO recarga en
//   medio de una venta: espera a que el usuario vaya a Inicio, Mesas u Órdenes.

const STARTUP_WINDOW_MS = 20000;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const SAFE_PATHS = ["/", "/tables", "/orders"];

export function setupServiceWorkerAutoUpdate() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const loadedAt = Date.now();
    // Primera instalación (sin controlador previo): no es una actualización.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let pendingReload = false;
    let reloading = false;

    const reloadNow = (path) => {
        if (reloading) return;
        reloading = true;
        if (path && path !== window.location.pathname) window.location.assign(path);
        else window.location.reload();
    };

    const isSafePath = (path) => SAFE_PATHS.includes(String(path || "").split("?")[0]);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController) return;
        if (Date.now() - loadedAt < STARTUP_WINDOW_MS || isSafePath(window.location.pathname)) {
            reloadNow();
        } else {
            pendingReload = true;
        }
    });

    // Navegación interna (React Router usa history.pushState / replaceState).
    const wrap = (method) => {
        const original = window.history[method];
        window.history[method] = function (...args) {
            const result = original.apply(this, args);
            if (pendingReload && isSafePath(window.location.pathname)) reloadNow();
            return result;
        };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", () => {
        if (pendingReload && isSafePath(window.location.pathname)) reloadNow();
    });

    const checkForUpdate = () => {
        navigator.serviceWorker.getRegistration()
            .then((registration) => registration?.update())
            .catch(() => {});
    };
    window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
    });
}
