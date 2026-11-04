import { io } from "socket.io-client";

let socket = null;
let currentTenantId = null;
let currentClientId = null;
let currentAuthToken = null;
let currentBaseUrl = null;

const resolveBaseUrl = (baseUrl) =>
    baseUrl ||
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    window.location.origin;

export const connectSocket = ({ baseUrl, tenantId } = {}) => {
    if (!tenantId) return socket;
    const token = localStorage.getItem("token");
    if (!token) { disconnectSocket(); return null; }
    let branchId = "default";
    try { branchId = JSON.parse(localStorage.getItem("scope") || "{}").clientId || "default"; }
    catch { /* default branch */ }

    // Cualquier cambio de negocio, sucursal, sesion o URL exige autenticacion nueva.
    const resolvedUrl = resolveBaseUrl(baseUrl);
    if (socket && (currentTenantId !== tenantId || currentClientId !== branchId || currentAuthToken !== token || currentBaseUrl !== resolvedUrl)) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }

    if (socket) return socket;

    currentTenantId = tenantId;
    currentClientId = branchId;
    currentAuthToken = token;
    currentBaseUrl = resolvedUrl;

    socket = io(resolvedUrl, {
        withCredentials: true,
        transports: ["websocket"], // instantáneo (evita long-poll delays)
        auth: { token, clientId: branchId },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 300,
        reconnectionDelayMax: 1500,
        timeout: 10000,
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
    }
    socket = null;
    currentTenantId = null;
    currentClientId = null;
    currentAuthToken = null;
    currentBaseUrl = null;
};

export const getSocket = () => socket;
