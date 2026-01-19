// src/pages/admin/ProductReports.jsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, Package, Award, Tag } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";

const currency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
        .format(Number(n || 0));

const ProductReports = () => {
    const [filters, setFilters] = useState({
        from: "",
        to: "",
        category: "",
    });
    const [productSearch, setProductSearch] = useState("");
    const [productSort, setProductSort] = useState({ key: "totalQuantity", direction: "desc" });

    const addDays = (ymd, days) => {
        const d = new Date(`${ymd}T00:00:00`);
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 19) + ".000";
    };

    const cleanedParams = useMemo(() => {
        const obj = { ...filters };

        if (obj.from) obj.from = `${obj.from}T00:00:00.000`;
        if (obj.to) obj.to = addDays(obj.to, 1); // fin exclusivo

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

    // Análisis de productos
    const productAnalysis = useMemo(() => {
        const productStats = {};
        const categoryStats = {};

        orders.forEach((order) => {
            const items = order.items || [];
            items.forEach((item) => {
                const productName = item.name || "Producto Desconocido";
                const category = item.category || "Sin Categoría";
                const quantity = Number(item.quantity || 0);
                const price = Number(item.price || 0);
                const total = quantity * price;

                // Estadísticas por producto
                if (!productStats[productName]) {
                    productStats[productName] = {
                        name: productName,
                        category: category,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        orderCount: 0,
                        avgPrice: 0,
                    };
                }
                productStats[productName].totalQuantity += quantity;
                productStats[productName].totalRevenue += total;
                productStats[productName].orderCount += 1;

                // Estadísticas por categoría
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        name: category,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        productCount: 0,
                        orders: new Set(),
                    };
                }
                categoryStats[category].totalQuantity += quantity;
                categoryStats[category].totalRevenue += total;
                if (!categoryStats[category].orders.has(order._id)) {
                    categoryStats[category].orders.add(order._id);
                }
            });
        });

        // Calcular precio promedio por producto
        Object.keys(productStats).forEach((productName) => {
            const stats = productStats[productName];
            stats.avgPrice = stats.orderCount > 0 ? stats.totalRevenue / stats.totalQuantity : 0;
        });

        // Convertir Set a número para categorías
        Object.keys(categoryStats).forEach((cat) => {
            categoryStats[cat].orderCount = categoryStats[cat].orders.size;
            delete categoryStats[cat].orders;
        });

        // Productos más vendidos (por cantidad)
        const topProductsByQuantity = Object.values(productStats)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);

        // Productos más vendidos (por revenue)
        const topProductsByRevenue = Object.values(productStats)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 10);

        return {
            productStats,
            categoryStats,
            topProductsByQuantity,
            topProductsByRevenue,
            totalProducts: Object.keys(productStats).length,
        };
    }, [orders]);

    const allProducts = useMemo(() => {
        const products = Object.values(productAnalysis.productStats || {});
        const filtered = productSearch
            ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
            : products;
        const sorted = [...filtered].sort((a, b) => {
            const dir = productSort.direction === "asc" ? 1 : -1;
            const diff = (a[productSort.key] || 0) - (b[productSort.key] || 0);
            return diff * dir;
        });
        return sorted;
    }, [productAnalysis, productSearch, productSort]);

    const toggleSort = (key) => {
        setProductSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "desc" }
        );
    };

    const downloadExcel = async () => {
        try {
            const rows = Object.values(productAnalysis.productStats).map((product) => ({
                Producto: product.name,
                Categoría: product.category,
                Cantidad_Vendida: product.totalQuantity,
                Ingresos_Totales: product.totalRevenue,
                Órdenes: product.orderCount,
                Precio_Promedio: product.avgPrice,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reportes de Productos");

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, `reportes_productos_${new Date().toISOString().split("T")[0]}.xlsx`);
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
                        <Package className="w-6 h-6 text-[#f6b100]" />
                        Reportes de Productos
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Análisis de productos más vendidos y categorías</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Productos</p>
                        <Package className="w-4 h-4 text-[#f6b100]" />
                    </div>
                    <p className="text-2xl font-bold text-white">{productAnalysis.totalProducts}</p>
                    <p className="text-xs text-gray-500 mt-1">Productos únicos vendidos</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Categorías</p>
                        <Tag className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{Object.keys(productAnalysis.categoryStats).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Categorías activas</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Ingresos Totales</p>
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {currency(
                            Object.values(productAnalysis.productStats).reduce(
                                (sum, p) => sum + p.totalRevenue,
                                0
                            )
                        )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">De productos</p>
                </div>
            </div>

            {/* Top 10 Productos por Cantidad */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#f6b100]" />
                    Top 10 Productos Más Vendidos (por Cantidad)
                </h3>
                <div className="space-y-3">
                    {productAnalysis.topProductsByQuantity.map((product, index) => {
                        const maxQuantity = productAnalysis.topProductsByQuantity[0]?.totalQuantity || 1;
                        const percentage = (product.totalQuantity / maxQuantity) * 100;
                        return (
                            <div key={product.name} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#f6b100]/20 flex items-center justify-center text-[#f6b100] font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{product.name}</p>
                                            <p className="text-xs text-gray-400">{product.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-[#f6b100]">
                                            {product.totalQuantity.toFixed(2)} unidades
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {currency(product.totalRevenue)}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-2 bg-gradient-to-r from-[#f6b100] to-[#ffd633] rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Top 10 Productos por Revenue */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#f6b100]" />
                    Top 10 Productos por Ingresos
                </h3>
                <div className="space-y-3">
                    {productAnalysis.topProductsByRevenue.map((product, index) => {
                        const maxRevenue = productAnalysis.topProductsByRevenue[0]?.totalRevenue || 1;
                        const percentage = (product.totalRevenue / maxRevenue) * 100;
                        return (
                            <div key={product.name} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#f6b100]/20 flex items-center justify-center text-[#f6b100] font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{product.name}</p>
                                            <p className="text-xs text-gray-400">{product.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-[#f6b100]">
                                            {currency(product.totalRevenue)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {product.totalQuantity.toFixed(2)} unidades
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-2 bg-gradient-to-r from-[#f6b100] to-[#ffd633] rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-white">Todos los productos</h3>
                    <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Buscar por nombre..."
                        className="w-full md:w-64 px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-300">
                        <thead className="text-xs uppercase text-gray-400 bg-[#0f0f0f]">
                            <tr>
                                <th className="px-4 py-3 font-medium">Producto</th>
                                <th className="px-4 py-3 font-medium">Categoría</th>
                                <th className="px-4 py-3 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort("totalQuantity")}
                                        className="flex items-center gap-1"
                                    >
                                        Cantidad total
                                        <span className="text-[10px] text-[#f6b100]">
                                            {productSort.key === "totalQuantity"
                                                ? productSort.direction === "asc"
                                                    ? "▲"
                                                    : "▼"
                                                : ""}
                                        </span>
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort("totalRevenue")}
                                        className="flex items-center gap-1"
                                    >
                                        Total de ingresos
                                        <span className="text-[10px] text-[#f6b100]">
                                            {productSort.key === "totalRevenue"
                                                ? productSort.direction === "asc"
                                                    ? "▲"
                                                    : "▼"
                                                : ""}
                                        </span>
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium">Precio promedio</th>
                                <th className="px-4 py-3 font-medium">Órdenes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allProducts.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            ) : (
                                allProducts.map((product) => (
                                    <tr
                                        key={product.name}
                                        className="border-b border-gray-800/40 hover:bg-[#141414] transition-colors"
                                    >
                                        <td className="px-4 py-3 text-white font-medium">{product.name}</td>
                                        <td className="px-4 py-3">{product.category}</td>
                                        <td className="px-4 py-3">{product.totalQuantity.toFixed(2)}</td>
                                        <td className="px-4 py-3">{currency(product.totalRevenue)}</td>
                                        <td className="px-4 py-3">{currency(product.avgPrice)}</td>
                                        <td className="px-4 py-3">{product.orderCount}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Análisis por Categoría */}
            <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Ventas por Categoría</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(productAnalysis.categoryStats)
                        .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
                        .map(([category, stats]) => (
                            <div key={category} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-white">{category}</h4>
                                    <p className="text-sm font-bold text-[#f6b100]">
                                        {currency(stats.totalRevenue)}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Cantidad vendida:</span>
                                        <span className="text-white font-medium">{stats.totalQuantity.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Órdenes:</span>
                                        <span className="text-white font-medium">{stats.orderCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default ProductReports;
