// src/pages/admin/SalesReports.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Calendar, TrendingUp, DollarSign, ShoppingCart, Users, CreditCard } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";



const currency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
        .format(Number(n || 0));

const getLocalYMD = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};


const SalesReports = () => {
    const [filters, setFilters] = useState({
        from: getLocalYMD(),
        to: getLocalYMD(),
        method: "",
    });
    const [viewMode, setViewMode] = useState("orders"); // "orders" | "products"
    const [productRows, setProductRows] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [productError, setProductError] = useState("");
    const [tab, setTab] = useState("category");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [recentPage, setRecentPage] = useState(1);
    const recentPageSize = 10;


    useEffect(() => {
        setRecentPage(1);
    }, [filters.from, filters.to, filters.method]); // ajusta a tus filtros reales
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    useEffect(() => setPage(1), [tab, filters.from, filters.to, filters.method]);

    const showToast = (message, type = "error") => {
        setToast({ open: true, message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500);
    };

    const hasCostForRow = (r) => {
        const unitCost = Number(r?.unitCost ?? 0);
        const costTotal = Number(r?.costTotal ?? 0);
        // regla: costo “válido” cuando unitCost > 0 y costTotal > 0
        return unitCost > 0 && costTotal > 0;
    };

    const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    const fmtPct = (v) => (v == null ? "N/A" : `${Number(v).toFixed(2)}%`);
    const addDaysISOStart = (ymd, days) => {
        const d = new Date(`${ymd}T00:00:00`);
        d.setDate(d.getDate() + days);

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}T00:00:00.000`;
    };

    const cleanedParams = useMemo(() => {
        const obj = { ...filters };

        const hasFrom = !!obj.from;
        const hasTo = !!obj.to;

        // Si solo selecciona "desde", asumimos "hasta" = mismo día
        // Si solo selecciona "hasta", asumimos "desde" = mismo día
        let fromYMD = obj.from || obj.to || "";
        let toYMD = obj.to || obj.from || "";

        // Evita rango invertido (to < from)
        if (fromYMD && toYMD && toYMD < fromYMD) {
            const tmp = fromYMD;
            fromYMD = toYMD;
            toYMD = tmp;
        }

        if (fromYMD) obj.from = `${fromYMD}T00:00:00.000`;
        if (toYMD) obj.to = addDaysISOStart(toYMD, 1); // fin exclusivo (día siguiente 00:00)

        Object.keys(obj).forEach((k) => {
            if (obj[k] === "" || obj[k] == null) delete obj[k];
        });

        return obj;
    }, [filters]);



    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin/reports", cleanedParams],
        queryFn: async () => {
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data;
        },
        keepPreviousData: true,
        staleTime: 30_000,
    });
    const productReportQuery = useQuery({
        queryKey: ["sales-by-product-report", filters.from, filters.to, filters.method],
        queryFn: async () => {
            // En tu UI, filters.from / filters.to están en formato YYYY-MM-DD
            // El backend los parsea bien con new Date(...)
            return fetchProductDetail({
                from: filters.from,
                to: filters.to,
                paymentMethod: filters.method || undefined,
            });
        },
        enabled: true,
        keepPreviousData: true,
        staleTime: 30_000,
    });

    const detailRows = productReportQuery.data || [];

    const reportRows = useMemo(() => {
        if (tab === "category") return groupByCategory(detailRows);
        if (tab === "payment") return groupByPaymentMethod(detailRows);
        return detailRows; // "product"
    }, [tab, detailRows]);

    const orders = data?.data || [];
    const dailySummary = data?.dailySummary || {};
    const salesByDate = data?.salesByDate || {};

    // Análisis de ventas
    const salesAnalysis = useMemo(() => {
        const totalSales = orders.reduce((sum, o) => sum + (Number(o.bills?.totalWithTax) || 0), 0);
        const totalOrders = orders.length;
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

        const byMethod = {};
        orders.forEach((o) => {
            const method = o.paymentMethod || "Efectivo";
            if (!byMethod[method]) {
                byMethod[method] = { total: 0, count: 0 };
            }
            byMethod[method].total += Number(o.bills?.totalWithTax) || 0;
            byMethod[method].count += 1;
        });

        const bySource = {};
        orders.forEach((o) => {
            const source = o.orderSource || "DINE_IN";
            if (!bySource[source]) {
                bySource[source] = { total: 0, count: 0 };
            }
            bySource[source].total += Number(o.bills?.totalWithTax) || 0;
            bySource[source].count += 1;
        });

        // Agrupar por día de la semana
        const byDayOfWeek = {};
        orders.forEach((o) => {
            const date = new Date(o.createdAt);
            const dayName = date.toLocaleDateString("es-ES", { weekday: "long" });
            if (!byDayOfWeek[dayName]) {
                byDayOfWeek[dayName] = { total: 0, count: 0 };
            }
            byDayOfWeek[dayName].total += Number(o.bills?.totalWithTax) || 0;
            byDayOfWeek[dayName].count += 1;
        });

        return {
            totalSales,
            totalOrders,
            avgTicket: Number(avgTicket.toFixed(2)),
            byMethod,
            bySource,
            byDayOfWeek,
        };
    }, [orders]);
    async function fetchProductDetail({ from, to, paymentMethod }) {
        const params = new URLSearchParams();
        params.append("from", from);
        params.append("to", to);
        if (paymentMethod) params.append("paymentMethod", paymentMethod);

        // ✅ OJO: tu backend está bajo /api
        const res = await api.get(`/api/order/report/sales-by-product?${params.toString()}`);
        return res.data?.data || [];
    }
    function groupByCategory(detailRows) {
        const map = new Map();

        for (const r of detailRows) {
            const key = (r?.category || "Sin categoría").trim();
            const revenue = safeNumber(r?.revenue);
            const qty = safeNumber(r?.qty);
            const taxTotal = safeNumber(r?.taxTotal);

            const hasCost = hasCostForRow(r);
            const costTotal = safeNumber(r?.costTotal);

            const prev = map.get(key) || {
                category: key,
                qty: 0,
                revenue: 0,
                taxTotal: 0,

                // solo si costo existe para TODOS
                costTotal: 0,
                profit: 0,
                costPct: null,
                profitPct: null,

                // tracking
                anyCost: false,
                allCost: true,
            };

            prev.qty += qty;
            prev.revenue += revenue;
            prev.taxTotal += taxTotal;

            if (hasCost) {
                prev.anyCost = true;
                prev.costTotal += costTotal;
                prev.profit += (revenue - costTotal);
            } else {
                prev.allCost = false;
            }

            map.set(key, prev);
        }

        return Array.from(map.values()).map((x) => {
            // si ninguno tiene costo => N/A
            if (!x.anyCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            // si mezcla (unos con costo y otros sin costo) => N/A (evita números falsos)
            if (!x.allCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            // todos con costo => calcula %
            x.costPct = x.revenue > 0 ? (x.costTotal / x.revenue) * 100 : 0;
            x.profitPct = x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0;
            return x;
        });
    }
    function groupByPaymentMethod(detailRows) {
        const map = new Map();

        for (const r of detailRows) {
            const key = (r?.paymentMethod || "Desconocido").trim();
            const revenue = safeNumber(r?.revenue);
            const qty = safeNumber(r?.qty);
            const taxTotal = safeNumber(r?.taxTotal);

            const hasCost = hasCostForRow(r);
            const costTotal = safeNumber(r?.costTotal);

            const prev = map.get(key) || {
                paymentMethod: key,
                qty: 0,
                revenue: 0,
                taxTotal: 0,

                costTotal: 0,
                profit: 0,
                costPct: null,
                profitPct: null,

                anyCost: false,
                allCost: true,
            };

            prev.qty += qty;
            prev.revenue += revenue;
            prev.taxTotal += taxTotal;

            if (hasCost) {
                prev.anyCost = true;
                prev.costTotal += costTotal;
                prev.profit += (revenue - costTotal);
            } else {
                prev.allCost = false;
            }

            map.set(key, prev);
        }

        return Array.from(map.values()).map((x) => {
            if (!x.anyCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            if (!x.allCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            x.costPct = x.revenue > 0 ? (x.costTotal / x.revenue) * 100 : 0;
            x.profitPct = x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0;
            return x;
        });
    }
    const downloadExcel = async () => {
        try {
            const rows = orders.map((o) => ({
                Fecha: o?.createdAt ? new Date(o.createdAt).toLocaleDateString() : "",
                Hora: o?.createdAt ? new Date(o.createdAt).toLocaleTimeString() : "",
                OrdenID: o?._id || "",
                Cliente: o?.customerDetails?.name || "—",
                Método: o?.paymentMethod || "Efectivo",
                Origen: o?.orderSource || "DINE_IN",
                Subtotal: Number(o.bills?.subtotal || 0),
                ITBIS: Number(o.bills?.tax || 0),
                Propina: Number(o.bills?.tip || 0),
                Total: Number(o.bills?.totalWithTax || 0),
                Usuario: o?.user?.name || "—",
                Mesa: o?.table?.tableNumber || "—",
                Envio: Number(o?.shippingFee ?? o?.deliveryFee ?? o?.bills?.shippingFee ?? o?.bills?.deliveryFee ?? 0),
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reportes de Ventas");

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, `reportes_ventas_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Error exportando Excel:", error);
            showToast("Error al exportar el archivo.");
        }
    };
    const downloadExcelReport = async (exportAll = true) => {
        try {
            const sourceRows = exportAll ? reportRows : pagedRows;

            const rows = sourceRows.map((r) => {
                // Detalle por producto
                if (tab === "product") {
                    const revenue = safeNumber(r.revenue);
                    const hasCost = hasCostForRow(r);
                    const costTotal = safeNumber(r.costTotal);
                    const profit = hasCost ? (revenue - costTotal) : null;
                    const costPct = hasCost && revenue > 0 ? (costTotal / revenue) * 100 : null;
                    const profitPct = hasCost && revenue > 0 ? (profit / revenue) * 100 : null;

                    return {
                        Categoría: r.category || "Sin categoría",
                        Presentación: r.presentation || "Regular",
                        Producto: r.product || "",
                        Método: r.paymentMethod || "Desconocido",
                        Cantidad: safeNumber(r.qty),
                        "Precio Unit": safeNumber(r.unitPrice),
                        "Costo Unit": hasCost ? safeNumber(r.unitCost) : "N/A",
                        Ingresos: revenue,
                        Costo: hasCost ? costTotal : "N/A",
                        Utilidad: profit == null ? "N/A" : Number(profit.toFixed(2)),
                        "Costo %": costPct == null ? "N/A" : `${costPct.toFixed(2)}%`,
                        "Utilidad %": profitPct == null ? "N/A" : `${profitPct.toFixed(2)}%`,
                        ITBIS: safeNumber(r.taxTotal),
                    };
                }

                // Por categoría
                if (tab === "category") {
                    return {
                        Categoría: r.category || "Sin categoría",
                        Cantidad: safeNumber(r.qty),
                        Ingresos: safeNumber(r.revenue),
                        Costo: r.costTotal == null ? "N/A" : safeNumber(r.costTotal),
                        Utilidad: r.profit == null ? "N/A" : safeNumber(r.profit),
                        "Costo %": r.costPct == null ? "N/A" : `${Number(r.costPct).toFixed(2)}%`,
                        "Utilidad %": r.profitPct == null ? "N/A" : `${Number(r.profitPct).toFixed(2)}%`,
                        ITBIS: safeNumber(r.taxTotal),
                    };
                }

                // Por método
                return {
                    "Método de pago": r.paymentMethod || "Desconocido",
                    Cantidad: safeNumber(r.qty),
                    Ingresos: safeNumber(r.revenue),
                    Costo: r.costTotal == null ? "N/A" : safeNumber(r.costTotal),
                    Utilidad: r.profit == null ? "N/A" : safeNumber(r.profit),
                    "Costo %": r.costPct == null ? "N/A" : `${Number(r.costPct).toFixed(2)}%`,
                    "Utilidad %": r.profitPct == null ? "N/A" : `${Number(r.profitPct).toFixed(2)}%`,
                    ITBIS: safeNumber(r.taxTotal),
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reporte");

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const name =
                tab === "category"
                    ? "reporte_por_categoria"
                    : tab === "payment"
                        ? "reporte_por_metodo_pago"
                        : "detalle_por_producto";

            saveAs(blob, `${name}_${filters.from}_a_${filters.to}.xlsx`);
        } catch (error) {
            console.error("Error exportando Excel (reporte):", error);
            showToast("Error al exportar el archivo.");
        }
    };
    const salesByDish = useMemo(() => {
        const map = new Map();

        for (const o of orders || []) {
            const items = Array.isArray(o?.items) ? o.items : [];
            for (const it of items) {
                const name = (it?.name || "").trim() || "—";
                const qty = Number(it?.quantity || 0);
                const revenue = Number(it?.price || 0);

                const prev = map.get(name) || { name, qty: 0, total: 0, orders: new Set() };
                prev.qty += qty;
                prev.total += revenue;
                prev.orders.add(String(o?._id || ""));
                map.set(name, prev);
            }
        }

        // a array y ordenado por ingresos desc
        return Array.from(map.values())
            .map((x) => ({ ...x, count: x.orders.size }))
            .sort((a, b) => b.total - a.total);
    }, [orders]);
    const totalRows = reportRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const getOrderDishesLabel = (order, max = 2) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        if (!items.length) return "—";

        const names = items
            .map((it) => (it?.name || "").trim())
            .filter(Boolean);

        if (!names.length) return "—";
        if (names.length <= max) return names.join(", ");

        return `${names.slice(0, max).join(", ")} (+${names.length - max})`;
    };
    const recentTotal = orders.length;
    const recentTotalPages = Math.max(1, Math.ceil(recentTotal / recentPageSize));

    const recentOrders = useMemo(() => {
        const start = (recentPage - 1) * recentPageSize;
        return orders.slice(start, start + recentPageSize);
    }, [orders, recentPage]);
    const pagedRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return reportRows.slice(start, start + pageSize);
    }, [reportRows, page, pageSize]);

    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                <p className="mt-2">Cargando reportes...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                Error al cargar reportes{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
            </div>
        );
    }


    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-[#f6b100]" />
                        Reportes de Ventas
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Análisis detallado de ventas y facturación</p>
                </div>
                <button
                    onClick={downloadExcelReport}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">

                {[
                    { key: "category", label: "Por categoría" },
                    { key: "payment", label: "Por método de pago" },
                    { key: "product", label: "Detalle por producto" },
                ].map((t) => {
                    const active = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={[
                                "px-3 py-2 rounded-lg border transition-all text-sm",
                                active
                                    ? "bg-[#262626] border-[#f6b100]/50 text-white"
                                    : "bg-[#1a1a1a] border-gray-800/50 text-gray-300 hover:bg-[#262626] hover:border-[#f6b100]/30",
                            ].join(" ")}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Fecha desde</label>
                        <input
                            type="date"
                            value={filters.from}
                            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Fecha hasta</label>
                        <input
                            type="date"
                            value={filters.to}
                            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Método de pago</label>
                        <select
                            value={filters.method}
                            onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        >
                            <option value="">Todos los métodos</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta</option>
                            <option value="Transferencia">Transferencia</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Ventas</p>
                        <DollarSign className="w-4 h-4 text-[#f6b100]" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(salesAnalysis.totalSales)}</p>
                    <p className="text-xs text-gray-500 mt-1">{salesAnalysis.totalOrders} órdenes</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Ticket Promedio</p>
                        <ShoppingCart className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(salesAnalysis.avgTicket)}</p>
                    <p className="text-xs text-gray-500 mt-1">Por orden</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Órdenes</p>
                        <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{salesAnalysis.totalOrders}</p>
                    <p className="text-xs text-gray-500 mt-1">Órdenes procesadas</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Impuestos</p>
                        <CreditCard className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(dailySummary.totalTax || 0)}</p>
                    <p className="text-xs text-gray-500 mt-1">ITBIS recaudado</p>
                </div>
            </div>

            {/* ✅ Reporte por Producto/Categoría/Método (nuevo) */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span>Mostrar</span>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="bg-[#1a1a1a] border border-gray-800/50 rounded-lg px-2 py-1"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                    </select>
                    <span>filas</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-300">
                    <button
                        className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        Anterior
                    </button>

                    <span>
      Página {page} de {totalPages}
    </span>

                    <button
                        className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                        {tab === "category"
                            ? "Reporte por Categoría"
                            : tab === "payment"
                                ? "Reporte por Método de Pago"
                                : "Detalle por Producto"}
                    </h3>

                    <div className="text-xs text-gray-400">
                        {filters.from} → {filters.to}
                        {filters.method ? ` · ${filters.method}` : " · Todos los métodos"}
                    </div>
                </div>

                {productReportQuery.isLoading ? (
                    <div className="text-center py-8 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                        <p className="mt-2">Cargando reporte...</p>
                    </div>
                ) : productReportQuery.isError ? (
                    <div className="text-center py-6 text-red-400">
                        Error cargando reporte.
                    </div>
                ) : reportRows.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                        No hay datos para este rango de fechas.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr className="text-gray-400 border-b border-gray-800/60">
                                {tab === "category" && <th className="text-left py-2 pr-4">Categoría</th>}
                                {tab === "payment" && <th className="text-left py-2 pr-4">Método</th>}
                                {tab === "product" && (
                                    <>
                                        <th className="text-left py-2 pr-4">Categoría</th>
                                        <th className="text-left py-2 pr-4">Presentación</th>
                                        <th className="text-left py-2 pr-4">Producto</th>
                                        <th className="text-left py-2 pr-4">Método</th>
                                    </>
                                )}

                                <th className="text-right py-2 px-3">Cant.</th>
                                <th className="text-right py-2 px-3">Ingresos</th>
                                <th className="text-right py-2 px-3">Costo</th>
                                <th className="text-right py-2 px-3">Utilidad</th>
                                <th className="text-right py-2 px-3">Costo %</th>
                                <th className="text-right py-2 px-3">Utilidad %</th>
                                <th className="text-right py-2 pl-3">ITBIS</th>
                            </tr>
                            </thead>

                            <tbody>
                            {pagedRows.map((r, idx) => {
                                const qty = Number(r.qty || 0);

                                const revenue = Number(r.revenue || 0);
                                const unitCost = Number(r.unitCost || 0);
                                const costTotalRaw = Number(r.costTotal || 0);
                                const taxTotal = Number(r.taxTotal || 0);

                                // ✅ costo “válido” solo si realmente existe
                                const hasCost = unitCost > 0 && costTotalRaw > 0;

                                // ✅ si no hay costo, no mostramos márgenes
                                const costTotal = hasCost ? costTotalRaw : null;
                                const profit = hasCost ? (revenue - costTotalRaw) : null;

                                const costPct = hasCost && revenue > 0 ? (costTotalRaw / revenue) * 100 : null;
                                const profitPct = hasCost && revenue > 0 ? (profit / revenue) * 100 : null;

                                return (
                                    <tr key={idx} className="border-b border-gray-800/30 text-gray-200">
                                        {tab === "category" && <td className="py-2 pr-4">{r.category}</td>}
                                        {tab === "payment" && <td className="py-2 pr-4">{r.paymentMethod}</td>}
                                        {tab === "product" && (
                                            <>
                                                <td className="py-2 pr-4">{r.category}</td>
                                                <td className="py-2 pr-4">{r.presentation}</td>
                                                <td className="py-2 pr-4">{r.product}</td>
                                                <td className="py-2 pr-4">{r.paymentMethod}</td>
                                            </>
                                        )}

                                        <td className="py-2 px-3 text-right">{qty}</td>
                                        <td className="py-2 px-3 text-right">{currency(revenue)}</td>

                                        {/* ✅ Costo */}
                                        <td className="py-2 px-3 text-right">
                                            {costTotal == null ? "N/A" : currency(costTotal)}
                                        </td>

                                        {/* ✅ Utilidad */}
                                        <td className="py-2 px-3 text-right">
                                            {profit == null ? "N/A" : currency(profit)}
                                        </td>

                                        {/* ✅ Costo % */}
                                        <td className="py-2 px-3 text-right">
                                            {costPct == null ? "N/A" : `${costPct.toFixed(2)}%`}
                                        </td>

                                        {/* ✅ Utilidad % */}
                                        <td className="py-2 px-3 text-right">
                                            {profitPct == null ? "N/A" : `${profitPct.toFixed(2)}%`}
                                        </td>

                                        <td className="py-2 pl-3 text-right">{currency(taxTotal)}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Análisis por método de pago */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Ventas por Método de Pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(salesAnalysis.byMethod).map(([method, data]) => (
                        <div key={method} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                            <p className="text-sm text-gray-400 mb-1">{method}</p>
                            <p className="text-lg font-bold text-white">{currency(data.total)}</p>
                            <p className="text-xs text-gray-500 mt-1">{data.count} órdenes</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ventas por Plato */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Ventas por Plato</h3>
                    <span className="text-xs text-gray-400">Top 10</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {salesByDish.slice(0, 10).map((x) => (
                        <div key={x.name} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                            <p className="text-sm text-gray-200 mb-1 line-clamp-2">{x.name}</p>
                            <p className="text-lg font-bold text-white">{currency(x.total)}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {x.count} órdenes · {Number(x.qty || 0).toFixed(2)} cant.
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ventas por día de la semana */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Ventas por Día de la Semana</h3>
                <div className="space-y-2">
                    {Object.entries(salesAnalysis.byDayOfWeek)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([day, data]) => {
                            const maxTotal = Math.max(...Object.values(salesAnalysis.byDayOfWeek).map(d => d.total));
                            const percentage = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                            return (
                                <div key={day} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-white capitalize">{day}</p>
                                        <p className="text-sm font-bold text-[#f6b100]">{currency(data.total)}</p>
                                    </div>
                                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-2 bg-gradient-to-r from-[#f6b100] to-[#ffd633] rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{data.count} órdenes</p>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Tabla de ventas recientes */}
            <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] overflow-hidden">
                <div className="p-4 border-b border-gray-800/50">
                    <h3 className="text-lg font-semibold text-white">Ventas Recientes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-300">Fecha</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Cliente</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Método</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Platos</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order) => (
                                <tr key={order._id} className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors">
                                    <td className="p-3 text-sm text-gray-300">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300">
                                        {order.customerDetails?.name || "—"}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300">
                                        {order.paymentMethod || "Efectivo"}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300 max-w-[260px] truncate">
                                        {getOrderDishesLabel(order, 2)}
                                    </td>
                                    <td className="p-3 text-sm font-bold text-[#f6b100]">
                                        {currency(order.bills?.totalWithTax || 0)}
                                    </td>
                                </tr>
                            ))}

                        </tbody>
                    </table>
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-300">
                        <button
                            className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                            onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                            disabled={recentPage <= 1}
                        >
                            Anterior
                        </button>

                        <span>
                            Página {recentPage} de {recentTotalPages}
                          </span>

                        <button
                            className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                            onClick={() => setRecentPage((p) => Math.min(recentTotalPages, p + 1))}
                            disabled={recentPage >= recentTotalPages}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
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

export default SalesReports;
