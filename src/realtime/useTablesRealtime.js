import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {  connectSocket, getSocket } from "./socket";
import { QK } from "../queryKeys";

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

            qc.invalidateQueries({ queryKey: QK.TABLES, exact: true });
            qc.refetchQueries({ queryKey: QK.TABLES, exact: true, type: "active" });
        };

        EVENTS.forEach((ev) => {
            socket.off(ev, onTablesUpdated);
            socket.on(ev, onTablesUpdated);
        });

        // al reconectar, fuerza refresh inmediato (clave para “instant”)
        const onConnect = () => {
            qc.refetchQueries({ queryKey: QK.TABLES, exact: true, type: "active" });
        };
        socket.off("connect", onConnect);
        socket.on("connect", onConnect);

        return () => {
            EVENTS.forEach((ev) => socket.off(ev, onTablesUpdated));
            socket.off("connect", onConnect);
        };
    }, [qc, tenantId, baseUrl]);
};
