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

export default api;
