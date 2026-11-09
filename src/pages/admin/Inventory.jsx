import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import Suppliers from "./Suppliers";
import { useSnackbar } from "notistack";
import { useTranslation } from "react-i18next";

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
    FileSpreadsheet,
} from "lucide-react";
import api from "../../lib/api";
import MermaPanel from "./MermaPanel";
import useTenant from "../../hooks/useTenant";

import {
    formatDateTime,
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
} from "../../lib/localization";

const cardCls =
    "rounded-2xl border border-gray-800/30 bg-[#0b0b0b]/60 backdrop-blur";
const inputCls =
    "w-full px-4 py-3.5 border border-white/15 rounded-xl " +
    "bg-[#151515] text-white text-base placeholder:text-white/40 " +
    "focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/40 " +
    "transition";
const selectCls =
    "w-full px-4 py-3.5 border border-white/15 rounded-xl " +
    "bg-[#151515] text-white text-base " +
    "focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/40 " +
    "transition";

const UNIT_OPTIONS = ["unidad", "lb", "kg", "g", "oz", "ml", "l"];
const PAGE_SIZE = 10;
const INVENTORY_ITEM_TYPES = [
    {
        value: "ingredient",
        titleKey: "inventoryPage.itemTypes.ingredient.title",
        descKey: "inventoryPage.itemTypes.ingredient.description",
    },
    {
        value: "direct",
        titleKey: "inventoryPage.itemTypes.direct.title",
        descKey: "inventoryPage.itemTypes.direct.description",
    },
    {
        value: "recipe",
        titleKey: "inventoryPage.itemTypes.recipe.title",
        descKey: "inventoryPage.itemTypes.recipe.description",
    },
];

const normalizeInventoryType = (value) => {
    const v = String(value || "").trim();

    return [
        "none",
        "direct",
        "ingredient",
        "recipe",
    ].includes(v)
        ? v
        : "ingredient";
};

const getInventoryTypeLabel = (
    type,
    t
) => {
    const normalized =
        normalizeInventoryType(
            type
        );

    if (
        normalized ===
        "none"
    ) {
        return t(
            "inventoryPage.itemTypes.none.title"
        );
    }

    const found =
        INVENTORY_ITEM_TYPES.find(
            (item) =>
                item.value ===
                normalized
        );

    return found
        ? t(
            found.titleKey
        )
        : t(
            "inventoryPage.itemTypes.ingredient.title"
        );
};

const getUnitLabel = (
    unit,
    t
) => {
    const normalized =
        String(
            unit ||
            "unidad"
        ).trim();

    const keyMap = {
        unidad:
            "inventoryPage.units.unit",

        lb:
            "inventoryPage.units.lb",

        kg:
            "inventoryPage.units.kg",

        g:
            "inventoryPage.units.g",

        oz:
            "inventoryPage.units.oz",

        ml:
            "inventoryPage.units.ml",

        l:
            "inventoryPage.units.l",
    };

    return keyMap[
        normalized
        ]
        ? t(
            keyMap[
                normalized
                ]
        )
        : normalized;
};

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

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
        const res = await api.get("/api/dishes", {
            params: {
                page: 1,
                limit: 1000,
            },
        });

        const raw = res.data;

        const list =
            raw?.data?.items ||
            raw?.items ||
            raw?.dishes ||
            raw?.data ||
            raw;

        if (!Array.isArray(list)) return [];

        return list
            .filter((d) => d?._id && d?.name)
            .filter((d) => String(d.category || "").toLowerCase() !== "inventario")
            .filter((d) => normalizeInventoryType(d.inventoryType) !== "ingredient")
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    } catch (error) {
        console.error("[Inventory] Error cargando platos para inventario:", error);
        return [];
    }
}

function Badge({ children, tone = "neutral" }) {
    const cls =
        tone === "danger"
            ? "bg-red-500/15 text-red-200 border-red-500/30"
            : tone === "warning"
                ? "bg-sky-500/15 text-sky-200 border-sky-500/30"
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
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
            <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl">
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0b0b0c] z-10">
                    <div className="text-white text-xl font-bold pr-3">{title}</div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 shrink-0">
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-72px)]">
                    {children}
                </div>
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
// ============================================================
// HELPERS COMPARTIDOS
// Inventory + YieldMermaDashboard
// ============================================================

function getTimezoneOffsetMsGlobal(date, timezone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const values = {};

    parts.forEach((part) => {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    });

    const asUTC = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second)
    );

    const truncatedDate =
        Math.floor(date.getTime() / 1000) * 1000;

    return asUTC - truncatedDate;
}


function addDaysYMDGlobal(ymd, days) {
    const [
        year,
        month,
        day,
    ] = String(ymd)
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day + days
        )
    );

    return [
        date.getUTCFullYear(),
        String(
            date.getUTCMonth() + 1
        ).padStart(2, "0"),
        String(
            date.getUTCDate()
        ).padStart(2, "0"),
    ].join("-");
}


function toISOStartOfDayInTimezoneGlobal(
    ymd,
    localization = {}
) {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            String(ymd || "")
        )
    ) {
        return "";
    }

    const [
        year,
        month,
        day,
    ] = String(ymd)
        .split("-")
        .map(Number);

    const timezone =
        localization.timezone ||
        "America/Santo_Domingo";

    const wallClockUTC =
        Date.UTC(
            year,
            month - 1,
            day,
            0,
            0,
            0
        );

    let utcMillis =
        wallClockUTC;

    try {
        for (
            let i = 0;
            i < 3;
            i += 1
        ) {
            const offset =
                getTimezoneOffsetMsGlobal(
                    new Date(
                        utcMillis
                    ),
                    timezone
                );

            const corrected =
                wallClockUTC -
                offset;

            if (
                corrected ===
                utcMillis
            ) {
                break;
            }

            utcMillis =
                corrected;
        }

        return new Date(
            utcMillis
        ).toISOString();

    } catch {
        return new Date(
            wallClockUTC
        ).toISOString();
    }
}


function toISOEndOfDayInTimezoneGlobal(
    ymd,
    localization = {}
) {
    const nextYMD =
        addDaysYMDGlobal(
            ymd,
            1
        );

    const nextStart =
        toISOStartOfDayInTimezoneGlobal(
            nextYMD,
            localization
        );

    if (
        !nextStart
    ) {
        return "";
    }

    return new Date(
        new Date(
            nextStart
        ).getTime() - 1
    ).toISOString();
}


const getMovementTypeLabel = (
    type,
    t
) => {
    const keyMap = {
        purchase:
            "inventoryPage.movements.types.purchase",

        sale:
            "inventoryPage.movements.types.sale",

        waste:
            "inventoryPage.movements.types.waste",

        adjust:
            "inventoryPage.movements.types.adjust",

        transfer:
            "inventoryPage.movements.types.transfer",

        conversion:
            "inventoryPage.movements.types.conversion",
    };

    return keyMap[type]
        ? t(
            keyMap[type]
        )
        : type || "—";
};


const getRoleLabel = (
    role,
    t
) => {
    const keyMap = {
        Owner:
            "inventoryPage.roles.owner",

        Admin:
            "inventoryPage.roles.admin",

        Cajera:
            "inventoryPage.roles.cashier",

        Camarero:
            "inventoryPage.roles.waiter",

        Cocina:
            "inventoryPage.roles.kitchen",
    };

    return keyMap[role]
        ? t(
            keyMap[role]
        )
        : role || "";
};

export default function Inventory({
                                      plan,
                                      currentUser,
                                  }) {

    const { t } =
        useTranslation();

    const queryClient =
        useQueryClient();

    const { tenantInfo } =
        useTenant();

    const localization =
        getTenantLocalization(
            tenantInfo
        );

    const money = (value) =>
        formatMoney(
            value,
            localization
        );
    const getTimezoneOffsetMs = (
        date,
        timezone
    ) => {
        const parts =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone:
                    timezone,

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit",

                    hour:
                        "2-digit",

                    minute:
                        "2-digit",

                    second:
                        "2-digit",

                    hourCycle:
                        "h23",
                }
            ).formatToParts(
                date
            );

        const values = {};

        parts.forEach((part) => {
            if (
                part.type !==
                "literal"
            ) {
                values[part.type] =
                    part.value;
            }
        });

        const asUTC =
            Date.UTC(
                Number(values.year),
                Number(values.month) - 1,
                Number(values.day),
                Number(values.hour),
                Number(values.minute),
                Number(values.second)
            );

        const truncatedDate =
            Math.floor(
                date.getTime() /
                1000
            ) * 1000;

        return (
            asUTC -
            truncatedDate
        );
    };

    const addDaysYMD = (
        ymd,
        days
    ) => {
        const [
            year,
            month,
            day,
        ] =
            String(ymd)
                .split("-")
                .map(Number);

        const date =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day + days
                )
            );

        return [
            date.getUTCFullYear(),
            String(
                date.getUTCMonth() + 1
            ).padStart(2, "0"),
            String(
                date.getUTCDate()
            ).padStart(2, "0"),
        ].join("-");
    };

    const toISOStartOfDayInTimezone = (
        ymd,
        localization = {}
    ) => {
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(
                String(ymd || "")
            )
        ) {
            return "";
        }

        const [
            year,
            month,
            day,
        ] =
            String(ymd)
                .split("-")
                .map(Number);

        const timezone =
            localization.timezone ||
            "America/Santo_Domingo";

        const wallClockUTC =
            Date.UTC(
                year,
                month - 1,
                day,
                0,
                0,
                0
            );

        let utcMillis =
            wallClockUTC;

        try {
            for (
                let i = 0;
                i < 3;
                i += 1
            ) {
                const offset =
                    getTimezoneOffsetMs(
                        new Date(
                            utcMillis
                        ),
                        timezone
                    );

                const corrected =
                    wallClockUTC -
                    offset;

                if (
                    corrected ===
                    utcMillis
                ) {
                    break;
                }

                utcMillis =
                    corrected;
            }

            return new Date(
                utcMillis
            ).toISOString();
        } catch {
            return new Date(
                wallClockUTC
            ).toISOString();
        }
    };

    const toISOEndOfDayInTimezone = (
        ymd,
        localization = {}
    ) => {
        const nextYMD =
            addDaysYMD(
                ymd,
                1
            );

        const nextStart =
            toISOStartOfDayInTimezone(
                nextYMD,
                localization
            );

        if (!nextStart) {
            return "";
        }

        return new Date(
            new Date(
                nextStart
            ).getTime() - 1
        ).toISOString();
    };
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const reduxUserData = useSelector((state) => state.user.userData);

    const effectiveUser = currentUser || reduxUserData || {};
    const tenantId = effectiveUser?.tenantId || reduxUserData?.tenantId;

// Plan actual
    const rawPlan = String(plan || "").toLowerCase();
    const canUseInventory = ["premium", "estandar", "pro"].includes(rawPlan);

// Permisos del usuario
    const role = effectiveUser?.role;
    const userPermissions = effectiveUser?.permissions || {};

    const isOwnerOrAdmin = ["Owner", "Admin"].includes(role);
    const isCashier = role === "Cajera";

// Solo Owner/Admin pueden crear, editar, archivar o administrar artículos directos.
    const canManageInventoryItems = isOwnerOrAdmin;

// Permisos individuales para Cajera.
    const canInventoryEntry =
        isOwnerOrAdmin || (isCashier && userPermissions?.inventory?.entry === true);

    const canInventoryExit =
        isOwnerOrAdmin || (isCashier && userPermissions?.inventory?.exit === true);

    const canInventoryAdjust =
        isOwnerOrAdmin || (isCashier && userPermissions?.inventory?.adjust === true);

    const canInventoryWaste =
        isOwnerOrAdmin || (isCashier && userPermissions?.inventory?.waste === true);

// Proceso de merma/yield sigue solo para Owner/Admin.
    const canUseYieldProcess = isOwnerOrAdmin;

// Tabs avanzados siguen solo para Owner/Admin.
    const canViewAdvancedInventoryTabs = isOwnerOrAdmin;

    const qc = useQueryClient();

    const [tab, setTab] = useState("stock"); // stock | movements | consumption | merma | suppliers | categories
    React.useEffect(() => {
        if (!canViewAdvancedInventoryTabs && tab !== "stock") {
            setTab("stock");
        }
    }, [canViewAdvancedInventoryTabs, tab]);

    // STOCK filters
    const [stockFilters, setStockFilters] = useState({
        q: "",
        inventoryCategoryId: "",
        supplierId: "",
        includeArchived: false,
    });
    // Texto que el usuario escribe.
// Separamos esto de stockFilters.q para no hacer una petición por cada tecla.
    const [stockSearchInput, setStockSearchInput] = useState("");

// Exportación Excel
    const [exportMode, setExportMode] = useState("all");
    const [exportingExcel, setExportingExcel] = useState(false);
    // Debounce del buscador.
// Solo actualiza el filtro real 450ms después de que el usuario deje de escribir.
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const value = String(stockSearchInput || "").trim();

            setStockFilters((prev) => {
                if (prev.q === value) return prev;

                return {
                    ...prev,
                    q: value,
                };
            });
        }, 450);

        return () => clearTimeout(timer);
    }, [stockSearchInput]);

    const [page, setPage] = useState(1);

    const businessTodayYMD =
        getTodayYMD(
            localization
        );

    const [
        mermaYMD,
        setMermaYMD,
    ] =
        useState(
            () =>
                businessTodayYMD
        );

    const [
        mvFilters,
        setMvFilters,
    ] =
        useState(() => ({
            itemId: "",
            type: "",
            from:
            businessTodayYMD,
            to:
            businessTodayYMD,
        }));

    const [
        consFilters,
        setConsFilters,
    ] =
        useState(() => ({
            from:
            businessTodayYMD,
            to:
            businessTodayYMD,
            inventoryCategoryId:
                "",
        }));

    React.useEffect(() => {
        const today =
            getTodayYMD(
                localization
            );

        setMermaYMD(
            today
        );

        setMvFilters(
            (prev) => ({
                ...prev,
                from: today,
                to: today,
            })
        );

        setConsFilters(
            (prev) => ({
                ...prev,
                from: today,
                to: today,
            })
        );
    }, [
        localization.timezone,
    ]);

    const [consPage, setConsPage] = useState(1);
    const CONS_LIMIT = 20;

    // reset page when filters change
    React.useEffect(() => {
        setPage(1);
    }, [stockFilters.q, stockFilters.inventoryCategoryId, stockFilters.supplierId, stockFilters.includeArchived]);
    React.useEffect(() => {
        setConsPage(1);
    }, [
        consFilters.from,
        consFilters.to,
        consFilters.inventoryCategoryId,
    ]);

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

// Plantillas: platos existentes para modo "Basado en plato"
    const { data: dishTemplates = [] } = useQuery({
        queryKey: ["dish-templates", tenantId],
        queryFn: fetchDishTemplates,
        enabled: canUseInventory && Boolean(tenantId),
        staleTime: 60_000,
    });

// ✅ INGREDIENTES PARA RECETAS
// Fuente principal: /api/inventory/items porque los ingredientes reales viven ahí.
    const { data: ingredientsResp } = useQuery({
        queryKey: ["ingredients", tenantId],
        enabled: canUseInventory && Boolean(tenantId),
        queryFn: async () => {
            const res = await api.get("/api/inventory/items", {
                params: {
                    includeArchived: false,
                    limit: 1000,
                },
            });

            return res.data;
        },
        staleTime: 0,
        refetchOnMount: "always",
    });

    const ingredientsList = useMemo(() => {
        const raw =
            ingredientsResp?.items ||
            ingredientsResp?.data?.items ||
            ingredientsResp?.data ||
            ingredientsResp ||
            [];

        if (!Array.isArray(raw)) return [];

        return raw
            .filter((item) => {
                const type = normalizeInventoryType(item?.inventoryType);
                return type === "ingredient" || item?.isInventoryItem === true;
            })
            .filter((item) => item?._id && item?.name)
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }, [ingredientsResp]);

// ✅ ITEMS (esto faltaba en tu archivo, pero itemsResp se usa abajo)
    const { data: itemsResp, isLoading: itemsLoading, isFetching: itemsFetching } = useQuery({
        queryKey: ["inventory/items", tenantId, stockFilters, page],
        enabled: canUseInventory && Boolean(tenantId),

        queryFn: async () => {
            const params = {
                q: stockFilters?.q || "",
                inventoryCategoryId: stockFilters?.inventoryCategoryId || "",
                supplierId: stockFilters?.supplierId || "",
                includeArchived: Boolean(stockFilters?.includeArchived),
                page,
                limit: PAGE_SIZE,
            };

            const res = await api.get("/api/inventory/items", { params });
            return res.data;
        },

        staleTime: 10_000,

        // Mantiene los productos anteriores en pantalla mientras llega
        // el resultado nuevo.
        placeholderData: (previousData) => previousData,
    });
    // Si el backend todavía no pagina y devuelve todo, hacemos fallback client-side
    const totalFromBackend = useMemo(() => {
        const t = Number(itemsResp?.total ?? itemsResp?.count);
        return Number.isFinite(t) ? t : null;
    }, [itemsResp]);

    const availableIngredients = useMemo(() => {
        return (ingredientsList || [])
            .filter((x) => {
                const type = normalizeInventoryType(x?.inventoryType);
                return type === "ingredient" || x?.isInventoryItem === true;
            })
            .map((x) => ({
                _id: String(x._id),
                name: x.name,
                unit: x.unit || "unidad",
                stockCurrent: x.stockCurrent ?? 0,
            }))
            .filter((x) => x._id && x.name)
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }, [ingredientsList]);

    const rawItems = useMemo(() => {
        return Array.isArray(itemsResp?.items) ? itemsResp.items : [];
    }, [itemsResp]);
