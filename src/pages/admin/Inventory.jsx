// src/pages/admin/Inventory.jsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";
import { getDishes } from"../../https";

const inputCls =
    "w-full p-3 border border-gray-800/30 rounded-xl bg-[#0b0b0b] text-white placeholder:text-gray-500 " +
    "focus:outline-none focus:ring-2 focus:ring-yellow-500/40";

const selectCls =
    "w-full p-3 border border-gray-800/30 rounded-xl bg-[#0b0b0b] text-white " +
    "focus:outline-none focus:ring-2 focus:ring-yellow-500/40";

const cardCls =
    "rounded-2xl border border-gray-800/30 bg-[#0b0b0b]/60 backdrop-blur";

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const moneyRD = (v) => {
    const n = num(v);
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        maximumFractionDigits: 2,
    }).format(n);
};

const formatDateTimeDO = (dateLike) => {
    if (!dateLike) return "N/A";
    const d = new Date(dateLike?.$date ?? dateLike);
    if (Number.isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(d);
};

const toISOStartOfDayLocal = (yyyyMMdd) => {
    if (!yyyyMMdd) return "";
    const [y, m, d] = yyyyMMdd.split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) return "";
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    return dt.toISOString();
};

const toISOEndOfDayLocal = (yyyyMMdd) => {
    if (!yyyyMMdd) return "";
    const [y, m, d] = yyyyMMdd.split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) return "";
    const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
    return dt.toISOString();
};

const getTodayYMD = () => new Date().toISOString().slice(0, 10);
const addDaysYMD = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

// ---------- safe readers ----------
const getItemName = (it) =>
    String(it?.name || it?.title || it?.productName || "Producto sin nombre");

const getItemProductId = (it) =>
    String(it?.productId || it?.dishId || it?.dish || it?._id || it?.id || "");

const getItemDishId = (it) => String(it?.dishId || it?.dish || it?._id || it?.id || "");

const getItemInventoryCategoryId = (it) =>
    String(it?.inventoryCategoryId || it?.inventoryCategory || it?.invCategoryId || "");

const getItemQty = (it) => {
    const q = num(it?.qty ?? it?.quantity ?? it?.qtySold ?? 0);
    return q > 0 ? q : 0;
};

const getItemWeight = (it) => {
    const w = num(it?.weight ?? it?.lbs ?? it?.lb ?? it?.weightLb);
    return w > 0 ? w : 0;
};

const getItemSoldAmount = (it) => {
    const w = getItemWeight(it);
    if (w > 0) return w;
    return getItemQty(it);
};

const getItemUnitPrice = (it) => {
    const u = num(it?.unitPrice ?? it?.pricePerQuantity ?? it?.unit_price);
    if (u > 0) return u;

    const p = num(it?.price);
    if (p > 0) return p;

    const lt = num(it?.lineTotal ?? it?.total ?? it?.amount);
    const amt = getItemSoldAmount(it);
    if (lt > 0 && amt > 0) return lt / amt;

    return 0;
};

const getItemLineTotal = (it) => {
    const lt = num(it?.lineTotal ?? it?.total ?? it?.amount);
    if (lt > 0) return lt;

    const unit = getItemUnitPrice(it);
    const amt = getItemSoldAmount(it);
    return unit * amt;
};

async function fetchInventoryCategories() {
    const res = await api.get("/api/admin/inventory/categories");
    return res.data?.data || [];
}

