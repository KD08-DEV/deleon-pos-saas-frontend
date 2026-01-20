// src/pages/admin/CashRegister.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Filter, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";

const currency = (n) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(Number(n || 0));

const normalize = (v) => String(v || "").trim().toLowerCase();

const safeNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const getTodayKey = () => new Date().toISOString().split("T")[0];

const getUserFromStorage = () => {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed || null;
    } catch {
        return null;
    }
};

const getOpeningCashStorageKey = () => {
    // Intento: tenantId + userId + fecha. Si no existen, cae a host + fecha.
    const u = getUserFromStorage();
    const tenantId = u?.tenantId || u?.tenant?._id || u?.tenant?.id || "";
    const userId = u?._id || u?.id || u?.user?._id || "";
    const host = typeof window !== "undefined" ? window.location.host : "app";
    const day = getTodayKey();

    return `cash_opening_${host}_${tenantId || "noTenant"}_${userId || "noUser"}_${day}`;
};

const CashRegister = () => {
    const [showFullView, setShowFullView] = useState(false);
    const [showFiltersMenu, setShowFiltersMenu] = useState(false);

    // Fondo inicial (menudo)
    const [openingCashInput, setOpeningCashInput] = useState("");
    const [openingCash, setOpeningCash] = useState(0);
    const didHydrateOpeningRef = useRef(false);
    const openingEditedRef = useRef(false);
    const openingSaveTimeoutRef = useRef(null);


    const queryClient = useQueryClient();

    const openingKey = getOpeningCashStorageKey();

    // Sesión de caja (menudo / fondo inicial) guardada en MongoDB
    const {
        data: cashSessionResp,
        isLoading: cashSessionLoading,
        isError: cashSessionIsError,
    } = useQuery({
        queryKey: ["admin/cash-session/current"],
        queryFn: async () => {
            const res = await api.get("/api/admin/cash-session/current");
            return res.data; // { success, data }
        },
        staleTime: 30_000,
        retry: 1,
    });
    const { mutate: saveOpeningCash, isPending: savingOpeningCash, isError: saveOpeningCashError } = useMutation({
        mutationFn: async (openingFloat) => {
            const res = await api.post("/api/admin/cash-session/open", { openingFloat });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session/current"] });
        },
    });

    const [modalFilters, setModalFilters] = useState({
        from: "",
        to: "",
        method: "",
        user: "",
        client: "",
    });



// 1) Hidratar: primero MongoDB, si no existe sesión usar localStorage
    useEffect(() => {
        if (didHydrateOpeningRef.current) return;

        const readFromLocal = () => {
            const raw = localStorage.getItem(openingKey);
            const val = safeNumber(raw);
            setOpeningCash(val);
            setOpeningCashInput(val ? String(val) : "");
        };

        // Si el servidor respondió (con o sin sesión)
        if (cashSessionResp) {
            const serverVal = cashSessionResp?.data?.openingFloat;

            if (typeof serverVal === "number") {
                // MongoDB manda el valor guardado
                setOpeningCash(serverVal);
                setOpeningCashInput(String(serverVal));
                localStorage.setItem(openingKey, String(serverVal)); // fallback
            } else {
                // No hay sesión aún hoy => fallback local
                readFromLocal();
            }

            didHydrateOpeningRef.current = true;
            return;
        }

        // Si dio error cargando del servidor => fallback local
        if (cashSessionIsError) {
            readFromLocal();
            didHydrateOpeningRef.current = true;
        }
    }, [cashSessionResp, cashSessionIsError, openingKey]);

// 2) Guardar: localStorage + MongoDB (debounce)
    useEffect(() => {
        // No guardes antes de hidratar (para evitar sobrescribir)
        if (!didHydrateOpeningRef.current) return;

        // Normaliza número
        const cleaned = String(openingCashInput ?? "").replace(/[^\d.-]/g, "");
        const parsed = Number(cleaned);
        const openingFloat = Number.isFinite(parsed) ? parsed : 0;

        setOpeningCash(openingFloat);
        localStorage.setItem(openingKey, String(openingFloat));

        // Solo manda al servidor si el usuario lo cambió (evita “post” en la hidratación)
        if (!openingEditedRef.current) return;

        if (openingSaveTimeoutRef.current) clearTimeout(openingSaveTimeoutRef.current);

        openingSaveTimeoutRef.current = setTimeout(() => {
            saveOpeningCash(openingFloat);
        }, 800);


        return () => {
            if (openingSaveTimeoutRef.current) clearTimeout(openingSaveTimeoutRef.current);
        };
    }, [openingCashInput, openingKey, saveOpeningCash]);



    // Limpia filtros vacíos antes de enviar (para la query inicial)
    const cleanedParams = useMemo(() => {
        return {};
    }, []);

    const getClientName = (r) => {
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
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data;
        },
        keepPreviousData: true,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const reports = data?.data || [];

    // Ordenar por fecha más reciente
    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) => {
            const dateA = new Date(a?.createdAt || 0);
            const dateB = new Date(b?.createdAt || 0);
            return dateB - dateA;
        });
    }, [reports]);

    // Últimos 10 registros para vista inicial
    const recentReports = useMemo(() => {
        return sortedReports.slice(0, 10);
    }, [sortedReports]);

    // Filtro para el modal (todos los registros con filtros)
    const modalFilteredReports = useMemo(() => {
        const from = modalFilters.from ? new Date(`${modalFilters.from}T00:00:00`) : null;
        const to = modalFilters.to ? new Date(`${modalFilters.to}T23:59:59`) : null;
        const method = normalize(modalFilters.method);
        const user = normalize(modalFilters.user);
        const client = normalize(modalFilters.client);

        return sortedReports.filter((r) => {
            const createdAt = r?.createdAt ? new Date(r.createdAt) : null;
            if (from && createdAt && createdAt < from) return false;
            if (to && createdAt && createdAt > to) return false;

            if (method) {
                const pm = normalize(r?.paymentMethod || "Efectivo");
                if (!pm.includes(method)) return false;
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
    }, [sortedReports, modalFilters]);

    const buildCashClosure = (rows) => {
        const normalizeMethod = (m) => String(m || "Efectivo").trim().toLowerCase();

        const buckets = {
            efectivo: { label: "Efectivo", total: 0, count: 0 },
            tarjeta: { label: "Tarjeta", total: 0, count: 0 },
            transferencia: { label: "Transferencia", total: 0, count: 0 },
            pedidoya: { label: "Pedido Ya", total: 0, count: 0 },
            ubereats: { label: "Uber Eats", total: 0, count: 0 },
            otros: { label: "Otros", total: 0, count: 0 },
        };

        let grandTotal = 0;
        let totalCount = 0;

        for (const r of rows) {
            const total = Number(r?.bills?.totalWithTax || 0);
            const pmRaw = normalizeMethod(r?.paymentMethod);

            let key = "otros";
            if (pmRaw.includes("efect")) key = "efectivo";
            else if (pmRaw.includes("tarj")) key = "tarjeta";
            else if (pmRaw.includes("transf")) key = "transferencia";
            else if (pmRaw.includes("pedido")) key = "pedidoya";
            else if (pmRaw.includes("uber")) key = "ubereats";

            buckets[key].total += total;
            buckets[key].count += 1;

            grandTotal += total;
            totalCount += 1;
        }

        // Extra: efectivo en caja (fondo inicial + efectivo ventas)
        const cashSales = safeNumber(buckets.efectivo.total);
        const opening = safeNumber(openingCash);
        const cashInRegister = opening + cashSales;

        return { buckets, grandTotal, totalCount, cashSales, opening, cashInRegister };
    };

    // Resumen basado en los últimos 10 registros
    const initialCashClosure = useMemo(() => buildCashClosure(recentReports), [recentReports, openingCash]);

    // Resumen para el modal (todos los registros filtrados)
    const modalCashClosure = useMemo(() => buildCashClosure(modalFilteredReports), [modalFilteredReports, openingCash]);

    const verFactura = async (orderId) => {
        try {
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

    const downloadExcel = async (reportsToExport = recentReports, summary = initialCashClosure) => {
        try {
            const rows = reportsToExport.map((r) => ({
                Fecha: r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
                Usuario: r?.user?.name || "—",
                Cliente: getClientName(r),
                Metodo: r?.paymentMethod || "Efectivo",
                Total: Number(r?.bills?.totalWithTax || 0),
                OrderId: r?._id || "",
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Cierre de Caja");

            const summaryRows = [
                { Campo: "Fondo inicial (menudo)", Valor: Number(summary?.opening || 0) },
                { Campo: "Efectivo (ventas)", Valor: Number(summary?.cashSales || 0) },
                { Campo: "Efectivo en caja (fondo + ventas)", Valor: Number(summary?.cashInRegister || 0) },
                { Campo: "Total general (todas las ventas)", Valor: Number(summary?.grandTotal || 0) },
                { Campo: "Órdenes", Valor: Number(summary?.totalCount || 0) },
            ];
            const ws2 = XLSX.utils.json_to_sheet(summaryRows);
            XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, `cierre_caja_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Error exportando Excel:", error);
            alert("Error al exportar el archivo. Verifica tu sesión.");
        }
    };

    const resetModalFilters = () => {
        setModalFilters({
            from: "",
            to: "",
            method: "",
            user: "",
            client: "",
        });
    };

    const closeModal = () => {
        setShowFullView(false);
        setShowFiltersMenu(false);
        resetModalFilters();
    };

    return (
        <div className={showFullView ? "pointer-events-none select-none" : ""}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Cierre de Caja</h2>
                <button
                    onClick={() => setShowFullView(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                >
                    <Search className="w-4 h-4" />
                    Ver Registros Completos
                </button>
            </div>

            {/* Fondo inicial */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-white font-semibold text-lg">Fondo inicial de caja (menudo)</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            Este monto no es venta: es el efectivo con el que se inicia la caja para dar cambio.
                        </p>
                    </div>

                    <div className="w-full max-w-sm">
                        <label className="text-xs text-gray-400 mb-1 block">Monto (ej. 2000)</label>
                        <input
                            value={openingCashInput}
                            onChange={(e) => {
                                openingEditedRef.current = true;
                                setOpeningCashInput(e.target.value);
                            }}
                            inputMode="decimal"
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                            placeholder="0"
                        />
                        <div className="text-xs text-gray-500 mt-2">
                            {cashSessionLoading
                                ? "Cargando fondo inicial..."
                                : savingOpeningCash
                                    ? "Guardando..."
                                    : saveOpeningCashError
                                        ? "No se pudo guardar el fondo inicial."
                                        : "Guardado."}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Guardado automáticamente para hoy.
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                        <div className="text-xs text-gray-400 mb-1">Fondo inicial</div>
                        <div className="text-sm font-semibold text-white">{currency(openingCash)}</div>
                    </div>
                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                        <div className="text-xs text-gray-400 mb-1">Efectivo (ventas)</div>
                        <div className="text-sm font-semibold text-white">{currency(initialCashClosure.cashSales)}</div>
                    </div>
                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3 hover:border-[#f6b100]/30 transition-colors">
                        <div className="text-xs text-gray-400 mb-1">Efectivo en caja (fondo + ventas)</div>
                        <div className="text-sm font-semibold text-[#f6b100]">{currency(initialCashClosure.cashInRegister)}</div>
                    </div>
                </div>
            </div>

            {/* Resumen (vista inicial - últimos 10) */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg">Resumen</h3>
                    <div className="text-sm text-gray-300">
                        Total:{" "}
                        <span className="font-semibold text-[#f6b100] text-lg">
              {currency(initialCashClosure.grandTotal)}
            </span>
                        <span className="text-gray-500 ml-2">({initialCashClosure.totalCount} órdenes)</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(initialCashClosure.buckets).map(([k, v]) => (
                        <div
                            key={k}
                            className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3 hover:border-[#f6b100]/30 transition-colors"
                        >
                            <div className="text-xs text-gray-400 mb-1">{v.label}</div>
                            <div className="text-sm font-semibold text-white">{currency(v.total)}</div>
                            <div className="text-xs text-gray-500 mt-1">{v.count} órdenes</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botón exportar */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => downloadExcel(recentReports, initialCashClosure)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                </button>
            </div>

            {/* Tabla (últimos 10) */}
            {isLoading ? (
                <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : isError ? (
                <div className="text-center py-8 text-red-400">
                    Error al cargar registros{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
                </div>
            ) : (
                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-300">Fecha</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Usuario</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Cliente</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Método</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Total</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">Factura</th>
                            </tr>
                            </thead>
                            <tbody>
                            {recentReports.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                        No hay registros disponibles
                                    </td>
                                </tr>
                            ) : (
                                recentReports.map((r) => (
                                    <tr
                                        key={r._id}
                                        className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors"
                                    >
                                        <td className="p-3 text-sm text-gray-300">
                                            {r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                        </td>
                                        <td className="p-3 text-sm text-gray-300">{r?.user?.name || "—"}</td>
                                        <td className="p-3 text-sm text-gray-300">{getClientName(r)}</td>
                                        <td className="p-3 text-sm text-gray-300">{r?.paymentMethod || "Efectivo"}</td>
                                        <td className="p-3 text-sm font-bold text-[#f6b100]">
                                            {currency(r?.bills?.totalWithTax)}
                                        </td>
                                        <td className="p-3">
                                            {r?._id ? (
                                                <button
                                                    type="button"
                                                    onClick={() => verFactura(r._id)}
                                                    className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
                                                >
                                                    Ver
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-500">No disponible</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {sortedReports.length > 10 && (
                        <div className="p-4 bg-[#1a1a1a]/50 border-t border-gray-800/50 text-center text-sm text-gray-400">
                            Mostrando los últimos 10 registros de {sortedReports.length} totales
                        </div>
                    )}
                </div>
            )}

            {/* Modal flotante */}
            {showFullView && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pb-24 pointer-events-auto"
                    onClick={closeModal}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    style={{ touchAction: "none" }}
                >
                    <div
                        className="w-full max-w-7xl max-h-[calc(100vh-8rem)] bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
                            <h2 className="text-2xl font-bold text-white">Registros Completos</h2>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 text-white rounded-lg font-semibold hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                                    >
                                        <Filter className="w-4 h-4" />
                                        Filtros
                                    </button>

                                    {showFiltersMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-80 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg shadow-xl z-50 p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-semibold text-white">Filtros de Búsqueda</h4>
                                                <button
                                                    onClick={() => setShowFiltersMenu(false)}
                                                    className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Fecha desde</label>
                                                    <input
                                                        type="date"
                                                        value={modalFilters.from}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, from: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Fecha hasta</label>
                                                    <input
                                                        type="date"
                                                        value={modalFilters.to}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, to: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Método de pago</label>
                                                    <select
                                                        value={modalFilters.method}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, method: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    >
                                                        <option value="">Todos los métodos</option>
                                                        <option value="Efectivo">Efectivo</option>
                                                        <option value="Tarjeta">Tarjeta</option>
                                                        <option value="Transferencia">Transferencia</option>
                                                        <option value="Pedido Ya">Pedido Ya</option>
                                                        <option value="Uber Eats">Uber Eats</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Buscar por usuario</label>
                                                    <input
                                                        placeholder="Nombre del usuario..."
                                                        value={modalFilters.user}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, user: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Buscar por cliente</label>
                                                    <input
                                                        placeholder="Nombre del cliente..."
                                                        value={modalFilters.client}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, client: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                {(modalFilters.from ||
                                                    modalFilters.to ||
                                                    modalFilters.method ||
                                                    modalFilters.user ||
                                                    modalFilters.client) && (
                                                    <button
                                                        onClick={resetModalFilters}
                                                        className="w-full text-xs text-gray-400 hover:text-white transition-colors py-1"
                                                    >
                                                        Limpiar filtros
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={closeModal}
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                    title="Cerrar"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Resumen modal */}
                        <div className="px-6 py-4 border-b border-gray-800/50 bg-[#111111]/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-semibold">Resumen</h3>
                                <div className="text-sm text-gray-300">
                                    Total:{" "}
                                    <span className="font-semibold text-[#f6b100]">{currency(modalCashClosure.grandTotal)}</span>
                                    <span className="text-gray-500 ml-2">({modalCashClosure.totalCount} órdenes)</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2">
                                    <div className="text-xs text-gray-400 mb-1">Fondo inicial</div>
                                    <div className="text-sm font-semibold text-white">{currency(modalCashClosure.opening)}</div>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2">
                                    <div className="text-xs text-gray-400 mb-1">Efectivo (ventas)</div>
                                    <div className="text-sm font-semibold text-white">{currency(modalCashClosure.cashSales)}</div>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2 hover:border-[#f6b100]/30 transition-colors">
                                    <div className="text-xs text-gray-400 mb-1">Efectivo en caja</div>
                                    <div className="text-sm font-semibold text-[#f6b100]">{currency(modalCashClosure.cashInRegister)}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3">
                                {Object.entries(modalCashClosure.buckets).map(([k, v]) => (
                                    <div key={k} className="rounded-lg bgiKDD bg-[#1a1a1a] border border-gray-800/30 p-2">
                                        <div className="text-xs text-gray-400 mb-1">{v.label}</div>
                                        <div className="text-sm font-semibold text-white">{currency(v.total)}</div>
                                        <div className="text-xs text-gray-500 mt-1">{v.count} órdenes</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => downloadExcel(modalFilteredReports, modalCashClosure)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Exportar a Excel
                                </button>
                            </div>

                            <div className="rounded-lg border border-gray-800/50 bg-[#111111]/30 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                                        <tr>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Fecha</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Usuario</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Cliente</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Método</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Total</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Factura</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {modalFilteredReports.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-8 text-gray-500">
                                                    No hay registros disponibles
                                                </td>
                                            </tr>
                                        ) : (
                                            modalFilteredReports.map((r) => (
                                                <tr
                                                    key={r._id}
                                                    className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors"
                                                >
                                                    <td className="p-3 text-sm text-gray-300">
                                                        {r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-300">{r?.user?.name || "—"}</td>
                                                    <td className="p-3 text-sm text-gray-300">{getClientName(r)}</td>
                                                    <td className="p-3 text-sm text-gray-300">{r?.paymentMethod || "Efectivo"}</td>
                                                    <td className="p-3 text-sm font-bold text-[#f6b100]">
                                                        {currency(r?.bills?.totalWithTax)}
                                                    </td>
                                                    <td className="p-3">
                                                        {r?._id ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => verFactura(r._id)}
                                                                className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
                                                            >
                                                                Ver
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">No disponible</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 mt-3">
                                Nota: el “Fondo inicial” se guarda localmente para hoy. Si quieres que quede guardado en la base de datos por
                                turno/caja, lo ideal es crear un modelo de “CashRegisterSession”.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashRegister;
