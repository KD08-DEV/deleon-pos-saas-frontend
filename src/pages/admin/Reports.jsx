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

            const res = await api.get(`/api/order/${orderId}/invoice`);

            console.log("Respuesta del servidor:", res.data);

            if (!res.data?.success || !res.data?.url) {
                alert("No se pudo obtener la factura");
                return;
            }

            window.open(res.data.url, "_blank");
        } catch (error) {
            console.error("Error cargando factura:", error);
            alert("Error al cargar la factura");
        }
    };


    const handleExportPDF = () => {
        if (reports.length === 0) return alert("No hay datos para exportar");
        const doc = new jsPDF();
        doc.text("Reporte de Ventas", 14, 16);
        doc.setFontSize(10);

        const headers = [["Fecha", "Usuario", "Método", "Total", "Factura"]];
        const rows = reports.map((r) => [
            new Date(r.createdAt).toLocaleDateString(),
            r.user?.name || "—",
            r.paymentMethod || "Cash",
            currency(r.bills?.totalWithTax),
        ]);

        doc.autoTable({
            head: headers,
            body: rows,
            startY: 22,
            theme: "grid",
            styles: { fillColor: [26, 26, 26], textColor: [255, 255, 255] },
            headStyles: { fillColor: [246, 177, 0], textColor: [18, 18, 18] },
        });

        const total = reports.reduce((s, r) => s + (r.bills?.totalWithTax || 0), 0);
        doc.text(`Total General: ${currency(total)}`, 14, doc.lastAutoTable.finalY + 10);
        doc.save("Reporte_Ventas.pdf");
    };

    const handleExportExcel = () => {
        if (reports.length === 0) return alert("No hay datos para exportar");
        const formatted = reports.map((r) => ({
            Fecha: new Date(r.createdAt).toLocaleDateString(),
            Usuario: r.user?.name || "—",
            Método: r.paymentMethod || "Cash",
            Total: Number(r.bills?.totalWithTax || 0),
        }));
        const worksheet = XLSX.utils.json_to_sheet(formatted);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "Reporte_Ventas.xlsx");
    };
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
                    <option value="Online">Online</option>
                </select>
                <input placeholder="Usuario" value={filters.user}
                       onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
                       className="p-2 bg-[#1f1f1f] rounded text-white" />
            </div>

            {/* Botones exportar */}
            <div className="flex gap-3 mb-6">

                <button
                    onClick={() =>
                        window.open(`${import.meta.env.VITE_API_URL}/api/admin/reports/export/excel`, "_blank")
                    }
                    className="bg-[#171717] px-4 py-2 rounded text-white"
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
