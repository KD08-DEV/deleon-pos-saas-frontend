import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import Suppliers from "./Suppliers";
import InventoryCategories from "./InventoryCategories";
import { useSnackbar } from "notistack";

import {
    Package,
    History,
    BarChart3,
    Trash2,
    Plus,
    ArrowDownCircle,
    ArrowUpCircle,
    SlidersHorizontal,
    Archive,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import api from "../../lib/api";
import MermaPanel from "./MermaPanel";

const cardCls =
    "rounded-2xl border border-gray-800/30 bg-[#0b0b0b]/60 backdrop-blur";
const inputCls =
    "w-full p-3 border border-gray-800/30 rounded-xl bg-[#0b0b0b] text-white placeholder:text-gray-500 " +
    "focus:outline-none focus:ring-2 focus:ring-yellow-500/40";
const selectCls =
    "w-full p-3 border border-gray-800/30 rounded-xl bg-[#0b0b0b] text-white " +
    "focus:outline-none focus:ring-2 focus:ring-yellow-500/40";

const UNIT_OPTIONS = ["unidad", "lb", "kg", "g", "oz", "ml", "l"];
const PAGE_SIZE = 10;

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};


const moneyRD = (v) =>
    new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        maximumFractionDigits: 2,
    }).format(num(v));

function getTodayYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function toISOStartOfDayLocal(yyyyMMdd) {
    if (!yyyyMMdd) return "";
    const [y, m, d] = yyyyMMdd.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    return dt.toISOString();
}
function toISOMiddayLocal(yyyyMMdd) {
    if (!yyyyMMdd) return "";
    const [y, m, d] = yyyyMMdd.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0); // 12:00 PM local
    return dt.toISOString();
}
function toISOEndOfDayLocal(yyyyMMdd) {
    if (!yyyyMMdd) return "";
    const [y, m, d] = yyyyMMdd.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
    return dt.toISOString();
}

async function fetchCategories() {
    const res = await api.get("/api/admin/inventory/categories");
    return res.data?.data || [];
}

// intentamos 2 endpoints comunes; si no existe, no rompemos la UI
async function fetchSuppliersSafe() {
    try {
        const r1 = await api.get("/api/admin/suppliers");
        return r1.data?.data || r1.data?.suppliers || [];
    } catch (_) {
        try {
            const r2 = await api.get("/api/suppliers");
            return r2.data?.data || r2.data?.suppliers || [];
        } catch {
            return [];
        }
    }
}

// Plantillas: platos existentes para modo "Basado en plato"
async function fetchDishTemplates() {
    try {
        const res = await api.get("/api/dishes");
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.dishes)) return raw.dishes;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    } catch {
        return [];
    }
}

