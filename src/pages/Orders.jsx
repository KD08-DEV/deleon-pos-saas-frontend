import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { motion, AnimatePresence } from "framer-motion";
import {
    Filter,
    ListOrdered,
    ChevronDown,
    Check,
    Calendar,
    RefreshCcw,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";

import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import api from "../lib/api";
import useTenant from "../hooks/useTenant";

const INITIAL_VISIBLE_ORDERS = 24;
const LOAD_MORE_STEP = 12;
const ORDERS_UI_PREFS_KEY = "deleonsoft_orders_ui_prefs";

const DATE_FILTERS = [
    { key: "24h", label: "Últimas 24h" },
    { key: "7d", label: "7 días" },
    { key: "all", label: "Todos" },
];

const STATUS_MAP = {
    "In Progress": "En Progreso",
    Ready: "Listo",
    Completed: "Completado",
    Cancelled: "Cancelado",
    Canceled: "Cancelado",
};

const STATUS_TABS = [
    { key: "all", label: "Todo", icon: ListOrdered },
    { key: "En Progreso", label: "En Progreso", icon: Filter },
    { key: "Listo", label: "Listo", icon: Filter },
    { key: "Completado", label: "Completado", icon: Filter },
    { key: "Cancelado", label: "Cancelado", icon: Filter },
];

const VIEW_MODES = [
    { key: "display", label: "Pantalla" },
    { key: "list", label: "Lista" },
    { key: "comfortable", label: "Cómoda" },
    { key: "compact", label: "Compacta" },
];

const VIEW_GRID_CLASSES = {
    display: "grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5",
    comfortable:
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
    compact:
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4",
    list: "grid grid-cols-1 gap-4",
};

const extractOrdersResponse = (response) => {
    const payload = response?.data ?? response;

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.orders)) return payload.orders;
    if (Array.isArray(payload?.data?.orders)) {
        return payload.data.orders;
    }

    return [];
};

const normalizeOrderStatus = (status) => {
    const value = String(status || "").trim();

    return STATUS_MAP[value] || value || "En Progreso";
};

const getItemProductType = (item) => {
    const candidates = [
        item?.productType,
        item?.itemType,
        item?.station,
        item?.kitchenStation,
        item?.prepStation,
        item?.preparationType,
        item?.productionType,
        item?.category,
        item?.dishCategory,
        item?.dish?.category,
        item?.dishInfo?.category,
    ];

    const found = candidates.find((value) =>
        String(value || "").trim()
    );

    return found ? String(found).trim() : null;
};

const orderHasProductType = (order, productType) => {
    if (!productType || productType === "all") {
        return true;
    }

    return (order?.items || []).some(
        (item) => getItemProductType(item) === productType
    );
};

const sortOrdersOldestTopNewestBottom = (orders) => {
    return [...(orders || [])].sort((a, b) => {
        const aTime = new Date(a?.createdAt || 0).getTime();
        const bTime = new Date(b?.createdAt || 0).getTime();

        return aTime - bTime;
    });
};

const orderMatchesDateFilter = (order, dateFilter) => {
    if (dateFilter === "all") {
        return true;
    }

    const normalizedStatus = normalizeOrderStatus(
        order?.orderStatus
    );

    // Las órdenes activas no deben desaparecer por ser antiguas.
    if (["En Progreso", "Listo"].includes(normalizedStatus)) {
        return true;
    }

    const createdAt = order?.createdAt
        ? new Date(order.createdAt).getTime()
        : 0;

    if (!createdAt || Number.isNaN(createdAt)) {
        return false;
    }

    const difference = Date.now() - createdAt;

    if (dateFilter === "24h") {
        return difference <= 24 * 60 * 60 * 1000;
    }

    if (dateFilter === "7d") {
        return difference <= 7 * 24 * 60 * 60 * 1000;
    }

    return true;
};

const getOrdersUiPrefs = () => {
    try {
        if (typeof window === "undefined") {
            return {};
        }

        return JSON.parse(
            localStorage.getItem(ORDERS_UI_PREFS_KEY) || "{}"
        );
    } catch {
        return {};
    }
};

