import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import {
    listExpenseCategories,
    listExpenses,
    createExpense,
    voidExpense,
} from "../../lib/adminFinanceApi";
import MermaPanel from "./MermaPanel";


const todayYMD = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};
function money(n) {
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        minimumFractionDigits: 2,
    }).format(Number(n || 0));
}

export default function Expenses() {
    const [sourceType, setSourceType] = useState("all");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [reference, setReference] = useState("");
    const [cats, setCats] = useState([]);
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const [from, setFrom] = useState(todayYMD());
    const [to, setTo] = useState(todayYMD());

    const [dateYMD, setDateYMD] = useState(todayYMD());
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [note, setNote] = useState("");
    const [confirmVoid, setConfirmVoid] = useState({
        open: false,
        row: null,
    });

    async function loadCats() {
        const r = await listExpenseCategories();
        setCats(r.data || []);
        if (!categoryId && r.data?.[0]?._id) setCategoryId(r.data[0]._id);
    }

    async function refresh() {
        setErr("");
        const params = { from, to };

        if (sourceType !== "all") {
            params.sourceType = sourceType;
        }

        const r = await listExpenses(params);
        setRows(r.data || []);
    }

    useEffect(() => {
        Promise.all([loadCats(), refresh()]).catch((e) => setErr(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const total = useMemo(() => {
        return (rows || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
    }, [rows]);

    const totals = useMemo(() => {
        const all = rows || [];

        const payroll = all
            .filter((r) => r?.source?.type === "payroll")
            .reduce((acc, r) => acc + Number(r.amount || 0), 0);

        const manual = all
            .filter((r) => r?.source?.type !== "payroll")
            .reduce((acc, r) => acc + Number(r.amount || 0), 0);

        return {
            all: manual + payroll,
            manual,
            payroll,
            count: all.length,
        };
    }, [rows]);

    async function onCreate(e) {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
            const cleanAmount = String(amount).replace(/,/g, "");
            await createExpense({
                dateYMD,
                amount: cleanAmount,
                categoryId,
                note,
                paymentMethod,
                reference,
            });
            setAmount("");
            setNote("");
            setReference("");
            setPaymentMethod("cash");
            await refresh();
        } catch (e2) {
            setErr(e2.message);
        } finally {
            setBusy(false);
        }
    }

    function openVoidModal(row) {
        setConfirmVoid({
            open: true,
            row,
        });
    }

    function closeVoidModal() {
        setConfirmVoid({
            open: false,
            row: null,
        });
    }

    async function confirmVoidExpense() {
        const id = confirmVoid?.row?._id;
        if (!id) return;

        setBusy(true);
        setErr("");

        try {
            await voidExpense(id);
            await refresh();
            closeVoidModal();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="p-4 text-white">
            <h1 className="text-xl font-semibold">Gastos</h1>

            {err ? <div className="mt-3 text-red-400">{err}</div> : null}

            <div className="mt-4 flex flex-wrap gap-2 items-end">
                <div>
                    <div className="text-xs text-white/70">Desde</div>
                    <input
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />
                </div>

                <div>
                    <div className="text-xs text-white/70">Hasta</div>
                    <input
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </div>

                <div>
                    <div className="text-xs text-white/70">Tipo</div>
                    <select
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value)}
                    >
                        <option value="all">Todos</option>
                        <option value="manual">Manuales</option>
                        <option value="payroll">Nómina</option>
                    </select>
                </div>

                <button
                    className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2"
                    onClick={() => refresh().catch((e) => setErr(e.message))}
                    disabled={busy}
                >
                    Filtrar
                </button>

                <div className="ml-auto text-white/80">
                    Total rango: <span className="font-semibold">{money(total)}</span>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Total egresos</div>
                    <div className="text-xl font-semibold">{money(totals.all)}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Gastos manuales</div>
                    <div className="text-xl font-semibold">{money(totals.manual)}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Nómina</div>
                    <div className="text-xl font-semibold">{money(totals.payroll)}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Registros</div>
                    <div className="text-xl font-semibold">{totals.count}</div>
                </div>
            </div>

            <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-2">
                    <div className="text-xs text-white/70">Fecha</div>
                    <input
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        type="date"
                        value={dateYMD}
                        onChange={(e) => setDateYMD(e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <div className="text-xs text-white/70">Monto</div>
                    <input
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <div className="text-xs text-white/70">Categoría</div>
                    <select
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                    >
                        {cats.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <div className="text-xs text-white/70">Método</div>
                    <select
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="card">Tarjeta</option>
                        <option value="other">Otro</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <div className="text-xs text-white/70">Referencia</div>
                    <input
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        placeholder="Ej: Recibo 00231"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                    />
                </div>

                <div className="md:col-span-5">
                    <div className="text-xs text-white/70">Nota</div>
                    <input
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                        placeholder="Ej: Pago de luz"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>
                <div className="md:col-span-1 flex items-end">
                    <button
                        disabled={busy || !amount || !categoryId}
                        className="w-full bg-yellow-500 text-black rounded-lg px-3 py-2 font-medium disabled:opacity-60"
                    >
                        Guardar
                    </button>
                </div>
            </form>

            <div className="mt-6 border border-white/10 rounded-xl overflow-hidden">
                <div className="hidden md:grid md:grid-cols-12 bg-white/5 px-3 py-2 text-sm text-white/80">
                    <div className="col-span-2">Fecha</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2">Categoría</div>
                    <div className="col-span-2">Nota</div>
                    <div className="col-span-1">Referencia</div>
                    <div className="col-span-1">Método</div>
                    <div className="col-span-1 text-right">Monto</div>
                    <div className="col-span-1 text-right">Acción</div>
                </div>

                {rows.map((r) => {
                    const isPayroll = r?.source?.type === "payroll";

                    return (
                        <div
                            key={r._id}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 px-3 py-3 border-t border-white/10 md:items-center"
                        >
                            <div className="md:col-span-2">{r.dateYMD}</div>

                            <div className="md:col-span-2">
                    <span
                        className={`px-2 py-1 rounded text-xs ${
                            isPayroll
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-white/10 text-white/80"
                        }`}
                    >
                        {isPayroll ? "Nómina" : "Manual"}
                    </span>
                            </div>

                            <div className="md:col-span-2">{r.categoryId?.name || "-"}</div>

                            <div className="md:col-span-2 text-white/70 break-words">
                                {r.note || "-"}
                            </div>

                            <div className="md:col-span-1 text-white/60 break-words">
                                {r.reference || "-"}
                            </div>

                            <div className="md:col-span-1 text-white/60">
                                {r.paymentMethod || "-"}
                            </div>

                            <div className="md:col-span-1 text-right font-medium">
                                {money(r.amount)}
                            </div>

                            <div className="md:col-span-1 flex md:justify-end">
                                {!isPayroll ? (
                                    <button
                                        className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                                        onClick={() => openVoidModal(r)}
                                        disabled={busy}
                                    >
                                        Anular
                                    </button>
                                ) : (
                                    <span className="text-white/40 text-xs">Desde nómina</span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {!rows.length ? (
                    <div className="px-3 py-4 text-white/60">No hay gastos en este rango.</div>
                ) : null}
            </div>
            <AnimatePresence>
                {confirmVoid.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={closeVoidModal}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 12 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 border-b border-white/10">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-red-400" />
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                Anular gasto
                                            </h3>
                                            <p className="text-sm text-white/60 mt-1">
                                                Esta acción marcará el registro como anulado.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={closeVoidModal}
                                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white/60" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-white/60">Fecha</span>
                                        <span className="text-sm font-medium text-white">
                                            {confirmVoid.row?.dateYMD || "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-white/60">Monto</span>
                                        <span className="text-sm font-medium text-white">
                                            {money(confirmVoid.row?.amount)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-white/60">Categoría</span>
                                        <span className="text-sm font-medium text-white text-right">
                                            {confirmVoid.row?.categoryId?.name || "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <span className="text-sm text-white/60">Nota</span>
                                        <span className="text-sm font-medium text-white text-right">
                                            {confirmVoid.row?.note || "-"}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-sm text-red-300/90 mt-4">
                                    Confirma si deseas anular este registro. Esta acción no se puede deshacer fácilmente.
                                </p>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={closeVoidModal}
                                        className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={confirmVoidExpense}
                                        disabled={busy}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all disabled:opacity-60"
                                    >
                                        {busy ? "Anulando..." : "Sí, anular"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </section>
    );
}