export default function Inventory({ plan }) {
    const rawPlan = (plan || "").toLowerCase();
    const canUseInventory = ["premium", "vip"].includes(rawPlan);

    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;

    const [filters, setFilters] = useState({
        from: addDaysYMD(-1),
        to: getTodayYMD(),
        inventoryCategoryId: "",
        search: "",
    });

    const [selected, setSelected] = useState(null);

    // Params para reportes (incluye día completo)
    const cleanedParams = useMemo(() => {
        const params = {};
        const fromISO = filters.from ? toISOStartOfDayLocal(filters.from) : "";
        const toISO = filters.to ? toISOEndOfDayLocal(filters.to) : "";
        if (fromISO) params.from = fromISO;
        if (toISO) params.to = toISO;
        return params;
    }, [filters.from, filters.to]);

    // Órdenes / reportes
    const {
        data: reportsData,
        isLoading: ordersLoading,
        isError: ordersError,
        error: ordersErrObj,
    } = useQuery({
        queryKey: ["admin/reports", cleanedParams, tenantId],
        queryFn: async () => {
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data;
        },
        enabled: canUseInventory && Boolean(tenantId),
        keepPreviousData: true,
        staleTime: 30_000,
    });

    // Categorías
    const {
        data: inventoryCategories,
        isLoading: catsLoading,
        isError: catsError,
        error: catsErrObj,
    } = useQuery({
        queryKey: ["admin/inventory/categories", tenantId],
        queryFn: fetchInventoryCategories,
        enabled: canUseInventory && Boolean(tenantId),
        staleTime: 60_000,
    });

    // Dishes: para resolver inventoryCategoryId por dishId cuando las órdenes NO lo traen
    const {
        data: dishes,
        isLoading: dishesLoading,
        isError: dishesError,
    } = useQuery({
        queryKey: ["admin/dishes", tenantId],
        queryFn: async () => {
            const res = await getDishes(tenantId);
            const raw = res?.data?.data ?? res?.data ?? [];
            return Array.isArray(raw) ? raw : [];
        },
        enabled: canUseInventory && Boolean(tenantId),
        staleTime: 60_000,
    });

    // Snackbar de errores (una sola vez por render)
    React.useEffect(() => {
        if (catsError) {
            const msg =
                catsErrObj?.response?.data?.message ||
                catsErrObj?.message ||
                "No se pudieron cargar las categorías de inventario. Verifica el endpoint.";
            enqueueSnackbar(msg, { variant: "warning" });
        }
    }, [catsError, catsErrObj]);

    React.useEffect(() => {
        if (ordersError) {
            const msg =
                ordersErrObj?.response?.data?.message ||
                ordersErrObj?.message ||
                "No se pudieron cargar las órdenes.";
            enqueueSnackbar(msg, { variant: "error" });
        }
    }, [ordersError, ordersErrObj]);

    // Mapas rápidos
    const categoryNameById = useMemo(() => {
        const arr = Array.isArray(inventoryCategories) ? inventoryCategories : [];
        const m = new Map();
        for (const c of arr) {
            const id = String(c?._id || c?.id || "");
            if (!id) continue;
            m.set(id, String(c?.name || "Sin nombre"));
        }
        return m;
    }, [inventoryCategories]);

    const dishCategoryIdByDishId = useMemo(() => {
        const arr = Array.isArray(dishes) ? dishes : [];
        const m = new Map();
        for (const d of arr) {
            const id = String(d?._id || d?.id || "");
            if (!id) continue;
            const catId = String(
                d?.inventoryCategoryId ||
                d?.inventoryCategory?._id ||
                d?.inventoryCategory ||
                ""
            );
            if (catId) m.set(id, catId);
        }
        return m;
    }, [dishes]);

    // Parse orders array con fallback
    const orders = useMemo(() => {
        const payload = reportsData;
        const raw =
            payload?.data?.data ??
            payload?.data ??
            payload?.orders ??
            payload ??
            [];
        return Array.isArray(raw) ? raw : [];
    }, [reportsData]);

    // Breakdown + filtros
    const breakdown = useMemo(() => {
        const map = new Map();

        const search = (filters.search || "").trim().toLowerCase();
        const filterCat = String(filters.inventoryCategoryId || "");

        for (const order of orders) {
            const createdAt = order?.createdAt ?? order?.created_at ?? order?.date;
            const orderId = String(order?._id || order?.id || order?.orderId || "");

            const items = Array.isArray(order?.items) ? order.items : [];
            for (const it of items) {
                const name = getItemName(it);
                const productIdRaw = getItemProductId(it);
                const dishId = getItemDishId(it);

                // Resuelve categoría:
                // 1) del item (si existe)
                // 2) por dishId desde catálogo de platos
                const itemCatId = getItemInventoryCategoryId(it);
                const resolvedCatId =
                    itemCatId ||
                    (dishId && dishCategoryIdByDishId.get(String(dishId))) ||
                    "";

                // filtro por categoría (si aplica)
                if (filterCat && resolvedCatId !== filterCat) continue;

                // filtro search por nombre
                if (search && !String(name).toLowerCase().includes(search)) continue;

                const productKey = productIdRaw || `${String(name).toLowerCase()}::noid`;

                const amt = getItemSoldAmount(it);
                const revenue = getItemLineTotal(it);

                const prev = map.get(productKey);
                const row = prev || {
                    productKey,
                    productId: productIdRaw,
                    name,
                    inventoryCategoryId: resolvedCatId,
                    sold: 0,
                    revenue: 0,
                    ordersSet: new Set(),
                    lastSaleAt: null,
                    details: [],
                };

                row.sold += amt;
                row.revenue += revenue;
                if (orderId) row.ordersSet.add(orderId);

                const ts = createdAt ? new Date(createdAt).getTime() : 0;
                const prevTs = row.lastSaleAt ? new Date(row.lastSaleAt).getTime() : 0;
                if (ts && ts >= prevTs) row.lastSaleAt = createdAt;

                row.details.push({
                    orderId,
                    createdAt,
                    qty: amt,
                    total: revenue,
                });

                map.set(productKey, row);
            }
        }

        const arr = Array.from(map.values()).map((r) => ({
            ...r,
            ordersCount: r.ordersSet.size,
            categoryName: r.inventoryCategoryId
                ? categoryNameById.get(String(r.inventoryCategoryId)) || "Sin categoría"
                : "Sin categoría",
        }));

        // Orden: revenue desc, luego última venta desc
        arr.sort((a, b) => {
            if (b.revenue !== a.revenue) return b.revenue - a.revenue;
            const ta = a.lastSaleAt ? new Date(a.lastSaleAt).getTime() : 0;
            const tb = b.lastSaleAt ? new Date(b.lastSaleAt).getTime() : 0;
            return tb - ta;
        });

        return arr;
    }, [
        orders,
        filters.search,
        filters.inventoryCategoryId,
        categoryNameById,
        dishCategoryIdByDishId,
    ]);

    const isLoading = ordersLoading || catsLoading || dishesLoading;

    if (!canUseInventory) {
        return (
            <div className="p-2">
                <h2 className="text-xl font-semibold text-white">Inventario</h2>
                <p className="mt-2 text-gray-400">
                    Este módulo está disponible solo para los planes <b>Premium</b> y <b>VIP</b>.
                </p>
            </div>
        );
    }

    const closeModal = () => setSelected(null);

    return (
        <div className="p-2 text-white">
            <div className={`${cardCls} p-5`}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">Inventario · Movimiento de Ventas</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Resumen de ventas por producto basado en órdenes vendidas.
                        </p>

                        {(dishesError || catsError) && (
                            <div className="mt-3 text-xs text-yellow-400">
                                Nota: si los items de las órdenes no guardan <b>inventoryCategoryId</b>, esta pantalla lo
                                resuelve por <b>dishId</b> usando el catálogo de platos.
                            </div>
                        )}
                    </div>

                    <div className="shrink-0">
                        <button
                            className="px-4 py-2 rounded-xl bg-[#f6b100] text-black font-semibold hover:bg-yellow-500 transition-colors"
                            onClick={() => {
                                setFilters((p) => ({ ...p, from: addDaysYMD(-7), to: getTodayYMD() }));
                            }}
                        >
                            Click aqui para ver Últimos 7 días
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <div className="mb-1 text-xs text-gray-400">Fecha desde</div>
                        <input
                            className={inputCls}
                            type="date"
                            value={filters.from}
                            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
                        />
                    </div>

                    <div>
                        <div className="mb-1 text-xs text-gray-400">Fecha hasta</div>
                        <input
                            className={inputCls}
                            type="date"
                            value={filters.to}
                            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                        />
                    </div>

                    <div>
                        <div className="mb-1 text-xs text-gray-400">Categoría de inventario</div>
                        <select
                            className={selectCls}
                            value={filters.inventoryCategoryId}
                            onChange={(e) => setFilters((p) => ({ ...p, inventoryCategoryId: e.target.value }))}
                        >
                            <option value="">Todas</option>
                            {(Array.isArray(inventoryCategories) ? inventoryCategories : []).map((c) => (
                                <option key={c?._id || c?.id} value={String(c?._id || c?.id || "")}>
                                    {c?.name || "Sin nombre"}
                                </option>
                            ))}
                        </select>
                        {catsLoading && (
                            <div className="mt-1 text-xs text-gray-500">Cargando categorías...</div>
                        )}
                        {catsError && (
                            <div className="mt-1 text-xs text-yellow-400">
                                No se pudieron cargar categorías. Verifica el endpoint.
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-1 text-xs text-gray-400">Buscar producto</div>
                        <input
                            className={inputCls}
                            placeholder="Ej: Chicharrón, Pollo..."
                            value={filters.search}
                            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className={`${cardCls} mt-5 overflow-hidden`}>
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#0b0b0b]">
                            <tr className="text-left text-gray-300 border-b border-gray-800/30">
                                <th className="p-3">Producto</th>
                                <th className="p-3">Categoría de inventario</th>
                                <th className="p-3 text-right">Cantidad vendida</th>
                                <th className="p-3 text-right">Revenue</th>
                                <th className="p-3 text-right">Órdenes</th>
                                <th className="p-3 text-right">Última venta</th>
                            </tr>
                            </thead>
                            <tbody>
                            {isLoading ? (
                                <tr>
                                    <td className="p-4 text-gray-400" colSpan={6}>
                                        Cargando movimientos...
                                    </td>
                                </tr>
                            ) : breakdown.length === 0 ? (
                                <tr>
                                    <td className="p-4 text-gray-400" colSpan={6}>
                                        No hay movimientos con los filtros actuales.
                                    </td>
                                </tr>
                            ) : (
                                breakdown.map((row) => (
                                    <tr
                                        key={row.productKey}
                                        className="border-b border-gray-800/30 hover:bg-yellow-500/5 cursor-pointer"
                                        onClick={() => setSelected(row)}
                                        title="Click para ver detalle"
                                    >
                                        <td className="p-3">
                                            <div className="font-semibold">{row.name}</div>
                                            <div className="text-xs text-gray-500">
                                                ID: {row.productId || row.productKey}
                                            </div>
                                        </td>

                                        <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs border border-gray-800/30 bg-[#0b0b0b]">
                          {row.categoryName || "Sin categoría"}
                        </span>
                                        </td>

                                        <td className="p-3 text-right font-semibold">{num(row.sold).toFixed(2)}</td>
                                        <td className="p-3 text-right font-semibold">{moneyRD(row.revenue)}</td>
                                        <td className="p-3 text-right">{row.ordersCount}</td>
                                        <td className="p-3 text-right">{formatDateTimeDO(row.lastSaleAt)}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 text-xs text-gray-500">
                        Click en un producto para ver el detalle por órdenes.
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-3 overflow-y-auto">
                <div
                        className="absolute inset-0 bg-black/70"
                        onClick={closeModal}
                        aria-hidden="true"
                    />
                    <div
                        className={`relative w-full max-w-3xl ${cardCls} overflow-hidden my-6`}
                        style={{ maxHeight: "85vh" }}
                    >

                    {/* Header */}
                        <div className="p-4 border-b border-gray-800/30 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-400">Detalle</div>
                                <div className="text-lg font-semibold">{selected.name}</div>
                            </div>
                            <button
                                className="px-3 py-2 rounded-xl border border-gray-800/30 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-colors"
                                onClick={closeModal}
                            >
                                Cerrar
                            </button>
                        </div>

                        {/* Body (scrollable) */}
                        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 64px)" }}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className={`${cardCls} p-3`}>
                                    <div className="text-xs text-gray-400">Categoría de inventario</div>
                                    <div className="mt-1 font-semibold">
                                        {selected.categoryName || "Sin categoría"}
                                    </div>
                                </div>

                                <div className={`${cardCls} p-3`}>
                                    <div className="text-xs text-gray-400">Cantidad vendida</div>
                                    <div className="mt-1 font-semibold">{num(selected.sold).toFixed(2)}</div>
                                </div>

                                <div className={`${cardCls} p-3`}>
                                    <div className="text-xs text-gray-400">Revenue</div>
                                    <div className="mt-1 font-semibold text-yellow-400">{moneyRD(selected.revenue)}</div>
                                </div>

                                <div className={`${cardCls} p-3`}>
                                    <div className="text-xs text-gray-400">Órdenes</div>
                                    <div className="mt-1 font-semibold">{selected.ordersCount}</div>
                                </div>

                                <div className={`${cardCls} p-3`}>
                                    <div className="text-xs text-gray-400">Última venta</div>
                                    <div className="mt-1 font-semibold">{formatDateTimeDO(selected.lastSaleAt)}</div>
                                </div>

                                <div className={`${cardCls} p-3 md:col-span-3`}>
                                    <div className="text-xs text-gray-400">Product ID</div>
                                    <div className="mt-1 font-semibold break-all">
                                        {selected.productId || selected.productKey}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <div className="font-semibold mb-2">Órdenes donde se vendió</div>
                                <div className={`${cardCls} overflow-hidden`}>
                                    <div className="max-h-[45vh] overflow-y-auto">
                                        <div className="w-full overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="sticky top-0 bg-[#0b0b0b] z-10">
                                                <tr className="text-left text-gray-300 border-b border-gray-800/30">
                                                    <th className="p-3">Order ID</th>
                                                    <th className="p-3">Fecha</th>
                                                    <th className="p-3 text-right">Cantidad</th>
                                                    <th className="p-3 text-right">Total item</th>
                                                </tr>
                                                </thead>

                                                <tbody>
                                                {(selected.details || [])
                                                    .slice()
                                                    .sort((a, b) => {
                                                        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                                                        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                                                        return tb - ta;
                                                    })
                                                    .map((d, idx) => (
                                                        <tr key={`${d.orderId}-${idx}`} className="border-b border-gray-800/30">
                                                            <td className="p-3">
                                                                <div className="break-all">{d.orderId || "N/A"}</div>
                                                            </td>
                                                            <td className="p-3">{formatDateTimeDO(d.createdAt)}</td>
                                                            <td className="p-3 text-right">{num(d.qty).toFixed(2)}</td>
                                                            <td className="p-3 text-right">{moneyRD(d.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="p-3 text-xs text-gray-500">
                                        Si todavía ves “Sin categoría”, revisa que tus platos tengan <b>inventoryCategoryId</b> y
                                        que el catálogo de platos se esté cargando correctamente.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
