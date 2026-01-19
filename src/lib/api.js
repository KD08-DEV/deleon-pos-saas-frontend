// pos-frontend/src/lib/api.js
import axios from "axios";

export function getScope() {
    try { return JSON.parse(localStorage.getItem("scope") || "{}"); }
    catch { return {}; }
}
export function setScope({ tenantId, clientId = "default" }) {
    const scope = { tenantId, clientId: clientId || "default" };
    localStorage.setItem("scope", JSON.stringify(scope));
    return scope;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    // token (si tu backend devuelve JWT; si usas cookie, no pasa nada por enviarlo)
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // aislamiento SaaS
    const { tenantId, clientId } = getScope();
    if (tenantId) config.headers["x-tenant-id"] = tenantId;
    if (clientId || clientId === undefined) {
        config.headers["x-client-id"] = clientId || "default";
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status;
        const message = String(err?.response?.data?.message || err?.message || "");

        // Solo disparar “force logout” cuando sea sesión inválida por otro dispositivo
        const isSessionMismatch =
            status === 401 &&
            message.toLowerCase().includes("session expired") &&
            message.toLowerCase().includes("another device");

        if (isSessionMismatch) {
            // Limpieza opcional (si usas token en localStorage)
            localStorage.removeItem("token");

            // Disparar evento global para que App.jsx haga dispatch + navigate
            window.dispatchEvent(
                new CustomEvent("auth:forceLogout", {
                    detail: { status, message },
                })
            );
        }

        return Promise.reject(err);
    }
);

export default api;
