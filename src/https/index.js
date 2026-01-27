// src/https/index.js
import api from "@/lib/api";

// AUTH
export const login        = (data) => api.post("/api/user/login", data);
export const register     = (data) => api.post("/api/user/register", data);
export const getUserData  = () => api.get("/api/user");
export const logout       = () => api.post("/api/user/logout");

// TABLES
export const addTable     = (data) => api.post("/api/table", data);
export const getTables    = () => api.get("/api/table");
export const updateTable  = (id, body) => api.put(`/api/table/${encodeURIComponent(id)}`, body);
export const deleteTable  = (id) => api.delete(`/api/table/${encodeURIComponent(id)}`);

// PAYMENTS (arreglado el doble slash)
export const createOrderRazorpay   = (data) => api.post("/api/payment/create-order", data);
export const verifyPaymentRazorpay = (data) => api.post("/api/payment/verify-payment", data);

// ORDERS
export const addOrder     = (data) => api.post("/api/order", data);
export const getOrders = (tenantId) =>
    api.get(`/api/order?tenantId=${encodeURIComponent(tenantId)}`);

export const getOrderById = (id) => api.get(`/api/order/${encodeURIComponent(id)}`);
export const updateOrder  = (id, data) => api.put(`/api/order/${encodeURIComponent(id)}`, data);
export const deleteOrder  = (id) => api.delete(`/api/order/${encodeURIComponent(id)}`);

// DISHES
const getTenantId = () => localStorage.getItem("tenantId");

export const addDish = (formData, tenantIdParam) => {
    const tenantId = tenantIdParam || getTenantId();
    return api.post(`/api/dishes?tenantId=${encodeURIComponent(tenantId)}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const getDishes = (tenantIdParam) => {
    const tenantId = tenantIdParam || getTenantId();
    return api.get(`/api/dishes?tenantId=${encodeURIComponent(tenantId)}`);
};

export const deleteDish = (id) => api.delete(`/api/dishes/${encodeURIComponent(id)}`);
export const updateDish = (id, formData) =>
    api.put(`/api/dishes/${encodeURIComponent(id)}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
// RECIPE (NEW)
export const getDishRecipe = (id) => api.get(`/api/dishes/${encodeURIComponent(id)}/recipe`);
export const updateDishRecipe = (id, body) => api.put(`/api/dishes/${encodeURIComponent(id)}/recipe`, body);


export const getTenant = (tenantId) =>
    api.get(`/api/tenant/${encodeURIComponent(tenantId)}`);

// CUSTOMERS (clientes finales)
export const getCustomers = (q = "", limit = 20) =>
    api.get(`/api/customer?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`);

export const createCustomer = (data) => api.post("/api/customer", data);



export default api;
