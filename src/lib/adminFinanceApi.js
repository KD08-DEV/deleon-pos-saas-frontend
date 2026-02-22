// src/api/adminFinanceApi.js
import api from "../lib/api";

const unwrap = (res) => res?.data?.data ?? res?.data;

const wrap = (res) => ({ data: unwrap(res) });

// Expense Categories
export async function listExpenseCategories() {
    return wrap(await api.get("/api/admin/expense-categories"));
}
export async function createExpenseCategory(payload) {
    return wrap(await api.post("/api/admin/expense-categories", payload));
}
export async function updateExpenseCategory(id, payload) {
    return wrap(await api.put(`/api/admin/expense-categories/${id}`, payload));
}
export async function deleteExpenseCategory(id) {
    return wrap(await api.delete(`/api/admin/expense-categories/${id}`));
}

// Expenses
export async function listExpenses(params = {}) {
    return wrap(await api.get("/api/admin/expenses", { params }));
}
export async function createExpense(payload) {
    return wrap(await api.post("/api/admin/expenses", payload));
}
export async function updateExpense(id, payload) {
    return wrap(await api.put(`/api/admin/expenses/${id}`, payload));
}
export async function voidExpense(id) {
    return wrap(await api.patch(`/api/admin/expenses/${id}/void`));
}

// Payroll
export async function listPayrollRuns(params = {}) {
    return wrap(await api.get("/api/admin/payroll/runs", { params }));
}
export async function createPayrollRun(payload) {
    return wrap(await api.post("/api/admin/payroll/runs", payload));
}
export async function postPayrollRun(id) {
    return wrap(await api.post(`/api/admin/payroll/runs/${id}/post`));
}

// Summary
export async function getSummary(params = {}) {
    return wrap(await api.get("/api/admin/summary", { params }));
}
