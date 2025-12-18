// src/pages/Admin/Reports.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";

const currency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
        .format(Number(n || 0));

const Reports = () => {
    const [filters, setFilters] = useState({ from: "", to: "", method: "", user: "" });

    // Debounce de filtros
    const [debounced, setDebounced] = useState(filters);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(filters), 400);
        return () => clearTimeout(id);
    }, [filters]);

    // Limpia filtros vacíos antes de enviar
    const cleanedParams = useMemo(() => {
        const obj = { ...debounced };
        Object.keys(obj).forEach((k) => {
            if (obj[k] === "" || obj[k] == null) delete obj[k];
        });
        return obj;
    }, [debounced]);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin/reports", cleanedParams],
        queryFn: async () => {
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data; // { success, data, dailySummary, ... }
        },
        keepPreviousData: true,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const reports = data?.data || [];
    const verFactura = async (orderId) => {
        try {
            console.log("Solicitando factura para ID:", orderId);

            const res = await api.get(`/api/invoice/${orderId}`);
            const url = res.data?.url || res.data?.invoiceUrl;

            if (!res.data?.success || !url) {
                alert("No se pudo obtener la factura");
                return;
            }

            window.open(url, "_blank", "noopener,noreferrer");
        } catch (error) {
            console.error("Error cargando factura:", error);
            alert("Error al cargar la factura");
        }
    };


    const downloadExcel = async () => {
        try {
            // Usamos 'api' porque ya tiene el interceptor con el Token configurado
            const response = await api.get("/api/admin/reports/export/excel", {
                responseType: "blob", // IMPORTANTE: Indica que esperamos un archivo binario
            });

            // Crear un enlace temporal en el navegador para forzar la descarga
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "reporte_ordenes.xlsx"); // Nombre del archivo
            document.body.appendChild(link);
            link.click();

            // Limpieza
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error descargando Excel:", error);
            alert("Error al exportar el archivo. Verifica tu sesión.");
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Reportes</h2>

            {/* Filtros */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <input type="date" value={filters.from}
                       onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                       className="p-2 bg-[#1f1f1f] rounded text-white" />
                <input type="date" value={filters.to}
                       onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                       className="p-2 bg-[#1f1f1f] rounded text-white" />
                <select value={filters.method}
                        onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
                        className="p-2 bg-[#1f1f1f] rounded text-white">
                    <option value="">Todos los métodos</option>
                    <option value="Cash">Cash</option>
                    <option value="Tarjeta">Tarjeta</option>
                </select>
                <input placeholder="Usuario" value={filters.user}
                       onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
                       className="p-2 bg-[#1f1f1f] rounded text-white" />
            </div>

            {/* ... resto del JSX ... */}

            {/* Botones exportar */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={downloadExcel} // 👈 USAMOS LA NUEVA FUNCIÓN AQUÍ
                    className="bg-[#171717] px-4 py-2 rounded text-white hover:bg-[#333] transition"
                >
                    Exportar a Excel
                </button>
            </div>

            {/* Tabla */}
            {isLoading ? (
                <p>Cargando...</p>

            ) : isError ? (
                <p className="text-red-500">
                    Error al cargar reportes{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
                </p>
            ) : (
                <table className="w-full text-left border-collapse border border-[#2a2a2a]">
                    <thead className="bg-[#1f1f1f]">
                    <tr>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Método</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Factura</th>
                    </tr>
                    </thead>
                    <tbody>
                    {reports.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="text-center py-4 text-[#888]">No hay resultados</td>
                        </tr>
                    ) : (
                        reports.map((r) => (
                            <tr key={r._id} className="border-t border-[#2a2a2a]">
                                <td className="p-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                                <td className="p-3">{r.user?.name || "—"}</td>
                                <td className="p-3">{r.paymentMethod || "Cash"}</td>
                                <td className="p-3 font-bold text-[#F6B100]">{currency(r.bills?.totalWithTax)}</td>
                                <td className="p-3">
                                    {r._id && r.paymentMethod ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => verFactura(r._id)}
                                                className="text-blue-400 hover:underline"
                                            >
                                                Ver factura
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => verFactura(r._id)}
                                                className="text-green-400 hover:underline ml-3"
                                            >
                                                Descargar
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-500">No disponible</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Reports;
