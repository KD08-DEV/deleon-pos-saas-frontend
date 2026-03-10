import axios from "axios";

export async function printWithTenantConfig({
                                                config,
                                                type,
                                                printer,
                                                fallbackPrint,
                                                payload,
                                            }) {
    const mode = printer?.mode || config?.mode || "browser";

    if (mode === "browser") {
        await fallbackPrint?.();
        return { success: true, message: "Abriendo impresión del navegador." };
    }

    if (mode === "network") {
        const bridgeBase = String(printer?.host || "").trim();

        if (!bridgeBase) {
            throw new Error("LOCAL_PRINT_BRIDGE_NOT_CONFIGURED");
        }

        const endpoint =
            type === "invoice"
                ? `${bridgeBase}/print/network/invoice`
                : `${bridgeBase}/print/network/ticket`;

        const { data } = await axios.post(endpoint, {
            printer: {
                ip: printer?.ip,
                port: printer?.port || 9100,
                alias: printer?.alias || "",
                name: printer?.name || "",
            },
            payload,
        });

        return data;
    }

    await fallbackPrint?.();
    return { success: true, message: "Fallback ejecutado." };
}