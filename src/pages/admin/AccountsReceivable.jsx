import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, CheckCircle, CreditCard, Wallet, Banknote, AlertTriangle } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";

const REGISTER_STORAGE_KEY = "deleonsoft_active_register_id";

const getActiveRegisterId = () => {
    try {
        return String(localStorage.getItem(REGISTER_STORAGE_KEY) || "MAIN")
            .trim()
            .toUpperCase();
    } catch {
        return "MAIN";
    }
};

const money = (value) =>
    new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

const formatDate = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("es-DO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const statusLabel = {
    pending: "Pendiente",
    partial: "Parcial",
    paid: "Pagada",
    void: "Anulada",
};

const statusClass = {
    pending: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    partial: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    paid: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    void: "bg-red-500/10 text-red-300 border-red-500/30",
};

export default function AccountsReceivable() {
    const queryClient = useQueryClient();

    const [status, setStatus] = useState("open");
    const [search, setSearch] = useState("");
    const [paymentModal, setPaymentModal] = useState(null);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("Efectivo");
    const [note, setNote] = useState("");

    const queryParams = useMemo(
        () => ({
            status,
            q: search.trim(),
            limit: 300,
        }),
        [status, search]
    );

    const receivablesQuery = useQuery({
        queryKey: ["accounts-receivable", queryParams],
        queryFn: async () => {
            const res = await api.get("/api/admin/accounts-receivable", {
                params: queryParams,
            });
            return res.data?.data || [];
        },
        staleTime: 10_000,
    });

    const summaryQuery = useQuery({
        queryKey: ["accounts-receivable-summary"],
        queryFn: async () => {
            const res = await api.get("/api/admin/accounts-receivable/summary");
            return res.data?.data || null;
        },
        staleTime: 10_000,
    });

    const rows = receivablesQuery.data || [];
    const summary = summaryQuery.data || {};

    const paymentMutation = useMutation({
        mutationFn: async () => {
            if (!paymentModal?._id) throw new Error("Cuenta no seleccionada");

            const value = Number(String(amount || "").replace(/[^\d.-]/g, ""));

            if (!Number.isFinite(value) || value <= 0) {
                throw new Error("Monto inválido");
            }

            const res = await api.post(
                `/api/admin/accounts-receivable/${paymentModal._id}/payments`,
                {
                    amount: value,
                    method,
                    registerId: getActiveRegisterId(),
                    note,
                }
            );

            return res.data;
        },
        onSuccess: () => {
            enqueueSnackbar("Pago registrado correctamente.", { variant: "success" });
            setPaymentModal(null);
            setAmount("");
            setMethod("Efectivo");
            setNote("");
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable-summary"] });
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session"] });
            queryClient.invalidateQueries({ queryKey: ["cash-session"] });
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable", "cash-summary"] });
            queryClient.invalidateQueries({ queryKey: ["admin/orders/reports"] });
        },
        onError: (error) => {
            enqueueSnackbar(
                error?.response?.data?.message || error?.message || "No se pudo registrar el pago.",
                { variant: "error" }
            );
        },
    });

    const openPaymentModal = (row, fullPayment = false) => {
        setPaymentModal(row);
        setAmount(fullPayment ? String(Number(row.balance || 0).toFixed(2)) : "");
        setMethod("Efectivo");
        setNote("");
    };
    const renderReceivableActions = (row, mobile = false) => {
        if (!["pending", "partial"].includes(row.status)) {
            return <span className="text-gray-500 text-sm">Sin acciones</span>;
        }

        return (
            <div className={`flex gap-2 ${mobile ? "flex-col sm:flex-row" : "justify-end flex-wrap"}`}>
                <button
                    type="button"
                    onClick={() => openPaymentModal(row, false)}
                    className={`rounded-lg bg-[#232323] hover:bg-[#2f2f2f] font-semibold transition-colors whitespace-nowrap ${
                        mobile ? "w-full px-3 py-2.5" : "px-2.5 py-2 text-xs"
                    }`}
                >
                    Abonar
                </button>

                <button
                    type="button"
                    onClick={() => openPaymentModal(row, true)}
                    className={`rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold transition-colors whitespace-nowrap ${
                        mobile ? "w-full px-3 py-2.5" : "px-2.5 py-2 text-xs"
                    }`}
                >
                    Pago completo
                </button>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Cuentas por cobrar</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Controla ventas fiadas, abonos, pagos parciales y saldos pendientes.
                    </p>
                </div>

                <div className="w-full md:w-auto flex items-center gap-2 bg-[#111] border border-[#2b2b2b] rounded-xl px-3 py-2">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar cliente, teléfono o factura..."
                        className="bg-transparent outline-none text-sm w-full md:w-64 min-w-0"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">
                    <p className="text-xs text-gray-400">Balance pendiente</p>
                    <p className="text-xl font-bold mt-1">{money(summary.totalOpenBalance)}</p>
                </div>

                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">
                    <p className="text-xs text-gray-400">Pendientes</p>
                    <p className="text-xl font-bold mt-1">{summary.pending?.count || 0}</p>
                </div>

                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">
                    <p className="text-xs text-gray-400">Parciales</p>
                    <p className="text-xl font-bold mt-1">{summary.partial?.count || 0}</p>
                </div>

                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">
                    <p className="text-xs text-gray-400">Total abonado</p>
                    <p className="text-xl font-bold mt-1">{money(summary.totalPaid)}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {[
                    ["open", "Abiertas"],
                    ["pending", "Pendientes"],
                    ["partial", "Parciales"],
                    ["paid", "Pagadas"],
                    ["void", "Anuladas"],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setStatus(key)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                            status === key
                                ? "bg-white text-black border-white"
                                : "bg-[#111] text-gray-300 border-[#2b2b2b]"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl overflow-hidden max-w-full min-w-0">
                {receivablesQuery.isLoading ? (
                    <div className="p-6 text-gray-400">Cargando cuentas por cobrar...</div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No hay cuentas por cobrar para este filtro.
                    </div>
                ) : (
                    <>
                        {/* Vista responsive: tarjetas para pantallas pequeñas y medianas */}
                        <div className="2xl:hidden divide-y divide-[#2b2b2b]">
                            {rows.map((row) => {
                                const customerName =
                                    row.customerSnapshot?.name || row.customerId?.name || "Cliente";

                                const customerPhone =
                                    row.customerSnapshot?.phone || row.customerId?.phone || "Sin teléfono";

                                const invoiceNumber =
                                    row.invoiceNumber || row.facturaNo || row.orderId?.invoiceNumber || "N/A";

                                return (
                                    <div key={row._id} className="p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white truncate">
                                                    {customerName}
                                                </p>

                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {customerPhone}
                                                </p>

                                                <p className="text-xs text-gray-400 mt-2">
                                                    Factura:{" "}
                                                    <span className="text-white font-semibold">
                                            {invoiceNumber}
                                        </span>
                                                </p>

                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatDate(row.createdAt)}
                                                </p>
                                            </div>

                                            <span
                                                className={`w-fit inline-flex px-3 py-1 rounded-full border text-xs font-semibold ${
                                                    statusClass[row.status] || statusClass.pending
                                                }`}
                                            >
                                    {statusLabel[row.status] || row.status}
                                </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                                            <div className="rounded-xl bg-[#181818] border border-[#2b2b2b] p-3">
                                                <p className="text-xs text-gray-500">Monto</p>
                                                <p className="font-bold text-white mt-1">
                                                    {money(row.originalAmount)}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-[#181818] border border-[#2b2b2b] p-3">
                                                <p className="text-xs text-gray-500">Abonado</p>
                                                <p className="font-bold text-emerald-300 mt-1">
                                                    {money(row.paidAmount)}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-[#181818] border border-[#2b2b2b] p-3">
                                                <p className="text-xs text-gray-500">Pendiente</p>
                                                <p className="font-bold text-yellow-300 mt-1">
                                                    {money(row.balance)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            {renderReceivableActions(row, true)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Vista tabla: solo para pantallas muy grandes */}
                        <div className="hidden 2xl:block overflow-x-auto max-w-full">
                            <table className="w-full text-sm table-fixed">
                                <thead className="bg-[#181818] text-gray-400">
                                <tr>
                                    <th className="text-left p-3 w-[17%]">Cliente</th>
                                    <th className="text-left p-3 w-[11%]">Factura</th>
                                    <th className="text-left p-3 w-[13%]">Fecha</th>
                                    <th className="text-right p-3 w-[10%]">Monto</th>
                                    <th className="text-right p-3 w-[10%]">Abonado</th>
                                    <th className="text-right p-3 w-[10%]">Pendiente</th>
                                    <th className="text-center p-3 w-[11%]">Estado</th>
                                    <th className="text-right p-3 w-[18%]">Acciones</th>
                                </tr>
                                </thead>

                                <tbody>
                                {rows.map((row) => (
                                    <tr key={row._id} className="border-t border-[#2b2b2b]">
                                        <td className="p-3 min-w-0">
                                            <p className="font-semibold truncate">
                                                {row.customerSnapshot?.name || row.customerId?.name || "Cliente"}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {row.customerSnapshot?.phone || row.customerId?.phone || "Sin teléfono"}
                                            </p>
                                        </td>

                                        <td className="p-3 truncate">
                                            {row.invoiceNumber || row.facturaNo || row.orderId?.invoiceNumber || "N/A"}
                                        </td>

                                        <td className="p-3 text-gray-400">
                                            {formatDate(row.createdAt)}
                                        </td>

                                        <td className="p-3 text-right">
                                            {money(row.originalAmount)}
                                        </td>

                                        <td className="p-3 text-right text-emerald-300">
                                            {money(row.paidAmount)}
                                        </td>

                                        <td className="p-3 text-right text-yellow-300 font-semibold">
                                            {money(row.balance)}
                                        </td>

                                        <td className="p-3 text-center align-middle">
                                            <span
                                                className={`inline-flex items-center justify-center min-w-[76px] px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${
                                                    statusClass[row.status] || statusClass.pending
                                                }`}
                                            >
                                                {statusLabel[row.status] || row.status}
                                            </span>
                                        </td>

                                        <td className="p-3 text-right align-middle">
                                            {renderReceivableActions(row, false)}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {paymentModal && (
                <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#111] border border-[#2b2b2b] rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-[#2b2b2b]">
                            <div>
                                <h2 className="text-xl font-bold">Registrar pago</h2>
                                <p className="text-sm text-gray-400">
                                    Pendiente: {money(paymentModal.balance)}
                                </p>
                            </div>

                            <button
                                onClick={() => setPaymentModal(null)}
                                className="p-2 rounded-lg hover:bg-[#222]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Monto recibido</label>
                                <input
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="mt-1 w-full bg-[#181818] border border-[#2b2b2b] rounded-xl px-4 py-3 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Método de pago</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                    {[
                                        ["Efectivo", Banknote],
                                        ["Tarjeta", CreditCard],
                                        ["Transferencia", Wallet],
                                        ["Otros", AlertTriangle],
                                    ].map(([key, Icon]) => (
                                        <button
                                            key={key}
                                            onClick={() => setMethod(key)}
                                            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 border ${
                                                method === key
                                                    ? "bg-white text-black border-white"
                                                    : "bg-[#181818] text-gray-300 border-[#2b2b2b]"
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-xs font-semibold">{key}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Nota opcional</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Ejemplo: pago recibido en caja..."
                                    className="mt-1 w-full bg-[#181818] border border-[#2b2b2b] rounded-xl px-4 py-3 outline-none min-h-24"
                                />
                            </div>

                            <button
                                onClick={() => paymentMutation.mutate()}
                                disabled={paymentMutation.isPending}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-xl py-3 font-bold"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {paymentMutation.isPending ? "Guardando..." : "Registrar pago"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}