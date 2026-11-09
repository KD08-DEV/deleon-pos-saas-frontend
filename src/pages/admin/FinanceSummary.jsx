import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { getSummary } from "../../lib/adminFinanceApi";
import { getScope } from "../../lib/api";
import useTenant from "../../hooks/useTenant";
import { formatMoney, getTenantLocalization, getTodayYMD } from "../../lib/localization";

const panel = "rounded-2xl border border-gray-800/50 bg-[#101010] p-4 sm:p-5";
const input = "rounded-xl border border-white/15 bg-[#151515] px-3 py-2 text-sm text-white [color-scheme:dark]";

export default function FinanceSummary() {
    const { tenantInfo } = useTenant();
    const localization = getTenantLocalization(tenantInfo);
    const today = getTodayYMD(localization);
    const [from, setFrom] = useState(today);
    const [to, setTo] = useState(today);
    const [range, setRange] = useState({ from: today, to: today });
    const scope = getScope();
    useEffect(() => { setFrom(today); setTo(today); setRange({ from: today, to: today }); }, [localization.timezone]);
    const query = useQuery({
        queryKey: ["finance-summary", scope.tenantId, scope.clientId, range.from, range.to],
        queryFn: async () => (await getSummary(range)).data,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
    const data = query.data;
    const money = value => formatMoney(Number(value ?? 0), localization);
    const invalid = !from || !to || from > to;
    const pending = range.from !== from || range.to !== to;
    const apply = event => {
        event.preventDefault();
        if (invalid) return;
        if (pending) setRange({ from, to });
        else query.refetch();
    };
    const sales = Number(data?.sales?.total ?? 0);
    const cogs = Number(data?.cogsTotal ?? 0);
    const expenses = Number(data?.expenses?.total ?? 0);
    const payroll = Number(data?.payroll?.total ?? 0);
    const waste = Number(data?.merma?.total ?? 0);
    const net = Number(data?.netTotal ?? 0);
    const breakdown = [
        ["Ventas cobradas", sales, "Solo ventas cobradas. Las ventas a crédito se muestran aparte y no se suman."],
        ["Costo de los productos vendidos", -cogs, "Costo guardado en las órdenes cobradas incluidas en el período."],
        ["Gastos operativos", -expenses, "Gastos publicados; excluye anulados y nómina."],
        ["Nómina", -payroll, "Nóminas publicadas según la fecha de pago."],
        ["Merma", -waste, "Costo de las salidas por merma del período."],
    ];
    return <section className="min-w-0 space-y-5 text-white">
        <header className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex items-center gap-2"><BarChart3 className="h-6 w-6 text-sky-400" /><h1 className="text-2xl font-bold">Resumen financiero</h1></div>
                <p className="mt-2 text-sm text-white/60">Ventas, costos y gastos de la sucursal seleccionada · Todas las cajas.</p></div>
        </header>
        <form onSubmit={apply} className={`${panel} flex flex-wrap items-end gap-3`}>
            <label className="flex flex-col gap-1 text-sm text-white/70">Desde<input aria-label="Desde" type="date" value={from} onChange={e => setFrom(e.target.value)} className={input} required /></label>
            <label className="flex flex-col gap-1 text-sm text-white/70">Hasta<input aria-label="Hasta" type="date" value={to} onChange={e => setTo(e.target.value)} className={input} required /></label>
            <button disabled={invalid || query.isFetching} className="inline-flex items-center gap-2 rounded-xl bg-[#38bdf8] px-4 py-2 font-semibold text-black disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />{query.isFetching ? "Consultando…" : "Actualizar"}</button>
            <button type="button" onClick={() => { setFrom(today); setTo(today); setRange({ from: today, to: today }); }} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Hoy</button>
            <p className="w-full text-xs text-white/60">{invalid ? "Selecciona un rango válido: Desde no puede ser posterior a Hasta." : pending ? "Hay fechas sin aplicar. Pulsa Actualizar." : `Período aplicado: ${range.from} → ${range.to} · ${data?.range?.timezone || localization.timezone}`}</p>
        </form>
        {query.isError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">No se pudo cargar el resumen financiero. Comprueba la conexión y pulsa Actualizar.</div>}
        {query.isPending && <p role="status" className="text-white/60">Cargando datos del período…</p>}
        {data && !query.isError && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                    ["Ventas cobradas", money(sales), `${data.sales?.count ?? 0} órdenes`, ShoppingBag],
                    ["Costos y gastos", money(data.totals?.costs), "Productos + gastos + nómina + merma", Wallet],
                    ["Resultado estimado", money(net), "Ventas menos costos y gastos", TrendingUp],
                    ["Ticket promedio", money(data.sales?.count ? sales / data.sales.count : 0), "Por orden cobrada", BarChart3],
                ].map(([title, value, detail, Icon]) => <article key={title} className={panel}>
                    <div className="flex items-center justify-between gap-2 text-sm text-white/60">{title}<Icon className="h-4 w-4 text-sky-400" /></div>
                    <div className="mt-3 break-words text-2xl font-bold">{value}</div><p className="mt-2 text-xs text-white/60">{detail}</p>
                </article>)}
            </div>
            {data.missingCostCount > 0 && <p role="status" className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-300">{data.missingCostCount} órdenes no tienen costo histórico guardado. El resultado puede estar sobreestimado.</p>}
            <div className="flex flex-wrap gap-4 text-sm text-white/70"><span>Ventas cobradas: <b>{money(data.sales?.collectedTotal)}</b></span><span>Crédito informativo (no sumado): <b>{money(data.sales?.creditTotal)}</b></span><span>Los abonos a créditos anteriores no se cuentan como ventas nuevas.</span></div>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                <div className={panel}><h2 className="text-lg font-semibold">Cómo se compone el resultado</h2>
                    <div className="mt-3 divide-y divide-gray-500/20">{breakdown.map(([label, amount, note]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3"><div className="min-w-0"><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-white/60">{note}</p></div><span className="text-sm font-semibold tabular-nums">{money(amount)}</span></div>)}</div>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 rounded-xl bg-sky-500/10 p-3 font-bold"><span>Resultado estimado</span><span>{money(net)}</span></div>
                </div>
                <aside className={`${panel} space-y-4`}><h2 className="text-lg font-semibold">Compras de inventario</h2><p className="text-2xl font-bold">{money(data.purchases?.total)}</p>
                    <p className="text-sm text-white/60">Las compras se muestran por separado. No se restan nuevamente del resultado: el costo se reconoce en los productos vendidos y en la merma.</p>
                    <div className="border-t border-white/15 pt-4 text-sm text-white/60">Este resumen no es el efectivo disponible en caja. Las ventas incluyen los importes registrados en las facturas; el resultado es una estimación operativa, no una utilidad contable neta de impuestos.</div>
                </aside>
            </div>
        </>}
    </section>;
}