// ✅ Solo artículos reales de inventario
// Incluye ingredientes, productos directos y platos con receta.
// Antes se estaban ocultando platos nuevos porque no siempre tienen inventoryCategoryId.
    const inventoryOnly = useMemo(() => {
        return (rawItems || []).filter((it) => {
            const cat = String(it?.category || "").trim().toLowerCase();
            const type = String(it?.inventoryType || "none").trim().toLowerCase();

            const isIngredient =
                it?.isInventoryItem === true ||
                cat === "inventario" ||
                type === "ingredient";

            const isDirectStockProduct = type === "direct";
            const isRecipeProduct = type === "recipe";

            // Plato normal visible para poder activarlo con Entrada.
            const isInactiveMenuDish =
                type === "none" &&
                it?.isInventoryItem !== true &&
                cat !== "inventario";

            return (
                isIngredient ||
                isDirectStockProduct ||
                isRecipeProduct ||
                isInactiveMenuDish
            );
        });
    }, [rawItems]);

    const items = useMemo(() => {
        // Caso ideal: backend ya devolvió items paginados
        if (totalFromBackend !== null) return inventoryOnly;

        // Fallback: backend devuelve TODO, hacemos slice
        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return inventoryOnly.slice(start, end);
    }, [inventoryOnly, page, totalFromBackend]);

    const totalItems = useMemo(() => {
        return inventoryOnly.length;
    }, [inventoryOnly.length]);

    const pageCount = useMemo(() => Math.max(1, Math.ceil(totalItems / PAGE_SIZE)), [totalItems]);

    const metrics = useMemo(() => {
        const base = inventoryOnly;
        const total = base.length;

        const low = base.filter((x) => num(x.stockCurrent) <= num(x.stockMin)).length;

        const value = base.reduce(
            (acc, x) => acc + num(x.stockCurrent) * (num(x.avgCost) || num(x.lastCost) || 0),
            0
        );

        return { total, low, value };
    }, [inventoryOnly]);

    // CRUD modals
    const [itemModal, setItemModal] = useState({ open: false, mode: "create", item: null });
    const [mvModal, setMvModal] = useState({ open: false, type: "purchase", item: null, yield: false });

    // Create/update item
    // Create/update item
    const saveItemMutation = useMutation({
        mutationFn:
            async ({
                       mode,
                       id,
                       payload,
                   }) => {
                if (
                    mode ===
                    "create"
                ) {
                    const res =
                        await api.post(
                            "/api/inventory/items",
                            payload
                        );

                    return res.data;
                }

                const res =
                    await api.put(
                        `/api/inventory/items/${encodeURIComponent(
                            id
                        )}`,
                        payload
                    );

                return res.data;
            },

        onSuccess:
            async () => {
                enqueueSnackbar(
                    t(
                        "inventoryPage.messages.saved"
                    ),
                    {
                        variant:
                            "success",
                    }
                );

                setItemModal({
                    open:
                        false,

                    mode:
                        "create",

                    item:
                        null,
                });

                await qc.invalidateQueries({
                    queryKey: [
                        "inventory/items",
                    ],
                });

                await qc.invalidateQueries({
                    queryKey: [
                        "inventory/movements",
                    ],
                });

                await qc.invalidateQueries({
                    queryKey: [
                        "inventory/low-stock",
                    ],
                });

                await qc.invalidateQueries({
                    queryKey: [
                        "ingredients",
                    ],
                });

                await qc.invalidateQueries({
                    queryKey: [
                        "dish-templates",
                    ],
                });

                await qc.invalidateQueries({
                    queryKey: [
                        "dishes",
                    ],
                });
            },

        onError:
            (e) => {
                const status =
                    e?.response
                        ?.status;

                if (
                    status ===
                    409
                ) {
                    const msg =
                        e
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "inventoryPage.messages.duplicateItem"
                        );

                    enqueueSnackbar(
                        String(
                            msg
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );

                    return;
                }

                const msg =
                    e
                        ?.response
                        ?.data
                        ?.message ||
                    e
                        ?.response
                        ?.data ||
                    e
                        ?.message ||
                    t(
                        "inventoryPage.messages.saveError"
                    );

                enqueueSnackbar(
                    String(
                        msg
                    ),
                    {
                        variant:
                            "error",
                    }
                );
            },
    });


    const archiveItemMutation =
        useMutation({
            mutationFn:
                async (
                    id
                ) => {
                    const res =
                        await api.delete(
                            `/api/inventory/items/${encodeURIComponent(
                                id
                            )}`
                        );

                    return res.data;
                },

            onSuccess:
                async () => {
                    enqueueSnackbar(
                        t(
                            "inventoryPage.messages.archived"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );

                    await qc.invalidateQueries({
                        queryKey: [
                            "inventory/items",
                        ],
                    });
                },

            onError:
                (e) => {
                    const msg =
                        e
                            ?.response
                            ?.data
                            ?.message ||
                        e
                            ?.message ||
                        t(
                            "inventoryPage.messages.archiveError"
                        );

                    enqueueSnackbar(
                        String(
                            msg
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    const unarchiveItemMutation =
        useMutation({
            mutationFn:
                async (
                    id
                ) => {
                    const res =
                        await api.patch(
                            `/api/inventory/items/${encodeURIComponent(
                                id
                            )}/unarchive`
                        );

                    return res.data;
                },

            onSuccess:
                async () => {
                    enqueueSnackbar(
                        t(
                            "inventoryPage.messages.unarchived"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );

                    await qc.invalidateQueries({
                        queryKey: [
                            "inventory/items",
                        ],
                    });
                },

            onError:
                (e) => {
                    const msg =
                        e
                            ?.response
                            ?.data
                            ?.message ||
                        e
                            ?.message ||
                        t(
                            "inventoryPage.messages.unarchiveError"
                        );

                    enqueueSnackbar(
                        String(
                            msg
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    const createMovementMutation =
        useMutation({
            mutationFn:
                async (
                    payload
                ) => {
                    const res =
                        await api.post(
                            "/api/inventory/movements",
                            payload
                        );

                    return res.data;
                },

            onSuccess:
                async () => {
                    enqueueSnackbar(
                        t(
                            "inventoryPage.messages.movementCreated"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );

                    setMvModal({
                        open:
                            false,

                        type:
                            "purchase",

                        item:
                            null,

                        yield:
                            false,
                    });

                    await qc.invalidateQueries({
                        queryKey: [
                            "inventory/items",
                        ],
                    });

                    await qc.invalidateQueries({
                        queryKey: [
                            "inventory/movements",
                        ],
                    });

                    await qc.invalidateQueries({
                        queryKey: [
                            "inventory/low-stock",
                        ],
                    });
                },

            onError:
                (e) => {
                    const msg =
                        e
                            ?.response
                            ?.data
                            ?.message ||
                        e
                            ?.response
                            ?.data ||
                        e
                            ?.message ||
                        t(
                            "inventoryPage.messages.movementError"
                        );

                    enqueueSnackbar(
                        String(
                            msg
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


// Yield: Proceso de merma
    const createYieldMutation =
        useMutation({
            mutationFn:
                async ({
                           itemId,
                           purchasedQty,
                           totalCost,
                           finalQty,
                           steps,
                           note,
                           idempotencyKey,
                       }) => {
                    const res =
                        await api.post(
                            "/api/inventory/movements/yield",
                            {
                                itemId,
                                purchasedQty,
                                totalCost,
                                finalQty,
                                steps,
                                note,
                                idempotencyKey,
                            }
                        );

                    return res.data;
                },

            onSuccess:
                async (
                    _data,
                    vars
                ) => {
                    markYieldProcessed(
                        vars?.itemId
                    );

                    enqueueSnackbar(
                        t(
                            "inventoryPage.messages.yieldApplied"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );

                    setMvModal({
                        open:
                            false,

                        type:
                            "purchase",

                        item:
                            null,

                        yield:
                            false,
                    });

                    await qc.invalidateQueries({
                        queryKey: [
                            "inventory/items",
                        ],
                    });

                    await qc.invalidateQueries({
                        queryKey: [
                            "inventory/movements",
                        ],
                    });
                },

            onError:
                (e) => {
                    const msg =
                        e
                            ?.response
                            ?.data
                            ?.message ||
                        e
                            ?.response
                            ?.data ||
                        e
                            ?.message ||
                        t(
                            "inventoryPage.messages.yieldError"
                        );

                    enqueueSnackbar(
                        String(
                            msg
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });

    // MOVEMENTS list
    const { data: mvResp, isLoading: mvLoading } = useQuery({
        queryKey: [
            "inventory/movements",
            tenantId,
            mvFilters,
            localization.timezone,
        ],
        enabled: canUseInventory && Boolean(tenantId) && tab === "movements",
        queryFn: async () => {
            const res = await api.get("/api/inventory/movements", {
                params: {
                    itemId: mvFilters.itemId || undefined,
                    type: mvFilters.type || undefined,
                    from: mvFilters.from
                        ? toISOStartOfDayInTimezone(
                            mvFilters.from,
                            localization
                        )
                        : undefined,

                    to: mvFilters.to
                        ? toISOEndOfDayInTimezone(
                            mvFilters.to,
                            localization
                        )
                        : undefined,
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
        queryKey: [
            "inventory/consumption",
            tenantId,
            consFilters,
            consPage,
            localization.timezone,
        ],
        enabled: canUseInventory && Boolean(tenantId) && tab === "consumption",
        queryFn: async () => {
            const res = await api.get("/api/inventory/consumption", {
                params: {
                    from: consFilters.from
                        ? toISOStartOfDayInTimezone(
                            consFilters.from,
                            localization
                        )
                        : undefined,

                    to: consFilters.to
                        ? toISOEndOfDayInTimezone(
                            consFilters.to,
                            localization
                        )
                        : undefined,
                    inventoryCategoryId: consFilters.inventoryCategoryId || undefined,
                    page: consPage,
                    limit: CONS_LIMIT,
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
    const consPagination = consResp?.pagination || {
        page: consPage,
        limit: CONS_LIMIT,
        total: consumptionRows.length,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
    };

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
    // ---------- UI helpers ----------
    const openNewItem = () => {
        if (
            !canManageInventoryItems
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.permissions.createItem"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        setItemModal({
            open:
                true,

            mode:
                "create",

            item:
                null,
        });
    };


    const openEditItem = (
        it
    ) => {
        if (
            !canManageInventoryItems
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.permissions.editItem"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        setItemModal({
            open:
                true,

            mode:
                "edit",

            item:
            it,
        });
    };


    const maybeWarnYield = (
        item,
        onProceed
    ) => {
        if (
            !item?._id
        ) {
            return onProceed();
        }

        if (
            !wasYieldProcessed(
                item._id
            )
        ) {
            return onProceed();
        }

        const snackKey =
            enqueueSnackbar(
                t(
                    "inventoryPage.yield.alreadyProcessedQuestion"
                ),
                {
                    variant:
                        "info",

                    persist:
                        true,

                    action:
                        (
                            key
                        ) => (
                            <div className="flex gap-2">

                                <button
                                    className="px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-200 text-sm"
                                    onClick={() => {
                                        closeSnackbar(
                                            key
                                        );

                                        onProceed();
                                    }}
                                >
                                    {t(
                                        "inventoryPage.yield.processAnother"
                                    )}
                                </button>

                                <button
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm"
                                    onClick={() => {
                                        closeSnackbar(
                                            key
                                        );

                                        setMvModal({
                                            open:
                                                true,

                                            type:
                                                "waste",

                                            item,

                                            yield:
                                                false,
                                        });
                                    }}
                                >
                                    {t(
                                        "inventoryPage.yield.addWaste"
                                    )}
                                </button>

                                <button
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm"
                                    onClick={() =>
                                        closeSnackbar(
                                            key
                                        )
                                    }
                                >
                                    {t(
                                        "common.cancel"
                                    )}
                                </button>

                            </div>
                        ),
                }
            );

        return snackKey;
    };


    const [
        yieldDoneByItem,
        setYieldDoneByItem,
    ] =
        React.useState(
            () => {
                try {
                    return JSON.parse(
                        localStorage.getItem(
                            "yieldDoneByItem"
                        ) ||
                        "{}"
                    );
                } catch {
                    return {};
                }
            }
        );


    const markYieldDone = (
        itemId
    ) => {
        setYieldDoneByItem(
            (
                prev
            ) => {
                const next = {
                    ...prev,

                    [itemId]:
                        Date.now(),
                };

                localStorage.setItem(
                    "yieldDoneByItem",
                    JSON.stringify(
                        next
                    )
                );

                return next;
            }
        );
    };


    const confirmYieldIfAlreadyDone = (
        item,
        openYieldModalFn
    ) => {
        const itemId =
            item?._id ||
            item?.id;

        if (
            !itemId
        ) {
            return openYieldModalFn(
                item
            );
        }

        if (
            !yieldDoneByItem[
                itemId
                ]
        ) {
            return openYieldModalFn(
                item
            );
        }

        enqueueSnackbar(
            t(
                "inventoryPage.yield.processAgainQuestion"
            ),
            {
                variant:
                    "warning",

                persist:
                    true,

                action:
                    (
                        snackKey
                    ) => (
                        <div
                            style={{
                                display:
                                    "flex",

                                gap:
                                    8,
                            }}
                        >
                            <button
                                onClick={() => {
                                    closeSnackbar(
                                        snackKey
                                    );

                                    openYieldModalFn(
                                        item
                                    );
                                }}
                                style={{
                                    borderRadius:
                                        10,

                                    padding:
                                        "6px 10px",

                                    background:
                                        "rgba(255,255,255,0.12)",

                                    border:
                                        "1px solid rgba(255,255,255,0.18)",

                                    color:
                                        "white",

                                    cursor:
                                        "pointer",
                                }}
                            >
                                {t(
                                    "inventoryPage.yield.processAnotherShort"
                                )}
                            </button>

                            <button
                                onClick={() =>
                                    closeSnackbar(
                                        snackKey
                                    )
                                }
                                style={{
                                    borderRadius:
                                        10,

                                    padding:
                                        "6px 10px",

                                    background:
                                        "rgba(255,255,255,0.06)",

                                    border:
                                        "1px solid rgba(255,255,255,0.12)",

                                    color:
                                        "white",

                                    cursor:
                                        "pointer",
                                }}
                            >
                                {t(
                                    "common.close"
                                )}
                            </button>
                        </div>
                    ),
            }
        );
    };


    const openMovement = (
        type,
        item,
        useYield = false
    ) => {
        if (
            type ===
            "purchase" &&
            useYield &&
            !canUseYieldProcess
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.permissions.yield"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        if (
            type ===
            "purchase" &&
            !canInventoryEntry
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.permissions.entry"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        if (
            type ===
            "sale" &&
            !canInventoryExit
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.permissions.exit"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        if (
            type ===
            "adjust" &&
            !canInventoryAdjust
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.permissions.adjust"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        if (
            type ===
            "waste" &&
            !canInventoryWaste
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.permissions.waste"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        if (
            type ===
            "purchase" &&
            useYield
        ) {
            return maybeWarnYield(
                item,
                () =>
                    setMvModal({
                        open:
                            true,

                        type,

                        item,

                        yield:
                            true,
                    })
            );
        }

        setMvModal({
            open:
                true,

            type,

            item,

            yield:
                Boolean(
                    useYield
                ),
        });
    };
    const TabBtn = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl border text-sm inline-flex items-center gap-2 ${
                tab === id
                    ? "bg-sky-500/15 border-sky-500/30 text-sky-200"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
            }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
    // ============================================================
// EXPORTAR INVENTARIO A EXCEL
// ============================================================

    const getCategoryName = (item) => {
        // Si viene populated desde Mongo
        if (item?.inventoryCategoryId?.name) {
            return item.inventoryCategoryId.name;
        }

        const categoryId =
            item?.inventoryCategoryId?._id ||
            item?.inventoryCategoryId ||
            "";

        const found = (categories || []).find(
            (c) => String(c?._id) === String(categoryId)
        );

        return (
            found?.name ||
            t(
                "inventoryPage.common.noCategory"
            )
        );
    };

    const getSupplierName = (item) => {
        if (item?.supplierId?.name) return item.supplierId.name;
        if (item?.supplierId?.companyName) return item.supplierId.companyName;

        const supplierId =
            item?.supplierId?._id ||
            item?.supplierId ||
            "";

        const found = (suppliers || []).find(
            (sp) => String(sp?._id) === String(supplierId)
        );

        return (
            found?.name ||
            found?.companyName ||
            t(
                "inventoryPage.common.noSupplier"
            )
        );
    };

    const getExportTypeLabel = (
        item
    ) => {
        return getInventoryTypeLabel(
            item?.inventoryType,
            t
        );
    };

    const isInventoryRow = (item) => {
        const category = String(item?.category || "")
            .trim()
            .toLowerCase();

        const type = normalizeInventoryType(item?.inventoryType);

        const isIngredient =
            item?.isInventoryItem === true ||
            category === "inventario" ||
            type === "ingredient";

        const isDirect = type === "direct";
        const isRecipe = type === "recipe";

        const isInactiveMenuDish =
            type === "none" &&
            item?.isInventoryItem !== true &&
            category !== "inventario";

        return (
            isIngredient ||
            isDirect ||
            isRecipe ||
            isInactiveMenuDish
        );
    };

    const fetchAllInventoryForExport = async () => {
        const limit = 500;

        let currentPage = 1;
        let collected = [];

        const seenIds = new Set();

        // Para exportar por categoría utilizamos la categoría
        // actualmente seleccionada en el filtro.
        const categoryId =
            exportMode === "category"
                ? stockFilters.inventoryCategoryId
                : "";

        while (currentPage <= 100) {
            const res = await api.get("/api/inventory/items", {
                params: {
                    page: currentPage,
                    limit,

                    inventoryCategoryId:
                        categoryId || undefined,

                    // Respetamos la selección actual de archivados.
                    includeArchived: Boolean(
                        stockFilters.includeArchived
                    ),
                },
            });

            const raw = res?.data;

            const pageItems =
                raw?.items ||
                raw?.data?.items ||
                (Array.isArray(raw?.data) ? raw.data : []);

            if (!Array.isArray(pageItems)) {
                break;
            }

            let newItemsAdded = 0;

            for (const item of pageItems) {
                const id = String(item?._id || "");

                // Evita duplicados si el backend todavía
                // no soporta paginación correctamente.
                if (id && seenIds.has(id)) {
                    continue;
                }

                if (id) {
                    seenIds.add(id);
                }

                collected.push(item);
                newItemsAdded += 1;
            }

            const backendTotal = Number(
                raw?.total ??
                raw?.count ??
                raw?.pagination?.total
            );

            // Backend con paginación.
            if (
                Number.isFinite(backendTotal) &&
                collected.length >= backendTotal
            ) {
                break;
            }

            // Última página.
            if (pageItems.length < limit) {
                break;
            }

            // Protección si el backend devuelve siempre la misma página.
            if (newItemsAdded === 0) {
                break;
            }

            currentPage += 1;
        }

        // Aplicamos el mismo criterio que usa tu tabla.
        collected = collected.filter(isInventoryRow);

        // Productos = artículos que realmente son productos/platos
        // manejados por inventario.
        if (exportMode === "products") {
            collected = collected.filter((item) => {
                const type = normalizeInventoryType(
                    item?.inventoryType
                );

                return type === "direct" || type === "recipe";
            });
        }

        // Protección adicional por categoría.
        if (exportMode === "category") {
            collected = collected.filter((item) => {
                const itemCategoryId =
                    item?.inventoryCategoryId?._id ||
                    item?.inventoryCategoryId ||
                    "";

                return (
                    String(itemCategoryId) ===
                    String(stockFilters.inventoryCategoryId)
                );
            });
        }

        return collected;
    };

    const handleExportExcel = async () => {
        if (exportingExcel) return;

        if (
            exportMode === "category" &&
            !stockFilters.inventoryCategoryId
        ) {
            enqueueSnackbar(
                t(
                    "inventoryPage.export.selectCategoryFirst"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        try {
            setExportingExcel(true);

            const exportItems =
                await fetchAllInventoryForExport();

            if (!exportItems.length) {
                enqueueSnackbar(
                    t(
                        "inventoryPage.export.noRecords"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }

            const excelRows = exportItems.map((item) => {
                const type = normalizeInventoryType(
                    item?.inventoryType
                );

                const stock =
                    item?.stockCurrent === null ||
                    item?.stockCurrent === undefined
                        ? 0
                        : num(item.stockCurrent);

                const stockMin =
                    item?.stockMin === null ||
                    item?.stockMin === undefined
                        ? 0
                        : num(item.stockMin);

                const lastCost = num(item?.lastCost);
                const avgCost = num(item?.avgCost);

                const effectiveCost =
                    avgCost || lastCost || 0;

                const inventoryValue =
                    stock * effectiveCost;

                const isInactiveInventory =
                    type === "none" &&
                    item?.isInventoryItem !== true &&
                    String(item?.category || "")
                        .trim()
                        .toLowerCase() !== "inventario";

                const isLow =
                    !isInactiveInventory &&
                    stock <= stockMin;

                const status =
                    isInactiveInventory
                        ? t(
                            "inventoryPage.status.noInventory"
                        )
                        : isLow
                            ? t(
                                "inventoryPage.status.lowStock"
                            )
                            : t(
                                "inventoryPage.status.ok"
                            );

                return {
                    [t(
                        "inventoryPage.export.columns.item"
                    )]:
                        item?.name ||
                        "",

                    [t(
                        "inventoryPage.export.columns.type"
                    )]:
                        getExportTypeLabel(
                            item
                        ),

                    [t(
                        "inventoryPage.export.columns.category"
                    )]:
                        getCategoryName(
                            item
                        ),

                    [t(
                        "inventoryPage.export.columns.unit"
                    )]:
                        getUnitLabel(
                            item?.unit ||
                            "unidad",
                            t
                        ),

                    [t(
                        "inventoryPage.export.columns.currentStock"
                    )]:
                    stock,

                    [t(
                        "inventoryPage.export.columns.minimumStock"
                    )]:
                    stockMin,

                    [t(
                        "inventoryPage.export.columns.lastCost"
                    )]:
                    lastCost,

                    [t(
                        "inventoryPage.export.columns.averageCost"
                    )]:
                    avgCost,

                    [t(
                        "inventoryPage.export.columns.usedCost"
                    )]:
                    effectiveCost,

                    [t(
                        "inventoryPage.export.columns.inventoryValue"
                    )]:
                    inventoryValue,

                    [t(
                        "inventoryPage.export.columns.supplier"
                    )]:
                        getSupplierName(
                            item
                        ),

                    [t(
                        "inventoryPage.export.columns.status"
                    )]:
                    status,

                    [t(
                        "inventoryPage.export.columns.archived"
                    )]:
                        item?.isArchived
                            ? t(
                                "inventoryPage.common.yes"
                            )
                            : t(
                                "inventoryPage.common.no"
                            ),

                    [t(
                        "inventoryPage.export.columns.id"
                    )]:
                        item?._id ||
                        "",
                };
            });

            const workbook = XLSX.utils.book_new();

            const worksheet =
                XLSX.utils.json_to_sheet(excelRows);

            // Ancho de columnas
            worksheet["!cols"] = [
                { wch: 32 }, // artículo
                { wch: 28 }, // tipo
                { wch: 24 }, // categoría
                { wch: 12 }, // unidad
                { wch: 14 }, // stock
                { wch: 14 }, // mínimo
                { wch: 16 }, // último costo
                { wch: 16 }, // costo promedio
                { wch: 16 }, // costo utilizado
                { wch: 18 }, // valor inventario
                { wch: 26 }, // proveedor
                { wch: 16 }, // estado
                { wch: 12 }, // archivado
                { wch: 28 }, // id
            ];

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                t(
                    "inventoryPage.export.sheetName"
                )
            );

            const today =
                getTodayYMD(
                    localization
                );

            let exportName =
                t(
                    "inventoryPage.export.fileNames.all"
                );

            if (exportMode === "products") {
                exportName =
                    t(
                        "inventoryPage.export.fileNames.products"
                    );
            }

            if (exportMode === "category") {
                const category = (categories || []).find(
                    (c) =>
                        String(c?._id) ===
                        String(stockFilters.inventoryCategoryId)
                );

                exportName =
                    category?.name ||
                    t(
                        "inventoryPage.export.fileNames.category"
                    );
            }

            // Limpiamos caracteres inválidos para nombre de archivo.
            exportName = String(exportName)
                .replace(/[\\/:*?"<>|]/g, "-")
                .replace(/\s+/g, "_");

            XLSX.writeFile(
                workbook,
                `${t(
                    "inventoryPage.export.filePrefix"
                )}_${exportName}_${today}.xlsx`
            );

            enqueueSnackbar(
                t(
                    "inventoryPage.export.success",
                    {
                        count:
                        excelRows.length,
                    }
                ),
                {
                    variant:
                        "success",
                }
            );
        } catch (error) {
            console.error(
                "[Inventory] Error exportando Excel:",
                error
            );

            enqueueSnackbar(
                error?.response?.data?.message ||
                error?.message ||
                t(
                    "inventoryPage.export.error"
                ),
                { variant: "error" }
            );
        } finally {
            setExportingExcel(false);
        }
    };

    // ---------- Guard: plan ----------
    if (!canUseInventory) {
        return (
            <div className="p-6">
                <div className={`${cardCls} p-6`}>
                    <div className="text-white text-lg font-semibold">
                        {t("inventoryPage.title")}
                    </div>

                    <div className="text-white/70 mt-1">
                        {t("inventoryPage.plan.restricted")}
                    </div>
                </div>
            </div>
        );
    }


    // ---------- Render ----------
    return (
        <div className="inventory-panel min-w-0 p-1 sm:p-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="text-white text-2xl font-semibold">
                        {t(
                            "inventoryPage.title"
                        )}
                    </div>

                    <div className="text-white/60">
                        {t(
                            "inventoryPage.subtitle"
                        )}
                    </div>

                    <div className="text-white/40 text-xs mt-1">
                        {t(
                            "inventoryPage.help.costs"
                        )}

                        <br />

                        {t(
                            "inventoryPage.help.minimumStock"
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">

                    <TabBtn
                        id="stock"
                        icon={Package}
                        label={t(
                            "inventoryPage.tabs.stock"
                        )}
                    />

                    {canViewAdvancedInventoryTabs && (
                        <>
                            <TabBtn
                                id="movements"
                                icon={History}
                                label={t(
                                    "inventoryPage.tabs.movements"
                                )}
                            />

                            <TabBtn
                                id="consumption"
                                icon={BarChart3}
                                label={t(
                                    "inventoryPage.tabs.consumption"
                                )}
                            />

                            <TabBtn
                                id="merma"
                                icon={Trash2}
                                label={t(
                                    "inventoryPage.tabs.waste"
                                )}
                            />

                            <TabBtn
                                id="suppliers"
                                icon={SlidersHorizontal}
                                label={t(
                                    "inventoryPage.tabs.suppliers"
                                )}
                            />

                            <TabBtn
                                id="categories"
                                icon={SlidersHorizontal}
                                label={t(
                                    "inventoryPage.tabs.categories"
                                )}
                            />
                        </>
                    )}

                </div>
            </div>

            {/* METRICS */}
            {tab === "stock" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className={`${cardCls} p-4`}>
                        <div className="text-white/60 text-sm">
                            {t(
                                "inventoryPage.metrics.items"
                            )}
                        </div>
                        <div className="text-white text-2xl font-semibold">{metrics.total}</div>
                    </div>
                    <div className={`${cardCls} p-4`}>
                        <div className="text-white/60 text-sm">
                            {t(
                                "inventoryPage.metrics.lowStock"
                            )}
                        </div>
                        <div className="text-white text-2xl font-semibold">{metrics.low}</div>
                    </div>
                    <div className={`${cardCls} p-4`}>
                        <div className="text-white/60 text-sm">
                            {t(
                                "inventoryPage.metrics.estimatedValue"
                            )}
                        </div>
                        <div className="text-white text-2xl font-semibold">{money(metrics.value)}</div>
                    </div>
                </div>
            )}

            {/* STOCK TAB */}
            {tab === "stock" && (
                <div className={`${cardCls} p-4 mt-4`}>
                    <div className="space-y-4">

                        {/* ===================================================== */}
                        {/* FILTROS */}
                        {/* ===================================================== */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

                            {/* BUSCAR */}
                            <div className="min-w-0">
                                <div className="text-white/60 text-xs mb-1.5">
                                    {t(
                                        "inventoryPage.filters.search"
                                    )}
                                </div>

                                <input
                                    className={inputCls}
                                    placeholder={t(
                                        "inventoryPage.filters.searchPlaceholder"
                                    )}
                                    value={stockSearchInput}
                                    onChange={(e) => setStockSearchInput(e.target.value)}
                                />

                                {itemsFetching && stockFilters.q && (
                                    <div className="text-[11px] text-sky-200/60 mt-1">
                                        {t(
                                            "inventoryPage.filters.searching"
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* CATEGORÍA */}
                            <div className="min-w-0">
                                <div className="text-white/60 text-xs mb-1.5">
                                    {t(
                                        "inventoryPage.filters.category"
                                    )}
                                </div>

                                <select
                                    className={selectCls}
                                    value={stockFilters.inventoryCategoryId}
                                    onChange={(e) =>
                                        setStockFilters((s) => ({
                                            ...s,
                                            inventoryCategoryId: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        {t(
                                            "inventoryPage.filters.allCategories"
                                        )}
                                    </option>

                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* PROVEEDOR */}
                            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                                <div className="text-white/60 text-xs mb-1.5">
                                    {t(
                                        "inventoryPage.filters.supplier"
                                    )}
                                </div>

                                <select
                                    className={selectCls}
                                    value={stockFilters.supplierId}
                                    onChange={(e) =>
                                        setStockFilters((s) => ({
                                            ...s,
                                            supplierId: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        {t(
                                            "inventoryPage.filters.allSuppliers"
                                        )}
                                    </option>
                                    {suppliers.map((sp) => (
                                        <option key={sp._id} value={sp._id}>
                                            {sp.name ||
                                                sp.companyName ||
                                                t(
                                                    "inventoryPage.common.supplier"
                                                )}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ===================================================== */}
                        {/* ACCIONES */}
                        {/* ===================================================== */}
                        <div className="flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-white/5">

                            <div className="flex flex-wrap items-end gap-2">

                                <div className="w-full sm:w-[230px]">
                                    <div className="text-white/60 text-xs mb-1.5">
                                        {t(
                                            "inventoryPage.export.label"
                                        )}
                                    </div>

                                    <select
                                        value={exportMode}
                                        onChange={(e) =>
                                            setExportMode(
                                                e.target.value
                                            )
                                        }
                                        className={selectCls}
                                    >
                                        <option value="all">
                                            {t(
                                                "inventoryPage.export.options.all"
                                            )}
                                        </option>

                                        <option value="category">
                                            {t(
                                                "inventoryPage.export.options.category"
                                            )}
                                        </option>

                                        <option value="products">
                                            {t(
                                                "inventoryPage.export.options.products"
                                            )}
                                        </option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    disabled={exportingExcel}
                                    className={`h-[46px] px-4 rounded-xl border inline-flex items-center justify-center gap-2 whitespace-nowrap ${
                                        exportingExcel
                                            ? "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
                                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20"
                                    }`}
                                >
                                    <FileSpreadsheet className="w-4 h-4 shrink-0" />

                                    {exportingExcel
                                        ? t(
                                            "inventoryPage.export.exporting"
                                        )
                                        : t(
                                            "inventoryPage.export.button"
                                        )}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 xl:justify-end">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setStockFilters((s) => ({
                                            ...s,
                                            includeArchived:
                                                !s.includeArchived,
                                        }))
                                    }
                                    className={`h-[46px] px-4 rounded-xl border inline-flex items-center justify-center gap-2 whitespace-nowrap ${
                                        stockFilters.includeArchived
                                            ? "bg-sky-500/15 border-sky-500/30 text-sky-200"
                                            : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                                    }`}
                                >
                                    <Archive className="w-4 h-4 shrink-0" />

                                    {stockFilters.includeArchived
                                        ? t(
                                            "inventoryPage.archive.showing"
                                        )
                                        : t(
                                            "inventoryPage.archive.hiding"
                                        )}
                                </button>

                                {canManageInventoryItems && (
                                    <button
                                        type="button"
                                        onClick={openNewItem}
                                        className="h-[46px] px-4 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 inline-flex items-center justify-center gap-2 whitespace-nowrap hover:bg-sky-500/20"
                                    >
                                        <Plus className="w-4 h-4 shrink-0" />

                                        {t(
                                            "inventoryPage.actions.newItem"
                                        )}
                                    </button>
                                )}

                            </div>

                        </div>
                    </div>

                    {/* Desktop table */}
                    <div className="inventory-stock mt-4">
                        <table className="inventory-stock-table w-full text-base">
                            <thead>
                            <tr className="text-left text-white/80 border-b border-white/10">

                                <th className="py-3 pr-4 min-w-[220px] text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.item"
                                    )}
                                </th>

                                <th className="py-3 pr-4 text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.unit"
                                    )}
                                </th>

                                <th className="py-3 pr-4 text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.stock"
                                    )}
                                </th>

                                <th className="py-3 pr-4 text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.minimum"
                                    )}
                                </th>

                                <th className="py-3 pr-4 text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.averageCost"
                                    )}
                                </th>

                                <th className="py-3 pr-4 text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.supplier"
                                    )}
                                </th>

                                <th className="py-3 pr-4 text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.status"
                                    )}
                                </th>

                                <th className="py-3 pr-0 min-w-[170px] w-[170px] text-right text-base font-semibold">
                                    {t(
                                        "inventoryPage.table.actions"
                                    )}
                                </th>

                            </tr>
                            </thead>

                            <tbody>
                            {itemsLoading ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-white/60">
                                        {t(
                                            "inventoryPage.common.loading"
                                        )}
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-white/60">
                                        {t(
                                            "inventoryPage.stock.empty"
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                items.map((it) => {
                                    const type = String(it?.inventoryType || "none").trim().toLowerCase();

                                    const isInactiveInventory =
                                        type === "none" &&
                                        it?.isInventoryItem !== true &&
                                        String(it?.category || "").trim().toLowerCase() !== "inventario";

                                    const isLow =
                                        !isInactiveInventory &&
                                        num(it.stockCurrent) <= num(it.stockMin);
                                    const providerName =
                                        it?.supplierId?.name ||
                                        it?.supplierId?.companyName ||
                                        (
                                            typeof it?.supplierId === "string"
                                                ? t(
                                                    "inventoryPage.common.supplier"
                                                )
                                                : "—"
                                        );
                                    return (
                                        <tr key={it._id} className="border-b border-white/5">
                                            <td data-label={t("inventoryPage.table.item")} className="py-4 pr-4">
                                                <div className="text-white font-semibold text-base leading-tight">
                                                    {it.name}
                                                </div>

                                                <div className="text-white/30 text-xs mt-1 truncate max-w-[220px]">
                                                    {it._id}
                                                </div>
                                            </td>
                                            <td data-label={t("inventoryPage.table.unit")} className="py-4 pr-4 text-white text-base font-medium">
                                                {getUnitLabel(
                                                    it.unit || "unidad",
                                                    t
                                                )}
                                            </td>
                                            <td data-label={t("inventoryPage.table.stock")}
                                                className={`py-4 pr-4 text-base font-semibold ${
                                                    num(it.stockCurrent) < 0
                                                        ? "text-red-400"
                                                        : "text-white"
                                                }`}
                                            >
                                                {it.stockCurrent === null || it.stockCurrent === undefined
                                                    ? "—"
                                                    : num(it.stockCurrent)}
                                            </td>
                                            <td data-label={t("inventoryPage.table.minimum")} className="py-4 pr-4 text-white text-base">
                                                {it.stockMin === null || it.stockMin === undefined ? "—" : num(it.stockMin)}
                                            </td>
                                            <td data-label={t("inventoryPage.table.averageCost")} className="py-4 pr-4 text-white text-base font-medium">

                                            {money(num(it.avgCost) || num(it.lastCost) || 0)}
                                            </td>
                                            <td data-label={t("inventoryPage.table.supplier")} className="py-4 pr-4 text-white text-base">{providerName}</td>
                                            <td data-label={t("inventoryPage.table.status")} className="py-4 pr-4 align-middle">
                                                {isInactiveInventory ? (
                                                    <Badge tone="warning">
                                                        {t(
                                                            "inventoryPage.status.noInventory"
                                                        )}
                                                    </Badge>
                                                ) : isLow ? (
                                                    <Badge tone="warning">
                                                        {t(
                                                            "inventoryPage.status.lowStock"
                                                        )}
                                                    </Badge>
                                                ) : (
                                                    <Badge>
                                                        {t(
                                                            "inventoryPage.status.ok"
                                                        )}
                                                    </Badge>
                                                )}
                                            </td>

                                            <td data-label={t("inventoryPage.table.actions")} className="py-4 pr-0 align-top">
                                                <div className="flex flex-col items-end gap-2">
                                                    {canInventoryEntry && (
                                                        <button
                                                            onClick={() => openMovement("purchase", it, false)}
                                                            className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center justify-center gap-2 text-center leading-tight whitespace-normal"
                                                        >
                                                            <ArrowDownCircle className="w-4 h-4 shrink-0" />
                                                            {t(
                                                                "inventoryPage.actions.entry"
                                                            )}
                                                        </button>
                                                    )}

                                                    {canInventoryExit && !isInactiveInventory && (
                                                        <button
                                                            onClick={() => openMovement("sale", it, false)}
                                                            className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center justify-center gap-2 text-center leading-tight whitespace-normal"
                                                        >
                                                            <ArrowUpCircle className="w-4 h-4 shrink-0" />
                                                            {t(
                                                                "inventoryPage.actions.exit"
                                                            )}
                                                        </button>
                                                    )}

                                                    {canUseYieldProcess && !isInactiveInventory && (
                                                        <button
                                                            onClick={() => openMovement("purchase", it, true)}
                                                            className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center justify-center text-center leading-tight whitespace-normal"
                                                        >
                                                            {t(
                                                                "inventoryPage.actions.yieldProcess"
                                                            )}
                                                        </button>
                                                    )}

                                                    {canInventoryAdjust && !isInactiveInventory && (
                                                        <button
                                                            onClick={() => openMovement("adjust", it, false)}
                                                            className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center justify-center gap-2 text-center leading-tight whitespace-normal"
                                                        >
                                                            <SlidersHorizontal className="w-4 h-4 shrink-0" />
                                                            {t(
                                                                "inventoryPage.actions.adjust"
                                                            )}
                                                        </button>
                                                    )}

                                                    {canInventoryWaste && !isInactiveInventory && (
                                                        <button
                                                            onClick={() => openMovement("waste", it, false)}
                                                            className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center justify-center gap-2 text-center leading-tight whitespace-normal"
                                                        >
                                                            <ArrowUpCircle className="w-4 h-4 shrink-0" />
                                                            {t(
                                                                "inventoryPage.actions.waste"
                                                            )}
                                                        </button>
                                                    )}

                                                    {canManageInventoryItems && (
                                                        <button
                                                            onClick={() => openEditItem(it)}
                                                            className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 inline-flex items-center justify-center text-center leading-tight whitespace-normal"
                                                        >
                                                            {t(
                                                                "inventoryPage.actions.edit"
                                                            )}
                                                        </button>
                                                    )}

                                                    {canManageInventoryItems &&
                                                        (it.isArchived ? (
                                                            <button
                                                                onClick={() => unarchiveItemMutation.mutate(it._id)}
                                                                className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 inline-flex items-center justify-center text-center leading-tight whitespace-normal"
                                                            >
                                                                {t(
                                                                    "inventoryPage.actions.unarchive"
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => archiveItemMutation.mutate(it._id)}
                                                                className="w-[148px] min-h-[42px] px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 inline-flex items-center justify-center gap-2 text-center leading-tight whitespace-normal"
                                                            >
                                                                <Trash2 className="w-4 h-4 shrink-0" />
                                                                {t(
                                                                    "inventoryPage.actions.archive"
                                                                )}
                                                            </button>
                                                        ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-white/60 text-sm">

                            {t(
                                "inventoryPage.pagination.page"
                            )}{" "}

                            <b className="text-white">
                                {page}
                            </b>{" "}

                            {t(
                                "inventoryPage.pagination.of"
                            )}{" "}

                            <b className="text-white">
                                {pageCount}
                            </b>

                            {" · "}

                            {t(
                                "inventoryPage.pagination.total"
                            )}
                            :{" "}

                            <b className="text-white">
                                {totalItems}
                            </b>

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
                                {t(
                                    "inventoryPage.pagination.previous"
                                )}
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
                                {t(
                                    "inventoryPage.pagination.next"
                                )}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOVEMENTS TAB */}

            {/* MOVEMENTS TAB */}
            {tab === "movements" && (
                <div className={`${cardCls} p-4 mt-4`}>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

                        <div>
                            <div className="text-white/60 text-xs mb-1">
                                {t(
                                    "inventoryPage.movements.filters.item"
                                )}
                            </div>

                            <select
                                className={selectCls}
                                value={
                                    mvFilters.itemId
                                }
                                onChange={(e) =>
                                    setMvFilters(
                                        (state) => ({
                                            ...state,
                                            itemId:
                                            e.target.value,
                                        })
                                    )
                                }
                            >

                                <option value="">
                                    {t(
                                        "inventoryPage.movements.filters.allItems"
                                    )}
                                </option>

                                {rawItems.map(
                                    (it) => (
                                        <option
                                            key={
                                                it._id
                                            }
                                            value={
                                                it._id
                                            }
                                        >
                                            {it.name}
                                        </option>
                                    )
                                )}

                            </select>
                        </div>


                        <div>
                            <div className="text-white/60 text-xs mb-1">
                                {t(
                                    "inventoryPage.movements.filters.type"
                                )}
                            </div>

                            <select
                                className={selectCls}
                                value={
                                    mvFilters.type
                                }
                                onChange={(e) =>
                                    setMvFilters(
                                        (state) => ({
                                            ...state,
                                            type:
                                            e.target.value,
                                        })
                                    )
                                }
                            >

                                <option value="">
                                    {t(
                                        "inventoryPage.movements.filters.allTypes"
                                    )}
                                </option>

                                {[
                                    "purchase",
                                    "sale",
                                    "waste",
                                    "adjust",
                                    "transfer",
                                    "conversion",
                                ].map(
                                    (
                                        movementType
                                    ) => (
                                        <option
                                            key={
                                                movementType
                                            }
                                            value={
                                                movementType
                                            }
                                        >
                                            {getMovementTypeLabel(
                                                movementType,
                                                t
                                            )}
                                        </option>
                                    )
                                )}

                            </select>
                        </div>


                        <div>
                            <div className="text-white/60 text-xs mb-1">
                                {t(
                                    "inventoryPage.common.from"
                                )}
                            </div>

                            <input
                                type="date"
                                className={inputCls}
                                value={
                                    mvFilters.from
                                }
                                onChange={(e) =>
                                    setMvFilters(
                                        (state) => ({
                                            ...state,
                                            from:
                                            e.target.value,
                                        })
                                    )
                                }
                            />
                        </div>


                        <div>
                            <div className="text-white/60 text-xs mb-1">
                                {t(
                                    "inventoryPage.common.to"
                                )}
                            </div>

                            <input
                                type="date"
                                className={inputCls}
                                value={
                                    mvFilters.to
                                }
                                onChange={(e) =>
                                    setMvFilters(
                                        (state) => ({
                                            ...state,
                                            to:
                                            e.target.value,
                                        })
                                    )
                                }
                            />
                        </div>


                        <div className="flex items-end">

                            <button
                                type="button"
                                onClick={() =>
                                    qc.invalidateQueries({
                                        queryKey: [
                                            "inventory/movements",
                                        ],
                                    })
                                }
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                            >
                                {t(
                                    "inventoryPage.common.refresh"
                                )}
                            </button>

                        </div>

                    </div>


                    <div className="mt-4 overflow-x-auto">

                        <table className="w-full text-[15px]">

                            <thead>
                            <tr className="text-left text-white/60 border-b border-white/10">

                                <th className="py-3 pr-4 min-w-[160px]">
                                    {t(
                                        "inventoryPage.movements.table.date"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.movements.table.type"
                                    )}
                                </th>

                                <th className="py-3 pr-4 min-w-[220px]">
                                    {t(
                                        "inventoryPage.movements.table.item"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.movements.table.quantity"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.movements.table.before"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.movements.table.after"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.movements.table.cost"
                                    )}
                                </th>

                                <th className="py-3 pr-4 min-w-[140px]">
                                    {t(
                                        "inventoryPage.movements.table.user"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.movements.table.note"
                                    )}
                                </th>

                            </tr>
                            </thead>


                            <tbody>

                            {mvLoading ? (

                                <tr>
                                    <td
                                        colSpan={9}
                                        className="py-6 text-white/60"
                                    >
                                        {t(
                                            "inventoryPage.common.loading"
                                        )}
                                    </td>
                                </tr>

                            ) : movements.length ===
                            0 ? (

                                <tr>
                                    <td
                                        colSpan={9}
                                        className="py-6 text-white/60"
                                    >
                                        {t(
                                            "inventoryPage.movements.empty"
                                        )}
                                    </td>
                                </tr>

                            ) : (

                                movements.map(
                                    (m) => (

                                        <tr
                                            key={
                                                m._id
                                            }
                                            className="border-b border-white/5"
                                        >

                                            <td className="py-3 pr-4 text-white/80">

                                                {m.createdAt
                                                    ? formatDateTime(
                                                        m.createdAt,
                                                        localization
                                                    )
                                                    : "—"
                                                }

                                            </td>


                                            <td className="py-3 pr-4 text-white/80">

                                                {getMovementTypeLabel(
                                                    m.type,
                                                    t
                                                )}

                                            </td>


                                            <td className="py-3 pr-4 text-white/80">

                                                {m.itemName ||
                                                    m
                                                        ?.itemId
                                                        ?.name ||
                                                    "—"
                                                }

                                            </td>


                                            <td className="py-3 pr-4 text-white/80">
                                                {num(
                                                    m.qty
                                                )}
                                            </td>


                                            <td className="py-3 pr-4 text-white/80">
                                                {num(
                                                    m.beforeStock
                                                )}
                                            </td>


                                            <td className="py-3 pr-4 text-white/80">
                                                {num(
                                                    m.afterStock
                                                )}
                                            </td>


                                            <td className="py-3 pr-4 text-white/80">

                                                {money(
                                                    num(
                                                        m.costAmount
                                                    ) ||
                                                    0
                                                )}

                                            </td>


                                            <td className="py-3 pr-4 text-white/80">

                                                {m
                                                        ?.createdBy
                                                        ?.name ||
                                                    m
                                                        ?.createdByName ||
                                                    t(
                                                        "inventoryPage.roles.system"
                                                    )
                                                }

                                                {m
                                                    ?.createdBy
                                                    ?.role && (

                                                    <div className="text-xs text-white/40">

                                                        {getRoleLabel(
                                                            m
                                                                .createdBy
                                                                .role,
                                                            t
                                                        )}

                                                    </div>

                                                )}

                                            </td>


                                            <td className="py-3 pr-4 text-white/60">
                                                {m.note ||
                                                    "—"
                                                }
                                            </td>

                                        </tr>

                                    )
                                )

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
                            <div className="text-white/60 text-xs mb-1">
                                {t(
                                    "inventoryPage.common.from"
                                )}
                            </div>

                            <input
                                type="date"
                                className={inputCls}
                                value={
                                    consFilters.from
                                }
                                onChange={(e) =>
                                    setConsFilters(
                                        (state) => ({
                                            ...state,
                                            from:
                                            e.target.value,
                                        })
                                    )
                                }
                            />
                        </div>


                        <div>
                            <div className="text-white/60 text-xs mb-1">
                                {t(
                                    "inventoryPage.common.to"
                                )}
                            </div>

                            <input
                                type="date"
                                className={inputCls}
                                value={
                                    consFilters.to
                                }
                                onChange={(e) =>
                                    setConsFilters(
                                        (state) => ({
                                            ...state,
                                            to:
                                            e.target.value,
                                        })
                                    )
                                }
                            />
                        </div>


                        <div>
                            <div className="text-white/60 text-xs mb-1">
                                {t(
                                    "inventoryPage.filters.category"
                                )}
                            </div>

                            <select
                                className={selectCls}
                                value={
                                    consFilters
                                        .inventoryCategoryId
                                }
                                onChange={(e) =>
                                    setConsFilters(
                                        (state) => ({
                                            ...state,
                                            inventoryCategoryId:
                                            e.target.value,
                                        })
                                    )
                                }
                            >

                                <option value="">
                                    {t(
                                        "inventoryPage.filters.allCategories"
                                    )}
                                </option>

                                {categories.map(
                                    (
                                        category
                                    ) => (
                                        <option
                                            key={
                                                category._id
                                            }
                                            value={
                                                category._id
                                            }
                                        >
                                            {category.name}
                                        </option>
                                    )
                                )}

                            </select>
                        </div>


                        <div className="flex items-end">

                            <button
                                type="button"
                                onClick={() =>
                                    qc.invalidateQueries({
                                        queryKey: [
                                            "inventory/consumption",
                                        ],
                                    })
                                }
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                            >
                                {t(
                                    "inventoryPage.common.refresh"
                                )}
                            </button>

                        </div>

                    </div>


                    <div className="mt-4 overflow-x-auto">

                        <table className="w-full text-sm">

                            <thead>
                            <tr className="text-left text-white/60 border-b border-white/10">

                                <th className="py-3 pr-4 min-w-[220px]">
                                    {t(
                                        "inventoryPage.consumption.table.item"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.consumption.table.quantity"
                                    )}
                                </th>

                                <th className="py-3 pr-4">
                                    {t(
                                        "inventoryPage.consumption.table.cost"
                                    )}
                                </th>

                            </tr>
                            </thead>


                            <tbody>

                            {consLoading ? (

                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-6 text-white/60"
                                    >
                                        {t(
                                            "inventoryPage.common.loading"
                                        )}
                                    </td>
                                </tr>

                            ) : consumptionRows.length ===
                            0 ? (

                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-6 text-white/60"
                                    >
                                        {t(
                                            "inventoryPage.consumption.empty"
                                        )}
                                    </td>
                                </tr>

                            ) : (

                                consumptionRows.map(
                                    (
                                        row,
                                        idx
                                    ) => (

                                        <tr
                                            key={
                                                row._id ||
                                                `${row.name}-${idx}`
                                            }
                                            className="border-b border-white/5"
                                        >

                                            <td className="py-3 pr-4 text-white/80">

                                                {row.name ||
                                                    row.itemName ||
                                                    "—"
                                                }

                                            </td>

                                            <td className="py-3 pr-4 text-white/80">

                                                {num(
                                                    row.qtySold ??
                                                    row.qty ??
                                                    0
                                                )}

                                            </td>

                                            <td className="py-3 pr-4 text-white/80">

                                                {money(
                                                    num(
                                                        row.revenue ??
                                                        0
                                                    )
                                                )}

                                            </td>

                                        </tr>

                                    )
                                )

                            )}

                            </tbody>

                        </table>


                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 pt-4">

                            <div className="text-sm text-white/60">

                                {t(
                                    "inventoryPage.consumption.pagination.summary",
                                    {
                                        page:
                                        consPagination.page,

                                        totalPages:
                                        consPagination.totalPages,

                                        total:
                                        consPagination.total,
                                    }
                                )}

                            </div>


                            <div className="flex items-center gap-2">

                                <button
                                    type="button"
                                    disabled={
                                        !consPagination.hasPrev ||
                                        consLoading
                                    }
                                    onClick={() =>
                                        setConsPage(
                                            (p) =>
                                                Math.max(
                                                    p - 1,
                                                    1
                                                )
                                        )
                                    }
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t(
                                        "inventoryPage.pagination.previous"
                                    )}
                                </button>


                                <button
                                    type="button"
                                    disabled={
                                        !consPagination.hasNext ||
                                        consLoading
                                    }
                                    onClick={() =>
                                        setConsPage(
                                            (p) =>
                                                p + 1
                                        )
                                    }
                                    className="px-4 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t(
                                        "inventoryPage.pagination.next"
                                    )}
                                </button>

                            </div>

                        </div>

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
                    money={money}
                    localization={localization}
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
                money={money}
                item={itemModal.item}
                categories={categories}
                suppliers={suppliers}
                dishTemplates={dishTemplates}
                ingredients={ingredientsList}
                tenantId={tenantId}
                queryClient={queryClient}
                onClose={() => setItemModal({ open: false, mode: "new", item: null })}
                onSave={async (payload) => {
                    const mode = itemModal.mode;

                    if (mode === "create") {
                        return saveItemMutation.mutateAsync({ mode: "create", payload });
                    }

                    return saveItemMutation.mutateAsync({
                        mode: "edit",
                        id: itemModal.item?._id,
                        payload,
                    });
                }}
            />

            <MovementModal
                open={mvModal.open}
                type={mvModal.type}
                item={mvModal.item}
                defaultYield={mvModal.yield}
                money={money}
                saving={createMovementMutation.isPending || createYieldMutation.isPending}
                onClose={() => {
                    if (createMovementMutation.isPending || createYieldMutation.isPending) return;
                    setMvModal({ open: false, type: "purchase", item: null, yield: false });
                }}
                onSave={(payload) => createMovementMutation.mutateAsync(payload)}
                onSaveYield={(payload) => createYieldMutation.mutateAsync(payload)}
            />
        </div>
    );
}
function YieldMermaDashboard({
                                 tenantId,
                                 canUseInventory,
                                 ymd,
                                 setYmd,
                                 money,
                                 localization,
                             }) {
    const { t } =
        useTranslation();

    const [
        openHistory,
        setOpenHistory,
    ] =
        useState(false);


    const safeNumber = (
        value
    ) => {
        const number =
            Number(
                value
            );

        return Number.isFinite(
            number
        )
            ? number
            : 0;
    };


    const parseYieldFromNote = (
        note
    ) => {
        const text =
            String(
                note ||
                ""
            );

        /*
         * IMPORTANTE:
         * Estos patrones permanecen en español
         * por compatibilidad con registros históricos.
         */
        const boughtMatch =
            text.match(
                /comprad[oa]\s*([0-9]+(?:\.[0-9]+)?)/i
            );

        const finalMatch =
            text.match(
                /final\s*([0-9]+(?:\.[0-9]+)?)/i
            );

        const bought =
            boughtMatch
                ? Number(
                    boughtMatch[1]
                )
                : null;

        const final =
            finalMatch
                ? Number(
                    finalMatch[1]
                )
                : null;

        const stepsMatch =
            text.match(
                /pasos:\s*(.*)$/i
            );

        let steps = [];

        if (
            stepsMatch &&
            stepsMatch[1]
        ) {
            steps =
                stepsMatch[1]
                    .split(",")
                    .map(
                        (part) =>
                            part.trim()
                    )
                    .map(
                        (part) => {
                            const [
                                label,
                                qty,
                            ] =
                                part
                                    .split(":")
                                    .map(
                                        (
                                            value
                                        ) =>
                                            value.trim()
                                    );

                            const parsedQty =
                                Number(
                                    qty
                                );

                            return label
                                ? {
                                    label,

                                    qtyAfter:
                                        Number.isFinite(
                                            parsedQty
                                        )
                                            ? parsedQty
                                            : null,
                                }
                                : null;
                        }
                    )
                    .filter(
                        Boolean
                    );
        }

        return {
            bought,
            final,
            steps,
        };
    };


    const {
        data:
            wasteResp,

        isLoading,
    } =
        useQuery({
            queryKey: [
                "inventory/merma/yield-movements",
                tenantId,
                ymd,
            ],

            enabled:
                canUseInventory &&
                Boolean(
                    tenantId
                ),

            queryFn:
                async () => {
                    const res =
                        await api.get(
                            "/api/inventory/movements",
                            {
                                params: {
                                    type:
                                        "waste",

                                    from:
                                        ymd
                                            ? toISOStartOfDayInTimezoneGlobal(
                                                ymd,
                                                localization
                                            )
                                            : undefined,

                                    to:
                                        ymd
                                            ? toISOEndOfDayInTimezoneGlobal(
                                                ymd,
                                                localization
                                            )
                                            : undefined,

                                    limit:
                                        500,
                                },
                            }
                        );

                    return res.data;
                },

            staleTime:
                5_000,
        });


    const wasteMovements =
        useMemo(
            () => {
                const list =
                    wasteResp
                        ?.movements;

                return Array.isArray(
                    list
                )
                    ? list
                    : [];
            },
            [
                wasteResp,
            ]
        );


    const kpis =
        useMemo(
            () => {
                const list =
                    wasteMovements;

                let wasteQty =
                    0;

                let wasteCost =
                    0;

                let boughtTotal =
                    0;

                let finalTotal =
                    0;

                let hasYieldMeta =
                    0;

                for (
                    const movement
                    of list
                    ) {
                    wasteQty +=
                        safeNumber(
                            movement.qty
                        );

                    wasteCost +=
                        safeNumber(
                            movement.costAmount
                        );

                    const meta =
                        parseYieldFromNote(
                            movement.note
                        );

                    if (
                        meta.bought !=
                        null &&
                        meta.final !=
                        null
                    ) {
                        boughtTotal +=
                            safeNumber(
                                meta.bought
                            );

                        finalTotal +=
                            safeNumber(
                                meta.final
                            );

                        hasYieldMeta +=
                            1;
                    }
                }

                const avgWasteUnitCost =
                    wasteQty >
                    0
                        ? wasteCost /
                        wasteQty
                        : 0;

                const yieldPct =
                    boughtTotal >
                    0
                        ? (
                            finalTotal /
                            boughtTotal
                        ) *
                        100
                        : 0;

                const wastePct =
                    boughtTotal >
                    0
                        ? (
                            (
                                boughtTotal -
                                finalTotal
                            ) /
                            boughtTotal
                        ) *
                        100
                        : 0;

                return {
                    movementsCount:
                    list.length,

                    wasteQty,

                    wasteCost,

                    avgWasteUnitCost,

                    boughtTotal,

                    finalTotal,

                    yieldPct,

                    wastePct,

                    hasYieldMeta,
                };
            },
            [
                wasteMovements,
            ]
        );


    const latest =
        useMemo(
            () => {
                return [
                    ...wasteMovements,
                ]
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            new Date(
                                b.createdAt ||
                                0
                            ) -
                            new Date(
                                a.createdAt ||
                                0
                            )
                    )
                    .slice(
                        0,
                        10
                    );
            },
            [
                wasteMovements,
            ]
        );


    return (
        <div className={cardCls + " p-5"}>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">

                <div>

                    <div className="text-white font-bold text-lg">
                        {t(
                            "inventoryPage.yieldDashboard.title"
                        )}
                    </div>

                    <div className="text-white/60 text-sm">
                        {t(
                            "inventoryPage.yieldDashboard.description"
                        )}
                    </div>

                    {kpis.hasYieldMeta ===
                    0 ? (

                        <div className="text-[11px] text-sky-200/80 mt-2">

                            {t(
                                "inventoryPage.yieldDashboard.metadataHelp"
                            )}

                        </div>

                    ) : null}

                </div>


                <div className="flex items-center gap-2">

                    <input
                        type="date"
                        value={
                            ymd
                        }
                        onChange={(e) =>
                            setYmd(
                                e.target.value
                            )
                        }
                        className="px-3 py-2 rounded-xl bg-[#0b0b0b] border border-gray-800/30 text-white"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            setOpenHistory(
                                true
                            )
                        }
                        className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-gray-800/40 text-white font-semibold hover:bg-[#262626]"
                    >
                        {t(
                            "inventoryPage.yieldDashboard.viewHistory"
                        )}
                    </button>

                </div>

            </div>


            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">

                    <div className="text-xs text-gray-400">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.purchasedTotal"
                        )}
                    </div>

                    <div className="text-lg font-semibold text-white">
                        {kpis.boughtTotal ||
                            0
                        }
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1">

                        {t(
                            "inventoryPage.yieldDashboard.kpis.movements",
                            {
                                count:
                                kpis.movementsCount,
                            }
                        )}

                    </div>

                </div>


                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">

                    <div className="text-xs text-gray-400">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.finalUsable"
                        )}
                    </div>

                    <div className="text-lg font-semibold text-white">
                        {kpis.finalTotal ||
                            0
                        }
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1">

                        {t(
                            "inventoryPage.yieldDashboard.kpis.yieldPercent",
                            {
                                value:
                                    kpis
                                        .yieldPct
                                        .toFixed(
                                            1
                                        ),
                            }
                        )}

                    </div>

                </div>


                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">

                    <div className="text-xs text-gray-400">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.wasteQuantity"
                        )}
                    </div>

                    <div className="text-lg font-semibold text-white">
                        {kpis.wasteQty}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1">

                        {t(
                            "inventoryPage.yieldDashboard.kpis.wastePercent",
                            {
                                value:
                                    kpis
                                        .wastePct
                                        .toFixed(
                                            1
                                        ),
                            }
                        )}

                    </div>

                </div>


                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">

                    <div className="text-xs text-gray-400">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.wasteCost"
                        )}
                    </div>

                    <div className="text-lg font-semibold text-white">
                        {money(
                            kpis.wasteCost
                        )}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1">

                        {t(
                            "inventoryPage.yieldDashboard.kpis.averageWasteCost",
                            {
                                value:
                                    money(
                                        kpis.avgWasteUnitCost
                                    ),
                            }
                        )}

                    </div>

                </div>


                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">

                    <div className="text-xs text-gray-400">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.averageWasteUnit"
                        )}
                    </div>

                    <div className="text-lg font-semibold text-white">
                        {money(
                            kpis.avgWasteUnitCost
                        )}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.averageWasteFormula"
                        )}
                    </div>

                </div>


                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">

                    <div className="text-xs text-gray-400">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.metadataRecords"
                        )}
                    </div>

                    <div className="text-lg font-semibold text-white">
                        {kpis.hasYieldMeta}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1">
                        {t(
                            "inventoryPage.yieldDashboard.kpis.metadataHelp"
                        )}
                    </div>

                </div>

            </div>


            <div className="mt-4 rounded-2xl bg-[#0b0b0b] border border-gray-800/50">

                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">

                    <div className="text-white font-bold">
                        {t(
                            "inventoryPage.yieldDashboard.latest.title"
                        )}
                    </div>

                    <div className="text-xs text-white/50">
                        {ymd}
                    </div>

                </div>


                <div className="p-4 space-y-3">

                    {isLoading ? (

                        <div className="text-white/60">
                            {t(
                                "inventoryPage.common.loading"
                            )}
                        </div>

                    ) : latest.length ===
                    0 ? (

                        <div className="text-white/60">
                            {t(
                                "inventoryPage.yieldDashboard.latest.empty"
                            )}
                        </div>

                    ) : (

                        latest.map(
                            (
                                movement
                            ) => {
                                const meta =
                                    parseYieldFromNote(
                                        movement.note
                                    );

                                const stepsArr =
                                    meta.steps ||
                                    [];

                                const itemName =
                                    movement
                                        ?.itemId
                                        ?.name ||
                                    movement
                                        ?.itemName ||
                                    movement
                                        ?.itemId ||
                                    "—";

                                return (
                                    <div
                                        key={
                                            movement._id
                                        }
                                        className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4"
                                    >

                                        <div className="flex items-start justify-between gap-3">

                                            <div className="min-w-0">

                                                <div className="text-white font-semibold truncate">
                                                    {itemName}
                                                </div>


                                                <div className="text-xs text-gray-400 mt-1">

                                                    {t(
                                                        "inventoryPage.yieldDashboard.latest.waste"
                                                    )}
                                                    :{" "}

                                                    <span className="text-gray-200">
                                                        {safeNumber(
                                                            movement.qty
                                                        )}
                                                    </span>

                                                    {" · "}

                                                    {t(
                                                        "inventoryPage.yieldDashboard.latest.cost"
                                                    )}
                                                    :{" "}

                                                    <span className="text-gray-200">
                                                        {money(
                                                            safeNumber(
                                                                movement.costAmount
                                                            )
                                                        )}
                                                    </span>

                                                </div>


                                                {meta.bought !=
                                                null &&
                                                meta.final !=
                                                null ? (

                                                    <div className="text-xs text-gray-500 mt-1">

                                                        {t(
                                                            "inventoryPage.yieldDashboard.latest.purchased"
                                                        )}
                                                        :{" "}

                                                        <span className="text-gray-200">
                                                            {meta.bought}
                                                        </span>

                                                        {" · "}

                                                        {t(
                                                            "inventoryPage.yieldDashboard.latest.final"
                                                        )}
                                                        :{" "}

                                                        <span className="text-gray-200">
                                                            {meta.final}
                                                        </span>

                                                    </div>

                                                ) : null}


                                                {String(
                                                    movement.note ||
                                                    ""
                                                ).trim() ? (

                                                    <div className="text-xs text-gray-400 mt-2">

                                                        {t(
                                                            "inventoryPage.yieldDashboard.latest.note"
                                                        )}
                                                        :{" "}

                                                        <span className="text-gray-200">
                                                            {String(
                                                                movement.note
                                                            ).trim()}
                                                        </span>

                                                    </div>

                                                ) : null}


                                                {stepsArr.length >
                                                0 ? (

                                                    <div className="mt-2 flex flex-wrap gap-2">

                                                        {stepsArr
                                                            .slice(
                                                                0,
                                                                8
                                                            )
                                                            .map(
                                                                (
                                                                    step,
                                                                    idx
                                                                ) => (

                                                                    <span
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="text-[11px] px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-gray-200"
                                                                    >
                                                                        {
                                                                            step.label
                                                                        }
                                                                        :{" "}
                                                                        {
                                                                            step.qtyAfter ??
                                                                            "—"
                                                                        }
                                                                    </span>

                                                                )
                                                            )}


                                                        {stepsArr.length >
                                                        8 ? (

                                                            <span className="text-[11px] px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-gray-400">

                                                                +{
                                                                stepsArr.length -
                                                                8
                                                            }{" "}

                                                                {t(
                                                                    "inventoryPage.yieldDashboard.latest.more"
                                                                )}

                                                            </span>

                                                        ) : null}

                                                    </div>

                                                ) : null}

                                            </div>


                                            <div className="text-xs text-white/50 shrink-0">

                                                {movement.createdAt
                                                    ? formatDateTime(
                                                        movement.createdAt,
                                                        localization
                                                    )
                                                    : ""
                                                }

                                            </div>

                                        </div>

                                    </div>
                                );
                            }
                        )

                    )}

                </div>

            </div>


            <Modal
                open={
                    openHistory
                }
                title={t(
                    "inventoryPage.yieldDashboard.history.title",
                    {
                        date:
                        ymd,
                    }
                )}
                onClose={() =>
                    setOpenHistory(
                        false
                    )
                }
            >

                <div className="space-y-3">

                    {wasteMovements.length ===
                    0 ? (

                        <div className="text-white/60">
                            {t(
                                "inventoryPage.yieldDashboard.history.empty"
                            )}
                        </div>

                    ) : (

                        wasteMovements
                            .slice()
                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    new Date(
                                        b.createdAt ||
                                        0
                                    ) -
                                    new Date(
                                        a.createdAt ||
                                        0
                                    )
                            )
                            .map(
                                (
                                    movement
                                ) => {
                                    const itemName =
                                        movement
                                            ?.itemId
                                            ?.name ||
                                        movement
                                            ?.itemName ||
                                        movement
                                            ?.itemId ||
                                        "—";

                                    return (
                                        <div
                                            key={
                                                movement._id
                                            }
                                            className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4"
                                        >

                                            <div className="text-white font-semibold">
                                                {itemName}
                                            </div>

                                            <div className="text-xs text-gray-400 mt-1">

                                                {t(
                                                    "inventoryPage.yieldDashboard.latest.waste"
                                                )}
                                                :{" "}

                                                <span className="text-gray-200">
                                                    {safeNumber(
                                                        movement.qty
                                                    )}
                                                </span>

                                                {" · "}

                                                {t(
                                                    "inventoryPage.yieldDashboard.latest.cost"
                                                )}
                                                :{" "}

                                                <span className="text-gray-200">
                                                    {money(
                                                        safeNumber(
                                                            movement.costAmount
                                                        )
                                                    )}
                                                </span>

                                            </div>


                                            {String(
                                                movement.note ||
                                                ""
                                            ).trim() ? (

                                                <div className="text-xs text-gray-400 mt-2">

                                                    {t(
                                                        "inventoryPage.yieldDashboard.latest.note"
                                                    )}
                                                    :{" "}

                                                    <span className="text-gray-200">
                                                        {String(
                                                            movement.note
                                                        ).trim()}
                                                    </span>

                                                </div>

                                            ) : null}


                                            <div className="text-[11px] text-gray-500 mt-2">

                                                {movement.createdAt
                                                    ? formatDateTime(
                                                        movement.createdAt,
                                                        localization
                                                    )
                                                    : ""
                                                }

                                            </div>

                                        </div>
                                    );
                                }
                            )

                    )}

                </div>

            </Modal>

        </div>
    );
}
function ItemModal({
                       open,
                       mode,
                       item,
                       categories,
                       suppliers,
                       dishTemplates,
                       ingredients,
                       tenantId,
                       queryClient,
                       money,
                       onClose,
                       onSave,
                   }) {
    const { t } =
        useTranslation();

    const isEdit =
        mode ===
        "edit";

    const {
        enqueueSnackbar,
    } =
        useSnackbar();


    const [
        createMode,
        setCreateMode,
    ] =
        useState(
            "new"
        );

    const [
        selectedDishId,
        setSelectedDishId,
    ] =
        useState(
            ""
        );

    const [
        selectedDishInventoryType,
        setSelectedDishInventoryType,
    ] =
        useState(
            "direct"
        );


    const selectedDish =
        useMemo(
            () => {
                return (
                    (
                        dishTemplates ||
                        []
                    ).find(
                        (
                            dish
                        ) =>
                            String(
                                dish._id
                            ) ===
                            String(
                                selectedDishId
                            )
                    ) ||
                    null
                );
            },
            [
                dishTemplates,
                selectedDishId,
            ]
        );


    const ingredientsList =
        Array.isArray(
            ingredients
        )
            ? ingredients
            : [];


    const availableIngredients =
        useMemo(
            () => {
                return (
                    ingredientsList ||
                    []
                )
                    .map(
                        (
                            ingredient
                        ) => ({
                            _id:
                                String(
                                    ingredient._id
                                ),

                            name:
                            ingredient.name,

                            unit:
                                ingredient.unit ||
                                "unidad",

                            stockCurrent:
                                ingredient.stockCurrent ??
                                0,
                        })
                    )
                    .filter(
                        (
                            ingredient
                        ) =>
                            ingredient._id &&
                            ingredient.name
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            String(
                                a.name
                            ).localeCompare(
                                String(
                                    b.name
                                )
                            )
                    );
            },
            [
                ingredientsList,
            ]
        );


    const [
        form,
        setForm,
    ] =
        useState({
            name:
                "",

            unit:
                "unidad",

            inventoryType:
                "ingredient",

            allowNegativeStock:
                true,

            stockMin:
                0,

            lastCost:
                "",

            avgCost:
                "",

            inventoryCategoryId:
                "",

            supplierId:
                "",
        });


    const [
        recipeLines,
        setRecipeLines,
    ] =
        useState([]);

    const [
        pickedIngredientId,
        setPickedIngredientId,
    ] =
        useState("");

    const [
        pickedQty,
        setPickedQty,
    ] =
        useState(
            "1"
        );

    const [
        newIngName,
        setNewIngName,
    ] =
        useState("");

    // Mostrar el nombre del ingrediente recién creado aun antes del refetch de inventario.
    const [newIngredientNames, setNewIngredientNames] = useState({});

    const [
        newIngCategoryId,
        setNewIngCategoryId,
    ] =
        useState("");

    const [
        savingRecipe,
        setSavingRecipe,
    ] =
        useState(false);

    const [
        creatingIngredient,
        setCreatingIngredient,
    ] =
        useState(false);


    const normalizeQty = (
        value
    ) => {
        const number =
            Number(
                value
            );

        if (
            !Number.isFinite(
                number
            ) ||
            number <=
            0
        ) {
            return null;
        }

        return Number(
            number.toFixed(
                6
            )
        );
    };


    React.useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            setCreateMode(
                "new"
            );

            setSelectedDishId(
                ""
            );

            setSelectedDishInventoryType(
                "direct"
            );

            setForm({
                name:
                    item?.name ||
                    "",

                unit:
                    item?.unit ||
                    "unidad",

                inventoryType:
                    normalizeInventoryType(
                        item?.inventoryType ||
                        "ingredient"
                    ),

                allowNegativeStock:
                    item?.allowNegativeStock !==
                    false,

                stockMin:
                    item?.stockMin ??
                    0,

                lastCost:
                    item?.lastCost ??
                    "",

                avgCost:
                    item?.avgCost ??
                    "",

                inventoryCategoryId:
                    item
                        ?.inventoryCategoryId
                        ?._id ||
                    item
                        ?.inventoryCategoryId ||
                    "",

                supplierId:
                    item
                        ?.supplierId
                        ?._id ||
                    item
                        ?.supplierId ||
                    "",
            });
        },
        [
            open,
            item,
        ]
    );


    React.useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            if (
                !selectedDishId
            ) {
                setRecipeLines(
                    []
                );

                return;
            }

            const raw =
                selectedDish
                    ?.recipe;

            if (
                Array.isArray(
                    raw
                )
            ) {
                const mapped =
                    raw
                        .map(
                            (
                                recipeItem
                            ) => {
                                const ingredientId =
                                    recipeItem
                                        ?.ingredientDishId ||
                                    recipeItem
                                        ?.ingredientId ||
                                    recipeItem
                                        ?.dishId ||
                                    recipeItem
                                        ?.inventoryItemId ||
                                    recipeItem
                                        ?._id ||
                                    null;

                                const qty =
                                    recipeItem
                                        ?.qty ??
                                    recipeItem
                                        ?.quantity ??
                                    null;

                                if (
                                    !ingredientId ||
                                    qty ==
                                    null
                                ) {
                                    return null;
                                }

                                const normalizedQty =
                                    normalizeQty(
                                        qty
                                    );

                                if (
                                    !normalizedQty
                                ) {
                                    return null;
                                }

                                return {
                                    ingredientId:
                                        String(
                                            ingredientId
                                        ),

                                    qty:
                                    normalizedQty,
                                };
                            }
                        )
                        .filter(
                            Boolean
                        );

                setRecipeLines(
                    mapped
                );

            } else {
                setRecipeLines(
                    []
                );
            }
        },
        [
            open,
            selectedDishId,
            selectedDish,
        ]
    );


    React.useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            if (
                !isEdit &&
                createMode ===
                "fromDish" &&
                selectedDish
            ) {
                setForm(
                    (
                        state
                    ) => ({
                        ...state,

                        name:
                            selectedDish.name ||
                            state.name,
                    })
                );
            }
        },
        [
            open,
            isEdit,
            createMode,
            selectedDish,
        ]
    );


    const handleSaveInventory =
        async () => {
            const name =
                String(
                    form.name ||
                    ""
                ).trim();

            if (
                !name
            ) {
                enqueueSnackbar(
                    t(
                        "inventoryPage.itemModal.messages.nameRequired"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }

            const normalizedType =
                isEdit
                    ? normalizeInventoryType(
                        form.inventoryType
                    )
                    : createMode ===
                    "fromDish"
                        ? selectedDishInventoryType
                        : "ingredient";


            const payload = {
                name,

                unit:
                form.unit,

                inventoryType:
                normalizedType,

                allowNegativeStock:
                    normalizedType ===
                    "direct" ||
                    normalizedType ===
                    "ingredient"
                        ? form.allowNegativeStock !==
                        false
                        : false,

                stockMin:
                    normalizedType ===
                    "direct" ||
                    normalizedType ===
                    "ingredient"
                        ? Number(
                            form.stockMin ||
                            0
                        )
                        : null,

                lastCost:
                    normalizedType ===
                    "direct" ||
                    normalizedType ===
                    "ingredient"
                        ? form.lastCost ===
                        ""
                            ? null
                            : Number(
                                form.lastCost
                            )
                        : null,

                avgCost:
                    normalizedType ===
                    "direct" ||
                    normalizedType ===
                    "ingredient"
                        ? form.avgCost ===
                        ""
                            ? null
                            : Number(
                                form.avgCost
                            )
                        : null,

                inventoryCategoryId:
                    normalizedType ===
                    "direct" ||
                    normalizedType ===
                    "ingredient"
                        ? form.inventoryCategoryId ||
                        null
                        : null,

                supplierId:
                    normalizedType ===
                    "direct" ||
                    normalizedType ===
                    "ingredient"
                        ? form.supplierId ||
                        null
                        : null,
            };


            if (
                !isEdit &&
                createMode ===
                "fromDish"
            ) {
                if (
                    !selectedDishId
                ) {
                    enqueueSnackbar(
                        t(
                            "inventoryPage.itemModal.messages.selectDish"
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );

                    return;
                }

                if (
                    ![
                        "direct",
                        "recipe",
                    ].includes(
                        selectedDishInventoryType
                    )
                ) {
                    enqueueSnackbar(
                        t(
                            "inventoryPage.itemModal.messages.selectDishInventoryType"
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );

                    return;
                }

                if (
                    selectedDishInventoryType ===
                    "recipe" &&
                    recipeLines.length ===
                    0
                ) {
                    enqueueSnackbar(
                        t(
                            "inventoryPage.itemModal.messages.recipeIngredientRequired"
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );

                    return;
                }


                if (
                    recipeLines.length >
                    0
                ) {
                    try {
                        setSavingRecipe(
                            true
                        );

                        const recipePayload =
                            (
                                recipeLines ||
                                []
                            )
                                .map(
                                    (
                                        recipeItem
                                    ) => {
                                        const id =
                                            recipeItem
                                                ?.dishId ||
                                            recipeItem
                                                ?.ingredientId ||
                                            recipeItem
                                                ?.ingredientDishId ||
                                            recipeItem
                                                ?.inventoryItemId ||
                                            null;

                                        const qty =
                                            normalizeQty(
                                                recipeItem
                                                    ?.qty
                                            );

                                        if (
                                            !id ||
                                            !qty ||
                                            qty <=
                                            0
                                        ) {
                                            return null;
                                        }

                                        return {
                                            ingredientDishId:
                                                String(
                                                    id
                                                ),

                                            dishId:
                                                String(
                                                    id
                                                ),

                                            inventoryItemId:
                                                String(
                                                    id
                                                ),

                                            qty,

                                            unit:
                                                recipeItem
                                                    ?.unit ||
                                                "unidad",
                                        };
                                    }
                                )
                                .filter(
                                    Boolean
                                );


                        await api.put(
                            `/api/dishes/${selectedDishId}/recipe`,
                            {
                                recipe:
                                recipePayload,
                            }
                        );


                        enqueueSnackbar(
                            t(
                                "inventoryPage.itemModal.messages.recipeSaved"
                            ),
                            {
                                variant:
                                    "success",
                            }
                        );

                    } catch (
                        error
                        ) {
                        const message =
                            error
                                ?.response
                                ?.data
                                ?.message ||
                            error
                                ?.message ||
                            t(
                                "inventoryPage.itemModal.messages.recipeSaveError"
                            );

                        enqueueSnackbar(
                            message,
                            {
                                variant:
                                    "error",
                            }
                        );

                        return;

                    } finally {
                        setSavingRecipe(
                            false
                        );
                    }
                }


                payload.inventoryType =
                    selectedDishInventoryType;

                payload.allowNegativeStock =
                    selectedDishInventoryType ===
                    "direct";

                payload.existingDishId =
                    selectedDishId;
            }


            await onSave(
                payload
            );
        };


    return (
        <Modal
            open={
                open
            }
            title={
                isEdit
                    ? t(
                        "inventoryPage.itemModal.title.edit"
                    )
                    : t(
                        "inventoryPage.itemModal.title.create"
                    )
            }
            onClose={
                onClose
            }
        >

            {!isEdit && (

                <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">

                    <div className="text-white font-semibold mb-3">
                        {t(
                            "inventoryPage.itemModal.createQuestion"
                        )}
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        <button
                            type="button"
                            onClick={() => {
                                setCreateMode(
                                    "new"
                                );

                                setSelectedDishInventoryType(
                                    "direct"
                                );

                                setForm(
                                    (
                                        state
                                    ) => ({
                                        ...state,

                                        inventoryType:
                                            "ingredient",

                                        allowNegativeStock:
                                            true,
                                    })
                                );
                            }}
                            className={`text-left rounded-2xl border p-4 transition-all ${
                                createMode ===
                                "new"
                                    ? "bg-sky-500/15 border-sky-500/30 text-sky-200"
                                    : "bg-white/5 border-white/10 text-white/80 hover:border-white/20"
                            }`}
                        >

                            <div className="font-bold">
                                {t(
                                    "inventoryPage.itemTypes.ingredient.title"
                                )}
                            </div>

                            <div className="text-xs text-white/50 mt-1">
                                {t(
                                    "inventoryPage.itemModal.newIngredientDescription"
                                )}
                            </div>

                        </button>


                        <button
                            type="button"
                            onClick={() =>
                                setCreateMode(
                                    "fromDish"
                                )
                            }
                            className={`text-left rounded-2xl border p-4 transition-all ${
                                createMode ===
                                "fromDish"
                                    ? "bg-sky-500/15 border-sky-500/30 text-sky-200"
                                    : "bg-white/5 border-white/10 text-white/80 hover:border-white/20"
                            }`}
                        >

                            <div className="font-bold">
                                {t(
                                    "inventoryPage.itemModal.fromExistingDish"
                                )}
                            </div>

                            <div className="text-xs text-white/50 mt-1">
                                {t(
                                    "inventoryPage.itemModal.fromExistingDishDescription"
                                )}
                            </div>

                        </button>

                    </div>

                </div>

            )}


            {!isEdit &&
                createMode ===
                "fromDish" && (

                    <div className="mb-4">

                        <div className="text-white text-base font-semibold mb-2">
                            {t(
                                "inventoryPage.itemModal.selectDish"
                            )}
                        </div>

                        <select
                            className={
                                selectCls
                            }
                            value={
                                selectedDishId
                            }
                            onChange={(e) =>
                                setSelectedDishId(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                —
                            </option>

                            {dishTemplates.map(
                                (
                                    dish
                                ) => (
                                    <option
                                        key={
                                            dish._id
                                        }
                                        value={
                                            dish._id
                                        }
                                    >
                                        {dish.name}
                                    </option>
                                )
                            )}

                        </select>


                        {selectedDish && (

                            <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">

                                <div className="text-sm font-semibold text-sky-200">

                                    {t(
                                        "inventoryPage.itemModal.selectedDish"
                                    )}
                                    :{" "}

                                    {
                                        selectedDish.name
                                    }

                                </div>

                                <div className="text-xs text-gray-300 mt-1">

                                    {t(
                                        "inventoryPage.itemModal.category"
                                    )}
                                    :{" "}

                                    {selectedDish.category ||
                                        t(
                                            "inventoryPage.common.noCategory"
                                        )
                                    }

                                    {" · "}

                                    {t(
                                        "inventoryPage.itemModal.price"
                                    )}
                                    :{" "}

                                    {money(
                                        selectedDish.price ||
                                        0
                                    )}

                                </div>

                            </div>

                        )}


                        <div className="mt-4">

                            <div className="text-white/70 text-xs mb-2">
                                {t(
                                    "inventoryPage.itemModal.inventoryTypeForDish"
                                )}
                            </div>


                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedDishInventoryType(
                                            "direct"
                                        )
                                    }
                                    className={`text-left rounded-2xl border p-4 transition-all ${
                                        selectedDishInventoryType ===
                                        "direct"
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                                            : "bg-white/5 border-white/10 text-white/80"
                                    }`}
                                >

                                    <div className="font-bold">
                                        {t(
                                            "inventoryPage.itemTypes.direct.title"
                                        )}
                                    </div>

                                    <div className="text-xs text-white/50 mt-1">
                                        {t(
                                            "inventoryPage.itemModal.directDishDescription"
                                        )}
                                    </div>

                                </button>


                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedDishInventoryType(
                                            "recipe"
                                        )
                                    }
                                    className={`text-left rounded-2xl border p-4 transition-all ${
                                        selectedDishInventoryType ===
                                        "recipe"
                                            ? "bg-blue-500/15 border-blue-500/30 text-blue-200"
                                            : "bg-white/5 border-white/10 text-white/80"
                                    }`}
                                >

                                    <div className="font-bold">
                                        {t(
                                            "inventoryPage.itemTypes.recipe.title"
                                        )}
                                    </div>

                                    <div className="text-xs text-white/50 mt-1">
                                        {t(
                                            "inventoryPage.itemModal.recipeDishDescription"
                                        )}
                                    </div>

                                </button>

                            </div>

                        </div>


                        <div className="text-white/40 text-[11px] mt-1">

                            {t(
                                "inventoryPage.itemModal.sameDishHelp"
                            )}

                            <br />

                            {t(
                                "inventoryPage.itemModal.stockMovementHelp"
                            )}

                        </div>


                        {selectedDishId &&
                            selectedDishInventoryType ===
                            "recipe" && (

                                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">

                                    <div className="flex items-center justify-between gap-2">

                                        <div className="text-white/80 text-sm font-semibold">
                                            {t(
                                                "inventoryPage.itemModal.recipe.title"
                                            )}
                                        </div>

                                        <div className="text-white/40 text-[11px]">
                                            {t(
                                                "inventoryPage.itemModal.recipe.description"
                                            )}
                                        </div>

                                    </div>


                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2">

                                        <div className="md:col-span-7">

                                            <div className="text-white/60 text-xs mb-1">
                                                {t(
                                                    "inventoryPage.itemModal.fields.ingredient"
                                                )}
                                            </div>

                                            <select
                                                className={
                                                    selectCls
                                                }
                                                value={
                                                    pickedIngredientId
                                                }
                                                onChange={(e) =>
                                                    setPickedIngredientId(
                                                        e.target.value
                                                    )
                                                }
                                            >

                                                <option value="">
                                                    {t(
                                                        "inventoryPage.itemModal.placeholders.selectIngredient"
                                                    )}
                                                </option>

                                                {availableIngredients.map(
                                                    (
                                                        ingredient
                                                    ) => (

                                                        <option
                                                            key={
                                                                ingredient._id
                                                            }
                                                            value={
                                                                ingredient._id
                                                            }
                                                        >

                                                            {
                                                                ingredient.name
                                                            }
                                                            {" · "}
                                                            {getUnitLabel(
                                                                ingredient.unit,
                                                                t
                                                            )}
                                                            {" · "}

                                                            {t(
                                                                "inventoryPage.table.stock"
                                                            )}
                                                            :{" "}
                                                            {
                                                                ingredient.stockCurrent
                                                            }

                                                        </option>

                                                    )
                                                )}

                                            </select>

                                        </div>


                                        <div className="md:col-span-3">

                                            <div className="text-white/60 text-xs mb-1">
                                                {t(
                                                    "inventoryPage.itemModal.fields.quantity"
                                                )}
                                            </div>

                                            <input
                                                className={
                                                    inputCls
                                                }
                                                value={
                                                    pickedQty
                                                }
                                                onChange={(e) =>
                                                    setPickedQty(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder={t(
                                                    "inventoryPage.itemModal.placeholders.quantity"
                                                )}
                                            />

                                        </div>


                                        <div className="md:col-span-2 flex items-end">

                                            <button
                                                type="button"
                                                className="w-full px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-200 text-sm"
                                                onClick={() => {
                                                    if (
                                                        !pickedIngredientId
                                                    ) {
                                                        enqueueSnackbar(
                                                            t(
                                                                "inventoryPage.itemModal.messages.selectIngredient"
                                                            ),
                                                            {
                                                                variant:
                                                                    "warning",
                                                            }
                                                        );

                                                        return;
                                                    }

                                                    const quantity =
                                                        normalizeQty(
                                                            pickedQty
                                                        );

                                                    if (
                                                        !quantity
                                                    ) {
                                                        enqueueSnackbar(
                                                            t(
                                                                "inventoryPage.itemModal.messages.invalidQuantity"
                                                            ),
                                                            {
                                                                variant:
                                                                    "warning",
                                                            }
                                                        );

                                                        return;
                                                    }

                                                    setRecipeLines(
                                                        (
                                                            previous
                                                        ) => {
                                                            const exists =
                                                                previous.find(
                                                                    (
                                                                        line
                                                                    ) =>
                                                                        String(
                                                                            line.ingredientId
                                                                        ) ===
                                                                        String(
                                                                            pickedIngredientId
                                                                        )
                                                                );

                                                            if (
                                                                exists
                                                            ) {
                                                                return previous.map(
                                                                    (
                                                                        line
                                                                    ) =>
                                                                        String(
                                                                            line.ingredientId
                                                                        ) ===
                                                                        String(
                                                                            pickedIngredientId
                                                                        )
                                                                            ? {
                                                                                ...line,

                                                                                qty:
                                                                                    normalizeQty(
                                                                                        Number(
                                                                                            line.qty
                                                                                        ) +
                                                                                        quantity
                                                                                    ) ||
                                                                                    line.qty,
                                                                            }
                                                                            : line
                                                                );
                                                            }

                                                            return [
                                                                ...previous,
                                                                {
                                                                    ingredientId:
                                                                        String(
                                                                            pickedIngredientId
                                                                        ),

                                                                    qty:
                                                                    quantity,
                                                                },
                                                            ];
                                                        }
                                                    );

                                                    setPickedIngredientId(
                                                        ""
                                                    );

                                                    setPickedQty(
                                                        "1"
                                                    );
                                                }}
                                            >

                                                {t(
                                                    "inventoryPage.itemModal.actions.add"
                                                )}

                                            </button>

                                        </div>

                                    </div>


                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2">

                                        <div className="md:col-span-7">

                                            <div className="text-white/60 text-xs mb-1">
                                                {t(
                                                    "inventoryPage.itemModal.fields.createIngredient"
                                                )}
                                            </div>

                                            <input
                                                className={
                                                    inputCls
                                                }
                                                value={
                                                    newIngName
                                                }
                                                onChange={(e) =>
                                                    setNewIngName(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder={t(
                                                    "inventoryPage.itemModal.placeholders.ingredientName"
                                                )}
                                            />

                                        </div>


                                        <div className="md:col-span-3">

                                            <div className="text-white/60 text-xs mb-1">
                                                {t(
                                                    "inventoryPage.itemModal.fields.inventoryCategoryOptional"
                                                )}
                                            </div>

                                            <select
                                                className={
                                                    selectCls
                                                }
                                                value={
                                                    newIngCategoryId
                                                }
                                                onChange={(e) =>
                                                    setNewIngCategoryId(
                                                        e.target.value
                                                    )
                                                }
                                            >

                                                <option value="">
                                                    —
                                                </option>

                                                {(
                                                    categories ||
                                                    []
                                                ).map(
                                                    (
                                                        category
                                                    ) => (

                                                        <option
                                                            key={
                                                                category._id
                                                            }
                                                            value={
                                                                category._id
                                                            }
                                                        >
                                                            {
                                                                category.name
                                                            }
                                                        </option>

                                                    )
                                                )}

                                            </select>

                                        </div>


                                        <div className="md:col-span-2 flex items-end">

                                            <button
                                                type="button"
                                                disabled={
                                                    creatingIngredient
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 text-sm disabled:opacity-50"
                                                onClick={async () => {
                                                    const ingredientName =
                                                        String(
                                                            newIngName ||
                                                            ""
                                                        ).trim();

                                                    if (
                                                        !ingredientName
                                                    ) {
                                                        enqueueSnackbar(
                                                            t(
                                                                "inventoryPage.itemModal.messages.ingredientNameRequired"
                                                            ),
                                                            {
                                                                variant:
                                                                    "warning",
                                                            }
                                                        );

                                                        return;
                                                    }

                                                    try {
                                                        setCreatingIngredient(
                                                            true
                                                        );

                                                        const res =
                                                            await api.post(
                                                                "/api/inventory/items",
                                                                {
                                                                    name:
                                                                    ingredientName,

                                                                    inventoryCategoryId:
                                                                        newIngCategoryId ||
                                                                        null,

                                                                    sellMode:
                                                                        "unit",

                                                                    weightUnit:
                                                                        "lb",
                                                                }
                                                            );

                                                        const created = res?.data?.item || res?.data?.data || null;
                                                        if (!created?._id || created.inventoryType !== "ingredient") {
                                                            throw new Error("INGREDIENT_CREATE_INVALID_RESPONSE");
                                                        }

                                                        enqueueSnackbar(
                                                            t(
                                                                "inventoryPage.itemModal.messages.ingredientCreated"
                                                            ),
                                                            {
                                                                variant:
                                                                    "success",
                                                            }
                                                        );

                                                        setNewIngName(
                                                            ""
                                                        );

                                                        setNewIngCategoryId(
                                                            ""
                                                        );

                                                        if (created?._id) {
                                                            setNewIngredientNames((previous) => ({
                                                                ...previous,
                                                                [String(created._id)]: created.name,
                                                            }));
                                                            setRecipeLines(
                                                                (
                                                                    previous
                                                                ) => [
                                                                    ...previous,
                                                                    {
                                                                        ingredientId:
                                                                            String(
                                                                                created._id
                                                                            ),

                                                                        qty:
                                                                            1,
                                                                    },
                                                                ]
                                                            );
                                                        }


                                                        await queryClient
                                                            ?.invalidateQueries
                                                            ?.({
                                                                queryKey: [
                                                                    "ingredients",
                                                                    tenantId,
                                                                ],
                                                            });


                                                        await queryClient
                                                            ?.invalidateQueries
                                                            ?.({
                                                                queryKey: [
                                                                    "inventory/items",
                                                                ],
                                                            });

                                                    } catch (
                                                        error
                                                        ) {
                                                        const message =
                                                            error
                                                                ?.response
                                                                ?.data
                                                                ?.message ||
                                                            error
                                                                ?.message ||
                                                            t(
                                                                "inventoryPage.itemModal.messages.ingredientCreateError"
                                                            );

                                                        enqueueSnackbar(
                                                            message,
                                                            {
                                                                variant:
                                                                    "error",
                                                            }
                                                        );

                                                    } finally {
                                                        setCreatingIngredient(
                                                            false
                                                        );
                                                    }
                                                }}
                                            >

                                                {creatingIngredient
                                                    ? t(
                                                        "inventoryPage.itemModal.actions.creating"
                                                    )
                                                    : t(
                                                        "inventoryPage.itemModal.actions.create"
                                                    )
                                                }

                                            </button>

                                        </div>

                                    </div>


                                    <div className="mt-3">

                                        <div className="text-white/60 text-xs mb-2">
                                            {t(
                                                "inventoryPage.itemModal.recipe.addedIngredients"
                                            )}
                                        </div>


                                        {recipeLines.length ===
                                        0 ? (

                                            <div className="text-white/40 text-[12px]">
                                                {t(
                                                    "inventoryPage.itemModal.recipe.empty"
                                                )}
                                            </div>

                                        ) : (

                                            <div className="space-y-2">

                                                {recipeLines.map(
                                                    (
                                                        recipeItem
                                                    ) => {
                                                        const ingredientName =
                                                            availableIngredients.find(
                                                                (
                                                                    ingredient
                                                                ) =>
                                                                    String(
                                                                        ingredient._id
                                                                    ) ===
                                                                    String(
                                                                        recipeItem.ingredientId
                                                                    )
                                                            )?.name ||
                                                            newIngredientNames[String(recipeItem.ingredientId)] ||
                                                            t(
                                                                "inventoryPage.itemModal.fields.ingredient"
                                                            );

                                                        return (
                                                            <div
                                                                key={
                                                                    recipeItem.ingredientId
                                                                }
                                                                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                                                            >

                                                                <div className="min-w-0">

                                                                    <div className="text-white/80 text-sm truncate">
                                                                        {
                                                                            ingredientName
                                                                        }
                                                                    </div>

                                                                    <div className="text-white/40 text-[11px]">
                                                                        {t("inventoryPage.export.columns.id")}:{" "}
                                                                        {recipeItem.ingredientId}
                                                                    </div>

                                                                </div>


                                                                <div className="flex items-center gap-2">

                                                                    <input
                                                                        className={
                                                                            inputCls
                                                                        }
                                                                        style={{
                                                                            width:
                                                                                110,
                                                                        }}
                                                                        value={
                                                                            String(
                                                                                recipeItem.qty
                                                                            )
                                                                        }
                                                                        onChange={(e) => {
                                                                            const quantity =
                                                                                normalizeQty(
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                );

                                                                            setRecipeLines(
                                                                                (
                                                                                    previous
                                                                                ) =>
                                                                                    previous.map(
                                                                                        (
                                                                                            line
                                                                                        ) =>
                                                                                            line.ingredientId ===
                                                                                            recipeItem.ingredientId
                                                                                                ? {
                                                                                                    ...line,

                                                                                                    qty:
                                                                                                        quantity ||
                                                                                                        line.qty,
                                                                                                }
                                                                                                : line
                                                                                    )
                                                                            );
                                                                        }}
                                                                    />


                                                                    <button
                                                                        type="button"
                                                                        className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm"
                                                                        onClick={() =>
                                                                            setRecipeLines(
                                                                                (
                                                                                    previous
                                                                                ) =>
                                                                                    previous.filter(
                                                                                        (
                                                                                            line
                                                                                        ) =>
                                                                                            line.ingredientId !==
                                                                                            recipeItem.ingredientId
                                                                                    )
                                                                            )
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "inventoryPage.itemModal.actions.remove"
                                                                        )}
                                                                    </button>

                                                                </div>

                                                            </div>
                                                        );
                                                    }
                                                )}

                                            </div>

                                        )}

                                    </div>

                                </div>

                            )}

                    </div>

                )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                <div>

                    <div className="text-white text-base font-semibold mb-2">
                        {t(
                            "inventoryPage.itemModal.fields.name"
                        )}
                    </div>

                    <input
                        className={
                            inputCls
                        }
                        value={
                            form.name
                        }
                        onChange={(e) =>
                            setForm(
                                (
                                    state
                                ) => ({
                                    ...state,

                                    name:
                                    e.target.value,
                                })
                            )
                        }
                    />

                </div>


                <div>

                    <div className="text-white text-base font-semibold mb-2">
                        {t(
                            "inventoryPage.itemModal.fields.unit"
                        )}
                    </div>

                    <select
                        className={
                            selectCls
                        }
                        value={
                            form.unit
                        }
                        onChange={(e) =>
                            setForm(
                                (
                                    state
                                ) => ({
                                    ...state,

                                    unit:
                                    e.target.value,
                                })
                            )
                        }
                    >

                        {UNIT_OPTIONS.map(
                            (
                                unit
                            ) => (

                                <option
                                    key={
                                        unit
                                    }
                                    value={
                                        unit
                                    }
                                >
                                    {getUnitLabel(
                                        unit,
                                        t
                                    )}
                                </option>

                            )
                        )}

                    </select>

                </div>


                <div>

                    <div className="text-white text-base font-semibold mb-2">
                        {t(
                            "inventoryPage.itemModal.fields.inventoryCategory"
                        )}
                    </div>

                    <select
                        className={
                            selectCls
                        }
                        value={
                            form.inventoryCategoryId
                        }
                        onChange={(e) =>
                            setForm(
                                (
                                    state
                                ) => ({
                                    ...state,

                                    inventoryCategoryId:
                                    e.target.value,
                                })
                            )
                        }
                    >

                        <option value="">
                            —
                        </option>

                        {categories.map(
                            (
                                category
                            ) => (

                                <option
                                    key={
                                        category._id
                                    }
                                    value={
                                        category._id
                                    }
                                >
                                    {
                                        category.name
                                    }
                                </option>

                            )
                        )}

                    </select>

                </div>


                <div>

                    <div className="text-white text-base font-semibold mb-2">
                        {t(
                            "inventoryPage.itemModal.fields.currentSupplierOptional"
                        )}
                    </div>

                    <select
                        className={
                            selectCls
                        }
                        value={
                            form.supplierId
                        }
                        onChange={(e) =>
                            setForm(
                                (
                                    state
                                ) => ({
                                    ...state,

                                    supplierId:
                                    e.target.value,
                                })
                            )
                        }
                    >

                        <option value="">
                            {t(
                                "inventoryPage.common.noSupplier"
                            )}
                        </option>

                        {suppliers.map(
                            (
                                supplier
                            ) => (

                                <option
                                    key={
                                        supplier._id
                                    }
                                    value={
                                        supplier._id
                                    }
                                >

                                    {supplier.name ||
                                        supplier.companyName ||
                                        t(
                                            "inventoryPage.common.supplier"
                                        )
                                    }

                                </option>

                            )
                        )}

                    </select>

                </div>


                <div>

                    <div className="text-white text-base font-semibold mb-2">
                        {t(
                            "inventoryPage.itemModal.fields.minimumStock"
                        )}
                    </div>

                    <input
                        type="number"
                        className={
                            inputCls
                        }
                        value={
                            form.stockMin
                        }
                        onChange={(e) =>
                            setForm(
                                (
                                    state
                                ) => ({
                                    ...state,

                                    stockMin:
                                    e.target.value,
                                })
                            )
                        }
                    />

                </div>


                <div>

                    <div className="text-white text-base font-semibold mb-2">
                        {t(
                            "inventoryPage.itemModal.fields.lastCost"
                        )}
                    </div>

                    <input
                        type="number"
                        className={
                            inputCls
                        }
                        value={
                            form.lastCost
                        }
                        onChange={(e) =>
                            setForm(
                                (
                                    state
                                ) => ({
                                    ...state,

                                    lastCost:
                                    e.target.value,
                                })
                            )
                        }
                    />

                </div>


                <div>

                    <div className="text-white text-base font-semibold mb-2">
                        {t(
                            "inventoryPage.itemModal.fields.averageCost"
                        )}
                    </div>

                    <input
                        type="number"
                        className={
                            inputCls
                        }
                        value={
                            form.avgCost
                        }
                        onChange={(e) =>
                            setForm(
                                (
                                    state
                                ) => ({
                                    ...state,

                                    avgCost:
                                    e.target.value,
                                })
                            )
                        }
                    />

                </div>

            </div>


            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 justify-end">

                <button
                    type="button"
                    onClick={
                        onClose
                    }
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80"
                >
                    {t(
                        "common.cancel"
                    )}
                </button>

                <button
                    type="button"
                    onClick={
                        handleSaveInventory
                    }
                    disabled={
                        savingRecipe
                    }
                    className="px-4 py-3 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 disabled:opacity-60"
                >

                    {savingRecipe
                        ? t(
                            "inventoryPage.itemModal.actions.saving"
                        )
                        : t(
                            "inventoryPage.itemModal.actions.save"
                        )
                    }

                </button>

            </div>

        </Modal>
    );
}
function MovementModal({
                           open,
                           type,
                           item,
                           defaultYield = false,
                           money,
                           saving = false,
                           onClose,
                           onSave,
                           onSaveYield,
                       }) {
    const { t } =
        useTranslation();

    const [
        qty,
        setQty,
    ] =
        useState("");

    const [
        unitCost,
        setUnitCost,
    ] =
        useState("");

    const [
        direction,
        setDirection,
    ] =
        useState(
            "out"
        );

    const [
        note,
        setNote,
    ] =
        useState("");

    const {
        enqueueSnackbar,
    } =
        useSnackbar();

    const [
        negativeConfirmOpen,
        setNegativeConfirmOpen,
    ] =
        useState(false);

    const [
        negativeConfirmData,
        setNegativeConfirmData,
    ] =
        useState(null);

    const [
        pendingMovementPayload,
        setPendingMovementPayload,
    ] =
        useState(null);


    const saveLockRef =
        useRef(false);

    const requestIdRef =
        useRef("");

    const [
        localSaving,
        setLocalSaving,
    ] =
        useState(false);


    const isSaving =
        Boolean(
            localSaving ||
            saving
        );


    const getDefaultSteps =
        () => [
            {
                label:
                    t(
                        "inventoryPage.movementModal.yield.defaultSteps.boiled"
                    ),
                uiId: "boiled",

                qtyAfter:
                    "",
            },

            {
                label:
                    t(
                        "inventoryPage.movementModal.yield.defaultSteps.cooked"
                    ),
                uiId: "cooked",

                qtyAfter:
                    "",
            },
        ];


    const createRequestId =
        () => {
            try {
                return (
                    window.crypto
                        ?.randomUUID
                        ?.() ||
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`
                );

            } catch {
                return `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;
            }
        };


    const unlockSave =
        () => {
            saveLockRef.current =
                false;

            setLocalSaving(
                false
            );
        };


    const submitMovement =
        async (
            payload
        ) => {
            if (
                saveLockRef.current
            ) {
                return;
            }

            saveLockRef.current =
                true;

            setLocalSaving(
                true
            );

            try {
                await onSave(
                    payload
                );

                setNegativeConfirmOpen(
                    false
                );

                setNegativeConfirmData(
                    null
                );

                setPendingMovementPayload(
                    null
                );

                onClose?.();

            } catch (
                error
                ) {
                unlockSave();
            }
        };


    const [
        useYield,
        setUseYield,
    ] =
        useState(false);

    const [
        totalCost,
        setTotalCost,
    ] =
        useState("");

    const [
        finalQty,
        setFinalQty,
    ] =
        useState("");

    const [
        steps,
        setSteps,
    ] =
        useState(
            () =>
                getDefaultSteps()
        );


    React.useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            saveLockRef.current =
                false;

            requestIdRef.current =
                createRequestId();

            setLocalSaving(
                false
            );

            setQty(
                ""
            );

            setUnitCost(
                ""
            );

            setDirection(
                "out"
            );

            setNote(
                ""
            );

            setUseYield(
                Boolean(
                    defaultYield
                )
            );

            setTotalCost(
                ""
            );

            setFinalQty(
                ""
            );

            setSteps(
                getDefaultSteps()
            );
        },
        [
            open,
            type,
            item,
            defaultYield,
            t,
        ]
    );


    const title =
        type ===
        "purchase"
            ? useYield
                ? t(
                    "inventoryPage.movementModal.title.yield"
                )
                : t(
                    "inventoryPage.movementModal.title.purchase"
                )
            : type ===
            "sale"
                ? t(
                    "inventoryPage.movementModal.title.sale"
                )
                : type ===
                "waste"
                    ? t(
                        "inventoryPage.movementModal.title.waste"
                    )
                    : t(
                        "inventoryPage.movementModal.title.adjust"
                    );


    const canYield =
        type ===
        "purchase";


    const parseN = (
        value
    ) => {
        const number =
            Number(
                String(
                    value
                ).replace(
                    /[^\d.-]/g,
                    ""
                )
            );

        return Number.isFinite(
            number
        )
            ? number
            : 0;
    };


    const handleSave =
        async () => {
            if (
                saveLockRef.current
            ) {
                return;
            }

            if (
                !item?._id
            ) {
                return enqueueSnackbar(
                    t(
                        "inventoryPage.movementModal.messages.invalidItem"
                    ),
                    {
                        variant:
                            "error",
                    }
                );
            }


            if (
                useYield
            ) {
                const qtyNum =
                    parseN(
                        qty
                    );

                const totalCostNum =
                    parseN(
                        totalCost
                    );

                const finalQtyNum =
                    parseN(
                        finalQty
                    );


                if (
                    qtyNum <=
                    0
                ) {
                    return enqueueSnackbar(
                        t(
                            "inventoryPage.movementModal.messages.invalidPurchasedQuantity"
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );
                }


                if (
                    finalQtyNum <=
                    0
                ) {
                    return enqueueSnackbar(
                        t(
                            "inventoryPage.movementModal.messages.invalidFinalQuantity"
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );
                }


                if (
                    totalCostNum <
                    0
                ) {
                    return enqueueSnackbar(
                        t(
                            "inventoryPage.movementModal.messages.invalidTotalCost"
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );
                }


                const cleanedSteps =
                    (
                        steps ||
                        []
                    )
                        .map(
                            (
                                step
                            ) => ({
                                label:
                                    String(
                                        step.label ||
                                        ""
                                    ).trim(),

                                qty:
                                    parseN(
                                        step.qtyAfter
                                    ),
                            })
                        )
                        .filter(
                            (
                                step
                            ) =>
                                step.label &&
                                step.qty >
                                0
                        );


                saveLockRef.current =
                    true;

                setLocalSaving(
                    true
                );


                try {
                    await onSaveYield({
                        itemId:
                        item._id,

                        purchasedQty:
                        qtyNum,

                        totalCost:
                        totalCostNum,

                        finalQty:
                        finalQtyNum,

                        steps:
                        cleanedSteps,

                        note:
                            String(
                                note ||
                                ""
                            ).trim() ||
                            null,

                        idempotencyKey:
                        requestIdRef.current,
                    });

                    onClose?.();

                } catch (
                    error
                    ) {
                    unlockSave();
                }

                return;
            }


            const qtyNum =
                parseN(
                    qty
                );


            if (
                qtyNum <=
                0
            ) {
                return enqueueSnackbar(
                    t(
                        "inventoryPage.movementModal.messages.invalidQuantity"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );
            }


            const currentStock =
                parseN(
                    item?.stockCurrent ??
                    0
                );


            const reducesStock =
                type ===
                "sale" ||
                type ===
                "waste" ||
                (
                    type ===
                    "adjust" &&
                    direction ===
                    "out"
                );


            const nextStock =
                reducesStock
                    ? currentStock -
                    qtyNum
                    : currentStock;


            const payload = {
                itemId:
                item._id,

                type,

                qty:
                qtyNum,

                note:
                    String(
                        note ||
                        ""
                    ).trim() ||
                    null,

                idempotencyKey:
                requestIdRef.current,
            };


            if (
                type ===
                "purchase"
            ) {
                const unitCostNum =
                    parseN(
                        unitCost
                    );

                payload.unitCost =
                    unitCost ===
                    ""
                        ? null
                        : unitCostNum;
            }


            if (
                type ===
                "adjust"
            ) {
                payload.direction =
                    direction;
            }


            if (
                reducesStock &&
                nextStock <
                0
            ) {
                setPendingMovementPayload(
                    payload
                );

                setNegativeConfirmData({
                    itemName:
                        item?.name ||
                        "—",

                    currentStock,

                    qty:
                    qtyNum,

                    nextStock,
                });

                setNegativeConfirmOpen(
                    true
                );

                return;
            }


            await submitMovement(
                payload
            );
        };


    const handleClose =
        () => {
            if (
                isSaving
            ) {
                return;
            }

            onClose?.();
        };


    return (
        <Modal
            open={
                open
            }
            title={
                title
            }
            onClose={
                handleClose
            }
        >

            <div className="mb-5 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3">

                <div className="text-white/70 text-sm">
                    {t(
                        "inventoryPage.movementModal.fields.item"
                    )}
                </div>

                <div className="text-white font-semibold text-lg mt-1">
                    {item?.name ||
                        "—"
                    }
                </div>

            </div>


            {canYield && (

                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    <div className="text-white/70 text-sm">

                        {useYield
                            ? t(
                                "inventoryPage.movementModal.yield.activeDescription"
                            )
                            : t(
                                "inventoryPage.movementModal.yield.normalEntry"
                            )
                        }

                    </div>


                    <button
                        type="button"
                        onClick={() => {
                            if (
                                isSaving
                            ) {
                                return;
                            }

                            setUseYield(
                                (
                                    value
                                ) =>
                                    !value
                            );
                        }}
                        disabled={
                            isSaving
                        }
                        className={`px-3 py-2 rounded-xl border text-sm ${
                            isSaving
                                ? "opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-white/50"
                                : useYield
                                    ? "bg-sky-500/15 border-sky-500/30 text-sky-200"
                                    : "bg-white/5 border-white/10 text-white/80"
                        }`}
                    >

                        {useYield
                            ? t(
                                "inventoryPage.movementModal.yield.disable"
                            )
                            : t(
                                "inventoryPage.movementModal.yield.enable"
                            )
                        }
                        {" "}

                        {t(
                            "inventoryPage.movementModal.yield.process"
                        )}

                    </button>

                </div>

            )}


            {!useYield && (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div>

                        <div className="text-white text-base font-semibold mb-2">
                            {t(
                                "inventoryPage.movementModal.fields.quantity"
                            )}
                        </div>

                        <input
                            className={
                                inputCls
                            }
                            type="number"
                            value={
                                qty
                            }
                            onChange={(e) =>
                                setQty(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    {type ===
                        "purchase" && (

                            <div>

                                <div className="text-white text-base font-semibold mb-2">
                                    {t(
                                        "inventoryPage.movementModal.fields.unitCost"
                                    )}
                                </div>

                                <input
                                    className={
                                        inputCls
                                    }
                                    type="number"
                                    value={
                                        unitCost
                                    }
                                    onChange={(e) =>
                                        setUnitCost(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        )}


                    {type ===
                        "adjust" && (

                            <div>

                                <div className="text-white text-base font-semibold mb-2">
                                    {t(
                                        "inventoryPage.movementModal.fields.direction"
                                    )}
                                </div>

                                <select
                                    className={
                                        selectCls
                                    }
                                    value={
                                        direction
                                    }
                                    onChange={(e) =>
                                        setDirection(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="out">
                                        {t(
                                            "inventoryPage.movementModal.direction.reduce"
                                        )}
                                    </option>

                                    <option value="in">
                                        {t(
                                            "inventoryPage.movementModal.direction.increase"
                                        )}
                                    </option>

                                </select>

                            </div>

                        )}


                    <div className="md:col-span-2">

                        <div className="text-white text-base font-semibold mb-2">
                            {t(
                                "inventoryPage.movementModal.fields.note"
                            )}
                        </div>

                        <input
                            className={
                                inputCls
                            }
                            value={
                                note
                            }
                            onChange={(e) =>
                                setNote(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

            )}


            {useYield && (

                <div className="space-y-3">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                        <div>

                            <div className="text-white text-base font-semibold mb-2">
                                {t(
                                    "inventoryPage.movementModal.yield.purchasedQuantity"
                                )}
                            </div>

                            <input
                                className={
                                    inputCls
                                }
                                type="number"
                                value={
                                    qty
                                }
                                onChange={(e) =>
                                    setQty(
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        <div>

                            <div className="text-white text-base font-semibold mb-2">
                                {t(
                                    "inventoryPage.movementModal.yield.totalPurchaseCost"
                                )}
                            </div>

                            <input
                                className={
                                    inputCls
                                }
                                type="number"
                                value={
                                    totalCost
                                }
                                onChange={(e) =>
                                    setTotalCost(
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        <div>

                            <div className="text-white text-base font-semibold mb-2">
                                {t(
                                    "inventoryPage.movementModal.yield.finalUsableQuantity"
                                )}
                            </div>

                            <input
                                className={
                                    inputCls
                                }
                                type="number"
                                value={
                                    finalQty
                                }
                                onChange={(e) =>
                                    setFinalQty(
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        <div>

                            <div className="text-white text-base font-semibold mb-2">
                                {t(
                                    "inventoryPage.movementModal.fields.note"
                                )}
                            </div>

                            <input
                                className={
                                    inputCls
                                }
                                value={
                                    note
                                }
                                onChange={(e) =>
                                    setNote(
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                    </div>


                    <div className="text-white/60 text-sm">
                        {t(
                            "inventoryPage.movementModal.yield.intermediateStepsHelp"
                        )}
                    </div>


                    <div className="space-y-2">

                        {steps.map(
                            (
                                step,
                                idx
                            ) => (

                                <div
                                    key={step.uiId}
                                    className="grid grid-cols-1 md:grid-cols-3 gap-2"
                                >

                                    <input
                                        className={
                                            inputCls
                                        }
                                        value={
                                            step.label
                                        }
                                        onChange={(e) =>
                                            setSteps(
                                                (
                                                    items
                                                ) =>
                                                    items.map(
                                                        (
                                                            current,
                                                            index
                                                        ) =>
                                                            index ===
                                                            idx
                                                                ? {
                                                                    ...current,

                                                                    label:
                                                                    e
                                                                        .target
                                                                        .value,
                                                                }
                                                                : current
                                                    )
                                            )
                                        }
                                    />


                                    <input
                                        className={
                                            inputCls
                                        }
                                        type="number"
                                        placeholder={t(
                                            "inventoryPage.movementModal.yield.quantityAfter"
                                        )}
                                        value={
                                            step.qtyAfter
                                        }
                                        onChange={(e) =>
                                            setSteps(
                                                (
                                                    items
                                                ) =>
                                                    items.map(
                                                        (
                                                            current,
                                                            index
                                                        ) =>
                                                            index ===
                                                            idx
                                                                ? {
                                                                    ...current,

                                                                    qtyAfter:
                                                                    e
                                                                        .target
                                                                        .value,
                                                                }
                                                                : current
                                                    )
                                            )
                                        }
                                    />


                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSteps(
                                                (
                                                    items
                                                ) =>
                                                    items.filter(
                                                        (
                                                            _,
                                                            index
                                                        ) =>
                                                            index !==
                                                            idx
                                                    )
                                            )
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200"
                                    >
                                        {t(
                                            "inventoryPage.movementModal.actions.remove"
                                        )}
                                    </button>

                                </div>

                            )
                        )}


                        <button
                            type="button"
                            onClick={() =>
                                setSteps(
                                    (
                                        items
                                    ) => [
                                        ...items,
                                        {
                                            label:
                                                t(
                                                    "inventoryPage.movementModal.yield.defaultSteps.step"
                                                ),
                                            uiId: createRequestId(),

                                            qtyAfter:
                                                "",
                                        },
                                    ]
                                )
                            }
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80"
                        >
                            {t(
                                "inventoryPage.movementModal.actions.addStep"
                            )}
                        </button>

                    </div>


                    <div className="text-white/60 text-sm mt-2">

                        {t(
                            "inventoryPage.movementModal.yield.estimatedFinalUnitCost"
                        )}
                        :{" "}

                        <b className="text-white">

                            {(() => {
                                const parsedTotalCost =
                                    parseN(
                                        totalCost
                                    );

                                const parsedFinalQty =
                                    parseN(
                                        finalQty
                                    );

                                if (
                                    parsedFinalQty <=
                                    0
                                ) {
                                    return "—";
                                }

                                return money(
                                    parsedTotalCost /
                                    parsedFinalQty
                                );
                            })()}

                        </b>

                    </div>

                </div>

            )}


            <div className="mt-5 flex gap-2 justify-end">

                <button
                    type="button"
                    onClick={() => {
                        if (
                            isSaving
                        ) {
                            return;
                        }

                        onClose?.();
                    }}
                    disabled={
                        isSaving
                    }
                    className={`px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 ${
                        isSaving
                            ? "opacity-50 cursor-not-allowed pointer-events-none"
                            : "hover:bg-white/10"
                    }`}
                >
                    {t(
                        "common.cancel"
                    )}
                </button>


                <button
                    type="button"
                    onClick={
                        handleSave
                    }
                    disabled={
                        isSaving
                    }
                    className={`px-4 py-3 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 ${
                        isSaving
                            ? "opacity-60 cursor-not-allowed pointer-events-none"
                            : "hover:bg-sky-500/20"
                    }`}
                >

                    {isSaving
                        ? t(
                            "inventoryPage.movementModal.actions.saving"
                        )
                        : t(
                            "inventoryPage.movementModal.actions.save"
                        )
                    }

                </button>

            </div>


            {negativeConfirmOpen &&
                negativeConfirmData && (

                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">

                        <div className="w-full max-w-md rounded-2xl border border-sky-500/20 bg-[#111111] shadow-2xl overflow-hidden">

                            <div className="px-5 py-4 border-b border-white/10">

                                <div className="flex items-start gap-3">

                                    <div className="h-11 w-11 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center shrink-0">
                                    <span className="text-sky-400 text-xl">
                                        !
                                    </span>
                                    </div>

                                    <div>

                                        <h3 className="text-white text-lg font-semibold">
                                            {t(
                                                "inventoryPage.movementModal.negative.title"
                                            )}
                                        </h3>

                                        <p className="text-sm text-gray-400 mt-1">
                                            {t(
                                                "inventoryPage.movementModal.negative.description"
                                            )}
                                        </p>

                                    </div>

                                </div>

                            </div>


                            <div className="px-5 py-4 space-y-3">

                                <div className="rounded-xl bg-[#181818] border border-white/5 p-4">

                                    <div className="flex items-center justify-between py-1">

                                    <span className="text-gray-400 text-sm">
                                        {t(
                                            "inventoryPage.movementModal.fields.item"
                                        )}
                                    </span>

                                        <span className="text-white text-sm font-medium">
                                        {
                                            negativeConfirmData.itemName
                                        }
                                    </span>

                                    </div>


                                    <div className="flex items-center justify-between py-1">

                                    <span className="text-gray-400 text-sm">
                                        {t(
                                            "inventoryPage.movementModal.negative.currentStock"
                                        )}
                                    </span>

                                        <span className="text-white text-sm font-medium">
                                        {
                                            negativeConfirmData.currentStock
                                        }
                                    </span>

                                    </div>


                                    <div className="flex items-center justify-between py-1">

                                    <span className="text-gray-400 text-sm">
                                        {t(
                                            "inventoryPage.movementModal.negative.outputQuantity"
                                        )}
                                    </span>

                                        <span className="text-white text-sm font-medium">
                                        {
                                            negativeConfirmData.qty
                                        }
                                    </span>

                                    </div>


                                    <div className="flex items-center justify-between py-1">

                                    <span className="text-gray-400 text-sm">
                                        {t(
                                            "inventoryPage.movementModal.negative.newStock"
                                        )}
                                    </span>

                                        <span className="text-red-400 text-sm font-semibold">
                                        {
                                            negativeConfirmData.nextStock
                                        }
                                    </span>

                                    </div>

                                </div>


                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">

                                    <p className="text-sm text-red-300">
                                        {t(
                                            "inventoryPage.movementModal.negative.warning"
                                        )}
                                    </p>

                                </div>

                            </div>


                            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={() => {
                                        setNegativeConfirmOpen(
                                            false
                                        );

                                        setNegativeConfirmData(
                                            null
                                        );

                                        setPendingMovementPayload(
                                            null
                                        );
                                    }}
                                    className="px-4 py-2 rounded-xl border border-white/10 bg-[#1b1b1b] text-white hover:bg-[#232323] transition"
                                >
                                    {t(
                                        "common.cancel"
                                    )}
                                </button>


                                <button
                                    type="button"
                                    onClick={() => {
                                        if (
                                            !pendingMovementPayload
                                        ) {
                                            return;
                                        }

                                        submitMovement(
                                            pendingMovementPayload
                                        );
                                    }}
                                    className="px-4 py-2 rounded-xl bg-sky-500 text-black font-semibold hover:bg-sky-400 transition"
                                >
                                    {t(
                                        "inventoryPage.movementModal.negative.continueAnyway"
                                    )}
                                </button>

                            </div>

                        </div>

                    </div>

                )}

        </Modal>
    );
}
