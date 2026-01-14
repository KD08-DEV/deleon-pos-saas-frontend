import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrders, getDishes, getTables } from "../../https";

// ---- Utilidades de fechas -------------------------------------------------
const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};
const endOfDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
};
const addDays = (d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

const TIME_RANGES = [
    { key: "all", label: "Todo el tiempo", build: () => ({ start: null, end: null }) },
    {
        key: "last7",
        label: "Últimos 7 días",
        build: () => {
            const end = endOfDay(new Date());
            const start = startOfDay(addDays(end, -6));
            return { start, end };
        },
    },
    {
        key: "thisMonth",
        label: "Este mes",
        build: () => {
            const now = new Date();
            const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
            const end = endOfDay(new Date());
            return { start, end };
        },
    },
    {
        key: "lastMonth",
        label: "Mes pasado",
        build: () => {
            const now = new Date();
            const firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastPrev = endOfDay(addDays(firstThis, -1));
            const start = startOfDay(new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1));
            const end = lastPrev;
            return { start, end };
        },
    },
];


const toDate = (v) => {
    if (!v) return null;
    if (typeof v === "string" || typeof v === "number") return new Date(v);
    if (typeof v === "object" && v.$date) return new Date(v.$date);
    // si viene { date: ... } u otro wrapper, agrega aquí si aplica
    return new Date(v);
};

const inRange = (dateVal, start, end) => {
    if (!start || !end) return true;
    const d = toDate(dateVal);
    if (!d || Number.isNaN(d.getTime())) return false; // si no se puede parsear, no cuenta
    const t = d.getTime();
    return t >= start.getTime() && t <= end.getTime();
};

const sumRevenue = (orders) =>
    orders.reduce((acc, o) => acc + (o?.bills?.totalWithTax ?? o?.bills?.total ?? 0), 0);

const uniqCustomers = (orders) => {
    const s = new Set();
    for (const o of orders) {
        const n = o?.customerDetails?.name;
        if (n) s.add(String(n).toLowerCase().trim());
    }
    return s.size;
};

const pctDelta = (curr, prev) => {
    if (!prev && !curr) return { text: "0%", up: true };
    if (!prev && curr) return { text: "+100%", up: true };
    const pct = ((curr - prev) / prev) * 100;
    const up = pct >= 0;
    const text = `${up ? "+" : ""}${Math.abs(pct).toFixed(1)}%`;
    return { text, up };
};

