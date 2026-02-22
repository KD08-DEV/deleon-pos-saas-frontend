import React, { useState } from "react";
import { getSummary } from "../../lib/adminFinanceApi";

const todayYMD = () => new Date().toISOString().slice(0, 10);

const moneyRD = (n) =>
    new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        maximumFractionDigits: 2,
    }).format(Number(n || 0));

function Card({ title, value, sub }) {
    return (
        <div className="border border-white/10 rounded-xl p-4 bg-white/5">
            <div className="text-sm text-white/70">{title}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            {sub ? <div className="mt-1 text-xs text-white/50">{sub}</div> : null}
        </div>
    );
}

export default function FinanceSummary() {
    const [from, setFrom] = useState(todayYMD());
    const [to, setTo] = useState(todayYMD());
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    async function run() {
        setBusy(true);
        setErr("");
        try {
            const r = await getSummary({ from, to });

            // ✅ Compatibilidad:
            // - Nuevo backend: { salesTotal, cogsTotal, grossProfit, purchasesTotal, mermaTotal, expensesTotal, payrollTotal, netTotal }
            // - Viejo backend: { sales: {total}, purchases: {total}, expenses: {total}, payroll: {total}, merma: {total}, totals: {net} }
            setData(r.data || null);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    // ✅ Unificador para soportar ambas estructuras
    const getNum = (obj, keyA, pathB) => {
        const a = obj?.[keyA];
        if (a != null) return Number(a || 0);
        // pathB tipo "sales.total"
        const parts = String(pathB || "").split(".");
        let cur = obj;
        for (const p of parts) cur = cur?.[p];
        return Number(cur || 0);
    };

    const salesTotal = data ? getNum(data, "salesTotal", "sales.total") : 0;
    const cogsTotal = data ? getNum(data, "cogsTotal", "cogs.total") : 0;
    const grossProfit = data ? getNum(data, "grossProfit", "grossProfit") : 0;

    const purchasesTotal = data ? getNum(data, "purchasesTotal", "purchases.total") : 0;
    const expensesTotal = data ? getNum(data, "expensesTotal", "expenses.total") : 0;
    const payrollTotal = data ? getNum(data, "payrollTotal", "payroll.total") : 0;
    const mermaTotal = data ? getNum(data, "mermaTotal", "merma.total") : 0;

    // Nuevo: netTotal, Viejo: totals.net
    const netTotal = data ? getNum(data, "netTotal", "totals.net") : 0;

    return (
        <section className="p-4 text-white">
            <h1 className="text-xl font-semibold">Resumen financiero</h1>

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
                    className="bg-yellow-500 text-black rounded-lg px-3 py-2 font-medium disabled:opacity-60"
                    onClick={run}
                    disabled={busy}
                >
                    Consultar
                </button>
            </div>

            {err ? <div className="mt-3 text-red-400">{err}</div> : null}

            {data ? (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <Card title="Ventas" value={moneyRD(salesTotal)} />
                    <Card title="COGS (Costo de ventas)" value={moneyRD(cogsTotal)} sub="Costo real aplicado al completar órdenes" />
                    <Card title="Margen bruto" value={moneyRD(grossProfit || (salesTotal - cogsTotal))} sub="Ventas - COGS" />

                    <Card title="Compras" value={moneyRD(purchasesTotal)} sub="Incluye compras por merma (entrada usable)" />
                    <Card title="Merma" value={moneyRD(mermaTotal)} sub="Merma a costo original (waste)" />

                    <Card title="Gastos" value={moneyRD(expensesTotal)} />
                    <Card title="Nómina" value={moneyRD(payrollTotal)} />
                    <Card title="Resultado neto" value={moneyRD(netTotal)} sub="Margen bruto - gastos - nómina" />
                </div>
            ) : (
                <div className="mt-6 text-white/60">Selecciona un rango y presiona “Consultar”.</div>
            )}
        </section>
    );
}
