import api from "../lib/api";

export async function printWithTenantConfig({
                                                config,
                                                type,
                                                printer = null,
                                                fallbackPrint,
                                                payload = null,
                                            }) {
    const enabled = config?.enabled === true;
    const mode = printer?.mode || config?.mode || "browser";

    if (!enabled) {
        await fallbackPrint?.();
        return {
            ok: true,
            mode: "browser",
            message: "La impresión personalizada está desactivada. Se usó la impresión normal del navegador.",
        };
    }

    if (!printer) {
        await fallbackPrint?.();
        return {
            ok: true,
            mode: "browser",
            message: "No hay impresora seleccionada. Se usó la impresión normal del navegador.",
        };
    }

    if (mode === "browser") {
        await fallbackPrint?.();
        return {
            ok: true,
            mode: "browser",
            message: `Se usó impresión del navegador. Impresora seleccionada: ${printer.alias || printer.name || "Sin nombre"}.`,
        };
    }

    if (mode === "qz") {
        await fallbackPrint?.();
        return {
            ok: true,
            mode: "qz-fallback",
            message: `La impresora "${printer.alias || printer.name}" está en modo QZ, pero QZ aún no está implementado. Se usó el navegador.`,
        };
    }

    if (mode === "network") {
        if (!payload) {
            return {
                ok: false,
                mode: "network",
                message:
                    type === "invoice"
                        ? "Falta el payload de la factura para imprimir por red."
                        : "Falta el payload del ticket para imprimir por red.",
            };
        }

        const endpoint =
            type === "invoice"
                ? `/api/printers/${printer._id}/print-invoice`
                : `/api/printers/${printer._id}/print-ticket`;

        const res = await api.post(endpoint, payload);

        return {
            ok: true,
            mode: "network",
            message:
                res?.data?.message ||
                (type === "invoice"
                    ? `Factura enviada a la impresora de red ${printer.alias || printer.name || ""}.`
                    : `Ticket enviado a la impresora de red ${printer.alias || printer.name || ""}.`),
            data: res?.data?.data || null,
        };
    }

    await fallbackPrint?.();
    return {
        ok: true,
        mode: "browser",
        message: "Se usó la impresión normal del navegador.",
    };
}