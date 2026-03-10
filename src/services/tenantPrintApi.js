import api from "../lib/api";

export const listPrinters = async (params = {}) => {
    const res = await api.get("/api/printers", { params });
    return res.data?.data || [];
};

export const getPrinterById = async (id) => {
    const res = await api.get(`/api/printers/${id}`);
    return res.data?.data || null;
};

export const createPrinter = async (payload) => {
    const res = await api.post("/api/printers", payload);
    return res.data;
};

export const updatePrinter = async (id, payload) => {
    const res = await api.patch(`/api/printers/${id}`, payload);
    return res.data;
};

export const deletePrinter = async (id) => {
    const res = await api.delete(`/api/printers/${id}`);
    return res.data;
};

export const setDefaultPrinter = async (id) => {
    const res = await api.patch(`/api/printers/${id}/default`);
    return res.data;
};