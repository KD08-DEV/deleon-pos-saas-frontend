import React, { useEffect, useMemo, useState } from "react";
import {
    listPayrollRuns,
    createPayrollRun,
    postPayrollRun,
} from "../../lib/adminFinanceApi";

const todayYMD = () => new Date().toISOString().slice(0, 10);

function money(n) {
    const x = Number(String(n).replace(/,/g, ""));
    return Number.isFinite(x) ? x : 0;
}

export default function PayrollRuns() {
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const [periodFromYMD, setPeriodFromYMD] = useState(todayYMD());
    const [periodToYMD, setPeriodToYMD] = useState(todayYMD());
    const [payDateYMD, setPayDateYMD] = useState(todayYMD());

    const [items, setItems] = useState([
        { employeeName: "", roleName: "", gross: "", deductions: "", note: "" },
    ]);

    async function refresh() {
        setErr("");
        const r = await listPayrollRuns({ from: periodFromYMD, to: periodToYMD });
        setRows(r.data || []);
    }

    useEffect(() => {
        refresh().catch((e) => setErr(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totals = useMemo(() => {
        let gross = 0, deductions = 0, net = 0;
        for (const it of items) {
            const g = money(it.gross);
            const d = money(it.deductions);
            gross += g;
            deductions += d;
            net += Math.max(0, g - d);
        }
        return { gross, deductions, net };
    }, [items]);

    function updateItem(i, patch) {
        setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    }

    function addRow() {
        setItems((prev) => [...prev, { employeeName: "", roleName: "", gross: "", deductions: "", note: "" }]);
    }

    function removeRow(i) {
        setItems((prev) => prev.filter((_, idx) => idx !== i));
    }

    async function onCreate(e) {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
            const payloadItems = items
                .filter((x) => String(x.employeeName).trim())
                .map((x) => ({
                    employeeName: String(x.employeeName).trim(),
                    roleName: String(x.roleName || "").trim(),
                    gross: String(x.gross || "").replace(/,/g, ""),
                    deductions: String(x.deductions || "").replace(/,/g, ""),
                    note: String(x.note || "").trim(),
                }));

            if (!payloadItems.length) throw new Error("Debes agregar al menos un empleado.");

            await createPayrollRun({
                periodFromYMD,
                periodToYMD,
                payDateYMD,
                items: payloadItems,
            });

            setItems([{ employeeName: "", roleName: "", gross: "", deductions: "", note: "" }]);
            await refresh();
        } catch (e2) {
            setErr(e2.message);
        } finally {
            setBusy(false);
        }
    }

    async function onPost(runId) {
        if (!confirm("¿Postear nómina? Esto creará el gasto automático en Gastos.")) return;
        setBusy(true);
        setErr("");
        try {
            await postPayrollRun(runId);
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="p-4 text-white">
            <h1 className="text-xl font-semibold">Nómina</h1>

            {err ? <div className="mt-3 text-red-400">{err}</div> : null}

            <form onSubmit={onCreate} className="mt-4 border border-white/10 rounded-xl p-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-3">
                        <div className="text-xs text-white/70">Desde</div>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2" type="date" value={periodFromYMD} onChange={(e) => setPeriodFromYMD(e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                        <div className="text-xs text-white/70">Hasta</div>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2" type="date" value={periodToYMD} onChange={(e) => setPeriodToYMD(e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                        <div className="text-xs text-white/70">Fecha de pago</div>
                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2" type="date" value={payDateYMD} onChange={(e) => setPayDateYMD(e.target.value)} />
                    </div>
                    <div className="md:col-span-3 flex items-end justify-end text-white/80">
                        Neto: <span className="ml-2 font-semibold">{totals.net.toFixed(2)}</span>
                    </div>
                </div>

                <div className="mt-4 border border-white/10 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-sm text-white/80">
                        <div className="col-span-3">Empleado</div>
                        <div className="col-span-2">Rol</div>
                        <div className="col-span-2 text-right">Bruto</div>
                        <div className="col-span-2 text-right">Descuentos</div>
                        <div className="col-span-2">Nota</div>
                        <div className="col-span-1 text-right">Acción</div>
                    </div>

                    {items.map((it, i) => (
                        <div key={i} className="grid grid-cols-12 px-3 py-2 border-t border-white/10 gap-2 items-center">
                            <input className="col-span-3 bg-black/40 border border-white/10 rounded-lg px-2 py-2" placeholder="Nombre" value={it.employeeName} onChange={(e) => updateItem(i, { employeeName: e.target.value })} />
                            <input className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2" placeholder="Cargo" value={it.roleName} onChange={(e) => updateItem(i, { roleName: e.target.value })} />
                            <input className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-right" placeholder="0.00" value={it.gross} onChange={(e) => updateItem(i, { gross: e.target.value })} />
                            <input className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-right" placeholder="0.00" value={it.deductions} onChange={(e) => updateItem(i, { deductions: e.target.value })} />
                            <input className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2" placeholder="Opcional" value={it.note} onChange={(e) => updateItem(i, { note: e.target.value })} />
                            <div className="col-span-1 flex justify-end">
                                <button type="button" className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30" onClick={() => removeRow(i)} disabled={items.length === 1}>
                                    X
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-3 flex gap-2">
                    <button type="button" className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2" onClick={addRow}>
                        Agregar empleado
                    </button>
                    <button disabled={busy} className="ml-auto bg-yellow-500 text-black rounded-lg px-3 py-2 font-medium disabled:opacity-60">
                        Crear corrida
                    </button>
                </div>
            </form>

            <h2 className="mt-6 text-lg font-semibold">Corridas</h2>
            <div className="mt-2 border border-white/10 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-sm text-white/80">
                    <div className="col-span-3">Fecha pago</div>
                    <div className="col-span-4">Período</div>
                    <div className="col-span-2 text-right">Neto</div>
                    <div className="col-span-2">Estado</div>
                    <div className="col-span-1 text-right">Acción</div>
                </div>

                {rows.map((r) => (
                    <div key={r._id} className="grid grid-cols-12 px-3 py-2 border-t border-white/10">
                        <div className="col-span-3">{r.payDateYMD}</div>
                        <div className="col-span-4">{r.periodFromYMD} a {r.periodToYMD}</div>
                        <div className="col-span-2 text-right">{Number(r.totals?.net || 0).toFixed(2)}</div>
                        <div className="col-span-2">{r.status}</div>
                        <div className="col-span-1 flex justify-end">
                            {r.status !== "posted" ? (
                                <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => onPost(r._id)} disabled={busy}>
                                    Postear
                                </button>
                            ) : (
                                <span className="text-white/50">OK</span>
                            )}
                        </div>
                    </div>
                ))}

                {!rows.length ? <div className="px-3 py-4 text-white/60">No hay corridas aún.</div> : null}
            </div>
        </section>
    );
}
