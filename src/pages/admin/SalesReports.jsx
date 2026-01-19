// src/pages/admin/SalesReports.jsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Calendar, TrendingUp, DollarSign, ShoppingCart, Users, CreditCard } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";

const currency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
        .format(Number(n || 0));

const SalesReports = () => {
    const [filters, setFilters] = useState({
        from: "",
        to: "",
        method: "",
    });

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

        // Normaliza rango para cubrir días completos:
        // from = inicio del día, to = inicio del día siguiente (fin exclusivo)
        if (obj.from) obj.from = `${obj.from}T00:00:00.000`;
        if (obj.to) obj.to = addDaysISOStart(obj.to, 1);

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
            alert("Error al exportar el archivo.");
        }
    };

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
                    onClick={downloadExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                </button>
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

            {/* Análisis por origen */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Ventas por Origen</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Object.entries(salesAnalysis.bySource).map(([source, data]) => (
                        <div key={source} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                            <p className="text-sm text-gray-400 mb-1">
                                {source === "DINE_IN" ? "Comedor" : 
                                 source === "TAKEOUT" ? "Para Llevar" :
                                 source === "PEDIDOSYA" ? "Pedidos Ya" :
                                 source === "UBEREATS" ? "Uber Eats" : source}
                            </p>
                            <p className="text-lg font-bold text-white">{currency(data.total)}</p>
                            <p className="text-xs text-gray-500 mt-1">{data.count} órdenes</p>
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
                                <th className="p-3 text-sm font-semibold text-gray-300">Origen</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.slice(0, 20).map((order) => (
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
                                    <td className="p-3 text-sm text-gray-300">
                                        {order.orderSource === "DINE_IN" ? "Comedor" :
                                         order.orderSource === "TAKEOUT" ? "Para Llevar" :
                                         order.orderSource || "—"}
                                    </td>
                                    <td className="p-3 text-sm font-bold text-[#f6b100]">
                                        {currency(order.bills?.totalWithTax || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesReports;
