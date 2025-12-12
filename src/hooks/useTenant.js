// src/hooks/useTenant.js
import { useSelector } from "react-redux";

export default function useTenant() {
    // 1️⃣ El usuario logueado SIEMPRE trae tenantId
    const user = useSelector((state) => state.user?.data);

    // 2️⃣ La información REAL del tenant vive en state.store.tenant
    const tenant = useSelector((state) => state.store?.tenant);

    return {
        tenantId: user?.tenantId || null,
        business: tenant?.business || null,
        fiscal: tenant?.fiscal || null,
        name: tenant?.name || null,
    };
}
