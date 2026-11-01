import { getScope } from "./lib/api";

export const QK = {
    ADMIN_FISCAL_CONFIG: ["admin-fiscal-config"],
    TENANT_CONFIG: ["tenant-config"],

    // Mesas
    get TABLES() { const scope = getScope(); return ["tables", String(scope.tenantId || ""), String(scope.clientId || "default")]; },

    // Órdenes (por si lo necesitas luego)
    ORDERS: ["orders"],
};
