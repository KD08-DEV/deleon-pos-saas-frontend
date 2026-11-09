import { refreshTableViews } from "../lib/tableOperations";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {  connectSocket, getSocket } from "./socket";
import { getScope } from "../lib/api";

const EVENTS = ["tenant:tablesUpdated", "tablesUpdated", "tenant:orderUpdated"];

export const useTablesRealtime = ({ tenantId, baseUrl } = {}) => {
    const qc = useQueryClient();

    useEffect(() => {
        let socket = getSocket();
        if (!socket && tenantId) {
            socket = connectSocket({ tenantId, baseUrl });
        }
        if (!socket) return;

        // asegura conexión activa (si estaba creado pero desconectado)
        if (!socket.connected) socket.connect();

        const onTablesUpdated = (payload) => {
            if (payload?.tenantId && tenantId && payload.tenantId !== tenantId) return;
            // No refrescar mesas de la principal al recibir un evento de otra sede.
            const activeClientId = String(getScope().clientId || "default");
            if (payload?.clientId && String(payload.clientId) !== activeClientId) return;

            void refreshTableViews(qc);
        };

        EVENTS.forEach((ev) => {
            socket.off(ev, onTablesUpdated);
            socket.on(ev, onTablesUpdated);
        });

        // al reconectar, fuerza refresh inmediato (clave para “instant”)
        const onConnect = () => {
            void refreshTableViews(qc);
        };
        socket.off("connect", onConnect);
        socket.on("connect", onConnect);

        return () => {
            EVENTS.forEach((ev) => socket.off(ev, onTablesUpdated));
            socket.off("connect", onConnect);
        };
    }, [qc, tenantId, baseUrl]);
};