const saveOrdersUiPref = (key, value) => {
    try {
        if (typeof window === "undefined") {
            return;
        }

        const current = getOrdersUiPrefs();

        localStorage.setItem(
            ORDERS_UI_PREFS_KEY,
            JSON.stringify({
                ...current,
                [key]: value,
            })
        );
    } catch {
        // No detener la pantalla si localStorage falla.
    }
};

const Orders = () => {
    const queryClient = useQueryClient();
    const { tenantInfo } = useTenant();

    const savedPrefs = useMemo(
        () => getOrdersUiPrefs(),
        []
    );

    const [visibleCount, setVisibleCount] = useState(
        INITIAL_VISIBLE_ORDERS
    );

    const [status, setStatus] = useState(
        savedPrefs.status || "all"
    );

    const [productTypeFilter, setProductTypeFilter] =
        useState(savedPrefs.productTypeFilter || "all");

    const [dateFilter, setDateFilter] = useState(
        savedPrefs.dateFilter || "24h"
    );

    const [viewMode, setViewMode] = useState(
        savedPrefs.viewMode || "display"
    );

    const [isTypeMenuOpen, setIsTypeMenuOpen] =
        useState(false);

    const [currentTime, setCurrentTime] = useState(
        Date.now()
    );

    const audioRef = useRef(null);
    const previousOrderIdsRef = useRef(new Set());
    const firstLoadRef = useRef(true);
    const typeMenuRef = useRef(null);

    const ordersLimit = useMemo(() => {
        if (dateFilter === "24h") {
            return 120;
        }

        if (dateFilter === "7d") {
            return 300;
        }

        return 500;
    }, [dateFilter]);

    const ordersQueryKey = useMemo(
        () => ["orders", dateFilter],
        [dateFilter]
    );

    useEffect(() => {
        document.title = "POS | Orders";

        audioRef.current = new Audio(
            "/sounds/new-order.mp3"
        );

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                typeMenuRef.current &&
                !typeMenuRef.current.contains(event.target)
            ) {
                setIsTypeMenuOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    useEffect(() => {
        // Evita reproducir sonido al cambiar el filtro.
        firstLoadRef.current = true;
        previousOrderIdsRef.current = new Set();
    }, [dateFilter]);

    const {
        data: orders = [],
        isLoading,
        isFetching,
        isFetched,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ordersQueryKey,

        queryFn: async ({ signal }) => {
            const response = await api.get("/api/order", {
                params: {
                    range: dateFilter,
                    limit: ordersLimit,
                },
                signal,
            });

            return extractOrdersResponse(response);
        },

        placeholderData: keepPreviousData,

        staleTime: 1500,

        gcTime: 5 * 60 * 1000,

        refetchInterval: () => {
            if (
                typeof document !== "undefined" &&
                document.visibilityState === "visible"
            ) {
                return 5000;
            }

            return false;
        },

        refetchIntervalInBackground: false,

        refetchOnMount: "always",

        refetchOnWindowFocus: true,

        refetchOnReconnect: true,

        retry: 1,

        retryDelay: 1000,
    });

    useEffect(() => {
        if (!isFetched) {
            return;
        }

        const currentIds = new Set(
            (orders || [])
                .map((order) => order?._id)
                .filter(Boolean)
        );

        if (firstLoadRef.current) {
            firstLoadRef.current = false;
            previousOrderIdsRef.current = currentIds;
            return;
        }

        const previousIds =
            previousOrderIdsRef.current;

        const newIds = [...currentIds].filter(
            (id) => !previousIds.has(id)
        );

        if (
            newIds.length > 0 &&
            audioRef.current
        ) {
            audioRef.current
                .play()
                .catch(() => {});

            enqueueSnackbar(
                `${newIds.length} nueva(s) orden(es) recibida(s)`,
                {
                    variant: "info",
                }
            );
        }

        previousOrderIdsRef.current = currentIds;
    }, [orders, isFetched]);

    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE_ORDERS);
    }, [status, productTypeFilter, dateFilter]);

    useEffect(() => {
        if (!isError) {
            return;
        }

        const message =
            error?.response?.data?.message ||
            error?.message ||
            "No se pudieron cargar las órdenes";

        enqueueSnackbar(message, {
            variant: "error",
        });
    }, [isError, error]);

    useEffect(() => {
        saveOrdersUiPref("status", status);
    }, [status]);

    useEffect(() => {
        saveOrdersUiPref(
            "productTypeFilter",
            productTypeFilter
        );
    }, [productTypeFilter]);

    useEffect(() => {
        saveOrdersUiPref(
            "dateFilter",
            dateFilter
        );
    }, [dateFilter]);

    useEffect(() => {
        saveOrdersUiPref(
            "viewMode",
            viewMode
        );
    }, [viewMode]);

    const handleStatusChanged = useCallback(
        (updatedOrder) => {
            if (!updatedOrder?._id) {
                return;
            }

            queryClient.setQueriesData(
                {
                    queryKey: ["orders"],
                },
                (currentOrders = []) => {
                    if (!Array.isArray(currentOrders)) {
                        return currentOrders;
                    }

                    return currentOrders.map((order) =>
                        order?._id === updatedOrder._id
                            ? updatedOrder
                            : order
                    );
                }
            );
        },
        [queryClient]
    );

    const dateFilteredOrders = useMemo(() => {
        return (orders || []).filter((order) =>
            orderMatchesDateFilter(
                order,
                dateFilter
            )
        );
    }, [orders, dateFilter]);

    const statusFilteredOrders = useMemo(() => {
        if (status === "all") {
            return dateFilteredOrders;
        }

        return dateFilteredOrders.filter(
            (order) =>
                normalizeOrderStatus(
                    order?.orderStatus
                ) === status
        );
    }, [dateFilteredOrders, status]);

    const availableProductTypes = useMemo(() => {
        const unique = new Set();

        for (const order of statusFilteredOrders) {
            for (const item of order?.items || []) {
                const type =
                    getItemProductType(item);

                if (type) {
                    unique.add(type);
                }
            }
        }

        return Array.from(unique).sort((a, b) =>
            a.localeCompare(b, "es")
        );
    }, [statusFilteredOrders]);

    const productTypeCounts = useMemo(() => {
        const counts = {};

        for (const order of statusFilteredOrders) {
            const localTypes = new Set();

            for (const item of order?.items || []) {
                const type =
                    getItemProductType(item);

                if (type) {
                    localTypes.add(type);
                }
            }

            localTypes.forEach((type) => {
                counts[type] =
                    (counts[type] || 0) + 1;
            });
        }

        return counts;
    }, [statusFilteredOrders]);

    const filteredOrders = useMemo(() => {
        const productFiltered =
            statusFilteredOrders.filter((order) =>
                orderHasProductType(
                    order,
                    productTypeFilter
                )
            );

        return sortOrdersOldestTopNewestBottom(
            productFiltered
        );
    }, [
        statusFilteredOrders,
        productTypeFilter,
    ]);

    const visibleOrders = useMemo(() => {
        if (
            filteredOrders.length <= visibleCount
        ) {
            return filteredOrders;
        }

        return filteredOrders.slice(
            filteredOrders.length - visibleCount
        );
    }, [filteredOrders, visibleCount]);

    const hasMoreOrders =
        filteredOrders.length > visibleCount;

    const selectedTypeLabel =
        productTypeFilter === "all"
            ? "Todos"
            : productTypeFilter;

    const selectedDateFilterLabel =
        DATE_FILTERS.find(
            (item) => item.key === dateFilter
        )?.label || "Todas";

    return (
        <section className="relative min-h-screen flex flex-col pb-24 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]">
            <div className="relative z-10 px-2 sm:px-3 lg:px-4 max-w-full mx-auto w-full">
                <motion.div
                    initial={{
                        opacity: 0,
                        y: -20,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.3,
                    }}
                    className="flex flex-col gap-4 px-4 sm:px-6 py-6"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <BackButton />

                            <div className="flex items-center gap-2">
                                <ListOrdered className="text-blue-400 w-6 h-6" />

                                <h1 className="text-[#f5f5f5] text-2xl sm:text-3xl font-bold tracking-wide">
                                    Órdenes
                                </h1>

                                {isFetching &&
                                    !isLoading && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300">
                                            <RefreshCcw className="h-3 w-3 animate-spin" />
                                            Actualizando
                                        </span>
                                    )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <div className="flex items-center gap-1 rounded-xl border border-[#2a2a2a]/70 bg-[#171717] p-1 shadow-lg overflow-x-auto">
                                <div className="hidden sm:flex items-center gap-1 px-2 text-[#9ca3af] text-xs whitespace-nowrap">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    Fecha
                                </div>

                                {DATE_FILTERS.map(
                                    (item) => {
                                        const isActive =
                                            dateFilter ===
                                            item.key;

                                        return (
                                            <button
                                                key={
                                                    item.key
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setDateFilter(
                                                        item.key
                                                    )
                                                }
                                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                                                    isActive
                                                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                        : "text-[#ababab] hover:bg-[#222] hover:text-white border border-transparent"
                                                }`}
                                            >
                                                {
                                                    item.label
                                                }
                                            </button>
                                        );
                                    }
                                )}
                            </div>

                            <div
                                className="relative"
                                ref={typeMenuRef}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsTypeMenuOpen(
                                            (previous) =>
                                                !previous
                                        )
                                    }
                                    className="flex items-center justify-between gap-3 min-w-[220px] rounded-xl border border-[#2a2a2a]/70 bg-[#171717] px-3 py-2.5 text-sm text-[#f5f5f5] shadow-lg hover:border-blue-500/40 transition-all"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Filter className="w-4 h-4 text-blue-400 shrink-0" />

                                        <span className="text-[#9ca3af] shrink-0">
                                            Tipo
                                        </span>

                                        <span className="truncate font-medium text-white">
                                            {
                                                selectedTypeLabel
                                            }
                                        </span>
                                    </div>

                                    <ChevronDown
                                        className={`w-4 h-4 text-[#9ca3af] transition-transform ${
                                            isTypeMenuOpen
                                                ? "rotate-180"
                                                : ""
                                        }`}
                                    />
                                </button>

                                {isTypeMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-[280px] max-h-80 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#111111] shadow-2xl z-[9999] p-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductTypeFilter(
                                                    "all"
                                                );

                                                setIsTypeMenuOpen(
                                                    false
                                                );
                                            }}
                                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                                                productTypeFilter ===
                                                "all"
                                                    ? "bg-blue-500/15 text-blue-300"
                                                    : "text-[#e5e7eb] hover:bg-[#1b1b1b]"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="truncate">
                                                    Todos
                                                </span>

                                                <span className="text-xs text-[#888]">
                                                    (
                                                    {
                                                        statusFilteredOrders.length
                                                    }
                                                    )
                                                </span>
                                            </div>

                                            {productTypeFilter ===
                                                "all" && (
                                                    <Check className="w-4 h-4" />
                                                )}
                                        </button>

                                        <div className="my-2 border-t border-[#222]" />

                                        {availableProductTypes.length ===
                                        0 ? (
                                            <div className="px-3 py-3 text-sm text-[#888]">
                                                No hay categorías
                                                disponibles.
                                            </div>
                                        ) : (
                                            availableProductTypes.map(
                                                (type) => {
                                                    const isSelected =
                                                        productTypeFilter ===
                                                        type;

                                                    return (
                                                        <button
                                                            key={
                                                                type
                                                            }
                                                            type="button"
                                                            onClick={() => {
                                                                setProductTypeFilter(
                                                                    type
                                                                );

                                                                setIsTypeMenuOpen(
                                                                    false
                                                                );
                                                            }}
                                                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                                                                isSelected
                                                                    ? "bg-blue-500/15 text-blue-300"
                                                                    : "text-[#e5e7eb] hover:bg-[#1b1b1b]"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="truncate">
                                                                    {
                                                                        type
                                                                    }
                                                                </span>

                                                                <span className="text-xs text-[#888]">
                                                                    (
                                                                    {productTypeCounts[
                                                                            type
                                                                            ] ||
                                                                        0}
                                                                    )
                                                                </span>
                                                            </div>

                                                            {isSelected && (
                                                                <Check className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    );
                                                }
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 rounded-xl border border-[#2a2a2a]/70 bg-[#171717] p-1 shadow-lg overflow-x-auto">
                                {VIEW_MODES.map(
                                    (mode) => {
                                        const isActive =
                                            viewMode ===
                                            mode.key;

                                        return (
                                            <button
                                                key={
                                                    mode.key
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setViewMode(
                                                        mode.key
                                                    )
                                                }
                                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                                                    isActive
                                                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                                        : "text-[#ababab] hover:bg-[#222] hover:text-white border border-transparent"
                                                }`}
                                            >
                                                {
                                                    mode.label
                                                }
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {STATUS_TABS.map((tab) => {
                            const isActive =
                                status === tab.key;

                            const Icon = tab.icon;

                            return (
                                <motion.button
                                    key={tab.key}
                                    type="button"
                                    onClick={() =>
                                        setStatus(tab.key)
                                    }
                                    whileHover={{
                                        scale: 1.05,
                                    }}
                                    whileTap={{
                                        scale: 0.95,
                                    }}
                                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                                        isActive
                                            ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30"
                                            : "bg-gradient-to-r from-[#1f1f1f] to-[#252525] text-[#ababab] border border-[#2a2a2a]/50"
                                    }`}
                                >
                                    <Icon className="w-4 h-4 relative z-10" />

                                    <span className="relative z-10">
                                        {tab.label}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="orders-loading"
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                }}
                                exit={{
                                    opacity: 0,
                                }}
                                className="py-20 text-center text-[#ababab]"
                            >
                                <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-400" />
                                Cargando órdenes...
                            </motion.div>
                        ) : isError ? (
                            <motion.div
                                key="orders-error"
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                }}
                                exit={{
                                    opacity: 0,
                                }}
                                className="py-20 text-center"
                            >
                                <p className="text-red-400">
                                    No se pudieron cargar las
                                    órdenes.
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        refetch()
                                    }
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/25"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Reintentar
                                </button>
                            </motion.div>
                        ) : filteredOrders.length > 0 ? (
                            <motion.div
                                key="orders-grid"
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                }}
                                exit={{
                                    opacity: 0,
                                }}
                                transition={{
                                    duration: 0.3,
                                }}
                            >
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm text-[#ababab]">
                                        Mostrando{" "}
                                        {
                                            visibleOrders.length
                                        }{" "}
                                        de{" "}
                                        {
                                            filteredOrders.length
                                        }{" "}
                                        órdenes ·{" "}
                                        {
                                            selectedDateFilterLabel
                                        }
                                        .
                                    </p>

                                    <p className="text-xs text-[#666]">
                                        Ordenadas con las más
                                        recientes abajo.
                                    </p>
                                </div>

                                <div
                                    className={
                                        VIEW_GRID_CLASSES[
                                            viewMode
                                            ] ||
                                        VIEW_GRID_CLASSES.comfortable
                                    }
                                >
                                    {visibleOrders.map(
                                        (order) => (
                                            <OrderCard
                                                key={
                                                    order._id
                                                }
                                                order={
                                                    order
                                                }
                                                onStatusChanged={
                                                    handleStatusChanged
                                                }
                                                currentTime={
                                                    currentTime
                                                }
                                                viewMode={
                                                    viewMode
                                                }
                                                tenantInfo={
                                                    tenantInfo
                                                }
                                            />
                                        )
                                    )}
                                </div>

                                {hasMoreOrders && (
                                    <div className="mt-6 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setVisibleCount(
                                                    (
                                                        previous
                                                    ) =>
                                                        previous +
                                                        LOAD_MORE_STEP
                                                )
                                            }
                                            className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                                        >
                                            Cargar más
                                            anteriores
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="orders-empty"
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                }}
                                exit={{
                                    opacity: 0,
                                }}
                                className="text-center py-20 text-[#888]"
                            >
                                No hay órdenes para mostrar.
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <BottomNav />
        </section>
    );
};

export default Orders;