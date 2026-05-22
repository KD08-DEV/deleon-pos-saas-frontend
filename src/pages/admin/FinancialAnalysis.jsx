// src/pages/admin/FinancialAnalysis.jsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";

const currency = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
        .format(Number(n || 0));
const formatHour12 = (h) => {
    const hour = Number(h) % 24;
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12} ${suffix}`;
};

const FinancialAnalysis = () => {
    const getLocalYMD = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };
    const [filters, setFilters] = useState(() => {
        const today = getLocalYMD();
        return {
            from: today,
            to: today,
            method: "",
            category: "",
        };
    });
    const [selectedHour, setSelectedHour] = useState(null);
    const [hourDetailsOpen, setHourDetailsOpen] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });

    const showToast = (message, type = "error") => {
        setToast({ open: true, message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500);
    };


    const toNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const normalizeText = (value) =>
        (value ?? "")
            .toString()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    const isEmptyCategory = (value) => {
        const txt = normalizeText(value);
        return !txt || txt === "sin categoria" || txt === "sin category";
    };

    const pickFirstText = (...values) => {
        for (const value of values) {
            const text = (value ?? "").toString().trim();
            if (text) return text;
        }
        return "";
    };

    const getProductNameFromRow = (row) =>
        pickFirstText(
            row?.product,
            row?.name,
            row?.productName,
            row?.itemName,
            row?.dishName,
            row?.description
        ) || "Producto";

    const getInventoryCategoryFromRow = (row) => {
        const candidates = [
            row?.inventoryCategoryName,
            row?.inventoryCategory?.name,
            row?.inventoryCategory?.title,
            row?.inventoryCategory,
            row?.categoryName,
            row?.category?.name,
            row?.category?.title,
            row?.category,
        ];

        for (const value of candidates) {
            const text = (value ?? "").toString().trim();
            if (text && !isEmptyCategory(text)) return text;
        }

        return "Sin Categoría";
    };

    const getItemName = (item) =>
        pickFirstText(
            item?.name,
            item?.title,
            item?.product,
            item?.productName,
            item?.itemName,
            item?.dishName
        ) || "Producto";

    const getItemCategory = (item, categoryMap = new Map()) => {
        const directCategory = pickFirstText(
            item?.inventoryCategoryName,
            item?.inventoryCategory?.name,
            item?.inventoryCategory,
            item?.categoryName,
            item?.categoryLabel,
            item?.category
        );

        if (directCategory && !isEmptyCategory(directCategory)) {
            return directCategory;
        }

        const mappedCategory = categoryMap.get(normalizeText(getItemName(item)));
        return mappedCategory || "Sin Categoría";
    };

    const getItemQuantity = (item) => toNumber(item?.quantity ?? item?.qty ?? item?.count ?? 0);

    const getItemPrice = (item) =>
        toNumber(
            item?.lineTotal ??
            item?.price ??
            item?.unitPrice ??
            item?.amount ??
            0
        );

    const getItemRevenue = (item, qty) => {
        if (item?.lineTotal != null) return toNumber(item.lineTotal);
        if (item?.price != null) return toNumber(item.price);
        return getItemPrice(item) * qty;
    };

    const getReportDate = (order) =>
        order?.paidAt ||
        order?.invoicedAt ||
        order?.completedAt ||
        order?.createdAt;

    const addDaysISOStart = (ymd, days) => {
        const d = new Date(`${ymd}T00:00:00`);
        d.setDate(d.getDate() + days);
        // devolvemos ISO sin timezone raro: YYYY-MM-DDTHH:mm:ss.000
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}T00:00:00.000`;
    };

    const cleanedParams = useMemo(() => {
        const obj = {};

        let fromYMD = filters.from || filters.to || "";
        let toYMD = filters.to || filters.from || "";

        if (fromYMD && toYMD && toYMD < fromYMD) {
            const tmp = fromYMD;
            fromYMD = toYMD;
            toYMD = tmp;
        }

        if (fromYMD) obj.from = `${fromYMD}T00:00:00.000`;
        if (toYMD) obj.to = addDaysISOStart(toYMD, 1);

        if (filters.method) {
            obj.method = filters.method;
        }

        return obj;
    }, [filters.from, filters.to, filters.method]);



    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin/reports", cleanedParams],
        queryFn: async () => {
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data;
        },
        keepPreviousData: true,
        staleTime: 30_000,
    });
    const productReportParams = useMemo(() => {
        let from = filters.from || filters.to || "";
        let to = filters.to || filters.from || "";

        if (from && to && to < from) {
            const tmp = from;
            from = to;
            to = tmp;
        }

        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (filters.method) params.paymentMethod = filters.method;

        return params;
    }, [filters.from, filters.to, filters.method]);

    async function fetchProductDetail(params) {
        const res = await api.get("/api/order/report/sales-by-product", { params });

        const payload = res.data?.data ?? res.data;

        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.products)) return payload.products;
        if (Array.isArray(payload?.rows)) return payload.rows;
        if (Array.isArray(payload?.items)) return payload.items;

        return [];
    }

    const productReportQuery = useQuery({
        queryKey: ["financial-sales-by-product", productReportParams],
        queryFn: async () => fetchProductDetail(productReportParams),
        enabled: true,
        keepPreviousData: true,
        staleTime: 30_000,
    });

    const productRows = productReportQuery.data || [];

    const categoryOptions = useMemo(() => {
        return Array.from(
            new Set(
                productRows
                    .map((row) => getInventoryCategoryFromRow(row))
                    .filter((cat) => cat && !isEmptyCategory(cat))
            )
        ).sort((a, b) => a.localeCompare(b));
    }, [productRows]);

    const productCategoryMap = useMemo(() => {
        const map = new Map();

        productRows.forEach((row) => {
            const productName = normalizeText(getProductNameFromRow(row));
            const category = getInventoryCategoryFromRow(row);

            if (productName && category && !isEmptyCategory(category)) {
                map.set(productName, category);
            }
        });

        return map;
    }, [productRows]);

    const rawOrders = data?.data || [];
    const dailySummary = data?.dailySummary || {};

    const orders = useMemo(() => {
        const selectedCategory = normalizeText(filters.category);
        const selectedMethod = normalizeText(filters.method);

        return rawOrders.filter((order) => {
            if (selectedMethod && normalizeText(order?.paymentMethod) !== selectedMethod) {
                return false;
            }

            if (!selectedCategory) return true;

            const items = Array.isArray(order?.items) ? order.items : [];

            return items.some((item) => {
                const itemCategory = normalizeText(getItemCategory(item, productCategoryMap));
                return itemCategory === selectedCategory;
            });
        });
    }, [rawOrders, filters.category, filters.method, productCategoryMap]);

    // Análisis financiero completo
    const financialAnalysis = useMemo(() => {
        const selectedCategory = normalizeText(filters.category);

        const getOrderMetrics = (order) => {
            const items = Array.isArray(order?.items) ? order.items : [];

            const filteredItems = selectedCategory
                ? items.filter(
                    (item) =>
                        normalizeText(getItemCategory(item, productCategoryMap)) === selectedCategory
                )
                : items;

            const selectedSubtotal = filteredItems.reduce((sum, item) => {
                const qty = getItemQuantity(item);
                return sum + getItemRevenue(item, qty);
            }, 0);

            const allItemsSubtotal = items.reduce((sum, item) => {
                const qty = getItemQuantity(item);
                return sum + getItemRevenue(item, qty);
            }, 0);

            const orderSubtotal = toNumber(order?.bills?.subtotal) || allItemsSubtotal;

            const ratio =
                selectedCategory && orderSubtotal > 0
                    ? Math.min(selectedSubtotal / orderSubtotal, 1)
                    : 1;

            const subtotal = selectedCategory
                ? selectedSubtotal
                : orderSubtotal;

            const tax = toNumber(order?.bills?.tax) * ratio;
            const tip = toNumber(order?.bills?.tip) * ratio;
            const commission = toNumber(order?.commissionAmount) * ratio;

            const revenue = selectedCategory
                ? subtotal + tax + tip
                : toNumber(order?.bills?.totalWithTax);

            const net = selectedCategory
                ? Math.max(revenue - commission, 0)
                : toNumber(order?.netTotal) || Math.max(revenue - commission, 0);

            return {
                subtotal,
                tax,
                tip,
                commission,
                revenue,
                net,
            };
        };

        const totals = orders.reduce(
            (acc, order) => {
                const m = getOrderMetrics(order);

                acc.totalRevenue += m.revenue;
                acc.totalTax += m.tax;
                acc.totalTip += m.tip;
                acc.totalSubtotal += m.subtotal;
                acc.totalCommission += m.commission;
                acc.totalNet += m.net;

                return acc;
            },
            {
                totalRevenue: 0,
                totalTax: 0,
                totalTip: 0,
                totalSubtotal: 0,
                totalCommission: 0,
                totalNet: 0,
            }
        );

        const totalOrders = orders.length;
        const avgTicket = totalOrders > 0 ? totals.totalRevenue / totalOrders : 0;
        const avgNet = totalOrders > 0 ? totals.totalNet / totalOrders : 0;
        const taxRate = totals.totalSubtotal > 0 ? (totals.totalTax / totals.totalSubtotal) * 100 : 0;
        const commissionRate = totals.totalRevenue > 0 ? (totals.totalCommission / totals.totalRevenue) * 100 : 0;

        const byDate = {};
        orders.forEach((order) => {
            const reportDate = getReportDate(order);
            if (!reportDate) return;

            const date = new Date(reportDate).toISOString().split("T")[0];
            const m = getOrderMetrics(order);

            if (!byDate[date]) {
                byDate[date] = {
                    revenue: 0,
                    tax: 0,
                    tip: 0,
                    net: 0,
                    commission: 0,
                    orders: 0,
                };
            }

            byDate[date].revenue += m.revenue;
            byDate[date].tax += m.tax;
            byDate[date].tip += m.tip;
            byDate[date].net += m.net;
            byDate[date].commission += m.commission;
            byDate[date].orders += 1;
        });

        const sortedDates = Object.keys(byDate).sort();

        let growthRate = 0;
        if (sortedDates.length >= 2) {
            const lastDate = sortedDates[sortedDates.length - 1];
            const previousDate = sortedDates[sortedDates.length - 2];
            const lastRevenue = byDate[lastDate]?.revenue || 0;
            const previousRevenue = byDate[previousDate]?.revenue || 0;

            if (previousRevenue > 0) {
                growthRate = ((lastRevenue - previousRevenue) / previousRevenue) * 100;
            }
        }

        const byHour = {};
        orders.forEach((order) => {
            const reportDate = getReportDate(order);
            if (!reportDate) return;

            const hour = new Date(reportDate).getHours();
            const m = getOrderMetrics(order);

            if (!byHour[hour]) {
                byHour[hour] = { revenue: 0, orders: 0 };
            }

            byHour[hour].revenue += m.revenue;
            byHour[hour].orders += 1;
        });

        return {
            ...totals,
            totalOrders,
            avgTicket,
            avgNet,
            taxRate: Number(taxRate.toFixed(2)),
            commissionRate: Number(commissionRate.toFixed(2)),
            growthRate: Number(growthRate.toFixed(2)),
            byDate,
            sortedDates,
            byHour,
        };
    }, [orders, filters.category, productCategoryMap]);

    const hourProductBreakdown = useMemo(() => {
        if (selectedHour == null) return { totalRevenue: 0, totalOrders: 0, products: [] };

        const selectedCategory = normalizeText(filters.category);

        let totalRevenue = 0;
        let totalOrders = 0;
        const productMap = {};

        orders.forEach((order) => {
            if (!order) return;

            const reportDate = getReportDate(order);
            if (!reportDate) return;

            const hour = new Date(reportDate).getHours();
            if (hour !== selectedHour) return;

            let orderHasMatchingItem = false;

            (order.items || []).forEach((item) => {
                const quantity = getItemQuantity(item);
                if (!quantity) return;

                const category = getItemCategory(item, productCategoryMap);
                const normalizedCategory = normalizeText(category);

                if (selectedCategory && normalizedCategory !== selectedCategory) {
                    return;
                }

                const revenue = getItemRevenue(item, quantity);
                totalRevenue += revenue;
                orderHasMatchingItem = true;

                const name = getItemName(item);
                const key = `${normalizeText(name)}__${normalizedCategory || "sin-categoria"}`;

                if (!productMap[key]) {
                    productMap[key] = { name, category, quantity: 0, revenue: 0 };
                }

                productMap[key].quantity += quantity;
                productMap[key].revenue += revenue;
            });

            if (orderHasMatchingItem) {
                totalOrders += 1;
            }
        });

        const products = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

        return { totalRevenue, totalOrders, products };
    }, [orders, selectedHour, filters.category, productCategoryMap]);

    const downloadExcel = async () => {
        try {
            const summaryRow = {
                Métrica: "RESUMEN FINANCIERO",
                Valor: "",
                Detalle: "",
            };

            const rows = [
                summaryRow,
                { Métrica: "Ingresos Totales", Valor: financialAnalysis.totalRevenue, Detalle: currency(financialAnalysis.totalRevenue) },
                { Métrica: "ITBIS Total", Valor: financialAnalysis.totalTax, Detalle: currency(financialAnalysis.totalTax) },
                { Métrica: "Propinas Total", Valor: financialAnalysis.totalTip, Detalle: currency(financialAnalysis.totalTip) },
                { Métrica: "Comisiones Total", Valor: financialAnalysis.totalCommission, Detalle: currency(financialAnalysis.totalCommission) },
                { Métrica: "Ingresos Netos", Valor: financialAnalysis.totalNet, Detalle: currency(financialAnalysis.totalNet) },
                { Métrica: "Ticket Promedio", Valor: financialAnalysis.avgTicket, Detalle: currency(financialAnalysis.avgTicket) },
                { Métrica: "Total Órdenes", Valor: financialAnalysis.totalOrders, Detalle: `${financialAnalysis.totalOrders} órdenes` },
                { Métrica: "Tasa de Crecimiento", Valor: financialAnalysis.growthRate, Detalle: `${financialAnalysis.growthRate}%` },
                {},
                { Métrica: "ANÁLISIS POR FECHA", Valor: "", Detalle: "" },
                { Métrica: "Fecha", Valor: "Ingresos", Detalle: "Órdenes" },
                ...Object.entries(financialAnalysis.byDate).map(([date, data]) => ({
                    Métrica: date,
                    Valor: data.revenue,
                    Detalle: `${data.orders} órdenes`,
                })),
            ];

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Análisis Financiero");

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, `analisis_financiero_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Error exportando Excel:", error);
            showToast("Error al exportar el archivo.");
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                <p className="mt-2">Cargando análisis...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                Error al cargar análisis{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-[#f6b100]" />
                        Análisis Financiero
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Análisis detallado de finanzas y tendencias</p>
                </div>
                <button
                    onClick={downloadExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                </button>
            </div>

            {/* Filtros */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Fecha desde</label>
                        <input
                            type="date"
                            value={filters.from}
                            onChange={(e) => {
                                setFilters((f) => ({ ...f, from: e.target.value }));
                                setSelectedHour(null);
                                setHourDetailsOpen(false);
                            }}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Fecha hasta</label>
                        <input
                            type="date"
                            value={filters.to}
                            onChange={(e) => {
                                setFilters((f) => ({ ...f, to: e.target.value }));
                                setSelectedHour(null);
                                setHourDetailsOpen(false);
                            }}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Método de pago</label>
                        <select
                            value={filters.method}
                            onChange={(e) => {
                                setFilters((f) => ({ ...f, method: e.target.value }));
                                setSelectedHour(null);
                                setHourDetailsOpen(false);
                            }}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        >
                            <option value="">Todos los métodos</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Credito">Crédito</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Categoría</label>
                        <select
                            value={filters.category}
                            onChange={(e) => {
                                setFilters((f) => ({ ...f, category: e.target.value }));
                                setSelectedHour(null);
                                setHourDetailsOpen(false);
                            }}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        >
                            <option value="">Todas las categorías</option>
                            {categoryOptions.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Ingresos Totales</p>
                        <DollarSign className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(financialAnalysis.totalRevenue)}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        {financialAnalysis.growthRate >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                        ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                        <span className={financialAnalysis.growthRate >= 0 ? "text-green-400" : "text-red-400"}>
                            {financialAnalysis.growthRate > 0 ? "+" : ""}{financialAnalysis.growthRate}%
                        </span>
                    </p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Ingresos Netos</p>
                        <TrendingUp className="w-4 h-4 text-[#f6b100]" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(financialAnalysis.totalNet)}</p>
                    <p className="text-xs text-gray-500 mt-1">Después de comisiones</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Ticket Promedio</p>
                        <PieChart className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(financialAnalysis.avgTicket)}</p>
                    <p className="text-xs text-gray-500 mt-1">Por orden</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Órdenes</p>
                        <Calendar className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{financialAnalysis.totalOrders}</p>
                    <p className="text-xs text-gray-500 mt-1">Órdenes procesadas</p>
                </div>
            </div>

            {/* Desglose financiero */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Ingresos */}
                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Desglose de Ingresos</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                            <span className="text-sm text-gray-400">Subtotal</span>
                            <span className="text-sm font-bold text-white">{currency(financialAnalysis.totalSubtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                            <span className="text-sm text-gray-400">ITBIS ({financialAnalysis.taxRate}%)</span>
                            <span className="text-sm font-bold text-yellow-400">{currency(financialAnalysis.totalTax)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                            <span className="text-sm text-gray-400">Propinas</span>
                            <span className="text-sm font-bold text-green-400">{currency(financialAnalysis.totalTip)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 pt-3 border-t border-gray-800/50">
                            <span className="text-base font-semibold text-white">Total Ingresos</span>
                            <span className="text-base font-bold text-[#f6b100]">{currency(financialAnalysis.totalRevenue)}</span>
                        </div>
                    </div>
                </div>

                {/* Gastos y Neto */}
                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Desglose de Gastos</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                            <span className="text-sm text-gray-400">Comisiones ({financialAnalysis.commissionRate}%)</span>
                            <span className="text-sm font-bold text-red-400">{currency(financialAnalysis.totalCommission)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 pt-3 border-t border-gray-800/50">
                            <span className="text-base font-semibold text-white">Ingresos Netos</span>
                            <span className="text-base font-bold text-green-400">{currency(financialAnalysis.totalNet)}</span>
                        </div>
                        <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">Promedio Neto por Orden</p>
                            <p className="text-lg font-bold text-white">{currency(financialAnalysis.avgNet)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tendencias por fecha */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Tendencias Diarias</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {financialAnalysis.sortedDates.slice(-14).map((date) => {
                        const dayData = financialAnalysis.byDate[date];
                        const maxRevenue = Math.max(...Object.values(financialAnalysis.byDate).map(d => d.revenue));
                        const percentage = maxRevenue > 0 ? (dayData.revenue / maxRevenue) * 100 : 0;
                        return (
                            <div key={date} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {new Date(date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                                        </p>
                                        <p className="text-xs text-gray-400">{dayData.orders} órdenes</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-[#f6b100]">{currency(dayData.revenue)}</p>
                                        <p className="text-xs text-gray-400">Neto: {currency(dayData.net)}</p>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-2 bg-gradient-to-r from-[#f6b100] to-[#ffd633] rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-500">
                                    <span>ITBIS: {currency(dayData.tax)}</span>
                                    <span>Comisiones: {currency(dayData.commission)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Análisis por hora */}
            <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Ingresos por Hora del Día</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 24 }, (_, hour) => {
                        const hourData = financialAnalysis.byHour[hour] || { revenue: 0, orders: 0 };
                        const hourValues = Object.values(financialAnalysis.byHour || {});
                        const maxHourRevenue = hourValues.length ? Math.max(...hourValues.map(h => h.revenue)) : 0;

                        const percentage = maxHourRevenue > 0 ? (hourData.revenue / maxHourRevenue) * 100 : 0;
                        const isSelected = selectedHour === hour;

                        return (
                            <div
                                key={formatHour12(hour)}
                                role="button"
                                onClick={() => {
                                    setSelectedHour(hour);
                                    setHourDetailsOpen(true);
                                }}
                                className={`bg-[#1a1a1a] border rounded-lg p-3 cursor-pointer transition-all hover:border-[#f6b100]/70 ${
                                    isSelected ? "border-[#f6b100]" : "border-gray-800/30"
                                }`}
                            >
                                <p className="text-xs text-gray-400 mb-2">{formatHour12(hour)}00</p>
                                <p className="text-sm font-bold text-white mb-1">{currency(hourData.revenue)}</p>
                                <p className="text-xs text-gray-500 mb-2">{hourData.orders} órdenes</p>
                                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-1.5 bg-gradient-to-r from-[#f6b100] to-[#ffd633] rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {hourDetailsOpen && selectedHour !== null && (
                <div className="fixed inset-0 z-40 flex items-start justify-center p-4 overflow-y-auto">

                <div
                        className="absolute inset-0 bg-black/70"
                        onClick={() => setHourDetailsOpen(false)}
                    />
                    <div className="relative z-50 w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-xl border border-gray-800/60 bg-[#0b0b0b] shadow-2xl my-6">

                    <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                            <div>
                                <p className="text-xs uppercase text-gray-400">Hora seleccionada</p>
                                <h4 className="text-xl font-semibold text-white">{formatHour12(selectedHour)}:00</h4>
                            </div>
                            <button
                                onClick={() => setHourDetailsOpen(false)}
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-800/60 text-gray-300 hover:border-[#f6b100]/60 hover:text-white transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4">
                            <div className="bg-[#111111] border border-gray-800/40 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Revenue total</p>
                                <p className="text-lg font-semibold text-[#f6b100]">
                                    {currency(hourProductBreakdown.totalRevenue)}
                                </p>
                            </div>
                            <div className="bg-[#111111] border border-gray-800/40 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Órdenes</p>
                                <p className="text-lg font-semibold text-white">
                                    {hourProductBreakdown.totalOrders}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 pt-0 max-h-[55vh] overflow-y-auto">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs uppercase text-gray-400 bg-[#0f0f0f] sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3">Categoría</th>
                                    <th className="px-4 py-3">Cantidad</th>
                                    <th className="px-4 py-3">Revenue</th>
                                </tr>
                                </thead>
                                <tbody>
                                {hourProductBreakdown.products.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                                            No hay ventas registradas en esta hora.
                                        </td>
                                    </tr>
                                ) : (
                                    hourProductBreakdown.products.map((p) => (
                                        <tr key={`${p.name}-${p.category}`} className="border-b border-gray-800/40">
                                            <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                                            <td className="px-4 py-3">{p.category}</td>
                                            <td className="px-4 py-3">{p.quantity}</td>
                                            <td className="px-4 py-3">{currency(p.revenue)}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {toast.open && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999]">
                    <div
                        className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur
        ${toast.type === "error"
                            ? "bg-red-500/15 border-red-500/30 text-red-200"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">{toast.message}</div>
                            <button
                                type="button"
                                className="ml-2 text-white/70 hover:text-white"
                                onClick={() => setToast((t) => ({ ...t, open: false }))}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
};

export default FinancialAnalysis;
