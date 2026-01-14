import { io } from "socket.io-client";

let socket = null;
let currentTenantId = null;

const resolveBaseUrl = (baseUrl) =>
    baseUrl ||
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    window.location.origin;

export const connectSocket = ({ baseUrl, tenantId } = {}) => {
    if (!tenantId) return socket;

    // tenant cambió => reconectar limpio
    if (socket && currentTenantId && currentTenantId !== tenantId) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }

    if (socket) return socket;

    currentTenantId = tenantId;

    socket = io(resolveBaseUrl(baseUrl), {
        withCredentials: true,
        transports: ["websocket"], // instantáneo (evita long-poll delays)
        auth: { tenantId },
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
};

export const getSocket = () => socket;
