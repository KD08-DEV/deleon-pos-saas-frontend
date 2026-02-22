// src/pages/Admin/Reports.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";

const currency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
        .format(Number(n || 0));

const Reports = () => {
    const todayYMD = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });

    const showToast = (message, type = "error") => {
        setToast({ open: true, message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500);
    };


    const [filters, setFilters] = useState(() => {
        const today = todayYMD();
        return {
            from: today,
            to: today,
            method: "",
            user: "",
            client: "",
        };
    });
    // ✅ Mantener "HOY" como filtro por defecto
// - Al cargar: fuerza hoy
// - Si cambia el día (medianoche) y el usuario seguía en "hoy", lo actualiza automático
    const lastAutoDayRef = useRef(todayYMD());

    useEffect(() => {
        const forceTodayOnLoad = () => {
            const today = todayYMD();
            lastAutoDayRef.current = today;
            setFilters((f) => ({
                ...f,
                from: today,
                to: today,
            }));
        };

        forceTodayOnLoad();

        const id = setInterval(() => {
            const today = todayYMD();

            // Si cambió el día (ej. pasó medianoche)
            if (today !== lastAutoDayRef.current) {
                const prev = lastAutoDayRef.current;

                setFilters((f) => {
                    // Solo auto-actualiza si el usuario seguía en el día anterior (modo "hoy")
                    if (f.from === prev && f.to === prev) {
                        return { ...f, from: today, to: today };
                    }
                    return f; // si el usuario eligió otro rango, no lo tocamos
                });

                lastAutoDayRef.current = today;
            }
        }, 60_000); // revisa cada 1 minuto

        return () => clearInterval(id);
    }, []);


    // Debounce de filtros
    const [debounced, setDebounced] = useState(filters);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(filters), 400);
        return () => clearTimeout(id);
    }, [filters]);

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

        // Reglas:
        // - Si solo hay from -> to = from
        // - Si solo hay to -> from = to
        // - Si ninguno -> por defecto hoy (opcional, pero recomendado)
        const today = todayYMD();

        const hasFrom = !!obj.from;
        const hasTo = !!obj.to;

        if (!hasFrom && !hasTo) {
            obj.from = today;
            obj.to = today;
        } else if (hasFrom && !hasTo) {
            obj.to = obj.from;
        } else if (!hasFrom && hasTo) {
            obj.from = obj.to;
        }

        // Normaliza rango para cubrir días completos:
        // from = inicio del día, to = inicio del día siguiente (fin exclusivo)
        if (obj.from) obj.from = `${obj.from}T00:00:00.000`;
        if (obj.to) obj.to = addDaysISOStart(obj.to, 1);

        Object.keys(obj).forEach((k) => {
            if (obj[k] === "" || obj[k] == null) delete obj[k];
        });

        return obj;
    }, [filters]);


    const normalize = (v) => String(v || "").trim().toLowerCase();

    const getClientName = (r) => {
        // en Orders.jsx usas localOrder.customerDetails.name -> en reports también
        return (
            r?.customerDetails?.name ||
            r?.customerDetails?.nombre ||
            r?.customerDetails?.clientName ||
            r?.customerDetails?.customerName ||
            r?.client?.name ||
            r?.clientName ||
            r?.customerName ||
            r?.customer?.name ||
            r?.bills?.fiscalName ||
            r?.fiscalName ||
            r?.fiscal?.name ||
            r?.fiscal?.razonSocial ||
            "—"
        );
    };


    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin/reports", cleanedParams],
        queryFn: async () => {
            // el backend puede ignorar client; por eso filtramos también en frontend
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data;
        },
        keepPreviousData: true,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const reports = data?.data || [];

    // ✅ Filtro real en frontend (cliente/usuario/metodo/rango fechas) aunque el backend no lo soporte todavía
    const filteredReports = useMemo(() => {
        const today = todayYMD();

        const onlyYMD = (v) => String(v || "").split("T")[0]; // por si viene con hora

        let fromYMD = onlyYMD(debounced.from);
        let toYMD = onlyYMD(debounced.to);

        const hasFrom = !!fromYMD;
        const hasTo = !!toYMD;

        if (!hasFrom && !hasTo) {
            fromYMD = today;
            toYMD = today;
        } else if (hasFrom && !hasTo) {
            toYMD = fromYMD;
        } else if (!hasFrom && hasTo) {
            fromYMD = toYMD;
        }

// YMD local del createdAt (no ISO UTC)
        const toLocalYMD = (d) => {
            const dt = new Date(d);
            const yyyy = dt.getFullYear();
            const mm = String(dt.getMonth() + 1).padStart(2, "0");
            const dd = String(dt.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };

        return reports.filter((r) => {
            if (r?.createdAt) {
                const createdYMD = toLocalYMD(r.createdAt);

                // compara por strings YYYY-MM-DD (funciona perfecto)
                if (fromYMD && createdYMD < fromYMD) return false;
                if (toYMD && createdYMD > toYMD) return false;
            }

            const client = normalize(debounced.client);
            const method = normalize(debounced.method);
            const user = normalize(debounced.user);

            if (method) {
                const pm = normalize(r?.paymentMethod || "Efectivo");
                const os = normalize(r?.orderSource || "");
                if (method.includes("delivery") || method.includes("pedido") || method.includes("uber")) {
                    if (!pm.includes(method) && !os.includes(method)) return false;
                } else {
                    if (!pm.includes(method)) return false;
                }
            }

            if (user) {
                const u = normalize(r?.user?.name || r?.user?.email || "");
                if (!u.includes(user)) return false;
            }

            if (client) {
                const c = normalize(getClientName(r));
                if (!c.includes(client)) return false;
            }

            return true;
        });
    }, [reports, debounced]);



    const cashClosure = useMemo(() => {
        const normalizeText = (v) => String(v || "").trim().toLowerCase();

        const normalizeChannel = (r) => {
            // 1) Lo más confiable: orderSource (si lo estás guardando)
            const os = normalizeText(r?.orderSource || r?.source || r?.channel);
            if (os) return os;

            // 2) Fallback: viene del populate(table)
            const t = r?.table || r?.tableId || r?.tableInfo || null;
            const vt = normalizeText(t?.virtualType || t?.type || r?.virtualType);
            return vt;
        };

        const normalizeMethod = (m) => normalizeText(m || "Efectivo");

        const buckets = {
            efectivo: { label: "Efectivo", total: 0, count: 0 },
            tarjeta: { label: "Tarjeta", total: 0, count: 0 },
            transferencia: { label: "Transferencia", total: 0, count: 0 },
            pedidoya: { label: "Pedido Ya", total: 0, count: 0 },
            ubereats: { label: "Uber Eats", total: 0, count: 0 },
            otros: { label: "Otros", total: 0, count: 0 },
            delivery: { label: "Delivery", total: 0, count: 0 },

        };

        let grandTotal = 0;
        let totalCount = 0;

        for (const r of filteredReports) {
            const total = Number(r?.bills?.totalWithTax || 0);

            let key = "otros";
            const channel = normalizeChannel(r);
            const pmRaw = normalizeMethod(r?.paymentMethod);

            // 1) Prioridad: canal
            if (channel.includes("pedidoya") || channel.includes("pedido") || channel.includes("pedidosya")) key = "pedidoya";
            else if (channel.includes("ubereats") || channel.includes("uber")) key = "ubereats";

            // 2) Fallback: método de pago
            else if (pmRaw.includes("efect")) key = "efectivo";
            else if (pmRaw.includes("tarj")) key = "tarjeta";
            else if (pmRaw.includes("transf")) key = "transferencia";
            else if (pmRaw.includes("pedido")) key = "pedidoya";
            else if (pmRaw.includes("uber")) key = "ubereats";
            else if (channel.includes("delivery")) key = "delivery";



            buckets[key].total += total;
            buckets[key].count += 1;

            grandTotal += total;
            totalCount += 1;
        }

        return { buckets, grandTotal, totalCount };
    }, [filteredReports]);


    const verFactura = async (orderId) => {
        try {
            const res = await api.get(`/api/invoice/${orderId}`);

            const url =
                res.data?.url ||
                res.data?.invoiceUrl ||
                res.data?.data?.url ||
                res.data?.data?.invoiceUrl;

            if (!url) {
                console.error("Respuesta invoice:", res.data);
                showToast("No se pudo obtener la factura (sin URL).");
                return;
            }

            window.open(url, "_blank", "noopener,noreferrer");
        } catch (error) {
            console.error("Error cargando factura:", error);
            showToast("Error al cargar la factura");
        }
    };



    // ✅ Export REAL en base a lo que ves (rango fechas + cliente + usuario + método)
    const downloadExcel = async () => {
        try {
            const rows = filteredReports.map((r) => ({
                Fecha: r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
                Usuario: r?.user?.name || "—",
                Cliente: getClientName(r),
                Metodo: r?.paymentMethod || "Efectivo",
                Total: Number(r?.bills?.totalWithTax || 0),
                OrderId: r?._id || "",
                Canal: r?.orderSource || "—",
                Envio: Number(r?.shippingFee ?? r?.deliveryFee ?? r?.bills?.shippingFee ?? r?.bills?.deliveryFee ?? 0),

            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reportes");

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, "reporte_ordenes.xlsx");
        } catch (error) {
            console.error("Error exportando Excel:", error);
            alert("Error al exportar el archivo. Verifica tu sesión.");
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Reportes</h2>

            {/* Filtros */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />
                <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />
                <select
                    value={filters.method}
                    onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
                    className="p-2 bg-[#1f1f1f] rounded text-white"
                >
                    <option value="">Todos los métodos</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Pedido Ya">Pedido Ya</option>
                    <option value="Uber Eats">Uber Eats</option>
                    <option value="Delivery">Delivery</option>

                </select>

                <input
                    placeholder="Usuario (empleado)"
                    value={filters.user}
                    onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />
                <input
                    placeholder="Cliente"
                    value={filters.client}
                    onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />
            </div>

            {/* Cierre de caja */}
            <div className="mb-6 rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Cierre de aa</h3>
                    <div className="text-sm text-gray-300">
                        Total: <span className="font-semibold text-white">{currency(cashClosure.grandTotal)}</span>
                        <span className="text-gray-500">{" "}({cashClosure.totalCount} ordenes)</span>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(cashClosure.buckets).map(([k, v]) => (
                        <div key={k} className="rounded-md bg-[#1f1f1f] border border-[#2a2a2a] p-3">
                            <div className="text-xs text-gray-400">{v.label}</div>
                            <div className="mt-1 text-sm font-semibold text-white">{currency(v.total)}</div>
                            <div className="mt-1 text-xs text-gray-500">{v.count} ordenes</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botones exportar */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={downloadExcel}
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
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Método</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Factura</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredReports.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="text-center py-4 text-[#888]">
                                No hay resultados
                            </td>
                        </tr>
                    ) : (
                        filteredReports.map((r) => (
                            <tr key={r._id} className="border-t border-[#2a2a2a]">
                                <td className="p-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                                <td className="p-3">{r.user?.name || "—"}</td>
                                <td className="p-3">{getClientName(r)}</td>
                                <td className="p-3">{r.paymentMethod || "Efectivo"}</td>
                                <td className="p-3 font-bold text-[#F6B100]">
                                    {currency(r.bills?.totalWithTax)}
                                </td>
                                <td className="p-3">
                                    {r._id ? (
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



export default Reports;
