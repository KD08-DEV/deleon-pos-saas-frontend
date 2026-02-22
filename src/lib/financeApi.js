// src/lib/financeApi.js
import api from "./api";

// ===== Expense Categories =====
export const expenseCategoryApi = {
    list: () => api.get("/api/admin/expense-categories"),
    create: (payload) => api.post("/api/admin/expense-categories", payload),
    update: (id, payload) => api.put(`/api/admin/expense-categories/${id}`, payload),
    remove: (id) => api.delete(`/api/admin/expense-categories/${id}`),
};

// ===== Expenses =====
export const expensesApi = {
    list: (params = {}) => api.get("/api/admin/expenses", { params }),
    create: (payload) => api.post("/api/admin/expenses", payload),
    update: (id, payload) => api.put(`/api/admin/expenses/${id}`, payload),
    void: (id) => api.patch(`/api/admin/expenses/${id}/void`),
};

// ===== Payroll =====
export const payrollApi = {
    listRuns: (params = {}) => api.get("/api/admin/payroll/runs", { params }),
    getRun: (id) => api.get(`/api/admin/payroll/runs/${id}`),
    createRun: (payload) => api.post("/api/admin/payroll/runs", payload),
    updateRun: (id, payload) => api.put(`/api/admin/payroll/runs/${id}`, payload),
    postRun: (id) => api.post(`/api/admin/payroll/runs/${id}/post`),
};

// ===== Summary =====
export const summaryApi = {
    get: (params = {}) => api.get("/api/admin/summary", { params }),
};

// ✅ MERMA
export const mermaApi = {
    create: (payload) => api.post("/api/inventory/merma", payload),
    summary: (params = {}) => api.get("/api/inventory/merma/summary", { params }),

    createBatch: (payload) => api.post("/api/inventory/merma/batches", payload),
    listBatches: (params = {}) => api.get("/api/inventory/merma/batches", { params }),
    updateBatch: (id, payload) => api.patch(`/api/inventory/merma/batches/${id}`, payload),
    closeBatch: (id, payload = {}) => api.patch(`/api/inventory/merma/batches/${id}/close`, payload),
};
