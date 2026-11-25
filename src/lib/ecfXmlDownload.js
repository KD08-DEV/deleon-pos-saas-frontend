// Descarga de XML firmados de e-CF. El backend vuelve a validar rol, tenant y sucursal.
const ERROR_MESSAGES = {
    SIGNED_XML_NOT_AVAILABLE: "Este comprobante no tiene XML firmado guardado.",
    RFCE_XML_NOT_AVAILABLE: "Este comprobante no tiene resumen de consumo (RFCE) guardado.",
    ECF_DOCUMENT_NOT_FOUND: "No se encontró el comprobante en esta sucursal.",
    NO_SIGNED_XML_IN_RANGE: "No hay comprobantes con XML firmado en ese rango.",
    DATE_RANGE_TOO_LARGE: "El rango máximo es de 92 días.",
    DATE_RANGE_REVERSED: "La fecha inicial es posterior a la final.",
    INVALID_DATE_RANGE: "Selecciona un rango de fechas válido.",
    TOO_MANY_DOCUMENTS: "Hay demasiados comprobantes en ese rango. Usa un rango más corto.",
};

function fileNameFrom(headers, fallback) {
    const header = String(headers?.["content-disposition"] || "");
    const match = header.match(/filename="?([^";]+)"?/i);
    return match ? match[1] : fallback;
}

function saveBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Las respuestas de error llegan como Blob por responseType "blob".
export async function describeEcfXmlError(error) {
    const status = error?.response?.status;
    let code = "";
    try {
        const data = error?.response?.data;
        const text = data instanceof Blob ? await data.text() : JSON.stringify(data || {});
        code = String(JSON.parse(text)?.code || "");
    } catch { /* respuesta no JSON */ }
    if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if (status === 401 || status === 403) return "Solo el dueño o un administrador puede descargar los XML.";
    return `No se pudo descargar el XML${status ? ` (error ${status})` : ""}.`;
}

export async function downloadEcfXml(api, documentId, kind = "ecf") {
    const response = await api.get(`/api/admin/ecf/documents/${encodeURIComponent(documentId)}/xml`, {
        params: { kind },
        responseType: "blob",
    });
    saveBlob(response.data, fileNameFrom(response.headers, `${kind}_${documentId}.xml`));
}

export async function downloadEcfXmlZip(api, { from, to, environment = "", documentType = "" }) {
    const response = await api.get("/api/admin/ecf/documents/export", {
        params: {
            from, to,
            ...(environment ? { environment } : {}),
            ...(documentType ? { documentType } : {}),
        },
        responseType: "blob",
    });
    saveBlob(response.data, fileNameFrom(response.headers, `e-CF_${from}_${to}.zip`));
}