// ----------------------------------------------------------------------------
const Metrics = () => {
    // 1) Datos
    const { data: ordersData } = useQuery({ queryKey: ["orders"], queryFn: getOrders });
    const { data: dishesData } = useQuery({ queryKey: ["dishes"], queryFn: getDishes });
    const { data: tablesData } = useQuery({ queryKey: ["tables"], queryFn: getTables });

    const orders =
        ordersData?.data?.data ??
        ordersData?.data ??
        [];

    const dishes =
        dishesData?.data?.data ??
        dishesData?.data ??
        [];

    const tables =
        tablesData?.data?.data ??
        tablesData?.data ??
        [];

    // Filtrar solo órdenes completadas o listas
    const validOrders = orders.filter(
        (order) => order.orderStatus !== "Cancelado"
    );

// Calcular ganancias
    const totalEarnings = validOrders.reduce(
        (acc, order) => acc + (order.bills?.totalWithTax || 0),
        0
    );

    // 2) Rango seleccionado
    const [rangeKey, setRangeKey] = useState("all");
    const selectedRange = useMemo(
        () => TIME_RANGES.find((r) => r.key === rangeKey) ?? TIME_RANGES[0],
        [rangeKey]
    );
    const { start, end } = useMemo(() => selectedRange.build(), [selectedRange]);

    // 3) Órdenes filtradas + periodo anterior
    const filteredOrders = useMemo(
        () =>
            validOrders.filter((o) =>
                inRange(o?.createdAt, start, end)
            ),
        [validOrders, start, end]
    );

    const prevWindow = useMemo(() => {
        if (!start || !end) return { prevStart: null, prevEnd: null };
        const span = end.getTime() - start.getTime() + 1;
        const prevEnd = addDays(start, -1);
        const prevStart = new Date(prevEnd.getTime() - (span - 1));
        prevStart.setHours(0, 0, 0, 0);
        return { prevStart, prevEnd: endOfDay(prevEnd) };
    }, [start, end]);

    const previousOrders = useMemo(() => {
        if (!prevWindow.prevStart || !prevWindow.prevEnd) return [];
        return validOrders.filter((o) =>
            inRange(o?.createdAt, prevWindow.prevStart, prevWindow.prevEnd)
        );
    }, [validOrders, prevWindow]);

    // 4) KPIs actuales vs. anteriores
    const revenueNow = sumRevenue(filteredOrders);
    const revenuePrev = sumRevenue(previousOrders);
    const revenueDelta = pctDelta(revenueNow, revenuePrev);

    const ordersNow = filteredOrders.length;
    const ordersPrev = previousOrders.length;
    const ordersDelta = pctDelta(ordersNow, ordersPrev);

    const customersNow = uniqCustomers(filteredOrders);
    const customersPrev = uniqCustomers(previousOrders);
    const customersDelta = pctDelta(customersNow, customersPrev);

    const completedNow = filteredOrders.filter((o) => o.orderStatus === "Completed").length;
    const completedPrev = previousOrders.filter((o) => o.orderStatus === "Completed").length;
    const completedDelta = pctDelta(completedNow, completedPrev);

    const totalActiveOrders = orders.filter(
        (o) => o.orderStatus === "En Progreso" || o.orderStatus === "Listo"
    ).length;

    // 5) Datos para tarjetas
    const metricsData = [
        {
            title: "Ganancia",
            value: `$${revenueNow.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            color: "#3B82F6",
            isIncrease: revenueDelta.up,
            percentage: revenueDelta.text,
        },
        {
            title: "Total Ordenes",
            value: ordersNow,
            color: "#22C55E",
            isIncrease: ordersDelta.up,
            percentage: ordersDelta.text,
        },
        {
            title: "Total Clientes",
            value: customersNow,
            color: "#FACC15",
            isIncrease: customersDelta.up,
            percentage: customersDelta.text,
        },
        {
            title: "Ordenes Completadas",
            value: completedNow,
            color: "#EF4444",
            isIncrease: completedDelta.up,
            percentage: completedDelta.text,
        },
    ];

    const itemsData = [
        { title: "Categorias Totales", value: 8, color: "#8B5CF6", percentage: "+12%" },
        { title: "Platos Totales", value: dishes.length, color: "#16A34A", percentage: "+5%" },
        { title: "Ordenes Activas", value: totalActiveOrders, color: "#CA8A04", percentage: "+9%" },
        { title: "Mesas Totales", value: tables.length, color: "#9333EA", percentage: "+3%" },
    ];

    // 6) UI del selector
    const [open, setOpen] = useState(false);

    return (
        <div className="container mx-auto py-2 px-6 md:px-4">
            <div className="flex justify-between items-center relative">
                <div>
                    <h2 className="font-semibold text-[#f5f5f5] text-xl">Rendimiento general</h2>
                    <p className="text-sm text-[#ababab]">Descripción general de las métricas de rendimiento de su restaurante.</p>
                </div>

                <div className="relative">
                    <button
                        className="flex items-center gap-1 px-4 py-2 rounded-md text-[#f5f5f5] bg-[#1a1a1a]"
                        onClick={() => setOpen((v) => !v)}
                    >
                        {
                            (TIME_RANGES.find((r) => r.key === rangeKey) ?? TIME_RANGES[0])
                                .label
                        }
                        <svg className="w-3 h-3" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                            <path d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {open && (
                        <div
                            className="absolute right-0 mt-2 w-44 bg-[#111] border border-[#2a2a2a] rounded-md shadow-lg z-10"
                            onMouseLeave={() => setOpen(false)}
                        >
                            {TIME_RANGES.map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => {
                                        setRangeKey(opt.key);
                                        setOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f1f] ${
                                        rangeKey === opt.key ? "text-white" : "text-[#d1d1d1]"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Overall Performance Cards */}
            <div className="mt-6 grid grid-cols-4 gap-4">
                {metricsData.map((metric, index) => (
                    <div key={index} className="shadow-sm rounded-lg p-4" style={{ backgroundColor: metric.color }}>
                        <div className="flex justify-between items-center">
                            <p className="font-medium text-xs text-[#f5f5f5]">{metric.title}</p>
                            <div className="flex items-center gap-1">
                                <svg
                                    className="w-3 h-3"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    style={{ color: metric.isIncrease ? "#f5f5f5" : "red" }}
                                >
                                    <path d={metric.isIncrease ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                </svg>
                                <p className="font-medium text-xs" style={{ color: metric.isIncrease ? "#f5f5f5" : "red" }}>
                                    {metric.percentage}
                                </p>
                            </div>
                        </div>
                        <p className="mt-1 font-semibold text-2xl text-[#f5f5f5]">{metric.value}</p>
                    </div>
                ))}
            </div>

            {/* Item Details */}
            <div className="flex flex-col justify-between mt-12">
                <div>
                    <h2 className="font-semibold text-[#f5f5f5] text-xl">Detalles del artículo</h2>
                    <p className="text-sm text-[#ababab]">Descripción general en vivo del menú, las mesas y los pedidos en curso.</p>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-4">
                    {itemsData.map((item, index) => (
                        <div key={index} className="shadow-sm rounded-lg p-4" style={{ backgroundColor: item.color }}>
                            <div className="flex justify-between items-center">
                                <p className="font-medium text-xs text-[#f5f5f5]">{item.title}</p>
                                <div className="flex items-center gap-1">
                                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4" fill="none">
                                        <path d="M5 15l7-7 7 7" />
                                    </svg>
                                    <p className="font-medium text-xs text-[#f5f5f5]">{item.percentage}</p>
                                </div>
                            </div>
                            <p className="mt-1 font-semibold text-2xl text-[#f5f5f5]">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Metrics;
