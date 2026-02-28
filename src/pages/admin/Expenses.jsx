import React, { useEffect, useMemo, useState } from "react";
import {
    listExpenseCategories,
    listExpenses,
    createExpense,
    voidExpense,
} from "../../lib/adminFinanceApi";
import MermaPanel from "./MermaPanel";


const todayYMD = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
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

    async function loadCats() {
        const r = await listExpenseCategories();
        setCats(r.data || []);
        if (!categoryId && r.data?.[0]?._id) setCategoryId(r.data[0]._id);
    }

    async function refresh() {
        setErr("");
        const r = await listExpenses({ from, to });
        setRows(r.data || []);
    }

    useEffect(() => {
        Promise.all([loadCats(), refresh()]).catch((e) => setErr(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const total = useMemo(() => {
        return (rows || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
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
                paymentMethod: "cash",
            });
            setAmount("");
            setNote("");
            await refresh();
        } catch (e2) {
            setErr(e2.message);
        } finally {
            setBusy(false);
        }
    }

    async function onVoid(id) {
        if (!confirm("¿Anular este gasto?")) return;
        setBusy(true);
        setErr("");
        try {
            await voidExpense(id);
            await refresh();
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
                <button
                    className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2"
                    onClick={() => refresh().catch((e) => setErr(e.message))}
                    disabled={busy}
                >
                    Filtrar
                </button>
                <div className="ml-auto text-white/80">
                    Total rango: <span className="font-semibold">{total.toFixed(2)}</span>
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
                <div className="md:col-span-3">
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
                <div className="md:col-span-4">
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
                <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-sm text-white/80">
                    <div className="col-span-2">Fecha</div>
                    <div className="col-span-3">Categoría</div>
                    <div className="col-span-5">Nota</div>
                    <div className="col-span-1 text-right">Monto</div>
                    <div className="col-span-1 text-right">Acción</div>
                </div>

                {rows.map((r) => (
                    <div key={r._id} className="grid grid-cols-12 px-3 py-2 border-t border-white/10">
                        <div className="col-span-2">{r.dateYMD}</div>
                        <div className="col-span-3">{r.categoryId?.name || "-"}</div>
                        <div className="col-span-5 text-white/70">{r.note || "-"}</div>
                        <div className="col-span-1 text-right">{Number(r.amount || 0).toFixed(2)}</div>
                        <div className="col-span-1 flex justify-end">
                            <button
                                className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30"
                                onClick={() => onVoid(r._id)}
                                disabled={busy}
                            >
                                Anular
                            </button>
                        </div>
                    </div>
                ))}
                {!rows.length ? <div className="px-3 py-4 text-white/60">No hay gastos en este rango.</div> : null}
            </div>

        </section>
    );
}
