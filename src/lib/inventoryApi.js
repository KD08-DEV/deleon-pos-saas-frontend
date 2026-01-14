import api from "./api";

export const inventoryApi = {
    listItems: (params = {}) => api.get("/api/inventory/items", { params }),
    createItem: (payload) => api.post("/api/inventory/items", payload),
    updateItem: (id, payload) => api.put(`/api/inventory/items/${id}`, payload),
    archiveItem: (id) => api.delete(`/api/inventory/items/${id}`),

    lowStock: () => api.get("/api/inventory/low-stock"),

    createMovement: (payload) => api.post("/api/inventory/movements", payload),
    listMovements: (params = {}) => api.get("/api/inventory/movements", { params }),
    consumption: (params = {}) => api.get("/api/inventory/consumption", { params }),

    exportItemsCSV: () => api.get("/api/inventory/export/items.csv", { responseType: "blob" }),
    exportMovementsCSV: (params = {}) =>
        api.get("/api/inventory/export/movements.csv", { params, responseType: "blob" }),

};

export function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}
