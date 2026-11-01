/**
 * Obtiene una URL efímera del PDF de una orden visible en el cierre.
 * No solicita emitir NCF/e-CF ni altera totales/caja. El POST legacy
 * genera solo el PDF de una orden existente cuando no hay archivo guardado.
 * La autorización final siempre corresponde al backend por tenant/sucursal/rol.
 */
const ORDER_ID = /^[a-f0-9]{24}$/i;

export function validateInvoicePdfUrl(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) {
        throw new Error("INVOICE_PDF_URL_MISSING");
    }
    let parsed;
    try { parsed = new URL(rawUrl); }
    catch { throw new Error("INVOICE_PDF_URL_INVALID"); }
    const localHttp = parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !localHttp) {
        throw new Error("INVOICE_PDF_URL_UNSAFE");
    }
    if (parsed.username || parsed.password) {
        throw new Error("INVOICE_PDF_URL_UNSAFE");
    }
    return parsed.href;
}

export async function getClosingInvoicePdfUrl(api, orderId, { download = false } = {}) {
    const id = String(orderId || "");
    if (!ORDER_ID.test(id)) throw new Error("INVALID_ORDER_ID");
    if (typeof api?.get !== "function" || typeof api?.post !== "function") {
        throw new Error("INVOICE_API_UNAVAILABLE");
    }

    const endpoint = `/api/order/${id}/invoice${download ? "?download=1" : ""}`;
    let result;
    try {
        result = await api.get(endpoint);
    } catch (error) {
        if (error?.response?.status !== 404) throw error;
        // Genera un PDF a partir de la orden EXISTENTE. El endpoint POST
        // hace el control de roles y sucursal y NO crea nuevos NCF/e-NCF.
        await api.post("/api/invoice", { orderId: id });
        result = await api.get(endpoint);
    }
    return validateInvoicePdfUrl(result?.data?.url);
}
