import { useSelector } from "react-redux";

export default function useTenant() {
    // Soporta varias estructuras de store por si cambiaste reducers
    const tenant = useSelector((state) =>
        state?.store?.tenant ?? state?.tenant ?? state?.auth?.tenant ?? null
    );

    return {
        // Backwards compatible (muchos componentes esperan tenantInfo)
        tenantInfo: tenant,

        // Campos directos útiles
        tenantId: tenant?.tenantId || null,
        business: tenant?.business || null,
        fiscal: tenant?.fiscal || null,
        name: tenant?.name || null,
        plan: tenant?.plan || null,
        status: tenant?.status || null,
    };
}