function Badge({ children, tone = "neutral" }) {
    const cls =
        tone === "danger"
            ? "bg-red-500/15 text-red-200 border-red-500/30"
            : tone === "warning"
                ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
                : "bg-white/10 text-white/80 border-white/10";
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs ${cls}`}>
      {children}
    </span>
    );
}

function Modal({ open, title, onClose, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div className="text-white font-semibold">{title}</div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

/**
 * LocalStorage helper:
 * - Guardamos un "flag" por item cuando ya se hizo yield (proceso merma).
 * - Así cuando vuelvas a darle, te damos aviso moderno.
 */
function getYieldFlagKey(itemId) {
    return `inv_yield_done_${String(itemId || "")}`;
}
function wasYieldProcessed(itemId) {
    try {
        return localStorage.getItem(getYieldFlagKey(itemId)) === "1";
    } catch {
        return false;
    }
}
function markYieldProcessed(itemId) {
    try {
        localStorage.setItem(getYieldFlagKey(itemId), "1");
    } catch {
        // ignore
    }
}


export default function Inventory({ plan }) {
    function getTodayYMDLocal() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    // SOLO premium y vip
    const rawPlan = String(plan || "").toLowerCase();
    const canUseInventory = ["premium", "vip"].includes(rawPlan);

    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;

    const qc = useQueryClient();

    const [tab, setTab] = useState("stock"); // stock | movements | consumption | merma | suppliers | categories

    // STOCK filters
    const [stockFilters, setStockFilters] = useState({
        q: "",
        inventoryCategoryId: "",
        supplierId: "",
        includeArchived: false,
    });
    const [mermaYMD, setMermaYMD] = useState(getTodayYMDLocal());    // Pagination
    const [page, setPage] = useState(1);

    // MOVEMENTS filters
    const [mvFilters, setMvFilters] = useState({
        itemId: "",
        type: "",
        from: getTodayYMD(),
        to: getTodayYMD(),
    });

    // CONSUMPTION filters
    const [consFilters, setConsFilters] = useState({
        from: getTodayYMD(),
        to: getTodayYMD(),
        inventoryCategoryId: "",
    });

    // reset page when filters change
    React.useEffect(() => {
        setPage(1);
    }, [stockFilters.q, stockFilters.inventoryCategoryId, stockFilters.supplierId, stockFilters.includeArchived]);

    // Queries: categories & suppliers
    const { data: categories = [] } = useQuery({
        queryKey: ["inventory-categories", tenantId],
        queryFn: fetchCategories,
        enabled: canUseInventory && Boolean(tenantId),
        staleTime: 60_000,
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ["suppliers-safe", tenantId],
        queryFn: fetchSuppliersSafe,
        enabled: canUseInventory && Boolean(tenantId),
        staleTime: 60_000,
    });

    const { data: dishTemplates = [] } = useQuery({
        queryKey: ["dish-templates", tenantId],
        queryFn: fetchDishTemplates,
        enabled: canUseInventory && Boolean(tenantId),
        staleTime: 60_000,
    });

    // STOCK: items
    const { data: itemsResp, isLoading: itemsLoading } = useQuery({
        queryKey: ["inventory/items", tenantId, stockFilters, page],
        enabled: canUseInventory && Boolean(tenantId),
        queryFn: async () => {
            const skip = (page - 1) * PAGE_SIZE;
            const res = await api.get("/api/inventory/items", {
                params: {
                    q: stockFilters.q || undefined,
                    inventoryCategoryId: stockFilters.inventoryCategoryId || undefined,
                    supplierId: stockFilters.supplierId || undefined,
                    includeArchived: stockFilters.includeArchived ? "true" : "false",
                    limit: PAGE_SIZE,
                    skip,
                },
            });
            return res.data;
        },
        staleTime: 10_000,
    });

    // Si el backend todavía no pagina y devuelve todo, hacemos fallback client-side
    const rawItems = useMemo(() => (Array.isArray(itemsResp?.items) ? itemsResp.items : []), [itemsResp]);

    const totalFromBackend = useMemo(() => {
        const t = Number(itemsResp?.total ?? itemsResp?.count);
        return Number.isFinite(t) ? t : null;
    }, [itemsResp]);

    const items = useMemo(() => {
        // Caso ideal: backend ya devolvió items paginados
        if (totalFromBackend !== null) return rawItems;

        // Fallback: backend devuelve TODO, hacemos slice
        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return rawItems.slice(start, end);
    }, [rawItems, page, totalFromBackend]);

    const totalItems = useMemo(() => {
        if (totalFromBackend !== null) return totalFromBackend;
        return rawItems.length;
    }, [rawItems.length, totalFromBackend]);

    const pageCount = useMemo(() => Math.max(1, Math.ceil(totalItems / PAGE_SIZE)), [totalItems]);

    const metrics = useMemo(() => {
        // métricas sobre el total (rawItems) si backend no pagina, o sobre la data actual si sí pagina
        const base = totalFromBackend !== null ? rawItems : rawItems;
        const total = base.length;
        const low = base.filter((x) => num(x.stockCurrent) <= num(x.stockMin)).length;
        const value = base.reduce(
            (acc, x) => acc + num(x.stockCurrent) * (num(x.avgCost) || num(x.lastCost) || 0),
            0
        );
        return { total, low, value };
    }, [rawItems, totalFromBackend]);

    // CRUD modals
    const [itemModal, setItemModal] = useState({ open: false, mode: "create", item: null });
    const [mvModal, setMvModal] = useState({ open: false, type: "purchase", item: null, yield: false });

    // Create/update item
    const saveItemMutation = useMutation({
        mutationFn: async ({ mode, id, payload }) => {
            if (mode === "create") {
                const res = await api.post("/api/inventory/items", payload);
                return res.data;
            }
            const res = await api.put(`/api/inventory/items/${encodeURIComponent(id)}`, payload);
            return res.data;
        },
        onSuccess: async () => {
            enqueueSnackbar("Guardado", { variant: "success" });
            setItemModal({ open: false, mode: "create", item: null });
            await qc.invalidateQueries({ queryKey: ["inventory/items"] });
            await qc.invalidateQueries({ queryKey: ["inventory/movements"] });
            await qc.invalidateQueries({ queryKey: ["inventory/low-stock"] });
        },
        onError: (e) => {
            const status = e?.response?.status;

            // 409: nombre duplicado (por tu índice único)
            if (status === 409) {
                const msg =
                    e?.response?.data?.message ||
                    "Ya existe un artículo de inventario con ese nombre. Cambia el nombre o archiva el anterior.";
                enqueueSnackbar(String(msg), { variant: "warning" });
                return;
            }

            const msg = e?.response?.data?.message || e?.response?.data || e?.message || "Error guardando";
            enqueueSnackbar(String(msg), { variant: "error" });
        },
    });

    const archiveItemMutation = useMutation({
        mutationFn: async (id) => {
            const res = await api.delete(`/api/inventory/items/${encodeURIComponent(id)}`);
            return res.data;
        },
        onSuccess: async () => {
            enqueueSnackbar("Archivado", { variant: "success" });
            await qc.invalidateQueries({ queryKey: ["inventory/items"] });
        },
        onError: (e) => {
            const msg = e?.response?.data?.message || e?.message || "Error archivando";
            enqueueSnackbar(String(msg), { variant: "error" });
        },
    });

    const createMovementMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/api/inventory/movements", payload);
            return res.data;
        },
        onSuccess: async () => {
            enqueueSnackbar("Movimiento registrado", { variant: "success" });
            setMvModal({ open: false, type: "purchase", item: null, yield: false });
            await qc.invalidateQueries({ queryKey: ["inventory/items"] });
            await qc.invalidateQueries({ queryKey: ["inventory/movements"] });
            await qc.invalidateQueries({ queryKey: ["inventory/low-stock"] });
        },
        onError: (e) => {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data ||
                e?.message ||
                "Error registrando movimiento";
            enqueueSnackbar(String(msg), { variant: "error" });
        },
    });

    // Yield: Proceso de merma (purchase + conversion interno)
    const createYieldMutation = useMutation({
        mutationFn: async ({ itemId, purchasedQty, totalCost, finalQty, steps, note }) => {
            const res = await api.post("/api/inventory/movements/yield", {
                itemId,
                purchasedQty,
                totalCost,
                finalQty,
                steps,
                note,
            });
            return res.data;
        },

        onSuccess: async (_data, vars) => {
            markYieldProcessed(vars?.itemId);
            enqueueSnackbar("Proceso de merma aplicado", { variant: "success" });
            setMvModal({ open: false, type: "purchase", item: null, yield: false });
            await qc.invalidateQueries({ queryKey: ["inventory/items"] });
            await qc.invalidateQueries({ queryKey: ["inventory/movements"] });
        },
        onError: (e) => {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data ||
                e?.message ||
                "Error en proceso de merma";
            enqueueSnackbar(String(msg), { variant: "error" });
        },
    });

    // MOVEMENTS list
    const { data: mvResp, isLoading: mvLoading } = useQuery({
        queryKey: ["inventory/movements", tenantId, mvFilters],
        enabled: canUseInventory && Boolean(tenantId) && tab === "movements",
        queryFn: async () => {
            const res = await api.get("/api/inventory/movements", {
                params: {
                    itemId: mvFilters.itemId || undefined,
                    type: mvFilters.type || undefined,
                    from: mvFilters.from ? toISOStartOfDayLocal(mvFilters.from) : undefined,
                    to: mvFilters.to ? toISOMiddayLocal(mvFilters.to) : undefined,
                    limit: 200,
                },
            });
            return res.data;
        },
        staleTime: 10_000,
    });

    const movements = useMemo(() => (Array.isArray(mvResp?.movements) ? mvResp.movements : []), [mvResp]);

    // CONSUMPTION report
    const { data: consResp, isLoading: consLoading } = useQuery({
        queryKey: ["inventory/consumption", tenantId, consFilters],
        enabled: canUseInventory && Boolean(tenantId) && tab === "consumption",
        queryFn: async () => {
            const res = await api.get("/api/inventory/consumption", {
                params: {
                    from: consFilters.from ? toISOStartOfDayLocal(consFilters.from) : undefined,
                    to: consFilters.to ? toISOMiddayLocal(consFilters.to) : undefined,
                    inventoryCategoryId: consFilters.inventoryCategoryId || undefined,
                },
            });
            return res.data;
        },
        staleTime: 10_000,
    });

    const consumptionRows = useMemo(() => {
        const raw = consResp?.data || consResp?.rows || consResp?.items || [];
        return Array.isArray(raw) ? raw : [];
    }, [consResp]);

    // Low stock endpoint (si lo tienes activo)
    const { data: lowResp } = useQuery({
        queryKey: ["inventory/low-stock", tenantId],
        enabled: canUseInventory && Boolean(tenantId),
        queryFn: async () => {
            try {
                const res = await api.get("/api/inventory/low-stock");
                return res.data;
            } catch {
                return { items: [] };
            }
        },
        staleTime: 15_000,
    });

    const lowStockItems = useMemo(() => (Array.isArray(lowResp?.items) ? lowResp.items : []), [lowResp]);

    // ---------- UI helpers ----------
    const openNewItem = () => setItemModal({ open: true, mode: "create", item: null });
    const openEditItem = (it) => setItemModal({ open: true, mode: "edit", item: it });

    // Aviso moderno (notistack) si ya se procesó yield antes
    const maybeWarnYield = (item, onProceed) => {
        if (!item?._id) return onProceed();

        if (!wasYieldProcessed(item._id)) return onProceed();

        const snackKey = enqueueSnackbar("Ya procesaste una merma (yield) para este producto. ¿Qué deseas hacer?", {
            variant: "info",
            persist: true,
            action: (key) => (
                <div className="flex gap-2">
                    <button
                        className="px-3 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-200 text-sm"
                        onClick={() => {
                            closeSnackbar(key);
                            onProceed();
                        }}
                    >
                        Procesar otra merma
                    </button>
                    <button
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm"
                        onClick={() => {
                            closeSnackbar(key);
                            // abrir modal de pérdida directa (waste)
                            setMvModal({ open: true, type: "waste", item, yield: false });
                        }}
                    >
                        Agregar pérdida (merma)
                    </button>
                    <button
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm"
                        onClick={() => closeSnackbar(key)}
                    >
                        Cancelar
                    </button>
                </div>
            ),
        });

        return snackKey;
    };
    const [yieldDoneByItem, setYieldDoneByItem] = React.useState(() => {
        try {
            return JSON.parse(localStorage.getItem("yieldDoneByItem") || "{}");
        } catch {
            return {};
        }
    });

    const markYieldDone = (itemId) => {
        setYieldDoneByItem((prev) => {
            const next = { ...prev, [itemId]: Date.now() };
            localStorage.setItem("yieldDoneByItem", JSON.stringify(next));
            return next;
        });
    };


// Llama esto cuando el usuario le da a "Proceso merma"
    const confirmYieldIfAlreadyDone = (item, openYieldModalFn) => {
        const itemId = item?._id || item?.id;
        if (!itemId) return openYieldModalFn(item);

        if (!yieldDoneByItem[itemId]) {
            return openYieldModalFn(item);
        }

        // Aviso moderno (notistack) con acciones
        enqueueSnackbar("Ya procesaste merma por proceso para este artículo. ¿Quieres procesar otra?", {
            variant: "warning",
            persist: true,
            action: (snackKey) => (
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={() => {
                            closeSnackbar(snackKey);
                            openYieldModalFn(item);
                        }}
                        style={{
                            borderRadius: 10,
                            padding: "6px 10px",
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        Procesar otra
                    </button>

                    <button
                        onClick={() => closeSnackbar(snackKey)}
                        style={{
                            borderRadius: 10,
                            padding: "6px 10px",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            ),
        });
    };

    const openMovement = (type, item, useYield = false) => {
        if (type === "purchase" && useYield) {
            return maybeWarnYield(item, () => setMvModal({ open: true, type, item, yield: true }));
        }
        setMvModal({ open: true, type, item, yield: Boolean(useYield) });
    };

    const TabBtn = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl border text-sm inline-flex items-center gap-2 ${
                tab === id
                    ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-200"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
            }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );

    // ---------- Guard: plan ----------
    if (!canUseInventory) {
        return (
            <div className="p-6">
                <div className={`${cardCls} p-6`}>
                    <div className="text-white text-lg font-semibold">Inventario</div>
                    <div className="text-white/70 mt-1">
                        Este módulo está disponible solo para los planes <b>Premium</b> y <b>VIP</b>.
                    </div>
                </div>
            </div>
        );
    }

    // ---------- Render ----------
    return (
        <div className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="text-white text-2xl font-semibold">Inventario</div>
                    <div className="text-white/60">Stock real, kardex y consumo</div>
                    <div className="text-white/40 text-xs mt-1">
                        Nota: <b>Último costo</b> = último precio unitario comprado. <b>Costo promedio</b> = promedio ponderado para calcular costo real.
                        <br />
                        <b>Stock mínimo</b> sirve para marcar “Bajo stock” cuando el stock actual llega a esa cantidad o menos.
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <TabBtn id="stock" icon={Package} label="Stock" />
                    <TabBtn id="movements" icon={History} label="Movimientos" />
                    <TabBtn id="consumption" icon={BarChart3} label="Consumo" />
                    <TabBtn id="merma" icon={Trash2} label="Merma" />
                    <TabBtn id="suppliers" icon={SlidersHorizontal} label="Proveedores" />
                    <TabBtn id="categories" icon={SlidersHorizontal} label="Categorías" />
                </div>
            </div>

            {/* METRICS */}
            {tab === "stock" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className={`${cardCls} p-4`}>
                        <div className="text-white/60 text-sm">Artículos</div>
                        <div className="text-white text-2xl font-semibold">{metrics.total}</div>
                    </div>
                    <div className={`${cardCls} p-4`}>
                        <div className="text-white/60 text-sm">Bajo stock</div>
                        <div className="text-white text-2xl font-semibold">{metrics.low}</div>
                    </div>
                    <div className={`${cardCls} p-4`}>
                        <div className="text-white/60 text-sm">Valor estimado</div>
                        <div className="text-white text-2xl font-semibold">{moneyRD(metrics.value)}</div>
                    </div>
                </div>
            )}

            {/* STOCK TAB */}
            {tab === "stock" && (
                <div className={`${cardCls} p-4 mt-4`}>
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                            <div>
                                <div className="text-white/60 text-xs mb-1">Buscar</div>
                                <input
                                    className={inputCls}
                                    placeholder="Nombre..."
                                    value={stockFilters.q}
                                    onChange={(e) => setStockFilters((s) => ({ ...s, q: e.target.value }))}
                                />
                            </div>

                            <div>
                                <div className="text-white/60 text-xs mb-1">Categoría</div>
                                <select
                                    className={selectCls}
                                    value={stockFilters.inventoryCategoryId}
                                    onChange={(e) => setStockFilters((s) => ({ ...s, inventoryCategoryId: e.target.value }))}
                                >
                                    <option value="">Todas</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="text-white/60 text-xs mb-1">Proveedor</div>
                                <select
                                    className={selectCls}
                                    value={stockFilters.supplierId}
                                    onChange={(e) => setStockFilters((s) => ({ ...s, supplierId: e.target.value }))}
                                >
                                    <option value="">Todos</option>
                                    {suppliers.map((sp) => (
                                        <option key={sp._id} value={sp._id}>
                                            {sp.name || sp.companyName || "Proveedor"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center justify-end">
                            <button
                                onClick={() => setStockFilters((s) => ({ ...s, includeArchived: !s.includeArchived }))}
                                className={`px-4 py-3 rounded-xl border inline-flex items-center gap-2 ${
                                    stockFilters.includeArchived
                                        ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-200"
                                        : "bg-white/5 border-white/10 text-white/80"
                                }`}
                            >
                                <Archive className="w-4 h-4" />
                                {stockFilters.includeArchived ? "Mostrando archivados" : "Ocultando archivados"}
                            </button>

                            <button
                                onClick={openNewItem}
                                className="px-4 py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-200 inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo artículo
                            </button>
                        </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="text-left text-white/60 border-b border-white/10">
                                <th className="py-3 pr-4 min-w-[220px]">Artículo</th>
                                <th className="py-3 pr-4">Unidad</th>
                                <th className="py-3 pr-4">Stock</th>
                                <th className="py-3 pr-4">Mínimo</th>
                                <th className="py-3 pr-4">Costo prom.</th>
                                <th className="py-3 pr-4">Proveedor</th>
                                <th className="py-3 pr-4">Estado</th>
                                <th className="py-3 pr-4 text-right">Acciones</th>
                            </tr>
                            </thead>

                            <tbody>
                            {itemsLoading ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-white/60">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-white/60">
                                        No hay artículos.
                                    </td>
                                </tr>
                            ) : (
                                items.map((it) => {
                                    const isLow = num(it.stockCurrent) <= num(it.stockMin);
                                    const providerName =
                                        it?.supplierId?.name ||
                                        it?.supplierId?.companyName ||
                                        (typeof it?.supplierId === "string" ? "Proveedor" : "—");
                                    return (
                                        <tr key={it._id} className="border-b border-white/5">
                                            <td className="py-4 pr-4">
                                                <div className="text-white font-medium">{it.name}</div>
                                                <div className="text-white/30 text-xs">{it._id}</div>
                                            </td>
                                            <td className="py-4 pr-4 text-white/80">{it.unit || "unidad"}</td>
                                            <td className="py-4 pr-4 text-white/80">{num(it.stockCurrent)}</td>
                                            <td className="py-4 pr-4 text-white/80">{num(it.stockMin)}</td>
                                            <td className="py-4 pr-4 text-white/80">
                                                {moneyRD(num(it.avgCost) || num(it.lastCost) || 0)}
                                            </td>
                                            <td className="py-4 pr-4 text-white/80">{providerName}</td>
                                            <td className="py-4 pr-4">
                                                {isLow ? <Badge tone="warning">Bajo stock</Badge> : <Badge>OK</Badge>}
                                            </td>
                                            <td className="py-4 pr-0">
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex flex-wrap gap-2 justify-end">
                                                        <button
                                                            onClick={() => openMovement("purchase", it, false)}
                                                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center gap-2"
                                                        >
                                                            <ArrowDownCircle className="w-4 h-4" />
                                                            Entrada
                                                        </button>

                                                        <button
                                                            onClick={() => openMovement("purchase", it, true)}
                                                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                                                        >
                                                            Proceso merma
                                                        </button>

                                                        <button
                                                            onClick={() => openMovement("adjust", it, false)}
                                                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center gap-2"
                                                        >
                                                            <SlidersHorizontal className="w-4 h-4" />
                                                            Ajuste
                                                        </button>

                                                        <button
                                                            onClick={() => openMovement("waste", it, false)}
                                                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center gap-2"
                                                        >
                                                            <ArrowUpCircle className="w-4 h-4" />
                                                            Merma
                                                        </button>

                                                        <button
                                                            onClick={() => openEditItem(it)}
                                                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            onClick={() => archiveItemMutation.mutate(it._id)}
                                                            className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 inline-flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Archivar
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden mt-4 space-y-3">
                        {itemsLoading ? (
                            <div className="text-white/60">Cargando...</div>
                        ) : items.length === 0 ? (
                            <div className="text-white/60">No hay artículos.</div>
                        ) : (
                            items.map((it) => {
                                const isLow = num(it.stockCurrent) <= num(it.stockMin);
                                const providerName =
                                    it?.supplierId?.name ||
                                    it?.supplierId?.companyName ||
                                    (typeof it?.supplierId === "string" ? "Proveedor" : "—");
                                return (
                                    <div key={it._id} className={`${cardCls} p-4`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-white font-semibold">{it.name}</div>
                                                <div className="text-white/50 text-xs mt-1">
                                                    {it.unit || "unidad"} · Stock {num(it.stockCurrent)} · Mín {num(it.stockMin)}
                                                </div>
                                                <div className="text-white/40 text-xs mt-1">Proveedor: {providerName}</div>
                                            </div>
                                            <div>{isLow ? <Badge tone="warning">Bajo</Badge> : <Badge>OK</Badge>}</div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => openMovement("purchase", it, false)}
                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                                            >
                                                Entrada
                                            </button>
                                            <button
                                                onClick={() => openMovement("purchase", it, true)}
                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                                            >
                                                Proceso merma
                                            </button>
                                            <button
                                                onClick={() => openMovement("adjust", it, false)}
                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                                            >
                                                Ajuste
                                            </button>
                                            <button
                                                onClick={() => openMovement("waste", it, false)}
                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                                            >
                                                Merma
                                            </button>
                                            <button
                                                onClick={() => openEditItem(it)}
                                                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => archiveItemMutation.mutate(it._id)}
                                                className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200"
                                            >
                                                Archivar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-white/60 text-sm">
                            Página <b className="text-white">{page}</b> de <b className="text-white">{pageCount}</b> · Total:{" "}
                            <b className="text-white">{totalItems}</b>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className={`px-3 py-2 rounded-xl border inline-flex items-center gap-2 ${
                                    page <= 1
                                        ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                                }`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </button>

                            <button
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                disabled={page >= pageCount}
                                className={`px-3 py-2 rounded-xl border inline-flex items-center gap-2 ${
                                    page >= pageCount
                                        ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                                }`}
                            >
                                Siguiente
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOVEMENTS TAB */}
            {tab === "movements" && (
                <div className={`${cardCls} p-4 mt-4`}>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div>
                            <div className="text-white/60 text-xs mb-1">Artículo</div>
                            <select className={selectCls} value={mvFilters.itemId} onChange={(e) => setMvFilters((s) => ({ ...s, itemId: e.target.value }))}>
                                <option value="">Todos</option>
                                {rawItems.map((it) => (
                                    <option key={it._id} value={it._id}>
                                        {it.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="text-white/60 text-xs mb-1">Tipo</div>
                            <select className={selectCls} value={mvFilters.type} onChange={(e) => setMvFilters((s) => ({ ...s, type: e.target.value }))}>
                                <option value="">Todos</option>
                                {["purchase", "sale", "waste", "adjust", "transfer", "conversion"].map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="text-white/60 text-xs mb-1">Desde</div>
                            <input type="date" className={inputCls} value={mvFilters.from} onChange={(e) => setMvFilters((s) => ({ ...s, from: e.target.value }))} />
                        </div>

                        <div>
                            <div className="text-white/60 text-xs mb-1">Hasta</div>
                            <input type="date" className={inputCls} value={mvFilters.to} onChange={(e) => setMvFilters((s) => ({ ...s, to: e.target.value }))} />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => qc.invalidateQueries({ queryKey: ["inventory/movements"] })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                            >
                                Refrescar
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="text-left text-white/60 border-b border-white/10">
                                <th className="py-3 pr-4 min-w-[160px]">Fecha</th>
                                <th className="py-3 pr-4">Tipo</th>
                                <th className="py-3 pr-4 min-w-[220px]">Artículo</th>
                                <th className="py-3 pr-4">Cantidad</th>
                                <th className="py-3 pr-4">Antes</th>
                                <th className="py-3 pr-4">Después</th>
                                <th className="py-3 pr-4">Costo</th>
                                <th className="py-3 pr-4">Nota</th>
                            </tr>
                            </thead>
                            <tbody>
                            {mvLoading ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-white/60">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-white/60">
                                        No hay movimientos.
                                    </td>
                                </tr>
                            ) : (
                                movements.map((m) => (
                                    <tr key={m._id} className="border-b border-white/5">
                                        <td className="py-3 pr-4 text-white/80">
                                            {m.createdAt ? new Date(m.createdAt).toLocaleString("es-DO") : "—"}
                                        </td>
                                        <td className="py-3 pr-4 text-white/80">{m.type}</td>
                                        <td className="py-3 pr-4 text-white/80">{m.itemName || m?.itemId?.name || "—"}</td>
                                        <td className="py-3 pr-4 text-white/80">{num(m.qty)}</td>
                                        <td className="py-3 pr-4 text-white/80">{num(m.beforeStock)}</td>
                                        <td className="py-3 pr-4 text-white/80">{num(m.afterStock)}</td>
                                        <td className="py-3 pr-4 text-white/80">{moneyRD(num(m.costAmount) || 0)}</td>
                                        <td className="py-3 pr-4 text-white/60">{m.note || "—"}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONSUMPTION TAB */}
            {tab === "consumption" && (
                <div className={`${cardCls} p-4 mt-4`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <div className="text-white/60 text-xs mb-1">Desde</div>
                            <input type="date" className={inputCls} value={consFilters.from} onChange={(e) => setConsFilters((s) => ({ ...s, from: e.target.value }))} />
                        </div>

                        <div>
                            <div className="text-white/60 text-xs mb-1">Hasta</div>
                            <input type="date" className={inputCls} value={consFilters.to} onChange={(e) => setConsFilters((s) => ({ ...s, to: e.target.value }))} />
                        </div>

                        <div>
                            <div className="text-white/60 text-xs mb-1">Categoría</div>
                            <select className={selectCls} value={consFilters.inventoryCategoryId} onChange={(e) => setConsFilters((s) => ({ ...s, inventoryCategoryId: e.target.value }))}>
                                <option value="">Todas</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => qc.invalidateQueries({ queryKey: ["inventory/consumption"] })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                            >
                                Refrescar
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="text-left text-white/60 border-b border-white/10">
                                <th className="py-3 pr-4 min-w-[220px]">Artículo</th>
                                <th className="py-3 pr-4">Cantidad</th>
                                <th className="py-3 pr-4">Costo</th>
                            </tr>
                            </thead>
                            <tbody>
                            {consLoading ? (
                                <tr>
                                    <td colSpan={3} className="py-6 text-white/60">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : consumptionRows.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-6 text-white/60">
                                        No hay datos.
                                    </td>
                                </tr>
                            ) : (
                                consumptionRows.map((r, idx) => (
                                    <tr key={r._id || `${r.name}-${idx}`} className="border-b border-white/5">
                                        <td className="py-3 pr-4 text-white/80">{r.name || r.itemName || "—"}</td>
                                        <td className="py-3 pr-4 text-white/80">{num(r.qtySold ?? r.qty ?? 0)}</td>
                                        <td className="py-3 pr-4 text-white/80">{moneyRD(num(r.revenue ?? 0))}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MERMA TAB */}
            {tab === "merma" && (
                <YieldMermaDashboard
                    tenantId={tenantId}
                    canUseInventory={canUseInventory}
                    ymd={mermaYMD}
                    setYmd={setMermaYMD}
                    moneyRD={moneyRD}
                />
            )}

            {/* SUPPLIERS + CATEGORIES placeholders */}
            {tab === "suppliers" &&  (
                <Suppliers />)}
            {tab === "categories" && <InventoryCategories />}

            {/* Modals */}
            <ItemModal
                open={itemModal.open}
                mode={itemModal.mode}
                item={itemModal.item}
                categories={categories}
                suppliers={suppliers}
                dishTemplates={dishTemplates}
                onClose={() => setItemModal({ open: false, mode: "create", item: null })}
                onSave={(payload) => {
                    const mode = itemModal.mode;
                    if (mode === "create") return saveItemMutation.mutate({ mode: "create", payload });
                    return saveItemMutation.mutate({ mode: "edit", id: itemModal.item?._id, payload });
                }}
            />

            <MovementModal
                open={mvModal.open}
                type={mvModal.type}
                item={mvModal.item}
                defaultYield={mvModal.yield}
                onClose={() => setMvModal({ open: false, type: "purchase", item: null, yield: false })}
                onSave={(payload) => createMovementMutation.mutate(payload)}
                onSaveYield={(payload) => createYieldMutation.mutate(payload)}
            />
        </div>
    );
}
function YieldMermaDashboard({ tenantId, canUseInventory, ymd, setYmd, moneyRD }) {
    const [openHistory, setOpenHistory] = useState(false);

    // Helpers
    const safeNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const parseYieldFromNote = (note) => {
        const text = String(note || "");

        // Ejemplos esperados:
        // "Yield: comprado 9 → final 7 | pasos: Hervido:8, Cocido:7"
        // o "comprado 9" "final 7"
        const boughtMatch = text.match(/comprad[oa]\s*([0-9]+(?:\.[0-9]+)?)/i);
        const finalMatch = text.match(/final\s*([0-9]+(?:\.[0-9]+)?)/i);

        const bought = boughtMatch ? Number(boughtMatch[1]) : null;
        const final = finalMatch ? Number(finalMatch[1]) : null;

        // Pasos: "pasos: Hervido:8, Cocido:7"
        const stepsMatch = text.match(/pasos:\s*(.*)$/i);
        let steps = [];
        if (stepsMatch && stepsMatch[1]) {
            steps = stepsMatch[1]
                .split(",")
                .map((p) => p.trim())
                .map((p) => {
                    const [label, qty] = p.split(":").map((x) => x.trim());
                    const q = Number(qty);
                    return label ? { label, qtyAfter: Number.isFinite(q) ? q : null } : null;
                })
                .filter(Boolean);
        }

        return { bought, final, steps };
    };

    const { data: wasteResp, isLoading } = useQuery({
        queryKey: ["inventory/merma/yield-movements", tenantId, ymd],
        enabled: canUseInventory && Boolean(tenantId),
        queryFn: async () => {
            const res = await api.get("/api/inventory/movements", {
                params: {
                    type: "waste",
                    from: ymd ? toISOStartOfDayLocal(ymd) : undefined,
                    to: ymd ? toISOEndOfDayLocal(ymd) : undefined,
                    limit: 500,
                },
            });
            return res.data;
        },
        staleTime: 5_000,
    });

    const wasteMovements = useMemo(() => {
        const list = wasteResp?.movements;
        return Array.isArray(list) ? list : [];
    }, [wasteResp]);

    const kpis = useMemo(() => {
        const list = wasteMovements;

        let wasteQty = 0;
        let wasteCost = 0;

        let boughtTotal = 0;
        let finalTotal = 0;
        let hasYieldMeta = 0;

        for (const m of list) {
            wasteQty += safeNumber(m.qty);
            wasteCost += safeNumber(m.costAmount);

            const meta = parseYieldFromNote(m.note);
            if (meta.bought != null && meta.final != null) {
                boughtTotal += safeNumber(meta.bought);
                finalTotal += safeNumber(meta.final);
                hasYieldMeta += 1;
            }
        }

        const avgWasteUnitCost = wasteQty > 0 ? wasteCost / wasteQty : 0;
        const yieldPct = boughtTotal > 0 ? (finalTotal / boughtTotal) * 100 : 0;
        const wastePct = boughtTotal > 0 ? ((boughtTotal - finalTotal) / boughtTotal) * 100 : 0;

        return {
            movementsCount: list.length,

            wasteQty,
            wasteCost,
            avgWasteUnitCost,

            boughtTotal,
            finalTotal,
            yieldPct,
            wastePct,
            hasYieldMeta,
        };
    }, [wasteMovements]);

    const latest = useMemo(() => {
        return [...wasteMovements]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 10);
    }, [wasteMovements]);

    return (
        <div className={cardCls + " p-5"}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <div className="text-white font-bold text-lg">Merma (Yield)</div>
                    <div className="text-white/60 text-sm">
                        Historial y KPIs basados en movimientos tipo <span className="text-white/80">waste</span>.
                    </div>

                    {kpis.hasYieldMeta === 0 ? (
                        <div className="text-[11px] text-yellow-200/80 mt-2">
                            Nota: Para calcular “Comprado/Final/Rendimiento”, el note del yield debe incluir “comprado X” y “final Y”.
                            (Si no, igual verás Merma cantidad/costo).
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={ymd}
                        onChange={(e) => setYmd(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[#0b0b0b] border border-gray-800/30 text-white"
                    />

                    <button
                        type="button"
                        onClick={() => setOpenHistory(true)}
                        className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-gray-800/40 text-white font-semibold hover:bg-[#262626]"
                    >
                        Ver historial
                    </button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Comprado (total)</div>
                    <div className="text-lg font-semibold text-white">{kpis.boughtTotal || 0}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                        Movimientos: {kpis.movementsCount}
                    </div>
                </div>

                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Final usable (total)</div>
                    <div className="text-lg font-semibold text-white">{kpis.finalTotal || 0}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                        Rendimiento: {kpis.yieldPct.toFixed(1)}%
                    </div>
                </div>

                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Merma (cantidad)</div>
                    <div className="text-lg font-semibold text-white">{kpis.wasteQty}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                        % Merma: {kpis.wastePct.toFixed(1)}%
                    </div>
                </div>

                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Merma (costo)</div>
                    <div className="text-lg font-semibold text-white">{moneyRD(kpis.wasteCost)}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                        Costo prom./u merma: {moneyRD(kpis.avgWasteUnitCost)}
                    </div>
                </div>

                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Costo prom. por unidad (merma)</div>
                    <div className="text-lg font-semibold text-white">{moneyRD(kpis.avgWasteUnitCost)}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                        wasteCost / wasteQty
                    </div>
                </div>

                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Registros con metadata (comprado/final)</div>
                    <div className="text-lg font-semibold text-white">{kpis.hasYieldMeta}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                        Si es 0, agrega “comprado/final” al note del yield.
                    </div>
                </div>
            </div>

            {/* Últimas mermas */}
            <div className="mt-4 rounded-2xl bg-[#0b0b0b] border border-gray-800/50">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                    <div className="text-white font-bold">Últimas mermas</div>
                    <div className="text-xs text-white/50">{ymd}</div>
                </div>

                <div className="p-4 space-y-3">
                    {isLoading ? (
                        <div className="text-white/60">Cargando...</div>
                    ) : latest.length === 0 ? (
                        <div className="text-white/60">No hay mermas registradas para este día.</div>
                    ) : (
                        latest.map((m) => {
                            const meta = parseYieldFromNote(m.note);
                            const stepsArr = meta.steps || [];

                            const itemName =
                                m?.itemId?.name ||
                                m?.itemName ||
                                m?.itemId ||
                                "—";

                            return (
                                <div key={m._id} className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-white font-semibold truncate">{itemName}</div>

                                            <div className="text-xs text-gray-400 mt-1">
                                                Merma: <span className="text-gray-200">{safeNumber(m.qty)}</span> · Costo:{" "}
                                                <span className="text-gray-200">{moneyRD(safeNumber(m.costAmount))}</span>
                                            </div>

                                            {(meta.bought != null && meta.final != null) ? (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Comprado: <span className="text-gray-200">{meta.bought}</span> · Final:{" "}
                                                    <span className="text-gray-200">{meta.final}</span>
                                                </div>
                                            ) : null}

                                            {String(m.note || "").trim() ? (
                                                <div className="text-xs text-gray-400 mt-2">
                                                    Nota: <span className="text-gray-200">{String(m.note).trim()}</span>
                                                </div>
                                            ) : null}

                                            {stepsArr.length > 0 ? (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {stepsArr.slice(0, 8).map((s, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-[11px] px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-gray-200"
                                                        >
                              {s.label}: {s.qtyAfter ?? "—"}
                            </span>
                                                    ))}
                                                    {stepsArr.length > 8 ? (
                                                        <span className="text-[11px] px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-gray-400">
                              +{stepsArr.length - 8} más
                            </span>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="text-xs text-white/50 shrink-0">
                                            {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* History Modal */}
            <Modal open={openHistory} title={`Historial de merma (Yield) — ${ymd}`} onClose={() => setOpenHistory(false)}>
                <div className="space-y-3">
                    {wasteMovements.length === 0 ? (
                        <div className="text-white/60">No hay registros.</div>
                    ) : (
                        wasteMovements
                            .slice()
                            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                            .map((m) => {
                                const itemName = m?.itemId?.name || m?.itemName || m?.itemId || "—";
                                return (
                                    <div key={m._id} className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                                        <div className="text-white font-semibold">{itemName}</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Merma: <span className="text-gray-200">{safeNumber(m.qty)}</span> · Costo:{" "}
                                            <span className="text-gray-200">{moneyRD(safeNumber(m.costAmount))}</span>
                                        </div>
                                        {String(m.note || "").trim() ? (
                                            <div className="text-xs text-gray-400 mt-2">
                                                Nota: <span className="text-gray-200">{String(m.note).trim()}</span>
                                            </div>
                                        ) : null}
                                        <div className="text-[11px] text-gray-500 mt-2">
                                            {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            </Modal>
        </div>
    );
}
function ItemModal({ open, mode, item, categories, suppliers, dishTemplates, onClose, onSave }) {
    const isEdit = mode === "edit";

    const [createMode, setCreateMode] = useState("new"); // new | fromDish
    const [selectedDishId, setSelectedDishId] = useState("");

    const [form, setForm] = useState({
        name: "",
        unit: "unidad",
        stockMin: 0,
        lastCost: "",
        avgCost: "",
        inventoryCategoryId: "",
        supplierId: "",
    });


    React.useEffect(() => {
        if (!open) return;
        setCreateMode("new");
        setSelectedDishId("");
        setForm({
            name: item?.name || "",
            unit: item?.unit || "unidad",
            stockMin: item?.stockMin ?? 0,
            lastCost: item?.lastCost ?? "",
            avgCost: item?.avgCost ?? "",
            inventoryCategoryId: item?.inventoryCategoryId || "",
            supplierId: item?.supplierId?._id || item?.supplierId || "",
        });
    }, [open, item]);

    const selectedDish = useMemo(
        () => dishTemplates.find((d) => d._id === selectedDishId),
        [dishTemplates, selectedDishId]
    );

    React.useEffect(() => {
        if (!open) return;
        if (!isEdit && createMode === "fromDish" && selectedDish) {
            setForm((s) => ({
                ...s,
                name: selectedDish.name || s.name,
            }));
        }
    }, [open, isEdit, createMode, selectedDish]);
    const handleSaveInventory = async () => {
        const name = String(form.name || "").trim();
        if (!name) {
            enqueueSnackbar("Nombre requerido", { variant: "warning" });
            return;
        }

        const payload = {
            name,
            unit: form.unit,
            stockMin: Number(form.stockMin || 0),
            lastCost: form.lastCost === "" ? null : Number(form.lastCost),
            avgCost: form.avgCost === "" ? null : Number(form.avgCost),
            inventoryCategoryId: form.inventoryCategoryId || null,
            supplierId: form.supplierId || null,
        };

        // Si es "basado en plato existente", NO creamos otro Dish.
        // Actualizamos el MISMO dish usando existingDishId
        if (!isEdit && createMode === "fromDish") {
            if (!selectedDishId) {
                setWarn("Selecciona un plato primero.");
                return;
            }
            payload.existingDishId = selectedDishId;
        }

        await onSave(payload);
    };



    return (
        <Modal open={open} title={isEdit ? "Editar artículo" : "Nuevo artículo"} onClose={onClose}>
            {!isEdit && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        onClick={() => setCreateMode("new")}
                        className={`px-3 py-2 rounded-xl border text-sm ${
                            createMode === "new"
                                ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-200"
                                : "bg-white/5 border-white/10 text-white/80"
                        }`}
                    >
                        Crear artículo nuevo
                    </button>
                    <button
                        onClick={() => setCreateMode("fromDish")}
                        className={`px-3 py-2 rounded-xl border text-sm ${
                            createMode === "fromDish"
                                ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-200"
                                : "bg-white/5 border-white/10 text-white/80"
                        }`}
                    >
                        Basado en plato existente
                    </button>
                </div>
            )}

            {!isEdit && createMode === "fromDish" && (
                <div className="mb-4">
                    <div className="text-white/70 text-xs mb-1">Selecciona un plato</div>
                    <select className={selectCls} value={selectedDishId} onChange={(e) => setSelectedDishId(e.target.value)}>
                        <option value="">—</option>
                        {dishTemplates.map((d) => (
                            <option key={d._id} value={d._id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                    <div className="text-white/40 text-[11px] mt-1">
                        Esto habilita el MISMO plato para inventario (sin duplicar).
                        <br />
                        El stock se maneja con movimientos: usa el botón “Entrada” luego de guardar.
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <div className="text-white/70 text-xs mb-1">Nombre</div>
                    <input className={inputCls} value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                </div>

                <div>
                    <div className="text-white/70 text-xs mb-1">Unidad</div>
                    <select className={selectCls} value={form.unit} onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}>
                        {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="text-white/70 text-xs mb-1">Categoría inventario</div>
                    <select
                        className={selectCls}
                        value={form.inventoryCategoryId}
                        onChange={(e) => setForm((s) => ({ ...s, inventoryCategoryId: e.target.value }))}
                    >
                        <option value="">—</option>
                        {categories.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="text-white/70 text-xs mb-1">Proveedor actual (opcional)</div>
                    <select className={selectCls} value={form.supplierId} onChange={(e) => setForm((s) => ({ ...s, supplierId: e.target.value }))}>
                        <option value="">Sin proveedor</option>
                        {suppliers.map((sp) => (
                            <option key={sp._id} value={sp._id}>
                                {sp.name || sp.companyName || "Proveedor"}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="text-white/70 text-xs mb-1">Stock mínimo</div>
                    <input type="number" className={inputCls} value={form.stockMin} onChange={(e) => setForm((s) => ({ ...s, stockMin: e.target.value }))} />
                </div>

                <div>
                    <div className="text-white/70 text-xs mb-1">Último costo</div>
                    <input type="number" className={inputCls} value={form.lastCost} onChange={(e) => setForm((s) => ({ ...s, lastCost: e.target.value }))} />
                </div>

                <div>
                    <div className="text-white/70 text-xs mb-1">Costo promedio</div>
                    <input type="number" className={inputCls} value={form.avgCost} onChange={(e) => setForm((s) => ({ ...s, avgCost: e.target.value }))} />
                </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
                <button onClick={onClose} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80">
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={handleSaveInventory}
                    className="px-4 py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-200"
                >
                    Guardar
                </button>
            </div>
        </Modal>
    );
}

function MovementModal({ open, type, item, defaultYield = false, onClose, onSave, onSaveYield }) {
    const [qty, setQty] = useState("");
    const [unitCost, setUnitCost] = useState("");
    const [direction, setDirection] = useState("out"); // adjust
    const [note, setNote] = useState("");
    const { enqueueSnackbar } = useSnackbar();

    // Yield
    const [useYield, setUseYield] = useState(false);
    const [totalCost, setTotalCost] = useState("");
    const [finalQty, setFinalQty] = useState("");
    const [steps, setSteps] = useState([
        { label: "Hervido", qtyAfter: "" },
        { label: "Cocido", qtyAfter: "" },
    ]);

    React.useEffect(() => {
        if (!open) return;
        setQty("");
        setUnitCost("");
        setDirection("out");
        setNote("");

        setUseYield(Boolean(defaultYield));
        setTotalCost("");
        setFinalQty("");
        setSteps([
            { label: "Hervido", qtyAfter: "" },
            { label: "Cocido", qtyAfter: "" },
        ]);
    }, [open, type, item, defaultYield]);

    const title =
        type === "purchase"
            ? useYield
                ? "Proceso de merma (yield)"
                : "Entrada (purchase)"
            : type === "waste"
                ? "Merma (waste)"
                : "Ajuste (adjust)";

    const canYield = type === "purchase";

    const parseN = (v) => {
        const n = Number(String(v).replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
    };

    const handleSave = () => {
        if (!item?._id) return enqueueSnackbar("Artículo inválido", { variant: "error" });

        if (useYield) {
            const qtyNum = parseN(qty);
            const totalCostNum = parseN(totalCost);
            const finalQtyNum = parseN(finalQty);

            if (qtyNum <= 0) return enqueueSnackbar("Cantidad comprada inválida", { variant: "warning" });
            if (finalQtyNum <= 0) return enqueueSnackbar("Cantidad final inválida", { variant: "warning" });
            if (totalCostNum < 0) return enqueueSnackbar("Costo total inválido", { variant: "warning" });

            const cleanedSteps = (steps || [])
                .map((s) => ({ label: String(s.label || "").trim(), qty: parseN(s.qtyAfter) }))
                .filter((s) => s.label && s.qty > 0);


            return onSaveYield({
                itemId: item._id,
                purchasedQty: qtyNum,
                totalCost: totalCostNum,
                finalQty: finalQtyNum,
                steps: cleanedSteps, // ✅ ya viene como {label, qty}
                note: String(note || "").trim() || null,
            });
        }

        const qtyNum = parseN(qty);
        if (qtyNum <= 0) return enqueueSnackbar("Cantidad inválida", { variant: "warning" });

        const payload = {
            itemId: item._id,
            type,
            qty: qtyNum,
            note: String(note || "").trim() || null,
        };

        if (type === "purchase") {
            const unitCostNum = parseN(unitCost);
            payload.unitCost = unitCost === "" ? null : unitCostNum;
        }

        if (type === "adjust") {
            payload.direction = direction; // out | in
        }

        return onSave(payload);
    };

    return (
        <Modal open={open} title={title} onClose={onClose}>
            <div className="text-white/70 text-sm mb-3">
                Artículo: <span className="text-white">{item?.name || "—"}</span>
            </div>

            {canYield && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-white/70 text-sm">
                        {useYield ? "Aplicando rendimiento (merma por proceso)" : "Entrada normal"}
                    </div>
                    <button
                        onClick={() => setUseYield((v) => !v)}
                        className={`px-3 py-2 rounded-xl border text-sm ${
                            useYield ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-200" : "bg-white/5 border-white/10 text-white/80"
                        }`}
                    >
                        {useYield ? "Desactivar" : "Activar"} proceso de merma
                    </button>
                </div>
            )}

            {!useYield && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <div className="text-white/70 text-xs mb-1">Cantidad</div>
                        <input className={inputCls} type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                    </div>

                    {type === "purchase" && (
                        <div>
                            <div className="text-white/70 text-xs mb-1">Costo unitario</div>
                            <input className={inputCls} type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
                        </div>
                    )}

                    {type === "adjust" && (
                        <div>
                            <div className="text-white/70 text-xs mb-1">Dirección</div>
                            <select className={selectCls} value={direction} onChange={(e) => setDirection(e.target.value)}>
                                <option value="out">Reducir</option>
                                <option value="in">Aumentar</option>
                            </select>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <div className="text-white/70 text-xs mb-1">Nota</div>
                        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                </div>
            )}

            {useYield && (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <div className="text-white/70 text-xs mb-1">Cantidad comprada (ej: 44.60)</div>
                            <input className={inputCls} type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                        </div>

                        <div>
                            <div className="text-white/70 text-xs mb-1">Costo total compra (ej: 7136)</div>
                            <input className={inputCls} type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
                        </div>

                        <div>
                            <div className="text-white/70 text-xs mb-1">Cantidad final usable (ej: 28)</div>
                            <input className={inputCls} type="number" value={finalQty} onChange={(e) => setFinalQty(e.target.value)} />
                        </div>

                        <div>
                            <div className="text-white/70 text-xs mb-1">Nota</div>
                            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>
                    </div>

                    <div className="text-white/60 text-sm">
                        Pasos intermedios (opcional). Ej: hervido 32.8, cocido 28.
                    </div>

                    <div className="space-y-2">
                        {steps.map((s, idx) => (
                            <div key={`${s.label}-${idx}`} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input
                                    className={inputCls}
                                    value={s.label}
                                    onChange={(e) =>
                                        setSteps((arr) => arr.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                                    }
                                />
                                <input
                                    className={inputCls}
                                    type="number"
                                    placeholder="Cantidad después"
                                    value={s.qtyAfter}
                                    onChange={(e) =>
                                        setSteps((arr) => arr.map((x, i) => (i === idx ? { ...x, qtyAfter: e.target.value } : x)))
                                    }
                                />
                                <button
                                    onClick={() => setSteps((arr) => arr.filter((_, i) => i !== idx))}
                                    className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200"
                                >
                                    Quitar
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={() => setSteps((arr) => [...arr, { label: "Paso", qtyAfter: "" }])}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                        >
                            + Agregar paso
                        </button>
                    </div>

                    <div className="text-white/60 text-sm mt-2">
                        Costo final por unidad (estimado):{" "}
                        <b className="text-white">
                            {(() => {
                                const tc = parseN(totalCost);
                                const fq = parseN(finalQty);
                                if (fq <= 0) return "—";
                                return moneyRD(tc / fq);
                            })()}
                        </b>
                    </div>
                </div>
            )}

            <div className="mt-5 flex gap-2 justify-end">
                <button onClick={onClose} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80">
                    Cancelar
                </button>

                <button
                    onClick={handleSave}
                    className="px-4 py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-200"
                >
                    Guardar
                </button>
            </div>
        </Modal>
    );
}
